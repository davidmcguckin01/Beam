import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbackPageViews, feedbackSubmissions } from "@/db/schema";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { eq, and, count, sql, desc, gte, lte } from "drizzle-orm";

// GET /api/feedback-pages/[id]/analytics - Get analytics for a feedback page
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

    // Parse time range query params
    const url = new URL(request.url);
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");

    const to = toParam ? new Date(toParam) : new Date();
    // Default to last 30 days
    const from = fromParam
      ? new Date(fromParam)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Set to end of day for `to`
    to.setHours(23, 59, 59, 999);
    // Set to start of day for `from`
    from.setHours(0, 0, 0, 0);

    // Compute previous period (same duration immediately before `from`)
    const durationMs = to.getTime() - from.getTime();
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - durationMs);

    const baseViewsWhere = and(
      eq(feedbackPageViews.feedbackPageId, id),
      eq(feedbackPageViews.workspaceId, context.workspace.id)
    );

    const baseSubsWhere = and(
      eq(feedbackSubmissions.feedbackPageId, id),
      eq(feedbackSubmissions.workspaceId, context.workspace.id)
    );

    // ── Current period queries ──────────────────────────────────────────────

    const currentViewsWhere = and(
      baseViewsWhere,
      gte(feedbackPageViews.createdAt, from),
      lte(feedbackPageViews.createdAt, to)
    );

    const currentSubsWhere = and(
      baseSubsWhere,
      gte(feedbackSubmissions.createdAt, from),
      lte(feedbackSubmissions.createdAt, to)
    );

    const [
      viewsResult,
      uniqueVisitorsResult,
      submissionsResult,
      draftsResult,
      avgTimeResult,
    ] = await Promise.all([
      db.select({ count: count() }).from(feedbackPageViews).where(currentViewsWhere),
      db.selectDistinct({ sessionId: feedbackPageViews.sessionId }).from(feedbackPageViews).where(currentViewsWhere),
      db.select({ count: count() }).from(feedbackSubmissions).where(and(currentSubsWhere, eq(feedbackSubmissions.isDraft, false))),
      db.select({ count: count() }).from(feedbackSubmissions).where(and(currentSubsWhere, eq(feedbackSubmissions.isDraft, true))),
      db.select({ avgTime: sql<number>`COALESCE(AVG(${feedbackPageViews.timeOnPageSeconds}), 0)` }).from(feedbackPageViews).where(currentViewsWhere),
    ]);

    // ── Previous period queries ─────────────────────────────────────────────

    const prevViewsWhere = and(
      baseViewsWhere,
      gte(feedbackPageViews.createdAt, prevFrom),
      lte(feedbackPageViews.createdAt, prevTo)
    );

    const prevSubsWhere = and(
      baseSubsWhere,
      gte(feedbackSubmissions.createdAt, prevFrom),
      lte(feedbackSubmissions.createdAt, prevTo)
    );

    const [
      prevViewsResult,
      prevUniqueResult,
      prevSubsResult,
      prevDraftsResult,
      prevAvgTimeResult,
    ] = await Promise.all([
      db.select({ count: count() }).from(feedbackPageViews).where(prevViewsWhere),
      db.selectDistinct({ sessionId: feedbackPageViews.sessionId }).from(feedbackPageViews).where(prevViewsWhere),
      db.select({ count: count() }).from(feedbackSubmissions).where(and(prevSubsWhere, eq(feedbackSubmissions.isDraft, false))),
      db.select({ count: count() }).from(feedbackSubmissions).where(and(prevSubsWhere, eq(feedbackSubmissions.isDraft, true))),
      db.select({ avgTime: sql<number>`COALESCE(AVG(${feedbackPageViews.timeOnPageSeconds}), 0)` }).from(feedbackPageViews).where(prevViewsWhere),
    ]);

    // ── Views by country (current period) ──────────────────────────────────

    let viewsByCountry: Array<{ country: string | null; count: number }> = [];
    try {
      viewsByCountry = await db
        .select({ country: feedbackPageViews.country, count: count() })
        .from(feedbackPageViews)
        .where(currentViewsWhere)
        .groupBy(feedbackPageViews.country);
    } catch (error: any) {
      if (!(error?.code === "42703" || error?.cause?.code === "42703" || error?.message?.includes("does not exist"))) {
        throw error;
      }
    }

    // ── Time series (current period) ────────────────────────────────────────

    const [viewsByDate, submissionsByDate, draftsByDate] = await Promise.all([
      db
        .select({ date: sql<string>`DATE(${feedbackPageViews.createdAt})`, count: count() })
        .from(feedbackPageViews)
        .where(currentViewsWhere)
        .groupBy(sql`DATE(${feedbackPageViews.createdAt})`)
        .orderBy(sql`DATE(${feedbackPageViews.createdAt})`),
      db
        .select({ date: sql<string>`DATE(${feedbackSubmissions.createdAt})`, count: count() })
        .from(feedbackSubmissions)
        .where(and(currentSubsWhere, eq(feedbackSubmissions.isDraft, false)))
        .groupBy(sql`DATE(${feedbackSubmissions.createdAt})`)
        .orderBy(sql`DATE(${feedbackSubmissions.createdAt})`),
      db
        .select({ date: sql<string>`DATE(${feedbackSubmissions.createdAt})`, count: count() })
        .from(feedbackSubmissions)
        .where(and(currentSubsWhere, eq(feedbackSubmissions.isDraft, true)))
        .groupBy(sql`DATE(${feedbackSubmissions.createdAt})`)
        .orderBy(sql`DATE(${feedbackSubmissions.createdAt})`),
    ]);

    // ── Recent views with enrichment data (for breakdowns) ──────────────────

    let recentViews: Array<{
      id: string;
      country: string | null;
      userAgent: string | null;
      referer: string | null;
      companyName: string | null;
      jobCompanyName: string | null;
      sessionId: string | null;
      ipAddress: string | null;
      createdAt: Date;
    }> = [];

    try {
      recentViews = await db
        .select({
          id: feedbackPageViews.id,
          country: feedbackPageViews.country,
          userAgent: feedbackPageViews.userAgent,
          referer: feedbackPageViews.referer,
          companyName: feedbackPageViews.companyName,
          jobCompanyName: feedbackPageViews.jobCompanyName,
          sessionId: feedbackPageViews.sessionId,
          ipAddress: feedbackPageViews.ipAddress,
          createdAt: feedbackPageViews.createdAt,
        })
        .from(feedbackPageViews)
        .where(currentViewsWhere)
        .orderBy(desc(feedbackPageViews.createdAt))
        .limit(500);
    } catch (error: any) {
      if (
        error?.code === "42703" ||
        error?.cause?.code === "42703" ||
        error?.message?.includes("does not exist")
      ) {
        // Fallback: select only core columns
        const fallback = await db
          .select({
            id: feedbackPageViews.id,
            country: feedbackPageViews.country,
            userAgent: feedbackPageViews.userAgent,
            referer: feedbackPageViews.referer,
            sessionId: feedbackPageViews.sessionId,
            ipAddress: feedbackPageViews.ipAddress,
            createdAt: feedbackPageViews.createdAt,
          })
          .from(feedbackPageViews)
          .where(currentViewsWhere)
          .orderBy(desc(feedbackPageViews.createdAt))
          .limit(500);
        recentViews = fallback.map((v) => ({ ...v, companyName: null, jobCompanyName: null }));
      } else {
        throw error;
      }
    }

    return NextResponse.json({
      totalViews: viewsResult[0]?.count || 0,
      uniqueVisitors: uniqueVisitorsResult.length,
      totalSubmissions: submissionsResult[0]?.count || 0,
      totalDrafts: draftsResult[0]?.count || 0,
      averageTimeOnPage: Math.round(avgTimeResult[0]?.avgTime || 0),
      viewsByCountry,
      timeSeries: {
        views: viewsByDate,
        submissions: submissionsByDate,
        drafts: draftsByDate,
      },
      comparison: {
        totalViews: prevViewsResult[0]?.count || 0,
        uniqueVisitors: prevUniqueResult.length,
        totalSubmissions: prevSubsResult[0]?.count || 0,
        totalDrafts: prevDraftsResult[0]?.count || 0,
        averageTimeOnPage: Math.round(prevAvgTimeResult[0]?.avgTime || 0),
      },
      recentViews,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
