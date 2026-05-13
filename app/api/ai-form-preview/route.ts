import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  buildSystemPrompt,
  buildMessages,
  validateAndNormalizeFormConfig,
} from "@/lib/ai-form-helpers";

// Simple in-memory IP rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 3;
const RATE_WINDOW = 3600000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  // Cleanup if map gets too large
  if (rateLimitMap.size > 10000) {
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(key);
    }
  }

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "AI service is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { prompt } = body as { prompt: string };

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Please describe the form you want to create" },
        { status: 400 }
      );
    }

    if (prompt.length > 500) {
      return NextResponse.json(
        { error: "Description is too long. Please keep it under 500 characters." },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const messages = buildMessages(prompt.trim(), "generate", [], null);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: buildSystemPrompt() },
        ...messages,
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(responseContent);
    } catch {
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json(
          { error: "AI returned invalid response" },
          { status: 500 }
        );
      }
    }

    const rawConfig = (parsed.formConfig ?? parsed) as unknown;
    const assistantMessage =
      typeof parsed.assistantMessage === "string"
        ? parsed.assistantMessage
        : "Your form is ready!";

    const formConfig = validateAndNormalizeFormConfig(rawConfig);
    if (!formConfig) {
      return NextResponse.json(
        { error: "Failed to generate a valid form. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ formConfig, assistantMessage });
  } catch (error) {
    console.error("Error in AI form preview:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
