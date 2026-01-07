"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import enMessages from "../../messages/en.json";
import arMessages from "../../messages/ar.json";

type Locale = "en" | "ar";

interface LocaleContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  isArabic: boolean;
  t: (key: TranslationKey) => string;
  tr: (en: string, ar: string) => string;
  nodeTypeLabel: (code?: string | null, fallback?: string) => string;
  kpiValueStatusLabel: (status?: string | null) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const dictionary = {
  en: enMessages,
  ar: arMessages,
} as const;

export type TranslationKey = keyof typeof enMessages;

const nodeTypeKeyMap: Partial<Record<string, TranslationKey>> = {
  strategy: "strategy",
  pillar: "pillar",
  objective: "objective",
  initiative: "initiative",
  project: "project",
  task: "task",
};

const kpiStatusKeyMap: Partial<Record<string, TranslationKey>> = {
  NO_DATA: "statusNoData",
  DRAFT: "statusDraft",
  SUBMITTED: "statusSubmitted",
  APPROVED: "statusApproved",
  LOCKED: "statusLocked",
  REJECTED: "statusRejected",
};

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
      nodeTypeLabel: (code, fallback) => {
        const key = code ? nodeTypeKeyMap[code.toLowerCase()] : undefined;
        if (key) return dictionary[activeLocale][key];
        return fallback ?? code ?? "";
      },
      kpiValueStatusLabel: (status) => {
        const key = status ? kpiStatusKeyMap[status.toUpperCase()] : undefined;
        if (key) return dictionary[activeLocale][key];
        return status ?? "—";
      },
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
