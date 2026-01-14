"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { AreaLine, Bar, Donut, SparkLine } from "@/components/charts/dashboard-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLocale } from "@/providers/locale-provider";
import type { TranslationKey } from "@/providers/locale-provider";

const SAMPLE_DATA = {
  metrics: { totalKpis: 42, completionRate: 87, activeProjects: 15, revenue: 2458000, revenueChange: 12.5, performance: 94, teamMembers: 24, tasksCompleted: 156 },
  kpiTrends: [65, 72, 68, 78, 85, 82, 87, 91, 89, 94, 92, 96],
  revenueTrends: [1200, 1450, 1380, 1620, 1890, 1750, 2100, 2250, 2180, 2400, 2320, 2458],
  categoryPerformance: { categories: ["Strategy", "Operations", "Finance", "Marketing", "HR", "IT"], values: [92, 88, 95, 85, 90, 87] },
  statusDistribution: [
    { nameKey: "onTrack", value: 28, color: "#10b981" },
    { nameKey: "atRisk", value: 8, color: "#f59e0b" },
    { nameKey: "behind", value: 4, color: "#ef4444" },
    { nameKey: "completed", value: 18, color: "#3b82f6" },
  ],
  monthlyActivity: { categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], values: [45, 52, 48, 61, 58, 67] },
  topPerformers: [
    { name: "Customer Satisfaction", value: 98, target: 95, status: "exceeded" },
    { name: "Revenue Growth", value: 112, target: 100, status: "exceeded" },
    { name: "Cost Efficiency", value: 94, target: 90, status: "ontrack" },
    { name: "Team Productivity", value: 89, target: 85, status: "ontrack" },
    { name: "Innovation Index", value: 76, target: 80, status: "atrisk" },
  ],
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function getStatusColor(status: string) {
  if (status === "exceeded") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
  if (status === "ontrack") return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
  return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
}

