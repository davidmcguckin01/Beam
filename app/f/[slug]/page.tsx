"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  CheckCircle2,
  Star,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import {
  FormField,
  FormStep,
  ExitCondition,
  MultiStepFormConfig,
  FieldValues,
  StatementFieldValue,
  PhoneField,
  AddressField,
} from "@/lib/form-builder-types";

const COUNTRY_CODES = [
  { code: "+1", flag: "🇺🇸", label: "US" },
  { code: "+44", flag: "🇬🇧", label: "UK" },
  { code: "+61", flag: "🇦🇺", label: "AU" },
  { code: "+33", flag: "🇫🇷", label: "FR" },
  { code: "+49", flag: "🇩🇪", label: "DE" },
  { code: "+81", flag: "🇯🇵", label: "JP" },
  { code: "+86", flag: "🇨🇳", label: "CN" },
  { code: "+91", flag: "🇮🇳", label: "IN" },
  { code: "+55", flag: "🇧🇷", label: "BR" },
  { code: "+52", flag: "🇲🇽", label: "MX" },
  { code: "+82", flag: "🇰🇷", label: "KR" },
  { code: "+39", flag: "🇮🇹", label: "IT" },
  { code: "+34", flag: "🇪🇸", label: "ES" },
  { code: "+31", flag: "🇳🇱", label: "NL" },
  { code: "+46", flag: "🇸🇪", label: "SE" },
  { code: "+47", flag: "🇳🇴", label: "NO" },
  { code: "+45", flag: "🇩🇰", label: "DK" },
  { code: "+353", flag: "🇮🇪", label: "IE" },
  { code: "+64", flag: "🇳🇿", label: "NZ" },
  { code: "+65", flag: "🇸🇬", label: "SG" },
  { code: "+971", flag: "🇦🇪", label: "AE" },
  { code: "+966", flag: "🇸🇦", label: "SA" },
  { code: "+27", flag: "🇿🇦", label: "ZA" },
  { code: "+234", flag: "🇳🇬", label: "NG" },
  { code: "+254", flag: "🇰🇪", label: "KE" },
  { code: "+63", flag: "🇵🇭", label: "PH" },
  { code: "+66", flag: "🇹🇭", label: "TH" },
  { code: "+60", flag: "🇲🇾", label: "MY" },
  { code: "+62", flag: "🇮🇩", label: "ID" },
  { code: "+48", flag: "🇵🇱", label: "PL" },
  { code: "+41", flag: "🇨🇭", label: "CH" },
  { code: "+43", flag: "🇦🇹", label: "AT" },
  { code: "+32", flag: "🇧🇪", label: "BE" },
  { code: "+351", flag: "🇵🇹", label: "PT" },
  { code: "+7", flag: "🇷🇺", label: "RU" },
  { code: "+380", flag: "🇺🇦", label: "UA" },
  { code: "+90", flag: "🇹🇷", label: "TR" },
  { code: "+972", flag: "🇮🇱", label: "IL" },
  { code: "+20", flag: "🇪🇬", label: "EG" },
  { code: "+54", flag: "🇦🇷", label: "AR" },
  { code: "+56", flag: "🇨🇱", label: "CL" },
  { code: "+57", flag: "🇨🇴", label: "CO" },
  { code: "+358", flag: "🇫🇮", label: "FI" },
  { code: "+420", flag: "🇨🇿", label: "CZ" },
  { code: "+36", flag: "🇭🇺", label: "HU" },
  { code: "+40", flag: "🇷🇴", label: "RO" },
];

// ─── Branding ────────────────────────────────────────────────────────────────

function PoweredByApp() {
  return (
    <div className="flex items-center justify-center pt-4 pb-2">
      <a
        href="https://example.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-500 transition-colors"
      >
        Powered by <span className="font-semibold text-gray-500">App</span>
      </a>
    </div>
  );
}

// ─── Session ──────────────────────────────────────────────────────────────────

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sessionId = sessionStorage.getItem("feedback_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    sessionStorage.setItem("feedback_session_id", sessionId);
  }
  return sessionId;
}

// ─── Color utils ──────────────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  const sanitized = hex?.replace("#", "");
  if (!sanitized || ![3, 6].includes(sanitized.length)) return null;
  const normalized =
    sanitized.length === 3
      ? sanitized
        .split("")
        .map((c) => c + c)
        .join("")
      : sanitized;
  const bigint = Number.parseInt(normalized, 16);
  if (Number.isNaN(bigint)) return null;
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function blendWithWhite(hex: string, amount: number) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex || "#ffffff";
  const blend = (ch: number) => Math.round(ch + (255 - ch) * amount);
  return `rgba(${blend(rgb.r)}, ${blend(rgb.g)}, ${blend(rgb.b)}, 1)`;
}

