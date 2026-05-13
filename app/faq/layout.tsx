import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = generatePageMetadata({
  title: "Frequently Asked Questions",
  description: "TODO: FAQ page description.",
  path: "/faq",
  keywords: ["faq", "frequently asked questions", "help", "support"],
});

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

