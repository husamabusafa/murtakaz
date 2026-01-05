"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  KpiAggregationMethod,
  KpiDirection,
  KpiPeriodType,
  KpiValueStatus,
  KpiVariableDataType,
  Role,
} from "@prisma/client";
import { getMyEffectiveKpiIds } from "@/actions/responsibilities";

type KpiApprovalLevelCode = "MANAGER" | "PMO" | "EXECUTIVE" | "ADMIN";

const prismaKpiDefinition = (prisma as unknown as { kpiDefinition: unknown }).kpiDefinition as {
  findMany: <T>(args: unknown) => Promise<T[]>;
  findFirst: <T>(args: unknown) => Promise<T | null>;
  create: <T>(args: unknown) => Promise<T>;
  update: <T>(args: unknown) => Promise<T>;
  delete: <T>(args: unknown) => Promise<T>;
};

const prismaKpiValuePeriod = (prisma as unknown as { kpiValuePeriod: unknown }).kpiValuePeriod as {
  findFirst: <T>(args: unknown) => Promise<T | null>;
  findMany: <T>(args: unknown) => Promise<T[]>;
  upsert: <T>(args: unknown) => Promise<T>;
};

const prismaKpiVariableValue = (prisma as unknown as { kpiVariableValue: unknown }).kpiVariableValue as {
  upsert: <T>(args: unknown) => Promise<T>;
};

const prismaKpiVariable = (prisma as unknown as { kpiVariable: unknown }).kpiVariable as {
  deleteMany: (args: unknown) => Promise<unknown>;
  update: <T>(args: unknown) => Promise<T>;
  create: <T>(args: unknown) => Promise<T>;
};

const prismaOrganization = (prisma as unknown as { organization: unknown }).organization as {
  findFirst: <T>(args: unknown) => Promise<T | null>;
};

export type ActionValidationIssue = {
  path: (string | number)[];
  message: string;
};

function zodIssues(error: z.ZodError): ActionValidationIssue[] {
  return error.issues.map((i) => ({
    path: i.path.map((p) => (typeof p === "string" || typeof p === "number" ? p : String(p))),
    message: i.message,
  }));
}

async function requireOrgMember() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (!session.user.orgId) {
    throw new Error("Unauthorized: Missing organization scope");
  }

  return session;
}

async function requireOrgAdmin() {
  const session = await requireOrgMember();
  if (session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Organization admin access required");
  }
  return session;
}

const ROLE_RANK: Record<string, number> = {
  EMPLOYEE: 0,
  MANAGER: 1,
  PMO: 2,
  EXECUTIVE: 3,
  ADMIN: 4,
  SUPER_ADMIN: 5,
};

function resolveRoleRank(role: unknown) {
  if (typeof role !== "string") return 0;
  return ROLE_RANK[role] ?? 0;
}

async function getOrgApprovalSettings(orgId: string) {
  const org = await prismaOrganization.findFirst<{ kpiApprovalLevel: KpiApprovalLevelCode }>({
    where: { id: orgId, deletedAt: null },
    select: { kpiApprovalLevel: true },
  });
  return { kpiApprovalLevel: org?.kpiApprovalLevel ?? "MANAGER" };
}

async function getApprovalContext(session: Awaited<ReturnType<typeof requireOrgMember>>) {
  const settings = await getOrgApprovalSettings(session.user.orgId);
  const userRoleRank = resolveRoleRank(session.user.role);
  const requiredRank = resolveRoleRank(settings.kpiApprovalLevel);
  const canApprove = userRoleRank >= requiredRank;
  return {
    approvalLevel: settings.kpiApprovalLevel,
    canApprove,
    role: session.user.role as Role,
  };
}

function resolvePeriodRange(input: { now: Date; periodType: KpiPeriodType }) {
  const now = input.now;
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  if (input.periodType === KpiPeriodType.MONTHLY) {
    const start = new Date(Date.UTC(year, month, 1));
    const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
    return { start, end };
  }

  if (input.periodType === KpiPeriodType.QUARTERLY) {
    const quarter = Math.floor(month / 3);
    const startMonth = quarter * 3;
    const start = new Date(Date.UTC(year, startMonth, 1));
    const end = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59, 999));
    return { start, end };
  }

  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 12, 0, 23, 59, 59, 999));
  return { start, end };
}

