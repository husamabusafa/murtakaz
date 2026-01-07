"use client";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/providers/locale-provider";

export default function UsersManagementPage() {
  const { t } = useLocale();

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("users")}
        subtitle={t("adminUsersSubtitle")}
      />

      <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
        <CardHeader>
          <CardTitle className="text-base">{t("userManagement")}</CardTitle>
          <CardDescription className="text-slate-200">
            {t("userManagementSectionDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-6 text-sm text-slate-200">
            {t("adminUserManagementNotice")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
