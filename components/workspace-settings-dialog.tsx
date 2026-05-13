"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserPlus, Trash2, Mail, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface WorkspaceMember {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  joinedAt: string;
  status?: "active" | "pending";
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  invitedAt: number;
  status: "pending";
}

interface WorkspaceSettingsDialogProps {
  workspaceId: string;
  workspaceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkspaceSettingsDialog({
  workspaceId,
  workspaceName,
  open,
  onOpenChange,
}: WorkspaceSettingsDialogProps) {
  const { user } = useUser();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<
    PendingInvitation[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviting, setInviting] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [workspaceNameValue, setWorkspaceNameValue] = useState(workspaceName);
  const [savingName, setSavingName] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [pendingRemoveUserId, setPendingRemoveUserId] = useState<string | null>(null);

  useEffect(() => {
    if (open && workspaceId) {
      loadMembers();
      setWorkspaceNameValue(workspaceName);
      setEditingName(false);
    }
  }, [open, workspaceId, workspaceName]);

  const loadMembers = async () => {
    if (!workspaceId) {
      console.error("No workspaceId provided");
      return;
    }

    setLoading(true);
    try {
      console.log("Loading members for workspace:", workspaceId);
      // First get the current user's database ID
      const userRes = await fetch("/api/sync-user", { method: "POST" });
      let dbUserId: string | null = null;
      if (userRes.ok) {
        const userData = await userRes.json();
        dbUserId = userData.user?.id || null;
        setCurrentUserId(dbUserId);
      }

      const response = await fetch(`/api/workspaces/${workspaceId}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
        setPendingInvitations(data.pendingInvitations || []);

        // Find current user's role by matching database user ID or email
        const userEmail = user?.emailAddresses?.[0]?.emailAddress || "";
        const currentMember = data.members?.find(
          (m: WorkspaceMember) =>
            m.userId === dbUserId ||
            m.email.toLowerCase() === userEmail.toLowerCase()
        );

        console.log("Current user role check:", {
          dbUserId,
          userEmail,
          currentMember,
          role: currentMember?.role,
          members: data.members,
          clerkUserId: user?.id,
        });

        // If user is the only member, they should be owner/admin
        // Or if we can't find them but they're accessing the workspace, give them admin rights
        let userRole = currentMember?.role || "";
        if (!userRole && data.members?.length === 1) {
          userRole = "owner";
          console.log("User is only member, setting role to owner");
        } else if (!userRole && data.members?.length > 0) {
          // If user is not in members list but can access, they might be the creator
          // For now, if they can access the workspace settings, give them admin rights
          userRole = "admin"; // Default to admin if we can't determine
          console.log(
            "User role not found in members list, defaulting to admin"
          );
        } else if (!userRole) {
          // No members at all - user must be the creator
          userRole = "owner";
          console.log("No members found, setting role to owner");
        }

        setCurrentUserRole(userRole);
      } else {
        const errorData = await response.json();
        console.error("Error loading members:", errorData);
        toast.error(errorData.error || "Failed to load members");
      }
    } catch (error) {
      console.error("Error loading members:", error);
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    setInviting(true);
    try {
      console.log("Inviting to workspace:", workspaceId);
      const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const responseData = await response.json();

      if (response.ok) {
        setInviteEmail("");
        setInviteRole("member");
        await loadMembers();
        toast.success("Invitation sent successfully");
      } else {
        console.error("Invite error:", responseData);
        toast.error(responseData.error || "Failed to invite user");
      }
    } catch (error) {
      console.error("Error inviting user:", error);
      toast.error("Failed to invite user");
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (memberUserId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberUserId,
          role: newRole,
        }),
      });

      if (response.ok) {
        await loadMembers();
        toast.success("Role updated successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update role");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    setPendingRemoveUserId(memberUserId);
    setShowRemoveConfirm(true);
  };

  const confirmRemoveMember = async () => {
    if (!pendingRemoveUserId) return;

    const memberUserId = pendingRemoveUserId;
    setShowRemoveConfirm(false);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/members?userId=${memberUserId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        await loadMembers();
        toast.success("Member removed successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to remove member");
      }
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    } finally {
      setPendingRemoveUserId(null);
    }
  };

  const handleSaveWorkspaceName = async () => {
    if (
      !workspaceNameValue.trim() ||
      workspaceNameValue.trim() === workspaceName
    ) {
      setEditingName(false);
      return;
    }

    setSavingName(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workspaceNameValue.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setEditingName(false);
        // Update the workspace name in the parent component by calling onOpenChange
        // The parent should refresh the workspace list
        window.location.reload(); // Simple refresh to update the workspace name everywhere
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update workspace name");
        setWorkspaceNameValue(workspaceName); // Revert on error
      }
    } catch (error) {
      console.error("Error updating workspace name:", error);
      toast.error("Failed to update workspace name");
      setWorkspaceNameValue(workspaceName); // Revert on error
    } finally {
      setSavingName(false);
    }
  };

  // Allow management if user is owner/admin, or if they're the only member (must be owner)
  // Also check by email as fallback
  const userEmail = user?.emailAddresses?.[0]?.emailAddress || "";
  const isOnlyMember =
    members.length === 1 &&
    (members[0]?.userId === currentUserId ||
      members[0]?.email.toLowerCase() === userEmail.toLowerCase());

  // Show invite section if:
  // 1. User is owner/admin
  // 2. User is the only member (must be owner)
  // 3. User can access this dialog (API will enforce permissions)
  // The API will enforce actual permissions, so we can be permissive here
  const canManage =
    currentUserRole === "owner" ||
    currentUserRole === "admin" ||
    isOnlyMember ||
    members.length <= 1; // If only one member, they should be able to invite

  console.log("Can manage check:", {
    currentUserRole,
    canManage,
    membersCount: members.length,
    isOnlyMember,
    currentUserId,
    firstMemberUserId: members[0]?.userId,
    firstMemberEmail: members[0]?.email,
    userEmail,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {editingName ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={workspaceNameValue}
                  onChange={(e) => setWorkspaceNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveWorkspaceName();
                    } else if (e.key === "Escape") {
                      setWorkspaceNameValue(workspaceName);
                      setEditingName(false);
                    }
                  }}
                  className="flex-1"
                  autoFocus
                  disabled={savingName}
                />
                <Button
                  size="sm"
                  onClick={handleSaveWorkspaceName}
                  disabled={savingName || !workspaceNameValue.trim()}
                >
                  {savingName ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setWorkspaceNameValue(workspaceName);
                    setEditingName(false);
                  }}
                  disabled={savingName}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <DialogTitle className="flex-1">
                  Manage {workspaceName}
                </DialogTitle>
                {canManage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingName(true)}
                    className="h-8 w-8 p-0"
                    title="Edit workspace name"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
          <DialogDescription>
            Invite team members and manage their roles
          </DialogDescription>
        </DialogHeader>

        {canManage && (
          <div className="space-y-4 border-b pb-4">
            <div className="space-y-2">
              <Label>Invite by Email</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleInvite();
                    }
                  }}
                />
                <Select
                  value={inviteRole}
                  onValueChange={(value) =>
                    setInviteRole(value as "member" | "admin")
                  }
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleInvite} disabled={inviting}>
                  {inviting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-1" />
                      Invite
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Pending Invitations */}
          {pendingInvitations.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-600">
                Pending Invitations
              </Label>
              <div className="space-y-2">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <Mail className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {invitation.email}
                        </p>
                        <p className="text-xs text-gray-500">Invitation sent</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 capitalize px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                        {invitation.role} • Pending
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Members */}
          <div className="space-y-2">
            <Label>Team Members</Label>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            ) : members.length === 0 && pendingInvitations.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No members yet</p>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <Mail className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {member.firstName && member.lastName
                            ? `${member.firstName} ${member.lastName}`
                            : member.email}
                        </p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canManage && member.userId !== user?.id ? (
                        <>
                          <Select
                            value={member.role}
                            onValueChange={(value) =>
                              handleUpdateRole(member.userId, value)
                            }
                          >
                            <SelectTrigger className="w-[100px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              <SelectItem value="viewer">Viewer</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="owner">Owner</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member.userId)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-500 capitalize">
                          {member.role}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Remove Member Confirmation Dialog */}
      <Dialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this member? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRemoveConfirm(false);
                setPendingRemoveUserId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRemoveMember}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