function evaluateFormula(input: { formula: string; valuesByCode: Record<string, number> }) {
  const trimmed = input.formula.trim();
  if (!trimmed) return { ok: false as const, error: "Empty formula" };

  const replaced = trimmed.replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, (token) => {
    if (Object.prototype.hasOwnProperty.call(input.valuesByCode, token)) {
      return String(input.valuesByCode[token] ?? 0);
    }
    return "0";
  });

  // Allow only numbers/operators/parentheses/whitespace/dot
  if (!/^[0-9+\-*/().\s]+$/.test(replaced)) {
    return { ok: false as const, error: "Formula contains unsupported characters" };
  }

  try {
    const result = Function(`"use strict"; return (${replaced});`)();
    const num = typeof result === "number" && Number.isFinite(result) ? result : NaN;
    if (!Number.isFinite(num)) {
      return { ok: false as const, error: "Formula result is not a valid number" };
    }
    return { ok: true as const, value: num };
  } catch {
    return { ok: false as const, error: "Failed to evaluate formula" };
  }
}

export async function getOrgKpisGrid() {
  const session = await requireOrgMember();

  const effectiveIds = session.user.role === "ADMIN" ? null : await getMyEffectiveKpiIds();
  if (effectiveIds && effectiveIds.length === 0) return [];

  return prismaKpiDefinition.findMany<{
    id: string;
    name: string;
    description: string | null;
    unit: string | null;
    targetValue: number | null;
    baselineValue: number | null;
    periodType: KpiPeriodType;
    status: unknown;
    primaryNode: { id: string; name: string; nodeType: { displayName: string } };
    values: Array<{ calculatedValue: number | null; periodEnd: Date; status: unknown }>;
  }>({
    where: {
      orgId: session.user.orgId,
      ...(effectiveIds ? { id: { in: effectiveIds } } : {}),
    },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      unit: true,
      targetValue: true,
      baselineValue: true,
      periodType: true,
      status: true,
      primaryNode: {
        select: {
          id: true,
          name: true,
          nodeType: { select: { displayName: true } },
        },
      },
      values: {
        orderBy: [{ periodEnd: "desc" }],
        take: 1,
        select: {
          calculatedValue: true,
          periodEnd: true,
          status: true,
        },
      },
    },
  });
}

