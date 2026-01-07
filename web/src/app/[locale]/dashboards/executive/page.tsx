"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { RagBadge } from "@/components/rag-badge";
import { Bar, Donut, SparkLine } from "@/components/charts/dashboard-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { approvalsAging, executiveTrend, riskSeverityBreakdown } from "@/lib/dashboard-metrics";
import { kpis, pillars } from "@/lib/mock-data";
import { useLocale } from "@/providers/locale-provider";

export default function ExecutiveDashboardPage() {
  const { t, locale, isArabic } = useLocale();
  const initiatives = pillars.flatMap((pillar) => pillar.initiatives);
  const atRisk = initiatives.filter((initiative) => initiative.health !== "GREEN");

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("ceoExecutiveDashboard")}
        subtitle={t("ceoExecutiveDashboardSubtitle")}
        icon={<Icon name="tabler:layout-dashboard" className="h-5 w-5" />}
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("deliveryConfidence")}</CardTitle>
              <Icon name="tabler:trend-up" className="text-slate-200" />
            </div>
            <CardDescription className="text-slate-200">{t("last12PeriodsIndexDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{t("confidenceIndex")}</p>
              <p className="text-sm text-slate-200">{executiveTrend.at(-1)} / 100</p>
            </div>
            <SparkLine values={executiveTrend} />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="text-xs text-slate-200">{t("atRiskInitiatives")}</p>
                <p className="mt-1 text-xl font-semibold text-white">{atRisk.length}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="text-xs text-slate-200">{t("pillarsActive")}</p>
                <p className="mt-1 text-xl font-semibold text-white">{pillars.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("riskMix")}</CardTitle>
              <Icon name="tabler:shield-exclamation" className="text-slate-200" />
            </div>
            <CardDescription className="text-slate-200">{t("severityDistributionDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Donut items={riskSeverityBreakdown} />
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("governanceAging")}</CardTitle>
              <Icon name="tabler:gavel" className="text-slate-200" />
            </div>
            <CardDescription className="text-slate-200">{t("approvalQueueAgingDesc")}</CardDescription>
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
              <CardTitle className="text-base">{t("initiativesRequiringIntervention")}</CardTitle>
              <CardDescription className="text-slate-200">{t("investigateHealthDriversDesc")}</CardDescription>
            </div>
            <Link href={`/${locale}/dashboards/initiative-health`} className="text-sm font-medium text-indigo-200 hover:text-indigo-100">
              {t("openInitiativeHealth")}
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {atRisk.map((initiative) => (
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
            <CardTitle className="text-base">{t("topKpis")}</CardTitle>
            <CardDescription className="text-slate-200">{t("quickLinksKpiDrillDownDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {kpis.map((kpi) => (
              <Link
                key={kpi.id}
                href={`/${locale}/kpis/${kpi.id}`}
                className="block rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 transition hover:bg-white/5"
              >
                <p className="text-sm font-semibold text-white">{isArabic ? kpi.nameAr ?? kpi.name : kpi.name}</p>
                  <p className="mt-1 text-xs text-slate-200">
                    {t("current")} {kpi.current}
                    {kpi.unit} • {t("target")} {kpi.target}
                    {kpi.unit}
                  </p>
                </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
