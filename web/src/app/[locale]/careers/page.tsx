"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/providers/locale-provider";

export default function CareersPage() {
  const { locale } = useLocale();
  const isArabic = locale === "ar";

  return (
    <div className="space-y-8">
      <PageHeader
        title={isArabic ? "الوظائف" : "Careers"}
        subtitle={isArabic ? "هذه صفحة تجريبية ضمن النموذج الأولي." : "Prototype page for the demo site."}
        icon={<Icon name="tabler:briefcase" className="h-5 w-5" />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {[
          { title: isArabic ? "مصمم منتج" : "Product Designer", icon: "tabler:palette", body: isArabic ? "خبرة في أنظمة التصميم وواجهات المؤسسات." : "Experience with design systems and enterprise UI." },
          { title: isArabic ? "مهندس منصة" : "Platform Engineer", icon: "tabler:server", body: isArabic ? "Next.js / Prisma / Postgres وخبرة بالحوكمة." : "Next.js / Prisma / Postgres with governance mindset." },
          { title: isArabic ? "مدير منتج" : "Product Manager", icon: "tabler:clipboard-check", body: isArabic ? "ترجمة احتياج الجهات إلى منتج قابل للتنفيذ." : "Translate enterprise needs into build-ready specs." },
        ].map((role) => (
          <Card key={role.title} className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40">
                <Icon name={role.icon} className="h-5 w-5 text-slate-100" />
              </div>
              <CardTitle className="text-base">{role.title}</CardTitle>
              <CardDescription className="text-slate-200">{role.body}</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </div>

      <Link href={`/${locale}`} className="text-sm font-semibold text-indigo-200 hover:text-indigo-100">
        {isArabic ? "العودة إلى صفحة الهبوط" : "Back to landing"}
      </Link>
    </div>
  );
}

