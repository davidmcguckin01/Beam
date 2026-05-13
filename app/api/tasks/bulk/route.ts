import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, feedbacks, taskLogs } from "@/db/schema";
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
    const {
      taskIds,
      status,
      order,
      title,
      description,
      priority,
      estimatedTimeMinutes,
    } = body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { error: "taskIds must be a non-empty array" },
        { status: 400 }
      );
    }

    // Verify all tasks belong to the workspace and get current values
    const workspaceTasks = await db
      .select({
        task: tasks,
        feedback: feedbacks,
      })
      .from(tasks)
      .innerJoin(feedbacks, eq(tasks.feedbackId, feedbacks.id))
      .where(
        and(eq(feedbacks.workspaceId, workspace.id), inArray(tasks.id, taskIds))
      );

    if (workspaceTasks.length !== taskIds.length) {
      return NextResponse.json(
        { error: "Some tasks not found or don't belong to workspace" },
        { status: 403 }
      );
    }

    // Build update object and track what actually changed
    const updateData: any = { updatedAt: new Date() };
    const allChanges: any = {};

    // Handle status update
    if (status !== undefined) {
      if (!["todo", "in_progress", "done", "backlog"].includes(status)) {
        return NextResponse.json(
          {
            error:
              "Invalid status. Must be one of: todo, in_progress, done, backlog",
          },
          { status: 400 }
        );
      }
      updateData.status = status;
      allChanges.status = status;
    }

    // Handle order update
    if (typeof order === "number") {
      updateData.displayOrder = order;
      allChanges.displayOrder = order;
    }

    // Handle title update
    if (title !== undefined && title.trim()) {
      updateData.title = title.trim();
      allChanges.title = title.trim();
    }

    // Handle description update
    if (description !== undefined && description.trim()) {
      updateData.description = description.trim();
      allChanges.description = description.trim();
    }

    // Handle priority update
    if (priority !== undefined) {
      if (!["High", "Medium", "Low"].includes(priority)) {
        return NextResponse.json(
          { error: "Invalid priority. Must be one of: High, Medium, Low" },
          { status: 400 }
        );
      }
      updateData.priority = priority;
      allChanges.priority = priority;
    }

    // Handle estimatedTimeMinutes update
    if (estimatedTimeMinutes !== undefined) {
      const timeMinutes = parseInt(String(estimatedTimeMinutes));
      if (isNaN(timeMinutes) || timeMinutes < 0) {
        return NextResponse.json(
          { error: "estimatedTimeMinutes must be a positive number" },
          { status: 400 }
        );
      }
      updateData.estimatedTimeMinutes = timeMinutes;
      allChanges.estimatedTimeMinutes = timeMinutes;
    }

    // If no updates provided, return error
    if (Object.keys(updateData).length === 1) {
      // Only updatedAt
      return NextResponse.json(
        { error: "No valid update fields provided" },
        { status: 400 }
      );
    }

    // Update all tasks
    await db.update(tasks).set(updateData).where(inArray(tasks.id, taskIds));

    // Always log changes when editing - log all fields that were provided in the update
    // This ensures we capture manual edits even if values appear the same
    if (Object.keys(allChanges).length > 0) {
      const logEntries = workspaceTasks.map(({ task }) => {
        // Build changes object for all fields that were updated
        const taskChanges: any = {};
        const previousValues: any = {};
        const newValues: any = {};

        // Check each field that was provided in the update
        if (allChanges.title !== undefined) {
          if (allChanges.title !== task.title) {
            taskChanges.title = `Changed from "${task.title}" to "${allChanges.title}"`;
          } else {
            taskChanges.title = "Reviewed (no change)";
          }
          previousValues.title = task.title;
          newValues.title = allChanges.title;
        }

        if (allChanges.description !== undefined) {
          if (allChanges.description !== task.description) {
            taskChanges.description = "Updated";
          } else {
            taskChanges.description = "Reviewed (no change)";
          }
          previousValues.description = task.description;
          newValues.description = allChanges.description;
        }

        if (allChanges.priority !== undefined) {
          if (allChanges.priority !== task.priority) {
            taskChanges.priority = `Changed from ${task.priority} to ${allChanges.priority}`;
          } else {
            taskChanges.priority = "Reviewed (no change)";
          }
          previousValues.priority = task.priority;
          newValues.priority = allChanges.priority;
        }

        if (allChanges.status !== undefined) {
          if (allChanges.status !== task.status) {
            taskChanges.status = `Changed from ${task.status} to ${allChanges.status}`;
          } else {
            taskChanges.status = "Reviewed (no change)";
          }
          previousValues.status = task.status;
          newValues.status = allChanges.status;
        }

        if (allChanges.estimatedTimeMinutes !== undefined) {
          if (allChanges.estimatedTimeMinutes !== task.estimatedTimeMinutes) {
            taskChanges.estimatedTimeMinutes = `Changed from ${task.estimatedTimeMinutes} to ${allChanges.estimatedTimeMinutes} minutes`;
          } else {
            taskChanges.estimatedTimeMinutes = "Reviewed (no change)";
          }
          previousValues.estimatedTimeMinutes = task.estimatedTimeMinutes;
          newValues.estimatedTimeMinutes = allChanges.estimatedTimeMinutes;
        }

        // Always create a log entry when editing (even if no changes detected)
        // This ensures manual edits are always tracked
        return {
          taskId: task.id,
          action: "updated",
          changes: JSON.stringify({
            ...taskChanges,
            source: "Manual edit from issue detail",
            editedAt: new Date().toISOString(),
          }),
          previousValues: JSON.stringify(previousValues),
          newValues: JSON.stringify(newValues),
        };
      });

      // Insert logs for all tasks
      try {
        await db.insert(taskLogs).values(logEntries);
        console.log(
          `Successfully inserted ${logEntries.length} log entries for ${taskIds.length} tasks`
        );
      } catch (logError) {
        console.error("Error inserting task logs:", logError);
        console.error(
          "Log entries that failed:",
          JSON.stringify(logEntries.slice(0, 1), null, 2)
        ); // Log first entry as sample
        // Don't fail the update if logging fails, but log the error
      }
    }

    return NextResponse.json({ success: true, updated: workspaceTasks.length });
  } catch (error) {
    console.error("Error bulk updating tasks:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while updating tasks",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const { taskIds } = body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { error: "taskIds must be a non-empty array" },
        { status: 400 }
      );
    }

    // Verify all tasks belong to the workspace
    const workspaceTasks = await db
      .select({ taskId: tasks.id })
      .from(tasks)
      .innerJoin(feedbacks, eq(tasks.feedbackId, feedbacks.id))
      .where(
        and(eq(feedbacks.workspaceId, workspace.id), inArray(tasks.id, taskIds))
      );

    if (workspaceTasks.length !== taskIds.length) {
      return NextResponse.json(
        { error: "Some tasks not found or don't belong to workspace" },
        { status: 403 }
      );
    }

    // Delete all tasks
    await db.delete(tasks).where(inArray(tasks.id, taskIds));

    return NextResponse.json({ success: true, deleted: workspaceTasks.length });
  } catch (error) {
    console.error("Error bulk deleting tasks:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while deleting tasks",
      },
      { status: 500 }
    );
  }
}
