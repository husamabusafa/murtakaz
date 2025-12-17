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
import { pillars } from "@/lib/mock-data";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import {
  addInitiativeUpdate,
  createDefaultInitiative,
  createPlaceholderInitiative,
  getEffectiveKpi,
  getEffectiveProject,
  getEffectiveRisk,
  getBaseInitiative,
  initiativeStorageKey,
  type PrototypeInitiative,
  useStoredEntity,
} from "@/lib/prototype-store";

export default function InitiativeDetailPage() {
  const params = useParams<{ initiativeId: string }>();
  const { locale, tr, isArabic } = useLocale();
  const { user } = useAuth();

  const base = getBaseInitiative(params.initiativeId);
  const { value: initiative, update, hydrated } = useStoredEntity<PrototypeInitiative>(
    initiativeStorageKey(params.initiativeId),
    base ? createDefaultInitiative(base) : createPlaceholderInitiative(params.initiativeId),
  );

  const parentPillar = useMemo(
    () => pillars.find((pillar) => pillar.initiatives.some((item) => item.id === params.initiativeId)),
    [params.initiativeId],
  );

  if (!hydrated) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{tr("Loading initiative…", "جارٍ تحميل المبادرة…")}</p>
      </div>
    );
  }

  if (!base && initiative.title === "Unknown initiative") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{tr("Initiative not found.", "المبادرة غير موجودة.")}</p>
        <Link href={`/${locale}/strategy`} className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">
          {tr("Back to strategy", "العودة إلى الاستراتيجية")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={isArabic ? initiative.titleAr ?? initiative.title : initiative.title}
        subtitle={`${initiative.owner}${parentPillar ? ` • ${isArabic ? parentPillar.titleAr ?? parentPillar.title : parentPillar.title}` : ""}`}
        icon={<Icon name="tabler:focus-2" className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={initiative.status} />
            <RagBadge health={initiative.health} />
          </div>
        }
      />

      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList className="border border-white/10 bg-white/5">
          <TabsTrigger value="summary" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {tr("Summary", "ملخص")}
          </TabsTrigger>
          <TabsTrigger value="projects" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {tr("Projects", "المشاريع")}
          </TabsTrigger>
          <TabsTrigger value="kpis" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {tr("KPIs", "المؤشرات")}
          </TabsTrigger>
          <TabsTrigger value="risks" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {tr("Risks", "المخاطر")}
          </TabsTrigger>
          <TabsTrigger value="updates" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {tr("Updates", "التحديثات")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="grid gap-6 lg:grid-cols-3">
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:calendar" className="h-4 w-4 text-slate-100" />
                {tr("Timeline", "الجدول الزمني")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("Start/end and roll-up status.", "تاريخ البداية/النهاية والحالة المجمعة.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-100">
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Start", "البداية")}</p>
                <p className="mt-1 text-white">{initiative.start || "—"}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("End", "النهاية")}</p>
                <p className="mt-1 text-white">{initiative.end || "—"}</p>
              </div>
              <Separator className="bg-white/10" />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  className="bg-white text-slate-900 hover:bg-slate-100"
                  onClick={() => update({ ...initiative, status: "ACTIVE" })}
                >
                  {tr("Set Active", "تعيين نشط")}
                </Button>
                <Button
                  variant="outline"
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => update({ ...initiative, status: "AT_RISK" })}
                >
                  {tr("Mark At Risk", "تعيين معرض للمخاطر")}
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => update({ ...initiative, health: "GREEN" })}
                >
                  {tr("Green", "أخضر")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => update({ ...initiative, health: "AMBER" })}
                >
                  {tr("Amber", "أصفر")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => update({ ...initiative, health: "RED" })}
                >
                  {tr("Red", "أحمر")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:hierarchy-2" className="h-4 w-4 text-slate-100" />
                {tr("Delivery map", "خريطة التنفيذ")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("Quick drill-down into projects, KPIs, and risks.", "استعراض سريع للمشاريع والمؤشرات والمخاطر.")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Projects", "المشاريع")}</p>
                <p className="mt-1 text-2xl font-semibold text-white">{initiative.projects.length}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("KPIs", "المؤشرات")}</p>
                <p className="mt-1 text-2xl font-semibold text-white">{initiative.kpis.length}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Risks", "المخاطر")}</p>
                <p className="mt-1 text-2xl font-semibold text-white">{initiative.risks.length}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="grid gap-4 lg:grid-cols-2">
          {initiative.projects.map((baseProject) => {
            const project = getEffectiveProject(baseProject.id);
            if (!project) return null;
            return (
              <Card key={project.id} className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-base">
                        <Link href={`/${locale}/projects/${project.id}`} className="hover:underline">
                          {isArabic ? project.titleAr ?? project.title : project.title}
                        </Link>
                      </CardTitle>
                      <CardDescription className="text-slate-200">
                        {project.owner} • {project.milestonesComplete}/{project.milestonesTotal} {tr("milestones", "معالم")}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={project.status} />
                      <RagBadge health={project.health} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-slate-100">
                  <div className="flex flex-wrap gap-2">
                    {(project.tags ?? []).map((tag) => (
                      <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="kpis" className="grid gap-4 lg:grid-cols-2">
          {initiative.kpis.map((baseKpi) => {
            const kpi = getEffectiveKpi(baseKpi.id);
            if (!kpi) return null;
            const direction = kpi.variance >= 0 ? "text-emerald-200" : "text-rose-200";
            return (
              <Card key={kpi.id} className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
                <CardHeader className="space-y-2">
                  <CardTitle className="flex items-center justify-between gap-3 text-base">
                    <Link href={`/${locale}/kpis/${kpi.id}`} className="hover:underline">
                      {isArabic ? kpi.nameAr ?? kpi.name : kpi.name}
                    </Link>
                    <span className={`text-sm font-semibold ${direction}`}>
                      {kpi.current}
                      {kpi.unit}
                    </span>
                  </CardTitle>
                  <CardDescription className="text-slate-200">{kpi.owner} • Target {kpi.target}{kpi.unit}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="risks" className="grid gap-4 lg:grid-cols-2">
          {initiative.risks.map((baseRisk) => {
            const risk = getEffectiveRisk(baseRisk.id);
            if (!risk) return null;
            return (
              <Card key={risk.id} className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
                <CardHeader className="space-y-2">
                  <CardTitle className="flex items-center justify-between gap-3 text-base">
                    <Link href={`/${locale}/risks/${risk.id}`} className="hover:underline">
                      {isArabic ? risk.titleAr ?? risk.title : risk.title}
                    </Link>
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-200">
                      <Icon name={risk.escalated ? "tabler:arrow-up-right" : "tabler:arrow-down-right"} className="h-4 w-4" />
                      {risk.severity}
                    </span>
                  </CardTitle>
                  <CardDescription className="text-slate-200">{risk.owner} • {risk.status}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="updates" className="space-y-6">
          <UpdatesCard
            tr={tr}
            onSubmit={({ summary, decision }) => {
              update(
                addInitiativeUpdate(initiative, {
                  author: user?.name ?? tr("User", "مستخدم"),
                  summary,
                  decision: decision || undefined,
                }),
              );
            }}
          />

          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:history" className="h-4 w-4 text-slate-100" />
                {tr("Timeline", "الجدول الزمني")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("Operational updates captured for steering committees.", "تحديثات تشغيلية تُعرض على لجان التوجيه.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {initiative.updates.length === 0 ? (
                <p className="text-sm text-slate-200">{tr("No updates yet.", "لا توجد تحديثات بعد.")}</p>
              ) : (
                initiative.updates.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                    <p className="text-sm font-semibold text-white">{entry.summary}</p>
                    {entry.decision ? <p className="mt-1 text-sm text-slate-100">{tr("Decision:", "القرار:")} {entry.decision}</p> : null}
                    <p className="mt-1 text-xs text-slate-200">
                      {entry.author} • {new Date(entry.at).toLocaleString()}
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

function UpdatesCard({
  onSubmit,
  tr,
}: {
  onSubmit: (input: { summary: string; decision: string }) => void;
  tr: (en: string, ar: string) => string;
}) {
  const [summary, setSummary] = useState("");
  const [decision, setDecision] = useState("");

  return (
    <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon name="tabler:message-plus" className="h-4 w-4 text-slate-100" />
          {tr("Post update", "نشر تحديث")}
        </CardTitle>
        <CardDescription className="text-slate-200">{tr("Capture progress and decisions (prototype).", "توثيق التقدم والقرارات (نموذج أولي).")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-white">{tr("Summary", "ملخص")}</p>
          <Input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={tr("e.g. Vendor contract signed, backlog reprioritized…", "مثال: تم توقيع عقد المورد وإعادة ترتيب الأولويات…")}
            className="border-white/10 bg-black/20 text-white placeholder:text-slate-400"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-white">{tr("Decision (optional)", "القرار (اختياري)")}</p>
          <Textarea
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            placeholder={tr("Optional steering committee decision…", "قرار لجنة التوجيه (اختياري)…")}
            className="border-white/10 bg-black/20 text-white placeholder:text-slate-400"
          />
        </div>
        <Button
          className="bg-white text-slate-900 hover:bg-slate-100"
          disabled={summary.trim().length === 0}
          onClick={() => {
            onSubmit({ summary: summary.trim(), decision: decision.trim() });
            setSummary("");
            setDecision("");
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
