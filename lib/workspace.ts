import { db } from "@/db";
import {
  workspaces,
  workspaceMembers,
  users,
  type WorkspaceRole,
} from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getOrCreateUser } from "./user";

/**
 * Get or create a workspace from a Clerk organization
 */
export async function getOrCreateWorkspace(
  clerkOrganizationId: string,
  name: string,
  slug?: string
) {
  // Try to find existing workspace
  const existingWorkspace = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.clerkOrganizationId, clerkOrganizationId))
    .limit(1);

  if (existingWorkspace.length > 0) {
    // Update workspace info if it changed
    // Only update slug if provided, otherwise keep existing slug to avoid conflicts
    const updateData: any = {
      name,
      updatedAt: new Date(),
    };

    if (slug) {
      updateData.slug = slug;
    } else if (name !== existingWorkspace[0].name) {
      // Only generate new slug if name changed and slug not provided
      // Make slug unique by appending a suffix if needed
      let newSlug = generateSlug(name);
      let uniqueSlug = newSlug;
      let counter = 1;

      // Check if slug already exists (excluding current workspace)
      const existingSlug = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.slug, uniqueSlug))
        .limit(1);

      while (
        existingSlug.length > 0 &&
        existingSlug[0].id !== existingWorkspace[0].id
      ) {
        uniqueSlug = `${newSlug}-${counter}`;
        const checkSlug = await db
          .select()
          .from(workspaces)
          .where(eq(workspaces.slug, uniqueSlug))
          .limit(1);
        if (
          checkSlug.length === 0 ||
          checkSlug[0].id === existingWorkspace[0].id
        ) {
          break;
        }
        counter++;
      }

      updateData.slug = uniqueSlug;
    }

    const [updatedWorkspace] = await db
      .update(workspaces)
      .set(updateData)
      .where(eq(workspaces.clerkOrganizationId, clerkOrganizationId))
      .returning();

    return updatedWorkspace;
  }

  // Create new workspace
  // Generate unique slug if not provided
  let finalSlug = slug || generateSlug(name);

  // Ensure slug is unique
  let uniqueSlug = finalSlug;
  let counter = 1;
  let checkSlug = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.slug, uniqueSlug))
    .limit(1);

  while (checkSlug.length > 0) {
    uniqueSlug = `${finalSlug}-${counter}`;
    checkSlug = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.slug, uniqueSlug))
      .limit(1);
    if (checkSlug.length === 0) {
      break;
    }
    counter++;
  }

  const [newWorkspace] = await db
    .insert(workspaces)
    .values({
      clerkOrganizationId,
      name,
      slug: uniqueSlug,
    })
    .returning();

  return newWorkspace;
}

/**
 * Get workspace by ID
 */
export async function getWorkspace(workspaceId: string) {
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  return workspace || null;
}

/**
 * Get workspace by Clerk organization ID
 */
export async function getWorkspaceByClerkOrgId(clerkOrganizationId: string) {
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.clerkOrganizationId, clerkOrganizationId))
    .limit(1);

  return workspace || null;
}

/**
 * Get all workspaces for a user
 */
export async function getUserWorkspaces(userId: string) {
  const userWorkspaces = await db
    .select({
      workspace: workspaces,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.createdAt,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId));

  return userWorkspaces;
}

/**
 * Get workspace membership for a user
 */
export async function getWorkspaceMembership(
  workspaceId: string,
  userId: string
) {
  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .limit(1);

  return membership || null;
}

/**
 * Check if a user is invited to a workspace (not the creator)
 * A user is considered invited if:
 * - They are not the first member (earliest createdAt)
 * - OR their membership was created after the workspace was created
 * - OR they are not the owner
 */
