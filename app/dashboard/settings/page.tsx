"use client";

import { useOrganization, useUser } from "@clerk/nextjs";
import { useEffect, useState, useRef, useCallback } from "react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Save, Sparkles, Trash2, CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Link from "next/link";

export default function SettingsPage() {
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { isSignedIn } = useUser();
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [internalUseCase, setInternalUseCase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [generatingUseCase, setGeneratingUseCase] = useState(false);
  const [fetchingWebsiteInfo, setFetchingWebsiteInfo] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const urlTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track original values to detect changes
  const [originalValues, setOriginalValues] = useState({
    companyName: "",
    companyUrl: "",
    description: "",
    internalUseCase: "",
  });

  const fetchWebsiteInfo = async (url: string) => {
    if (!url.trim()) {
      setFaviconUrl(null);
      return null;
    }

    setFetchingWebsiteInfo(true);
    try {
      const response = await fetch("/api/fetch-website-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn("Failed to fetch website info:", errorData.error);
        setFaviconUrl(null);
        return null;
      }

      const data = await response.json();

      // Set favicon
      if (data.faviconUrl) {
        setFaviconUrl(data.faviconUrl);
      }

      return data;
    } catch (err) {
      console.error("Error fetching website info:", err);
      setFaviconUrl(null);
      return null;
    } finally {
      setFetchingWebsiteInfo(false);
    }
  };

  const loadWorkspace = useCallback(async () => {
    if (!organization) return;

    setLoading(true);
    setError(null);
    try {
      // Try to get workspace by Clerk organization ID first
      // This is more direct and doesn't require fetching all workspaces
      let workspaceRes = await fetch(`/api/workspaces/${organization.id}`);

      // If that fails, try fetching all workspaces and finding the match
      if (!workspaceRes.ok) {
        const workspacesRes = await fetch("/api/workspaces");
        if (!workspacesRes.ok) {
          const errorData = await workspacesRes.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to load workspaces");
        }
        const workspacesData = await workspacesRes.json();
        const matchingWorkspace = workspacesData.workspaces?.find(
          (w: any) => w.clerkOrganizationId === organization.id
        );

        if (!matchingWorkspace) {
          setError(
            "Workspace not found. Please ensure you have an active workspace."
          );
          setLoading(false);
          return;
        }

        // Fetch the full workspace details using the database ID
        workspaceRes = await fetch(`/api/workspaces/${matchingWorkspace.id}`);
        if (!workspaceRes.ok) {
          const errorData = await workspaceRes.json().catch(() => ({}));
          throw new Error(
            errorData.error || "Failed to load workspace details"
          );
        }
      }

      const workspaceData = await workspaceRes.json();
      setWorkspace(workspaceData.workspace);
      const name = workspaceData.workspace.companyName || "";
      const url = workspaceData.workspace.companyUrl || "";
      const desc = workspaceData.workspace.description || "";
      const useCase = workspaceData.workspace.internalUseCase || "";

      setCompanyName(name);
      setCompanyUrl(url);
      setDescription(desc);
      setInternalUseCase(useCase);

      // Store original values
      setOriginalValues({
        companyName: name,
        companyUrl: url,
        description: desc,
        internalUseCase: useCase,
      });

      // Fetch favicon if URL exists (just for display, don't auto-fill)
      if (url) {
        fetchWebsiteInfo(url);
      }
    } catch (err) {
      console.error("Error loading workspace:", err);
      setError(err instanceof Error ? err.message : "Failed to load workspace");
    } finally {
      setLoading(false);
    }
  }, [organization]);

  useEffect(() => {
    if (isSignedIn && orgLoaded && organization?.id) {
      loadWorkspace();
    }
  }, [isSignedIn, orgLoaded, organization?.id, loadWorkspace]);

  const handleGenerateDescription = async () => {
    if (!workspace) return;

    setGeneratingDescription(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/workspaces/${workspace.id}/generate-description`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "description" }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate description");
      }

      const data = await response.json();
      setDescription(data.content);
    } catch (err) {
      console.error("Error generating description:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate description"
      );
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setCompanyUrl(url);

    // Clear previous timeout
    if (urlTimeoutRef.current) {
      clearTimeout(urlTimeoutRef.current);
    }

    // Clear favicon when URL is empty
    if (!url.trim()) {
      setFaviconUrl(null);
      return;
    }

    // Debounce: Wait for user to finish typing/pasting (1 second)
    urlTimeoutRef.current = setTimeout(async () => {
      const trimmedUrl = url.trim();
      if (!trimmedUrl) return;

      // Fetch website info
      const websiteInfo = await fetchWebsiteInfo(trimmedUrl);

      if (websiteInfo) {
        // Pre-fill company name if empty and we got a title
        let finalCompanyName = companyName.trim();
        if (websiteInfo.title && !finalCompanyName) {
          setCompanyName(websiteInfo.title);
          finalCompanyName = websiteInfo.title;
        }

        // Auto-generate description if company name exists and description is empty
        if (finalCompanyName && !description.trim() && workspace) {
          try {
            setGeneratingDescription(true);
            const generateResponse = await fetch(
              `/api/workspaces/${workspace.id}/generate-description`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "description" }),
              }
            );

            if (generateResponse.ok) {
              const generateData = await generateResponse.json();
              setDescription(generateData.content);
            }
          } catch (err) {
            console.error("Error generating description:", err);
            // Don't show error, just continue
          } finally {
            setGeneratingDescription(false);
          }
        }
      }
    }, 1000);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (urlTimeoutRef.current) {
        clearTimeout(urlTimeoutRef.current);
      }
    };
  }, []);

  const handleGenerateUseCase = async () => {
    if (!workspace) return;

    setGeneratingUseCase(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/workspaces/${workspace.id}/generate-description`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "internalUseCase" }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate use case");
      }

      const data = await response.json();
      setInternalUseCase(data.content);
    } catch (err) {
      console.error("Error generating use case:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate use case"
      );
    } finally {
      setGeneratingUseCase(false);
    }
  };

  const handleSave = async () => {
    if (!workspace) return;

    setSaving(true);
    setError(null);
    try {
      // First, save the basic information
      const response = await fetch(`/api/workspaces/${workspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim() || null,
          companyUrl: companyUrl.trim() || null,
          description: description.trim() || null,
          internalUseCase: internalUseCase.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save settings");
      }

      const data = await response.json();
      setWorkspace(data.workspace);

      // Update original values after save
      const savedName = companyName.trim() || "";
      const savedUrl = companyUrl.trim() || "";
      const savedDesc = description.trim() || "";
      const savedUseCase = internalUseCase.trim() || "";

      // After saving, if we have a URL, fetch website info and pre-fill
      if (savedUrl) {
        const websiteInfo = await fetchWebsiteInfo(savedUrl);

        // Pre-fill company name if empty and we got a title
        if (websiteInfo?.title && !savedName) {
          setCompanyName(websiteInfo.title);
          // Save the auto-filled company name
          await fetch(`/api/workspaces/${workspace.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              companyName: websiteInfo.title,
              companyUrl: savedUrl,
              description: savedDesc || null,
              internalUseCase: savedUseCase || null,
            }),
          });
          setOriginalValues({
            companyName: websiteInfo.title,
            companyUrl: savedUrl,
            description: savedDesc,
            internalUseCase: savedUseCase,
          });
        } else {
          setOriginalValues({
            companyName: savedName,
            companyUrl: savedUrl,
            description: savedDesc,
            internalUseCase: savedUseCase,
          });
        }

        // If description is empty, try to generate it
        if (!savedDesc && (savedName || websiteInfo?.title)) {
          try {
            setGeneratingDescription(true);
            const generateResponse = await fetch(
              `/api/workspaces/${workspace.id}/generate-description`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "description" }),
              }
            );

            if (generateResponse.ok) {
              const generateData = await generateResponse.json();
              setDescription(generateData.content);

              // Save the generated description
              await fetch(`/api/workspaces/${workspace.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  companyName: savedName || websiteInfo?.title || null,
                  companyUrl: savedUrl,
                  description: generateData.content,
                  internalUseCase: savedUseCase || null,
                }),
              });

              setOriginalValues({
                companyName: savedName || websiteInfo?.title || "",
                companyUrl: savedUrl,
                description: generateData.content,
                internalUseCase: savedUseCase,
              });
            }
          } catch (err) {
            console.error("Error generating description:", err);
            // Don't show error, just continue
          } finally {
            setGeneratingDescription(false);
          }
        }
      } else {
        setOriginalValues({
          companyName: savedName,
          companyUrl: savedUrl,
          description: savedDesc,
          internalUseCase: savedUseCase,
        });
      }

      // Show success
      toast.success("Settings saved successfully!");
    } catch (err) {
      console.error("Error saving settings:", err);
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Please sign in to access settings.</p>
      </div>
    );
  }

  if (!orgLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">
          Please select a workspace to access settings.
        </p>
      </div>
    );
  }

  return (
    <>
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <Link
            href="/dashboard/settings/billing"
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Billing
          </Link>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-8">
            <div className="space-y-4">
              <Skeleton className="h-6 w-40 mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-9 w-24" />
              </div>
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-9 w-24" />
              </div>
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-medium mb-4">
                  Basic Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-sm">
                      Company Name
                    </Label>
                    <Input
                      id="companyName"
                      type="text"
                      placeholder="Acme Inc"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyUrl" className="text-sm">
                      Website
                    </Label>
                    <div className="relative">
                      {faviconUrl && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center z-10">
                          <img
                            src={faviconUrl}
                            alt="Favicon"
                            className="w-4 h-4"
                            onError={() => setFaviconUrl(null)}
                          />
                        </div>
                      )}
                      {fetchingWebsiteInfo && !faviconUrl && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                          <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                        </div>
                      )}
                      <Input
                        id="companyUrl"
                        type="url"
                        placeholder="https://example.com"
                        value={companyUrl}
                        onChange={handleUrlChange}
                        className={
                          faviconUrl || fetchingWebsiteInfo ? "pl-10" : ""
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Company Description */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-medium">Company Description</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Help us understand what your company does
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    handleGenerateDescription();
                  }}
                  disabled={
                    generatingDescription || !workspace || !companyName.trim()
                  }
                >
                  {generatingDescription ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                id="description"
                placeholder="Describe your company, industry, and what you do..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Internal Use Case */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-medium">Internal Use Case</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    How your team is using this tool
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    handleGenerateUseCase();
                  }}
                  disabled={
                    generatingUseCase || !workspace || !companyName.trim()
                  }
                >
                  {generatingUseCase ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                id="internalUseCase"
                placeholder="Describe how you're using this tool internally, what problems you're solving, and what workflows you're building..."
                value={internalUseCase}
                onChange={(e) => setInternalUseCase(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end sm:justify-end pt-4">
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
                disabled={
                  saving ||
                  (companyName.trim() === originalValues.companyName &&
                    companyUrl.trim() === originalValues.companyUrl &&
                    description.trim() === originalValues.description &&
                    internalUseCase.trim() === originalValues.internalUseCase)
                }
                className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>

            {/* Danger Zone */}
            <div className="pt-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full h-px bg-gray-300" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-sm font-medium text-red-600 uppercase tracking-wide">
                    Danger Zone
                  </span>
                </div>
              </div>
              <div className="border border-red-200 rounded-lg bg-white p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Clear Form
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Once you clear the form, all unsaved changes will be lost.
                  This will reset all fields to their original values.
                </p>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowClearDialog(true);
                    }}
                    className="!bg-red-600 hover:!bg-red-700 !text-white border-0"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Form
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clear Form Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Form</DialogTitle>
            <DialogDescription>
              Are you sure you want to clear all form fields? This will reset
              all fields to their original values. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                setShowClearDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                // Reset to original values
                setCompanyName(originalValues.companyName);
                setCompanyUrl(originalValues.companyUrl);
                setDescription(originalValues.description);
                setInternalUseCase(originalValues.internalUseCase);
                setFaviconUrl(null);
                setShowClearDialog(false);
              }}
              className="!bg-red-600 hover:!bg-red-700 !text-white border-0"
            >
              Clear Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
