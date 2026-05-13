"use client";

import { CustomerModal } from "@/components/customer-modal";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FeedbackTask } from "@/types";
import { useUser } from "@clerk/nextjs";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  Clipboard,
  Download,
  Edit2,
  FileText,
  GripVertical,
  Loader2,
  MessageSquare,
  Plus,
  Save,
  Trash2,
  X,
  Zap,
  Crown,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createWorker } from "tesseract.js";
import { toast } from "sonner";
import { fetchFaviconUrlForCustomer } from "@/lib/customer-branding";
import { BrandIcon } from "@/components/brand-icon";
import { FeedbackPagesSection } from "@/app/dashboard/feedback-pages/page";
import { PLANS, type PlanId, type BillingPeriod } from "@/lib/pricing";

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

interface SortableTaskItemProps {
  task: FeedbackTask;
  index: number;
}

interface SortableIssueItemProps {
  issue: any;
  index: number;
  isHighValue: boolean;
  avgAnnualValue: number;
  updatingIssues: Set<string>;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
  handleStatusChange: (taskIds: string[], newStatus: string) => void;
  handleDelete: (taskIds: string[]) => void;
  onIssueClick: (issue: any) => void;
  isSelected: boolean;
  onSelect: (
    issue: any,
    selected: boolean,
    shiftKey: boolean,
    index: number
  ) => void;
}

