"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import faqs from "@/content/faqs.json";
import { useLocale } from "@/providers/locale-provider";

export default function FAQPage() {
  const { locale, t } = useLocale();
  const isArabic = locale === "ar";

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("faq")}
        subtitle={t("faqSubtitle")}
        icon={<Icon name="tabler:help" className="h-5 w-5" />}
      />

      <div className="grid gap-3">
        {faqs.map((item) => (
          <details
            key={item.id}
            className="group rounded-2xl border border-border bg-card/50 px-5 py-4 shadow-sm open:bg-muted/30"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="text-sm font-semibold text-foreground">{isArabic ? item.questionAr : item.question}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-muted/30 text-foreground transition group-open:rotate-45">
                <Icon name="tabler:plus" className="h-4 w-4" />
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{isArabic ? item.answerAr : item.answer}</p>
          </details>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href={`/${locale}`} className="text-sm font-semibold text-indigo-200 hover:text-indigo-100">
          {t("backToHome")}
        </Link>
        <span className="text-muted-foreground">•</span>
        <Link href={`/${locale}/auth/login?next=/${locale}/overview`} className="text-sm font-semibold text-indigo-200 hover:text-indigo-100">
          {t("startTheDemo")}
        </Link>
      </div>
    </div>
  );
}
