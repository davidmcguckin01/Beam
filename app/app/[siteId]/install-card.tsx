"use client";

import { useActionState, useState, useTransition } from "react";
import type { SnippetTab } from "@/lib/snippets";
import {
  redetectStackAction,
  resetStackAction,
  verifyInstallAction,
} from "@/app/app/actions";
import type { VerifyResult } from "@/lib/verify-install";

type DetectedInfo = {
  label: string;
  serverSideAvailable: boolean;
} | null;

const DEFAULT_DONE = "Visit your site — events arrive within seconds.";

export function InstallCard({
  snippets,
  detected,
  siteId,
  domain,
  confirmed,
}: {
  snippets: SnippetTab[];
  detected: DetectedInfo;
  siteId: string;
  // The site's domain — shown in the verification messaging and used by the
  // server action to fetch the page.
  domain: string;
  // True only when the site has real events — the install is genuinely
  // proven. When false, the user gets the "Verify my install" control, which
  // fetches the site and checks the HTML for the snippet.
  confirmed: boolean;
}) {
  // The AI-agent install prompt is the primary path — most users paste it
  // straight into Cursor / Claude Code / Windsurf. The raw per-stack code
  // tabs are the power-user fallback, tucked behind "Show raw code".
  const promptTab = snippets.find((s) => s.key === "ai-prompt");
  const rawTabs = snippets.filter((s) => s.key !== "ai-prompt");

  const [showRaw, setShowRaw] = useState(false);
  const [active, setActive] = useState<SnippetTab["key"]>(rawTabs[0]?.key);
  const tab = rawTabs.find((s) => s.key === active) ?? rawTabs[0];

  const [copied, setCopied] = useState(false);
  const copyPrompt = async () => {
    if (!promptTab) return;
    try {
      await navigator.clipboard.writeText(promptTab.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { }
  };

  return (
    <section className="overflow-hidden rounded-lg border border-black/8 bg-white">
      {/* Header — the detected platform tailors the prompt below; the user can
          re-run detection or clear it from here. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-black/8 px-5 py-3.5">
        <h2 className="text-[13px] font-semibold tracking-tight text-black">
          Install
        </h2>
        {detected ? (
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-black/3 py-1 pl-2.5 pr-1">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                aria-hidden
              />
              <span className="font-mono text-[11px] leading-none text-black">
                {detected.label}
              </span>
              <ResetPlatformButton siteId={siteId} />
            </div>
            {detected.serverSideAvailable === false && (
              <span className="text-[10.5px] text-black/40">HTML-only</span>
            )}
          </div>
        ) : (
          <DetectPlatformButton siteId={siteId} />
        )}
      </div>

      {/* Primary path — copy the AI prompt, hand it to your editor. */}
      <div className="px-5 py-5">
        <div className="flex items-start gap-3">
          <span
            className="mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black text-white"
            aria-hidden
          >
            <SparkIcon />
          </span>
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold tracking-tight text-black">
              Install with your AI editor
            </h3>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-black/55">
              Copy the prompt and paste it into Cursor, Claude Code, or
              Windsurf — it edits the files for you.
              {detected ? ` Tailored for ${detected.label}.` : ""}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={copyPrompt}
          disabled={!promptTab}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-[13px] font-medium transition-colors disabled:opacity-50 ${copied
              ? "bg-emerald-600 text-white"
              : "bg-black text-white hover:bg-black/85"
            }`}
        >
          {copied ? <CheckIcon /> : <ClipboardIcon />}
          {copied ? "Copied to clipboard" : "Copy install prompt"}
        </button>

        {confirmed ? (
          <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-emerald-600/25 bg-emerald-50 px-4 py-2.5 text-[12.5px] font-medium text-emerald-700">
            <CheckIcon />
            Install confirmed
          </div>
        ) : (
          <VerifyInstall siteId={siteId} domain={domain} />
        )}
      </div>

      {/* DIY fallback — per-stack code + 01/02/03 steps, collapsed by default
          behind a proper disclosure row rather than a stray text link. */}
      <div className="border-t border-black/8">
        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          aria-expanded={showRaw}
          className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left transition-colors hover:bg-black/2"
        >
          <span className="text-[12.5px] font-medium text-black/70">
            Prefer to paste the code yourself?
          </span>
          <span className="flex shrink-0 items-center gap-1 text-[11.5px] text-black/45">
            {showRaw ? "Hide" : "Show raw code"}
            <ChevronIcon open={showRaw} />
          </span>
        </button>

        {showRaw && tab && (
          <div className="border-t border-black/8 bg-black/2">
            <div className="flex gap-0.5 overflow-x-auto px-3 pt-3">
              {rawTabs.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setActive(s.key)}
                  className={`shrink-0 rounded-md px-2.5 py-1 text-[12px] transition-colors ${s.key === active
                      ? "bg-white text-black shadow-sm ring-1 ring-black/8"
                      : "text-black/55 hover:bg-black/3 hover:text-black"
                    }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="px-5 py-5">
              <p className="text-[12.5px] text-black/60">{tab.blurb}</p>
              <ol className="mt-4 space-y-4">
                <Step number="01" title="Copy">
                  <CodeBlock body={tab.body} lang={tab.lang} />
                </Step>
                <Step number="02" title={tab.pasteInstruction} />
                <Step
                  number="03"
                  title={tab.doneInstruction ?? DEFAULT_DONE}
                  muted
                />
              </ol>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// The primary "I've installed it" confirmation. Actually fetches the site
// and scans its HTML for the Ocholens snippet (keyed to this site's apiKey) —
// real verification, not a synthetic ping. The result is shown inline; the
// button becomes "Check again" so the user can re-run after fixing things.
function VerifyInstall({
  siteId,
  domain,
}: {
  siteId: string;
  domain: string;
}) {
  const [result, formAction, pending] = useActionState<
    VerifyResult | null,
    FormData
  >(verifyInstallAction, null);

  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="siteId" value={siteId} />

      {result?.status === "installed" && (
        <div className="mb-3 rounded-lg border border-emerald-600/25 bg-emerald-50 px-3.5 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[12.5px] font-medium text-emerald-700">
            <CheckIcon />
            Ocholens is live on {domain}
          </div>
          <p className="mt-1 text-[11.5px] leading-snug text-emerald-700/80">
            Found the snippet on your homepage. Now waiting on the first real
            crawler or AI referral — this page updates itself when one lands.
          </p>
        </div>
      )}

      {result?.status === "not-found" && (
        <div className="mb-3 rounded-lg border border-amber-600/30 bg-amber-50 px-3.5 py-3 text-center">
          <div className="text-[12.5px] font-medium text-amber-800">
            Couldn&rsquo;t find the Ocholens snippet on {domain}
          </div>
          <p className="mt-1 text-[11.5px] leading-snug text-amber-800/80">
            We loaded your homepage but the install snippet wasn&rsquo;t in the
            HTML. Make sure it&rsquo;s in{" "}
            <code className="font-mono text-[11px]">{"<head>"}</code> and your
            latest deploy is live, then check again.
          </p>
        </div>
      )}

      {result?.status === "unreachable" && (
        <div className="mb-3 rounded-lg border border-amber-600/30 bg-amber-50 px-3.5 py-3 text-center">
          <div className="text-[12.5px] font-medium text-amber-800">
            Couldn&rsquo;t reach {domain}
          </div>
          <p className="mt-1 text-[11.5px] leading-snug text-amber-800/80">
            The site didn&rsquo;t respond. Check the domain is correct and
            publicly reachable, then try again.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-4 py-2.5 text-[13px] font-medium text-black transition-colors hover:bg-black/3 disabled:opacity-60"
      >
        {pending ? (
          <>
            <Spinner />
            Checking {domain}…
          </>
        ) : result ? (
          "Check again"
        ) : (
          "Verify my install"
        )}
      </button>
    </form>
  );
}

// Re-run stack detection. Detection hits the customer's domain over the
// network, so it can take a couple of seconds — show a spinner while the
// transition (action + redirect) is in flight.
function DetectPlatformButton({ siteId }: { siteId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={(fd) => {
        startTransition(() => redetectStackAction(fd));
      }}
      className="inline-flex"
    >
      <input type="hidden" name="siteId" value={siteId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1 text-[11.5px] font-medium text-black/70 shadow-sm transition-colors hover:border-black/30 hover:text-black disabled:opacity-60"
      >
        {pending ? <Spinner /> : <ScanIcon />}
        {pending ? "Detecting…" : "Detect platform"}
      </button>
    </form>
  );
}

// Clears a detected platform — the small ✕ inside the platform chip. Drops
// the header back to the "Detect platform" control. The form is inline-flex so
// the ✕ sits centered with the status dot and label rather than on its own
// block line, and it swaps to a spinner while the reset is in flight.
function ResetPlatformButton({ siteId }: { siteId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={(fd) => {
        startTransition(() => resetStackAction(fd));
      }}
      className="inline-flex"
    >
      <input type="hidden" name="siteId" value={siteId} />
      <button
        type="submit"
        disabled={pending}
        aria-label="Clear detected platform"
        title="Clear detected platform"
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-black/30 transition-colors hover:bg-black/10 hover:text-black/70 disabled:opacity-50"
      >
        {pending ? (
          <Spinner />
        ) : (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
            <path
              d="M1.4 1.4 L6.6 6.6 M6.6 1.4 L1.4 6.6"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
    </form>
  );
}

// Four-point spark — marks the AI-editor install path.
function SparkIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="currentColor"
      aria-hidden
    >
      <path d="M7 0.5 L8.3 5.7 L13.5 7 L8.3 8.3 L7 13.5 L5.7 8.3 L0.5 7 L5.7 5.7 Z" />
    </svg>
  );
}

// Disclosure chevron for the "Show raw code" row.
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      className={`transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path
        d="M2.5 4 L5 6.5 L7.5 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Target/radar mark for the "Detect platform" button.
function ScanIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
      <circle cx="6" cy="6" r="4.6" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="6" cy="6" r="1.4" fill="currentColor" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      width="11"
      height="11"
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
        strokeOpacity="0.25"
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
        <p className={`text-[13px] ${muted ? "text-black/55" : "text-black"}`}>
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
    } catch { }
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
      <pre className="max-h-112 overflow-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed text-black/85">
        <code>{body}</code>
      </pre>
    </div>
  );
}

function ClipboardIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect
        x="3"
        y="3"
        width="8"
        height="9.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M5 3 V2 h4 v1"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M3 7.5 L6 10.5 L11 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
