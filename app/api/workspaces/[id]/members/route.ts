import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { workspaceMembers, workspaces as workspacesTable, users, type WorkspaceRole } from "@/db/schema";
import { getOrCreateUser } from "@/lib/user";
import {
  getWorkspace,
  getWorkspaceByClerkOrgId,
  getWorkspaceMembership,
  getWorkspaceMembers,
  addUserToWorkspace,
  updateWorkspaceMemberRole,
  removeUserFromWorkspace,
  hasWorkspacePermission,
} from "@/lib/workspace";
import { eq, and, sql } from "drizzle-orm";
import { updateAISeats } from "@/lib/ai-seats";
import { INVITE_BONUS_RESPONSES } from "@/lib/pricing";

// GET all members of a workspace
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
      console.error("Workspace not found for ID:", id);
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

    // Sync Clerk organization members with our database
    if (!workspace.clerkOrganizationId.startsWith("temp-")) {
      try {
        const client = await clerkClient();
        const orgMemberships = await client.organizations.getOrganizationMembershipList({
          organizationId: workspace.clerkOrganizationId,
        });
        
        // For each Clerk organization member, ensure they're in our database
        for (const orgMember of orgMemberships.data) {
          const clerkUserId = orgMember.publicUserData?.userId;
          if (!clerkUserId) continue;
          
          // Get user info from Clerk
          const clerkUser = await client.users.getUser(clerkUserId);
          
          // Get or create user in our database
          const dbUser = await getOrCreateUser(
            clerkUserId,
            clerkUser.emailAddresses[0]?.emailAddress || "",
            clerkUser.firstName,
            clerkUser.lastName
          );
          
          // Ensure user is a member of the workspace
          const existingMembership = await getWorkspaceMembership(workspace.id, dbUser.id);
          if (!existingMembership) {
            // Add user to workspace with role based on Clerk org role
            const role: WorkspaceRole = orgMember.role === "org:admin" ? "admin" : "member";
            await addUserToWorkspace(workspace.id, dbUser.id, role);
            console.log(`Synced user ${dbUser.email} to workspace ${workspace.name}`);
          } else {
            // Update role if it changed in Clerk
            const expectedRole: WorkspaceRole = orgMember.role === "org:admin" ? "admin" : "member";
            if (existingMembership.role !== expectedRole) {
              await updateWorkspaceMemberRole(workspace.id, dbUser.id, expectedRole);
              console.log(`Updated role for user ${dbUser.email} to ${expectedRole}`);
            }
          }
        }
      } catch (error) {
        console.error("Error syncing Clerk organization members:", error);
        // Continue even if sync fails
      }
    }

    const members = await getWorkspaceMembers(workspace.id);

    // Fetch pending invitations from Clerk (if organization exists and is not temp)
    let pendingInvitations: any[] = [];
    if (!workspace.clerkOrganizationId.startsWith("temp-")) {
      try {
        const client = await clerkClient();
        const invitations = await client.organizations.getOrganizationInvitationList({
          organizationId: workspace.clerkOrganizationId,
        });
        
        pendingInvitations = invitations.data
          .filter((inv) => inv.status === "pending")
          .map((inv) => ({
            id: inv.id,
            email: inv.emailAddress,
            role: inv.role === "org:admin" ? "admin" : "member",
            invitedAt: inv.createdAt,
            status: "pending",
          }));
      } catch (error) {
        console.error("Error fetching pending invitations:", error);
        // Continue even if we can't fetch invitations
      }
    }

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.membership.id,
        userId: m.user.id,
        email: m.user.email,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        role: m.membership.role,
        joinedAt: m.membership.createdAt,
        status: "active",
      })),
      pendingInvitations,
    });
  } catch (error) {
    console.error("Error fetching workspace members:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while fetching workspace members",
      },
      { status: 500 }
    );
  }
}

