"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/providers/locale-provider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/providers/auth-provider";
import { EChart } from "@/components/charts/echart";
import type { EChartsOption } from "echarts";
import { useEffect, useMemo, useState } from "react";
import { KpiGauge } from "@/components/charts/kpi-gauge";
import { deleteOrgAdminKpi, getOrgKpiDetail, submitOrgKpiValues } from "@/actions/kpis";

export default function KPIDetailPage() {
  const params = useParams<{ kpiId: string }>();
  const { locale, tr } = useLocale();
  const { user, loading: sessionLoading } = useAuth();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (user as any)?.role as string | undefined;
  const [data, setData] = useState<Awaited<ReturnType<typeof getOrgKpiDetail>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [note, setNote] = useState("");
  const [valuesByVariableId, setValuesByVariableId] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    if (sessionLoading) return;
    setLoading(true);

    (async () => {
      try {
        const result = await getOrgKpiDetail({ kpiId: params.kpiId });
        if (!mounted) return;
        setData(result);

        if (result?.currentPeriod?.note) setNote(result.currentPeriod.note);

        const preset: Record<string, string> = {};
        const vv = result?.currentPeriod?.variableValues ?? [];
        for (const row of vv) preset[row.kpiVariableId] = String(row.value);
        setValuesByVariableId(preset);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [params.kpiId, sessionLoading]);

  const canAdmin = (userRole === "ADMIN" && data?.canAdmin) || false;

  const kpi = data?.kpi ?? null;

  const currentValue = useMemo(() => {
    if (!data?.currentPeriod) return data?.latest?.calculatedValue ?? null;
    if (typeof data.currentPeriod.calculatedValue === "number") return data.currentPeriod.calculatedValue;
    return data.latest?.calculatedValue ?? null;
  }, [data?.currentPeriod, data?.latest?.calculatedValue]);

  const fillableVariables = useMemo(() => {
    return (kpi?.variables ?? []).filter((v) => !v.isStatic);
  }, [kpi?.variables]);

  const staticVariables = useMemo(() => {
    return (kpi?.variables ?? []).filter((v) => v.isStatic);
  }, [kpi?.variables]);

  const trendOption = useMemo<EChartsOption>(() => {
    const points = (kpi?.values ?? []).slice().reverse();
    const labels = points.map((p) => p.periodEnd.toISOString().slice(0, 10));
    const values = points.map((p) => p.calculatedValue ?? 0);
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
            data: [{ yAxis: kpi?.targetValue ?? 0, name: "Target" }],
          },
        },
      ],
    };
  }, [kpi?.targetValue, kpi?.values]);

  async function handleSubmit() {
    if (!kpi) return;
    setError(null);
    setIssues(null);
    setSubmitting(true);
    try {
      const values: Record<string, number> = {};
      for (const v of fillableVariables) {
        const raw = valuesByVariableId[v.id] ?? "";
        if (raw.trim().length === 0) continue;
        const num = Number(raw);
        values[v.id] = num;
      }

      const result = await submitOrgKpiValues({
        kpiId: kpi.id,
        note: note.trim() || undefined,
        values,
      });

      if (!result.success) {
        setError(result.error);
        const formatted = Array.isArray(result.issues)
          ? result.issues
              .map((i) => {
                const path = Array.isArray(i.path) ? i.path.join(".") : "";
                return path ? `${path}: ${i.message}` : i.message;
              })
              .join("\n")
          : null;
        if (formatted) setIssues(formatted);
        return;
      }

      const refreshed = await getOrgKpiDetail({ kpiId: kpi.id });
      setData(refreshed);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!kpi) return;
    setDeleteError(null);
    setSubmitting(true);
    try {
      const result = await deleteOrgAdminKpi({ kpiId: kpi.id });
      if (!result.success) {
        setDeleteError(result.error);
        return;
      }
      window.location.href = `/${locale}/kpis`;
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{tr("Loading…", "جارٍ التحميل…")}</p>
      </div>
    );
  }

  if (!kpi) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{tr("KPI not found.", "المؤشر غير موجود.")}</p>
        <Link href={`/${locale}/kpis`} className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">
          {tr("Back to KPIs", "العودة إلى المؤشرات")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={kpi.name}
        subtitle={`${tr("Linked to", "مرتبط بـ")}: ${(kpi.primaryNode?.nodeType?.displayName ?? tr("Type", "النوع"))} • ${kpi.primaryNode?.name ?? "—"}`}
        icon={<Icon name="tabler:chart-line" className="h-5 w-5" />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon name="tabler:target-arrow" className="h-4 w-4 text-slate-100" />
                  {tr("Current vs target", "الحالي مقابل المستهدف")}
                </CardTitle>
                <CardDescription className="text-slate-200">{tr("At-a-glance KPI performance.", "نظرة سريعة على أداء المؤشر.")}</CardDescription>
              </div>
              {canAdmin ? (
                <div className="flex items-center gap-2">
                  <Button asChild className="bg-white/10 text-white hover:bg-white/15">
                    <Link href={`/${locale}/kpis/${kpi.id}/edit`}>{tr("Edit", "تعديل")}</Link>
                  </Button>
                  <Button variant="destructive" onClick={() => setDeleteOpen(true)} disabled={submitting}>
                    {tr("Delete", "حذف")}
                  </Button>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3">
              <KpiGauge value={currentValue} target={kpi.targetValue} unit={kpi.unit ?? undefined} height={190} />
            </div>

            <div className="grid gap-3">
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="text-xs text-slate-200">{tr("Current", "الحالي")}</p>
                <p className="text-2xl font-semibold text-white" dir="ltr">
                  {currentValue ?? "—"}
                  {kpi.unit ?? ""}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="text-xs text-slate-200">{tr("Target", "المستهدف")}</p>
                <p className="text-2xl font-semibold text-white" dir="ltr">
                  {kpi.targetValue ?? "—"}
                  {kpi.unit ?? ""}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="tabler:chart-line" className="h-4 w-4 text-slate-100" />
              {tr("Trend", "الاتجاه")}
            </CardTitle>
            <CardDescription className="text-slate-200">{tr("Latest periods.", "آخر الفترات.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-4">
              <EChart option={trendOption} height={280} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon name="tabler:edit" className="h-4 w-4 text-slate-100" />
            {tr("Update inputs", "تحديث المدخلات")}
          </CardTitle>
          <CardDescription className="text-slate-200">
            {kpi.formula ? tr("Calculated using formula.", "يتم الاحتساب باستخدام المعادلة.") : tr("Formula is empty: the result is the sum of inputs.", "المعادلة فارغة: النتيجة هي مجموع المدخلات.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 whitespace-pre-wrap">{error}</div> : null}
          {issues ? <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 whitespace-pre-wrap">{issues}</div> : null}

          {staticVariables.length ? (
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Static inputs", "مدخلات ثابتة")}</p>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {staticVariables.map((v) => (
                  <div key={v.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                    <p className="text-xs text-slate-200">{v.displayName}</p>
                    <p className="text-sm text-white" dir="ltr">
                      {v.staticValue ?? 0}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {fillableVariables.map((v) => (
              <div key={v.id} className="grid gap-2">
                <Label>
                  {v.displayName}
                  {v.isRequired ? " *" : ""}
                </Label>
                <Input
                  value={valuesByVariableId[v.id] ?? ""}
                  onChange={(e) => setValuesByVariableId((p) => ({ ...p, [v.id]: e.target.value }))}
                  inputMode="decimal"
                  className="border-white/10 bg-black/20 text-white placeholder:text-slate-400"
                />
                <p className="text-xs text-slate-300" dir="ltr">
                  {v.code}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-2">
            <Label>{tr("Note (optional)", "ملاحظة (اختياري)")}</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="border-white/10 bg-black/20 text-white placeholder:text-slate-400"
              placeholder={tr("Add context…", "أضف سياقًا…")}
            />
          </div>

          <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={handleSubmit} disabled={submitting}>
            {tr("Save", "حفظ")}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{tr("Delete KPI", "حذف المؤشر")}</DialogTitle>
            <DialogDescription>{kpi.name}</DialogDescription>
          </DialogHeader>

          {deleteError ? (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 whitespace-pre-wrap">{deleteError}</div>
          ) : null}

          <p className="text-sm text-slate-200">{tr("This will permanently delete the KPI.", "سيتم حذف المؤشر نهائيًا.")}</p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={submitting}>
              {tr("Cancel", "إلغاء")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {tr("Delete", "حذف")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
