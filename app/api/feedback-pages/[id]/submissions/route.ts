import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbackSubmissions, feedbackPages, feedbacks } from "@/db/schema";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { eq, and, desc } from "drizzle-orm";
import { enrichIPAddress, enrichPersonData, enrichCompanyData } from "@/lib/ip-enrichment";
import { enrichFeedbackCompanyAndPerson, recalculateValueScoreForFeedback } from "@/lib/feedback-enrichment";
import { getMonthlyResponseUsage, getWorkspacePlanInfo, deductCredit } from "@/lib/plan-gates";
import { createTasksFromSubmission } from "@/lib/submission-tasks";

// POST /api/feedback-pages/[id]/submissions - Submit feedback (public endpoint)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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


  try {
    const { id } = await params;
    const body = await request.json();
    const {
      feedback,
      submitterName,
      submitterEmail,
      metadata,
      timeOnPageSeconds,
      isDraft = false,
    } = body as Record<string, any>;

    if (!feedback || !feedback.trim()) {
      return NextResponse.json(
        { error: "Feedback is required" },
        { status: 400 }
      );
    }

    // Get client information
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get("user-agent") || null;
    const referer = request.headers.get("referer") || null;

    // Get the feedback page first (needed for workspace checks)
    const [page] = await db
      .select()
      .from(feedbackPages)
      .where(eq(feedbackPages.id, id))
      .limit(1);

    if (!page) {
      return NextResponse.json(
        { error: "Feedback page not found" },
        { status: 404 }
      );
    }

    if (!page.isActive) {
      return NextResponse.json(
        { error: "Feedback page is not active" },
        { status: 400 }
      );
    }

    // Enforce monthly workspace response limit (all tiers)
    if (!isDraft) {
      const usage = await getMonthlyResponseUsage(page.workspaceId);
      if (usage.remaining !== null && usage.remaining <= 0) {
        return NextResponse.json(
          {
            error: "RESPONSE_LIMIT_REACHED",
            used: usage.used,
            limit: usage.effectiveLimit,
            resetsAt: usage.resetsAt.toISOString(),
          },
          { status: 403 }
        );
      }
    }

    // Basic IP geo enrichment (free, always run) — gives country/city/state for submissions
    const enrichedData = await enrichIPAddress(ipAddress);

    // PDL person/company enrichment — runs whenever PDL_API_KEY is configured
    const planInfo = await getWorkspacePlanInfo(page.workspaceId);
    const canEnrich = !!process.env.PDL_API_KEY || planInfo.enrichmentCredits > 0;

    let personData = null;
    if (canEnrich && (submitterEmail || submitterName)) {
      personData = await enrichPersonData(submitterEmail || null, submitterName || null, {
        city: enrichedData.city || null,
        state: enrichedData.state || null,
        country: enrichedData.country || null,
      });
    }

    let companyData = null;
    if (canEnrich && submitterEmail) {
      const emailDomain = submitterEmail.split("@")[1];
      if (emailDomain) companyData = await enrichCompanyData(emailDomain);
    }

    if (canEnrich && (personData || companyData)) {
      await deductCredit(page.workspaceId, "Person/company enrichment for form submission");
    }

    // Parse customizations to check if email is required
    let customizations: any = {};
    try {
      customizations = page.customizations
        ? JSON.parse(page.customizations)
        : {};
    } catch (e) {
      // Ignore parse errors
    }

    // Check if email is required
    if (customizations.requireEmail && !submitterEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Create submission with enriched analytics data
    // Try with all columns first, fallback to core columns if some don't exist
    let submission;
    try {
      [submission] = await db
        .insert(feedbackSubmissions)
        .values({
          feedbackPageId: page.id,
          workspaceId: page.workspaceId,
          feedback: feedback.trim(),
          submitterName: submitterName || null,
          submitterEmail: submitterEmail || null,
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
          metadata: metadata ? JSON.stringify(metadata) : null,
          isDraft: isDraft,
          // Person enrichment data
          jobTitle: personData?.jobTitle || null,
          jobCompanyName: personData?.jobCompanyName || null,
          jobCompanyDomain: personData?.jobCompanyDomain || null,
          jobCompanyWebsite: personData?.jobCompanyWebsite || null,
          jobCompanyIndustry: personData?.jobCompanyIndustry || null,
          jobCompanyLocation: personData?.jobCompanyLocation || null,
          jobStartDate: personData?.jobStartDate || null,
          jobEndDate: personData?.jobEndDate || null,
          personExperience: personData?.experience ? JSON.stringify(personData.experience) : null,
          personEducation: personData?.education ? JSON.stringify(personData.education) : null,
          personProfiles: personData?.profiles ? JSON.stringify(personData.profiles) : null,
          personSkills: personData?.skills ? JSON.stringify(personData.skills) : null,
          personInterests: personData?.interests ? JSON.stringify(personData.interests) : null,
          personLanguages: personData?.languages ? JSON.stringify(personData.languages) : null,
          personNetworkMembers: personData?.networkMembers ? JSON.stringify(personData.networkMembers) : null,
          personRawData: personData?.rawPersonData || null,
          // Company enrichment data (from email domain)
          companyWebsite: companyData?.companyWebsite || null,
          companyDescription: companyData?.companyDescription || null,
          companyEmployees: companyData?.companyEmployees || null,
          companyRevenue: companyData?.companyRevenue || null,
          companyFounded: companyData?.companyFounded || null,
          companyLinkedinUrl: companyData?.companyLinkedinUrl || null,
          companyTwitterUrl: companyData?.companyTwitterUrl || null,
          companyFacebookUrl: companyData?.companyFacebookUrl || null,
          companyEmployeesList: companyData?.companyEmployeesList ? JSON.stringify(companyData.companyEmployeesList) : null,
          companyRawData: companyData?.rawCompanyData || null,
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
          // Excludes: city, state, postal_code, company fields, isp, connection_type, latitude, longitude
          [submission] = await db
            .insert(feedbackSubmissions)
            .values({
              feedbackPageId: page.id,
              workspaceId: page.workspaceId,
              feedback: feedback.trim(),
              submitterName: submitterName || null,
              submitterEmail: submitterEmail || null,
              ipAddress: ipAddress || null,
              userAgent: userAgent,
              referer: referer,
              timeOnPageSeconds: timeOnPageSeconds || null,
              metadata: metadata ? JSON.stringify(metadata) : null,
            })
            .returning({
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
            });
        } catch (fallbackError: any) {
          console.error("Fallback insert also failed:", fallbackError);
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }

    // For drafts, skip feedbacks record and task creation — return early
    if (isDraft) {
      return NextResponse.json(submission, { status: 201 });
    }

    // Extract company domain from enriched data or email
    let companyDomain: string | null = enrichedData.companyDomain || null;
    if (!companyDomain && submitterEmail) companyDomain = submitterEmail.split("@")[1] || null;
    if (!companyDomain && companyData?.companyWebsite) {
      try {
        companyDomain = new URL(companyData.companyWebsite).hostname.replace("www.", "");
      } catch { /* skip */ }
    }

    // Create a feedbacks record for compatibility with existing system
    // Public submissions don't have a user, so userId is undefined
    const [savedFeedback] = await db
      .insert(feedbacks)
      .values({
        workspaceId: page.workspaceId,
        userId: undefined, // Public submissions don't have a user
        feedbackPageId: page.id,
        customerId: null,
        rawText: feedback.trim(), // Required field
        rawFeedback: feedback.trim(), // Keep for backward compatibility
        source: "feedback_page",
        // Include submitter info for enrichment
        submitterName: submitterName || null,
        submitterEmail: submitterEmail || null,
        submitterRole: personData?.jobTitle || null,
        companyName: enrichedData.companyName || companyData?.companyName || null,
        companyDomain: companyDomain || null,
        ipAddress: ipAddress || null,
      })
      .returning();

    if (!savedFeedback) {
      throw new Error("Failed to save feedback record");
    }

    // Trigger enrichment and customer creation asynchronously (don't block response)
    enrichFeedbackCompanyAndPerson(savedFeedback.id)
      .then((result) => {
        console.log("Enrichment completed:", {
          feedbackId: savedFeedback.id,
          companyId: result.companyId,
          personId: result.personId,
          customerId: result.customerId,
        });
        return recalculateValueScoreForFeedback(savedFeedback.id);
      })
      .then((valueScore) => {
        console.log("Value score calculated:", { feedbackId: savedFeedback.id, valueScore });
      })
      .catch((error) => {
        console.error("Error enriching feedback from submission:", {
          feedbackId: savedFeedback.id,
          error: error.message,
          stack: error.stack,
        });
      });

    try {
      await createTasksFromSubmission(submission, feedback.trim(), page.workspaceId, savedFeedback.id);
    } catch (taskError) {
      console.error("Error creating tasks from submission:", taskError);
    }

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}

// GET /api/feedback-pages/[id]/submissions - Get submissions (authenticated)
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

    // Check if page exists and belongs to workspace
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
      return NextResponse.json(
        { error: "Feedback page not found" },
        { status: 404 }
      );
    }

    // Get submissions - exclude drafts
    let submissions;
    try {
      submissions = await db
        .select()
        .from(feedbackSubmissions)
        .where(and(eq(feedbackSubmissions.feedbackPageId, id), eq(feedbackSubmissions.isDraft, false)))
        .orderBy(desc(feedbackSubmissions.createdAt));
    } catch (error: any) {
      // If columns don't exist, select only core columns that exist in migration 0007
      const isColumnError = 
        error?.code === "42703" || 
        error?.cause?.code === "42703" ||
        error?.message?.includes("does not exist") ||
        error?.cause?.message?.includes("does not exist");
      
      if (isColumnError) {
        console.warn("Some columns may not exist, using fallback select with core columns only");
        submissions = await db
          .select({
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
          })
          .from(feedbackSubmissions)
          .where(eq(feedbackSubmissions.feedbackPageId, id))
          .orderBy(desc(feedbackSubmissions.createdAt));
      } else {
        throw error;
      }
    }

    return NextResponse.json(submissions);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}

// DELETE /api/feedback-pages/[id]/submissions - Delete all submissions (authenticated)
export async function DELETE(
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

    // Check if page exists and belongs to workspace
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
      return NextResponse.json(
        { error: "Feedback page not found" },
        { status: 404 }
      );
    }

    await db
      .delete(feedbackSubmissions)
      .where(eq(feedbackSubmissions.feedbackPageId, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting submissions:", error);
    return NextResponse.json(
      { error: "Failed to delete submissions" },
      { status: 500 }
    );
  }
}