export async function getOrgKpiDetail(input: { kpiId: string }) {
  const session = await requireOrgMember();
  const parsed = z.object({ kpiId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return null;

  if (session.user.role !== "ADMIN") {
    const effective = await getMyEffectiveKpiIds();
    const allowed = new Set(effective);
    if (!allowed.has(parsed.data.kpiId)) return null;
  }

  const kpi = await prismaKpiDefinition.findFirst<{
    id: string;
    name: string;
    description: string | null;
    formula: string | null;
    unit: string | null;
    direction: KpiDirection;
    aggregation: KpiAggregationMethod;
    periodType: KpiPeriodType;
    baselineValue: number | null;
    targetValue: number | null;
    status: unknown;
    primaryNode: { id: string; name: string; nodeType: { displayName: string } };
    variables: Array<{
      id: string;
      code: string;
      displayName: string;
      dataType: KpiVariableDataType;
      isRequired: boolean;
      isStatic: boolean;
      staticValue: number | null;
    }>;
    values: Array<{
      id: string;
      periodStart: Date;
      periodEnd: Date;
      calculatedValue: number | null;
      status: unknown;
      note: string | null;
      submittedAt?: Date | null;
      approvedAt?: Date | null;
      changesRequestedAt?: Date | null;
      changesRequestedMessage?: string | null;
      changesRequestedByUser?: { id: string; name: string } | null;
      submittedByUser?: { id: string; name: string } | null;
      approvedByUser?: { id: string; name: string } | null;
      variableValues: Array<{ kpiVariableId: string; value: number }>;
    }>;
  }>({
    where: { id: parsed.data.kpiId, orgId: session.user.orgId },
    select: {
      id: true,
      name: true,
      description: true,
      formula: true,
      unit: true,
      direction: true,
      aggregation: true,
      periodType: true,
      baselineValue: true,
      targetValue: true,
      status: true,
      primaryNode: {
        select: {
          id: true,
          name: true,
          nodeType: { select: { displayName: true } },
        },
      },
      variables: {
        orderBy: [{ displayName: "asc" }],
        select: {
          id: true,
          code: true,
          displayName: true,
          dataType: true,
          isRequired: true,
          isStatic: true,
          staticValue: true,
        },
      },
      values: {
        orderBy: [{ periodEnd: "desc" }],
        take: 12,
        select: {
          id: true,
          periodStart: true,
          periodEnd: true,
          calculatedValue: true,
          status: true,
          note: true,
          submittedAt: true,
          approvedAt: true,
          changesRequestedAt: true,
          changesRequestedMessage: true,
          changesRequestedByUser: { select: { id: true, name: true } },
          submittedByUser: { select: { id: true, name: true } },
          approvedByUser: { select: { id: true, name: true } },
          variableValues: {
            select: {
              kpiVariableId: true,
              value: true,
            },
          },
        },
      },
    },
  });

  if (!kpi) return null;

  const latest = kpi.values[0] ?? null;
  const currentRange = resolvePeriodRange({ now: new Date(), periodType: kpi.periodType });

  const currentPeriod = await prismaKpiValuePeriod.findFirst<{
    id: string;
    calculatedValue: number | null;
    status: unknown;
    note: string | null;
    submittedAt?: Date | null;
    approvedAt?: Date | null;
    submittedBy?: string | null;
    approvedBy?: string | null;
    changesRequestedAt?: Date | null;
    changesRequestedMessage?: string | null;
    changesRequestedByUser?: { id: string; name: string } | null;
    submittedByUser?: { id: string; name: string } | null;
    approvedByUser?: { id: string; name: string } | null;
    variableValues: Array<{ kpiVariableId: string; value: number }>;
  }>({
    where: {
      kpiId: kpi.id,
      periodStart: currentRange.start,
      periodEnd: currentRange.end,
    },
    select: {
      id: true,
      calculatedValue: true,
      status: true,
      note: true,
      submittedAt: true,
      approvedAt: true,
      submittedBy: true,
      approvedBy: true,
      changesRequestedAt: true,
      changesRequestedMessage: true,
      changesRequestedByUser: { select: { id: true, name: true } },
      submittedByUser: { select: { id: true, name: true } },
      approvedByUser: { select: { id: true, name: true } },
      variableValues: {
        select: {
          kpiVariableId: true,
          value: true,
        },
      },
    },
  });

  const approvalContext = await getApprovalContext(session);

  return {
    kpi,
    latest,
    currentRange,
    currentPeriod,
    canAdmin: session.user.role === "ADMIN",
    canApprove: approvalContext.canApprove,
    approvalLevel: approvalContext.approvalLevel,
    role: approvalContext.role,
  };
}

const kpiValuesInputSchema = z.object({
  kpiId: z.string().uuid(),
  note: z.string().max(500).optional(),
  manualValue: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
    z.number().finite().optional(),
  ),
  values: z.record(z.string().uuid(), z.preprocess((v) => Number(v), z.number().finite())),
});

async function computeAndValidateKpiValue(input: {
  orgId: string;
  kpiId: string;
  note?: string;
  manualValue?: number;
  values: Record<string, number>;
}) {
  const kpi = await prismaKpiDefinition.findFirst<{
    id: string;
    formula: string | null;
    periodType: KpiPeriodType;
    variables: Array<{
      id: string;
      code: string;
      isRequired: boolean;
      isStatic: boolean;
      staticValue: number | null;
    }>;
  }>({
    where: { id: input.kpiId, orgId: input.orgId },
    select: {
      id: true,
      formula: true,
      periodType: true,
      variables: {
        select: {
          id: true,
          code: true,
          isRequired: true,
          isStatic: true,
          staticValue: true,
        },
      },
    },
  });

  if (!kpi) return { ok: false as const, error: "KPI not found." };

  const range = resolvePeriodRange({ now: new Date(), periodType: kpi.periodType });

  const valuesByVarId = input.values;
  const issues: ActionValidationIssue[] = [];
  const valuesByCode: Record<string, number> = {};

  for (const v of kpi.variables) {
    if (v.isStatic) {
      if (v.isRequired && (v.staticValue === null || typeof v.staticValue === "undefined")) {
        issues.push({ path: ["variables", v.id], message: `Static variable ${v.code} is required.` });
      }
      valuesByCode[v.code] = Number(v.staticValue ?? 0);
      continue;
    }

    const val = valuesByVarId[v.id];
    if (v.isRequired && (val === undefined || Number.isNaN(val))) {
      issues.push({ path: ["values", v.id], message: `Variable ${v.code} is required.` });
      continue;
    }

    if (val !== undefined && Number.isFinite(val)) {
      valuesByCode[v.code] = Number(val);
    } else {
      valuesByCode[v.code] = 0;
    }
  }

  if (issues.length) {
    return { ok: false as const, error: "Validation failed", issues };
  }

  let calculatedValue: number | null = null;
  const hasVariables = kpi.variables.length > 0;

  if (kpi.formula && kpi.formula.trim().length > 0) {
    const result = evaluateFormula({ formula: kpi.formula, valuesByCode });
    if (!result.ok) {
      return { ok: false as const, error: result.error };
    }
    calculatedValue = result.value;
  } else if (hasVariables) {
    calculatedValue = Object.values(valuesByCode).reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0);
  } else {
    if (typeof input.manualValue !== "number" || !Number.isFinite(input.manualValue)) {
      return {
        ok: false as const,
        error: "Value is required.",
        issues: [{ path: ["manualValue"], message: "Value is required." } satisfies ActionValidationIssue],
      };
    }
    calculatedValue = input.manualValue;
  }

  return {
    ok: true as const,
    kpi,
    range,
    calculatedValue,
    fillableVariableIds: kpi.variables.filter((v) => !v.isStatic).map((v) => v.id),
  };
}

