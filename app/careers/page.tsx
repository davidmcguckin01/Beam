import { generatePageMetadata } from "@/lib/seo-metadata";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export const metadata = generatePageMetadata({
  title: "Careers",
  description: "TODO: Careers page description.",
  path: "/careers",
});

export default function CareersPage() {
  const openPositions: Array<{
    title: string;
    department: string;
    location: string;
    type: string;
    description: string;
  }> = [
    // TODO: Add open positions here.
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logos/android-chrome-512x512.png"
              alt="App"
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="text-xl md:text-2xl font-semibold text-gray-900">
              App
            </span>
          </Link>
          <div className="flex items-center gap-3 md:gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Join the App Team
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            TODO: Careers hero copy.
          </p>
        </div>

        {/* Why Join Section */}
        <div className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
            Why Join App?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                TODO: Reason 1
              </h3>
              <p className="text-gray-700 leading-relaxed">
                TODO: Reason 1 description.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                TODO: Reason 2
              </h3>
              <p className="text-gray-700 leading-relaxed">
                TODO: Reason 2 description.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                TODO: Reason 3
              </h3>
              <p className="text-gray-700 leading-relaxed">
                TODO: Reason 3 description.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                TODO: Reason 4
              </h3>
              <p className="text-gray-700 leading-relaxed">
                TODO: Reason 4 description.
              </p>
            </div>
          </div>
        </div>

        {/* Open Positions */}
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
            Open Positions
          </h2>
          <div className="space-y-6">
            {openPositions.map((position, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-6 md:p-8 hover:border-gray-300 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
                      {position.title}
                    </h3>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                      <span>{position.department}</span>
                      <span>•</span>
                      <span>{position.location}</span>
                      <span>•</span>
                      <span>{position.type}</span>
                    </div>
                  </div>
                  <Button asChild className="w-full md:w-auto">
                    <Link href={`/careers/apply?position=${encodeURIComponent(position.title)}`}>
                      Apply Now
                    </Link>
                  </Button>
                </div>
                <p className="text-gray-700 leading-relaxed">{position.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center bg-gray-50 rounded-2xl p-12 md:p-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Don't see a role that fits?
          </h2>
          <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto">
            We're always looking for talented people. Send us your resume and
            we'll reach out when we have a role that matches your skills.
          </p>
          <Button asChild size="lg">
            <Link href="/careers/apply">Send General Application</Link>
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-200 mt-20">
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
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}




