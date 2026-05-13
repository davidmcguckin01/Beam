import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { getOrCreateUser } from "@/lib/user";
import {
  getWorkspace,
  getWorkspaceByClerkOrgId,
  getWorkspaceMembership,
  hasWorkspacePermission,
} from "@/lib/workspace";
import { type WorkspaceRole } from "@/db/schema";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    const user = await getOrCreateUser(
      clerkUser.id,
      clerkUser.emailAddresses[0]?.emailAddress || "",
      clerkUser.firstName,
      clerkUser.lastName
    );

    // Try to find workspace by database ID first
    let workspace = await getWorkspace(id);

    // If not found, try to find by Clerk organization ID
    if (!workspace && (id.startsWith("org_") || id.length > 20)) {
      workspace = await getWorkspaceByClerkOrgId(id);
    }

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Check if user has permission
    const membership = await getWorkspaceMembership(workspace.id, user.id);
    if (
      !membership ||
      !hasWorkspacePermission(membership.role as WorkspaceRole, "member")
    ) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type } = body; // "description" or "internalUseCase"

    if (!type || (type !== "description" && type !== "internalUseCase")) {
      return NextResponse.json(
        { error: "Invalid type. Must be 'description' or 'internalUseCase'" },
        { status: 400 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Get company information
    const companyName = workspace.companyName || workspace.name;
    const companyUrl = workspace.companyUrl || "";

    if (!companyName) {
      return NextResponse.json(
        {
          error:
            "Company name is required. Please fill in the company name field first.",
        },
        { status: 400 }
      );
    }

    // Build the prompt based on type
    let systemPrompt = "";
    let userPrompt = "";

    if (type === "description") {
      systemPrompt = `You are a helpful assistant that generates company/project descriptions based on company names and websites. Create concise, professional descriptions that explain what a company or project does.`;

      const urlContext = companyUrl ? `\nCompany website: ${companyUrl}` : "";
      userPrompt = `Generate a brief company/project description based on the following information:

Company name: ${companyName}${urlContext}

The description should:
- Be 2-4 sentences long
- Explain what the company/project does
- Mention the industry or domain if it can be inferred from the name or website
- Be professional and clear
- Be suitable for a business context
${
  companyUrl
    ? "- Use information from the website URL if available to make it more accurate"
    : ""
}

Return only the description text, no additional formatting or explanations.`;
    } else {
      // internalUseCase
      systemPrompt = `You are a helpful assistant that generates internal use case descriptions for software tools. Create descriptions that explain how teams might use a feedback/issue tracking tool internally.`;

      const urlContext = companyUrl ? `\nCompany website: ${companyUrl}` : "";
      userPrompt = `Generate an internal use case description for "${companyName}" using a feedback/issue tracking tool.${urlContext}

The description should:
- Be 2-4 sentences long
- Explain how the team might use this tool internally
- Describe what problems they might be solving based on the company type
- Mention potential workflows or processes
- Be specific and actionable
${
  companyUrl
    ? "- Consider the company's website to understand their business better"
    : ""
}

Return only the description text, no additional formatting or explanations.`;
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const generatedText = completion.choices[0]?.message?.content?.trim();

    if (!generatedText) {
      return NextResponse.json(
        { error: "Failed to generate content" },
        { status: 500 }
      );
    }

    return NextResponse.json({ content: generatedText });
  } catch (error) {
    console.error("Error generating description:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while generating content",
      },
      { status: 500 }
    );
  }
}
