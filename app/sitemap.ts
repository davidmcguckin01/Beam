import type { MetadataRoute } from "next";
import { staticPages, toMetadataRouteSitemap } from "@/lib/sitemap-config";

export const revalidate = false;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return toMetadataRouteSitemap(staticPages);
}
