"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { ApprovalBadge, RagBadge } from "@/components/rag-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { kpis, pillars, summaryStats, changeRequests } from "@/lib/mock-data";
import { useLocale } from "@/providers/locale-provider";
import { getEffectiveKpi, getEffectiveRisk } from "@/lib/prototype-store";

export default function OverviewPage() {
  const { t, locale, tr, isArabic } = useLocale();
  const allInitiatives = pillars.flatMap((pillar) => pillar.initiatives);
  const allRisks = allInitiatives.flatMap((initiative) => initiative.risks).map((risk) => getEffectiveRisk(risk.id) ?? risk);
  const visibleKpis = kpis.map((kpi) => getEffectiveKpi(kpi.id) ?? kpi);

  const openRisks = allRisks.filter((risk) => risk.status !== "COMPLETED");
  const escalations = openRisks.filter((risk) => risk.escalated);
  const pending = changeRequests.filter((cr) => cr.status === "PENDING");
  const kpisNeedingUpdate = visibleKpis.filter((kpi) => kpi.freshnessDays >= 5);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("overviewTitle")}
        subtitle={t("overviewSubtitle")}
        icon={<Icon name="tabler:layout-dashboard" className="h-5 w-5" />}
      />

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Link
          href={`/${locale}/strategy`}
          className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
        >
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 transition hover:bg-white/10 hover:shadow-black/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between gap-2 text-slate-200">
                <span className="inline-flex items-center gap-2">
                  <Icon name="tabler:layers-subtract" className="h-4 w-4" />
                  {tr("Pillars", "الركائز")}
                </span>
                <Icon
                  name={isArabic ? "tabler:arrow-left" : "tabler:arrow-right"}
                  className="h-4 w-4 opacity-0 transition group-hover:opacity-100"
                />
              </CardDescription>
              <CardTitle className="text-3xl">{summaryStats.pillars}</CardTitle>
            </CardHeader>
          </Card>
        </Link>

        <Link
          href={`/${locale}/dashboards/initiative-health`}
          className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
        >
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 transition hover:bg-white/10 hover:shadow-black/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between gap-2 text-slate-200">
                <span className="inline-flex items-center gap-2">
                  <Icon name="tabler:activity-heartbeat" className="h-4 w-4" />
                  {t("initiativeHealth")}
                </span>
                <Icon
                  name={isArabic ? "tabler:arrow-left" : "tabler:arrow-right"}
                  className="h-4 w-4 opacity-0 transition group-hover:opacity-100"
                />
              </CardDescription>
              <CardTitle className="text-3xl">{summaryStats.initiatives}</CardTitle>
            </CardHeader>
          </Card>
        </Link>

        <Link
          href={`/${locale}/projects`}
          className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
        >
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 transition hover:bg-white/10 hover:shadow-black/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between gap-2 text-slate-200">
                <span className="inline-flex items-center gap-2">
                  <Icon name="tabler:timeline" className="h-4 w-4" />
                  {t("projectExecution")}
                </span>
                <Icon
                  name={isArabic ? "tabler:arrow-left" : "tabler:arrow-right"}
                  className="h-4 w-4 opacity-0 transition group-hover:opacity-100"
                />
              </CardDescription>
              <CardTitle className="text-3xl">{summaryStats.projects}</CardTitle>
            </CardHeader>
          </Card>
        </Link>

        <Link
          href={`/${locale}/kpis`}
          className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
        >
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 transition hover:bg-white/10 hover:shadow-black/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between gap-2 text-slate-200">
                <span className="inline-flex items-center gap-2">
                  <Icon name="tabler:chart-line" className="h-4 w-4" />
                  {t("kpiPerformance")}
                </span>
                <Icon
                  name={isArabic ? "tabler:arrow-left" : "tabler:arrow-right"}
                  className="h-4 w-4 opacity-0 transition group-hover:opacity-100"
                />
              </CardDescription>
              <CardTitle className="text-3xl">{summaryStats.kpis}</CardTitle>
            </CardHeader>
          </Card>
        </Link>

        <Link
          href={`/${locale}/risks`}
          className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
        >
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 transition hover:bg-white/10 hover:shadow-black/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between gap-2 text-slate-200">
                <span className="inline-flex items-center gap-2">
                  <Icon name="tabler:shield-exclamation" className="h-4 w-4" />
                  {t("openRisks")}
                </span>
                <Icon
                  name={isArabic ? "tabler:arrow-left" : "tabler:arrow-right"}
                  className="h-4 w-4 opacity-0 transition group-hover:opacity-100"
                />
              </CardDescription>
              <CardTitle className="text-3xl">{openRisks.length}</CardTitle>
            </CardHeader>
          </Card>
        </Link>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="tabler:alert-triangle" className="h-4 w-4 text-amber-200" />
              {t("needsAttention")}
            </CardTitle>
            <CardDescription className="text-slate-200">
              {tr("Auto-highlighted based on freshness, escalations, and approvals.", "تمييز تلقائي حسب الحداثة والتصعيدات والموافقات.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link
              href={`/${locale}/approvals`}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 transition hover:bg-white/5"
            >
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Icon name="tabler:gavel" className="h-4 w-4 text-slate-100" />
                  {t("pendingApprovals")}
                </p>
                <p className="text-xs text-slate-200">{tr("Change requests requiring PMO review.", "طلبات تغيير تتطلب مراجعة PMO.")}</p>
              </div>
              <p className="text-xl font-semibold">{pending.length}</p>
            </Link>
            <Link
              href={`/${locale}/dashboards/risk-escalation`}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 transition hover:bg-white/5"
            >
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Icon name="tabler:flag-3" className="h-4 w-4 text-rose-200" />
                  {t("riskEscalations")}
                </p>
                <p className="text-xs text-slate-200">{tr("Open risks with escalation flag enabled.", "مخاطر مفتوحة مع تفعيل التصعيد.")}</p>
              </div>
              <p className="text-xl font-semibold">{escalations.length}</p>
            </Link>
            <Link
              href={`/${locale}/kpis`}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 transition hover:bg-white/5"
            >
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Icon name="tabler:clock-exclamation" className="h-4 w-4 text-amber-200" />
                  {t("kpisOverdue")}
                </p>
                <p className="text-xs text-slate-200">{tr("KPIs older than 5 days since last entry.", "مؤشرات مرّ عليها أكثر من 5 أيام منذ آخر إدخال.")}</p>
              </div>
              <p className="text-xl font-semibold">{kpisNeedingUpdate.length}</p>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:layers-subtract" className="h-4 w-4 text-slate-100" />
                {t("pillarHealth")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("RAG status roll-up with initiative drill-down.", "تجميع حالة RAG مع استعراض تفصيلي للمبادرات.")}</CardDescription>
            </div>
            <Link href={`/${locale}/strategy`} className="text-sm font-medium text-indigo-200 hover:text-indigo-100">
              {t("viewAll")}
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {pillars.map((pillar) => (
              <Link
                key={pillar.id}
                href={`/${locale}/strategy/${pillar.id}`}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">{isArabic ? pillar.titleAr ?? pillar.title : pillar.title}</p>
                  <p className="text-xs text-slate-200">
                    {pillar.owner} • {pillar.initiatives.length} {tr("initiatives", "مبادرات")}
                  </p>
                </div>
                <RagBadge health={pillar.health} />
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:chart-line" className="h-4 w-4 text-slate-100" />
                {t("kpiPerformance")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("Latest KPI readings vs target with freshness indicator.", "آخر قراءات المؤشرات مقابل المستهدف مع مؤشر الحداثة.")}</CardDescription>
            </div>
            <Link href={`/${locale}/kpis`} className="text-sm font-medium text-indigo-200 hover:text-indigo-100">
              {t("viewAll")}
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-white/0">
                    <TableHead className="text-slate-200">{tr("KPI", "المؤشر")}</TableHead>
                    <TableHead className="text-slate-200">{t("current")}</TableHead>
                    <TableHead className="text-slate-200">{t("target")}</TableHead>
                    <TableHead className="text-slate-200">{t("variance")}</TableHead>
                    <TableHead className="text-right text-slate-200">{t("updated")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleKpis.map((kpi) => (
                    <TableRow key={kpi.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium text-white">
                        <Link href={`/${locale}/kpis/${kpi.id}`} className="hover:underline">
                          {isArabic ? kpi.nameAr ?? kpi.name : kpi.name}
                        </Link>
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
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:gavel" className="h-4 w-4 text-slate-100" />
                {t("governanceApprovals")}
              </CardTitle>
              <CardDescription className="text-slate-200">Change requests and governance decisions.</CardDescription>
            </div>
            <Link href={`/${locale}/approvals`} className="text-sm font-medium text-indigo-200 hover:text-indigo-100">
              {t("viewAll")}
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {changeRequests.slice(0, 4).map((cr) => (
              <Link
                key={cr.id}
                href={`/${locale}/approvals/${cr.id}`}
                className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">
                    {cr.entityType}: {cr.entityName}
                  </p>
                  <p className="text-xs text-slate-200">
                    {tr("Requested by", "مقدم الطلب")} {cr.requestedBy} • {cr.ageDays}
                    {tr("d", "ي")}
                  </p>
                </div>
                <ApprovalBadge status={cr.status} />
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
