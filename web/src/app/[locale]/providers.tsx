"use client";

import { LocaleProvider } from "@/providers/locale-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider } from "@/providers/theme-provider";

export function Providers({ children, locale }: { children: React.ReactNode; locale: string }) {
  return (
    <ThemeProvider>
      <LocaleProvider locale={locale}>
        <AuthProvider>{children}</AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
