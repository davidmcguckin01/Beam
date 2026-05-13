"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GripVertical, Trash2, Plus, GitBranch, X, ChevronDown, ChevronUp, Pencil,
  ChevronRight, ChevronLeft, Copy, AlignLeft, AtSign, Hash, Star, Circle,
  Square, MessageSquare, Type, Phone, MapPin,
} from "lucide-react";
import {
  MultiStepFormConfig,
  FormStep,
  FormField,
  FieldType,
  ExitCondition,
  createField,
  createStep,
  fieldTypeLabel,
  SelectField,
  RadioField,
  RatingField,
  StatementField,
} from "@/lib/form-builder-types";
import { ConditionEditor } from "./condition-editor";

// ─── Field icons + palette groups ────────────────────────────────────────────

const FIELD_ICONS: Record<FieldType, React.ElementType> = {
  short_text: AlignLeft,
  long_text: AlignLeft,
  email: AtSign,
  number: Hash,
  phone: Phone,
  address: MapPin,
  rating: Star,
  select: ChevronDown,
  radio: Circle,
  checkbox: Square,
  statement: MessageSquare,
  heading: Type,
};

const PALETTE_GROUPS: { label: string; types: FieldType[] }[] = [
  { label: "Text", types: ["short_text", "long_text", "email", "number"] },
  { label: "Contact", types: ["phone", "address"] },
  { label: "Choice", types: ["rating", "select", "radio", "checkbox"] },
  { label: "Content", types: ["statement", "heading"] },
];

// ─── Palette item ─────────────────────────────────────────────────────────────

function PaletteItem({ type }: { type: FieldType }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${type}`,
    data: { type: "palette-item", fieldType: type },
  });
  const Icon = FIELD_ICONS[type];
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 cursor-grab select-none hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm transition-all ${
        isDragging ? "opacity-0" : ""
      }`}
    >
      <Icon className="h-3.5 w-3.5 text-gray-500 shrink-0" />
      {fieldTypeLabel(type)}
    </div>
  );
}

// ─── Field preview (mini mockup of the real input) ───────────────────────────

function FieldPreview({ field }: { field: FormField }) {
  switch (field.type) {
    case "short_text":
    case "number":
      return (
        <div className="mt-1.5 h-7 rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-500 px-2.5 flex items-center pointer-events-none">
          {field.placeholder || "Type here…"}
        </div>
      );
    case "email":
      return (
        <div className="mt-1.5 h-7 rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-500 px-2.5 flex items-center pointer-events-none">
          {field.placeholder || "your@email.com"}
        </div>
      );
    case "long_text":
      return (
        <div className="mt-1.5 h-10 rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-500 px-2.5 py-1.5 pointer-events-none">
          {field.placeholder || "Type here…"}
        </div>
      );
    case "rating": {
      const rf = field as RatingField;
      const count = Math.min((rf.maxValue ?? 5) - (rf.minValue ?? 1) + 1, 10);
      if (rf.ratingStyle === "stars") {
        return (
          <div className="mt-1.5 flex gap-0.5 pointer-events-none">
            {Array.from({ length: count }).map((_, i) => (
              <span key={i} className="text-gray-400 text-sm leading-none">★</span>
            ))}
          </div>
        );
      }
      return (
        <div className="mt-1.5 flex gap-1 flex-wrap pointer-events-none">
          {Array.from({ length: count }).map((_, i) => (
            <span key={i} className="w-6 h-6 rounded border border-gray-200 bg-gray-50 text-xs flex items-center justify-center text-gray-500">
              {(rf.minValue ?? 0) + i}
            </span>
          ))}
        </div>
      );
    }
    case "select":
      return (
        <div className="mt-1.5 h-7 rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-500 px-2.5 flex items-center justify-between pointer-events-none">
          <span>Select an option</span>
          <ChevronDown className="h-3 w-3 shrink-0" />
        </div>
      );
    case "radio": {
      const opts = (field as RadioField).options.slice(0, 3);
      return (
        <div className="mt-1.5 space-y-1 pointer-events-none">
          {opts.map((opt, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border border-gray-300 shrink-0" />
              <span className="text-xs text-gray-500 truncate">{opt}</span>
            </div>
          ))}
        </div>
      );
    }
    case "checkbox":
      return (
        <div className="mt-1.5 flex items-center gap-1.5 pointer-events-none">
          <div className="w-3.5 h-3.5 rounded border border-gray-300 shrink-0" />
          <span className="text-xs text-gray-500">Check to confirm</span>
        </div>
      );
    case "statement":
      return (
        <div className="mt-1.5 text-xs text-gray-500 line-clamp-2 pointer-events-none italic leading-relaxed">
          {(field as StatementField).content || "Statement text…"}
        </div>
      );
    case "phone":
      return (
        <div className="mt-1.5 h-7 rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-500 px-2.5 flex items-center gap-1.5 pointer-events-none">
          <Phone className="h-3 w-3 shrink-0" />
          {field.placeholder || "+1 (555) 000-0000"}
        </div>
      );
    case "address":
      return (
        <div className="mt-1.5 space-y-1 pointer-events-none">
          <div className="h-7 rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-500 px-2.5 flex items-center">
            Street address
          </div>
          <div className="flex gap-1">
            <div className="h-7 flex-1 rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-500 px-2.5 flex items-center">City</div>
            <div className="h-7 w-16 rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-500 px-2.5 flex items-center">ZIP</div>
          </div>
        </div>
      );
    case "heading":
      return null;
    default:
      return null;
  }
}

