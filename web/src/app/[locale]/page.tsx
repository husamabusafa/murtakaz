"use client";

import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Donut, SparkLine } from "@/components/charts/dashboard-charts";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import landing from "@/content/landing_page.json";
import faqs from "@/content/faqs.json";
import testimonials from "@/content/testimonials.json";
import footer from "@/content/footer.json";
import { riskSeverityBreakdown } from "@/lib/dashboard-metrics";
import { pillars } from "@/lib/mock-data";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";

function iconForFeature(icon: string) {
  if (icon === "target") return "tabler:target";
  if (icon === "chart-bar") return "tabler:chart-bar";
  if (icon === "shield-check") return "tabler:shield-check";
  return "tabler:sparkles";
}

export default function LandingPage() {
  const { locale } = useLocale();
  const { user, loading } = useAuth();
  const isArabic = locale === "ar";

  const heroTitle = isArabic ? landing.hero.titleAr : landing.hero.title;
  const heroSubtitle = isArabic ? landing.hero.subtitleAr : landing.hero.subtitle;
  const ctaText = isArabic ? landing.hero.ctaAr : landing.hero.cta;
  const benefitsTitle = isArabic ? landing.benefits.titleAr : landing.benefits.title;
  const ctaHeadline = isArabic ? landing.cta_section.titleAr : landing.cta_section.title;
  const ctaButton = isArabic ? landing.cta_section.buttonAr : landing.cta_section.button;

  const initiatives = pillars.flatMap((pillar) => pillar.initiatives);
  const atRisk = initiatives.filter((initiative) => initiative.health !== "GREEN");
  const demoTrend = [62, 64, 63, 66, 69, 67, 70, 72, 73, 74, 76, 75];

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <PageHeader title={heroTitle} subtitle={heroSubtitle} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {loading ? null : user ? (
              <Button asChild className="bg-white text-slate-900 hover:bg-slate-100">
                <Link href={`/${locale}/overview`}>{isArabic ? "الدخول إلى النظام" : "Enter workspace"}</Link>
              </Button>
            ) : (
              <Button asChild className="bg-white text-slate-900 hover:bg-slate-100">
                <Link href={`/${locale}/auth/login?next=/${locale}/overview`}>{ctaText}</Link>
              </Button>
            )}
            <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
              <Link href={`/${locale}/dashboards/executive`}>
                <span className="inline-flex items-center gap-2">
                  <Icon name="tabler:crown" className="h-4 w-4" />
                  {isArabic ? "لوحة القيادة التنفيذية" : "Executive dashboard"}
                </span>
              </Link>
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white shadow-lg shadow-black/20">
              <p className="text-xs text-slate-200">{isArabic ? "ركائز" : "Pillars"}</p>
              <p className="mt-1 text-2xl font-semibold">{pillars.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white shadow-lg shadow-black/20">
              <p className="text-xs text-slate-200">{isArabic ? "مبادرات تحتاج متابعة" : "At-risk initiatives"}</p>
              <p className="mt-1 text-2xl font-semibold">{atRisk.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white shadow-lg shadow-black/20">
              <p className="text-xs text-slate-200">{isArabic ? "حوكمة وموافقات" : "Governance"}</p>
              <p className="mt-1 text-2xl font-semibold">{isArabic ? "مُفعّلة" : "Enabled"}</p>
            </div>
          </div>
        </div>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{isArabic ? "معاينة فورية" : "Live preview"}</CardTitle>
            <CardDescription className="text-slate-200">
              {isArabic ? "مؤشرات لحظية وملخص تنفيذي جاهز للعرض." : "Real-time signals and an executive-ready snapshot."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{isArabic ? "الثقة" : "Confidence"}</p>
                  <Icon name="tabler:trend-up" className="h-4 w-4 text-slate-200" />
                </div>
                <p className="mt-1 text-xs text-slate-200">{isArabic ? "مؤشر (تجريبي)" : "Index (demo)"}</p>
                <div className="mt-3">
                  <SparkLine values={demoTrend} />
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{isArabic ? "المخاطر" : "Risks"}</p>
                  <Icon name="tabler:shield-exclamation" className="h-4 w-4 text-slate-200" />
                </div>
                <p className="mt-1 text-xs text-slate-200">{isArabic ? "توزيع الخطورة" : "Severity mix"}</p>
                <div className="mt-3">
                  <Donut items={riskSeverityBreakdown} height={200} />
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-300">
              {isArabic
                ? "هذه معاينة تصميمية داخل صفحة الهبوط — التجربة الكاملة داخل النظام بعد تسجيل الدخول."
                : "This is a design preview inside the landing page — the full experience is available inside the workspace."}
            </p>
          </CardContent>
        </Card>
      </div>

      <section id="features" className="grid gap-4 lg:grid-cols-3 scroll-mt-28">
        {landing.features.map((feature) => (
          <Card key={feature.id} className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader className="space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40">
                <Icon name={iconForFeature(feature.icon)} className="h-5 w-5 text-slate-100" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-base">{isArabic ? feature.titleAr : feature.title}</CardTitle>
                <CardDescription className="text-slate-200">{isArabic ? feature.descriptionAr : feature.description}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section id="benefits" className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start scroll-mt-28">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-white md:text-2xl">{benefitsTitle}</h2>
          <p className="text-sm text-slate-200">
            {isArabic
              ? "مرتكز يربط الاستراتيجية بالمبادرات والمشاريع والمؤشرات والحوكمة ضمن تجربة موحّدة."
              : "Murtakaz connects pillars, initiatives, projects, KPIs, and governance into one executive-grade experience."}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-3">
          {landing.benefits.items.map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white shadow-lg shadow-black/20">
              <div className="flex items-center gap-2">
                <Icon name="tabler:circle-check" className="h-5 w-5 text-emerald-200" />
                <p className="text-sm font-semibold">{isArabic ? item.titleAr : item.title}</p>
              </div>
              <p className="mt-2 text-sm text-slate-200">{isArabic ? item.descriptionAr : item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="testimonials" className="space-y-4 scroll-mt-28">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-white md:text-2xl">
              {isArabic ? "آراء العملاء" : "What leaders say"}
            </h2>
            <p className="text-sm text-slate-200">
              {isArabic ? "انطباعات من قادة الأعمال ومكاتب الاستراتيجية." : "Feedback from executives, strategy offices, and PMOs."}
            </p>
          </div>
          <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
            <Link href={`/${locale}/auth/login?next=/${locale}/dashboards/executive`}>
              <span className="inline-flex items-center gap-2">
                <Icon name="tabler:crown" className="h-4 w-4" />
                {isArabic ? "استعرض لوحات المعلومات" : "View dashboards"}
              </span>
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {testimonials.map((item) => (
            <Card key={item.id} className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
                      <Image
                        src={item.image}
                        alt={isArabic ? item.authorAr : item.author}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{isArabic ? item.authorAr : item.author}</p>
                      <p className="text-xs text-slate-200">{isArabic ? item.roleAr : item.role}</p>
                    </div>
                  </div>
                  <Icon name="tabler:quote" className="h-5 w-5 text-slate-300" />
                </div>
                <p className="text-sm leading-relaxed text-slate-100">{isArabic ? item.quoteAr : item.quote}</p>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section id="faq" className="space-y-4 scroll-mt-28">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-white md:text-2xl">{isArabic ? "الأسئلة الشائعة" : "FAQ"}</h2>
          <p className="text-sm text-slate-200">
            {isArabic ? "أجوبة سريعة على أكثر الأسئلة شيوعًا." : "Quick answers to the most common questions."}
          </p>
        </div>

        <div className="grid gap-3">
          {faqs.map((item) => (
            <details
              key={item.id}
              className="group rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white shadow-lg shadow-black/20 open:bg-white/10"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="text-sm font-semibold text-white">
                  {isArabic ? item.questionAr : item.question}
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-slate-950/40 text-slate-100 transition group-open:rotate-45">
                  <Icon name="tabler:plus" className="h-4 w-4" />
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-200">{isArabic ? item.answerAr : item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-indigo-500/20 via-slate-950/40 to-emerald-500/15 p-6 text-white shadow-lg shadow-black/20 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-lg font-semibold text-white">{ctaHeadline}</p>
            <p className="text-sm text-slate-200">
              {isArabic ? "اطّلع على تجربة تنفيذ الاستراتيجية ولوحات المعلومات والحوكمة." : "Explore strategy execution, dashboards, and governance in a guided demo."}
            </p>
          </div>
          <Button asChild className="bg-white text-slate-900 hover:bg-slate-100">
            <Link href={`/${locale}/auth/login?next=/${locale}/dashboards/executive`}>
              <span className="inline-flex items-center gap-2">
                <Icon name="tabler:message-circle" className="h-4 w-4" />
                {ctaButton}
              </span>
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-white/10 py-10">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_2fr]">
          <div className="space-y-2">
            <p className="text-base font-semibold text-white">{isArabic ? footer.company.nameAr : footer.company.name}</p>
            <p className="text-sm text-slate-200">
              {isArabic ? footer.company.descriptionAr : footer.company.description}
            </p>
            <div className="mt-4 flex items-center gap-3 text-slate-200">
              <a className="rounded-xl border border-white/10 bg-white/5 p-2 hover:bg-white/10" href="#features" aria-label="Features">
                <Icon name="tabler:sparkles" className="h-5 w-5" />
              </a>
              <a className="rounded-xl border border-white/10 bg-white/5 p-2 hover:bg-white/10" href="#faq" aria-label="FAQ">
                <Icon name="tabler:help" className="h-5 w-5" />
              </a>
              <a className="rounded-xl border border-white/10 bg-white/5 p-2 hover:bg-white/10" href="#testimonials" aria-label="Testimonials">
                <Icon name="tabler:quote" className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {footer.links.map((group) => (
              <div key={group.title} className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">
                  {isArabic ? group.titleAr : group.title}
                </p>
                <ul className="space-y-2 text-sm text-slate-200">
                  {group.items.map((link) => {
                    const isAnchor = link.href.startsWith("#");
                    const href = isAnchor ? link.href : `/${locale}${link.href}`;
                    return (
                      <li key={link.href}>
                        <Link className="hover:text-white" href={href}>
                          {isArabic ? link.labelAr : link.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-slate-300 md:flex-row md:items-center md:justify-between">
          <p>{isArabic ? footer.copyrightAr : footer.copyright}</p>
          <p className="flex items-center gap-2">
            <Icon name="tabler:lock" className="h-4 w-4" />
            {isArabic ? "جاهز للحوكمة والتحكم بالصلاحيات" : "Governance-ready with role-based access control"}
          </p>
        </div>
      </footer>
    </div>
  );
}