async function loadExistingValuePeriod(input: { kpiId: string; range: { start: Date; end: Date } }) {
  return prismaKpiValuePeriod.findFirst<{
    id: string;
    status: KpiValueStatus;
    submittedAt: Date | null;
    submittedBy: string | null;
    approvedAt: Date | null;
    approvedBy: string | null;
  }>({
    where: {
      kpiId: input.kpiId,
      periodStart: input.range.start,
      periodEnd: input.range.end,
    },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      submittedBy: true,
      approvedAt: true,
      approvedBy: true,
    },
  });
}

async function upsertKpiValueWithVariables(input: {
  kpiId: string;
  range: { start: Date; end: Date };
  calculatedValue: number | null;
  status: KpiValueStatus;
  note: string | null;
  enteredBy: string;
  submittedAt?: Date | null;
  submittedBy?: string | null;
  approvedAt?: Date | null;
  approvedBy?: string | null;
  changesRequestedMessage?: string | null;
  changesRequestedAt?: Date | null;
  changesRequestedBy?: string | null;
  keepSubmittedMetadata?: boolean;
  valuesByVarId: Record<string, number>;
  fillableVariableIds: string[];
}) {
  const kpiValue = await prismaKpiValuePeriod.upsert<{ id: string }>({
    where: {
      kpiId_periodStart_periodEnd: {
        kpiId: input.kpiId,
        periodStart: input.range.start,
        periodEnd: input.range.end,
      },
    },
    create: {
      kpiId: input.kpiId,
      periodStart: input.range.start,
      periodEnd: input.range.end,
      calculatedValue: input.calculatedValue,
      status: input.status,
      note: input.note,
      enteredBy: input.enteredBy,
      submittedAt: input.submittedAt ?? null,
      submittedBy: input.submittedBy ?? null,
      approvedAt: input.approvedAt ?? null,
      approvedBy: input.approvedBy ?? null,
      changesRequestedMessage: input.changesRequestedMessage ?? null,
      changesRequestedAt: input.changesRequestedAt ?? null,
      changesRequestedBy: input.changesRequestedBy ?? null,
    },
    update: {
      calculatedValue: input.calculatedValue,
      note: input.note,
      enteredBy: input.enteredBy,
      status: input.status,
      ...(typeof input.submittedAt !== "undefined" ? { submittedAt: input.submittedAt } : {}),
      ...(typeof input.submittedBy !== "undefined" ? { submittedBy: input.submittedBy } : {}),
      ...(typeof input.approvedAt !== "undefined" ? { approvedAt: input.approvedAt } : {}),
      ...(typeof input.approvedBy !== "undefined" ? { approvedBy: input.approvedBy } : {}),
      ...(typeof input.changesRequestedMessage !== "undefined" ? { changesRequestedMessage: input.changesRequestedMessage } : {}),
      ...(typeof input.changesRequestedAt !== "undefined" ? { changesRequestedAt: input.changesRequestedAt } : {}),
      ...(typeof input.changesRequestedBy !== "undefined" ? { changesRequestedBy: input.changesRequestedBy } : {}),
    },
    select: { id: true },
  });

  for (const kpiVariableId of input.fillableVariableIds) {
    const value = input.valuesByVarId[kpiVariableId];
    if (value === undefined) continue;

    await prismaKpiVariableValue.upsert({
      where: {
        kpiValueId_kpiVariableId: {
          kpiValueId: kpiValue.id,
          kpiVariableId,
        },
      },
      create: {
        kpiValueId: kpiValue.id,
        kpiVariableId,
        value,
      },
      update: {
        value,
      },
      select: { id: true },
    });
  }

  return kpiValue;
}

