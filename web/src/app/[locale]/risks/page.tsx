"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pillars } from "@/lib/mock-data";
import { useLocale } from "@/providers/locale-provider";
import { getEffectiveRisk } from "@/lib/prototype-store";

export default function RisksPage() {
  const { locale, t, isArabic } = useLocale();
  const risks = pillars
    .flatMap((pillar) => pillar.initiatives.flatMap((initiative) => initiative.risks))
    .map((risk) => getEffectiveRisk(risk.id) ?? risk);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("risks")}
        subtitle={t("risksSubtitle")}
        icon={<Icon name="tabler:shield-exclamation" className="h-5 w-5" />}
      />

      <Card className="border-border bg-card/50 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:clipboard-list" className="h-4 w-4 text-foreground" />
                {t("riskRegister")}
              </CardTitle>
              <CardDescription className="text-muted-foreground">{t("riskRegisterDesc")}</CardDescription>
            </div>
            <div className="w-full max-w-xs">
              <Input placeholder={t("searchDemoPlaceholder")} className="border-border bg-muted/30 text-foreground placeholder:text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-white/0">
                  <TableHead className="text-muted-foreground">{t("risk")}</TableHead>
                  <TableHead className="text-muted-foreground">{t("severity")}</TableHead>
                  <TableHead className="text-muted-foreground">{t("owner")}</TableHead>
                  <TableHead className="text-muted-foreground">{t("context")}</TableHead>
                  <TableHead className="text-right text-muted-foreground">{t("escalated")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {risks.map((risk) => (
                  <TableRow key={risk.id} className="border-border hover:bg-card/50">
                    <TableCell className="font-medium text-foreground">
                      <Link href={`/${locale}/risks/${risk.id}`} className="hover:underline">
                        {isArabic ? risk.titleAr ?? risk.title : risk.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-foreground">{risk.severity}</TableCell>
                    <TableCell className="text-muted-foreground">{risk.owner}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {(isArabic ? risk.context.projectAr : risk.context.project) ??
                        (isArabic ? risk.context.initiativeAr : risk.context.initiative) ??
                        (isArabic ? risk.context.pillarAr : risk.context.pillar) ??
                        "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{risk.escalated ? t("yes") : t("no")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
