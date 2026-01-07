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

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${Math.round(value)}%`;
}

export default function OverviewPage() {
  const { t, locale, tr } = useLocale();
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
        setError(e instanceof Error ? e.message : tr("Failed to load overview.", "فشل تحميل النظرة العامة."));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [sessionLoading, tr, user]);

  const isAdmin = useMemo(() => data?.user.role === "ADMIN", [data?.user.role]);

  const completionHealth = useMemo(() => {
    const b = data?.kpiCompletion?.buckets;
    if (!b) return null;
    const segs = [
      { key: "LT_60", label: tr("Off track", "خارج المسار"), color: "bg-rose-500/80", value: b.LT_60 ?? 0 },
      { key: "LT_90", label: tr("At risk", "معرّض للخطر"), color: "bg-amber-500/80", value: b.LT_90 ?? 0 },
      { key: "LT_110", label: tr("On track", "ضمن المسار"), color: "bg-sky-500/80", value: b.LT_110 ?? 0 },
      { key: "GTE_110", label: tr("Exceeded", "متجاوز"), color: "bg-emerald-500/80", value: b.GTE_110 ?? 0 },
    ].filter((s) => s.value > 0);
    const total = segs.reduce((sum, s) => sum + s.value, 0);
    if (!total) return null;
    return { total, segs };
  }, [data?.kpiCompletion?.buckets, tr]);

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
        title: a.kpiName,
        subtitle: a.typeDisplayName && a.primaryName ? `${a.typeDisplayName} • ${a.primaryName}` : "—",
        right: a.calculatedValue === null ? "—" : formatNumber(a.calculatedValue),
        badge: undefined,
      }));
    }

    return (data.workItems ?? []).slice(0, 6).map((it) => ({
      id: it.id,
      href: `/${locale}/nodes/${it.type.code}/${it.id}`,
      title: it.name,
      subtitle: it.parent ? `${it.type.displayName} • ${it.parent.typeDisplayName}: ${it.parent.name}` : it.type.displayName,
      right: `${it.progress}%`,
      badge: it.assignmentRole,
    }));
  }, [data, locale]);

  const topKpis = useMemo(() => (data?.kpis ?? []).slice(0, 8), [data?.kpis]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("overviewTitle")}
        subtitle={tr(
          isAdmin
            ? "Organization-wide snapshot for KPI oversight and execution health."
            : "Your workspace snapshot based on what you own, what is assigned to you, and which KPIs you can access.",
          isAdmin
            ? "ملخص عام للمؤسسة لمتابعة المؤشرات وصحة التنفيذ."
            : "ملخص لمساحة عملك بناءً على ما تملكه وما هو مُسند لك والمؤشرات التي يمكنك الوصول إليها.",
        )}
        icon={<Icon name="tabler:layout-dashboard" className="h-5 w-5" />}
        actions={
          data?.canApprove ? (
            <Button asChild variant="secondary">
              <Link href={`/${locale}/approvals`}>{tr("Open approvals", "فتح الموافقات")}</Link>
            </Button>
          ) : (
            <Button asChild variant="secondary">
              <Link href={`/${locale}/dashboards`}>{tr("Open dashboard", "فتح لوحة المعلومات")}</Link>
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
            <CardTitle className="text-base">{tr("Loading", "جارٍ التحميل")}</CardTitle>
            <CardDescription>{tr("Please wait…", "يرجى الانتظار…")}</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      ) : !user ? (
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardContent className="p-6 text-sm text-muted-foreground">
            <p>{tr("Please sign in to view your workspace overview.", "يرجى تسجيل الدخول لعرض النظرة العامة لمساحة العمل.")}</p>
            <Link href={`/${locale}/auth/login?next=/${locale}/overview`} className="mt-3 inline-flex text-sm font-semibold text-primary hover:opacity-90">
              {tr("Sign in", "تسجيل الدخول")}
            </Link>
          </CardContent>
        </Card>
      ) : !data ? (
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardContent className="p-6 text-sm text-muted-foreground">{tr("No overview data.", "لا توجد بيانات للنظرة العامة.")}</CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-6 lg:grid-cols-3">
            <Card className="bg-card/70 backdrop-blur shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base">{tr("Inbox", "الوارد")}</CardTitle>
                  <CardDescription>
                    {data.canApprove
                      ? tr("Latest submitted KPI values to review.", "آخر قيم المؤشرات المُرسلة للمراجعة.")
                      : tr("Items that need your next action.", "عناصر تحتاج الإجراء التالي منك.")}
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
                    {data.canApprove ? tr("No pending items.", "لا توجد عناصر معلّقة.") : tr("No assigned items.", "لا توجد عناصر مُسندة.")}
                  </div>
                )}

                <Button asChild variant="outline" className="w-full">
                  <Link href={data.canApprove ? `/${locale}/approvals` : `/${locale}/dashboards`}>{tr("Open", "فتح")}</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base">{tr("Needs attention", "يتطلب متابعة")}</CardTitle>
                  <CardDescription>{tr("KPIs that are missing data or awaiting action.", "مؤشرات بلا بيانات أو تحتاج إجراء.")}</CardDescription>
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
                          <p className="truncate text-sm font-semibold">{k.name}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {k.primary.typeDisplayName} • {k.primary.name}
                          </p>
                        </div>
                        <Badge variant="outline" className={pillForKpiStatus(k.latest?.status ?? "NO_DATA")}>
                          {(k.latest?.status ?? "NO_DATA") === "NO_DATA" ? tr("No data", "بلا بيانات") : (k.latest?.status ?? "NO_DATA")}
                        </Badge>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-sm text-muted-foreground">
                    {tr("Nothing urgent right now.", "لا يوجد شيء عاجل حالياً.")}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur shadow-sm">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">{tr("Completion health", "صحة الإنجاز")}</CardTitle>
                <CardDescription>{tr("A compact view of completion vs target.", "عرض مختصر للإنجاز مقابل المستهدف.")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    {tr("No completion data.", "لا توجد بيانات إنجاز.")}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card className="bg-card/70 backdrop-blur shadow-sm">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">{tr("Upcoming", "القادم")}</CardTitle>
                <CardDescription>
                  {isAdmin
                    ? tr("A quick view of owned items across the organization.", "عرض سريع للعناصر المملوكة على مستوى المؤسسة.")
                    : tr("What you should focus on next.", "ما الذي يجب أن تركز عليه بعد ذلك.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!isAdmin && upcomingAssigned.length ? (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground">{tr("Assigned", "مُسند")}</p>
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
                              {it.name}
                            </p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {it.type.displayName}
                              {it.parent ? ` • ${it.parent.typeDisplayName}: ${it.parent.name}` : ""}
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
                    <p className="text-xs font-semibold text-muted-foreground">{tr("Owned", "مملوك")}</p>
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
                              {it.name}
                            </p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">{it.type.displayName}</p>
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
                    {tr("No items yet.", "لا توجد عناصر بعد.")}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur shadow-sm">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">{tr("Quick access", "وصول سريع")}</CardTitle>
                <CardDescription>{tr("Jump to what you need quickly.", "انتقل سريعاً إلى ما تحتاجه.")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                          <Icon name="tabler:layers-subtract" className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </Link>
                    );
                  })}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button asChild variant="secondary" className="w-full">
                    <Link href={`/${locale}/kpis`}>{tr("KPIs", "المؤشرات")}</Link>
                  </Button>
                  <Button asChild variant="secondary" className="w-full">
                    <Link href={`/${locale}/dashboards`}>{t("dashboards")}</Link>
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {data.canApprove ? (
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/${locale}/approvals`}>{tr("Approvals", "الموافقات")}</Link>
                    </Button>
                  ) : (
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/${locale}/responsibilities`}>{tr("Responsibilities", "المسؤوليات")}</Link>
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
                  <CardTitle className="text-base">{tr("KPIs you can access", "المؤشرات التي يمكنك الوصول إليها")}</CardTitle>
                  <CardDescription>{tr("Latest values, targets, and linked structure.", "آخر القيم والمستهدف والارتباط بالتسلسل.")}</CardDescription>
                </div>
                <Button asChild variant="ghost" className="text-primary hover:text-primary">
                  <Link href={`/${locale}/kpis`}>{t("viewAll")}</Link>
                </Button>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
