"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { getMyOrganizationEntityTypes } from "@/actions/navigation";
import { useAuth } from "@/providers/auth-provider";
import { type TranslationKey, useLocale } from "@/providers/locale-provider";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

const marketingRouteSet = new Set(["/", "/pricing", "/faq", "/about", "/contact", "/careers", "/privacy", "/terms"]);

const entityTypeIconMap: Record<string, string> = {
  pillar: "tabler:columns-3",
  objective: "tabler:flag-3",
  department: "tabler:building-bank",
  initiative: "tabler:rocket",
  project: "tabler:briefcase-2",
  task: "tabler:checklist",
  kpi: "tabler:chart-line",
};

const entityTypeLabelMap: Partial<Record<string, TranslationKey>> = {
  pillar: "pillar",
  objective: "objective",
  departments: "departments",
  initiative: "initiative",
  project: "project",
  task: "task",
  kpis: "kpis",
};

const navItems = [
  { href: "/overview", key: "home", icon: "tabler:layout-dashboard" },
  { href: "/pillars", key: "pillar", icon: "tabler:layers-subtract" },
  { href: "/objectives", key: "objective", icon: "tabler:flag-3" },
  { href: "/dashboards", key: "dashboards", icon: "tabler:layout-dashboard" },
  { href: "/responsibilities", key: "responsibilities", icon: "tabler:user-check" },
  { href: "/approvals", key: "approvals", icon: "tabler:gavel" },
  { href: "/organization", key: "organization", icon: "tabler:building" },
  { href: "/users", key: "users", icon: "tabler:users" },
  { href: "/departments", key: "departments", icon: "tabler:building-bank" },
  { href: "/super-admin", key: "superAdminOverview", icon: "tabler:home" },
  { href: "/super-admin/organizations", key: "organizations", icon: "tabler:building-community" },
  { href: "/super-admin/users", key: "users", icon: "tabler:users" },
] as const;

type StaticNavItem = (typeof navItems)[number];

type DynamicNavItem = {
  href: string;
  key: string;
  icon: string;
  label: string;
};

type NavItem = StaticNavItem | DynamicNavItem;

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

function getAppHomeHref(userRole: unknown) {
  return userRole === "SUPER_ADMIN" ? "/super-admin" : "/overview";
}

function LogoMark({ text }: { text: string }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-emerald-400 to-sky-500 shadow-sm">
      <span className="text-lg font-semibold">{text}</span>
    </div>
  );
}

