import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbackPages } from "@/db/schema";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { eq, count } from "drizzle-orm";
import { hasUnlimitedForms, FREE_FORM_LIMIT } from "@/lib/plan-gates";

// Generate a random URL-friendly slug
function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// GET /api/feedback-pages - List all feedback pages for the workspace
export async function GET(request: NextRequest) {
  try {
    const contextResult = await requireWorkspaceContext();
    if ("error" in contextResult) {
      return NextResponse.json(
        { error: contextResult.error },
        { status: contextResult.status }
      );
    }

    const { context } = contextResult;
    const pages = await db
      .select()
      .from(feedbackPages)
      .where(eq(feedbackPages.workspaceId, context.workspace.id))
      .orderBy(feedbackPages.createdAt);

    return NextResponse.json(pages);
  } catch (error) {
    console.error("Error fetching feedback pages:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback pages" },
      { status: 500 }
    );
  }
}

// POST /api/feedback-pages - Create a new feedback page
export async function POST(request: NextRequest) {
  try {
    const contextResult = await requireWorkspaceContext();
    if ("error" in contextResult) {
      return NextResponse.json(
        { error: contextResult.error },
        { status: contextResult.status }
      );
    }

    const { context } = contextResult;

    // Enforce free tier form limit
    if (!(await hasUnlimitedForms(context.workspace.id))) {
      const [{ value: formCount }] = await db
        .select({ value: count() })
        .from(feedbackPages)
        .where(eq(feedbackPages.workspaceId, context.workspace.id));
      if (formCount >= FREE_FORM_LIMIT) {
        return NextResponse.json(
          { error: "FORM_LIMIT_REACHED", limit: FREE_FORM_LIMIT },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { title, description, customizations } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Always generate a random slug
    let uniqueSlug = generateSlug();
    let existingPage = await db
      .select()
      .from(feedbackPages)
      .where(eq(feedbackPages.slug, uniqueSlug))
      .limit(1);

    while (existingPage.length > 0) {
      uniqueSlug = generateSlug();
      existingPage = await db
        .select()
        .from(feedbackPages)
        .where(eq(feedbackPages.slug, uniqueSlug))
        .limit(1);
    }

    // Default customizations
    const defaultCustomizations = {
      primaryColor: "#000000",
      backgroundColor: "#ffffff",
      textColor: "#000000",
      buttonColor: "#000000",
      buttonTextColor: "#ffffff",
      showNameField: true,
      showEmailField: true,
      requireEmail: false,
      allowedEmails: [],
    };

    const [newPage] = await db
      .insert(feedbackPages)
      .values({
        workspaceId: context.workspace.id,
        userId: context.user.id,
        title,
        description: description || null,
        slug: uniqueSlug,
        customizations: JSON.stringify(customizations || defaultCustomizations),
        isActive: true,
      })
      .returning();

    return NextResponse.json(newPage, { status: 201 });
  } catch (error) {
    console.error("Error creating feedback page:", error);
    return NextResponse.json(
      { error: "Failed to create feedback page" },
      { status: 500 }
    );
  }
}
