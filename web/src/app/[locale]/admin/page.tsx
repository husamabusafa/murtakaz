"use client";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/providers/locale-provider";
import Link from "next/link";

export default function AdminPage() {
  const { t, tr, locale } = useLocale();

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("admin")}
        subtitle={tr(
          "Organization settings, roles, SSO placeholders, and audit log (prototype).",
          "إعدادات المؤسسة والأدوار وتهيئة SSO ومسار التدقيق (نموذج أولي).",
        )}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{tr("Organization", "المؤسسة")}</CardTitle>
            <CardDescription className="text-slate-200">{tr("Name, domain, and high-level configuration.", "الاسم والنطاق وإعدادات عامة.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-100">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Org name", "اسم المؤسسة")}</p>
              <p className="mt-1 text-white">{tr("Demo Organization", "مؤسسة تجريبية")}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Domain", "النطاق")}</p>
              <p className="mt-1 text-white">example.com</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("User management", "إدارة المستخدمين")}</p>
              <p className="mt-1 text-slate-100">{tr("Manage users within your organization.", "إدارة المستخدمين ضمن المؤسسة.")}</p>
              <Link href={`/${locale}/admin/users`} className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">
                {tr("Open users", "فتح المستخدمين")}
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
