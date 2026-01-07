"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Bar } from "@/components/charts/dashboard-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { approvalsAging } from "@/lib/dashboard-metrics";
import { changeRequests, pillars } from "@/lib/mock-data";
import { useLocale } from "@/providers/locale-provider";

export default function PMODashboardPage() {
  const { locale, t } = useLocale();
  const initiatives = pillars.flatMap((pillar) => pillar.initiatives);
  const totalProjects = initiatives.flatMap((initiative) => initiative.projects).length;
  const pending = changeRequests.filter((cr) => cr.status === "PENDING");

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("pmoDashboardTitle")}
        subtitle={t("pmoDashboardSubtitle")}
        icon={<Icon name="tabler:gavel" className="h-5 w-5" />}
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("coverageSnapshot")}</CardTitle>
              <Icon name="tabler:layers-subtract" className="text-muted-foreground" />
            </div>
            <CardDescription className="text-muted-foreground">{t("alignmentCompletenessDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs text-muted-foreground">{t("pillar")}</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{pillars.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs text-muted-foreground">{t("initiative")}</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{initiatives.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs text-muted-foreground">{t("projects")}</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{totalProjects}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs text-muted-foreground">{t("pendingApprovals")}</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{pending.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">{t("approvalAgingSla")}</CardTitle>
              <CardDescription className="text-muted-foreground">{t("queueDistributionDesc")}</CardDescription>
            </div>
            <Link href={`/${locale}/approvals`} className="text-sm font-medium text-indigo-200 hover:text-indigo-100">
              {t("openApprovals")}
            </Link>
          </CardHeader>
          <CardContent>
            <Bar categories={approvalsAging.categories} values={approvalsAging.values} color="#a78bfa" />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card/50 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">{t("governanceQueue")}</CardTitle>
              <CardDescription className="text-muted-foreground">{t("changeRequestsReviewDesc")}</CardDescription>
            </div>
            <Link href={`/${locale}/approvals`} className="text-sm font-medium text-indigo-200 hover:text-indigo-100">
              {t("viewAll")}
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.map((cr) => (
              <Link
                key={cr.id}
                href={`/${locale}/approvals/${cr.id}`}
                className="block rounded-xl border border-border bg-muted/30 px-4 py-3 transition hover:bg-card/50"
              >
                <p className="text-sm font-semibold text-foreground">
                  {cr.entityType}: {cr.entityName}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("requestedBy")} {cr.requestedBy} • {cr.ageDays}{t("daysShort")}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{t("complianceHighlights")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("prdAcceptanceChecksDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-foreground">
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="font-semibold text-foreground">{t("kpisWithoutOwners")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("flagMissingOwnersDesc")}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="font-semibold text-foreground">{t("orphanedProjects")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("preventOrphanedProjectsDesc")}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="font-semibold text-foreground">{t("overdueKpiUpdates")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("remindFreshnessThresholdDesc")}</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