// ─── Sortable field row ───────────────────────────────────────────────────────

function SortableField({
  field, selected, onSelect, onDelete, onDuplicate,
}: {
  field: FormField; selected: boolean; onSelect: () => void; onDelete: () => void; onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id, data: { type: "field", fieldId: field.id } });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
      onClick={onSelect}
      className={`group relative pl-5 pr-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
        selected
          ? "border-violet-400 bg-violet-50/40 ring-1 ring-violet-200 shadow-sm"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
      }`}
    >
      {/* Grip handle — revealed on hover */}
      <span
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </span>

      {/* Header: type label + hover actions */}
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">
            {fieldTypeLabel(field.type)}
          </span>
          {field.required && <span className="text-[9px] font-semibold text-red-400 shrink-0">req</span>}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="p-1 text-gray-500 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Duplicate"
          >
            <Copy className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Label */}
      {field.type === "heading" ? (
        <div className="text-sm font-semibold text-gray-900 leading-snug">{field.label}</div>
      ) : (
        <div className="text-xs font-medium text-gray-800 leading-snug">{field.label}</div>
      )}

      {/* Input preview */}
      <FieldPreview field={field} />
    </div>
  );
}

// ─── Step node ────────────────────────────────────────────────────────────────

function StepNode({
  step, stepNumber, stepIndex, allSteps, isDraggingActive, selectedFieldId, onSelectField,
  onUpdateStep, onDeleteStep, onDeleteField, onDuplicateField,
}: {
  step: FormStep;
  stepNumber: number;
  stepIndex: number;
  allSteps: FormStep[];
  isDraggingActive: boolean;
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  onUpdateStep: (patch: Partial<FormStep>) => void;
  onDeleteStep: () => void;
  onDeleteField: (fieldId: string) => void;
  onDuplicateField: (fieldId: string) => void;
}) {
  const [titleEditing, setTitleEditing] = useState(false);
  const [defaultOpen, setDefaultOpen] = useState(false);
  const defLabel = defaultTargetLabel(step, allSteps, stepIndex);

  const { setNodeRef, isOver } = useDroppable({
    id: `step-drop:${step.id}`,
    data: { type: "step-drop", stepId: step.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-80 rounded-xl bg-white overflow-hidden border-2 transition-all duration-150 ${
        isOver
          ? "border-violet-400 shadow-lg shadow-violet-100/50"
          : isDraggingActive
          ? "border-dashed border-gray-300 shadow-sm"
          : "border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50/80 border-b border-gray-100">
        <span className="text-xs font-bold text-gray-400 shrink-0 tabular-nums w-3">{stepNumber}</span>
        {titleEditing ? (
          <Input
            autoFocus
            className="h-6 text-xs font-semibold flex-1 border-0 p-0 bg-transparent focus-visible:ring-0"
            value={step.title}
            onChange={(e) => onUpdateStep({ title: e.target.value })}
            onBlur={() => setTitleEditing(false)}
            onKeyDown={(e) => e.key === "Enter" && setTitleEditing(false)}
          />
        ) : (
          <span
            className="text-xs font-semibold text-gray-700 flex-1 cursor-text truncate"
            onClick={() => setTitleEditing(true)}
          >
            {step.title}
          </span>
        )}
        <button
          type="button"
          onClick={onDeleteStep}
          className="text-gray-400 hover:text-red-500 transition-colors shrink-0 p-0.5 rounded hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-2">
        <SortableContext items={step.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          {step.fields.map((field) => (
            <SortableField
              key={field.id}
              field={field}
              selected={selectedFieldId === field.id}
              onSelect={() => onSelectField(field.id)}
              onDelete={() => onDeleteField(field.id)}
              onDuplicate={() => onDuplicateField(field.id)}
            />
          ))}
        </SortableContext>

        {isDraggingActive ? (
          <div
            className={`flex items-center justify-center rounded-lg border-2 border-dashed text-xs font-medium transition-all ${
              step.fields.length === 0 ? "h-16" : "h-9"
            } ${
              isOver
                ? "border-violet-400 bg-violet-50 text-violet-500"
                : "border-gray-200 bg-gray-50/50 text-gray-500"
            }`}
          >
            {isOver ? "↓ Drop here" : step.fields.length === 0 ? "Drop fields here" : "+ Drop to add"}
          </div>
        ) : step.fields.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-16 rounded-lg border-2 border-dashed border-gray-200 text-xs text-gray-500 gap-1.5">
            <Plus className="h-4 w-4 text-gray-400" />
            Drag fields here
          </div>
        ) : null}
      </div>

      {/* Routing footer */}
      <div className="border-t border-gray-100 px-3 py-2 relative">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium shrink-0">Then →</span>
          <button
            type="button"
            onClick={() => setDefaultOpen((v) => !v)}
            className={`flex-1 flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors text-left truncate ${
              step.defaultTarget
                ? "text-violet-700 bg-violet-50 hover:bg-violet-100"
                : "text-gray-500 bg-gray-50 hover:bg-gray-100"
            }`}
          >
            <span className="truncate">{defLabel}</span>
            <Pencil className="h-2.5 w-2.5 shrink-0 ml-auto opacity-60" />
          </button>
        </div>

        {defaultOpen && (
          <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">Default routing</span>
              <button type="button" onClick={() => setDefaultOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-2">Used when no conditions match.</p>
            <Select
              value={step.defaultTarget?.type === "step" ? `step:${step.defaultTarget.stepId}` : (step.defaultTarget?.type ?? "next")}
              onValueChange={(v) => {
                if (v === "next") onUpdateStep({ defaultTarget: undefined });
                else if (v === "end") onUpdateStep({ defaultTarget: { type: "end" } });
                else if (v === "url") onUpdateStep({ defaultTarget: { type: "url", url: step.defaultTarget?.url ?? "" } });
                else if (v.startsWith("step:")) onUpdateStep({ defaultTarget: { type: "step", stepId: v.slice(5) } });
              }}
            >
              <SelectTrigger className="h-8 text-xs mb-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="next" className="text-xs">Continue to next step</SelectItem>
                {allSteps
                  .filter((s) => s.id !== step.id)
                  .map((s) => (
                    <SelectItem key={s.id} value={`step:${s.id}`} className="text-xs">
                      Go to: {s.title}
                    </SelectItem>
                  ))}
                <SelectItem value="end" className="text-xs">End form</SelectItem>
                <SelectItem value="url" className="text-xs">Redirect to URL</SelectItem>
              </SelectContent>
            </Select>
            {step.defaultTarget?.type === "url" && (
              <Input
                className="h-8 text-xs"
                placeholder="https://…"
                value={step.defaultTarget.url ?? ""}
                onChange={(e) => onUpdateStep({ defaultTarget: { type: "url", url: e.target.value } })}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function conditionSummary(step: FormStep, allSteps: FormStep[]): string[] {
  const lines: string[] = [];
  for (const cond of step.exitConditions ?? []) {
    const field = step.fields.find((f) => f.id === cond.fieldId);
    const fieldLabel = field?.label ?? "field";
    const opLabel: Record<string, string> = {
      equals: "=", not_equals: "≠", greater_than: ">", gte: "≥", less_than: "<", lte: "≤", contains: "contains", any: "any value",
    };
    const target = cond.targetStepId === "end"
      ? "End form"
      : allSteps.find((s) => s.id === cond.targetStepId)?.title ?? cond.targetStepId;
    const valueStr = cond.operator === "any" ? "" : ` ${String(cond.value ?? "")}`;
    lines.push(`If ${fieldLabel} ${opLabel[cond.operator] ?? cond.operator}${valueStr} → ${target}`);
  }
  return lines;
}

function defaultTargetLabel(step: FormStep, allSteps: FormStep[], stepIndex: number): string {
  if (step.defaultTarget?.type === "end") return "End form";
  if (step.defaultTarget?.type === "url") return step.defaultTarget.url ? `↗ ${step.defaultTarget.url}` : "Redirect to URL";
  if (step.defaultTarget?.type === "step") {
    const target = allSteps.find((s) => s.id === step.defaultTarget!.stepId);
    return target ? `Go to: ${target.title}` : "→ Unknown step";
  }
  // Implicit: no explicit default target set — follows sequential order
  const next = allSteps[stepIndex + 1];
  return next ? `Next step (${next.title})` : "End form";
}

// ─── Linear connector ─────────────────────────────────────────────────────────

function LinearConnector({
  fromStep, allSteps, onUpdateConditions,
}: {
  fromStep: FormStep;
  allSteps: FormStep[];
  onUpdateConditions: (conds: ExitCondition[] | undefined) => void;
}) {
  const [condOpen, setCondOpen] = useState(false);
  const condCount = fromStep.exitConditions?.length ?? 0;
  const summaryLines = conditionSummary(fromStep, allSteps);

  return (
    <TooltipProvider>
      <div className="flex flex-col items-center">
        <div className="w-0.5 h-4 bg-gray-300" />

        {/* Condition button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setCondOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                condCount > 0
                  ? "border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-400 hover:text-gray-600"
              }`}
            >
              <GitBranch className="h-3 w-3" />
              {condCount > 0 ? `${condCount} condition${condCount > 1 ? "s" : ""}` : "Add condition"}
            </button>
          </TooltipTrigger>
          {condCount > 0 && (
            <TooltipContent side="right" className="max-w-[240px] p-2 space-y-1">
              {summaryLines.map((line, i) => (
                <p key={i} className="text-xs">{line}</p>
              ))}
            </TooltipContent>
          )}
        </Tooltip>

        {condOpen && (
          <div className="relative w-96 bg-white border border-gray-200 rounded-xl shadow-lg p-4 mt-2 z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-700">Conditional logic</span>
              <button type="button" onClick={() => setCondOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <ConditionEditor step={fromStep} allSteps={allSteps} onChange={onUpdateConditions} />
          </div>
        )}

        <div className="w-0.5 h-4 bg-gray-300" />
        <svg width="10" height="6" viewBox="0 0 10 6" className="text-gray-400">
          <path d="M0 0 L5 6 L10 0" fill="currentColor" />
        </svg>
      </div>
    </TooltipProvider>
  );
}

// ─── Branch connector ─────────────────────────────────────────────────────────

function BranchConnector({
  fromStep, branchSteps, allSteps, onUpdateConditions,
  isDraggingActive, selectedFieldId, onSelectField,
  onUpdateStep, onDeleteStep, onDeleteField, onDuplicateField,
}: {
  fromStep: FormStep;
  branchSteps: FormStep[];
  allSteps: FormStep[];
  onUpdateConditions: (conds: ExitCondition[] | undefined) => void;
  isDraggingActive: boolean;
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  onUpdateStep: (stepId: string, patch: Partial<FormStep>) => void;
  onDeleteStep: (stepId: string) => void;
  onDeleteField: (stepId: string, fieldId: string) => void;
  onDuplicateField: (stepId: string, fieldId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const condCount = fromStep.exitConditions?.length ?? 0;
  const n = branchSteps.length;

  // Refs to measure actual branch column positions for drawing connector lines
  const containerRef = useRef<HTMLDivElement>(null);
  const branchRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [linePath, setLinePath] = useState<{ forkLeft: number; forkRight: number; mergeLeft: number; mergeRight: number } | null>(null);

  useEffect(() => {
    function measure() {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const centers = branchRefs.current
        .filter((el): el is HTMLDivElement => el !== null)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return r.left + r.width / 2 - rect.left;
        });
      if (centers.length >= 2) {
        setLinePath({
          forkLeft: centers[0],
          forkRight: centers[centers.length - 1],
          mergeLeft: centers[0],
          mergeRight: centers[centers.length - 1],
        });
      }
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [n]);

  return (
    <div className="flex flex-col items-center w-full">
      {/* Line from parent step to condition block */}
      <div className="w-0.5 h-5 bg-gray-300" />

      {/* Condition block */}
      <div className="w-96 bg-blue-50 border border-blue-200 rounded-xl shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
        >
          <GitBranch className="h-3.5 w-3.5" />
          <span>{condCount} condition{condCount !== 1 ? "s" : ""} — branches to {n} paths</span>
          <span className="ml-auto">
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </span>
        </button>
        {open && (
          <div className="px-4 pb-4">
            <ConditionEditor step={fromStep} allSteps={allSteps} onChange={onUpdateConditions} />
          </div>
        )}
      </div>

      {/* Line from condition block to fork point */}
      <div className="w-0.5 h-5 bg-gray-300" />

      {/* Fork: horizontal line connecting branch centers */}
      <div ref={containerRef} className="relative w-full">
        {linePath && (
          <div
            className="absolute top-0 h-0.5 bg-gray-300"
            style={{ left: `${linePath.forkLeft}px`, width: `${linePath.forkRight - linePath.forkLeft}px` }}
          />
        )}

        {/* Branch columns */}
        <div className="flex justify-center w-full" style={{ gap: "32px" }}>
          {branchSteps.map((step, branchIdx) => {
            const branchConds = (fromStep.exitConditions ?? []).filter((c) => c.targetStepId === step.id);
            const branchLabel = branchConds.map((c) => {
              const field = fromStep.fields.find((f) => f.id === c.fieldId);
              const opLabel: Record<string, string> = { equals: "=", not_equals: "≠", greater_than: ">", gte: "≥", less_than: "<", lte: "≤", contains: "contains", any: "any" };
              return c.operator === "any"
                ? `${field?.label ?? "field"} is any`
                : `${field?.label ?? "field"} ${opLabel[c.operator] ?? c.operator} ${c.value ?? ""}`;
            }).join(" or ");

            return (
              <div
                key={step.id}
                ref={(el) => { branchRefs.current[branchIdx] = el; }}
                className="flex flex-col items-center"
                style={{ flex: "1", maxWidth: "320px" }}
              >
                {/* Vertical drop from fork line */}
                <div className="w-0.5 h-4 bg-gray-300" />

                {/* Condition label pill */}
                {branchLabel && (
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full mb-1 max-w-[180px] truncate">
                    {branchLabel}
                  </span>
                )}

                {/* Arrow into branch step */}
                <div className="w-0.5 h-2 bg-gray-300" />
                <svg width="10" height="6" viewBox="0 0 10 6" className="text-gray-400 shrink-0">
                  <path d="M0 0 L5 6 L10 0" fill="currentColor" />
                </svg>

                {/* Branch step */}
                <StepNode
                  step={step}
                  stepNumber={branchIdx + 1}
                  stepIndex={allSteps.indexOf(step)}
                  allSteps={allSteps}
                  isDraggingActive={isDraggingActive}
                  selectedFieldId={selectedFieldId}
                  onSelectField={onSelectField}
                  onUpdateStep={(patch) => onUpdateStep(step.id, patch)}
                  onDeleteStep={() => onDeleteStep(step.id)}
                  onDeleteField={(fid) => onDeleteField(step.id, fid)}
                  onDuplicateField={(fid) => onDuplicateField(step.id, fid)}
                />

                {/* Vertical line down to merge */}
                <div className="w-0.5 h-5 bg-gray-300" />
              </div>
            );
          })}
        </div>

        {/* Merge: horizontal line connecting branch centers at bottom */}
        {linePath && (
          <div
            className="absolute bottom-0 h-0.5 bg-gray-300"
            style={{ left: `${linePath.mergeLeft}px`, width: `${linePath.mergeRight - linePath.mergeLeft}px` }}
          />
        )}
      </div>

      {/* Single arrow from merge point down to next step */}
      <div className="w-0.5 h-4 bg-gray-300" />
      <svg width="10" height="6" viewBox="0 0 10 6" className="text-gray-400">
        <path d="M0 0 L5 6 L10 0" fill="currentColor" />
      </svg>
    </div>
  );
}

// ─── Field config panel ───────────────────────────────────────────────────────

function FieldConfigPanel({ field, onChange }: { field: FormField; onChange: (patch: Partial<FormField>) => void }) {
  const isOptionsField = field.type === "select" || field.type === "radio";
  const options = isOptionsField ? (field as SelectField | RadioField).options : [];

  function updateOption(idx: number, value: string) {
    const next = [...options]; next[idx] = value;
    onChange({ options: next } as Partial<FormField>);
  }
  function addOption() {
    onChange({ options: [...options, `Option ${options.length + 1}`] } as Partial<FormField>);
  }
  function removeOption(idx: number) {
    onChange({ options: options.filter((_, i) => i !== idx) } as Partial<FormField>);
  }

  return (
    <div className="space-y-4 p-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {fieldTypeLabel(field.type)}
      </div>

      {field.type !== "statement" && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-700">Label</Label>
          <Input className="h-8 text-xs" value={field.label} onChange={(e) => onChange({ label: e.target.value })} />
        </div>
      )}

      {["short_text", "long_text", "email", "number", "phone"].includes(field.type) && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-700">Placeholder</Label>
          <Input className="h-8 text-xs" value={field.placeholder ?? ""} onChange={(e) => onChange({ placeholder: e.target.value })} />
        </div>
      )}

      {!["heading", "statement"].includes(field.type) && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700">Help text</Label>
            <Input className="h-8 text-xs" value={field.helpText ?? ""} onChange={(e) => onChange({ helpText: e.target.value })} placeholder="Optional hint" />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-gray-700">Required</Label>
            <Switch checked={field.required ?? false} onCheckedChange={(v) => onChange({ required: v })} />
          </div>
        </>
      )}

      {field.type === "rating" && (() => {
        const rf = field as RatingField;
        const presets = [
          { label: "1–5 ★", minValue: 1, maxValue: 5, ratingStyle: "stars" as const },
          { label: "1–10", minValue: 1, maxValue: 10, ratingStyle: "numbers" as const },
          { label: "NPS", minValue: 0, maxValue: 10, ratingStyle: "numbers" as const },
        ];
        return (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">Presets</Label>
              <div className="flex gap-1.5">
                {presets.map((opt) => {
                  const active = rf.minValue === opt.minValue && rf.maxValue === opt.maxValue && rf.ratingStyle === opt.ratingStyle;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => onChange({ minValue: opt.minValue, maxValue: opt.maxValue, ratingStyle: opt.ratingStyle } as Partial<RatingField>)}
                      className={`flex-1 text-xs py-1.5 rounded-md border font-medium transition-colors ${
                        active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">Style</Label>
              <div className="flex gap-1.5">
                {(["stars", "numbers"] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => onChange({ ratingStyle: style } as Partial<RatingField>)}
                    className={`flex-1 text-xs py-1.5 rounded-md border font-medium transition-colors capitalize ${
                      rf.ratingStyle === style ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    {style === "stars" ? "★ Stars" : "# Numbers"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">Range</Label>
              <div className="flex items-center gap-2">
                <Input type="number" className="h-7 text-xs w-16" value={rf.minValue} onChange={(e) => onChange({ minValue: Number(e.target.value) } as Partial<RatingField>)} />
                <span className="text-xs text-gray-500">to</span>
                <Input type="number" className="h-7 text-xs w-16" value={rf.maxValue} onChange={(e) => onChange({ maxValue: Number(e.target.value) } as Partial<RatingField>)} />
              </div>
            </div>
          </div>
        );
      })()}

      {field.type === "statement" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700">Content</Label>
            <textarea
              className="w-full h-20 px-3 py-2 text-xs border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-gray-400"
              value={(field as StatementField).content}
              onChange={(e) => onChange({ content: e.target.value } as Partial<StatementField>)}
              placeholder="Text shown to the respondent"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700">Button label</Label>
            <Input className="h-8 text-xs" value={(field as StatementField).linkText ?? ""} onChange={(e) => onChange({ linkText: e.target.value } as Partial<StatementField>)} placeholder="e.g. Review on Trustpilot" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700">Button URL</Label>
            <Input className="h-8 text-xs" value={(field as StatementField).linkUrl ?? ""} onChange={(e) => onChange({ linkUrl: e.target.value } as Partial<StatementField>)} placeholder="https://…" />
          </div>
        </>
      )}

      {field.type === "phone" && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-700">Default country code</Label>
          <select
            className="w-full h-8 px-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
            value={(field as any).countryCode || "US"}
            onChange={(e) => onChange({ countryCode: e.target.value } as any)}
          >
            <option value="US">🇺🇸 +1 (US)</option>
            <option value="GB">🇬🇧 +44 (UK)</option>
            <option value="AU">🇦🇺 +61 (AU)</option>
            <option value="CA">🇨🇦 +1 (CA)</option>
            <option value="DE">🇩🇪 +49 (DE)</option>
            <option value="FR">🇫🇷 +33 (FR)</option>
            <option value="IN">🇮🇳 +91 (IN)</option>
            <option value="JP">🇯🇵 +81 (JP)</option>
          </select>
        </div>
      )}

      {isOptionsField && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-700">Options</Label>
          <div className="space-y-1.5">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <Input className="h-7 text-xs flex-1" value={opt} onChange={(e) => updateOption(idx, e.target.value)} />
                {options.length > 1 && (
                  <button type="button" onClick={() => removeOption(idx)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addOption}>
            <Plus className="h-3 w-3 mr-1" /> Add option
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export function FormBuilder({
  config,
  onChange,
}: {
  config: MultiStepFormConfig;
  onChange: (config: MultiStepFormConfig) => void;
}) {
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [draggingType, setDraggingType] = useState<"palette" | "field" | null>(null);
  const [draggingLabel, setDraggingLabel] = useState<string>("");
  const [paletteCollapsed, setPaletteCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("palette-collapsed") === "true";
  });

  const togglePalette = (next: boolean) => {
    setPaletteCollapsed(next);
    localStorage.setItem("palette-collapsed", String(next));
  };

  // ── Canvas pan/zoom ──
  const [canvasTransform, setCanvasTransform] = useState({ x: 0, y: 0, scale: 1 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });

  const handleCanvasWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Proportional zoom with clamped delta to prevent jumpy trackpad pinch
      const clampedDelta = Math.max(-30, Math.min(30, e.deltaY));
      const factor = 1 - clampedDelta * 0.005;
      setCanvasTransform(prev => ({
        ...prev,
        scale: Math.min(2, Math.max(0.25, prev.scale * factor)),
      }));
    } else {
      setCanvasTransform(prev => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleCanvasWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleCanvasWheel);
  }, [handleCanvasWheel]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isPanning.current) return;
      const dx = e.clientX - lastPoint.current.x;
      const dy = e.clientY - lastPoint.current.y;
      lastPoint.current = { x: e.clientX, y: e.clientY };
      setCanvasTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    };
    const onUp = () => { isPanning.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const steps = config.steps;

  function setSteps(next: FormStep[]) {
    onChange({ ...config, steps: next });
  }

  function updateStep(stepId: string, patch: Partial<FormStep>) {
    setSteps(steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)));
  }

  function deleteStep(stepId: string) {
    if (selectedFieldId) {
      const step = steps.find((s) => s.id === stepId);
      if (step?.fields.some((f) => f.id === selectedFieldId)) setSelectedFieldId(null);
    }
    setSteps(steps.filter((s) => s.id !== stepId));
  }

  function addStep() {
    setSteps([...steps, createStep(`Step ${steps.length + 1}`)]);
  }

  function deleteField(stepId: string, fieldId: string) {
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
    updateStep(stepId, {
      fields: steps.find((s) => s.id === stepId)!.fields.filter((f) => f.id !== fieldId),
    });
  }

  function duplicateField(stepId: string, fieldId: string) {
    const step = steps.find((s) => s.id === stepId)!;
    const idx = step.fields.findIndex((f) => f.id === fieldId);
    if (idx === -1) return;
    const duped: FormField = { ...step.fields[idx], id: Math.random().toString(36).slice(2, 9) };
    const newFields = [...step.fields];
    newFields.splice(idx + 1, 0, duped);
    updateStep(stepId, { fields: newFields });
    setSelectedFieldId(duped.id);
  }

  function updateField(stepId: string, fieldId: string, patch: Partial<FormField>) {
    const step = steps.find((s) => s.id === stepId)!;
    updateStep(stepId, {
      fields: step.fields.map((f) => (f.id === fieldId ? ({ ...f, ...patch } as FormField) : f)),
    });
  }

  const branchConsumedIds = useMemo(() => {
    const consumed = new Set<string>();
    for (const step of steps) {
      const uniqueTargets = [
        ...new Set(
          (step.exitConditions ?? [])
            .map((c) => c.targetStepId)
            .filter((id) => id !== "end")
        ),
      ];
      if (uniqueTargets.length >= 2) {
        uniqueTargets.forEach((id) => consumed.add(id));
      }
    }
    return consumed;
  }, [steps]);

  function getBranchTargets(step: FormStep): FormStep[] {
    const uniqueTargetIds = [
      ...new Set(
        (step.exitConditions ?? [])
          .map((c) => c.targetStepId)
          .filter((id) => id !== "end")
      ),
    ];
    if (uniqueTargetIds.length < 2) return [];
    return uniqueTargetIds
      .map((id) => steps.find((s) => s.id === id))
      .filter((s): s is FormStep => s !== undefined);
  }

  const selectedEntry = (() => {
    if (!selectedFieldId) return null;
    for (const step of steps) {
      const field = step.fields.find((f) => f.id === selectedFieldId);
      if (field) return { step, field };
    }
    return null;
  })();

  function handleDragStart(e: DragStartEvent) {
    const data = e.active.data.current;
    if (data?.type === "palette-item") {
      setDraggingType("palette");
      setDraggingLabel(fieldTypeLabel(data.fieldType as FieldType));
    } else if (data?.type === "field") {
      setDraggingType("field");
      const field = steps.flatMap((s) => s.fields).find((f) => f.id === e.active.id);
      setDraggingLabel(field?.label ?? "");
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    setDraggingType(null);
    setDraggingLabel("");
    const { active, over } = e;
    if (!over) return;
    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === "palette-item") {
      let targetStepId: string | null = null;
      if (overData?.type === "step-drop") targetStepId = overData.stepId;
      else if (overData?.type === "field") {
        for (const s of steps) {
          if (s.fields.some((f) => f.id === over.id)) { targetStepId = s.id; break; }
        }
      }
      if (!targetStepId) return;
      const newField = createField(activeData.fieldType as FieldType);
      const step = steps.find((s) => s.id === targetStepId)!;
      updateStep(targetStepId, { fields: [...step.fields, newField] });
      setSelectedFieldId(newField.id);
      return;
    }

    if (activeData?.type === "field" && overData?.type === "field") {
      for (const step of steps) {
        const fromIdx = step.fields.findIndex((f) => f.id === active.id);
        const toIdx = step.fields.findIndex((f) => f.id === over.id);
        if (fromIdx !== -1 && toIdx !== -1) {
          updateStep(step.id, { fields: arrayMove(step.fields, fromIdx, toIdx) });
          return;
        }
      }
    }

    if (activeData?.type === "field" && overData?.type === "step-drop") {
      const targetStepId = overData.stepId as string;
      let sourceStep: FormStep | null = null;
      let movedField: FormField | null = null;
      for (const s of steps) {
        const idx = s.fields.findIndex((f) => f.id === active.id);
        if (idx !== -1) { sourceStep = s; movedField = s.fields[idx]; break; }
      }
      if (!sourceStep || !movedField || sourceStep.id === targetStepId) return;
      const capturedField = movedField;
      setSteps(steps.map((s) => {
        if (s.id === sourceStep!.id) return { ...s, fields: s.fields.filter((f) => f.id !== active.id) };
        if (s.id === targetStepId) return { ...s, fields: [...s.fields, capturedField] };
        return s;
      }));
    }
  }

  const mainFlowSteps = steps.filter((s) => !branchConsumedIds.has(s.id));
  const isDraggingActive = draggingType !== null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full overflow-hidden">

        {/* ── Palette ── */}
        {paletteCollapsed ? (
          <div className="flex flex-col items-center shrink-0 w-10 border-r border-gray-200 bg-gray-50 py-3 gap-3">
            <button
              type="button"
              onClick={() => togglePalette(false)}
              title="Expand fields panel"
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>Fields</span>
          </div>
        ) : (
          <div className="w-56 shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto">
            <div className="px-3 pt-3 pb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fields</p>
                <button
                  type="button"
                  onClick={() => togglePalette(true)}
                  title="Collapse fields panel"
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              </div>
              {PALETTE_GROUPS.map((group) => (
                <div key={group.label} className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 px-0.5">{group.label}</p>
                  <div className="space-y-1">
                    {group.types.map((type) => <PaletteItem key={type} type={type} />)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Canvas ── */}
        <div
          ref={canvasRef}
          className="flex-1 overflow-hidden relative select-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)",
            backgroundSize: `${20 * canvasTransform.scale}px ${20 * canvasTransform.scale}px`,
            backgroundPosition: `${canvasTransform.x % (20 * canvasTransform.scale)}px ${canvasTransform.y % (20 * canvasTransform.scale)}px`,
            cursor: isPanning.current ? "grabbing" : "default",
          }}
          onMouseDown={(e) => {
            if (e.button === 1) {
              e.preventDefault();
              isPanning.current = true;
              lastPoint.current = { x: e.clientX, y: e.clientY };
            }
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedFieldId(null);
          }}
        >
          <div
            style={{
              transform: `translate(${canvasTransform.x}px, ${canvasTransform.y}px) scale(${canvasTransform.scale})`,
              transformOrigin: "50% 0",
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
            }}
            className="flex flex-col items-center py-10 px-8 min-w-max"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedFieldId(null);
            }}
          >
            {/* Start node */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 text-white shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                <span className="text-xs font-semibold">Start</span>
              </div>
              <div className="w-0.5 h-5 bg-gray-300" />
              <svg width="10" height="6" viewBox="0 0 10 6" className="text-gray-400">
                <path d="M0 0 L5 6 L10 0" fill="currentColor" />
              </svg>
            </div>

            {mainFlowSteps.map((step, idx) => {
              const branchTargets = getBranchTargets(step);
              const isLast = idx === mainFlowSteps.length - 1;

              return (
                <div key={step.id} className="flex flex-col items-center">
                  <StepNode
                    step={step}
                    stepNumber={idx + 1}
                    stepIndex={idx}
                    allSteps={steps}
                    isDraggingActive={isDraggingActive}
                    selectedFieldId={selectedFieldId}
                    onSelectField={setSelectedFieldId}
                    onUpdateStep={(patch) => updateStep(step.id, patch)}
                    onDeleteStep={() => deleteStep(step.id)}
                    onDeleteField={(fid) => deleteField(step.id, fid)}
                    onDuplicateField={(fid) => duplicateField(step.id, fid)}
                  />

                  {branchTargets.length >= 2 ? (
                    <BranchConnector
                      fromStep={step}
                      branchSteps={branchTargets}
                      allSteps={steps}
                      onUpdateConditions={(conds) => updateStep(step.id, { exitConditions: conds })}
                      isDraggingActive={isDraggingActive}
                      selectedFieldId={selectedFieldId}
                      onSelectField={setSelectedFieldId}
                      onUpdateStep={updateStep}
                      onDeleteStep={deleteStep}
                      onDeleteField={deleteField}
                      onDuplicateField={duplicateField}
                    />
                  ) : !isLast ? (
                    <LinearConnector
                      fromStep={step}
                      allSteps={steps}
                      onUpdateConditions={(conds) => updateStep(step.id, { exitConditions: conds })}
                    />
                  ) : (
                    <>
                      <div className="w-0.5 h-8 bg-gray-300" />
                      <svg width="10" height="6" viewBox="0 0 10 6" className="text-gray-400">
                        <path d="M0 0 L5 6 L10 0" fill="currentColor" />
                      </svg>
                    </>
                  )}
                </div>
              );
            })}

            {/* End node */}
            <div className="mt-2 px-4 py-2 rounded-full border-2 border-dashed border-gray-300 bg-white text-xs font-semibold text-gray-500">
              End
            </div>

            {/* Add step */}
            <button
              type="button"
              onClick={addStep}
              className="mt-6 group flex flex-col items-center gap-1.5 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500 group-hover:border-gray-500 group-hover:text-gray-600 group-hover:bg-white group-hover:shadow-sm transition-all">
                <Plus className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-gray-500 group-hover:text-gray-600 transition-colors">Add step</span>
            </button>
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-sm p-1 z-10 select-none">
            <button
              type="button"
              onClick={() => setCanvasTransform(p => ({ ...p, scale: Math.max(0.25, p.scale * 0.8) }))}
              className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded text-sm font-medium transition-colors"
            >−</button>
            <button
              type="button"
              onClick={() => setCanvasTransform({ x: 0, y: 0, scale: 1 })}
              className="min-w-12 h-7 px-1 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >{Math.round(canvasTransform.scale * 100)}%</button>
            <button
              type="button"
              onClick={() => setCanvasTransform(p => ({ ...p, scale: Math.min(2, p.scale * 1.25) }))}
              className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded text-sm font-medium transition-colors"
            >+</button>
          </div>
        </div>

        {/* ── Field config — only visible when a field is selected ── */}
        {selectedEntry && (
          <div className="w-[420px] xl:w-[520px] 2xl:w-[640px] shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
            <FieldConfigPanel
              field={selectedEntry.field}
              onChange={(patch) => updateField(selectedEntry.step.id, selectedEntry.field.id, patch)}
            />
          </div>
        )}
      </div>

      <DragOverlay>
        {isDraggingActive && (
          <div className="px-3 py-2 rounded-lg border border-gray-300 bg-white shadow-lg text-xs font-medium text-gray-700 cursor-grabbing flex items-center gap-2">
            <GripVertical className="h-3.5 w-3.5 text-gray-500" />
            {draggingLabel}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
