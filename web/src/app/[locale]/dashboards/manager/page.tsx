"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { SparkLine } from "@/components/charts/dashboard-charts";
import { RagBadge } from "@/components/rag-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { contributionTrend } from "@/lib/dashboard-metrics";
import { changeRequests, pillars } from "@/lib/mock-data";
import { useLocale } from "@/providers/locale-provider";

export default function ManagerDashboardPage() {
  const { t, locale, isArabic } = useLocale();
  const initiatives = pillars.flatMap((pillar) => pillar.initiatives);
  const atRisk = initiatives.filter((initiative) => initiative.health !== "GREEN");
  const pendingApprovals = changeRequests.filter((cr) => cr.status === "PENDING");

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("managerDashboardTitle")}
        subtitle={t("managerDashboardSubtitle")}
        icon={<Icon name="tabler:users-group" className="h-5 w-5" />}
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("teamVelocity")}</CardTitle>
              <Icon name="tabler:users-group" className="text-muted-foreground" />
            </div>
            <CardDescription className="text-muted-foreground">{t("contributionTrendDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SparkLine values={contributionTrend} color="#34d399" />
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs text-muted-foreground">{t("pendingApprovals")}</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{pendingApprovals.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 shadow-sm lg:col-span-2">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{t("ownedInitiativesDemo")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("managerOwnershipFilterDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {atRisk.map((initiative) => (
              <Link
                key={initiative.id}
                href={`/${locale}/strategy/initiatives/${initiative.id}`}
                className="block rounded-xl border border-border bg-muted/30 px-4 py-3 transition hover:bg-card/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{isArabic ? initiative.titleAr ?? initiative.title : initiative.title}</p>
                    <p className="text-xs text-muted-foreground">{initiative.owner}</p>
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
