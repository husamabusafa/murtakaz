"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { RagBadge, StatusBadge } from "@/components/rag-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pillars } from "@/lib/mock-data";
import { useLocale } from "@/providers/locale-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEffectiveKpi, getEffectiveRisk } from "@/lib/prototype-store";
import { Badge } from "@/components/ui/badge";

export default function PillarDetailPage() {
  const params = useParams<{ pillarId: string }>();
  const { locale, isArabic, t, nodeTypeLabel } = useLocale();
  const pillar = pillars.find((p) => p.id === params.pillarId);

  if (!pillar) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-8 text-foreground">
        <p className="text-sm text-muted-foreground">{t("pillarNotFound")}</p>
        <Link href={`/${locale}/strategy`} className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">
          {t("backToStrategy")}
        </Link>
      </div>
    );
  }

  const initiatives = pillar.initiatives;
  const projects = initiatives.flatMap((initiative) => initiative.projects);
  const kpis = initiatives
    .flatMap((initiative) => initiative.kpis)
    .map((kpi) => getEffectiveKpi(kpi.id) ?? kpi);
  const risks = initiatives
    .flatMap((initiative) => initiative.risks)
    .map((risk) => getEffectiveRisk(risk.id) ?? risk);

  return (
    <div className="space-y-8">
      <PageHeader
        title={isArabic ? pillar.titleAr ?? pillar.title : pillar.title}
        subtitle={`${pillar.owner} • ${initiatives.length} ${t("initiative")} • ${projects.length} ${t("projects")}`}
        icon={<Icon name="tabler:layers-subtract" className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={pillar.status} />
            <RagBadge health={pillar.health} />
          </div>
        }
      />

      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList className="border border-border bg-card/50">
          <TabsTrigger value="summary" className="data-[state=active]:bg-muted/30 data-[state=active]:text-foreground">
            {t("summary")}
          </TabsTrigger>
          <TabsTrigger value="initiatives" className="data-[state=active]:bg-muted/30 data-[state=active]:text-foreground">
            {t("initiative")}
          </TabsTrigger>
          <TabsTrigger value="projects" className="data-[state=active]:bg-muted/30 data-[state=active]:text-foreground">
            {t("projects")}
          </TabsTrigger>
          <TabsTrigger value="kpis" className="data-[state=active]:bg-muted/30 data-[state=active]:text-foreground">
            {t("kpis")}
          </TabsTrigger>
          <TabsTrigger value="risks" className="data-[state=active]:bg-muted/30 data-[state=active]:text-foreground">
            {t("risks")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="grid gap-6 lg:grid-cols-3">
          <Card className="border-border bg-card/50 shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:activity-heartbeat" className="h-4 w-4 text-foreground" />
                {t("initiative")}
              </CardTitle>
              <CardDescription className="text-muted-foreground">{t("totalInitiativesUnderPillar")}</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-semibold text-foreground">{initiatives.length}</CardContent>
          </Card>
          <Card className="border-border bg-card/50 shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:timeline" className="h-4 w-4 text-foreground" />
                {t("projects")}
              </CardTitle>
              <CardDescription className="text-muted-foreground">{t("totalProjectsLinkedToPillar")}</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-semibold text-foreground">{projects.length}</CardContent>
          </Card>
          <Card className="border-border bg-card/50 shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:shield-exclamation" className="h-4 w-4 text-foreground" />
                {t("risks")}
              </CardTitle>
              <CardDescription className="text-muted-foreground">{t("openRisksAndEscalations")}</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-semibold text-foreground">{risks.length}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="initiatives">
          <Card className="border-border bg-card/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:activity-heartbeat" className="h-4 w-4 text-foreground" />
                {t("initiative")}
              </CardTitle>
              <CardDescription className="text-muted-foreground">{t("currentHealthAndOwnership")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {initiatives.map((initiative) => (
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
                  <div className="mt-2 flex items-center justify-between">
                    <StatusBadge status={initiative.status} />
                    <p className="text-xs text-muted-foreground">
                      {initiative.projects.length} {t("projects")} • {initiative.kpis.length} {t("kpis")}
                    </p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card className="border-border bg-card/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:timeline" className="h-4 w-4 text-foreground" />
                {t("projects")}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {t("executionProgressAndMilestoneCompletion")}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/${locale}/projects/${project.id}`}
                  className="block rounded-xl border border-border bg-muted/30 px-4 py-3 transition hover:bg-card/50"
                >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{isArabic ? project.titleAr ?? project.title : project.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.owner} • {project.milestonesComplete}/{project.milestonesTotal} {t("milestones")}
                      </p>
                    </div>
                    <RagBadge health={project.health} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge status={project.status} />
                    <p className="text-xs text-muted-foreground">{project.tags?.join(" • ")}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kpis">
          <Card className="border-border bg-card/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:chart-line" className="h-4 w-4 text-foreground" />
                {t("kpiPerformance")}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {t("latestReadingsDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-white/0">
                      <TableHead className="text-muted-foreground">{t("kpi")}</TableHead>
                      <TableHead className="text-muted-foreground">{t("initiative")}</TableHead>
                      <TableHead className="text-muted-foreground">{t("current")}</TableHead>
                      <TableHead className="text-muted-foreground">{t("target")}</TableHead>
                      <TableHead className="text-right text-muted-foreground">{t("freshness")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kpis.map((kpi) => (
                      <TableRow key={kpi.id} className="border-border hover:bg-card/50">
                        <TableCell className="font-medium text-foreground">
                          <Link href={`/${locale}/kpis/${kpi.id}`} className="hover:underline">
                            {isArabic ? kpi.nameAr ?? kpi.name : kpi.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{(isArabic ? kpi.lineage.initiativeAr : kpi.lineage.initiative) ?? "—"}</TableCell>
                        <TableCell className="text-foreground">
                          {kpi.current}
                          {kpi.unit}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {kpi.target}
                          {kpi.unit}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{kpi.freshnessDays}d</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks">
          <Card className="border-border bg-card/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:shield-exclamation" className="h-4 w-4 text-foreground" />
                {t("risks")}
              </CardTitle>
              <CardDescription className="text-muted-foreground">{t("openRisksAndEscalations")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {risks.map((risk) => (
                <Link
                  key={risk.id}
                  href={`/${locale}/risks/${risk.id}`}
                  className="block rounded-xl border border-border bg-muted/30 px-4 py-3 transition hover:bg-card/50"
                >
                  <p className="text-sm font-semibold text-foreground">{isArabic ? risk.titleAr ?? risk.title : risk.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {risk.severity} • {risk.owner}
                    {risk.escalated ? ` • ${t("escalated")}` : ""}
                  </p>
                </Link>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
