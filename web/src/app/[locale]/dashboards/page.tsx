"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { StatusBadge } from "@/components/rag-badge";
import { AreaLine, Bar, Donut } from "@/components/charts/dashboard-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMyDashboardData } from "@/actions/dashboard";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type { Status as UiStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type DashboardData = Awaited<ReturnType<typeof getMyDashboardData>>;

function pillForKpiStatus(status: string) {
  if (status === "NO_DATA") return "border-border bg-muted/30 text-muted-foreground";
  if (status === "DRAFT") return "border-amber-500/25 bg-amber-500/10 text-amber-100";
  if (status === "SUBMITTED") return "border-indigo-500/25 bg-indigo-500/10 text-indigo-100";
  if (status === "APPROVED" || status === "LOCKED") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-100";
  return "border-border bg-muted/30 text-muted-foreground";
}

function formatNumber(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const hasFraction = Math.abs(value % 1) > 0;
  return hasFraction ? value.toFixed(2) : String(value);
}

export default function DashboardsPage() {
  const { locale, t, tr, nodeTypeLabel, kpiValueStatusLabel, df, dir } = useLocale();
  const { user, loading: sessionLoading } = useAuth();
  const isRtl = dir === "rtl";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      setLoading(false);
      setError(null);
      setData(null);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const result = await getMyDashboardData();
        if (!mounted) return;
        setData(result);
      } catch (e: unknown) {
        if (!mounted) return;
        setData(null);
        setError(e instanceof Error ? e.message : t("dashboardFailedToLoad"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [sessionLoading, t, user]);

  const canManageResponsibilities = useMemo(() => {
    const role = data?.user.role;
    return Boolean(role) && role !== "EMPLOYEE" && role !== "SUPER_ADMIN";
  }, [data?.user.role]);

  const isAdmin = useMemo(() => data?.user.role === "ADMIN", [data?.user.role]);

  const kpiStatusCategories = useMemo(
    () => [t("statusNoData"), t("statusDraft"), t("statusSubmitted"), t("statusApproved")],
    [t],
  );

  const kpiStatusValues = useMemo(() => {
    if (!data) return [0, 0, 0, 0];
    const noData = data.kpiStatusCounts.NO_DATA ?? 0;
    const draft = data.kpiStatusCounts.DRAFT ?? 0;
    const submitted = data.kpiStatusCounts.SUBMITTED ?? 0;
    const approved = (data.kpiStatusCounts.APPROVED ?? 0) + (data.kpiStatusCounts.LOCKED ?? 0);
    return [noData, draft, submitted, approved];
  }, [data]);

  const ownedStatusDonut = useMemo(() => {
    if (!data) return [] as { name: string; value: number; color: string }[];
    const counts = { PLANNED: 0, ACTIVE: 0, AT_RISK: 0, COMPLETED: 0 };
    for (const it of data.ownedItems ?? []) {
      const s = String(it.status);
      if (s === "PLANNED") counts.PLANNED += 1;
      else if (s === "ACTIVE") counts.ACTIVE += 1;
      else if (s === "AT_RISK") counts.AT_RISK += 1;
      else if (s === "COMPLETED") counts.COMPLETED += 1;
    }
    return [
      { name: t("planned"), value: counts.PLANNED, color: "#94a3b8" },
      { name: t("active"), value: counts.ACTIVE, color: "#60a5fa" },
      { name: t("atRisk"), value: counts.AT_RISK, color: "#fb7185" },
      { name: t("completed"), value: counts.COMPLETED, color: "#34d399" },
    ].filter((x) => x.value > 0);
  }, [data, t]);

  const kpiCompletionDonut = useMemo(() => {
    if (!data) return [] as { name: string; value: number; color: string }[];
    const b = data.kpiCompletion?.buckets;
    if (!b) return [];
    return [
      { name: t("offTrack"), value: b.LT_60 ?? 0, color: "#fb7185" },
      { name: t("atRisk"), value: b.LT_90 ?? 0, color: "#fbbf24" },
      { name: t("onTrack"), value: b.LT_110 ?? 0, color: "#60a5fa" },
      { name: t("exceeded"), value: b.GTE_110 ?? 0, color: "#34d399" },
    ].filter((x) => x.value > 0);
  }, [data, tr]);

  const completionAvgLabel = useMemo(() => {
    const v = data?.kpiCompletion?.avgPercent;
    if (typeof v !== "number" || !Number.isFinite(v)) return "—";
    return `${Math.round(v)}%`;
  }, [data?.kpiCompletion?.avgPercent]);

  const topKpis = useMemo(() => (data?.kpis ?? []).slice(0, 10), [data?.kpis]);
  const topWork = useMemo(() => (data?.workItems ?? []).slice(0, 8), [data?.workItems]);
  const topOwned = useMemo(() => (data?.ownedItems ?? []).slice(0, 8), [data?.ownedItems]);

  const nodeTypeIconByCode: Record<string, string> = {
    strategy: "tabler:target-arrow",
    pillar: "tabler:columns-3",
    objective: "tabler:flag-3",
    initiative: "tabler:rocket",
    project: "tabler:briefcase-2",
    task: "tabler:checklist",
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("dashboards")}
        subtitle={isAdmin ? t("overviewAdminSubtitle") : t("overviewUserSubtitle")}
        icon={<Icon name="tabler:layout-dashboard" className="h-5 w-5" />}
        actions={
          data?.canApprove ? (
            <Button asChild variant="secondary">
              <Link href={`/${locale}/approvals`}>{t("openApprovals")}</Link>
            </Button>
          ) : null
        }
      />

      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive whitespace-pre-wrap">{error}</div>
      ) : null}

      {sessionLoading || loading ? (
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t("loading")}</CardTitle>
            <CardDescription>{t("pleaseWait")}</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      ) : !data ? (
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardContent className="p-6 text-sm text-muted-foreground">{t("noDashboardData")}</CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card className="bg-card/70 backdrop-blur shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2">
                    <Icon name="tabler:chart-line" className="h-4 w-4" />
                    {t("kpis")}
                  </span>
                </CardDescription>
                <CardTitle className="text-3xl">{data.summary.kpisTotal}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {t("statusDraft")}: {data.summary.kpisDraft} • {t("statusSubmitted")}: {data.summary.kpisSubmitted}
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2">
                    <Icon name="tabler:circle-check" className="h-4 w-4" />
                    {t("statusApproved")}
                  </span>
                </CardDescription>
                <CardTitle className="text-3xl">{data.summary.kpisApproved}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {t("statusNoData")}: {data.summary.kpisNoData}
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2">
                    <Icon name="tabler:user-check" className="h-4 w-4" />
                    {t("responsibilities")}
                  </span>
                </CardDescription>
                <CardTitle className="text-3xl">{data.summary.scopesTotal}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">{t("cascadingScopes")}</CardContent>
            </Card>

            {!isAdmin ? (
              <Card className="bg-card/70 backdrop-blur shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2">
                      <Icon name="tabler:checklist" className="h-4 w-4" />
                      {t("assigned")}
                    </span>
                  </CardDescription>
                  <CardTitle className="text-3xl">{data.summary.workTotal}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">{t("workItems")}</CardContent>
              </Card>
            ) : (
              <Card className="bg-card/70 backdrop-blur shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2">
                      <Icon name="tabler:percentage" className="h-4 w-4" />
                      {t("avgCompletion")}
                    </span>
                  </CardDescription>
                  <CardTitle className="text-3xl">{completionAvgLabel}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  {t("kpisWithTargets")}: {data.kpiCompletion.totalWithTargets}
                </CardContent>
              </Card>
            )}

            <Card className="bg-card/70 backdrop-blur shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2">
                    <Icon name="tabler:crown" className="h-4 w-4" />
                    {t("owned")}
                  </span>
                </CardDescription>
                <CardTitle className="text-3xl">{data.summary.ownedTotal}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {data.canApprove
                  ? `${t("pendingApprovals")}: ${data.summary.approvalsPending}`
                  : `${t("statusApproved")}: ${data.org.approvalLevel}`}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-4">
            <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-3">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base">{t("kpiPipeline")}</CardTitle>
                  <CardDescription>{t("kpiPipelineDesc")}</CardDescription>
                </div>
                <Button asChild variant="ghost" className="text-primary hover:text-primary">
                  <Link href={`/${locale}/kpis`}>{t("openKpis")}</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <Bar categories={kpiStatusCategories} values={kpiStatusValues} color="#60a5fa" />
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-1">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">{t("kpiCompletion")}</CardTitle>
                <CardDescription>{t("kpiCompletionDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {kpiCompletionDonut.length ? (
                  <div className="space-y-3">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{t("average")}</p>
                        <p className="text-2xl font-semibold" dir="ltr">
                          {completionAvgLabel}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-border bg-muted/30 text-muted-foreground">
                        {t("tracked")}: {data.kpiCompletion.totalWithTargets}
                      </Badge>
                    </div>
                    <Donut items={kpiCompletionDonut} height={280} />
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/10 p-6 text-sm text-muted-foreground">
                    {t("noKpiCompletionData")}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-4">
            <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-3">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">{t("kpiActivity")}</CardTitle>
                <CardDescription>{t("kpiActivityDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <AreaLine categories={data.kpiActivity.categories} values={data.kpiActivity.values} color="#a78bfa" />
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-1">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">{t("ownedItemsStatus")}</CardTitle>
                <CardDescription>{t("ownedItemsStatusDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {ownedStatusDonut.length ? (
                  <Donut items={ownedStatusDonut} height={280} />
                ) : (
                  <div className="rounded-xl border border-border bg-muted/10 p-6 text-sm text-muted-foreground">
                    {t("noOwnedItemsFound")}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {!isAdmin ? (
            <section className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-card/70 backdrop-blur shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{t("assignedToYou")}</CardTitle>
                    <CardDescription>{t("upcomingWorkDesc")}</CardDescription>
                  </div>
                  {canManageResponsibilities ? (
                    <Button asChild variant="ghost" className="text-primary hover:text-primary">
                      <Link href={`/${locale}/responsibilities`}>{t("responsibilities")}</Link>
                    </Button>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  {topWork.length ? (
                    topWork.map((it) => (
                      <Link
                        key={it.id}
                        href={`/${locale}/nodes/${it.type.code}/${it.id}`}
                        className="block rounded-xl border border-border bg-background/50 px-4 py-3 transition hover:bg-accent"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <p className="truncate text-sm font-semibold">
                              <span className="me-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: it.color }} />
                              {df(it.name, it.nameAr)}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {df(it.type.displayName, it.type.nameAr)}
                              {it.parent
                                ? ` • ${nodeTypeLabel(it.parent.typeCode, df(it.parent.typeDisplayName, it.parent.typeDisplayNameAr))}: ${df(it.parent.name, it.parent.nameAr)}`
                                : ""}
                            </p>
                          </div>
                          <Badge variant="outline" className="border-border bg-muted/30 text-muted-foreground">
                            {it.assignmentRole}
                          </Badge>
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <Progress value={it.progress} />
                          <span className="text-xs text-muted-foreground" dir="ltr">
                            {it.progress}%
                          </span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-sm text-muted-foreground">
                      {t("noAssignedItems")}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card/70 backdrop-blur shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{t("organizationStructure")}</CardTitle>
                    <CardDescription>{t("browseByTypeDesc")}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.enabledNodeTypes.map((nt) => {
                      const codeLower = String(nt.code).toLowerCase();
                      return (
                        <Link
                          key={nt.id}
                          href={`/${locale}/nodes/${codeLower}`}
                          className="block rounded-xl border border-border bg-background/50 px-4 py-3 transition hover:bg-accent"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{df(nt.displayName, nt.nameAr)}</p>
                              <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                                {t("level")}: {nt.levelOrder}
                              </p>
                            </div>
                            <Icon name={nodeTypeIconByCode[codeLower] ?? "tabler:layers-subtract"} className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : (
            <section>
              <Card className="bg-card/70 backdrop-blur shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{t("organizationStructure")}</CardTitle>
                    <CardDescription>{t("browseByTypeDesc")}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {data.enabledNodeTypes.map((nt) => {
                      const codeLower = String(nt.code).toLowerCase();
                      return (
                        <Link
                          key={nt.id}
                          href={`/${locale}/nodes/${codeLower}`}
                          className="block rounded-xl border border-border bg-background/50 px-4 py-3 transition hover:bg-accent"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{df(nt.displayName, nt.nameAr)}</p>
                              <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                                {t("level")}: {nt.levelOrder}
                              </p>
                            </div>
                            <Icon name={nodeTypeIconByCode[codeLower] ?? "tabler:layers-subtract"} className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          <section className="grid gap-6 lg:grid-cols-3">
            <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-2">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base">{t("kpisYouCanAccess")}</CardTitle>
                  <CardDescription>{t("kpisYouCanAccessDesc")}</CardDescription>
                </div>
                <Button asChild variant="ghost" className="text-primary hover:text-primary">
                  <Link href={`/${locale}/kpis`}>{t("viewAll")}</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all">
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="all">{t("all")}</TabsTrigger>
                    <TabsTrigger value="no-data">{kpiValueStatusLabel("NO_DATA")}</TabsTrigger>
                    <TabsTrigger value="draft">{kpiValueStatusLabel("DRAFT")}</TabsTrigger>
                    <TabsTrigger value="submitted">{kpiValueStatusLabel("SUBMITTED")}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all">
                    <div className="overflow-hidden rounded-xl border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className={cn(isRtl && "text-right")}>{t("kpi")}</TableHead>
                            <TableHead className={cn(isRtl && "text-right")}>{t("latest")}</TableHead>
                            <TableHead className={cn(isRtl && "text-right")}>{t("target")}</TableHead>
                            <TableHead className={cn(isRtl && "text-right")}>{t("linkedTo")}</TableHead>
                            <TableHead className="text-right">{t("status")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topKpis.map((k) => {
                            const latestStatus = k.latest?.status ?? "NO_DATA";
                            const unitLabel = df(k.unit, k.unitAr);
                            return (
                              <TableRow key={k.id} className="hover:bg-card/40">
                                <TableCell className={cn("font-medium", isRtl && "text-right")}>
                                  <Link href={`/${locale}/kpis/${k.id}`} className="block truncate hover:underline">
                                    {df(k.name, k.nameAr)}
                                  </Link>
                                  {unitLabel ? <span className="ms-2 text-xs text-muted-foreground">({unitLabel})</span> : null}
                                </TableCell>
                                <TableCell className={cn("text-muted-foreground", isRtl && "text-right")} dir="ltr">
                                  {formatNumber(k.latest?.calculatedValue)}
                                </TableCell>
                                <TableCell className={cn("text-muted-foreground", isRtl && "text-right")} dir="ltr">
                                  {formatNumber(k.targetValue)}
                                </TableCell>
                                <TableCell className={cn("text-muted-foreground", isRtl && "text-right", "max-w-[280px] truncate")}>
                                  {nodeTypeLabel(k.primary.typeCode, df(k.primary.typeDisplayName, k.primary.typeDisplayNameAr))} •{" "}
                                  {df(k.primary.name, k.primary.nameAr)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="outline" className={pillForKpiStatus(latestStatus)}>
                                    {kpiValueStatusLabel(latestStatus)}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {topKpis.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                                {t("noKpisFound")}
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {(
                    [
                      { key: "no-data", status: "NO_DATA" },
                      { key: "draft", status: "DRAFT" },
                      { key: "submitted", status: "SUBMITTED" },
                    ] as const
                  ).map((tab) => (
                    <TabsContent key={tab.key} value={tab.key}>
                      <div className="grid gap-3">
                        {(data.kpis ?? [])
                          .filter((k) => (k.latest?.status ?? "NO_DATA") === tab.status)
                          .slice(0, 10)
                          .map((k) => (
                            <Link
                              key={k.id}
                              href={`/${locale}/kpis/${k.id}`}
                              className="block rounded-xl border border-border bg-background/50 px-4 py-3 transition hover:bg-accent"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold">{df(k.name, k.nameAr)}</p>
                                  <p className="mt-1 truncate text-xs text-muted-foreground">
                                    {nodeTypeLabel(k.primary.typeCode, df(k.primary.typeDisplayName, k.primary.typeDisplayNameAr))} •{" "}
                                    {df(k.primary.name, k.primary.nameAr)}
                                  </p>
                                </div>
                                <Badge variant="outline" className={pillForKpiStatus(k.latest?.status ?? "NO_DATA")}>
                                  {kpiValueStatusLabel(tab.status)}
                                </Badge>
                              </div>
                            </Link>
                          ))}

                        {(data.kpis ?? []).filter((k) => (k.latest?.status ?? "NO_DATA") === tab.status).length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-sm text-muted-foreground">
                            {t("noItemsInView")}
                          </div>
                        ) : null}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base">{t("ownedByYou")}</CardTitle>
                  <CardDescription>{t("ownedByYouDesc")}</CardDescription>
                </div>
                <Badge variant="outline" className="border-border bg-muted/30">{data.summary.ownedTotal}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {topOwned.length ? (
                  topOwned.map((it) => (
                    <Link
                      key={it.id}
                      href={`/${locale}/nodes/${it.type.code}/${it.id}`}
                      className="block rounded-xl border border-border bg-background/50 px-4 py-3 transition hover:bg-accent"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            <span className="me-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: it.color }} />
                            {df(it.name, it.nameAr)}
                          </p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {df(it.type.displayName, it.type.nameAr)}
                            {it.parent
                              ? ` • ${nodeTypeLabel(it.parent.typeCode, df(it.parent.typeDisplayName, it.parent.typeDisplayNameAr))}: ${df(it.parent.name, it.parent.nameAr)}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <StatusBadge status={it.status as unknown as UiStatus} />
                          <span className="text-xs text-muted-foreground" dir="ltr">
                            {it.progress}%
                          </span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <Progress value={it.progress} />
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-sm text-muted-foreground">
                    {t("noItemsYet")}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("cascadingResponsibilities")}</h2>
              {canManageResponsibilities ? (
                <Button asChild variant="outline">
                  <Link href={`/${locale}/responsibilities`}>{t("review")}</Link>
                </Button>
              ) : null}
            </div>

            {data.scopes.length ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.scopes.map((s) => (
                  <Card key={s.root.id} className="bg-card/70 backdrop-blur shadow-sm">
                    <CardHeader className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.root.color }} />
                            <Link href={`/${locale}/nodes/${s.root.type.code}/${s.root.id}`} className="truncate hover:underline">
                              {df(s.root.name, s.root.nameAr)}
                            </Link>
                          </CardTitle>
                          <CardDescription className="truncate">
                            {df(s.root.type.displayName, s.root.type.nameAr)} • {t("kpis")}: {s.kpisCount}
                          </CardDescription>
                        </div>
                        <StatusBadge status={s.root.status as unknown as UiStatus} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-border bg-muted/30">
                          {t("inScope")}: {s.counts.total}
                        </Badge>
                        {s.counts.atRisk ? (
                          <Badge variant="outline" className="border-rose-500/25 bg-rose-500/10 text-rose-100">
                            {t("atRisk")}: {s.counts.atRisk}
                          </Badge>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Progress value={s.root.progress} />
                      {s.atRiskPreview.length ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground">{t("atRiskPreview")}</p>
                          <div className="space-y-2">
                            {s.atRiskPreview.map((x) => (
                              <Link
                                key={x.id}
                                href={`/${locale}/nodes/${x.type.code}/${x.id}`}
                                className="block rounded-lg border border-border bg-background/50 px-3 py-2 transition hover:bg-accent"
                              >
                                <p className="truncate text-sm font-semibold">
                                  <span className="me-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: x.color }} />
                                  {df(x.name, x.nameAr)}
                                </p>
                                <p className="mt-1 truncate text-xs text-muted-foreground">
                                  {df(x.type.displayName, x.type.nameAr)} • {t("progress")}: {x.progress}%
                                </p>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                          {t("noAtRiskItemsInScope")}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/10 p-8 text-sm text-muted-foreground">
                {t("noResponsibilitiesFound")}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
