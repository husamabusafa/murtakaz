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
        <Avatar className="h-9 w-9 border border-white/10 bg-white/5">
          <AvatarFallback className="bg-white/10 text-xs font-semibold text-white">{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={dir === "rtl" ? "start" : "end"} className="w-64 border-white/10 bg-slate-950 text-white">
        <DropdownMenuLabel className="space-y-1">
          <p className="text-sm font-semibold">{user.name}</p>
          <p className="text-xs font-normal text-slate-300">
            {roleLabel(userRole ?? "", t)}
            {userDepartment ? ` • ${departmentLabel(userDepartment, t)}` : ""}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white">
          <Link href={`/${locale}/profile`}>{t("profile")}</Link>
        </DropdownMenuItem>
        {userRole === "ADMIN" ? (
          <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white">
            <Link href={`/${locale}/admin`}>{t("admin")}</Link>
          </DropdownMenuItem>
        ) : null}
        {userRole === "SUPER_ADMIN" ? (
          <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white">
            <Link href={`/${locale}/super-admin`}>{t("superAdmin")}</Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem className="focus:bg-white/10 focus:text-white" onClick={() => void signOut()}>
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
