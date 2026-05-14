"use client";

import { useEffect } from "react";
import { SignUp, useUser } from "@clerk/nextjs";
import { trackEvent } from "@/lib/posthog";

export default function SignUpPage() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded) {
      trackEvent("Sign Up Page Viewed", {
        timestamp: new Date().toISOString(),
      });
    }
  }, [isLoaded]);

  useEffect(() => {
    if (isLoaded && user) {
      trackEvent("Sign Up Completed", {
        userId: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        hasFirstName: !!user.firstName,
        hasLastName: !!user.lastName,
        timestamp: new Date().toISOString(),
      });
    }
  }, [isLoaded, user]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-10 text-black antialiased">
      <SignUp
        fallbackRedirectUrl="/app"
        signInFallbackRedirectUrl="/app"
        appearance={{
          variables: {
            borderRadius: "8px",
            colorBackground: "#ffffff",
            colorInputBackground: "#ffffff",
            colorInputText: "#0a0a0a",
            colorPrimary: "#000000",
            colorText: "#0a0a0a",
            colorTextSecondary: "#666666",
            colorNeutral: "#000000",
            fontSize: "14px",
          },
          elements: {
            rootBox: "w-full max-w-md",
            card: "w-full rounded-xl border border-black/8 bg-white p-6 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]",
            cardBox: "shadow-none border-none bg-transparent p-0",
            logoBox: "hidden",
            logoImage: "hidden",
            socialButtonsBlockButton:
              "border border-black/10 bg-white text-black hover:bg-black/3 rounded-md",
            socialButtonsBlockButtonText: "text-sm font-medium",
            dividerLine: "bg-black/8",
            dividerText: "text-xs text-black/50",
            formFieldLabel:
              "text-xs font-medium text-black/70 mb-1.5",
            formFieldInput:
              "bg-white border border-black/10 text-black placeholder:text-black/40 focus:border-black focus:ring-0 rounded-md",
            formButtonPrimary:
              "bg-black hover:bg-black/85 text-white font-medium rounded-md h-10",
            footer: "opacity-60",
            footerAction: "opacity-100",
            footerActionText: "text-xs text-black/50",
            footerActionLink:
              "text-xs text-black hover:text-black/70 font-medium",
            formFieldAction:
              "text-xs text-black hover:text-black/70 font-medium",
            formResendCodeLink:
              "text-xs text-black hover:text-black/70 font-medium",
            identityPreview: "rounded-md border border-black/10",
            userPreviewAvatarBox: "hidden",
            avatarBox: "hidden",
          },
        }}
      />
    </main>
  );
}
