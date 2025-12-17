"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { RagBadge } from "@/components/rag-badge";
import { Icon } from "@/components/icon";
import { Bar, Donut, SparkLine } from "@/components/charts/dashboard-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dashboards } from "@/lib/dashboards";
import { approvalsAging, executiveTrend, kpiVarianceTop, riskSeverityBreakdown } from "@/lib/dashboard-metrics";
import { changeRequests, kpis, pillars } from "@/lib/mock-data";
import { useLocale } from "@/providers/locale-provider";

export default function DashboardsPage() {
  const { locale, t, tr, isArabic } = useLocale();
  const initiatives = pillars.flatMap((pillar) => pillar.initiatives);
  const atRiskInitiatives = initiatives.filter((initiative) => initiative.health !== "GREEN");
  const pendingApprovals = changeRequests.filter((cr) => cr.status === "PENDING");

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("dashboards")}
        subtitle={tr(
          "Role-based views with drill-down across strategy, execution, KPIs, risks, and governance.",
          "لوحات حسب الدور مع إمكانية الاستعراض التفصيلي عبر الاستراتيجية والتنفيذ والمؤشرات والمخاطر والحوكمة.",
        )}
        icon={<Icon name="tabler:layout-dashboard" className="h-5 w-5" />}
      />

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dashboards.map((dashboard) => (
          <Link
            key={dashboard.slug}
            href={`/${locale}/dashboards/${dashboard.slug}`}
            className="group rounded-2xl border border-white/10 bg-white/5 p-5 text-white shadow-lg shadow-black/20 transition hover:bg-white/10"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">{isArabic ? dashboard.titleAr : dashboard.title}</p>
                <p className="text-xs text-slate-200">{isArabic ? dashboard.descriptionAr : dashboard.description}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-950/40">
                <Icon name={dashboard.icon} className="h-5 w-5 text-slate-100" />
              </div>
            </div>
            <p className="mt-4 text-xs font-semibold text-indigo-200 group-hover:text-indigo-100">{tr("Open dashboard", "فتح اللوحة")}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{tr("Executive confidence", "ثقة التنفيذ")}</CardTitle>
            <CardDescription className="text-slate-200">{tr("Trend of delivery confidence (demo index).", "اتجاه ثقة التنفيذ (مؤشر تجريبي).")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{tr("Confidence index", "مؤشر الثقة")}</p>
              <p className="text-sm text-slate-200">{executiveTrend.at(-1)} / 100</p>
            </div>
            <SparkLine values={executiveTrend} />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="text-xs text-slate-200">{tr("At-risk initiatives", "مبادرات معرضة للمخاطر")}</p>
                <p className="mt-1 text-xl font-semibold text-white">{atRiskInitiatives.length}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="text-xs text-slate-200">{tr("Pending approvals", "موافقات معلّقة")}</p>
                <p className="mt-1 text-xl font-semibold text-white">{pendingApprovals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{tr("Risk distribution", "توزيع المخاطر")}</CardTitle>
            <CardDescription className="text-slate-200">{tr("Severity mix across open risks.", "توزيع الخطورة عبر المخاطر المفتوحة.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Donut items={riskSeverityBreakdown} />
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{tr("Governance SLA", "اتفاقية مستوى الخدمة للحوكمة")}</CardTitle>
            <CardDescription className="text-slate-200">{tr("Approval aging distribution (demo).", "توزيع عمر الموافقات (عرض تجريبي).")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Bar categories={approvalsAging.categories} values={approvalsAging.values} color="#a78bfa" />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">KPI attainment (preview)</CardTitle>
              <CardDescription className="text-slate-200">Top KPIs driving strategic outcomes.</CardDescription>
            </div>
            <Link href={`/${locale}/dashboards/kpi-performance`} className="text-sm font-medium text-indigo-200 hover:text-indigo-100">
              Open KPI dashboard
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-white/0">
                    <TableHead className="text-slate-200">KPI</TableHead>
                    <TableHead className="text-slate-200">Current</TableHead>
                    <TableHead className="text-slate-200">Target</TableHead>
                    <TableHead className="text-slate-200">Variance</TableHead>
                    <TableHead className="text-right text-slate-200">Freshness</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpis.map((kpi) => (
                    <TableRow key={kpi.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="font-medium text-white">
                    <Link href={`/${locale}/kpis/${kpi.id}`} className="hover:underline">
                      {isArabic ? kpi.nameAr ?? kpi.name : kpi.name}
                    </Link>
                    <p className="mt-1 text-xs text-slate-200">{kpi.lineage.pillar}</p>
                  </TableCell>
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

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{tr("Variance (top)", "الانحراف (الأعلى)")}</CardTitle>
            <CardDescription className="text-slate-200">{tr("Top KPI variance by theme.", "أعلى انحراف للمؤشرات حسب المحور.")}</CardDescription>
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
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">{tr("Initiatives requiring attention", "مبادرات تتطلب متابعة")}</CardTitle>
              <CardDescription className="text-slate-200">{tr("Health roll-up from updates, KPIs, milestones, and risks.", "تجميع الصحة من التحديثات والمؤشرات والمعالم والمخاطر.")}</CardDescription>
            </div>
            <Link href={`/${locale}/dashboards/initiative-health`} className="text-sm font-medium text-indigo-200 hover:text-indigo-100">
              {tr("Open initiative dashboard", "فتح لوحة المبادرات")}
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {atRiskInitiatives.map((initiative) => (
              <Link
                key={initiative.id}
                href={`/${locale}/strategy/initiatives/${initiative.id}`}
                className="block rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 transition hover:bg-white/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">{isArabic ? initiative.titleAr ?? initiative.title : initiative.title}</p>
                    <p className="text-xs text-slate-200">{initiative.owner}</p>
                  </div>
                  <RagBadge health={initiative.health} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{tr("Pillar roll-up", "ملخص الركائز")}</CardTitle>
            <CardDescription className="text-slate-200">{tr("Strategy posture by pillar.", "موقف الاستراتيجية حسب الركيزة.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pillars.map((pillar) => (
              <Link
                key={pillar.id}
                href={`/${locale}/strategy/${pillar.id}`}
                className="block rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 transition hover:bg-white/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">{isArabic ? pillar.titleAr ?? pillar.title : pillar.title}</p>
                    <p className="text-xs text-slate-200">{pillar.owner}</p>
                  </div>
                  <RagBadge health={pillar.health} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
