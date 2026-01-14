"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/rag-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getMyDashboardData } from "@/actions/dashboard";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type { Status as UiStatus } from "@/lib/types";

type DashboardData = Awaited<ReturnType<typeof getMyDashboardData>>;

type InboxItem = {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  right?: string;
  badge?: string;
};

function pillForKpiStatus(status: string) {
  if (status === "NO_DATA") return "border-border bg-muted/30 text-muted-foreground";
  if (status === "DRAFT") return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-100";
  if (status === "SUBMITTED") return "border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-100";
  if (status === "APPROVED" || status === "LOCKED") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-100";
  return "border-border bg-muted/30 text-muted-foreground";
}

function formatNumber(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const hasFraction = Math.abs(value % 1) > 0;
  return hasFraction ? value.toFixed(2) : String(value);
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${Math.round(value)}%`;
}

export default function OverviewPage() {
  const { t, locale, nodeTypeLabel, kpiValueStatusLabel, df } = useLocale();
  const { user, loading: sessionLoading } = useAuth();

  type EnabledNodeTypeRow = {
    id: string;
    code: string;
    displayName: string;
    nameAr: string | null;
    levelOrder: number;
  };

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
        setError(e instanceof Error ? e.message : t("overviewFailedToLoad"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [sessionLoading, t, user]);

  const isAdmin = useMemo(() => data?.user.role === "ADMIN", [data?.user.role]);

  const completionHealth = useMemo(() => {
    const b = data?.kpiCompletion?.buckets;
    if (!b) return null;
    const segs = [
      { key: "LT_60", label: t("offTrack"), color: "bg-rose-500/80", value: b.LT_60 ?? 0 },
      { key: "LT_90", label: t("atRisk"), color: "bg-amber-500/80", value: b.LT_90 ?? 0 },
      { key: "LT_110", label: t("onTrack"), color: "bg-sky-500/80", value: b.LT_110 ?? 0 },
      { key: "GTE_110", label: t("exceeded"), color: "bg-emerald-500/80", value: b.GTE_110 ?? 0 },
    ].filter((s) => s.value > 0);
    const total = segs.reduce((sum, s) => sum + s.value, 0);
    if (!total) return null;
    return { total, segs };
  }, [data?.kpiCompletion?.buckets, t]);

  const completionAvgLabel = useMemo(() => formatPercent(data?.kpiCompletion?.avgPercent), [data?.kpiCompletion?.avgPercent]);

  const attentionKpis = useMemo(() => {
    const rows = data?.kpis ?? [];
    const filtered = rows.filter((k) => {
      const s = k.latest?.status ?? "NO_DATA";
      return s === "NO_DATA" || s === "DRAFT" || s === "SUBMITTED";
    });
    return filtered.slice(0, 7);
  }, [data?.kpis]);

  const attentionCount = useMemo(() => {
    if (!data) return 0;
    return (data.kpiStatusCounts.NO_DATA ?? 0) + (data.kpiStatusCounts.DRAFT ?? 0) + (data.kpiStatusCounts.SUBMITTED ?? 0);
  }, [data]);

  const upcomingAssigned = useMemo(() => (data?.workItems ?? []).slice(0, 5), [data?.workItems]);
  const upcomingOwned = useMemo(() => (data?.ownedItems ?? []).slice(0, 5), [data?.ownedItems]);

  const inboxItems = useMemo(() => {
    if (!data) return [] as InboxItem[];

    if (data.canApprove) {
      return (data.approvals ?? []).slice(0, 6).map((a) => ({
        id: a.id,
        href: `/${locale}/approvals`,
        title: df(a.kpiName, a.kpiNameAr),
        subtitle:
          a.typeDisplayName && a.primaryName
            ? `${nodeTypeLabel(a.typeCode, df(a.typeDisplayName, a.typeDisplayNameAr))} • ${df(a.primaryName, a.primaryNameAr)}`
            : "—",
        right: a.calculatedValue === null ? "—" : formatNumber(a.calculatedValue),
        badge: undefined,
      }));
    }

    return (data.workItems ?? []).slice(0, 6).map((it) => ({
      id: it.id,
      href: `/${locale}/nodes/${it.type.code}/${it.id}`,
      title: df(it.name, it.nameAr),
      subtitle: it.parent
        ? `${nodeTypeLabel(it.type.code, df(it.type.displayName, it.type.nameAr))} • ${nodeTypeLabel(it.parent.typeCode, df(it.parent.typeDisplayName, it.parent.typeDisplayNameAr))}: ${df(it.parent.name, it.parent.nameAr)}`
        : nodeTypeLabel(it.type.code, df(it.type.displayName, it.type.nameAr)),
      right: `${it.progress}%`,
      badge: it.assignmentRole,
    }));
  }, [data, df, locale, nodeTypeLabel]);

  const topKpis = useMemo(() => (data?.kpis ?? []).slice(0, 8), [data?.kpis]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("overviewTitle")}
        subtitle={isAdmin ? t("overviewAdminSubtitle") : t("overviewUserSubtitle")}
        icon={<Icon name="tabler:layout-dashboard" className="h-5 w-5" />}
        actions={
          data?.canApprove ? (
            <Button asChild variant="secondary">
              <Link href={`/${locale}/approvals`}>{t("openApprovals")}</Link>
            </Button>
          ) : (
            <Button asChild variant="secondary">
              <Link href={`/${locale}/dashboards`}>{t("openDashboard")}</Link>
            </Button>
          )
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
      ) : !user ? (
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardContent className="p-6 text-sm text-muted-foreground">
            <p>{t("signInToViewWorkspace")}</p>
            <Link href={`/${locale}/auth/login?next=/${locale}/overview`} className="mt-3 inline-flex text-sm font-semibold text-primary hover:opacity-90">
              {t("signIn")}
            </Link>
          </CardContent>
        </Card>
      ) : !data ? (
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardContent className="p-6 text-sm text-muted-foreground">{t("noOverviewData")}</CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-6 lg:grid-cols-3">
            <Card className="bg-card/70 backdrop-blur shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base">{t("inbox")}</CardTitle>
                  <CardDescription>
                    {data.canApprove
                      ? t("inboxAdminDesc")
                      : t("inboxUserDesc")}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-border bg-muted/30 text-muted-foreground">
                  {data.canApprove ? data.summary.approvalsPending : data.summary.workTotal}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {inboxItems.length ? (
                  inboxItems.map((it) => (
                    <Link
                      key={it.id}
                      href={it.href}
                      className="block rounded-xl border border-border bg-background/50 px-4 py-3 transition hover:bg-accent"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{it.title}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{it.subtitle}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          {it.badge ? (
                            <Badge variant="outline" className="border-border bg-muted/30 text-muted-foreground">
                              {it.badge}
                            </Badge>
                          ) : null}
                          {it.right ? (
                            <span className="text-xs text-muted-foreground" dir="ltr">
                              {it.right}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-sm text-muted-foreground">
                    {data.canApprove ? t("noPendingItems") : t("noAssignedItems")}
                  </div>
                )}

                <Button asChild variant="outline" className="w-full">
                  <Link href={data.canApprove ? `/${locale}/approvals` : `/${locale}/dashboards`}>{t("open")}</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base">{t("needsAttention")}</CardTitle>
                  <CardDescription>{t("needsAttentionDesc")}</CardDescription>
                </div>
                <Badge variant="outline" className="border-border bg-muted/30 text-muted-foreground">
                  {attentionCount}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {attentionKpis.length ? (
                  attentionKpis.map((k) => (
                    <Link
                      key={k.id}
                      href={`/${locale}/kpis/${k.id}`}
                      className="block rounded-xl border border-border bg-background/50 px-4 py-3 transition hover:bg-accent"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{df(k.name, k.nameAr)}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {nodeTypeLabel(k.primary.typeCode, df(k.primary.typeDisplayName, k.primary.typeDisplayNameAr))} • {df(k.primary.name, k.primary.nameAr)}
                          </p>
                        </div>
                        <Badge variant="outline" className={pillForKpiStatus(k.latest?.status ?? "NO_DATA")}>
                          {kpiValueStatusLabel(k.latest?.status ?? "NO_DATA")}
                        </Badge>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-sm text-muted-foreground">
                    {t("nothingUrgent")}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur shadow-sm">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">{t("completionHealth")}</CardTitle>
                <CardDescription>{t("completionHealthDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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

                {completionHealth ? (
                  <>
                    <div className="flex h-3 overflow-hidden rounded-full bg-muted/30">
                      {completionHealth.segs.map((s) => (
                        <div
                          key={s.key}
                          className={s.color}
                          style={{ width: `${(s.value / completionHealth.total) * 100}%` }}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {completionHealth.segs.map((s) => (
                        <div key={s.key} className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                            {s.label}
                          </span>
                          <span dir="ltr">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-sm text-muted-foreground">
                    {t("noCompletionData")}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card className="bg-card/70 backdrop-blur shadow-sm">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">{t("upcoming")}</CardTitle>
                <CardDescription>
                  {isAdmin
                    ? t("upcomingAdminDesc")
                    : t("upcomingUserDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!isAdmin && upcomingAssigned.length ? (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground">{t("assigned")}</p>
                    {upcomingAssigned.map((it) => (
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
                              {it.parent ? ` • ${nodeTypeLabel(it.parent.typeCode, df(it.parent.typeDisplayName, it.parent.typeDisplayNameAr))}: ${df(it.parent.name, it.parent.nameAr)}` : ""}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground" dir="ltr">
                            {it.progress}%
                          </span>
                        </div>
                        <div className="mt-3">
                          <Progress value={it.progress} />
                        </div>
                      </Link>
                    ))}
                  </>
                ) : null}

                {upcomingOwned.length ? (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground">{t("owned")}</p>
                    {upcomingOwned.map((it) => (
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
                            <p className="mt-1 truncate text-xs text-muted-foreground">{df(it.type.displayName, it.type.nameAr)}</p>
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
                    ))}
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-sm text-muted-foreground">
                    {t("noItemsYet")}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur shadow-sm">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">{t("quickAccess")}</CardTitle>
                <CardDescription>{t("quickAccessDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {(data.enabledNodeTypes as unknown as EnabledNodeTypeRow[]).map((nt) => {
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
                          <Icon name="tabler:layers-subtract" className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </Link>
                    );
                  })}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button asChild variant="secondary" className="w-full">
                    <Link href={`/${locale}/dashboards/kpi-performance`}>{t("kpis")}</Link>
                  </Button>
                  <Button asChild variant="secondary" className="w-full">
                    <Link href={`/${locale}/dashboards`}>{t("dashboards")}</Link>
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {data.canApprove ? (
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/${locale}/approvals`}>{t("approvals")}</Link>
                    </Button>
                  ) : (
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/${locale}/responsibilities`}>{t("responsibilities")}</Link>
                    </Button>
                  )}

                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/${locale}/profile`}>{t("profile")}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="bg-card/70 backdrop-blur shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base">{t("kpisYouCanAccess")}</CardTitle>
                  <CardDescription>{t("kpisYouCanAccessDesc")}</CardDescription>
                </div>
                <Button asChild variant="ghost" className="text-primary hover:text-primary">
                  <Link href={`/${locale}/dashboards/kpi-performance`}>{t("viewAll")}</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-xl border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>{t("kpi")}</TableHead>
                        <TableHead>{t("latest")}</TableHead>
                        <TableHead>{t("target")}</TableHead>
                        <TableHead>{t("linkedTo")}</TableHead>
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
                                {df(k.name, k.nameAr)}
                              </Link>
                              {df(k.unit, k.unitAr) ? <span className="ms-2 text-xs text-muted-foreground">({df(k.unit, k.unitAr)})</span> : null}
                            </TableCell>
                            <TableCell className="text-muted-foreground" dir="ltr">
                              {formatNumber(k.latest?.calculatedValue)}
                            </TableCell>
                            <TableCell className="text-muted-foreground" dir="ltr">
                              {formatNumber(k.targetValue)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {nodeTypeLabel(k.primary.typeCode, df(k.primary.typeDisplayName, k.primary.typeDisplayNameAr))} • {df(k.primary.name, k.primary.nameAr)}
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
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
