/**
 * PostHog Analytics Helper Functions
 * Provides type-safe wrappers for PostHog tracking
 */

import posthog from "posthog-js";

/**
 * Check if PostHog is initialized and ready
 */
function isPostHogReady(): boolean {
  if (typeof window === "undefined") return false;
  
  // Check if PostHog is initialized
  // PostHog sets __loaded after initialization
  return (
    typeof posthog !== "undefined" &&
    posthog.__loaded === true
  );
}

/**
 * Identify a user in PostHog
 * Call this when a user signs in or their data changes
 */
export function identifyUser(
  userId: string,
  properties?: {
    email?: string;
    firstName?: string | null;
    lastName?: string | null;
    name?: string;
    company?: string | null;
    companyDomain?: string | null;
    planTier?: string | null;
    workspaceId?: string | null;
    workspaceName?: string | null;
    [key: string]: any;
  }
) {
  try {
    if (typeof window === "undefined") return;

    if (!isPostHogReady()) {
      console.warn("PostHog not initialized yet. User identification will be queued.");
      // PostHog will queue identify calls if not ready
    }

    posthog.identify(userId, properties || {});
  } catch (error) {
    console.error("Error identifying user in PostHog:", error);
  }
}

/**
 * Track an event in PostHog
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, any>
) {
  try {
    if (typeof window === "undefined") {
      console.warn(`Event "${eventName}" not tracked (server-side rendering)`);
      return;
    }

    if (!isPostHogReady()) {
      console.warn(`PostHog not initialized yet. Event "${eventName}" will be queued.`);
      // PostHog will queue capture calls if not ready, but let's log it for debugging
    }

    posthog.capture(eventName, properties);
    
    // Log in development for debugging
    if (process.env.NODE_ENV === "development") {
      console.log(`[PostHog] Event tracked: ${eventName}`, properties || {});
    }
  } catch (error) {
    console.error(`Error tracking event ${eventName} in PostHog:`, error);
  }
}

/**
 * Reset user identification (call on sign out)
 */
export function resetUser() {
  try {
    if (typeof window === "undefined") return;

    posthog.reset();
  } catch (error) {
    console.error("Error resetting PostHog user:", error);
  }
}

/**
 * Set user properties (updates existing user)
 */
export function setUserProperties(properties: Record<string, any>) {
  try {
    if (typeof window === "undefined") return;

    posthog.people.set(properties);
  } catch (error) {
    console.error("Error setting user properties in PostHog:", error);
  }
}

/**
 * Increment a user property (e.g., feedback count)
 * Note: PostHog uses $increment operator in the properties object
 */
export function incrementUserProperty(property: string, value: number = 1) {
  try {
    if (typeof window === "undefined") return;

    // PostHog uses $increment operator for incrementing properties
    posthog.people.set({
      [`$increment`]: {
        [property]: value,
      },
    });
  } catch (error) {
    console.error(
      `Error incrementing user property ${property} in PostHog:`,
      error
    );
  }
}

