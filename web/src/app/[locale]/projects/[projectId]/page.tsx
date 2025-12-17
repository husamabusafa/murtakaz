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
  const { locale, tr, isArabic } = useLocale();
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
        <p className="text-sm text-slate-200">{tr("Loading project…", "جارٍ تحميل المشروع…")}</p>
      </div>
    );
  }

  if (!baseProject && project.title === "Unknown project") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{tr("Project not found.", "المشروع غير موجود.")}</p>
        <Link href={`/${locale}/projects`} className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">
          {tr("Back to projects", "العودة إلى المشاريع")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={isArabic ? project.titleAr ?? project.title : project.title}
        subtitle={`${project.owner} • ${project.milestonesComplete}/${project.milestonesTotal} ${tr("milestones", "معالم")}`}
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
            {tr("Summary", "ملخص")}
          </TabsTrigger>
          <TabsTrigger value="milestones" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {tr("Milestones", "المعالم")}
          </TabsTrigger>
          <TabsTrigger value="updates" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {tr("Updates", "التحديثات")}
          </TabsTrigger>
          <TabsTrigger value="linked" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {tr("KPIs & risks", "المؤشرات والمخاطر")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="grid gap-6 lg:grid-cols-3">
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:info-circle" className="h-4 w-4 text-slate-100" />
                {tr("Summary", "ملخص")}
              </CardTitle>
              <CardDescription className="text-slate-200">
                {tr("Linked to initiative:", "مرتبط بالمبادرة:")}{" "}
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Dependencies", "الاعتمادات")}</p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-100">
                    {(project.dependencies ?? [tr("No dependencies recorded", "لا توجد اعتمادات مسجلة")]).map((dep) => (
                      <li key={dep} className="flex items-start gap-2">
                        <Icon name="tabler:link" className="mt-0.5 h-4 w-4 text-amber-200" />
                        <span>{dep}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Delivery health", "صحة التنفيذ")}</p>
                  <p className="mt-2 text-sm text-slate-100">
                    {tr(
                      "Prototype roll-up based on milestone completion and posted updates. Governance integrations (Jira/Planner) are Phase 1.",
                      "مؤشر تجميعي يعتمد على اكتمال المعالم والتحديثات. تكاملات الحوكمة (Jira/Planner) ضمن المرحلة الأولى.",
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:bolt" className="h-4 w-4 text-slate-100" />
                {tr("Quick actions", "إجراءات سريعة")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("Common operational actions (prototype).", "إجراءات تشغيلية شائعة (نموذج أولي).")}</CardDescription>
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
                  {project.status === "COMPLETED" ? tr("Reopen project", "إعادة فتح المشروع") : tr("Mark completed", "تعيين كمكتمل")}
                </span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={() => update({ ...project, health: project.health === "RED" ? "AMBER" : "RED" })}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon name="tabler:alert-triangle" className="h-4 w-4" />
                  {project.health === "RED" ? tr("De-escalate health", "خفض التصعيد") : tr("Escalate health", "تصعيد الحالة")}
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
            tr={tr}
            onSubmit={(input) =>
              update(
                addProjectUpdate(project, {
                  author: user?.name ?? tr("User", "مستخدم"),
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
                {tr("Update timeline", "سجل التحديثات")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("Immutable operational updates for weekly steering.", "تحديثات تشغيلية محفوظة لعرضها في الاجتماع الأسبوعي.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {project.updates.length === 0 ? (
                <p className="text-sm text-slate-200">{tr("No updates yet.", "لا توجد تحديثات بعد.")}</p>
              ) : (
                project.updates.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                    <p className="text-sm font-semibold text-white">{entry.summary}</p>
                    {entry.details ? <p className="mt-1 text-sm text-slate-100">{entry.details}</p> : null}
                    {entry.blockers ? <p className="mt-1 text-sm text-amber-100">{tr("Blockers:", "عوائق:")} {entry.blockers}</p> : null}
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
                {tr("KPIs", "المؤشرات")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("KPIs assigned to this initiative (prototype mapping).", "المؤشرات المرتبطة بهذه المبادرة (ربط تجريبي).")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {relatedKpis.length === 0 ? (
                <p className="text-sm text-slate-200">{tr("No KPIs mapped.", "لا توجد مؤشرات مرتبطة.")}</p>
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
                      {kpi.unit} • {tr("Target", "المستهدف")} {kpi.target}
                      {kpi.unit} • {tr("Owner", "المالك")} {kpi.owner}
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
                {tr("Risks", "المخاطر")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("Risks tagged to the same initiative.", "المخاطر المرتبطة بنفس المبادرة.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {relatedRisks.length === 0 ? (
                <p className="text-sm text-slate-200">{tr("No risks mapped.", "لا توجد مخاطر مرتبطة.")}</p>
              ) : (
                relatedRisks.map((risk) => (
                  <div key={risk.id} className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                    <p className="text-sm font-semibold text-white">
                      <Link href={`/${locale}/risks/${risk.id}`} className="hover:underline">
                        {isArabic ? risk.titleAr ?? risk.title : risk.title}
                      </Link>
                    </p>
                    <p className="mt-1 text-xs text-slate-200">
                      {risk.severity} • {risk.status} • {tr("Owner", "المالك")} {risk.owner}
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
  const { tr } = useLocale();
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
            {tr("Milestones", "المعالم")}
          </CardTitle>
          <CardDescription className="text-slate-200">{tr("Update milestone delivery state (stored locally for demo).", "تحديث حالة المعالم (حفظ محليًا للعرض).")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/0">
                  <TableHead className="text-slate-200">{tr("Milestone", "المعلم")}</TableHead>
                  <TableHead className="text-slate-200">{tr("Status", "الحالة")}</TableHead>
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
                          <SelectItem value="PLANNED">{tr("Planned", "مخطط")}</SelectItem>
                          <SelectItem value="IN_PROGRESS">{tr("In progress", "قيد التنفيذ")}</SelectItem>
                          <SelectItem value="BLOCKED">{tr("Blocked", "متوقف")}</SelectItem>
                          <SelectItem value="DONE">{tr("Done", "منجز")}</SelectItem>
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
            {tr("Add milestone", "إضافة معلم")}
          </CardTitle>
          <CardDescription className="text-slate-200">{tr("Extend the plan during steering (prototype).", "توسيع الخطة أثناء الاجتماع (نموذج أولي).")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={tr("Milestone title…", "عنوان المعلم…")}
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
              {tr("Add", "إضافة")}
            </span>
          </Button>
          <Separator className="bg-white/10" />
          <p className="text-xs text-slate-200">
            {tr("Completed milestones:", "المعالم المكتملة:")} <span className="font-semibold text-white">{project.milestonesComplete}</span> /{" "}
            <span className="font-semibold text-white">{project.milestonesTotal}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ProjectUpdateComposer({
  onSubmit,
  tr,
}: {
  onSubmit: (input: { summary: string; details: string; blockers: string }) => void;
  tr: (en: string, ar: string) => string;
}) {
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [blockers, setBlockers] = useState("");

  return (
    <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon name="tabler:message-plus" className="h-4 w-4 text-slate-100" />
          {tr("Log update", "تسجيل تحديث")}
        </CardTitle>
        <CardDescription className="text-slate-200">{tr("Progress update for weekly delivery cadence (prototype).", "تحديث تقدم للإيقاع الأسبوعي للتنفيذ (نموذج أولي).")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-white">{tr("Summary", "ملخص")}</p>
          <Input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={tr("e.g. Sprint 6 completed; UAT started…", "مثال: اكتمل السبرنت 6 وبدأت اختبارات UAT…")}
            className="border-white/10 bg-black/20 text-white placeholder:text-slate-400"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-white">{tr("Details (optional)", "تفاصيل (اختياري)")}</p>
          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="border-white/10 bg-black/20 text-white placeholder:text-slate-400"
            placeholder={tr("Include metrics, links, and key decisions…", "أضف مؤشرات وروابط وقرارات رئيسية…")}
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-white">{tr("Blockers (optional)", "عوائق (اختياري)")}</p>
          <Textarea
            value={blockers}
            onChange={(e) => setBlockers(e.target.value)}
            className="border-white/10 bg-black/20 text-white placeholder:text-slate-400"
            placeholder={tr("Anything that needs escalation…", "أي أمر يحتاج تصعيدًا…")}
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
            {tr("Publish update", "نشر التحديث")}
          </span>
        </Button>
      </CardContent>
    </Card>
  );
}
