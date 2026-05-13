"use client";

import { useEffect } from "react";
import { useUser, useOrganization } from "@clerk/nextjs";
import { identifyUser, resetUser } from "@/lib/posthog";

/**
 * Identifies the signed-in user in PostHog and enriches the profile with
 * available Clerk data.
 */
export function PostHogUserTracker() {
  const { user, isLoaded: userLoaded } = useUser();
  const { organization, isLoaded: orgLoaded } = useOrganization();

  useEffect(() => {
    if (!userLoaded) return;

    if (user) {
      const identifyUserData: {
        email?: string;
        firstName?: string | null;
        lastName?: string | null;
        workspaceId?: string | null;
        workspaceName?: string | null;
      } = {};

      const email = user.emailAddresses?.[0]?.emailAddress;
      if (email) identifyUserData.email = email;
      if (user.firstName) identifyUserData.firstName = user.firstName;
      if (user.lastName) identifyUserData.lastName = user.lastName;

      if (orgLoaded && organization) {
        identifyUserData.workspaceId = organization.id;
        identifyUserData.workspaceName = organization.name;
      }

      identifyUser(user.id, identifyUserData);
    } else {
      resetUser();
    }
  }, [user, userLoaded, organization, orgLoaded]);

  return null;
}
