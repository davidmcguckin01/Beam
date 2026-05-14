import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/api/i", // Ocholens: public ingest endpoint (pixel + crawler beacons)
  "/invite/(.*)", // Ocholens: invite accept page (handles its own redirect-to-sign-in)
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/about", // About page
  "/careers", // Careers page
  "/faq", // FAQ page
  "/terms", // Terms page
  "/privacy", // Privacy page
  "/sitemap.xml", // Sitemap
  "/robots.txt", // Robots.txt
]);

export default clerkMiddleware(async (auth, request) => {
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
