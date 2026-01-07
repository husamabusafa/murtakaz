"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { RagBadge } from "@/components/rag-badge";
import { Bar } from "@/components/charts/dashboard-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { kpiVarianceTop } from "@/lib/dashboard-metrics";
import { pillars } from "@/lib/mock-data";
import { useLocale } from "@/providers/locale-provider";

export default function InitiativeHealthDashboardPage() {
  const { locale, t, isArabic } = useLocale();
  const initiatives = pillars.flatMap((pillar) => pillar.initiatives);
  const atRisk = initiatives.filter((initiative) => initiative.health !== "GREEN");

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("initiativeHealthDashboard")}
        subtitle={t("initiativeHealthDashboardSubtitle")}
        icon={<Icon name="tabler:activity-heartbeat" className="h-5 w-5" />}
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("healthDrivers")}</CardTitle>
              <Icon name="tabler:activity-heartbeat" className="text-slate-200" />
            </div>
            <CardDescription className="text-slate-200">{t("illustrativeDriverWeightsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Bar categories={[t("kpis"), t("milestones"), t("risks"), t("updates")]} values={[45, 25, 20, 10]} color="#60a5fa" />
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{t("kpiVarianceSignals")}</CardTitle>
            <CardDescription className="text-slate-200">{t("topNegativeDeltasDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Bar
              categories={kpiVarianceTop.categories}
              values={kpiVarianceTop.values.map((v) => Math.min(v, 0))}
              color="#fb7185"
              formatter={(value) => `${value > 0 ? "+" : ""}${value}`}
              height={240}
            />
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{t("initiativesRequiringAttention")}</CardTitle>
            <CardDescription className="text-slate-200">{t("investigateHealthDriversDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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
                    <p className="text-xs text-slate-300">
                      {initiative.projects.length} {t("projects")} • {initiative.kpis.length} {t("kpis")} • {initiative.risks.length} {t("risks")}
                    </p>
                  </div>
                  <RagBadge health={initiative.health} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
