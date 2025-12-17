"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ChangeRequest,
  Initiative as BaseInitiative,
  KPI as BaseKPI,
  Pillar as BasePillar,
  Project as BaseProject,
  Risk as BaseRisk,
} from "@/lib/types";
import { changeRequests as baseChangeRequests, kpis as baseKpis, pillars as basePillars } from "@/lib/mock-data";

type StoredValue<T> = {
  value: T;
  updatedAt: string;
};

function readJson<T>(key: string): StoredValue<T> | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredValue<T>;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  const payload: StoredValue<T> = { value, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(key, JSON.stringify(payload));
  window.dispatchEvent(new Event("murtakaz-storage"));
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

export type RiskStatus = "PLANNED" | "ACTIVE" | "AT_RISK" | "COMPLETED";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type RiskMitigationStep = {
  id: string;
  text: string;
  owner?: string;
  due?: string;
  done?: boolean;
};

export type RiskNote = {
  id: string;
  at: string;
  author: string;
  message: string;
};

export type PrototypeRisk = BaseRisk & {
  mitigation: RiskMitigationStep[];
  notes: RiskNote[];
};

export type KPIMeasurement = {
  id: string;
  date: string;
  value: number;
  note?: string;
};

export type PrototypeKPI = BaseKPI & {
  measurements: KPIMeasurement[];
  changeLog: { id: string; at: string; actor: string; message: string }[];
};

export type PrototypeChangeRequest = ChangeRequest & {
  entityId?: string;
  createdAt?: string;
  before?: unknown;
  after?: unknown;
  comments?: { id: string; at: string; author: string; message: string }[];
};

export type ProjectMilestoneStatus = "PLANNED" | "IN_PROGRESS" | "BLOCKED" | "DONE";

export type ProjectMilestone = {
  id: string;
  title: string;
  status: ProjectMilestoneStatus;
  owner?: string;
  due?: string;
};

export type ProjectUpdate = {
  id: string;
  at: string;
  author: string;
  summary: string;
  details?: string;
  blockers?: string;
};

export type PrototypeProject = BaseProject & {
  milestones: ProjectMilestone[];
  updates: ProjectUpdate[];
  changeLog: { id: string; at: string; actor: string; message: string }[];
};

export type InitiativeUpdate = {
  id: string;
  at: string;
  author: string;
  summary: string;
  decision?: string;
};

export type PrototypeInitiative = BaseInitiative & {
  updates: InitiativeUpdate[];
  changeLog: { id: string; at: string; actor: string; message: string }[];
};

export function useStoredEntity<T>(storageKey: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readJson<T>(storageKey);
    if (stored) setValue(stored.value);
    setHydrated(true);
  }, [storageKey]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      writeJson(storageKey, next);
    },
    [storageKey],
  );

  return { value, update, hydrated };
}

export function getBaseRisk(riskId: string): BaseRisk | null {
  const risks = basePillars.flatMap((pillar) => pillar.initiatives.flatMap((initiative) => initiative.risks));
  return risks.find((risk) => risk.id === riskId) ?? null;
}

export function getBaseInitiative(initiativeId: string): BaseInitiative | null {
  const initiatives = basePillars.flatMap((pillar) => pillar.initiatives);
  return initiatives.find((initiative) => initiative.id === initiativeId) ?? null;
}

export function getBaseProject(projectId: string): BaseProject | null {
  const projects = basePillars.flatMap((pillar) => pillar.initiatives.flatMap((initiative) => initiative.projects));
  return projects.find((project) => project.id === projectId) ?? null;
}

export function getBasePillar(pillarId: string): BasePillar | null {
  return basePillars.find((pillar) => pillar.id === pillarId) ?? null;
}

export function getBaseKPI(kpiId: string): BaseKPI | null {
  return baseKpis.find((kpi) => kpi.id === kpiId) ?? null;
}

export function getBaseChangeRequest(crId: string): ChangeRequest | null {
  return baseChangeRequests.find((cr) => cr.id === crId) ?? null;
}

export function riskStorageKey(riskId: string) {
  return `murtakaz:risk:${riskId}`;
}

export function kpiStorageKey(kpiId: string) {
  return `murtakaz:kpi:${kpiId}`;
}

export function crStorageKey(crId: string) {
  return `murtakaz:cr:${crId}`;
}

export function initiativeStorageKey(initiativeId: string) {
  return `murtakaz:init:${initiativeId}`;
}

export function projectStorageKey(projectId: string) {
  return `murtakaz:project:${projectId}`;
}

