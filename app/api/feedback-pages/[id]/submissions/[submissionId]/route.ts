import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbackSubmissions, feedbackPages, feedbacks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { enrichPersonData, enrichCompanyData } from "@/lib/ip-enrichment";
import { enrichFeedbackCompanyAndPerson, recalculateValueScoreForFeedback } from "@/lib/feedback-enrichment";
import { getMonthlyResponseUsage, getWorkspacePlanInfo, deductCredit } from "@/lib/plan-gates";
import { createTasksFromSubmission } from "@/lib/submission-tasks";

// PATCH /api/feedback-pages/[id]/submissions/[submissionId]
// Updates a draft submission. Pass finalize:true to convert it to a real submission.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const { id, submissionId } = await params;
    const body = await request.json();
    const { feedback, submitterName, submitterEmail, timeOnPageSeconds, finalize = false } = body;

    // Look up the submission — verify it belongs to this feedback page
    const [submission] = await db
      .select()
      .from(feedbackSubmissions)
      .where(and(eq(feedbackSubmissions.id, submissionId), eq(feedbackSubmissions.feedbackPageId, id)))
      .limit(1);

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Only allow updating drafts
    if (!submission.isDraft) {
      return NextResponse.json({ error: "Submission already finalized" }, { status: 409 });
    }

    const newFeedback = feedback?.trim() || submission.feedback;
    const newName = submitterName ?? submission.submitterName;
    const newEmail = submitterEmail ?? submission.submitterEmail;
    const newTimeOnPage = timeOnPageSeconds ?? submission.timeOnPageSeconds;

    if (!finalize) {
      // Simple draft update
      const [updated] = await db
        .update(feedbackSubmissions)
        .set({
          feedback: newFeedback,
          submitterName: newName,
          submitterEmail: newEmail,
          timeOnPageSeconds: newTimeOnPage,
        })
        .where(eq(feedbackSubmissions.id, submissionId))
        .returning();
      return NextResponse.json(updated);
    }

    // ── Finalize ─────────────────────────────────────────────────────────────

    // Get the feedback page for workspace checks
    const [page] = await db
      .select()
      .from(feedbackPages)
      .where(eq(feedbackPages.id, id))
      .limit(1);

    if (!page) {
      return NextResponse.json({ error: "Feedback page not found" }, { status: 404 });
    }

    // Check monthly workspace response limit
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

    // Run PDL person/company enrichment now that we have name/email
    const planInfo = await getWorkspacePlanInfo(page.workspaceId);
    const canEnrich = planInfo.enrichmentCredits > 0;

    let personData = null;
    if (canEnrich && (newEmail || newName)) {
      personData = await enrichPersonData(newEmail || null, newName || null, {
        city: submission.city || null,
        state: submission.state || null,
        country: submission.country || null,
      });
    }

    let companyData = null;
    if (canEnrich && submission.companyDomain) {
      companyData = await enrichCompanyData(submission.companyDomain);
    }
    if (canEnrich && !companyData && newEmail) {
      const emailDomain = newEmail.split("@")[1];
      if (emailDomain) companyData = await enrichCompanyData(emailDomain);
    }

    if (canEnrich && (personData || companyData)) {
      await deductCredit(page.workspaceId, "Person/company enrichment for form submission");
    }

    // Finalize the submission
    const [finalized] = await db
      .update(feedbackSubmissions)
      .set({
        feedback: newFeedback,
        submitterName: newName,
        submitterEmail: newEmail,
        timeOnPageSeconds: newTimeOnPage,
        isDraft: false,
        // Update PDL enrichment data
        jobTitle: personData?.jobTitle || submission.jobTitle,
        jobCompanyName: personData?.jobCompanyName || submission.jobCompanyName,
        jobCompanyDomain: personData?.jobCompanyDomain || submission.jobCompanyDomain,
        jobCompanyWebsite: personData?.jobCompanyWebsite || submission.jobCompanyWebsite,
        jobCompanyIndustry: personData?.jobCompanyIndustry || submission.jobCompanyIndustry,
        jobCompanyLocation: personData?.jobCompanyLocation || submission.jobCompanyLocation,
        jobStartDate: personData?.jobStartDate || submission.jobStartDate,
        jobEndDate: personData?.jobEndDate || submission.jobEndDate,
        personExperience: personData?.experience ? JSON.stringify(personData.experience) : submission.personExperience,
        personEducation: personData?.education ? JSON.stringify(personData.education) : submission.personEducation,
        personProfiles: personData?.profiles ? JSON.stringify(personData.profiles) : submission.personProfiles,
        personSkills: personData?.skills ? JSON.stringify(personData.skills) : submission.personSkills,
        personInterests: personData?.interests ? JSON.stringify(personData.interests) : submission.personInterests,
        personLanguages: personData?.languages ? JSON.stringify(personData.languages) : submission.personLanguages,
        personNetworkMembers: personData?.networkMembers ? JSON.stringify(personData.networkMembers) : submission.personNetworkMembers,
        personRawData: personData?.rawPersonData || submission.personRawData,
        companyDescription: companyData?.companyDescription || submission.companyDescription,
        companyEmployees: companyData?.companyEmployees || submission.companyEmployees,
        companyRevenue: companyData?.companyRevenue || submission.companyRevenue,
        companyFounded: companyData?.companyFounded || submission.companyFounded,
        companyLinkedinUrl: companyData?.companyLinkedinUrl || submission.companyLinkedinUrl,
        companyTwitterUrl: companyData?.companyTwitterUrl || submission.companyTwitterUrl,
        companyFacebookUrl: companyData?.companyFacebookUrl || submission.companyFacebookUrl,
        companyEmployeesList: companyData?.companyEmployeesList ? JSON.stringify(companyData.companyEmployeesList) : submission.companyEmployeesList,
        companyRawData: companyData?.rawCompanyData || submission.companyRawData,
      })
      .where(eq(feedbackSubmissions.id, submissionId))
      .returning();

    if (!finalized) throw new Error("Failed to finalize submission");

    // Extract company domain
    let companyDomain = finalized.companyDomain || null;
    if (!companyDomain && newEmail) companyDomain = newEmail.split("@")[1] || null;
    if (!companyDomain && companyData?.companyWebsite) {
      try {
        companyDomain = new URL(companyData.companyWebsite).hostname.replace("www.", "");
      } catch { /* skip */ }
    }

    // Create feedbacks record
    const [savedFeedback] = await db
      .insert(feedbacks)
      .values({
        workspaceId: page.workspaceId,
        userId: undefined,
        feedbackPageId: page.id,
        customerId: null,
        rawText: newFeedback,
        rawFeedback: newFeedback,
        source: "feedback_page",
        submitterName: newName || null,
        submitterEmail: newEmail || null,
        submitterRole: personData?.jobTitle || null,
        companyName: finalized.companyName || companyData?.companyName || null,
        companyDomain: companyDomain || null,
        ipAddress: finalized.ipAddress || null,
      })
      .returning();

    if (!savedFeedback) throw new Error("Failed to save feedback record");

    // Async enrichment
    enrichFeedbackCompanyAndPerson(savedFeedback.id)
      .then((result) => {
        console.log("Enrichment completed:", { feedbackId: savedFeedback.id, ...result });
        return recalculateValueScoreForFeedback(savedFeedback.id);
      })
      .catch((error) => {
        console.error("Error enriching feedback from submission:", error.message);
      });

    // Create tasks
    try {
      await createTasksFromSubmission(finalized, newFeedback, page.workspaceId, savedFeedback.id);
    } catch (taskError) {
      console.error("Error creating tasks from submission:", taskError);
    }

    return NextResponse.json(finalized);
  } catch (error) {
    console.error("Error updating submission:", error);
    return NextResponse.json({ error: "Failed to update submission" }, { status: 500 });
  }
}
