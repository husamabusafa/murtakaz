"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/providers/locale-provider";

export default function PrivacyPage() {
  const { locale } = useLocale();
  const isArabic = locale === "ar";

  return (
    <div className="space-y-8">
      <PageHeader
        title={isArabic ? "سياسة الخصوصية" : "Privacy Policy"}
        subtitle={isArabic ? "نص تجريبي ضمن النموذج الأولي." : "Prototype policy copy for the demo."}
        icon={<Icon name="tabler:lock" className="h-5 w-5" />}
      />

      <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
        <CardHeader>
          <CardTitle className="text-base">{isArabic ? "ملخص" : "Summary"}</CardTitle>
          <CardDescription className="text-slate-200">
            {isArabic ? "سياسات الخصوصية النهائية تُعتمد حسب متطلبات الجهة والامتثال." : "Final policies vary by deployment and compliance requirements."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-200">
          <p>{isArabic ? "• نجمع الحد الأدنى اللازم لتشغيل النظام." : "• We collect the minimum required to operate the platform."}</p>
          <p>{isArabic ? "• التحكم بالصلاحيات يتم حسب الدور (RBAC)." : "• Access is enforced via role-based access control (RBAC)."}</p>
          <p>{isArabic ? "• سجلات التدقيق غير قابلة للتعديل." : "• Audit logs are immutable for governance."}</p>
        </CardContent>
      </Card>

      <Link href={`/${locale}`} className="text-sm font-semibold text-indigo-200 hover:text-indigo-100">
        {isArabic ? "العودة إلى صفحة الهبوط" : "Back to landing"}
      </Link>
    </div>
  );
}

