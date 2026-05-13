import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, feedbacks } from "@/db/schema";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { eq, and, inArray } from "drizzle-orm";

export async function PATCH(request: NextRequest) {
  try {
    const result = await requireWorkspaceContext();
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }
    const { context } = result;
    const { workspace } = context;

    const body = await request.json();
    const { orderedTaskIds } = body;

    // orderedTaskIds should be an array of arrays, where each inner array represents
    // the taskIds for an aggregated issue, in the order they should appear
    if (!Array.isArray(orderedTaskIds)) {
      return NextResponse.json(
        { error: "orderedTaskIds must be an array" },
        { status: 400 }
      );
    }

    // Flatten all taskIds to verify they belong to the user
    const allTaskIds = orderedTaskIds.flat();
    if (allTaskIds.length === 0) {
      return NextResponse.json(
        { error: "orderedTaskIds must contain at least one task" },
        { status: 400 }
      );
    }

    // Verify all tasks belong to the workspace
    const workspaceTasks = await db
      .select({ taskId: tasks.id })
      .from(tasks)
      .innerJoin(feedbacks, eq(tasks.feedbackId, feedbacks.id))
      .where(
        and(
          eq(feedbacks.workspaceId, workspace.id),
          inArray(tasks.id, allTaskIds)
        )
      );

    if (workspaceTasks.length !== allTaskIds.length) {
      return NextResponse.json(
        { error: "Some tasks not found or don't belong to workspace" },
        { status: 403 }
      );
    }

    // Update order for each group
    // Each group gets an order value based on its position in the array
    for (let index = 0; index < orderedTaskIds.length; index++) {
      const taskIds = orderedTaskIds[index];
      if (Array.isArray(taskIds) && taskIds.length > 0) {
        await db
          .update(tasks)
          .set({ displayOrder: index })
          .where(inArray(tasks.id, taskIds));
      }
    }

    return NextResponse.json({ success: true, updated: orderedTaskIds.length });
  } catch (error) {
    console.error("Error updating task order:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while updating task order",
      },
      { status: 500 }
    );
  }
}
