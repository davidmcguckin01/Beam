import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/db";
import { site, event, beamMembership, beamInvite } from "@/db/schema";
import { and, eq, desc, sql, isNull } from "drizzle-orm";
import { ensureBeamSession } from "@/lib/beam-auth";
import { createSiteAction } from "./actions";
import { inviteAction } from "./settings/actions";
import { skipInviteStepAction } from "./setup-actions";
import { INVITE_SKIPPED_COOKIE } from "@/lib/setup-cookies";
import { BeamHeader } from "@/components/beam-header";

export const dynamic = "force-dynamic";

export default async function AppEntryPage() {
  const session = await ensureBeamSession();
  if (!session) redirect("/sign-in");

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const sites = await db
    .select({
      id: site.id,
      domain: site.domain,
      stack: site.stack,
      createdAt: site.createdAt,
    })
    .from(site)
    .where(eq(site.orgId, session.activeOrgId))
    .orderBy(desc(site.createdAt));

  const siteIds = sites.map((s) => s.id);

  const perSite: Record<
    string,
    { last: Date | null; ai30d: number; crawl30d: number }
  > = {};
  if (siteIds.length > 0) {
    const rows = await db
      .select({
        siteId: event.siteId,
        last: sql<Date>`max(${event.ts})`,
        ai30d: sql<number>`count(*) filter (where ${event.ts} >= ${since} and ${event.kind} = 'human' and ${event.source} is not null)::int`,
        crawl30d: sql<number>`count(*) filter (where ${event.ts} >= ${since} and ${event.kind} = 'crawler')::int`,
      })
      .from(event)
      .where(sql`${event.siteId} in ${siteIds}`)
      .groupBy(event.siteId);
    for (const r of rows) {
      perSite[r.siteId] = {
        last: r.last,
        ai30d: Number(r.ai30d),
        crawl30d: Number(r.crawl30d),
      };
    }
  }

  const aggregate = Object.values(perSite).reduce(
    (acc, s) => ({
      ai: acc.ai + s.ai30d,
      crawlers: acc.crawlers + s.crawl30d,
    }),
    { ai: 0, crawlers: 0 }
  );

  const memberCount =
    (
      await db
        .select({ n: sql<number>`count(*)::int` })
        .from(beamMembership)
        .where(eq(beamMembership.orgId, session.activeOrgId))
    )[0]?.n ?? 1;

  const pendingInvites =
    (
      await db
        .select({ n: sql<number>`count(*)::int` })
        .from(beamInvite)
        .where(
          and(
            eq(beamInvite.orgId, session.activeOrgId),
            isNull(beamInvite.acceptedAt)
          )
        )
    )[0]?.n ?? 0;

  const totalEvents = aggregate.ai + aggregate.crawlers;

  const cookieStore = await cookies();
  const inviteSkipped =
    cookieStore.get(INVITE_SKIPPED_COOKIE)?.value === "1";

  const headerSites = sites.map((s) => ({ id: s.id, domain: s.domain }));

  // ── Setup flow: one step at a time, no skipping ────────────────────────────

  if (sites.length === 0) {
    return (
      <Shell session={session} sites={headerSites}>
        <StepOne />
      </Shell>
    );
  }

  if (totalEvents === 0) {
    const firstSite = sites[0];
    return (
      <Shell session={session} sites={headerSites}>
        <StepTwo
          siteId={firstSite.id}
          domain={firstSite.domain}
          stack={firstSite.stack}
        />
      </Shell>
    );
  }

  const teamSetupDone =
    memberCount > 1 || pendingInvites > 0 || inviteSkipped;

  if (!teamSetupDone) {
    return (
      <Shell session={session} sites={headerSites}>
        <StepThree />
      </Shell>
    );
  }

  // ── Setup complete → real dashboard ────────────────────────────────────────

  return (
    <Shell session={session} sites={headerSites}>
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">
              Overview
            </h1>
            <p className="mt-1 text-[13px] text-black/50">
              {session.activeOrg.name}
            </p>
          </div>
        </div>

        <Stats
          sites={sites.length}
          ai={aggregate.ai}
          crawlers={aggregate.crawlers}
          members={memberCount}
        />

        <Section
          title="Sites"
          right={`${sites.length} ${sites.length === 1 ? "site" : "sites"}`}
        >
          <ul className="divide-y divide-black/8">
            {sites.map((s) => {
              const st = perSite[s.id];
              return (
                <li key={s.id}>
                  <Link
                    href={`/app/${s.id}`}
                    className="block px-6 py-4 transition-colors hover:bg-black/2.5"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="truncate font-mono text-[14px] text-black">
                          {s.domain}
                        </span>
                        <StackChip stack={s.stack} />
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-black/30">
                        ↗
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-[12px] text-black/50">
                      <span>
                        <span className="tabular-nums text-black/80">
                          {(st?.ai30d ?? 0).toLocaleString()}
                        </span>{" "}
                        AI
                      </span>
                      <span>
                        <span className="tabular-nums text-black/80">
                          {(st?.crawl30d ?? 0).toLocaleString()}
                        </span>{" "}
                        crawlers
                      </span>
                      <span className="ml-auto text-black/40">
                        {st?.last ? formatRelative(st.last) : "no events yet"}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      </div>
    </Shell>
  );
}

// ── Shell ──────────────────────────────────────────────────────────────────

function Shell({
  session,
  sites,
  children,
}: {
  session: Awaited<ReturnType<typeof ensureBeamSession>> & object;
  sites: { id: string; domain: string }[];
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#fafafa] text-black antialiased">
      <BeamHeader
        orgs={session.orgs}
        activeOrg={session.activeOrg}
        sites={sites}
        activeSite={null}
        current="overview"
      />
      <div className="px-6 py-8">{children}</div>
    </main>
  );
}

// ── Step 1 ─────────────────────────────────────────────────────────────────

function StepOne() {
  return (
    <StepFrame n={1} title="Add your site">
      <p className="text-[13px] text-black/55">
        We'll detect your stack and tailor the install snippet — Next.js,
        Shopify, WordPress, Webflow, and more.
      </p>
      <form
        action={createSiteAction}
        className="mt-5 flex flex-col gap-2 sm:flex-row"
      >
        <input
          name="domain"
          type="text"
          required
          placeholder="example.com"
          autoComplete="off"
          autoFocus
          className="block w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-[14px] text-black placeholder:text-black/30 focus:border-black/40 focus:outline-none"
        />
        <button
          type="submit"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-black px-5 text-[13px] font-medium text-white hover:bg-black/85"
        >
          Create site →
        </button>
      </form>
    </StepFrame>
  );
}

// ── Step 2 ─────────────────────────────────────────────────────────────────

function StepTwo({
  siteId,
  domain,
  stack,
}: {
  siteId: string;
  domain: string;
  stack: string | null;
}) {
  return (
    <StepFrame n={2} title="Install on your site">
      <div className="flex items-center gap-2 text-[13px] text-black/55">
        <span className="font-mono text-black">{domain}</span>
        <StackChip stack={stack} />
      </div>
      <p className="mt-3 text-[13px] text-black/55">
        Paste one <code className="font-mono">&lt;script&gt;</code> tag in your{" "}
        <code className="font-mono">&lt;head&gt;</code>. Events appear within
        seconds of the next visit and this page will move on automatically.
      </p>
      <div className="mt-5">
        <Link
          href={`/app/${siteId}`}
          className="inline-flex h-10 items-center justify-center rounded-md bg-black px-5 text-[13px] font-medium text-white hover:bg-black/85"
        >
          Open install code →
        </Link>
      </div>
    </StepFrame>
  );
}

// ── Step 3 ─────────────────────────────────────────────────────────────────

function StepThree() {
  return (
    <StepFrame n={3} title="Invite your team">
      <p className="text-[13px] text-black/55">
        Share dashboard access with the rest of your team. We don't email yet
        — you'll get an invite link to share manually.
      </p>
      <form action={inviteAction} className="mt-5 flex flex-wrap gap-2">
        <input
          type="email"
          name="email"
          required
          placeholder="name@company.com"
          autoFocus
          className="block w-full max-w-xs rounded-md border border-black/10 bg-white px-3 py-2.5 text-[14px] text-black placeholder:text-black/30 focus:border-black/40 focus:outline-none"
        />
        <select
          name="role"
          defaultValue="member"
          className="rounded-md border border-black/10 bg-white px-3 py-2.5 text-[13px] text-black focus:border-black/40 focus:outline-none"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
        </select>
        <button
          type="submit"
          className="inline-flex h-10 items-center rounded-md bg-black px-5 text-[13px] font-medium text-white hover:bg-black/85"
        >
          Send invite
        </button>
      </form>
      <form action={skipInviteStepAction} className="mt-3">
        <button
          type="submit"
          className="text-[12px] text-black/40 hover:text-black"
        >
          Skip for now →
        </button>
      </form>
    </StepFrame>
  );
}

// ── Step frame ─────────────────────────────────────────────────────────────

function StepFrame({
  n,
  title,
  children,
}: {
  n: 1 | 2 | 3;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xl py-12">
      <ProgressBar current={n} />
      <p className="mt-6 font-mono text-[11px] uppercase tracking-wide text-black/40">
        Step {n} of 3
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">
        {title}
      </h1>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function ProgressBar({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-1 flex-1 rounded-full ${
            i < current
              ? "bg-black"
              : i === current
                ? "bg-black"
                : "bg-black/10"
          }`}
        />
      ))}
    </div>
  );
}

// ── Shared bits ────────────────────────────────────────────────────────────

function Stats({
  sites,
  ai,
  crawlers,
  members,
}: {
  sites: number;
  ai: number;
  crawlers: number;
  members: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-black/8 bg-black/8 sm:grid-cols-4">
      <Stat label="Sites" value={sites} />
      <Stat label="AI referrals" value={ai} sub="30d" />
      <Stat label="Crawler hits" value={crawlers} sub="30d" />
      <Stat label="Members" value={members} />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="bg-white p-5">
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] uppercase tracking-wide text-black/50">
          {label}
        </div>
        {sub && (
          <div className="font-mono text-[10px] uppercase tracking-wide text-black/40">
            {sub}
          </div>
        )}
      </div>
      <div className="mt-1.5 font-mono text-[22px] font-medium tabular-nums tracking-tight text-black">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-black/8 bg-white">
      <div className="flex items-baseline justify-between gap-4 border-b border-black/8 px-6 py-3.5">
        <h2 className="text-[13px] font-medium text-black">{title}</h2>
        {right && (
          <span className="font-mono text-[11px] tabular-nums text-black/40">
            {right}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function StackChip({ stack }: { stack: string | null }) {
  if (!stack || stack === "unknown") return null;
  return (
    <span className="inline-flex items-center rounded border border-black/10 bg-black/4 px-1.5 py-px font-mono text-[10.5px] uppercase tracking-wide text-black/70">
      {prettyStack(stack)}
    </span>
  );
}

function prettyStack(stack: string): string {
  switch (stack) {
    case "nextjs":
      return "Next.js";
    case "vercel":
      return "Vercel";
    case "shopify":
      return "Shopify";
    case "wordpress":
      return "WordPress";
    case "webflow":
      return "Webflow";
    case "framer":
      return "Framer";
    case "wix":
      return "Wix";
    case "squarespace":
      return "Squarespace";
    case "ghost":
      return "Ghost";
    case "cloudflare-pages":
      return "Cloudflare";
    default:
      return stack;
  }
}

function formatRelative(d: Date): string {
  const ms = Date.now() - new Date(d).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dys = Math.floor(h / 24);
  return `${dys}d ago`;
}
