import type { ReactNode } from "react";
import Link from "next/link";
import {
  RotatingWord,
  Reveal,
  FaqAccordion,
  NavAuthActions,
} from "@/components/landing/landing-interactive";

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
      <LogoCloud />
      <Benefits />
      <GettingStarted />

      {/* Three quick selling points */}
      <section className="border-y border-black/8 bg-white">
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

      <FaqSection />
      <SiteFooter />
    </main>
  );
}

// ── Nav ─────────────────────────────────────────────────────────────────────
// On the landing page the nav is a contained white bar with a rounded bottom
// edge — not a full-width strip. It still sticks to the top of the viewport.

function Nav() {
  return (
    <div className="sticky top-0 z-30 px-3 sm:px-4">
      <header className="mx-auto max-w-5xl rounded-b-2xl border border-t-0 border-black/10 bg-white shadow-[0_10px_30px_-18px_rgba(0,0,0,0.25)]">
        <div className="flex h-14 items-center justify-between px-4 sm:px-5">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <span className="text-[15px] font-semibold tracking-tight">
              Ocholens
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-[13.5px] font-medium text-black/55 md:flex">
            <Link
              href="#how-it-works"
              className="transition-colors hover:text-black"
            >
              How it works
            </Link>
            <Link href="#features" className="transition-colors hover:text-black">
              Features
            </Link>
            <Link href="#faq" className="transition-colors hover:text-black">
              FAQ
            </Link>
          </nav>

          <NavAuthActions />
        </div>
      </header>
    </div>
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
      <div className="relative mx-auto max-w-3xl px-6 pt-16 pb-14 text-center sm:pt-24">
        {/* Category badge — coloured dot + label. */}
        <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-[12px] font-medium text-black/65 shadow-sm">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: ACCENT }}
          />
          Join 1000+ sites
        </div>

        <h1 className="text-balance text-[52px] font-semibold leading-[1.04] tracking-[-0.04em] text-black sm:text-[68px]">
          <span className="block">See every visit</span>
          <span className="mt-1 flex items-center justify-center gap-[0.28em]">
            <span>from</span>
            <RotatingWord words={["ChatGPT", "Claude", "Gemini", "Perplexity"]} />
          </span>
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
      </div>
    </section>
  );
}

