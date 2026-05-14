import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { generatePageMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = generatePageMetadata({
  title: "Terms of Service",
  description:
    "The terms that govern your use of Ocholens, the AI traffic analytics service.",
  path: "/terms",
  keywords: ["terms of service", "terms and conditions", "ocholens terms"],
});

// NOTE: These terms are written as a solid starting point for Ocholens and
// should be reviewed by legal counsel before relying on them.

type Block = string | { list: string[] };

const SECTIONS: { heading: string; blocks: Block[] }[] = [
  {
    heading: "Agreement to these terms",
    blocks: [
      'These Terms of Service ("Terms") govern your access to and use of Ocholens ("Ocholens", "we", "us", or "our"), including ocholens.com and the Ocholens dashboard. By creating an account or using the service, you agree to these Terms. If you use Ocholens on behalf of an organization, you represent that you are authorized to bind that organization to these Terms.',
    ],
  },
  {
    heading: "The service",
    blocks: [
      "Ocholens provides analytics that identify AI-tool referrals and AI crawler activity on websites you own or are otherwise authorized to manage. Features, usage limits, and plan details may change over time as we improve the service.",
    ],
  },
  {
    heading: "Accounts",
    blocks: [
      "You must provide accurate information when you register, keep your login credentials secure, and you are responsible for all activity that occurs under your account. You must be at least 16 years old to use Ocholens. Notify us promptly of any unauthorized use of your account.",
    ],
  },
  {
    heading: "Acceptable use",
    blocks: [
      "You agree not to:",
      {
        list: [
          "install or use Ocholens on websites you do not own or are not authorized to instrument",
          "collect data in violation of applicable law or any third party's rights",
          "attempt to disrupt, overload, reverse engineer, or gain unauthorized access to the service or its infrastructure",
          "resell, sublicense, or provide the service to third parties except as expressly permitted",
          "use the service to build or train a competing product",
        ],
      },
    ],
  },
  {
    heading: "Your data and responsibilities",
    blocks: [
      "You retain ownership of the data you collect through Ocholens. You grant us a worldwide, non-exclusive license to host, process, and display that data solely to provide and improve the service for you.",
      "You are responsible for having a lawful basis to collect visitor and crawler analytics, for publishing your own privacy notice to your website's visitors, and for complying with all privacy and data-protection laws applicable to you and your visitors.",
    ],
  },
  {
    heading: "Plans, billing, and payments",
    blocks: [
      "Ocholens offers a free plan and paid plans. Paid plans are billed in advance on a recurring basis through our payment provider and renew automatically until cancelled. Fees are non-refundable except where required by law.",
      "We may change pricing or plan features with reasonable notice; changes take effect at the start of your next billing cycle. You can cancel at any time, and cancellation takes effect at the end of the current billing period.",
    ],
  },
  {
    heading: "Free plan",
    blocks: [
      'The free plan is provided "as is" and may be changed, limited, or discontinued at any time.',
    ],
  },
  {
    heading: "Intellectual property",
    blocks: [
      "Ocholens, including its software, design, branding, and content, is owned by us and our licensors and is protected by intellectual property laws. These Terms do not grant you any rights to our intellectual property except the limited right to use the service in accordance with these Terms.",
    ],
  },
  {
    heading: "Third-party services",
    blocks: [
      "The service relies on third-party providers, including hosting, payment, and authentication providers. We are not responsible for the acts or omissions of those third parties, and your use of their services may be subject to their own terms.",
    ],
  },
  {
    heading: "Disclaimer of warranties",
    blocks: [
      'The service is provided "as is" and "as available" without warranties of any kind, whether express or implied. We do not warrant that the service will be uninterrupted, secure, or error-free, or that AI referral and crawler detection will be complete or accurate.',
    ],
  },
  {
    heading: "Limitation of liability",
    blocks: [
      "To the maximum extent permitted by law, Ocholens will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of profits, revenue, or data. Our total liability for any claim arising out of or relating to the service is limited to the amount you paid us in the twelve months before the claim, or USD 100 if you are on the free plan.",
    ],
  },
  {
    heading: "Indemnification",
    blocks: [
      "You agree to indemnify and hold Ocholens harmless from any claims, damages, liabilities, and expenses arising out of your use of the service, the data you collect through it, or your breach of these Terms.",
    ],
  },
  {
    heading: "Termination",
    blocks: [
      "You may stop using Ocholens and close your account at any time. We may suspend or terminate your access if you breach these Terms or if we are required to do so by law. On termination, your right to use the service ends, and we may delete your data after a reasonable period.",
    ],
  },
  {
    heading: "Changes to these terms",
    blocks: [
      'We may update these Terms from time to time. When we do, we will revise the "last updated" date above. Your continued use of the service after changes take effect constitutes acceptance of the updated Terms.',
    ],
  },
  {
    heading: "Governing law",
    blocks: [
      "These Terms are governed by the laws of England and Wales, without regard to conflict-of-law principles. The courts of England and Wales will have exclusive jurisdiction over any dispute arising from these Terms, except where applicable law requires otherwise.",
    ],
  },
  {
    heading: "Contact us",
    blocks: [
      "If you have questions about these Terms, email us at hello@ocholens.com.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 px-6 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-full">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <h1 className="text-lg font-semibold text-gray-900">Ocholens</h1>
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
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Terms of Service
          </h1>
          <p className="text-gray-600 mb-12">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <div className="space-y-10">
            {SECTIONS.map((section, idx) => (
              <section key={section.heading}>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  {idx + 1}. {section.heading}
                </h2>
                <div className="space-y-3">
                  {section.blocks.map((block, i) =>
                    typeof block === "string" ? (
                      <p
                        key={i}
                        className="text-gray-700 leading-relaxed"
                      >
                        {block}
                      </p>
                    ) : (
                      <ul
                        key={i}
                        className="list-disc space-y-1.5 pl-5 text-gray-700 leading-relaxed"
                      >
                        {block.list.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="text-gray-600">Ocholens</span>
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

function Logo() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className="text-black"
    >
      <path d="M10 1.5 L18.5 18.5 L1.5 18.5 Z" fill="currentColor" />
    </svg>
  );
}
