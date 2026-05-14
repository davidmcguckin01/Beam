"use client";

import { useEffect, useRef } from "react";

// Domain field for onboarding Step 1. When we prefill a guessed company
// domain, select it on mount — so the user can accept it by just submitting,
// or overwrite it by typing, without having to clear the field first.
export function OnboardingDomainInput({
  defaultValue,
}: {
  defaultValue?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

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
      defaultValue={defaultValue}
      placeholder="example.com"
      autoComplete="off"
      className="block w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-[14px] text-black placeholder:text-black/30 focus:border-black/40 focus:outline-none"
    />
  );
}
