"use client";

import { useState, useRef, useEffect } from "react";
import { FeedbackTask } from "@/types";
import { createWorker } from "tesseract.js";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  ArrowDown,
  Clipboard,
  Loader2,
  Zap,
  AlertTriangle,
  Check,
  Trash2,
  FileText,
} from "lucide-react";
import { CustomerModal } from "@/components/customer-modal";
import Image from "next/image";
import { toast } from "sonner";

const SAMPLE_FEEDBACK = `Hey, can we make the hero more exciting? The logo feels a bit small and the button doesn't pop enough. The spacing under the headline feels weird too, it's kind of cramped. Also, the colors feel a bit muted - maybe we need something more vibrant?`;

// Helper function to get priority badge styling
function getPriorityBadgeClassName(priority: string): string {
  switch (priority) {
    case "High":
      return "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 font-semibold";
    case "Medium":
      return "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 font-semibold";
    case "Low":
      return "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 font-semibold";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 font-semibold";
  }
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  contractValue: string | null;
  contractType: "monthly" | "yearly";
  isActive: boolean;
}

export default function TranslatePage() {
  const { isSignedIn, user } = useUser();
  const [mode, setMode] = useState<"text" | "image">("text");
  const [rawFeedback, setRawFeedback] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [tasks, setTasks] = useState<FeedbackTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [tasksSaved, setTasksSaved] = useState(false);
  const [savingTasks, setSavingTasks] = useState(false);
  const [extractedCustomerInfo, setExtractedCustomerInfo] = useState<any>(null);
  const [extractingCustomer, setExtractingCustomer] = useState(false);
  const [showCreateCustomerPrompt, setShowCreateCustomerPrompt] =
    useState(false);
  const emailSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [aggregatedIssues, setAggregatedIssues] = useState<any[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [updatingIssues, setUpdatingIssues] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<"new" | "open" | "closed">(
    "new"
  );
  const [clipboardContent, setClipboardContent] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteTaskIds, setPendingDeleteTaskIds] = useState<
    string[] | null
  >(null);

  useEffect(() => {
    if (isSignedIn && user) {
      fetch("/api/sync-user", { method: "POST" }).catch(console.error);
      loadCustomers();
      loadAggregatedIssues();
    }
  }, [isSignedIn, user]);

  const loadCustomers = async () => {
    try {
      const response = await fetch("/api/customers");
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
    }
  };

  const loadAggregatedIssues = async () => {
    setLoadingIssues(true);
    try {
      const response = await fetch("/api/tasks/aggregated");
      if (response.ok) {
        const data = await response.json();
        setAggregatedIssues(data.tasks || []);
      }
    } catch (err) {
      console.error("Failed to load aggregated issues:", err);
    } finally {
      setLoadingIssues(false);
    }
  };

  const handleIssueStatusChange = async (
    taskIds: string[],
    newStatus: string
  ) => {
    const taskKey = taskIds.join(",");
    setUpdatingIssues((prev) => new Set(prev).add(taskKey));
    try {
      const response = await fetch("/api/tasks/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds, status: newStatus }),
      });
      if (response.ok) {
        await loadAggregatedIssues();
      } else {
        console.error("Failed to update issue status");
      }
    } catch (err) {
      console.error("Error updating issue status:", err);
    } finally {
      setUpdatingIssues((prev) => {
        const next = new Set(prev);
        next.delete(taskKey);
        return next;
      });
    }
  };

  const handleIssueDelete = async (taskIds: string[]) => {
    setPendingDeleteTaskIds(taskIds);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteIssue = async () => {
    if (!pendingDeleteTaskIds) return;

    const taskIds = pendingDeleteTaskIds;
    const taskKey = taskIds.join(",");
    setShowDeleteConfirm(false);
    setUpdatingIssues((prev) => new Set(prev).add(taskKey));
    try {
      const response = await fetch("/api/tasks/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds }),
      });
      if (response.ok) {
        await loadAggregatedIssues();
        toast.success("Issue deleted successfully");
      } else {
        console.error("Failed to delete issue");
        toast.error("Failed to delete issue");
      }
    } catch (err) {
      console.error("Error deleting issue:", err);
      toast.error("An error occurred while deleting the issue");
    } finally {
      setUpdatingIssues((prev) => {
        const next = new Set(prev);
        next.delete(taskKey);
        return next;
      });
      setPendingDeleteTaskIds(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done":
        return "bg-green-100 text-green-800 border-green-200";
      case "in_progress":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "backlog":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "done":
        return "Done";
      case "in_progress":
        return "In Progress";
      case "backlog":
        return "Backlog";
      default:
        return "Todo";
    }
  };

  const filteredIssues = aggregatedIssues.filter((issue) => {
    const status = issue.status || "todo";
    switch (filterStatus) {
      case "new":
        return status === "todo" || status === "backlog";
      case "open":
        return status === "in_progress";
      case "closed":
        return status === "done";
      default:
        return true;
    }
  });

  const extractEmail = (text: string): string | null => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex);
    return matches && matches.length > 0 ? matches[0] : null;
  };

  const extractCompanyFromEmail = (email: string): string | null => {
    const genericDomains = [
      "gmail.com",
      "yahoo.com",
      "hotmail.com",
      "outlook.com",
      "icloud.com",
      "aol.com",
      "mail.com",
      "protonmail.com",
      "yandex.com",
      "zoho.com",
      "gmx.com",
      "live.com",
      "msn.com",
      "me.com",
      "mac.com",
    ];
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain || genericDomains.includes(domain)) return null;
    let companyName = domain;
    if (companyName.endsWith(".co.uk")) {
      companyName = companyName.replace(/\.co\.uk$/, "");
    } else if (companyName.endsWith(".com.au")) {
      companyName = companyName.replace(/\.com\.au$/, "");
    } else {
      companyName = companyName.replace(
        /\.(com|net|org|io|ai|app|dev|tech|digital|media|group|inc|llc|co|uk|us|ca|au|nz)$/i,
        ""
      );
    }
    companyName = companyName.split(".")[0];
    return companyName.charAt(0).toUpperCase() + companyName.slice(1);
  };

  const extractNameFromText = (
    text: string,
    email: string
  ): { firstName: string | null; lastName: string | null } => {
    const emailIndex = text.toLowerCase().indexOf(email.toLowerCase());
    if (emailIndex === -1) return { firstName: null, lastName: null };
    const beforeEmail = text.substring(
      Math.max(0, emailIndex - 200),
      emailIndex
    );
    const afterEmail = text.substring(
      emailIndex + email.length,
      Math.min(text.length, emailIndex + email.length + 200)
    );
    const hiPattern = /(?:hi|hello|hey|dear)\s+([A-Z][a-z]+)/i;
    const hiMatch = beforeEmail.match(hiPattern);
    if (hiMatch) return { firstName: hiMatch[1], lastName: null };
    const fromPattern = /from[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;
    const fromMatch = beforeEmail.match(fromPattern);
    if (fromMatch) {
      const nameParts = fromMatch[1].trim().split(/\s+/);
      if (nameParts.length >= 2)
        return { firstName: nameParts[0], lastName: nameParts[1] };
      if (nameParts.length === 1)
        return { firstName: nameParts[0], lastName: null };
    }
    return { firstName: null, lastName: null };
  };

  const matchCustomerByEmail = async (email: string, sourceText?: string) => {
    setExtractingCustomer(true);
    try {
      const searchResponse = await fetch("/api/customers/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const matchingCustomers = searchData.customers || [];
        if (matchingCustomers.length > 0) {
          setSelectedCustomerId(matchingCustomers[0].id);
          setShowCreateCustomerPrompt(false);
          setExtractedCustomerInfo(null);
        } else {
          const company = extractCompanyFromEmail(email);
          const nameInfo = sourceText
            ? extractNameFromText(sourceText, email)
            : { firstName: null, lastName: null };
          setExtractedCustomerInfo({
            email,
            firstName: nameInfo.firstName,
            lastName: nameInfo.lastName,
            company,
          });
          setShowCreateCustomerPrompt(true);
        }
      }
    } catch (err) {
      console.error("Error matching customer:", err);
    } finally {
      setExtractingCustomer(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    setOcrLoading(true);
    setError(null);
    setExtractedCustomerInfo(null);
    setShowCreateCustomerPrompt(false);
    try {
      const worker = await createWorker("eng");
      const {
        data: { text },
      } = await worker.recognize(file);
      await worker.terminate();
      const extractedText = text.trim();
      setOcrText(extractedText);
      if (extractedText) {
        const email = extractEmail(extractedText);
        if (email) await matchCustomerByEmail(email, extractedText);
      }
    } catch (err) {
      setError("Failed to extract text from image. Please try again.");
      console.error("OCR error:", err);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleCreateCustomer = async (customerData: any) => {
    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create customer");
      }
      const data = await response.json();
      await loadCustomers();
      setSelectedCustomerId(data.customer.id);
      setShowCustomerModal(false);
      setShowCreateCustomerPrompt(false);
      setExtractedCustomerInfo(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create customer"
      );
    }
  };

  const handleTranslate = async () => {
    const feedback = mode === "text" ? rawFeedback : ocrText;
    if (!feedback.trim()) {
      setError("Please provide some feedback to translate");
      return;
    }
    setLoading(true);
    setError(null);
    setTasks([]);
    setCustomerInfo(null);
    setTasksSaved(false);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback,
          source: mode,
          customerId: selectedCustomerId || undefined,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to translate feedback");
      }
      const data = await response.json();
      setTasks(data.tasks || []);
      setCustomerInfo(data.customer);
      setTasksSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Translation error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUseSample = () => {
    setRawFeedback(SAMPLE_FEEDBACK);
    setMode("text");
  };

  const checkClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 0) {
          setClipboardContent(text);
        } else {
          setClipboardContent(null);
        }
      }
    } catch (err) {
      // Clipboard API might not be available or user denied permission
      setClipboardContent(null);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setRawFeedback(text);
          setClipboardContent(null);
        }
      }
    } catch (err) {
      console.error("Failed to read clipboard:", err);
    }
  };

  const effectiveFeedback = mode === "text" ? rawFeedback : ocrText;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">Translate Feedback</h1>
              {tasks.length > 0 && <Badge variant="secondary">{tasks.length} tasks</Badge>}
            </div>
            <p className="text-sm text-gray-500 mt-1">Transform client feedback into actionable tasks</p>
          </div>
          <Button
            onClick={handleTranslate}
            disabled={loading || !effectiveFeedback.trim() || ocrLoading}
            size="sm"
            className="bg-black hover:bg-gray-900 text-white shadow-sm h-8 px-3 text-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Translating...</span>
              </>
            ) : (
              <>
                <Zap className="w-3 h-3" />
                <span>Translate Feedback to Tasks</span>
              </>
            )}
          </Button>
        </div>
      {/* Stats cards */}
      {tasks.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Total Tasks
              </p>
              <p className="text-xl font-bold">{tasks.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                High Priority
              </p>
              <p className="text-xl font-bold text-destructive">
                {tasks.filter((t) => t.priority === "High").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Est. Time
              </p>
              <p className="text-xl font-bold">
                {tasks.reduce((sum, t) => sum + t.estimatedTimeMinutes, 0)}m
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main feedback card */}
      <Card className="mb-5">
        <CardContent className="p-5">
          {/* Customer Selection */}
          <div className="mb-4">
            <Label className="mb-1.5 text-sm">
              Customer{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <div className="flex gap-2">
              <Select
                value={selectedCustomerId || ""}
                onValueChange={(value) => setSelectedCustomerId(value || null)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers
                    .filter((c) => c.isActive)
                    .map((customer) => {
                      const contractValue = customer.contractValue
                        ? parseFloat(customer.contractValue)
                        : 0;
                      const annualValue =
                        customer.contractType === "yearly"
                          ? contractValue
                          : contractValue * 12;
                      return (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                          {customer.company ? ` (${customer.company})` : ""} - $
                          {annualValue.toLocaleString()}/yr
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
              <Button
                onClick={() => setShowCustomerModal(true)}
                variant="outline"
                className="whitespace-nowrap"
              >
                + New Customer
              </Button>
              {selectedCustomerId && (
                <Button asChild variant="outline" className="whitespace-nowrap">
                  <Link href="/customers">Manage</Link>
                </Button>
              )}
            </div>
            {selectedCustomerId &&
              (() => {
                const customer = customers.find(
                  (c) => c.id === selectedCustomerId
                );
                if (!customer) return null;
                const contractValue = customer.contractValue
                  ? parseFloat(customer.contractValue)
                  : 0;
                const annualValue =
                  customer.contractType === "yearly"
                    ? contractValue
                    : contractValue * 12;
                const isHighValue = annualValue > 50000;
                const isMediumValue = annualValue > 10000;
                return (
                  <Badge
                    variant={
                      isHighValue
                        ? "destructive"
                        : isMediumValue
                        ? "secondary"
                        : "outline"
                    }
                    className="mt-2"
                  >
                    {isHighValue
                      ? "⭐ High-Value Customer"
                      : isMediumValue
                      ? "Medium-Value Customer"
                      : "Standard Customer"}{" "}
                    • Annual Value: ${annualValue.toLocaleString()}
                  </Badge>
                );
              })()}
          </div>

          {/* Tab selector */}
          <div className="flex gap-2 mb-4 bg-muted rounded-lg p-1">
            <Button
              onClick={() => {
                setMode("text");
                setError(null);
              }}
              variant={mode === "text" ? "secondary" : "ghost"}
              className="flex-1"
            >
              Text
            </Button>
            <Button
              onClick={() => {
                setMode("image");
                setError(null);
              }}
              variant={mode === "image" ? "secondary" : "ghost"}
              className="flex-1"
            >
              Screenshot
            </Button>
          </div>

          {/* Input section */}
          {mode === "text" ? (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-sm">Client Feedback</Label>
                {clipboardContent && (
                  <button
                    onClick={handlePasteFromClipboard}
                    className="text-xs text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
                  >
                    Paste from clipboard
                    <ArrowDown className="w-3 h-3" />
                  </button>
                )}
              </div>
              <Textarea
                value={rawFeedback}
                onChange={(e) => {
                  const newText = e.target.value;
                  setRawFeedback(newText);
                  if (emailSearchTimeoutRef.current) {
                    clearTimeout(emailSearchTimeoutRef.current);
                  }
                  if (newText.trim() && !selectedCustomerId) {
                    emailSearchTimeoutRef.current = setTimeout(async () => {
                      const email = extractEmail(newText);
                      if (email) await matchCustomerByEmail(email, newText);
                    }, 1000);
                  }
                }}
                onFocus={checkClipboard}
                placeholder="Hey, can we make the hero more exciting? The logo feels a bit small and the button doesn't pop enough. The spacing under the headline feels weird too, it's kind of cramped."
                className="h-32 resize-none text-sm"
              />
              {extractingCustomer && (
                <Alert className="mt-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>Searching for customer...</AlertDescription>
                </Alert>
              )}
              {showCreateCustomerPrompt && extractedCustomerInfo && (
                <Alert className="mt-4 border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <div className="flex-1">
                    <AlertDescription className="text-yellow-800">
                      <div className="mb-2 font-semibold">Email Found</div>
                      <p className="text-sm text-yellow-700 mb-3">
                        We found an email address but couldn't find a matching
                        customer profile. Create a new customer profile?
                      </p>
                      <div className="text-xs text-yellow-600 space-y-1">
                        {extractedCustomerInfo.email && (
                          <div>
                            <strong>Email:</strong>{" "}
                            {extractedCustomerInfo.email}
                          </div>
                        )}
                        {(extractedCustomerInfo.firstName ||
                          extractedCustomerInfo.lastName) && (
                          <div>
                            <strong>Name:</strong>{" "}
                            {[
                              extractedCustomerInfo.firstName,
                              extractedCustomerInfo.lastName,
                            ]
                              .filter(Boolean)
                              .join(" ") || "Not found"}
                          </div>
                        )}
                        {extractedCustomerInfo.company && (
                          <div>
                            <strong>Company:</strong>{" "}
                            {extractedCustomerInfo.company}
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                    <div className="flex gap-2 mt-3">
                      <Button
                        onClick={() => setShowCustomerModal(true)}
                        size="sm"
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        Create Profile
                      </Button>
                      <Button
                        onClick={() => {
                          setShowCreateCustomerPrompt(false);
                          setExtractedCustomerInfo(null);
                        }}
                        size="sm"
                        variant="outline"
                      >
                        Skip
                      </Button>
                    </div>
                  </div>
                </Alert>
              )}
            </div>
          ) : (
            <div className="mb-4">
              <Label className="block text-sm font-medium mb-2">
                Upload Screenshot
              </Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors bg-gray-50/50">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {imagePreview ? (
                  <div className="space-y-4">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-w-full h-auto max-h-64 mx-auto rounded-lg"
                    />
                    <Button
                      onClick={() => {
                        setImagePreview(null);
                        setOcrText("");
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Remove Image
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Click to upload or drag and drop
                    </p>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                    >
                      Select Image
                    </Button>
                  </div>
                )}
              </div>
              {ocrLoading && (
                <Alert className="mt-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    Extracting text from image...
                  </AlertDescription>
                </Alert>
              )}
              {ocrText && (
                <div className="mt-4">
                  <Label className="block text-sm font-medium mb-2">
                    Extracted Text
                  </Label>
                  <Textarea
                    value={ocrText}
                    onChange={(e) => {
                      const newText = e.target.value;
                      setOcrText(newText);
                      if (emailSearchTimeoutRef.current) {
                        clearTimeout(emailSearchTimeoutRef.current);
                      }
                      if (newText.trim() && !selectedCustomerId) {
                        emailSearchTimeoutRef.current = setTimeout(async () => {
                          const email = extractEmail(newText);
                          if (email) await matchCustomerByEmail(email, newText);
                        }, 1000);
                      }
                    }}
                    className="h-32 resize-none text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleTranslate}
            disabled={loading || !effectiveFeedback.trim() || ocrLoading}
            className="w-full"
            size="default"
            variant="default"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Translating...</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                <span>Translate to Tasks</span>
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results section */}
      {tasks.length > 0 && (
        <Card className="mb-5">
          <div className="px-5 py-4 border-b border-gray-200/80 flex justify-between items-center">
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">
                Generated Tasks
              </h2>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500">
                  {tasks.length} tasks ready to work on
                </p>
                {customerInfo && (
                  <Badge variant="outline" className="text-xs">
                    {customerInfo.name}
                    {customerInfo.company ? ` (${customerInfo.company})` : ""}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const text = tasks
                    .map((task, index) => {
                      const priorityEmoji =
                        task.priority === "High"
                          ? "🔴"
                          : task.priority === "Medium"
                          ? "🟡"
                          : "🟢";
                      return `${index + 1}) ${task.title} (${task.priority}, ~${
                        task.estimatedTimeMinutes
                      } min)${priorityEmoji}\n- ${
                        task.description
                      }\n- Reason: ${task.reason}`;
                    })
                    .join("\n\n");
                  navigator.clipboard.writeText(text);
                  toast.success("Copied to clipboard!");
                }}
                variant="outline"
                size="sm"
              >
                <Clipboard className="w-4 h-4 mr-2" />
                Copy
              </Button>
              {!tasksSaved && (
                <Button
                  onClick={async () => {
                    setSavingTasks(true);
                    try {
                      await fetch("/api/tasks/aggregated");
                      setTasksSaved(true);
                      // Refresh the issues list after saving
                      await loadAggregatedIssues();
                    } catch (err) {
                      setError(
                        "Failed to refresh tasks. They are already saved."
                      );
                      setTasksSaved(true);
                    } finally {
                      setSavingTasks(false);
                    }
                  }}
                  variant="default"
                  size="sm"
                  disabled={savingTasks}
                >
                  {savingTasks ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Save Tasks
                    </>
                  )}
                </Button>
              )}
              {tasksSaved && (
                <Badge variant="secondary" className="px-4 py-2">
                  <Check className="w-4 h-4 mr-2" />
                  Saved
                </Badge>
              )}
            </div>
          </div>
          <div className="divide-y">
            {tasks.map((task, index) => (
              <div
                key={index}
                className="px-5 py-3 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-semibold text-gray-500">
                        #{index + 1}
                      </span>
                      <h3 className="text-sm font-semibold text-gray-900">
                        {task.title}
                      </h3>
                      <Badge
                        variant={
                          task.priority === "High"
                            ? "destructive"
                            : task.priority === "Medium"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {task.priority}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        ~{task.estimatedTimeMinutes}m
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">
                      {task.description}
                    </p>
                    <p className="text-xs text-gray-500 italic">
                      Reason: {task.reason}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Issues List */}
      <Card className="border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 bg-white rounded-lg p-0.5 border border-gray-200">
                <Button
                  onClick={() => setFilterStatus("new")}
                  variant={filterStatus === "new" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                >
                  New
                </Button>
                <Button
                  onClick={() => setFilterStatus("open")}
                  variant={filterStatus === "open" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                >
                  Open
                </Button>
                <Button
                  onClick={() => setFilterStatus("closed")}
                  variant={filterStatus === "closed" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                >
                  Closed
                </Button>
              </div>
            </div>
          </div>
        </div>
        <CardContent className="p-0">
          {loadingIssues ? (
            <div className="divide-y divide-gray-200">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-5 py-3 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-8" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full ml-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="p-12 text-center">
              <div className="max-w-sm mx-auto">
                <Image
                  src="/images/empty-state.svg"
                  alt="No feedback  yet..."
                  width={100}
                  height={100}
                />
                <h3 className="text-sm font-medium text-gray-900 mb-1">
                  No feedback yet...
                </h3>
                <p className="text-xs text-gray-500">
                  Generate tasks from feedback to see them here.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredIssues.slice(0, 10).map((issue, index) => {
                const avgAnnualValue =
                  issue.totalAnnualValue / issue.customerCount;
                const isHighValue = issue.highValueCustomerCount > 0;
                const taskKey = issue.taskIds?.join(",") || issue.title;
                return (
                  <div
                    key={taskKey}
                    className="px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm font-semibold text-gray-500">
                            #{index + 1}
                          </span>
                          <h3 className="text-sm font-semibold text-gray-900">
                            {issue.title}
                          </h3>
                          <Badge
                            variant="outline"
                            className={`text-xs border ${getPriorityBadgeClassName(
                              issue.priority
                            )}`}
                          >
                            {issue.priority}
                          </Badge>
                          {isHighValue && (
                            <Badge variant="destructive" className="text-xs">
                              High-Value
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-1.5">
                          {issue.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>
                            {issue.customerCount}{" "}
                            {issue.customerCount === 1
                              ? "customer"
                              : "customers"}
                          </span>
                          {issue.highValueCustomerCount > 0 && (
                            <span className="text-red-600 font-medium">
                              {issue.highValueCustomerCount} high-value
                            </span>
                          )}
                          {avgAnnualValue > 0 && (
                            <span className="font-medium text-gray-700">
                              ${Math.round(avgAnnualValue).toLocaleString()}/yr
                              avg
                            </span>
                          )}
                          <span className="font-medium text-gray-700">
                            Score: {issue.score.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Select
                          value={issue.status || "todo"}
                          onValueChange={(value) =>
                            handleIssueStatusChange(issue.taskIds, value)
                          }
                          disabled={updatingIssues.has(taskKey)}
                        >
                          <SelectTrigger className="w-28 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todo">Todo</SelectItem>
                            <SelectItem value="in_progress">
                              In Progress
                            </SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                            <SelectItem value="backlog">Backlog</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleIssueDelete(issue.taskIds)}
                          disabled={updatingIssues.has(taskKey)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          {updatingIssues.has(taskKey) ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showCustomerModal}
        onOpenChange={(open) => {
          setShowCustomerModal(open);
          if (!open) setExtractedCustomerInfo(null);
        }}
      >
        <DialogContent>
          <CustomerModal
            onClose={() => {
              setShowCustomerModal(false);
              setExtractedCustomerInfo(null);
            }}
            onCreate={handleCreateCustomer}
            initialData={extractedCustomerInfo}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Issue</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this issue? This will delete all
              tasks in the group. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setPendingDeleteTaskIds(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteIssue}
              className="bg-red-600 hover:bg-red-700 !text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </AppLayout>
  );
}
