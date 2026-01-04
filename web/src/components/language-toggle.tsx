"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";

function switchLocaleInPath(pathname: string, nextLocale: "en" | "ar") {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return `/${nextLocale}`;
  if (segments[0] === "en" || segments[0] === "ar") {
    segments[0] = nextLocale;
    return `/${segments.join("/")}`;
  }
  return `/${nextLocale}/${segments.join("/")}`;
}

export function LanguageToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, t } = useLocale();
  const nextLocale = locale === "en" ? "ar" : "en";

  return (
    <Button
      variant="ghost"
      className="text-muted-foreground hover:bg-accent hover:text-foreground"
      onClick={() => router.push(switchLocaleInPath(pathname ?? "/", nextLocale))}
    >
      {t("language")}
    </Button>
  );
}

