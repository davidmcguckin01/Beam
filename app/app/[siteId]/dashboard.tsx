"use client";

import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { TEST_PING_SOURCE } from "@/lib/test-ping";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { BeamHeader } from "@/components/beam-header";
import { InstallCard } from "./install-card";
import type { SnippetTab } from "@/lib/snippets";

type Org = { id: string; name: string; role: string };

type EventRow = {
  id: string;
  ts: string;
  url: string;
  referrer: string | null;
  referrerHost: string | null;
  source: string | null;
  country: string | null;
};

type Category = "training" | "search" | "user" | "unknown";

type CrawlerRow = {
  name: string;
  vendor: string | null;
  category: Category;
  count: number;
  verifiedCount: number;
  last: string | null;
};

type Props = {
  session: {
    orgs: Org[];
    activeOrg: Org;
    sites: { id: string; domain: string }[];
  };
  site: { id: string; domain: string; apiKey: string };
  events: EventRow[];
  topReferrers: { host: string; count: number }[];
  crawlers: CrawlerRow[];
  crawlerTotal: number;
  snippets: SnippetTab[];
  detected: { label: string; serverSideAvailable: boolean } | null;
};

// Tuned for light bg.
const SOURCE_COLOR: Record<string, string> = {
  ChatGPT: "#000000",
  Claude: "#7928CA",
  Perplexity: "#0070F3",
  Gemini: "#10B981",
  Copilot: "#0096FF",
  "You.com": "#EC4899",
  Phind: "#22C55E",
  "Meta AI": "#4F46E5",
  DuckDuckGo: "#666666",
};

function colorFor(source: string): string {
  return SOURCE_COLOR[source] || "#888888";
}

const CATEGORY_LABEL: Record<Category, string> = {
  training: "AI training",
  search: "AI search",
  user: "AI user",
  unknown: "Other",
};

const CATEGORY_ORDER: Category[] = ["search", "user", "training", "unknown"];

function flagFor(country: string | null): string {
  if (!country || country.length !== 2) return country || "—";
  const base = 0x1f1e6;
  const A = "A".charCodeAt(0);
  const cc = country.toUpperCase();
  return (
    String.fromCodePoint(base + cc.charCodeAt(0) - A) +
    String.fromCodePoint(base + cc.charCodeAt(1) - A)
  );
}

function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function build30DayBuckets(events: EventRow[]) {
  const sources = Array.from(
    new Set(
      events
        .map((e) => e.source)
        .filter((s): s is string => !!s && s !== TEST_PING_SOURCE)
    )
  ).sort();
  const days: string[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(dayKey(d));
  }
  const rows = days.map((day) => {
    const row: Record<string, string | number> = { date: day.slice(5) };
    for (const src of sources) row[src] = 0;
    return row;
  });
  const indexByDay = new Map(days.map((d, i) => [d, i]));
  for (const e of events) {
    if (!e.source || e.source === TEST_PING_SOURCE) continue;
    const k = dayKey(new Date(e.ts));
    const idx = indexByDay.get(k);
    if (idx === undefined) continue;
    rows[idx][e.source] = (rows[idx][e.source] as number) + 1;
  }
  return { rows, sources };
}

