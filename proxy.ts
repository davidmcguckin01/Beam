import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/api/webhooks(.*)",
  "/api/i", // Beam: public ingest endpoint (pixel)
  "/invite/(.*)", // Beam: invite accept page (handles its own redirect-to-sign-in)
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/translate", // Temporarily public for testing, remove if you want auth required
  "/api/ai-form-preview", // Public AI form generation for landing page
  "/f/(.*)", // Public feedback pages (legacy /f/ prefix)
  // Custom prefix/slug routes: /{prefix}/{slug}
  // Excludes known system path prefixes to prevent auth bypass
  "/((?!dashboard|app|sign-in|sign-up|onboarding|pricing|blog|about|faq|terms|privacy|api|_next|translate|careers)[^/]+)/([^/]+)",
  "/api/feedback-pages/slug(.*)", // Public API to get feedback page by slug
  "/api/feedback-pages(.*)/submissions(.*)", // Public API to submit/update feedback
  "/api/feedback-pages(.*)/track-view", // Public API to track page views (POST only)
  "/api/feedback-pages/access", // Public API to verify form access
  "/onboarding", // Onboarding page (requires auth but is a setup flow)
  "/pricing", // Pricing page (requires auth but shown after onboarding)
  "/about", // About page
  "/faq", // FAQ page
  "/terms", // Terms page
  "/privacy", // Privacy page
  "/sitemap.xml", // Sitemap
  "/robots.txt", // Robots.txt
]);

// Run schema validation once per server instance
let schemaValidationRun = false;

export default clerkMiddleware(async (auth, request) => {
  // Run schema validation once on first request
  if (!schemaValidationRun) {
    schemaValidationRun = true;
    import("@/lib/schema-validation")
      .then(({ validateFeedbackSchema }) => {
        validateFeedbackSchema().catch((error) => {
          console.error("Schema validation error in middleware:", error);
        });
      })
      .catch((error) => {
        console.error("Error importing schema validation:", error);
      });
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
