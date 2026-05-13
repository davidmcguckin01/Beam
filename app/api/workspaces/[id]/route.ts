import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { workspaces, workspaceMembers, type WorkspaceRole } from "@/db/schema";
import { getOrCreateUser } from "@/lib/user";
import {
  getWorkspace,
  getWorkspaceByClerkOrgId,
  getWorkspaceMembership,
  getWorkspaceMembers,
  updateWorkspaceMemberRole,
  removeUserFromWorkspace,
  hasWorkspacePermission,
} from "@/lib/workspace";
import { eq } from "drizzle-orm";

// GET workspace details
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

    const workspace = await getWorkspace(id);
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Check if user is a member
    const membership = await getWorkspaceMembership(workspace.id, user.id);
    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      );
    }

    // Get all members
    const members = await getWorkspaceMembers(workspace.id);

    return NextResponse.json({
      workspace,
      membership,
      members: members.map((m) => ({
        id: m.membership.id,
        userId: m.user.id,
        email: m.user.email,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        role: m.membership.role,
        joinedAt: m.membership.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching workspace:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while fetching workspace",
      },
      { status: 500 }
    );
  }
}

// PATCH update workspace
export async function PATCH(
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

    // Try to find workspace by database ID first
    let workspace = await getWorkspace(id);

    // If not found, try to find by Clerk organization ID (in case a Clerk org ID was passed)
    if (!workspace && (id.startsWith("org_") || id.length > 20)) {
      workspace = await getWorkspaceByClerkOrgId(id);
    }

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Check if user has admin/owner permission
    const membership = await getWorkspaceMembership(workspace.id, user.id);
    if (
      !membership ||
      !hasWorkspacePermission(membership.role as WorkspaceRole, "admin")
    ) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      slug,
      companyName,
      companyUrl,
      description,
      internalUseCase,
    } = body;

    // Update in Clerk (if organization exists and is not temp)
    if (!workspace.clerkOrganizationId.startsWith("temp-")) {
      try {
        const client = await clerkClient();
        await client.organizations.updateOrganization(
          workspace.clerkOrganizationId,
          {
            name: name?.trim(),
            slug: slug?.trim(),
          }
        );
      } catch (error) {
        console.error("Error updating Clerk organization:", error);
        // Continue with database update even if Clerk update fails
      }
    }

    // Update in database
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name?.trim() || workspace.name;
    if (slug !== undefined) updateData.slug = slug?.trim() || workspace.slug;
    if (companyName !== undefined)
      updateData.companyName = companyName?.trim() || null;
    if (companyUrl !== undefined)
      updateData.companyUrl = companyUrl?.trim() || null;
    if (description !== undefined)
      updateData.description = description?.trim() || null;
    if (internalUseCase !== undefined)
      updateData.internalUseCase = internalUseCase?.trim() || null;

    const [updatedWorkspace] = await db
      .update(workspaces)
      .set(updateData)
      .where(eq(workspaces.id, workspace.id))
      .returning();

    return NextResponse.json({ workspace: updatedWorkspace });
  } catch (error) {
    console.error("Error updating workspace:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while updating workspace",
      },
      { status: 500 }
    );
  }
}
