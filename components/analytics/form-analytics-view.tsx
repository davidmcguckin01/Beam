"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  TrendingUp,
  Loader2,
  Search,
  Globe,
  ExternalLink,
  Star,
  Download,
  Trash2,
  ChevronDown,
  X,
  Building2,
  Monitor,
  ArrowUpRight,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { MultiStepFormConfig, FormField } from "@/lib/form-builder-types";

// ─── Types ────────────────────────────────────────────────────────────────────

type TimePreset = "today" | "7d" | "30d" | "90d" | "custom";

interface ComparisonMetrics {
  totalViews: number;
  uniqueVisitors: number;
  totalSubmissions: number;
  totalDrafts: number;
  averageTimeOnPage: number;
}

interface AnalyticsAPIData {
  totalViews: number;
  uniqueVisitors: number;
  totalSubmissions: number;
  totalDrafts: number;
  averageTimeOnPage: number;
  viewsByCountry: Array<{ country: string | null; count: number }>;
  timeSeries: {
    views: Array<{ date: string; count: number }>;
    submissions: Array<{ date: string; count: number }>;
    drafts: Array<{ date: string; count: number }>;
  };
  comparison: ComparisonMetrics;
  recentViews: Array<{
    id: string;
    country: string | null;
    userAgent: string | null;
    referer: string | null;
    companyName: string | null;
    jobCompanyName: string | null;
    sessionId: string | null;
    ipAddress: string | null;
    createdAt: string;
  }>;
}

interface RawSubmission {
  id: string;
  createdAt: string;
  submitterName: string | null;
  submitterEmail: string | null;
  feedback: string | null;
  country: string | null;
  city: string | null;
  jobTitle: string | null;
  jobCompanyName: string | null;
  companyName: string | null;
  companyDomain: string | null;
  userAgent: string | null;
  referer: string | null;
  timeOnPageSeconds: number | null;
  isDraft: boolean;
}

interface ParsedSubmission extends RawSubmission {
  fieldValues: Record<string, unknown>;
}

interface PageInfo {
  id: string;
  title: string;
  slug: string;
  customizations?: string | null;
}

interface SegmentFilters {
  country?: string;
  device?: string;
  source?: string;
  company?: string;
  status?: "completed" | "abandoned";
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function parseDevice(ua: string | null): "Mobile" | "Tablet" | "Desktop" {
  if (!ua) return "Desktop";
  if (/mobile|android|iphone|ipod|windows phone/i.test(ua)) return "Mobile";
  if (/ipad|tablet/i.test(ua)) return "Tablet";
  return "Desktop";
}

function parseSource(referer: string | null): "Direct" | "Search" | "Social" | "Referral" {
  if (!referer) return "Direct";
  if (/google|bing|yahoo|duckduckgo|baidu|yandex/i.test(referer)) return "Search";
  if (/twitter|x\.com|linkedin|facebook|instagram|tiktok|reddit/i.test(referer)) return "Social";
  return "Referral";
}

function pctChange(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((current - prev) / prev) * 100);
}

function getDateRange(preset: TimePreset, custom?: DateRange): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "7d":
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "30d":
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case "90d":
      return { from: startOfDay(subDays(now, 89)), to: endOfDay(now) };
    case "custom":
      return {
        from: custom?.from ? startOfDay(custom.from) : startOfDay(subDays(now, 29)),
        to: custom?.to ? endOfDay(custom.to) : endOfDay(now),
      };
  }
}

function parseSubmission(raw: RawSubmission): ParsedSubmission {
  let fieldValues: Record<string, unknown> = {};
  try {
    if (raw.feedback) {
      const parsed = JSON.parse(raw.feedback);
      if (parsed && typeof parsed === "object" && parsed.fieldValues) {
        fieldValues = parsed.fieldValues;
      } else {
        fieldValues = { feedback: raw.feedback };
      }
    }
  } catch {
    if (raw.feedback) fieldValues = { feedback: raw.feedback };
  }
  return { ...raw, fieldValues };
}

function formatAvgTime(seconds: number): string {
  if (seconds <= 0) return "—";
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.round(seconds)}s`;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  trend,
  active,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  trend?: number | null;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left bg-white rounded-xl border p-5 transition-all w-full ${
        onClick ? "cursor-pointer" : "cursor-default"
      } ${active ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-100 hover:border-gray-200"}`}
    >
      <p className="text-xs text-gray-500 mb-3">{label}</p>
      <p className="text-[26px] font-bold text-gray-950 tracking-tight tabular-nums leading-none">
        {value}
      </p>
      {(trend != null || sub) && (
        <div className="flex items-center gap-2 mt-2.5 min-h-[16px]">
          {trend != null && (
            <span
              className={`text-xs font-semibold tabular-nums ${
                trend > 0 ? "text-emerald-600" : trend < 0 ? "text-rose-500" : "text-gray-500"
              }`}
            >
              {trend > 0 ? "+" : ""}{trend}%
            </span>
          )}
          {sub && <span className="text-xs text-gray-500">{sub}</span>}
        </div>
      )}
    </button>
  );
}

// ─── Multi-line SVG chart ─────────────────────────────────────────────────────

