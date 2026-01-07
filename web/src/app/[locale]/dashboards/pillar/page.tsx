"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { RagBadge } from "@/components/rag-badge";
import { Donut } from "@/components/charts/dashboard-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { riskSeverityBreakdown } from "@/lib/dashboard-metrics";
import { pillars } from "@/lib/mock-data";
import { useLocale } from "@/providers/locale-provider";

export default function PillarDashboardPage() {
  const { locale, tr, isArabic } = useLocale();

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr("Pillar dashboard", "لوحة الركائز")}
        subtitle={tr("Pillar roll-up health, initiative coverage, KPI scorecard, and risks (prototype).", "أداء الركيزة المجمعة وتغطية المبادرات وبطاقة مؤشرات الأداء الرئيسية والمخاطر (نموذج أولي).")}
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{tr("Pillar posture", "موقف الركيزة")}</CardTitle>
              <Icon name="tabler:layers-subtract" className="text-slate-200" />
            </div>
            <CardDescription className="text-slate-200">{tr("RAG health by pillar with drill-down.", "حالة RAG حسب الركيزة مع استعراض تفصيلي.")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {pillars.map((pillar) => (
              <Link
                key={pillar.id}
                href={`/${locale}/strategy/${pillar.id}`}
                className="block rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 transition hover:bg-white/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">{isArabic ? pillar.titleAr ?? pillar.title : pillar.title}</p>
                    <p className="text-xs text-slate-200">{pillar.owner}</p>
                    <p className="text-xs text-slate-300">
                      {pillar.initiatives.length} {tr("initiatives", "مبادرات")}
                    </p>
                  </div>
                  <RagBadge health={pillar.health} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{tr("Risk concentration", "تركيز المخاطر")}</CardTitle>
            <CardDescription className="text-slate-200">{tr("Severity distribution (demo).", "توزيع الخطورة (عرض تجريبي).")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Donut items={riskSeverityBreakdown} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
