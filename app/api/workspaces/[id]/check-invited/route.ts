import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUser } from "@/lib/user";
import { getWorkspace, getWorkspaceByClerkOrgId } from "@/lib/workspace";
import { isUserInvitedToWorkspace } from "@/lib/workspace";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const user = await getOrCreateUser(
      clerkUser.id,
      clerkUser.emailAddresses[0]?.emailAddress || "",
      clerkUser.firstName,
      clerkUser.lastName
    );

    // Try to get workspace by database ID first, then by Clerk org ID
    let workspace = await getWorkspace(id);
    if (!workspace) {
      workspace = await getWorkspaceByClerkOrgId(id);
    }

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Check if user is invited
    const isInvited = await isUserInvitedToWorkspace(workspace.id, user.id);

    return NextResponse.json({ isInvited });
  } catch (error) {
    console.error("Error checking if user is invited:", error);
    return NextResponse.json(
      { error: "Failed to check invitation status" },
      { status: 500 }
    );
  }
}

