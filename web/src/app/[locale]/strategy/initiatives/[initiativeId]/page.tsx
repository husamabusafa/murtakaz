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
  const { locale, t, isArabic } = useLocale();
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
      <div className="rounded-2xl border border-border bg-card/50 p-8 text-foreground">
        <p className="text-sm text-muted-foreground">{t("loadingInitiative")}</p>
      </div>
    );
  }

  if (!base && initiative.title === "Unknown initiative") {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-8 text-foreground">
        <p className="text-sm text-muted-foreground">{t("initiativeNotFound")}</p>
        <Link href={`/${locale}/strategy`} className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">
          {t("backToStrategy")}
        </Link>
      </div>
    );
  }

  const subtitleBits = [
    parentPillar ? (isArabic ? parentPillar.titleAr ?? parentPillar.title : parentPillar.title) : null,
    initiative.owner || null,
    `${initiative.projects.length} ${t("projects")}`,
    `${initiative.kpis.length} ${t("kpis")}`,
    `${initiative.risks.length} ${t("risks")}`,
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
        <TabsList className="border border-border bg-card/50">
          <TabsTrigger value="summary" className="data-[state=active]:bg-muted/30 data-[state=active]:text-foreground">
            {t("summary")}
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
          <TabsTrigger value="updates" className="data-[state=active]:bg-muted/30 data-[state=active]:text-foreground">
            {t("updates")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="grid gap-6 lg:grid-cols-3">
          <Card className="border-border bg-card/50 shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:clipboard-text" className="h-4 w-4 text-foreground" />
                {t("initiativeSummary")}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {t("initiativeDrillDownDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-foreground">
              {parentPillar ? (
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("pillar")}</p>
                  <Link href={`/${locale}/strategy/${parentPillar.id}`} className="mt-1 inline-flex items-center gap-2 text-foreground hover:underline">
                    <Icon name="tabler:layers-subtract" className="h-4 w-4" />
                    {isArabic ? parentPillar.titleAr ?? parentPillar.title : parentPillar.title}
                  </Link>
                </div>
              ) : null}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("owner")}</p>
                  <p className="mt-1 text-foreground">{initiative.owner || "—"}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("timeline")}</p>
                  <p className="mt-1 text-foreground">{initiative.start || "—"}</p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("budgetNotes")}</p>
                <p className="mt-1 text-foreground">{initiative.end || "—"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:activity" className="h-4 w-4 text-foreground" />
                {t("latestUpdate")}
              </CardTitle>
              <CardDescription className="text-muted-foreground">{t("mostRecentUpdateDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-foreground">
              {initiative.updates.length === 0 ? (
                <p className="text-muted-foreground">{t("noUpdatesPosted")}</p>
              ) : (
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">{initiative.updates[0]?.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {initiative.updates[0]?.author} • {new Date(initiative.updates[0]?.at ?? "").toLocaleString()}
                  </p>
                </div>
              )}
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
              <CardDescription className="text-muted-foreground">{t("deliveryProjectsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {initiative.projects.map((project) => (
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
        </TabsContent>

        <TabsContent value="kpis">
          <Card className="border-border bg-card/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:chart-line" className="h-4 w-4 text-foreground" />
                {t("kpis")}
              </CardTitle>
              <CardDescription className="text-muted-foreground">{t("kpisLinkedToInitiativeDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {kpis.map((kpi) => (
                <Link
                  key={kpi.id}
                  href={`/${locale}/kpis/${kpi.id}`}
                  className="block rounded-xl border border-border bg-muted/30 px-4 py-3 transition hover:bg-card/50"
                >
                  <p className="text-sm font-semibold text-foreground">{isArabic ? kpi.nameAr ?? kpi.name : kpi.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("current")} {kpi.current}
                    {kpi.unit} • {t("target")} {kpi.target}
                    {kpi.unit}
                  </p>
                </Link>
              ))}
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
              <CardDescription className="text-muted-foreground">{t("risksLinkedToInitiativeDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {risks.map((risk) => (
                <Link
                  key={risk.id}
                  href={`/${locale}/risks/${risk.id}`}
                  className="block rounded-xl border border-border bg-muted/30 px-4 py-3 transition hover:bg-card/50"
                >
                  <p className="text-sm font-semibold text-foreground">{isArabic ? risk.titleAr ?? risk.title : risk.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {risk.severity} • {risk.status}
                    {risk.escalated ? ` • ${t("escalated")}` : ""}
                  </p>
                </Link>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="updates" className="grid gap-6 lg:grid-cols-3">
          <Card className="border-border bg-card/50 shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:notes" className="h-4 w-4 text-foreground" />
                {t("updates")}
              </CardTitle>
              <CardDescription className="text-muted-foreground">{t("narrativeUpdatesDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <InitiativeUpdateEditor
                onSubmit={(message) =>
                  update(
                    addInitiativeUpdate(initiative, {
                      author: user?.name ?? t("user"),
                      summary: message,
                    }),
                  )
                }
              />
              {initiative.updates.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noUpdatesPosted")}</p>
              ) : (
                initiative.updates.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">{entry.summary}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.author} • {new Date(entry.at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:info-circle" className="h-4 w-4 text-foreground" />
                {t("guidance")}
              </CardTitle>
              <CardDescription className="text-muted-foreground">{t("suggestedWeeklyUpdateDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-foreground">
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="font-semibold text-foreground">{t("progress")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("whatMovedDesc")}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="font-semibold text-foreground">{t("risksAndBlockers")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("needsEscalationDesc")}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="font-semibold text-foreground">{t("nextActions")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("topPrioritiesDesc")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InitiativeUpdateEditor({ onSubmit }: { onSubmit: (message: string) => void }) {
  const { t } = useLocale();
  const [message, setMessage] = useState("");
  return (
    <div className="space-y-3">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t("postUpdatePlaceholder")}
        className="border-border bg-muted/20 text-foreground placeholder:text-muted-foreground"
      />
      <Button
        variant="secondary"
        disabled={message.trim().length === 0}
        onClick={() => {
          onSubmit(message.trim());
          setMessage("");
        }}
      >
        <span className="inline-flex items-center gap-2">
          <Icon name="tabler:send" className="h-4 w-4" />
          {t("postUpdate")}
        </span>
      </Button>
    </div>
  );
}
