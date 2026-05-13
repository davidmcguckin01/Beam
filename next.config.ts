import type { NextConfig } from "next";
import { withOpinlyConfig } from "@opinly/next/config";

const nextConfig: NextConfig = {
  /* config options here */
  // Suppress middleware deprecation warning - Clerk requires middleware.ts
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

const withOpinly = withOpinlyConfig({
  blogPath: "/blog",
  imagesPath: "/images",
  companyName: process.env.OPINLY_COMPANY_NAME || "App",
  cdnNamespace: process.env.OPINLY_CDN_NAMESPACE || "H2EeL2dS5fFJanv0U251Y",
  siteUrl: process.env.OPINLY_SITE_URL || "https://example.com",
});

module.exports = withOpinly(nextConfig);