function NavItemLink({
  item,
  href,
  isActive,
  isMobile,
  mobileContentVisible,
  sidebarExpanded,
  sidebarContentVisible,
  t,
}: {
  item: NavItem;
  href: string;
  isActive: boolean;
  isMobile: boolean;
  mobileContentVisible: boolean;
  sidebarExpanded: boolean;
  sidebarContentVisible: boolean;
  t: (key: TranslationKey) => string;
}) {
  const label = "label" in item ? item.label : t(item.key as TranslationKey);

  if (isMobile) {
    return (
      <Link
        href={href}
        className={cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
          isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
        aria-current={isActive ? "page" : undefined}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background/50">
          <Icon name={item.icon} className="h-4 w-4" />
        </span>
        <span
          className={cn(
            "whitespace-nowrap transition-all duration-200",
            mobileContentVisible ? "opacity-100 translate-x-0" : "opacity-0 ltr:translate-x-2 rtl:-translate-x-2",
          )}
        >
          {label}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center rounded-xl py-2 text-sm font-medium transition-colors",
        sidebarExpanded ? "gap-3 px-3" : "justify-center px-2",
        isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
      aria-current={isActive ? "page" : undefined}
      title={!sidebarExpanded ? label : undefined}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background/50">
        <Icon name={item.icon} className="h-4 w-4" />
      </span>
      <span
        className={cn(
          "overflow-hidden whitespace-nowrap transition-all duration-300 motion-reduce:transition-none",
          sidebarExpanded ? "max-w-[220px]" : "max-w-0",
          sidebarContentVisible ? "opacity-100 translate-x-0" : "opacity-0 ltr:-translate-x-2 rtl:translate-x-2",
        )}
      >
        {label}
      </span>
    </Link>
  );
}

function useDelayedVisibility(isOpen: boolean, delayMs = 160) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setVisible(false);
      return;
    }
    const id = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(id);
  }, [delayMs, isOpen]);

  return visible;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale } = useLocale();
  const { user, loading } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (user as any)?.role;
  const profileHref = userRole === "SUPER_ADMIN" ? withLocale(locale, "/super-admin/profile") : withLocale(locale, "/profile");
  const userInitials = useMemo(() => {
    const name = user?.name?.trim() ?? "";
    if (!name) return "—";
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }, [user?.name]);
  const canonicalPath = useMemo(() => stripLocale(pathname ?? "/"), [pathname]);
  const isAuthRoute = canonicalPath.startsWith("/auth/");
  const isMarketingRoute = marketingRouteSet.has(canonicalPath);
  const showAppNav = !isAuthRoute && !isMarketingRoute && !loading && Boolean(user);

  const [mounted, setMounted] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (user) return;
    if (isAuthRoute || isMarketingRoute) return;

    const nextParam = encodeURIComponent(pathname ?? withLocale(locale, getAppHomeHref(userRole)));
    router.replace(withLocale(locale, `/auth/login?next=${nextParam}`));
  }, [isAuthRoute, isMarketingRoute, loading, locale, pathname, router, user, userRole]);

  useEffect(() => {
    if (!showAppNav) return;
    if (userRole !== "SUPER_ADMIN") return;
    if (canonicalPath.startsWith("/super-admin")) return;
    router.replace(withLocale(locale, "/super-admin"));
  }, [canonicalPath, locale, router, showAppNav, userRole]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [canonicalPath]);

  useEffect(() => {
    setSidebarPinned(false);
    setSidebarHovered(false);
  }, [userRole]);

  const sidebarExpanded = showAppNav && (sidebarPinned || sidebarHovered);
  const sidebarContentVisible = useDelayedVisibility(sidebarExpanded, 160);
  const sidebarFooterVisible = useDelayedVisibility(sidebarExpanded, 220);
  const mobileContentVisible = useDelayedVisibility(mobileNavOpen, 120);

  const activeKey = useMemo(() => {
    if (canonicalPath.startsWith("/entities/")) {
      const slug = canonicalPath.split("/").filter(Boolean)[1];
      return slug ? `entities-${slug}` : "entities";
    }
    const matches = navItems.filter((item) => {
      if (item.href === "/overview") return canonicalPath === "/overview";
      return canonicalPath.startsWith(item.href);
    });

    matches.sort((a, b) => b.href.length - a.href.length);
    return matches[0]?.key;
  }, [canonicalPath]);

  const [orgEntityTypes, setOrgEntityTypes] = useState<Array<{ code: string; name: string; nameAr: string | null; sortOrder: number }>>([]);

  useEffect(() => {
    if (!showAppNav) return;
    if (!user) return;
    if (userRole === "SUPER_ADMIN") return;

    void (async () => {
      try {
        const types = await getMyOrganizationEntityTypes();
        setOrgEntityTypes(
          (types as Array<{ code: string; name: string; nameAr: string | null; sortOrder: number }>).map((t) => ({
            code: String(t.code),
            name: String(t.name),
            nameAr: t.nameAr ? String(t.nameAr) : null,
            sortOrder: Number(t.sortOrder ?? 0),
          })),
        );
      } catch {
        setOrgEntityTypes([]);
      }
    })();
  }, [showAppNav, user, userRole]);

  const regularNavItems = useMemo<NavItem[]>(() => {
    const baseItems = navItems
      .filter((item) => !item.href.startsWith("/super-admin"))
      .filter((item) => !["/pillars", "/objectives", "/departments"].includes(item.href))
      .filter((item) => {
        // Hide admin-only pages for non-admin users
        const isAdminOnlyPage = ["/organization", "/users"].includes(item.href);
        if (isAdminOnlyPage && userRole !== "ADMIN") {
          return false;
        }
        return true;
      });

    const entityTypeItems: DynamicNavItem[] = orgEntityTypes
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((et) => {
        const code = String(et.code).trim();
        const hrefSlug = code;
        const keySlug = code;

        const lower = code.toLowerCase();
        const icon = entityTypeIconMap[lower] ?? "tabler:layers-subtract";

        const labelFromDb = locale === "ar" ? et.nameAr ?? et.name : et.name;
        const labelKey = entityTypeLabelMap[lower];

        return {
          href: `/entities/${hrefSlug}`,
          key: `entities-${keySlug}`,
          icon,
          label: labelKey ? t(labelKey) : labelFromDb,
        };
      });

    const overview = baseItems.find((item) => item.href === "/overview");
    const rest = baseItems.filter((item) => item.href !== "/overview");
    return overview ? [overview, ...entityTypeItems, ...rest] : [...entityTypeItems, ...baseItems];
  }, [locale, orgEntityTypes, t, userRole]);

  const visibleNavItems = useMemo(() => {
    if (userRole === "SUPER_ADMIN") {
      return navItems.filter((item) => item.href.startsWith("/super-admin"));
    }

    return regularNavItems;
  }, [regularNavItems, userRole]);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 pointer-events-none dark:bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.14),transparent_35%),radial-gradient(circle_at_20%_40%,_rgba(16,185,129,0.12),transparent_25%)]" />

      <div className={cn("relative flex min-h-screen")}>
        {mounted && showAppNav ? (
          <div className={cn("fixed inset-0 z-[60] lg:hidden", mobileNavOpen ? "pointer-events-auto" : "pointer-events-none")}>
            <div
              className={cn(
                "absolute inset-0 bg-black/40 transition-opacity duration-200",
                mobileNavOpen ? "opacity-100" : "opacity-0",
              )}
              onClick={() => setMobileNavOpen(false)}
            />

            <div
              className={cn(
                "absolute inset-y-0 w-80 max-w-[85vw] bg-background shadow-2xl transition-transform duration-300 ease-in-out",
                "start-0 border-e border-border",
                mobileNavOpen ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full",
              )}
            >
              <div className="flex items-center justify-between gap-3 px-4 py-4">
                <Link
                  href={withLocale(locale, getAppHomeHref(userRole))}
                  className="flex items-center gap-3"
                >
                  <LogoMark text="SE" />
                  <div className="leading-tight">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{t("appTitle")}</p>
                    <p className="text-sm font-semibold text-foreground">{t("appShortTitle")}</p>
                  </div>
                </Link>

                <Button
                  variant="ghost"
                  className="h-9 w-9 px-0 text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => setMobileNavOpen(false)}
                >
                  <Icon name="tabler:x" />
                </Button>
              </div>

              <nav className="px-3">
                <div className="space-y-1">
                  {visibleNavItems.map((item) => {
                    const isActive = activeKey === item.key;
                    return (
                      <NavItemLink
                        key={item.href}
                        item={item}
                        href={withLocale(locale, item.href)}
                        isActive={isActive}
                        isMobile
                        mobileContentVisible={mobileContentVisible}
                        sidebarExpanded={sidebarExpanded}
                        sidebarContentVisible={sidebarContentVisible}
                        t={t}
                      />
                    );
                  })}
                </div>
              </nav>

              <div className="mt-auto border-t border-border p-4">
                <Link
                  href={profileHref}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-accent"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/50 text-xs font-semibold text-foreground">
                    {userInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{user?.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{userRole}</p>
                  </div>
                </Link>
                <div className="mt-3 flex items-center justify-between">
                  <div
                    className={cn(
                      "flex items-center gap-1 transition-all duration-200",
                      mobileContentVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2",
                    )}
                  >
                    <ThemeToggle />
                    <LanguageToggle />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {showAppNav ? <div className="hidden lg:block lg:w-20 lg:shrink-0" /> : null}

        {showAppNav ? (
          <aside
            onMouseEnter={() => setSidebarHovered(true)}
            onMouseLeave={() => setSidebarHovered(false)}
            className={cn(
              "hidden lg:flex lg:flex-col lg:border-e lg:border-border lg:bg-card/80 lg:backdrop-blur-xl",
              "fixed top-0 z-[60] h-screen",
              "start-0",
              "transition-[width] duration-300 ease-in-out motion-reduce:transition-none",
              sidebarExpanded ? "w-72 shadow-2xl" : "w-20",
            )}
          >
            <div className={cn("flex items-center gap-3 px-4 py-4", sidebarExpanded ? "justify-between" : "justify-center")}> 
              <Link
                href={withLocale(locale, getAppHomeHref(userRole))}
                className={cn("flex items-center gap-3", !sidebarExpanded && "justify-center")}
              >
                <LogoMark text="SE" />
                <div
                  className={cn(
                    "leading-tight overflow-hidden transition-all duration-300 motion-reduce:transition-none",
                    sidebarExpanded ? "max-w-[220px]" : "max-w-0",
                    sidebarContentVisible ? "opacity-100 translate-x-0" : "opacity-0 ltr:-translate-x-2 rtl:translate-x-2",
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">{t("appShortTitle")}</p>
                </div>
              </Link>

              {sidebarExpanded ? (
                <Button
                  variant="ghost"
                  className="h-9 w-9 px-0 text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => setSidebarPinned((prev) => !prev)}
                  aria-label={sidebarPinned ? t("unpinSidebar") : t("pinSidebar")}
                >
                  <Icon name={sidebarPinned ? "tabler:pin-filled" : "tabler:pin"} />
                </Button>
              ) : null}
            </div>

            <nav className="flex-1 px-3 pb-3 overflow-y-auto">
              <div className="space-y-1">
                {visibleNavItems.map((item) => {
                    const isActive = activeKey === item.key;
                    return (
                      <NavItemLink
                        key={item.href}
                        item={item}
                        href={withLocale(locale, item.href)}
                        isActive={isActive}
                        isMobile={false}
                        mobileContentVisible={mobileContentVisible}
                        sidebarExpanded={sidebarExpanded}
                        sidebarContentVisible={sidebarContentVisible}
                        t={t}
                      />
                    );
                })}
              </div>
            </nav>

            <div className="mt-auto border-t border-border p-4">
              <Link
                href={profileHref}
                className={cn(
                  "flex items-center rounded-xl transition hover:bg-accent",
                  sidebarExpanded ? "gap-3 px-2 py-2" : "justify-center p-2",
                )}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/50 text-xs font-semibold text-foreground">
                  {userInitials}
                </div>
                <div
                  className={cn(
                    "min-w-0 overflow-hidden transition-all duration-300 motion-reduce:transition-none",
                    sidebarExpanded ? "max-w-[240px] mx-2" : "max-w-0",
                    sidebarFooterVisible ? "opacity-100 translate-x-0" : "opacity-0 ltr:-translate-x-2 rtl:translate-x-2",
                  )}
                >
                  <p className="truncate text-sm font-semibold text-foreground">{user?.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{userRole}</p>
                </div>
              </Link>
              <div
                className={cn(
                  " overflow-hidden transition-all duration-300 motion-reduce:transition-none",
                  sidebarExpanded ? "max-h-24 mt-3" : "max-h-0",
                  sidebarFooterVisible ? "opacity-100" : "opacity-0",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <ThemeToggle />
                    <LanguageToggle />
                  </div>
                </div>
              </div>
            </div>
          </aside>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 lg:max-w-none">
              {isMarketingRoute ? (
                <div className="flex items-center gap-6">
                  <Link href={`/${locale}`} className="flex items-center gap-3">
                    <LogoMark text="M" />
                    <div className={cn("leading-tight")}>
                      <p className="text-sm font-semibold text-foreground">{t("murtakaz")}</p>
                      <p className="text-xs text-muted-foreground">{t("strategyExecutionPlatform")}</p>
                    </div>
                  </Link>

                  <nav
                    className={cn(
                      "hidden items-center gap-5 text-sm text-muted-foreground lg:flex",
                    )}
                  >
                    <Link href={`/${locale}#features`} className="hover:text-foreground">
                      {t("features")}
                    </Link>
                    <Link href={`/${locale}/pricing`} className="hover:text-foreground">
                      {t("pricing")}
                    </Link>
                    <Link href={`/${locale}/faq`} className="hover:text-foreground">
                      {t("faq")}
                    </Link>
                    <Link href={`/${locale}/contact`} className="hover:text-foreground">
                      {t("contact")}
                    </Link>
                  </nav>
                </div>
              ) : (
                <Link href={`/${locale}`} className="flex items-center gap-3">
                  <LogoMark text="SE" />
                  <div className="leading-tight">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{t("appTitle")}</p>
                    <p className="text-sm font-semibold text-foreground">{t("appTagline")}</p>
                  </div>
                </Link>
              )}

              <div className="flex items-center gap-3">
                {showAppNav ? (
                  <Button
                    variant="ghost"
                    className="lg:hidden h-9 w-9 px-0 text-muted-foreground hover:bg-accent hover:text-foreground"
                    onClick={() => setMobileNavOpen(true)}
                  >
                    <Icon name="tabler:menu-2" />
                  </Button>
                ) : null}
                {showAppNav ? null : <LanguageToggle />}
                {isAuthRoute ? null : showAppNav ? null : loading ? null : user ? (
                  <>
                    <Button asChild variant="secondary">
                      <Link href={`/${locale}/overview`}>{t("workspace")}</Link>
                    </Button>
                  </>
                ) : isMarketingRoute ? (
                  <>
                    <Button
                      asChild
                      variant="outline"
                      className="hidden sm:inline-flex"
                    >
                      <Link href={`/${locale}/contact`}>{t("requestDemo")}</Link>
                    </Button>
                    <Button asChild variant="secondary">
                      <Link href={withLocale(locale, "/auth/login")}>{t("signIn")}</Link>
                    </Button>
                  </>
                ) : (
                  <Button asChild variant="secondary">
                    <Link href={withLocale(locale, "/auth/login")}>{t("signIn")}</Link>
                  </Button>
                )}
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