function ScreenshotSection() {
  return (
    <section id="how-it-works" className="border-b border-black/8">
      <div className="mx-auto max-w-5xl px-6 pb-24 pt-2 sm:pb-28">
        <Reveal className="relative">
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
        </Reveal>
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
          <MiniAreaChart gradientId="ocho-area-hero" />
        </div>

        {/* Source + crawler lists — hidden on mobile, where the screenshot
            already runs long and the lists add the most vertical height. */}
        <div className="mt-3 hidden gap-3 sm:grid sm:grid-cols-2">
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

function MiniAreaChart({ gradientId }: { gradientId: string }) {
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
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.28" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,44 ${pts} 100,44`} fill={`url(#${gradientId})`} />
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
      className={`items-center gap-2.5 rounded-2xl border border-black/5 bg-white px-3.5 py-2.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.28)] ${className ?? ""
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

// ── Logo cloud ──────────────────────────────────────────────────────────────

const LOGOS = [
  "Vercel",
  "Linear",
  "Notion",
  "Ramp",
  "Retool",
  "Framer",
  "Webflow",
];

function LogoCloud() {
  return (
    <section className="border-b border-black/8 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-center font-mono text-[11px] uppercase tracking-[0.14em] text-black/40">
          Used by the world&apos;s leading organizations
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-10 gap-y-5 sm:gap-x-14">
          {LOGOS.map((name) => (
            <span
              key={name}
              className="text-[19px] font-semibold tracking-tight text-black/30 transition-colors hover:text-black/55 sm:text-[22px]"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Benefits ────────────────────────────────────────────────────────────────
// Three alternating "feature + product surface" blocks, in the style of the
// Fyxer landing page. Each demo is built from the same UI primitives as the
// real Ocholens dashboard, and each block lists the exact fields that surface
// gathers.

function Benefits() {
  return (
    <section id="features" className="border-b border-black/8">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-wide text-black/40">
            What Ocholens shows you
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            Every signal AI traffic leaves behind
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-black/55">
            Two kinds of AI traffic — people clicking through from chat tools,
            and crawlers training on your content. One dashboard captures both.
          </p>
        </div>

        <div className="space-y-20 sm:space-y-28">
          <BenefitRow
            eyebrow="AI referrals"
            title="See which AI tools send you visitors"
            body="When someone reads about you inside ChatGPT, Claude, Perplexity or Gemini and clicks through, your analytics call it 'direct'. Ocholens names the tool, the page they landed on, and where they came from."
            points={[
              "AI source tool",
              "Landing page",
              "Country",
              "Timestamp",
            ]}
            demo={<AiSourcesDemo />}
          />
          <BenefitRow
            flip
            eyebrow="Verified crawlers"
            title="Catch every crawler training on your content"
            body="GPTBot, ClaudeBot, PerplexityBot and Google-Extended don't run JavaScript, so most analytics never see them. Ocholens catches them server-side and verifies every hit against the vendor's published IP ranges."
            points={[
              "Bot name & vendor",
              "IP-verified",
              "Intent: training / search / user",
              "Origin ASN",
            ]}
            demo={<CrawlerIntentDemo />}
          />
          <BenefitRow
            eyebrow="Page-level detail"
            title="Know which pages AI reads — and how often it returns"
            body="Every crawl is tied to a URL. See your most-crawled pages, which bots hit each one, and how frequently AI comes back for fresh content."
            points={[
              "URL crawled",
              "Bots per page",
              "Hit count",
              "Revisit interval",
            ]}
            demo={<CrawledPagesDemo />}
          />
        </div>
      </div>
    </section>
  );
}

function BenefitRow({
  eyebrow,
  title,
  body,
  points,
  demo,
  flip = false,
}: {
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  demo: ReactNode;
  flip?: boolean;
}) {
  return (
    <Reveal>
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className={flip ? "lg:order-2" : ""}>
          <p className="font-mono text-[11px] uppercase tracking-wide text-black/40">
            {eyebrow}
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-black sm:text-[28px]">
            {title}
          </h3>
          <p className="mt-3 text-[15px] leading-relaxed text-black/60">
            {body}
          </p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {points.map((p) => (
              <li
                key={p}
                className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[12px] text-black/65"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: ACCENT }}
                />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className={flip ? "lg:order-1" : ""}>{demo}</div>
      </div>
    </Reveal>
  );
}

function DemoCard({
  title,
  right,
  children,
}: {
  title: string;
  right: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-3 shadow-[0_30px_70px_-34px_rgba(0,0,0,0.3)] sm:p-4">
      <div className="flex items-baseline justify-between px-1 pb-3">
        <div className="text-[12px] font-medium text-black">{title}</div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-50 px-1.5 py-0.5 text-[9.5px] text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live
          </span>
          <span className="font-mono text-[10px] text-black/40">{right}</span>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function AiSourcesDemo() {
  return (
    <DemoCard title="AI referrals" right="last 30 days">
      <div className="rounded-lg border border-black/8 bg-[#fafafa] p-3.5">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[28px] font-medium tabular-nums leading-none text-black">
            3,201
          </span>
          <span className="text-[11px] font-medium text-emerald-600">
            ▲ 18% vs last month
          </span>
        </div>
        <MiniAreaChart gradientId="ocho-area-ai" />
      </div>
      <ListCard
        title="AI sources"
        rows={[
          { name: "ChatGPT", value: 1840, pct: 100 },
          { name: "Claude", value: 720, pct: 52 },
          { name: "Perplexity", value: 410, pct: 30 },
          { name: "Gemini", value: 231, pct: 16 },
        ]}
      />
    </DemoCard>
  );
}

function CrawlerIntentDemo() {
  const tiles = [
    { label: "User-triggered", value: "4,210" },
    { label: "Search indexing", value: "5,980" },
    { label: "Training", value: "2,650" },
  ];
  return (
    <DemoCard title="Crawler traffic" right="12,840 hits · 30d">
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-lg border border-black/8 bg-[#fafafa] p-2.5"
          >
            <div className="text-[9px] uppercase leading-tight tracking-wide text-black/45">
              {t.label}
            </div>
            <div className="mt-1.5 font-mono text-[15px] font-medium tabular-nums text-black">
              {t.value}
            </div>
          </div>
        ))}
      </div>
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
    </DemoCard>
  );
}

function CrawledPagesDemo() {
  const rows = [
    {
      path: "/pricing",
      bots: "GPTBot · ClaudeBot",
      count: "1,204",
      last: "2m ago",
      pct: 100,
    },
    {
      path: "/blog/llms-and-seo",
      bots: "PerplexityBot · GPTBot",
      count: "980",
      last: "11m ago",
      pct: 81,
    },
    {
      path: "/docs/api",
      bots: "ClaudeBot · Google-Extended",
      count: "743",
      last: "1h ago",
      pct: 62,
    },
    {
      path: "/",
      bots: "GPTBot · PerplexityBot · ClaudeBot",
      count: "612",
      last: "3h ago",
      pct: 51,
    },
  ];
  return (
    <DemoCard title="Crawled pages" right="last 30 days">
      <div className="overflow-hidden rounded-lg border border-black/8 bg-white">
        <ul className="divide-y divide-black/8">
          {rows.map((r) => (
            <li
              key={r.path}
              className="grid grid-cols-[1fr_auto] items-center gap-4 px-3.5 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="truncate font-mono text-[12px] text-black">
                    {r.path}
                  </span>
                  <span className="ml-auto shrink-0 font-mono text-[10px] text-black/35">
                    {r.last}
                  </span>
                </div>
                <div className="mt-0.5 truncate font-mono text-[10.5px] text-black/45">
                  {r.bots}
                </div>
                <div className="mt-1 h-px w-full bg-black/8">
                  <div
                    className="h-px bg-black/45"
                    style={{ width: `${r.pct}%` }}
                  />
                </div>
              </div>
              <div className="font-mono text-[12.5px] tabular-nums text-black">
                {r.count}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-black/8 bg-[#fafafa] px-3.5 py-2.5">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${ACCENT}1A`, color: ACCENT }}
        >
          <SparkIcon />
        </span>
        <div className="text-[11.5px] leading-snug text-black/55">
          <span className="font-medium text-black">Revisit velocity</span> —
          ClaudeBot returns to <span className="font-mono">/pricing</span> every
          ~6h.
        </div>
      </div>
    </DemoCard>
  );
}

