"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { demoUsers } from "@/lib/demo-users";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";

export default function UserDetailPage() {
  const params = useParams<{ userId: string }>();
  const { user, loading } = useAuth();
  const { locale, tr } = useLocale();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (user as any)?.role as string | undefined;

  const target = demoUsers.find((demoUser) => demoUser.id === params.userId) ?? null;

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{tr("Loading…", "جارٍ التحميل…")}</p>
      </div>
    );
  }

  if (userRole !== "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">
          {tr("Access denied. Admin role is required.", "لا يوجد صلاحية. يتطلب دور مسؤول.")}
        </p>
        <Link
          href={`/${locale}/overview`}
          className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100"
        >
          {tr("Back to overview", "العودة للنظرة العامة")}
        </Link>
      </div>
    );
  }

  if (!target) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{tr("User not found.", "المستخدم غير موجود.")}</p>
        <Link
          href={`/${locale}/super-admin/users`}
          className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100"
        >
          {tr("Back to users", "العودة للمستخدمين")}
        </Link>
      </div>
    );
  }

  const initials = target.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-8">
      <PageHeader title={target.name} subtitle={`${target.role}${target.department ? ` • ${target.department}` : ""}`} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border border-white/10 bg-white/5">
                <AvatarFallback className="bg-white/10 text-white">{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-0.5">
                <CardTitle className="text-base">{target.name}</CardTitle>
                <CardDescription className="text-slate-200">{target.title ?? target.role}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-100">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Email", "البريد الإلكتروني")}</p>
              <p className="mt-1 text-white">{target.email}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Role", "الدور")}</p>
              <p className="mt-1 text-white">{target.role}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Department", "الإدارة")}</p>
              <p className="mt-1 text-white">{target.department ?? "—"}</p>
            </div>
            <Separator className="bg-white/10" />
            <Link
              href={`/${locale}/super-admin/users`}
              className="inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100"
            >
              {tr("Back to users", "العودة للمستخدمين")}
            </Link>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{tr("Notes (prototype)", "ملاحظات (نموذج أولي)")}</CardTitle>
            <CardDescription className="text-slate-200">
              {tr(
                "In Phase 1, users are sourced from SSO and assigned roles/departments for RBAC.",
                "في المرحلة الأولى يتم جلب المستخدمين من SSO وتعيين الأدوار/الإدارات لتطبيق الصلاحيات.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-100">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="font-semibold text-white">{tr("Status", "الحالة")}</p>
              <p className="mt-1 text-xs text-slate-200">{tr("Active (demo)", "نشط (تجريبي)")}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="font-semibold text-white">{tr("Access scope", "نطاق الوصول")}</p>
              <p className="mt-1 text-xs text-slate-200">
                {tr(
                  "Prototype scope is mostly organization-wide. Production scope is role + department + assignment driven.",
                  "نطاق النموذج الأولي غالبًا على مستوى المؤسسة. نطاق الإنتاج يعتمد على الدور والإدارة والتعيينات.",
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
