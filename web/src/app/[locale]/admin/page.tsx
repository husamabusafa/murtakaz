"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/providers/locale-provider";

export default function AdminPage() {
  const { t, locale } = useLocale();

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("admin")}
        subtitle={t("adminSubtitle")}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card/50 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("organization")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("basicDetailsAndGovernanceDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-foreground">
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("orgName")}</p>
              <p className="mt-1 text-foreground">{t("demoOrganization")}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("domain")}</p>
              <p className="mt-1 text-foreground">example.com</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("userManagement")}</p>
              <p className="mt-1 text-foreground">{t("manageUsersWithinOrgDesc")}</p>
              <Link href={`/${locale}/admin/users`} className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">
                {t("openUsers")}
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t("auditLogPrototype")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("immutableTrackingDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground">
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="font-semibold text-foreground">{t("kpiTargetUpdated")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("financeOpsDaysAgo")}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="font-semibold text-foreground">{t("initiativeOwnerReassigned")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("pmoDaysAgo")}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="font-semibold text-foreground">{t("riskEscalated")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("opsCenterWeekAgo")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
