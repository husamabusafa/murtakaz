"use client";

import type React from "react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/locale-provider";

export function PageHeader({
  title,
  subtitle,
  actions,
  icon,
  className,
}: {
  title: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  const { dir } = useLocale();
  const isRtl = dir === "rtl";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 md:justify-between",
        isRtl ? "items-end md:flex-row-reverse" : "items-start md:flex-row",
        className,
      )}
    >
      <div className={cn("space-y-1", isRtl ? "text-right" : "text-left")}>
        <div className={cn("flex items-center gap-3", isRtl && "flex-row-reverse")}>
          {icon ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card text-foreground">
              {icon}
            </div>
          ) : null}
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
        </div>
        {subtitle ? <p className="max-w-2xl text-sm text-muted-foreground md:text-base">{subtitle}</p> : null}
      </div>
      {actions ? <div className={cn("flex items-center gap-2", isRtl && "justify-end")}>{actions}</div> : null}
    </div>
  );
}
