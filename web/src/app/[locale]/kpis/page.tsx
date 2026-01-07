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
import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

type KpiGridRow = Awaited<ReturnType<typeof getOrgKpisGridPaged>>["items"][number];

export default function KPIsPage() {
  const { locale, t, nodeTypeLabel, formatNumber, df } = useLocale();
  const { user, loading: sessionLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (user as any)?.role as string | undefined;
  const isAdmin = userRole === "ADMIN";

  const [rows, setRows] = useState<KpiGridRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

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
              {t("total")}: {total}
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

          {loading ? (
            <div className="rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">{t("loadingEllipsis")}</div>
          ) : items.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((kpi) => (
                <Link
                  key={kpi.id}
                  href={`/${locale}/kpis/${kpi.id}`}
                  className="block rounded-2xl border border-border bg-card p-4 text-card-foreground transition hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{df(kpi.name, kpi.nameAr)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {(kpi.primaryNode?.nodeType
                          ? nodeTypeLabel(kpi.primaryNode.nodeType.code, df(kpi.primaryNode.nodeType.displayName, kpi.primaryNode.nodeType.nameAr))
                          : t("type"))}: {df(kpi.primaryNode?.name, kpi.primaryNode?.nameAr) || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-border bg-muted/20 px-3 py-3">
                    <KpiGauge value={kpi.currentValue} target={kpi.targetValue} unit={df(kpi.unit, kpi.unitAr) || undefined} height={160} />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">{t("current")}</p>
                      <p className="text-sm font-semibold" dir="ltr">
                        {formatNumber(kpi.currentValue)}
                        {df(kpi.unit, kpi.unitAr)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">{t("target")}</p>
                      <p className="text-sm font-semibold" dir="ltr">
                        {formatNumber(kpi.targetValue)}
                        {df(kpi.unit, kpi.unitAr)}
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