export async function saveOrgKpiValuesDraft(data: z.infer<typeof kpiValuesInputSchema>) {
  const session = await requireOrgMember();
  const parsedResult = kpiValuesInputSchema.safeParse(data);
  if (!parsedResult.success) {
    return { success: false as const, error: "Validation failed", issues: zodIssues(parsedResult.error) };
  }

  const parsed = parsedResult.data;

  if (session.user.role !== "ADMIN") {
    const effective = await getMyEffectiveKpiIds();
    const allowed = new Set(effective);
    if (!allowed.has(parsed.kpiId)) {
      return { success: false as const, error: "Unauthorized" };
    }
  }

  const approvalContext = await getApprovalContext(session);

  const computed = await computeAndValidateKpiValue({
    orgId: session.user.orgId,
    kpiId: parsed.kpiId,
    note: parsed.note,
    manualValue: parsed.manualValue,
    values: parsed.values,
  });
  if (!computed.ok) return { success: false as const, error: computed.error, issues: computed.issues };

  const existing = await loadExistingValuePeriod({ kpiId: parsed.kpiId, range: computed.range });
  const existingStatus = existing?.status ?? null;

  if (!approvalContext.canApprove && (existingStatus === KpiValueStatus.SUBMITTED || existingStatus === KpiValueStatus.APPROVED || existingStatus === KpiValueStatus.LOCKED)) {
    return { success: false as const, error: "This KPI value is already submitted and cannot be edited." };
  }

  const nextStatus = existingStatus === KpiValueStatus.SUBMITTED && approvalContext.canApprove ? KpiValueStatus.SUBMITTED : KpiValueStatus.DRAFT;
  const clearApproval = existingStatus === KpiValueStatus.APPROVED && approvalContext.canApprove;

  await upsertKpiValueWithVariables({
    kpiId: parsed.kpiId,
    range: computed.range,
    calculatedValue: computed.calculatedValue,
    status: nextStatus,
    note: parsed.note?.trim() ? parsed.note.trim() : null,
    enteredBy: session.user.id,
    ...(clearApproval ? { approvedAt: null, approvedBy: null } : {}),
    valuesByVarId: parsed.values,
    fillableVariableIds: computed.fillableVariableIds,
  });

  return { success: true as const };
}

