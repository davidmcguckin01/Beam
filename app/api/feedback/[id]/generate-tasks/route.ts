/**
 * Task Generation API Route
 * 
 * POST /api/feedback/[id]/generate-tasks
 * Generate tasks from feedback using LLM
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbacks, tasks } from "@/db/schema";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { generateTasksFromFeedback } from "@/lib/feedback-enrichment";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/feedback/[id]/generate-tasks
 * Generate tasks from feedback using LLM
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

    // Generate tasks
    const taskIds = await generateTasksFromFeedback(id);

    // Load generated tasks
    const generatedTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.feedbackId, id))
      .orderBy(tasks.createdAt);

    return NextResponse.json({
      success: true,
      taskIds,
      tasks: generatedTasks,
    });
  } catch (error) {
    console.error("Error generating tasks:", error);
    return NextResponse.json(
      { error: "Failed to generate tasks" },
      { status: 500 }
    );
  }
}

