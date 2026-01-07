"use client";

import { Badge } from "@/components/ui/badge";
import type { Health, Status } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/locale-provider";

const healthStyles: Record<Health, string> = {
  GREEN: "bg-emerald-500/15 text-emerald-100 border-emerald-500/25",
  AMBER: "bg-amber-500/15 text-amber-100 border-amber-500/25",
  RED: "bg-rose-500/15 text-rose-100 border-rose-500/25",
};

export function RagBadge({ health, className }: { health: Health; className?: string }) {
  const { t } = useLocale();
  const label = health === "GREEN" ? t("onTrack") : health === "AMBER" ? t("atRisk") : t("offTrack");
  return (
    <Badge variant="outline" className={cn("border px-2.5 py-1 text-xs font-semibold", healthStyles[health], className)}>
      {label}
    </Badge>
  );
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const { t } = useLocale();
  const label = status === "PLANNED" ? t("planned") : status === "ACTIVE" ? t("active") : status === "AT_RISK" ? t("atRisk") : t("completed");
  return (
    <Badge variant="outline" className={cn("border border-border bg-card/50 text-xs text-foreground", className)}>
      {label}
    </Badge>
  );
}

export function ApprovalBadge({
  status,
  className,
}: {
  status: "PENDING" | "APPROVED" | "REJECTED";
  className?: string;
}) {
  const { t } = useLocale();
  const styles =
    status === "PENDING"
      ? "border-amber-500/25 bg-amber-500/15 text-amber-100"
      : status === "APPROVED"
        ? "border-emerald-500/25 bg-emerald-500/15 text-emerald-100"
        : "border-rose-500/25 bg-rose-500/15 text-rose-100";

  return (
    <Badge variant="outline" className={cn("border px-2.5 py-1 text-xs font-semibold", styles, className)}>
      {status === "PENDING" ? t("pending") : status === "APPROVED" ? t("approved") : t("rejected")}
    </Badge>
  );
}