export async function requestChangesForOrgKpiValues(input: { kpiId: string; message: string }) {
  const session = await requireOrgMember();
  const parsed = z
    .object({
      kpiId: z.string().uuid(),
      message: z.string().min(2).max(500),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Validation failed", issues: zodIssues(parsed.error) };
  }

  const approvalContext = await getApprovalContext(session);
  if (!approvalContext.canApprove) {
    return { success: false as const, error: "Unauthorized" };
  }

  const kpi = await prismaKpiDefinition.findFirst<{ id: string; periodType: KpiPeriodType }>({
    where: { id: parsed.data.kpiId, orgId: session.user.orgId },
    select: { id: true, periodType: true },
  });

  if (!kpi) return { success: false as const, error: "KPI not found." };

  const range = resolvePeriodRange({ now: new Date(), periodType: kpi.periodType });
  const existing = await loadExistingValuePeriod({ kpiId: kpi.id, range });

  if (!existing) {
    return { success: false as const, error: "No submitted value found for the current period." };
  }

  if (existing.status !== KpiValueStatus.SUBMITTED) {
    return { success: false as const, error: "Only submitted KPI values can be returned for changes." };
  }

  const now = new Date();
  await (prisma as unknown as { kpiValuePeriod: { update: (args: unknown) => Promise<unknown> } }).kpiValuePeriod.update({
    where: { id: existing.id },
    data: {
      status: KpiValueStatus.DRAFT,
      submittedAt: null,
      submittedBy: null,
      approvedAt: null,
      approvedBy: null,
      changesRequestedMessage: parsed.data.message.trim(),
      changesRequestedAt: now,
      changesRequestedBy: session.user.id,
    },
  });

  return { success: true as const };
}

export async function submitOrgKpiValuesForApproval(data: z.infer<typeof kpiValuesInputSchema>) {
  const session = await requireOrgMember();
  const parsedResult = kpiValuesInputSchema.safeParse(data);
  if (!parsedResult.success) {
    return { success: false as const, error: "Validation failed", issues: zodIssues(parsedResult.error) };
  }

  const parsed = parsedResult.data;

  if (session.user.role !== "ADMIN") {
    const effective = await getMyEffectiveKpiIds();
    const allowed = new Set(effective);
    if (!allowed.has(parsed.kpiId)) {
      return { success: false as const, error: "Unauthorized" };
    }
  }

  const approvalContext = await getApprovalContext(session);

  const computed = await computeAndValidateKpiValue({
    orgId: session.user.orgId,
    kpiId: parsed.kpiId,
    note: parsed.note,
    manualValue: parsed.manualValue,
    values: parsed.values,
  });
  if (!computed.ok) return { success: false as const, error: computed.error, issues: computed.issues };

  const existing = await loadExistingValuePeriod({ kpiId: parsed.kpiId, range: computed.range });
  if (existing?.status === KpiValueStatus.SUBMITTED && !approvalContext.canApprove) {
    return { success: false as const, error: "This KPI value is already submitted." };
  }
  if (existing?.status === KpiValueStatus.APPROVED && !approvalContext.canApprove) {
    return { success: false as const, error: "This KPI value is already approved." };
  }

  const now = new Date();
  const autoApprove = approvalContext.canApprove;

  await upsertKpiValueWithVariables({
    kpiId: parsed.kpiId,
    range: computed.range,
    calculatedValue: computed.calculatedValue,
    status: autoApprove ? KpiValueStatus.APPROVED : KpiValueStatus.SUBMITTED,
    note: parsed.note?.trim() ? parsed.note.trim() : null,
    enteredBy: session.user.id,
    submittedAt: existing?.submittedAt ?? now,
    submittedBy: existing?.submittedBy ?? session.user.id,
    ...(autoApprove
      ? {
          approvedAt: now,
          approvedBy: session.user.id,
        }
      : {
          approvedAt: null,
          approvedBy: null,
        }),
    changesRequestedAt: null,
    changesRequestedBy: null,
    changesRequestedMessage: null,
    valuesByVarId: parsed.values,
    fillableVariableIds: computed.fillableVariableIds,
  });

  return { success: true as const, autoApproved: autoApprove };
}

export async function approveOrgKpiValues(data: z.infer<typeof kpiValuesInputSchema>) {
  const session = await requireOrgMember();
  const parsedResult = kpiValuesInputSchema.safeParse(data);
  if (!parsedResult.success) {
    return { success: false as const, error: "Validation failed", issues: zodIssues(parsedResult.error) };
  }

  const approvalContext = await getApprovalContext(session);
  if (!approvalContext.canApprove) {
    return { success: false as const, error: "Unauthorized" };
  }

  const parsed = parsedResult.data;

  if (session.user.role !== "ADMIN") {
    const effective = await getMyEffectiveKpiIds();
    const allowed = new Set(effective);
    if (!allowed.has(parsed.kpiId)) {
      return { success: false as const, error: "Unauthorized" };
    }
  }

  const computed = await computeAndValidateKpiValue({
    orgId: session.user.orgId,
    kpiId: parsed.kpiId,
    note: parsed.note,
    manualValue: parsed.manualValue,
    values: parsed.values,
  });
  if (!computed.ok) return { success: false as const, error: computed.error, issues: computed.issues };

  const existing = await loadExistingValuePeriod({ kpiId: parsed.kpiId, range: computed.range });

  const now = new Date();
  await upsertKpiValueWithVariables({
    kpiId: parsed.kpiId,
    range: computed.range,
    calculatedValue: computed.calculatedValue,
    status: KpiValueStatus.APPROVED,
    note: parsed.note?.trim() ? parsed.note.trim() : null,
    enteredBy: session.user.id,
    submittedAt: existing?.submittedAt ?? now,
    submittedBy: existing?.submittedBy ?? session.user.id,
    approvedAt: now,
    approvedBy: session.user.id,
    changesRequestedAt: null,
    changesRequestedBy: null,
    changesRequestedMessage: null,
    valuesByVarId: parsed.values,
    fillableVariableIds: computed.fillableVariableIds,
  });

  return { success: true as const };
}

export async function getOrgKpiApprovals(input?: { status?: "SUBMITTED" | "APPROVED" }) {
  const session = await requireOrgMember();
  const approvalContext = await getApprovalContext(session);
  if (!approvalContext.canApprove) {
    throw new Error("Unauthorized");
  }

  const parsed = z
    .object({ status: z.enum(["SUBMITTED", "APPROVED"]).optional() })
    .optional()
    .safeParse(input);

  const status = parsed.success ? parsed.data?.status : undefined;

  return prismaKpiValuePeriod.findMany<{
    id: string;
    kpiId: string;
    periodStart: Date;
    periodEnd: Date;
    calculatedValue: number | null;
    status: unknown;
    note: string | null;
    submittedAt: Date | null;
    approvedAt: Date | null;
    submittedByUser: { id: string; name: string } | null;
    approvedByUser: { id: string; name: string } | null;
    kpi: {
      id: string;
      name: string;
      primaryNode: { name: string; nodeType: { displayName: string } } | null;
    };
  }>({
    where: {
      kpi: { orgId: session.user.orgId },
      ...(status ? { status: status as KpiValueStatus } : { status: { in: [KpiValueStatus.SUBMITTED, KpiValueStatus.APPROVED] } }),
    },
    orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      kpiId: true,
      periodStart: true,
      periodEnd: true,
      calculatedValue: true,
      status: true,
      note: true,
      submittedAt: true,
      approvedAt: true,
      submittedByUser: { select: { id: true, name: true } },
      approvedByUser: { select: { id: true, name: true } },
      kpi: {
        select: {
          id: true,
          name: true,
          primaryNode: { select: { name: true, nodeType: { select: { displayName: true } } } },
        },
      },
    },
  });
}

