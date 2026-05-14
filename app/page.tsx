import type { ReactNode } from "react";
import Link from "next/link";

export const dynamic = "force-static";

// Single brand accent — a warm orange. Used for the H1 highlight word, the
// badge dot, the chart, and the annotation-card icons. The primary CTA stays
// black (Fyxer-style), so the accent reads as "highlight", not "button".
const ACCENT = "#FF5C35";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#F8F6F0] text-black antialiased">
      <Nav />
      <Hero />
      <ScreenshotSection />

      {/* What Ocholens shows you */}
      <section id="features" className="border-b border-black/8">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-wide text-black/40">
              What Ocholens shows you
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">
              Two kinds of AI traffic. One dashboard.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-black/10 bg-black/8 sm:grid-cols-2">
            <Pillar
              tag="Humans"
              title="People clicking through from chat tools"
              body="When a user reads about you on ChatGPT or Claude and clicks the link, your analytics see it as direct. Ocholens sees ChatGPT, Claude, Perplexity, Gemini, Copilot, You.com, Phind, Meta AI, DuckDuckGo — and tells you which page they landed on."
            />
            <Pillar
              tag="Bots"
              title="Crawlers training on your content"
              body="GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended, Anthropic-AI. They don&apos;t run JavaScript — most analytics never see them. Ocholens catches them server-side and verifies them against the vendor&apos;s published IP ranges."
            />
          </div>
        </div>
      </section>

      {/* Three quick selling points */}
      <section className="border-b border-black/8">
        <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-black/8 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Feature
            title="Real-time"
            body="Events stream in within seconds of a visit. The dashboard updates as you reload."
          />
          <Feature
            title="No SDK"
            body="One script tag for humans, optional middleware for crawlers. No build step. No dependencies."
          />
          <Feature
            title="30 seconds"
            body="Add your domain, paste the snippet, refresh the dashboard. We auto-detect your stack and tailor the install."
          />
        </div>
      </section>

      <footer>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-black/50 sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo />
            <span>Ocholens</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="mailto:hello@beam.dev" className="hover:text-black">
              hello@beam.dev
            </a>
            <Link href="/sign-in" className="hover:text-black">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

// ── Nav ─────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <header className="sticky top-0 z-20 border-b border-black/8 bg-[#F8F6F0]/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="text-[15px] font-semibold tracking-tight">
            Ocholens
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-[13.5px] font-medium text-black/55 md:flex">
          <Link href="/pricing" className="transition-colors hover:text-black">
            Pricing
          </Link>
          <Link
            href="#how-it-works"
            className="transition-colors hover:text-black"
          >
            How it works
          </Link>
          <Link href="#features" className="transition-colors hover:text-black">
            For teams
          </Link>
          <Link href="#features" className="transition-colors hover:text-black">
            Customers
          </Link>
        </nav>

        <div className="flex items-center gap-1.5">
          <Link
            href="/sign-in"
            className="rounded-md px-3 py-1.5 text-[13.5px] font-medium text-black/55 transition-colors hover:text-black"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex h-9 items-center rounded-lg bg-black px-4 text-[13.5px] font-medium text-white transition-colors hover:bg-black/85"
          >
            Start tracking free
          </Link>
        </div>
      </div>
    </header>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft accent glow behind the headline. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-120px] h-[460px] w-[860px] -translate-x-1/2 rounded-full opacity-[0.16] blur-3xl"
        style={{
          background: `radial-gradient(circle, ${ACCENT}, transparent 70%)`,
        }}
      />
      <div className="relative mx-auto max-w-3xl px-6 pt-20 pb-14 text-center sm:pt-28">
        {/* Category badge — coloured dot + label. */}
        <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-[12px] font-medium text-black/65 shadow-sm">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: ACCENT }}
          />
          AI traffic analytics
        </div>

        <h1 className="text-balance text-[44px] font-semibold leading-[1.04] tracking-[-0.04em] text-black sm:text-[68px]">
          See every visit
          <br />
          from <span style={{ color: ACCENT }}>AI</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-balance text-[15px] leading-relaxed text-black/55 sm:text-[17px]">
          See exactly when AI tools send people to your site — and which
          crawlers are training on your content.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/sign-up"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-black px-6 text-[15px] font-medium text-white transition-colors hover:bg-black/85 sm:w-auto"
          >
            Start tracking free
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-black/15 bg-white px-6 text-[15px] font-medium text-black transition-colors hover:bg-black/[0.03] sm:w-auto"
          >
            See live dashboard
          </Link>
        </div>

        <p className="mt-5 text-[13px] text-black/45">
          Free forever plan&nbsp;&nbsp;·&nbsp;&nbsp;30-second
          install&nbsp;&nbsp;·&nbsp;&nbsp;No card required
        </p>

        <div className="mt-8">
          <a
            href="mailto:hello@ocholens.com"
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[12.5px] text-black/55 transition-colors hover:text-black"
          >
            <ChatIcon />
            Speak to sales
          </a>
        </div>
      </div>
    </section>
  );
}

