import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { site, event } from "@/db/schema";
import { and, eq, gte, desc, sql, isNotNull } from "drizzle-orm";
import { ensureBeamSession, isMemberOfOrg } from "@/lib/beam-auth";
import { buildSnippets } from "@/lib/snippets";
import { describeStack, type Stack } from "@/lib/stack-detect";
import { Dashboard } from "./dashboard";

export const dynamic = "force-dynamic";

export default async function SiteDashboardPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const stack = (s.stack as Stack | null) ?? null;
  const snippets = buildSnippets({ appUrl, apiKey: s.apiKey, stack });
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
      snippets={snippets}
      detected={detected}
    />
  );
}
