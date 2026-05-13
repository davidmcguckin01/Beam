import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbackPages } from "@/db/schema";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { eq, and } from "drizzle-orm";

// GET /api/feedback-pages/[id] - Get a specific feedback page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contextResult = await requireWorkspaceContext();

    // Allow public access if the page is active (for public viewing)
    const page = await db
      .select()
      .from(feedbackPages)
      .where(eq(feedbackPages.id, id))
      .limit(1);

    if (page.length === 0) {
      return NextResponse.json(
        { error: "Feedback page not found" },
        { status: 404 }
      );
    }

    // If not authenticated or not workspace member, only return if page is active
    if ("error" in contextResult) {
      if (!page[0].isActive) {
        return NextResponse.json(
          { error: "Feedback page not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(page[0]);
    }

    const { context } = contextResult;

    // Check if page belongs to workspace
    if (page[0].workspaceId !== context.workspace.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(page[0]);
  } catch (error) {
    console.error("Error fetching feedback page:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback page" },
      { status: 500 }
    );
  }
}

// PUT /api/feedback-pages/[id] - Update a feedback page
export async function PUT(
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
    const body = await request.json();

    // Check if page exists and belongs to workspace
    const [existingPage] = await db
      .select()
      .from(feedbackPages)
      .where(
        and(
          eq(feedbackPages.id, id),
          eq(feedbackPages.workspaceId, context.workspace.id)
        )
      )
      .limit(1);

    if (!existingPage) {
      return NextResponse.json(
        { error: "Feedback page not found" },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.customizations !== undefined) {
      updateData.customizations = JSON.stringify(body.customizations);
    }
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const [updatedPage] = await db
      .update(feedbackPages)
      .set(updateData)
      .where(eq(feedbackPages.id, id))
      .returning();

    return NextResponse.json(updatedPage);
  } catch (error) {
    console.error("Error updating feedback page:", error);
    return NextResponse.json(
      { error: "Failed to update feedback page" },
      { status: 500 }
    );
  }
}

// DELETE /api/feedback-pages/[id] - Delete a feedback page
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
    const [existingPage] = await db
      .select()
      .from(feedbackPages)
      .where(
        and(
          eq(feedbackPages.id, id),
          eq(feedbackPages.workspaceId, context.workspace.id)
        )
      )
      .limit(1);

    if (!existingPage) {
      return NextResponse.json(
        { error: "Feedback page not found" },
        { status: 404 }
      );
    }

    await db.delete(feedbackPages).where(eq(feedbackPages.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting feedback page:", error);
    return NextResponse.json(
      { error: "Failed to delete feedback page" },
      { status: 500 }
    );
  }
}
