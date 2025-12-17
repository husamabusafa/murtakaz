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
  centered = false,
}: {
  title: string;
  subtitle?: string;
  isArabic: boolean;
  centered?: boolean;
}) {
  return (
    <div className={cn("space-y-4 max-w-3xl", isArabic ? "text-right ml-auto" : "mr-auto", centered && "mx-auto text-center")}>
      <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{title}</h2>
      {subtitle ? <p className="text-lg text-slate-400 leading-relaxed">{subtitle}</p> : null}
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
        className="space-y-24 pb-24"
        initial={shouldReduceMotion ? false : "hidden"}
        animate={shouldReduceMotion ? undefined : "show"}
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
        }}
      >
        <section className="relative grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Background Gradient for Hero */}
          <div className="absolute -left-20 -top-20 -z-10 h-[500px] w-[500px] rounded-full bg-indigo-500/20 blur-[120px] opacity-30 mix-blend-screen" />

          <m.div
            className={cn("space-y-8", isArabic && "text-right")}
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_OUT } },
            }}
          >
            <div className="space-y-6">
              <m.div
                className="inline-flex w-fit items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300 backdrop-blur-sm"
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
                }}
              >
                <Icon name="tabler:language" className="h-3.5 w-3.5" />
                <span>{isArabic ? "ثنائي اللغة (EN/AR) + دعم RTL" : "Bilingual (EN/AR) + RTL support"}</span>
              </m.div>

              <m.h1
                className="text-4xl font-bold tracking-tight text-white md:text-6xl md:leading-tight lg:text-7xl lg:leading-tight"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_OUT } },
                }}
              >
                {heroTitle}
              </m.h1>

              <m.p
                className="max-w-xl text-lg text-slate-400 md:text-xl md:leading-relaxed"
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.1, ease: EASE_OUT } },
                }}
              >
                {heroSubtitle}
              </m.p>
            </div>

            <m.div
              className={cn("flex flex-col gap-4 sm:flex-row sm:items-center", isArabic && "sm:flex-row-reverse")}
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.2, ease: EASE_OUT } },
              }}
            >
              {primaryCtaText ? (
                <Button asChild size="lg" className="h-12 bg-white px-8 text-base text-slate-900 hover:bg-indigo-50 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] transition-all">
                  <Link href={primaryCtaHref}>{primaryCtaText}</Link>
                </Button>
              ) : null}
              <Button asChild variant="outline" size="lg" className="h-12 border-white/10 bg-white/5 text-base text-white hover:bg-white/10 hover:text-white backdrop-blur-sm">
                <Link href={`/${locale}/contact`}>
                  <span className="inline-flex items-center gap-2">
                    <Icon name="tabler:message-circle" className="h-5 w-5" />
                    {isArabic ? landing.cta_section.buttonAr : landing.cta_section.button}
                  </span>
                </Link>
              </Button>
            </m.div>

            <m.div
              className={cn("flex flex-wrap gap-6 text-sm font-medium text-slate-400", isArabic && "justify-end")}
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { duration: 1, delay: 0.4 } },
              }}
            >
              <Link href={`/${locale}#features`} className="hover:text-white transition-colors">
                {isArabic ? "الميزات" : "Features"}
              </Link>
              <Link href={`/${locale}#how-it-works`} className="hover:text-white transition-colors">
                {isArabic ? "كيف يعمل" : "How it works"}
              </Link>
              <Link href={`/${locale}#faq`} className="hover:text-white transition-colors">
                {isArabic ? "الأسئلة الشائعة" : "FAQ"}
              </Link>
            </m.div>
          </m.div>

          <m.div
            className="relative perspective-1000"
            variants={{
              hidden: { opacity: 0, scale: 0.95, rotateX: 5 },
              show: { opacity: 1, scale: 1, rotateX: 0, transition: { duration: 1, ease: EASE_OUT } },
            }}
          >
             {/* Glow behind image */}
            <div className="absolute -inset-10 -z-10 bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-pink-500/20 blur-3xl opacity-50" />
            
            <m.div
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl ring-1 ring-white/5"
              whileHover={shouldReduceMotion ? undefined : { y: -5, scale: 1.01 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="relative overflow-hidden rounded-xl border border-white/5 bg-slate-950">
                  <Image
                    src={landing.hero.image}
                    alt={isArabic ? "واجهة المنتج" : "Product UI preview"}
                    width={880}
                    height={560}
                    priority
                    className="h-auto w-full object-cover"
                  />
                  {/* Overlay gradient for screen reflection feel */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-20 pointer-events-none" />
              </div>
            </m.div>
          </m.div>
        </section>

      <section id="features" className="space-y-12 scroll-mt-28">
        <m.div variants={cardVariants} className="text-center">
          <SectionHeading
            isArabic={isArabic}
            title={isArabic ? "الميزات الأساسية" : "Core features"}
            subtitle={
              isArabic
                ? "كل ما تحتاجه لربط الاستراتيجية بالتنفيذ والحوكمة — بدون تعقيد."
                : "Everything you need to connect strategy, execution, and governance — without the clutter."
            }
            centered
          />
        </m.div>

        <m.div className="grid gap-8 md:grid-cols-3" variants={gridVariants} initial={shouldReduceMotion ? false : "hidden"} whileInView={shouldReduceMotion ? undefined : "show"} viewport={{ once: true, amount: 0.25 }}>
          {landing.features.map((feature) => (
            <m.div key={feature.id} variants={cardVariants} whileHover={shouldReduceMotion ? undefined : { y: -8 }} transition={{ duration: 0.3, ease: "easeOut" }}>
              <Card className="h-full border-white/10 bg-slate-900/50 p-6 backdrop-blur-sm transition-colors hover:border-indigo-500/30 hover:bg-slate-900/80">
                <CardHeader className="space-y-4 p-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 ring-1 ring-inset ring-white/10">
                    <Icon name={iconForFeature(feature.icon)} className="h-6 w-6 text-indigo-300" />
                  </div>
                  <div className={cn("space-y-2", isArabic && "text-right")}>
                    <CardTitle className="text-xl text-white">{isArabic ? feature.titleAr : feature.title}</CardTitle>
                    <CardDescription className="text-base text-slate-400 leading-relaxed">{isArabic ? feature.descriptionAr : feature.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </m.div>
          ))}
        </m.div>
      </section>

      <section id="how-it-works" className="space-y-12 scroll-mt-28">
        <m.div variants={cardVariants}>
          <SectionHeading
            isArabic={isArabic}
            title={isArabic ? "كيف يعمل" : "How it works"}
            subtitle={isArabic ? "رحلة بسيطة من التخطيط إلى النتائج." : "A simple path from planning to outcomes."}
          />
        </m.div>

        <m.div
          className="grid gap-8 md:grid-cols-3"
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
              step: "01"
            },
            {
              icon: "tabler:chart-line",
              title: isArabic ? "راقب الأداء" : "Track performance",
              body: isArabic ? "مؤشرات واضحة وتقدم تنفيذي سريع." : "Clear KPIs and executive-ready progress.",
              step: "02"
            },
            {
              icon: "tabler:gavel",
              title: isArabic ? "حوكمة وامتثال" : "Govern & comply",
              body: isArabic ? "قرارات موثّقة وموافقات ومسار تدقيق." : "Auditable decisions, approvals, and accountability.",
              step: "03"
            },
          ].map((step) => (
            <m.div key={step.title} variants={cardVariants} whileHover={shouldReduceMotion ? undefined : { y: -5 }} transition={{ duration: 0.3, ease: "easeOut" }}>
              <div className="group relative h-full rounded-2xl border border-white/10 bg-slate-900/40 p-8 backdrop-blur-sm transition-all hover:bg-slate-900/60">
                <div className="absolute top-8 right-8 text-4xl font-bold text-white/5 select-none">{step.step}</div>
                <div className="space-y-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 group-hover:border-indigo-500/30 group-hover:bg-indigo-500/10 transition-colors">
                    <Icon name={step.icon} className="h-7 w-7 text-white group-hover:text-indigo-300 transition-colors" />
                  </div>
                  <div className={cn("space-y-2", isArabic && "text-right")}>
                    <h3 className="text-xl font-bold text-white">{step.title}</h3>
                    <p className="text-base text-slate-400 leading-relaxed">{step.body}</p>
                  </div>
                </div>
              </div>
            </m.div>
          ))}
        </m.div>
      </section>

      <section className="space-y-12">
        <m.div variants={cardVariants}>
          <SectionHeading
            isArabic={isArabic}
            title={isArabic ? "شهادات" : "What teams say"}
            subtitle={isArabic ? "لمحات قصيرة من مستخدمين تجريبيين." : "Short highlights from demo users."}
            centered
          />
        </m.div>

        <m.div
          className="grid gap-8 md:grid-cols-3"
          variants={gridVariants}
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView={shouldReduceMotion ? undefined : "show"}
          viewport={{ once: true, amount: 0.25 }}
        >
          {testimonials.map((item) => (
            <m.div key={item.id} variants={cardVariants} whileHover={shouldReduceMotion ? undefined : { y: -6 }} transition={{ duration: 0.3, ease: "easeOut" }}>
              <div className="flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/40 p-6 shadow-xl shadow-black/20 backdrop-blur-sm transition-colors hover:bg-slate-900/60">
                <div className="space-y-4">
                  <div className="flex gap-1 text-indigo-400">
                      {[...Array(5)].map((_, i) => (
                        <Icon key={i} name="tabler:star-filled" className="h-4 w-4" />
                      ))}
                  </div>
                  <p className={cn("text-lg font-medium leading-relaxed text-slate-200", isArabic && "text-right")}>&ldquo;{isArabic ? item.quoteAr : item.quote}&rdquo;</p>
                </div>
                
                <div className={cn("mt-6 flex items-center gap-4", isArabic && "flex-row-reverse")}>
                    <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-white/10">
                      <Image
                        src={item.image}
                        alt={isArabic ? item.authorAr : item.author}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className={cn("leading-tight", isArabic && "text-right")}>
                      <p className="font-semibold text-white">{isArabic ? item.authorAr : item.author}</p>
                      <p className="text-sm text-slate-400">{isArabic ? item.roleAr : item.role}</p>
                    </div>
                </div>
              </div>
            </m.div>
          ))}
        </m.div>
      </section>

      <section id="faq" className="space-y-12 scroll-mt-28">
        <m.div variants={cardVariants}>
          <SectionHeading
            isArabic={isArabic}
            title={isArabic ? "الأسئلة الشائعة" : "FAQ"}
            subtitle={isArabic ? "إجابات سريعة قبل البدء." : "Quick answers before you start."}
            centered
          />
        </m.div>

        <m.div
          className="mx-auto max-w-3xl grid gap-4"
          variants={gridVariants}
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView={shouldReduceMotion ? undefined : "show"}
          viewport={{ once: true, amount: 0.2 }}
        >
          {faqs.map((item) => (
            <m.details
              key={item.id}
              className="group rounded-2xl border border-white/10 bg-slate-900/30 px-6 py-5 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-slate-900/50 open:bg-slate-900/60 open:ring-1 open:ring-white/5"
              variants={cardVariants}
              whileHover={shouldReduceMotion ? undefined : { y: -2 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <summary className={cn("flex cursor-pointer list-none items-center justify-between gap-6", isArabic && "flex-row-reverse")}>
                <span className={cn("text-lg font-medium", isArabic && "text-right")}>{isArabic ? item.questionAr : item.question}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-colors group-hover:bg-white/10">
                   <Icon
                    name={isArabic ? "tabler:chevron-left" : "tabler:chevron-right"}
                    className={cn("h-5 w-5 text-slate-300 transition-transform duration-300", isArabic ? "group-open:-rotate-90" : "group-open:rotate-90")}
                  />
                </span>
              </summary>
              <m.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                  <p className={cn("mt-4 text-base leading-relaxed text-slate-400", isArabic && "text-right")}>
                    {isArabic ? item.answerAr : item.answer}
                  </p>
              </m.div>
            </m.details>
          ))}
        </m.div>
      </section>

      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-12 text-white shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent opacity-50" />
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl opacity-30" />
        
        <m.div
          className={cn("relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between", isArabic && "md:flex-row-reverse")}
          variants={cardVariants}
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView={shouldReduceMotion ? undefined : "show"}
          viewport={{ once: true, amount: 0.5 }}
        >
          <div className={cn("space-y-4 max-w-2xl", isArabic && "text-right")}>
            <h3 className="text-3xl font-bold tracking-tight md:text-4xl">{isArabic ? landing.cta_section.titleAr : landing.cta_section.title}</h3>
            <p className="text-lg text-slate-300">
              {isArabic ? "تواصل معنا للحصول على عرض توضيحي يناسب احتياجك." : "Talk to us for a demo tailored to your scope."}
            </p>
          </div>
          <Button asChild size="lg" className="bg-white text-base text-slate-900 hover:bg-indigo-50 px-8 py-6 h-auto shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all">
            <Link href={`/${locale}/contact`}>{isArabic ? landing.cta_section.buttonAr : landing.cta_section.button}</Link>
          </Button>
        </m.div>
      </section>

      <footer className="border-t border-white/10 pt-16 pb-8">
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
