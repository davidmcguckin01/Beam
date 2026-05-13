import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { db } from "@/db";
import { feedbackPages, formConfigVersions } from "@/db/schema";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { eq, and } from "drizzle-orm";
import {
  buildSystemPrompt,
  buildMessages,
  validateAndNormalizeFormConfig,
  type ConversationMessage,
} from "@/lib/ai-form-helpers";
import { hasAIPlan } from "@/lib/plan-gates";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contextResult = await requireWorkspaceContext();
    if ("error" in contextResult) {
      return NextResponse.json(
        { error: contextResult.error },
        { status: contextResult.status }
      );
    }

    const { context } = contextResult;

    // Gate AI access to paid plan or per-user AI add-on
    if (!(await hasAIPlan(context.workspace.id, context.user.id))) {
      return NextResponse.json({ error: "AI_ACCESS_REQUIRED" }, { status: 403 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    const [page] = await db
      .select()
      .from(feedbackPages)
      .where(
        and(
          eq(feedbackPages.id, id),
          eq(feedbackPages.workspaceId, context.workspace.id)
        )
      )
      .limit(1);

    if (!page) {
      return NextResponse.json({ error: "Feedback page not found" }, { status: 404 });
    }

    const body = await request.json();
    const { prompt, currentFormConfig, conversationHistory = [] } = body as {
      prompt: string;
      currentFormConfig?: unknown;
      conversationHistory?: ConversationMessage[];
    };

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Snapshot current config before AI edit
    if (
      currentFormConfig &&
      typeof currentFormConfig === "object" &&
      Array.isArray((currentFormConfig as { steps?: unknown[] }).steps) &&
      (currentFormConfig as { steps: unknown[] }).steps.length > 0
    ) {
      await db.insert(formConfigVersions).values({
        feedbackPageId: id,
        formConfig: JSON.stringify(currentFormConfig),
        source: "manual",
        prompt: null,
      });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const isGenerating =
      !currentFormConfig ||
      !Array.isArray((currentFormConfig as { steps?: unknown[] }).steps) ||
      (currentFormConfig as { steps: unknown[] }).steps.length === 0;
    const mode = isGenerating ? "generate" : "edit";

    const userMessages = buildMessages(
      prompt,
      mode,
      conversationHistory,
      isGenerating ? null : (currentFormConfig as Parameters<typeof buildMessages>[3])
    );

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: buildSystemPrompt() },
        ...userMessages,
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(responseContent);
    } catch {
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 500 });
      }
    }

    // The AI returns { assistantMessage, formConfig } — extract both
    const rawConfig = (parsed.formConfig ?? parsed) as unknown;
    const assistantMessage =
      typeof parsed.assistantMessage === "string" ? parsed.assistantMessage : "Done!";

    const formConfig = validateAndNormalizeFormConfig(rawConfig);
    if (!formConfig) {
      return NextResponse.json(
        { error: "AI returned invalid form configuration" },
        { status: 500 }
      );
    }

    await db.insert(formConfigVersions).values({
      feedbackPageId: id,
      formConfig: JSON.stringify(formConfig),
      source: mode === "generate" ? "ai_generate" : "ai_edit",
      prompt: prompt.trim(),
    });

    return NextResponse.json({ formConfig, assistantMessage });
  } catch (error) {
    console.error("Error in AI form generation:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI form generation failed" },
      { status: 500 }
    );
  }
}
