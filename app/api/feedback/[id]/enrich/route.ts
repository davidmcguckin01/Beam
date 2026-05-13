/**
 * Feedback Enrichment API Route
 * 
 * POST /api/feedback/[id]/enrich
 * Trigger enrichment and scoring for a feedback entry
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbacks } from "@/db/schema";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import {
  enrichFeedbackCompanyAndPerson,
  recalculateValueScoreForFeedback,
} from "@/lib/feedback-enrichment";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/feedback/[id]/enrich
 * Enrich company and person data, then recalculate ICP and value scores
 */
export async function POST(
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

    // Verify feedback belongs to workspace
    const [feedback] = await db
      .select()
      .from(feedbacks)
      .where(
        and(
          eq(feedbacks.id, id),
          eq(feedbacks.workspaceId, context.workspace.id)
        )
      )
      .limit(1);

    if (!feedback) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 }
      );
    }

    // Enrich company, person, and customer
    const { companyId, personId, customerId } = await enrichFeedbackCompanyAndPerson(id);

    // Recalculate value score (which also calculates ICP score if needed)
    const valueScore = await recalculateValueScoreForFeedback(id);

    // Reload feedback with updated data
    const [updatedFeedback] = await db
      .select()
      .from(feedbacks)
      .where(eq(feedbacks.id, id))
      .limit(1);

    return NextResponse.json({
      success: true,
      feedback: updatedFeedback,
      enrichment: {
        companyId,
        personId,
        customerId,
        valueScore,
      },
    });
  } catch (error) {
    console.error("Error enriching feedback:", error);
    return NextResponse.json(
      { error: "Failed to enrich feedback" },
      { status: 500 }
    );
  }
}

