"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { SparkLine } from "@/components/charts/dashboard-charts";
import { RagBadge } from "@/components/rag-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { contributionTrend } from "@/lib/dashboard-metrics";
import { changeRequests, pillars } from "@/lib/mock-data";
import { useLocale } from "@/providers/locale-provider";

export default function ManagerDashboardPage() {
  const { locale, tr, isArabic } = useLocale();
  const initiatives = pillars.flatMap((pillar) => pillar.initiatives);
  const atRisk = initiatives.filter((initiative) => initiative.health !== "GREEN");
  const pendingApprovals = changeRequests.filter((cr) => cr.status === "PENDING");

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr("Manager / Department dashboard", "لوحة المدير / الإدارة")}
        subtitle={tr("Owned work, team velocity, and items requiring attention (prototype).", "الأعمال المملوكة وسرعة الفريق والعناصر التي تتطلب متابعة (نموذج أولي).")}
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{tr("Team velocity", "سرعة الفريق")}</CardTitle>
              <Icon name="tabler:users-group" className="text-slate-200" />
            </div>
            <CardDescription className="text-slate-200">{tr("Contribution trend (demo).", "اتجاه المساهمة (عرض تجريبي).")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SparkLine values={contributionTrend} color="#34d399" />
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs text-slate-200">{tr("Pending approvals", "موافقات معلّقة")}</p>
              <p className="mt-1 text-xl font-semibold text-white">{pendingApprovals.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{tr("Owned initiatives (demo)", "المبادرات المملوكة (تجريبي)")}</CardTitle>
            <CardDescription className="text-slate-200">{tr("In production this filters by manager ownership.", "في الإنتاج يتم التصفية حسب ملكية المدير.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {atRisk.map((initiative) => (
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
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
