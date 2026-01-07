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

      <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
        <CardHeader>
          <CardTitle className="text-base">{t("privacySummaryTitle")}</CardTitle>
          <CardDescription className="text-slate-200">{t("privacySummaryDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-200">
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
