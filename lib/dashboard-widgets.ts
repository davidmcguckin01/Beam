// Registry of dashboard widgets. The dashboard renders these via
// react-grid-layout in an edit-mode toggle: read-only by default, drag +
// resize when the user clicks "Edit layout". Persisted to
// site.dashboardLayout (jsonb) as an array of grid items.
//
// Backward compatibility: an older deployment stored layout as a simple
// string[] (just the visible widget keys, no positions). resolveLayout
// accepts both shapes and upgrades string[] to a structured grid layout
// using each widget's default size.

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
  // Default size in grid units (12-col grid; row height = 30px).
  defaultW: number;
  defaultH: number;
  minW: number;
  minH: number;
};

export type LayoutItem = {
  i: WidgetKey;
  x: number;
  y: number;
  w: number;
  h: number;
};

export const GRID_COLS = 12;
export const GRID_ROW_HEIGHT = 30;

export const WIDGETS: WidgetMeta[] = [
  {
    key: "stats",
    label: "Stat tiles",
    description: "Crawler hits, AI referrals, total events, last event.",
    defaultW: 12,
    defaultH: 3,
    minW: 6,
    minH: 3,
  },
  {
    key: "ai-sources",
    label: "AI sources chart",
    description: "30-day trend per AI source (ChatGPT, Claude, etc.).",
    defaultW: 12,
    defaultH: 10,
    minW: 6,
    minH: 6,
  },
  {
    key: "crawled-pages",
    label: "Crawled pages",
    description: "URLs that AI / search crawlers hit, with which bot saw each.",
    defaultW: 6,
    defaultH: 12,
    minW: 4,
    minH: 6,
  },
  {
    key: "crawlers",
    label: "Crawler traffic",
    description: "Bot hits grouped by category and crawler name.",
    defaultW: 6,
    defaultH: 12,
    minW: 4,
    minH: 6,
  },
  {
    key: "top-pages",
    label: "Top pages",
    description: "URLs ranked by AI referral count over the last 30 days.",
    defaultW: 6,
    defaultH: 10,
    minW: 4,
    minH: 5,
  },
  {
    key: "top-referrers",
    label: "Top non-AI referrers",
    description: "Hosts referring traffic that isn't an AI tool.",
    defaultW: 6,
    defaultH: 10,
    minW: 4,
    minH: 5,
  },
  {
    key: "recent-events",
    label: "Recent events",
    description: "Live feed of recent events (human + crawler).",
    defaultW: 12,
    defaultH: 14,
    minW: 6,
    minH: 6,
  },
];

const META_BY_KEY: Record<WidgetKey, WidgetMeta> = WIDGETS.reduce(
  (acc, w) => {
    acc[w.key] = w;
    return acc;
  },
  {} as Record<WidgetKey, WidgetMeta>
);

const VALID_KEYS = new Set<string>(WIDGETS.map((w) => w.key));

// Canonical default layout — crawler-first since that's the most reliable
// signal for AI traffic.
export const DEFAULT_KEYS: WidgetKey[] = [
  "stats",
  "ai-sources",
  "crawled-pages",
  "crawlers",
  "top-pages",
  "top-referrers",
  "recent-events",
];

// Build a structured grid layout from a list of widget keys, packing left to
// right, wrapping rows when the 12-col grid is full.
export function layoutFromKeys(keys: WidgetKey[]): LayoutItem[] {
  const out: LayoutItem[] = [];
  let x = 0;
  let y = 0;
  let rowMaxH = 0;
  for (const k of keys) {
    const meta = META_BY_KEY[k];
    if (!meta) continue;
    if (x + meta.defaultW > GRID_COLS) {
      x = 0;
      y += rowMaxH;
      rowMaxH = 0;
    }
    out.push({ i: k, x, y, w: meta.defaultW, h: meta.defaultH });
    x += meta.defaultW;
    rowMaxH = Math.max(rowMaxH, meta.defaultH);
  }
  return out;
}

export const DEFAULT_LAYOUT: LayoutItem[] = layoutFromKeys(DEFAULT_KEYS);

function isLayoutItem(v: unknown): v is LayoutItem {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.i === "string" &&
    VALID_KEYS.has(o.i) &&
    typeof o.x === "number" &&
    typeof o.y === "number" &&
    typeof o.w === "number" &&
    typeof o.h === "number"
  );
}

// Sanitises stored layout (which may be the old string[] or the new
// LayoutItem[] shape) into a LayoutItem[] safe to render. Unknown keys are
// dropped. Null/empty falls back to the default layout.
export function resolveLayout(stored: unknown): LayoutItem[] {
  if (!Array.isArray(stored) || stored.length === 0) return DEFAULT_LAYOUT;

  // Old shape: array of widget keys.
  if (stored.every((v) => typeof v === "string")) {
    const keys = (stored as string[]).filter((k): k is WidgetKey =>
      VALID_KEYS.has(k)
    );
    return keys.length > 0 ? layoutFromKeys(keys) : DEFAULT_LAYOUT;
  }

  // New shape: array of layout items.
  const seen = new Set<string>();
  const out: LayoutItem[] = [];
  for (const v of stored) {
    if (!isLayoutItem(v)) continue;
    if (seen.has(v.i)) continue;
    seen.add(v.i);
    const meta = META_BY_KEY[v.i];
    out.push({
      i: v.i,
      x: Math.max(0, Math.min(GRID_COLS - 1, v.x | 0)),
      y: Math.max(0, v.y | 0),
      w: Math.max(meta.minW, Math.min(GRID_COLS, v.w | 0)),
      h: Math.max(meta.minH, v.h | 0),
    });
  }
  return out.length > 0 ? out : DEFAULT_LAYOUT;
}

export function getWidgetMeta(key: WidgetKey): WidgetMeta {
  return META_BY_KEY[key];
}

// Hidden widgets — present in the registry but not in the current layout.
export function hiddenWidgets(layout: LayoutItem[]): WidgetMeta[] {
  const visible = new Set(layout.map((l) => l.i));
  return WIDGETS.filter((w) => !visible.has(w.key));
}
