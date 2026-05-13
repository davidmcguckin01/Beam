"use client";

import { useState, useEffect } from "react";
import { History, Loader2, RotateCcw, Sparkles, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { MultiStepFormConfig } from "@/lib/form-builder-types";

interface Version {
  id: string;
  formConfig: string;
  source: string;
  prompt: string | null;
  createdAt: string;
}

interface VersionHistoryProps {
  feedbackPageId: string;
  onRestore: (config: MultiStepFormConfig) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function sourceBadge(source: string) {
  switch (source) {
    case "ai_generate":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-600 border border-purple-200">
          <Sparkles className="h-2.5 w-2.5" />
          AI Generated
        </span>
      );
    case "ai_edit":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
          <Sparkles className="h-2.5 w-2.5" />
          AI Edit
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
          <PenLine className="h-2.5 w-2.5" />
          Manual
        </span>
      );
  }
}

export function VersionHistory({
  feedbackPageId,
  onRestore,
  open,
  onOpenChange,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch(`/api/feedback-pages/${feedbackPageId}/versions`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load versions");
        const data = await res.json();
        setVersions(data.versions ?? []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => setLoading(false));
  }, [open, feedbackPageId]);

  function handleRestore(version: Version) {
    try {
      const config = JSON.parse(version.formConfig) as MultiStepFormConfig;
      onRestore(config);
      onOpenChange(false);
    } catch {
      setError("Failed to parse version data");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <History className="h-4 w-4" />
            Version History
          </DialogTitle>
          <DialogDescription className="text-xs">
            Restore a previous version of your form.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-10">
              <History className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-xs text-gray-500">
                No versions yet. Versions are saved when you use AI or save your
                form.
              </p>
            </div>
          ) : (
            <div className="space-y-2 pb-2">
              {versions.map((version) => {
                let stepCount = 0;
                let fieldCount = 0;
                try {
                  const config = JSON.parse(version.formConfig);
                  stepCount = config.steps?.length ?? 0;
                  fieldCount =
                    config.steps?.reduce(
                      (sum: number, s: { fields?: unknown[] }) =>
                        sum + (s.fields?.length ?? 0),
                      0
                    ) ?? 0;
                } catch {}

                return (
                  <div
                    key={version.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors group"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        {sourceBadge(version.source)}
                        <span className="text-xs text-gray-500">
                          {timeAgo(version.createdAt)}
                        </span>
                      </div>
                      {version.prompt && (
                        <p className="text-xs text-gray-600 truncate">
                          &ldquo;{version.prompt}&rdquo;
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {stepCount} step{stepCount !== 1 ? "s" : ""},{" "}
                        {fieldCount} field{fieldCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={() => handleRestore(version)}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restore
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
