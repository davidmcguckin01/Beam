import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbackPageViews, feedbackPages } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { enrichIPAddress } from "@/lib/ip-enrichment";

// Helper to get client IP
function getClientIP(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  return null;
}


// POST /api/feedback-pages/[id]/track-view - Track a page view (public)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { sessionId, timeOnPageSeconds } = body;

    // Get the feedback page
    const [page] = await db
      .select()
      .from(feedbackPages)
      .where(eq(feedbackPages.id, id))
      .limit(1);

    if (!page || !page.isActive) {
      return NextResponse.json(
        { error: "Feedback page not found or inactive" },
        { status: 404 }
      );
    }

    // Get client information
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get("user-agent") || null;
    const referer = request.headers.get("referer") || null;
    
    // Enrich IP address with PDL or fallback service
    const enrichedData = await enrichIPAddress(ipAddress);

    // If timeOnPageSeconds is provided, try to update existing view for this session
    if (timeOnPageSeconds && sessionId) {
      try {
        const existingViews = await db
          .select({
            id: feedbackPageViews.id,
            feedbackPageId: feedbackPageViews.feedbackPageId,
            sessionId: feedbackPageViews.sessionId,
            timeOnPageSeconds: feedbackPageViews.timeOnPageSeconds,
          })
          .from(feedbackPageViews)
          .where(
            and(
              eq(feedbackPageViews.feedbackPageId, page.id),
              eq(feedbackPageViews.sessionId, sessionId)
            )
          )
          .limit(1);

        if (existingViews.length > 0) {
          // Update existing view with time on page
          const [updated] = await db
            .update(feedbackPageViews)
            .set({ timeOnPageSeconds })
            .where(eq(feedbackPageViews.id, existingViews[0].id))
            .returning();
          return NextResponse.json(updated);
        }
      } catch (error: any) {
        // If columns don't exist, skip the update check and continue to create new view
        const isColumnError = 
          error?.code === "42703" || 
          error?.cause?.code === "42703" ||
          error?.message?.includes("does not exist") ||
          error?.cause?.message?.includes("does not exist");
        
        if (!isColumnError) {
          throw error;
        }
      }
    }

    // Create new view record with enriched data
    // Try with all columns first, fallback to core columns if some don't exist
    let view;
    try {
      [view] = await db
        .insert(feedbackPageViews)
        .values({
          feedbackPageId: page.id,
          workspaceId: page.workspaceId,
          ipAddress: ipAddress || null,
          country: enrichedData.country || null,
          city: enrichedData.city || null,
          state: enrichedData.state || null,
          postalCode: enrichedData.postalCode || null,
          companyName: enrichedData.companyName || null,
          companyDomain: enrichedData.companyDomain || null,
          companyIndustry: enrichedData.companyIndustry || null,
          isp: enrichedData.isp || null,
          connectionType: enrichedData.connectionType || null,
          latitude: enrichedData.latitude?.toString() || null,
          longitude: enrichedData.longitude?.toString() || null,
          userAgent: userAgent,
          referer: referer,
          timeOnPageSeconds: timeOnPageSeconds || null,
          sessionId: sessionId || null,
        })
        .returning();
    } catch (error: any) {
      // If columns don't exist, use only core columns that definitely exist
      // Check both error.code and error.cause.code (Neon wraps errors in cause)
      const isColumnError = 
        error?.code === "42703" || 
        error?.cause?.code === "42703" ||
        error?.message?.includes("does not exist") ||
        error?.cause?.message?.includes("does not exist");
      
      if (isColumnError) {
        console.warn("Some columns may not exist, using fallback insert with core columns only");
        try {
          // Fallback: only use columns that exist in migration 0007
          // Excludes: state, postal_code, company fields, isp, connection_type, latitude, longitude
          [view] = await db
            .insert(feedbackPageViews)
            .values({
              feedbackPageId: page.id,
              workspaceId: page.workspaceId,
              ipAddress: ipAddress || null,
              country: enrichedData.country || null,
              city: enrichedData.city || null, // city exists in 0007
              userAgent: userAgent,
              referer: referer,
              timeOnPageSeconds: timeOnPageSeconds || null,
              sessionId: sessionId || null,
            })
            .returning({
              id: feedbackPageViews.id,
              feedbackPageId: feedbackPageViews.feedbackPageId,
              workspaceId: feedbackPageViews.workspaceId,
              ipAddress: feedbackPageViews.ipAddress,
              country: feedbackPageViews.country,
              city: feedbackPageViews.city,
              userAgent: feedbackPageViews.userAgent,
              referer: feedbackPageViews.referer,
              timeOnPageSeconds: feedbackPageViews.timeOnPageSeconds,
              sessionId: feedbackPageViews.sessionId,
              createdAt: feedbackPageViews.createdAt,
            });
        } catch (fallbackError: any) {
          console.error("Fallback insert also failed:", fallbackError);
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }

    return NextResponse.json(view, { status: 201 });
  } catch (error) {
    console.error("Error tracking view:", error);
    return NextResponse.json(
      { error: "Failed to track view" },
      { status: 500 }
    );
  }
}
