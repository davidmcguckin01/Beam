"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const FIELD_LABELS = [
  "How would you rate your experience?",
  "What could we improve?",
  "Would you recommend us?",
  "Any additional comments?",
];

export function FormGenerationLoader() {
  const [visibleFields, setVisibleFields] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const fieldTimer = setInterval(() => {
      setVisibleFields((prev) => (prev < FIELD_LABELS.length ? prev + 1 : prev));
    }, 600);
    return () => clearInterval(fieldTimer);
  }, []);

  useEffect(() => {
    const dotTimer = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(dotTimer);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-orange-500 animate-pulse" />
            <span className="text-sm font-medium text-gray-900">
              Building your form{dots}
            </span>
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(((visibleFields + 1) / (FIELD_LABELS.length + 1)) * 100, 95)}%` }}
            />
          </div>
        </div>

        {/* Fields */}
        <div className="px-6 py-4 space-y-4">
          {FIELD_LABELS.map((label, i) => (
            <div
              key={i}
              className="transition-all duration-500 ease-out"
              style={{
                opacity: i < visibleFields ? 1 : 0,
                transform: i < visibleFields ? "translateY(0)" : "translateY(8px)",
              }}
            >
              <div className="text-xs font-medium text-gray-700 mb-1.5">
                {label}
              </div>
              <div className="h-9 rounded-lg bg-gray-50 border border-gray-200 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Footer skeleton */}
        <div className="px-6 pb-6 pt-2">
          <div className="h-10 rounded-lg bg-gray-900 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
