import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-white text-black antialiased">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <Link
          href="/"
          className="text-[15px] font-semibold tracking-tight"
        >
          Beam
        </Link>

        <div className="flex flex-1 flex-col justify-center">
          <div className="mb-6 space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-black/60">
              Sign in to your Beam dashboard.
            </p>
          </div>

          <SignIn
            fallbackRedirectUrl="/app"
            signUpFallbackRedirectUrl="/app"
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
                rootBox: "w-full",
                card: "w-full rounded-xl border border-black/8 bg-white p-6 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]",
                cardBox: "shadow-none border-none bg-transparent p-0",
                logoBox: "hidden",
                logoImage: "hidden",
                header: "hidden",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
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
        </div>

        <p className="text-center text-xs text-black/50">
          By signing in you agree to the terms of service.
        </p>
      </div>
    </main>
  );
}
