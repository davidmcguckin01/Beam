"use client";

import { Button } from "@/components/ui/button";
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
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkspaceSettingsDialog } from "@/components/workspace-settings-dialog";
import { useOrganization, useOrganizationList, useUser } from "@clerk/nextjs";
import {
  AlertCircle,
  Check,
  Edit2,
  Info,
  Loader2,
  Plus,
  Settings,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function WorkspaceSelector() {
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const {
    setActive,
    userMemberships,
    isLoaded: listLoaded,
  } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
  });
  const { user } = useUser();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [allOrganizations, setAllOrganizations] = useState<any[]>([]);
  const [settingsWorkspaceId, setSettingsWorkspaceId] = useState<string | null>(
    null
  );
  const [settingsWorkspaceName, setSettingsWorkspaceName] =
    useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(
    null
  );
  const [editingWorkspaceName, setEditingWorkspaceName] = useState<string>("");
  const [savingWorkspaceName, setSavingWorkspaceName] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSuccessMessage, setIsSuccessMessage] = useState(false);
  const [createWorkspaceDialogOpen, setCreateWorkspaceDialogOpen] =
    useState(false);
  const [workspaceNameInput, setWorkspaceNameInput] = useState<string>("");
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);
  const [pendingActivateWorkspace, setPendingActivateWorkspace] = useState<any>(null);

  const isLoaded = orgLoaded && listLoaded;

  // Fetch all organizations from API to ensure we have the complete list
  useEffect(() => {
    if (isLoaded && user) {
      fetch("/api/workspaces")
        .then((res) => res.json())
        .then((data) => {
          if (data.workspaces) {
            console.log(
              "Fetched workspaces from API:",
              data.workspaces.map((w: any) => ({
                id: w.id,
                name: w.name,
                clerkOrgId: w.clerkOrganizationId,
              }))
            );
            setAllOrganizations(data.workspaces);
          }
        })
        .catch((err) => console.error("Error fetching workspaces:", err));
    }
  }, [isLoaded, user]);

  const handleCreateWorkspace = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isCreating) return;

    // Set default workspace name and open dialog
    const defaultName = `${
      user?.firstName || user?.emailAddresses[0]?.emailAddress || "My"
    }'s Workspace`;
    setWorkspaceNameInput(defaultName);
    setCreateWorkspaceDialogOpen(true);
  };

  const handleConfirmCreateWorkspace = async () => {
    if (isCreating) return;

    const workspaceName = workspaceNameInput.trim();

    if (!workspaceName) {
      return;
    }

    setIsCreating(true);
    setCreateWorkspaceDialogOpen(false);

    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workspaceName.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const { workspace, isTemporary, message } = data;

        // Refresh the organization list from API
        const workspacesRes = await fetch("/api/workspaces");
        if (workspacesRes.ok) {
          const workspacesData = await workspacesRes.json();
          if (workspacesData.workspaces) {
            setAllOrganizations(workspacesData.workspaces);
          }
        }

        // If it's a temporary workspace, show a message but still navigate
        if (isTemporary) {
          setErrorMessage(
            message ||
              "Workspace created successfully. To enable team collaboration, please enable organizations in your Clerk Dashboard and activate this workspace."
          );
          setIsSuccessMessage(true);
          setErrorDialogOpen(true);
          // For temporary workspaces, navigate to dashboard
          // The workspace will be available even without Clerk org
          router.push("/dashboard");
          router.refresh();
        } else {
          // For non-temporary workspaces, set active and navigate
          if (setActive) {
            try {
              await setActive({ organization: workspace.clerkOrganizationId });
              // Wait a bit for Clerk to sync, then navigate
              setTimeout(() => {
                router.push("/dashboard");
                router.refresh();
              }, 500);
            } catch (e) {
              console.error("Error setting active org:", e);
              // Still navigate even if setActive fails
              router.push("/dashboard");
              router.refresh();
            }
          } else {
            // Fallback if setActive is not available
            router.push("/dashboard");
            router.refresh();
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg =
          errorData.error ||
          "Failed to create workspace. Please ensure organizations are enabled in your Clerk Dashboard.";
        setErrorMessage(errorMsg);
        setIsSuccessMessage(false);
        setErrorDialogOpen(true);
      }
    } catch (error) {
      console.error("Error creating workspace:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Failed to create workspace. Please ensure organizations are enabled in your Clerk Dashboard.";
      setErrorMessage(errorMsg);
      setIsSuccessMessage(false);
      setErrorDialogOpen(true);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSettingsClick = (
    e: React.MouseEvent | React.PointerEvent | any,
    workspaceId: string,
    workspaceName: string
  ) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log("Opening settings for workspace:", workspaceId, workspaceName);
    setSettingsWorkspaceId(workspaceId);
    setSettingsWorkspaceName(workspaceName);
    setShowSettings(true);
  };

  const handleEditWorkspaceName = (
    e: React.MouseEvent,
    workspaceId: string,
    currentName: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingWorkspaceId(workspaceId);
    setEditingWorkspaceName(currentName);
  };

  const handleSaveWorkspaceName = async (workspaceId: string) => {
    if (!editingWorkspaceName.trim()) {
      setEditingWorkspaceId(null);
      return;
    }

    // Ensure we're using the database workspace ID, not the Clerk org ID
    // If workspaceId looks like a Clerk org ID (starts with org_ or is a UUID), try to find the database ID
    let finalWorkspaceId = workspaceId;
    if (workspaceId.startsWith("org_") || workspaceId.length > 20) {
      // This might be a Clerk org ID, try to find the database workspace ID
      const workspace = allOrganizations.find(
        (w) => w.clerkOrganizationId === workspaceId || w.id === workspaceId
      );
      if (workspace) {
        finalWorkspaceId = workspace.id;
      }
    }

    console.log("Saving workspace name:", {
      originalWorkspaceId: workspaceId,
      finalWorkspaceId,
      name: editingWorkspaceName.trim(),
      allOrganizations: allOrganizations.map((w) => ({
        id: w.id,
        clerkOrgId: w.clerkOrganizationId,
        name: w.name,
      })),
    });

    setSavingWorkspaceName(true);
    try {
      const response = await fetch(`/api/workspaces/${finalWorkspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingWorkspaceName.trim(),
        }),
      });

      if (response.ok) {
        // Refresh the organization list
        const workspacesRes = await fetch("/api/workspaces");
        if (workspacesRes.ok) {
          const workspacesData = await workspacesRes.json();
          if (workspacesData.workspaces) {
            setAllOrganizations(workspacesData.workspaces);
          }
        }
        setEditingWorkspaceId(null);
        router.refresh();
      } else {
        const error = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("Failed to update workspace name:", error);
        setErrorMessage(
          error.error ||
            "Failed to update workspace name. You may not have permission to edit this workspace."
        );
        setIsSuccessMessage(false);
        setErrorDialogOpen(true);
        setEditingWorkspaceName("");
      }
    } catch (error) {
      console.error("Error updating workspace name:", error);
      setErrorMessage("Failed to update workspace name. Please try again.");
      setIsSuccessMessage(false);
      setErrorDialogOpen(true);
    } finally {
      setSavingWorkspaceName(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingWorkspaceId(null);
    setEditingWorkspaceName("");
  };

  const handleWorkspaceChange = async (orgId: string) => {
    if (orgId === "none" || !orgId || orgId === "create") return;

    // Check if this is a temp workspace
    const workspace = allOrganizations.find(
      (w) => w.clerkOrganizationId === orgId || w.id === orgId
    );

    if (workspace && workspace.clerkOrganizationId?.startsWith("temp-")) {
      // For temp workspaces, we need to create the Clerk organization first
      // But we can't do that here without user interaction
      // Instead, show a message and try to create it
      setPendingActivateWorkspace(workspace);
      setShowActivateConfirm(true);
      return;
    }

    // For regular workspaces, just set active
    if (setActive) {
      try {
        await setActive({ organization: orgId });
        router.refresh();
      } catch (error) {
        console.error("Error setting active organization:", error);
        toast.error("Failed to switch workspace. Please try again.");
      }
    }
  };

  const confirmActivateWorkspace = async () => {
    if (!pendingActivateWorkspace) return;

    const workspace = pendingActivateWorkspace;
    setShowActivateConfirm(false);
    try {
      // Call an API endpoint to create the organization for this workspace
      const response = await fetch(
        `/api/workspaces/${workspace.id}/activate`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Refresh workspaces
        const workspacesRes = await fetch("/api/workspaces");
        if (workspacesRes.ok) {
          const workspacesData = await workspacesRes.json();
          if (workspacesData.workspaces) {
            setAllOrganizations(workspacesData.workspaces);
          }
        }
        // Now set it as active
        if (setActive) {
          await setActive({ organization: data.clerkOrganizationId });
          router.refresh();
        }
        toast.success("Workspace activated successfully");
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to activate workspace");
      }
    } catch (error) {
      console.error("Error activating workspace:", error);
      toast.error("Failed to activate workspace. Please try again.");
    } finally {
      setPendingActivateWorkspace(null);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
      </div>
    );
  }

  const currentOrgId = organization?.id || null;

  // Use userMemberships from Clerk, but also merge with API data if available
  const displayOrgs =
    userMemberships?.data?.map((m: any) => m.organization) || [];

  // Create a map of Clerk org IDs to Clerk org names for fallback
  const clerkOrgNameMap = new Map<string, string>();
  displayOrgs.forEach((org: any) => {
    if (org?.id && org?.name) {
      clerkOrgNameMap.set(org.id, org.name);
    }
  });

  // If we have API data, use it to ensure we have all orgs (including temp workspaces)
  // The API returns workspaces with clerkOrganizationId and name
  // We need to show all workspaces from the API, even if they're not in Clerk's list yet
  const orgsToShow =
    allOrganizations.length > 0
      ? allOrganizations.map((w) => {
          // Get the workspace name from database
          const dbName = w.name?.trim();
          // Get the Clerk organization name as fallback
          const clerkName = clerkOrgNameMap.get(w.clerkOrganizationId);
          // Use Clerk's name if database name is "Workspace" (default) or empty, otherwise use database name
          const workspaceName =
            dbName && dbName !== "Workspace"
              ? dbName
              : clerkName || dbName || "Workspace";

          return {
            organization: {
              id: w.clerkOrganizationId || w.id,
              name: workspaceName, // Prioritize database name, but fall back to Clerk name if it's the default
            },
            workspaceId: w.id, // Store the database workspace ID
            workspace: w, // Store the full workspace object
          };
        })
      : displayOrgs
          .filter((org) => org?.id)
          .map((org) => ({
            organization: {
              id: org.id,
              name: org.name || "Workspace",
            },
            workspaceId: null, // No database ID if not from API
            workspace: null,
          }));

  // Also ensure the current organization is in the list if it exists
  if (
    currentOrgId &&
    !orgsToShow.find((o) => o?.organization?.id === currentOrgId)
  ) {
    if (organization) {
      // Try to find the workspace in allOrganizations
      const currentWorkspace = allOrganizations.find(
        (w) => w.clerkOrganizationId === organization.id
      );
      orgsToShow.unshift({
        organization: {
          id: organization.id,
          name: currentWorkspace?.name || organization.name || "Workspace",
        },
        workspaceId: currentWorkspace?.id || null,
        workspace: currentWorkspace || null,
      });
    }
  }

  return (
    <>
      <Select
        value={currentOrgId || "none"}
        onValueChange={handleWorkspaceChange}
      >
        <SelectTrigger className="h-8 border-0 shadow-none bg-transparent hover:bg-gray-50 pl-2 pr-1 w-auto min-w-[120px] gap-1">
          <SelectValue
            placeholder="Select workspace"
            className="text-sm font-medium"
          >
            <span className="text-sm font-medium capitalize">
              {organization?.name || "No workspace"}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-white">
          {orgsToShow.length > 0 ? (
            <>
              {orgsToShow.map(
                ({ organization: org, workspaceId, workspace: ws }) => {
                  // The workspace should always be available since we're mapping from allOrganizations
                  // But if it's not (e.g., for current org added separately), try to find it
                  let workspace = ws;
                  if (!workspace) {
                    workspace = allOrganizations.find(
                      (w) => w.clerkOrganizationId === org.id || w.id === org.id
                    );
                  }

                  // Use the workspaceId from the mapped data, or find it from workspace
                  const finalWorkspaceId =
                    workspaceId || workspace?.id || org.id;
                  const isTempWorkspace =
                    workspace?.clerkOrganizationId?.startsWith("temp-");

                  // Use the name from org (which we already prioritized Clerk name over "Workspace")
                  // This ensures we show the correct name even if database has "Workspace" as default
                  const displayName =
                    org.name?.trim() || workspace?.name?.trim() || "Workspace";

                  const isEditing = editingWorkspaceId === finalWorkspaceId;

                  return (
                    <div key={org.id} className="relative group">
                      {isEditing ? (
                        <div
                          className="px-2 py-1.5 flex items-center gap-2"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editingWorkspaceName}
                            onChange={(e) =>
                              setEditingWorkspaceName(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSaveWorkspaceName(finalWorkspaceId);
                              } else if (e.key === "Escape") {
                                handleCancelEdit();
                              }
                            }}
                            className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-gray-500"
                            autoFocus
                            disabled={savingWorkspaceName}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveWorkspaceName(finalWorkspaceId);
                            }}
                            disabled={
                              savingWorkspaceName ||
                              !editingWorkspaceName.trim()
                            }
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Save"
                          >
                            {savingWorkspaceName ? (
                              <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                            ) : (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEdit();
                            }}
                            disabled={savingWorkspaceName}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Cancel"
                          >
                            <X className="h-4 w-4 text-gray-500" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <SelectItem
                            value={org.id}
                            className={`pr-16 ${
                              isTempWorkspace ? "opacity-75" : ""
                            }`}
                          >
                            <span className="flex-1">{displayName}</span>
                            {isTempWorkspace && (
                              <span className="text-xs text-orange-600 ml-2">
                                (Needs activation)
                              </span>
                            )}
                          </SelectItem>
                          <div
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEditWorkspaceName(
                                e,
                                finalWorkspaceId,
                                displayName
                              );
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-opacity z-20 cursor-pointer pointer-events-auto"
                            title="Edit workspace name"
                            role="button"
                            tabIndex={0}
                          >
                            <Edit2 className="h-3.5 w-3.5 text-gray-500" />
                          </div>
                          <div
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log(
                                "Settings clicked for workspaceId:",
                                finalWorkspaceId,
                                "displayName:",
                                displayName
                              );
                              // Immediately open settings
                              handleSettingsClick(
                                e as any,
                                finalWorkspaceId,
                                displayName
                              );
                              // Close the select dropdown after a brief delay
                              setTimeout(() => {
                                const selectTrigger = document.querySelector(
                                  '[data-state="open"]'
                                );
                                if (selectTrigger) {
                                  (selectTrigger as HTMLElement).click();
                                }
                              }, 50);
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-opacity z-20 cursor-pointer pointer-events-auto"
                            title="Manage workspace"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSettingsClick(
                                  e as any,
                                  finalWorkspaceId,
                                  displayName
                                );
                              }
                            }}
                          >
                            <Settings className="h-4 w-4 text-gray-500" />
                          </div>
                        </>
                      )}
                    </div>
                  );
                }
              )}
              <SelectSeparator />
              <div
                className="px-3 py-2.5 text-sm font-medium cursor-pointer hover:cursor-pointer border border-gray-300 bg-transparent hover:bg-gray-50 rounded-md flex items-center gap-2 text-gray-700 hover:text-gray-900 hover:border-gray-400 transition-colors mx-1 my-1 focus:outline-none"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Close the select first
                  const selectTrigger = document.querySelector(
                    '[data-state="open"]'
                  );
                  if (selectTrigger) {
                    (selectTrigger as HTMLElement).click();
                  }
                  // Then create workspace
                  setTimeout(() => {
                    handleCreateWorkspace(e);
                  }, 100);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <Plus className="h-4 w-4 text-gray-600" />
                <span>Create New Workspace</span>
              </div>
            </>
          ) : (
            <div
              className="px-3 py-2.5 text-sm font-medium cursor-pointer border border-gray-300 bg-transparent hover:bg-gray-50 rounded-md flex items-center gap-2 text-gray-700 hover:text-gray-900 hover:border-gray-400 transition-colors mx-1 my-1"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Close the select first
                const selectTrigger = document.querySelector(
                  '[data-state="open"]'
                );
                if (selectTrigger) {
                  (selectTrigger as HTMLElement).click();
                }
                // Then create workspace
                setTimeout(() => {
                  handleCreateWorkspace(e);
                }, 100);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <Plus className="h-4 w-4 text-gray-600" />
              <span>Create Your First Workspace</span>
            </div>
          )}
        </SelectContent>
      </Select>

      <WorkspaceSettingsDialog
        workspaceId={settingsWorkspaceId || ""}
        workspaceName={settingsWorkspaceName}
        open={showSettings && !!settingsWorkspaceId}
        onOpenChange={(open) => {
          setShowSettings(open);
          if (!open) {
            setSettingsWorkspaceId(null);
            setSettingsWorkspaceName("");
          }
        }}
      />

      <Dialog
        open={createWorkspaceDialogOpen}
        onOpenChange={(open) => {
          setCreateWorkspaceDialogOpen(open);
          if (!open) {
            setWorkspaceNameInput("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>
              Enter a name for your new workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                value={workspaceNameInput}
                onChange={(e) => setWorkspaceNameInput(e.target.value)}
                placeholder="My Workspace"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && workspaceNameInput.trim()) {
                    handleConfirmCreateWorkspace();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateWorkspaceDialogOpen(false);
                setWorkspaceNameInput("");
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmCreateWorkspace}
              disabled={isCreating || !workspaceNameInput.trim()}
              variant="default"
              className="bg-gray-900 text-white hover:bg-gray-800"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={errorDialogOpen}
        onOpenChange={(open) => {
          setErrorDialogOpen(open);
          if (!open) {
            setIsSuccessMessage(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {isSuccessMessage ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <Info className="h-5 w-5 text-gray-600" />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
              )}
              <DialogTitle>
                {isSuccessMessage
                  ? "Workspace Created"
                  : "Failed to create workspace"}
              </DialogTitle>
            </div>
            <DialogDescription className="pt-2 text-left">
              {errorMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setErrorDialogOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Workspace Confirmation Dialog */}
      <Dialog open={showActivateConfirm} onOpenChange={setShowActivateConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Workspace</DialogTitle>
            <DialogDescription>
              This workspace needs to be activated. Would you like to create the organization now? This will allow you to invite team members.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowActivateConfirm(false);
                setPendingActivateWorkspace(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmActivateWorkspace}
            >
              Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
