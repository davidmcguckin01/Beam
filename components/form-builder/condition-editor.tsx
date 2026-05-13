"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import {
  ExitCondition,
  FormField,
  FormStep,
} from "@/lib/form-builder-types";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const NUMERIC_TYPES = new Set(["rating", "number"]);
const OPTION_TYPES = new Set(["select", "radio"]);

function operatorsFor(field: FormField) {
  if (NUMERIC_TYPES.has(field.type)) {
    return ["equals", "not_equals", "greater_than", "gte", "less_than", "lte", "any"] as const;
  }
  if (OPTION_TYPES.has(field.type)) {
    return ["equals", "not_equals", "any"] as const;
  }
  if (field.type === "checkbox") {
    return ["equals", "any"] as const;
  }
  return ["equals", "not_equals", "contains", "any"] as const;
}

const OPERATOR_LABELS: Record<string, string> = {
  equals: "is",
  not_equals: "is not",
  greater_than: "is greater than",
  gte: "is greater than or equal to",
  less_than: "is less than",
  lte: "is less than or equal to",
  contains: "contains",
  any: "is any value",
};

interface ConditionEditorProps {
  step: FormStep;
  allSteps: FormStep[];
  onChange: (conditions: ExitCondition[]) => void;
}

export function ConditionEditor({ step, allSteps, onChange }: ConditionEditorProps) {
  const conditions = step.exitConditions ?? [];

  // Only fields that produce a value make sense as condition sources
  const conditionableFields = step.fields.filter(
    (f) => !["heading", "statement"].includes(f.type)
  );

  const subsequentSteps = allSteps.filter((s) => s.id !== step.id);

  function updateCondition(id: string, patch: Partial<ExitCondition>) {
    onChange(conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function addCondition() {
    const firstField = conditionableFields[0];
    if (!firstField) return;
    const newCond: ExitCondition = {
      id: uid(),
      fieldId: firstField.id,
      operator: "equals",
      value: "",
      targetStepId: subsequentSteps[0]?.id ?? "end",
    };
    onChange([...conditions, newCond]);
  }

  function removeCondition(id: string) {
    onChange(conditions.filter((c) => c.id !== id));
  }

  function moveCondition(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= conditions.length) return;
    const updated = [...conditions];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
  }

  if (conditionableFields.length === 0) {
    return (
      <p className="text-xs text-gray-500 py-2">
        Add fields to this step to create conditions.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {conditions.map((cond, condIndex) => {
        const field = step.fields.find((f) => f.id === cond.fieldId);
        const ops = field ? operatorsFor(field) : (["equals", "any"] as const);

        return (
          <div key={cond.id} className="flex flex-wrap items-center gap-1.5 p-2 bg-gray-50 rounded-lg border border-gray-200">
            {/* Reorder buttons */}
            {conditions.length > 1 && (
              <div className="flex flex-col gap-0.5 mr-0.5">
                <button
                  type="button"
                  onClick={() => moveCondition(condIndex, "up")}
                  disabled={condIndex === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => moveCondition(condIndex, "down")}
                  disabled={condIndex === conditions.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            )}
            {/* Field picker */}
            <Select
              value={cond.fieldId}
              onValueChange={(v) => updateCondition(cond.id, { fieldId: v, value: "" })}
            >
              <SelectTrigger className="h-7 text-xs w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {conditionableFields.map((f) => (
                  <SelectItem key={f.id} value={f.id} className="text-xs">
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Operator */}
            <Select
              value={cond.operator}
              onValueChange={(v) =>
                updateCondition(cond.id, { operator: v as ExitCondition["operator"] })
              }
            >
              <SelectTrigger className="h-7 text-xs w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ops.map((op) => (
                  <SelectItem key={op} value={op} className="text-xs">
                    {OPERATOR_LABELS[op]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Value */}
            {cond.operator !== "any" && field && (() => {
              if (OPTION_TYPES.has(field.type)) {
                const options = (field as { options: string[] }).options ?? [];
                return (
                  <Select
                    value={String(cond.value ?? "")}
                    onValueChange={(v) => updateCondition(cond.id, { value: v })}
                  >
                    <SelectTrigger className="h-7 text-xs w-28">
                      <SelectValue placeholder="value" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((o) => (
                        <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              }
              if (field.type === "checkbox") {
                return (
                  <Select
                    value={String(cond.value ?? "true")}
                    onValueChange={(v) => updateCondition(cond.id, { value: v })}
                  >
                    <SelectTrigger className="h-7 text-xs w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true" className="text-xs">Checked</SelectItem>
                      <SelectItem value="false" className="text-xs">Unchecked</SelectItem>
                    </SelectContent>
                  </Select>
                );
              }
              return (
                <Input
                  className="h-7 text-xs w-20"
                  value={String(cond.value ?? "")}
                  placeholder="value"
                  onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                />
              );
            })()}

            {/* Arrow */}
            <span className="text-xs text-gray-500">→</span>

            {/* Target step */}
            <Select
              value={cond.targetStepId}
              onValueChange={(v) => updateCondition(cond.id, { targetStepId: v })}
            >
              <SelectTrigger className="h-7 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subsequentSteps.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    Go to: {s.title}
                  </SelectItem>
                ))}
                <SelectItem value="end" className="text-xs">End form</SelectItem>
              </SelectContent>
            </Select>

            <button
              type="button"
              onClick={() => removeCondition(cond.id)}
              className="ml-auto text-gray-500 hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={addCondition}
        disabled={conditionableFields.length === 0}
      >
        <Plus className="h-3 w-3 mr-1" />
        Add condition
      </Button>

      <p className="text-xs text-gray-500">
        Conditions are checked top to bottom — the first match wins. Default: advances to next step.
      </p>
    </div>
  );
}
