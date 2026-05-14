import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { site, event, dashboard } from "@/db/schema";
import { and, eq, gte, desc, asc, sql, isNotNull } from "drizzle-orm";
import { ensureBeamSession, isMemberOfOrg } from "@/lib/beam-auth";
import { buildSnippets } from "@/lib/snippets";
import { getAppUrl } from "@/lib/app-url";
import { describeStack, type Stack } from "@/lib/stack-detect";
import { resolveLayout } from "@/lib/dashboard-widgets";
import { TEST_PING_SOURCE } from "@/lib/test-ping";
import { Dashboard } from "./dashboard";

export const dynamic = "force-dynamic";

const RECENT_PAGE_SIZE = 50;

export default async function SiteDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ page?: string; d?: string }>;
}) {
  const { siteId } = await params;
  const sp = await searchParams;
  const recentPage = Math.max(1, Number(sp.page) || 1);
  const session = await ensureBeamSession();
  if (!session) redirect("/sign-in");

  const rows = await db
    .select()
    .from(site)
    .where(eq(site.id, siteId))
    .limit(1);
  const s = rows[0];
  if (!s) notFound();

  const member = await isMemberOfOrg(session.user.id, s.orgId);
  if (!member) notFound();

  // Load all dashboards for this site. Always at least one — the migration
  // seeded a "Default" per site, and createSiteAction (TODO) should also
  // seed one for newly-created sites going forward.
  let dashboards = await db
    .select()
    .from(dashboard)
    .where(eq(dashboard.siteId, s.id))
    .orderBy(asc(dashboard.position), asc(dashboard.createdAt));

  // Defensive: if a site somehow has no dashboard row (e.g., it was created
  // before this feature shipped and the migration backfill missed it), spin
  // one up on the fly so the page doesn't crash.
  if (dashboards.length === 0) {
    const [created] = await db
      .insert(dashboard)
      .values({ siteId: s.id, name: "Default", position: 0, layout: null })
      .returning();
    dashboards = [created];
  }

  const requestedDashboardId = sp.d?.trim();
  const activeDashboard =
    dashboards.find((d) => d.id === requestedDashboardId) ?? dashboards[0];

  // All sites in this org for the header's site switcher.
  const orgSites = await db
    .select({ id: site.id, domain: site.domain })
    .from(site)
    .where(eq(site.orgId, s.orgId))
    .orderBy(desc(site.createdAt));

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const humanEvents = await db
    .select()
    .from(event)
    .where(
      and(
        eq(event.siteId, s.id),
        gte(event.ts, thirtyDaysAgo),
        eq(event.kind, "human")
      )
    )
    .orderBy(desc(event.ts));

  // Recent activity feed — humans + crawlers together, newest first,
  // paginated. Sized for click-through to event detail.
  const recentWhere = and(
    eq(event.siteId, s.id),
    gte(event.ts, thirtyDaysAgo)
  );

  const [recentCountRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(event)
    .where(recentWhere);
  const recentTotal = Number(recentCountRow?.total ?? 0);
  const recentPageSize = RECENT_PAGE_SIZE;
  const recentTotalPages = Math.max(1, Math.ceil(recentTotal / recentPageSize));
  const safeRecentPage = Math.min(recentPage, recentTotalPages);
  const recentOffset = (safeRecentPage - 1) * recentPageSize;

  const recentAllEvents = await db
    .select({
      id: event.id,
      ts: event.ts,
      url: event.url,
      referrer: event.referrer,
      referrerHost: event.referrerHost,
      source: event.source,
      country: event.country,
      kind: event.kind,
      botCategory: event.botCategory,
      botVendor: event.botVendor,
      verified: event.verified,
      userAgent: event.userAgent,
      asn: event.asn,
    })
    .from(event)
    .where(recentWhere)
    .orderBy(desc(event.ts))
    .limit(recentPageSize)
    .offset(recentOffset);

  const topReferrers = await db
    .select({
      host: event.referrerHost,
      count: sql<number>`count(*)::int`,
    })
    .from(event)
    .where(
      and(
        eq(event.siteId, s.id),
        gte(event.ts, thirtyDaysAgo),
        eq(event.kind, "human"),
        isNotNull(event.referrerHost),
        sql`${event.source} IS NULL`
      )
    )
    .groupBy(event.referrerHost)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  // Crawlers — grouped by (category, name) with verified split.
  const crawlerRows = await db
    .select({
      name: event.source,
      vendor: event.botVendor,
      category: event.botCategory,
      count: sql<number>`count(*)::int`,
      verifiedCount: sql<number>`sum(case when ${event.verified} then 1 else 0 end)::int`,
      last: sql<Date>`max(${event.ts})`,
    })
    .from(event)
    .where(
      and(
        eq(event.siteId, s.id),
        gte(event.ts, thirtyDaysAgo),
        eq(event.kind, "crawler")
      )
    )
    .groupBy(event.source, event.botVendor, event.botCategory)
    .orderBy(desc(sql`count(*)`));

  const crawlerTotal = crawlerRows.reduce((n, c) => n + Number(c.count), 0);

  // Top pages — URLs by AI referral count over the last 30 days.
  const topPagesRows = await db
    .select({
      url: event.url,
      count: sql<number>`count(*)::int`,
    })
    .from(event)
    .where(
      and(
        eq(event.siteId, s.id),
        gte(event.ts, thirtyDaysAgo),
        eq(event.kind, "human"),
        isNotNull(event.source)
      )
    )
    .groupBy(event.url)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  // Top crawled pages — URLs hit by AI/search crawlers over the last 30 days.
  // top_bots is a comma-separated list of the crawler names that hit each URL
  // most often, so the row can show "/path · GPTBot, ClaudeBot" without an
  // extra round-trip.
  const crawledPagesRows = await db
    .select({
      url: event.url,
      count: sql<number>`count(*)::int`,
      last: sql<Date>`max(${event.ts})`,
      topBots: sql<string>`string_agg(distinct coalesce(${event.source}, 'Other'), ', ' order by coalesce(${event.source}, 'Other'))`,
    })
    .from(event)
    .where(
      and(
        eq(event.siteId, s.id),
        gte(event.ts, thirtyDaysAgo),
        eq(event.kind, "crawler")
      )
    )
    .groupBy(event.url)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  // Revisit velocity — pages crawlers come back to. We compute average
  // interval = (last_seen - first_seen) / (hits - 1), so it's only meaningful
  // when a URL has been hit 2+ times. Sorted by shortest interval (most
  // actively re-crawled). Used by the "Revisit velocity" widget.
  const revisitRows = await db
    .select({
      url: event.url,
      hits: sql<number>`count(*)::int`,
      first: sql<Date>`min(${event.ts})`,
      last: sql<Date>`max(${event.ts})`,
      avgIntervalSeconds: sql<number>`
        coalesce(
          extract(epoch from (max(${event.ts}) - min(${event.ts}))) /
          nullif(count(*) - 1, 0),
          0
        )::int
      `,
    })
    .from(event)
    .where(
      and(
        eq(event.siteId, s.id),
        gte(event.ts, thirtyDaysAgo),
        eq(event.kind, "crawler")
      )
    )
    .groupBy(event.url)
    .having(sql`count(*) >= 2`)
    .orderBy(sql`extract(epoch from (max(${event.ts}) - min(${event.ts}))) / nullif(count(*) - 1, 0) asc nulls last`)
    .limit(10);

  // All-time totals for the Stats tiles. Test pings are excluded so a single
  // synthetic event doesn't inflate the count or claim "last event" status.
  const [totalsRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
      last: sql<Date | null>`max(${event.ts})`,
    })
    .from(event)
    .where(
      and(
        eq(event.siteId, s.id),
        sql`(${event.source} IS NULL OR ${event.source} != ${TEST_PING_SOURCE})`
      )
    );

  const totalEventsAllTime = Number(totalsRow?.total ?? 0);
  const lastEventAllTime = totalsRow?.last
    ? new Date(totalsRow.last).toISOString()
    : null;

  const appUrl = getAppUrl();
  const stack = (s.stack as Stack | null) ?? null;
  const snippets = buildSnippets({
    appUrl,
    apiKey: s.apiKey,
    stack,
    domain: s.domain,
  });
  const detected =
    stack && stack !== "unknown"
      ? {
          label: describeStack(stack).label,
          serverSideAvailable: describeStack(stack).serverSideAvailable,
        }
      : null;

  return (
    <Dashboard
      session={{
        orgs: session.orgs,
        activeOrg: session.activeOrg,
        sites: orgSites,
      }}
      site={{ id: s.id, domain: s.domain, apiKey: s.apiKey }}
      events={humanEvents.map((e) => ({
        id: e.id,
        ts: e.ts.toISOString(),
        url: e.url,
        referrer: e.referrer,
        referrerHost: e.referrerHost,
        source: e.source,
        country: e.country,
      }))}
      recentAll={recentAllEvents.map((e) => ({
        id: e.id,
        ts: e.ts.toISOString(),
        url: e.url,
        referrer: e.referrer,
        referrerHost: e.referrerHost,
        source: e.source,
        country: e.country,
        kind: e.kind as "human" | "crawler",
        botCategory: (e.botCategory as string) || null,
        botVendor: (e.botVendor as string) || null,
        verified: e.verified ?? false,
        userAgent: e.userAgent,
        asn: e.asn,
      }))}
      recentPagination={{
        page: safeRecentPage,
        pageSize: recentPageSize,
        totalPages: recentTotalPages,
        total: recentTotal,
      }}
      topReferrers={topReferrers.map((r) => ({
        host: r.host as string,
        count: Number(r.count),
      }))}
      crawlers={crawlerRows.map((c) => ({
        name: (c.name as string) || "Other crawler",
        vendor: (c.vendor as string) || null,
        category: ((c.category as string) || "unknown") as
          | "training"
          | "search"
          | "user"
          | "unknown",
        count: Number(c.count),
        verifiedCount: Number(c.verifiedCount),
        last: c.last ? new Date(c.last).toISOString() : null,
      }))}
      crawlerTotal={crawlerTotal}
      totalEventsAllTime={totalEventsAllTime}
      lastEventAllTime={lastEventAllTime}
      topPages={topPagesRows.map((r) => ({
        url: r.url as string,
        count: Number(r.count),
      }))}
      crawledPages={crawledPagesRows.map((r) => ({
        url: r.url as string,
        count: Number(r.count),
        last: r.last ? new Date(r.last).toISOString() : null,
        topBots: (r.topBots as string) || "",
      }))}
      revisit={revisitRows.map((r) => ({
        url: r.url as string,
        hits: Number(r.hits),
        first: r.first ? new Date(r.first).toISOString() : null,
        last: r.last ? new Date(r.last).toISOString() : null,
        avgIntervalSeconds: Number(r.avgIntervalSeconds || 0),
      }))}
      dashboards={dashboards.map((d) => ({
        id: d.id,
        name: d.name,
        position: d.position,
      }))}
      activeDashboardId={activeDashboard.id}
      layout={resolveLayout(activeDashboard.layout)}
      snippets={snippets}
      detected={detected}
    />
  );
}
