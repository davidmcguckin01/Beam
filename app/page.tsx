import Link from "next/link";

export const dynamic = "force-static";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-black antialiased">
      <header className="sticky top-0 z-10 border-b border-black/8 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 h-14">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <span className="text-[15px] font-semibold tracking-tight">
              Ocholens
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/sign-in"
              className="rounded-md px-3 py-1.5 text-black/60 hover:text-black"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-md bg-black px-3 py-1.5 text-white hover:bg-black/85"
            >
              Start tracking
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero — problem first */}
      <section className="relative overflow-hidden border-b border-black/8">
        <GridBackdrop />
        <div className="relative mx-auto max-w-4xl px-6 pt-20 pb-20 text-center sm:pt-28">
          <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-black/60">
            The analytics gap
          </div>
          <h1 className="text-balance text-5xl font-semibold tracking-[-0.04em] text-black sm:text-6xl">
            Most of your AI traffic shows up as &ldquo;direct&rdquo; in
            Analytics.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-black/60">
            ChatGPT, Claude, and Perplexity send readers to your site daily. Analytics doesn't see them.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link
              href="/sign-up"
              className="inline-flex h-10 items-center justify-center rounded-md bg-black px-5 text-sm font-medium text-white hover:bg-black/85"
            >
              Start tracking →
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex h-10 items-center justify-center rounded-md border border-black/10 bg-white px-5 text-sm font-medium text-black hover:bg-black/3"
            >
              Sign in
            </Link>
          </div>

          {/* Code preview — light */}
          <div className="mx-auto mt-16 max-w-2xl overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_24px_60px_-24px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between border-b border-black/8 px-3 py-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wide text-black/40">
                html
              </span>
              <span className="font-mono text-[10px] text-black/30">
                paste in &lt;head&gt;
              </span>
            </div>
            <pre className="overflow-x-auto px-4 py-3 text-left font-mono text-[12px] leading-relaxed text-black/85">
              {`<script async src="https://beam.dev/p.js" data-site="YOUR_KEY"></script>
<noscript><img src="https://beam.dev/api/i?s=YOUR_KEY&c=1" width="1" height="1" alt=""></noscript>`}
            </pre>
          </div>
        </div>
      </section>

      {/* What Ocholens shows you */}
      <section className="border-b border-black/8">
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

function GridBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 mask-[radial-gradient(ellipse_at_center,black_30%,transparent_70%)]"
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
        backgroundSize: "44px 44px",
      }}
    />
  );
}
