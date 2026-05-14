import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { generatePageMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = generatePageMetadata({
  title: "Privacy Policy",
  description:
    "How Ocholens collects, uses, and protects information across our website and AI traffic analytics service.",
  path: "/privacy",
  keywords: ["privacy policy", "ocholens privacy"],
});

// NOTE: This policy is written as a solid starting point for Ocholens and
// should be reviewed by legal counsel before relying on it.

type Block = string | { list: string[] };

const SECTIONS: { heading: string; blocks: Block[] }[] = [
  {
    heading: "Overview",
    blocks: [
      'Ocholens ("Ocholens", "we", "us", or "our") provides AI traffic analytics that show website owners when AI tools refer visitors to their site and when AI crawlers access their content. This Privacy Policy explains what we collect, why we collect it, and the choices you have. It applies to ocholens.com and the Ocholens dashboard.',
      "We act in two roles. For information about our own account holders, we are the data controller. For the visitor and crawler analytics data our customers collect through Ocholens about their own websites, we act as a data processor on that customer's behalf.",
    ],
  },
  {
    heading: "Information we collect",
    blocks: [
      "Account information — when you create an account we collect your name and email address through our authentication provider.",
      "Billing information — paid plans are processed by our payment provider. We receive limited billing metadata such as your plan, subscription status, and the last four digits of your card. We never receive or store full card numbers.",
      "Analytics data we collect for our customers — when an Ocholens snippet or middleware runs on a customer's website, we record request metadata about visits and crawler hits, including:",
      {
        list: [
          "the URL requested and the referring URL",
          "the detected AI source (for example ChatGPT, Claude, Perplexity, or Gemini)",
          "the crawler's name, vendor, and whether it was verified",
          "approximate country and originating network (ASN)",
          "the user-agent string and a timestamp",
        ],
      },
      "IP addresses are used transiently to verify crawler authenticity against vendors' published IP ranges and to derive approximate country. They are not exposed in the dashboard.",
      "Product usage data — we use a product analytics tool to understand how the dashboard is used, such as which pages and features are viewed and basic device and browser information.",
      "Communications — if you contact us by email, we keep that correspondence so we can support you.",
    ],
  },
  {
    heading: "How we use information",
    blocks: [
      "We use the information we collect to:",
      {
        list: [
          "provide, operate, and maintain the Ocholens service",
          "authenticate you and secure your account",
          "process payments and manage subscriptions",
          "detect AI referrals and verify AI crawlers",
          "produce the analytics our customers ask us to collect",
          "improve, troubleshoot, and develop new features",
          "respond to support requests and communicate with you",
          "comply with legal obligations and enforce our terms",
        ],
      },
    ],
  },
  {
    heading: "Cookies",
    blocks: [
      "We use strictly necessary cookies on ocholens.com for authentication and security. We do not use advertising or cross-site tracking cookies on our own site.",
      "The human-visitor tracking snippet we provide to customers does not set cookies, does not fingerprint visitors, and does not track visitors across different websites.",
    ],
  },
  {
    heading: "Legal bases for processing (EEA / UK)",
    blocks: [
      "Where the GDPR or UK GDPR applies, we rely on the following legal bases: performance of a contract (to provide the service you signed up for); our legitimate interests (to secure, improve, and operate the service, including crawler verification); your consent where it is required; and compliance with legal obligations.",
    ],
  },
  {
    heading: "Sharing and sub-processors",
    blocks: [
      "We do not sell personal data. We share data with trusted sub-processors that help us run Ocholens, including providers for authentication, database hosting, application hosting, payment processing, and product analytics. Each is bound by contractual obligations to protect the data they handle.",
      "We may also disclose information if required by law, to respond to lawful requests, or to protect the rights, property, and safety of Ocholens, our users, or the public. If Ocholens is involved in a merger, acquisition, or sale of assets, information may be transferred as part of that transaction.",
    ],
  },
  {
    heading: "Data retention",
    blocks: [
      "We retain account information for as long as your account is active. Analytics event data is retained according to your plan's retention window, and is deleted within a reasonable period after an account is closed. Billing records are kept for as long as required by law.",
    ],
  },
  {
    heading: "Security",
    blocks: [
      "We protect information using encryption in transit, access controls, and reputable infrastructure providers. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.",
    ],
  },
  {
    heading: "International transfers",
    blocks: [
      "Ocholens is operated with infrastructure that may process data in the United States and other countries. Where required, we rely on appropriate safeguards, such as Standard Contractual Clauses, for international transfers.",
    ],
  },
  {
    heading: "Your rights",
    blocks: [
      "Depending on where you live, you may have the right to access, correct, delete, or port your personal data, and to object to or restrict certain processing or withdraw consent. To exercise rights relating to your Ocholens account, email us using the contact details below.",
      "For analytics data we process on behalf of a customer (the website owner), please contact that customer directly. As their processor, we will assist them in responding to your request.",
    ],
  },
  {
    heading: "Children's privacy",
    blocks: [
      "Ocholens is not directed to children under 16, and we do not knowingly collect personal data from them. If you believe a child has provided us personal data, contact us and we will delete it.",
    ],
  },
  {
    heading: "Changes to this policy",
    blocks: [
      'We may update this Privacy Policy from time to time. When we do, we will revise the "last updated" date above, and we will provide notice of material changes where appropriate.',
    ],
  },
  {
    heading: "Contact us",
    blocks: [
      "If you have questions about this Privacy Policy or how we handle your information, email us at hello@ocholens.com.",
    ],
  },
];

export default function PrivacyPage() {
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
            Privacy Policy
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
