/**
 * Sitemap configuration utility
 * Centralized configuration for managing sitemap and robots.txt
 */

export const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://example.com";

export interface SitemapPage {
  loc: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
  lastmod?: Date;
}

/**
 * Static pages configuration for the sitemap
 */
export const staticPages: SitemapPage[] = [
  { loc: "/", changefreq: "weekly", priority: 1.0 },
  { loc: "/about", changefreq: "monthly", priority: 0.8 },
  { loc: "/faq", changefreq: "monthly", priority: 0.7 },
  { loc: "/pricing", changefreq: "monthly", priority: 0.9 },
  { loc: "/terms", changefreq: "yearly", priority: 0.5 },
  { loc: "/privacy", changefreq: "yearly", priority: 0.5 },
  { loc: "/sign-in", changefreq: "monthly", priority: 0.6 },
  { loc: "/sign-up", changefreq: "monthly", priority: 0.8 },
  { loc: "/blog", changefreq: "weekly", priority: 0.9 },
];

/**
 * Paths to exclude from robots.txt (not indexed by search engines)
 */
export const disallowedPaths = [
  "/dashboard/",
  "/api/",
  "/onboarding/",
  "/translate/",
  "/f/", // Feedback pages are public but don't need to be indexed
];

/**
 * Convert SitemapPage to Next.js MetadataRoute.Sitemap format
 */
export function toMetadataRouteSitemap(pages: SitemapPage[]) {
  return pages.map((page) => ({
    url: `${baseUrl}${page.loc}`,
    lastModified: page.lastmod || new Date(),
    changeFrequency: page.changefreq,
    priority: page.priority,
  }));
}

