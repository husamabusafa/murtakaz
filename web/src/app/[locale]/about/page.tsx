"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/providers/locale-provider";

export default function AboutPage() {
  const { locale, t } = useLocale();

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("aboutTitle")}
        subtitle={t("aboutProductDesc")}
        icon={<Icon name="tabler:building" className="h-5 w-5" />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {[
          { title: t("vision"), icon: "tabler:binoculars", body: t("executiveClarity") },
          { title: t("approach"), icon: "tabler:route", body: t("hierarchyDesc") },
          { title: t("governance"), icon: "tabler:gavel", body: t("auditableDecisions") },
        ].map((item) => (
          <Card key={item.title} className="border-border bg-card/50 shadow-sm">
            <CardHeader className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-muted/30">
                <Icon name={item.icon} className="h-5 w-5 text-foreground" />
              </div>
              <CardTitle className="text-base">{item.title}</CardTitle>
              <CardDescription className="text-muted-foreground">{item.body}</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </div>

      <Link href={`/${locale}`} className="text-sm font-semibold text-indigo-200 hover:text-indigo-100">
        {t("backToHome")}
      </Link>
    </div>
  );
}
