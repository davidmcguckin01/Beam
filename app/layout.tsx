import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import Script from "next/script";
import { GclidCapture } from "@/components/gclid-capture";
import { PostHogProvider } from "@/components/posthog-provider";
import { PostHogUserTracker } from "@/components/posthog-user-tracker";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Beam",
  description: "See exactly when AI sends people to your site.",
};

// Force dynamic rendering to prevent static generation issues with Clerk
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY. Please add it to your environment variables."
    );
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={{
        elements: {
          rootBox: "w-full",
        },
      }}
    >
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
        >
          <PostHogProvider>
            <Script
              src="https://www.googletagmanager.com/gtag/js?id=AW-17741868305"
              strategy="afterInteractive"
            />
            <Script id="google-ads" strategy="afterInteractive">
              {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'AW-17741868305');
              // Enhanced Conversions is enabled in Google Ads account settings
              // User data will be automatically hashed when provided in conversion events
            `}
            </Script>
            <GclidCapture />
            <PostHogUserTracker />
            {children}
            <Analytics />
            <Toaster />
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
