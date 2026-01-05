"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
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
import { Icon } from "@/components/icon";
import { StatusBadge } from "@/components/rag-badge";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import {
  createOrgAdminNode,
  deleteOrgAdminNode,
  getOrgAdminEnabledNodeTypes,
  getOrgAdminNodesByType,
  getOrgAdminParentOptionsForNodeType,
  updateOrgAdminNode,
} from "@/actions/org-admin";
import type { Status } from "@prisma/client";

type EnabledNodeTypeRow = Awaited<ReturnType<typeof getOrgAdminEnabledNodeTypes>>[number];
type NodeRow = Awaited<ReturnType<typeof getOrgAdminNodesByType>>[number];
type ParentOptionRow = Awaited<ReturnType<typeof getOrgAdminParentOptionsForNodeType>>[number];

const presetColors = [
  "#64748b",
  "#0f172a",
  "#1d4ed8",
  "#0ea5e9",
  "#14b8a6",
  "#22c55e",
  "#a3e635",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#e11d48",
  "#a855f7",
] as const;

function normalizeCode(code: string) {
  return code.trim().toLowerCase();
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

export default function NodeTypePage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const { tr } = useLocale();
  const { locale } = useLocale();
  const { user, loading: sessionLoading } = useAuth();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (user as any)?.role as string | undefined;

  const code = typeof params?.code === "string" ? params.code : "";
  const normalizedCode = useMemo(() => normalizeCode(code), [code]);

  const [loading, setLoading] = useState(true);
  const [enabledTypes, setEnabledTypes] = useState<EnabledNodeTypeRow[]>([]);
  const [nodes, setNodes] = useState<NodeRow[]>([]);
  const [parents, setParents] = useState<ParentOptionRow[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [createDraft, setCreateDraft] = useState({
    name: "",
    description: "",
    parentId: "__none__",
    color: "#64748b",
    status: "PLANNED" as Status,
  });

  const [editTarget, setEditTarget] = useState<NodeRow | null>(null);
  const [editDraft, setEditDraft] = useState({
    name: "",
    description: "",
    parentId: "__none__",
    color: "#64748b",
    status: "PLANNED" as Status,
  });

  const [deleteTarget, setDeleteTarget] = useState<NodeRow | null>(null);

  const title = useMemo(() => {
    const match = enabledTypes.find((t) => String(t.code).toLowerCase() === normalizedCode);
    return match?.displayName ?? (code ? code.toUpperCase() : tr("Node Type", "نوع العقدة"));
  }, [code, enabledTypes, normalizedCode, tr]);

  const isTopLevel = useMemo(() => {
    if (!enabledTypes.length) return false;
    const top = enabledTypes[0];
    return String(top.code).toLowerCase() === normalizedCode;
  }, [enabledTypes, normalizedCode]);

  const pageIcon = useMemo(() => {
    const lower = normalizedCode;
    if (lower === "strategy") return "tabler:target-arrow";
    if (lower === "pillar") return "tabler:columns-3";
    if (lower === "objective") return "tabler:flag-3";
    if (lower === "initiative") return "tabler:rocket";
    if (lower === "project") return "tabler:briefcase-2";
    if (lower === "task") return "tabler:checklist";
    return "tabler:layers-subtract";
  }, [normalizedCode]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [types, rows, parentOptions] = await Promise.all([
        getOrgAdminEnabledNodeTypes(),
        getOrgAdminNodesByType({ code }),
        getOrgAdminParentOptionsForNodeType({ code }),
      ]);
      setEnabledTypes(types);
      setNodes(rows);
      setParents(parentOptions);
    } catch {
      setEnabledTypes([]);
      setNodes([]);
      setParents([]);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    if (sessionLoading) return;
    if (userRole !== "ADMIN") return;
    if (!code) return;
    void loadData();
  }, [code, loadData, sessionLoading, userRole]);

  const currentTypeIndex = useMemo(() => {
    if (!enabledTypes.length) return -1;
    return enabledTypes.findIndex((t) => String(t.code).toLowerCase() === normalizedCode);
  }, [enabledTypes, normalizedCode]);

  const requiresParent = useMemo(() => currentTypeIndex > 0, [currentTypeIndex]);

  const requiredParentTypeLabel = useMemo(() => {
    if (!requiresParent) return null;
    const parentType = enabledTypes[currentTypeIndex - 1];
    return parentType?.displayName ?? null;
  }, [currentTypeIndex, enabledTypes, requiresParent]);

  const effectiveCanCreate = useMemo(() => {
    if (!requiresParent) return true;
    return parents.length > 0;
  }, [parents.length, requiresParent]);

  const createDisabledReason = useMemo(() => {
    if (effectiveCanCreate) return null;
    if (!enabledTypes.length) return tr("No node types enabled for this organization.", "لا توجد أنواع عقد مفعّلة لهذه المؤسسة.");
    if (requiresParent) {
      return requiredParentTypeLabel
        ? tr(
            `No ${requiredParentTypeLabel} nodes yet. Create one first.`,
            `لا توجد عقد ${requiredParentTypeLabel} بعد. أنشئ واحدة أولاً.`,
          )
        : tr("No higher nodes yet. Create one first.", "لا توجد عقد أعلى بعد. أنشئ واحدة أولاً.");
    }
    return tr("Cannot create node.", "لا يمكن إنشاء عقدة.");
  }, [effectiveCanCreate, enabledTypes.length, requiredParentTypeLabel, requiresParent, tr]);

  const higherNodeLabel = useMemo(() => {
    return requiredParentTypeLabel ?? tr("Higher node", "العقدة الأعلى");
  }, [requiredParentTypeLabel, tr]);

  const createParentOptions = useMemo(() => {
    return parents.map((p: ParentOptionRow) => ({ id: p.id, name: p.name }));
  }, [parents]);

  const editParentOptions = createParentOptions;

  useEffect(() => {
    if (!createOpen) return;
    if (!requiresParent) return;
    if (createDraft.parentId !== "__none__") return;
    const first = createParentOptions[0];
    if (!first) return;
    setCreateDraft((p) => ({ ...p, parentId: first.id }));
  }, [createDraft.parentId, createOpen, createParentOptions, requiresParent]);

  async function handleCreate() {
    setCreateError(null);
    setSubmitting(true);
    try {
      const result = await createOrgAdminNode({
        code,
        name: createDraft.name,
        description: createDraft.description || undefined,
        parentId: createDraft.parentId === "__none__" ? null : createDraft.parentId,
        color: createDraft.color,
        status: createDraft.status,
      });

      if (!result.success) {
        setCreateError(formatIssues((result as unknown as { issues?: unknown }).issues) ?? result.error ?? tr("Failed to create", "فشل الإنشاء"));
        return;
      }

      setCreateOpen(false);
      setCreateDraft({ name: "", description: "", parentId: "__none__", color: "#64748b", status: "PLANNED" });
      await loadData();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(row: NodeRow) {
    setEditTarget(row);
    setEditDraft({
      name: row.name,
      description: row.description ?? "",
      parentId: row.parentId ?? "__none__",
      color: row.color ?? "#64748b",
      status: row.status as Status,
    });
    setEditError(null);
    setEditOpen(true);
  }

  useEffect(() => {
    if (!editOpen) return;
    if (!requiresParent) return;
    if (editDraft.parentId !== "__none__") return;
    const first = editParentOptions[0];
    if (!first) return;
    setEditDraft((p) => ({ ...p, parentId: first.id }));
  }, [editDraft.parentId, editOpen, editParentOptions, requiresParent]);

  async function handleUpdate() {
    if (!editTarget) return;
    setEditError(null);
    setSubmitting(true);
    try {
      const result = await updateOrgAdminNode({
        nodeId: editTarget.id,
        code,
        name: editDraft.name,
        description: editDraft.description || undefined,
        parentId: editDraft.parentId === "__none__" ? null : editDraft.parentId,
        color: editDraft.color,
        status: editDraft.status,
      });

      if (!result.success) {
        setEditError(formatIssues((result as unknown as { issues?: unknown }).issues) ?? result.error ?? tr("Failed to update", "فشل التحديث"));
        return;
      }

      setEditOpen(false);
      setEditTarget(null);
      await loadData();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  function openDelete(row: NodeRow) {
    setDeleteTarget(row);
    setDeleteError(null);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setSubmitting(true);
    try {
      const result = await deleteOrgAdminNode({ nodeId: deleteTarget.id });
      if (!result.success) {
        setDeleteError(formatIssues((result as unknown as { issues?: unknown }).issues) ?? result.error ?? tr("Failed to delete", "فشل الحذف"));
        return;
      }

      setDeleteOpen(false);
      setDeleteTarget(null);
      await loadData();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (sessionLoading || loading) {
    return (
      <div className="space-y-8">
        <PageHeader title={title} subtitle={tr("Loading...", "جارٍ التحميل...")} icon={<Icon name={pageIcon} className="h-5 w-5" />} />
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{tr("Loading", "جارٍ التحميل")}</CardTitle>
            <CardDescription>{tr("Please wait", "يرجى الانتظار")}</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      </div>
    );
  }

  if (userRole !== "ADMIN") {
    return (
      <div className="space-y-8">
        <PageHeader title={title} subtitle={tr("Unauthorized", "غير مصرح")} icon={<Icon name={pageIcon} className="h-5 w-5" />} />
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{tr("Access denied", "تم رفض الوصول")}</CardTitle>
            <CardDescription>{tr("Only organization admins can access this page.", "هذه الصفحة متاحة لمسؤولي المؤسسة فقط.")}</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={title}
        subtitle={tr("Manage nodes and explore hierarchy.", "إدارة العقد واستعراض التسلسل الهرمي.")}
        icon={<Icon name={pageIcon} className="h-5 w-5" />}
      />

      <Card className="bg-card/70 backdrop-blur shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name={pageIcon} className="h-4 w-4 text-foreground" />
                {title}
              </CardTitle>
              <CardDescription>
                {tr("Create, edit, delete, and open nodes to see their children and KPIs.", "أنشئ وحرّر واحذف وافتح العقد لرؤية العقد التابعة والمؤشرات.")}
              </CardDescription>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button disabled={!effectiveCanCreate}>
                  <Plus className="h-4 w-4" />
                  <span className="ms-2">{tr("New", "جديد")}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                  <DialogTitle>{tr("Create node", "إنشاء عقدة")}</DialogTitle>
                  <DialogDescription>{title}</DialogDescription>
                </DialogHeader>

                {createError ? (
                  <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 whitespace-pre-wrap">{createError}</div>
                ) : null}

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="create-name">{tr("Name", "الاسم")}</Label>
                    <Input id="create-name" value={createDraft.name} onChange={(e) => setCreateDraft((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="create-description">{tr("Description", "الوصف")}</Label>
                    <Input
                      id="create-description"
                      value={createDraft.description}
                      onChange={(e) => setCreateDraft((p) => ({ ...p, description: e.target.value }))}
                    />
                  </div>

                  {requiresParent ? (
                    <div className="grid gap-2">
                      <Label>{higherNodeLabel}</Label>
                      <Select
                        value={createDraft.parentId}
                        onValueChange={(v) => setCreateDraft((p) => ({ ...p, parentId: v }))}
                        disabled={!createParentOptions.length}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={tr(`Select ${higherNodeLabel}`, `اختر ${higherNodeLabel}`)} />
                        </SelectTrigger>
                        <SelectContent>
                          {createParentOptions.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!createParentOptions.length ? (
                        <p className="text-xs text-muted-foreground">{createDisabledReason}</p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="grid gap-2">
                    <Label>{tr("Color", "اللون")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {presetColors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCreateDraft((p) => ({ ...p, color: c }))}
                          className={
                            "h-8 w-8 rounded-lg border transition " +
                            (createDraft.color === c ? "border-foreground ring-2 ring-foreground/30" : "border-border hover:border-foreground/40")
                          }
                          style={{ backgroundColor: c }}
                          aria-label={c}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{tr("Pick a preset color.", "اختر لوناً جاهزاً.")}</p>
                  </div>

                  <div className="grid gap-2">
                    <Label>{tr("Status", "الحالة")}</Label>
                    <Select value={createDraft.status} onValueChange={(v) => setCreateDraft((p) => ({ ...p, status: v as Status }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PLANNED">{tr("Planned", "مخطط")}</SelectItem>
                        <SelectItem value="ACTIVE">{tr("Active", "نشط")}</SelectItem>
                        <SelectItem value="AT_RISK">{tr("At risk", "معرض للخطر")}</SelectItem>
                        <SelectItem value="COMPLETED">{tr("Completed", "مكتمل")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>
                    {tr("Cancel", "إلغاء")}
                  </Button>
                  <Button onClick={handleCreate} disabled={submitting || (requiresParent && createDraft.parentId === "__none__")}>
                    {tr("Create", "إنشاء")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {isTopLevel ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {nodes.map((n) => (
                <Card key={n.id} className="bg-card/50 backdrop-blur shadow-sm">
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: n.color }} />
                          <Link href={`/${locale}/nodes/${normalizedCode}/${n.id}`} className="hover:underline">
                            {n.name}
                          </Link>
                        </CardTitle>
                        {n.description ? <CardDescription className="line-clamp-2">{n.description}</CardDescription> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(n)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDelete(n)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={n.status as Status} />
                      <Badge variant="outline" className="border-white/10 bg-white/5">
                        {tr("Children", "العُقد التابعة")}: {n._count.children}
                      </Badge>
                      <Badge variant="outline" className="border-white/10 bg-white/5">
                        {tr("KPIs", "المؤشرات")}: {n._count.kpis}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))}

              {nodes.length === 0 ? (
                <div className="col-span-full rounded-md border border-border bg-card/50 p-6 text-sm text-muted-foreground">
                  {tr("No nodes yet.", "لا توجد عقد بعد.")}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{tr("Name", "الاسم")}</TableHead>
                    <TableHead>{higherNodeLabel}</TableHead>
                    <TableHead>{tr("Status", "الحالة")}</TableHead>
                    <TableHead>{tr("Children", "العُقد التابعة")}</TableHead>
                    <TableHead>{tr("KPIs", "المؤشرات")}</TableHead>
                    <TableHead className="text-right">{tr("Actions", "الإجراءات")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nodes.map((n) => (
                    <TableRow key={n.id} className="hover:bg-card/40">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: n.color }} />
                          <Link href={`/${locale}/nodes/${normalizedCode}/${n.id}`} className="hover:underline">
                            {n.name}
                          </Link>
                        </div>
                        {n.description ? <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{n.description}</p> : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{n.parent?.name ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={n.status as Status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{n._count.children}</TableCell>
                      <TableCell className="text-muted-foreground">{n._count.kpis}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(n)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openDelete(n)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {nodes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        {tr("No nodes yet.", "لا توجد عقد بعد.")}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {createDisabledReason && !isTopLevel ? (
        <div className="rounded-md border border-border bg-card/50 p-4 text-sm text-muted-foreground">{createDisabledReason}</div>
      ) : null}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{tr("Edit node", "تعديل العقدة")}</DialogTitle>
            <DialogDescription>{editTarget?.name ?? ""}</DialogDescription>
          </DialogHeader>

          {editError ? (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 whitespace-pre-wrap">{editError}</div>
          ) : null}

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">{tr("Name", "الاسم")}</Label>
              <Input id="edit-name" value={editDraft.name} onChange={(e) => setEditDraft((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">{tr("Description", "الوصف")}</Label>
              <Input id="edit-description" value={editDraft.description} onChange={(e) => setEditDraft((p) => ({ ...p, description: e.target.value }))} />
            </div>

            {requiresParent ? (
              <div className="grid gap-2">
                <Label>{higherNodeLabel}</Label>
                <Select
                  value={editDraft.parentId}
                  onValueChange={(v) => setEditDraft((p) => ({ ...p, parentId: v }))}
                  disabled={!editParentOptions.length}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tr(`Select ${higherNodeLabel}`, `اختر ${higherNodeLabel}`)} />
                  </SelectTrigger>
                  <SelectContent>
                    {editParentOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!editParentOptions.length ? (
                  <p className="text-xs text-muted-foreground">{createDisabledReason}</p>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label>{tr("Color", "اللون")}</Label>
              <div className="flex flex-wrap gap-2">
                {presetColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditDraft((p) => ({ ...p, color: c }))}
                    className={
                      "h-8 w-8 rounded-lg border transition " +
                      (editDraft.color === c ? "border-foreground ring-2 ring-foreground/30" : "border-border hover:border-foreground/40")
                    }
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{tr("Pick a preset color.", "اختر لوناً جاهزاً.")}</p>
            </div>

            <div className="grid gap-2">
              <Label>{tr("Status", "الحالة")}</Label>
              <Select value={editDraft.status} onValueChange={(v) => setEditDraft((p) => ({ ...p, status: v as Status }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNED">{tr("Planned", "مخطط")}</SelectItem>
                  <SelectItem value="ACTIVE">{tr("Active", "نشط")}</SelectItem>
                  <SelectItem value="AT_RISK">{tr("At risk", "معرض للخطر")}</SelectItem>
                  <SelectItem value="COMPLETED">{tr("Completed", "مكتمل")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={submitting}>
              {tr("Cancel", "إلغاء")}
            </Button>
            <Button onClick={handleUpdate} disabled={submitting || !editTarget || (requiresParent && editDraft.parentId === "__none__")}>
              {tr("Save", "حفظ")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{tr("Delete node", "حذف العقدة")}</DialogTitle>
            <DialogDescription>{deleteTarget?.name ?? ""}</DialogDescription>
          </DialogHeader>

          {deleteError ? (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 whitespace-pre-wrap">{deleteError}</div>
          ) : null}

          <p className="text-sm text-muted-foreground">
            {tr("This will soft-delete the node.", "سيتم حذف العقدة (حذف منطقي).")}
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={submitting}>
              {tr("Cancel", "إلغاء")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting || !deleteTarget}>
              {tr("Delete", "حذف")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
