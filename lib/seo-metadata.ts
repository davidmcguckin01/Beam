import type { Metadata } from "next";

const baseUrl = process.env.OPINLY_SITE_URL || "https://example.com";

export function generatePageMetadata({
  title,
  description,
  path,
  keywords = [],
}: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
}): Metadata {
  const url = `${baseUrl}${path}`;
  const fullTitle = `${title} | App`;

  return {
    title: fullTitle,
    description,
    keywords: keywords.length > 0 ? keywords : undefined,
    authors: [{ name: "App" }],
    creator: "App",
    publisher: "App",
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: "App",
      locale: "en_US",
      type: "website",
      images: [
        {
          url: `${baseUrl}/logos/android-chrome-512x512.png`,
          width: 512,
          height: 512,
          alt: "App Logo",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [`${baseUrl}/logos/android-chrome-512x512.png`],
      creator: "@app",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

