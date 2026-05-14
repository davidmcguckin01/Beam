"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import GridLayout, {
  useContainerWidth,
  type LayoutItem as RGLLayoutItem,
} from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {
  GRID_COLS,
  GRID_ROW_HEIGHT,
  WIDGETS,
  getWidgetMeta,
  hiddenWidgets,
  type LayoutItem,
  type WidgetKey,
  type WidgetMeta,
} from "@/lib/dashboard-widgets";
import { saveDashboardLayoutAction } from "@/app/app/actions";
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
import { OcholensHeader } from "@/components/beam-header";
import { DashboardTabs } from "./dashboard-tabs";
import { InstallCard } from "./install-card";
import type { SnippetTab } from "@/lib/snippets";


type Org = { id: string; name: string; role: string };

// Pre-aggregated AI referral counts (one row per UTC day × source) — the
// page buckets this in SQL so the dashboard never receives raw event rows.
type AiDailyRow = { day: string; source: string; count: number };

// Combined feed of recent events (human + crawler), used by the
// "Recent events" widget. Carries the full set of fields the details modal
// needs so a click doesn't require a second round-trip.
type RecentEventRow = {
  id: string;
  ts: string;
  url: string;
  referrer: string | null;
  referrerHost: string | null;
  source: string | null;
  country: string | null;
  kind: "human" | "crawler";
  botCategory: string | null;
  botVendor: string | null;
  verified: boolean;
  userAgent: string | null;
  asn: string | null;
};

type RecentPagination = {
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
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
  aiDaily: AiDailyRow[];
  totalAi: number;
  topReferrers: { host: string; count: number }[];
  crawlers: CrawlerRow[];
  crawlerTotal: number;
  crawlerCountries: { country: string; count: number }[];
  totalEventsAllTime: number;
  lastEventAllTime: string | null;
  topPages: { url: string; count: number }[];
  crawledPages: {
    url: string;
    count: number;
    last: string | null;
    topBots: string;
  }[];
  revisit: {
    url: string;
    hits: number;
    first: string | null;
    last: string | null;
    avgIntervalSeconds: number;
  }[];
  recentAll: RecentEventRow[];
  recentPagination: RecentPagination;
  dashboards: { id: string; name: string; position: number }[];
  activeDashboardId: string;
  layout: LayoutItem[];
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
  training: "Training crawls",
  search: "Search indexing",
  user: "User-triggered retrievals",
  unknown: "Other crawlers",
};

const CATEGORY_BLURB: Record<Category, string> = {
  user:
    "A real person asked an LLM something and the bot fetched this page to answer.",
  search:
    "Crawlers building search indexes for AI-powered answer engines.",
  training:
    "Bots gathering content to train future LLMs. Lower-intent signal.",
  unknown: "Unclassified crawlers.",
};

// User-triggered retrievals first — the most actionable signal of AI-driven
// demand for your content.
const CATEGORY_ORDER: Category[] = ["user", "search", "training", "unknown"];

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

// Country code → English name ("US" → "United States"). Intl.DisplayNames
// is built into Node and the browser, so no dependency or lookup table.
const REGION_NAMES =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

