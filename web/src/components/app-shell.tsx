"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { UserMenu } from "@/components/user-menu";
import { useAuth } from "@/providers/auth-provider";
import { type TranslationKey, useLocale } from "@/providers/locale-provider";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/overview", key: "home", icon: "tabler:layout-dashboard" },
  { href: "/strategy", key: "strategy", icon: "tabler:target-arrow" },
  { href: "/projects", key: "projects", icon: "tabler:timeline" },
  { href: "/kpis", key: "kpis", icon: "tabler:chart-line" },
  { href: "/risks", key: "risks", icon: "tabler:shield-exclamation" },
  { href: "/dashboards", key: "dashboards", icon: "tabler:layout-dashboard" },
  { href: "/approvals", key: "approvals", icon: "tabler:gavel" },
  { href: "/admin", key: "admin", icon: "tabler:settings" },
] as const;

function stripLocale(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "en" || segments[0] === "ar") {
    return `/${segments.slice(1).join("/")}`;
  }
  return pathname;
}

function withLocale(locale: string, href: string) {
  return `/${locale}${href}`;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, tr, locale, isArabic } = useLocale();
  const { user, loading } = useAuth();
  const canonicalPath = useMemo(() => stripLocale(pathname ?? "/"), [pathname]);
  const isAuthRoute = canonicalPath.startsWith("/auth/");
  const isMarketingRoute =
    canonicalPath === "/" ||
    canonicalPath === "/pricing" ||
    canonicalPath === "/faq" ||
    canonicalPath === "/about" ||
    canonicalPath === "/contact" ||
    canonicalPath === "/careers" ||
    canonicalPath === "/privacy" ||
    canonicalPath === "/terms";
  const showAppNav = !isAuthRoute && !isMarketingRoute && !loading && Boolean(user);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) return;
    if (isAuthRoute || isMarketingRoute) return;

    const nextParam = encodeURIComponent(pathname ?? withLocale(locale, "/overview"));
    router.replace(withLocale(locale, `/auth/login?next=${nextParam}`));
  }, [isAuthRoute, isMarketingRoute, loading, locale, pathname, router, user]);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("sidebar_collapsed") : null;
    setSidebarCollapsed(stored === "true");
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sidebar_collapsed", String(sidebarCollapsed));
    }
  }, [sidebarCollapsed]);

  const activeKey = useMemo(
    () =>
      navItems.find((item) =>
        item.href === "/overview" ? canonicalPath === "/overview" : canonicalPath.startsWith(item.href),
      )?.key,
    [canonicalPath],
  );

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.14),transparent_35%),radial-gradient(circle_at_20%_40%,_rgba(16,185,129,0.12),transparent_25%)] pointer-events-none" />

      <div className="relative flex min-h-screen">
        {showAppNav ? (
          <aside
            className={cn(
              "hidden lg:flex lg:flex-col lg:border-r lg:border-white/10 lg:bg-slate-950/60 lg:backdrop-blur-xl",
              sidebarCollapsed ? "lg:w-20" : "lg:w-72",
            )}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-4">
              <Link href={`/${locale}/overview`} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-emerald-400 to-sky-500 text-white shadow-lg shadow-indigo-500/25">
                  <span className="text-lg font-semibold">SE</span>
                </div>
                {sidebarCollapsed ? null : (
                  <div className="leading-tight">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Strategy Execution</p>
                    <p className="text-sm font-semibold text-white">Command Center</p>
                  </div>
                )}
              </Link>

              <Button
                variant="ghost"
                className="h-9 w-9 px-0 text-slate-200 hover:bg-white/5 hover:text-white"
                onClick={() => setSidebarCollapsed((prev) => !prev)}
              >
                <Icon name={sidebarCollapsed ? "tabler:layout-sidebar-right-collapse" : "tabler:layout-sidebar-left-collapse"} />
              </Button>
            </div>

            <nav className="flex-1 px-3">
              <div className="space-y-1">
                {navItems.map((item) => {
                  const isActive = activeKey === item.key;
                  return (
                    <Link
                      key={item.key}
                      href={withLocale(locale, item.href)}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                        isActive ? "bg-white/10 text-white" : "text-slate-200 hover:bg-white/5 hover:text-white",
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-slate-950/40">
                        <Icon name={item.icon} className="h-4 w-4" />
                      </span>
                      {sidebarCollapsed ? null : <span>{t(item.key as TranslationKey)}</span>}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="mt-auto border-t border-white/10 p-4">
              <div className={cn("flex items-center gap-3", sidebarCollapsed && "justify-center")}>
                <UserMenu />
                {sidebarCollapsed ? null : (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
                    <p className="truncate text-xs text-slate-300">{user?.role}</p>
                  </div>
                )}
              </div>
              <div className={cn("mt-3 flex items-center gap-2", sidebarCollapsed ? "justify-center" : "justify-between")}>
                <LanguageToggle />
                {sidebarCollapsed ? null : (
                  <Button variant="secondary" className="bg-white text-slate-900 hover:bg-slate-100">
                    {t("executiveBrief")}
                  </Button>
                )}
              </div>
            </div>
          </aside>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 lg:max-w-none">
              {isMarketingRoute ? (
                <div className="flex items-center gap-6">
                  <Link href={`/${locale}`} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-emerald-400 to-sky-500 text-white shadow-lg shadow-indigo-500/25">
                      <span className="text-lg font-semibold">M</span>
                    </div>
                    <div className={cn("leading-tight", isArabic && "text-right")}>
                      <p className="text-sm font-semibold text-white">{tr("Murtakaz", "مرتكز")}</p>
                      <p className="text-xs text-slate-300">{tr("Strategy execution platform", "منصة تنفيذ الاستراتيجية")}</p>
                    </div>
                  </Link>

                  <nav
                    className={cn(
                      "hidden items-center gap-5 text-sm text-slate-200 lg:flex",
                      isArabic && "flex-row-reverse",
                    )}
                  >
                    <Link href={`/${locale}#features`} className="hover:text-white">
                      {tr("Features", "الميزات")}
                    </Link>
                    <Link href={`/${locale}/pricing`} className="hover:text-white">
                      {tr("Pricing", "الأسعار")}
                    </Link>
                    <Link href={`/${locale}/faq`} className="hover:text-white">
                      {tr("FAQ", "الأسئلة الشائعة")}
                    </Link>
                    <Link href={`/${locale}/contact`} className="hover:text-white">
                      {tr("Contact", "تواصل معنا")}
                    </Link>
                  </nav>
                </div>
              ) : (
                <Link href={`/${locale}`} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-emerald-400 to-sky-500 text-white shadow-lg shadow-indigo-500/25">
                    <span className="text-lg font-semibold">SE</span>
                  </div>
                  <div className="leading-tight">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Strategy Execution</p>
                    <p className="text-sm font-semibold text-white">Performance Command Center</p>
                  </div>
                </Link>
              )}

              <div className="flex items-center gap-3">
                <LanguageToggle />
                {isAuthRoute ? null : showAppNav ? null : loading ? null : user ? (
                  <>
                    <Button asChild variant="secondary" className="bg-white text-slate-900 hover:bg-slate-100">
                      <Link href={`/${locale}/overview`}>{tr("Workspace", "مساحة العمل")}</Link>
                    </Button>
                    <UserMenu />
                  </>
                ) : isMarketingRoute ? (
                  <>
                    <Button
                      asChild
                      variant="outline"
                      className="hidden border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white sm:inline-flex"
                    >
                      <Link href={`/${locale}/contact`}>{tr("Request demo", "اطلب عرضًا توضيحيًا")}</Link>
                    </Button>
                    <Button asChild variant="secondary" className="bg-white text-slate-900 hover:bg-slate-100">
                      <Link href={withLocale(locale, "/auth/login")}>{tr("Sign in", "تسجيل الدخول")}</Link>
                    </Button>
                  </>
                ) : (
                  <Button asChild variant="secondary" className="bg-white text-slate-900 hover:bg-slate-100">
                    <Link href={withLocale(locale, "/auth/login")}>{tr("Sign in", "تسجيل الدخول")}</Link>
                  </Button>
                )}
                {showAppNav ? <div className="lg:hidden"><UserMenu /></div> : null}
              </div>
            </div>
          </header>

          <main className="relative mx-auto grid w-full max-w-7xl gap-6 px-6 pb-12 pt-8 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
