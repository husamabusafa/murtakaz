"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { RagBadge } from "@/components/rag-badge";
import { Donut } from "@/components/charts/dashboard-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { riskSeverityBreakdown } from "@/lib/dashboard-metrics";
import { pillars } from "@/lib/mock-data";
import { useLocale } from "@/providers/locale-provider";

export default function PillarDashboardPage() {
  const { t, locale, isArabic } = useLocale();

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("pillarDashboard")}
        subtitle={t("pillarDashboardSubtitle")}
        icon={<Icon name="tabler:columns-3" className="h-5 w-5" />}
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card/50 shadow-sm lg:col-span-2">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("pillarPosture")}</CardTitle>
              <Icon name="tabler:layers-subtract" className="text-muted-foreground" />
            </div>
            <CardDescription className="text-muted-foreground">{t("ragHealthByPillarDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {pillars.map((pillar) => (
              <Link
                key={pillar.id}
                href={`/${locale}/strategy/${pillar.id}`}
                className="block rounded-xl border border-border bg-muted/30 px-4 py-3 transition hover:bg-card/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{isArabic ? pillar.titleAr ?? pillar.title : pillar.title}</p>
                    <p className="text-xs text-muted-foreground">{pillar.owner}</p>
                    <p className="text-xs text-muted-foreground">
                      {pillar.initiatives.length} {t("initiative")}
                    </p>
                  </div>
                  <RagBadge health={pillar.health} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{t("riskConcentration")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("severityDistributionDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Donut items={riskSeverityBreakdown} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