export function listStoredChangeRequests(): PrototypeChangeRequest[] {
  if (typeof window === "undefined") return [];
  const keys = Object.keys(window.localStorage).filter((key) => key.startsWith("murtakaz:cr:"));
  return keys
    .map((key) => readJson<PrototypeChangeRequest>(key)?.value ?? null)
    .filter((item): item is PrototypeChangeRequest => Boolean(item));
}

export function listAllChangeRequests(): PrototypeChangeRequest[] {
  const base = baseChangeRequests.map((cr) => ({
    ...cr,
    createdAt: new Date(Date.now() - cr.ageDays * 24 * 60 * 60 * 1000).toISOString(),
  }));
  if (typeof window === "undefined") return base;

  const stored = listStoredChangeRequests();
  const merged = new Map<string, PrototypeChangeRequest>();
  for (const item of base) merged.set(item.id, item);
  for (const item of stored) merged.set(item.id, item);
  return Array.from(merged.values()).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export function createKpiTargetChangeRequest(args: {
  kpi: PrototypeKPI;
  requestedBy: string;
  nextTarget: number;
}) {
  const crId = uid("cr");
  const before = { target: args.kpi.target, unit: args.kpi.unit, frequency: args.kpi.frequency };
  const after = { target: args.nextTarget, unit: args.kpi.unit, frequency: args.kpi.frequency };

  const cr: PrototypeChangeRequest = {
    id: crId,
    entityType: "KPI",
    entityName: args.kpi.name,
    requestedBy: args.requestedBy,
    status: "PENDING",
    ageDays: 0,
    entityId: args.kpi.id,
    createdAt: new Date().toISOString(),
    before,
    after,
    comments: [],
  };

  writeJson(crStorageKey(crId), cr);
  return cr;
}

export function applyChangeRequest(cr: PrototypeChangeRequest) {
  if (cr.entityType === "KPI" && cr.entityId && cr.after && typeof cr.after === "object" && cr.after !== null) {
    const maybeTarget = (cr.after as { target?: unknown }).target;
    if (typeof maybeTarget === "number") {
      const base = getBaseKPI(cr.entityId);
      if (!base) return;
      const key = kpiStorageKey(cr.entityId);
      const existing = readJson<PrototypeKPI>(key)?.value;

      const next: PrototypeKPI = existing
        ? {
            ...existing,
            target: maybeTarget,
            variance: Number((existing.current - maybeTarget).toFixed(2)),
            changeLog: [
              ...(existing.changeLog ?? []),
              { id: uid("log"), at: new Date().toISOString(), actor: "PMO", message: `Approved target change to ${maybeTarget}${existing.unit}` },
            ],
          }
        : {
            ...base,
            target: maybeTarget,
            variance: Number((base.current - maybeTarget).toFixed(2)),
            measurements: [],
            changeLog: [{ id: uid("log"), at: new Date().toISOString(), actor: "PMO", message: `Approved target change to ${maybeTarget}${base.unit}` }],
          };

      writeJson(key, next);
    }
  }
}

export function useAllChangeRequests() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handler = () => setVersion((v) => v + 1);
    const localHandler = () => setVersion((v) => v + 1);
    window.addEventListener("storage", handler);
    window.addEventListener("murtakaz-storage", localHandler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("murtakaz-storage", localHandler);
    };
  }, []);

  // `version` triggers a re-render after local storage updates.
  void version;
  return listAllChangeRequests();
}

export function createDefaultRisk(base: BaseRisk): PrototypeRisk {
  return { ...base, mitigation: [], notes: [] };
}

export function createDefaultKpi(base: BaseKPI): PrototypeKPI {
  return { ...base, measurements: [], changeLog: [] };
}

export function createDefaultInitiative(base: BaseInitiative): PrototypeInitiative {
  return { ...base, updates: [], changeLog: [] };
}

export function createDefaultProject(base: BaseProject): PrototypeProject {
  const milestones: ProjectMilestone[] = Array.from({ length: Math.max(0, base.milestonesTotal) }, (_, index) => {
    const number = index + 1;
    let status: ProjectMilestoneStatus = "PLANNED";
    if (index < base.milestonesComplete) status = "DONE";
    else if (index === base.milestonesComplete && base.milestonesComplete < base.milestonesTotal) status = "IN_PROGRESS";
    return { id: `ms-${number}`, title: `Milestone ${number}`, status };
  });

  return { ...base, milestones, updates: [], changeLog: [] };
}

export function createPlaceholderKpi(id: string): PrototypeKPI {
  return {
    id,
    name: "Unknown KPI",
    description: "",
    target: 0,
    unit: "",
    current: 0,
    variance: 0,
    frequency: "",
    owner: "",
    freshnessDays: 0,
    lineage: {},
    measurements: [],
    changeLog: [],
  };
}

