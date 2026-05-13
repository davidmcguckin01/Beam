"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { useUser, useOrganization } from "@clerk/nextjs";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  ExternalLink,
  Copy,
  Edit,
  Trash2,
  Loader2,
  MessageSquare,
  Power,
  BarChart3,
  ArrowLeft,
  MoreVertical,
  Check,
  X,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
} from "lucide-react";
import { AnalyticsChart } from "@/components/analytics-chart";
import { MiniAnalyticsChart } from "@/components/mini-analytics-chart";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface FeedbackPage {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  customizations: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FeedbackPageCustomizations {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  buttonTextColor: string;
  showNameField: boolean;
  showEmailField: boolean;
  requireEmail: boolean;
  allowedEmails: string[];
}


interface FeedbackPagesSectionProps {
  showEmptyState?: boolean;
  triggerCreate?: number;
}

export function FeedbackPagesSection({
  showEmptyState = true,
  triggerCreate,
}: FeedbackPagesSectionProps) {
  const { isSignedIn } = useUser();
  const { organization } = useOrganization();
  const searchParams = useSearchParams();
  const [pages, setPages] = useState<FeedbackPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPage, setEditingPage] = useState<FeedbackPage | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState<Record<string, number>>({});
  const [views, setViews] = useState<Record<string, number>>({});
  const [timeSeriesData, setTimeSeriesData] = useState<
    Record<string, { views: any[]; submissions: any[] }>
  >({});
  const router = useRouter();
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [selectedPageForAnalytics, setSelectedPageForAnalytics] =
    useState<FeedbackPage | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");

  // Submissions table state
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "createdAt" | "submitterName" | "submitterEmail" | "feedback"
  >("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>(
    []
  );
  const [showDeleteSubmissionsConfirm, setShowDeleteSubmissionsConfirm] =
    useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(
    null
  );
  const [submissionDetailOpen, setSubmissionDetailOpen] = useState(false);

  // Form list search / filter / sort
  const [formSearch, setFormSearch] = useState("");
  const [formStatus, setFormStatus] = useState<"all" | "active" | "inactive">("all");
  const [formSort, setFormSort] = useState<"newest" | "oldest" | "az" | "za" | "most_submissions" | "most_views">("newest");

  const filteredPages = useMemo(() => {
    let result = [...pages];
    // Search
    if (formSearch.trim()) {
      const q = formSearch.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q)
      );
    }
    // Status filter
    if (formStatus === "active") result = result.filter((p) => p.isActive);
    else if (formStatus === "inactive") result = result.filter((p) => !p.isActive);
    // Sort
    result.sort((a, b) => {
      switch (formSort) {
        case "newest": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "az": return a.title.localeCompare(b.title);
        case "za": return b.title.localeCompare(a.title);
        case "most_submissions": return (submissions[b.id] ?? 0) - (submissions[a.id] ?? 0);
        case "most_views": return (views[b.id] ?? 0) - (views[a.id] ?? 0);
        default: return 0;
      }
    });
    return result;
  }, [pages, formSearch, formStatus, formSort, submissions, views]);

  useEffect(() => {
    if (isSignedIn) {
      loadPages();
    }
  }, [isSignedIn]);

  // Auto-open create modal from ?create=true query param
  useEffect(() => {
    if (searchParams.get("create") === "true" && !loading) {
      setCreateTitle("");
      setCreateDescription("");
      setShowModal(true);
      // Clean the URL
      router.replace("/dashboard", { scroll: false });
    }
  }, [searchParams, loading, router]);

  // Open create modal when triggerCreate prop changes
  useEffect(() => {
    if (triggerCreate && triggerCreate > 0) {
      setCreateTitle("");
      setCreateDescription("");
      setShowModal(true);
    }
  }, [triggerCreate]);

  const loadPages = async () => {
    try {
      const response = await fetch("/api/feedback-pages");
      if (response.ok) {
        const data = await response.json();
        setPages(data);

        const subCounts: Record<string, number> = {};
        const viewCounts: Record<string, number> = {};
        const timeSeries: Record<string, { views: any[]; submissions: any[] }> =
          {};
        for (const page of data) {
          try {
            const subResponse = await fetch(
              `/api/feedback-pages/${page.id}/submissions`
            );
            if (subResponse.ok) {
              const submissions = await subResponse.json();
              subCounts[page.id] = submissions.length;
            }
            const analyticsResponse = await fetch(
              `/api/feedback-pages/${page.id}/analytics`
            );
            if (analyticsResponse.ok) {
              const analytics = await analyticsResponse.json();
              viewCounts[page.id] = analytics.totalViews || 0;
              if (analytics.timeSeries) {
                timeSeries[page.id] = {
                  views: analytics.timeSeries.views || [],
                  submissions: analytics.timeSeries.submissions || [],
                };
              }
            }
          } catch (e) { }
        }
        setSubmissions(subCounts);
        setViews(viewCounts);
        setTimeSeriesData(timeSeries);
      }
    } catch (error) {
      console.error("Failed to load feedback pages:", error);
    } finally {
      setLoading(false);
    }
  };


  // Update last viewed timestamp when page loads
  useEffect(() => {
    if (isSignedIn) {
      localStorage.setItem("feedbackPagesLastViewed", new Date().toISOString());
    }
  }, [isSignedIn]);

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const handleTogglePageFilter = (pageId: string) => {
    setSelectedPageIds((prev) =>
      prev.includes(pageId)
        ? prev.filter((id) => id !== pageId)
        : [...prev, pageId]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedSubmissionIds.length === allSubmissions.length) {
      setSelectedSubmissionIds([]);
    } else {
      setSelectedSubmissionIds(allSubmissions.map((s) => s.id));
    }
  };

  const handleToggleSelectSubmission = (submissionId: string) => {
    setSelectedSubmissionIds((prev) =>
      prev.includes(submissionId)
        ? prev.filter((id) => id !== submissionId)
        : [...prev, submissionId]
    );
  };

  const handleDeleteSubmissions = async () => {
    if (selectedSubmissionIds.length === 0) return;

    try {
      const response = await fetch("/api/feedback-pages/submissions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionIds: selectedSubmissionIds }),
      });

      if (response.ok) {
        toast.success(`Deleted ${selectedSubmissionIds.length} submission(s)`);
        setSelectedSubmissionIds([]);
        loadPages(); // Refresh page counts
      } else {
        toast.error("Failed to delete submissions");
      }
    } catch (error) {
      console.error("Failed to delete submissions:", error);
      toast.error("Failed to delete submissions");
    }
    setShowDeleteSubmissionsConfirm(false);
  };

  const handleOpenModal = () => {
    setCreateTitle("");
    setCreateDescription("");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/feedback-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createTitle.trim(),
          description: createDescription.trim() || null,
        }),
      });
      if (response.ok) {
        const savedPage = await response.json();
        handleCloseModal();
        if (savedPage?.id) router.push(`/dashboard/feedback-pages/${savedPage.id}`);
      } else {
        const error = await response.json();
        if (error.error === "FORM_LIMIT_REACHED") {
          toast.error(`Free plan limit of ${error.limit} forms reached. Upgrade to create more.`);
        } else {
          toast.error(error.error || "Failed to create form");
        }
      }
    } catch (error) {
      console.error("Failed to create form:", error);
      toast.error("Failed to create form");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (page: FeedbackPage) => {
    try {
      const response = await fetch(`/api/feedback-pages/${page.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !page.isActive,
        }),
      });

      if (response.ok) {
        loadPages();
        toast.success(
          `Form ${!page.isActive ? "activated" : "deactivated"} successfully`
        );
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update form");
      }
    } catch (error) {
      console.error("Failed to toggle active status:", error);
      toast.error("Failed to update form");
    }
  };

  const handleDelete = async (id: string) => {
    setPendingDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;

    const id = pendingDeleteId;
    setShowDeleteConfirm(false);
    try {
      const response = await fetch(`/api/feedback-pages/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPages((prev) => prev.filter((p) => p.id !== id));
        toast.success("Form deleted successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete form");
      }
    } catch (error) {
      console.error("Failed to delete form:", error);
      toast.error("Failed to delete form");
    } finally {
      setPendingDeleteId(null);
    }
  };

  const getUrlPrefix = (page: FeedbackPage): string => {
    try {
      if (page.customizations) {
        const c = JSON.parse(page.customizations);
        if (c.urlPrefix?.trim()) return c.urlPrefix.trim();
      }
    } catch { /* ignore */ }
    return "f";
  };

  const copyPublicUrl = (page: FeedbackPage) => {
    const url = `${window.location.origin}/${getUrlPrefix(page)}/${page.slug}`;
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard!");
  };

  const getPublicUrl = (page: FeedbackPage) => {
    return `${window.location.origin}/${getUrlPrefix(page)}/${page.slug}`;
  };

  const handleViewAnalytics = async (page: FeedbackPage) => {
    setSelectedPageForAnalytics(page);
    setAnalyticsModalOpen(true);
    setLoadingAnalytics(true);

    try {
      const response = await fetch(`/api/feedback-pages/${page.id}/analytics`);
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleCardClick = (page: FeedbackPage) => {
    router.push(`/dashboard/feedback-pages/${page.id}`);
  };

  const renderPageGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {filteredPages.map((page) => (
        <div
          key={page.id}
          className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group"
          onClick={() => handleCardClick(page)}
        >
          {/* Title row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="font-medium text-sm text-gray-900 truncate">
                {page.title}
              </h3>
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleActive(page); }}
                title={page.isActive ? "Click to deactivate" : "Click to activate"}
                className="shrink-0"
              >
                <span className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full ${page.isActive
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-500"
                  }`}>
                  {page.isActive ? "Active" : "Draft"}
                </span>
              </button>
            </div>
            <div onClick={(e) => e.stopPropagation()} className="shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-gray-100">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/feedback-pages/${page.id}/analytics`); }}>
                    <BarChart3 className="h-4 w-4 mr-2" />View Analytics
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(getPublicUrl(page), "_blank"); }}>
                    <ExternalLink className="h-4 w-4 mr-2" />View Page
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); copyPublicUrl(page); }}>
                    <Copy className="h-4 w-4 mr-2" />Copy Link
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/feedback-pages/${page.id}`); }}>
                    <Edit className="h-4 w-4 mr-2" />Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleActive(page); }}>
                    <Power className={`h-4 w-4 mr-2 ${page.isActive ? "text-green-600" : "text-gray-500"}`} />
                    {page.isActive ? "Deactivate" : "Activate"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(page.id); }} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                    <Trash2 className="h-4 w-4 mr-2" />Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Description */}
          {page.description && (
            <p className="text-xs text-gray-500 line-clamp-1 mb-2">{page.description}</p>
          )}

          {/* Sparkline */}
          {timeSeriesData[page.id] ? (
            <div className="mb-2.5">
              <MiniAnalyticsChart
                views={timeSeriesData[page.id].views}
                submissions={timeSeriesData[page.id].submissions}
                height={28}
                width={100}
              />
            </div>
          ) : (
            <div className="h-[28px] mb-2.5" />
          )}

          {/* Metrics + date */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {submissions[page.id] || 0}
              </span>
              <span className="text-gray-200">·</span>
              <span className="flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                {views[page.id] || 0}
              </span>
            </span>
            <span>
              {new Date(page.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
        </div>
      ))}
      <button
        onClick={() => handleOpenModal()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all min-h-[120px] cursor-pointer"
      >
        <Plus className="h-5 w-5" />
        <span className="text-xs font-medium">New Form</span>
      </button>
    </div>
  );

  const content = loading ? (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="border border-gray-300">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-3 w-3/4 mb-2" />
                <div className="flex items-center gap-3 mb-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  ) : (
    <>
      {/* Unified control bar — only show with 3+ forms */}
      {pages.length > 2 && (
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4 bg-gray-50 border border-gray-200 rounded-xl p-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search forms…"
            value={formSearch}
            onChange={(e) => setFormSearch(e.target.value)}
            className="w-full h-9 pl-8 pr-3 text-xs rounded-lg bg-white border border-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
        </div>
        <div className="flex items-center gap-2">
        <select
          value={formStatus}
          onChange={(e) => setFormStatus(e.target.value as typeof formStatus)}
          className="h-9 px-2.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-300 shrink-0 flex-1 sm:flex-none"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={formSort}
          onChange={(e) => setFormSort(e.target.value as typeof formSort)}
          className="h-9 px-2.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-300 shrink-0 flex-1 sm:flex-none"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="az">A → Z</option>
          <option value="za">Z → A</option>
          <option value="most_submissions">Most submissions</option>
          <option value="most_views">Most views</option>
        </select>
        {(formSearch || formStatus !== "all") && (
          <button
            onClick={() => { setFormSearch(""); setFormStatus("all"); }}
            className="h-9 px-2.5 text-xs text-gray-500 hover:text-gray-600 rounded-lg border border-gray-200 bg-white shrink-0"
          >
            Clear
          </button>
        )}
        </div>
      </div>
      )}

      {pages.length === 0 ? (
        showEmptyState ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md">
              <Image
                src="/images/empty-state.webp"
                alt="No feedback pages yet"
                width={500}
                height={500}
                className="rounded-xl shadow-sm mb-6 mx-auto"
              />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No forms yet
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Create your first form to start collecting responses from your
                users.
              </p>
              <Button
                onClick={() => handleOpenModal()}
                size="sm"
                className="bg-black hover:bg-gray-900 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Form
              </Button>
            </div>
          </div>
        ) : (
          renderPageGrid()
        )
      ) : filteredPages.length === 0 ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">No forms match your search</p>
            <button
              onClick={() => { setFormSearch(""); setFormStatus("all"); }}
              className="text-xs text-gray-500 hover:text-gray-600 underline underline-offset-2"
            >
              Clear filters
            </button>
          </div>
        </div>
      ) : (
        renderPageGrid()
      )}

      {/* Submissions Table removed — use per-form analytics page instead */}
      {false && !loading && pages.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Submissions
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                View and manage all form submissions
              </p>
            </div>
            {selectedSubmissionIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteSubmissionsConfirm(true)}
                className="bg-red-600 hover:bg-red-700 text-white h-9"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {selectedSubmissionIds.length} selected
              </Button>
            )}
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Page Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filter by Page
                  {selectedPageIds.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {selectedPageIds.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-56 max-h-64 overflow-y-auto"
              >
                {pages.map((page) => (
                  <DropdownMenuItem
                    key={page.id}
                    onSelect={(e) => {
                      e.preventDefault();
                      handleTogglePageFilter(page.id);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={selectedPageIds.includes(page.id)}
                      onCheckedChange={() => handleTogglePageFilter(page.id)}
                    />
                    <span className="flex-1">{page.title}</span>
                  </DropdownMenuItem>
                ))}
                {selectedPageIds.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setSelectedPageIds([]);
                      }}
                      className="text-sm text-gray-500"
                    >
                      Clear filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Search */}
            <div className="relative flex-1 max-w-sm ml-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search submissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Table */}
          <Card className="border border-gray-200">
            <CardContent className="p-0">
              {loadingSubmissions ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <Skeleton className="h-4 w-4" />
                        </th>
                        <th className="hidden md:table-cell px-4 py-3 text-left">
                          <Skeleton className="h-3 w-16" />
                        </th>
                        <th className="px-4 py-3 text-left">
                          <Skeleton className="h-3 w-12" />
                        </th>
                        <th className="hidden md:table-cell px-4 py-3 text-left">
                          <Skeleton className="h-3 w-16" />
                        </th>
                        <th className="hidden md:table-cell px-4 py-3 text-left">
                          <Skeleton className="h-3 w-16" />
                        </th>
                        <th className="px-4 py-3 text-left">
                          <Skeleton className="h-3 w-20" />
                        </th>
                        <th className="hidden md:table-cell px-4 py-3 text-left">
                          <Skeleton className="h-3 w-16" />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {[...Array(5)].map((_, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-4" />
                          </td>
                          <td className="hidden md:table-cell px-4 py-3">
                            <Skeleton className="h-4 w-24" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-5 w-16 rounded-full" />
                          </td>
                          <td className="hidden md:table-cell px-4 py-3">
                            <Skeleton className="h-4 w-20" />
                          </td>
                          <td className="hidden md:table-cell px-4 py-3">
                            <Skeleton className="h-4 w-32" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-48" />
                          </td>
                          <td className="hidden md:table-cell px-4 py-3">
                            <Skeleton className="h-4 w-16" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : allSubmissions.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="h-8 w-8 mx-auto text-gray-500 mb-2" />
                  <p className="text-sm text-gray-500">No submissions found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <Checkbox
                            checked={
                              allSubmissions.length > 0 &&
                              selectedSubmissionIds.length ===
                              allSubmissions.length
                            }
                            onCheckedChange={handleToggleSelectAll}
                          />
                        </th>
                        <th
                          className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("createdAt")}
                        >
                          <div className="flex items-center gap-1">
                            Date
                            {sortBy === "createdAt" ? (
                              sortOrder === "asc" ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-gray-500" />
                            )}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">
                          Page
                        </th>
                        <th
                          className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("submitterName")}
                        >
                          <div className="flex items-center gap-1">
                            Name
                            {sortBy === "submitterName" ? (
                              sortOrder === "asc" ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-gray-500" />
                            )}
                          </div>
                        </th>
                        <th
                          className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("submitterEmail")}
                        >
                          <div className="flex items-center gap-1">
                            Email
                            {sortBy === "submitterEmail" ? (
                              sortOrder === "asc" ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-gray-500" />
                            )}
                          </div>
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("feedback")}
                        >
                          <div className="flex items-center gap-1">
                            Feedback
                            {sortBy === "feedback" ? (
                              sortOrder === "asc" ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-gray-500" />
                            )}
                          </div>
                        </th>
                        <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-700">
                          Country
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {allSubmissions.map((submission) => (
                        <tr
                          key={submission.id}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedSubmission(submission);
                            setSubmissionDetailOpen(true);
                          }}
                        >
                          <td
                            className="px-4 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={selectedSubmissionIds.includes(
                                submission.id
                              )}
                              onCheckedChange={() =>
                                handleToggleSelectSubmission(submission.id)
                              }
                            />
                          </td>
                          <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-900">
                            {new Date(submission.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary" className="text-xs">
                              {submission.pageTitle || "Unknown"}
                            </Badge>
                          </td>
                          <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-900">
                            {submission.submitterName || (
                              <span className="text-gray-500">Anonymous</span>
                            )}
                          </td>
                          <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-600">
                            {submission.submitterEmail || (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 max-w-md">
                            <p className="line-clamp-2">
                              {submission.feedback}
                            </p>
                          </td>
                          <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-600">
                            {submission.country || (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics dialog removed — navigates to dedicated page instead */}
      <Dialog open={false} onOpenChange={setAnalyticsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1">
                <DialogTitle>
                  Analytics - {selectedPageForAnalytics?.title}
                </DialogTitle>
                <DialogDescription>
                  View detailed analytics and performance metrics for this
                  feedback page
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {loadingAnalytics ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          ) : analyticsData ? (
            <div className="space-y-6 py-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {analyticsData.totalViews || 0}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Total Views
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {analyticsData.uniqueVisitors || 0}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Unique Visitors
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {analyticsData.totalSubmissions || 0}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Submissions
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {analyticsData.averageTimeOnPage || 0}s
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Avg. Time
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Chart */}
              {analyticsData.timeSeries && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Views & Submissions Over Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AnalyticsChart
                      views={analyticsData.timeSeries.views || []}
                      submissions={analyticsData.timeSeries.submissions || []}
                      height={250}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Views by Country */}
              {analyticsData.viewsByCountry &&
                analyticsData.viewsByCountry.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Views by Country
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {analyticsData.viewsByCountry
                          .filter((item: any) => item.country)
                          .map((item: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                            >
                              <span className="text-sm text-gray-700">
                                {item.country}
                              </span>
                              <span className="text-sm font-semibold text-gray-900">
                                {item.count}
                              </span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Page Details Modal */}
      {/* Details modal replaced by dedicated page */}

      {/* Create Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Form</DialogTitle>
            <DialogDescription>
              Give your form a name to get started
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-title">Title</Label>
                <Input
                  id="create-title"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="e.g. Customer Feedback"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-description">
                  Description{" "}
                  <span className="text-gray-500 font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="create-description"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="What is this form for?"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !createTitle.trim()} className="bg-black hover:bg-gray-900 text-white">
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : "Create Form"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Form</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this form? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setPendingDeleteId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Submissions Confirmation Dialog */}
      <Dialog
        open={showDeleteSubmissionsConfirm}
        onOpenChange={setShowDeleteSubmissionsConfirm}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Submissions</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedSubmissionIds.length}{" "}
              submission(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteSubmissionsConfirm(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSubmissions}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submission Detail Dialog */}
      <Dialog
        open={submissionDetailOpen}
        onOpenChange={setSubmissionDetailOpen}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
            <DialogDescription>
              View complete information about this feedback submission
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Submitted</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {new Date(selectedSubmission.createdAt).toLocaleString(
                        "en-US",
                        {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Page</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedSubmission.pageTitle || "Unknown"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Name</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedSubmission.submitterName || (
                        <span className="text-gray-500">Anonymous</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Email</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedSubmission.submitterEmail || (
                        <span className="text-gray-500">—</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Enriched Person Name (from PDL) */}
              {selectedSubmission.personRawData && (
                <div>
                  {(() => {
                    try {
                      const personData =
                        typeof selectedSubmission.personRawData === "string"
                          ? JSON.parse(selectedSubmission.personRawData)
                          : selectedSubmission.personRawData;
                      const fullName =
                        personData.full_name ||
                        personData.names?.[0]?.full_name;
                      const linkedinUrl = personData.profiles?.find(
                        (p: any) => p.network === "linkedin"
                      )?.url;

                      if (fullName || linkedinUrl) {
                        return (
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">
                              Enriched Profile (People Data Labs)
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                              {fullName && (
                                <div>
                                  <Label className="text-xs text-gray-500">
                                    Full Name
                                  </Label>
                                  <p className="text-sm text-gray-900 mt-1 font-medium">
                                    {fullName}
                                  </p>
                                </div>
                              )}
                              {linkedinUrl && (
                                <div>
                                  <Label className="text-xs text-gray-500">
                                    LinkedIn Profile
                                  </Label>
                                  <p className="text-sm text-gray-900 mt-1">
                                    <a
                                      href={linkedinUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                                    >
                                      View Profile
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    } catch {
                      return null;
                    }
                  })()}
                </div>
              )}

              {/* Response Content */}
              <div>
                <Label className="text-xs text-gray-500">Response</Label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {selectedSubmission.feedback}
                  </p>
                </div>
              </div>

              {/* Location & Geo Data */}
              {(selectedSubmission.country ||
                selectedSubmission.city ||
                selectedSubmission.state ||
                selectedSubmission.postalCode) && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Location
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedSubmission.country && (
                        <div>
                          <Label className="text-xs text-gray-500">Country</Label>
                          <p className="text-sm text-gray-900 mt-1">
                            {selectedSubmission.country}
                          </p>
                        </div>
                      )}
                      {selectedSubmission.city && (
                        <div>
                          <Label className="text-xs text-gray-500">City</Label>
                          <p className="text-sm text-gray-900 mt-1">
                            {selectedSubmission.city}
                          </p>
                        </div>
                      )}
                      {selectedSubmission.state && (
                        <div>
                          <Label className="text-xs text-gray-500">State</Label>
                          <p className="text-sm text-gray-900 mt-1">
                            {selectedSubmission.state}
                          </p>
                        </div>
                      )}
                      {selectedSubmission.postalCode && (
                        <div>
                          <Label className="text-xs text-gray-500">
                            Postal Code
                          </Label>
                          <p className="text-sm text-gray-900 mt-1">
                            {selectedSubmission.postalCode}
                          </p>
                        </div>
                      )}
                      {selectedSubmission.latitude &&
                        selectedSubmission.longitude && (
                          <div className="col-span-2">
                            <Label className="text-xs text-gray-500">
                              Coordinates
                            </Label>
                            <p className="text-sm text-gray-900 mt-1">
                              {selectedSubmission.latitude},{" "}
                              {selectedSubmission.longitude}
                            </p>
                          </div>
                        )}
                    </div>
                  </div>
                )}

              {/* Company Information (from IP enrichment or Company Enrichment API) */}
              {(selectedSubmission.companyName ||
                selectedSubmission.companyDomain ||
                selectedSubmission.companyIndustry ||
                selectedSubmission.companyWebsite ||
                selectedSubmission.companyDescription ||
                selectedSubmission.companyEmployees) && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Company Information (People Data Labs)
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedSubmission.companyName && (
                        <div>
                          <Label className="text-xs text-gray-500">
                            Company Name
                          </Label>
                          <p className="text-sm text-gray-900 mt-1">
                            {selectedSubmission.companyName}
                          </p>
                        </div>
                      )}
                      {selectedSubmission.companyDomain && (
                        <div>
                          <Label className="text-xs text-gray-500">Domain</Label>
                          <p className="text-sm text-gray-900 mt-1">
                            {selectedSubmission.companyDomain}
                          </p>
                        </div>
                      )}
                      {selectedSubmission.companyWebsite && (
                        <div>
                          <Label className="text-xs text-gray-500">Website</Label>
                          <p className="text-sm text-gray-900 mt-1">
                            <a
                              href={selectedSubmission.companyWebsite}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {selectedSubmission.companyWebsite}
                            </a>
                          </p>
                        </div>
                      )}
                      {selectedSubmission.companyIndustry && (
                        <div>
                          <Label className="text-xs text-gray-500">
                            Industry
                          </Label>
                          <p className="text-sm text-gray-900 mt-1">
                            {selectedSubmission.companyIndustry}
                          </p>
                        </div>
                      )}
                      {selectedSubmission.companyEmployees && (
                        <div>
                          <Label className="text-xs text-gray-500">
                            Employees
                          </Label>
                          <p className="text-sm text-gray-900 mt-1">
                            {selectedSubmission.companyEmployees.toLocaleString()}
                          </p>
                        </div>
                      )}
                      {selectedSubmission.companyRevenue && (
                        <div>
                          <Label className="text-xs text-gray-500">Revenue</Label>
                          <p className="text-sm text-gray-900 mt-1">
                            {selectedSubmission.companyRevenue}
                          </p>
                        </div>
                      )}
                      {selectedSubmission.companyFounded && (
                        <div>
                          <Label className="text-xs text-gray-500">Founded</Label>
                          <p className="text-sm text-gray-900 mt-1">
                            {selectedSubmission.companyFounded}
                          </p>
                        </div>
                      )}
                      {(selectedSubmission.companyLinkedinUrl ||
                        selectedSubmission.companyTwitterUrl ||
                        selectedSubmission.companyFacebookUrl) && (
                          <div className="col-span-2">
                            <Label className="text-xs text-gray-500">
                              Social Profiles
                            </Label>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {selectedSubmission.companyLinkedinUrl && (
                                <a
                                  href={selectedSubmission.companyLinkedinUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 rounded-lg text-xs text-blue-700 transition-colors"
                                >
                                  LinkedIn
                                </a>
                              )}
                              {selectedSubmission.companyTwitterUrl && (
                                <a
                                  href={selectedSubmission.companyTwitterUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-100 hover:bg-sky-200 rounded-lg text-xs text-sky-700 transition-colors"
                                >
                                  Twitter
                                </a>
                              )}
                              {selectedSubmission.companyFacebookUrl && (
                                <a
                                  href={selectedSubmission.companyFacebookUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 rounded-lg text-xs text-blue-700 transition-colors"
                                >
                                  Facebook
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      {selectedSubmission.companyDescription && (
                        <div className="col-span-2">
                          <Label className="text-xs text-gray-500">
                            Description
                          </Label>
                          <p className="text-sm text-gray-900 mt-1">
                            {selectedSubmission.companyDescription}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Company Employees List */}
              {selectedSubmission.companyEmployeesList && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Company Employees
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {(() => {
                      try {
                        const employees =
                          typeof selectedSubmission.companyEmployeesList ===
                            "string"
                            ? JSON.parse(
                              selectedSubmission.companyEmployeesList
                            )
                            : selectedSubmission.companyEmployeesList;
                        return Array.isArray(employees) && employees.length > 0
                          ? employees.map((emp: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    {emp.name || "Unknown"}
                                  </p>
                                  {emp.jobTitle && (
                                    <p className="text-xs text-gray-600 mt-1">
                                      {emp.jobTitle}
                                    </p>
                                  )}
                                  {emp.email && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      {emp.email}
                                    </p>
                                  )}
                                </div>
                                {emp.linkedinUrl && (
                                  <a
                                    href={emp.linkedinUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-xs ml-2"
                                  >
                                    LinkedIn
                                  </a>
                                )}
                              </div>
                            </div>
                          ))
                          : null;
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Person Enrichment - Job Information */}
              {(selectedSubmission.jobTitle ||
                selectedSubmission.jobCompanyName ||
                selectedSubmission.jobCompanyDomain) && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Current Job (People Data Labs)
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedSubmission.jobTitle && (
                        <div>
                          <Label className="text-xs text-gray-500">
                            Job Title
                          </Label>
                          <p className="text-sm text-gray-900 mt-1 font-medium">
                            {selectedSubmission.jobTitle}
                          </p>
                        </div>
                      )}
                      {selectedSubmission.jobCompanyName && (
                        <div>
                          <Label className="text-xs text-gray-500">Company</Label>
                          <p className="text-sm text-gray-900 mt-1">
                            {selectedSubmission.jobCompanyName}
                          </p>
                        </div>
                      )}
                      {selectedSubmission.jobCompanyDomain && (
                        <div>
                          <Label className="text-xs text-gray-500">
                            Company Domain
                          </Label>
                          <p className="text-sm text-gray-900 mt-1">
                            {selectedSubmission.jobCompanyDomain}
                          </p>
                        </div>
                      )}
                      {selectedSubmission.jobCompanyWebsite && (
                        <div>
                          <Label className="text-xs text-gray-500">
                            Company Website
                          </Label>
                          <p className="text-sm text-gray-900 mt-1">
                            <a
                              href={selectedSubmission.jobCompanyWebsite}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {selectedSubmission.jobCompanyWebsite}
                            </a>
                          </p>
                        </div>
                      )}
                      {selectedSubmission.jobCompanyIndustry && (
                        <div>
                          <Label className="text-xs text-gray-500">
                            Industry
                          </Label>
                          <p className="text-sm text-gray-900 mt-1">
                            {selectedSubmission.jobCompanyIndustry}
                          </p>
                        </div>
                      )}
                      {selectedSubmission.jobCompanyLocation && (
                        <div>
                          <Label className="text-xs text-gray-500">
                            Location
                          </Label>
                          <p className="text-sm text-gray-900 mt-1">
                            {selectedSubmission.jobCompanyLocation}
                          </p>
                        </div>
                      )}
                      {(selectedSubmission.jobStartDate ||
                        selectedSubmission.jobEndDate) && (
                          <div className="col-span-2">
                            <Label className="text-xs text-gray-500">
                              Employment Period
                            </Label>
                            <p className="text-sm text-gray-900 mt-1">
                              {selectedSubmission.jobStartDate || "?"} -{" "}
                              {selectedSubmission.jobEndDate || "Present"}
                            </p>
                          </div>
                        )}
                    </div>
                  </div>
                )}

              {/* Work Experience */}
              {selectedSubmission.personExperience && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Work Experience
                  </h3>
                  <div className="space-y-3">
                    {(() => {
                      try {
                        const experience =
                          typeof selectedSubmission.personExperience ===
                            "string"
                            ? JSON.parse(selectedSubmission.personExperience)
                            : selectedSubmission.personExperience;
                        return Array.isArray(experience) &&
                          experience.length > 0
                          ? experience.map((exp: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <p className="text-sm font-medium text-gray-900">
                                {exp.title || "Unknown Title"}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                {exp.company || "Unknown Company"}
                              </p>
                              {(exp.startDate || exp.endDate) && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {exp.startDate || "?"} -{" "}
                                  {exp.endDate || "Present"}
                                </p>
                              )}
                            </div>
                          ))
                          : null;
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Education */}
              {selectedSubmission.personEducation && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Education
                  </h3>
                  <div className="space-y-3">
                    {(() => {
                      try {
                        const education =
                          typeof selectedSubmission.personEducation === "string"
                            ? JSON.parse(selectedSubmission.personEducation)
                            : selectedSubmission.personEducation;
                        return Array.isArray(education) && education.length > 0
                          ? education.map((edu: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <p className="text-sm font-medium text-gray-900">
                                {edu.school || "Unknown School"}
                              </p>
                              {edu.degrees &&
                                Array.isArray(edu.degrees) &&
                                edu.degrees.length > 0 && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    {edu.degrees.join(", ")}
                                  </p>
                                )}
                              {(edu.startDate || edu.endDate) && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {edu.startDate || "?"} -{" "}
                                  {edu.endDate || "Present"}
                                </p>
                              )}
                            </div>
                          ))
                          : null;
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Skills, Interests, Languages */}
              {(selectedSubmission.personSkills ||
                selectedSubmission.personInterests ||
                selectedSubmission.personLanguages) && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Skills & Interests
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedSubmission.personSkills && (
                        <div>
                          <Label className="text-xs text-gray-500">Skills</Label>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(() => {
                              try {
                                const skills =
                                  typeof selectedSubmission.personSkills ===
                                    "string"
                                    ? JSON.parse(selectedSubmission.personSkills)
                                    : selectedSubmission.personSkills;
                                return Array.isArray(skills) && skills.length > 0
                                  ? skills
                                    .slice(0, 10)
                                    .map((skill: string, idx: number) => (
                                      <Badge
                                        key={idx}
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {skill}
                                      </Badge>
                                    ))
                                  : null;
                              } catch {
                                return null;
                              }
                            })()}
                          </div>
                        </div>
                      )}
                      {selectedSubmission.personInterests && (
                        <div>
                          <Label className="text-xs text-gray-500">
                            Interests
                          </Label>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(() => {
                              try {
                                const interests =
                                  typeof selectedSubmission.personInterests ===
                                    "string"
                                    ? JSON.parse(
                                      selectedSubmission.personInterests
                                    )
                                    : selectedSubmission.personInterests;
                                return Array.isArray(interests) &&
                                  interests.length > 0
                                  ? interests
                                    .slice(0, 10)
                                    .map((interest: string, idx: number) => (
                                      <Badge
                                        key={idx}
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {interest}
                                      </Badge>
                                    ))
                                  : null;
                              } catch {
                                return null;
                              }
                            })()}
                          </div>
                        </div>
                      )}
                      {selectedSubmission.personLanguages && (
                        <div>
                          <Label className="text-xs text-gray-500">
                            Languages
                          </Label>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(() => {
                              try {
                                const languages =
                                  typeof selectedSubmission.personLanguages ===
                                    "string"
                                    ? JSON.parse(
                                      selectedSubmission.personLanguages
                                    )
                                    : selectedSubmission.personLanguages;
                                return Array.isArray(languages) &&
                                  languages.length > 0
                                  ? languages.map((lang: string, idx: number) => (
                                    <Badge
                                      key={idx}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {lang}
                                    </Badge>
                                  ))
                                  : null;
                              } catch {
                                return null;
                              }
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Network Members */}
              {selectedSubmission.personNetworkMembers && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Network Members (People Also Viewed)
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {(() => {
                      try {
                        const network =
                          typeof selectedSubmission.personNetworkMembers ===
                            "string"
                            ? JSON.parse(
                              selectedSubmission.personNetworkMembers
                            )
                            : selectedSubmission.personNetworkMembers;
                        return Array.isArray(network) && network.length > 0
                          ? network.map((member: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    {member.name || "Unknown"}
                                  </p>
                                  {member.jobTitle && (
                                    <p className="text-xs text-gray-600 mt-1">
                                      {member.jobTitle}
                                      {member.company &&
                                        ` at ${member.company}`}
                                    </p>
                                  )}
                                  {member.email && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      {member.email}
                                    </p>
                                  )}
                                </div>
                                {member.linkedinUrl && (
                                  <a
                                    href={member.linkedinUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-xs ml-2"
                                  >
                                    LinkedIn
                                  </a>
                                )}
                              </div>
                            </div>
                          ))
                          : null;
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Social Profiles */}
              {selectedSubmission.personProfiles && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Social Profiles
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      try {
                        const profiles =
                          typeof selectedSubmission.personProfiles === "string"
                            ? JSON.parse(selectedSubmission.personProfiles)
                            : selectedSubmission.personProfiles;
                        return Array.isArray(profiles) && profiles.length > 0
                          ? profiles.map((profile: any, idx: number) => (
                            <a
                              key={idx}
                              href={profile.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-700 transition-colors"
                            >
                              <span className="font-medium capitalize">
                                {profile.network || "Profile"}
                              </span>
                              {profile.username && (
                                <span className="text-gray-500">
                                  @{profile.username}
                                </span>
                              )}
                            </a>
                          ))
                          : null;
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Technical Details */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Technical Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {selectedSubmission.ipAddress && (
                    <div>
                      <Label className="text-xs text-gray-500">
                        IP Address
                      </Label>
                      <p className="text-sm text-gray-900 mt-1 font-mono">
                        {selectedSubmission.ipAddress}
                      </p>
                    </div>
                  )}
                  {selectedSubmission.isp && (
                    <div>
                      <Label className="text-xs text-gray-500">ISP</Label>
                      <p className="text-sm text-gray-900 mt-1">
                        {selectedSubmission.isp}
                      </p>
                    </div>
                  )}
                  {selectedSubmission.connectionType && (
                    <div>
                      <Label className="text-xs text-gray-500">
                        Connection Type
                      </Label>
                      <p className="text-sm text-gray-900 mt-1">
                        {selectedSubmission.connectionType}
                      </p>
                    </div>
                  )}
                  {selectedSubmission.timeOnPageSeconds && (
                    <div>
                      <Label className="text-xs text-gray-500">
                        Time on Page
                      </Label>
                      <p className="text-sm text-gray-900 mt-1">
                        {Math.round(selectedSubmission.timeOnPageSeconds)}{" "}
                        seconds
                      </p>
                    </div>
                  )}
                  {selectedSubmission.userAgent && (
                    <div className="col-span-2">
                      <Label className="text-xs text-gray-500">
                        User Agent
                      </Label>
                      <p className="text-xs text-gray-900 mt-1 font-mono break-all">
                        {selectedSubmission.userAgent}
                      </p>
                    </div>
                  )}
                  {selectedSubmission.referer && (
                    <div className="col-span-2">
                      <Label className="text-xs text-gray-500">Referer</Label>
                      <p className="text-xs text-gray-900 mt-1 font-mono break-all">
                        {selectedSubmission.referer}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata */}
              {selectedSubmission.metadata && (
                <div>
                  <Label className="text-xs text-gray-500">
                    Additional Metadata
                  </Label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <pre className="text-xs text-gray-900 whitespace-pre-wrap break-all">
                      {typeof selectedSubmission.metadata === "string"
                        ? selectedSubmission.metadata
                        : JSON.stringify(selectedSubmission.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSubmissionDetailOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  return <div className="space-y-8">{content}</div>;
}

export default function FeedbackPagesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return null;
}