export default function DashboardsPage() {
  const { locale, t } = useLocale();
  const data = SAMPLE_DATA;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("performanceDashboard")}
        subtitle={t("performanceDashboardSubtitle")}
        icon={<Icon name="tabler:chart-line" className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/${locale}/overview`}>
                <Icon name="tabler:layout-grid" className="me-2 h-4 w-4" />
                {t("overview")}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/${locale}/kpis`}>
                <Icon name="tabler:target" className="me-2 h-4 w-4" />
                {t("viewAllKpis")}
              </Link>
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-card to-card backdrop-blur border-blue-500/20">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Icon name="tabler:target" className="h-4 w-4 text-blue-500" />
              {t("totalKpis")}
            </CardDescription>
            <CardTitle className="text-4xl font-bold">{data.metrics.totalKpis}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("completionRate")}</span>
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-400">{data.metrics.completionRate}%</Badge>
            </div>
            <div className="mt-3"><SparkLine values={data.kpiTrends} height={60} color="#3b82f6" /></div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-card to-card backdrop-blur border-emerald-500/20">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Icon name="tabler:currency-dollar" className="h-4 w-4 text-emerald-500" />
              {t("revenue")}
            </CardDescription>
            <CardTitle className="text-4xl font-bold">{formatCurrency(data.metrics.revenue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("growth")}</span>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                <Icon name="tabler:trending-up" className="me-1 h-3 w-3" />+{data.metrics.revenueChange}%
              </Badge>
            </div>
            <div className="mt-3"><SparkLine values={data.revenueTrends} height={60} color="#10b981" /></div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-violet-500/10 via-card to-card backdrop-blur border-violet-500/20">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Icon name="tabler:briefcase" className="h-4 w-4 text-violet-500" />
              {t("activeProjects")}
            </CardDescription>
            <CardTitle className="text-4xl font-bold">{data.metrics.activeProjects}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("teamMembers")}</span>
              <Badge variant="secondary" className="bg-violet-500/10 text-violet-700 dark:text-violet-400">{data.metrics.teamMembers}</Badge>
            </div>
            <Progress value={75} className="mt-3 h-2" />
            <p className="mt-2 text-xs text-muted-foreground">75% {t("onTrack")}</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-card to-card backdrop-blur border-amber-500/20">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Icon name="tabler:chart-bar" className="h-4 w-4 text-amber-500" />
              {t("performanceScore")}
            </CardDescription>
            <CardTitle className="text-4xl font-bold">{data.metrics.performance}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("tasksCompleted")}</span>
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">{data.metrics.tasksCompleted}</Badge>
            </div>
            <Progress value={data.metrics.performance} className="mt-3 h-2" />
            <p className="mt-2 text-xs text-muted-foreground">{t("excellentPerformance")}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{t("categoryPerformance")}</CardTitle>
                <CardDescription className="mt-1">{t("performanceMetricsAcrossDepartments")}</CardDescription>
              </div>
              <Badge variant="outline" className="border-border bg-muted/30">6 {t("categories")}</Badge>
            </div>
          </CardHeader>
          <CardContent><Bar categories={data.categoryPerformance.categories} values={data.categoryPerformance.values} height={300} color="#3b82f6" /></CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("statusDistribution")}</CardTitle>
            <CardDescription className="mt-1">{t("currentStatusOverview")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Donut items={data.statusDistribution.map(item => ({ name: t(item.nameKey as TranslationKey), value: item.value, color: item.color }))} height={280} />
            <div className="mt-4 space-y-2">
              {data.statusDistribution.map((item) => (
                <div key={item.nameKey} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{t(item.nameKey as TranslationKey)}</span>
                  </div>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{t("monthlyActivityTrend")}</CardTitle>
                <CardDescription className="mt-1">{t("kpiUpdatesAndSubmissions")}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/${locale}/kpis`}>{t("viewDetails")}<Icon name="tabler:arrow-right" className="ms-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent><AreaLine categories={data.monthlyActivity.categories} values={data.monthlyActivity.values} height={280} color="#8b5cf6" /></CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("topPerformers")}</CardTitle>
            <CardDescription className="mt-1">{t("kpisExceedingTargets")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.topPerformers.map((performer, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{performer.name}</span>
                  <Badge variant="outline" className={getStatusColor(performer.status)}>{performer.value}%</Badge>
                </div>
                <div className="relative">
                  <Progress value={(performer.value / performer.target) * 100} className="h-2" />
                  <div className="absolute top-0 h-2 w-0.5 bg-muted-foreground/40" style={{ left: `${(100 / performer.target) * 100}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("target")}: {performer.target}%</span>
                  <span>{performer.value >= performer.target ? <span className="text-emerald-600 dark:text-emerald-400">+{performer.value - performer.target}%</span> : <span className="text-amber-600 dark:text-amber-400">{performer.value - performer.target}%</span>}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("quickActions")}</CardTitle>
            <CardDescription className="mt-1">{t("navigateToKeyAreas")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Button asChild variant="outline" className="h-auto flex-col items-start gap-2 p-4">
                <Link href={`/${locale}/kpis`}>
                  <Icon name="tabler:target" className="h-5 w-5 text-blue-500" />
                  <div className="text-left">
                    <div className="font-semibold">{t("kpiManagement")}</div>
                    <div className="text-xs text-muted-foreground">{t("viewAndManageKpis")}</div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto flex-col items-start gap-2 p-4">
                <Link href={`/${locale}/entities/objective`}>
                  <Icon name="tabler:flag-3" className="h-5 w-5 text-emerald-500" />
                  <div className="text-left">
                    <div className="font-semibold">{t("objectives")}</div>
                    <div className="text-xs text-muted-foreground">{t("trackStrategicGoals")}</div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto flex-col items-start gap-2 p-4">
                <Link href={`/${locale}/responsibilities`}>
                  <Icon name="tabler:user-check" className="h-5 w-5 text-violet-500" />
                  <div className="text-left">
                    <div className="font-semibold">{t("responsibilities")}</div>
                    <div className="text-xs text-muted-foreground">{t("manageAssignments")}</div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto flex-col items-start gap-2 p-4">
                <Link href={`/${locale}/organization`}>
                  <Icon name="tabler:building" className="h-5 w-5 text-amber-500" />
                  <div className="text-left">
                    <div className="font-semibold">{t("organization")}</div>
                    <div className="text-xs text-muted-foreground">{t("viewOrgStructure")}</div>
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
