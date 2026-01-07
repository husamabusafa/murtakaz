"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";

export default function ContactPage() {
  const { locale, t } = useLocale();
  const isArabic = locale === "ar";

  return (
    <div className="space-y-8">
      <PageHeader
        title={isArabic ? "تواصل معنا" : "Contact"}
        subtitle={isArabic ? "اترك بياناتك لجدولة عرض توضيحي." : "Leave your details to schedule a demo."}
        icon={<Icon name="tabler:mail" className="h-5 w-5" />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{isArabic ? "نموذج التواصل" : "Contact form"}</CardTitle>
            <CardDescription className="text-slate-200">{isArabic ? "نموذج تجريبي (بدون إرسال)." : "Prototype form (no submission)."} </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">{isArabic ? "الاسم" : "Name"}</p>
                <Input className="border-white/10 bg-slate-950/40 text-white placeholder:text-slate-400" placeholder={isArabic ? "الاسم الكامل" : "Full name"} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">{isArabic ? "البريد الإلكتروني" : "Email"}</p>
                <Input className="border-white/10 bg-slate-950/40 text-white placeholder:text-slate-400" placeholder="name@company.com" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-white">{isArabic ? "الرسالة" : "Message"}</p>
              <Textarea className="border-white/10 bg-slate-950/40 text-white placeholder:text-slate-400" placeholder={isArabic ? "اشرح احتياجك بإيجاز..." : "Briefly describe your needs…"} />
            </div>
            <Button className="bg-white text-slate-900 hover:bg-slate-100">
              <span className="inline-flex items-center gap-2">
                <Icon name="tabler:send" className="h-4 w-4" />
                {isArabic ? "إرسال" : "Send"}
              </span>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader>
            <CardTitle className="text-base">{isArabic ? "بدائل" : "Alternatives"}</CardTitle>
            <CardDescription className="text-slate-200">{isArabic ? "روابط سريعة للعرض." : "Quick demo links."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-100">
            <Link href={`/${locale}/dashboards/executive`} className="block rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 hover:bg-white/5">
              <p className="font-semibold text-white">{isArabic ? "اللوحة التنفيذية" : "Executive dashboard"}</p>
              <p className="mt-1 text-xs text-slate-200">{isArabic ? "عرض سريع للوضع العام." : "Quick posture snapshot."}</p>
            </Link>
            <Link href={`/${locale}/auth/login?next=/${locale}/overview`} className="block rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 hover:bg-white/5">
              <p className="font-semibold text-white">{isArabic ? "ابدأ التجربة" : "Start the demo"}</p>
              <p className="mt-1 text-xs text-slate-200">{isArabic ? "تسجيل دخول بشخصيات تجريبية." : "Sign in with demo personas."}</p>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Link href={`/${locale}`} className="text-sm font-semibold text-indigo-200 hover:text-indigo-100">
        {t("backToHome")}
      </Link>
    </div>
  );
}