export async function submitOrgKpiValues(data: z.infer<typeof kpiValuesInputSchema>) {
  return saveOrgKpiValuesDraft(data);
}

export async function getOrgKpiPrimaryNodeOptions() {
  const session = await requireOrgAdmin();

  return prisma.node.findMany({
    where: { orgId: session.user.orgId, deletedAt: null },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      nodeType: { select: { displayName: true } },
    },
  });
}

const kpiVariableInputSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1),
  displayName: z.string().min(1),
  dataType: z.nativeEnum(KpiVariableDataType),
  isRequired: z.boolean().optional(),
  isStatic: z.boolean().optional(),
  staticValue: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
    z.number().finite().nullable().optional(),
  ),
});

const createKpiSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  primaryNodeId: z.string().uuid(),
  ownerUserId: z.string().min(1).optional(),
  unit: z.string().optional(),
  formula: z.string().optional(),
  direction: z.nativeEnum(KpiDirection).optional(),
  aggregation: z.nativeEnum(KpiAggregationMethod).optional(),
  periodType: z.nativeEnum(KpiPeriodType),
  baselineValue: z.preprocess((v) => (v === "" || v === undefined || v === null ? null : Number(v)), z.number().finite().nullable().optional()),
  targetValue: z.preprocess((v) => (v === "" || v === undefined || v === null ? null : Number(v)), z.number().finite().nullable().optional()),
  variables: z.array(kpiVariableInputSchema).min(1, "At least one variable is required."),
});

export async function createOrgAdminKpi(data: z.infer<typeof createKpiSchema>) {
  const session = await requireOrgAdmin();
  const parsedResult = createKpiSchema.safeParse(data);
  if (!parsedResult.success) {
    return { success: false as const, error: "Validation failed", issues: zodIssues(parsedResult.error) };
  }

  const parsed = parsedResult.data;

  const codes = parsed.variables.map((v) => v.code.trim());
  const codeSet = new Set(codes);
  if (codes.length !== codeSet.size) {
    return {
      success: false as const,
      error: "Variable codes must be unique.",
      issues: [{ path: ["variables"], message: "Variable codes must be unique." } satisfies ActionValidationIssue],
    };
  }

  const badStatic = parsed.variables.find((v) => v.isStatic && v.isRequired && (v.staticValue === null || typeof v.staticValue === "undefined"));
  if (badStatic) {
    return {
      success: false as const,
      error: "Static required variables must have a value.",
      issues: [{ path: ["variables", badStatic.code], message: "Static required variables must have a value." } satisfies ActionValidationIssue],
    };
  }

  const kpi = await prismaKpiDefinition.create<{ id: string }>({
    data: {
      orgId: session.user.orgId,
      name: parsed.name,
      description: parsed.description || null,
      formula: parsed.formula || null,
      unit: parsed.unit || null,
      periodType: parsed.periodType,
      direction: parsed.direction ?? KpiDirection.INCREASE_IS_GOOD,
      aggregation: parsed.aggregation ?? KpiAggregationMethod.LAST_VALUE,
      baselineValue: typeof parsed.baselineValue === "number" ? parsed.baselineValue : null,
      targetValue: typeof parsed.targetValue === "number" ? parsed.targetValue : null,
      primaryNodeId: parsed.primaryNodeId,
      ownerUserId: parsed.ownerUserId || null,
      variables: {
        create: parsed.variables.map((v) => ({
          code: v.code.trim(),
          displayName: v.displayName.trim(),
          dataType: v.dataType,
          isRequired: Boolean(v.isRequired),
          isStatic: Boolean(v.isStatic),
          staticValue: typeof v.staticValue === "number" ? v.staticValue : null,
        })),
      },
    },
    select: { id: true },
  });

  return { success: true as const, kpiId: kpi.id };
}

const updateKpiSchema = createKpiSchema.extend({
  kpiId: z.string().uuid(),
});

