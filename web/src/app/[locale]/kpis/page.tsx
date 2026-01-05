"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/providers/locale-provider";
import { useAuth } from "@/providers/auth-provider";
import { useEffect, useMemo, useState } from "react";
import { getOrgKpisGrid } from "@/actions/kpis";
import { KpiGauge } from "@/components/charts/kpi-gauge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type KpiGridRow = Awaited<ReturnType<typeof getOrgKpisGrid>>[number];

export default function KPIsPage() {
  const { locale, t, tr } = useLocale();
  const { user, loading: sessionLoading } = useAuth();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (user as any)?.role as string | undefined;
  const isAdmin = userRole === "ADMIN";

  const [rows, setRows] = useState<KpiGridRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (sessionLoading) return;

    (async () => {
      try {
        const data = await getOrgKpisGrid();
        if (mounted) setRows(data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [sessionLoading]);

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
        subtitle={tr("KPI catalog with lineage, targets, trends, and data freshness.", "كتالوج المؤشرات مع التسلسل، المستهدفات، الاتجاهات، وحداثة البيانات.")}
        icon={<Icon name="tabler:chart-line" className="h-5 w-5" />}
      />

      <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:report-analytics" className="h-4 w-4 text-slate-100" />
                {tr("KPI catalog", "كتالوج المؤشرات")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("Track target vs actual and governance ownership.", "متابعة المستهدف مقابل الفعلي وملكية الحوكمة.")}</CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
              <div className="w-full max-w-xs">
                <Input placeholder={tr("Search", "بحث")} className="border-white/10 bg-slate-950/40 text-white placeholder:text-slate-400" />
              </div>
              {isAdmin ? (
                <Button asChild className="bg-white/10 text-white hover:bg-white/15">
                  <Link href={`/${locale}/kpis/create`}>
                    <Plus className="h-4 w-4" />
                    <span className="ms-2">{tr("Create KPI", "إنشاء مؤشر")}</span>
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-6 text-sm text-slate-200">{tr("Loading…", "جارٍ التحميل…")}</div>
          ) : items.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((kpi) => (
                <Link
                  key={kpi.id}
                  href={`/${locale}/kpis/${kpi.id}`}
                  className="block rounded-2xl border border-white/10 bg-slate-950/35 p-4 text-white transition hover:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{kpi.name}</p>
                      <p className="mt-1 text-xs text-slate-200">
                        {(kpi.primaryNode?.nodeType?.displayName ?? tr("Type", "النوع"))}: {kpi.primaryNode?.name ?? "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3">
                    <KpiGauge value={kpi.currentValue} target={kpi.targetValue} unit={kpi.unit ?? undefined} height={160} />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">
                      <p className="text-[11px] text-slate-200">{tr("Current", "الحالي")}</p>
                      <p className="text-sm font-semibold text-white" dir="ltr">
                        {kpi.currentValue ?? "—"}
                        {kpi.unit ?? ""}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">
                      <p className="text-[11px] text-slate-200">{tr("Target", "المستهدف")}</p>
                      <p className="text-sm font-semibold text-white" dir="ltr">
                        {kpi.targetValue ?? "—"}
                        {kpi.unit ?? ""}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-6 text-sm text-slate-200">{tr("No KPIs yet.", "لا توجد مؤشرات بعد.")}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
