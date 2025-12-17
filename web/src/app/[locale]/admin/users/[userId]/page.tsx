"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type DemoUser, getDemoUserById, isAdmin } from "@/lib/demo-users";
import { useStoredEntity } from "@/lib/prototype-store";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";

function userStorageKey(userId: string) {
  return `murtakaz:user:${userId}`;
}

export default function AdminUserDetailPage() {
  const params = useParams<{ userId: string }>();
  const { locale, tr } = useLocale();
  const { user: sessionUser, loading } = useAuth();

  const baseUser = useMemo(() => getDemoUserById(params.userId), [params.userId]);
  const { value: editedUser, update, hydrated } = useStoredEntity<DemoUser | null>(userStorageKey(params.userId), baseUser);

  if (loading || !hydrated) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{tr("Loading user…", "جارٍ تحميل المستخدم…")}</p>
      </div>
    );
  }

  if (!isAdmin(sessionUser)) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{tr("Access denied. Admin role is required.", "لا يوجد صلاحية. يتطلب دور مسؤول.")}</p>
        <Link href={`/${locale}/overview`} className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">
          {tr("Back to overview", "العودة للنظرة العامة")}
        </Link>
      </div>
    );
  }

  if (!editedUser) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{tr("User not found.", "المستخدم غير موجود.")}</p>
        <Link href={`/${locale}/admin/users`} className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">
          {tr("Back to users", "العودة للمستخدمين")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={editedUser.name}
        subtitle={`${editedUser.email} • ${editedUser.role}`}
        icon={<Icon name="tabler:user" className="h-5 w-5" />}
        actions={
          <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
            <Link href={`/${locale}/admin/users`}>
              <span className="inline-flex items-center gap-2">
                <Icon name="tabler:arrow-left" className="h-4 w-4" />
                {tr("Back", "عودة")}
              </span>
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="tabler:id" className="h-4 w-4 text-slate-100" />
              {tr("Identity", "الهوية")}
            </CardTitle>
            <CardDescription className="text-slate-200">{tr("Prototype user directory fields. Phase 1: sourced from SSO.", "حقول دليل المستخدمين (نموذج أولي). المرحلة الأولى: يتم جلبها من SSO.")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-white">{tr("Name", "الاسم")}</p>
              <Input
                value={editedUser.name}
                onChange={(e) => update({ ...editedUser, name: e.target.value })}
                className="border-white/10 bg-black/20 text-white"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-white">{tr("Email", "البريد الإلكتروني")}</p>
              <Input value={editedUser.email} disabled className="border-white/10 bg-black/20 text-white/70" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-white">{tr("Department", "الإدارة")}</p>
              <Input
                value={editedUser.department ?? ""}
                onChange={(e) => update({ ...editedUser, department: e.target.value })}
                placeholder={tr("e.g. PMO", "مثال: PMO")}
                className="border-white/10 bg-black/20 text-white placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-white">{tr("Title", "المسمى الوظيفي")}</p>
              <Input
                value={editedUser.title ?? ""}
                onChange={(e) => update({ ...editedUser, title: e.target.value })}
                placeholder={tr("e.g. Program Manager", "مثال: مدير برنامج")}
                className="border-white/10 bg-black/20 text-white placeholder:text-slate-400"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="tabler:shield-lock" className="h-4 w-4 text-slate-100" />
              {tr("Role & access", "الدور والصلاحيات")}
            </CardTitle>
            <CardDescription className="text-slate-200">{tr("Update role assignments for the demo.", "تحديث تعيين الدور للعرض.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-white">{tr("Role", "الدور")}</p>
              <Select value={editedUser.role} onValueChange={(value) => update({ ...editedUser, role: value as DemoUser["role"] })}>
                <SelectTrigger className="border-white/10 bg-slate-950/40 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                  <SelectItem value="EXECUTIVE">EXECUTIVE</SelectItem>
                  <SelectItem value="PMO">PMO</SelectItem>
                  <SelectItem value="MANAGER">MANAGER</SelectItem>
                  <SelectItem value="EMPLOYEE">EMPLOYEE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator className="bg-white/10" />

            <div className="space-y-2 text-sm text-slate-100">
              <p className="font-semibold text-white">{tr("Demo actions", "إجراءات تجريبية")}</p>
              <Button
                variant="outline"
                className="w-full justify-start border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={() => update(baseUser)}
                disabled={!baseUser}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon name="tabler:refresh" className="h-4 w-4" />
                  {tr("Reset to seed values", "إعادة ضبط للقيم الافتراضية")}
                </span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={() => alert(tr("Prototype: password reset email sent.", "نموذج أولي: تم إرسال رسالة إعادة تعيين كلمة المرور."))}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon name="tabler:mail" className="h-4 w-4" />
                  {tr("Send password reset", "إرسال إعادة تعيين كلمة المرور")}
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