export async function updateOrgAdminKpi(data: z.infer<typeof updateKpiSchema>) {
  const session = await requireOrgAdmin();
  const parsedResult = updateKpiSchema.safeParse(data);
  if (!parsedResult.success) {
    return { success: false as const, error: "Validation failed", issues: zodIssues(parsedResult.error) };
  }

  const parsed = parsedResult.data;

  const existing = await prismaKpiDefinition.findFirst<{ id: string }>({
    where: { id: parsed.kpiId, orgId: session.user.orgId },
    select: { id: true },
  });

  if (!existing) return { success: false as const, error: "KPI not found." };

  const codes = parsed.variables.map((v) => v.code.trim());
  const codeSet = new Set(codes);
  if (codes.length !== codeSet.size) {
    return {
      success: false as const,
      error: "Variable codes must be unique.",
      issues: [{ path: ["variables"], message: "Variable codes must be unique." } satisfies ActionValidationIssue],
    };
  }

  const badStatic = parsed.variables.find((v) => v.isStatic && v.isRequired && (v.staticValue === null || typeof v.staticValue === "undefined"));
  if (badStatic) {
    return {
      success: false as const,
      error: "Static required variables must have a value.",
      issues: [{ path: ["variables", badStatic.code], message: "Static required variables must have a value." } satisfies ActionValidationIssue],
    };
  }

  const keepIds = new Set(parsed.variables.map((v) => v.id).filter(Boolean) as string[]);

  await prismaKpiVariable.deleteMany({
    where: {
      kpiId: parsed.kpiId,
      ...(keepIds.size ? { id: { notIn: Array.from(keepIds) } } : {}),
    },
  });

  for (const v of parsed.variables) {
    if (v.id) {
      await prismaKpiVariable.update({
        where: { id: v.id },
        data: {
          code: v.code.trim(),
          displayName: v.displayName.trim(),
          dataType: v.dataType,
          isRequired: Boolean(v.isRequired),
          isStatic: Boolean(v.isStatic),
          staticValue: typeof v.staticValue === "number" ? v.staticValue : null,
        },
        select: { id: true },
      });
    } else {
      await prismaKpiVariable.create({
        data: {
          kpiId: parsed.kpiId,
          code: v.code.trim(),
          displayName: v.displayName.trim(),
          dataType: v.dataType,
          isRequired: Boolean(v.isRequired),
          isStatic: Boolean(v.isStatic),
          staticValue: typeof v.staticValue === "number" ? v.staticValue : null,
        },
        select: { id: true },
      });
    }
  }

  await prismaKpiDefinition.update({
    where: { id: parsed.kpiId },
    data: {
      name: parsed.name,
      description: parsed.description || null,
      formula: parsed.formula || null,
      unit: parsed.unit || null,
      periodType: parsed.periodType,
      direction: parsed.direction ?? KpiDirection.INCREASE_IS_GOOD,
      aggregation: parsed.aggregation ?? KpiAggregationMethod.LAST_VALUE,
      baselineValue: typeof parsed.baselineValue === "number" ? parsed.baselineValue : null,
      targetValue: typeof parsed.targetValue === "number" ? parsed.targetValue : null,
      primaryNodeId: parsed.primaryNodeId,
      ownerUserId: parsed.ownerUserId || null,
    },
    select: { id: true },
  });

  return { success: true as const };
}

export async function deleteOrgAdminKpi(data: { kpiId: string }) {
  const session = await requireOrgAdmin();
  const parsed = z.object({ kpiId: z.string().uuid() }).safeParse(data);
  if (!parsed.success) return { success: false as const, error: "Validation failed", issues: zodIssues(parsed.error) };

  const existing = await prismaKpiDefinition.findFirst<{ id: string }>({
    where: { id: parsed.data.kpiId, orgId: session.user.orgId },
    select: { id: true },
  });

  if (!existing) return { success: false as const, error: "KPI not found." };

  await prismaKpiDefinition.delete({
    where: { id: parsed.data.kpiId },
  });

  return { success: true as const };
}

export async function getOrgAdminKpiEditData(input: { kpiId: string }) {
  const session = await requireOrgAdmin();
  const parsed = z.object({ kpiId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return null;

  const kpi = await prismaKpiDefinition.findFirst<{
    id: string;
    name: string;
    description: string | null;
    formula: string | null;
    unit: string | null;
    direction: KpiDirection;
    aggregation: KpiAggregationMethod;
    periodType: KpiPeriodType;
    baselineValue: number | null;
    targetValue: number | null;
    primaryNodeId: string;
    ownerUserId: string | null;
    variables: Array<{
      id: string;
      code: string;
      displayName: string;
      dataType: KpiVariableDataType;
      isRequired: boolean;
      isStatic: boolean;
      staticValue: number | null;
    }>;
  }>({
    where: { id: parsed.data.kpiId, orgId: session.user.orgId },
    select: {
      id: true,
      name: true,
      description: true,
      formula: true,
      unit: true,
      direction: true,
      aggregation: true,
      periodType: true,
      baselineValue: true,
      targetValue: true,
      primaryNodeId: true,
      ownerUserId: true,
      variables: {
        orderBy: [{ displayName: "asc" }],
        select: {
          id: true,
          code: true,
          displayName: true,
          dataType: true,
          isRequired: true,
          isStatic: true,
          staticValue: true,
        },
      },
    },
  });

  return kpi;
}

export async function getOrgKpiViewPermissions() {
  const session = await requireOrgMember();
  return { role: session.user.role as Role, orgId: session.user.orgId };
}
