"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocale } from "@/providers/locale-provider";
import {
  getEntityAssignments,
  assignEntityToUsers,
  unassignEntityFromUsers,
  getUserAssignableUsers,
} from "@/actions/assignments";

type Assignment = {
  userId: string;
  userName: string;
  userRole: string;
};

type AssignableUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string | null;
};

export function EntityAssignments({ entityId, entityTitle }: { entityId: string; entityTitle: string }) {
  const { t, tr } = useLocale();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<AssignableUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const [unassigning, setUnassigning] = useState<string | null>(null);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getEntityAssignments({ entityId });
      if (result.success) {
        setAssignments(
          result.assignments.map((a) => ({
            userId: a.user.id,
            userName: a.user.name,
            userRole: String(a.user.role),
          }))
        );
      } else {
        setError(result.error);
      }
    } catch {
      setError("failedToLoad");
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  async function loadAvailableUsers() {
    try {
      const result = await getUserAssignableUsers();
      if (result.success) {
        setAvailableUsers(result.users as AssignableUser[]);
      }
    } catch {
      // Silently fail - dialog will show empty state
    }
  }

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  async function handleAssign() {
    if (selectedUserIds.length === 0) return;

    setAssigning(true);
    setAssignError(null);
    try {
      const result = await assignEntityToUsers({ entityId, userIds: selectedUserIds });
      if (result.success) {
        setAssignDialogOpen(false);
        setSelectedUserIds([]);
        await loadAssignments();
      } else {
        setAssignError(result.error);
      }
    } catch {
      setAssignError("failedToAssign");
    } finally {
      setAssigning(false);
    }
  }

  async function handleUnassign(userId: string) {
    setUnassigning(userId);
    try {
      const result = await unassignEntityFromUsers({ entityId, userIds: [userId] });
      if (result.success) {
        await loadAssignments();
      }
    } catch {
      // Silently fail - user will retry if needed
    } finally {
      setUnassigning(null);
    }
  }

  function openAssignDialog() {
    void loadAvailableUsers();
    setAssignDialogOpen(true);
    setAssignError(null);
    setSelectedUserIds([]);
  }

  const assignedUserIds = new Set(assignments.map((a) => a.userId));
  const unassignedUsers = availableUsers.filter((u) => !assignedUserIds.has(u.id));

  const getRoleBadgeColor = (role: string) => {
    if (role === "EXECUTIVE") return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    if (role === "MANAGER") return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    return "bg-gray-500/10 text-gray-500 border-gray-500/20";
  };

  const getRoleLabel = (role: string) => {
    if (role === "EXECUTIVE") return tr("Executive", "تنفيذي");
    if (role === "MANAGER") return tr("Manager", "مدير");
    return role;
  };

  return (
    <>
      <Card className="bg-card/70 backdrop-blur shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                {tr("Assignments", "التعيينات")}
              </CardTitle>
              <CardDescription>
                {tr("Users who can edit this entity", "المستخدمون الذين يمكنهم تعديل هذا العنصر")}
              </CardDescription>
            </div>
            <Button size="sm" onClick={openAssignDialog}>
              <Plus className="h-4 w-4 me-2" />
              {tr("Assign", "تعيين")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">{t("loading")}</div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {tr("No assignments yet. Click 'Assign' to add users.", "لا توجد تعيينات بعد. انقر على 'تعيين' لإضافة مستخدمين.")}
            </div>
          ) : (
            <div className="space-y-2">
              {assignments.map((assignment) => (
                <div
                  key={assignment.userId}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {assignment.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{assignment.userName}</div>
                      <Badge variant="outline" className={`text-xs ${getRoleBadgeColor(assignment.userRole)}`}>
                        {getRoleLabel(assignment.userRole)}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => void handleUnassign(assignment.userId)}
                    disabled={unassigning === assignment.userId}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="border-border bg-card text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle>{tr("Assign Users", "تعيين مستخدمين")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {tr("Select users to assign to", "حدد المستخدمين للتعيين إلى")} &ldquo;{entityTitle}&rdquo;
            </DialogDescription>
          </DialogHeader>

          {assignError ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {assignError}
            </div>
          ) : null}

          {unassignedUsers.length > 0 && (
            <div className="flex items-center justify-between pb-3 border-b">
              <span className="text-sm text-muted-foreground">
                {selectedUserIds.length} {tr("selected", "محدد")}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const allSelected = unassignedUsers.every((u) => selectedUserIds.includes(u.id));
                  if (allSelected) {
                    setSelectedUserIds([]);
                  } else {
                    setSelectedUserIds(unassignedUsers.map((u) => u.id));
                  }
                }}
              >
                {unassignedUsers.every((u) => selectedUserIds.includes(u.id))
                  ? tr("Deselect All", "إلغاء تحديد الكل")
                  : tr("Select All", "تحديد الكل")}
              </Button>
            </div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {unassignedUsers.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {tr("All users are already assigned", "جميع المستخدمين معينون بالفعل")}
              </div>
            ) : (
              unassignedUsers.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-muted/10 px-4 py-3 cursor-pointer hover:bg-accent transition-colors"
                >
                  <Checkbox
                    checked={selectedUserIds.includes(user.id)}
                    onCheckedChange={(checked: boolean) => {
                      if (checked) {
                        setSelectedUserIds((prev) => [...prev, user.id]);
                      } else {
                        setSelectedUserIds((prev) => prev.filter((id) => id !== user.id));
                      }
                    }}
                  />
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                    {user.title ? <div className="text-xs text-muted-foreground">{user.title}</div> : null}
                  </div>
                  <Badge variant="outline" className={`text-xs ${getRoleBadgeColor(String(user.role))}`}>
                    {getRoleLabel(String(user.role))}
                  </Badge>
                </label>
              ))
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setAssignDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" onClick={() => void handleAssign()} disabled={assigning || selectedUserIds.length === 0}>
              {assigning ? t("saving") : tr("Assign Selected", "تعيين المحددين")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
