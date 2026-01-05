"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import {
  createOrgAdminUser,
  deleteOrgAdminUser,
  getOrgAdminDepartments,
  getOrgAdminManagerOptions,
  getOrgAdminUsers,
  updateOrgAdminUser,
} from "@/actions/org-admin";
import type { Role } from "@prisma/client";

type UserRow = Awaited<ReturnType<typeof getOrgAdminUsers>>[number];
type DepartmentOption = Awaited<ReturnType<typeof getOrgAdminDepartments>>[number];
type ManagerOption = Awaited<ReturnType<typeof getOrgAdminManagerOptions>>[number];

const roles: Role[] = ["ADMIN", "EXECUTIVE", "PMO", "MANAGER", "EMPLOYEE"] as Role[];

function roleRank(role: Role) {
  if (role === "ADMIN") return 4;
  if (role === "EXECUTIVE") return 3;
  if (role === "PMO") return 2;
  if (role === "MANAGER") return 1;
  return 0;
}

function formatIssues(issues: unknown): string | null {
  if (!Array.isArray(issues) || issues.length === 0) return null;
  const lines = issues
    .map((i) => {
      if (!i || typeof i !== "object") return null;
      const issue = i as { path?: unknown; message?: unknown };
      const message = typeof issue.message === "string" ? issue.message : null;
      if (!message) return null;
      const path = Array.isArray(issue.path) ? issue.path.filter((p) => typeof p === "string" || typeof p === "number") : [];
      const prefix = path.length ? `${path.join(".")}: ` : "";
      return `${prefix}${message}`;
    })
    .filter((l): l is string => Boolean(l));

  return lines.length ? lines.join("\n") : null;
}