function rgbaWithOpacity(rgba: string, opacity: number): string {
  return rgba.replace(/,\s*[\d.]+\)$/, `, ${opacity})`);
}

// ─── Condition evaluation ─────────────────────────────────────────────────────

function evaluateCondition(
  condition: ExitCondition,
  fieldValues: FieldValues
): boolean {
  const raw = fieldValues[condition.fieldId];
  const value = raw === undefined ? null : raw;
  switch (condition.operator) {
    case "any":
      return value !== null && value !== "" && value !== undefined;
    case "equals":
      return String(value) === String(condition.value ?? "");
    case "not_equals":
      return String(value) !== String(condition.value ?? "");
    case "greater_than":
      return Number(value) > Number(condition.value ?? 0);
    case "gte":
      return Number(value) >= Number(condition.value ?? 0);
    case "less_than":
      return Number(value) < Number(condition.value ?? 0);
    case "lte":
      return Number(value) <= Number(condition.value ?? 0);
    case "contains":
      return String(value)
        .toLowerCase()
        .includes(String(condition.value ?? "").toLowerCase());
    default:
      return false;
  }
}

function resolveNextStep(
  step: FormStep,
  stepIndex: number,
  allSteps: FormStep[],
  fieldValues: FieldValues
): { type: "step"; stepId: string } | { type: "end" } | { type: "url"; url: string } {
  for (const cond of step.exitConditions ?? []) {
    if (evaluateCondition(cond, fieldValues)) {
      if (cond.targetStepId === "end") return { type: "end" };
      return { type: "step", stepId: cond.targetStepId };
    }
  }
  // No condition matched — use step-level defaultTarget
  if (step.defaultTarget?.type === "step" && step.defaultTarget.stepId) {
    return { type: "step", stepId: step.defaultTarget.stepId };
  }
  if (step.defaultTarget?.type === "url" && step.defaultTarget.url) {
    return { type: "url", url: step.defaultTarget.url };
  }
  if (step.defaultTarget?.type === "end") {
    return { type: "end" };
  }
  if (stepIndex + 1 < allSteps.length) {
    return { type: "step", stepId: allSteps[stepIndex + 1].id };
  }
  return { type: "end" };
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface FeedbackPage {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  customizations: string | null;
  isActive: boolean;
  requiresAccess?: boolean;
}

interface ParsedCustomizations {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  buttonTextColor: string;
  backgroundPattern?: string;
  formConfig?: MultiStepFormConfig;
  successTitle?: string;
  successMessage?: string;
}

// ─── Field label helper ───────────────────────────────────────────────────────

function FieldLabel({ field }: { field: FormField }) {
  if (field.type === "heading" || field.type === "statement") return null;
  return (
    <Label className="text-sm font-medium text-gray-700">
      {field.label}
      {field.required && <span className="text-red-400 ml-1">*</span>}
    </Label>
  );
}

// ─── Field renderer ───────────────────────────────────────────────────────────

interface FieldRendererProps {
  field: FormField;
  value: unknown;
  onChange: (val: unknown) => void;
  error?: string;
  buttonColor: string;
}

function FieldRenderer({
  field,
  value,
  onChange,
  error,
  buttonColor,
}: FieldRendererProps) {
  const baseInput =
    "w-full rounded-lg border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-gray-300 transition-colors text-sm";
  const errCls = error ? "border-red-400 focus:border-red-400" : "";

  switch (field.type) {
    case "heading": {
      const sizes: Record<number, string> = {
        1: "text-2xl",
        2: "text-xl",
        3: "text-lg",
      };
      const lvl = (field as { level?: number }).level ?? 2;
      return (
        <div className={`font-semibold text-gray-900 ${sizes[lvl] ?? "text-xl"}`}>
          {field.label}
        </div>
      );
    }

    case "statement": {
      const sf = field as {
        content: string;
        linkText?: string;
        linkUrl?: string;
      };
      const sv = (value as StatementFieldValue | undefined) ?? {
        shown: true,
        linkClicked: false,
      };
      return (
        <div className="space-y-4">
          <p className="text-sm text-gray-700 leading-relaxed">{sf.content}</p>
          {sf.linkUrl && sf.linkText && (
            <a
              href={sf.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                onChange({
                  shown: true,
                  linkClicked: true,
                } as StatementFieldValue)
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {sf.linkText}
              <ExternalLink className="h-3.5 w-3.5 text-gray-500" />
            </a>
          )}
          {sv.linkClicked && sf.linkUrl && (
            <p className="text-xs text-green-600">Thanks for clicking!</p>
          )}
        </div>
      );
    }

    case "short_text":
      return (
        <div className="space-y-1.5">
          <FieldLabel field={field} />
          <Input
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={`${baseInput} h-11 ${errCls}`}
          />
          {field.helpText && (
            <p className="text-xs text-gray-500">{field.helpText}</p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      );

    case "long_text":
      return (
        <div className="space-y-1.5">
          <FieldLabel field={field} />
          <Textarea
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={(field as { rows?: number }).rows ?? 4}
            className={`${baseInput} resize-none ${errCls}`}
          />
          {field.helpText && (
            <p className="text-xs text-gray-500">{field.helpText}</p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      );

    case "email":
      return (
        <div className="space-y-1.5">
          <FieldLabel field={field} />
          <Input
            type="email"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={`${baseInput} h-11 ${errCls}`}
          />
          {field.helpText && (
            <p className="text-xs text-gray-500">{field.helpText}</p>
          )}
          {!field.helpText && (
            <p className="text-xs text-gray-500">Providing your email helps us personalise your experience</p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      );

    case "number":
      return (
        <div className="space-y-1.5">
          <FieldLabel field={field} />
          <Input
            type="number"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            min={(field as { min?: number }).min}
            max={(field as { max?: number }).max}
            className={`${baseInput} h-11 ${errCls}`}
          />
          {field.helpText && (
            <p className="text-xs text-gray-500">{field.helpText}</p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      );

    case "rating": {
      const rf = field as {
        minValue: number;
        maxValue: number;
        ratingStyle: "stars" | "numbers";
      };
      const current = (value as number) ?? 0;
      const values = Array.from(
        { length: rf.maxValue - rf.minValue + 1 },
        (_, i) => rf.minValue + i
      );
      return (
        <div className="space-y-2">
          <FieldLabel field={field} />
          {rf.ratingStyle === "stars" ? (
            <div className="flex gap-1">
              {values.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onChange(v)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${v <= current
                        ? "fill-amber-400 text-amber-400"
                        : "text-gray-200 fill-gray-100 hover:text-amber-300"
                      }`}
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 items-center">
              {rf.minValue === 0 && (
                <span className="text-xs text-gray-500 mr-1">Not at all</span>
              )}
              {values.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onChange(v)}
                  className={`h-10 w-10 rounded-lg border text-sm font-medium transition-all ${v === current
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                >
                  {v}
                </button>
              ))}
              {rf.maxValue >= 10 && (
                <span className="text-xs text-gray-500 ml-1">Extremely likely</span>
              )}
            </div>
          )}
          {field.helpText && (
            <p className="text-xs text-gray-500">{field.helpText}</p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      );
    }

    case "select": {
      const opts = (field as { options?: string[] }).options ?? [];
      return (
        <div className="space-y-1.5">
          <FieldLabel field={field} />
          <select
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full h-11 rounded-lg border border-gray-200 bg-gray-50/50 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 ${errCls}`}
          >
            <option value="">Select an option...</option>
            {opts.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {field.helpText && (
            <p className="text-xs text-gray-500">{field.helpText}</p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      );
    }

    case "radio": {
      const opts = (field as { options?: string[] }).options ?? [];
      return (
        <div className="space-y-2">
          <FieldLabel field={field} />
          <div className="space-y-2">
            {opts.map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div
                  className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${value === opt ? "border-gray-900" : "border-gray-300"
                    }`}
                >
                  {value === opt && (
                    <div className="h-2 w-2 rounded-full bg-gray-900" />
                  )}
                </div>
                <input
                  type="radio"
                  value={opt}
                  checked={value === opt}
                  onChange={() => onChange(opt)}
                  className="sr-only"
                />
                <span className="text-sm text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
          {field.helpText && (
            <p className="text-xs text-gray-500">{field.helpText}</p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      );
    }

    case "checkbox":
      return (
        <div className="space-y-1.5">
          <label className="flex items-start gap-3 cursor-pointer">
            <div
              className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${value ? "border-gray-900 bg-gray-900" : "border-gray-300"
                }`}
              onClick={() => onChange(!value)}
            >
              {!!value && (
                <svg
                  className="h-3 w-3 text-white"
                  viewBox="0 0 12 12"
                  fill="none"
                >
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <div>
              <span className="text-sm text-gray-700">{field.label}</span>
              {field.required && (
                <span className="text-red-400 ml-1">*</span>
              )}
            </div>
          </label>
          {field.helpText && (
            <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      );

    case "phone": {
      const pf = field as PhoneField;
      const phoneVal = (value as { countryCode?: string; number?: string }) ?? { countryCode: pf.countryCode || "+1", number: "" };
      return (
        <div className="space-y-1.5">
          <FieldLabel field={field} />
          <div className="flex gap-2">
            <select
              value={phoneVal.countryCode || "+1"}
              onChange={(e) => onChange({ ...phoneVal, countryCode: e.target.value })}
              className={`${baseInput} h-11 w-24 px-2 appearance-none cursor-pointer`}
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
            <Input
              type="tel"
              value={phoneVal.number || ""}
              onChange={(e) => onChange({ ...phoneVal, number: e.target.value })}
              placeholder={field.placeholder || "Phone number"}
              className={`${baseInput} h-11 flex-1 ${errCls}`}
            />
          </div>
          {field.helpText && <p className="text-xs text-gray-500">{field.helpText}</p>}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      );
    }

    case "address": {
      const addrVal = (value as { street?: string; city?: string; state?: string; zip?: string; country?: string }) ?? {};
      const updateAddr = (key: string, v: string) => onChange({ ...addrVal, [key]: v });
      return (
        <div className="space-y-1.5">
          <FieldLabel field={field} />
          <div className="space-y-2">
            <Input
              value={addrVal.street || ""}
              onChange={(e) => updateAddr("street", e.target.value)}
              placeholder="Street address"
              className={`${baseInput} h-11 ${errCls}`}
            />
            <div className="flex gap-2">
              <Input
                value={addrVal.city || ""}
                onChange={(e) => updateAddr("city", e.target.value)}
                placeholder="City"
                className={`${baseInput} h-11 flex-1 ${errCls}`}
              />
              <Input
                value={addrVal.state || ""}
                onChange={(e) => updateAddr("state", e.target.value)}
                placeholder="State / Province"
                className={`${baseInput} h-11 flex-1 ${errCls}`}
              />
            </div>
            <div className="flex gap-2">
              <Input
                value={addrVal.zip || ""}
                onChange={(e) => updateAddr("zip", e.target.value)}
                placeholder="ZIP / Postal code"
                className={`${baseInput} h-11 w-36 ${errCls}`}
              />
              <select
                value={addrVal.country || ""}
                onChange={(e) => updateAddr("country", e.target.value)}
                className={`${baseInput} h-11 flex-1 px-2.5 appearance-none cursor-pointer ${!addrVal.country ? "text-gray-500" : ""}`}
              >
                <option value="">Country</option>
                {COUNTRY_CODES.map((c) => (
                  <option key={c.label} value={c.label}>
                    {c.flag} {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {field.helpText && <p className="text-xs text-gray-500">{field.helpText}</p>}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      );
    }

    default:
      return null;
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PublicFeedbackPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const isPreview = searchParams.get("preview") === "true";

  const [page, setPage] = useState<FeedbackPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pageLoadTime = useRef<number>(Date.now());
  const viewTracked = useRef<boolean>(false);
  const draftIdRef = useRef<string | null>(null);
  const saveInProgressRef = useRef<boolean>(false);

  const [requiresAccess, setRequiresAccess] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessEmail, setAccessEmail] = useState("");
  const [accessError, setAccessError] = useState<string | null>(null);
  const [accessSubmitting, setAccessSubmitting] = useState(false);

  const [customizations, setCustomizations] = useState<ParsedCustomizations>({
    primaryColor: "#000000",
    backgroundColor: "#ffffff",
    textColor: "#000000",
    buttonColor: "#000000",
    buttonTextColor: "#ffffff",
    backgroundPattern: "none",
  });

  const [stepHistory, setStepHistory] = useState<string[]>([]);
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<FieldValues>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const allSteps: FormStep[] = customizations.formConfig?.steps ?? [];
  const currentStepIndex = allSteps.findIndex((s) => s.id === currentStepId);
  const currentStep: FormStep | null =
    currentStepIndex >= 0 ? allSteps[currentStepIndex] : null;
  const totalSteps = allSteps.length;
  const currentStepNumber = stepHistory.length + 1;

  // ── Background gradient ─────────────────────────────────────────────────

  const getPatternStyle = (pattern: string, primary: string) => {
    const col = rgbaWithOpacity(blendWithWhite(primary, 0.98), 0.1);
    switch (pattern) {
      case "dots":
        return {
          backgroundImage: `radial-gradient(circle, ${col} 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        };
      case "grid":
        return {
          backgroundImage: `linear-gradient(${col} 1px, transparent 1px), linear-gradient(90deg, ${col} 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        };
      case "mesh":
        return {
          backgroundImage: `linear-gradient(${col} 1px, transparent 1px), linear-gradient(90deg, ${col} 1px, transparent 1px), linear-gradient(45deg, ${col} 0.5px, transparent 0.5px), linear-gradient(-45deg, ${col} 0.5px, transparent 0.5px)`,
          backgroundSize: "40px 40px, 40px 40px, 20px 20px, 20px 20px",
        };
      case "diagonal":
        return {
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, ${col} 10px, ${col} 11px)`,
        };
      case "waves":
        return {
          backgroundImage: `radial-gradient(ellipse at top, ${col}, transparent 50%), radial-gradient(ellipse at bottom, ${col}, transparent 50%)`,
          backgroundSize: "100% 50px",
          backgroundRepeat: "repeat-y",
        };
      default:
        return {};
    }
  };

  const gradientBackground = useMemo(() => {
    const base = customizations.backgroundColor ?? "#ffffff";
    const primary = customizations.primaryColor ?? "#000000";
    const pattern = customizations.backgroundPattern ?? "none";
    const t1 = blendWithWhite(primary, 0.95);
    const t2 = blendWithWhite(primary, 0.97);
    const gradient = `linear-gradient(135deg, ${base} 0%, ${t2} 20%, ${t1} 50%, ${t2} 80%, ${base} 100%)`;
    const ps = getPatternStyle(pattern, primary);
    if (pattern !== "none" && ps.backgroundImage) {
      return {
        background: `${gradient}, ${ps.backgroundImage}`,
        backgroundSize: ps.backgroundSize || "auto",
        backgroundRepeat: ps.backgroundRepeat || "repeat",
      };
    }
    return { background: gradient };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    customizations.backgroundColor,
    customizations.primaryColor,
    customizations.backgroundPattern,
  ]);

  // ── Load page ───────────────────────────────────────────────────────────

  const loadPage = async () => {
    setLoading(true);
    setError(null);
    setRequiresAccess(false);
    setHasAccess(false);
    viewTracked.current = false;
    try {
      const response = await fetch(`/api/feedback-pages/slug/${slug}`);
      if (!response.ok) {
        setError("Form not found");
        return;
      }
      const data: FeedbackPage = await response.json();
      setPage(data);
      const needsAccess = Boolean(data.requiresAccess);
      setRequiresAccess(needsAccess);
      if (!needsAccess) setHasAccess(true);

      const parseCustom = (raw: string): Partial<ParsedCustomizations> => {
        try {
          return JSON.parse(raw);
        } catch {
          return {};
        }
      };

      const defaults: ParsedCustomizations = {
        primaryColor: "#000000",
        backgroundColor: "#ffffff",
        textColor: "#000000",
        buttonColor: "#000000",
        buttonTextColor: "#ffffff",
        backgroundPattern: "none",
        successTitle: "",
        successMessage: "",
      };

      let custom: ParsedCustomizations = { ...defaults };

      if (isPreview) {
        const paramStr = searchParams.get("customizations");
        if (paramStr) {
          const parsed = parseCustom(decodeURIComponent(paramStr));
          custom = { ...defaults, ...parsed };
          if ((parsed as { title?: string }).title !== undefined) {
            setPage((prev) =>
              prev
                ? { ...prev, title: (parsed as { title: string }).title }
                : prev
            );
          }
          if ((parsed as { description?: string }).description !== undefined) {
            setPage((prev) =>
              prev
                ? {
                  ...prev,
                  description: (parsed as { description: string }).description,
                }
                : prev
            );
          }
        } else if (data.customizations) {
          custom = { ...defaults, ...parseCustom(data.customizations) };
        }
      } else if (data.customizations) {
        custom = { ...defaults, ...parseCustom(data.customizations) };
      }

      setCustomizations(custom);

      // Restore draft ID from sessionStorage if user reloads mid-form
      const savedDraftId = sessionStorage.getItem(`draft_${data.id}`);
      if (savedDraftId) draftIdRef.current = savedDraftId;

      const fc = custom.formConfig;
      if (fc && fc.steps.length > 0) {
        setCurrentStepId(fc.steps[0].id);
        setStepHistory([]);
        setFieldValues({});
      }
    } catch {
      setError("Failed to load feedback page");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, searchParams.toString()]);

  useEffect(() => {
    if (!requiresAccess || !slug) return;
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem(`feedback_access_${slug}`);
    if (stored) {
      setAccessEmail(stored);
      verifyAccess(stored, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiresAccess, slug]);

  useEffect(() => {
    if (!page?.id) return;
    if (requiresAccess && !hasAccess) return;
    if (viewTracked.current) return;
    viewTracked.current = true;
    trackPageView(page.id);
  }, [page?.id, requiresAccess, hasAccess]);

  useEffect(() => {
    if (!page?.id) return;
    if (requiresAccess && !hasAccess) return;
    pageLoadTime.current = Date.now();
  }, [page?.id, requiresAccess, hasAccess]);

  useEffect(() => {
    if (!page?.id) return;
    if (requiresAccess && !hasAccess) return;
    const handleBeforeUnload = () => {
      const t = Math.floor((Date.now() - pageLoadTime.current) / 1000);
      if (t > 0) {
        navigator.sendBeacon(
          `/api/feedback-pages/${page.id}/track-view`,
          new Blob(
            [JSON.stringify({ sessionId: getSessionId(), timeOnPageSeconds: t })],
            { type: "application/json" }
          )
        );
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      const t = Math.floor((Date.now() - pageLoadTime.current) / 1000);
      if (t > 0) {
        fetch(`/api/feedback-pages/${page.id}/track-view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: getSessionId(), timeOnPageSeconds: t }),
          keepalive: true,
        }).catch(() => { });
      }
    };
  }, [page?.id, requiresAccess, hasAccess]);

  const trackPageView = async (pageId: string) => {
    try {
      await fetch(`/api/feedback-pages/${pageId}/track-view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: getSessionId() }),
      });
    } catch { }
  };

  const verifyAccess = async (email: string, silent = false) => {
    if (!slug) return;
    try {
      if (!silent) {
        setAccessSubmitting(true);
        setAccessError(null);
      }
      const res = await fetch("/api/feedback-pages/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email }),
      });
      if (res.ok) {
        setHasAccess(true);
        sessionStorage.setItem(`feedback_access_${slug}`, email);
        pageLoadTime.current = Date.now();
      } else {
        const data = await res.json();
        setAccessError(data.error || "Email not authorized");
        setHasAccess(false);
        sessionStorage.removeItem(`feedback_access_${slug}`);
      }
    } catch {
      setAccessError("Failed to verify access. Please try again.");
    } finally {
      if (!silent) setAccessSubmitting(false);
    }
  };

  const handleAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessEmail.trim()) return;
    await verifyAccess(accessEmail.trim().toLowerCase(), false);
  };

  // ── Auto-save ────────────────────────────────────────────────────────────

  function extractSubmitterInfo(values: FieldValues) {
    let submitterName: string | null = null;
    let submitterEmail: string | null = null;
    let submitterPhone: string | null = null;
    let submitterAddress: string | null = null;
    for (const step of allSteps) {
      for (const field of step.fields) {
        if (field.type === "short_text" && field.label.toLowerCase().includes("name") && !submitterName) {
          submitterName = (values[field.id] as string) || null;
        }
        if (field.type === "email" && !submitterEmail) {
          submitterEmail = (values[field.id] as string) || null;
        }
        if (field.type === "phone" && !submitterPhone) {
          const phoneVal = values[field.id] as { countryCode?: string; number?: string } | undefined;
          if (phoneVal?.number) {
            submitterPhone = `${phoneVal.countryCode || ""} ${phoneVal.number}`.trim();
          }
        }
        if (field.type === "address" && !submitterAddress) {
          const addrVal = values[field.id] as { street?: string; city?: string; state?: string; zip?: string; country?: string } | undefined;
          if (addrVal && (addrVal.street || addrVal.city)) {
            submitterAddress = [addrVal.street, addrVal.city, addrVal.state, addrVal.zip, addrVal.country].filter(Boolean).join(", ");
          }
        }
      }
    }
    return { submitterName, submitterEmail, submitterPhone, submitterAddress };
  }

  async function autoSave(values: FieldValues) {
    if (!page || isPreview || saveInProgressRef.current) return;
    if (Object.keys(values).length === 0) return;
    saveInProgressRef.current = true;
    try {
      const { submitterName, submitterEmail, submitterPhone, submitterAddress } = extractSubmitterInfo(values);
      const feedbackPayload = JSON.stringify({
        formVersion: 1,
        fieldValues: values,
        steps: allSteps.map((s) => ({ id: s.id, title: s.title })),
      });
      if (!draftIdRef.current) {
        const res = await fetch(`/api/feedback-pages/${page.id}/submissions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedback: feedbackPayload, submitterName, submitterEmail, submitterPhone, submitterAddress, isDraft: true }),
        });
        if (res.ok) {
          const data = await res.json();
          draftIdRef.current = data.id;
          sessionStorage.setItem(`draft_${page.id}`, data.id);
        }
      } else {
        await fetch(`/api/feedback-pages/${page.id}/submissions/${draftIdRef.current}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedback: feedbackPayload, submitterName, submitterEmail, submitterPhone, submitterAddress }),
        });
      }
    } catch {
      // Silent fail — auto-save should never interrupt the user
    } finally {
      saveInProgressRef.current = false;
    }
  }

  // Debounced auto-save on field value changes (2s delay)
  useEffect(() => {
    if (!page || isPreview || Object.keys(fieldValues).length === 0) return;
    const timer = setTimeout(() => { autoSave(fieldValues); }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldValues, page?.id]);

  // ── Multi-step navigation ───────────────────────────────────────────────

  function validateCurrentStep(): boolean {
    if (!currentStep) return true;
    const errors: Record<string, string> = {};
    for (const field of currentStep.fields) {
      if (field.type === "heading" || field.type === "statement") continue;
      if (!field.required) continue;
      const val = fieldValues[field.id];
      if (val === null || val === undefined || val === "") {
        errors[field.id] = "This field is required";
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleNext() {
    if (!validateCurrentStep() || !currentStep || currentStepIndex < 0) return;
    const result = resolveNextStep(
      currentStep,
      currentStepIndex,
      allSteps,
      fieldValues
    );
    if (result.type === "url") {
      // Count as a submission before redirecting (keepalive so it completes even after nav)
      if (!isPreview && page) {
        const { submitterName, submitterEmail, submitterPhone, submitterAddress } = extractSubmitterInfo(fieldValues);
        const feedbackPayload = JSON.stringify({
          formVersion: 1,
          fieldValues,
          steps: allSteps.map((s) => ({ id: s.id, title: s.title })),
        });
        const timeOnPage = Math.floor((Date.now() - pageLoadTime.current) / 1000);
        if (draftIdRef.current) {
          fetch(`/api/feedback-pages/${page.id}/submissions/${draftIdRef.current}`, {
            method: "PATCH",
            keepalive: true,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ feedback: feedbackPayload, submitterName, submitterEmail, submitterPhone, submitterAddress, timeOnPageSeconds: timeOnPage, finalize: true }),
          }).catch(() => { });
        } else {
          fetch(`/api/feedback-pages/${page.id}/submissions`, {
            method: "POST",
            keepalive: true,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ feedback: feedbackPayload, submitterName, submitterEmail, submitterPhone, submitterAddress, timeOnPageSeconds: timeOnPage }),
          }).catch(() => { });
        }
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
      setSubmitted(true);
      return;
    }
    if (result.type === "end") {
      submitForm();
      return;
    }
    // Save progress when advancing to next step
    autoSave(fieldValues);
    setStepHistory((h) => [...h, currentStepId!]);
    setCurrentStepId(result.stepId);
    setFieldErrors({});
  }

  function handleBack() {
    if (stepHistory.length === 0) return;
    const prev = stepHistory[stepHistory.length - 1];
    setStepHistory((h) => h.slice(0, -1));
    setCurrentStepId(prev);
    setFieldErrors({});
  }

  function isLastStep(): boolean {
    if (!currentStep || currentStepIndex < 0) return true;
    const result = resolveNextStep(
      currentStep,
      currentStepIndex,
      allSteps,
      fieldValues
    );
    return result.type === "end";
  }

  // ── Submit ──────────────────────────────────────────────────────────────

  const submitForm = async () => {
    if (!page) return;
    setSubmitting(true);
    setError(null);
    try {
      const timeOnPage = Math.floor((Date.now() - pageLoadTime.current) / 1000);
      const { submitterName, submitterEmail, submitterPhone, submitterAddress } = extractSubmitterInfo(fieldValues);
      const feedbackPayload = JSON.stringify({
        formVersion: 1,
        fieldValues,
        steps: allSteps.map((s) => ({ id: s.id, title: s.title })),
      });

      let res: Response;
      if (draftIdRef.current) {
        // Finalize existing draft
        res = await fetch(`/api/feedback-pages/${page.id}/submissions/${draftIdRef.current}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            feedback: feedbackPayload,
            submitterName,
            submitterEmail,
            submitterPhone,
            submitterAddress,
            timeOnPageSeconds: timeOnPage,
            finalize: true,
          }),
        });
      } else {
        // No draft — normal POST
        res = await fetch(`/api/feedback-pages/${page.id}/submissions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            feedback: feedbackPayload,
            submitterName,
            submitterEmail,
            submitterPhone,
            submitterAddress,
            timeOnPageSeconds: timeOnPage,
          }),
        });
      }

      if (res.ok) {
        sessionStorage.removeItem(`draft_${page.id}`);
        draftIdRef.current = null;
        setSubmitted(true);
      } else {
        const errData = await res.json();
        if (errData.error === "RESPONSE_LIMIT_REACHED") {
          setError("This form is no longer accepting responses. Please try again later.");
        } else {
          setError(errData.error || "Failed to submit");
        }
      }
    } catch {
      setError("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  function resetForm() {
    setSubmitted(false);
    setFieldValues({});
    setFieldErrors({});
    draftIdRef.current = null;
    if (page) sessionStorage.removeItem(`draft_${page.id}`);
    if (allSteps.length > 0) {
      setCurrentStepId(allSteps[0].id);
      setStepHistory([]);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const cardStyle = { borderColor: "#e5e7eb", backgroundColor: "#ffffff" };
  const btnStyle = {
    backgroundColor: customizations.buttonColor || "#000000",
    color: customizations.buttonTextColor || "#ffffff",
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={gradientBackground}
      >
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <Skeleton className="h-8 w-56 mx-auto mb-3" />
            <Skeleton className="h-5 w-80 mx-auto" />
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-8 space-y-5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !page) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={gradientBackground}
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2 text-gray-900">
            Page Not Found
          </h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!page) return null;

  if (requiresAccess && !hasAccess) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={gradientBackground}
      >
        <div
          className="w-full max-w-lg rounded-3xl shadow-2xl p-10 space-y-6 backdrop-blur-3xl border bg-white/70"
          style={cardStyle}
        >
          <div className="text-left space-y-1">
            <h1 className="text-3xl font-semibold text-gray-900">
              {page.title}
            </h1>
            <p className="text-sm text-gray-500">
              This feedback page is private. Enter an approved email to
              continue.
            </p>
          </div>
          {accessError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {accessError}
            </div>
          )}
          <form onSubmit={handleAccessSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accessEmail">Email</Label>
              <Input
                id="accessEmail"
                type="email"
                value={accessEmail}
                onChange={(e) => setAccessEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 rounded-2xl font-semibold shadow-md"
              disabled={accessSubmitting || !accessEmail.trim()}
              style={btnStyle}
            >
              {accessSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={gradientBackground}
      >
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-900">
              {page.title}
            </h1>
          </div>
          <div
            className="rounded-2xl shadow-lg border bg-white p-10 text-center"
            style={cardStyle}
          >
            <CheckCircle2 className="h-14 w-14 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2 text-gray-900">
              {customizations.successTitle?.trim() || "Thank you!"}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {customizations.successMessage?.trim() || "Your feedback has been submitted successfully."}
            </p>
            <Button
              onClick={resetForm}
              className="h-11 px-6 rounded-lg font-medium text-sm"
              style={btnStyle}
            >
              Submit Another
            </Button>
          </div>
          <PoweredByApp />
        </div>
      </div>
    );
  }

  if (!customizations.formConfig || allSteps.length === 0 || !currentStep) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={gradientBackground}
      >
        <div
          className="rounded-2xl border bg-white p-10 text-center max-w-sm shadow-lg"
          style={cardStyle}
        >
          <p className="text-sm text-gray-500">
            This form has no steps configured.
          </p>
        </div>
      </div>
    );
  }

  const isLast = isLastStep();
  const progress = totalSteps > 1 ? (currentStepNumber / totalSteps) * 100 : 100;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={gradientBackground}
    >
      <div className="w-full max-w-lg space-y-5">
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-semibold text-gray-900">{page.title}</h1>
          {page.description && (
            <p className="text-sm text-gray-500">{page.description}</p>
          )}
        </div>

        {totalSteps > 1 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{currentStep.title}</span>
              <span>
                {currentStepNumber} / {totalSteps}
              </span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  backgroundColor: customizations.buttonColor || "#000000",
                }}
              />
            </div>
          </div>
        )}

        <div
          className="rounded-2xl shadow-lg border bg-white p-8 space-y-6"
          style={cardStyle}
        >
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {currentStep.fields.map((field) => (
              <FieldRenderer
                key={field.id}
                field={field}
                value={fieldValues[field.id]}
                onChange={(val) => {
                  setFieldValues((prev) => ({ ...prev, [field.id]: val }));
                  if (fieldErrors[field.id]) {
                    setFieldErrors((prev) => {
                      const n = { ...prev };
                      delete n[field.id];
                      return n;
                    });
                  }
                }}
                error={fieldErrors[field.id]}
                buttonColor={customizations.buttonColor || "#000000"}
              />
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            {stepHistory.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="h-11 px-4 rounded-lg text-sm font-medium"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            <Button
              type="button"
              className="flex-1 h-11 rounded-lg font-medium text-sm shadow-sm"
              style={btnStyle}
              onClick={isLast ? submitForm : handleNext}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : isLast ? (
                "Submit"
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
        <PoweredByApp />
      </div>
    </div>
  );
}
