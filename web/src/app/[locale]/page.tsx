"use client";

import Image from "next/image";
import Link from "next/link";
import { LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/icon";
import landing from "@/content/landing_page.json";
import faqs from "@/content/faqs.json";
import testimonials from "@/content/testimonials.json";
import footer from "@/content/footer.json";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

function iconForFeature(icon: string) {
  if (icon === "target") return "tabler:target";
  if (icon === "chart-bar") return "tabler:chart-bar";
  if (icon === "shield-check") return "tabler:shield-check";
  return "tabler:sparkles";
}

function withLocale(locale: string, href: string) {
  if (href.startsWith("#")) return `/${locale}${href}`;
  if (href.startsWith("/")) return `/${locale}${href}`;
  return href;
}

function SectionHeading({
  title,
  subtitle,
  isArabic,
}: {
  title: string;
  subtitle?: string;
  isArabic: boolean;
}) {
  return (
    <div className={cn("space-y-2", isArabic && "text-right")}>
      <h2 className="text-xl font-semibold text-white md:text-2xl">{title}</h2>
      {subtitle ? <p className="max-w-2xl text-sm text-slate-200 md:text-base">{subtitle}</p> : null}
    </div>
  );
}

export default function LandingPage() {
  const { locale, isArabic } = useLocale();
  const { user, loading } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  const heroTitle = isArabic ? landing.hero.titleAr : landing.hero.title;
  const heroSubtitle = isArabic ? landing.hero.subtitleAr : landing.hero.subtitle;

  const primaryCtaText = loading
    ? null
    : user
      ? isArabic
        ? "الدخول إلى النظام"
        : "Enter workspace"
      : isArabic
        ? landing.hero.ctaAr
        : landing.hero.cta;

  const primaryCtaHref = user ? `/${locale}/overview` : `/${locale}/auth/login?next=/${locale}/overview`;

  const cardVariants = shouldReduceMotion
    ? undefined
    : {
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
      };

  const gridVariants = shouldReduceMotion
    ? undefined
    : {
        hidden: {},
        show: { transition: { staggerChildren: 0.08 } },
      };

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        className="space-y-16"
        initial={shouldReduceMotion ? false : "hidden"}
        animate={shouldReduceMotion ? undefined : "show"}
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
        }}
      >
        <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <m.div
            className={cn("space-y-6", isArabic && "text-right")}
            variants={{
              hidden: { opacity: 0, y: 14 },
              show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
            }}
          >
            <div className="space-y-3">
              <m.p
                className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-200"
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
                }}
              >
                <Icon name="tabler:language" className="h-4 w-4" />
                {isArabic ? "ثنائي اللغة (EN/AR) + دعم RTL" : "Bilingual (EN/AR) + RTL support"}
              </m.p>
              <m.h1
                className="text-3xl font-semibold tracking-tight text-white md:text-4xl"
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
                }}
              >
                {heroTitle}
              </m.h1>
              <m.p
                className="max-w-xl text-sm text-slate-200 md:text-base"
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
                }}
              >
                {heroSubtitle}
              </m.p>
            </div>

            <m.div
              className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", isArabic && "sm:flex-row-reverse")}
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
              }}
            >
              {primaryCtaText ? (
                <Button asChild className="bg-white text-slate-900 hover:bg-slate-100">
                  <Link href={primaryCtaHref}>{primaryCtaText}</Link>
                </Button>
              ) : null}
              <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <Link href={`/${locale}/pricing`}>
                  <span className="inline-flex items-center gap-2">
                    <Icon name="tabler:coins" className="h-4 w-4" />
                    {isArabic ? "الأسعار" : "Pricing"}
                  </span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <Link href={`/${locale}/contact`}>
                  <span className="inline-flex items-center gap-2">
                    <Icon name="tabler:message-circle" className="h-4 w-4" />
                    {isArabic ? landing.cta_section.buttonAr : landing.cta_section.button}
                  </span>
                </Link>
              </Button>
            </m.div>

            <m.div
              className={cn("flex flex-wrap gap-4 text-sm font-semibold", isArabic && "justify-end")}
              variants={{
                hidden: { opacity: 0, y: 8 },
                show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
              }}
            >
              <Link href={`/${locale}#features`} className="text-indigo-200 hover:text-indigo-100">
                {isArabic ? "الميزات" : "Features"}
              </Link>
              <Link href={`/${locale}#how-it-works`} className="text-indigo-200 hover:text-indigo-100">
                {isArabic ? "كيف يعمل" : "How it works"}
              </Link>
              <Link href={`/${locale}#faq`} className="text-indigo-200 hover:text-indigo-100">
                {isArabic ? "الأسئلة الشائعة" : "FAQ"}
              </Link>
            </m.div>
          </m.div>

          <m.div
            className="relative"
            variants={{
              hidden: { opacity: 0, y: 14 },
              show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE_OUT } },
            }}
          >
            <div className="absolute -inset-4 rounded-[2.5rem] bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),transparent_55%)] blur-2xl" />
            <m.div
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/40 p-6 shadow-lg shadow-black/20"
              whileHover={shouldReduceMotion ? undefined : { y: -4 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <Image
                src={landing.hero.image}
                alt={isArabic ? "واجهة المنتج" : "Product UI preview"}
                width={880}
                height={560}
                priority
                className="h-auto w-full"
              />
            </m.div>
          </m.div>
        </section>

      <section id="features" className="space-y-6 scroll-mt-28">
        <m.div variants={cardVariants}>
          <SectionHeading
            isArabic={isArabic}
            title={isArabic ? "الميزات الأساسية" : "Core features"}
            subtitle={
              isArabic
                ? "كل ما تحتاجه لربط الاستراتيجية بالتنفيذ والحوكمة — بدون تعقيد."
                : "Everything you need to connect strategy, execution, and governance — without the clutter."
            }
          />
        </m.div>

        <m.div className="grid gap-4 lg:grid-cols-3" variants={gridVariants} initial={shouldReduceMotion ? false : "hidden"} whileInView={shouldReduceMotion ? undefined : "show"} viewport={{ once: true, amount: 0.25 }}>
          {landing.features.map((feature) => (
            <m.div key={feature.id} variants={cardVariants} whileHover={shouldReduceMotion ? undefined : { y: -4 }} transition={{ duration: 0.2, ease: "easeOut" }}>
              <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
                <CardHeader className="space-y-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40">
                    <Icon name={iconForFeature(feature.icon)} className="h-5 w-5 text-slate-100" />
                  </div>
                  <div className={cn("space-y-1", isArabic && "text-right")}>
                    <CardTitle className="text-base">{isArabic ? feature.titleAr : feature.title}</CardTitle>
                    <CardDescription className="text-slate-200">{isArabic ? feature.descriptionAr : feature.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </m.div>
          ))}
        </m.div>
      </section>

      <section id="how-it-works" className="space-y-6 scroll-mt-28">
        <m.div variants={cardVariants}>
          <SectionHeading
            isArabic={isArabic}
            title={isArabic ? "كيف يعمل" : "How it works"}
            subtitle={isArabic ? "رحلة بسيطة من التخطيط إلى النتائج." : "A simple path from planning to outcomes."}
          />
        </m.div>

        <m.div
          className="grid gap-4 lg:grid-cols-3"
          variants={gridVariants}
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView={shouldReduceMotion ? undefined : "show"}
          viewport={{ once: true, amount: 0.25 }}
        >
          {[
            {
              icon: "tabler:target-arrow",
              title: isArabic ? "عرّف الاستراتيجية" : "Define strategy",
              body: isArabic ? "الركائز والأهداف والمبادرات في مكان واحد." : "Pillars, goals, and initiatives in one place.",
            },
            {
              icon: "tabler:chart-line",
              title: isArabic ? "راقب الأداء" : "Track performance",
              body: isArabic ? "مؤشرات واضحة وتقدم تنفيذي سريع." : "Clear KPIs and executive-ready progress.",
            },
            {
              icon: "tabler:gavel",
              title: isArabic ? "حوكمة وامتثال" : "Govern & comply",
              body: isArabic ? "قرارات موثّقة وموافقات ومسار تدقيق." : "Auditable decisions, approvals, and accountability.",
            },
          ].map((step) => (
            <m.div key={step.title} variants={cardVariants} whileHover={shouldReduceMotion ? undefined : { y: -4 }} transition={{ duration: 0.2, ease: "easeOut" }}>
              <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
                <CardHeader className="space-y-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40">
                    <Icon name={step.icon} className="h-5 w-5 text-slate-100" />
                  </div>
                  <div className={cn("space-y-1", isArabic && "text-right")}>
                    <CardTitle className="text-base">{step.title}</CardTitle>
                    <CardDescription className="text-slate-200">{step.body}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </m.div>
          ))}
        </m.div>
      </section>

      <section className="space-y-6">
        <m.div variants={cardVariants}>
          <SectionHeading
            isArabic={isArabic}
            title={isArabic ? "شهادات" : "What teams say"}
            subtitle={isArabic ? "لمحات قصيرة من مستخدمين تجريبيين." : "Short highlights from demo users."}
          />
        </m.div>

        <m.div
          className="grid gap-4 lg:grid-cols-3"
          variants={gridVariants}
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView={shouldReduceMotion ? undefined : "show"}
          viewport={{ once: true, amount: 0.25 }}
        >
          {testimonials.map((item) => (
            <m.div key={item.id} variants={cardVariants} whileHover={shouldReduceMotion ? undefined : { y: -4 }} transition={{ duration: 0.2, ease: "easeOut" }}>
              <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
                <CardHeader className="space-y-4">
                  <p className={cn("text-sm text-slate-100", isArabic && "text-right")}>&ldquo;{isArabic ? item.quoteAr : item.quote}&rdquo;</p>
                  <div className={cn("flex items-center gap-3", isArabic && "flex-row-reverse")}>
                    <Image
                      src={item.image}
                      alt={isArabic ? item.authorAr : item.author}
                      width={44}
                      height={44}
                      className="rounded-full border border-white/10"
                    />
                    <div className={cn("leading-tight", isArabic && "text-right")}>
                      <p className="text-sm font-semibold text-white">{isArabic ? item.authorAr : item.author}</p>
                      <p className="text-xs text-slate-300">{isArabic ? item.roleAr : item.role}</p>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </m.div>
          ))}
        </m.div>
      </section>

      <section id="faq" className="space-y-6 scroll-mt-28">
        <m.div variants={cardVariants}>
          <SectionHeading
            isArabic={isArabic}
            title={isArabic ? "الأسئلة الشائعة" : "FAQ"}
            subtitle={isArabic ? "إجابات سريعة قبل البدء." : "Quick answers before you start."}
          />
        </m.div>

        <m.div
          className="grid gap-3"
          variants={gridVariants}
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView={shouldReduceMotion ? undefined : "show"}
          viewport={{ once: true, amount: 0.2 }}
        >
          {faqs.map((item) => (
            <m.details
              key={item.id}
              className="group rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white shadow-lg shadow-black/20"
              variants={cardVariants}
              whileHover={shouldReduceMotion ? undefined : { y: -2 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <summary className={cn("flex cursor-pointer list-none items-center justify-between gap-4", isArabic && "flex-row-reverse")}>
                <span className={cn("text-sm font-semibold", isArabic && "text-right")}>{isArabic ? item.questionAr : item.question}</span>
                <Icon
                  name={isArabic ? "tabler:chevron-left" : "tabler:chevron-right"}
                  className={cn("h-4 w-4 text-slate-200 transition", isArabic ? "group-open:-rotate-90" : "group-open:rotate-90")}
                />
              </summary>
              <m.p
                className={cn("mt-3 text-sm text-slate-200", isArabic && "text-right")}
                initial={false}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {isArabic ? item.answerAr : item.answer}
              </m.p>
            </m.details>
          ))}
        </m.div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white shadow-lg shadow-black/20">
        <m.div
          className={cn("flex flex-col gap-4 md:flex-row md:items-center md:justify-between", isArabic && "md:flex-row-reverse")}
          variants={cardVariants}
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView={shouldReduceMotion ? undefined : "show"}
          viewport={{ once: true, amount: 0.5 }}
        >
          <div className={cn("space-y-1", isArabic && "text-right")}>
            <h3 className="text-xl font-semibold">{isArabic ? landing.cta_section.titleAr : landing.cta_section.title}</h3>
            <p className="text-sm text-slate-200">
              {isArabic ? "تواصل معنا للحصول على عرض توضيحي يناسب احتياجك." : "Talk to us for a demo tailored to your scope."}
            </p>
          </div>
          <Button asChild className="bg-white text-slate-900 hover:bg-slate-100">
            <Link href={`/${locale}/contact`}>{isArabic ? landing.cta_section.buttonAr : landing.cta_section.button}</Link>
          </Button>
        </m.div>
      </section>

      <footer className="border-t border-white/10 pt-8">
        <div className={cn("grid gap-8 lg:grid-cols-4", isArabic && "text-right")}>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">{isArabic ? footer.company.nameAr : footer.company.name}</p>
            <p className="text-sm text-slate-300">{isArabic ? footer.company.descriptionAr : footer.company.description}</p>
          </div>
          {footer.links.map((group) => (
            <div key={group.title} className="space-y-2">
              <p className="text-sm font-semibold text-white">{isArabic ? group.titleAr : group.title}</p>
              <ul className="space-y-2 text-sm text-slate-300">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link href={withLocale(locale, item.href)} className="hover:text-white">
                      {isArabic ? item.labelAr : item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className={cn("mt-8 text-xs text-slate-400", isArabic && "text-right")}>{isArabic ? footer.copyrightAr : footer.copyright}</p>
      </footer>
      </m.div>
    </LazyMotion>
  );
}