// POST invite a user to the workspace (by email)
export async function POST(
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
      console.error("Workspace not found for ID:", id);
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    console.log("Workspace found:", {
      workspaceId: workspace.id,
      clerkOrganizationId: workspace.clerkOrganizationId,
      name: workspace.name,
    });

    // Check if user has admin/owner permission
    const membership = await getWorkspaceMembership(workspace.id, user.id);
    
    // Get all members to check if user is the only member
    const allMembers = await getWorkspaceMembers(workspace.id);
    const isOnlyMember = allMembers.length === 1 && allMembers[0].user.id === user.id;
    
    console.log("Permission check:", {
      membership,
      userRole: membership?.role,
      allMembersCount: allMembers.length,
      isOnlyMember,
      hasPermission: membership && hasWorkspacePermission(membership.role as WorkspaceRole, "admin"),
    });
    
    // Allow if user is owner/admin, or if they're the only member (must be owner)
    if (!membership) {
      // If no membership but user can access, they might be the creator
      // Check if there are any members at all
      if (allMembers.length === 0) {
        // No members - user must be the creator, add them as owner
        await addUserToWorkspace(workspace.id, user.id, "owner");
        console.log("Added user as owner (no existing members)");
      } else {
        return NextResponse.json(
          { error: "Not a member of this workspace" },
          { status: 403 }
        );
      }
    } else if (!hasWorkspacePermission(membership.role as WorkspaceRole, "admin") && !isOnlyMember) {
      // If user is not admin/owner and not the only member, deny access
      return NextResponse.json(
        { 
          error: "Insufficient permissions. Only workspace owners and admins can invite members.",
          userRole: membership.role,
          isOnlyMember: false,
        },
        { status: 403 }
      );
    } else if (isOnlyMember && membership.role !== "owner" && membership.role !== "admin") {
      // If user is the only member but their role is wrong, upgrade them to owner
      console.log("Upgrading only member to owner role");
      await updateWorkspaceMemberRole(workspace.id, user.id, "owner");
    }

    const body = await request.json();
    const { email, role = "member" } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Verify organization exists in Clerk before inviting
    const client = await clerkClient();
    
    console.log("Attempting to verify organization:", workspace.clerkOrganizationId);
    
    // Check if this is a temp workspace (created during migration)
    const isTempWorkspace = workspace.clerkOrganizationId.startsWith("temp-");
    
    let clerkOrg;
    let actualClerkOrgId = workspace.clerkOrganizationId;
    
    // If it's a temp workspace, create a real Clerk organization for it
    if (isTempWorkspace) {
      console.log("Detected temp workspace, creating Clerk organization...");
      try {
        // Sanitize the workspace name (remove apostrophes and special chars that might cause issues)
        const sanitizedName = workspace.name
          .replace(/'s Workspace$/, "") // Remove "'s Workspace" suffix
          .trim() || "My Workspace"; // Fallback to default name
        
        // Generate a clean slug from the name if needed
        const generateSlug = (name: string): string => {
          return name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "") // Remove special characters
            .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
            .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
            .substring(0, 50); // Limit length
        };
        
        const cleanSlug = workspace.slug 
          ? workspace.slug.replace(/[^a-z0-9-]/g, "").substring(0, 50)
          : generateSlug(sanitizedName);
        
        console.log("Creating organization with:", {
          name: sanitizedName,
          slug: cleanSlug,
          originalName: workspace.name,
          originalSlug: workspace.slug,
        });
        
        // Try to create organization, first with slug, then without if slug fails or is disabled
        let newOrg;
        try {
          newOrg = await client.organizations.createOrganization({
            name: sanitizedName,
            slug: cleanSlug || undefined,
            createdBy: userId,
          });
        } catch (slugError: any) {
          // Check if the error is about slugs being disabled
          const isSlugDisabled = slugError?.errors?.[0]?.code === "organization_slugs_disabled" ||
                                slugError?.errors?.[0]?.message?.toLowerCase().includes("slug") ||
                                (slugError?.status === 403 && cleanSlug);
          
          // If slug is the issue (disabled or invalid), try without it
          if (isSlugDisabled || (slugError?.status === 422 && cleanSlug)) {
            console.log("Slugs disabled or invalid, creating organization without slug...");
            newOrg = await client.organizations.createOrganization({
              name: sanitizedName,
              createdBy: userId,
            });
          } else {
            throw slugError;
          }
        }
        
        console.log("Created new Clerk organization:", {
          id: newOrg.id,
          name: newOrg.name,
        });
        
        // Update the workspace with the real Clerk organization ID
        const { workspaces: workspacesTable } = await import("@/db/schema");
        await db
          .update(workspacesTable)
          .set({
            clerkOrganizationId: newOrg.id,
            updatedAt: new Date(),
          })
          .where(eq(workspacesTable.id, workspace.id));
        
        // Add user to the organization as admin (since they're the owner)
        // Note: User is usually automatically added when creating org, but we ensure they have admin role
        try {
          await client.organizations.createOrganizationMembership({
            organizationId: newOrg.id,
            userId: userId,
            role: "org:admin",
          });
        } catch (membershipError: any) {
          // If user is already a member, try to update their role
          if (membershipError?.errors?.[0]?.message?.includes("already")) {
            try {
              await client.organizations.updateOrganizationMembership({
                organizationId: newOrg.id,
                userId: userId,
                role: "org:admin",
              });
            } catch (updateError) {
              console.warn("Could not update user role to admin:", updateError);
            }
          } else {
            console.warn("Could not add user to organization:", membershipError);
          }
        }
        
        actualClerkOrgId = newOrg.id;
        clerkOrg = newOrg;
        
        console.log("Workspace updated with real Clerk organization ID");
      } catch (error: any) {
        const errorDetails = {
          error: error.message,
          status: error.status,
          errors: error.errors,
          workspaceName: workspace.name,
          workspaceSlug: workspace.slug,
          clerkErrorCode: error?.errors?.[0]?.code,
          clerkErrorMessage: error?.errors?.[0]?.message,
          clerkLongMessage: error?.errors?.[0]?.longMessage,
        };
        
        console.error("Error creating Clerk organization for temp workspace:", errorDetails);
        
        if (error?.status === 403) {
          // Get the actual error message from Clerk
          const clerkErrorMsg = error?.errors?.[0]?.message || error?.errors?.[0]?.longMessage || "Permission denied";
          const clerkErrorCode = error?.errors?.[0]?.code || "";
          
          // Check if it's specifically about organizations not being enabled
          const isOrgNotEnabled = clerkErrorMsg.toLowerCase().includes("organization") && 
                                  (clerkErrorMsg.toLowerCase().includes("not enabled") || 
                                   clerkErrorMsg.toLowerCase().includes("disabled"));
          
          let errorMessage = `Cannot create organization: ${clerkErrorMsg}${clerkErrorCode ? ` (${clerkErrorCode})` : ""}.`;
          
          if (isOrgNotEnabled) {
            errorMessage += " Please enable organizations in your Clerk Dashboard under Settings → Organizations.";
          } else {
            errorMessage += " This might be due to: 1) Your CLERK_SECRET_KEY not having permission to create organizations (check your Clerk API key scopes), 2) Your account not having permission to create organizations, or 3) Organizations being restricted in your Clerk instance. Try creating an organization through the Clerk UI first, then the workspace will sync automatically.";
          }
          
          return NextResponse.json(
            {
              error: errorMessage,
              details: errorDetails,
            },
            { status: 403 }
          );
        }
        
        if (error?.status === 422) {
          // Unprocessable Entity - usually means invalid name or slug
          const errorMessage = error?.errors?.[0]?.message || error?.errors?.[0]?.longMessage || "Invalid organization name or slug";
          return NextResponse.json(
            {
              error: `Failed to create organization: ${errorMessage}. Please try creating a new workspace with a different name.`,
              details: errorDetails,
            },
            { status: 422 }
          );
        }
        
        // For other errors, include the actual error message
        const errorMessage = error?.errors?.[0]?.message || error?.errors?.[0]?.longMessage || error?.message || "Unknown error";
        return NextResponse.json(
          {
            error: `Failed to create organization: ${errorMessage}`,
            details: errorDetails,
          },
          { status: error?.status || 500 }
        );
      }
    } else {
      // Verify the organization exists and user is a member
      try {
        clerkOrg = await client.organizations.getOrganization({
          organizationId: workspace.clerkOrganizationId,
        });
        
        console.log("Organization found in Clerk:", {
          id: clerkOrg.id,
          name: clerkOrg.name,
          slug: clerkOrg.slug,
        });
        
        // Verify user is a member of this organization
        const orgMemberships = await client.organizations.getOrganizationMembershipList({
          organizationId: workspace.clerkOrganizationId,
        });
        
        const userMembership = orgMemberships.data.find(
          (m) => m.publicUserData?.userId === userId
        );
        
        if (!userMembership) {
          console.error("User is not a member of the Clerk organization:", {
            userId,
            organizationId: workspace.clerkOrganizationId,
          });
          return NextResponse.json(
            {
              error: "You are not a member of this organization in Clerk. Please ensure you're properly added to the organization.",
            },
            { status: 403 }
          );
        }
        
        console.log("User membership verified:", {
          userId,
          role: userMembership.role,
        });
      } catch (error: any) {
        console.error("Error verifying organization:", {
          clerkOrganizationId: workspace.clerkOrganizationId,
          workspaceId: workspace.id,
          userId,
          error: error.message,
          status: error.status,
          errors: error.errors,
        });
        
        if (error.status === 404) {
          return NextResponse.json(
            {
              error: `Organization not found in Clerk. The workspace may need to be recreated. Organization ID: ${workspace.clerkOrganizationId}`,
            },
            { status: 404 }
          );
        }
        throw error;
      }
    }

    if (!clerkOrg) {
      return NextResponse.json(
        {
          error: "Organization not found in Clerk",
        },
        { status: 404 }
      );
    }

    // Invite user via Clerk (use the actual Clerk org ID, which may have been updated)
    try {
      await client.organizations.createOrganizationInvitation({
        organizationId: actualClerkOrgId,
        emailAddress: email.trim(),
        role: role === "admin" ? "org:admin" : "org:member",
      });
    } catch (error: any) {
      console.error("Error creating invitation:", {
        organizationId: actualClerkOrgId,
        email: email.trim(),
        error: error.message,
        status: error.status,
        errors: error.errors,
      });
      
      // If user is already a member, that's okay
      if (error?.errors?.[0]?.message?.includes("already")) {
        return NextResponse.json({
          message: "User is already a member of this organization",
        });
      }
      
      // Provide more specific error messages
      if (error.status === 404) {
        return NextResponse.json(
          {
            error: `Organization not found. Please ensure the workspace is properly synced with Clerk.`,
          },
          { status: 404 }
        );
      }
      
      throw error;
    }

    // Grant bonus responses for the invite
    try {
      await db
        .update(workspacesTable)
        .set({
          bonusResponses: sql`${workspacesTable.bonusResponses} + ${INVITE_BONUS_RESPONSES}`,
          updatedAt: new Date(),
        })
        .where(eq(workspacesTable.id, workspace.id));
    } catch (err) {
      console.error("Error granting invite bonus responses:", err);
    }

    // Update AI add-on seat count if active
    updateAISeats(workspace.id).catch((err) =>
      console.error("Error updating AI seats after invite:", err)
    );

    return NextResponse.json({
      message: "Invitation sent",
      bonusResponsesGranted: INVITE_BONUS_RESPONSES,
    });
  } catch (error) {
    console.error("Error inviting user:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while inviting user",
      },
      { status: 500 }
    );
  }
}

