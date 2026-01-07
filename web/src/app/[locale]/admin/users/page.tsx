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

      <Card className="border-border bg-card/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t("userManagement")}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {t("userManagementSectionDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
            {t("adminUserManagementNotice")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