function MultiLineChart({
  dateRange,
  views,
  starts,
  submissions,
  height = 200,
}: {
  dateRange: string[];
  views: Map<string, number>;
  starts: Map<string, number>;
  submissions: Map<string, number>;
  height?: number;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const pad = { top: 20, right: 16, bottom: 32, left: 36 };
  const W = 560;
  const H = height;
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;
  const n = dateRange.length;

  const maxVal = Math.max(
    ...dateRange.map((d) =>
      Math.max(views.get(d) ?? 0, starts.get(d) ?? 0, submissions.get(d) ?? 0)
    ),
    1
  );

  const xPos = (i: number) =>
    pad.left + (n <= 1 ? iW / 2 : (i / (n - 1)) * iW);
  const yPos = (v: number) => pad.top + iH - (v / maxVal) * iH;

  const bottomY = pad.top + iH; // SVG y-coordinate for data value 0
  const clampY = (y: number) => Math.min(y, bottomY);

  const makePath = (map: Map<string, number>) => {
    if (n === 0) return "";
    const pts = dateRange.map((d, i) => ({ x: xPos(i), y: yPos(map.get(d) ?? 0) }));
    if (n === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    const t = 0.18; // smoothing tension
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const pp = pts[i - 2] ?? prev;
      const nx = pts[i + 1] ?? curr;
      const cp1x = prev.x + (curr.x - pp.x) * t;
      const cp1y = clampY(prev.y + (curr.y - pp.y) * t);
      const cp2x = curr.x - (nx.x - prev.x) * t;
      const cp2y = clampY(curr.y - (nx.y - prev.y) * t);
      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
    }
    return d;
  };

  const makeArea = (map: Map<string, number>) => {
    const line = makePath(map);
    const lastX = xPos(n - 1).toFixed(1);
    const firstX = xPos(0).toFixed(1);
    const baseY = (pad.top + iH).toFixed(1);
    return `${line} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  };

  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const step = Math.max(1, Math.floor(n / 6));
  const labelDates = dateRange.filter((_, i) => i % step === 0 || i === n - 1);

  return (
    <div className="w-full overflow-x-auto">
      <svg width={W} height={H} className="overflow-visible">
        <defs>
          {[
            { id: "mlcViews", color: "#3b82f6" },
            { id: "mlcStarts", color: "#f59e0b" },
            { id: "mlcSubs", color: "#10b981" },
          ].map(({ id, color }) => (
            <linearGradient key={id} id={id} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        {gridLines.map((r) => {
          const gy = pad.top + iH - r * iH;
          return (
            <g key={r}>
              <line
                x1={pad.left} y1={gy}
                x2={pad.left + iW} y2={gy}
                stroke="#f3f4f6" strokeWidth={1}
              />
              <text x={pad.left - 6} y={gy + 4} textAnchor="end" fontSize={9} fill="#9ca3af">
                {Math.round(r * maxVal)}
              </text>
            </g>
          );
        })}

        <path d={makeArea(views)} fill="url(#mlcViews)" />
        <path d={makeArea(starts)} fill="url(#mlcStarts)" />
        <path d={makeArea(submissions)} fill="url(#mlcSubs)" />

        <path d={makePath(views)} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path d={makePath(starts)} fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path d={makePath(submissions)} fill="none" stroke="#10b981" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {labelDates.map((d) => {
          const i = dateRange.indexOf(d);
          return (
            <text key={d} x={xPos(i)} y={H - 4} textAnchor="middle" fontSize={9} fill="#9ca3af">
              {format(new Date(d + "T12:00:00"), "MMM d")}
            </text>
          );
        })}

        {/* Hover overlay: vertical line + dots + tooltip */}
        {hoverIdx !== null && (() => {
          const date = dateRange[hoverIdx];
          const hx = xPos(hoverIdx);
          const v = views.get(date) ?? 0;
          const s = starts.get(date) ?? 0;
          const sub = submissions.get(date) ?? 0;
          const tooltipW = 120;
          const tooltipH = 74;
          const tx = hx + tooltipW + 18 > W ? hx - tooltipW - 10 : hx + 12;
          const ty = pad.top;
          return (
            <g pointerEvents="none">
              <line x1={hx} y1={pad.top} x2={hx} y2={pad.top + iH} stroke="#d1d5db" strokeWidth={1} strokeDasharray="3,3" />
              <circle cx={hx} cy={yPos(v)} r={4} fill="#3b82f6" stroke="white" strokeWidth={2} />
              <circle cx={hx} cy={yPos(s)} r={4} fill="#f59e0b" stroke="white" strokeWidth={2} />
              <circle cx={hx} cy={yPos(sub)} r={4} fill="#10b981" stroke="white" strokeWidth={2} />
              <rect x={tx} y={ty} width={tooltipW} height={tooltipH} rx={6} fill="#111827" opacity={0.93} />
              <text x={tx + 8} y={ty + 15} fontSize={9} fill="#d1d5db" fontWeight="600">
                {format(new Date(date + "T12:00:00"), "MMM d, yyyy")}
              </text>
              {[
                { label: "Views", val: v, color: "#60a5fa", ci: 0 },
                { label: "Starts", val: s, color: "#fbbf24", ci: 1 },
                { label: "Submitted", val: sub, color: "#34d399", ci: 2 },
              ].map(({ label, val, color, ci }) => (
                <g key={label}>
                  <circle cx={tx + 10} cy={ty + 28 + ci * 15} r={3} fill={color} />
                  <text x={tx + 19} y={ty + 32 + ci * 15} fontSize={9} fill="#f9fafb">
                    {label}: {val}
                  </text>
                </g>
              ))}
            </g>
          );
        })()}

        {/* Transparent hit area — last in DOM so it captures all mouse events */}
        <rect
          x={pad.left} y={pad.top}
          width={iW} height={iH}
          fill="transparent"
          style={{ cursor: "crosshair" }}
          onMouseMove={(e) => {
            const svgEl = e.currentTarget.closest("svg")!;
            const rect = svgEl.getBoundingClientRect();
            const rawX = e.clientX - rect.left;
            const svgX = rawX * (W / rect.width);
            const innerX = svgX - pad.left;
            if (n <= 1 || innerX < 0 || innerX > iW) { setHoverIdx(null); return; }
            setHoverIdx(Math.max(0, Math.min(Math.round((innerX / iW) * (n - 1)), n - 1)));
          }}
          onMouseLeave={() => setHoverIdx(null)}
        />
      </svg>

      <div className="flex items-center gap-5 mt-3 justify-center">
        {[
          { color: "#3b82f6", label: "Views" },
          { color: "#f59e0b", label: "Starts" },
          { color: "#10b981", label: "Submissions" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className="inline-block rounded-full"
              style={{ width: 12, height: 2, backgroundColor: color }}
            />
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Funnel chart ─────────────────────────────────────────────────────────────

function FunnelChart({
  views,
  starts,
  submitted,
}: {
  views: number;
  starts: number;
  submitted: number;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Enforce monotonic decrease: each stage ≤ previous stage
  const safeStarts = Math.min(starts, views);
  const safeSubmitted = Math.min(submitted, safeStarts);

  const stages = [
    { label: "Views", value: views, color: "#3b82f6" },
    { label: "Starts", value: safeStarts, color: "#f59e0b" },
    { label: "Submitted", value: safeSubmitted, color: "#10b981" },
  ];
  const max = Math.max(views, 1);

  return (
    <div className="space-y-4">
      {stages.map((s, i) => {
        const pct = Math.round((s.value / max) * 100);
        const dropPct =
          i > 0 && stages[i - 1].value > 0
            ? Math.round(
              ((stages[i - 1].value - s.value) / stages[i - 1].value) * 100
            )
            : null;
        const convFromViews = i > 0 && views > 0
          ? `${((s.value / views) * 100).toFixed(0)}% of views`
          : null;
        return (
          <div key={s.label} className="relative">
            <div
              className="space-y-1.5"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-sm font-medium text-gray-700">{s.label}</span>
                  {dropPct !== null && (
                    <span className="text-xs text-red-400 font-medium">−{dropPct}%</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">
                    {s.value.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500 tabular-nums w-8 text-right">{pct}%</span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: s.color, opacity: 0.9 }}
                />
              </div>
            </div>
            {hoveredIdx === i && (
              <div className="absolute left-0 top-full mt-1 z-20 bg-gray-950 text-white text-xs rounded-lg px-3 py-2.5 shadow-xl pointer-events-none min-w-[170px] border border-gray-800">
                <p className="font-semibold mb-1.5" style={{ color: s.color }}>{s.label}</p>
                <p className="text-gray-300">{s.value.toLocaleString()} total</p>
                <p className="text-gray-500">{pct}% of all views</p>
                {convFromViews && <p className="text-gray-500">{convFromViews}</p>}
                {dropPct !== null && (
                  <p className="text-red-400 mt-1">−{dropPct}% drop from previous stage</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Breakdown list ───────────────────────────────────────────────────────────

function BreakdownList({
  items,
  onSelect,
  selected,
}: {
  items: Array<{ label: string; count: number }>;
  onSelect: (label: string) => void;
  selected?: string;
}) {
  if (items.length === 0) {
    return <p className="text-xs text-gray-500 py-2">No data</p>;
  }
  const max = Math.max(...items.map((i) => i.count), 1);
  const total = items.reduce((s, i) => s + i.count, 0);
  return (
    <div className="divide-y divide-gray-50">
      {items.slice(0, 8).map(({ label, count }) => {
        const isActive = selected === label;
        const pct = Math.round((count / total) * 100);
        return (
          <button
            key={label}
            type="button"
            onClick={() => onSelect(label)}
            className={`w-full text-left group flex items-center gap-3 py-2.5 px-1 transition-all rounded-lg ${
              isActive ? "bg-gray-50" : "hover:bg-gray-50/60"
            }`}
          >
            <span className="text-sm text-gray-800 truncate flex-1 min-w-0">
              {label || "Unknown"}
            </span>
            <div className="w-28 h-1.5 bg-gray-100 rounded-full overflow-hidden shrink-0">
              <div
                className={`h-full rounded-full transition-colors ${isActive ? "bg-gray-950" : "bg-gray-400 group-hover:bg-gray-700"}`}
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="text-sm tabular-nums text-gray-600 shrink-0 w-8 text-right">{count}</span>
            <span className="text-xs tabular-nums text-gray-500 shrink-0 w-9 text-right">{pct}%</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Field analytics ─────────────────────────────────────────────────────────

function FieldAnalytics({
  field,
  values,
}: {
  field: FormField;
  values: unknown[];
}) {
  const filled = values.filter(
    (v) => v !== null && v !== undefined && v !== ""
  ).length;
  const pct = values.length > 0 ? Math.round((filled / values.length) * 100) : 0;

  if (field.type === "rating") {
    const nums = values
      .map((v) => Number(v))
      .filter((n) => !isNaN(n) && n > 0);
    const avg = nums.length
      ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1)
      : "—";
    const dist: Record<number, number> = {};
    for (const n of nums) dist[n] = (dist[n] ?? 0) + 1;
    const maxD = Math.max(...Object.values(dist), 1);
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
          <span className="text-sm font-semibold text-gray-900">{avg}</span>
          <span className="text-xs text-gray-500">
            avg · {nums.length} ratings
          </span>
        </div>
        <div className="flex items-end gap-1 h-8">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className="w-full bg-yellow-300 rounded-sm"
                style={{
                  height: `${Math.max(2, ((dist[n] ?? 0) / maxD) * 28)}px`,
                }}
              />
              <span className="text-[9px] text-gray-500">{n}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (
    field.type === "select" ||
    field.type === "radio"
  ) {
    const tally: Record<string, number> = {};
    for (const v of values) {
      if (Array.isArray(v)) {
        for (const item of v) tally[String(item)] = (tally[String(item)] ?? 0) + 1;
      } else if (v) {
        tally[String(v)] = (tally[String(v)] ?? 0) + 1;
      }
    }
    const entries = Object.entries(tally)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    const maxV = Math.max(...entries.map((e) => e[1]), 1);
    return (
      <div className="space-y-1.5">
        {entries.map(([opt, cnt]) => (
          <div key={opt}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-gray-700 truncate max-w-[140px]">{opt}</span>
              <span className="text-gray-500 tabular-nums">
                {filled > 0 ? Math.round((cnt / filled) * 100) : 0}%
              </span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full">
              <div
                className="h-full bg-gray-600 rounded-full"
                style={{ width: `${(cnt / maxV) * 100}%` }}
              />
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-xs text-gray-500">No responses</p>
        )}
      </div>
    );
  }

  const samples = values
    .filter((v) => v !== null && v !== undefined && v !== "")
    .slice(0, 3);
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1 bg-gray-100 rounded-full">
          <div
            className="h-full bg-gray-600 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 shrink-0">{pct}% filled</span>
      </div>
      {samples.map((v, i) => (
        <p
          key={i}
          className="text-xs text-gray-600 truncate border-l-2 border-gray-200 pl-2"
        >
          {String(v)}
        </p>
      ))}
    </div>
  );
}

// ─── Submission row ───────────────────────────────────────────────────────────

function SubmissionRow({
  sub,
  formConfig,
}: {
  sub: ParsedSubmission;
  formConfig: MultiStepFormConfig | null;
}) {
  const [expanded, setExpanded] = useState(false);

  const fieldLabelMap = useMemo(() => {
    const m: Record<string, string> = {};
    if (formConfig) {
      for (const step of formConfig.steps) {
        for (const f of step.fields) {
          m[f.id] = f.label || f.id;
        }
      }
    }
    return m;
  }, [formConfig]);

  const entries = Object.entries(sub.fieldValues).map(([k, v]) => ({
    label: fieldLabelMap[k] ?? k,
    value: v,
  }));

  const displayName =
    sub.submitterName || sub.submitterEmail || "Anonymous";
  const company = sub.jobCompanyName || sub.companyName;

  return (
    <div
      className={`rounded-lg border transition-all ${
        sub.isDraft
          ? "border-amber-100 bg-amber-50/30"
          : "border-gray-100 bg-white hover:border-gray-200"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 text-gray-400 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900 truncate">{displayName}</span>
            {sub.isDraft && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                Draft
              </span>
            )}
            {company && (
              <span className="text-xs text-gray-500 truncate max-w-[160px]">
                {company}{sub.jobTitle && ` · ${sub.jobTitle}`}
              </span>
            )}
            {sub.country && (
              <span className="text-xs text-gray-500">
                {sub.city ? `${sub.city}, ` : ""}{sub.country}
              </span>
            )}
          </div>
        </div>
        <span className="text-xs text-gray-500 shrink-0 tabular-nums">
          {new Date(sub.createdAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 bg-gray-50/80 border-t border-gray-100 space-y-2.5">
          {entries.length === 0 ? (
            <p className="text-xs text-gray-500 py-1">No field data</p>
          ) : (
            entries.map(({ label, value }, i) => (
              <div key={i} className="flex gap-4 text-sm">
                <span className="text-gray-500 font-medium min-w-[120px] max-w-[150px] shrink-0 truncate text-xs pt-px">
                  {label}
                </span>
                <span className="text-gray-800 break-words flex-1 text-xs">
                  {String(value ?? "—")}
                </span>
              </div>
            ))
          )}
          {sub.timeOnPageSeconds != null && (
            <div className="flex gap-4 text-xs pt-2 border-t border-gray-100">
              <span className="text-gray-500 min-w-[120px] shrink-0">Time on page</span>
              <span className="text-gray-600">{formatAvgTime(sub.timeOnPageSeconds)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Group block ──────────────────────────────────────────────────────────────

function GroupBlock({
  groupKey,
  subs,
  formConfig,
}: {
  groupKey: string;
  subs: ParsedSubmission[];
  formConfig: MultiStepFormConfig | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50/80 hover:bg-gray-100 transition-colors text-left"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
        <span className="text-sm font-semibold text-gray-900 flex-1">{groupKey}</span>
        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
          {subs.length}
        </span>
      </button>
      {open && (
        <div className="p-2 space-y-1.5 bg-white">
          {subs.map((s) => (
            <SubmissionRow key={s.id} sub={s} formConfig={formConfig} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FormAnalyticsView({
  pageId,
  showHeader = true,
}: {
  pageId: string;
  showHeader?: boolean;
}) {
  const router = useRouter();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsAPIData | null>(null);
  const [rawSubs, setRawSubs] = useState<RawSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Time range ──────────────────────────────────────────────────────────────
  const [timePreset, setTimePreset] = useState<TimePreset>("30d");
  const [customRange, setCustomRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [pendingCustomRange, setPendingCustomRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const lastClickedDayRef = useRef<Date | null>(null);

  // ── Segment filters ─────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<SegmentFilters>({});
  const [breakdown, setBreakdown] = useState<
    "country" | "device" | "source" | "company"
  >("country");

  // ── Field / table controls ──────────────────────────────────────────────────
  const [fieldFilter, setFieldFilter] = useState<
    "all" | "completed" | "abandoned"
  >("all");
  const [search, setSearch] = useState("");
  const [tableGroupBy, setTableGroupBy] = useState<
    "none" | "company" | "country" | "domain"
  >("none");
  const [tableDomainFilter, setTableDomainFilter] = useState("");
  const [tableCompanyFilter, setTableCompanyFilter] = useState("");
  const [tableStatusFilter, setTableStatusFilter] = useState<
    "all" | "completed" | "abandoned"
  >("all");
  const [tableCountryFilter, setTableCountryFilter] = useState("all");

  // ── Reset state ─────────────────────────────────────────────────────────────
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // ── Computed date range ─────────────────────────────────────────────────────
  const { from: rangeFrom, to: rangeTo } = useMemo(
    () => getDateRange(timePreset, customRange),
    [timePreset, customRange]
  );

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!pageId) return;
    setLoading(true);
    try {
      const fromStr = rangeFrom.toISOString().split("T")[0];
      const toStr = rangeTo.toISOString().split("T")[0];
      const [pageRes, analyticsRes, subsRes] = await Promise.all([
        fetch(`/api/feedback-pages/${pageId}`),
        fetch(`/api/feedback-pages/${pageId}/analytics?from=${fromStr}&to=${toStr}`),
        fetch(`/api/feedback-pages/${pageId}/submissions`),
      ]);
      if (pageRes.ok) setPageInfo(await pageRes.json());
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (subsRes.ok) {
        const s = await subsRes.json();
        setRawSubs(Array.isArray(s) ? s : s.submissions ?? []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [pageId, rangeFrom, rangeTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleReset = async () => {
    if (!pageId) return;
    setResetLoading(true);
    try {
      const res = await fetch(`/api/feedback-pages/${pageId}/submissions`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRawSubs([]);
        setShowResetConfirm(false);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResetLoading(false);
    }
  };

  const setFilter = (key: keyof SegmentFilters, value: string) => {
    setFilters((prev) => {
      if (prev[key] === value) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value as any };
    });
  };

  const removeFilter = (key: keyof SegmentFilters) => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // ── Derived data ────────────────────────────────────────────────────────────
  const { formConfig, urlPrefix: pageUrlPrefix } = useMemo(() => {
    if (!pageInfo?.customizations) return { formConfig: null, urlPrefix: "f" };
    try {
      const c = JSON.parse(pageInfo.customizations);
      return { formConfig: (c.formConfig ?? null) as MultiStepFormConfig | null, urlPrefix: c.urlPrefix?.trim() || "f" };
    } catch {
      return { formConfig: null, urlPrefix: "f" };
    }
  }, [pageInfo]);

  const allSubmissions = useMemo(() => rawSubs.map(parseSubmission), [rawSubs]);

  const timeFilteredSubs = useMemo(
    () =>
      allSubmissions.filter((s) => {
        const d = new Date(s.createdAt);
        return d >= rangeFrom && d <= rangeTo;
      }),
    [allSubmissions, rangeFrom, rangeTo]
  );

  const filteredSubs = useMemo(
    () =>
      timeFilteredSubs.filter((s) => {
        if (filters.country && s.country !== filters.country) return false;
        if (filters.device && parseDevice(s.userAgent) !== filters.device)
          return false;
        if (filters.source && parseSource(s.referer) !== filters.source)
          return false;
        const co = s.jobCompanyName || s.companyName;
        if (filters.company && co !== filters.company) return false;
        if (filters.status === "completed" && s.isDraft) return false;
        if (filters.status === "abandoned" && !s.isDraft) return false;
        return true;
      }),
    [timeFilteredSubs, filters]
  );

  const countryBreakdown = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of filteredSubs) {
      const k = s.country ?? "Unknown";
      m[k] = (m[k] ?? 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [filteredSubs]);

  const deviceBreakdown = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of filteredSubs) {
      const k = parseDevice(s.userAgent);
      m[k] = (m[k] ?? 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [filteredSubs]);

  const sourceBreakdown = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of filteredSubs) {
      const k = parseSource(s.referer);
      m[k] = (m[k] ?? 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [filteredSubs]);

  const companyBreakdown = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of filteredSubs) {
      const k = s.jobCompanyName || s.companyName;
      if (k) m[k] = (m[k] ?? 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [filteredSubs]);

  const fieldSubs = useMemo(
    () =>
      fieldFilter === "all"
        ? filteredSubs
        : filteredSubs.filter((s) =>
          fieldFilter === "completed" ? !s.isDraft : s.isDraft
        ),
    [filteredSubs, fieldFilter]
  );

  const fieldAnalytics = useMemo(() => {
    if (!formConfig) return [];
    return formConfig.steps.flatMap((step) =>
      step.fields
        .filter((f) => f.type !== "heading" && f.type !== "statement")
        .map((field) => ({
          field,
          stepTitle: step.title,
          values: fieldSubs.map((s) => s.fieldValues[field.id]),
        }))
    );
  }, [formConfig, fieldSubs]);

  const timeSeries = useMemo(() => {
    if (!analytics)
      return {
        views: new Map<string, number>(),
        starts: new Map<string, number>(),
        submissions: new Map<string, number>(),
      };
    return {
      views: new Map(analytics.timeSeries.views.map((v) => [v.date, v.count])),
      starts: new Map(
        (analytics.timeSeries.drafts ?? []).map((v) => [v.date, v.count])
      ),
      submissions: new Map(
        analytics.timeSeries.submissions.map((v) => [v.date, v.count])
      ),
    };
  }, [analytics]);

  const chartDateRange = useMemo(() => {
    const dates: string[] = [];
    const cur = new Date(rangeFrom);
    while (cur <= rangeTo) {
      dates.push(cur.toISOString().split("T")[0]);
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }, [rangeFrom, rangeTo]);

  const tableRows = useMemo(() => {
    let subs = filteredSubs;
    if (search.trim()) {
      const q = search.toLowerCase();
      subs = subs.filter(
        (s) =>
          (s.submitterName ?? "").toLowerCase().includes(q) ||
          (s.submitterEmail ?? "").toLowerCase().includes(q) ||
          (s.country ?? "").toLowerCase().includes(q) ||
          JSON.stringify(s.fieldValues).toLowerCase().includes(q)
      );
    }
    if (tableStatusFilter === "completed") subs = subs.filter((s) => !s.isDraft);
    if (tableStatusFilter === "abandoned") subs = subs.filter((s) => s.isDraft);
    if (tableCountryFilter !== "all")
      subs = subs.filter((s) => s.country === tableCountryFilter);
    if (tableDomainFilter.trim()) {
      const d = tableDomainFilter.toLowerCase().trim();
      subs = subs.filter(
        (s) =>
          (s.submitterEmail ?? "").toLowerCase().includes(d) ||
          (s.companyDomain ?? "").toLowerCase().includes(d)
      );
    }
    if (tableCompanyFilter.trim()) {
      const c = tableCompanyFilter.toLowerCase().trim();
      subs = subs.filter((s) =>
        (s.jobCompanyName ?? s.companyName ?? "").toLowerCase().includes(c)
      );
    }
    return subs;
  }, [
    filteredSubs,
    search,
    tableStatusFilter,
    tableCountryFilter,
    tableDomainFilter,
    tableCompanyFilter,
  ]);

  const groupedTableRows = useMemo(() => {
    if (tableGroupBy === "none") return null;
    const groups: Record<string, ParsedSubmission[]> = {};
    for (const s of tableRows) {
      let key = "Unknown";
      if (tableGroupBy === "company")
        key = s.jobCompanyName || s.companyName || "Unknown";
      else if (tableGroupBy === "country") key = s.country || "Unknown";
      else if (tableGroupBy === "domain")
        key = s.submitterEmail?.split("@")[1] || s.companyDomain || "Unknown";
      groups[key] = [...(groups[key] ?? []), s];
    }
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [tableRows, tableGroupBy]);

  const topCompanies = useMemo(() => companyBreakdown.slice(0, 8), [companyBreakdown]);

  const submittedSignals = useMemo(
    () =>
      new Set(
        allSubmissions
          .filter((s) => !s.isDraft)
          .map((s) => `${s.country}|${s.jobCompanyName || s.companyName || ""}`)
      ),
    [allSubmissions]
  );

  const highIntentLeads = useMemo(() => {
    if (!analytics?.recentViews) return [];
    const seenCompany = new Map<string, { country: string | null; visits: number }>();
    for (const v of analytics.recentViews) {
      const company = v.jobCompanyName || v.companyName;
      if (!company) continue;
      const signal = `${v.country}|${company}`;
      if (submittedSignals.has(signal)) continue;
      const existing = seenCompany.get(company);
      if (existing) {
        existing.visits++;
      } else {
        seenCompany.set(company, { country: v.country, visits: 1 });
      }
    }
    return Array.from(seenCompany.entries())
      .map(([company, data]) => ({ company, ...data }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 8);
  }, [analytics?.recentViews, submittedSignals]);

  const uniqueCountries = useMemo(() => {
    const s = new Set(
      filteredSubs.map((s) => s.country).filter(Boolean) as string[]
    );
    return Array.from(s).sort();
  }, [filteredSubs]);

  // ── KPI numbers ─────────────────────────────────────────────────────────────
  const totalViews = analytics?.totalViews ?? 0;
  const uniqueVisitors = analytics?.uniqueVisitors ?? 0;
  const totalSubs = analytics?.totalSubmissions ?? 0;
  const totalDrafts = analytics?.totalDrafts ?? 0;
  const avgTime = analytics?.averageTimeOnPage ?? 0;
  const abandonedCount = Math.max(0, uniqueVisitors - totalSubs);
  const conversionPct =
    totalViews > 0 ? ((totalSubs / totalViews) * 100).toFixed(1) : "0";
  const abandonPct =
    uniqueVisitors > 0
      ? ((abandonedCount / uniqueVisitors) * 100).toFixed(1)
      : "0";

  const comp = analytics?.comparison;
  const currConvPct = totalViews > 0 ? (totalSubs / totalViews) * 100 : 0;
  const prevConvPct =
    comp && comp.totalViews > 0
      ? (comp.totalSubmissions / comp.totalViews) * 100
      : 0;
  const convTrend = comp
    ? pctChange(Math.round(currConvPct * 10), Math.round(prevConvPct * 10))
    : null;

  // CSV export
  const handleExportCSV = () => {
    if (tableRows.length === 0) return;
    const fieldLabelMap: Record<string, string> = {};
    if (formConfig) {
      for (const step of formConfig.steps) {
        for (const field of step.fields)
          fieldLabelMap[field.id] = field.label || field.id;
      }
    }
    const allKeys = Array.from(
      new Set(tableRows.flatMap((s) => Object.keys(s.fieldValues)))
    );
    const headers = [
      "Date",
      "Status",
      "Name",
      "Email",
      "Country",
      "City",
      "Job Title",
      "Company",
      "Domain",
      "Time on Page",
      ...allKeys.map((k) => fieldLabelMap[k] ?? k),
    ];
    const rows = tableRows.map((s) => [
      new Date(s.createdAt).toLocaleString(),
      s.isDraft ? "Draft" : "Submitted",
      s.submitterName ?? "",
      s.submitterEmail ?? "",
      s.country ?? "",
      s.city ?? "",
      s.jobTitle ?? "",
      s.jobCompanyName || s.companyName || "",
      s.companyDomain ?? "",
      s.timeOnPageSeconds ? formatAvgTime(s.timeOnPageSeconds) : "",
      ...allKeys.map((k) => {
        const v = s.fieldValues[k];
        return v != null ? String(v) : "";
      }),
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pageInfo?.title ?? "responses"}-${new Date().toISOString().split("T")[0]
      }.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeFilterChips = Object.entries(filters).map(([key, val]) => ({
    key: key as keyof SegmentFilters,
    val: String(val),
  }));

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
      </div>
    );
  }

  // ─── Constants for render ─────────────────────────────────────────────────

  const presets: { label: string; value: TimePreset }[] = [
    { label: "Today", value: "today" },
    { label: "7D", value: "7d" },
    { label: "30D", value: "30d" },
    { label: "90D", value: "90d" },
    { label: "Custom", value: "custom" },
  ];

  const breakdownData = {
    country: countryBreakdown.map(([label, count]) => ({ label, count })),
    device: deviceBreakdown.map(([label, count]) => ({ label, count })),
    source: sourceBreakdown.map(([label, count]) => ({ label, count })),
    company: companyBreakdown.map(([label, count]) => ({ label, count })),
  };

  const breakdownFilterKey: Record<typeof breakdown, keyof SegmentFilters> = {
    country: "country",
    device: "device",
    source: "source",
    company: "company",
  };

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-12">

      {/* Header */}
      <div className="space-y-4">
        {showHeader && (
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard/feedback-pages/${pageId}`)}
              className="h-8 px-2 text-xs text-gray-600 hover:text-gray-900 shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Edit form
            </Button>
            <h1 className="text-xl font-semibold text-gray-950 truncate flex-1 min-w-0">
              {pageInfo?.title ?? "Analytics"}
            </h1>
            {pageInfo?.slug && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs shrink-0"
                onClick={() => window.open(`/${pageUrlPrefix}/${pageInfo.slug}`, "_blank")}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View live
              </Button>
            )}
          </div>
        )}

        {/* Time range */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
            {presets.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => {
                  setTimePreset(p.value);
                  if (p.value !== "custom") setDatePickerOpen(false);
                }}
                className={`px-3.5 py-2 text-xs font-medium transition-colors border-r border-gray-200 last:border-r-0 ${
                  timePreset === p.value
                    ? "bg-gray-950 text-white"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {timePreset === "custom" && (
            <Popover
              open={datePickerOpen}
              onOpenChange={(open) => {
                if (open) setPendingCustomRange(customRange);
                setDatePickerOpen(open);
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                >
                  <CalendarDays className="h-3 w-3" />
                  {customRange.from
                    ? customRange.to
                      ? `${format(customRange.from, "MMM d")} – ${format(
                        customRange.to,
                        "MMM d, yyyy"
                      )}`
                      : format(customRange.from, "MMM d, yyyy")
                    : "Pick a range"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={pendingCustomRange}
                  onDayClick={(day) => { lastClickedDayRef.current = day; }}
                  onSelect={(range) => {
                    if (pendingCustomRange.from && pendingCustomRange.to) {
                      // Complete range already set — restart with the clicked day as new start
                      setPendingCustomRange({ from: lastClickedDayRef.current ?? range?.from, to: undefined });
                    } else {
                      setPendingCustomRange(range ?? { from: undefined, to: undefined });
                    }
                  }}
                  numberOfMonths={2}
                />
                <div className="px-3 pb-3 pt-2 flex items-center justify-between gap-2 border-t border-gray-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-3 text-xs text-gray-500 hover:text-gray-600"
                    onClick={() => {
                      setPendingCustomRange({ from: undefined, to: undefined });
                      lastClickedDayRef.current = null;
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 px-3 text-xs"
                    disabled={!pendingCustomRange.from || !pendingCustomRange.to}
                    onClick={() => {
                      setCustomRange(pendingCustomRange);
                      setDatePickerOpen(false);
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          <span className="text-sm text-gray-500">
            {format(rangeFrom, "MMM d")} – {format(rangeTo, "MMM d, yyyy")}
          </span>
        </div>

        {/* Active filter chips */}
        {activeFilterChips.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">Filters:</span>
            {activeFilterChips.map(({ key, val }) => (
              <button
                key={key}
                type="button"
                onClick={() => removeFilter(key)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-950 text-white text-xs rounded-full hover:bg-gray-700 transition-colors"
              >
                <span className="text-gray-400 capitalize">{key}:</span> {val}
                <X className="h-3 w-3 ml-0.5 text-gray-400" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFilters({})}
              className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 xl:grid-cols-5">
        <KpiCard
          label="Total views"
          value={totalViews.toLocaleString()}
          sub={`${uniqueVisitors.toLocaleString()} unique`}
          trend={comp ? pctChange(totalViews, comp.totalViews) : undefined}
        />
        <KpiCard
          label="Unique visitors"
          value={uniqueVisitors.toLocaleString()}
          trend={
            comp ? pctChange(uniqueVisitors, comp.uniqueVisitors) : undefined
          }
        />
        <KpiCard
          label="Submissions"
          value={totalSubs.toLocaleString()}
          sub={`${conversionPct}% conversion`}
          trend={convTrend}
          active={filters.status === "completed"}
          onClick={() => setFilter("status", "completed")}
        />
        <KpiCard
          label="Abandoned"
          value={abandonedCount.toLocaleString()}
          sub={`${abandonPct}% drop-off`}
          trend={
            comp
              ? pctChange(
                abandonedCount,
                Math.max(0, comp.uniqueVisitors - comp.totalSubmissions)
              )
              : undefined
          }
          active={filters.status === "abandoned"}
          onClick={() => setFilter("status", "abandoned")}
        />
        <KpiCard
          label="Avg. time on page"
          value={formatAvgTime(avgTime)}
          trend={
            comp ? pctChange(avgTime, comp.averageTimeOnPage) : undefined
          }
        />
      </div>

      {/* Chart + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-semibold text-gray-900">Activity over time</p>
              <p className="text-xs text-gray-500 mt-0.5">Views, starts, and submissions</p>
            </div>
          </div>
          {chartDateRange.length > 1 ? (
            <MultiLineChart
              dateRange={chartDateRange}
              views={timeSeries.views}
              starts={timeSeries.starts}
              submissions={timeSeries.submissions}
              height={210}
            />
          ) : (
            <div className="h-40 flex items-center justify-center text-sm text-gray-500">
              No data for this range
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="mb-5">
            <p className="text-sm font-semibold text-gray-900">Conversion funnel</p>
            <p className="text-xs text-gray-500 mt-0.5">Drop-off at each stage</p>
          </div>
          <FunnelChart
            views={totalViews}
            starts={Math.min(totalViews, totalDrafts + totalSubs)}
            submitted={Math.min(totalViews, totalSubs)}
          />
        </div>
      </div>

      {/* Breakdown tabs */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center border-b border-gray-100 px-2">
          {(["country", "device", "source", "company"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setBreakdown(tab)}
              className={`flex items-center gap-1.5 px-3 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px capitalize ${
                breakdown === tab
                  ? "border-gray-950 text-gray-950"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab === "country" && <Globe className="h-3.5 w-3.5" />}
              {tab === "device" && <Monitor className="h-3.5 w-3.5" />}
              {tab === "source" && <ArrowUpRight className="h-3.5 w-3.5" />}
              {tab === "company" && <Building2 className="h-3.5 w-3.5" />}
              {tab}
            </button>
          ))}
          <span className="text-xs text-gray-500 ml-auto pr-2">Click a row to filter</span>
        </div>
        <div className="p-5">
          <BreakdownList
            items={breakdownData[breakdown]}
            selected={filters[breakdownFilterKey[breakdown]]}
            onSelect={(label) => setFilter(breakdownFilterKey[breakdown], label)}
          />
        </div>
      </div>

      {/* Per-field analytics */}
      {fieldAnalytics.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Response breakdown</p>
              <p className="text-xs text-gray-500 mt-0.5">Aggregated answers per field</p>
            </div>
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              {(["all", "completed", "abandoned"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFieldFilter(f)}
                  className={`px-3.5 py-1.5 text-xs font-medium transition-colors capitalize border-r border-gray-200 last:border-r-0 ${
                    fieldFilter === f
                      ? "bg-gray-950 text-white"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y divide-x divide-gray-50">
            {fieldAnalytics.map(({ field, stepTitle, values }) => (
              <div key={field.id} className="p-5">
                <div className="mb-3">
                  <p className="text-sm font-semibold text-gray-900 truncate">{field.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {stepTitle} · {values.filter((v) => v != null && v !== "").length}/{fieldSubs.length} responded
                  </p>
                </div>
                <FieldAnalytics field={field} values={values} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attribution insights */}
      {(topCompanies.length > 0 || highIntentLeads.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {topCompanies.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-5">
                <Building2 className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Top companies</p>
                  <p className="text-xs text-gray-500">By submission count</p>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {topCompanies.map(([company, cnt]) => {
                  const maxCnt = topCompanies[0][1];
                  return (
                    <div key={company} className="flex items-center gap-3 py-2.5">
                      <span className="text-sm text-gray-800 min-w-0 truncate flex-1">{company}</span>
                      <div className="w-20 h-1.5 bg-gray-100 rounded-full shrink-0">
                        <div
                          className="h-full bg-gray-900 rounded-full"
                          style={{ width: `${(cnt / maxCnt) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-600 tabular-nums w-6 text-right shrink-0">{cnt}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {highIntentLeads.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">High-intent leads</p>
                  <p className="text-xs text-gray-500">Visited but didn&apos;t submit</p>
                </div>
              </div>
              <div className="divide-y divide-gray-50 mt-5">
                {highIntentLeads.map(({ company, country, visits }) => (
                  <div key={company} className="flex items-center gap-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900 truncate block">{company}</span>
                      {country && <span className="text-xs text-gray-500">{country}</span>}
                    </div>
                    <span className="text-xs text-gray-500 tabular-nums shrink-0">
                      {visits} visit{visits !== 1 ? "s" : ""}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 shrink-0">
                      No submission
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Responses table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Responses
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {tableRows.length}
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">All submissions in the selected period</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={handleExportCSV}
                disabled={tableRows.length === 0}
              >
                <Download className="h-3 w-3 mr-1" />
                Export CSV
              </Button>
              {!showResetConfirm ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs text-red-600 hover:text-red-700 hover:border-red-300"
                  onClick={() => setShowResetConfirm(true)}
                  disabled={allSubmissions.length === 0}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-red-600 font-medium">
                    Delete all?
                  </span>
                  <Button
                    size="sm"
                    className="h-7 text-xs px-2 bg-red-600 hover:bg-red-700 text-white"
                    onClick={handleReset}
                    disabled={resetLoading}
                  >
                    {resetLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Confirm"
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => setShowResetConfirm(false)}
                    disabled={resetLoading}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Filter controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                className="h-8 text-xs pl-8 w-40"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="relative">
              <select
                value={tableStatusFilter}
                onChange={(e) =>
                  setTableStatusFilter(e.target.value as any)
                }
                className="h-8 text-xs pl-2 pr-7 rounded-md border border-gray-200 bg-white appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-400"
              >
                <option value="all">All statuses</option>
                <option value="completed">Completed</option>
                <option value="abandoned">Abandoned/Draft</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
            </div>

            {uniqueCountries.length > 0 && (
              <div className="relative">
                <select
                  value={tableCountryFilter}
                  onChange={(e) => setTableCountryFilter(e.target.value)}
                  className="h-8 text-xs pl-2 pr-7 rounded-md border border-gray-200 bg-white appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-400"
                >
                  <option value="all">All countries</option>
                  {uniqueCountries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
              </div>
            )}

            <div className="relative">
              <select
                value={tableGroupBy}
                onChange={(e) => setTableGroupBy(e.target.value as any)}
                className="h-8 text-xs pl-2 pr-7 rounded-md border border-gray-200 bg-white appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-400"
              >
                <option value="none">No grouping</option>
                <option value="company">Group by company</option>
                <option value="country">Group by country</option>
                <option value="domain">Group by domain</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
            </div>

            <Input
              className="h-8 text-xs w-32"
              placeholder="Domain filter…"
              value={tableDomainFilter}
              onChange={(e) => setTableDomainFilter(e.target.value)}
            />
            <Input
              className="h-8 text-xs w-32"
              placeholder="Company filter…"
              value={tableCompanyFilter}
              onChange={(e) => setTableCompanyFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="px-4 py-3 space-y-1.5">
          {groupedTableRows ? (
            groupedTableRows.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">
                No results.
              </div>
            ) : (
              groupedTableRows.map(([groupKey, groupSubs]) => (
                <GroupBlock
                  key={groupKey}
                  groupKey={groupKey}
                  subs={groupSubs}
                  formConfig={formConfig}
                />
              ))
            )
          ) : tableRows.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500">
                {allSubmissions.length === 0 ? "No submissions yet." : "No results for your filters."}
              </p>
            </div>
          ) : (
            tableRows.map((s) => (
              <SubmissionRow key={s.id} sub={s} formConfig={formConfig} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
