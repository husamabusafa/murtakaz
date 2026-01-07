"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import enMessages from "../../messages/en.json";
import arMessages from "../../messages/ar.json";
import { ActionValidationIssue } from "@/types/actions";

type Locale = "en" | "ar";

interface LocaleContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  isArabic: boolean;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  te: (error: string | null | undefined, issues?: ActionValidationIssue[] | null) => string | null;
  tr: (en: string, ar: string) => string;
  df: (en: string | null | undefined, ar: string | null | undefined) => string;
  nodeTypeLabel: (code?: string | null, fallback?: string) => string;
  kpiValueStatusLabel: (status?: string | null) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number | null | undefined, options?: Intl.NumberFormatOptions) => string;
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
      t: (key, params) => {
        let msg = dictionary[activeLocale][key] || key;
        if (params) {
          Object.entries(params).forEach(([k, v]) => {
            msg = msg.replace(`{${k}}`, String(v));
          });
        }
        return msg;
      },
      tr: (en, ar) => (activeLocale === "ar" ? ar : en),
      te: (error, issues) => {
        if (!error) return null;
        let msg = dictionary[activeLocale][error as TranslationKey] || error;

        if (issues && issues.length > 0) {
          const formatted = issues
            .map((i) => {
              const translatedMsg = dictionary[activeLocale][i.message as TranslationKey] || i.message;
              let finalMsg = translatedMsg;
              if (i.params) {
                Object.entries(i.params).forEach(([k, v]) => {
                  finalMsg = finalMsg.replace(`{${k}}`, String(v));
                });
              }
              const path = Array.isArray(i.path) ? i.path.join(".") : "";
              return path ? `${path}: ${finalMsg}` : finalMsg;
            })
            .join("\n");
          return `${msg}\n${formatted}`;
        }

        return msg;
      },
      df: (en, ar) => {
        if (activeLocale === "ar") return ar || en || "";
        return en || ar || "";
      },
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
      formatDate: (date, options) => {
        const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
        return new Intl.DateTimeFormat(activeLocale, options ?? { dateStyle: "medium" }).format(d);
      },
      formatNumber: (value, options) => {
        if (typeof value !== "number" || !Number.isFinite(value)) return "—";
        return new Intl.NumberFormat(activeLocale, options).format(value);
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
