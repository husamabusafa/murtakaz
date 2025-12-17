"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/providers/locale-provider";

export default function TermsPage() {
  const { locale } = useLocale();
  const isArabic = locale === "ar";

  return (
    <div className="space-y-8">
      <PageHeader
        title={isArabic ? "شروط الخدمة" : "Terms of Service"}
        subtitle={isArabic ? "نص تجريبي ضمن النموذج الأولي." : "Prototype terms copy for the demo."}
        icon={<Icon name="tabler:shield-check" className="h-5 w-5" />}
      />

      <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
        <CardHeader>
          <CardTitle className="text-base">{isArabic ? "بنود عامة" : "General terms"}</CardTitle>
          <CardDescription className="text-slate-200">
            {isArabic ? "تختلف الشروط النهائية حسب العقد والنطاق." : "Final terms depend on contract and scope."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-200">
          <p>{isArabic ? "• الاستخدام مخصص للجهات المصرح لها." : "• Use is limited to authorized organizations and users."}</p>
          <p>{isArabic ? "• قيود الوصول تُدار عبر RBAC." : "• Access restrictions are enforced via RBAC."}</p>
          <p>{isArabic ? "• يتم تسجيل التغييرات لأغراض الحوكمة." : "• Changes are logged for governance and audit."}</p>
        </CardContent>
      </Card>

      <Link href={`/${locale}`} className="text-sm font-semibold text-indigo-200 hover:text-indigo-100">
        {isArabic ? "العودة إلى صفحة الهبوط" : "Back to landing"}
      </Link>
    </div>
  );
}

