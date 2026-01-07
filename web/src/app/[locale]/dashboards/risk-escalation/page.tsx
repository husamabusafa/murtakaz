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
        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("severityDistribution")}</CardTitle>
              <Icon name="tabler:shield-exclamation" className="text-muted-foreground" />
            </div>
            <CardDescription className="text-muted-foreground">{t("acrossOpenRisksDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Donut items={riskSeverityBreakdown} />
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 shadow-sm lg:col-span-2">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{t("escalatedRisks")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("executiveVisibilityDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {escalated.map((risk) => (
              <Link
                key={risk.id}
                href={`/${locale}/risks/${risk.id}`}
                className="block rounded-xl border border-border bg-muted/30 px-4 py-3 transition hover:bg-card/50"
              >
                <p className="text-sm font-semibold text-foreground">{isArabic ? risk.titleAr ?? risk.title : risk.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
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
