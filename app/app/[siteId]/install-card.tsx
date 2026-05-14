"use client";

import { useState, useTransition } from "react";
import type { SnippetTab } from "@/lib/snippets";
import {
  redetectStackAction,
  resetStackAction,
  sendTestPingAction,
} from "@/app/app/actions";

type DetectedInfo = {
  label: string;
  serverSideAvailable: boolean;
} | null;

const DEFAULT_DONE = "Visit your site — events arrive within seconds.";

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
            <>
              <span className="font-mono text-[11px] tabular-nums text-black/55">
                detected: <span className="text-black">{detected.label}</span>
              </span>
              <form action={resetStackAction}>
                <input type="hidden" name="siteId" value={siteId} />
                <button
                  type="submit"
                  className="font-mono text-[11px] text-black/35 hover:text-black"
                >
                  reset
                </button>
              </form>
            </>
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

      <div className="px-6 py-5">
        <p className="text-[12.5px] text-black/60">{tab.blurb}</p>

        <ol className="mt-5 space-y-5">
          <Step number="01" title="Copy">
            <CodeBlock body={tab.body} lang={tab.lang} />
          </Step>
          <Step number="02" title={tab.pasteInstruction} />
          <Step
            number="03"
            title={tab.doneInstruction ?? DEFAULT_DONE}
            muted
          >
            <TestPingButton siteId={siteId} />
          </Step>
        </ol>
      </div>
    </section>
  );
}

function TestPingButton({ siteId }: { siteId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={(fd) => {
        startTransition(() => sendTestPingAction(fd));
      }}
    >
      <input type="hidden" name="siteId" value={siteId} />
      <button
        type="submit"
        disabled={pending}
        className="font-mono text-[11px] text-black/55 hover:text-black disabled:opacity-50"
      >
        {pending ? "sending…" : "or send a test ping →"}
      </button>
    </form>
  );
}

function Step({
  number,
  title,
  muted = false,
  children,
}: {
  number: string;
  title: React.ReactNode;
  muted?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="mt-0.5 select-none font-mono text-[11px] tabular-nums text-black/35">
        {number}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-[13px] ${
            muted ? "text-black/55" : "text-black"
          }`}
        >
          {title}
        </p>
        {children && <div className="mt-2.5">{children}</div>}
      </div>
    </li>
  );
}

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
    <div className="relative overflow-hidden rounded-md border border-black/10 bg-white">
      <div className="flex items-center justify-between border-b border-black/8 bg-black/2.5 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-black/40">
          {lang}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-6 items-center rounded border border-black/10 bg-white px-2 text-[11px] text-black/70 hover:bg-black/3 hover:text-black"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="max-h-[28rem] overflow-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed text-black/85">
        <code>{body}</code>
      </pre>
    </div>
  );
}
