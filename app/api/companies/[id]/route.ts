/**
 * Company API Route
 * 
 * GET /api/companies/[id]
 * Get company profile with aggregated feedback data
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies, feedbacks, people, tasks } from "@/db/schema";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { eq, and, sql, count } from "drizzle-orm";

/**
 * GET /api/companies/[id]
 * Get company profile with:
 * - Company details (from enrichment)
 * - All feedback from that company
 * - Aggregated sentiment
 * - Count of open tasks
 */
export async function GET(
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

    // Load company
    const [company] = await db
      .select()
      .from(companies)
      .where(
        and(
          eq(companies.id, id),
          eq(companies.workspaceId, context.workspace.id)
        )
      )
      .limit(1);

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // Load all feedback from this company
    const companyFeedback = await db
      .select({
        id: feedbacks.id,
        rawText: feedbacks.rawText,
        rawFeedback: feedbacks.rawFeedback,
        sentiment: feedbacks.sentiment,
        urgency: feedbacks.urgency,
        icpScore: feedbacks.icpScore,
        valueScore: feedbacks.valueScore,
        createdAt: feedbacks.createdAt,
        taskCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${tasks}
          WHERE ${tasks.feedbackId} = ${feedbacks.id}
        )`,
      })
      .from(feedbacks)
      .where(
        and(
          eq(feedbacks.companyId, id),
          eq(feedbacks.workspaceId, context.workspace.id)
        )
      )
      .orderBy(feedbacks.createdAt);

    // Calculate aggregated sentiment
    const sentimentCounts = companyFeedback.reduce(
      (acc, f) => {
        const sentiment = f.sentiment?.toLowerCase() || "unknown";
        if (sentiment.includes("positive")) {
          acc.positive++;
        } else if (sentiment.includes("negative") || sentiment.includes("critical")) {
          acc.negative++;
        } else {
          acc.neutral++;
        }
        return acc;
      },
      { positive: 0, negative: 0, neutral: 0 }
    );

    // Count open tasks (not done)
    const [openTasksResult] = await db
      .select({ count: count() })
      .from(tasks)
      .innerJoin(feedbacks, eq(tasks.feedbackId, feedbacks.id))
      .where(
        and(
          eq(feedbacks.companyId, id),
          eq(feedbacks.workspaceId, context.workspace.id),
          sql`${tasks.status} != 'done'`
        )
      );

    const openTasksCount = openTasksResult?.count || 0;

    // Load people associated with this company
    const companyPeople = await db
      .select()
      .from(people)
      .where(
        and(
          eq(people.companyId, id),
          eq(people.workspaceId, context.workspace.id)
        )
      )
      .orderBy(people.createdAt);

    return NextResponse.json({
      company,
      feedback: companyFeedback,
      aggregated: {
        totalFeedback: companyFeedback.length,
        sentiment: sentimentCounts,
        openTasksCount,
        averageICPScore: companyFeedback.length > 0
          ? companyFeedback.reduce((sum, f) => sum + (f.icpScore || 0), 0) / companyFeedback.length
          : null,
        averageValueScore: companyFeedback.length > 0
          ? companyFeedback.reduce((sum, f) => sum + (f.valueScore || 0), 0) / companyFeedback.length
          : null,
      },
      people: companyPeople,
    });
  } catch (error) {
    console.error("Error fetching company:", error);
    return NextResponse.json(
      { error: "Failed to fetch company" },
      { status: 500 }
    );
  }
}

