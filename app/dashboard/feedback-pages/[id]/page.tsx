"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { notFound, useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Link2,
  Loader2,
  Settings,
  Layout,
  Eye,
  ExternalLink,
  BarChart2,
  History,
  ChevronRight,
  Pencil,
  MoreHorizontal,
  Copy,
  Trash2,
  Save,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { FormBuilder } from "@/components/form-builder/form-builder";
import { AIFormPanel } from "@/components/form-builder/ai-form-panel";
import { VersionHistory } from "@/components/form-builder/version-history";
import { FormPreviewDialog } from "@/components/form-builder/form-preview-dialog";
import { ShareDialog } from "@/components/form-builder/share-dialog";
import { FormAnalyticsView } from "@/components/analytics/form-analytics-view";
import {
  MultiStepFormConfig,
  migrateToFormConfig,
  createStep,
  createField,
} from "@/lib/form-builder-types";

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
  allowedEmails?: string[];
  backgroundPattern?: "none" | "dots" | "grid" | "mesh" | "diagonal" | "waves";
  formConfig?: MultiStepFormConfig;
  successTitle?: string;
  successMessage?: string;
  urlPrefix?: string;
}

const defaultCustomizations: FeedbackPageCustomizations = {
  primaryColor: "#000000",
  backgroundColor: "#ffffff",
  textColor: "#000000",
  buttonColor: "#000000",
  buttonTextColor: "#ffffff",
  showNameField: true,
  showEmailField: true,
  requireEmail: false,
  allowedEmails: [],
  backgroundPattern: "none",
  successTitle: "",
  successMessage: "",
};

type EditorTab = "settings" | "builder" | "analytics";

