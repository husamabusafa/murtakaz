"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Bar } from "@/components/charts/dashboard-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { approvalsAging } from "@/lib/dashboard-metrics";
import { changeRequests } from "@/lib/mock-data";
import { useLocale } from "@/providers/locale-provider";

export default function GovernanceDashboardPage() {
  const { t, locale } = useLocale();
  const pending = changeRequests.filter((cr) => cr.status === "PENDING");

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("strategyChangeDashboardTitle")}
        subtitle={t("strategyChangeDashboardSubtitle")}
        icon={<Icon name="tabler:gavel" className="h-5 w-5" />}
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card/50 shadow-sm lg:col-span-2">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("approvalCycleTime")}</CardTitle>
              <Icon name="tabler:clock" className="text-muted-foreground" />
            </div>
            <CardDescription className="text-muted-foreground">{t("agingDistributionDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Bar categories={approvalsAging.categories} values={approvalsAging.values} color="#a78bfa" />
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{t("publishControls")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("guardrailsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-foreground">
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="font-semibold text-foreground">{t("pendingChanges")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {pending.length} {t("itemsAwaitingApprovalDesc")}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="font-semibold text-foreground">{t("auditTrail")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("auditTrailDesc")}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">{t("changeRequests")}</CardTitle>
              <CardDescription className="text-muted-foreground">{t("reviewQueueDrilldownDesc")}</CardDescription>
            </div>
            <Link href={`/${locale}/approvals`} className="text-sm font-medium text-indigo-200 hover:text-indigo-100">
              {t("openApprovals")}
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
      </section>
    </div>
  );
}
