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
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("coverageSnapshot")}</CardTitle>
              <Icon name="tabler:layers-subtract" className="text-slate-200" />
            </div>
            <CardDescription className="text-slate-200">{t("alignmentCompletenessDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs text-slate-200">{t("pillar")}</p>
              <p className="mt-1 text-xl font-semibold text-white">{pillars.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs text-slate-200">{t("initiative")}</p>
              <p className="mt-1 text-xl font-semibold text-white">{initiatives.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs text-slate-200">{t("projects")}</p>
              <p className="mt-1 text-xl font-semibold text-white">{totalProjects}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs text-slate-200">{t("pendingApprovals")}</p>
              <p className="mt-1 text-xl font-semibold text-white">{pending.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">{t("approvalAgingSla")}</CardTitle>
              <CardDescription className="text-slate-200">{t("queueDistributionDesc")}</CardDescription>
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
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">{t("governanceQueue")}</CardTitle>
              <CardDescription className="text-slate-200">{t("changeRequestsReviewDesc")}</CardDescription>
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
                className="block rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 transition hover:bg-white/5"
              >
                <p className="text-sm font-semibold text-white">
                  {cr.entityType}: {cr.entityName}
                </p>
                <p className="mt-1 text-xs text-slate-200">
                  {t("requestedBy")} {cr.requestedBy} • {cr.ageDays}{t("daysShort")}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{t("complianceHighlights")}</CardTitle>
            <CardDescription className="text-slate-200">{t("prdAcceptanceChecksDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-100">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="font-semibold text-white">{t("kpisWithoutOwners")}</p>
              <p className="mt-1 text-xs text-slate-200">{t("flagMissingOwnersDesc")}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="font-semibold text-white">{t("orphanedProjects")}</p>
              <p className="mt-1 text-xs text-slate-200">{t("preventOrphanedProjectsDesc")}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="font-semibold text-white">{t("overdueKpiUpdates")}</p>
              <p className="mt-1 text-xs text-slate-200">{t("remindFreshnessThresholdDesc")}</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
