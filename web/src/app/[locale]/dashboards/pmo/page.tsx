"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Bar } from "@/components/charts/dashboard-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { approvalsAging } from "@/lib/dashboard-metrics";
import { changeRequests, pillars } from "@/lib/mock-data";
import { useLocale } from "@/providers/locale-provider";

export default function PMODashboardPage() {
  const { locale, tr } = useLocale();
  const initiatives = pillars.flatMap((pillar) => pillar.initiatives);
  const totalProjects = initiatives.flatMap((initiative) => initiative.projects).length;
  const pending = changeRequests.filter((cr) => cr.status === "PENDING");

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr("PMO dashboard", "لوحة مكتب إدارة المشاريع")}
        subtitle={tr("Governance compliance, coverage gaps, dependencies, and approvals queue.", "الامتثال للحوكمة وفجوات التغطية والاعتمادات وقائمة الموافقات.")}
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{tr("Coverage snapshot", "لمحة التغطية")}</CardTitle>
              <Icon name="tabler:layers-subtract" className="text-slate-200" />
            </div>
            <CardDescription className="text-slate-200">{tr("Alignment and completeness (demo).", "المواءمة والاكتمال (عرض تجريبي).")}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs text-slate-200">{tr("Pillars", "الركائز")}</p>
              <p className="mt-1 text-xl font-semibold text-white">{pillars.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs text-slate-200">{tr("Initiatives", "المبادرات")}</p>
              <p className="mt-1 text-xl font-semibold text-white">{initiatives.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs text-slate-200">{tr("Projects", "المشاريع")}</p>
              <p className="mt-1 text-xl font-semibold text-white">{totalProjects}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs text-slate-200">{tr("Pending approvals", "موافقات معلّقة")}</p>
              <p className="mt-1 text-xl font-semibold text-white">{pending.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">{tr("Approval aging (SLA)", "عمر الموافقات (SLA)")}</CardTitle>
              <CardDescription className="text-slate-200">{tr("Queue distribution by age bucket.", "توزيع القائمة حسب شريحة العمر.")}</CardDescription>
            </div>
            <Link href={`/${locale}/approvals`} className="text-sm font-medium text-indigo-200 hover:text-indigo-100">
              {tr("Open approvals", "فتح الموافقات")}
            </Link>
          </CardHeader>
          <CardContent>
            <Bar categories={approvalsAging.categories} values={approvalsAging.values} color="#a78bfa" />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">{tr("Governance queue", "قائمة الحوكمة")}</CardTitle>
              <CardDescription className="text-slate-200">{tr("Change requests requiring review.", "طلبات تغيير تتطلب مراجعة.")}</CardDescription>
            </div>
            <Link href={`/${locale}/approvals`} className="text-sm font-medium text-indigo-200 hover:text-indigo-100">
              {tr("View all", "عرض الكل")}
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.map((cr) => (
              <Link
                key={cr.id}
                href={`/${locale}/approvals/${cr.id}`}
                className="block rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 transition hover:bg-white/5"
              >
                <p className="text-sm font-semibold text-white">
                  {cr.entityType}: {cr.entityName}
                </p>
                <p className="mt-1 text-xs text-slate-200">
                  {tr("Requested by", "مقدم الطلب")} {cr.requestedBy} • {cr.ageDays}
                  {tr("d", "ي")}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{tr("Compliance highlights", "مؤشرات الامتثال")}</CardTitle>
            <CardDescription className="text-slate-200">{tr("PRD acceptance checks (demo).", "فحوصات قبول المتطلبات (عرض تجريبي).")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-100">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="font-semibold text-white">{tr("KPIs without owners", "مؤشرات أداء رئيسية بلا مسؤول")}</p>
              <p className="mt-1 text-xs text-slate-200">{tr("Flag missing KPI owners/reviewers.", "تنبيه عند غياب مسؤول/مراجع مؤشر الأداء الرئيسي.")}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="font-semibold text-white">{tr("Orphaned projects", "مشاريع غير مرتبطة")}</p>
              <p className="mt-1 text-xs text-slate-200">{tr("Prevent projects without an initiative.", "منع المشاريع غير المرتبطة بمبادرة.")}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="font-semibold text-white">{tr("Overdue KPI updates", "تحديثات مؤشرات أداء رئيسية متأخرة")}</p>
              <p className="mt-1 text-xs text-slate-200">{tr("Remind owners when freshness threshold is exceeded.", "تذكير المسؤول عند تجاوز حد الحداثة.")}</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
