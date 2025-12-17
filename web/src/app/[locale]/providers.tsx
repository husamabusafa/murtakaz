"use client";

import { LocaleProvider } from "@/providers/locale-provider";
import { AuthProvider } from "@/providers/auth-provider";

export function Providers({ children, locale }: { children: React.ReactNode; locale: string }) {
  return (
    <LocaleProvider locale={locale}>
      <AuthProvider>{children}</AuthProvider>
    </LocaleProvider>
  );
}
