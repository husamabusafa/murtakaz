"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { AreaLine, Bar, Donut } from "@/components/charts/dashboard-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLocale } from "@/providers/locale-provider";
import type { TranslationKey } from "@/providers/locale-provider";

const SAMPLE_DATA = {
  summary: { totalStrategies: 5, totalObjectives: 24, totalKpis: 42, overallHealth: 89, criticalAlerts: 3, upcomingDeadlines: 7 },
  strategicAlignment: { categories: ["Vision", "Mission", "Values", "Goals", "Initiatives"], values: [95, 92, 88, 85, 90] },
  healthDistribution: [
    { nameKey: "excellent", value: 18, color: "#10b981" },
    { nameKey: "good", value: 14, color: "#3b82f6" },
    { nameKey: "fair", value: 7, color: "#f59e0b" },
    { nameKey: "needsAttention", value: 3, color: "#ef4444" },
  ],
  quarterlyProgress: { categories: ["Q1", "Q2", "Q3", "Q4"], values: [78, 85, 88, 92] },
  recentActivities: [
    { title: "Strategic Review Completed", time: "2 hours ago", status: "completed", icon: "tabler:check" },
    { title: "Q4 Targets Updated", time: "5 hours ago", status: "updated", icon: "tabler:edit" },
    { title: "New Initiative Approved", time: "1 day ago", status: "new", icon: "tabler:plus" },
    { title: "Risk Assessment Pending", time: "2 days ago", status: "pending", icon: "tabler:alert-circle" },
  ],
  upcomingMilestones: [
    { name: "Annual Strategy Review", date: "Jan 30, 2026", progress: 75, daysLeft: 16 },
    { name: "Q1 OKR Planning", date: "Feb 15, 2026", progress: 45, daysLeft: 32 },
    { name: "Budget Approval", date: "Mar 1, 2026", progress: 30, daysLeft: 46 },
  ],
  teamPerformance: [
    { team: "Executive", score: 96, trendKey: "up", color: "#8b5cf6" },
    { team: "Operations", score: 91, trendKey: "up", color: "#3b82f6" },
    { team: "Sales", score: 88, trendKey: "stable", color: "#10b981" },
    { team: "Marketing", score: 85, trendKey: "down", color: "#f59e0b" },
    { team: "IT", score: 92, trendKey: "up", color: "#06b6d4" },
  ],
};

function getActivityIcon(status: string) {
  if (status === "completed") return { name: "tabler:check", color: "text-emerald-500" };
  if (status === "updated") return { name: "tabler:edit", color: "text-blue-500" };
  if (status === "new") return { name: "tabler:plus", color: "text-violet-500" };
  return { name: "tabler:alert-circle", color: "text-amber-500" };
}

function getTrendIcon(trend: string) {
  if (trend === "up") return { name: "tabler:trending-up", color: "text-emerald-500" };
  if (trend === "down") return { name: "tabler:trending-down", color: "text-rose-500" };
  return { name: "tabler:minus", color: "text-slate-500" };
}

