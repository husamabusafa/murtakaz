"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Search, X, CheckCircle2, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { getAllEntitiesWithAssignments, getAllAssignableUsersForAdmin, getSubordinatesWithAssignments, bulkAssignEntities, bulkUnassignEntities } from "@/actions/admin-assignments";

type EntityWithAssignments = {
  id: string;
  title: string;
  titleAr: string | null;
  key: string | null;
  periodType: string | null;
  orgEntityType: {
    code: string;
    name: string;
    nameAr: string | null;
  };
  assignments: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      title: string | null;
    };
  }>;
};

type AssignableUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string | null;
  entityAssignments: Array<{ entityId: string }>;
};

export default function ResponsibilitiesPage() {
  const { user, loading: sessionLoading } = useAuth();
  const { t, tr, locale, df } = useLocale();

  const userRole = (user as { role?: string })?.role;
  const canAdmin = userRole === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [entities, setEntities] = useState<EntityWithAssignments[]>([]);
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<EntityWithAssignments | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  const [entityAssignDialogOpen, setEntityAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AssignableUser | null>(null);
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);

  const [viewMode, setViewMode] = useState<"entities" | "users">("entities");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (canAdmin) {
        // Admin: Load all entities and users
        const [entitiesRes, usersRes] = await Promise.all([
          getAllEntitiesWithAssignments(),
          getAllAssignableUsersForAdmin(),
        ]);

        if (entitiesRes.success) {
          setEntities(entitiesRes.entities as EntityWithAssignments[]);
        } else {
          setError(entitiesRes.error);
        }

        if (usersRes.success) {
          setUsers(usersRes.users as AssignableUser[]);
        }
      } else {
        // Manager/Executive: Load subordinates and their entities
        const res = await getSubordinatesWithAssignments();
        
        if (res.success) {
          setEntities(res.entities as EntityWithAssignments[]);
          setUsers(res.users as AssignableUser[]);
        } else {
          setError(res.error);
        }
      }
    } catch {
      setError("failedToLoad");
    } finally {
      setLoading(false);
    }
  }, [canAdmin]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) return;
    void loadData();
  }, [sessionLoading, user, loadData]);

  const entityTypes = useMemo(() => {
    const types = new Set<string>();
    entities.forEach((e) => types.add(e.orgEntityType.code));
    return Array.from(types).sort();
  }, [entities]);

  const filteredEntities = useMemo(() => {
    let filtered = entities;

    if (selectedType !== "all") {
      filtered = filtered.filter((e) => e.orgEntityType.code === selectedType);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.titleAr?.toLowerCase().includes(query) ||
          e.key?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [entities, selectedType, searchQuery]);

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

  function openAssignDialog(entity: EntityWithAssignments) {
    setSelectedEntity(entity);
    setSelectedUserIds([]);
    setAssignDialogOpen(true);
  }

  function openEntityAssignDialog(user: AssignableUser) {
    setSelectedUser(user);
    setSelectedEntityIds([]);
    setEntityAssignDialogOpen(true);
  }

  async function handleAssign() {
    if (!selectedEntity || selectedUserIds.length === 0) return;

    setAssigning(true);
    try {
      const assignments = selectedUserIds.map((userId) => ({
        entityId: selectedEntity.id,
        userId,
      }));

      const res = await bulkAssignEntities({ assignments });
      if (res.success) {
        setAssignDialogOpen(false);
        await loadData();
      } else {
        setError(res.error);
      }
    } catch {
      setError("failedToAssign");
    } finally {
      setAssigning(false);
    }
  }

  async function handleEntityAssign() {
    if (!selectedUser || selectedEntityIds.length === 0) return;

    setAssigning(true);
    try {
      const assignments = selectedEntityIds.map((entityId) => ({
        entityId,
        userId: selectedUser.id,
      }));

      const res = await bulkAssignEntities({ assignments });
      if (res.success) {
        setEntityAssignDialogOpen(false);
        await loadData();
      } else {
        setError(res.error);
      }
    } catch {
      setError("failedToAssign");
    } finally {
      setAssigning(false);
    }
  }

  async function handleUnassign(assignmentId: string) {
    try {
      const res = await bulkUnassignEntities({ assignmentIds: [assignmentId] });
      if (res.success) {
        await loadData();
      }
    } catch {
      // Silently fail
    }
  }

  const userAssignmentMap = useMemo(() => {
    const map = new Map<string, EntityWithAssignments[]>();
    users.forEach((user) => {
      const userEntities = entities.filter((e) =>
        e.assignments.some((a) => a.user.id === user.id)
      );
      map.set(user.id, userEntities);
    });
    return map;
  }, [users, entities]);

  if (sessionLoading || loading) {
    return (
      <div className="space-y-6">
        <PageHeader title={tr("Responsibilities", "المسؤوليات")} subtitle={tr("Manage entity assignments", "إدارة تعيينات الكيانات")} />
        <Card>
          <CardContent className="p-8">
            <div className="text-sm text-muted-foreground">{t("loading")}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show message if no subordinates and not admin
  if (!canAdmin && users.length === 0 && !loading) {
    return (
      <div className="space-y-6">
        <PageHeader title={tr("Responsibilities", "المسؤوليات")} subtitle={tr("View your team's assignments", "عرض تعيينات فريقك")} />
        <Card>
          <CardContent className="p-8">
            <div className="text-sm text-muted-foreground">{tr("No subordinates found. You can view entities assigned to your team members here.", "لم يتم العثور على مرؤوسين. يمكنك عرض الكيانات المخصصة لأعضاء فريقك هنا.")}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={tr("Responsibilities", "المسؤوليات")}
        subtitle={canAdmin ? tr("Assign entities to executives and managers", "تعيين الكيانات للتنفيذيين والمديرين") : tr("View your team's assignments", "عرض تعيينات فريقك")}
      />

      {error ? (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardContent className="p-4">
            <div className="text-sm text-destructive">{error}</div>
          </CardContent>
        </Card>
      ) : null}

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "entities" | "users")}>
        <TabsList>
          <TabsTrigger value="entities">{tr("By Entity", "حسب الكيان")}</TabsTrigger>
          <TabsTrigger value="users">{tr("By User", "حسب المستخدم")}</TabsTrigger>
        </TabsList>

        <TabsContent value="entities" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>{tr("Entity Assignments", "تعيينات الكيان")}</CardTitle>
                  <CardDescription>
                    {tr("Assign users to entities they can manage", "تعيين المستخدمين للكيانات التي يمكنهم إدارتها")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={tr("Search entities...", "بحث الكيانات...")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">{tr("All Types", "جميع الأنواع")}</option>
                    {entityTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  {filteredEntities.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      {tr("No entities found", "لم يتم العثور على كيانات")}
                    </div>
                  ) : (
                    filteredEntities.map((entity) => (
                      <Card key={entity.id} className="bg-card/50">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-base">
                                  <Link
                                    href={`/${locale}/entities/${entity.orgEntityType.code}/${entity.id}`}
                                    className="hover:text-primary transition-colors"
                                  >
                                    {df(entity.title, entity.titleAr)}
                                  </Link>
                                </CardTitle>
                                {entity.periodType ? (
                                  <Badge variant="outline" className="text-xs">
                                    KPI
                                  </Badge>
                                ) : null}
                              </div>
                              <CardDescription>
                                {df(entity.orgEntityType.name, entity.orgEntityType.nameAr)}
                                {entity.key ? ` • ${entity.key}` : ""}
                              </CardDescription>
                            </div>
                            {canAdmin && (
                              <Button size="sm" onClick={() => openAssignDialog(entity)}>
                                <UserPlus className="h-4 w-4 me-2" />
                                {tr("Assign", "تعيين")}
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        {entity.assignments.length > 0 ? (
                          <CardContent>
                            <div className="flex flex-wrap gap-2">
                              {entity.assignments.map((assignment) => (
                                <div
                                  key={assignment.id}
                                  className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold">
                                      {assignment.user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium">{assignment.user.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {getRoleLabel(String(assignment.user.role))}
                                      </div>
                                    </div>
                                  </div>
                                  {canAdmin && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 text-destructive hover:text-destructive"
                                      onClick={() => void handleUnassign(assignment.id)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        ) : (
                          <CardContent>
                            <div className="text-xs text-muted-foreground">
                              {tr("No users assigned", "لا يوجد مستخدمون معينون")}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{tr("User Assignments", "تعيينات المستخدم")}</CardTitle>
              <CardDescription>
                {tr("View and manage assignments by user", "عرض وإدارة التعيينات حسب المستخدم")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    {tr("No users available", "لا يوجد مستخدمون متاحون")}
                  </div>
                ) : (
                  users.map((user) => {
                    const userEntities = userAssignmentMap.get(user.id) || [];
                    return (
                      <Card key={user.id} className="bg-card/50">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold">{user.name}</div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                                <Badge variant="outline" className={`text-xs mt-1 ${getRoleBadgeColor(String(user.role))}`}>
                                  {getRoleLabel(String(user.role))}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-sm text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 inline me-1" />
                                {userEntities.length} {tr("assigned", "معين")}
                              </div>
                              {canAdmin && (
                                <Button size="sm" onClick={() => openEntityAssignDialog(user)}>
                                  <UserPlus className="h-4 w-4 me-2" />
                                  {tr("Assign Entities", "تعيين كيانات")}
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        {userEntities.length > 0 ? (
                          <CardContent>
                            <div className="space-y-2">
                              {userEntities.map((entity) => (
                                <Link
                                  key={entity.id}
                                  href={`/${locale}/entities/${entity.orgEntityType.code}/${entity.id}`}
                                  className="block rounded-lg border border-border bg-background/50 px-3 py-2 text-sm hover:bg-accent transition-colors"
                                >
                                  <div className="font-medium">{df(entity.title, entity.titleAr)}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {df(entity.orgEntityType.name, entity.orgEntityType.nameAr)}
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </CardContent>
                        ) : null}
                      </Card>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{tr("Assign Users", "تعيين مستخدمين")}</DialogTitle>
            <DialogDescription>
              {selectedEntity ? `${tr("Assign to", "تعيين إلى")} "${df(selectedEntity.title, selectedEntity.titleAr)}"` : ""}
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const availableUsers = users.filter((u) => !selectedEntity?.assignments.some((a) => a.user.id === u.id));
            const allSelected = availableUsers.length > 0 && availableUsers.every((u) => selectedUserIds.includes(u.id));
            
            return (
              <>
                {availableUsers.length > 0 && (
                  <div className="flex items-center justify-between pb-3 border-b">
                    <span className="text-sm text-muted-foreground">
                      {selectedUserIds.length} {tr("selected", "محدد")}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (allSelected) {
                          setSelectedUserIds([]);
                        } else {
                          setSelectedUserIds(availableUsers.map((u) => u.id));
                        }
                      }}
                    >
                      {allSelected ? tr("Deselect All", "إلغاء تحديد الكل") : tr("Select All", "تحديد الكل")}
                    </Button>
                  </div>
                )}

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableUsers.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      {tr("All users are already assigned", "جميع المستخدمين معينون بالفعل")}
                    </div>
                  ) : (
                    availableUsers.map((user) => (
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
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                        <Badge variant="outline" className={`text-xs ${getRoleBadgeColor(String(user.role))}`}>
                          {getRoleLabel(String(user.role))}
                        </Badge>
                      </label>
                    ))
                  )}
                </div>
              </>
            );
          })()}

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

      <Dialog open={entityAssignDialogOpen} onOpenChange={setEntityAssignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{tr("Assign Entities", "تعيين كيانات")}</DialogTitle>
            <DialogDescription>
              {selectedUser ? `${tr("Assign to", "تعيين إلى")} ${selectedUser.name}` : ""}
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const assignedEntityIds = new Set(
              entities
                .filter((e) => e.assignments.some((a) => a.user.id === selectedUser?.id))
                .map((e) => e.id)
            );
            const availableEntities = entities.filter((e) => !assignedEntityIds.has(e.id));
            const allSelected = availableEntities.length > 0 && availableEntities.every((e) => selectedEntityIds.includes(e.id));
            
            return (
              <>
                {availableEntities.length > 0 && (
                  <div className="flex items-center justify-between pb-3 border-b">
                    <span className="text-sm text-muted-foreground">
                      {selectedEntityIds.length} {tr("selected", "محدد")}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (allSelected) {
                          setSelectedEntityIds([]);
                        } else {
                          setSelectedEntityIds(availableEntities.map((e) => e.id));
                        }
                      }}
                    >
                      {allSelected ? tr("Deselect All", "إلغاء تحديد الكل") : tr("Select All", "تحديد الكل")}
                    </Button>
                  </div>
                )}

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableEntities.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      {tr("All entities are already assigned", "جميع الكيانات معينة بالفعل")}
                    </div>
                  ) : (
                    availableEntities.map((entity) => (
                      <label
                        key={entity.id}
                        className="flex items-center gap-3 rounded-lg border border-border bg-muted/10 px-4 py-3 cursor-pointer hover:bg-accent transition-colors"
                      >
                        <Checkbox
                          checked={selectedEntityIds.includes(entity.id)}
                          onCheckedChange={(checked: boolean) => {
                            if (checked) {
                              setSelectedEntityIds((prev) => [...prev, entity.id]);
                            } else {
                              setSelectedEntityIds((prev) => prev.filter((id) => id !== entity.id));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{df(entity.title, entity.titleAr)}</div>
                          <div className="text-xs text-muted-foreground">
                            {df(entity.orgEntityType.name, entity.orgEntityType.nameAr)}
                            {entity.key ? ` • ${entity.key}` : ""}
                          </div>
                        </div>
                        {entity.periodType ? (
                          <Badge variant="outline" className="text-xs">
                            KPI
                          </Badge>
                        ) : null}
                      </label>
                    ))
                  )}
                </div>
              </>
            );
          })()}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEntityAssignDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" onClick={() => void handleEntityAssign()} disabled={assigning || selectedEntityIds.length === 0}>
              {assigning ? t("saving") : tr("Assign Selected", "تعيين المحددين")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
