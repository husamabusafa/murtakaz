"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import {
  assignResponsibilities,
  getAssignableNodePickerNodes,
  getMyDirectReports,
  getResponsibilitiesForUser,
  previewNodeCascade,
  searchAssignableKpis,
  unassignResponsibility,
} from "@/actions/responsibilities";
import { NodePickerTree } from "@/components/node-picker-dialog";

type DirectReport = {
  id: string;
  name: string;
  role: string;
  email: string;
  department: { id: string; name: string } | null;
};

type NodeSearchRow = {
  id: string;
  name: string;
  color: string;
  parentId: string | null;
  nodeType: { code: string; displayName: string; levelOrder: number };
  parent: { id: string; name: string; nodeType: { displayName: string } } | null;
  _count: { children: number; kpis: number };
};

type KpiSearchRow = {
  id: string;
  name: string;
  unit: string | null;
  primaryNode: { id: string; name: string; nodeType: { displayName: string } };
};

type CurrentAssignments = {
  nodeAssignments: Array<{
    id: string;
    rootNode: { id: string; name: string; color: string; nodeType: { displayName: string } };
    assignedBy: { id: string; name: string; role: string };
    createdAt: Date;
  }>;
  kpiAssignments: Array<{
    id: string;
    kpi: {
      id: string;
      name: string;
      unit: string | null;
      primaryNode: { id: string; name: string; nodeType: { displayName: string } };
    };
    assignedBy: { id: string; name: string; role: string };
    createdAt: Date;
  }>;
};

type Mode = "node" | "kpi";

