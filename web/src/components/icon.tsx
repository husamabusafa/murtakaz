"use client";

import { Icon as IconifyIcon } from "@iconify/react";
import { cn } from "@/lib/utils";

export function Icon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return <IconifyIcon icon={name} className={cn("h-5 w-5", className)} />;
}