export async function isUserInvitedToWorkspace(
  workspaceId: string,
  userId: string
): Promise<boolean> {
  // Get workspace
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!workspace) {
    return false;
  }

  // Get user's membership
  const membership = await getWorkspaceMembership(workspaceId, userId);
  if (!membership) {
    return false;
  }

  // If user is owner, they're not invited
  if (membership.role === "owner") {
    return false;
  }

  // Get all members ordered by creation date
  const allMembers = await db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(asc(workspaceMembers.createdAt));

  // If user is the first member, they're the creator
  if (allMembers.length > 0 && allMembers[0].id === membership.id) {
    return false;
  }

  // If membership was created after workspace creation (with some buffer for race conditions)
  const workspaceCreatedAt = new Date(workspace.createdAt);
  const membershipCreatedAt = new Date(membership.createdAt);
  const timeDiff = membershipCreatedAt.getTime() - workspaceCreatedAt.getTime();
  
  // If membership was created more than 1 minute after workspace, likely invited
  if (timeDiff > 60000) {
    return true;
  }

  // If there are multiple members and user is not the first, they're likely invited
  if (allMembers.length > 1) {
    return allMembers[0].id !== membership.id;
  }

  return false;
}

/**
 * Add user to workspace
 */
export async function addUserToWorkspace(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole = "member"
) {
  // Check if membership already exists
  const existing = await getWorkspaceMembership(workspaceId, userId);
  if (existing) {
    // Update role if different
    if (existing.role !== role) {
      const [updated] = await db
        .update(workspaceMembers)
        .set({ role, updatedAt: new Date() })
        .where(eq(workspaceMembers.id, existing.id))
        .returning();
      return updated;
    }
    return existing;
  }

  // Create new membership
  const [membership] = await db
    .insert(workspaceMembers)
    .values({
      workspaceId,
      userId,
      role,
    })
    .returning();

  return membership;
}

/**
 * Update user role in workspace
 */
export async function updateWorkspaceMemberRole(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole
) {
  const [updated] = await db
    .update(workspaceMembers)
    .set({ role, updatedAt: new Date() })
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .returning();

  return updated || null;
}

/**
 * Remove user from workspace
 */
export async function removeUserFromWorkspace(
  workspaceId: string,
  userId: string
) {
  await db
    .delete(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    );
}

/**
 * Get all members of a workspace
 */
export async function getWorkspaceMembers(workspaceId: string) {
  const members = await db
    .select({
      membership: workspaceMembers,
      user: users,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId));

  return members;
}

/**
 * Check if user has permission in workspace
 */
export function hasWorkspacePermission(
  role: WorkspaceRole | null,
  requiredRole: WorkspaceRole
): boolean {
  if (!role) return false;

  const roleHierarchy: Record<WorkspaceRole, number> = {
    viewer: 1,
    member: 2,
    admin: 3,
    owner: 4,
  };

  return roleHierarchy[role] >= roleHierarchy[requiredRole];
}

/**
 * Generate a URL-friendly slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Get workspace context for API routes
 * This ensures the user is a member of the workspace
 */
export async function getWorkspaceContext(
  clerkOrganizationId: string | null,
  clerkUserId: string,
  clerkUserEmail: string,
  clerkUserFirstName?: string | null,
  clerkUserLastName?: string | null,
  clerkOrgName?: string,
  clerkOrgRole?: string
) {
  if (!clerkOrganizationId) {
    return { error: "No organization selected", status: 400 };
  }

  // Get or create user
  const user = await getOrCreateUser(
    clerkUserId,
    clerkUserEmail,
    clerkUserFirstName,
    clerkUserLastName
  );

  // Get or create workspace
  const workspace = await getOrCreateWorkspace(
    clerkOrganizationId,
    clerkOrgName || "Workspace"
  );

  // Ensure user is a member
  let membership = await getWorkspaceMembership(workspace.id, user.id);
  if (!membership) {
    // If user is owner/admin in Clerk org, give them owner/admin role
    const role: WorkspaceRole =
      clerkOrgRole === "org:admin" ? "admin" : "member";
    membership = await addUserToWorkspace(workspace.id, user.id, role);
  }

  return {
    workspace,
    user,
    membership,
  };
}