// ── Screenshot section ──────────────────────────────────────────────────────

function ScreenshotSection() {
  return (
    <section id="how-it-works" className="border-b border-black/8">
      <div className="mx-auto max-w-5xl px-6 pb-24 pt-2 sm:pb-28">
        <div className="relative">
          <BrowserMock />

          {/* Floating annotation callouts — overlap the screenshot edges,
              hidden on small screens where there's no room to point. */}
          <AnnotationCard
            className="absolute right-0 top-24 hidden lg:flex lg:-right-12"
            icon={<SparkIcon />}
            label="ChatGPT referrals"
            sub="Counted as a real source"
          />
          <AnnotationCard
            className="absolute bottom-28 left-0 hidden lg:flex lg:-left-12"
            icon={<ShieldCheckIcon />}
            label="ClaudeBot crawls"
            sub="Verified against vendor IPs"
          />
        </div>
      </div>
    </section>
  );
}

// Browser-chrome window wrapping a mocked-up Ocholens dashboard. There's no
// screenshot asset yet, so the dashboard is built in markup — close enough to
// the real thing to read as a product shot.
function BrowserMock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_40px_90px_-30px_rgba(0,0,0,0.32)]">
      {/* Chrome bar */}
      <div className="flex items-center gap-3 border-b border-black/8 bg-[#f4f3f0] px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="mx-auto flex items-center gap-1.5 rounded-md bg-white px-3 py-1 text-[11px] text-black/40 ring-1 ring-black/5">
          <LockIcon />
          ocholens.com/app
        </div>
        <div className="w-[54px]" aria-hidden />
      </div>

      {/* Dashboard body */}
      <div className="bg-[#fafafa] p-4 sm:p-6">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-mono text-[13px] text-black sm:text-[15px]">
              acme.com
            </div>
            <div className="mt-0.5 text-[11px] text-black/40">
              Acme Inc · last 30 days
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-50 px-2 py-1 text-[10.5px] text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live
            </span>
            <span className="hidden rounded-md border border-black/10 bg-white px-2 py-1 text-[10.5px] text-black/50 sm:inline">
              Last 30 days
            </span>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <StatTile label="Crawler hits" value="12,840" />
          <StatTile label="AI referrals" value="3,201" />
          <StatTile label="Total events" value="41,902" />
          <StatTile label="Last event" value="2m ago" />
        </div>

        {/* Trend chart */}
        <div className="mt-3 rounded-lg border border-black/8 bg-white p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-medium text-black">
              AI referrals
            </div>
            <div className="font-mono text-[10px] text-black/40">
              last 30 days
            </div>
          </div>
          <MiniAreaChart />
        </div>

        {/* Source + crawler lists */}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ListCard
            title="AI sources"
            rows={[
              { name: "ChatGPT", value: 1840, pct: 100 },
              { name: "Claude", value: 720, pct: 52 },
              { name: "Perplexity", value: 410, pct: 30 },
              { name: "Gemini", value: 231, pct: 16 },
            ]}
          />
          <ListCard
            title="Verified crawlers"
            verified
            rows={[
              { name: "ClaudeBot", value: 5120, pct: 100 },
              { name: "GPTBot", value: 3980, pct: 78 },
              { name: "PerplexityBot", value: 2210, pct: 44 },
              { name: "Google-Extended", value: 1530, pct: 30 },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/8 bg-white p-2.5 sm:p-3">
      <div className="text-[9.5px] uppercase tracking-wide text-black/40 sm:text-[10px]">
        {label}
      </div>
      <div className="mt-1 font-mono text-[15px] font-medium tabular-nums text-black sm:text-[18px]">
        {value}
      </div>
    </div>
  );
}