// PATCH update member role
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

    let user;
    try {
      user = await getOrCreateUser(
        clerkUser.id,
        clerkUser.emailAddresses[0]?.emailAddress || "",
        clerkUser.firstName,
        clerkUser.lastName
      );
    } catch (userError: any) {
      console.error("Error getting/creating user in PATCH:", userError);
      return NextResponse.json(
        { 
          error: "Failed to sync user data. Please try again.",
          details: userError?.message 
        },
        { status: 500 }
      );
    }

    // Try to get workspace by database ID first, then by Clerk org ID
    let workspace = await getWorkspace(id);
    if (!workspace) {
      workspace = await getWorkspaceByClerkOrgId(id);
    }
    
    if (!workspace) {
      console.error("Workspace not found for ID:", id);
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Check if user has admin/owner permission
    const membership = await getWorkspaceMembership(workspace.id, user.id);
    if (!membership || !hasWorkspacePermission(membership.role as WorkspaceRole, "admin")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { memberUserId, role } = body;

    if (!memberUserId || !role) {
      return NextResponse.json(
        { error: "memberUserId and role are required" },
        { status: 400 }
      );
    }

    // memberUserId should be the database user ID, not Clerk ID
    // First, get the member to find their Clerk ID if needed
    const member = await db
      .select()
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspace.id),
          eq(workspaceMembers.userId, memberUserId)
        )
      )
      .limit(1);

    if (member.length === 0) {
      return NextResponse.json(
        { error: "Member not found in workspace" },
        { status: 404 }
      );
    }

    const memberUser = member[0].users;
    const memberClerkId = memberUser.clerkId;

    // Update role in Clerk (if organization exists and is not temp)
    if (!workspace.clerkOrganizationId.startsWith("temp-")) {
      const client = await clerkClient();
      try {
        const orgMemberships = await client.organizations.getOrganizationMembershipList({
          organizationId: workspace.clerkOrganizationId,
        });

        const orgMember = orgMemberships.data.find(
          (m) => m.publicUserData?.userId === memberClerkId
        );

        if (orgMember) {
          await client.organizations.updateOrganizationMembership({
            organizationId: workspace.clerkOrganizationId,
            userId: memberClerkId,
            role: role === "admin" ? "org:admin" : "org:member",
          });
        }
      } catch (clerkError) {
        console.error("Error updating Clerk organization membership:", clerkError);
        // Continue with database update even if Clerk update fails
      }
    }

    // Update role in database (use workspace.id, not the route param id)
    await updateWorkspaceMemberRole(workspace.id, memberUserId, role as WorkspaceRole);

    return NextResponse.json({ message: "Member role updated" });
  } catch (error) {
    console.error("Error updating member role:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while updating member role",
      },
      { status: 500 }
    );
  }
}

// DELETE remove member from workspace
export async function DELETE(
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
      console.error("Workspace not found for ID:", id);
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Check if user has admin/owner permission
    const membership = await getWorkspaceMembership(workspace.id, user.id);
    if (!membership || !hasWorkspacePermission(membership.role as WorkspaceRole, "admin")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const memberUserId = searchParams.get("userId");

    if (!memberUserId) {
      return NextResponse.json(
        { error: "userId query parameter is required" },
        { status: 400 }
      );
    }

    // Remove from Clerk organization
    const client = await clerkClient();
    try {
      await client.organizations.deleteOrganizationMembership({
        organizationId: workspace.clerkOrganizationId,
        userId: memberUserId,
      });
    } catch (error) {
      // Continue even if Clerk removal fails
      console.error("Error removing from Clerk org:", error);
    }

    // Remove from database
    await removeUserFromWorkspace(id, memberUserId);

    // Update AI add-on seat count if active
    updateAISeats(workspace.id).catch((err) =>
      console.error("Error updating AI seats after member removal:", err)
    );

    return NextResponse.json({ message: "Member removed" });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while removing member",
      },
      { status: 500 }
    );
  }
}


