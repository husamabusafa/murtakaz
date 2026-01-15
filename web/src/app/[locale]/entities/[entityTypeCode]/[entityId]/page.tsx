"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { EChartsOption } from "echarts";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EChart } from "@/components/charts/echart";
import { KpiGauge } from "@/components/charts/kpi-gauge";
import { EntityAssignments } from "@/components/entity-assignments";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { ActionValidationIssue } from "@/types/actions";
import {
  deleteOrgEntity,
  getOrgEntityDetail,
  saveOrgEntityKpiValuesDraft,
  getOrgEntitiesByKeys,
} from "@/actions/entities";
import {
  submitEntityForApproval,
  approveEntityValue,
  rejectEntityValue,
} from "@/actions/approvals";

type EntityDetail = Awaited<ReturnType<typeof getOrgEntityDetail>>;

type EntityVariableRow = NonNullable<EntityDetail>["entity"]["variables"][number];

type ReferencedEntity = Awaited<ReturnType<typeof getOrgEntitiesByKeys>>[number];


function toNumberOrUndefined(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function periodValue(period: {
  actualValue: number | null;
  calculatedValue: number | null;
  finalValue: number | null;
}) {
  if (typeof period.finalValue === "number") return period.finalValue;
  if (typeof period.calculatedValue === "number") return period.calculatedValue;
  if (typeof period.actualValue === "number") return period.actualValue;
  return null;
}

function extractFormulaKeys(formula: string): string[] {
  const keys: string[] = [];
  const re = /get\(\s*["']([^"']+)["']\s*\)/g;
  for (const match of formula.matchAll(re)) {
    const key = String(match[1] ?? "").toUpperCase().trim();
    if (key) keys.push(key);
  }
  return Array.from(new Set(keys));
}

function latestEntityValue(values: { actualValue: number | null; calculatedValue: number | null; finalValue: number | null } | null) {
  if (!values) return null;
  if (typeof values.finalValue === "number") return values.finalValue;
  if (typeof values.calculatedValue === "number") return values.calculatedValue;
  if (typeof values.actualValue === "number") return values.actualValue;
  return null;
}

export default function EntityDetailPage() {
  const params = useParams<{ entityTypeCode: string; entityId: string }>();
  const router = useRouter();
  const { user, loading: sessionLoading } = useAuth();
  const { locale, t, tr, df, formatNumber, te, kpiValueStatusLabel } = useLocale();

  const userRole = typeof (user as unknown as { role?: unknown })?.role === "string" ? String((user as unknown as { role?: unknown })?.role) : undefined;
  const canAdmin = userRole === "ADMIN";

  const entityTypeCode = String(params.entityTypeCode ?? "");

  const [data, setData] = useState<EntityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [note, setNote] = useState("");
  const [valuesByVariableId, setValuesByVariableId] = useState<Record<string, string>>({});
  const [manualValue, setManualValue] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  
  const [referencedEntities, setReferencedEntities] = useState<ReferencedEntity[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);
  
  const [calculating, setCalculating] = useState(false);
  const [calculateError, setCalculateError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setLoadError(null);

    try {
      const result = await getOrgEntityDetail({ entityId: String(params.entityId) });
      setData(result);

      const current = result?.currentPeriod ?? null;
      if (current?.note) setNote(String(current.note));

      const vv = current?.variableValues ?? [];
      const preset: Record<string, string> = {};
      for (const row of vv) preset[String(row.entityVariableId)] = String(row.value);
      setValuesByVariableId(preset);

      const mv = current ? periodValue(current) : null;
      if (typeof mv === "number") {
        setManualValue(String(mv));
      }

      // Load referenced entities from formula
      if (result?.entity?.formula) {
        const keys = extractFormulaKeys(result.entity.formula);
        if (keys.length > 0) {
          setLoadingRefs(true);
          try {
            const refs = await getOrgEntitiesByKeys({ keys });
            setReferencedEntities(refs);
          } catch (err) {
            console.error("Failed to load referenced entities:", err);
          } finally {
            setLoadingRefs(false);
          }
        }
      }

    } catch (error: unknown) {
      console.error("Failed to load item", error);
      setData(null);
      setLoadError(error instanceof Error ? error.message : "Failed to load item");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) return;
    if (userRole === "SUPER_ADMIN") return;
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.entityId, sessionLoading, userRole]);

  const entity = data?.entity ?? null;
  const isKpiEntity = Boolean(entity?.periodType);

  const staticVariables = useMemo(() => {
    return (entity?.variables ?? []).filter((v) => v.isStatic);
  }, [entity?.variables]);

  const fillableVariables = useMemo(() => {
    return (entity?.variables ?? []).filter((v) => !v.isStatic);
  }, [entity?.variables]);

  const needsManualValue = useMemo(() => {
    if (!entity?.periodType) return false;
    const hasFormula = Boolean(entity.formula && entity.formula.trim().length > 0);
    return fillableVariables.length === 0 && staticVariables.length === 0 && !hasFormula;
  }, [entity?.formula, entity?.periodType, fillableVariables.length, staticVariables.length]);

  const currentValue = useMemo(() => {
    const current = data?.currentPeriod ?? null;
    if (current) return periodValue(current);
    const latest = data?.latest ?? null;
    if (latest) return periodValue(latest);
    return null;
  }, [data?.currentPeriod, data?.latest]);

  const unitLabel = entity ? df(entity.unit, entity.unitAr) : "";

  const trendOption = useMemo<EChartsOption>(() => {
    const points = (entity?.values ?? []).slice().reverse();
    const labels = points.map((p) => p.periodEnd.toISOString().slice(0, 10));
    const values = points.map((p) => periodValue(p) ?? 0);

    return {
      grid: { left: 24, right: 16, top: 18, bottom: 28, containLabel: true },
      tooltip: {
        trigger: "axis",
        confine: true,
        backgroundColor: "rgba(2,6,23,0.9)",
        borderColor: "rgba(255,255,255,0.12)",
      },
      xAxis: { type: "category", data: labels, axisLabel: { color: "rgba(226,232,240,0.75)" } },
      yAxis: {
        type: "value",
        axisLabel: { color: "rgba(226,232,240,0.75)" },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.12)" } },
      },
      series: [
        {
          type: "line",
          data: values,
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { width: 3, color: "#60a5fa" },
          itemStyle: { color: "#60a5fa" },
          areaStyle: { color: "rgba(96,165,250,0.18)" },
          markLine: {
            symbol: "none",
            lineStyle: { color: "rgba(52,211,153,0.55)", type: "dashed" },
            label: { color: "rgba(226,232,240,0.75)" },
            data: [{ yAxis: entity?.targetValue ?? 0, name: t("target") }],
          },
        },
      ],
    };
  }, [entity?.targetValue, entity?.values, t]);

  async function handleCalculate() {
    if (!entity) return;
    setCalculating(true);
    setCalculateError(null);

    try {
      await reload();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tr("Calculation failed", "فشل الحساب");
      setCalculateError(message);
    } finally {
      setCalculating(false);
    }
  }

  async function handleSaveDraft() {
    if (!entity) return;
    setSaving(true);
    setSaveError(null);

    try {
      const values: Record<string, number> = {};
      for (const v of fillableVariables) {
        const raw = valuesByVariableId[v.id] ?? "";
        if (!raw.trim()) continue;
        const n = Number(raw);
        values[v.id] = n;
      }

      const payload: {
        entityId: string;
        note?: string;
        manualValue?: number;
        values: Record<string, number>;
      } = {
        entityId: entity.id,
        values,
      };

      if (note.trim()) payload.note = note.trim();

      if (needsManualValue) {
        const mv = toNumberOrUndefined(manualValue);
        if (typeof mv === "number") payload.manualValue = mv;
      }

      const res = await saveOrgEntityKpiValuesDraft(payload);
      if (!res.success) {
        const issues = (res as { issues?: ActionValidationIssue[] }).issues ?? null;
        const translated = te(res.error, issues);
        setSaveError(translated || res.error || t("failedToSave"));
        return;
      }

      await reload();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("failedToSave");
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!entity) return;
    if (!canAdmin) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await deleteOrgEntity({ entityId: entity.id });
      if (!res.success) {
        setDeleteError(te(res.error) || res.error || t("failedToDelete"));
        return;
      }

      setDeleteOpen(false);
      router.push(`/${locale}/entities/${entityTypeCode}`);
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("failedToDelete");
      setDeleteError(message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleSubmitForApproval() {
    if (!entity || !data?.currentPeriod?.id) return;

    setSubmitting(true);
    setApprovalError(null);

    try {
      const res = await submitEntityForApproval({ 
        entityId: entity.id, 
        periodId: data.currentPeriod.id 
      });
      if (!res.success) {
        setApprovalError(te(res.error) || res.error || t("failedToSubmit"));
        return;
      }

      if (res.autoApproved) {
        setApprovalError(null);
      }
      await reload();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("failedToSubmit");
      setApprovalError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    if (!entity || !data?.currentPeriod?.id) return;

    setApproving(true);
    setApprovalError(null);

    try {
      const res = await approveEntityValue({ 
        entityId: entity.id, 
        periodId: data.currentPeriod.id 
      });
      if (!res.success) {
        setApprovalError(te(res.error) || res.error || t("failedToApprove"));
        return;
      }

      await reload();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("failedToApprove");
      setApprovalError(message);
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!entity || !data?.currentPeriod?.id) return;

    setRejecting(true);
    setApprovalError(null);

    try {
      const res = await rejectEntityValue({ 
        entityId: entity.id, 
        periodId: data.currentPeriod.id 
      });
      if (!res.success) {
        setApprovalError(te(res.error) || res.error || t("failedToReject"));
        return;
      }

      await reload();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("failedToReject");
      setApprovalError(message);
    } finally {
      setRejecting(false);
    }
  }


  if (sessionLoading || loading) {
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

  if (userRole === "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{t("unauthorized")}</p>
        <Link href={`/${locale}/super-admin`} className="mt-3 inline-flex text-sm font-semibold text-primary hover:opacity-90">
          {t("back")}
        </Link>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{loadError ? te(loadError) || loadError : t("notFound")}</p>
        <Link href={`/${locale}/entities/${entityTypeCode}`} className="mt-3 inline-flex text-sm font-semibold text-primary hover:opacity-90">
          {t("back")}
        </Link>
      </div>
    );
  }

  const pageTitle = df(entity.title, entity.titleAr);
  const canEditValues = canAdmin || (data?.userAccess?.canEditValues ?? false);
  const currentStatus = data?.currentPeriod?.status ?? "DRAFT";
  const canApprove = data?.approvalContext?.canApprove ?? false;
  const isSubmitted = currentStatus === "SUBMITTED";
  const isApproved = currentStatus === "APPROVED";
  const isDraft = currentStatus === "DRAFT";
  const canEditPeriod = canEditValues && (isDraft || isApproved);
  
  // Check if KPI has any fillable inputs
  const hasFillableInputs = fillableVariables.length > 0 || needsManualValue;

  return (
    <div className="space-y-8">
      <PageHeader
        title={pageTitle}
        subtitle={df(entity.orgEntityType.name, entity.orgEntityType.nameAr)}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href={`/${locale}/entities/${entityTypeCode}`}>{t("back")}</Link>
            </Button>
            {canAdmin ? (
              <>
                <Button type="button" variant="outline" asChild>
                  <Link href={`/${locale}/entities/${entityTypeCode}/${params.entityId}/edit`}>
                    <Pencil className="me-2 h-4 w-4" />
                    {t("edit")}
                  </Link>
                </Button>
                <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="me-2 h-4 w-4" />
                  {t("delete")}
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      {entity.description || entity.descriptionAr ? (
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t("description")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{df(entity.description, entity.descriptionAr)}</p>
          </CardContent>
        </Card>
      ) : null}

      {canAdmin ? <EntityAssignments entityId={entity.id} entityTitle={pageTitle} /> : null}

      {entity.formula || entity.targetValue ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">{isKpiEntity ? tr("KPI", "مؤشر الأداء") : tr("Value", "القيمة")}</CardTitle>
              <CardDescription>{tr("Current value and target.", "القيمة الحالية والهدف.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <KpiGauge value={currentValue} target={entity.targetValue} unit={unitLabel || undefined} />
              {isKpiEntity && (
                <div className="mt-3 text-xs text-muted-foreground">
                  {tr("Status", "الحالة")}: {kpiValueStatusLabel(String(data?.currentPeriod?.status ?? data?.latest?.status ?? "DRAFT"))}
                </div>
              )}
              {entity.formula && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-muted-foreground">{tr("Formula", "الصيغة")}</div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void handleCalculate()}
                      disabled={calculating}
                      className="h-6 text-xs"
                    >
                      {calculating ? (
                        <>
                          <Loader2 className="me-1 h-3 w-3 animate-spin" />
                          {tr("Calculating", "جارٍ الحساب")}
                        </>
                      ) : (
                        tr("Calculate", "احسب")
                      )}
                    </Button>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2 font-mono text-[10px] overflow-x-auto">
                    {entity.formula}
                  </div>
                  {calculateError && (
                    <div className="text-xs text-destructive">{calculateError}</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">{tr("Trend", "الاتجاه")}</CardTitle>
              <CardDescription>{tr("Recent periods.", "آخر الفترات.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <EChart option={trendOption} height={280} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {isKpiEntity ? (
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t("inputs")}</CardTitle>
            <CardDescription>{tr("Enter the inputs for the current period, then save.", "أدخل المدخلات للفترة الحالية ثم احفظ.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Approval Status Badge */}
            {data?.currentPeriod && (
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{tr("Status", "الحالة")}:</span>
                  {isApproved && (
                    <span className="inline-flex items-center rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600 dark:text-green-500">
                      {tr("Approved", "معتمد")}
                    </span>
                  )}
                  {isSubmitted && (
                    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-500">
                      {tr("Pending Approval", "في انتظار الاعتماد")}
                    </span>
                  )}
                  {isDraft && (
                    <span className="inline-flex items-center rounded-full bg-gray-500/10 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                      {tr("Draft", "مسودة")}
                    </span>
                  )}
                </div>
                {data.approvalContext && (
                  <span className="text-xs text-muted-foreground">
                    {tr("Approval Level", "مستوى الاعتماد")}: {data.approvalContext.orgApprovalLevel}
                  </span>
                )}
              </div>
            )}

            {saveError ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive whitespace-pre-line">
                {saveError}
              </div>
            ) : null}

            {approvalError ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive whitespace-pre-line">
                {approvalError}
              </div>
            ) : null}

            {entity.formula ? (
              <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm">
                <div className="text-xs text-muted-foreground">{tr("Formula", "المعادلة")}</div>
                <div className="mt-1 font-mono text-xs">{entity.formula}</div>
              </div>
            ) : null}

            {staticVariables.length ? (
              <div className="space-y-2">
                <div className="text-sm font-semibold">{t("staticInputs")}</div>
                <div className="grid gap-3 md:grid-cols-2">
                  {staticVariables.map((v) => (
                    <div key={v.id} className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                      <div className="text-sm font-medium">{df(v.displayName, v.nameAr)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{v.code}</div>
                      <div className="mt-2 text-sm">{typeof v.staticValue === "number" ? formatNumber(v.staticValue) : "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {fillableVariables.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {fillableVariables.map((v: EntityVariableRow) => (
                  <div key={v.id} className="space-y-2">
                    <Label htmlFor={`var-${v.id}`}>{df(v.displayName, v.nameAr)}</Label>
                    <Input
                      id={`var-${v.id}`}
                      value={valuesByVariableId[v.id] ?? ""}
                      onChange={(e) => setValuesByVariableId((p) => ({ ...p, [v.id]: e.target.value }))}
                      className="bg-card"
                      placeholder={v.dataType === "PERCENTAGE" ? "0-100" : "0"}
                      disabled={!canEditPeriod}
                    />
                    <div className="text-xs text-muted-foreground">{v.code}</div>
                  </div>
                ))}
              </div>
            ) : needsManualValue ? (
              <div className="space-y-2">
                <Label htmlFor="manualValue">{t("value")}</Label>
                <Input id="manualValue" value={manualValue} onChange={(e) => setManualValue(e.target.value)} className="bg-card" disabled={!canEditPeriod} />
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                {tr("No editable inputs for this KPI.", "لا توجد مدخلات قابلة للتعديل لهذا المؤشر.")}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="note">{tr("Note", "ملاحظة")}</Label>
              <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} className="bg-card" disabled={!canEditPeriod} />
            </div>

            {/* Action Buttons */}
            {hasFillableInputs && (
              <div className="flex items-center justify-between gap-2 pt-2 border-t">
                {!canEditValues ? (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-500 flex-1">
                    {tr("Read-only: You can view this entity but cannot edit its values.", "للقراءة فقط: يمكنك عرض هذا الكيان لكن لا يمكنك تعديل قيمه.")}
                  </div>
                ) : isSubmitted ? (
                <div className="flex items-center justify-between w-full">
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-500">
                    {tr("Locked for approval. Contact an approver to make changes.", "مقفل للاعتماد. اتصل بالمعتمد لإجراء تغييرات.")}
                  </div>
                  {canApprove && (
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="destructive" onClick={() => void handleReject()} disabled={rejecting}>
                        {rejecting ? (
                          <>
                            <Loader2 className="me-2 h-4 w-4 animate-spin" />
                            {tr("Rejecting", "جارٍ الرفض")}
                          </>
                        ) : (
                          tr("Reject", "رفض")
                        )}
                      </Button>
                      <Button type="button" onClick={() => void handleApprove()} disabled={approving}>
                        {approving ? (
                          <>
                            <Loader2 className="me-2 h-4 w-4 animate-spin" />
                            {tr("Approving", "جارٍ الاعتماد")}
                          </>
                        ) : (
                          tr("Approve", "اعتماد")
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-end gap-2 w-full">
                  {canEditPeriod && (
                    <>
                      <Button type="button" variant="outline" onClick={() => void handleSaveDraft()} disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="me-2 h-4 w-4 animate-spin" />
                            {t("saving")}
                          </>
                        ) : (
                          t("save")
                        )}
                      </Button>
                      <Button type="button" onClick={() => void handleSubmitForApproval()} disabled={submitting}>
                        {submitting ? (
                          <>
                            <Loader2 className="me-2 h-4 w-4 animate-spin" />
                            {tr("Submitting", "جارٍ الإرسال")}
                          </>
                        ) : (
                          tr("Submit for Approval", "إرسال للاعتماد")
                        )}
                      </Button>
                    </>
                  )}
                </div>
              )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Referenced Entities Section */}
      {entity.formula && referencedEntities.length > 0 && (
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{tr("Formula Dependencies", "اعتماديات الصيغة")}</CardTitle>
            <CardDescription>
              {tr("Click on any entity below to view its details.", "انقر على أي كيان أدناه لعرض تفاصيله.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {referencedEntities.map((ref) => {
                const refValue = latestEntityValue(ref.latestValue);
                const refUnit = df(ref.unit, ref.unitAr);
                return (
                  <Link
                    key={ref.id}
                    href={`/${locale}/entities/${ref.entityType.code.toLowerCase()}/${ref.id}`}
                    className="block group"
                  >
                    <Card className="h-full transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer border-2 hover:border-primary/50">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-primary/70 uppercase tracking-wide">
                              {df(ref.entityType.name, ref.entityType.nameAr)}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {df(ref.title, ref.titleAr)}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground font-mono">
                              {ref.key}
                            </div>
                          </div>
                          <div className="shrink-0">
                            <svg 
                              className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <KpiGauge 
                          value={refValue} 
                          target={ref.targetValue} 
                          unit={refUnit || undefined}
                          height={160}
                          withCard={false}
                        />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (open) setDeleteError(null);
        }}
      >
        <DialogContent className="border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle>{t("delete")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">{tr("This will remove the item.", "سيتم حذف العنصر.")}</DialogDescription>
          </DialogHeader>

          {deleteError ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive whitespace-pre-line">
              {deleteError}
            </div>
          ) : null}

          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
            <p className="font-semibold">{pageTitle}</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? t("deleting") : t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
