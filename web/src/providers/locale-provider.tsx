"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Locale = "en" | "ar";

interface LocaleContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  isArabic: boolean;
  t: (key: TranslationKey) => string;
  tr: (en: string, ar: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const dictionary = {
  en: {
    home: "Overview",
    strategy: "Strategy",
    projects: "Projects",
    kpis: "KPIs",
    risks: "Risks",
    dashboards: "Dashboards",
    approvals: "Approvals",
    admin: "Admin",
    superAdmin: "Super Admin",
    organizations: "Organizations",
    language: "العربية",
    overviewTitle: "Overview",
    overviewSubtitle: "Strategy execution snapshot across pillars, initiatives, projects, KPIs, and risks.",
    keyMetrics: "Key metrics",
    needsAttention: "Needs attention",
    openRisks: "Open risks",
    pendingApprovals: "Pending approvals",
    kpisOverdue: "KPIs need updates",
    viewAll: "View all",
    executiveDashboards: "Dashboards",
    pillarHealth: "Pillar health",
    initiativeHealth: "Initiatives",
    projectExecution: "Projects",
    kpiPerformance: "KPIs",
    riskEscalations: "Risks & escalations",
    governanceApprovals: "Governance & approvals",
    owner: "Owner",
    status: "Status",
    health: "Health",
    severity: "Severity",
    updated: "Updated",
    target: "Target",
    current: "Current",
    variance: "Variance",
    frequency: "Frequency",
    onTrack: "On track",
    atRisk: "At risk",
    offTrack: "Off track",
    planned: "Planned",
    active: "Active",
    completed: "Completed",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    profile: "Profile",
    users: "Users",
    signOut: "Sign out",
    demo: "Demo",
    executiveBrief: "Executive Brief",
    roleAdmin: "Admin",
    roleExecutive: "Executive",
    rolePMO: "PMO",
    roleManager: "Manager",
    roleEmployee: "Employee",
  },
  ar: {
    home: "نظرة عامة",
    strategy: "الاستراتيجية",
    projects: "المشاريع",
    kpis: "المؤشرات",
    risks: "المخاطر",
    dashboards: "لوحات المعلومات",
    approvals: "الموافقات",
    admin: "الإدارة",
    superAdmin: "الإدارة العليا",
    organizations: "المؤسسات",
    language: "English",
    overviewTitle: "نظرة عامة",
    overviewSubtitle: "ملخص تنفيذي لتنفيذ الاستراتيجية عبر الركائز والمبادرات والمشاريع والمؤشرات والمخاطر.",
    keyMetrics: "المؤشرات الرئيسية",
    needsAttention: "يتطلب متابعة",
    openRisks: "مخاطر مفتوحة",
    pendingApprovals: "موافقات معلّقة",
    kpisOverdue: "مؤشرات تحتاج تحديث",
    viewAll: "عرض الكل",
    executiveDashboards: "لوحات المعلومات",
    pillarHealth: "صحة الركائز",
    initiativeHealth: "المبادرات",
    projectExecution: "المشاريع",
    kpiPerformance: "المؤشرات",
    riskEscalations: "المخاطر والتصعيد",
    governanceApprovals: "الحوكمة والموافقات",
    owner: "المالك",
    status: "الحالة",
    health: "الصحة",
    severity: "الخطورة",
    updated: "آخر تحديث",
    target: "المستهدف",
    current: "الحالي",
    variance: "الانحراف",
    frequency: "الدورية",
    onTrack: "على المسار",
    atRisk: "معرّض للمخاطر",
    offTrack: "خارج المسار",
    planned: "مخطط",
    active: "نشط",
    completed: "مكتمل",
    pending: "معلّق",
    approved: "معتمد",
    rejected: "مرفوض",
    profile: "الملف الشخصي",
    users: "المستخدمون",
    signOut: "تسجيل الخروج",
    demo: "تجريبي",
    executiveBrief: "ملخص تنفيذي",
    roleAdmin: "مسؤول",
    roleExecutive: "تنفيذي",
    rolePMO: "PMO",
    roleManager: "مدير",
    roleEmployee: "موظف",
  },
};

export type TranslationKey = keyof typeof dictionary["en"];

function normalizeLocale(locale: string | undefined): Locale {
  return locale === "ar" ? "ar" : "en";
}

export function LocaleProvider({ children, locale }: { children: React.ReactNode; locale: string }) {
  const [activeLocale, setActiveLocale] = useState<Locale>(() => normalizeLocale(locale));

  useEffect(() => {
    setActiveLocale(normalizeLocale(locale));
  }, [locale]);

  const dir: "ltr" | "rtl" = activeLocale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = activeLocale;
      document.documentElement.dir = dir;
    }
  }, [activeLocale, dir]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale: activeLocale,
      dir,
      isArabic: activeLocale === "ar",
      t: (key) => dictionary[activeLocale][key],
      tr: (en, ar) => (activeLocale === "ar" ? ar : en),
    }),
    [activeLocale, dir],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}
