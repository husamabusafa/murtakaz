"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/auth-provider";
import { type TranslationKey, useLocale } from "@/providers/locale-provider";

function roleLabel(role: string, t: (key: TranslationKey) => string) {
  if (role === "ADMIN") return t("roleAdmin");
  if (role === "EXECUTIVE") return t("roleExecutive");
  if (role === "PMO") return t("rolePMO");
  if (role === "MANAGER") return t("roleManager");
  if (role === "EMPLOYEE") return t("roleEmployee");
  return role;
}

function departmentLabel(department: string, t: (key: TranslationKey) => string) {
  const map: Record<string, TranslationKey> = {
    IT: "deptIT",
    Investment: "deptInvestment",
    Finance: "deptFinance",
    Executive: "deptExecutive",
    "Strategy & Excellence": "deptStrategyExcellence",
    "Internal Audit & Risk": "deptInternalAuditRisk",
    HR: "deptHR",
    "Marketing & Corp Comm": "deptMarketingCorpComm",
    Delivery: "deptDelivery",
  };
  const key = map[department];
  return key ? t(key) : department;
}

export function UserMenu() {
  const { user, signOut } = useAuth();
  const { locale, dir, t } = useLocale();

  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (user as any)?.role as string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userDepartment = (user as any)?.department as string | undefined;

  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2">
        <Avatar className="h-9 w-9 border border-border bg-card/50">
          <AvatarFallback className="bg-muted/30 text-xs font-semibold text-foreground">{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={dir === "rtl" ? "start" : "end"} className="w-64 border-border bg-popover text-foreground">
        <DropdownMenuLabel className="space-y-1">
          <p className="text-sm font-semibold">{user.name}</p>
          <p className="text-xs font-normal text-muted-foreground">
            {roleLabel(userRole ?? "", t)}
            {userDepartment ? ` • ${departmentLabel(userDepartment, t)}` : ""}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-muted/30" />
        <DropdownMenuItem asChild className="focus:bg-muted/30 focus:text-foreground">
          <Link href={`/${locale}/profile`}>{t("profile")}</Link>
        </DropdownMenuItem>
        {userRole === "ADMIN" ? (
          <DropdownMenuItem asChild className="focus:bg-muted/30 focus:text-foreground">
            <Link href={`/${locale}/admin`}>{t("admin")}</Link>
          </DropdownMenuItem>
        ) : null}
        {userRole === "SUPER_ADMIN" ? (
          <DropdownMenuItem asChild className="focus:bg-muted/30 focus:text-foreground">
            <Link href={`/${locale}/super-admin`}>{t("superAdmin")}</Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator className="bg-muted/30" />
        <DropdownMenuItem className="focus:bg-muted/30 focus:text-foreground" onClick={() => void signOut()}>
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