export default function FeedbackPageEditor() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string | undefined;

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<FeedbackPage | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    slug: "",
    isActive: true,
  });
  const [customizations, setCustomizations] =
    useState<FeedbackPageCustomizations>(defaultCustomizations);
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const validTabs: EditorTab[] = ["settings", "builder", "analytics"];
  const tabFromUrl = searchParams.get("tab") as EditorTab | null;
  const [activeTab, setActiveTabState] = useState<EditorTab>(
    tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : "builder"
  );

  const setActiveTab = useCallback((tab: EditorTab) => {
    setActiveTabState(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  }, []);
  const isInitialLoad = useRef(true);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect mobile and default to analytics tab
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && activeTab === "builder") {
        setActiveTab("analytics");
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);

  const formConfig: MultiStepFormConfig =
    customizations.formConfig ??
    migrateToFormConfig({
      showNameField: customizations.showNameField,
      showEmailField: customizations.showEmailField,
      requireEmail: customizations.requireEmail,
    });

  const setFormConfig = (config: MultiStepFormConfig) => {
    setCustomizations((prev) => ({ ...prev, formConfig: config }));
  };

  useEffect(() => {
    if (!id) return;
    const fetchPage = async () => {
      try {
        const res = await fetch(`/api/feedback-pages/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            notFound();
          }
          throw new Error("Failed to load page");
        }
        const data = await res.json();
        setPage(data);
        setFormData({
          title: data.title,
          description: data.description || "",
          slug: data.slug,
          isActive: data.isActive,
        });
        if (data.customizations) {
          try {
            const parsed = JSON.parse(data.customizations);
            setCustomizations({
              ...defaultCustomizations,
              ...parsed,
              allowedEmails: parsed.allowedEmails || [],
            });
          } catch {
            setCustomizations(defaultCustomizations);
          }
        } else {
          setCustomizations(defaultCustomizations);
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load feedback page");
      } finally {
        setLoading(false);
        // Allow state to settle before enabling auto-save
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            isInitialLoad.current = false;
          });
        });
      }
    };
    fetchPage();
  }, [id]);

  const handleSave = useCallback(async (silent = false) => {
    if (!page) return;
    setSaving(true);
    try {
      const custToSave: FeedbackPageCustomizations = {
        ...customizations,
        formConfig: formConfig,
      };
      const res = await fetch(`/api/feedback-pages/${page.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          isActive: formData.isActive,
          customizations: custToSave,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      setPage(updated);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      setShowSaved(true);
      savedTimerRef.current = setTimeout(() => setShowSaved(false), 3000);
      if (!silent) toast.success("Form updated");
    } catch (error) {
      if (!silent) toast.error(
        error instanceof Error ? error.message : "Failed to save changes"
      );
    } finally {
      setSaving(false);
    }
  }, [page, formData, customizations, formConfig]);

  // Auto-populate a first step when a new form has none
  useEffect(() => {
    if (!loading && page && formConfig.steps.length === 0) {
      const firstField = { ...createField("long_text"), label: "What's your feedback?", placeholder: "Share your thoughts…", required: true };
      const firstStep = { ...createStep("Your feedback"), fields: [firstField] };
      setFormConfig({ version: 1, steps: [firstStep] });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, page]);

  // Auto-save: debounce 2s after any change
  useEffect(() => {
    if (!page || isInitialLoad.current) return;
    const id = setTimeout(() => { handleSave(true); }, 2000);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formConfig, formData, customizations]);

  // Cmd+S / Ctrl+S to save immediately
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  const allowedEmails = customizations.allowedEmails || [];

  const [newAllowedEmail, setNewAllowedEmail] = useState("");
  const addAllowedEmail = () => {
    const email = newAllowedEmail.trim().toLowerCase();
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Enter a valid email");
      return;
    }
    if (allowedEmails.includes(email)) {
      toast.error("Email already added");
      return;
    }
    setCustomizations({
      ...customizations,
      allowedEmails: [...allowedEmails, email],
    });
    setNewAllowedEmail("");
  };

  const removeAllowedEmail = (email: string) => {
    setCustomizations({
      ...customizations,
      allowedEmails: allowedEmails.filter((entry) => entry !== email),
    });
  };

  const urlPrefix = customizations.urlPrefix?.trim() || "f";
  const publicUrl =
    page && typeof window !== "undefined"
      ? `${window.location.origin}/${urlPrefix}/${page.slug}`
      : "";



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="text-center p-10">
        <p className="text-gray-500">Form not found.</p>
        <Button
          className="mt-4"
          onClick={() => router.push("/dashboard/feedback-pages")}
        >
          Back to list
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-[calc(100dvh-56px)]">
        {/* ── Top bar ── */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between px-4 min-h-14 py-2 sm:py-0 sm:h-14 border-b border-gray-200 bg-white shrink-0 gap-3">

          {/* Left: breadcrumb + editable title */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0 text-sm">
              <button
                type="button"
                onClick={() => router.push("/dashboard/feedback-pages")}
                className="text-gray-500 hover:text-gray-600 shrink-0 transition-colors cursor-pointer"
              >
                Forms
              </button>
              <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              {editingTitle ? (
                <input
                  autoFocus
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  onBlur={() => setEditingTitle(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "Escape") setEditingTitle(false);
                  }}
                  className="text-sm font-semibold text-gray-900 bg-transparent border-b border-gray-400 focus:outline-none w-full sm:w-[180px] sm:max-w-[220px]"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingTitle(true)}
                  className="flex items-center gap-1.5 group min-w-0"
                >
                  <span className="text-sm font-semibold text-gray-900 truncate max-w-full sm:max-w-[180px]">
                    {formData.title || "Untitled"}
                  </span>
                  <Pencil className="h-3 w-3 text-gray-400 group-hover:text-gray-500 shrink-0 transition-colors" />
                </button>
              )}
            </div>
          </div>

          {/* Center: view tabs */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 shrink-0">
            {(
              [
                { tab: "builder", label: "Build", icon: Layout, mobileHidden: true },
                { tab: "analytics", label: "Analytics", icon: BarChart2, mobileHidden: false },
              ] as const
            ).map(({ tab, label, icon: Icon, mobileHidden }) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === tab
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                } ${mobileHidden ? "hidden md:inline-flex" : ""}`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 shrink-0 flex-1 justify-end">

            {/* Save icon button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-gray-500 hover:text-gray-900"
              disabled={saving}
              onClick={() => handleSave(false)}
              title={saving ? "Saving…" : showSaved ? "Saved" : "Save"}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>

            {formData.isActive ? (
              <>
                {/* Published badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-green-50 text-green-700 border-green-200 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-green-500" />
                  Published
                </div>
                {/* Share — primary */}
                <Button
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => setShareOpen(true)}
                >
                  <Link2 className="h-3 w-3 mr-1.5" />
                  Share
                </Button>
              </>
            ) : (
              <>
                {/* Publish — primary */}
                <Button
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => setFormData((prev) => ({ ...prev, isActive: true }))}
                >
                  Publish
                </Button>
              </>
            )}

            {/* Overflow menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 text-gray-500 hover:text-gray-900">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                  {/* Preview */}
                  <DropdownMenuItem onClick={() => setPreviewOpen(true)}>
                    <Eye className="h-3.5 w-3.5 mr-2 text-gray-500" />
                    Preview
                  </DropdownMenuItem>
                  {/* Settings */}
                  <DropdownMenuItem onClick={() => setActiveTab("settings")}>
                    <Settings className="h-3.5 w-3.5 mr-2 text-gray-500" />
                    Settings
                  </DropdownMenuItem>
                  {/* Version history */}
                  <DropdownMenuItem onClick={() => setVersionHistoryOpen(true)}>
                    <History className="h-3.5 w-3.5 mr-2 text-gray-500" />
                    Version history
                  </DropdownMenuItem>
                  {/* Duplicate */}
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/feedback-pages", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            title: `Copy of ${formData.title}`,
                            description: formData.description,
                            customizations: JSON.stringify({ ...customizations, formConfig }),
                          }),
                        });
                        if (res.ok) {
                          const created = await res.json();
                          toast.success("Form duplicated");
                          router.push(`/dashboard/feedback-pages/${created.id}`);
                        } else {
                          toast.error("Failed to duplicate");
                        }
                      } catch {
                        toast.error("Failed to duplicate");
                      }
                    }}
                  >
                    <Copy className="h-3.5 w-3.5 mr-2 text-gray-500" />
                    Duplicate form
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                {formData.isActive && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={() => setFormData((prev) => ({ ...prev, isActive: false }))}>
                        <ExternalLink className="h-3.5 w-3.5 mr-2 text-gray-500" />
                        Unpublish
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                  onClick={async () => {
                    if (!confirm("Delete this form and all its submissions? This cannot be undone.")) return;
                    try {
                      const res = await fetch(`/api/feedback-pages/${page.id}`, { method: "DELETE" });
                      if (res.ok) { toast.success("Form deleted"); router.push("/dashboard/feedback-pages"); }
                      else toast.error("Failed to delete");
                    } catch { toast.error("Failed to delete"); }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete form
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-hidden flex">
          {activeTab === "analytics" ? (
            <div className="flex-1 overflow-y-auto bg-gray-50">
              <div className="max-w-7xl mx-auto px-6 py-6">
                <FormAnalyticsView pageId={page.id} showHeader={false} />
              </div>
            </div>
          ) : activeTab === "builder" && !isMobile ? (
            <>
              <div className="flex-1 overflow-hidden">
                <FormBuilder config={formConfig} onChange={setFormConfig} />
              </div>
              {page && (
                <AIFormPanel
                  pageId={page.id}
                  currentFormConfig={formConfig}
                  onApply={setFormConfig}
                />
              )}
            </>
          ) : (
            <div className="flex-1 overflow-y-auto bg-gray-50">
              <div className="max-w-xl mx-auto py-8 px-6 space-y-6">

                {/* General */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">General</p>
                  <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
                    <div className="p-4 space-y-1.5">
                      <Label className="text-xs font-medium text-gray-700">Title</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="Share your thoughts"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="p-4 space-y-1.5">
                      <Label className="text-xs font-medium text-gray-700">Description</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        placeholder="Give your form a short description"
                        className="resize-none text-sm"
                      />
                    </div>
                    <div className="p-4 space-y-1.5">
                      <Label className="text-xs font-medium text-gray-700">Public URL</Label>
                      <div className="flex gap-2">
                        <div className="flex flex-1 items-center rounded-md border border-gray-200 overflow-hidden bg-gray-50">
                          <span className="flex-1 h-9 px-3 text-xs font-mono text-gray-600 flex items-center truncate select-all">
                            {publicUrl || `/${urlPrefix}/${formData.slug}`}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => { if (publicUrl) { navigator.clipboard.writeText(publicUrl); toast.success("URL copied"); } }}
                          className="h-9 px-3 text-xs shrink-0"
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Appearance */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Appearance</p>
                  <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
                    <div className="p-4">
                      <p className="text-xs font-medium text-gray-700 mb-3">Colors</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                        {[
                          { label: "Background", key: "backgroundColor" },
                          { label: "Text", key: "textColor" },
                          { label: "Button", key: "buttonColor" },
                          { label: "Button text", key: "buttonTextColor" },
                          { label: "Primary", key: "primaryColor" },
                        ].map(({ label, key }) => (
                          <div key={key} className="flex items-center gap-2">
                            <div className="relative shrink-0">
                              <input
                                type="color"
                                value={customizations[key as keyof FeedbackPageCustomizations] as string}
                                onChange={(e) => setCustomizations((prev) => ({ ...prev, [key]: e.target.value }))}
                                className="w-10 h-10 rounded-md cursor-pointer border border-gray-200 p-0.5"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                              <input
                                value={customizations[key as keyof FeedbackPageCustomizations] as string}
                                onChange={(e) => setCustomizations((prev) => ({ ...prev, [key]: e.target.value }))}
                                className="w-full h-7 px-2 text-xs font-mono border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                                placeholder="#000000"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 space-y-1.5">
                      <Label className="text-xs font-medium text-gray-700">Background pattern</Label>
                      <Select
                        value={customizations.backgroundPattern || "none"}
                        onValueChange={(value: "none" | "dots" | "grid" | "mesh" | "diagonal" | "waves") =>
                          setCustomizations((prev) => ({ ...prev, backgroundPattern: value }))
                        }
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="dots">Dots</SelectItem>
                          <SelectItem value="grid">Grid</SelectItem>
                          <SelectItem value="mesh">Mesh</SelectItem>
                          <SelectItem value="diagonal">Diagonal Lines</SelectItem>
                          <SelectItem value="waves">Waves</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* End page */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">End Page</p>
                  <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
                    <div className="p-4 space-y-1.5">
                      <Label className="text-xs font-medium text-gray-700">Heading</Label>
                      <Input
                        className="h-9 text-sm"
                        placeholder="Thank you!"
                        value={customizations.successTitle ?? ""}
                        onChange={(e) => setCustomizations((prev) => ({ ...prev, successTitle: e.target.value }))}
                      />
                    </div>
                    <div className="p-4 space-y-1.5">
                      <Label className="text-xs font-medium text-gray-700">Message</Label>
                      <Textarea
                        rows={3}
                        className="resize-none text-sm"
                        placeholder="Your feedback has been submitted successfully."
                        value={customizations.successMessage ?? ""}
                        onChange={(e) => setCustomizations((prev) => ({ ...prev, successMessage: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Access control */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Access</p>
                  <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                    <p className="text-xs text-gray-500">Restrict this form to specific email addresses only.</p>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="member@company.com"
                        value={newAllowedEmail}
                        onChange={(e) => setNewAllowedEmail(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAllowedEmail(); } }}
                        className="h-9 text-xs"
                      />
                      <Button variant="outline" size="sm" onClick={addAllowedEmail} className="h-9 px-3 text-xs shrink-0">
                        Add
                      </Button>
                    </div>
                    {allowedEmails.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {allowedEmails.map((email) => (
                          <span key={email} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                            {email}
                            <button type="button" onClick={() => removeAllowedEmail(email)} className="text-gray-500 hover:text-gray-700 leading-none">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>

      {page && (
        <>
          <VersionHistory
            feedbackPageId={page.id}
            onRestore={(restoredConfig) => {
              setFormConfig(restoredConfig);
              toast.success("Form restored from history");
            }}
            open={versionHistoryOpen}
            onOpenChange={setVersionHistoryOpen}
          />
          <FormPreviewDialog
            open={previewOpen}
            onClose={() => setPreviewOpen(false)}
            url={publicUrl}
          />
          <ShareDialog
            open={shareOpen}
            onOpenChange={setShareOpen}
            formUrl={publicUrl}
            formTitle={formData.title}
          />
        </>
      )}
    </>
  );
}
