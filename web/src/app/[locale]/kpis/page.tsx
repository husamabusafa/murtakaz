"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { kpis } from "@/lib/mock-data";
import { useLocale } from "@/providers/locale-provider";
import { getEffectiveKpi } from "@/lib/prototype-store";

export default function KPIsPage() {
  const { locale, t, tr, isArabic } = useLocale();
  const visibleKpis = kpis.map((kpi) => getEffectiveKpi(kpi.id) ?? kpi);

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
            <div className="w-full max-w-xs">
              <Input
                placeholder={tr("Search (demo)", "بحث (تجريبي)")}
                className="border-white/10 bg-slate-950/40 text-white placeholder:text-slate-400"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/0">
                  <TableHead className="text-slate-200">{tr("KPI", "المؤشر")}</TableHead>
                  <TableHead className="text-slate-200">{t("owner")}</TableHead>
                  <TableHead className="text-slate-200">{t("current")}</TableHead>
                  <TableHead className="text-slate-200">{t("target")}</TableHead>
                  <TableHead className="text-slate-200">{t("variance")}</TableHead>
                  <TableHead className="text-right text-slate-200">{tr("Freshness", "الحداثة")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleKpis.map((kpi) => (
                  <TableRow key={kpi.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium text-white">
                      <Link href={`/${locale}/kpis/${kpi.id}`} className="hover:underline">
                        {isArabic ? kpi.nameAr ?? kpi.name : kpi.name}
                      </Link>
                      <p className="mt-1 text-xs text-slate-200">
                        {(isArabic ? kpi.lineage.pillarAr : kpi.lineage.pillar) ?? "—"} •{" "}
                        {(isArabic ? kpi.lineage.initiativeAr : kpi.lineage.initiative) ?? "—"} •{" "}
                        {(isArabic ? kpi.lineage.projectAr : kpi.lineage.project) ?? "—"}
                      </p>
                    </TableCell>
                    <TableCell className="text-slate-200">{kpi.owner}</TableCell>
                    <TableCell className="text-slate-100">
                      {kpi.current}
                      {kpi.unit}
                    </TableCell>
                    <TableCell className="text-slate-100">
                      {kpi.target}
                      {kpi.unit}
                    </TableCell>
                    <TableCell className={kpi.variance < 0 ? "text-rose-200" : "text-emerald-200"}>
                      {kpi.variance > 0 ? "+" : ""}
                      {kpi.variance}
                      {kpi.unit}
                    </TableCell>
                    <TableCell className="text-right text-slate-200">{kpi.freshnessDays}d</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
