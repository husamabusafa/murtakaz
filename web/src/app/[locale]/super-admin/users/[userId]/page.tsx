"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLocale } from "@/providers/locale-provider";
import { getUserDetails } from "@/actions/admin";

type UserDetails = Awaited<ReturnType<typeof getUserDetails>>;

export default function UserDetailPage() {
  const params = useParams<{ userId: string }>();
  const { locale, tr } = useLocale();
  const [userDetails, setUserDetails] = useState<UserDetails>(null);
  const [loading, setLoading] = useState(true);

  const initials = useMemo(() => {
    const name = userDetails?.name?.trim() ?? "";
    if (!name) return "—";
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }, [userDetails?.name]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getUserDetails(params.userId);
        if (isMounted) setUserDetails(data);
      } catch (error) {
        console.error("Failed to load user", error);
        if (isMounted) setUserDetails(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [params.userId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{tr("Loading…", "جارٍ التحميل…")}</p>
      </div>
    );
  }

  if (!userDetails) {
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

  return (
    <div className="space-y-8">
      <PageHeader
        title={userDetails.name}
        subtitle={tr(
          `User details for ${userDetails.org?.name ?? "—"}.`,
          `تفاصيل المستخدم للمؤسسة ${userDetails.org?.name ?? "—"}.`,
        )}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border border-white/10 bg-white/5">
                <AvatarFallback className="bg-white/10 text-white">{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-0.5">
                <CardTitle className="text-base">{userDetails.name}</CardTitle>
                <CardDescription className="text-slate-200">{userDetails.role}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-100">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Email", "البريد الإلكتروني")}</p>
              <p className="mt-1 text-white">{userDetails.email}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Role", "الدور")}</p>
              <p className="mt-1 text-white">{userDetails.role}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Organization", "المؤسسة")}</p>
              <p className="mt-1 text-white">{userDetails.org?.name ?? "—"}</p>
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
            <CardTitle className="text-base">{tr("Metadata", "معلومات")}</CardTitle>
            <CardDescription className="text-slate-200">
              {tr(
                "Basic user metadata for support and audit purposes.",
                "بيانات المستخدم الأساسية لأغراض الدعم والتدقيق.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-100">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="font-semibold text-white">{tr("User ID", "معرّف المستخدم")}</p>
              <p className="mt-1 text-xs text-slate-200 break-all">{userDetails.id}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="font-semibold text-white">{tr("Created", "تاريخ الإنشاء")}</p>
              <p className="mt-1 text-xs text-slate-200">{new Date(userDetails.createdAt).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
