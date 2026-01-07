"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/providers/locale-provider";

export default function PrivacyPage() {
  const { locale, t } = useLocale();

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("privacyTitle")}
        subtitle={t("privacySubtitle")}
        icon={<Icon name="tabler:lock" className="h-5 w-5" />}
      />

      <Card className="border-border bg-card/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t("privacySummaryTitle")}</CardTitle>
          <CardDescription className="text-muted-foreground">{t("privacySummaryDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{t("privacyBulletMinCollection")}</p>
          <p>{t("privacyBulletRbac")}</p>
          <p>{t("privacyBulletAudit")}</p>
        </CardContent>
      </Card>

      <Link href={`/${locale}`} className="text-sm font-semibold text-indigo-200 hover:text-indigo-100">
        {t("backToHome")}
      </Link>
    </div>
  );
}
