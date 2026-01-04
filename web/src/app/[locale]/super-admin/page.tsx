"use client";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/providers/locale-provider";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSuperAdminOverviewStats } from "@/actions/admin";

type OverviewStats = Awaited<ReturnType<typeof getSuperAdminOverviewStats>>;

export default function SuperAdminPage() {
  const { tr, locale } = useLocale();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getSuperAdminOverviewStats();
        if (isMounted) setStats(data);
      } catch (error) {
        console.error("Failed to load super admin stats", error);
        if (isMounted) setStats(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr("Super admin", "الإدارة العليا")}
        subtitle={tr(
          "System overview across organizations and users.",
          "نظرة عامة على مستوى النظام عبر المؤسسات والمستخدمين.",
        )}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader>
            <CardTitle className="text-base">{tr("Organizations", "المؤسسات")}</CardTitle>
            <CardDescription className="text-slate-200">{tr("Total organizations", "إجمالي المؤسسات")}</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {loading ? "—" : (stats?.organizations ?? 0)}
            <div className="mt-3">
              <Link
                href={`/${locale}/super-admin/organizations`}
                className="inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100"
              >
                {tr("Open organizations", "فتح المؤسسات")}
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader>
            <CardTitle className="text-base">{tr("Users", "المستخدمون")}</CardTitle>
            <CardDescription className="text-slate-200">{tr("Total users", "إجمالي المستخدمين")}</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {loading ? "—" : (stats?.users ?? 0)}
            <div className="mt-3">
              <Link
                href={`/${locale}/super-admin/users`}
                className="inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100"
              >
                {tr("Open users", "فتح المستخدمين")}
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader>
            <CardTitle className="text-base">{tr("Overview", "نظرة عامة")}</CardTitle>
            <CardDescription className="text-slate-200">{tr("Quick navigation", "تنقل سريع")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-100">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="font-semibold text-white">{tr("Organizations", "المؤسسات")}</p>
              <p className="mt-1 text-xs text-slate-200">{tr("Review tenants and drill down into users.", "استعراض المؤسسات والانتقال للمستخدمين.")}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="font-semibold text-white">{tr("Users", "المستخدمون")}</p>
              <p className="mt-1 text-xs text-slate-200">{tr("Search and manage system users.", "البحث وإدارة مستخدمي النظام.")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