// ── Getting started ─────────────────────────────────────────────────────────

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "01",
    title: "Add your domain",
    body: "Paste your site's URL. We auto-detect Next.js, WordPress, Webflow or Shopify and tailor the install to your stack.",
  },
  {
    n: "02",
    title: "Drop in the snippet",
    body: "One script tag tracks human visits. Optional edge middleware catches crawlers server-side. No build step, no SDK.",
  },
  {
    n: "03",
    title: "Watch AI traffic roll in",
    body: "Events stream into your dashboard within seconds — ChatGPT referrals and verified bot hits, updating live.",
  },
];

function GettingStarted() {
  return (
    <section className="border-b border-black/8 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="mb-14 max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-wide text-black/40">
            Getting started
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            Up and running in seconds
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/8 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="flex flex-col bg-white p-7">
              <span
                className="font-mono text-[13px] font-medium"
                style={{ color: ACCENT }}
              >
                {s.n}
              </span>
              <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-black">
                {s.title}
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-black/55">
                {s.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Link
            href="/sign-up"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-black px-6 text-[15px] font-medium text-white transition-colors hover:bg-black/85"
          >
            Start tracking free
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── FAQ ─────────────────────────────────────────────────────────────────────

const FAQS: { q: string; a: string }[] = [
  {
    q: "What counts as an AI referral?",
    a: "When someone reads about you inside ChatGPT, Claude, Perplexity, Gemini or Copilot and clicks through to your site. Most analytics log this as 'direct' traffic — Ocholens identifies the AI tool and the exact page they landed on.",
  },
  {
    q: "How do you detect AI crawlers?",
    a: "We inspect requests server-side and match the user-agent against known AI bots — GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended, Anthropic-AI and more — then verify each hit against the vendor's published IP ranges so spoofed bots never count.",
  },
  {
    q: "Do I need to add an SDK?",
    a: "No. Human visits are tracked with a single script tag. Crawler tracking is an optional piece of edge middleware. There's no build step and no dependencies to install.",
  },
  {
    q: "How long does it take to install?",
    a: "About 30 seconds. Add your domain, paste the snippet, and refresh your dashboard — events show up within seconds of the first visit or crawl.",
  },
  {
    q: "Will this slow down my site?",
    a: "No. The human-tracking script is tiny and loads asynchronously. Crawler detection runs at the edge before your page renders, so visitors never wait on it.",
  },
  {
    q: "What data do you actually collect?",
    a: "Request metadata only: the URL visited, referrer, AI source, verified bot identity, origin country and timestamp. No personal data, no cookies, no cross-site tracking.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. The free forever plan covers a single site with full AI referral and verified crawler tracking. No card required to start.",
  },
];

function FaqSection() {
  return (
    <section id="faq" className="border-b border-black/8">
      <div className="mx-auto max-w-3xl px-6 py-20 sm:py-28">
        <div className="mb-10 text-center">
          <p className="font-mono text-[11px] uppercase tracking-wide text-black/40">
            FAQ
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>
        <FaqAccordion items={FAQS} />
        <p className="mt-8 text-center text-[13.5px] text-black/50">
          Still have a question?{" "}
          <a
            href="mailto:hello@ocholens.com"
            className="font-medium text-black underline underline-offset-2 hover:text-black/70"
          >
            hello@ocholens.com
          </a>
        </p>
      </div>
    </section>
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

// ── Footer ──────────────────────────────────────────────────────────────────

function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <Logo />
              <span className="text-[15px] font-semibold tracking-tight">
                Ocholens
              </span>
            </Link>
            <p className="mt-3 max-w-[15rem] text-[13px] leading-relaxed text-black/50">
              See exactly when AI sends people to your site — and which crawlers
              are training on your content.
            </p>
          </div>

          <FooterCol
            heading="Product"
            links={[
              { label: "Features", href: "#features" },
              { label: "How it works", href: "#how-it-works" },
              { label: "Live dashboard", href: "/sign-in" },
            ]}
          />
          <FooterCol
            heading="Company"
            links={[
              { label: "About", href: "/about" },
              { label: "Careers", href: "/careers" },
              { label: "FAQ", href: "/faq" },
              { label: "Contact", href: "mailto:hello@ocholens.com" },
            ]}
          />
          <FooterCol
            heading="Legal"
            links={[
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Terms of Service", href: "/terms" },
            ]}
          />
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-black/8 pt-6 text-[13px] text-black/45 sm:flex-row">
          <span>© {year} Ocholens. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-black">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-black">
              Terms
            </Link>
            <a href="mailto:hello@ocholens.com" className="hover:text-black">
              hello@ocholens.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  heading,
  links,
}: {
  heading: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="font-mono text-[11px] uppercase tracking-wide text-black/40">
        {heading}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="text-[13.5px] text-black/60 transition-colors hover:text-black"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
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
