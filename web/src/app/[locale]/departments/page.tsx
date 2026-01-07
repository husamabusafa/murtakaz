"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import {
  createOrgAdminDepartment,
  deleteOrgAdminDepartment,
  getOrgAdminDepartments,
  updateOrgAdminDepartment,
} from "@/actions/org-admin";

type DepartmentRow = Awaited<ReturnType<typeof getOrgAdminDepartments>>[number];

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

export default function DepartmentsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { locale, t } = useLocale();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (user as any)?.role as string | undefined;

  const [loadingData, setLoadingData] = useState(true);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentRow | null>(null);

  const [newDepartment, setNewDepartment] = useState({ name: "" });
  const [editDepartment, setEditDepartment] = useState({ departmentId: "", name: "" });

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const deptData = await getOrgAdminDepartments();
      setDepartments(deptData);
    } catch (error) {
      console.error("Failed to load departments", error);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (userRole !== "ADMIN") return;
    void loadData();
  }, [loadData, loading, user, userRole]);

  const departmentById = useMemo(() => {
    const map = new Map<string, DepartmentRow>();
    departments.forEach((d) => map.set(d.id, d));
    return map;
  }, [departments]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setCreateError(null);
    try {
      const result = await createOrgAdminDepartment({ name: newDepartment.name });
      if (!result.success) {
        const issuesText = formatIssues((result as unknown as { issues?: unknown }).issues);
        setCreateError(issuesText || result.error || t("failedToCreateDepartment"));
        return;
      }

      setCreateOpen(false);
      setNewDepartment({ name: "" });
      await loadData();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("failedToCreateDepartment");
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
      const result = await updateOrgAdminDepartment({ departmentId: editDepartment.departmentId, name: editDepartment.name });
      if (!result.success) {
        const issuesText = formatIssues((result as unknown as { issues?: unknown }).issues);
        setEditError(issuesText || result.error || t("failedToUpdateDepartment"));
        return;
      }

      setEditOpen(false);
      setSelectedDepartment(null);
      await loadData();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("failedToUpdateDepartment");
      setEditError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!selectedDepartment) return;
    setSubmitting(true);
    setDeleteError(null);
    try {
      const result = await deleteOrgAdminDepartment({ departmentId: selectedDepartment.id });
      if (!result.success) {
        const issuesText = formatIssues((result as unknown as { issues?: unknown }).issues);
        setDeleteError(issuesText || result.error || t("failedToDeleteDepartment"));
        return;
      }

      setDeleteOpen(false);
      setSelectedDepartment(null);
      await loadData();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("failedToDeleteDepartment");
      setDeleteError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{t("noActiveSession")}</p>
        <Link href={`/${locale}/auth/login`} className="mt-3 inline-flex text-sm font-semibold text-primary hover:opacity-90">
          {t("goToSignIn")}
        </Link>
      </div>
    );
  }

  if (userRole !== "ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{t("unauthorized")}</p>
        <Link href={`/${locale}/overview`} className="mt-3 inline-flex text-sm font-semibold text-primary hover:opacity-90">
          {t("back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <PageHeader title={t("departments")} subtitle={t("departmentsSubtitle")} />

        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (open) setCreateError(null);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="me-2 h-4 w-4" />
              {t("newDepartment")}
            </Button>
          </DialogTrigger>
          <DialogContent className="border-border bg-card text-foreground">
            <DialogHeader>
              <DialogTitle>{t("createDepartment")}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {t("addDepartmentDesc")}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4">
              {createError ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive whitespace-pre-line">
                  {createError}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="dept-name">{t("name")}</Label>
                <Input
                  id="dept-name"
                  value={newDepartment.name}
                  onChange={(e) => setNewDepartment({ name: e.target.value })}
                  required
                  className="bg-card"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? t("creating") : t("create")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card/70 backdrop-blur shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t("departments")}</CardTitle>
          <CardDescription>{t("departmentsDirectoryDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("users")}</TableHead>
                  <TableHead>{t("created")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingData ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      {t("loading")}
                    </TableCell>
                  </TableRow>
                ) : departments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      {t("noDepartmentsFound")}
                    </TableCell>
                  </TableRow>
                ) : (
                  departments.map((d) => (
                    <TableRow key={d.id} className="hover:bg-muted/40">
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-muted-foreground">{d._count?.users ?? 0}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(d.createdAt).toLocaleDateString(locale === "ar" ? "ar" : "en", {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9"
                            onClick={() => {
                              setSelectedDepartment(d);
                              setEditDepartment({ departmentId: d.id, name: d.name });
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
                              setSelectedDepartment(d);
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
          if (!open) setSelectedDepartment(null);
        }}
      >
        <DialogContent className="border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle>{t("editDepartment")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("updateDepartmentDetailsDesc")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdate} className="space-y-4">
            {editError ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive whitespace-pre-line">
                {editError}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="edit-dept-name">{t("name")}</Label>
              <Input
                id="edit-dept-name"
                value={editDepartment.name}
                onChange={(e) => setEditDepartment((p) => ({ ...p, name: e.target.value }))}
                required
                className="bg-card"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("saving") : t("save")}
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
          if (!open) setSelectedDepartment(null);
        }}
      >
        <DialogContent className="border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle>{t("deleteDepartmentConfirm")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("removeDepartmentDesc")}
            </DialogDescription>
          </DialogHeader>

          {deleteError ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive whitespace-pre-line">
              {deleteError}
            </div>
          ) : null}

          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
            <p className="font-semibold">{selectedDepartment?.name ?? departmentById.get(editDepartment.departmentId)?.name}</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={submitting}>
              {submitting ? t("deleting") : t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
