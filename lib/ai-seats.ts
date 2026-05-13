// Legacy AI-seat sync. No-ops kept so existing call sites compile.

import { clerkClient } from "@clerk/nextjs/server";

/**
 * Count current org members for a workspace via Clerk. Returns at least 1.
 */
export async function getOrgMemberCount(
  clerkOrganizationId: string
): Promise<number> {
  if (clerkOrganizationId.startsWith("temp-")) return 1;
  try {
    const client = await clerkClient();
    const memberships =
      await client.organizations.getOrganizationMembershipList({
        organizationId: clerkOrganizationId,
      });
    return Math.max(1, memberships.data.length);
  } catch (err) {
    console.error("Error counting org members:", err);
    return 1;
  }
}

/** No-op; seat sync removed. */
export async function updateAISeats(_workspaceId: string): Promise<number | null> {
  return null;
}
