"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { RagBadge, StatusBadge } from "@/components/rag-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { pillars } from "@/lib/mock-data";
import { useLocale } from "@/providers/locale-provider";

export default function StrategyPage() {
  const { t, locale, isArabic } = useLocale();

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("strategy")}
        subtitle={t("strategySubtitle")}
        icon={<Icon name="tabler:target-arrow" className="h-5 w-5" />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {pillars.map((pillar) => (
          <Card key={pillar.id} className="border-border bg-card/50 shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon name="tabler:layers-subtract" className="h-4 w-4 text-foreground" />
                    {isArabic ? pillar.titleAr ?? pillar.title : pillar.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 text-muted-foreground">
                    <Icon name="tabler:user" className="h-4 w-4" />
                    {pillar.owner}
                  </CardDescription>
                </div>
                <RagBadge health={pillar.health} />
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={pillar.status} />
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon name="tabler:activity-heartbeat" className="h-4 w-4" />
                  {pillar.initiatives.length} {t("initiative")}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("goals")}</p>
                <Separator className="bg-muted/30" />
                <ul className="space-y-1 text-sm text-foreground">
                  {(isArabic ? pillar.goalsAr ?? pillar.goals : pillar.goals).map((goal) => (
                    <li key={goal} className="flex items-start gap-2">
                      <Icon name="tabler:circle-check" className="mt-0.5 h-4 w-4 text-indigo-200" />
                      <span>{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={`/${locale}/strategy/${pillar.id}`}
                className="inline-flex w-full items-center justify-center rounded-xl bg-white text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
              >
                <span className="inline-flex items-center gap-2">
                  <Icon name="tabler:arrow-right" className="h-4 w-4" />
                  {t("openPillar")}
                </span>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
