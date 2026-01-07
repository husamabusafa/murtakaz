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
import {
  approveOrgKpiValues,
  deleteOrgAdminKpi,
  getOrgKpiDetail,
  requestChangesForOrgKpiValues,
  saveOrgKpiValuesDraft,
  submitOrgKpiValuesForApproval,
} from "@/actions/kpis";
import { Loader2 } from "lucide-react";

export default function KPIDetailPage() {
  const params = useParams<{ kpiId: string }>();
  const { t, locale, kpiValueStatusLabel, formatDate, formatNumber, df } = useLocale();
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
  const [requestChangesOpen, setRequestChangesOpen] = useState(false);
  const [requestChangesMessage, setRequestChangesMessage] = useState("");

  const [note, setNote] = useState("");
  const [valuesByVariableId, setValuesByVariableId] = useState<Record<string, string>>({});
  const [manualValue, setManualValue] = useState("");

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
        if (typeof (result as { currentPeriod?: { calculatedValue?: number | null } | null })?.currentPeriod?.calculatedValue === "number") {
          setManualValue(String((result as { currentPeriod?: { calculatedValue?: number | null } | null })?.currentPeriod?.calculatedValue ?? ""));
        }

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
  const canApprove = data?.canApprove || false;

  const kpi = data?.kpi ?? null;

  const currentValue = useMemo(() => {
    if (!data?.currentPeriod) return data?.latest?.calculatedValue ?? null;
    if (typeof data.currentPeriod.calculatedValue === "number") return data.currentPeriod.calculatedValue;
    return data.latest?.calculatedValue ?? null;
  }, [data?.currentPeriod, data?.latest?.calculatedValue]);

  const fillableVariables = useMemo(() => {
    return (kpi?.variables ?? []).filter((v) => !v.isStatic);
  }, [kpi?.variables]);

  const periodStatus = String(data?.currentPeriod?.status ?? "DRAFT");
  const lockedForUser = !canApprove && ["SUBMITTED", "APPROVED", "LOCKED"].includes(periodStatus);

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
            data: [{ yAxis: kpi?.targetValue ?? 0, name: t("target") }],
          },
        },
      ],
    };
  }, [kpi?.targetValue, kpi?.values, t]);

  function buildPayload() {
    if (!kpi) return null;

    const values: Record<string, number> = {};
    for (const v of fillableVariables) {
      const raw = valuesByVariableId[v.id] ?? "";
      if (raw.trim().length === 0) continue;
      const num = Number(raw);
      values[v.id] = num;
    }

    const hasFillable = fillableVariables.length > 0;
    const payload: {
      kpiId: string;
      note?: string;
      values: Record<string, number>;
      manualValue?: number;
    } = {
      kpiId: kpi.id,
      note: note.trim() || undefined,
      values,
    };

    if (!hasFillable) {
      const mv = manualValue.trim();
      if (mv.length > 0) payload.manualValue = Number(mv);
    }

    return payload;
  }

  async function handleSaveDraft() {
    if (!kpi) return;
    setError(null);
    setIssues(null);
    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (!payload) return;

      const result = await saveOrgKpiValuesDraft(payload);

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

  async function handleRequestChanges() {
    if (!kpi) return;
    setError(null);
    setIssues(null);
    setSubmitting(true);
    try {
      const result = await requestChangesForOrgKpiValues({ kpiId: kpi.id, message: requestChangesMessage.trim() });
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
      setRequestChangesOpen(false);
      setRequestChangesMessage("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to request changes");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitForApproval() {
    if (!kpi) return;
    setError(null);
    setIssues(null);
    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (!payload) return;

      const result = await submitOrgKpiValuesForApproval(payload);
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
      setError(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    if (!kpi) return;
    setError(null);
    setIssues(null);
    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (!payload) return;

      const result = await approveOrgKpiValues(payload);
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
      setError(e instanceof Error ? e.message : "Failed to approve");
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
        <p className="text-sm text-slate-200">{t("loadingEllipsis")}</p>
      </div>
    );
  }

  if (!kpi) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{t("kpiNotFound")}</p>
        <Link href={`/${locale}/kpis`} className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">
          {t("backToKpis")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={df(kpi.name, kpi.nameAr)}
        subtitle={`${t("linkedTo")}: ${df(kpi.primaryNode?.nodeType?.displayName, kpi.primaryNode?.nodeType?.nameAr) || t("type")} • ${df(kpi.primaryNode?.name, kpi.primaryNode?.nameAr) || "—"}`}
        icon={<Icon name="tabler:chart-line" className="h-5 w-5" />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon name="tabler:target-arrow" className="h-4 w-4 text-slate-100" />
                  {t("currentVsTarget")}
                </CardTitle>
                <CardDescription className="text-slate-200">{t("atAGlanceKpiPerformanceDesc")}</CardDescription>
              </div>
              {canAdmin ? (
                <div className="flex items-center gap-2">
                  <Button asChild className="bg-white/10 text-white hover:bg-white/15">
                    <Link href={`/${locale}/kpis/${kpi.id}/edit`}>{t("edit")}</Link>
                  </Button>
                  <Button variant="destructive" onClick={() => setDeleteOpen(true)} disabled={submitting}>
                    {submitting ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("working")}
                      </span>
                    ) : (
                      t("delete")
                    )}
                  </Button>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3">
              <KpiGauge value={currentValue} target={kpi.targetValue} unit={df(kpi.unit, kpi.unitAr) || undefined} height={190} />
            </div>

            <div className="grid gap-3">
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="text-xs text-slate-200">{t("current")}</p>
                <p className="text-2xl font-semibold text-white" dir="ltr">
                  {formatNumber(currentValue)}
                  {df(kpi.unit, kpi.unitAr)}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="text-xs text-slate-200">{t("target")}</p>
                <p className="text-2xl font-semibold text-white" dir="ltr">
                  {formatNumber(kpi.targetValue)}
                  {df(kpi.unit, kpi.unitAr)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="tabler:chart-line" className="h-4 w-4 text-slate-100" />
              {t("trend")}
            </CardTitle>
            <CardDescription className="text-slate-200">{t("latestPeriods")}</CardDescription>
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
            {t("updateInputs")}
          </CardTitle>
          <CardDescription className="text-slate-200">
            {kpi.formula ? t("calculatedUsingFormulaDesc") : t("formulaEmptyDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{t("status")}</p>
            <p className="mt-1">{kpiValueStatusLabel(periodStatus)}</p>
            {data?.currentPeriod?.changesRequestedMessage ? (
              <div className="mt-3 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2">
                <p className="text-xs font-semibold text-orange-100">{t("requestedChanges")}</p>
                <p className="mt-1 text-sm text-orange-50 whitespace-pre-wrap">{data.currentPeriod.changesRequestedMessage}</p>
                <p className="mt-1 text-xs text-orange-100/80">
                  {(data.currentPeriod.changesRequestedByUser?.name ?? "—")}{" "}
                  {data.currentPeriod.changesRequestedAt ? `• ${formatDate(data.currentPeriod.changesRequestedAt, { dateStyle: "medium", timeStyle: "short" })}` : ""}
                </p>
              </div>
            ) : null}
            {data?.currentPeriod?.submittedAt ? (
              <p className="mt-1 text-xs text-slate-200">
                {t("statusSubmitted")} • {formatDate(data.currentPeriod.submittedAt, { dateStyle: "medium", timeStyle: "short" })} • {data.currentPeriod.submittedByUser?.name ?? "—"}
              </p>
            ) : null}
            {data?.currentPeriod?.approvedAt ? (
              <p className="mt-1 text-xs text-slate-200">
                {t("statusApproved")} • {formatDate(data.currentPeriod.approvedAt, { dateStyle: "medium", timeStyle: "short" })} • {data.currentPeriod.approvedByUser?.name ?? "—"}
              </p>
            ) : null}
            {lockedForUser ? (
              <p className="mt-2 text-xs text-slate-200">
                {t("periodSubmittedForApprovalDesc")}
              </p>
            ) : null}
          </div>

          {error ? <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 whitespace-pre-wrap">{error}</div> : null}
          {issues ? <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 whitespace-pre-wrap">{issues}</div> : null}

          {staticVariables.length ? (
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{t("staticInputs")}</p>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {staticVariables.map((v) => (
                  <div key={v.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                    <p className="text-xs text-slate-200">{df(v.displayName, v.nameAr)}</p>
                    <p className="text-sm text-white" dir="ltr">
                      {formatNumber(v.staticValue)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {fillableVariables.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {fillableVariables.map((v) => (
                <div key={v.id} className="grid gap-2">
                  <Label>
                    {df(v.displayName, v.nameAr)}
                    {v.isRequired ? " *" : ""}
                  </Label>
                  <Input
                    value={valuesByVariableId[v.id] ?? ""}
                    onChange={(e) => setValuesByVariableId((p) => ({ ...p, [v.id]: e.target.value }))}
                    inputMode="decimal"
                    disabled={lockedForUser}
                    className="border-white/10 bg-black/20 text-white placeholder:text-slate-400"
                  />
                  <p className="text-xs text-slate-300" dir="ltr">
                    {v.code}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-2">
              <Label>{t("value")}</Label>
              <Input
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                inputMode="decimal"
                disabled={lockedForUser}
                className="border-white/10 bg-black/20 text-white placeholder:text-slate-400"
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label>{t("noteOptional")}</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={lockedForUser}
              className="border-white/10 bg-black/20 text-white placeholder:text-slate-400"
              placeholder={t("addContextPlaceholder")}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={handleSaveDraft} disabled={submitting || lockedForUser}>
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("saving")}
                </span>
              ) : (
                t("save")
              )}
            </Button>

            {canApprove ? (
              <>
                {periodStatus === "SUBMITTED" ? (
                  <Button
                    variant="outline"
                    className="border-orange-500/40 bg-white/5 text-orange-200 hover:bg-orange-500/15 hover:text-orange-100"
                    onClick={() => {
                      setRequestChangesMessage("");
                      setRequestChangesOpen(true);
                    }}
                    disabled={submitting}
                  >
                    {t("requestChanges")}
                  </Button>
                ) : null}
                <Button className="bg-emerald-500 text-white hover:bg-emerald-600" onClick={handleApprove} disabled={submitting}>
                  {t("approve")}
                </Button>
              </>
            ) : (
              <Button className="bg-orange-500 text-white hover:bg-orange-600" onClick={handleSubmitForApproval} disabled={submitting || lockedForUser}>
                {t("sendForApproval")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={requestChangesOpen} onOpenChange={setRequestChangesOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{t("requestChanges")}</DialogTitle>
            <DialogDescription className="text-slate-200">
              {t("requestChangesExplainDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label>{t("message")}</Label>
            <Textarea
              value={requestChangesMessage}
              onChange={(e) => setRequestChangesMessage(e.target.value)}
              className="border-white/10 bg-black/20 text-white placeholder:text-slate-400"
              placeholder={t("requestChangesExamplePlaceholder")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={() => {
                setRequestChangesOpen(false);
                setRequestChangesMessage("");
              }}
              disabled={submitting}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              className="bg-orange-500 text-white hover:bg-orange-600"
              onClick={handleRequestChanges}
              disabled={submitting || requestChangesMessage.trim().length < 2}
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("sending")}
                </span>
              ) : (
                t("send")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{t("deleteKpi")}</DialogTitle>
            <DialogDescription>{df(kpi.name, kpi.nameAr)}</DialogDescription>
          </DialogHeader>

          {deleteError ? (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 whitespace-pre-wrap">{deleteError}</div>
          ) : null}

          <p className="text-sm text-slate-200">{t("permanentDeleteKpiDesc")}</p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={submitting}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("deleting")}
                </span>
              ) : (
                t("delete")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
