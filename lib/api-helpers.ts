import { auth, currentUser } from "@clerk/nextjs/server";
import { getWorkspaceContext } from "./workspace";
import type { Workspace, User, WorkspaceMember } from "@/db/schema";

type WorkspaceContextError = {
  error: string;
  status: number;
};

type WorkspaceContextSuccess = {
  context: {
    workspace: Workspace;
    user: User;
    membership: WorkspaceMember;
  };
};

export type RequireWorkspaceContextResult = WorkspaceContextError | WorkspaceContextSuccess;

/**
 * Helper to get workspace context for API routes
 * Returns the context or an error response
 */
export async function requireWorkspaceContext(): Promise<RequireWorkspaceContextResult> {
  const { userId, orgId } = await auth();
  
  if (!userId) {
    return { error: "Unauthorized", status: 401 };
  }

  if (!orgId) {
    return { error: "No organization selected", status: 400 };
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return { error: "User not found", status: 401 };
  }

  const orgMembership = (clerkUser as any).organizationMemberships?.find(
    (m: any) => m.organization.id === orgId
  );

  const contextResult = await getWorkspaceContext(
    orgId,
    clerkUser.id,
    clerkUser.emailAddresses[0]?.emailAddress || "",
    clerkUser.firstName,
    clerkUser.lastName,
    orgMembership?.organization.name,
    orgMembership?.role
  );

  if ("error" in contextResult) {
    return contextResult as WorkspaceContextError;
  }

  return { context: contextResult };
}


