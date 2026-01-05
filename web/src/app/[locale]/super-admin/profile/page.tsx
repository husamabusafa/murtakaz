"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";

export default function SuperAdminProfilePage() {
  const { user, loading, signOut } = useAuth();
  const { locale, tr } = useLocale();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (user as any)?.role as string | undefined;

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{tr("Loading…", "جارٍ التحميل…")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{tr("No active session.", "لا توجد جلسة نشطة.")}</p>
        <Link href={`/${locale}/auth/login`} className="mt-3 inline-flex text-sm font-semibold text-primary hover:opacity-90">
          {tr("Go to sign in", "الذهاب لتسجيل الدخول")}
        </Link>
      </div>
    );
  }

  if (userRole !== "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{tr("Unauthorized.", "غير مصرح.")}</p>
        <Link href={`/${locale}/overview`} className="mt-3 inline-flex text-sm font-semibold text-primary hover:opacity-90">
          {tr("Back", "رجوع")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr("Super Admin Profile", "ملف المشرف العام")}
        subtitle={tr("Account actions", "إجراءات الحساب")}
        actions={
          <Link href={`/${locale}/super-admin`} className="inline-flex text-sm font-semibold text-primary hover:opacity-90">
            {tr("Back", "رجوع")}
          </Link>
        }
      />

      <Card className="bg-card/70 backdrop-blur shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{tr("Profile", "الملف")}</CardTitle>
          <CardDescription>{tr("Basic account info.", "معلومات الحساب الأساسية.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("Name", "الاسم")}</p>
            <p className="mt-1">{user.name}</p>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("Role", "الدور")}</p>
            <p className="mt-1">{userRole}</p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="destructive" onClick={() => void signOut()}>
              {tr("Logout", "تسجيل الخروج")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
