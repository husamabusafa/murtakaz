"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { RagBadge, StatusBadge } from "@/components/rag-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { pillars } from "@/lib/mock-data";
import { useLocale } from "@/providers/locale-provider";
import { useAuth } from "@/providers/auth-provider";
import {
  addInitiativeUpdate,
  createDefaultInitiative,
  createPlaceholderInitiative,
  getEffectiveKpi,
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
  const parentPillar = useMemo(
    () => pillars.find((pillar) => pillar.initiatives.some((initiative) => initiative.id === params.initiativeId)) ?? null,
    [params.initiativeId],
  );

  const { value: initiative, update, hydrated } = useStoredEntity<PrototypeInitiative>(
    initiativeStorageKey(params.initiativeId),
    base ? createDefaultInitiative(base) : createPlaceholderInitiative(params.initiativeId),
  );

  const kpis = useMemo(
    () => initiative.kpis.map((kpi) => getEffectiveKpi(kpi.id) ?? kpi),
    [initiative.kpis],
  );
  const risks = useMemo(
    () => initiative.risks.map((risk) => getEffectiveRisk(risk.id) ?? risk),
    [initiative.risks],
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

  const subtitleBits = [
    parentPillar ? (isArabic ? parentPillar.titleAr ?? parentPillar.title : parentPillar.title) : null,
    initiative.owner || null,
    `${initiative.projects.length} ${tr("projects", "مشاريع")}`,
    `${initiative.kpis.length} ${tr("KPIs", "مؤشرات الأداء الرئيسية")}`,
    `${initiative.risks.length} ${tr("risks", "مخاطر")}`,
  ].filter(Boolean);

  return (
    <div className="space-y-8">
      <PageHeader
        title={isArabic ? initiative.titleAr ?? initiative.title : initiative.title}
        subtitle={subtitleBits.join(" • ")}
        icon={<Icon name="tabler:activity-heartbeat" className="h-5 w-5" />}
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
            {tr("KPIs", "مؤشرات الأداء الرئيسية")}
          </TabsTrigger>
          <TabsTrigger value="risks" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {tr("Risks", "المخاطر")}
          </TabsTrigger>
          <TabsTrigger value="updates" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {tr("Updates", "التحديثات")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="grid gap-6 lg:grid-cols-3">
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:clipboard-text" className="h-4 w-4 text-slate-100" />
                {tr("Initiative summary", "ملخص المبادرة")}
              </CardTitle>
              <CardDescription className="text-slate-200">
                {tr("Drill-down across projects, KPIs, risks, and narrative updates.", "استعراض تفصيلي للمشاريع ومؤشرات الأداء الرئيسية والمخاطر والتحديثات.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-100">
              {parentPillar ? (
                <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Pillar", "الركيزة")}</p>
                  <Link href={`/${locale}/strategy/${parentPillar.id}`} className="mt-1 inline-flex items-center gap-2 text-white hover:underline">
                    <Icon name="tabler:layers-subtract" className="h-4 w-4" />
                    {isArabic ? parentPillar.titleAr ?? parentPillar.title : parentPillar.title}
                  </Link>
                </div>
              ) : null}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Owner", "المسؤول")}</p>
                  <p className="mt-1 text-white">{initiative.owner || "—"}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Timeline", "المدة")}</p>
                  <p className="mt-1 text-white">{initiative.start || "—"}</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Budget / notes", "الميزانية / ملاحظات")}</p>
                <p className="mt-1 text-white">{initiative.end || "—"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:activity" className="h-4 w-4 text-slate-100" />
                {tr("Latest update", "آخر تحديث")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("Most recent narrative update (prototype).", "آخر تحديث سردي (نموذج أولي).")}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-100">
              {initiative.updates.length === 0 ? (
                <p className="text-slate-200">{tr("No updates posted yet.", "لا توجد تحديثات حتى الآن.")}</p>
              ) : (
                <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <p className="text-sm font-semibold text-white">{initiative.updates[0]?.summary}</p>
                  <p className="mt-1 text-xs text-slate-200">
                    {initiative.updates[0]?.author} • {new Date(initiative.updates[0]?.at ?? "").toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:timeline" className="h-4 w-4 text-slate-100" />
                {tr("Projects", "المشاريع")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("Delivery projects under this initiative.", "مشاريع التنفيذ ضمن هذه المبادرة.")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {initiative.projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/${locale}/projects/${project.id}`}
                  className="block rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 transition hover:bg-white/5"
                >
                  <p className="text-sm font-semibold text-white">{isArabic ? project.titleAr ?? project.title : project.title}</p>
                  <p className="mt-1 text-xs text-slate-200">{project.owner}</p>
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
                {tr("KPIs", "مؤشرات الأداء الرئيسية")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("KPIs linked to this initiative.", "مؤشرات الأداء الرئيسية المرتبطة بهذه المبادرة.")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {kpis.map((kpi) => (
                <Link
                  key={kpi.id}
                  href={`/${locale}/kpis/${kpi.id}`}
                  className="block rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 transition hover:bg-white/5"
                >
                  <p className="text-sm font-semibold text-white">{isArabic ? kpi.nameAr ?? kpi.name : kpi.name}</p>
                  <p className="mt-1 text-xs text-slate-200">
                    {tr("Current", "الحالي")} {kpi.current}
                    {kpi.unit} • {tr("Target", "المستهدف")} {kpi.target}
                    {kpi.unit}
                  </p>
                </Link>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks">
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:shield-exclamation" className="h-4 w-4 text-slate-100" />
                {tr("Risks", "المخاطر")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("Risks linked to this initiative.", "المخاطر المرتبطة بهذه المبادرة.")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {risks.map((risk) => (
                <Link
                  key={risk.id}
                  href={`/${locale}/risks/${risk.id}`}
                  className="block rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 transition hover:bg-white/5"
                >
                  <p className="text-sm font-semibold text-white">{isArabic ? risk.titleAr ?? risk.title : risk.title}</p>
                  <p className="mt-1 text-xs text-slate-200">
                    {risk.severity} • {risk.owner}
                    {risk.escalated ? ` • ${tr("Escalated", "مصعّد")}` : ""}
                  </p>
                </Link>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="updates" className="grid gap-6 lg:grid-cols-3">
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:notes" className="h-4 w-4 text-slate-100" />
                {tr("Updates", "التحديثات")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("Narrative updates stored locally for the demo.", "تحديثات سردية محفوظة محليًا للعرض.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <InitiativeUpdateEditor
                onSubmit={(message) =>
                  update(
                    addInitiativeUpdate(initiative, {
                      author: user?.name ?? tr("User", "مستخدم"),
                      summary: message,
                    }),
                  )
                }
              />
              {initiative.updates.length === 0 ? (
                <p className="text-sm text-slate-200">{tr("No updates posted yet.", "لا توجد تحديثات حتى الآن.")}</p>
              ) : (
                initiative.updates.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                    <p className="text-sm font-semibold text-white">{entry.summary}</p>
                    <p className="mt-1 text-xs text-slate-200">
                      {entry.author} • {new Date(entry.at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:info-circle" className="h-4 w-4 text-slate-100" />
                {tr("Guidance", "إرشادات")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("Suggested weekly update structure.", "هيكل مقترح لتحديث أسبوعي.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-100">
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="font-semibold text-white">{tr("Progress", "التقدم")}</p>
                <p className="mt-1 text-xs text-slate-200">{tr("What moved since last update?", "ما الذي تغيّر منذ آخر تحديث؟")}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="font-semibold text-white">{tr("Risks & blockers", "المخاطر والعوائق")}</p>
                <p className="mt-1 text-xs text-slate-200">{tr("What needs escalation or support?", "ما الذي يحتاج دعمًا أو تصعيدًا؟")}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="font-semibold text-white">{tr("Next actions", "الخطوات القادمة")}</p>
                <p className="mt-1 text-xs text-slate-200">{tr("Top 1–3 priorities for the coming week.", "أهم 1-3 أولويات للأسبوع القادم.")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InitiativeUpdateEditor({ onSubmit }: { onSubmit: (message: string) => void }) {
  const { tr } = useLocale();
  const [message, setMessage] = useState("");
  return (
    <div className="space-y-3">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={tr("Post a status update for this initiative…", "أضف تحديثًا لهذه المبادرة…")}
        className="border-white/10 bg-black/20 text-white placeholder:text-slate-400"
      />
      <Button
        className="bg-white text-slate-900 hover:bg-slate-100"
        disabled={message.trim().length === 0}
        onClick={() => {
          onSubmit(message.trim());
          setMessage("");
        }}
      >
        <span className="inline-flex items-center gap-2">
          <Icon name="tabler:send" className="h-4 w-4" />
          {tr("Post update", "نشر التحديث")}
        </span>
      </Button>
    </div>
  );
}