export default function UsersPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useAuth();
  const { locale, tr } = useLocale();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (user as any)?.role as string | undefined;

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [managers, setManagers] = useState<ManagerOption[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE" as Role,
    managerId: "",
    departmentId: "",
  });

  const [editUser, setEditUser] = useState({
    userId: "",
    name: "",
    email: "",
    role: "EMPLOYEE" as Role,
    managerId: "",
    departmentId: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, deptData, managerData] = await Promise.all([
        getOrgAdminUsers(),
        getOrgAdminDepartments(),
        getOrgAdminManagerOptions(),
      ]);
      setUsers(usersData);
      setDepartments(deptData);
      setManagers(managerData);
    } catch (error) {
      console.error("Failed to load users data", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) return;
    if (userRole !== "ADMIN") return;
    void loadData();
  }, [loadData, sessionLoading, user, userRole]);

  const managerLabel = useCallback((m: ManagerOption) => `${m.name} (${m.role})`, []);

  const createManagerOptions = useMemo(() => {
    const targetRank = roleRank(newUser.role);
    if (newUser.role === "ADMIN") return [];
    return managers.filter((m) => roleRank(m.role) >= targetRank);
  }, [managers, newUser.role]);

  const editManagerOptions = useMemo(() => {
    const targetRank = roleRank(editUser.role);
    if (editUser.role === "ADMIN") return [];
    return managers.filter((m) => m.id !== editUser.userId && roleRank(m.role) >= targetRank);
  }, [editUser.role, editUser.userId, managers]);

  const userById = useMemo(() => {
    const map = new Map<string, UserRow>();
    users.forEach((u) => map.set(u.id, u));
    return map;
  }, [users]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setCreateError(null);
    try {
      const result = await createOrgAdminUser({
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        managerId: newUser.managerId ? newUser.managerId : null,
        departmentId: newUser.departmentId ? newUser.departmentId : null,
      });

      if (!result.success) {
        const issuesText = formatIssues((result as unknown as { issues?: unknown }).issues);
        setCreateError(issuesText || result.error || tr("Failed to create user", "فشل إنشاء المستخدم"));
        return;
      }

      setCreateOpen(false);
      setNewUser({ name: "", email: "", password: "", role: "EMPLOYEE", managerId: "", departmentId: "" });
      await loadData();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tr("Failed to create user", "فشل إنشاء المستخدم");
      setCreateError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setEditError(null);
    try {
      const result = await updateOrgAdminUser({
        userId: editUser.userId,
        name: editUser.name,
        email: editUser.email,
        role: editUser.role,
        managerId: editUser.managerId ? editUser.managerId : null,
        departmentId: editUser.departmentId ? editUser.departmentId : null,
      });

      if (!result.success) {
        const issuesText = formatIssues((result as unknown as { issues?: unknown }).issues);
        setEditError(issuesText || result.error || tr("Failed to update user", "فشل تحديث المستخدم"));
        return;
      }

      setEditOpen(false);
      setSelectedUser(null);
      await loadData();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tr("Failed to update user", "فشل تحديث المستخدم");
      setEditError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!selectedUser) return;
    setSubmitting(true);
    setDeleteError(null);
    try {
      const result = await deleteOrgAdminUser({ userId: selectedUser.id });
      if (!result.success) {
        const issuesText = formatIssues((result as unknown as { issues?: unknown }).issues);
        setDeleteError(issuesText || result.error || tr("Failed to delete user", "فشل حذف المستخدم"));
        return;
      }

      setDeleteOpen(false);
      setSelectedUser(null);
      await loadData();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tr("Failed to delete user", "فشل حذف المستخدم");
      setDeleteError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (sessionLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{tr("Loading…", "جارٍ التحميل…")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{tr("No active session.", "لا توجد جلسة نشطة.")}</p>
        <Link href={`/${locale}/auth/login`} className="mt-3 inline-flex text-sm font-semibold text-primary hover:opacity-90">
          {tr("Go to sign in", "الذهاب لتسجيل الدخول")}
        </Link>
      </div>
    );
  }

  if (userRole !== "ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{tr("Unauthorized.", "غير مصرح.")}</p>
        <Link href={`/${locale}/overview`} className="mt-3 inline-flex text-sm font-semibold text-primary hover:opacity-90">
          {tr("Back", "رجوع")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <PageHeader title={tr("Users", "المستخدمون")} subtitle={tr("Manage users in your organization.", "إدارة مستخدمي مؤسستك.")} />

        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (open) setCreateError(null);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {tr("New User", "مستخدم جديد")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card text-foreground">
            <DialogHeader>
              <DialogTitle>{tr("Create User", "إنشاء مستخدم")}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {tr("Add a new user to your organization.", "إضافة مستخدم جديد إلى مؤسستك.")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              {createError ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {createError}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="name">{tr("Full Name", "الاسم الكامل")}</Label>
                <Input id="name" value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} required className="bg-card" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{tr("Email", "البريد الإلكتروني")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                  required
                  className="bg-card"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{tr("Password", "كلمة المرور")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                  required
                  minLength={6}
                  className="bg-card"
                />
              </div>

              <div className="space-y-2">
                <Label>{tr("Role", "الدور")}</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(val) => {
                    const nextRole = val as Role;
                    setNewUser((p) => {
                      const nextRank = roleRank(nextRole);
                      const currentManager = managers.find((m) => m.id === p.managerId);
                      const managerOk = nextRole !== "ADMIN" && currentManager && roleRank(currentManager.role) >= nextRank;
                      return { ...p, role: nextRole, managerId: managerOk ? p.managerId : "" };
                    });
                  }}
                >
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder={tr("Select Role", "اختر الدور")} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{tr("Manager", "المدير")}</Label>
                <Select
                  value={newUser.managerId || "__none__"}
                  onValueChange={(val) => setNewUser((p) => ({ ...p, managerId: val === "__none__" ? "" : val }))}
                  disabled={newUser.role === "ADMIN"}
                >
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder={tr("Select Manager", "اختر المدير")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{tr("No manager", "بدون مدير")}</SelectItem>
                    {createManagerOptions.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {managerLabel(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{tr("Department", "الإدارة")}</Label>
                <Select
                  value={newUser.departmentId || "__none__"}
                  onValueChange={(val) => setNewUser((p) => ({ ...p, departmentId: val === "__none__" ? "" : val }))}
                >
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder={tr("Select Department", "اختر الإدارة")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{tr("No department", "بدون إدارة")}</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                  {tr("Cancel", "إلغاء")}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? tr("Creating...", "جارٍ الإنشاء...") : tr("Create", "إنشاء")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card/70 backdrop-blur shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{tr("User Directory", "دليل المستخدمين")}</CardTitle>
          <CardDescription>{tr("Create, update, and remove users.", "إنشاء وتحديث وحذف المستخدمين.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tr("User", "المستخدم")}</TableHead>
                  <TableHead>{tr("Role", "الدور")}</TableHead>
                  <TableHead>{tr("Manager", "المدير")}</TableHead>
                  <TableHead>{tr("Department", "الإدارة")}</TableHead>
                  <TableHead className="text-right">{tr("Actions", "الإجراءات")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      {tr("Loading...", "جارٍ التحميل...")}
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      {tr("No users found.", "لا يوجد مستخدمين.")}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id} className="hover:bg-muted/40">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{u.name}</span>
                          <span className="text-xs text-muted-foreground">{u.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-border bg-muted/30">
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.managerId && userById.get(u.managerId) ? userById.get(u.managerId)?.name : u.manager?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.department?.name ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9"
                            onClick={() => {
                              setSelectedUser(u);
                              setEditUser({
                                userId: u.id,
                                name: u.name,
                                email: u.email,
                                role: u.role,
                                managerId: u.managerId ?? "",
                                departmentId: u.departmentId ?? "",
                              });
                              setEditOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedUser(u);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (open) setEditError(null);
          if (!open) setSelectedUser(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle>{tr("Edit User", "تعديل المستخدم")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {tr("Update user details.", "تحديث بيانات المستخدم.")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            {editError ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {editError}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="edit-name">{tr("Full Name", "الاسم الكامل")}</Label>
              <Input id="edit-name" value={editUser.name} onChange={(e) => setEditUser((p) => ({ ...p, name: e.target.value }))} required className="bg-card" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">{tr("Email", "البريد الإلكتروني")}</Label>
              <Input
                id="edit-email"
                type="email"
                value={editUser.email}
                onChange={(e) => setEditUser((p) => ({ ...p, email: e.target.value }))}
                required
                className="bg-card"
              />
            </div>

            <div className="space-y-2">
              <Label>{tr("Role", "الدور")}</Label>
              <Select
                value={editUser.role}
                onValueChange={(val) => {
                  const nextRole = val as Role;
                  setEditUser((p) => {
                    const nextRank = roleRank(nextRole);
                    const currentManager = managers.find((m) => m.id === p.managerId);
                    const managerOk = nextRole !== "ADMIN" && currentManager && currentManager.id !== p.userId && roleRank(currentManager.role) >= nextRank;
                    return { ...p, role: nextRole, managerId: managerOk ? p.managerId : "" };
                  });
                }}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder={tr("Select Role", "اختر الدور")} />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{tr("Manager", "المدير")}</Label>
              <Select
                value={editUser.managerId || "__none__"}
                onValueChange={(val) => setEditUser((p) => ({ ...p, managerId: val === "__none__" ? "" : val }))}
                disabled={editUser.role === "ADMIN"}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder={tr("Select Manager", "اختر المدير")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{tr("No manager", "بدون مدير")}</SelectItem>
                  {editManagerOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {managerLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{tr("Department", "الإدارة")}</Label>
              <Select
                value={editUser.departmentId || "__none__"}
                onValueChange={(val) => setEditUser((p) => ({ ...p, departmentId: val === "__none__" ? "" : val }))}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder={tr("Select Department", "اختر الإدارة")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{tr("No department", "بدون إدارة")}</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
                {tr("Cancel", "إلغاء")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? tr("Saving...", "جارٍ الحفظ...") : tr("Save", "حفظ")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (open) setDeleteError(null);
          if (!open) setSelectedUser(null);
        }}
      >
        <DialogContent className="border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle>{tr("Delete user?", "حذف المستخدم؟")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {tr("This will remove the user from your organization.", "سيتم حذف المستخدم من مؤسستك.")}
            </DialogDescription>
          </DialogHeader>

          {deleteError ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {deleteError}
            </div>
          ) : null}

          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
            <p className="font-semibold">{selectedUser?.name}</p>
            <p className="text-muted-foreground">{selectedUser?.email}</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)}>
              {tr("Cancel", "إلغاء")}
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={submitting}>
              {submitting ? tr("Deleting...", "جارٍ الحذف...") : tr("Delete", "حذف")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
