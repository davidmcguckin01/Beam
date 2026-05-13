/**
 * Feedback API Routes
 * 
 * POST /api/feedback - Create feedback entry (public or manual)
 * GET /api/feedback - List feedback with filters & sorting
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbacks, companies, people, feedbackPages, tasks } from "@/db/schema";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import {
  enrichFeedbackCompanyAndPerson,
  recalculateValueScoreForFeedback,
} from "@/lib/feedback-enrichment";
import { eq, and, desc, gte, lte, sql, or, isNotNull } from "drizzle-orm";

/**
 * POST /api/feedback
 * Create a new feedback entry from public page or manual submission
 * 
 * Body:
 * - rawText: string (required) - The feedback text
 * - feedbackPageId?: string - If submitted from a public feedback page
 * - submitterName?: string - Name of the submitter
 * - submitterEmail?: string - Email of the submitter
 * - submitterRole?: string - Role of the submitter
 * - companyName?: string - Company name
 * - companyDomain?: string - Company domain
 * - ipAddress?: string - IP address (for enrichment)
 * - source?: string - Source of feedback ("feedback_page" | "manual" | "email" | "slack")
 * - sentiment?: string - Sentiment ("positive" | "neutral" | "negative")
 * - urgency?: string - Urgency ("low" | "medium" | "high" | "critical")
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      rawText,
      feedbackPageId,
      submitterName,
      submitterEmail,
      submitterRole,
      companyName,
      companyDomain,
      ipAddress,
      source = "manual",
      sentiment,
      urgency,
    } = body;

    if (!rawText || !rawText.trim()) {
      return NextResponse.json(
        { error: "rawText is required" },
        { status: 400 }
      );
    }

    // Get workspace context (for authenticated requests)
    // For public submissions, workspaceId should come from feedbackPageId
    let workspaceId: string;
    let userId: string | undefined;

    if (feedbackPageId) {
      // Public submission - get workspace from feedback page
      const [page] = await db
        .select()
        .from(feedbackPages)
        .where(eq(feedbackPages.id, feedbackPageId))
        .limit(1);

      if (!page) {
        return NextResponse.json(
          { error: "Feedback page not found" },
          { status: 404 }
        );
      }

      workspaceId = page.workspaceId;
    } else {
      // Manual submission - require workspace context
      const contextResult = await requireWorkspaceContext();
      if ("error" in contextResult) {
        return NextResponse.json(
          { error: contextResult.error },
          { status: contextResult.status }
        );
      }
      workspaceId = contextResult.context.workspace.id;
      userId = contextResult.context.user.id;
    }

    // Create feedback entry
    const [feedback] = await db
      .insert(feedbacks)
      .values({
        workspaceId,
        userId,
        feedbackPageId: feedbackPageId || null,
        rawText: rawText.trim(),
        rawFeedback: rawText.trim(), // Keep for backward compatibility
        source,
        submitterName: submitterName || null,
        submitterEmail: submitterEmail || null,
        submitterRole: submitterRole || null,
        companyName: companyName || null,
        companyDomain: companyDomain || null,
        ipAddress: ipAddress || null,
        sentiment: sentiment || null,
        urgency: urgency || null,
      })
      .returning();

    // Trigger enrichment and scoring asynchronously (don't block response)
    // In production, you might want to use a job queue
    enrichFeedbackCompanyAndPerson(feedback.id)
      .then(() => recalculateValueScoreForFeedback(feedback.id))
      .catch((error) => {
        console.error("Error enriching feedback:", error);
        // Don't fail the request if enrichment fails
      });

    return NextResponse.json(feedback, { status: 201 });
  } catch (error) {
    console.error("Error creating feedback:", error);
    return NextResponse.json(
      { error: "Failed to create feedback" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/feedback
 * List feedback entries with filters and sorting
 * 
 * Query params:
 * - workspaceId?: string - Filter by workspace (defaults to current workspace)
 * - strongICPOnly?: boolean - Only show Strong ICP feedback
 * - enterpriseOnly?: boolean - Only show enterprise-size companies (employees > 200)
 * - negativeSentimentOnly?: boolean - Only show negative or mixed sentiment
 * - sortBy?: "valueScore" | "icpScore" | "createdAt" - Sort field (default: valueScore)
 * - sortOrder?: "asc" | "desc" - Sort order (default: desc)
 * - limit?: number - Limit results (default: 50)
 * - offset?: number - Offset for pagination (default: 0)
 */
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
    const { searchParams } = new URL(request.url);

    const workspaceId = searchParams.get("workspaceId") || context.workspace.id;
    const strongICPOnly = searchParams.get("strongICPOnly") === "true";
    const enterpriseOnly = searchParams.get("enterpriseOnly") === "true";
    const negativeSentimentOnly = searchParams.get("negativeSentimentOnly") === "true";
    const sortBy = searchParams.get("sortBy") || "valueScore";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build query conditions
    const conditions = [eq(feedbacks.workspaceId, workspaceId)];

    // Filter: Strong ICP only
    if (strongICPOnly) {
      conditions.push(eq(feedbacks.icpMatchLabel, "Strong ICP"));
    }

    // Filter: Enterprise only (employees > 200)
    if (enterpriseOnly) {
      conditions.push(
        sql`${companies.employeeCount} > 200`
      );
    }

    // Filter: Negative sentiment only
    if (negativeSentimentOnly) {
      conditions.push(
        sql`(${feedbacks.sentiment} = 'negative' OR ${feedbacks.sentiment}::text LIKE '%negative%' OR ${feedbacks.sentiment}::text LIKE '%critical%')`
      );
    }

    // Build sort order
    let orderBy;
    switch (sortBy) {
      case "valueScore":
        orderBy = sortOrder === "asc" 
          ? sql`${feedbacks.valueScore} ASC NULLS LAST`
          : sql`${feedbacks.valueScore} DESC NULLS LAST`;
        break;
      case "icpScore":
        orderBy = sortOrder === "asc"
          ? sql`${feedbacks.icpScore} ASC NULLS LAST`
          : sql`${feedbacks.icpScore} DESC NULLS LAST`;
        break;
      case "createdAt":
        orderBy = sortOrder === "asc"
          ? feedbacks.createdAt
          : desc(feedbacks.createdAt);
        break;
      default:
        orderBy = sql`${feedbacks.valueScore} DESC NULLS LAST`;
    }

    // Query feedback with company data
    const results = await db
      .select({
        feedback: feedbacks,
        company: {
          id: companies.id,
          name: companies.name,
          domain: companies.domain,
          industry: companies.industry,
          employeeCount: companies.employeeCount,
          revenue: companies.revenue,
        },
        taskCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${tasks}
          WHERE ${tasks.feedbackId} = ${feedbacks.id}
        )`,
      })
      .from(feedbacks)
      .leftJoin(companies, eq(feedbacks.companyId, companies.id))
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Format response
    const formattedResults = results.map((r) => ({
      ...r.feedback,
      company: r.company,
      taskCount: r.taskCount,
    }));

    return NextResponse.json({
      feedback: formattedResults,
      pagination: {
        limit,
        offset,
        total: formattedResults.length, // TODO: Add count query for total
      },
    });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}

