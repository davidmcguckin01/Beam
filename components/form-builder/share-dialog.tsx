"use client";

import { useState, useEffect, useRef } from "react";
import { Mail, Loader2, Check, Copy } from "lucide-react";
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

interface Customer {
  id: string;
  name: string;
  email: string | null;
}

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
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setEmail("");
      setSearchResults([]);
      setShowResults(false);
      setCopied(false);
    }
  }, [open]);

  // Debounced contact search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = email.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const isEmail = trimmed.includes("@");
        const res = await fetch("/api/customers/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isEmail ? { email: trimmed } : { name: trimmed }
          ),
        });
        if (res.ok) {
          const data = await res.json();
          const withEmail = data.customers.filter(
            (c: Customer) => c.email
          );
          setSearchResults(withEmail);
          setShowResults(withEmail.length > 0);
        }
      } catch {
        // Silently fail search
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [email]);

  function selectContact(customer: Customer) {
    if (customer.email) {
      setEmail(customer.email);
    }
    setShowResults(false);
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(formUrl);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSendEmail() {
    const trimmed = email.trim();
    if (!trimmed) return;

    setSending(true);
    try {
      const res = await fetch("/api/send-form-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          formTitle,
          formUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send email");
      }

      toast.success(`Email sent to ${trimmed}`);
      setEmail("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send email"
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share form</DialogTitle>
          <DialogDescription>
            Share &ldquo;{formTitle}&rdquo; via link or email.
          </DialogDescription>
        </DialogHeader>

        {/* Copy Link Section */}
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

        <div className="h-px bg-gray-200" />

        {/* Email Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Send via email
          </label>
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type="email"
                  placeholder="Email address or search contacts..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowResults(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSendEmail();
                    }
                  }}
                  className="text-sm"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-gray-400" />
                )}
              </div>
              <Button
                size="sm"
                className="shrink-0 h-10"
                onClick={handleSendEmail}
                disabled={!email.trim() || sending}
              >
                {sending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Mail className="h-3.5 w-3.5 mr-1.5" />
                    Send
                  </>
                )}
              </Button>
            </div>

            {/* Contact autocomplete dropdown */}
            {showResults && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                    onClick={() => selectContact(customer)}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {customer.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {customer.email}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
