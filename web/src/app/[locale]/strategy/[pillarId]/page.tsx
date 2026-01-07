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
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{t("pillarNotFound")}</p>
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
        <TabsList className="border border-white/10 bg-white/5">
          <TabsTrigger value="summary" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {t("summary")}
          </TabsTrigger>
          <TabsTrigger value="initiatives" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {t("initiative")}
          </TabsTrigger>
          <TabsTrigger value="projects" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {t("projects")}
          </TabsTrigger>
          <TabsTrigger value="kpis" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {t("kpis")}
          </TabsTrigger>
          <TabsTrigger value="risks" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {t("risks")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="grid gap-6 lg:grid-cols-3">
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:activity-heartbeat" className="h-4 w-4 text-slate-100" />
                {t("initiative")}
              </CardTitle>
              <CardDescription className="text-slate-200">{t("totalInitiativesUnderPillar")}</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-semibold text-white">{initiatives.length}</CardContent>
          </Card>
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:timeline" className="h-4 w-4 text-slate-100" />
                {t("projects")}
              </CardTitle>
              <CardDescription className="text-slate-200">{t("totalProjectsLinkedToPillar")}</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-semibold text-white">{projects.length}</CardContent>
          </Card>
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:shield-exclamation" className="h-4 w-4 text-slate-100" />
                {t("risks")}
              </CardTitle>
              <CardDescription className="text-slate-200">{t("openRisksAndEscalations")}</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-semibold text-white">{risks.length}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="initiatives">
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:activity-heartbeat" className="h-4 w-4 text-slate-100" />
                {t("initiative")}
              </CardTitle>
              <CardDescription className="text-slate-200">{t("currentHealthAndOwnership")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {initiatives.map((initiative) => (
                <Link
                  key={initiative.id}
                  href={`/${locale}/strategy/initiatives/${initiative.id}`}
                  className="block rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 transition hover:bg-white/5"
                >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">{isArabic ? initiative.titleAr ?? initiative.title : initiative.title}</p>
                      <p className="text-xs text-slate-200">{initiative.owner}</p>
                    </div>
                    <RagBadge health={initiative.health} />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <StatusBadge status={initiative.status} />
                    <p className="text-xs text-slate-200">
                      {initiative.projects.length} {t("projects")} • {initiative.kpis.length} {t("kpis")}
                    </p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:timeline" className="h-4 w-4 text-slate-100" />
                {t("projects")}
              </CardTitle>
              <CardDescription className="text-slate-200">
                {t("executionProgressAndMilestoneCompletion")}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/${locale}/projects/${project.id}`}
                  className="block rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 transition hover:bg-white/5"
                >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">{isArabic ? project.titleAr ?? project.title : project.title}</p>
                      <p className="text-xs text-slate-200">
                        {project.owner} • {project.milestonesComplete}/{project.milestonesTotal} {t("milestones")}
                      </p>
                    </div>
                    <RagBadge health={project.health} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge status={project.status} />
                    <p className="text-xs text-slate-200">{project.tags?.join(" • ")}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kpis">
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:chart-line" className="h-4 w-4 text-slate-100" />
                {t("kpiPerformance")}
              </CardTitle>
              <CardDescription className="text-slate-200">
                {t("latestReadingsDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-xl border border-white/10">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-white/0">
                      <TableHead className="text-slate-200">{t("kpi")}</TableHead>
                      <TableHead className="text-slate-200">{t("initiative")}</TableHead>
                      <TableHead className="text-slate-200">{t("current")}</TableHead>
                      <TableHead className="text-slate-200">{t("target")}</TableHead>
                      <TableHead className="text-right text-slate-200">{t("freshness")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kpis.map((kpi) => (
                      <TableRow key={kpi.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="font-medium text-white">
                          <Link href={`/${locale}/kpis/${kpi.id}`} className="hover:underline">
                            {isArabic ? kpi.nameAr ?? kpi.name : kpi.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-slate-200">{(isArabic ? kpi.lineage.initiativeAr : kpi.lineage.initiative) ?? "—"}</TableCell>
                        <TableCell className="text-slate-100">
                          {kpi.current}
                          {kpi.unit}
                        </TableCell>
                        <TableCell className="text-slate-100">
                          {kpi.target}
                          {kpi.unit}
                        </TableCell>
                        <TableCell className="text-right text-slate-200">{kpi.freshnessDays}d</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks">
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:shield-exclamation" className="h-4 w-4 text-slate-100" />
                {t("risks")}
              </CardTitle>
              <CardDescription className="text-slate-200">{t("openRisksAndEscalations")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {risks.map((risk) => (
                <Link
                  key={risk.id}
                  href={`/${locale}/risks/${risk.id}`}
                  className="block rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 transition hover:bg-white/5"
                >
                  <p className="text-sm font-semibold text-white">{isArabic ? risk.titleAr ?? risk.title : risk.title}</p>
                  <p className="mt-1 text-xs text-slate-200">
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
