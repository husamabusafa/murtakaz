"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Bar } from "@/components/charts/dashboard-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { approvalsAging } from "@/lib/dashboard-metrics";
import { changeRequests } from "@/lib/mock-data";
import { useLocale } from "@/providers/locale-provider";

export default function GovernanceDashboardPage() {
  const { locale, tr } = useLocale();
  const pending = changeRequests.filter((cr) => cr.status === "PENDING");

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr("Strategy Change & Governance dashboard", "لوحة تغيير الاستراتيجية والحوكمة")}
        subtitle={tr("Auditability, change requests, and approval cycle times (prototype).", "قابلية التدقيق وطلبات التغيير وأزمنة دورة الموافقة (نموذج أولي).")}
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{tr("Approval cycle time", "زمن دورة الموافقة")}</CardTitle>
              <Icon name="tabler:clock" className="text-slate-200" />
            </div>
            <CardDescription className="text-slate-200">{tr("Aging distribution by bucket.", "توزيع الأعمار حسب الشريحة.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Bar categories={approvalsAging.categories} values={approvalsAging.values} color="#a78bfa" />
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{tr("Publish controls", "ضوابط النشر")}</CardTitle>
            <CardDescription className="text-slate-200">{tr("Guardrails (demo).", "ضوابط (عرض تجريبي).")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-100">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="font-semibold text-white">{tr("Pending changes", "تغييرات معلّقة")}</p>
              <p className="mt-1 text-xs text-slate-200">
                {pending.length} {tr("items awaiting approval.", "عنصرًا بانتظار الموافقة.")}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="font-semibold text-white">{tr("Audit trail", "مسار التدقيق")}</p>
              <p className="mt-1 text-xs text-slate-200">{tr("Actor, timestamp, and before/after captured for key changes.", "يتم حفظ المنفذ والوقت وقيم قبل/بعد للتغييرات الرئيسية.")}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">{tr("Change requests", "طلبات التغيير")}</CardTitle>
              <CardDescription className="text-slate-200">{tr("Review queue with drill-down.", "قائمة مراجعة مع استعراض تفصيلي.")}</CardDescription>
            </div>
            <Link href={`/${locale}/approvals`} className="text-sm font-medium text-indigo-200 hover:text-indigo-100">
              {tr("Open approvals", "فتح الموافقات")}
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
      </section>
    </div>
  );
}
