"use client";

import { useState } from "react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex h-7 shrink-0 items-center rounded-md border border-black/10 px-2.5 text-[11px] text-black/70 hover:bg-black/3 hover:text-black"
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}
