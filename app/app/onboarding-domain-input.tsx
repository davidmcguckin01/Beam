"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

// Domain field for onboarding Step 1. When we prefill a guessed company
// domain, select it on mount — so the user can accept it by just submitting,
// or overwrite it by typing, without having to clear the field first.
export function OnboardingDomainInput({
  defaultValue,
}: {
  defaultValue?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const { pending } = useFormStatus();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    if (el.value) el.select();
  }, []);

  return (
    <input
      ref={ref}
      name="domain"
      type="text"
      required
      disabled={pending}
      defaultValue={defaultValue}
      placeholder="example.com"
      autoComplete="off"
      className="block w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-[14px] text-black placeholder:text-black/30 focus:border-black/40 focus:outline-none disabled:opacity-60"
    />
  );
}

// Submit button for onboarding Step 1's "Add your site" form. createSiteAction
// fetches the customer's domain to detect their stack, which can take a couple
// of seconds — so the button shows a spinner and locks while it's in flight.
export function CreateSiteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-md bg-black px-5 text-[13px] font-medium text-white transition-colors hover:bg-black/85 disabled:opacity-70"
    >
      {pending ? (
        <>
          <Spinner />
          Creating site…
        </>
      ) : (
        "Create site →"
      )}
    </button>
  );
}

// Submit button for onboarding Step 3's "Invite your team" form.
export function InviteSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center gap-1.5 rounded-md bg-black px-5 text-[13px] font-medium text-white transition-colors hover:bg-black/85 disabled:opacity-60"
    >
      {pending ? (
        <>
          <Spinner />
          Sending…
        </>
      ) : (
        "Send invite"
      )}
    </button>
  );
}

// "Skip for now" control on onboarding Step 3 — skipInviteStepAction sets a
// cookie and redirects, so it spins until the navigation lands.
export function SkipInviteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-[12px] text-black/40 transition-colors hover:text-black disabled:opacity-50"
    >
      {pending ? "Skipping…" : "Skip for now →"}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className="animate-spin"
      aria-hidden
    >
      <circle
        cx="6"
        cy="6"
        r="4.5"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="1.5"
      />
      <path
        d="M6 1.5 A4.5 4.5 0 0 1 10.5 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
