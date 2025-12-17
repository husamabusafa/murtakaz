"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import faqs from "@/content/faqs.json";
import { useLocale } from "@/providers/locale-provider";

export default function FAQPage() {
  const { locale } = useLocale();
  const isArabic = locale === "ar";

  return (
    <div className="space-y-8">
      <PageHeader
        title={isArabic ? "الأسئلة الشائعة" : "FAQ"}
        subtitle={isArabic ? "إجابات واضحة ومختصرة لأسئلة العملاء." : "Clear, concise answers for customer discussions."}
        icon={<Icon name="tabler:help" className="h-5 w-5" />}
      />

      <div className="grid gap-3">
        {faqs.map((item) => (
          <details
            key={item.id}
            className="group rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white shadow-lg shadow-black/20 open:bg-white/10"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="text-sm font-semibold text-white">{isArabic ? item.questionAr : item.question}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-slate-950/40 text-slate-100 transition group-open:rotate-45">
                <Icon name="tabler:plus" className="h-4 w-4" />
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">{isArabic ? item.answerAr : item.answer}</p>
          </details>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href={`/${locale}`} className="text-sm font-semibold text-indigo-200 hover:text-indigo-100">
          {isArabic ? "العودة إلى صفحة الهبوط" : "Back to landing"}
        </Link>
        <span className="text-slate-400">•</span>
        <Link href={`/${locale}/auth/login?next=/${locale}/overview`} className="text-sm font-semibold text-indigo-200 hover:text-indigo-100">
          {isArabic ? "ابدأ التجربة" : "Start the demo"}
        </Link>
      </div>
    </div>
  );
}

