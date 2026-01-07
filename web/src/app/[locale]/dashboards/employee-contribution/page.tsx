"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { SparkLine } from "@/components/charts/dashboard-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { contributionTrend } from "@/lib/dashboard-metrics";
import { pillars } from "@/lib/mock-data";
import { useLocale } from "@/providers/locale-provider";

export default function EmployeeContributionDashboardPage() {
  const { locale, t, isArabic } = useLocale();
  const initiatives = pillars.flatMap((pillar) => pillar.initiatives);
  const projects = initiatives.flatMap((initiative) => initiative.projects);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("employeeContributionDashboard")}
        subtitle={t("employeeContributionSubtitle")}
        icon={<Icon name="tabler:bolt" className="h-5 w-5" />}
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("contributionVelocity")}</CardTitle>
              <Icon name="tabler:bolt" className="text-muted-foreground" />
            </div>
            <CardDescription className="text-muted-foreground">{t("updatesPerPeriodDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SparkLine values={contributionTrend} color="#60a5fa" />
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs text-muted-foreground">{t("assignedProjects")}</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{projects.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 shadow-sm lg:col-span-2">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{t("assignedWorkDemo")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("teamAssignmentsFilterDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/${locale}/projects/${project.id}`}
                className="block rounded-xl border border-border bg-muted/30 px-4 py-3 transition hover:bg-card/50"
              >
                <p className="text-sm font-semibold text-foreground">{isArabic ? project.titleAr ?? project.title : project.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{project.owner}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