function countryName(code: string): string {
  const cc = (code || "").toUpperCase();
  if (cc.length !== 2) return code || "Unknown";
  try {
    return REGION_NAMES?.of(cc) ?? cc;
  } catch {
    return cc;
  }
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

// Turn the SQL day×source aggregate into the dense 30-row shape recharts
// wants (one row per day, a column per source, zero-filled). Rows already
// exclude test pings and null sources — the page query filters those out.
function build30DayBuckets(daily: AiDailyRow[]) {
  const sources = Array.from(new Set(daily.map((d) => d.source))).sort();
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
  for (const r of daily) {
    const idx = indexByDay.get(r.day);
    if (idx === undefined) continue;
    rows[idx][r.source] = (rows[idx][r.source] as number) + r.count;
  }
  return { rows, sources };
}

export function Dashboard({
  session,
  site,
  aiDaily,
  totalAi,
  topReferrers,
  crawlers,
  crawlerTotal,
  crawlerCountries,
  totalEventsAllTime,
  lastEventAllTime,
  topPages,
  crawledPages,
  revisit,
  recentAll,
  recentPagination,
  dashboards,
  activeDashboardId,
  layout,
  snippets,
  detected,
}: Props) {
  const { rows, sources } = useMemo(
    () => build30DayBuckets(aiDaily),
    [aiDaily]
  );

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

  // Whether this site has ever recorded a real event. totalEventsAllTime is
  // computed server-side excluding synthetic "test ping" events — so sending a
  // test ping is a pure sanity check: it never flips hasData and never tears
  // down the first-run install surface into an empty dashboard.
  const hasData = totalEventsAllTime > 0;

  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [savingLayout, startSaveLayout] = useTransition();
  const [editMode, setEditMode] = useState(false);
  const [draftLayout, setDraftLayout] = useState<LayoutItem[]>(layout);
  const { width, containerRef, mounted } = useContainerWidth();

  // Reset draft + edit state whenever the active dashboard changes so an
  // in-flight edit on tab A doesn't leak into tab B.
  useEffect(() => {
    setDraftLayout(layout);
    setEditMode(false);
  }, [activeDashboardId, layout]);

  const [selectedEvent, setSelectedEvent] = useState<RecentEventRow | null>(null);

  const [live, setLive] = useState(false);
  const liveRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    // Auto-refresh every 30s while Live is on. Pause during edit mode so an
    // in-progress drag doesn't get clobbered by a layout overwrite.
    if (!live || editMode) {
      if (liveRef.current) {
        clearInterval(liveRef.current);
        liveRef.current = null;
      }
      return;
    }
    liveRef.current = setInterval(() => {
      router.refresh();
    }, 30_000);
    return () => {
      if (liveRef.current) clearInterval(liveRef.current);
      liveRef.current = null;
    };
  }, [live, editMode, router]);

  // Until the first real event lands, poll so the page promotes itself into
  // the live dashboard the moment one arrives — no manual refresh. Test pings
  // don't count toward hasData, so this keeps running through the
  // install-confirm step and stops only once real traffic shows up.
  useEffect(() => {
    if (hasData) return;
    const id = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(id);
  }, [hasData, router]);

  const activeLayout = editMode ? draftLayout : layout;
  const hidden = hiddenWidgets(activeLayout);

  const enterEdit = () => {
    setDraftLayout(layout);
    setEditMode(true);
  };
  const cancelEdit = () => {
    setDraftLayout(layout);
    setEditMode(false);
  };
  const saveLayout = () => {
    const fd = new FormData();
    fd.append("dashboardId", activeDashboardId);
    fd.append("layout", JSON.stringify(draftLayout));
    startSaveLayout(() => saveDashboardLayoutAction(fd));
    setEditMode(false);
  };

  const onGridChange = (next: readonly RGLLayoutItem[]) => {
    // react-grid-layout reports the full layout post-edit. Map back to our
    // LayoutItem shape (only keep items whose key is a known widget).
    const mapped: LayoutItem[] = next
      .filter((l): l is RGLLayoutItem & { i: WidgetKey } =>
        WIDGETS.some((w) => w.key === l.i)
      )
      .map((l) => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h }));
    setDraftLayout(mapped);
  };

  const hideWidget = (key: WidgetKey) => {
    setDraftLayout((prev) => prev.filter((l) => l.i !== key));
  };

  const showWidget = (key: WidgetKey) => {
    const meta = getWidgetMeta(key);
    const maxY = draftLayout.reduce((m, l) => Math.max(m, l.y + l.h), 0);
    setDraftLayout((prev) => [
      ...prev,
      { i: key, x: 0, y: maxY, w: meta.defaultW, h: meta.defaultH },
    ]);
  };

  const renderWidget = (key: WidgetKey) => {
    switch (key) {
      case "stats":
        return (
          <Stats
            crawlers={crawlerTotal}
            ai={totalAi}
            total={totalEventsAllTime}
            lastEventTs={lastEventAllTime}
          />
        );
      case "ai-activity":
        return (
          <Section
            title="AI activity by intent"
            right="last 30 days · server-side signal"
          >
            <AiActivityByIntent crawlers={crawlers} />
          </Section>
        );
      case "ai-sources":
        return (
          <Section title="AI sources" right="last 30 days">
            <div className="h-full min-h-0 w-full p-4">
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
                    <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
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
        );
      case "top-pages":
        return (
          <Section title="Top pages" right="last 30 days · AI traffic">
            {topPages.length === 0 ? (
              <EmptyHint>No AI-referred pageviews yet.</EmptyHint>
            ) : (
              <TopPages data={topPages} />
            )}
          </Section>
        );
      case "crawled-pages":
        return (
          <Section title="Crawled pages" right="last 30 days · crawler hits">
            {crawledPages.length === 0 ? (
              <EmptyHint>No crawler hits yet.</EmptyHint>
            ) : (
              <CrawledPages data={crawledPages} />
            )}
          </Section>
        );
      case "revisit-velocity":
        return (
          <Section
            title="Revisit velocity"
            right="last 30 days · how often AI comes back"
          >
            {revisit.length === 0 ? (
              <EmptyHint>
                No URL has been crawled twice yet — revisit velocity needs 2+
                hits per URL.
              </EmptyHint>
            ) : (
              <RevisitVelocity data={revisit} />
            )}
          </Section>
        );
      case "top-referrers":
        return (
          <Section title="Top non-AI referrers" right="last 30 days">
            {topReferrers.length === 0 ? (
              <EmptyHint>No non-AI referrals yet.</EmptyHint>
            ) : (
              <TopReferrers data={topReferrers} />
            )}
          </Section>
        );
      case "crawlers":
        return (
          <Section title="Crawler traffic" right="last 30 days">
            {crawlers.length === 0 ? (
              <EmptyHint>No crawler hits yet.</EmptyHint>
            ) : (
              <div className="divide-y divide-black/8">
                {CATEGORY_ORDER.map((cat) => {
                  const list = byCategory.get(cat);
                  if (!list || list.length === 0) return null;
                  return (
                    <CategoryGroup key={cat} category={cat} list={list} />
                  );
                })}
              </div>
            )}
          </Section>
        );
      case "crawler-countries":
        return (
          <Section
            title="Crawler traffic by country"
            right="last 30 days · crawler hits"
          >
            {crawlerCountries.length === 0 ? (
              <EmptyHint>No geo data on crawler hits yet.</EmptyHint>
            ) : (
              <CrawlerCountries data={crawlerCountries} />
            )}
          </Section>
        );
      case "recent-events":
        return (
          <Section
            title="Recent events"
            right={`page ${recentPagination.page} / ${recentPagination.totalPages} · ${recentPagination.total.toLocaleString()} total · click any row`}
          >
            {recentAll.length === 0 ? (
              <EmptyHint>No events yet.</EmptyHint>
            ) : (
              <RecentEventsList
                data={recentAll}
                pagination={recentPagination}
                siteId={site.id}
                onSelect={setSelectedEvent}
              />
            )}
          </Section>
        );
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-[#fafafa] text-black antialiased">
      <OcholensHeader
        orgs={session.orgs}
        activeOrg={session.activeOrg}
        sites={session.sites}
        activeSite={{ id: site.id, domain: site.domain }}
        current={null}
      />

      <div className="px-6 py-8 space-y-6">
        {hasData && (
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="font-mono text-2xl tracking-tight text-black">
                {site.domain}
              </h1>
              <p className="mt-1 text-[13px] text-black/50">
                {session.activeOrg.name} · last 30 days
              </p>
            </div>
            <div className="flex items-center gap-2">
              {editMode ? (
                <>
                  <AddComponentMenu hidden={hidden} onAdd={showWidget} />
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-md border border-black/10 bg-white px-2.5 py-1 text-[12px] text-black/70 hover:bg-black/3 hover:text-black"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveLayout}
                    disabled={savingLayout}
                    className="rounded-md bg-black px-2.5 py-1 text-[12px] font-medium text-white hover:bg-black/85 disabled:opacity-50"
                  >
                    {savingLayout ? "Saving…" : "Save layout"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setLive((v) => !v)}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] transition-colors ${live
                        ? "border-emerald-500/40 bg-emerald-50 text-emerald-700"
                        : "border-black/10 bg-white text-black/70 hover:bg-black/3 hover:text-black"
                      }`}
                    title={
                      live
                        ? "Live: auto-refreshing every 30s"
                        : "Click to auto-refresh every 30s"
                    }
                  >
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-500 animate-pulse" : "bg-black/30"
                        }`}
                    />
                    Live
                  </button>
                  <button
                    type="button"
                    onClick={() => startRefresh(() => router.refresh())}
                    disabled={refreshing}
                    className="inline-flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-2.5 py-1 text-[12px] text-black/70 hover:bg-black/3 hover:text-black disabled:opacity-50"
                  >
                    <RefreshIcon spinning={refreshing} />
                    {refreshing ? "Refreshing…" : "Refresh"}
                  </button>
                  <Link
                    href={`/app/${site.id}/install`}
                    className="rounded-md border border-black/10 bg-white px-2.5 py-1 text-[12px] text-black/70 hover:bg-black/3 hover:text-black"
                  >
                    Install
                  </Link>
                  <button
                    type="button"
                    onClick={enterEdit}
                    className="rounded-md border border-black/10 bg-white px-2.5 py-1 text-[12px] text-black/70 hover:bg-black/3 hover:text-black"
                  >
                    Edit layout
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {hasData && (
          <DashboardTabs
            siteId={site.id}
            dashboards={dashboards}
            activeId={activeDashboardId}
          />
        )}

        {!hasData ? (
          <>
            {/* New site, no real events yet: the install card is the whole
                page. "Verify my install" fetches the site and scans the HTML
                for the snippet — real verification, not a synthetic ping. The
                first real event flips hasData and swaps in the full
                dashboard. */}
            <InstallCard
              snippets={snippets}
              detected={detected}
              siteId={site.id}
              domain={site.domain}
              confirmed={false}
            />
          </>
        ) : (
          <>
            <div ref={containerRef}>
              {mounted && (
                <GridLayout
                  className={editMode ? "edit-mode" : ""}
                  layout={activeLayout}
                  width={width}
                  gridConfig={{
                    cols: GRID_COLS,
                    rowHeight: GRID_ROW_HEIGHT,
                    margin: [16, 16],
                    containerPadding: [0, 0],
                  }}
                  dragConfig={{
                    enabled: editMode,
                    cancel: ".no-drag",
                  }}
                  resizeConfig={{ enabled: editMode }}
                  onLayoutChange={onGridChange}
                >
                  {activeLayout.map((item) => (
                    <div
                      key={item.i}
                      className={`relative ${editMode
                          ? "ring-2 ring-black/15 ring-offset-2 ring-offset-[#fafafa] rounded-lg"
                          : ""
                        }`}
                    >
                      <div className="h-full min-h-0 overflow-hidden">
                        {renderWidget(item.i)}
                      </div>
                      {editMode && (
                        <button
                          type="button"
                          onClick={() => hideWidget(item.i)}
                          className="no-drag absolute right-2 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-md border border-black/10 bg-white text-black/55 shadow-sm hover:bg-black/5 hover:text-black"
                          aria-label="Hide widget"
                          title="Hide widget"
                        >
                          <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden>
                            <path
                              d="M2 2 L9 9 M9 2 L2 9"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </GridLayout>
              )}
            </div>
          </>
        )}
      </div>
      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </main>
  );
}

// Edit-mode control for adding hidden widgets back onto the dashboard. Sits in
// the toolbar next to Cancel / Save so the "add a component" affordance is
// visible the moment you enter edit mode — not buried in a panel below the
// grid. Disabled (with a hint) once every widget is already placed.
function AddComponentMenu({
  hidden,
  onAdd,
}: {
  hidden: WidgetMeta[];
  onAdd: (key: WidgetKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const empty = hidden.length === 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !empty && setOpen((v) => !v)}
        disabled={empty}
        aria-haspopup="menu"
        aria-expanded={open}
        title={
          empty ? "Every component is already on this dashboard" : undefined
        }
        className="inline-flex items-center gap-1.5 rounded-md border border-black/15 bg-white px-2.5 py-1 text-[12px] font-medium text-black shadow-sm transition-colors hover:bg-black/3 disabled:cursor-not-allowed disabled:text-black/30 disabled:shadow-none"
      >
        <span className="text-[14px] leading-none">+</span>
        Add component
        {!empty && (
          <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[10px] font-semibold tabular-nums text-white">
            {hidden.length}
          </span>
        )}
      </button>
      {open && !empty && (
        <div
          className="absolute right-0 top-full z-30 mt-1.5 w-72 rounded-lg border border-black/10 bg-white p-1 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.12)]"
          role="menu"
        >
          <div className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-black/40">
            Add a component
          </div>
          {hidden.map((w) => (
            <button
              key={w.key}
              type="button"
              role="menuitem"
              onClick={() => {
                onAdd(w.key);
                // Last hidden widget just added — nothing left to pick.
                if (hidden.length === 1) setOpen(false);
              }}
              className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-black/5"
            >
              <div className="flex items-center gap-1.5 text-[12.5px] text-black">
                <span className="text-black/40">+</span>
                {w.label}
              </div>
              <div className="mt-0.5 pl-[19px] text-[11px] leading-snug text-black/45">
                {w.description}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CrawledPages({
  data,
}: {
  data: {
    url: string;
    count: number;
    last: string | null;
    topBots: string;
  }[];
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <ul className="divide-y divide-black/8">
      {data.map((p) => {
        const pct = Math.max(2, Math.round((p.count / max) * 100));
        return (
          <li
            key={p.url}
            className="grid grid-cols-[1fr_auto] items-center gap-4 px-6 py-2.5"
          >
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="truncate font-mono text-[12.5px] text-black">
                  {pathOf(p.url)}
                </span>
                {p.last && (
                  <span className="ml-auto shrink-0 font-mono text-[10.5px] text-black/35">
                    {formatDistanceToNow(new Date(p.last), { addSuffix: true })}
                  </span>
                )}
              </div>
              <div className="mt-0.5 truncate font-mono text-[11px] text-black/50">
                {p.topBots || "—"}
              </div>
              <div className="mt-1 h-px w-full bg-black/8">
                <div className="h-px bg-black/50" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="font-mono text-[13px] tabular-nums text-black">
              {p.count.toLocaleString()}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function TopPages({ data }: { data: { url: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <ul className="divide-y divide-black/8">
      {data.map((p) => {
        const pct = Math.max(2, Math.round((p.count / max) * 100));
        return (
          <li
            key={p.url}
            className="grid grid-cols-[1fr_auto] items-center gap-4 px-6 py-2.5"
          >
            <div className="min-w-0">
              <div className="truncate font-mono text-[12.5px] text-black">
                {pathOf(p.url)}
              </div>
              <div className="mt-1 h-px w-full bg-black/8">
                <div className="h-px bg-black/50" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="font-mono text-[13px] tabular-nums text-black">
              {p.count.toLocaleString()}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ── components ──────────────────────────────────────────────────────────────

function Stats({
  crawlers,
  ai,
  total,
  lastEventTs,
}: {
  crawlers: number;
  ai: number;
  total: number;
  lastEventTs: string | null;
}) {
  return (
    <div className="grid h-full grid-cols-2 gap-px overflow-hidden rounded-lg border border-black/8 bg-black/8 sm:grid-cols-4">
      <Stat label="Crawler hits" value={crawlers.toLocaleString()} sub="30d" />
      <Stat label="AI referrals" value={ai.toLocaleString()} sub="30d" />
      <Stat label="Total events" value={total.toLocaleString()} sub="all-time" />
      <Stat
        label="Last event"
        value={
          lastEventTs
            ? formatDistanceToNow(new Date(lastEventTs), { addSuffix: true })
            : "—"
        }
        sub="all-time"
      />
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-[64px] items-center justify-center px-6 py-8 text-[13px] text-black/45">
      {children}
    </div>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 11 11"
      fill="none"
      aria-hidden
      className={spinning ? "animate-spin" : ""}
    >
      <path
        d="M9.2 5.5a3.7 3.7 0 1 1-1.1-2.6 M9.2 1.5 v2.5 h-2.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const RECENT_KIND_LABEL: Record<"human" | "crawler", string> = {
  human: "human",
  crawler: "bot",
};

function RecentEventsList({
  data,
  pagination,
  siteId,
  onSelect,
}: {
  data: RecentEventRow[];
  pagination: RecentPagination;
  siteId: string;
  onSelect: (e: RecentEventRow) => void;
}) {
  const hasPrev = pagination.page > 1;
  const hasNext = pagination.page < pagination.totalPages;
  return (
    <div className="flex h-full flex-col">
      <ul className="flex-1 divide-y divide-black/8 overflow-auto">
        {data.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => onSelect(e)}
              className="grid w-full grid-cols-[auto_auto_auto_1fr_auto] items-center gap-3 px-6 py-2.5 text-left transition-colors hover:bg-black/3"
            >
              <span className="font-mono text-[11px] tabular-nums text-black/50">
                {formatDistanceToNow(new Date(e.ts), { addSuffix: false })}
              </span>
              <span
                className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wide ${e.kind === "crawler"
                    ? "bg-amber-50 text-amber-900"
                    : "bg-black/5 text-black/65"
                  }`}
              >
                {RECENT_KIND_LABEL[e.kind]}
              </span>
              <span>
                {e.source ? (
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px] text-black">
                    <Dot color={colorFor(e.source)} />
                    {e.source}
                    {e.kind === "crawler" && e.verified && (
                      <span className="font-mono text-[10px] uppercase tracking-wide text-emerald-600">
                        verified
                      </span>
                    )}
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
            </button>
          </li>
        ))}
      </ul>
      <div className="flex shrink-0 items-center justify-between border-t border-black/8 bg-white px-6 py-2.5">
        <span className="font-mono text-[11px] text-black/45">
          {(pagination.page - 1) * pagination.pageSize + 1}–
          {Math.min(
            pagination.page * pagination.pageSize,
            pagination.total
          ).toLocaleString()}{" "}
          of {pagination.total.toLocaleString()}
        </span>
        <div className="flex items-center gap-1">
          {hasPrev ? (
            <Link
              href={`/app/${siteId}?page=${pagination.page - 1}#recent-events`}
              scroll={false}
              className="rounded-md border border-black/10 bg-white px-2.5 py-1 text-[11.5px] text-black/70 hover:bg-black/5 hover:text-black"
            >
              ← Prev
            </Link>
          ) : (
            <span className="rounded-md border border-black/5 bg-white px-2.5 py-1 text-[11.5px] text-black/30">
              ← Prev
            </span>
          )}
          {hasNext ? (
            <Link
              href={`/app/${siteId}?page=${pagination.page + 1}#recent-events`}
              scroll={false}
              className="rounded-md border border-black/10 bg-white px-2.5 py-1 text-[11.5px] text-black/70 hover:bg-black/5 hover:text-black"
            >
              Next →
            </Link>
          ) : (
            <span className="rounded-md border border-black/5 bg-white px-2.5 py-1 text-[11.5px] text-black/30">
              Next →
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function EventDetailModal({
  event,
  onClose,
}: {
  event: RecentEventRow | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!event) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [event, onClose]);

  if (!event) return null;

  const fullTs = new Date(event.ts);
  return (
    <>
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_24px_56px_-12px_rgba(0,0,0,0.25)]">
        <div className="flex items-start justify-between gap-4 border-b border-black/8 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wide ${event.kind === "crawler"
                    ? "bg-amber-50 text-amber-900"
                    : "bg-black/5 text-black/65"
                  }`}
              >
                {RECENT_KIND_LABEL[event.kind]}
              </span>
              <h3 className="font-mono text-[14px] text-black">
                {event.source ?? event.referrerHost ?? "Direct"}
              </h3>
              {event.kind === "crawler" && event.verified && (
                <span className="font-mono text-[10px] uppercase tracking-wide text-emerald-600">
                  verified
                </span>
              )}
            </div>
            <p className="mt-1 font-mono text-[11.5px] text-black/45">
              {fullTs.toUTCString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-black/45 hover:bg-black/5 hover:text-black"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path
                d="M3 3 L11 11 M11 3 L3 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2.5 px-6 py-5 text-[12.5px]">
          <DetailField label="URL" value={event.url} mono />
          <DetailField label="Path" value={pathOf(event.url)} mono />
          {event.referrer && (
            <DetailField label="Referrer" value={event.referrer} mono />
          )}
          {event.referrerHost && !event.referrer && (
            <DetailField label="Referrer host" value={event.referrerHost} mono />
          )}
          {event.kind === "crawler" && (
            <>
              {event.botVendor && (
                <DetailField label="Vendor" value={event.botVendor} />
              )}
              {event.botCategory && (
                <DetailField label="Intent" value={event.botCategory} />
              )}
              <DetailField
                label="IP verified"
                value={event.verified ? "yes" : "no"}
              />
            </>
          )}
          {event.country && (
            <DetailField
              label="Country"
              value={`${flagFor(event.country)} ${event.country}`}
            />
          )}
          {event.asn && <DetailField label="ASN" value={event.asn} mono />}
          {event.userAgent && (
            <DetailField label="User-Agent" value={event.userAgent} mono wrap />
          )}
          <DetailField label="Event ID" value={event.id} mono />
        </dl>
      </div>
    </>
  );
}

function DetailField({
  label,
  value,
  mono = false,
  wrap = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  wrap?: boolean;
}) {
  return (
    <>
      <dt className="text-[10.5px] uppercase tracking-wide text-black/45">
        {label}
      </dt>
      <dd
        className={`${mono ? "font-mono" : ""} ${wrap ? "break-all" : "truncate"
          } text-black`}
      >
        {value}
      </dd>
    </>
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
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-black/8 bg-white">
      <div className="flex shrink-0 items-baseline justify-between gap-4 border-b border-black/8 px-6 py-3.5">
        <h2 className="text-[13px] font-medium text-black">{title}</h2>
        {right && (
          <span className="font-mono text-[11px] tabular-nums text-black/40">
            {right}
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
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
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-baseline justify-between">
          <div className="text-[10px] font-medium uppercase tracking-wide text-black/55">
            {CATEGORY_LABEL[category]}
          </div>
          <div className="font-mono text-[11px] tabular-nums text-black/55">
            {total.toLocaleString()}
          </div>
        </div>
        <div className="mt-0.5 text-[11px] text-black/45">
          {CATEGORY_BLURB[category]}
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
                  {c.vendor && (
                    <span className="font-mono text-[10px] text-black/45">
                      {c.vendor}
                    </span>
                  )}
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

// Hero-style widget: one big tile per intent showing total + top contributor.
// The "user" tile leads because user-triggered retrievals = direct demand.
function AiActivityByIntent({ crawlers }: { crawlers: CrawlerRow[] }) {
  const byCat = new Map<Category, CrawlerRow[]>();
  for (const c of crawlers) {
    const cat = (c.category || "unknown") as Category;
    const list = byCat.get(cat) ?? [];
    list.push(c);
    byCat.set(cat, list);
  }
  const cats: Category[] = ["user", "search", "training"];
  return (
    <div className="grid h-full grid-cols-1 gap-px overflow-hidden bg-black/8 sm:grid-cols-3">
      {cats.map((cat) => {
        const list = (byCat.get(cat) ?? []).slice().sort((a, b) => b.count - a.count);
        const total = list.reduce((n, c) => n + c.count, 0);
        const top = list[0];
        return (
          <div key={cat} className="flex h-full flex-col gap-3 bg-white p-5">
            <div>
              <div className="text-[10.5px] font-medium uppercase tracking-wide text-black/50">
                {CATEGORY_LABEL[cat]}
              </div>
              <div className="mt-1.5 font-mono text-[22px] font-medium tabular-nums tracking-tight text-black">
                {total.toLocaleString()}
              </div>
              <div className="mt-0.5 text-[11px] text-black/45">
                {CATEGORY_BLURB[cat]}
              </div>
            </div>
            {top ? (
              <div className="mt-auto">
                <div className="text-[10px] uppercase tracking-wide text-black/40">
                  Top bot
                </div>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className="font-mono text-[13px] text-black">
                    {top.name}
                  </span>
                  {top.vendor && (
                    <span className="font-mono text-[10px] text-black/45">
                      {top.vendor}
                    </span>
                  )}
                  <span className="ml-auto font-mono text-[12px] tabular-nums text-black/65">
                    {top.count.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-auto text-[11.5px] text-black/35">
                None yet.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatInterval(seconds: number): string {
  if (!seconds || seconds <= 0) return "—";
  if (seconds < 90) return `${Math.round(seconds)}s`;
  const minutes = seconds / 60;
  if (minutes < 90) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 36) return `${Math.round(hours)}h`;
  const days = hours / 24;
  if (days < 60) return `${Math.round(days)}d`;
  return `${Math.round(days / 7)}w`;
}

function RevisitVelocity({
  data,
}: {
  data: {
    url: string;
    hits: number;
    first: string | null;
    last: string | null;
    avgIntervalSeconds: number;
  }[];
}) {
  return (
    <ul className="divide-y divide-black/8">
      {data.map((p) => (
        <li
          key={p.url}
          className="grid grid-cols-[1fr_auto] items-center gap-4 px-6 py-2.5"
        >
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="truncate font-mono text-[12.5px] text-black">
                {pathOf(p.url)}
              </span>
              {p.last && (
                <span className="ml-auto shrink-0 font-mono text-[10.5px] text-black/35">
                  last {formatDistanceToNow(new Date(p.last), { addSuffix: true })}
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-black/55">
              every <span className="font-mono text-black">{formatInterval(p.avgIntervalSeconds)}</span>
              <span className="text-black/35"> · {p.hits.toLocaleString()} hits over 30d</span>
            </div>
          </div>
          <div className="font-mono text-[13px] tabular-nums text-black">
            {p.hits.toLocaleString()}
          </div>
        </li>
      ))}
    </ul>
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

// Crawler hits ranked by country of origin — where scrapers come from.
// A ranked flag + bar list rather than a geographic map: it's consistent
// with the other breakdown widgets, ships no map/topojson payload, and the
// data is already capped at the top 20 by the page query.
function CrawlerCountries({
  data,
}: {
  data: { country: string; count: number }[];
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((n, d) => n + d.count, 0);
  return (
    <ul className="divide-y divide-black/8">
      {data.map((c) => {
        const pct = Math.max(2, Math.round((c.count / max) * 100));
        const share = total > 0 ? Math.round((c.count / total) * 100) : 0;
        return (
          <li
            key={c.country}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-6 py-2.5"
          >
            <span className="text-[17px] leading-none">
              {flagFor(c.country)}
            </span>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="truncate text-[12.5px] text-black">
                  {countryName(c.country)}
                </span>
                <span className="ml-auto shrink-0 font-mono text-[10.5px] text-black/35">
                  {share}%
                </span>
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
