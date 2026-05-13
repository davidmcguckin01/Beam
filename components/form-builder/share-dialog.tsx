"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formUrl: string;
  formTitle: string;
  slug?: string;
  onSlugChange?: (newSlug: string) => void;
  pageId?: string;
}

export function ShareDialog({
  open,
  onOpenChange,
  formUrl,
  formTitle,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  async function handleCopyLink() {
    await navigator.clipboard.writeText(formUrl);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share form</DialogTitle>
          <DialogDescription>
            Share &ldquo;{formTitle}&rdquo; with a link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Form link
          </label>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={formUrl}
              className="text-sm text-gray-500 bg-gray-50"
            />
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 h-10"
              onClick={handleCopyLink}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
