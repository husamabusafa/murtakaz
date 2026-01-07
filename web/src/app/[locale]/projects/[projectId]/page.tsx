"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { RagBadge, StatusBadge } from "@/components/rag-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pillars } from "@/lib/mock-data";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import {
  addProjectUpdate,
  createDefaultProject,
  createPlaceholderProject,
  getEffectiveKpi,
  getEffectiveRisk,
  getBaseProject,
  normalizeProjectProgress,
  projectStorageKey,
  type ProjectMilestoneStatus,
  type PrototypeProject,
  useStoredEntity,
} from "@/lib/prototype-store";

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const { t, locale, tr, isArabic } = useLocale();
  const { user } = useAuth();

  const initiatives = pillars.flatMap((pillar) => pillar.initiatives);
  const parentInitiative = initiatives.find((initiative) => initiative.projects.some((item) => item.id === params.projectId));
  const baseProject = getBaseProject(params.projectId);

  const { value: project, update, hydrated } = useStoredEntity<PrototypeProject>(
    projectStorageKey(params.projectId),
    baseProject ? createDefaultProject(baseProject) : createPlaceholderProject(params.projectId),
  );

  const relatedKpis = useMemo(() => {
    const list = parentInitiative?.kpis ?? [];
    return list.map((kpi) => getEffectiveKpi(kpi.id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [parentInitiative]);

  const relatedRisks = useMemo(() => {
    const list = parentInitiative?.risks ?? [];
    return list.map((risk) => getEffectiveRisk(risk.id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [parentInitiative]);

  if (!hydrated) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{t("loadingProject")}</p>
      </div>
    );
  }

  if (!baseProject && project.title === "Unknown project") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{t("projectNotFound")}</p>
        <Link href={`/${locale}/projects`} className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">
          {t("backToProjects")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={isArabic ? project.titleAr ?? project.title : project.title}
        subtitle={`${project.owner} • ${project.milestonesComplete}/${project.milestonesTotal} ${t("milestones")}`}
        icon={<Icon name="tabler:timeline" className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={project.status} />
            <RagBadge health={project.health} />
          </div>
        }
      />

      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList className="border border-white/10 bg-white/5">
          <TabsTrigger value="summary" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {t("summary")}
          </TabsTrigger>
          <TabsTrigger value="milestones" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {t("milestones")}
          </TabsTrigger>
          <TabsTrigger value="updates" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {t("updates")}
          </TabsTrigger>
          <TabsTrigger value="linked" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {t("kpisAndRisks")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="grid gap-6 lg:grid-cols-3">
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:info-circle" className="h-4 w-4 text-slate-100" />
                {t("summary")}
              </CardTitle>
              <CardDescription className="text-slate-200">
                {t("linkedToInitiative")}{" "}
                {parentInitiative ? (
                  <Link href={`/${locale}/strategy/initiatives/${parentInitiative.id}`} className="text-indigo-200 hover:text-indigo-100">
                    {isArabic ? parentInitiative.titleAr ?? parentInitiative.title : parentInitiative.title}
                  </Link>
                ) : (
                  "—"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-100">
              <div className="flex flex-wrap gap-2">
                {(project.tags ?? []).map((tag) => (
                  <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-100">
                    {tag}
                  </span>
                ))}
              </div>

              <Separator className="bg-white/10" />

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{t("dependencies")}</p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-100">
                    {(project.dependencies ?? [t("noDependenciesRecorded")]).map((dep) => (
                      <li key={dep} className="flex items-start gap-2">
                        <Icon name="tabler:link" className="mt-0.5 h-4 w-4 text-amber-200" />
                        <span>{dep}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{t("deliveryHealth")}</p>
                  <p className="mt-2 text-sm text-slate-100">
                    {t("prototypeRollUpDesc")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:bolt" className="h-4 w-4 text-slate-100" />
                {t("quickActions")}
              </CardTitle>
              <CardDescription className="text-slate-200">{t("operationalActionsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-100">
              <Button
                variant="outline"
                className="w-full justify-start border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={() =>
                  update({
                    ...project,
                    status: project.status === "COMPLETED" ? "ACTIVE" : "COMPLETED",
                  })
                }
              >
                <span className="inline-flex items-center gap-2">
                  <Icon name="tabler:check" className="h-4 w-4" />
                  {project.status === "COMPLETED" ? t("reopenProject") : t("markCompleted")}
                </span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={() => update({ ...project, health: project.health === "RED" ? "AMBER" : "RED" })}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon name="tabler:alert-triangle" className="h-4 w-4" />
                  {project.health === "RED" ? t("deEscalateHealth") : t("escalateHealth")}
                </span>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-6">
          <MilestonesCard
            project={project}
            onChange={(next) => update(normalizeProjectProgress(next))}
          />
        </TabsContent>

        <TabsContent value="updates" className="space-y-6">
          <ProjectUpdateComposer
            onSubmit={(input) =>
              update(
                addProjectUpdate(project, {
                  author: user?.name ?? t("user"),
                  summary: input.summary,
                  details: input.details || undefined,
                  blockers: input.blockers || undefined,
                }),
              )
            }
          />

          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:history" className="h-4 w-4 text-slate-100" />
                {t("updateTimeline")}
              </CardTitle>
              <CardDescription className="text-slate-200">{t("steeringUpdatesDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {project.updates.length === 0 ? (
                <p className="text-sm text-slate-200">{t("noUpdatesYet")}</p>
              ) : (
                project.updates.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                    <p className="text-sm font-semibold text-white">{entry.summary}</p>
                    {entry.details ? <p className="mt-1 text-sm text-slate-100">{entry.details}</p> : null}
                    {entry.blockers ? <p className="mt-1 text-sm text-amber-100">{t("blockers")} {entry.blockers}</p> : null}
                    <p className="mt-1 text-xs text-slate-200">
                      {entry.author} • {new Date(entry.at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="linked" className="grid gap-6 lg:grid-cols-2">
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:chart-line" className="h-4 w-4 text-slate-100" />
                {t("kpis")}
              </CardTitle>
              <CardDescription className="text-slate-200">{t("kpisAssignedToInitiativeDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {relatedKpis.length === 0 ? (
                <p className="text-sm text-slate-200">{t("noKpisMapped")}</p>
              ) : (
                relatedKpis.map((kpi) => (
                  <div key={kpi.id} className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                    <p className="text-sm font-semibold text-white">
                      <Link href={`/${locale}/kpis/${kpi.id}`} className="hover:underline">
                        {isArabic ? kpi.nameAr ?? kpi.name : kpi.name}
                      </Link>
                    </p>
                    <p className="mt-1 text-xs text-slate-200">
                      {kpi.current}
                      {kpi.unit} • {t("target")} {kpi.target}
                      {kpi.unit} • {t("owner")} {kpi.owner}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:shield-exclamation" className="h-4 w-4 text-slate-100" />
                {t("risks")}
              </CardTitle>
              <CardDescription className="text-slate-200">{t("risksTaggedToInitiativeDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {relatedRisks.length === 0 ? (
                <p className="text-sm text-slate-200">{t("noRisksMapped")}</p>
              ) : (
                relatedRisks.map((risk) => (
                  <div key={risk.id} className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                    <p className="text-sm font-semibold text-white">
                      <Link href={`/${locale}/risks/${risk.id}`} className="hover:underline">
                        {isArabic ? risk.titleAr ?? risk.title : risk.title}
                      </Link>
                    </p>
                    <p className="mt-1 text-xs text-slate-200">
                      {risk.severity} • {risk.status} • {t("owner")} {risk.owner}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MilestonesCard({
  project,
  onChange,
}: {
  project: PrototypeProject;
  onChange: (next: PrototypeProject) => void;
}) {
  const { t } = useLocale();
  const [newTitle, setNewTitle] = useState("");

  function setMilestoneStatus(milestoneId: string, status: ProjectMilestoneStatus) {
    onChange({
      ...project,
      milestones: project.milestones.map((m) => (m.id === milestoneId ? { ...m, status } : m)),
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon name="tabler:checklist" className="h-4 w-4 text-slate-100" />
            {t("milestones")}
          </CardTitle>
          <CardDescription className="text-slate-200">{t("updateMilestoneStateDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/0">
                  <TableHead className="text-slate-200">{t("milestone")}</TableHead>
                  <TableHead className="text-slate-200">{t("status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.milestones.map((m) => (
                  <TableRow key={m.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium text-white">{m.title}</TableCell>
                    <TableCell className="text-slate-100">
                      <Select value={m.status} onValueChange={(value) => setMilestoneStatus(m.id, value as ProjectMilestoneStatus)}>
                        <SelectTrigger className="w-[180px] border-white/10 bg-slate-950/40 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PLANNED">{t("planned")}</SelectItem>
                          <SelectItem value="IN_PROGRESS">{t("inProgress")}</SelectItem>
                          <SelectItem value="BLOCKED">{t("blocked")}</SelectItem>
                          <SelectItem value="DONE">{t("done")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon name="tabler:plus" className="h-4 w-4 text-slate-100" />
            {t("addMilestone")}
          </CardTitle>
          <CardDescription className="text-slate-200">{t("extendPlanDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t("milestoneTitlePlaceholder")}
            className="border-white/10 bg-black/20 text-white placeholder:text-slate-400"
          />
          <Button
            className="w-full bg-white text-slate-900 hover:bg-slate-100"
            disabled={newTitle.trim().length === 0}
            onClick={() => {
              const trimmed = newTitle.trim();
              const next = {
                ...project,
                milestones: [...project.milestones, { id: `ms-${Date.now()}`, title: trimmed, status: "PLANNED" as const }],
              };
              onChange(next);
              setNewTitle("");
            }}
          >
            <span className="inline-flex items-center gap-2">
              <Icon name="tabler:plus" className="h-4 w-4" />
              {t("add")}
            </span>
          </Button>
          <Separator className="bg-white/10" />
          <p className="text-xs text-slate-200">
            {t("completedMilestones")} <span className="font-semibold text-white">{project.milestonesComplete}</span> /{" "}
            <span className="font-semibold text-white">{project.milestonesTotal}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ProjectUpdateComposer({
  onSubmit,
}: {
  onSubmit: (input: { summary: string; details: string; blockers: string }) => void;
}) {
  const { t } = useLocale();
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [blockers, setBlockers] = useState("");

  return (
    <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon name="tabler:message-plus" className="h-4 w-4 text-slate-100" />
          {t("logUpdate")}
        </CardTitle>
        <CardDescription className="text-slate-200">{t("weeklyProgressUpdateDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-white">{t("summary")}</p>
          <Input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={t("progressSummaryPlaceholder")}
            className="border-white/10 bg-black/20 text-white placeholder:text-slate-400"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-white">{t("detailsOptional")}</p>
          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="border-white/10 bg-black/20 text-white placeholder:text-slate-400"
            placeholder={t("includeMetricsPlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-white">{t("blockersOptional")}</p>
          <Textarea
            value={blockers}
            onChange={(e) => setBlockers(e.target.value)}
            className="border-white/10 bg-black/20 text-white placeholder:text-slate-400"
            placeholder={t("needsEscalationPlaceholder")}
          />
        </div>
        <Button
          className="bg-white text-slate-900 hover:bg-slate-100"
          disabled={summary.trim().length === 0}
          onClick={() => {
            onSubmit({ summary: summary.trim(), details: details.trim(), blockers: blockers.trim() });
            setSummary("");
            setDetails("");
            setBlockers("");
          }}
        >
          <span className="inline-flex items-center gap-2">
            <Icon name="tabler:send" className="h-4 w-4" />
            {t("publishUpdate")}
          </span>
        </Button>
      </CardContent>
    </Card>
  );
}
