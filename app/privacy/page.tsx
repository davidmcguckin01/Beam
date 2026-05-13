import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { generatePageMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = generatePageMetadata({
  title: "Privacy Policy",
  description: "TODO: Privacy policy description.",
  path: "/privacy",
  keywords: ["privacy policy"],
});

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 px-6 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-full">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logos/android-chrome-512x512.png"
              alt="App"
              width={32}
              height={32}
              className="rounded-full"
            />
            <h1 className="text-lg font-semibold text-gray-900">App</h1>
          </Link>
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-black hover:bg-gray-900 text-white"
            >
              <Link href="/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="pt-24 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8"
          >
            <ArrowLeft className="w-4 h-4 " />
            Back to Home
          </Link>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-600 mb-12">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <div className="prose prose-gray max-w-none space-y-8">
            <section>
              <p className="text-gray-700 leading-relaxed mb-4">
                TODO: Replace this section with your privacy policy.
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image
                src="/logos/android-chrome-512x512.png"
                alt="App"
                width={32}
                height={32}
                className="rounded-full"
              />
              <span className="text-gray-600">App</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <Link href="/terms" className="hover:text-gray-900">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-gray-900">
                Privacy
              </Link>
              <Link href="/faq" className="hover:text-gray-900">
                FAQ
              </Link>
              <Link href="/about" className="hover:text-gray-900">
                About
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
