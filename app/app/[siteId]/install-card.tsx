"use client";

import { useActionState, useState, useTransition } from "react";
import type { SnippetTab } from "@/lib/snippets";
import {
  redetectStackAction,
  resetStackAction,
  sendTestPingAction,
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
    } catch {}
  };

  return (
    <section className="overflow-hidden rounded-lg border border-black/8 bg-white">
      {/* Header — the detected chip tailors the prompt; it is not a tab picker. */}
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
            <DetectPlatformButton siteId={siteId} />
          )}
        </div>
        {detected?.serverSideAvailable === false && (
          <span className="text-[11px] text-black/45">HTML-only platform</span>
        )}
      </div>

      {/* Primary surface — copy the prompt, hand it to your AI editor. */}
      <div className="px-6 py-6">
        <button
          type="button"
          onClick={copyPrompt}
          disabled={!promptTab}
          className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-[13px] font-medium transition-colors disabled:opacity-50 ${
            copied
              ? "bg-emerald-600 text-white"
              : "bg-black text-white hover:bg-black/85"
          }`}
        >
          {copied ? <CheckIcon /> : <ClipboardIcon />}
          {copied
            ? "Copied — paste it into your AI editor"
            : "Copy install prompt"}
        </button>
        <p className="mt-2 text-center text-[12px] text-black/50">
          Paste into Cursor, Claude Code, or Windsurf.
          {detected ? ` Tailored for ${detected.label}.` : ""}
        </p>
        <p className="mt-4 text-center text-[12.5px] text-black/70">
          Paste the prompt, your AI handles the rest.
        </p>

        {confirmed ? (
          <div className="mt-5 flex items-center justify-center gap-1.5 text-[12.5px] text-emerald-700">
            <CheckIcon />
            Install confirmed
          </div>
        ) : (
          <VerifyInstall siteId={siteId} domain={domain} />
        )}

        <div className="mt-5 flex items-center justify-center gap-3">
          <TestPingButton siteId={siteId} />
          <span className="select-none text-black/15">·</span>
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="font-mono text-[11px] text-black/55 hover:text-black"
          >
            {showRaw ? "Hide raw code" : "Show raw code →"}
          </button>
        </div>
      </div>

      {/* Raw-code fallback — the original per-stack tabs + 01/02/03 steps.
          Only relevant for the DIY path, so it lives in here, collapsed. */}
      {showRaw && tab && (
        <div className="border-t border-black/8">
          <div className="flex gap-0.5 overflow-x-auto border-b border-black/8 px-3 py-2">
            {rawTabs.map((s) => (
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
              />
            </ol>
          </div>
        </div>
      )}
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
        {pending ? "sending…" : "Send a test ping →"}
      </button>
    </form>
  );
}

// The primary "I've installed it" confirmation. Actually fetches the site
// and scans its HTML for the Beam snippet (keyed to this site's apiKey) —
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
    <form action={formAction} className="mt-5">
      <input type="hidden" name="siteId" value={siteId} />

      {result?.status === "installed" && (
        <div className="mb-3 rounded-lg border border-emerald-600/25 bg-emerald-50 px-3.5 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[12.5px] font-medium text-emerald-700">
            <CheckIcon />
            Beam is live on {domain}
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
            Couldn&rsquo;t find the Beam snippet on {domain}
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
    >
      <input type="hidden" name="siteId" value={siteId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] text-black/55 hover:text-black disabled:opacity-50"
      >
        {pending ? (
          <>
            <Spinner />
            detecting…
          </>
        ) : (
          "detect platform →"
        )}
      </button>
    </form>
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
