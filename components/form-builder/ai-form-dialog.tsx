"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { MultiStepFormConfig } from "@/lib/form-builder-types";

const SUGGESTIONS = [
  "Customer satisfaction survey",
  "NPS feedback form",
  "Bug report form",
  "Feature request form",
  "Post-purchase review",
  "Employee onboarding feedback",
];

interface AIFormDialogProps {
  feedbackPageId: string;
  currentFormConfig: MultiStepFormConfig;
  onApply: (config: MultiStepFormConfig) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIFormDialog({
  feedbackPageId,
  currentFormConfig,
  onApply,
  open,
  onOpenChange,
}: AIFormDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasExistingForm =
    currentFormConfig.steps.length > 0 &&
    currentFormConfig.steps.some((s) => s.fields.length > 0);

  async function handleSubmit() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/feedback-pages/${feedbackPageId}/ai-form`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt.trim(),
            currentFormConfig: hasExistingForm ? currentFormConfig : null,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate form");
      }
      const { formConfig } = await res.json();
      onApply(formConfig);
      setPrompt("");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4" />
            {hasExistingForm ? "Edit form with AI" : "Generate form with AI"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {hasExistingForm
              ? "Describe what you want to change and AI will update your form."
              : "Describe the form you want and AI will build it for you."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              hasExistingForm
                ? 'e.g. "Add an NPS rating at the end" or "Make step 2 shorter"'
                : 'e.g. "A customer satisfaction survey with rating, comments, and contact info"'
            }
            className="w-full h-24 px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-gray-400 bg-gray-50 focus:bg-white transition-colors"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSubmit();
              }
            }}
            autoFocus
          />

          {!hasExistingForm && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Suggestions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPrompt(s)}
                    className="px-2.5 py-1 text-xs rounded-full border border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-gray-500">
              {prompt.trim() ? "Cmd+Enter to submit" : ""}
            </span>
            <Button
              onClick={handleSubmit}
              disabled={!prompt.trim() || loading}
              size="sm"
              className="h-8 px-4 text-xs bg-black text-white hover:bg-gray-900"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  {hasExistingForm ? "Updating..." : "Generating..."}
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-1.5" />
                  {hasExistingForm ? "Update form" : "Generate form"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