function MiniAreaChart() {
  // Hand-tuned points for a believable upward 30-day trend.
  const pts =
    "0,38 8,34 16,36 24,29 32,31 40,23 48,26 56,18 64,21 72,13 80,16 88,9 96,12 100,7";
  return (
    <svg
      viewBox="0 0 100 44"
      preserveAspectRatio="none"
      className="mt-3 h-20 w-full sm:h-24"
      aria-hidden
    >
      <defs>
        <linearGradient id="ocho-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.28" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,44 ${pts} 100,44`} fill="url(#ocho-area)" />
      <polyline
        points={pts}
        fill="none"
        stroke={ACCENT}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function ListCard({
  title,
  rows,
  verified = false,
}: {
  title: string;
  rows: { name: string; value: number; pct: number }[];
  verified?: boolean;
}) {
  return (
    <div className="rounded-lg border border-black/8 bg-white p-3 sm:p-4">
      <div className="flex items-center gap-1.5">
        <div className="text-[12px] font-medium text-black">{title}</div>
        {verified && (
          <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1 py-px text-[9px] font-medium text-emerald-600">
            ✓ verified
          </span>
        )}
      </div>
      <div className="mt-3 space-y-2.5">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-2.5">
            <div className="w-20 shrink-0 truncate text-[11px] text-black/70 sm:w-24 sm:text-[12px]">
              {r.name}
            </div>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${r.pct}%`,
                  backgroundColor: verified ? "#10b981" : ACCENT,
                }}
              />
            </div>
            <div className="w-9 shrink-0 text-right font-mono text-[10.5px] tabular-nums text-black/45">
              {r.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnnotationCard({
  className,
  icon,
  label,
  sub,
}: {
  className?: string;
  icon: ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <div
      className={`items-center gap-2.5 rounded-2xl border border-black/5 bg-white px-3.5 py-2.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.28)] ${
        className ?? ""
      }`}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${ACCENT}1A`, color: ACCENT }}
      >
        {icon}
      </span>
      <div className="text-left">
        <div className="text-[12.5px] font-semibold leading-tight text-black">
          {label}
        </div>
        <div className="mt-0.5 text-[11px] leading-tight text-black/45">
          {sub}
        </div>
      </div>
    </div>
  );
}

// ── Kept sections ───────────────────────────────────────────────────────────

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="p-8">
      <h3 className="text-[15px] font-semibold tracking-tight text-black">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-black/60">{body}</p>
    </div>
  );
}

function Pillar({
  tag,
  title,
  body,
}: {
  tag: string;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-white p-8">
      <div className="font-mono text-[10px] uppercase tracking-wide text-black/40">
        {tag}
      </div>
      <h3 className="mt-2 text-lg font-semibold tracking-tight text-black">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-black/60">{body}</p>
    </div>
  );
}

// ── Icons ───────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className="text-black"
    >
      <path d="M10 1.5 L18.5 18.5 L1.5 18.5 Z" fill="currentColor" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="currentColor"
      aria-hidden
    >
      <path d="M7 0.5 L8.3 5.7 L13.5 7 L8.3 8.3 L7 13.5 L5.7 8.3 L0.5 7 L5.7 5.7 Z" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M7 1 L12 3 V7 C12 10 9.5 12.3 7 13 C4.5 12.3 2 10 2 7 V3 Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M4.8 7 L6.4 8.6 L9.4 5.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect
        x="1.6"
        y="2.2"
        width="10.8"
        height="7.6"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M4.5 9.8 L4.5 12 L7.2 9.8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden>
      <rect
        x="2"
        y="4.3"
        width="6"
        height="4.2"
        rx="1"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M3.4 4.3 V3 C3.4 2.1 4.1 1.5 5 1.5 C5.9 1.5 6.6 2.1 6.6 3 V4.3"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}