export function Dashboard({
  session,
  site,
  events,
  topReferrers,
  crawlers,
  crawlerTotal,
  snippets,
  detected,
}: Props) {
  const totalAi = useMemo(
    () => events.filter((e) => !!e.source && e.source !== TEST_PING_SOURCE).length,
    [events]
  );
  const lastEventTs = events[0]?.ts;
  const { rows, sources } = useMemo(() => build30DayBuckets(events), [events]);
  const recent = events.slice(0, 100);

  const byCategory = useMemo(() => {
    const m = new Map<Category, CrawlerRow[]>();
    for (const c of crawlers) {
      const cat = c.category || "unknown";
      const list = m.get(cat) ?? [];
      list.push(c);
      m.set(cat, list);
    }
    return m;
  }, [crawlers]);

  const hasData = events.length > 0 || crawlers.length > 0;

  return (
    <main className="min-h-screen bg-[#fafafa] text-black antialiased">
      <BeamHeader
        orgs={session.orgs}
        activeOrg={session.activeOrg}
        sites={session.sites}
        activeSite={{ id: site.id, domain: site.domain }}
        current={null}
      />

      <div className="px-6 py-8 space-y-8">
        {hasData && (
          <>
            <div>
              <h1 className="font-mono text-2xl tracking-tight text-black">
                {site.domain}
              </h1>
              <p className="mt-1 text-[13px] text-black/50">
                {session.activeOrg.name} · last 30 days
              </p>
            </div>

            <Stats
              ai={totalAi}
              crawlers={crawlerTotal}
              sources={
                new Set(
                  events
                    .map((e) => e.source)
                    .filter(
                      (s): s is string => !!s && s !== TEST_PING_SOURCE
                    )
                ).size
              }
              lastEventTs={lastEventTs}
            />
          </>
        )}

        <InstallCard
          snippets={snippets}
          detected={detected}
          siteId={site.id}
        />

        {!hasData ? (
          <Section title="Waiting for first event">
            <div className="px-6 py-8 text-[13px] text-black/55">
              Paste the snippet above. Events arrive within seconds of a visit.
              This page refreshes when you reload.
            </div>
          </Section>
        ) : (
          <>
            <Section title="AI sources" right="last 30 days">
              <div className="h-72 w-full p-4">
                {sources.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-[13px] text-black/40">
                    No AI referrals yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={rows}
                      margin={{ top: 8, right: 16, bottom: 0, left: -16 }}
                    >
                      <CartesianGrid
                        stroke="rgba(0,0,0,0.06)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: "#666" }}
                        axisLine={{ stroke: "rgba(0,0,0,0.1)" }}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "#666" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#ffffff",
                          border: "1px solid rgba(0,0,0,0.1)",
                          borderRadius: 6,
                          fontSize: 12,
                          color: "#000",
                          boxShadow: "0 8px 24px -8px rgba(0,0,0,0.12)",
                        }}
                        labelStyle={{ color: "#000", fontWeight: 500 }}
                        itemStyle={{ color: "#171717" }}
                      />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{
                          fontSize: 12,
                          paddingTop: 8,
                          color: "#525252",
                        }}
                      />
                      {sources.map((src) => (
                        <Line
                          key={src}
                          type="monotone"
                          dataKey={src}
                          stroke={colorFor(src)}
                          strokeWidth={1.75}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Section>

            {topReferrers.length > 0 && (
              <Section title="Top non-AI referrers" right="last 30 days">
                <TopReferrers data={topReferrers} />
              </Section>
            )}

            {crawlers.length > 0 && (
              <Section title="Crawler traffic" right="last 30 days">
                <div className="divide-y divide-black/8">
                  {CATEGORY_ORDER.map((cat) => {
                    const list = byCategory.get(cat);
                    if (!list || list.length === 0) return null;
                    return <CategoryGroup key={cat} category={cat} list={list} />;
                  })}
                </div>
              </Section>
            )}

            <Section title="Recent events" right={`${recent.length} shown`}>
              <ul className="divide-y divide-black/8">
                {recent.map((e) => (
                  <li
                    key={e.id}
                    className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-4 px-6 py-2.5"
                  >
                    <span className="font-mono text-[11px] tabular-nums text-black/50">
                      {formatDistanceToNow(new Date(e.ts), { addSuffix: false })}
                    </span>
                    <span>
                      {e.source ? (
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px] text-black">
                          <Dot color={colorFor(e.source)} />
                          {e.source}
                        </span>
                      ) : e.referrerHost ? (
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px] text-black/65">
                          <Dot color="#bbb" />
                          {e.referrerHost}
                        </span>
                      ) : (
                        <span className="text-[11.5px] text-black/35">—</span>
                      )}
                    </span>
                    <span className="truncate font-mono text-[12px] text-black/55">
                      {pathOf(e.url)}
                    </span>
                    <span className="text-[12px] text-black/50">
                      {flagFor(e.country)}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          </>
        )}
      </div>
    </main>
  );
}

// ── components ──────────────────────────────────────────────────────────────

function Stats({
  ai,
  crawlers,
  sources,
  lastEventTs,
}: {
  ai: number;
  crawlers: number;
  sources: number;
  lastEventTs: string | undefined;
}) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-black/8 bg-black/8 sm:grid-cols-4">
      <Stat label="AI referrals" value={ai.toLocaleString()} sub="30d" />
      <Stat label="Crawler hits" value={crawlers.toLocaleString()} sub="30d" />
      <Stat label="Sources" value={sources.toLocaleString()} />
      <Stat
        label="Last event"
        value={
          lastEventTs
            ? formatDistanceToNow(new Date(lastEventTs), { addSuffix: true })
            : "—"
        }
      />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
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
      <div className="mt-1.5 font-mono text-[20px] font-medium tabular-nums tracking-tight text-black">
        {value}
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

function CategoryGroup({
  category,
  list,
}: {
  category: Category;
  list: CrawlerRow[];
}) {
  const total = list.reduce((n, c) => n + c.count, 0);
  const max = Math.max(...list.map((d) => d.count), 1);
  return (
    <div>
      <div className="flex items-baseline justify-between px-6 pt-4 pb-1">
        <div className="text-[10px] font-medium uppercase tracking-wide text-black/50">
          {CATEGORY_LABEL[category]}
        </div>
        <div className="font-mono text-[11px] tabular-nums text-black/55">
          {total.toLocaleString()}
        </div>
      </div>
      <ul>
        {list.map((c) => {
          const pct = Math.max(2, Math.round((c.count / max) * 100));
          return (
            <li
              key={`${category}-${c.name}`}
              className="grid grid-cols-[1fr_auto] items-center gap-4 px-6 py-2"
            >
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="truncate font-mono text-[12.5px] text-black">
                    {c.name}
                  </span>
                  {c.verifiedCount > 0 && (
                    <span className="font-mono text-[10px] uppercase tracking-wide text-emerald-600">
                      verified
                    </span>
                  )}
                  {c.last && (
                    <span className="ml-auto font-mono text-[10.5px] text-black/35">
                      {formatDistanceToNow(new Date(c.last), {
                        addSuffix: true,
                      })}
                    </span>
                  )}
                </div>
                <div className="mt-1 h-px w-full bg-black/8">
                  <div
                    className="h-px bg-black/50"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <div className="font-mono text-[13px] tabular-nums text-black">
                {c.count.toLocaleString()}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TopReferrers({ data }: { data: { host: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <ul className="divide-y divide-black/8">
      {data.map((r) => {
        const pct = Math.max(2, Math.round((r.count / max) * 100));
        return (
          <li
            key={r.host}
            className="grid grid-cols-[1fr_auto] items-center gap-4 px-6 py-2.5"
          >
            <div className="min-w-0">
              <div className="truncate font-mono text-[12.5px] text-black">
                {r.host}
              </div>
              <div className="mt-1 h-px w-full bg-black/8">
                <div className="h-px bg-black/50" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="font-mono text-[13px] tabular-nums text-black">
              {r.count.toLocaleString()}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-[5px] w-[5px] rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}
