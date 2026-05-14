// Registry of dashboard widgets. The customise UI lists these in order and
// lets the user toggle visibility + reorder. Persisted to site.dashboardLayout
// as an ordered array of keys; absent keys are hidden.

export type WidgetKey =
  | "stats"
  | "ai-sources"
  | "top-pages"
  | "crawled-pages"
  | "top-referrers"
  | "crawlers"
  | "recent-events";

export type WidgetMeta = {
  key: WidgetKey;
  label: string;
  description: string;
};

export const WIDGETS: WidgetMeta[] = [
  {
    key: "stats",
    label: "Stat tiles",
    description: "AI referrals, crawler hits, sources, last event.",
  },
  {
    key: "ai-sources",
    label: "AI sources chart",
    description: "30-day trend line per AI source (ChatGPT, Claude, etc.).",
  },
  {
    key: "top-pages",
    label: "Top pages",
    description: "URLs ranked by AI referral count over the last 30 days.",
  },
  {
    key: "crawled-pages",
    label: "Crawled pages",
    description: "URLs that AI / search crawlers hit, with which bot saw each.",
  },
  {
    key: "top-referrers",
    label: "Top non-AI referrers",
    description: "Hosts referring traffic that isn't an AI tool.",
  },
  {
    key: "crawlers",
    label: "Crawler traffic",
    description: "Bot hits grouped by category and crawler name.",
  },
  {
    key: "recent-events",
    label: "Recent events",
    description: "Live feed of the most recent events.",
  },
];

export const DEFAULT_LAYOUT: WidgetKey[] = [
  "stats",
  "ai-sources",
  "top-pages",
  "crawled-pages",
  "top-referrers",
  "crawlers",
  "recent-events",
];

const VALID_KEYS = new Set<string>(WIDGETS.map((w) => w.key));

// Sanitises a stored layout into a WidgetKey[] safe to render. Unknown keys
// are dropped (e.g., after a widget is removed in code). Null/empty falls back
// to the default layout so new sites and unconfigured sites both render
// something sensible.
export function resolveLayout(stored: string[] | null | undefined): WidgetKey[] {
  if (!stored || stored.length === 0) return DEFAULT_LAYOUT;
  const seen = new Set<string>();
  const out: WidgetKey[] = [];
  for (const k of stored) {
    if (typeof k !== "string") continue;
    if (!VALID_KEYS.has(k)) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k as WidgetKey);
  }
  return out;
}
