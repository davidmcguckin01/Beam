// clients/opinly.ts
import { createOpinlyClient } from "@opinly/backend";

/**
 * Opinly Client Configuration
 *
 * Options:
 * - apiKey: Optional. Your Opinly API key. Default set from OPINLY_API_KEY env var if not provided.
 * - url: Optional. API endpoint URL. Defaults to Opinly's production API.
 * - fetch: Optional. Custom fetch wrapper; example uses cache: 'force-cache' for ISR performance.
 *
 * Note: Make sure to restart your dev server after setting environment variables so process.env is populated.
 */
export const opinly = createOpinlyClient({
  apiKey: process.env.OPINLY_API_KEY,
  // Ensure the client is properly initialized with all required options
  fetch: (input, init) => {
    // Use Next.js fetch with proper error handling
    return fetch(input, {
      ...init,
      cache: "force-cache",
      // Ensure proper headers for tRPC
      headers: {
        ...(init?.headers || {}),
        "Content-Type": "application/json",
      },
    });
  },
});
