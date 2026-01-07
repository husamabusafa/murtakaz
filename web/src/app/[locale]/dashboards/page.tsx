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
  const { locale, t, tr } = useLocale();
  const { user, loading: sessionLoading } = useAuth();

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
        setError(e instanceof Error ? e.message : tr("Failed to load dashboard.", "فشل تحميل لوحة المعلومات."));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [sessionLoading, tr, user]);

  const canManageResponsibilities = useMemo(() => {
    const role = data?.user.role;
    return Boolean(role) && role !== "EMPLOYEE" && role !== "SUPER_ADMIN";
  }, [data?.user.role]);

  const isAdmin = useMemo(() => data?.user.role === "ADMIN", [data?.user.role]);

  const kpiStatusCategories = useMemo(
    () => [tr("No data", "بلا بيانات"), tr("Draft", "مسودة"), tr("Submitted", "مرسل"), tr("Approved", "معتمد")],
    [tr],
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
      { name: tr("Off track", "خارج المسار"), value: b.LT_60 ?? 0, color: "#fb7185" },
      { name: tr("At risk", "معرّض للخطر"), value: b.LT_90 ?? 0, color: "#fbbf24" },
      { name: tr("On track", "ضمن المسار"), value: b.LT_110 ?? 0, color: "#60a5fa" },
      { name: tr("Exceeded", "متجاوز"), value: b.GTE_110 ?? 0, color: "#34d399" },
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
        subtitle={tr(
          isAdmin
            ? "Organization-wide insights for KPI oversight and execution health."
            : "Personalized insights based on what you own, what is assigned to you, and which KPIs you can access.",
          isAdmin
            ? "مؤشرات عامة للمؤسسة لمتابعة المؤشرات وصحة التنفيذ."
            : "معلومات مخصصة بناءً على ما تملكه وما هو مُسند لك والمؤشرات التي يمكنك الوصول إليها.",
        )}
        icon={<Icon name="tabler:layout-dashboard" className="h-5 w-5" />}
        actions={
          data?.canApprove ? (
            <Button asChild variant="secondary">
              <Link href={`/${locale}/approvals`}>{tr("Open approvals", "فتح الموافقات")}</Link>
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
            <CardTitle className="text-base">{tr("Loading", "جارٍ التحميل")}</CardTitle>
            <CardDescription>{tr("Please wait…", "يرجى الانتظار…")}</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      ) : !data ? (
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardContent className="p-6 text-sm text-muted-foreground">{tr("No dashboard data.", "لا توجد بيانات للوحة المعلومات.")}</CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card className="bg-card/70 backdrop-blur shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2">
                    <Icon name="tabler:chart-line" className="h-4 w-4" />
                    {tr("KPIs", "المؤشرات")}
                  </span>
                </CardDescription>
                <CardTitle className="text-3xl">{data.summary.kpisTotal}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {tr("Draft", "مسودة")}: {data.summary.kpisDraft} • {tr("Submitted", "مرسل")}: {data.summary.kpisSubmitted}
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2">
                    <Icon name="tabler:circle-check" className="h-4 w-4" />
                    {tr("Approved", "معتمد")}
                  </span>
                </CardDescription>
                <CardTitle className="text-3xl">{data.summary.kpisApproved}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {tr("No data", "بلا بيانات")}: {data.summary.kpisNoData}
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2">
                    <Icon name="tabler:user-check" className="h-4 w-4" />
                    {tr("Responsibilities", "المسؤوليات")}
                  </span>
                </CardDescription>
                <CardTitle className="text-3xl">{data.summary.scopesTotal}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">{tr("Cascading scopes", "نطاقات متسلسلة")}</CardContent>
            </Card>

            {!isAdmin ? (
              <Card className="bg-card/70 backdrop-blur shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2">
                      <Icon name="tabler:checklist" className="h-4 w-4" />
                      {tr("Assigned", "مُسند")}
                    </span>
                  </CardDescription>
                  <CardTitle className="text-3xl">{data.summary.workTotal}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">{tr("Work items", "عناصر العمل")}</CardContent>
              </Card>
            ) : (
              <Card className="bg-card/70 backdrop-blur shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2">
                      <Icon name="tabler:percentage" className="h-4 w-4" />
                      {tr("Avg completion", "متوسط الإنجاز")}
                    </span>
                  </CardDescription>
                  <CardTitle className="text-3xl">{completionAvgLabel}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  {tr("KPIs with targets", "مؤشرات لها مستهدف")}: {data.kpiCompletion.totalWithTargets}
                </CardContent>
              </Card>
            )}

            <Card className="bg-card/70 backdrop-blur shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2">
                    <Icon name="tabler:crown" className="h-4 w-4" />
                    {tr("Owned", "مملوك")}
                  </span>
                </CardDescription>
                <CardTitle className="text-3xl">{data.summary.ownedTotal}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {data.canApprove
                  ? `${tr("Pending approvals", "موافقات معلّقة")}: ${data.summary.approvalsPending}`
                  : `${tr("Approval level", "مستوى الاعتماد")}: ${data.org.approvalLevel}`}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-4">
            <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-3">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base">{tr("KPI pipeline", "حالة المؤشرات")}</CardTitle>
                  <CardDescription>{tr("Distribution by latest status.", "توزيع حسب آخر حالة.")}</CardDescription>
                </div>
                <Button asChild variant="ghost" className="text-primary hover:text-primary">
                  <Link href={`/${locale}/kpis`}>{tr("Open KPIs", "فتح المؤشرات")}</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <Bar categories={kpiStatusCategories} values={kpiStatusValues} color="#60a5fa" />
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-1">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">{tr("KPI completion", "إنجاز المؤشرات")}</CardTitle>
                <CardDescription>{tr("Completion vs target across KPIs.", "نسبة الإنجاز مقارنة بالمستهدف عبر المؤشرات.")}</CardDescription>
              </CardHeader>
              <CardContent>
                {kpiCompletionDonut.length ? (
                  <div className="space-y-3">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{tr("Average", "المتوسط")}</p>
                        <p className="text-2xl font-semibold" dir="ltr">
                          {completionAvgLabel}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-border bg-muted/30 text-muted-foreground">
                        {tr("Tracked", "مُتتبّع")}: {data.kpiCompletion.totalWithTargets}
                      </Badge>
                    </div>
                    <Donut items={kpiCompletionDonut} height={280} />
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/10 p-6 text-sm text-muted-foreground">
                    {tr("No completion data (missing targets / values).", "لا توجد بيانات إنجاز (تأكد من وجود مستهدف وقيم).")}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-4">
            <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-3">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">{tr("KPI activity", "نشاط المؤشرات")}</CardTitle>
                <CardDescription>{tr("Recent KPI updates over time.", "تحديثات المؤشرات خلال الفترة الأخيرة.")}</CardDescription>
              </CardHeader>
              <CardContent>
                <AreaLine categories={data.kpiActivity.categories} values={data.kpiActivity.values} color="#a78bfa" />
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-1">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">{tr("Owned items status", "حالة العناصر المملوكة")}</CardTitle>
                <CardDescription>{tr("Overview of execution posture.", "نظرة عامة على وضع التنفيذ.")}</CardDescription>
              </CardHeader>
              <CardContent>
                {ownedStatusDonut.length ? (
                  <Donut items={ownedStatusDonut} height={280} />
                ) : (
                  <div className="rounded-xl border border-border bg-muted/10 p-6 text-sm text-muted-foreground">
                    {tr("No owned items found.", "لا توجد عناصر مملوكة.")}
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
                    <CardTitle className="text-base">{tr("Assigned to you", "المُسند لك")}</CardTitle>
                    <CardDescription>{tr("Upcoming work based on assignments.", "عناصر قادمة بناءً على الإسناد.")}</CardDescription>
                  </div>
                  {canManageResponsibilities ? (
                    <Button asChild variant="ghost" className="text-primary hover:text-primary">
                      <Link href={`/${locale}/responsibilities`}>{tr("Responsibilities", "المسؤوليات")}</Link>
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
                              {it.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {it.type.displayName}
                              {it.parent ? ` • ${it.parent.typeDisplayName}: ${it.parent.name}` : ""}
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
                      {tr("No assigned items yet.", "لا توجد عناصر مُسندة بعد.")}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card/70 backdrop-blur shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{tr("Organization structure", "هيكل المؤسسة")}</CardTitle>
                    <CardDescription>{tr("Browse by type in the configured order.", "استعراض حسب النوع وبالترتيب المفعّل.")}</CardDescription>
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
                              <p className="truncate text-sm font-semibold">{nt.displayName}</p>
                              <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                                {tr("Level", "المستوى")}: {nt.levelOrder}
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
                    <CardTitle className="text-base">{tr("Organization structure", "هيكل المؤسسة")}</CardTitle>
                    <CardDescription>{tr("Browse by type in the configured order.", "استعراض حسب النوع وبالترتيب المفعّل.")}</CardDescription>
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
                              <p className="truncate text-sm font-semibold">{nt.displayName}</p>
                              <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                                {tr("Level", "المستوى")}: {nt.levelOrder}
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
                  <CardTitle className="text-base">{tr("KPIs you can access", "المؤشرات التي يمكنك الوصول إليها")}</CardTitle>
                  <CardDescription>{tr("Latest values, targets, and linked structure.", "آخر القيم والمستهدف والارتباط بالتسلسل.")}</CardDescription>
                </div>
                <Button asChild variant="ghost" className="text-primary hover:text-primary">
                  <Link href={`/${locale}/kpis`}>{tr("View all", "عرض الكل")}</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all">
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="all">{tr("All", "الكل")}</TabsTrigger>
                    <TabsTrigger value="no-data">{tr("No data", "بلا بيانات")}</TabsTrigger>
                    <TabsTrigger value="draft">{tr("Draft", "مسودة")}</TabsTrigger>
                    <TabsTrigger value="submitted">{tr("Submitted", "مرسل")}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all">
                    <div className="overflow-hidden rounded-xl border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>{tr("KPI", "المؤشر")}</TableHead>
                            <TableHead>{tr("Latest", "آخر قيمة")}</TableHead>
                            <TableHead>{t("target")}</TableHead>
                            <TableHead>{tr("Linked to", "مرتبط بـ")}</TableHead>
                            <TableHead className="text-right">{t("status")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topKpis.map((k) => {
                            const latestStatus = k.latest?.status ?? "NO_DATA";
                            return (
                              <TableRow key={k.id} className="hover:bg-card/40">
                                <TableCell className="font-medium">
                                  <Link href={`/${locale}/kpis/${k.id}`} className="hover:underline">
                                    {k.name}
                                  </Link>
                                  {k.unit ? <span className="ms-2 text-xs text-muted-foreground">({k.unit})</span> : null}
                                </TableCell>
                                <TableCell className="text-muted-foreground" dir="ltr">
                                  {formatNumber(k.latest?.calculatedValue)}
                                </TableCell>
                                <TableCell className="text-muted-foreground" dir="ltr">
                                  {formatNumber(k.targetValue)}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {k.primary.typeDisplayName} • {k.primary.name}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="outline" className={pillForKpiStatus(latestStatus)}>
                                    {latestStatus === "NO_DATA" ? tr("No data", "بلا بيانات") : latestStatus}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {topKpis.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                                {tr("No KPIs found.", "لا توجد مؤشرات.")}
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
                                  <p className="truncate text-sm font-semibold">{k.name}</p>
                                  <p className="mt-1 truncate text-xs text-muted-foreground">
                                    {k.primary.typeDisplayName} • {k.primary.name}
                                  </p>
                                </div>
                                <Badge variant="outline" className={pillForKpiStatus(k.latest?.status ?? "NO_DATA")}>
                                  {tab.status === "NO_DATA" ? tr("No data", "بلا بيانات") : tab.status}
                                </Badge>
                              </div>
                            </Link>
                          ))}

                        {(data.kpis ?? []).filter((k) => (k.latest?.status ?? "NO_DATA") === tab.status).length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-sm text-muted-foreground">
                            {tr("No items in this view.", "لا توجد عناصر في هذا العرض.")}
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
                  <CardTitle className="text-base">{tr("Owned by you", "مملوك بواسطةك")}</CardTitle>
                  <CardDescription>{tr("Items where you are marked as the owner.", "عناصر تم تعيينك كمالك لها.")}</CardDescription>
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
                            {it.name}
                          </p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {it.type.displayName}
                            {it.parent ? ` • ${it.parent.typeDisplayName}: ${it.parent.name}` : ""}
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
                    {tr("No owned items yet.", "لا توجد عناصر مملوكة بعد.")}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{tr("Your cascading responsibilities", "مسؤولياتك المتسلسلة")}</h2>
              {canManageResponsibilities ? (
                <Button asChild variant="outline">
                  <Link href={`/${locale}/responsibilities`}>{tr("Review", "مراجعة")}</Link>
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
                              {s.root.name}
                            </Link>
                          </CardTitle>
                          <CardDescription className="truncate">
                            {s.root.type.displayName} • {tr("KPIs", "المؤشرات")}: {s.kpisCount}
                          </CardDescription>
                        </div>
                        <StatusBadge status={s.root.status as unknown as UiStatus} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-border bg-muted/30">
                          {tr("In scope", "ضمن النطاق")}: {s.counts.total}
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
                          <p className="text-xs font-semibold text-muted-foreground">{tr("At-risk preview", "لمحة عن المعرض للخطر")}</p>
                          <div className="space-y-2">
                            {s.atRiskPreview.map((x) => (
                              <Link
                                key={x.id}
                                href={`/${locale}/nodes/${x.type.code}/${x.id}`}
                                className="block rounded-lg border border-border bg-background/50 px-3 py-2 transition hover:bg-accent"
                              >
                                <p className="truncate text-sm font-semibold">
                                  <span className="me-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: x.color }} />
                                  {x.name}
                                </p>
                                <p className="mt-1 truncate text-xs text-muted-foreground">
                                  {x.type.displayName} • {tr("Progress", "التقدم")}: {x.progress}%
                                </p>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                          {tr("No at-risk items in this scope.", "لا توجد عناصر معرضة للخطر ضمن هذا النطاق.")}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/10 p-8 text-sm text-muted-foreground">
                {tr(
                  "No responsibilities found for your account yet. KPIs you own and items you own will still appear above.",
                  "لا توجد مسؤوليات لهذا الحساب بعد. المؤشرات التي تملكها والعناصر التي تملكها ستظهر أعلاه.",
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
