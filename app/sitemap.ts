import { opinly } from "@/clients/opinly";
import type { MetadataRoute } from "next";
import { staticPages, baseUrl, toMetadataRouteSitemap } from "@/lib/sitemap-config";

export const revalidate = false;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Convert static pages to MetadataRoute.Sitemap format
  const staticSitemapEntries = toMetadataRouteSitemap(staticPages);

  // Fetch records for all blog posts under your configured prefix
  let blogSiteMapRecords: MetadataRoute.Sitemap = [];
  try {
    blogSiteMapRecords = await opinly.content.sitemapRecords({
      blogUrl: `${baseUrl}${process.env.OPINLY_BLOG_PREFIX || "/blog"}`,
    });
  } catch (error) {
    console.error("Error fetching blog sitemap records:", error);
    // Continue with static pages even if blog records fail
  }

  return [...staticSitemapEntries, ...blogSiteMapRecords];
}

