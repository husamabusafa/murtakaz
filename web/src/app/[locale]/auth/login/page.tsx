"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { demoUsers } from "@/lib/demo-users";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const { locale, tr } = useLocale();
  const { user, loading, refresh } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string>(demoUsers[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);

  const safeNext = useMemo(() => {
    if (!nextPath) return `/${locale}/overview`;
    if (!nextPath.startsWith("/")) return `/${locale}`;
    return nextPath;
  }, [locale, nextPath]);

  useEffect(() => {
    if (!loading && user) {
      router.replace(safeNext);
    }
  }, [loading, router, safeNext, user]);

  async function handleLogin() {
    setSubmitting(true);
    try {
      const response = await fetch("/api/session/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      if (!response.ok) return;
      await refresh();
      router.replace(safeNext);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-3xl place-items-center py-10">
      <Card className="w-full border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">{tr("Sign in", "تسجيل الدخول")}</CardTitle>
          <CardDescription className="text-slate-200">
            {tr(
              "Demo authentication for the prototype. Select a role-based persona to explore the system.",
              "تسجيل دخول تجريبي للعرض. اختر شخصية بحسب الدور لاستكشاف النظام.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">{tr("Demo user", "مستخدم تجريبي")}</p>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="border-white/10 bg-slate-950/40 text-white">
                <SelectValue placeholder={tr("Select a user", "اختر مستخدمًا")} />
              </SelectTrigger>
              <SelectContent>
                {demoUsers.map((demoUser) => (
                  <SelectItem key={demoUser.id} value={demoUser.id}>
                    {demoUser.name} — {demoUser.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-200">
              {tr(
                "Admins can access user management. Executives and PMO focus on dashboards and governance.",
                "يمكن للمسؤولين الوصول لإدارة المستخدمين. يركز التنفيذيون وPMO على اللوحات والحوكمة.",
              )}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              onClick={handleLogin}
              disabled={submitting || loading || !selectedUserId}
              className="bg-white text-slate-900 hover:bg-slate-100"
            >
              {submitting ? tr("Signing in…", "جارٍ تسجيل الدخول…") : tr("Continue", "متابعة")}
            </Button>
            <p className="text-xs text-slate-300">
              {tr("Next:", "التالي:")} {safeNext}
            </p>
          </div>

          <div className="flex flex-col gap-2 text-sm text-slate-200 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-300">{tr("SSO / NextAuth integration is a Phase 1 implementation item.", "تكامل SSO / NextAuth ضمن المرحلة الأولى.")}</p>
            <Link href={`/${locale}/auth/forgot-password`} className="text-sm font-semibold text-indigo-200 hover:text-indigo-100">
              {tr("Forgot password", "نسيت كلمة المرور")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
