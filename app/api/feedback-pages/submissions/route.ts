import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbackSubmissions, feedbackPages } from "@/db/schema";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { eq, and, desc, asc, or, like, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";

// GET /api/feedback-pages/submissions - Get all submissions with filtering, search, and sorting
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
    
    // Get query parameters
    const pageIds = searchParams.get("pageIds")?.split(",").filter(Boolean) || [];
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query conditions
    const conditions = [eq(feedbackSubmissions.workspaceId, context.workspace.id)];

    // Filter by page IDs
    if (pageIds.length > 0) {
      conditions.push(inArray(feedbackSubmissions.feedbackPageId, pageIds));
    }

    // Search in feedback, name, and email
    if (search) {
      conditions.push(
        or(
          like(feedbackSubmissions.feedback, `%${search}%`),
          like(feedbackSubmissions.submitterName, `%${search}%`),
          like(feedbackSubmissions.submitterEmail, `%${search}%`)
        )!
      );
    }

    // Build order by clause
    let orderBy;
    switch (sortBy) {
      case "createdAt":
        orderBy = sortOrder === "asc" 
          ? asc(feedbackSubmissions.createdAt)
          : desc(feedbackSubmissions.createdAt);
        break;
      case "submitterName":
        orderBy = sortOrder === "asc"
          ? asc(feedbackSubmissions.submitterName)
          : desc(feedbackSubmissions.submitterName);
        break;
      case "submitterEmail":
        orderBy = sortOrder === "asc"
          ? asc(feedbackSubmissions.submitterEmail)
          : desc(feedbackSubmissions.submitterEmail);
        break;
      case "feedback":
        orderBy = sortOrder === "asc"
          ? asc(feedbackSubmissions.feedback)
          : desc(feedbackSubmissions.feedback);
        break;
      default:
        orderBy = desc(feedbackSubmissions.createdAt);
    }

    // Get submissions with page info
    // Try to select all columns, but handle missing columns gracefully
    let submissions;
    try {
      submissions = await db
        .select({
          submission: feedbackSubmissions,
          page: {
            id: feedbackPages.id,
            title: feedbackPages.title,
            slug: feedbackPages.slug,
          },
        })
        .from(feedbackSubmissions)
        .innerJoin(feedbackPages, eq(feedbackSubmissions.feedbackPageId, feedbackPages.id))
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);
    } catch (dbError: any) {
      // If columns don't exist, use fallback select with only core columns
      const isColumnError = 
        dbError?.code === "42703" || 
        dbError?.cause?.code === "42703" ||
        dbError?.message?.includes("does not exist") ||
        dbError?.cause?.message?.includes("does not exist");
      
      if (isColumnError) {
        console.warn("Some columns may not exist, using fallback select with core columns only");
        submissions = await db
          .select({
            submission: {
              id: feedbackSubmissions.id,
              feedbackPageId: feedbackSubmissions.feedbackPageId,
              workspaceId: feedbackSubmissions.workspaceId,
              submitterName: feedbackSubmissions.submitterName,
              submitterEmail: feedbackSubmissions.submitterEmail,
              feedback: feedbackSubmissions.feedback,
              ipAddress: feedbackSubmissions.ipAddress,
              country: feedbackSubmissions.country,
              userAgent: feedbackSubmissions.userAgent,
              referer: feedbackSubmissions.referer,
              timeOnPageSeconds: feedbackSubmissions.timeOnPageSeconds,
              metadata: feedbackSubmissions.metadata,
              createdAt: feedbackSubmissions.createdAt,
            },
            page: {
              id: feedbackPages.id,
              title: feedbackPages.title,
              slug: feedbackPages.slug,
            },
          })
          .from(feedbackSubmissions)
          .innerJoin(feedbackPages, eq(feedbackSubmissions.feedbackPageId, feedbackPages.id))
          .where(and(...conditions))
          .orderBy(orderBy)
          .limit(limit)
          .offset(offset);
      } else {
        throw dbError;
      }
    }

    // Get total count for pagination
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(feedbackSubmissions)
      .where(and(...conditions));

    const total = Number(countResult?.count || 0);

    // Format response
    const formattedSubmissions = submissions.map(({ submission, page }) => ({
      ...submission,
      pageTitle: page.title,
      pageSlug: page.slug,
    }));

    return NextResponse.json({
      submissions: formattedSubmissions,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}

// DELETE /api/feedback-pages/submissions - Delete submissions (bulk)
export async function DELETE(request: NextRequest) {
  try {
    const contextResult = await requireWorkspaceContext();
    if ("error" in contextResult) {
      return NextResponse.json(
        { error: contextResult.error },
        { status: contextResult.status }
      );
    }

    const { context } = contextResult;
    const body = await request.json();
    const { submissionIds } = body;

    if (!submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
      return NextResponse.json(
        { error: "Submission IDs are required" },
        { status: 400 }
      );
    }

    // Verify all submissions belong to the workspace
    const submissions = await db
      .select()
      .from(feedbackSubmissions)
      .where(
        and(
          inArray(feedbackSubmissions.id, submissionIds),
          eq(feedbackSubmissions.workspaceId, context.workspace.id)
        )
      );

    if (submissions.length !== submissionIds.length) {
      return NextResponse.json(
        { error: "Some submissions not found or unauthorized" },
        { status: 403 }
      );
    }

    // Delete submissions
    await db
      .delete(feedbackSubmissions)
      .where(
        and(
          inArray(feedbackSubmissions.id, submissionIds),
          eq(feedbackSubmissions.workspaceId, context.workspace.id)
        )
      );

    return NextResponse.json({
      success: true,
      deletedCount: submissionIds.length,
    });
  } catch (error) {
    console.error("Error deleting submissions:", error);
    return NextResponse.json(
      { error: "Failed to delete submissions" },
      { status: 500 }
    );
  }
}

