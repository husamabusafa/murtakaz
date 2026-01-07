"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";

export default function PricingPage() {
  const { locale, t } = useLocale();

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("pricingTitle")}
        subtitle={t("pricingSubtitle")}
        icon={<Icon name="tabler:coins" className="h-5 w-5" />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {[
          { title: t("executive"), desc: t("executiveDashboardsAndGovernance"), highlight: true },
          { title: t("strategyOffice"), desc: t("initiativesAndKpiGovernance"), highlight: false },
          { title: t("enterprise"), desc: t("ssoIntegrationsMultiOrg"), highlight: false },
        ].map((tier) => (
          <Card key={tier.title} className={`border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 ${tier.highlight ? "ring-1 ring-indigo-500/40" : ""}`}>
            <CardHeader className="space-y-2">
              <CardTitle className="text-base">{tier.title}</CardTitle>
              <CardDescription className="text-slate-200">{tier.desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-100">
              <ul className="space-y-2 text-slate-200">
                <li className="flex items-center gap-2">
                  <Icon name="tabler:circle-check" className="h-4 w-4 text-emerald-200" />
                  {t("roleBasedDashboards")}
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="tabler:circle-check" className="h-4 w-4 text-emerald-200" />
                  {t("governanceAndApprovals")}
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="tabler:circle-check" className="h-4 w-4 text-emerald-200" />
                  {t("exportsAndReporting")}
                </li>
              </ul>
              <Button asChild className="w-full bg-white text-slate-900 hover:bg-slate-100">
                <Link href={`/${locale}/auth/login?next=/${locale}/dashboards/executive`}>
                  <span className="inline-flex items-center gap-2">
                    <Icon name="tabler:message-circle" className="h-4 w-4" />
                    {t("requestDemo")}
                  </span>
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Link href={`/${locale}`} className="text-sm font-semibold text-indigo-200 hover:text-indigo-100">
        {t("backToHome")}
      </Link>
    </div>
  );
}
