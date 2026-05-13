"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignUp } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormGenerationLoader } from "@/components/landing/form-generation-loader";
import { ArrowRight, Check, Gift, Loader2, Plus, Sparkles, Users, X } from "lucide-react";
import { trackEvent } from "@/lib/posthog";
import Link from "next/link";

interface OnboardingData {
  role?: string;
  useCase?: string;
}

type Step = "generating" | "signup" | "role" | "use-case" | "invite" | "complete";

const ONBOARDING_STEPS: Step[] = ["role", "use-case", "invite", "complete"];

export default function OnboardingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step | null>(null);
  const [data, setData] = useState<OnboardingData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Invite step state
  const [inviteEmails, setInviteEmails] = useState<string[]>([""]);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteResults, setInviteResults] = useState<{ email: string; success: boolean }[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine initial step based on auth + localStorage
  useEffect(() => {
    if (!mounted || !isLoaded || currentStep !== null) return;

    const pendingRaw = localStorage.getItem("pendingPrompt");

    if (pendingRaw && !user) {
      // Coming from landing page, not signed in yet
      setCurrentStep("generating");
    } else if (!user) {
      // No pending prompt, not signed in — normal redirect
      router.push("/sign-in");
    } else {
      // Signed in — start normal onboarding
      setCurrentStep("role");
    }
  }, [mounted, isLoaded, user, router, currentStep]);

  useEffect(() => {
    if (mounted && isLoaded && user && currentStep === "role") {
      trackEvent("Onboarding Started", {
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
    }
  }, [mounted, isLoaded, user, currentStep]);

  // Generate form when entering "generating" step
  useEffect(() => {
    if (currentStep !== "generating") return;

    const pendingRaw = localStorage.getItem("pendingPrompt");
    if (!pendingRaw) {
      setCurrentStep("signup");
      return;
    }

    const generateForm = async () => {
      try {
        const { prompt } = JSON.parse(pendingRaw);

        const res = await fetch("/api/ai-form-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Something went wrong");
        }

        localStorage.setItem(
          "pendingFormConfig",
          JSON.stringify({
            formConfig: data.formConfig,
            prompt,
            assistantMessage: data.assistantMessage,
            createdAt: new Date().toISOString(),
          })
        );

        localStorage.removeItem("pendingPrompt");

        trackEvent("AI Form Generated", {
          prompt,
          stepCount: data.formConfig?.steps?.length || 0,
        });

        setCurrentStep("signup");
      } catch (err) {
        setGenerationError(err instanceof Error ? err.message : "Something went wrong");

        trackEvent("AI Form Generation Failed", {
          error: err instanceof Error ? err.message : "unknown",
        });
      }
    };

    generateForm();
  }, [currentStep]);

  // Fetch workspace ID for invite step
  const fetchWorkspaceId = useCallback(async () => {
    try {
      const res = await fetch("/api/workspaces");
      if (res.ok) {
        const data = await res.json();
        const list = data.workspaces ?? data;
        if (Array.isArray(list) && list.length > 0) {
          setWorkspaceId(list[0].id);
          return;
        }
      }

      // No workspace exists yet — create a default one
      const createRes = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "My Workspace" }),
      });
      if (createRes.ok) {
        const createData = await createRes.json();
        const ws = createData.workspace;
        if (ws?.id) {
          setWorkspaceId(ws.id);
        }
      }
    } catch (err) {
      console.error("Error fetching workspaces:", err);
    }
  }, []);

  useEffect(() => {
    if (mounted && isLoaded && user) {
      fetchWorkspaceId();
    }
  }, [mounted, isLoaded, user, fetchWorkspaceId]);

  const handleAnswer = (key: keyof OnboardingData, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
    trackEvent("Onboarding Step Completed", {
      step: currentStep,
      answer: value,
      timestamp: new Date().toISOString(),
    });
    setTimeout(() => {
      const currentIndex = ONBOARDING_STEPS.indexOf(currentStep as Step);
      if (currentIndex >= 0 && currentIndex < ONBOARDING_STEPS.length - 1) {
        const nextStep = ONBOARDING_STEPS[currentIndex + 1];
        setCurrentStep(nextStep);
        trackEvent("Onboarding Step Viewed", {
          step: nextStep,
          timestamp: new Date().toISOString(),
        });
      }
    }, 200);
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save onboarding");
      trackEvent("Onboarding Completed", {
        role: data.role,
        useCase: data.useCase,
        timestamp: new Date().toISOString(),
      });
      router.push("/dashboard");
    } catch (error) {
      console.error("Error saving onboarding:", error);
      setIsSubmitting(false);
    }
  };

  const addInviteRow = () => setInviteEmails((prev) => [...prev, ""]);
  const updateInviteEmail = (idx: number, value: string) => {
    setInviteEmails((prev) => prev.map((e, i) => (i === idx ? value : e)));
  };
  const removeInviteRow = (idx: number) => {
    setInviteEmails((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSendInvites = async () => {
    const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
    const validEmails = inviteEmails.filter(
      (e) => e.trim() && e.includes("@") && e.trim().toLowerCase() !== userEmail
    );
    if (validEmails.length === 0 || !workspaceId) return;

    setIsInviting(true);
    const results: { email: string; success: boolean }[] = [];

    for (const email of validEmails) {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), role: "member" }),
        });
        results.push({ email: email.trim(), success: res.ok });
      } catch {
        results.push({ email: email.trim(), success: false });
      }
    }

    setInviteResults(results);
    const successCount = results.filter((r) => r.success).length;
    trackEvent("Onboarding Invites Sent", {
      count: successCount,
      total: validEmails.length,
      timestamp: new Date().toISOString(),
    });

    // Move to complete after a brief delay
    setTimeout(() => {
      setCurrentStep("complete");
      setIsInviting(false);
    }, 1500);
  };

  const handleRetryGeneration = () => {
    setGenerationError(null);
    setCurrentStep("generating");
  };

  if (!mounted || !isLoaded || currentStep === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      </div>
    );
  }

  const onboardingStepIndex = ONBOARDING_STEPS.indexOf(currentStep as Step);
  const showProgressBar = onboardingStepIndex >= 0 && currentStep !== "complete";
  const visibleStepCount = 3; // role, use-case, invite

  return (
    <div className="min-h-screen bg-white">
      {showProgressBar && (
        <div className="fixed top-6 left-0 right-0 z-30 flex justify-center">
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-1 w-6 rounded-full transition-colors duration-300 ${
                  i <= onboardingStepIndex ? "bg-gray-900" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-lg">

          {/* Generating Step */}
          {currentStep === "generating" && (
            <div className="space-y-8">
              {generationError ? (
                <div className="text-center space-y-4">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                    Something went wrong
                  </h2>
                  <p className="text-sm text-gray-500">{generationError}</p>
                  <div className="flex flex-col gap-2 items-center">
                    <Button
                      onClick={handleRetryGeneration}
                      className="bg-gray-900 hover:bg-gray-800 text-white px-6 h-10 text-sm font-medium rounded-lg"
                    >
                      Try again
                    </Button>
                    <Link href="/" className="text-xs text-gray-500 hover:text-gray-600 transition-colors">
                      Back to home
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="text-center space-y-3">
                    <div className="inline-flex items-center gap-2 text-orange-600">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                      Creating your form...
                    </h2>
                    <p className="text-sm text-gray-500">
                      AI is building a custom form based on your description
                    </p>
                  </div>
                  <FormGenerationLoader />
                </div>
              )}
            </div>
          )}

          {/* Signup Step */}
          {currentStep === "signup" && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-10 h-10 bg-green-50 rounded-full mb-2">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Your form is ready
                </h2>
                <p className="text-sm text-gray-500">
                  Create a free account to claim it
                </p>
              </div>
              <SignUp
                forceRedirectUrl="/onboarding"
                fallbackRedirectUrl="/onboarding"
                appearance={{
                  layout: {
                    socialButtonsVariant: "auto",
                    shimmer: false,
                  },
                  variables: {
                    borderRadius: "8px",
                    colorBackground: "#ffffff",
                    colorInputBackground: "#ffffff",
                    colorInputText: "#111827",
                    colorPrimary: "#ea580c",
                    colorText: "#111827",
                    colorTextSecondary: "#6b7280",
                    fontSize: "14px",
                  },
                  elements: {
                    rootBox: "w-full",
                    card: "w-full shadow-lg rounded-2xl border border-gray-200 bg-white p-6",
                    cardBox: "shadow-none border-none bg-transparent p-0",
                    header: "hidden",
                    headerTitle: "hidden",
                    headerSubtitle: "hidden",
                    footer: "opacity-50",
                    footerAction: "opacity-50",
                    identityPreview: "rounded border border-gray-200",
                    formFieldLabel: "text-xs font-medium text-gray-700 mb-1.5",
                    formFieldInput:
                      "bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 rounded w-full",
                    formButtonPrimary:
                      "bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors rounded w-full",
                    dividerLine: "bg-gray-200",
                    dividerText: "text-xs text-gray-500",
                    footerActionText: "text-xs text-gray-500",
                    footerActionLink:
                      "text-xs text-gray-900 hover:text-gray-700 font-medium",
                    formFieldAction:
                      "text-xs text-gray-900 hover:text-gray-700 font-medium",
                    formResendCodeLink:
                      "text-xs text-gray-900 hover:text-gray-700 font-medium",
                  },
                }}
              />
              <p className="text-center text-gray-400 text-sm">
                Already have an account?{" "}
                <Link
                  href="/sign-in"
                  className="text-gray-600 hover:text-gray-900 underline underline-offset-2"
                >
                  Sign in
                </Link>
              </p>
            </div>
          )}

          {/* Role Step */}
          {currentStep === "role" && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                  Step 1 of {visibleStepCount}
                </p>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                  What describes you best?
                </h2>
                <p className="text-sm text-gray-500 mt-2">
                  We&apos;ll tailor the experience for you
                </p>
              </div>
              <div className="space-y-2">
                {[
                  { value: "developer", label: "Developer" },
                  { value: "designer", label: "Designer" },
                  { value: "marketer", label: "Marketer" },
                  { value: "product_founder", label: "Product / Founder" },
                  { value: "other", label: "Other" },
                ].map((option) => {
                  const isSelected = data.role === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleAnswer("role", option.value)}
                      className={`group relative w-full px-4 py-3.5 rounded-lg border transition-all duration-150 text-left cursor-pointer ${
                        isSelected
                          ? "border-gray-900 bg-gray-50"
                          : "border-gray-200 bg-white hover:border-gray-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">
                          {option.label}
                        </span>
                        {isSelected ? (
                          <div className="w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 border border-gray-300 rounded-full" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Use Case Step */}
          {currentStep === "use-case" && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                  Step 2 of {visibleStepCount}
                </p>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                  What are you building forms for?
                </h2>
                <p className="text-sm text-gray-500 mt-2">
                  We&apos;ll set up the right defaults for you
                </p>
              </div>
              <div className="space-y-2">
                {[
                  { value: "user_research", label: "User research" },
                  { value: "lead_capture", label: "Lead capture" },
                  { value: "customer_onboarding", label: "Customer onboarding" },
                  { value: "event_registration", label: "Event registration" },
                  { value: "internal_workflows", label: "Internal workflows" },
                ].map((option) => {
                  const isSelected = data.useCase === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleAnswer("useCase", option.value)}
                      className={`group relative w-full px-4 py-3.5 rounded-lg border transition-all duration-150 text-left cursor-pointer ${
                        isSelected
                          ? "border-gray-900 bg-gray-50"
                          : "border-gray-200 bg-white hover:border-gray-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">
                          {option.label}
                        </span>
                        {isSelected ? (
                          <div className="w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 border border-gray-300 rounded-full" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Invite Step */}
          {currentStep === "invite" && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                  Step 3 of {visibleStepCount}
                </p>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Invite your team
                </h2>
                <p className="text-sm text-gray-500 mt-2">
                  Collaborate together and earn bonus responses
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-start gap-3">
                <Gift className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-sm text-emerald-800">
                  Each invite earns you <span className="font-semibold">50 extra responses</span> for free
                </p>
              </div>

              <div className="space-y-2">
                {inviteEmails.map((email, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="teammate@company.com"
                      value={email}
                      onChange={(e) => updateInviteEmail(idx, e.target.value)}
                      className="h-10 rounded-lg border-gray-200 text-sm"
                      disabled={isInviting}
                    />
                    {inviteEmails.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeInviteRow(idx)}
                        className="h-10 w-10 shrink-0 text-gray-500 hover:text-gray-900"
                        disabled={isInviting}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}

                <button
                  onClick={addInviteRow}
                  disabled={isInviting}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors pt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add another
                </button>
              </div>

              {inviteResults.length > 0 && (
                <div className="space-y-1">
                  {inviteResults.map((r, i) => (
                    <p key={i} className={`text-xs ${r.success ? "text-emerald-600" : "text-red-500"}`}>
                      {r.success ? "Invited" : "Failed to invite"} {r.email}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={handleSendInvites}
                  disabled={isInviting || !workspaceId || !inviteEmails.some((e) => {
                    const trimmed = e.trim().toLowerCase();
                    const self = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
                    return trimmed && trimmed.includes("@") && trimmed !== self;
                  })}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white h-10 text-sm font-medium rounded-lg transition-colors"
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Users className="w-3.5 h-3.5 mr-2" />
                      {inviteEmails.filter((e) => e.trim() && e.includes("@")).length <= 1 ? "Send invite" : "Send invites"}
                    </>
                  )}
                </Button>
                <button
                  onClick={() => {
                    trackEvent("Onboarding Invites Skipped", {
                      timestamp: new Date().toISOString(),
                    });
                    setCurrentStep("complete");
                  }}
                  disabled={isInviting}
                  className="text-xs text-gray-500 hover:text-gray-600 transition-colors py-1"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {currentStep === "complete" && (
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full">
                <Check className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                  You&apos;re all set
                </h2>
                <p className="text-sm text-gray-500 mt-2">
                  Let&apos;s build your first form
                </p>
              </div>
              <Button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="bg-gray-900 hover:bg-gray-800 text-white px-8 h-10 text-sm font-medium rounded-lg transition-colors"
              >
                {isSubmitting ? "Setting up..." : "Go to dashboard"}
                {!isSubmitting && <ArrowRight className="ml-2 w-3.5 h-3.5" />}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
