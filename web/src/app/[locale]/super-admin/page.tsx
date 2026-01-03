"use client";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/providers/locale-provider";
import Link from "next/link";

export default function SuperAdminPage() {
  const { tr, locale } = useLocale();

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr("Super admin", "الإدارة العليا")}
        subtitle={tr(
          "Tenant-wide settings, organizations, and cross-tenant user management.",
          "إعدادات على مستوى النظام، إدارة المؤسسات، وإدارة المستخدمين عبر جميع المؤسسات.",
        )}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{tr("Directory", "الدليل")}</CardTitle>
            <CardDescription className="text-slate-200">
              {tr("Manage organizations and users across the entire system.", "إدارة المؤسسات والمستخدمين على مستوى النظام.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-100">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Organizations", "المؤسسات")}</p>
              <p className="mt-1 text-slate-100">{tr("Manage tenant organizations and their domains.", "إدارة المؤسسات ونطاقاتها.")}</p>
              <Link
                href={`/${locale}/super-admin/organizations`}
                className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100"
              >
                {tr("Manage Organizations", "إدارة المؤسسات")}
              </Link>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Users", "المستخدمون")}</p>
              <p className="mt-1 text-slate-100">{tr("Create and manage users and roles across all organizations.", "إنشاء وإدارة المستخدمين والأدوار عبر جميع المؤسسات.")}</p>
              <Link
                href={`/${locale}/super-admin/users`}
                className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100"
              >
                {tr("Open users directory", "فتح دليل المستخدمين")}
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader>
            <CardTitle className="text-base">{tr("Audit log (prototype)", "سجل التدقيق (نموذج أولي)")}</CardTitle>
            <CardDescription className="text-slate-200">{tr("Immutable tracking per PRD.", "تتبع غير قابل للتعديل حسب المتطلبات.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-100">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="font-semibold text-white">{tr("KPI target updated", "تحديث مستهدف مؤشر")}</p>
              <p className="mt-1 text-xs text-slate-200">{tr("Finance Ops • 3 days ago", "المالية • قبل 3 أيام")}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="font-semibold text-white">{tr("Initiative owner reassigned", "إعادة تعيين مالك مبادرة")}</p>
              <p className="mt-1 text-xs text-slate-200">{tr("PMO • 5 days ago", "PMO • قبل 5 أيام")}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="font-semibold text-white">{tr("Risk escalated", "تصعيد مخاطرة")}</p>
              <p className="mt-1 text-xs text-slate-200">{tr("Ops Center • 1 week ago", "مركز العمليات • قبل أسبوع")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
