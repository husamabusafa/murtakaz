"use client";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/providers/locale-provider";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSuperAdminOverviewStats } from "@/actions/admin";

type OverviewStats = Awaited<ReturnType<typeof getSuperAdminOverviewStats>>;

export default function SuperAdminPage() {
  const { t, locale } = useLocale();
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
        title={t("superAdmin")}
        subtitle={t("superAdminSubtitle")}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t("organizations")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("totalOrganizations")}</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {loading ? "—" : (stats?.organizations ?? 0)}
            <div className="mt-3">
              <Link
                href={`/${locale}/super-admin/organizations`}
                className="inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100"
              >
                {t("openOrganizations")}
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t("users")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("totalUsers")}</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {loading ? "—" : (stats?.users ?? 0)}
            <div className="mt-3">
              <Link
                href={`/${locale}/super-admin/users`}
                className="inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100"
              >
                {t("openUsers")}
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t("overview")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("quickNavigation")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground">
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="font-semibold text-foreground">{t("organizations")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("reviewTenantsDesc")}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="font-semibold text-foreground">{t("users")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("searchAndManageUsersDesc")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