function SortableIssueItem({
  issue,
  index,
  isHighValue,
  avgAnnualValue,
  updatingIssues,
  getStatusColor,
  getStatusLabel,
  handleStatusChange,
  handleDelete,
  onIssueClick,
  isSelected,
  onSelect,
}: SortableIssueItemProps) {
  const issueId = issue.taskIds?.join(",") || issue.title;
  const shiftKeyRef = useRef<boolean>(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issueId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`transition-all cursor-pointer ${isDragging ? "bg-gray-50 opacity-50" : ""
        }`}
      onClick={(e) => {
        // Don't trigger click if clicking on interactive elements
        const target = e.target as HTMLElement;
        if (
          target.closest("button") ||
          target.closest("select") ||
          target.closest("[data-drag-handle]") ||
          target.closest("input[type='checkbox']") ||
          target.closest("[role='checkbox']") ||
          target.tagName === "INPUT" ||
          target.tagName === "BUTTON" ||
          target.tagName === "SELECT" ||
          target.getAttribute("role") === "checkbox"
        ) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        onIssueClick(issue);
      }}
      onMouseDown={(e) => {
        const target = e.target as HTMLElement;
        if (
          target.closest("button") ||
          target.closest("select") ||
          target.closest("[data-drag-handle]") ||
          target.closest("input[type='checkbox']") ||
          target.closest("[role='checkbox']") ||
          target.getAttribute("role") === "checkbox"
        ) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              {...attributes}
              {...listeners}
              data-drag-handle
              className="cursor-grab active:cursor-grabbing flex items-center self-center text-gray-400 hover:text-gray-500 shrink-0"
            >
              <GripVertical className="w-4 h-4" />
            </div>
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => {
                // Only handle if it wasn't a shift-click (handled in onMouseDown)
                if (!shiftKeyRef.current) {
                  onSelect(issue, checked === true, false, index);
                }
                shiftKeyRef.current = false; // Reset
              }}
              onClick={(e) => {
                e.stopPropagation();
                // Prevent default for shift-clicks to handle range selection
                if (e.shiftKey) {
                  e.preventDefault();
                }
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                // Handle shift-click for range selection
                if (e.shiftKey) {
                  e.preventDefault();
                  shiftKeyRef.current = true;
                  const checked = !isSelected;
                  onSelect(issue, checked, true, index);
                } else {
                  shiftKeyRef.current = false;
                }
              }}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <h3 className="text-sm font-semibold text-gray-900">
                  {issue.title}
                </h3>
                <Badge
                  variant="outline"
                  className={`text-xs h-5 border ${getPriorityBadgeClassName(
                    issue.priority
                  )}`}
                >
                  {issue.priority}
                </Badge>
                {isHighValue && (
                  <Badge variant="destructive" className="text-xs h-5">
                    High-Value
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-600 mb-2.5 line-clamp-2">
                {issue.description}
              </p>
              <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                <span>
                  {issue.customerCount}{" "}
                  {issue.customerCount === 1 ? "customer" : "customers"}
                </span>
                {issue.highValueCustomerCount > 0 && (
                  <span className="text-red-600 font-medium">
                    {issue.highValueCustomerCount} high-value
                  </span>
                )}
                {avgAnnualValue > 0 && (
                  <span className="font-medium text-gray-700">
                    ${Math.round(avgAnnualValue).toLocaleString()}/yr avg
                  </span>
                )}
                {issue.score && (
                  <span className="font-medium text-gray-700">
                    Score: {issue.score.toLocaleString()}
                  </span>
                )}
                {issue.createdAt && (
                  <span className="text-gray-500">
                    {new Date(issue.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Select
              value={issue.status || "todo"}
              onValueChange={(value) =>
                handleStatusChange(issue.taskIds, value)
              }
              disabled={updatingIssues.has(issue.taskIds.join(","))}
            >
              <SelectTrigger
                className="w-28 h-7 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="todo">Todo</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="backlog">Backlog</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(issue.taskIds);
              }}
              disabled={updatingIssues.has(issue.taskIds.join(","))}
              className="h-7 w-7 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
            >
              {updatingIssues.has(issue.taskIds.join(",")) ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SortableTaskItem({ task, index }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`px-6 py-5 hover:bg-gray-50 transition-colors ${isDragging ? "bg-gray-100" : ""
        }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing mt-1 text-gray-500 hover:text-gray-600"
          >
            <GripVertical className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-bold text-gray-500">
                #{index + 1}
              </span>
              <h3 className="text-base font-semibold text-gray-900">
                {task.title}
              </h3>
              <Badge
                variant="outline"
                className={`text-xs border ${getPriorityBadgeClassName(
                  task.priority
                )}`}
              >
                {task.priority}
              </Badge>
              <span className="text-xs text-gray-500">
                ~{task.estimatedTimeMinutes}m
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
            <p className="text-xs text-gray-500 italic">
              Reason: {task.reason}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  faviconUrl?: string | null;
  contractValue: string | null;
  contractType: "monthly" | "yearly";
  isActive: boolean;
}

export default function DashboardPage() {
  const { isSignedIn, user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const emailSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [aggregatedIssues, setAggregatedIssues] = useState<any[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [updatingIssues, setUpdatingIssues] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<
    "todo" | "in_progress" | "done" | "backlog"
  >("todo");
  const [orderedFilteredIssues, setOrderedFilteredIssues] = useState<any[]>([]);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [translationStats, setTranslationStats] = useState<{
    created: number;
    updated: number;
    total: number;
  } | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [issueLogs, setIssueLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [isEditingIssue, setIsEditingIssue] = useState(false);
  const [editingIssue, setEditingIssue] = useState<any>(null);
  const [savingIssue, setSavingIssue] = useState(false);
  const [showCustomersModal, setShowCustomersModal] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [extractingCustomerInfo, setExtractingCustomerInfo] = useState(false);
  const [extractedCustomerData, setExtractedCustomerData] = useState<any>(null);
  const [editingExtractedCustomer, setEditingExtractedCustomer] =
    useState<any>(null);
  const [clipboardContent, setClipboardContent] = useState<string | null>(null);
  const [pendingFeedback, setPendingFeedback] = useState<string>("");
  const [pendingMode, setPendingMode] = useState<"text" | "image">("text");
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteTaskIds, setPendingDeleteTaskIds] = useState<
    string[] | null
  >(null);
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null
  );
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [deletingIssues, setDeletingIssues] = useState(false);
  const [feedbackPagesCount, setFeedbackPagesCount] = useState<number>(0);
  const [recentForms, setRecentForms] = useState<{ id: string; title: string; updatedAt: string }[]>([]);
  const [newSubmissionsCount, setNewSubmissionsCount] = useState<number>(0);
  const [planInfo, setPlanInfo] = useState<{
    plan: string;
    responseUsage?: { used: number; limit: number | null; bonusResponses: number; effectiveLimit: number | null; remaining: number | null; resetsAt: string };
  } | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeBillingPeriod, setUpgradeBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [createFormTrigger, setCreateFormTrigger] = useState(0);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Strip session_id from the URL on dashboard load (legacy checkout redirect
  // param). Kept for backward compat with old links.
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("session_id");
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [searchParams, router]);

  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  const claimPendingForm = async () => {
    try {
      const raw = localStorage.getItem("pendingFormConfig");
      if (!raw) return;

      const pending = JSON.parse(raw);

      // Reject if older than 1 hour
      const createdAt = new Date(pending.createdAt);
      if (Date.now() - createdAt.getTime() > 3600000) {
        localStorage.removeItem("pendingFormConfig");
        return;
      }

      const { formConfig, prompt } = pending;
      if (!formConfig || !formConfig.steps?.length) {
        localStorage.removeItem("pendingFormConfig");
        return;
      }

      const title = prompt
        ? prompt.substring(0, 60).trim() + (prompt.length > 60 ? "..." : "")
        : "AI Generated Form";

      const customizations = {
        primaryColor: "#000000",
        backgroundColor: "#ffffff",
        textColor: "#000000",
        buttonColor: "#000000",
        buttonTextColor: "#ffffff",
        showNameField: true,
        showEmailField: true,
        requireEmail: false,
        allowedEmails: [],
        formConfig,
      };

      const res = await fetch("/api/feedback-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: prompt || null,
          customizations,
        }),
      });

      if (res.ok) {
        const newPage = await res.json();
        localStorage.removeItem("pendingFormConfig");
        toast.success("Your AI-generated form is ready!");
        router.push(`/dashboard/feedback-pages/${newPage.id}`);
      } else {
        localStorage.removeItem("pendingFormConfig");
      }
    } catch {
      localStorage.removeItem("pendingFormConfig");
    }
  };

  useEffect(() => {
    if (isSignedIn && user) {
      // Check if user is invited and has completed onboarding
      Promise.all([
        fetch("/api/onboarding").then((res) => res.json()),
        fetch("/api/workspaces")
          .then((res) => res.json())
          .catch(() => ({ workspaces: [] })),
      ])
        .then(([onboardingData, workspacesData]) => {
          // Get current workspace (from organization context)
          const currentWorkspace = workspacesData.workspaces?.[0];

          if (currentWorkspace) {
            // Check if user is invited to this workspace
            fetch(`/api/workspaces/${currentWorkspace.id}/check-invited`)
              .then((res) => res.json())
              .then((invitedData) => {
                const isInvited = invitedData.isInvited || false;

                // If user is not invited, check onboarding
                if (!isInvited && !onboardingData.profile) {
                  // User hasn't completed onboarding and is not invited, redirect
                  router.push("/onboarding");
                  return;
                }

                setIsCheckingAccess(false);

                // Claim pending AI-generated form from landing page
                claimPendingForm();

                fetch("/api/sync-user", { method: "POST" }).catch(
                  console.error
                );
                loadCustomers();
                loadAggregatedIssues();
                loadFeedbackPagesCount();
                fetch("/api/billing/plan-info").then(r => r.ok ? r.json() : null).then(d => d && setPlanInfo(d)).catch(() => { });
                fetch("/api/workspaces").then(r => r.ok ? r.json() : null).then(d => { if (d?.workspaces?.[0]?.id) setCurrentWorkspaceId(d.workspaces[0].id); }).catch(() => { });
              })
              .catch((error) => {
                console.error("Error checking if invited:", error);
                // If check fails, assume not invited and check onboarding
                if (!onboardingData.profile) {
                  router.push("/onboarding");
                  return;
                }
                setIsCheckingAccess(false);
              });
          } else {
            // No workspace, check onboarding
            if (!onboardingData.profile) {
              router.push("/onboarding");
              return;
            }
            setIsCheckingAccess(false);
          }
        })
        .catch((error) => {
          console.error("Error checking access:", error);
          setIsCheckingAccess(false);
        });
    } else if (isLoaded && !isSignedIn) {
      setIsCheckingAccess(false);
    }
  }, [isSignedIn, user, isLoaded, router]);

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
        // Clear selection when issues are reloaded
        setSelectedIssues(new Set());
      }
    } catch (err) {
      console.error("Failed to load aggregated issues:", err);
    } finally {
      setLoadingIssues(false);
    }
  };

  const loadFeedbackPagesCount = async () => {
    try {
      // Get feedback pages count
      const pagesResponse = await fetch("/api/feedback-pages");
      if (pagesResponse.ok) {
        const pages = await pagesResponse.json();
        const pagesCount = pages.length || 0;
        setFeedbackPagesCount(pagesCount);
        // Store top 5 most recently updated forms for sidebar
        const sorted = [...pages].sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setRecentForms(sorted.slice(0, 5).map((p: any) => ({ id: p.id, title: p.title, updatedAt: p.updatedAt })));

        // Get last viewed timestamp from localStorage
        const lastViewed = localStorage.getItem("feedbackPagesLastViewed");
        const lastViewedTime = lastViewed ? new Date(lastViewed) : null;

        // Get all submissions
        const submissionsResponse = await fetch(
          "/api/feedback-pages/submissions"
        );
        if (submissionsResponse.ok) {
          const data = await submissionsResponse.json();
          const submissions = data.submissions || [];
          const totalSubmissions = submissions.length;

          if (totalSubmissions === 0) {
            // No submissions exist, show pages count
            setNewSubmissionsCount(0);
            localStorage.setItem("feedbackPagesHasSubmissions", "false");
          } else {
            // Track that submissions exist
            localStorage.setItem("feedbackPagesHasSubmissions", "true");

            if (lastViewedTime) {
              // Submissions exist and we have a last viewed time, count new ones
              const newSubmissions = submissions.filter((sub: any) => {
                const createdAt = new Date(sub.createdAt);
                return createdAt > lastViewedTime;
              });
              setNewSubmissionsCount(newSubmissions.length);
            } else {
              // Submissions exist but no last viewed time, show all submissions count
              setNewSubmissionsCount(totalSubmissions);
            }
          }
        } else {
          // Failed to get submissions, default to pages count
          setNewSubmissionsCount(0);
        }
      }
    } catch (err) {
      console.error("Failed to load feedback pages count:", err);
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

  const handleIssueClick = async (issue: any) => {
    setSelectedIssue(issue);
    setEditingIssue({ ...issue });
    setIsEditingIssue(false);
    setLoadingLogs(true);
    setIssueLogs([]);

    try {
      // Fetch logs for all tasks in this issue
      const logPromises = issue.taskIds.map(async (taskId: string) => {
        try {
          const response = await fetch(`/api/tasks/${taskId}`);
          if (response.ok) {
            const data = await response.json();
            return { taskId, logs: data.logs || [] };
          }
          return { taskId, logs: [] };
        } catch (err) {
          console.error(`Error fetching logs for task ${taskId}:`, err);
          return { taskId, logs: [] };
        }
      });

      const results = await Promise.all(logPromises);
      console.log("Fetched log results:", results);

      // Flatten and sort all logs by date
      const allLogs = results
        .flatMap((result) => {
          console.log(`Task ${result.taskId} has ${result.logs.length} logs`);
          return result.logs.map((log: any) => ({
            ...log,
            taskId: result.taskId,
          }));
        })
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      console.log(`Total logs found: ${allLogs.length}`);
      setIssueLogs(allLogs);
    } catch (err) {
      console.error("Error fetching issue logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSaveIssue = async () => {
    if (!selectedIssue || !editingIssue) return;

    setSavingIssue(true);
    try {
      const response = await fetch("/api/tasks/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskIds: selectedIssue.taskIds,
          title: editingIssue.title,
          description: editingIssue.description,
          priority: editingIssue.priority,
          estimatedTimeMinutes: editingIssue.estimatedTimeMinutes,
        }),
      });

      if (response.ok) {
        // Reload issues first
        await loadAggregatedIssues();
        // Wait a bit for database to update, then refresh the selected issue and logs
        setTimeout(async () => {
          const updatedIssues = await fetch("/api/tasks/aggregated")
            .then((res) => res.json())
            .then((data) => data.tasks || [])
            .catch(() => []);

          const updatedIssue = updatedIssues.find(
            (issue: any) =>
              issue.taskIds?.join(",") === selectedIssue.taskIds?.join(",")
          );

          if (updatedIssue) {
            // Update the selected issue and reload logs
            setSelectedIssue(updatedIssue);
            setEditingIssue({ ...updatedIssue });
            setIsEditingIssue(false);

            // Reload logs
            setLoadingLogs(true);
            try {
              const logPromises = updatedIssue.taskIds.map(
                async (taskId: string) => {
                  try {
                    const response = await fetch(`/api/tasks/${taskId}`);
                    if (response.ok) {
                      const data = await response.json();
                      return { taskId, logs: data.logs || [] };
                    }
                    return { taskId, logs: [] };
                  } catch (err) {
                    console.error(
                      `Error fetching logs for task ${taskId}:`,
                      err
                    );
                    return { taskId, logs: [] };
                  }
                }
              );

              const results = await Promise.all(logPromises);
              const allLogs = results
                .flatMap((result) =>
                  result.logs.map((log: any) => ({
                    ...log,
                    taskId: result.taskId,
                  }))
                )
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                );

              setIssueLogs(allLogs);
            } catch (err) {
              console.error("Error fetching issue logs:", err);
            } finally {
              setLoadingLogs(false);
            }
          } else {
            // If issue not found, just close edit mode
            setIsEditingIssue(false);
            setSelectedIssue(null);
          }
        }, 200); // Increased timeout to ensure DB writes are complete
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to update issue");
      }
    } catch (err) {
      console.error("Error saving issue:", err);
      toast.error("An error occurred while saving the issue");
    } finally {
      setSavingIssue(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingIssue(false);
    if (selectedIssue) {
      setEditingIssue({ ...selectedIssue });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "closed":
      case "done":
        return "bg-green-100 text-green-800 border-green-200";
      case "open":
      case "in_progress":
        return "bg-gray-100 text-gray-800 border-gray-300";
      case "backlog":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "closed":
        return "Closed";
      case "open":
        return "Open";
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

  const filteredIssues = useMemo(() => {
    return aggregatedIssues.filter((issue) => {
      const status = issue.status || "todo";
      switch (filterStatus) {
        case "todo":
          return status === "todo";
        case "in_progress":
          return status === "in_progress";
        case "done":
          return status === "done";
        case "backlog":
          return status === "backlog";
        default:
          return true;
      }
    });
  }, [aggregatedIssues, filterStatus]);

  useEffect(() => {
    setOrderedFilteredIssues(filteredIssues);
  }, [filteredIssues]);

  const handleIssueDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      // Calculate the new order
      const oldIndex = orderedFilteredIssues.findIndex(
        (item) => (item.taskIds?.join(",") || item.title) === active.id
      );
      const newIndex = orderedFilteredIssues.findIndex(
        (item) => (item.taskIds?.join(",") || item.title) === over.id
      );

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(orderedFilteredIssues, oldIndex, newIndex);

        // Update local state
        setOrderedFilteredIssues(newItems);

        // Save the new order to the database
        const orderedTaskIds = newItems.map((item) => item.taskIds || []);

        try {
          const response = await fetch("/api/tasks/order", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderedTaskIds }),
          });
          if (!response.ok) {
            console.error("Failed to save order");
            // Reload to restore original order
            await loadAggregatedIssues();
          }
        } catch (err) {
          console.error("Error saving order:", err);
          // Reload to restore original order
          await loadAggregatedIssues();
        }
      }
    }
  };

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

  const attachFaviconToCustomer = async (customer: any) => {
    if (!customer) return customer;
    try {
      const faviconUrl =
        (await fetchFaviconUrlForCustomer(customer.company, customer.email)) ||
        customer.faviconUrl ||
        null;
      return faviconUrl ? { ...customer, faviconUrl } : customer;
    } catch (error) {
      console.error("Failed to attach favicon", error);
      return customer;
    }
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
          setExtractedCustomerInfo(null);
        } else {
          const company = extractCompanyFromEmail(email);
          const nameInfo = sourceText
            ? extractNameFromText(sourceText, email)
            : { firstName: null, lastName: null };
          const baseInfo = {
            email,
            firstName: nameInfo.firstName,
            lastName: nameInfo.lastName,
            company,
            name:
              nameInfo.firstName || nameInfo.lastName
                ? [nameInfo.firstName, nameInfo.lastName]
                  .filter(Boolean)
                  .join(" ")
                : "",
          };
          const enrichedInfo = await attachFaviconToCustomer(baseInfo);
          setExtractedCustomerInfo(enrichedInfo);
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
      const payload = {
        ...customerData,
        faviconUrl: customerData.faviconUrl || null,
      };
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create customer");
      }
      const data = await response.json();
      await loadCustomers();
      setSelectedCustomerId(data.customer.id);
      setShowCustomerModal(false);
      setExtractedCustomerInfo(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create customer"
      );
    }
  };

  const handleTranslate = async (): Promise<{
    success: boolean;
    taskCount: number;
  }> => {
    const feedback = mode === "text" ? rawFeedback : ocrText;
    if (!feedback.trim()) {
      setError("Please provide some feedback to translate");
      return { success: false, taskCount: 0 };
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
          preview: true, // Preview mode - don't save to DB
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
      setTranslationStats(data.stats || null);
      // Store feedback and mode for saving later
      setPendingFeedback(feedback);
      setPendingMode(mode);
      // Show modal with generated tasks (preview mode - not saved yet)
      if (data.tasks && data.tasks.length > 0) {
        setShowTasksModal(true);
      }
      // Don't reload issues yet - tasks aren't saved
      return { success: true, taskCount: (data.tasks || []).length };
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Translation error:", err);
      return { success: false, taskCount: 0 };
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

  const handleUpgradeCheckout = async (planId: PlanId) => {
    // Checkout removed — all features are now available on every workspace.
    setUpgradeLoading(planId);
    setUpgradeLoading(null);
  };

  // Show loading state while checking access.
  if (isCheckingAccess || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      </div>
    );
  }

  const usageUsed = planInfo?.responseUsage?.used ?? 0;
  const usageLimit = planInfo?.responseUsage?.effectiveLimit ?? null;
  const usagePercent = usageLimit ? Math.min(100, Math.round((usageUsed / usageLimit) * 100)) : 0;
  const planLabel = planInfo?.plan ? planInfo.plan.charAt(0).toUpperCase() + planInfo.plan.slice(1) : "Free";
  const isUnlimited = usageLimit === null;

  return (
    <>
      <div className="flex min-h-[calc(100vh-52px)]">
        {/* Sidebar — only show when forms exist, styled like top nav */}
        {feedbackPagesCount > 0 && (
          <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-gray-50 border-r border-gray-200/90">
            <div className="sticky top-[52px] flex flex-col gap-4 px-4 py-5 h-[calc(100vh-52px)] overflow-y-auto">
              <div>
                <h3 className="text-xs font-semibold text-gray-900 mb-0.5">Transform feedback</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Collect feedback and turn it into tasks.
                </p>
              </div>

              <Button
                onClick={() => setCreateFormTrigger((c) => c + 1)}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white h-8 text-xs font-medium rounded-md"
              >
                <Plus className="w-3 h-3 mr-1.5" />
                Create new form
              </Button>

              {/* Recent forms */}
              {recentForms.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Recent</p>
                  <div className="space-y-0.5">
                    {recentForms.map((form) => (
                      <button
                        key={form.id}
                        onClick={() => router.push(`/dashboard/feedback-pages/${form.id}`)}
                        className="w-full text-left px-2 py-1.5 rounded-md text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors truncate"
                      >
                        {form.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Usage & upgrade — pushed to bottom */}
              <div className="mt-auto space-y-3">
                {/* Usage card */}
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-700">Responses</span>
                    <span className="text-xs font-medium text-gray-500 capitalize">{planLabel} plan</span>
                  </div>
                  {isUnlimited ? (
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-gray-600">Unlimited</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-lg font-bold text-gray-900">{usageUsed.toLocaleString()}</span>
                        <span className="text-xs text-gray-500">/ {usageLimit!.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${usagePercent >= 90 ? "bg-red-500" : usagePercent >= 70 ? "bg-amber-400" : "bg-gray-900"}`}
                          style={{ width: `${Math.max(2, usagePercent)}%` }}
                        />
                      </div>
                      {planInfo?.responseUsage?.remaining !== null && planInfo?.responseUsage?.remaining !== undefined && (
                        <p className={`text-xs mt-1.5 ${usagePercent >= 90 ? "text-red-500 font-medium" : "text-gray-500"}`}>
                          {planInfo.responseUsage.remaining === 0
                            ? "Limit reached — upgrade for more"
                            : `${planInfo.responseUsage.remaining.toLocaleString()} remaining this month`}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Upgrade CTA */}
                {planInfo?.plan !== "business" && planInfo?.plan !== "enterprise" && (
                  <button
                    onClick={() => setShowUpgradeDialog(true)}
                    className="w-full flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white p-3 text-left hover:border-gray-300 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-gray-900 shrink-0">
                      <Crown className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 group-hover:text-gray-700">Upgrade plan</p>
                      <p className="text-xs text-gray-500 leading-tight">
                        {!planInfo?.plan || planInfo.plan === "free"
                          ? "Get 500+ responses/mo"
                          : planInfo.plan === "starter"
                            ? "Get 2,000 responses/mo"
                            : "Unlock unlimited responses"}
                      </p>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </aside>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="max-w-6xl mx-auto px-6 py-5">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
                    {tasks.length > 0 && <Badge variant="secondary">{tasks.length} tasks</Badge>}
                  </div>
                  <p className="text-sm text-gray-500">Transform client feedback into actionable tasks</p>
                </div>
              </div>
            </div>

            {/* Feedback Pages overview */}
            <FeedbackPagesSection showEmptyState={false} triggerCreate={createFormTrigger} />
          </div>
        </div>
      </div>

      {/* Tasks + Issues — hidden */}
      {false && <><section className="mt-12 mb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Tasks From Feedback
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Review, prioritize, and export the work generated from recent
              submissions.
            </p>
          </div>
          <div className="mt-3 sm:mt-0">
            {aggregatedIssues.length > 0 && (
              <Button
                onClick={() => {
                  setShowFeedbackDialog(true);
                  setCurrentStep(1);
                  // Reset state when opening dialog
                  setRawFeedback("");
                  setOcrText("");
                  setImagePreview(null);
                  setSelectedCustomerId(null);
                  setExtractedCustomerData(null);
                  setError(null);
                }}
                size="sm"
                className="bg-black hover:bg-gray-900 text-white"
              >
                <Zap className="w-4 h-4 mr-2" />
                Translate Feedback to Tasks
              </Button>
            )}
          </div>
        </div>
      </section>

        {/* Feedback Dialog */}
        <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Translate Feedback</DialogTitle>
              <DialogDescription>
                Transform client feedback into actionable tasks
              </DialogDescription>
            </DialogHeader>

            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-6">
              <div
                className={`flex items-center gap-2 ${currentStep >= 1 ? "text-gray-900" : "text-gray-500"
                  }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1
                      ? "bg-black text-white"
                      : "bg-gray-200 text-gray-500"
                    }`}
                >
                  {currentStep > 1 ? <Check className="w-4 h-4" /> : "1"}
                </div>
                <span className="text-sm font-medium">Upload Evidence</span>
              </div>
              <div className="flex-1 h-px bg-gray-200" />
              <div
                className={`flex items-center gap-2 ${currentStep >= 2 ? "text-gray-900" : "text-gray-500"
                  }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2
                      ? "bg-black text-white"
                      : "bg-gray-200 text-gray-500"
                    }`}
                >
                  2
                </div>
                <span className="text-sm font-medium">
                  Extract/Select Customer
                </span>
              </div>
            </div>

            <div className="space-y-6">
              {/* Step 1: Upload Evidence */}
              {currentStep === 1 && (
                <>
                  {/* Tab selector */}
                  <div className="flex items-center gap-1 mb-4 bg-white border border-gray-300 rounded-lg p-1 w-full">
                    <Button
                      onClick={() => {
                        setMode("text");
                        setError(null);
                      }}
                      variant="ghost"
                      size="sm"
                      className={`flex-1 h-8 px-3 text-xs cursor-pointer ${mode === "text"
                          ? "bg-gray-200 text-gray-900 hover:bg-gray-300 font-semibold"
                          : "text-gray-600 hover:text-gray-900"
                        }`}
                    >
                      Text
                    </Button>
                    <Button
                      onClick={() => {
                        setMode("image");
                        setError(null);
                      }}
                      variant="ghost"
                      size="sm"
                      className={`flex-1 h-8 px-3 text-xs cursor-pointer ${mode === "image"
                          ? "bg-gray-200 text-gray-900 hover:bg-gray-300 font-semibold"
                          : "text-gray-600 hover:text-gray-900"
                        }`}
                    >
                      Screenshot
                    </Button>
                  </div>

                  {/* Input section */}
                  {mode === "text" ? (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <Label>Client Feedback</Label>
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
                        onChange={(e) => setRawFeedback(e.target.value)}
                        onFocus={checkClipboard}
                        placeholder="Hey, can we make the hero more exciting? The logo feels a bit small and the button doesn't pop enough. The spacing under the headline feels weird too, it's kind of cramped."
                        className="h-40 resize-none"
                      />
                    </div>
                  ) : (
                    <div>
                      <Label className="block text-sm font-medium mb-3">
                        Upload Screenshot
                      </Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors bg-gray-50/50">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        {imagePreview !== null ? (
                          <div className="space-y-4">
                            <Image
                              src={imagePreview!}
                              alt="Preview"
                              width={512}
                              height={512}
                              className="max-w-full h-auto max-h-64 mx-auto rounded-lg object-contain"
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
                          <Label className="block text-sm font-medium mb-3">
                            Extracted Text
                          </Label>
                          <Textarea
                            value={ocrText}
                            onChange={(e) => setOcrText(e.target.value)}
                            className="h-40 resize-none"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {error && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </>
              )}

              {/* Step 2: Extract/Select Customer */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  {extractingCustomerInfo && (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                        <p className="text-sm text-gray-500">
                          Extracting customer information...
                        </p>
                      </div>
                    </div>
                  )}

                  {!extractingCustomerInfo && (
                    <div className="space-y-4">
                      {extractedCustomerData ? (
                        <div className="rounded-lg border border-gray-300 bg-gray-50/50 p-5">
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-600" />
                                <h3 className="text-sm font-semibold text-gray-900">
                                  Customer information found
                                </h3>
                              </div>
                              <Button
                                onClick={() => {
                                  setEditingExtractedCustomer({
                                    ...extractedCustomerData,
                                    contractValue: "",
                                    contractType: "monthly",
                                  });
                                }}
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                              >
                                <Edit2 className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500 ml-6">
                              Extracted from feedback
                            </p>
                          </div>

                          {editingExtractedCustomer ? (
                            <div className="bg-white rounded-md border border-gray-300 p-4 mb-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span>Brand icon</span>
                                </div>
                                <BrandIcon
                                  src={
                                    editingExtractedCustomer.faviconUrl ||
                                    extractedCustomerData?.faviconUrl
                                  }
                                  label={
                                    editingExtractedCustomer.company ||
                                    editingExtractedCustomer.name ||
                                    editingExtractedCustomer.email ||
                                    "Brand"
                                  }
                                  size={40}
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500 mb-1.5 block">
                                  Name
                                </Label>
                                <Input
                                  value={editingExtractedCustomer.name || ""}
                                  onChange={(e) =>
                                    setEditingExtractedCustomer({
                                      ...editingExtractedCustomer,
                                      name: e.target.value,
                                    })
                                  }
                                  className="h-8 text-sm"
                                  placeholder="Customer name"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500 mb-1.5 block">
                                  Email
                                </Label>
                                <Input
                                  type="email"
                                  value={editingExtractedCustomer.email || ""}
                                  onChange={(e) =>
                                    setEditingExtractedCustomer({
                                      ...editingExtractedCustomer,
                                      email: e.target.value,
                                    })
                                  }
                                  className="h-8 text-sm"
                                  placeholder="email@example.com"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500 mb-1.5 block">
                                  Company
                                </Label>
                                <Input
                                  value={editingExtractedCustomer.company || ""}
                                  onChange={(e) =>
                                    setEditingExtractedCustomer({
                                      ...editingExtractedCustomer,
                                      company: e.target.value,
                                    })
                                  }
                                  className="h-8 text-sm"
                                  placeholder="Company name"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1.5 block">
                                    Contract Value
                                  </Label>
                                  <Input
                                    type="number"
                                    value={
                                      editingExtractedCustomer.contractValue || ""
                                    }
                                    onChange={(e) =>
                                      setEditingExtractedCustomer({
                                        ...editingExtractedCustomer,
                                        contractValue: e.target.value,
                                      })
                                    }
                                    className="h-8 text-sm"
                                    placeholder="0"
                                    step="0.01"
                                    min="0"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1.5 block">
                                    Contract Type
                                  </Label>
                                  <Select
                                    value={
                                      editingExtractedCustomer.contractType ||
                                      "monthly"
                                    }
                                    onValueChange={(value) =>
                                      setEditingExtractedCustomer({
                                        ...editingExtractedCustomer,
                                        contractType: value,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="monthly">
                                        Monthly
                                      </SelectItem>
                                      <SelectItem value="yearly">
                                        Yearly
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-white rounded-md border border-gray-300 p-3.5 mb-4 space-y-3">
                              <div>
                                {extractedCustomerData?.name && (
                                  <div className="text-sm font-semibold text-gray-900">
                                    {extractedCustomerData.name}
                                  </div>
                                )}
                                {(extractedCustomerData?.company ||
                                  extractedCustomerData?.email) && (
                                    <div className="text-xs text-gray-500">
                                      {[
                                        extractedCustomerData?.company,
                                        extractedCustomerData?.email,
                                      ]
                                        .filter(Boolean)
                                        .join(" • ")}
                                    </div>
                                  )}
                              </div>
                              {extractedCustomerData.name && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">
                                    Name
                                  </span>
                                  <span className="text-sm font-medium text-gray-900">
                                    {extractedCustomerData.name}
                                  </span>
                                </div>
                              )}
                              {extractedCustomerData.email && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">
                                    Email
                                  </span>
                                  <span className="text-sm text-gray-900">
                                    {extractedCustomerData.email}
                                  </span>
                                </div>
                              )}
                              {extractedCustomerData.company && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">
                                    Company
                                  </span>
                                  <div className="flex items-center gap-2 text-sm text-gray-900">
                                    <BrandIcon
                                      src={extractedCustomerData?.faviconUrl}
                                      label={
                                        extractedCustomerData.company ||
                                        extractedCustomerData.name ||
                                        extractedCustomerData.email ||
                                        "Company"
                                      }
                                      size={20}
                                      roundedClassName="rounded-md"
                                    />
                                    <span>{extractedCustomerData.company}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex gap-2">
                            {editingExtractedCustomer ? (
                              <>
                                <Button
                                  onClick={() => {
                                    setEditingExtractedCustomer(null);
                                  }}
                                  variant="outline"
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={async () => {
                                    const customerData = {
                                      name: editingExtractedCustomer.name || "",
                                      email: editingExtractedCustomer.email || "",
                                      company:
                                        editingExtractedCustomer.company || "",
                                      contractValue:
                                        editingExtractedCustomer.contractValue ||
                                        "0",
                                      contractType:
                                        editingExtractedCustomer.contractType ||
                                        "monthly",
                                      faviconUrl:
                                        editingExtractedCustomer.faviconUrl ||
                                        extractedCustomerData?.faviconUrl ||
                                        null,
                                    };
                                    await handleCreateCustomer(customerData);
                                    setEditingExtractedCustomer(null);
                                    setExtractedCustomerData(null);
                                  }}
                                  className="flex-1 bg-black hover:bg-gray-900 text-white"
                                  disabled={
                                    !editingExtractedCustomer.name?.trim()
                                  }
                                >
                                  Create Profile
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  onClick={() => {
                                    setExtractedCustomerData(null);
                                  }}
                                  variant="outline"
                                  className="flex-1"
                                >
                                  Use different customer
                                </Button>
                                <Button
                                  onClick={() => {
                                    setExtractedCustomerInfo(
                                      extractedCustomerData
                                    );
                                    setShowCustomerModal(true);
                                  }}
                                  className="flex-1 bg-black hover:bg-gray-900 text-white"
                                >
                                  Create Profile
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ) : customers.filter((c) => c.isActive).length === 0 ? (
                        <div className="py-12 text-center">
                          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                            <FileText className="h-8 w-8 text-gray-500" />
                          </div>
                          <h3 className="text-base font-semibold text-gray-900 mb-2">
                            No customers yet
                          </h3>
                          <p className="text-sm text-gray-500 mb-6">
                            Create your first customer profile to get started, or
                            skip this step to continue anonymously.
                          </p>

                          <Button
                            onClick={() => setShowCustomerModal(true)}
                            variant="outline"
                            size="sm"
                            className="px-4"
                          >
                            <Plus className="w-4 h-4 mr-1.5" />
                            Create Customer
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <Label className="mb-3 block text-sm font-medium text-gray-900">
                            Customer
                          </Label>
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <Select
                                value={selectedCustomerId || ""}
                                onValueChange={(value) =>
                                  setSelectedCustomerId(value || null)
                                }
                              >
                                <SelectTrigger className="flex-1 h-10">
                                  <SelectValue placeholder="Search or select customer..." />
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
                                        <SelectItem
                                          key={customer.id}
                                          value={customer.id}
                                        >
                                          <div className="flex items-center justify-between w-full gap-3">
                                            <div className="flex items-center gap-2">
                                              <BrandIcon
                                                src={customer.faviconUrl}
                                                label={
                                                  customer.company ||
                                                  customer.name ||
                                                  customer.email ||
                                                  "Customer"
                                                }
                                                size={24}
                                                roundedClassName="rounded-md"
                                              />
                                              <span className="text-sm">
                                                {customer.name}
                                                {customer.company
                                                  ? ` • ${customer.company}`
                                                  : ""}
                                              </span>
                                            </div>
                                            <span className="text-xs text-gray-500">
                                              ${annualValue.toLocaleString()}/yr
                                            </span>
                                          </div>
                                        </SelectItem>
                                      );
                                    })}
                                </SelectContent>
                              </Select>
                              <Button
                                onClick={() => setShowCustomerModal(true)}
                                variant="outline"
                                size="sm"
                                className="h-10 px-4 whitespace-nowrap"
                              >
                                <Plus className="w-4 h-4 mr-1.5" />
                                New Customer
                              </Button>
                            </div>
                            {selectedCustomerId && (
                              <div className="mt-2">
                                {(() => {
                                  const customer = customers.find(
                                    (c) => c.id === selectedCustomerId
                                  );
                                  if (!customer) return null;
                                  const contractValue = Number.parseFloat(
                                    customer!.contractValue ?? "0"
                                  );
                                  const annualValue =
                                    customer!.contractType === "yearly"
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
                                      className="text-xs"
                                    >
                                      {isHighValue
                                        ? "⭐ High-Value"
                                        : isMediumValue
                                          ? "Medium-Value"
                                          : "Standard"}{" "}
                                      • ${annualValue.toLocaleString()}/yr
                                    </Badge>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              {currentStep === 2 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentStep(1);
                    // Reset customer extraction state when going back
                    setExtractedCustomerData(null);
                    setEditingExtractedCustomer(null);
                    setExtractingCustomerInfo(false);
                    setSelectedCustomerId(null);
                  }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              <div className="flex-1" />
              {/* {currentStep === 1 && (
              <Button
                variant="outline"
                onClick={() => {
                  setShowFeedbackDialog(false);
                }}
              >
                Cancel
              </Button>
            )} */}
              {currentStep === 1 ? (
                <Button
                  onClick={async () => {
                    const feedback = mode === "text" ? rawFeedback : ocrText;
                    if (!feedback.trim()) {
                      setError("Please provide some feedback");
                      return;
                    }

                    // Move to step 2 and extract customer info
                    setCurrentStep(2);
                    setExtractingCustomerInfo(true);
                    setError(null);

                    try {
                      const response = await fetch("/api/extract-customer", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text: feedback }),
                      });

                      if (response.ok) {
                        const data = await response.json();
                        if (
                          data.customer &&
                          (data.customer.email ||
                            data.customer.name ||
                            data.customer.company)
                        ) {
                          const enrichedCustomer = await attachFaviconToCustomer(
                            data.customer
                          );
                          setExtractedCustomerData(enrichedCustomer);
                          // Try to match by email if available
                          if (data.customer.email) {
                            await matchCustomerByEmail(
                              data.customer.email,
                              feedback
                            );
                          }
                        }
                      }
                    } catch (err) {
                      console.error("Error extracting customer:", err);
                    } finally {
                      setExtractingCustomerInfo(false);
                    }
                  }}
                  disabled={!effectiveFeedback.trim() || ocrLoading}
                  className="bg-black hover:bg-gray-900 text-white cursor-pointer"
                >
                  Extract Customer
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedCustomerId(null);
                      setExtractedCustomerData(null);
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer px-4 py-2"
                  >
                    Skip this step
                  </button>
                  <Button
                    onClick={async () => {
                      const result = await handleTranslate();
                      if (result.success && result.taskCount > 0) {
                        setShowFeedbackDialog(false);
                      }
                    }}
                    disabled={loading}
                    className="bg-black hover:bg-gray-900 text-white"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Translating...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Translate to Tasks
                      </>
                    )}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Generated Tasks Modal */}
        <Dialog
          open={showTasksModal}
          onOpenChange={(open) => {
            setShowTasksModal(open);
            if (!open) {
              setEditingTaskIndex(null); // Reset editing state when modal closes
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Generated Tasks</DialogTitle>
              <DialogDescription>
                {tasks.length} {tasks.length === 1 ? "task" : "tasks"} extracted
                from feedback
                {translationStats && (
                  <span className="ml-2">
                    ({translationStats!.created} new, {translationStats!.updated}{" "}
                    updated)
                  </span>
                )}
                {customerInfo && (
                  <span className="block mt-1">
                    Customer: {customerInfo.name}
                    {customerInfo.company ? ` (${customerInfo.company})` : ""}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {tasks.map((task, index) => (
                <div key={index} className="space-y-3">
                  {/* Show previous task if this was updated */}
                  {task.wasUpdated && task.previousValues && (
                    <div className="p-4 rounded-lg border-2 border-orange-200 bg-orange-50/50">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge
                          variant="outline"
                          className="text-xs border-orange-300 text-orange-700 bg-orange-100"
                        >
                          ⚠️ Previous Version (Before Update)
                        </Badge>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg font-bold text-gray-500">
                              #{index + 1}
                            </span>
                            <h3 className="text-base font-semibold text-gray-700 line-through">
                              {task.previousValues.title}
                            </h3>
                            <Badge
                              variant="outline"
                              className={`text-xs border opacity-70 ${getPriorityBadgeClassName(
                                task.previousValues.priority
                              )}`}
                            >
                              {task.previousValues.priority}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              ~{task.previousValues.estimatedTimeMinutes}m
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2 line-through">
                            {task.previousValues.description}
                          </p>
                          <p className="text-xs text-gray-500 italic line-through">
                            Reason: {task.previousValues.reason}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Current/New task */}
                  <div
                    className={`p-4 rounded-lg border-2 transition-colors ${task.wasUpdated
                        ? "border-gray-500 bg-gray-50"
                        : "border-gray-300 hover:bg-gray-50"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {editingTaskIndex === index ? (
                          <div className="space-y-3">
                            <div>
                              <Label className="text-xs text-gray-500 mb-1.5 block">
                                Title
                              </Label>
                              <Input
                                value={task.title}
                                onChange={(e) => {
                                  const updatedTasks = [...tasks];
                                  updatedTasks[index] = {
                                    ...updatedTasks[index],
                                    title: e.target.value,
                                  };
                                  setTasks(updatedTasks);
                                }}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500 mb-1.5 block">
                                Description
                              </Label>
                              <Textarea
                                value={task.description}
                                onChange={(e) => {
                                  const updatedTasks = [...tasks];
                                  updatedTasks[index] = {
                                    ...updatedTasks[index],
                                    description: e.target.value,
                                  };
                                  setTasks(updatedTasks);
                                }}
                                className="min-h-[60px] text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500 mb-1.5 block">
                                Reason
                              </Label>
                              <Input
                                value={task.reason}
                                onChange={(e) => {
                                  const updatedTasks = [...tasks];
                                  updatedTasks[index] = {
                                    ...updatedTasks[index],
                                    reason: e.target.value,
                                  };
                                  setTasks(updatedTasks);
                                }}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs text-gray-500 mb-1.5 block">
                                  Priority
                                </Label>
                                <Select
                                  value={task.priority}
                                  onValueChange={(value) => {
                                    const updatedTasks = [...tasks];
                                    updatedTasks[index] = {
                                      ...updatedTasks[index],
                                      priority: value as
                                        | "High"
                                        | "Medium"
                                        | "Low",
                                    };
                                    setTasks(updatedTasks);
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="High">High</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="Low">Low</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500 mb-1.5 block">
                                  Estimated Time (minutes)
                                </Label>
                                <Input
                                  type="number"
                                  value={task.estimatedTimeMinutes}
                                  onChange={(e) => {
                                    const updatedTasks = [...tasks];
                                    updatedTasks[index] = {
                                      ...updatedTasks[index],
                                      estimatedTimeMinutes:
                                        parseInt(e.target.value) || 0,
                                    };
                                    setTasks(updatedTasks);
                                  }}
                                  className="h-8 text-sm"
                                  min="0"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                              <Button
                                onClick={() => setEditingTaskIndex(null)}
                                variant="outline"
                                size="sm"
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={() => setEditingTaskIndex(null)}
                                size="sm"
                                className="flex-1 bg-black hover:bg-gray-900 text-white"
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-lg font-bold text-gray-500">
                                #{index + 1}
                              </span>
                              <h3 className="text-base font-semibold text-gray-900">
                                {task.title}
                              </h3>
                              {task.wasUpdated && (
                                <Badge
                                  variant="default"
                                  className="bg-black text-white text-xs font-semibold px-2 py-1"
                                >
                                  ✨ UPDATED
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className={`text-xs border ${getPriorityBadgeClassName(
                                  task.priority
                                )}`}
                              >
                                {task.priority}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                ~{task.estimatedTimeMinutes}m
                              </span>
                              <Button
                                onClick={() => setEditingTaskIndex(index)}
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs ml-auto"
                              >
                                <Edit2 className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {task.description}
                            </p>
                            <p className="text-xs text-gray-500 italic">
                              Reason: {task.reason}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  const text = tasks
                    .map((task, index) => {
                      const priorityEmoji =
                        task.priority === "High"
                          ? "🔴"
                          : task.priority === "Medium"
                            ? "🟡"
                            : "🟢";
                      return `${index + 1}) ${task.title} (${task.priority}, ~${task.estimatedTimeMinutes
                        } min)${priorityEmoji}\n- ${task.description}\n- Reason: ${task.reason
                        }`;
                    })
                    .join("\n\n");
                  navigator.clipboard.writeText(text);
                }}
              >
                <Clipboard className="w-4 h-4 mr-2" />
                Copy All
              </Button>
              <Button
                onClick={async () => {
                  if (!pendingFeedback.trim()) return;
                  setSavingTasks(true);
                  try {
                    const response = await fetch("/api/translate", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        feedback: pendingFeedback,
                        source: pendingMode,
                        customerId: selectedCustomerId || undefined,
                        preview: false, // Actually save to DB
                        tasks: tasks.length > 0 ? tasks : undefined, // Send edited tasks if available
                      }),
                    });
                    if (!response.ok) {
                      const errorData = await response.json().catch(() => ({}));
                      throw new Error(errorData.error || "Failed to save tasks");
                    }
                    const data = await response.json();
                    setTasksSaved(true);
                    setTranslationStats(data.stats || null);
                    // Reload issues after saving
                    await loadAggregatedIssues();
                    // Close modal and feedback dialog
                    setShowTasksModal(false);
                    setShowFeedbackDialog(false);
                    // Reset form
                    setRawFeedback("");
                    setOcrText("");
                    setImagePreview(null);
                    setSelectedCustomerId(null);
                    setExtractedCustomerData(null);
                    setPendingFeedback("");
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : "Failed to save tasks"
                    );
                    console.error("Save error:", err);
                  } finally {
                    setSavingTasks(false);
                  }
                }}
                disabled={savingTasks}
                className="bg-black hover:bg-gray-900 text-white"
              >
                {savingTasks ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Tasks
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Issues List */}
        <div className="mt-8">
          {aggregatedIssues.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg p-1 w-fit">
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setFilterStatus("todo");
                  }}
                  variant="ghost"
                  size="sm"
                  className={`h-8 px-3 text-xs cursor-pointer ${filterStatus === "todo"
                      ? "bg-gray-200 text-gray-900 hover:bg-gray-300 font-semibold"
                      : "text-gray-600 hover:text-gray-900"
                    }`}
                >
                  Todo
                </Button>
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setFilterStatus("in_progress");
                  }}
                  variant="ghost"
                  size="sm"
                  className={`h-8 px-3 text-xs cursor-pointer ${filterStatus === "in_progress"
                      ? "bg-gray-200 text-gray-900 hover:bg-gray-300 font-semibold"
                      : "text-gray-600 hover:text-gray-900"
                    }`}
                >
                  In Progress
                </Button>
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setFilterStatus("done");
                  }}
                  variant="ghost"
                  size="sm"
                  className={`h-8 px-3 text-xs cursor-pointer ${filterStatus === "done"
                      ? "bg-gray-200 text-gray-900 hover:bg-gray-300 font-semibold"
                      : "text-gray-600 hover:text-gray-900"
                    }`}
                >
                  Done
                </Button>
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setFilterStatus("backlog");
                  }}
                  variant="ghost"
                  size="sm"
                  className={`h-8 px-3 text-xs cursor-pointer ${filterStatus === "backlog"
                      ? "bg-gray-200 text-gray-900 hover:bg-gray-300 font-semibold"
                      : "text-gray-600 hover:text-gray-900"
                    }`}
                >
                  Backlog
                </Button>
              </div>
              {orderedFilteredIssues.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (selectedIssues.size === orderedFilteredIssues.length) {
                        setSelectedIssues(new Set());
                        setLastSelectedIndex(null);
                      } else {
                        setSelectedIssues(
                          new Set(
                            orderedFilteredIssues.map(
                              (issue) => issue.taskIds?.join(",") || issue.title
                            )
                          )
                        );
                        // Set last selected to the last item when selecting all
                        setLastSelectedIndex(orderedFilteredIssues.length - 1);
                      }
                    }}
                    className="h-8 px-3 text-xs"
                  >
                    {selectedIssues.size === orderedFilteredIssues.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const issuesToExport =
                        selectedIssues.size > 0
                          ? orderedFilteredIssues.filter((issue) =>
                            selectedIssues.has(
                              issue.taskIds?.join(",") || issue.title
                            )
                          )
                          : orderedFilteredIssues;

                      // Convert to CSV
                      const headers = [
                        "Title",
                        "Description",
                        "Priority",
                        "Status",
                        "Customer Count",
                        "High-Value Customers",
                        "Average Annual Value",
                        "Score",
                      ];
                      const rows = issuesToExport.map((issue) => {
                        const avgAnnualValue =
                          issue.totalAnnualValue && issue.customerCount > 0
                            ? issue.totalAnnualValue / issue.customerCount
                            : 0;
                        return [
                          issue.title || "",
                          issue.description || "",
                          issue.priority || "",
                          issue.status || "todo",
                          issue.customerCount || 0,
                          issue.highValueCustomerCount || 0,
                          avgAnnualValue > 0
                            ? `$${Math.round(avgAnnualValue).toLocaleString()}/yr`
                            : "",
                          issue.score || 0,
                        ];
                      });

                      const csvContent = [
                        headers.join(","),
                        ...rows.map((row) =>
                          row
                            .map((cell) => {
                              const cellStr = String(cell);
                              // Escape quotes and wrap in quotes if contains comma, quote, or newline
                              if (
                                cellStr.includes(",") ||
                                cellStr.includes('"') ||
                                cellStr.includes("\n")
                              ) {
                                return `"${cellStr.replace(/"/g, '""')}"`;
                              }
                              return cellStr;
                            })
                            .join(",")
                        ),
                      ].join("\n");

                      // Download CSV
                      const blob = new Blob([csvContent], {
                        type: "text/csv;charset=utf-8;",
                      });
                      const link = document.createElement("a");
                      const url = URL.createObjectURL(blob);
                      link.setAttribute("href", url);
                      link.setAttribute(
                        "download",
                        `issues-export-${new Date().toISOString().split("T")[0]
                        }.csv`
                      );
                      link.style.visibility = "hidden";
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);

                      toast.success(
                        `Exported ${issuesToExport.length} issue${issuesToExport.length !== 1 ? "s" : ""
                        } to CSV`
                      );
                    }}
                    disabled={orderedFilteredIssues.length === 0}
                    className="h-8 px-3 text-xs"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Export to CSV
                    {selectedIssues.size > 0 &&
                      ` (${selectedIssues.size} selected)`}
                  </Button>
                  {selectedIssues.size > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={deletingIssues}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowBulkDeleteConfirm(true);
                      }}
                      className="h-8 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 disabled:opacity-50"
                    >
                      {deletingIssues ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          Delete Selected ({selectedIssues.size})
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
          {loadingIssues ? (
            <div className="divide-y divide-gray-200">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full ml-4" />
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <Skeleton className="h-4 w-32" />
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : orderedFilteredIssues.length === 0 ? (
            (() => {
              // Check if there are tasks in other tabs
              const hasTasksInOtherTabs = aggregatedIssues.some(
                (issue) => issue.status !== filterStatus
              );

              // Get the status label for the current tab
              const statusLabels: Record<string, string> = {
                todo: "Todo",
                in_progress: "In Progress",
                done: "Done",
                backlog: "Backlog",
              };
              const currentStatusLabel =
                statusLabels[filterStatus] || filterStatus;

              if (hasTasksInOtherTabs) {
                // Simple empty state when other tabs have data
                return (
                  <div className="border border-gray-200 rounded-lg p-8 text-center">
                    <p className="text-sm text-gray-500">
                      No feedback {currentStatusLabel.toLowerCase()}
                    </p>
                  </div>
                );
              } else {
                // Full empty state when no tasks exist at all
                return (
                  <div className="flex items-center justify-center min-h-[500px] py-16">
                    <div className="w-full border border-gray-200 rounded-2xl bg-white shadow-sm px-8 py-10">
                      <div className="max-w-3xl mx-auto text-center">
                        <div className="mb-8">
                          <Image
                            src="/images/empty-state.webp"
                            alt="No feedback yet..."
                            width={500}
                            height={500}
                            className="rounded-xl shadow-sm mx-auto w-full max-w-[420px] h-auto"
                          />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">
                          No feedback yet...
                        </h3>
                        <p className="text-sm text-gray-500 mb-8 leading-relaxed max-w-md mx-auto">
                          Transform client feedback into organized, actionable
                          tasks. Add your first feedback to get started.
                        </p>
                        <Button
                          onClick={() => {
                            setShowFeedbackDialog(true);
                            setCurrentStep(1);
                            // Reset state when opening dialog
                            setRawFeedback("");
                            setOcrText("");
                            setImagePreview(null);
                            setSelectedCustomerId(null);
                            setExtractedCustomerData(null);
                            setError(null);
                          }}
                          size="sm"
                          className="bg-black hover:bg-gray-900 text-white cursor-pointer"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Feedback
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              }
            })()
          ) : (
            <div className="space-y-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleIssueDragEnd}
              >
                <SortableContext
                  items={orderedFilteredIssues.map(
                    (issue) => issue.taskIds?.join(",") || issue.title
                  )}
                  strategy={verticalListSortingStrategy}
                >
                  {orderedFilteredIssues.map((issue, index) => {
                    const avgAnnualValue =
                      issue.totalAnnualValue && issue.customerCount > 0
                        ? issue.totalAnnualValue / issue.customerCount
                        : 0;
                    const isHighValue = avgAnnualValue > 50000;
                    return (
                      <SortableIssueItem
                        key={issue.taskIds?.join(",") || issue.title}
                        issue={issue}
                        index={index}
                        isHighValue={isHighValue}
                        avgAnnualValue={avgAnnualValue}
                        updatingIssues={updatingIssues}
                        getStatusColor={getStatusColor}
                        getStatusLabel={getStatusLabel}
                        handleStatusChange={handleIssueStatusChange}
                        handleDelete={handleIssueDelete}
                        onIssueClick={handleIssueClick}
                        isSelected={selectedIssues.has(
                          issue.taskIds?.join(",") || issue.title
                        )}
                        onSelect={(issue, selected, shiftKey, currentIndex) => {
                          const issueId = issue.taskIds?.join(",") || issue.title;

                          if (shiftKey && lastSelectedIndex !== null) {
                            // Shift-click: select range between last selected and current
                            const startIndex = Math.min(
                              lastSelectedIndex,
                              currentIndex
                            );
                            const endIndex = Math.max(
                              lastSelectedIndex,
                              currentIndex
                            );

                            setSelectedIssues((prev) => {
                              const next = new Set(prev);
                              // Select all items in the range
                              for (let i = startIndex; i <= endIndex; i++) {
                                const rangeIssue = orderedFilteredIssues[i];
                                if (rangeIssue) {
                                  const rangeIssueId =
                                    rangeIssue.taskIds?.join(",") ||
                                    rangeIssue.title;
                                  if (selected) {
                                    next.add(rangeIssueId);
                                  } else {
                                    next.delete(rangeIssueId);
                                  }
                                }
                              }
                              return next;
                            });

                            // Update last selected index
                            setLastSelectedIndex(currentIndex);
                          } else {
                            // Normal click: toggle single item
                            setSelectedIssues((prev) => {
                              const next = new Set(prev);
                              if (selected) {
                                next.add(issueId);
                              } else {
                                next.delete(issueId);
                              }
                              return next;
                            });

                            // Update last selected index
                            setLastSelectedIndex(currentIndex);
                          }
                        }}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      </>}

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

      {/* Issue Detail Dialog */}
      <Dialog
        open={!!selectedIssue}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedIssue(null);
            setIssueLogs([]);
            setIsEditingIssue(false);
            setEditingIssue(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {isEditingIssue ? (
                  <div className="space-y-4">
                    <div>
                      <Label
                        htmlFor="edit-title"
                        className="text-sm font-semibold"
                      >
                        Title
                      </Label>
                      <Input
                        id="edit-title"
                        value={editingIssue?.title || ""}
                        onChange={(e) =>
                          setEditingIssue({
                            ...editingIssue,
                            title: e.target.value,
                          })
                        }
                        className="mt-1"
                        placeholder="Issue title"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="edit-description"
                        className="text-sm font-semibold"
                      >
                        Description
                      </Label>
                      <Textarea
                        id="edit-description"
                        value={editingIssue?.description || ""}
                        onChange={(e) =>
                          setEditingIssue({
                            ...editingIssue,
                            description: e.target.value,
                          })
                        }
                        className="mt-1 min-h-[100px]"
                        placeholder="Issue description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label
                          htmlFor="edit-priority"
                          className="text-sm font-semibold"
                        >
                          Priority
                        </Label>
                        <Select
                          value={editingIssue?.priority || "Medium"}
                          onValueChange={(value) =>
                            setEditingIssue({
                              ...editingIssue,
                              priority: value,
                            })
                          }
                        >
                          <SelectTrigger id="edit-priority" className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label
                          htmlFor="edit-time"
                          className="text-sm font-semibold"
                        >
                          Estimated Time (minutes)
                        </Label>
                        <Input
                          id="edit-time"
                          type="number"
                          min="0"
                          value={editingIssue?.estimatedTimeMinutes || 0}
                          onChange={(e) =>
                            setEditingIssue({
                              ...editingIssue,
                              estimatedTimeMinutes:
                                parseInt(e.target.value) || 0,
                            })
                          }
                          className="mt-1"
                          placeholder="30"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <DialogTitle className="flex items-center gap-2">
                      {selectedIssue?.title}
                      <Badge
                        variant="outline"
                        className={`text-xs border ${getPriorityBadgeClassName(
                          selectedIssue?.priority || ""
                        )}`}
                      >
                        {selectedIssue?.priority}
                      </Badge>
                    </DialogTitle>
                    <DialogDescription>
                      {selectedIssue?.description}
                    </DialogDescription>
                  </>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {isEditingIssue ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={savingIssue}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveIssue}
                      disabled={savingIssue}
                    >
                      {savingIssue ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingIssue(true)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Issue Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div
                className={`p-3 rounded-lg border transition-colors ${selectedIssue?.customers && selectedIssue.customers.length > 0
                    ? "cursor-pointer hover:bg-gray-50 hover:border-gray-300"
                    : ""
                  }`}
                onClick={() => {
                  if (
                    selectedIssue?.customers &&
                    selectedIssue.customers.length > 0
                  ) {
                    setShowCustomersModal(true);
                  }
                }}
              >
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  Customers
                  {selectedIssue?.customers &&
                    selectedIssue.customers.length > 0 && (
                      <span className="text-xs text-gray-600">
                        (click to view)
                      </span>
                    )}
                </p>
                <p className="text-lg font-semibold">
                  {selectedIssue?.customerCount || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">Tasks</p>
                <p className="text-lg font-semibold">
                  {selectedIssue?.taskIds?.length || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <p className="text-lg font-semibold">
                  {getStatusLabel(selectedIssue?.status || "todo")}
                </p>
              </div>
              <div className="p-3 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">Score</p>
                <p className="text-lg font-semibold">
                  {selectedIssue?.score || 0}
                </p>
              </div>
            </div>

            {/* Changelog Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Changelog
                  </h3>
                  <p className="text-xs text-gray-500">
                    Track key updates to this issue
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {issueLogs.length}{" "}
                  {issueLogs.length === 1 ? "entry" : "entries"}
                </Badge>
              </div>
              <div className="border rounded-lg">
                {loadingLogs ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                    <span className="ml-2 text-xs text-gray-500">
                      Loading activity...
                    </span>
                  </div>
                ) : issueLogs.length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-500">
                    No activity yet
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto divide-y">
                    {issueLogs.map((log, index) => {
                      const date = new Date(log.createdAt);
                      const timestamp = date.toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const primaryChange =
                        log.changes && typeof log.changes === "object"
                          ? Object.entries(log.changes)[0]
                          : null;

                      return (
                        <div
                          key={log.id || index}
                          className="px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  log.action === "created"
                                    ? "default"
                                    : log.action === "updated"
                                      ? "secondary"
                                      : "outline"
                                }
                                className="text-xs px-2 py-0.5"
                              >
                                {log.action === "created"
                                  ? "Created"
                                  : log.action === "updated"
                                    ? "Updated"
                                    : log.action}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {timestamp}
                              </span>
                            </div>
                            {log.feedbackId && (
                              <span className="text-xs font-mono text-gray-500">
                                #{log.feedbackId.slice(0, 8)}
                              </span>
                            )}
                          </div>
                          {primaryChange ? (
                            <div className="text-sm text-gray-700">
                              <span className="font-medium capitalize">
                                {primaryChange[0]}:
                              </span>{" "}
                              <span className="text-gray-600">
                                {String(primaryChange[1]).length > 60
                                  ? `${String(primaryChange[1]).slice(0, 60)}…`
                                  : String(primaryChange[1])}
                              </span>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600">
                              {log.description || "Change recorded"}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedIssue(null);
                setIssueLogs([]);
                setIsEditingIssue(false);
                setEditingIssue(null);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customers Modal */}
      <Dialog open={showCustomersModal} onOpenChange={setShowCustomersModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customers with this Issue</DialogTitle>
            <DialogDescription>
              {selectedIssue?.customers?.length || 0}{" "}
              {selectedIssue?.customers?.length === 1
                ? "customer"
                : "customers"}{" "}
              affected
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {selectedIssue?.customers && selectedIssue.customers.length > 0 ? (
              <div className="space-y-2">
                {selectedIssue.customers.map((customer: any) => (
                  <Link
                    key={customer.id}
                    href="/dashboard/customers"
                    className="block p-3 rounded-lg border hover:border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-gray-900">
                          {customer.name}
                        </h4>
                        {customer.company && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {customer.company}
                          </p>
                        )}
                        {customer.email && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {customer.email}
                          </p>
                        )}
                      </div>
                      {customer.annualValue > 0 && (
                        <div className="text-right">
                          <p className="text-xs font-medium text-gray-900">
                            ${(customer.annualValue / 1000).toFixed(0)}k/yr
                          </p>
                          {customer.annualValue > 50000 && (
                            <Badge
                              variant="destructive"
                              className="text-xs mt-1"
                            >
                              High-Value
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-gray-500">
                No customers associated with this issue
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCustomersModal(false)}
            >
              Close
            </Button>
          </DialogFooter>
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

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Selected Issues</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIssues.size} selected
              issue{selectedIssues.size !== 1 ? "s" : ""}? This will delete all
              tasks in the selected groups. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkDeleteConfirm(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deletingIssues}
              onClick={async () => {
                setDeletingIssues(true);
                setShowBulkDeleteConfirm(false);

                // Collect all taskIds from selected issues
                const selectedTaskIds: string[] = [];
                orderedFilteredIssues.forEach((issue) => {
                  const issueId = issue.taskIds?.join(",") || issue.title;
                  if (selectedIssues.has(issueId) && issue.taskIds) {
                    selectedTaskIds.push(...issue.taskIds);
                  }
                });

                if (selectedTaskIds.length === 0) {
                  toast.error("No issues selected to delete");
                  setDeletingIssues(false);
                  return;
                }

                // Store count before clearing
                const deletedCount = selectedIssues.size;

                // Delete all selected issues
                const taskKey = selectedTaskIds.join(",");
                setUpdatingIssues((prev) => new Set(prev).add(taskKey));
                try {
                  const response = await fetch("/api/tasks/bulk", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ taskIds: selectedTaskIds }),
                  });
                  if (response.ok) {
                    await loadAggregatedIssues();
                    setSelectedIssues(new Set());
                    toast.success(
                      `Deleted ${deletedCount} issue${deletedCount !== 1 ? "s" : ""
                      } successfully`
                    );
                  } else {
                    console.error("Failed to delete issues");
                    toast.error("Failed to delete issues");
                  }
                } catch (err) {
                  console.error("Error deleting issues:", err);
                  toast.error("An error occurred while deleting the issues");
                } finally {
                  setUpdatingIssues((prev) => {
                    const next = new Set(prev);
                    next.delete(taskKey);
                    return next;
                  });
                  setDeletingIssues(false);
                }
              }}
              className="bg-red-600 hover:bg-red-700 !text-white"
            >
              {deletingIssues ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  Delete {selectedIssues.size} Issue
                  {selectedIssues.size !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Plan Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upgrade your plan</DialogTitle>
            <DialogDescription>
              Get more responses, advanced features, and priority support.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Billing toggle */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setUpgradeBillingPeriod("monthly")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${upgradeBillingPeriod === "monthly" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setUpgradeBillingPeriod("yearly")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${upgradeBillingPeriod === "yearly" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"}`}
              >
                Yearly <span className="text-emerald-600 font-semibold">Save 35%</span>
              </button>
            </div>

            {/* Plan cards */}
            <div className="grid gap-3">
              {PLANS.map((plan) => {
                const price = upgradeBillingPeriod === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
                const isCurrent = planInfo?.plan === plan.id;
                return (
                  <div key={plan.id} className={`relative border rounded-lg p-4 ${plan.popular ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200"}`}>
                    {plan.popular && (
                      <span className="absolute -top-2.5 left-3 bg-gray-900 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                        Popular
                      </span>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{plan.name}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          ${price}<span className="text-gray-500">/{upgradeBillingPeriod === "monthly" ? "mo" : "mo billed yearly"}</span>
                        </p>
                      </div>
                      {isCurrent ? (
                        <Badge variant="outline" className="text-xs">Current</Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleUpgradeCheckout(plan.id)}
                          disabled={upgradeLoading !== null}
                          className="h-8 px-4 text-xs bg-gray-900 hover:bg-gray-800 text-white"
                        >
                          {upgradeLoading === plan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Upgrade"}
                        </Button>
                      )}
                    </div>
                    <ul className="mt-3 space-y-1">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                          <Check className="w-3 h-3 text-gray-500 mt-0.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
