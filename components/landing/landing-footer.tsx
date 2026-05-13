"use client";

import Link from "next/link";
import Image from "next/image";

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {/* Left Section - Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <Image
                src="/logos/android-chrome-512x512.png"
                alt="App"
                width={32}
                height={32}
                className="rounded-full"
              />
              <span className="text-xl font-bold text-gray-900">App</span>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed mb-6 max-w-md">
              TODO: Short product description for the footer.
            </p>
            {/* Copyright */}
            <p className="text-sm text-gray-600">
              {currentYear} App Inc. All rights reserved.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">
              LINKS
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/careers"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Careers
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">
              LEGAL
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
