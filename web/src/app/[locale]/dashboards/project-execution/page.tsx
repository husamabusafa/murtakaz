"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Bar } from "@/components/charts/dashboard-charts";
import { RagBadge, StatusBadge } from "@/components/rag-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { pillars } from "@/lib/mock-data";
import { useLocale } from "@/providers/locale-provider";

export default function ProjectExecutionDashboardPage() {
  const { t, locale, isArabic } = useLocale();
  const initiatives = pillars.flatMap((pillar) => pillar.initiatives);
  const projects = initiatives.flatMap((initiative) => initiative.projects);

  const completion = projects.map((project) =>
    project.milestonesTotal === 0 ? 0 : Math.round((project.milestonesComplete / project.milestonesTotal) * 100),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("projectExecutionDashboardTitle")}
        subtitle={t("projectExecutionDashboardSubtitle")}
        icon={<Icon name="tabler:timeline" className="h-5 w-5" />}
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card/50 shadow-sm lg:col-span-2">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("milestoneCompletion")}</CardTitle>
              <Icon name="tabler:timeline" className="text-muted-foreground" />
            </div>
            <CardDescription className="text-muted-foreground">{t("completionByProjectDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Bar
              categories={projects.map((p) => p.title.split(" ")[0])}
              values={completion}
              color="#60a5fa"
              formatter={(value) => `${value}%`}
            />
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{t("dependencyWatch")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("projectsWithDependenciesDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {projects
              .filter((project) => (project.dependencies ?? []).length > 0)
              .map((project) => (
                <Link
                  key={project.id}
                  href={`/${locale}/projects/${project.id}`}
                  className="block rounded-xl border border-border bg-muted/30 px-4 py-3 transition hover:bg-card/50"
                >
                  <p className="text-sm font-semibold text-foreground">{isArabic ? project.titleAr ?? project.title : project.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{project.dependencies?.join(" • ")}</p>
                </Link>
              ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{t("projectPortfolio")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("healthStatusDrilldownDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/${locale}/projects/${project.id}`}
                className="block rounded-xl border border-border bg-muted/30 px-4 py-3 transition hover:bg-card/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{isArabic ? project.titleAr ?? project.title : project.title}</p>
                    <p className="text-xs text-muted-foreground">{project.owner}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <StatusBadge status={project.status} />
                      <p className="text-xs text-muted-foreground">
                        {project.milestonesComplete}/{project.milestonesTotal}
                      </p>
                    </div>
                  </div>
                  <RagBadge health={project.health} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