export default function OverviewPage() {
  const { locale, t } = useLocale();
  const data = SAMPLE_DATA;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("executiveOverview")}
        subtitle={t("executiveOverviewSubtitle")}
        icon={<Icon name="tabler:layout-dashboard" className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/${locale}/dashboards`}>
                <Icon name="tabler:chart-line" className="me-2 h-4 w-4" />
                {t("dashboards")}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/${locale}/strategy`}>
                <Icon name="tabler:target-arrow" className="me-2 h-4 w-4" />
                {t("strategy")}
              </Link>
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="bg-gradient-to-br from-violet-500/10 to-card backdrop-blur border-violet-500/20">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
              <Icon name="tabler:target-arrow" className="h-4 w-4" />
              {t("strategies")}
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{data.summary.totalStrategies}</CardTitle>
          </CardHeader>
          <CardContent><p className="text-xs text-muted-foreground">{t("activeStrategicInitiatives")}</p></CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-card backdrop-blur border-blue-500/20">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Icon name="tabler:flag-3" className="h-4 w-4" />
              {t("objectives")}
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{data.summary.totalObjectives}</CardTitle>
          </CardHeader>
          <CardContent><p className="text-xs text-muted-foreground">{t("organizationalObjectives")}</p></CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-card backdrop-blur border-emerald-500/20">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Icon name="tabler:chart-bar" className="h-4 w-4" />
              {t("kpis")}
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{data.summary.totalKpis}</CardTitle>
          </CardHeader>
          <CardContent><p className="text-xs text-muted-foreground">{t("keyPerformanceIndicators")}</p></CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-card backdrop-blur border-cyan-500/20">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
              <Icon name="tabler:activity" className="h-4 w-4" />
              {t("health")}
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{data.summary.overallHealth}%</CardTitle>
          </CardHeader>
          <CardContent><Progress value={data.summary.overallHealth} className="h-1.5" /></CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-card backdrop-blur border-amber-500/20">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Icon name="tabler:alert-triangle" className="h-4 w-4" />
              {t("alerts")}
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{data.summary.criticalAlerts}</CardTitle>
          </CardHeader>
          <CardContent><p className="text-xs text-muted-foreground">{t("itemsNeedAttention")}</p></CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/10 to-card backdrop-blur border-rose-500/20">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <Icon name="tabler:calendar-due" className="h-4 w-4" />
              {t("deadlines")}
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{data.summary.upcomingDeadlines}</CardTitle>
          </CardHeader>
          <CardContent><p className="text-xs text-muted-foreground">{t("dueWithin30Days")}</p></CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{t("strategicAlignment")}</CardTitle>
                <CardDescription className="mt-1">{t("alignmentAcrossStrategicDimensions")}</CardDescription>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">{t("strong")}</Badge>
            </div>
          </CardHeader>
          <CardContent><Bar categories={data.strategicAlignment.categories} values={data.strategicAlignment.values} height={280} color="#8b5cf6" /></CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("organizationalHealth")}</CardTitle>
            <CardDescription className="mt-1">{t("performanceDistribution")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Donut items={data.healthDistribution.map(item => ({ name: t(item.nameKey as TranslationKey), value: item.value, color: item.color }))} height={240} />
            <div className="mt-4 space-y-2">
              {data.healthDistribution.map((item) => (
                <div key={item.nameKey} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{t(item.nameKey as TranslationKey)}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("recentActivity")}</CardTitle>
            <CardDescription className="mt-1">{t("latestUpdatesAndChanges")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentActivities.map((activity, idx) => {
              const iconData = getActivityIcon(activity.status);
              return (
                <div key={idx} className="flex items-start gap-3 rounded-lg border border-border bg-background/50 p-3">
                  <div className={`rounded-full bg-muted p-2 ${iconData.color}`}><Icon name={iconData.name} className="h-4 w-4" /></div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{t("quarterlyProgress")}</CardTitle>
                <CardDescription className="mt-1">{t("yearOverYearPerformanceTrend")}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/${locale}/dashboards`}>{t("viewDetails")}<Icon name="tabler:arrow-right" className="ms-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent><AreaLine categories={data.quarterlyProgress.categories} values={data.quarterlyProgress.values} height={260} color="#10b981" /></CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("upcomingMilestones")}</CardTitle>
            <CardDescription className="mt-1">{t("keyDeliverablesAndCheckpoints")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.upcomingMilestones.map((milestone, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{milestone.name}</p>
                    <p className="text-xs text-muted-foreground">{milestone.date}</p>
                  </div>
                  <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400">{milestone.daysLeft} {t("daysLeft")}</Badge>
                </div>
                <Progress value={milestone.progress} className="h-2" />
                <p className="text-xs text-muted-foreground">{milestone.progress}% {t("complete")}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("teamPerformance")}</CardTitle>
            <CardDescription className="mt-1">{t("departmentLevelScorecard")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.teamPerformance.map((team, idx) => {
              const trendData = getTrendIcon(team.trendKey);
              return (
                <div key={idx} className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: team.color }}>{team.score}</div>
                    <div>
                      <p className="font-medium">{team.team}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Icon name={trendData.name} className={`h-3 w-3 ${trendData.color}`} />
                        <span className="capitalize">{t(team.trendKey as TranslationKey)}</span>
                      </div>
                    </div>
                  </div>
                  <Progress value={team.score} className="h-1.5 w-24" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("strategicNavigation")}</CardTitle>
            <CardDescription className="mt-1">{t("quickAccessToKeyStrategicAreas")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
                <Link href={`/${locale}/strategy`}>
                  <Icon name="tabler:target-arrow" className="h-6 w-6 text-violet-500" />
                  <div className="text-left">
                    <div className="font-semibold">{t("strategicPlanning")}</div>
                    <div className="text-xs text-muted-foreground">{t("defineAndTrackStrategy")}</div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
                <Link href={`/${locale}/pillars`}>
                  <Icon name="tabler:columns-3" className="h-6 w-6 text-blue-500" />
                  <div className="text-left">
                    <div className="font-semibold">{t("strategicPillars")}</div>
                    <div className="text-xs text-muted-foreground">{t("coreFocusAreas")}</div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
                <Link href={`/${locale}/objectives`}>
                  <Icon name="tabler:flag-3" className="h-6 w-6 text-emerald-500" />
                  <div className="text-left">
                    <div className="font-semibold">{t("objectives")}</div>
                    <div className="text-xs text-muted-foreground">{t("strategicObjectives")}</div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
                <Link href={`/${locale}/projects`}>
                  <Icon name="tabler:briefcase-2" className="h-6 w-6 text-cyan-500" />
                  <div className="text-left">
                    <div className="font-semibold">{t("projects")}</div>
                    <div className="text-xs text-muted-foreground">{t("activeInitiatives")}</div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
                <Link href={`/${locale}/risks`}>
                  <Icon name="tabler:shield-exclamation" className="h-6 w-6 text-amber-500" />
                  <div className="text-left">
                    <div className="font-semibold">{t("riskManagement")}</div>
                    <div className="text-xs text-muted-foreground">{t("monitorAndMitigate")}</div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
                <Link href={`/${locale}/organization`}>
                  <Icon name="tabler:building" className="h-6 w-6 text-rose-500" />
                  <div className="text-left">
                    <div className="font-semibold">{t("organization")}</div>
                    <div className="text-xs text-muted-foreground">{t("structureAndTeams")}</div>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
