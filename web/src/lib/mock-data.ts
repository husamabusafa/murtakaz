import type { Health, Status } from "@/lib/types";
import { buildSeedModel } from "@/lib/seed-adapter";

export const healthPalette: Record<Health, { label: string; tone: string }> = {
  GREEN: { label: "On Track", tone: "text-emerald-600" },
  AMBER: { label: "At Risk", tone: "text-amber-600" },
  RED: { label: "Off Track", tone: "text-rose-600" },
};

export const statusPalette: Record<Status, { label: string; tone: string }> = {
  PLANNED: { label: "Planned", tone: "text-slate-600" },
  ACTIVE: { label: "Active", tone: "text-emerald-700" },
  AT_RISK: { label: "At Risk", tone: "text-amber-700" },
  COMPLETED: { label: "Completed", tone: "text-indigo-700" },
};

const model = buildSeedModel();

export const pillars = model.pillars;
export const kpis = model.kpis;
export const changeRequests = model.changeRequests;
export const summaryStats = model.summaryStats;

