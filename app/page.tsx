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
              Beam
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

      <section className="relative overflow-hidden border-b border-black/8">
        <GridBackdrop />
        <div className="relative mx-auto max-w-4xl px-6 pt-24 pb-24 text-center sm:pt-32 sm:pb-28">
          <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-black/70 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black opacity-30" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-black" />
            </span>
            Free during beta
          </div>
          <h1 className="text-balance text-5xl font-semibold tracking-[-0.04em] text-black sm:text-6xl">
            See exactly when AI sends people to your site.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-black/60">
            ChatGPT. Claude. Perplexity. Gemini. One line of JavaScript,
            real-time dashboard, no SDK.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link
              href="/sign-up"
              className="inline-flex h-10 items-center justify-center rounded-md bg-black px-5 text-sm font-medium text-white shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset] hover:bg-black/85"
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

          <div className="mx-auto mt-16 max-w-2xl rounded-lg border border-black/10 bg-black p-1 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.25)]">
            <pre className="overflow-x-auto rounded-md bg-[#0a0a0a] px-4 py-3 text-left font-mono text-[12px] leading-relaxed text-white/90">
{`<script async src="https://beam.dev/p.js" data-site="YOUR_KEY"></script>
<noscript><img src="https://beam.dev/api/i?s=YOUR_KEY&c=1" width="1" height="1" alt=""></noscript>`}
            </pre>
          </div>
        </div>
      </section>

      <section className="border-b border-black/8">
        <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-black/8 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Feature
            title="Real-time tracking"
            body="Events stream in within seconds of a visit landing from any major AI tool."
          />
          <Feature
            title="Every major AI source"
            body="ChatGPT, Claude, Perplexity, Gemini, Copilot, You.com, Phind, Meta AI, DuckDuckGo."
          />
          <Feature
            title="Install in 30 seconds"
            body="One script tag in your <head>. No build step, no SDK, no dependencies."
          />
        </div>
      </section>

      <footer>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-black/50 sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo />
            <span>Beam</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="mailto:hello@beam.dev"
              className="hover:text-black"
            >
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
      <path
        d="M10 1.5 L18.5 18.5 L1.5 18.5 Z"
        fill="currentColor"
      />
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
