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
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("organization")}</CardTitle>
            <CardDescription className="text-slate-200">{t("basicDetailsAndGovernanceDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-100">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{t("orgName")}</p>
              <p className="mt-1 text-white">{t("demoOrganization")}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{t("domain")}</p>
              <p className="mt-1 text-white">example.com</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{t("userManagement")}</p>
              <p className="mt-1 text-slate-100">{t("manageUsersWithinOrgDesc")}</p>
              <Link href={`/${locale}/admin/users`} className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">
                {t("openUsers")}
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader>
            <CardTitle className="text-base">{t("auditLogPrototype")}</CardTitle>
            <CardDescription className="text-slate-200">{t("immutableTrackingDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-100">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="font-semibold text-white">{t("kpiTargetUpdated")}</p>
              <p className="mt-1 text-xs text-slate-200">{t("financeOpsDaysAgo")}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="font-semibold text-white">{t("initiativeOwnerReassigned")}</p>
              <p className="mt-1 text-xs text-slate-200">{t("pmoDaysAgo")}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="font-semibold text-white">{t("riskEscalated")}</p>
              <p className="mt-1 text-xs text-slate-200">{t("opsCenterWeekAgo")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
