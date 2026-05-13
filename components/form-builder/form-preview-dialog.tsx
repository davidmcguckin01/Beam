"use client";

import { useState } from "react";
import { X, Smartphone, Tablet, Monitor, RotateCcw } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type Viewport = "mobile" | "tablet" | "desktop";

const VIEWPORTS: { id: Viewport; label: string; icon: React.ReactNode; width: number | null }[] = [
  { id: "mobile", label: "Mobile", icon: <Smartphone className="h-3.5 w-3.5" />, width: 375 },
  { id: "tablet", label: "Tablet", icon: <Tablet className="h-3.5 w-3.5" />, width: 768 },
  { id: "desktop", label: "Desktop", icon: <Monitor className="h-3.5 w-3.5" />, width: null },
];

interface FormPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  url: string;
}

export function FormPreviewDialog({ open, onClose, url }: FormPreviewDialogProps) {
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [reloadKey, setReloadKey] = useState(0);

  const activeViewport = VIEWPORTS.find((v) => v.id === viewport)!;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-none w-screen h-screen p-0 gap-0 rounded-none border-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-gray-100">
            {VIEWPORTS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setViewport(v.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewport === v.id
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {v.icon}
                {v.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="text-gray-500 hover:text-gray-700 transition-colors p-1.5 rounded-md hover:bg-gray-100"
              title="Reload"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors p-1.5 rounded-md hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Browser chrome + iframe */}
        <div className="flex-1 overflow-auto bg-gray-100 flex items-start justify-center py-6">
          <div
            className="flex flex-col shadow-xl rounded-xl overflow-hidden transition-all duration-300"
            style={{
              width: activeViewport.width ? `${activeViewport.width}px` : "100%",
              maxWidth: activeViewport.width ? `${activeViewport.width}px` : "1280px",
              minHeight: "600px",
            }}
          >
            {/* Fake browser chrome */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-200 shrink-0">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-500 truncate border border-gray-300">
                {url}
              </div>
            </div>

            {/* iframe */}
            <iframe
              key={reloadKey}
              src={url}
              className="flex-1 bg-white"
              style={{ minHeight: "600px", height: "calc(100vh - 200px)", border: "none" }}
              title="Form preview"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
