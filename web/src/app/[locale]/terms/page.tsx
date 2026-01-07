"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/providers/locale-provider";

export default function TermsPage() {
  const { locale, t } = useLocale();

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("termsTitle")}
        subtitle={t("termsSubtitle")}
        icon={<Icon name="tabler:shield-check" className="h-5 w-5" />}
      />

      <Card className="border-border bg-card/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t("termsGeneralTitle")}</CardTitle>
          <CardDescription className="text-muted-foreground">{t("termsGeneralDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{t("termsBulletAuthorizedUse")}</p>
          <p>{t("termsBulletRbac")}</p>
          <p>{t("termsBulletAudit")}</p>
        </CardContent>
      </Card>

      <Link href={`/${locale}`} className="text-sm font-semibold text-indigo-200 hover:text-indigo-100">
        {t("backToHome")}
      </Link>
    </div>
  );
}
