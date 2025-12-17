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
  const { locale, t, tr, isArabic } = useLocale();
  const risks = pillars
    .flatMap((pillar) => pillar.initiatives.flatMap((initiative) => initiative.risks))
    .map((risk) => getEffectiveRisk(risk.id) ?? risk);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("risks")}
        subtitle={tr("Track risks by severity, aging, owner, and escalation status.", "متابعة المخاطر حسب الخطورة والعمر والمالك وحالة التصعيد.")}
        icon={<Icon name="tabler:shield-exclamation" className="h-5 w-5" />}
      />

      <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:clipboard-list" className="h-4 w-4 text-slate-100" />
                {tr("Risk register", "سجل المخاطر")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("Filters, drill-down, and escalation workflow (demo).", "تصفية واستعراض تفصيلي ومسار التصعيد (عرض تجريبي).")}</CardDescription>
            </div>
            <div className="w-full max-w-xs">
              <Input placeholder={tr("Search (demo)", "بحث (تجريبي)")} className="border-white/10 bg-slate-950/40 text-white placeholder:text-slate-400" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/0">
                  <TableHead className="text-slate-200">{tr("Risk", "المخاطرة")}</TableHead>
                  <TableHead className="text-slate-200">{t("severity")}</TableHead>
                  <TableHead className="text-slate-200">{t("owner")}</TableHead>
                  <TableHead className="text-slate-200">{tr("Context", "السياق")}</TableHead>
                  <TableHead className="text-right text-slate-200">{tr("Escalated", "مصعّد")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {risks.map((risk) => (
                  <TableRow key={risk.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium text-white">
                      <Link href={`/${locale}/risks/${risk.id}`} className="hover:underline">
                        {isArabic ? risk.titleAr ?? risk.title : risk.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-100">{risk.severity}</TableCell>
                    <TableCell className="text-slate-200">{risk.owner}</TableCell>
                    <TableCell className="text-slate-200">
                      {(isArabic ? risk.context.projectAr : risk.context.project) ??
                        (isArabic ? risk.context.initiativeAr : risk.context.initiative) ??
                        (isArabic ? risk.context.pillarAr : risk.context.pillar) ??
                        "—"}
                    </TableCell>
                    <TableCell className="text-right text-slate-200">{risk.escalated ? tr("Yes", "نعم") : tr("No", "لا")}</TableCell>
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
