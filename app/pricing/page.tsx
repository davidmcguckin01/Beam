"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser, useOrganization, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { captureGclid, getStoredGclid } from "@/lib/gclid-tracking";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackEvent } from "@/lib/posthog";
import { PLANS } from "@/lib/pricing";

export default function PricingPage() {
  const { user, isLoaded: userLoaded } = useUser();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "yearly"
  );
  const [gclid, setGclid] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [contactSubmitting, setContactSubmitting] = useState(false);

  const canceled = searchParams.get("canceled") === "true";
  const searchParamsKey = useMemo(() => searchParams.toString(), [searchParams]);
  const contactLinkExample = useMemo(() => {
    const params = new URLSearchParams({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@acme.com",
    });
    return `/pricing?${params.toString()}`;
  }, []);
  const isContactFormValid =
    contactForm.firstName.trim() &&
    contactForm.lastName.trim() &&
    contactForm.email.trim();

  // Capture gclid on page load
  useEffect(() => {
    const capturedGclid = captureGclid();
    if (capturedGclid) {
      setGclid(capturedGclid);
    }
  }, []);

  // Track pricing page view
  useEffect(() => {
    if (userLoaded && orgLoaded) {
      trackEvent("Pricing Page Viewed", {
        timestamp: new Date().toISOString(),
      });
    }
  }, [userLoaded, orgLoaded]);

  useEffect(() => {
    const getParamValue = (keys: string[]) => {
      for (const key of keys) {
        const value = searchParams.get(key);
        if (value) return value;
      }
      return null;
    };

    const firstParam = getParamValue(["firstName", "first_name", "fname"]);
    const lastParam = getParamValue(["lastName", "last_name", "lname"]);
    const emailParam = getParamValue([
      "email",
      "emailAddress",
      "email_address",
    ]);

    if (!firstParam && !lastParam && !emailParam) {
      return;
    }

    setContactForm((prev) => ({
      firstName: prev.firstName || firstParam || "",
      lastName: prev.lastName || lastParam || "",
      email: prev.email || emailParam || "",
    }));
  }, [searchParamsKey]);

  useEffect(() => {
    if (canceled) {
      toast.error("Payment was canceled. Please try again when you're ready.");
    }
  }, [canceled]);

  useEffect(() => {
    if (userLoaded && !user) {
      router.push("/sign-in");
      return;
    }

    if (userLoaded && orgLoaded) {
      fetch("/api/workspaces")
        .then((res) => res.json())
        .then((data) => {
          if (data.workspaces && data.workspaces.length > 0) {
            setWorkspaceId(data.workspaces[0].id);
          }
        })
        .catch(console.error);
    }
  }, [userLoaded, user, orgLoaded, router]);

  const handleSelectPlan = async (planId: string) => {
    setLoading(planId);

    // Track plan selection (analytics only — checkout removed).
    const selectedPlan = PLANS.find((p) => p.id === planId);
    trackEvent("Plan Selected", {
      planId: planId,
      planName: selectedPlan?.name,
      billingPeriod: billingPeriod,
      price:
        billingPeriod === "yearly"
          ? selectedPlan?.yearlyPrice
          : selectedPlan?.monthlyPrice,
      timestamp: new Date().toISOString(),
    });

    // Checkout removed — bounce to dashboard.
    router.push("/dashboard");
    setLoading(null);
  };

  if (!userLoaded || !orgLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      </div>
    );
  }

  const handleContactSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!isContactFormValid) {
      toast.error("Please fill in all fields before sending.");
      return;
    }

    setContactSubmitting(true);
    try {
      const mailParams = new URLSearchParams({
        subject: "App pricing request",
        body: `First name: ${contactForm.firstName}\nLast name: ${contactForm.lastName}\nEmail: ${contactForm.email}`,
      });

      window.location.href = `mailto:support@example.com?${mailParams.toString()}`;
      toast.success(
        "Thanks! Your email client will open with the details prefilled."
      );
    } catch (error) {
      console.error("Failed to start email client", error);
      toast.error(
        "We couldn't open your email client. Please reach out to support@example.com."
      );
    } finally {
      setContactSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50/50">
      {/* Header with User Button */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logos/android-chrome-512x512.png"
              alt="App"
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="text-xl font-semibold text-gray-900">
              App
            </span>
          </Link>
          {user && <UserButton afterSignOutUrl="/" />}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-20 sm:pb-24">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            TODO: Pricing headline.
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            TODO: Pricing subheadline.
          </p>
        </div>

        <div className="flex items-center justify-center mb-16">
          <div className="inline-flex items-center bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${
                billingPeriod === "monthly"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-gray-600 hover:text-zinc-900"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("yearly")}
              className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                billingPeriod === "yearly"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-gray-600 hover:text-zinc-900"
              }`}
            >
              Yearly
              {billingPeriod === "yearly" && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Save 40%
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-16">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-8 transition-all duration-300 ${
                plan.popular
                  ? "bg-zinc-900 text-white shadow-2xl scale-105 border-2 border-zinc-800"
                  : "bg-white border border-gray-200 shadow-lg hover:shadow-xl hover:border-gray-300"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
                    Most popular
                  </span>
                </div>
              )}

              <div className="mb-8">
                <h3
                  className={`text-2xl font-bold mb-4 ${
                    plan.popular ? "text-white" : "text-zinc-900"
                  }`}
                >
                  {plan.name}
                </h3>

                <div className="mb-2">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-5xl font-bold ${
                        plan.popular ? "text-white" : "text-zinc-900"
                      }`}
                    >
                      $
                      {billingPeriod === "yearly"
                        ? plan.yearlyPrice
                        : plan.monthlyPrice}
                    </span>
                    <span
                      className={`text-lg font-medium ${
                        plan.popular ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      /month
                    </span>
                  </div>
                  {billingPeriod === "yearly" && (
                    <p
                      className={`text-sm mt-2 ${
                        plan.popular ? "text-gray-500" : "text-gray-500"
                      }`}
                    >
                      billed annually
                    </p>
                  )}
                </div>
              </div>

              <Button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loading !== null}
                className={`w-full mb-8 rounded-lg h-12 font-semibold text-base transition-all ${
                  plan.popular
                    ? "bg-white text-zinc-900 hover:bg-gray-100 shadow-lg hover:shadow-xl"
                    : "bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg hover:shadow-xl"
                }`}
              >
                {loading === plan.id ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Get started"
                )}
              </Button>

              <ul className="space-y-3.5">
                {plan.features.map((feature, index) => (
                  <li
                    key={index}
                    className={`flex items-start gap-3 text-sm ${
                      plan.popular ? "text-gray-200" : "text-gray-600"
                    }`}
                  >
                    <Check
                      className={`w-5 h-5 mt-0.5 shrink-0 ${
                        plan.popular ? "text-orange-400" : "text-emerald-600"
                      }`}
                    />
                    <span className="leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto mb-16">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 lg:p-10 shadow-lg">
            <div className="flex items-start gap-1 mb-6">
              <svg
                className="w-6 h-6 text-orange-500 shrink-0 mt-1"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.996 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.984zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-10z" />
              </svg>
            </div>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              TODO: Customer testimonial quote.
            </p>
            <div>
              <div className="text-sm font-semibold text-zinc-900">
                TODO: Name
              </div>
              <div className="text-sm text-gray-500">TODO: Role, Company</div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mb-16">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 lg:p-12 shadow-lg">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
              <div>
                <p className="text-sm font-semibold text-orange-500 mb-2">
                  Need a hand?
                </p>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                  Talk to a person and get setup support
                </h3>
                <p className="text-base text-gray-600 mb-4">
                  Share this page with{" "}
                  <span className="font-medium text-gray-900">
                    firstName
                  </span>
                  {", "}
                  <span className="font-medium text-gray-900">lastName</span>,
                  {" and "}
                  <span className="font-medium text-gray-900">email</span>{" "}
                  query params to prefill the form for your customer.
                </p>
                <p className="text-sm text-gray-500 font-mono break-all">
                  {contactLinkExample}
                </p>
              </div>
              <form
                onSubmit={handleContactSubmit}
                className="space-y-5 bg-gray-50 border border-gray-200 rounded-xl p-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactFirstName">First name</Label>
                    <Input
                      id="contactFirstName"
                      value={contactForm.firstName}
                      onChange={(event) =>
                        setContactForm((prev) => ({
                          ...prev,
                          firstName: event.target.value,
                        }))
                      }
                      placeholder="Jane"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactLastName">Last name</Label>
                    <Input
                      id="contactLastName"
                      value={contactForm.lastName}
                      onChange={(event) =>
                        setContactForm((prev) => ({
                          ...prev,
                          lastName: event.target.value,
                        }))
                      }
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactForm.email}
                    onChange={(event) =>
                      setContactForm((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                    placeholder="jane@acme.com"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!isContactFormValid || contactSubmitting}
                  className="w-full h-12 rounded-lg font-semibold"
                >
                  {contactSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Preparing email...
                    </>
                  ) : (
                    "Email the team"
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>

        <div className="text-center pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Questions? Contact us at{" "}
            <a
              href="mailto:support@example.com"
              className="text-zinc-900 font-medium hover:underline"
            >
              support@example.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
