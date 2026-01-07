"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/providers/locale-provider";

export default function AboutPage() {
  const { locale, t } = useLocale();
  const isArabic = locale === "ar";

  return (
    <div className="space-y-8">
      <PageHeader
        title={isArabic ? "عن مرتكز" : "About Murtakaz"}
        subtitle={
          isArabic
            ? "منتج مخصص لربط الاستراتيجية بالتنفيذ عبر تجربة مؤسسية مبنية على الحوكمة."
            : "A strategy execution platform that connects leadership intent to measurable execution with governance."
        }
        icon={<Icon name="tabler:building" className="h-5 w-5" />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {[
          { title: isArabic ? "الرؤية" : "Vision", icon: "tabler:binoculars", body: isArabic ? "وضوح تنفيذي في كل لحظة." : "Executive clarity at every moment." },
          { title: isArabic ? "النهج" : "Approach", icon: "tabler:route", body: isArabic ? "هيكلية واضحة من الركائز إلى مؤشرات الأداء الرئيسية." : "Clear hierarchy from pillars to KPIs." },
          { title: isArabic ? "الحوكمة" : "Governance", icon: "tabler:gavel", body: isArabic ? "قرارات موثقة ومسار تدقيق." : "Auditable decisions and change control." },
        ].map((item) => (
          <Card key={item.title} className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40">
                <Icon name={item.icon} className="h-5 w-5 text-slate-100" />
              </div>
              <CardTitle className="text-base">{item.title}</CardTitle>
              <CardDescription className="text-slate-200">{item.body}</CardDescription>
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
