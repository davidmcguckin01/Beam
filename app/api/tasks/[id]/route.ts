import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, feedbacks, taskLogs } from "@/db/schema";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { eq, and, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireWorkspaceContext();
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }
    const { context } = result;

    const { id } = await params;

    // Verify the task belongs to the workspace
    const task = await db
      .select({ task: tasks, feedback: feedbacks })
      .from(tasks)
      .innerJoin(feedbacks, eq(tasks.feedbackId, feedbacks.id))
      .where(
        and(eq(tasks.id, id), eq(feedbacks.workspaceId, context.workspace.id))
      )
      .limit(1);

    if (task.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Get all logs for this task, ordered by most recent first
    const logs = await db
      .select()
      .from(taskLogs)
      .where(eq(taskLogs.taskId, id))
      .orderBy(desc(taskLogs.createdAt));

    // Parse JSON fields in logs
    const parsedLogs = logs.map((log) => ({
      id: log.id,
      action: log.action,
      changes: JSON.parse(log.changes),
      previousValues: log.previousValues
        ? JSON.parse(log.previousValues)
        : null,
      newValues: log.newValues ? JSON.parse(log.newValues) : null,
      createdAt: log.createdAt,
    }));

    return NextResponse.json({ logs: parsedLogs });
  } catch (error) {
    console.error("Error fetching task logs:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while fetching task logs",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireWorkspaceContext();
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }
    const { context } = result;

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (
      !status ||
      !["todo", "in_progress", "done", "backlog"].includes(status)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid status. Must be one of: todo, in_progress, done, backlog",
        },
        { status: 400 }
      );
    }

    // Verify the task belongs to the workspace
    const task = await db
      .select({ task: tasks, feedback: feedbacks })
      .from(tasks)
      .innerJoin(feedbacks, eq(tasks.feedbackId, feedbacks.id))
      .where(
        and(eq(tasks.id, id), eq(feedbacks.workspaceId, context.workspace.id))
      )
      .limit(1);

    if (task.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const existingTask = task[0].task;
    const previousStatus = existingTask.status;

    // Update the task status
    await db
      .update(tasks)
      .set({ status, updatedAt: new Date() })
      .where(eq(tasks.id, id));

    // Log the status change if it changed
    if (previousStatus !== status) {
      await db.insert(taskLogs).values({
        taskId: id,
        action: "updated",
        changes: JSON.stringify({
          status: `Changed from ${previousStatus} to ${status}`,
          source: "Manual update",
        }),
        previousValues: JSON.stringify({ status: previousStatus }),
        newValues: JSON.stringify({ status }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while updating the task",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireWorkspaceContext();
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }
    const { context } = result;

    const { id } = await params;

    // Verify the task belongs to the workspace
    const task = await db
      .select({ task: tasks, feedback: feedbacks })
      .from(tasks)
      .innerJoin(feedbacks, eq(tasks.feedbackId, feedbacks.id))
      .where(
        and(eq(tasks.id, id), eq(feedbacks.workspaceId, context.workspace.id))
      )
      .limit(1);

    if (task.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Delete the task
    await db.delete(tasks).where(eq(tasks.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while deleting the task",
      },
      { status: 500 }
    );
  }
}
