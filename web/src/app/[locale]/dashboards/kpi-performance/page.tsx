"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Bar } from "@/components/charts/dashboard-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { kpiVarianceTop } from "@/lib/dashboard-metrics";
import { kpis } from "@/lib/mock-data";
import { useLocale } from "@/providers/locale-provider";

export default function KPIPerformanceDashboardPage() {
  const { locale, isArabic, t } = useLocale();

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("kpiPerformanceDashboardTitle")}
        subtitle={t("kpiPerformanceDashboardSubtitle")}
        icon={<Icon name="tabler:chart-bar" className="h-5 w-5" />}
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card/50 shadow-sm lg:col-span-2">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("varianceDistribution")}</CardTitle>
              <Icon name="tabler:chart-bar" className="text-muted-foreground" />
            </div>
            <CardDescription className="text-muted-foreground">{t("topKpiVarianceDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Bar
              categories={kpiVarianceTop.categories}
              values={kpiVarianceTop.values}
              color="#34d399"
              formatter={(value) => `${value > 0 ? "+" : ""}${value}`}
            />
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{t("freshnessWatch")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("oldestUpdatesDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {kpis
              .slice()
              .sort((a, b) => b.freshnessDays - a.freshnessDays)
              .slice(0, 3)
              .map((kpi) => (
                <Link
                  key={kpi.id}
                  href={`/${locale}/kpis/${kpi.id}`}
                  className="block rounded-xl border border-border bg-muted/30 px-4 py-3 transition hover:bg-card/50"
                >
                  <p className="text-sm font-semibold text-foreground">{isArabic ? kpi.nameAr ?? kpi.name : kpi.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {kpi.freshnessDays} {t("daysSinceLastUpdate")}
                  </p>
                </Link>
              ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{t("kpiScorecard")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("catalogDrilldownDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-white/0">
                    <TableHead className="text-muted-foreground">{t("kpi")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("owner")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("current")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("target")}</TableHead>
                    <TableHead className="text-muted-foreground">{t("variance")}</TableHead>
                    <TableHead className="text-right text-muted-foreground">{t("freshness")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpis.map((kpi) => (
                    <TableRow key={kpi.id} className="border-border hover:bg-card/50">
                      <TableCell className="font-medium text-foreground">
                        <Link href={`/${locale}/kpis/${kpi.id}`} className="hover:underline">
                          {isArabic ? kpi.nameAr ?? kpi.name : kpi.name}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {kpi.lineage.pillar} • {kpi.lineage.initiative}
                        </p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{kpi.owner}</TableCell>
                      <TableCell className="text-foreground">
                        {kpi.current}
                        {kpi.unit}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {kpi.target}
                        {kpi.unit}
                      </TableCell>
                      <TableCell className={kpi.variance < 0 ? "text-rose-200" : "text-emerald-200"}>
                        {kpi.variance > 0 ? "+" : ""}
                        {kpi.variance}
                        {kpi.unit}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{kpi.freshnessDays}d</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