export function createPlaceholderInitiative(id: string): PrototypeInitiative {
  return {
    id,
    title: "Unknown initiative",
    owner: "",
    status: "PLANNED",
    health: "AMBER",
    start: "",
    end: "",
    projects: [],
    kpis: [],
    risks: [],
    updates: [],
    changeLog: [],
  };
}

export function createPlaceholderProject(id: string): PrototypeProject {
  return {
    id,
    title: "Unknown project",
    owner: "",
    status: "PLANNED",
    health: "AMBER",
    milestonesComplete: 0,
    milestonesTotal: 0,
    dependencies: [],
    tags: [],
    milestones: [],
    updates: [],
    changeLog: [],
  };
}

export function getEffectiveKpi(kpiId: string): PrototypeKPI | null {
  const base = getBaseKPI(kpiId);
  if (!base) return null;
  const stored = readJson<PrototypeKPI>(kpiStorageKey(kpiId))?.value;
  return stored ?? createDefaultKpi(base);
}

export function getEffectiveRisk(riskId: string): PrototypeRisk | null {
  const base = getBaseRisk(riskId);
  if (!base) return null;
  const stored = readJson<PrototypeRisk>(riskStorageKey(riskId))?.value;
  return stored ?? createDefaultRisk(base);
}

export function getEffectiveInitiative(initiativeId: string): PrototypeInitiative | null {
  const base = getBaseInitiative(initiativeId);
  if (!base) return null;
  const stored = readJson<PrototypeInitiative>(initiativeStorageKey(initiativeId))?.value;
  return stored ?? createDefaultInitiative(base);
}

export function getEffectiveProject(projectId: string): PrototypeProject | null {
  const base = getBaseProject(projectId);
  if (!base) return null;
  const stored = readJson<PrototypeProject>(projectStorageKey(projectId))?.value;
  return stored ?? createDefaultProject(base);
}

export function createDefaultChangeRequest(base: ChangeRequest): PrototypeChangeRequest {
  return {
    ...base,
    createdAt: new Date(Date.now() - base.ageDays * 24 * 60 * 60 * 1000).toISOString(),
    comments: [],
    before: { example: "previous value" },
    after: { example: "requested value" },
  };
}

export function createPlaceholderChangeRequest(id: string): PrototypeChangeRequest {
  return {
    id,
    entityType: "",
    entityName: "",
    requestedBy: "",
    status: "PENDING",
    ageDays: 0,
    createdAt: new Date().toISOString(),
    comments: [],
  };
}

export function addRiskNote(risk: PrototypeRisk, args: { author: string; message: string }) {
  return {
    ...risk,
    notes: [{ id: uid("note"), at: new Date().toISOString(), author: args.author, message: args.message }, ...risk.notes],
  };
}

export function addKpiMeasurement(kpi: PrototypeKPI, input: { date: string; value: number; note?: string }) {
  const measurements = [...kpi.measurements, { id: uid("m"), date: input.date, value: input.value, note: input.note }].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const latest = measurements.at(-1);
  const current = latest ? latest.value : kpi.current;
  const variance = Number((current - kpi.target).toFixed(2));

  return {
    ...kpi,
    measurements,
    current,
    variance,
    freshnessDays: 0,
    changeLog: [
      { id: uid("log"), at: new Date().toISOString(), actor: "Owner", message: `Added measurement ${current}${kpi.unit} (${input.date})` },
      ...kpi.changeLog,
    ],
  };
}

export function normalizeProjectProgress(project: PrototypeProject): PrototypeProject {
  const milestonesTotal = project.milestones.length;
  const milestonesComplete = project.milestones.filter((m) => m.status === "DONE").length;
  return { ...project, milestonesTotal, milestonesComplete };
}

export function addProjectUpdate(project: PrototypeProject, input: Omit<ProjectUpdate, "id" | "at">): PrototypeProject {
  const entry: ProjectUpdate = { id: uid("upd"), at: new Date().toISOString(), ...input };
  return {
    ...project,
    updates: [entry, ...project.updates],
    changeLog: [{ id: uid("log"), at: entry.at, actor: input.author, message: `Update posted: ${input.summary}` }, ...project.changeLog],
  };
}

export function addInitiativeUpdate(initiative: PrototypeInitiative, input: Omit<InitiativeUpdate, "id" | "at">): PrototypeInitiative {
  const entry: InitiativeUpdate = { id: uid("upd"), at: new Date().toISOString(), ...input };
  return {
    ...initiative,
    updates: [entry, ...initiative.updates],
    changeLog: [{ id: uid("log"), at: entry.at, actor: input.author, message: `Update posted: ${input.summary}` }, ...initiative.changeLog],
  };
}