function initials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "—";
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export default function ResponsibilitiesPage() {
  const { user, loading: sessionLoading } = useAuth();
  const { locale, tr, nodeTypeLabel } = useLocale();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (user as any)?.role as string | undefined;

  const canUse = Boolean(userRole) && userRole !== "EMPLOYEE" && userRole !== "SUPER_ADMIN";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [reports, setReports] = useState<DirectReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>("");

  const [mode, setMode] = useState<Mode>("node");

  const [nodePickerNodes, setNodePickerNodes] = useState<Array<{ id: string; name: string; parentId: string | null; color: string; nodeType: { displayName: string } }>>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");

  const [kpiQuery, setKpiQuery] = useState("");
  const [kpiResults, setKpiResults] = useState<KpiSearchRow[]>([]);
  const [selectedKpis, setSelectedKpis] = useState<KpiSearchRow[]>([]);

  const [cascadeOpen, setCascadeOpen] = useState(false);
  const [cascadeNode, setCascadeNode] = useState<NodeSearchRow | null>(null);
  const [cascade, setCascade] = useState<Awaited<ReturnType<typeof previewNodeCascade>> | null>(null);

  const [assignments, setAssignments] = useState<CurrentAssignments | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedReport = useMemo(() => reports.find((r) => r.id === selectedReportId) ?? null, [reports, selectedReportId]);

  const loadAssignments = useCallback(
    async (reportId: string) => {
      if (!reportId) {
        setAssignments(null);
        return;
      }
      const res = await getResponsibilitiesForUser({ assignedToId: reportId });
      setAssignments(res);
    },
    [setAssignments],
  );

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [rows, pickerNodes] = await Promise.all([
          getMyDirectReports(),
          canUse ? getAssignableNodePickerNodes() : Promise.resolve([]),
        ]);
        if (!mounted) return;
        setReports(rows);
        setNodePickerNodes(pickerNodes);
        const firstId = rows[0]?.id ?? "";
        setSelectedReportId(firstId);
        if (firstId) {
          await loadAssignments(firstId);
        }
      } catch (e: unknown) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : tr("Failed to load", "فشل التحميل"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [canUse, loadAssignments, sessionLoading, tr, user]);

  useEffect(() => {
    if (!canUse) return;
    void (async () => {
      const rows = await searchAssignableKpis({ query: kpiQuery });
      setKpiResults(rows);
    })();
  }, [canUse, kpiQuery]);

  const selectedKpiIds = useMemo(() => new Set(selectedKpis.map((k) => k.id)), [selectedKpis]);

  async function openCascadePreview(node: NodeSearchRow) {
    setCascadeNode(node);
    setCascadeOpen(true);
    setCascade(null);
    const res = await previewNodeCascade({ rootNodeId: node.id });
    setCascade(res);
  }

  async function applyNodeAssignment() {
    if (!selectedReportId || !cascadeNode) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await assignResponsibilities({ mode: "node", assignedToId: selectedReportId, rootNodeId: cascadeNode.id });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setCascadeOpen(false);
      setCascadeNode(null);
      setCascade(null);
      await loadAssignments(selectedReportId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : tr("Failed to assign", "فشل الإسناد"));
    } finally {
      setSubmitting(false);
    }
  }

  async function applyKpiAssignment() {
    if (!selectedReportId || selectedKpis.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await assignResponsibilities({ mode: "kpi", assignedToId: selectedReportId, kpiIds: selectedKpis.map((k) => k.id) });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setSelectedKpis([]);
      await loadAssignments(selectedReportId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : tr("Failed to assign", "فشل الإسناد"));
    } finally {
      setSubmitting(false);
    }
  }

  async function removeNodeAssignment(rootNodeId: string) {
    if (!selectedReportId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await unassignResponsibility({ mode: "node", assignedToId: selectedReportId, rootNodeId });
      if (!res.success) {
        setError(res.error);
        return;
      }
      await loadAssignments(selectedReportId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : tr("Failed to remove", "فشل الإزالة"));
    } finally {
      setSubmitting(false);
    }
  }

  async function removeKpiAssignment(kpiId: string) {
    if (!selectedReportId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await unassignResponsibility({ mode: "kpi", assignedToId: selectedReportId, kpiId });
      if (!res.success) {
        setError(res.error);
        return;
      }
      await loadAssignments(selectedReportId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : tr("Failed to remove", "فشل الإزالة"));
    } finally {
      setSubmitting(false);
    }
  }

  if (sessionLoading || loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{tr("Loading…", "جارٍ التحميل…")}</span>
        </div>
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

  if (!canUse) {
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
      <PageHeader
        title={tr("Responsibilities", "المسؤوليات")}
        subtitle={tr(
          "Assign nodes (with cascading scope) or individual KPIs to your direct reports.",
          "قم بإسناد العناصر (مع نطاق متسلسل) أو مؤشرات الأداء الرئيسية الفردية لموظفيك المباشرين.",
        )}
        icon={<Icon name="tabler:user-check" className="h-5 w-5" />}
      />

      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive whitespace-pre-wrap">{error}</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">{tr("Choose a user", "اختر مستخدم")}</CardTitle>
            <CardDescription>{tr("You can only assign to direct reports.", "يمكنك الإسناد فقط للموظفين المباشرين.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{tr("Direct report", "الموظف المباشر")}</Label>
              <Select
                value={selectedReportId}
                onValueChange={async (id) => {
                  setSelectedReportId(id);
                  setSelectedKpis([]);
                  setCascadeNode(null);
                  setCascade(null);
                  await loadAssignments(id);
                }}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder={tr("Select user", "اختر مستخدم")} />
                </SelectTrigger>
                <SelectContent>
                  {reports.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({r.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedReport ? (
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/70 text-xs font-semibold">
                    {initials(selectedReport.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{selectedReport.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {selectedReport.role}
                      {selectedReport.department?.name ? ` • ${selectedReport.department.name}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={mode === "node" ? "default" : "outline"}
                onClick={() => {
                  setMode("node");
                  setSelectedKpis([]);
                }}
              >
                {tr("Assign item", "إسناد عنصر")}
              </Button>
              <Button
                variant={mode === "kpi" ? "default" : "outline"}
                onClick={() => {
                  setMode("kpi");
                  setCascadeNode(null);
                  setCascade(null);
                }}
              >
                {tr("Assign KPIs", "إسناد مؤشرات أداء رئيسية")}
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">{tr("Tip", "معلومة")}</p>
              <div className="mt-2 space-y-2">
                <p>{tr("Item assignment cascades to all child items and all KPIs under them (including future ones).", "إسناد العنصر يتسلسل لكل العناصر الفرعية وجميع مؤشرات الأداء الرئيسية تحتها (بما في ذلك المستقبلية).")}</p>
                <p>{tr("KPI assignment assigns only selected KPIs.", "إسناد مؤشرات الأداء الرئيسية يقتصر على المحددة فقط.")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{mode === "node" ? tr("Select an item", "اختر عنصرًا") : tr("Select KPIs", "اختر مؤشرات أداء رئيسية")}</CardTitle>
            <CardDescription>
              {mode === "node"
                ? tr("Pick an item and preview the cascading scope before confirming.", "اختر عنصرًا وعاين نطاق التسلسل قبل التأكيد.")
                : tr("Search and add KPIs, then assign them in one action.", "ابحث وأضف مؤشرات أداء رئيسية، ثم قم بإسنادها دفعة واحدة.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {mode === "node" ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>{tr("Linked node", "العنصر")}</Label>
                  <NodePickerTree
                    nodes={nodePickerNodes}
                    selectedId={selectedNodeId || null}
                    onSelect={(id) => {
                      if (!id) {
                        setSelectedNodeId("");
                        return;
                      }

                      const found = nodePickerNodes.find((n) => n.id === id);
                      if (!found) return;
                      setSelectedNodeId(id);

                      void openCascadePreview({
                        id: found.id,
                        name: found.name,
                        color: found.color,
                        parentId: found.parentId,
                        nodeType: { code: "", displayName: found.nodeType.displayName, levelOrder: 0 },
                        parent: null,
                        _count: { children: 0, kpis: 0 },
                      });
                    }}
                    searchPlaceholder={tr("Search nodes…", "ابحث في العناصر…")}
                    clearLabel={tr("Clear", "مسح")}
                    typeFallbackLabel={tr("Type", "النوع")}
                    heightClassName="h-[360px]"
                    variant="light"
                    showClear={false}
                    showSelectedIndicator={false}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{tr("Search KPIs", "بحث مؤشرات الأداء الرئيسية")}</Label>
                  <Input
                    value={kpiQuery}
                    onChange={(e) => setKpiQuery(e.target.value)}
                    placeholder={tr("Type a name…", "اكتب اسمًا…")}
                    className="bg-card"
                  />
                </div>

                {selectedKpis.length ? (
                  <div className="rounded-xl border border-border bg-muted/20 p-3">
                    <p className="text-xs font-semibold text-foreground">{tr("Selected", "المختار")}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedKpis.map((k) => (
                        <span key={k.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs">
                          <span className="font-semibold">{k.name}</span>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => setSelectedKpis((prev) => prev.filter((x) => x.id !== k.id))}
                            aria-label={tr("Remove", "إزالة")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-2">
                  {kpiResults.map((k) => {
                    const isSelected = selectedKpiIds.has(k.id);
                    return (
                      <div key={k.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background/50 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{k.name}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {nodeTypeLabel(String(k.primaryNode.nodeType.code), k.primaryNode.nodeType.displayName)} • {k.primaryNode.name}
                            {k.unit ? ` • ${k.unit}` : ""}
                          </p>
                        </div>
                        <Button
                          variant={isSelected ? "outline" : "default"}
                          size="sm"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedKpis((prev) => prev.filter((x) => x.id !== k.id));
                              return;
                            }
                            setSelectedKpis((prev) => [...prev, k]);
                          }}
                        >
                          {isSelected ? tr("Remove", "إزالة") : tr("Add", "إضافة")}
                        </Button>
                      </div>
                    );
                  })}

                  {kpiResults.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-sm text-muted-foreground">
                      {tr("No KPIs found.", "لا توجد نتائج.")}
                    </div>
                  ) : null}
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => void applyKpiAssignment()} disabled={!selectedReportId || selectedKpis.length === 0 || submitting}>
                    {submitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Plus className="me-2 h-4 w-4" />}
                    {tr("Assign selected KPIs", "إسناد مؤشرات الأداء الرئيسية المختارة")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/70 backdrop-blur shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{tr("Current responsibilities", "المسؤوليات الحالية")}</CardTitle>
          <CardDescription>{tr("These are the responsibilities you have assigned to this direct report.", "هذه هي المسؤوليات التي قمت بإسنادها لهذا الموظف المباشر.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!selectedReportId ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-sm text-muted-foreground">
              {tr("Select a direct report to view responsibilities.", "اختر موظفًا مباشرًا لعرض المسؤوليات.")}
            </div>
          ) : null}

          {selectedReportId ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{tr("Item responsibilities", "مسؤوليات العناصر")}</p>
                  <Badge variant="outline" className="border-border bg-muted/30">
                    {assignments?.nodeAssignments.length ?? 0}
                  </Badge>
                </div>

                <div className="grid gap-2">
                  {(assignments?.nodeAssignments ?? []).map((a) => (
                    <div key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background/50 px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.rootNode.color }} />
                          <p className="truncate text-sm font-semibold">{a.rootNode.name}</p>
                          <Badge variant="outline" className="border-border bg-muted/30">
                            {nodeTypeLabel(String(a.rootNode.nodeType.code), a.rootNode.nodeType.displayName)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {tr("Assigned by", "أُسند بواسطة")}: {a.assignedBy.name} ({a.assignedBy.role})
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={submitting}
                        onClick={() => void removeNodeAssignment(a.rootNode.id)}
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  ))}

                  {(assignments?.nodeAssignments.length ?? 0) === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-sm text-muted-foreground">
                      {tr("No node responsibilities assigned.", "لا توجد مسؤوليات عناصر.")}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{tr("KPI responsibilities", "مسؤوليات مؤشرات الأداء الرئيسية")}</p>
                  <Badge variant="outline" className="border-border bg-muted/30">
                    {assignments?.kpiAssignments.length ?? 0}
                  </Badge>
                </div>

                <div className="grid gap-2">
                  {(assignments?.kpiAssignments ?? []).map((a) => (
                    <div key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background/50 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{a.kpi.name}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {nodeTypeLabel(String(a.kpi.primaryNode.nodeType.code), a.kpi.primaryNode.nodeType.displayName)} • {a.kpi.primaryNode.name}
                          {a.kpi.unit ? ` • ${a.kpi.unit}` : ""}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {tr("Assigned by", "أُسند بواسطة")}: {a.assignedBy.name} ({a.assignedBy.role})
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={submitting}
                        onClick={() => void removeKpiAssignment(a.kpi.id)}
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  ))}

                  {(assignments?.kpiAssignments.length ?? 0) === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-sm text-muted-foreground">
                      {tr("No KPI responsibilities assigned.", "لا توجد مسؤوليات مؤشرات أداء رئيسية.")}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={cascadeOpen} onOpenChange={setCascadeOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{tr("Confirm node assignment", "تأكيد إسناد العنصر")}</DialogTitle>
            <DialogDescription>
              {tr(
                "This will cascade responsibility to all child nodes and all KPIs under them.",
                "سيتم تسلسل المسؤولية لكل العناصر الفرعية وجميع مؤشرات الأداء الرئيسية تحتها.",
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {cascadeNode ? (
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: cascadeNode.color }} />
                  <p className="text-sm font-semibold">{cascadeNode.name}</p>
                  <Badge variant="outline" className="border-border bg-muted/30">
                    {nodeTypeLabel(String(cascadeNode.nodeType.code), cascadeNode.nodeType.displayName)}
                  </Badge>
                </div>
              </div>
            ) : null}

            {!cascade ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{tr("Building cascade preview…", "جارٍ تجهيز المعاينة…")}</span>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-background/50 p-4">
                  <p className="text-xs font-semibold text-muted-foreground">{tr("Nodes in scope", "العناصر ضمن النطاق")}</p>
                  <p className="mt-2 text-2xl font-semibold">{cascade.counts.nodes}</p>
                </div>
                <div className="rounded-xl border border-border bg-background/50 p-4">
                  <p className="text-xs font-semibold text-muted-foreground">{tr("KPIs in scope", "مؤشرات الأداء الرئيسية ضمن النطاق")}</p>
                  <p className="mt-2 text-2xl font-semibold">{cascade.counts.kpis}</p>
                </div>

                <div className="sm:col-span-2 rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-semibold text-foreground">{tr("Sample KPIs", "أمثلة على مؤشرات الأداء الرئيسية")}</p>
                  <div className="mt-3 space-y-2">
                    {cascade.sampleKpis.length ? (
                      cascade.sampleKpis.map((k) => (
                        <div key={k.id} className="rounded-lg border border-border bg-background/50 px-3 py-2">
                          <p className="truncate text-sm font-semibold">{k.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {nodeTypeLabel(String(k.primaryNode.nodeType.code), k.primaryNode.nodeType.displayName)} • {k.primaryNode.name}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">{tr("No KPIs under this node.", "لا توجد مؤشرات أداء رئيسية تحت هذا العنصر.")}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCascadeOpen(false);
                setCascadeNode(null);
                setCascade(null);
              }}
              disabled={submitting}
            >
              {tr("Cancel", "إلغاء")}
            </Button>
            <Button onClick={() => void applyNodeAssignment()} disabled={!cascadeNode || submitting}>
              {submitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
              {tr("Confirm assignment", "تأكيد الإسناد")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
