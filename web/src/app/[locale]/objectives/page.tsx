"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";

export default function ObjectivesPage() {
  const { user, loading } = useAuth();
  const { locale, t } = useLocale();

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{t("noActiveSession")}</p>
        <Link href={`/${locale}/auth/login`} className="mt-3 inline-flex text-sm font-semibold text-primary hover:opacity-90">
          {t("goToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("objective")}
        subtitle={t("defineAccountabilityDesc")}
        icon={<Icon name="tabler:flag-3" className="h-5 w-5" />}
      />

      <Card className="bg-card/70 backdrop-blur shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t("objective")}</CardTitle>
          <CardDescription>{t("defineAccountabilityDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("defineAccountabilityDesc")}</p>
          <Button asChild variant="secondary">
            <Link href={`/${locale}/departments`}>{t("departments")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
