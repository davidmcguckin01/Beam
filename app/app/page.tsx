import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { site, event, beamMembership, beamInvite } from "@/db/schema";
import { and, eq, desc, sql, isNull } from "drizzle-orm";
import { ensureBeamSession } from "@/lib/beam-auth";
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
  const hasEvents = totalEvents > 0;
  const stepsRemaining = [
    sites.length === 0,
    totalEvents === 0,
    memberCount === 1 && pendingInvites === 0,
  ].filter(Boolean).length;
  const showChecklist = stepsRemaining > 0;

  return (
    <main className="min-h-screen bg-[#fafafa] text-black antialiased">
      <BeamHeader
        orgs={session.orgs}
        activeOrg={session.activeOrg}
        sites={sites.map((s) => ({ id: s.id, domain: s.domain }))}
        activeSite={null}
        current="overview"
      />

      <div className="px-6 py-8 space-y-8">
        {hasEvents && (
          <>
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
          </>
        )}

        {showChecklist && (
          <Checklist
            sites={sites.length}
            events={totalEvents}
            members={memberCount}
            invites={pendingInvites}
            firstSiteId={sites[0]?.id}
          />
        )}

        {sites.length > 0 && (
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
        )}
      </div>
    </main>
  );
}

// ── pieces ──────────────────────────────────────────────────────────────────

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

function Checklist({
  sites,
  events,
  members,
  invites,
  firstSiteId,
}: {
  sites: number;
  events: number;
  members: number;
  invites: number;
  firstSiteId?: string;
}) {
  const items: { done: boolean; label: string; hint: string; href?: string }[] =
    [
      {
        done: sites > 0,
        label: "Add a site",
        hint: sites > 0 ? `${sites} added` : "Use the form below",
      },
      {
        done: events > 0,
        label: "Install the snippet",
        hint:
          events > 0
            ? `${events.toLocaleString()} events`
            : sites > 0
              ? "Get paste-ready code"
              : "Add a site first",
        href: firstSiteId ? `/app/${firstSiteId}` : undefined,
      },
      {
        done: members > 1 || invites > 0,
        label: "Invite teammates",
        hint:
          members > 1
            ? `${members} members`
            : invites > 0
              ? `${invites} pending`
              : "Optional",
        href: "/app/settings",
      },
    ];

  const completed = items.filter((i) => i.done).length;

  return (
    <Section title="Get set up" right={`${completed}/${items.length}`}>
      <ul className="divide-y divide-black/8">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-4 px-6 py-3">
            <span
              className={`font-mono text-[11px] tabular-nums ${
                item.done ? "text-black/30 line-through" : "text-black/50"
              }`}
            >
              0{i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div
                className={`text-[13px] ${
                  item.done
                    ? "text-black/40 line-through decoration-black/20"
                    : "text-black"
                }`}
              >
                {item.label}
              </div>
              <div className="text-[12px] text-black/50">{item.hint}</div>
            </div>
            {!item.done && item.href && (
              <Link
                href={item.href}
                className="inline-flex h-7 shrink-0 items-center rounded-md border border-black/15 bg-white px-2.5 text-[12px] text-black hover:bg-black/3"
              >
                Open
              </Link>
            )}
          </li>
        ))}
      </ul>
    </Section>
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
