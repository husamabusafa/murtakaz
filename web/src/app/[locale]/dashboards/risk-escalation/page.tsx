"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Donut } from "@/components/charts/dashboard-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { riskSeverityBreakdown } from "@/lib/dashboard-metrics";
import { pillars } from "@/lib/mock-data";
import { useLocale } from "@/providers/locale-provider";

export default function RiskEscalationDashboardPage() {
  const { t, locale, isArabic } = useLocale();
  const risks = pillars.flatMap((pillar) => pillar.initiatives.flatMap((initiative) => initiative.risks));
  const escalated = risks.filter((risk) => risk.escalated);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("riskEscalationDashboardTitle")}
        subtitle={t("riskEscalationDashboardSubtitle")}
        icon={<Icon name="tabler:shield-exclamation" className="h-5 w-5" />}
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("severityDistribution")}</CardTitle>
              <Icon name="tabler:shield-exclamation" className="text-slate-200" />
            </div>
            <CardDescription className="text-slate-200">{t("acrossOpenRisksDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Donut items={riskSeverityBreakdown} />
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{t("escalatedRisks")}</CardTitle>
            <CardDescription className="text-slate-200">{t("executiveVisibilityDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {escalated.map((risk) => (
              <Link
                key={risk.id}
                href={`/${locale}/risks/${risk.id}`}
                className="block rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 transition hover:bg-white/5"
              >
                <p className="text-sm font-semibold text-white">{isArabic ? risk.titleAr ?? risk.title : risk.title}</p>
                <p className="mt-1 text-xs text-slate-200">
                  {risk.severity} • {risk.owner} •{" "}
                  {(isArabic ? risk.context.projectAr : risk.context.project) ??
                    (isArabic ? risk.context.initiativeAr : risk.context.initiative) ??
                    (isArabic ? risk.context.pillarAr : risk.context.pillar) ??
                    "—"}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
