import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbackPages, formConfigVersions } from "@/db/schema";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { eq, and, desc } from "drizzle-orm";

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

    // Verify page belongs to workspace
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
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const versions = await db
      .select()
      .from(formConfigVersions)
      .where(eq(formConfigVersions.feedbackPageId, id))
      .orderBy(desc(formConfigVersions.createdAt))
      .limit(50);

    return NextResponse.json({ versions });
  } catch (error) {
    console.error("Error fetching versions:", error);
    return NextResponse.json(
      { error: "Failed to fetch versions" },
      { status: 500 }
    );
  }
}
