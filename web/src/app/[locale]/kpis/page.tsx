"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/providers/locale-provider";
import { useAuth } from "@/providers/auth-provider";
import { useEffect, useMemo, useState } from "react";
import { getOrgKpisGridPaged } from "@/actions/kpis";
import { KpiGauge } from "@/components/charts/kpi-gauge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

type KpiGridRow = Awaited<ReturnType<typeof getOrgKpisGridPaged>>["items"][number];

export default function KPIsPage() {
  const { locale, t, nodeTypeLabel, formatNumber, formatDate, kpiValueStatusLabel, df } = useLocale();
  const { user, loading: sessionLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (user as any)?.role as string | undefined;
  const isAdmin = userRole === "ADMIN";

  const [rows, setRows] = useState<KpiGridRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "NO_DATA" | "DRAFT" | "SUBMITTED" | "APPROVED" | "LOCKED">("ALL");
  const [periodFilter, setPeriodFilter] = useState<"ALL" | "MONTHLY" | "QUARTERLY" | "YEARLY">("ALL");

  const q = useMemo(() => {
    const raw = searchParams?.get("q") ?? "";
    const trimmed = raw.trim();
    return trimmed.length ? trimmed : "";
  }, [searchParams]);

  const page = useMemo(() => {
    const raw = searchParams?.get("page") ?? "1";
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, [searchParams]);

  const pageSize = useMemo(() => {
    const raw = searchParams?.get("pageSize") ?? "24";
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return 24;
    return Math.min(100, Math.max(1, n));
  }, [searchParams]);

  const totalPages = useMemo(() => {
    return total > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  }, [pageSize, total]);

  const [searchDraft, setSearchDraft] = useState("");

  useEffect(() => {
    setSearchDraft(q);
  }, [q]);

  useEffect(() => {
    let mounted = true;
    if (sessionLoading) return;

    (async () => {
      try {
        const data = await getOrgKpisGridPaged({ q: q || undefined, page, pageSize });
        if (!mounted) return;
        setRows(data.items);
        setTotal(data.total);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [page, pageSize, q, sessionLoading]);

  const applySearch = (nextQ: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    const cleaned = nextQ.trim();
    if (cleaned) params.set("q", cleaned);
    else params.delete("q");
    params.set("page", "1");
    params.set("pageSize", String(pageSize));
    router.replace(`/${locale}/kpis?${params.toString()}`);
  };

  const goToPage = (nextPage: number) => {
    const safe = Math.min(totalPages, Math.max(1, nextPage));
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", String(safe));
    params.set("pageSize", String(pageSize));
    router.replace(`/${locale}/kpis?${params.toString()}`);
  };

  const items = useMemo(() => {
    return rows.map((r) => ({
      ...r,
      currentValue: r.values?.[0]?.calculatedValue ?? null,
      lastUpdatedAt: r.values?.[0]?.periodEnd ?? null,
    }));
  }, [rows]);

  const filteredItems = useMemo(() => {
    return items.filter((kpi) => {
      const latestStatus = String(kpi.values?.[0]?.status ?? "NO_DATA");
      if (statusFilter !== "ALL" && latestStatus !== statusFilter) return false;
      if (periodFilter !== "ALL" && kpi.periodType !== periodFilter) return false;
      return true;
    });
  }, [items, periodFilter, statusFilter]);

  const summary = useMemo(() => {
    const noData = filteredItems.filter((kpi) => String(kpi.values?.[0]?.status ?? "NO_DATA") === "NO_DATA").length;
    const missingCurrent = filteredItems.filter((kpi) => kpi.currentValue == null).length;
    const missingTarget = filteredItems.filter((kpi) => kpi.targetValue == null).length;
    return { noData, missingCurrent, missingTarget };
  }, [filteredItems]);

  const formatValueWithUnit = (value: number | null | undefined, unit: string | null | undefined) => {
    const formatted = formatNumber(value ?? null);
    if (formatted === "—") return formatted;
    const trimmedUnit = unit?.trim();
    if (!trimmedUnit) return formatted;
    if (trimmedUnit === "%") return `${formatted}%`;
    return `${formatted} ${trimmedUnit}`;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("kpis")}
        subtitle={t("kpiCatalogSubtitle")}
        icon={<Icon name="tabler:chart-line" className="h-5 w-5" />}
      />

      <Card className="border-border bg-card/50 text-foreground shadow-lg shadow-black/5 dark:shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:report-analytics" className="h-4 w-4 text-primary" />
                {t("kpiCatalog")}
              </CardTitle>
              <CardDescription>{t("trackTargetVsActualDesc")}</CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
              <div className="w-full max-w-xs">
                <Input
                  value={searchDraft}
                  placeholder={t("search")}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applySearch(searchDraft);
                  }}
                  className="bg-background"
                />
              </div>
              {isAdmin ? (
                <Button asChild variant="secondary">
                  <Link href={`/${locale}/kpis/create`}>
                    <Plus className="h-4 w-4" />
                    <span className="ms-2">{t("createKpi")}</span>
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-xs text-muted-foreground">
              {t("total")}: {total} • {t("shown")}: {filteredItems.length}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => goToPage(page - 1)} disabled={page <= 1}>
                {t("prev")}
              </Button>
              <span className="text-xs text-muted-foreground">
                {t("page")} {page} / {totalPages}
              </span>
              <Button variant="outline" size="sm" onClick={() => goToPage(page + 1)} disabled={page >= totalPages}>
                {t("next")}
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("filters")}</span>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder={t("statusFilter")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("allStatuses")}</SelectItem>
                  <SelectItem value="NO_DATA">{t("statusNoData")}</SelectItem>
                  <SelectItem value="DRAFT">{t("statusDraft")}</SelectItem>
                  <SelectItem value="SUBMITTED">{t("statusSubmitted")}</SelectItem>
                  <SelectItem value="APPROVED">{t("statusApproved")}</SelectItem>
                  <SelectItem value="LOCKED">{t("statusLocked")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as typeof periodFilter)}>
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder={t("periodFilter")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("allPeriods")}</SelectItem>
                  <SelectItem value="MONTHLY">{t("monthly")}</SelectItem>
                  <SelectItem value="QUARTERLY">{t("quarterly")}</SelectItem>
                  <SelectItem value="YEARLY">{t("yearly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-3 md:w-auto">
              <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">{t("statusNoData")}</p>
                <p className="text-sm font-semibold">{summary.noData}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">{t("missingCurrent")}</p>
                <p className="text-sm font-semibold">{summary.missingCurrent}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">{t("missingTarget")}</p>
                <p className="text-sm font-semibold">{summary.missingTarget}</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">{t("loadingEllipsis")}</div>
          ) : filteredItems.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((kpi) => (
                <Link
                  key={kpi.id}
                  href={`/${locale}/kpis/${kpi.id}`}
                  className="block rounded-2xl border border-border bg-card p-4 text-card-foreground transition hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold line-clamp-2">{df(kpi.name, kpi.nameAr)}</p>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {(kpi.primaryNode?.nodeType
                          ? nodeTypeLabel(kpi.primaryNode.nodeType.code, df(kpi.primaryNode.nodeType.displayName, kpi.primaryNode.nodeType.nameAr))
                          : t("type"))}: {df(kpi.primaryNode?.name, kpi.primaryNode?.nameAr) || "—"}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {t("latestUpdate")}: {kpi.lastUpdatedAt ? formatDate(kpi.lastUpdatedAt) : "—"}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {kpiValueStatusLabel(String(kpi.values?.[0]?.status ?? "NO_DATA"))}
                    </Badge>
                  </div>

                  <div className="mt-3 rounded-xl border border-border bg-muted/20 px-3 py-3">
                    <KpiGauge value={kpi.currentValue} target={kpi.targetValue} unit={df(kpi.unit, kpi.unitAr) || undefined} height={160} />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">{t("current")}</p>
                      <p className="text-sm font-semibold" dir="ltr">
                        {formatValueWithUnit(kpi.currentValue, df(kpi.unit, kpi.unitAr))}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">{t("target")}</p>
                      <p className="text-sm font-semibold" dir="ltr">
                        {formatValueWithUnit(kpi.targetValue, df(kpi.unit, kpi.unitAr))}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">{t("noKpisYet")}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
