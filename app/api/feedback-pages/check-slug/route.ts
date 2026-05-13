import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbackPages } from "@/db/schema";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { eq, and } from "drizzle-orm";

// GET /api/feedback-pages/check-slug?slug=xxx&excludeId=xxx - Check if a slug is available
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
    const searchParams = request.nextUrl.searchParams;
    const slug = searchParams.get("slug");
    const excludeId = searchParams.get("excludeId");

    if (!slug) {
      return NextResponse.json(
        { error: "Slug parameter is required" },
        { status: 400 }
      );
    }

    // Check if slug exists in the workspace
    let query = db
      .select()
      .from(feedbackPages)
      .where(
        and(
          eq(feedbackPages.slug, slug),
          eq(feedbackPages.workspaceId, context.workspace.id)
        )
      )
      .limit(1);

    const existingPage = await query;

    // If we're editing, exclude the current page from the check
    if (existingPage.length > 0 && excludeId && existingPage[0].id === excludeId) {
      return NextResponse.json({ available: true });
    }

    return NextResponse.json({
      available: existingPage.length === 0,
    });
  } catch (error) {
    console.error("Error checking slug availability:", error);
    return NextResponse.json(
      { error: "Failed to check slug availability" },
      { status: 500 }
    );
  }
}

