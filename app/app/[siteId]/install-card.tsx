"use client";

import { useState } from "react";
import type { SnippetTab } from "@/lib/snippets";
import { redetectStackAction } from "@/app/app/actions";

type DetectedInfo = {
  label: string;
  serverSideAvailable: boolean;
} | null;

export function InstallCard({
  snippets,
  detected,
  siteId,
}: {
  snippets: SnippetTab[];
  detected: DetectedInfo;
  siteId: string;
}) {
  const [active, setActive] = useState<SnippetTab["key"]>(snippets[0]?.key);
  const tab = snippets.find((s) => s.key === active) ?? snippets[0];

  return (
    <section className="overflow-hidden rounded-lg border border-black/8 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-black/8 px-6 py-3.5">
        <div className="flex items-baseline gap-3">
          <h2 className="text-[13px] font-medium text-black">Install</h2>
          {detected ? (
            <span className="font-mono text-[11px] tabular-nums text-black/55">
              detected: <span className="text-black">{detected.label}</span>
            </span>
          ) : (
            <form action={redetectStackAction}>
              <input type="hidden" name="siteId" value={siteId} />
              <button
                type="submit"
                className="font-mono text-[11px] text-black/55 hover:text-black"
              >
                detect platform →
              </button>
            </form>
          )}
        </div>
        <span className="text-[11px] text-black/45">
          {detected?.serverSideAvailable === false
            ? "HTML-only platform"
            : "pixel = humans · middleware = crawlers"}
        </span>
      </div>

      <div className="flex gap-0.5 overflow-x-auto border-b border-black/8 px-3 py-2">
        {snippets.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setActive(s.key)}
            className={`shrink-0 rounded px-2.5 py-1 text-[12px] transition-colors ${
              s.key === active
                ? "bg-black/8 text-black"
                : "text-black/55 hover:bg-black/3 hover:text-black"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="px-6 py-4">
        <p className="text-[12px] text-black/55">{tab.blurb}</p>
        <CodeBlock body={tab.body} lang={tab.lang} />
      </div>
    </section>
  );
}

// Code block stays dark — Vercel keeps code samples dark even in light-mode UI.
function CodeBlock({ body, lang }: { body: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="relative mt-3 overflow-hidden rounded-md border border-black/8 bg-[#0a0a0a]">
      <div className="flex items-center justify-between border-b border-white/8 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-white/35">
          {lang}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-6 items-center rounded border border-white/10 px-2 text-[11px] text-white/70 hover:bg-white/5 hover:text-white"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="max-h-96 overflow-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed text-white/85">
        <code>{body}</code>
      </pre>
    </div>
  );
}
