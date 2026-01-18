"use server";

import { headers } from "next/headers";
import { z } from "zod";
import {
  KpiAggregationMethod,
  KpiDirection,
  KpiPeriodType,
  KpiSourceType,
  KpiVariableDataType,
  KpiValueStatus,
  Role,
  Status,
} from "@/generated/prisma-client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ActionValidationIssue } from "@/types/actions";
import { getUserReadableEntityIds, getEntityAccess, canEditEntityValues, type EntityAccess } from "@/lib/permissions";
import { resolveRoleRank } from "@/lib/roles";

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
    throw new Error("unauthorized");
  }

  if (!session.user.orgId) {
    throw new Error("unauthorizedMissingOrg");
  }

  return session;
}

async function requireOrgAdmin() {
  const session = await requireOrgMember();
  if (session.user.role !== "ADMIN") {
    throw new Error("unauthorizedAdminRequired");
  }
  return session;
}


function evaluateFormula(input: { formula: string; valuesByCode: Record<string, number> }) {
  const trimmed = input.formula.trim();
  if (!trimmed) return { ok: false as const, error: "emptyFormula" };

  const replaced = trimmed.replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, (token) => {
    if (Object.prototype.hasOwnProperty.call(input.valuesByCode, token)) {
      return String(input.valuesByCode[token] ?? 0);
    }
    return "0";
  });

  if (!/^[0-9+\-*/().\s]+$/.test(replaced)) {
    return { ok: false as const, error: "unsupportedFormulaCharacters" };
  }

  try {
    const result = Function(`"use strict"; return (${replaced});`)();
    const num = typeof result === "number" && Number.isFinite(result) ? result : NaN;
    if (!Number.isFinite(num)) {
      return { ok: false as const, error: "invalidFormulaResult" };
    }
    return { ok: true as const, value: num };
  } catch {
    return { ok: false as const, error: "failedToEvaluateFormula" };
  }
}

function normalizeEntityKey(key: string) {
  return String(key ?? "").trim().toUpperCase();
}

function normalizeVarName(input: string) {
  return String(input ?? "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toUpperCase();
}

function extractJsIdentifiers(code: string): string[] {
  const raw = String(code ?? "");
  const declared = new Set<string>();
  for (const m of raw.matchAll(/\b(?:const|let|var|function)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g)) {
    if (m[1]) declared.add(String(m[1]));
  }

  const keywords = new Set([
    "return",
    "if",
    "else",
    "for",
    "while",
    "do",
    "switch",
    "case",
    "break",
    "continue",
    "function",
    "var",
    "let",
    "const",
    "true",
    "false",
    "null",
    "undefined",
    "this",
    "new",
    "typeof",
    "instanceof",
    "get",
    "vars",
    "Math",
    "Number",
    "String",
    "Boolean",
    "Array",
    "Object",
    "Date",
    "console",
  ]);

  const ids: string[] = [];
  for (const m of raw.matchAll(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g)) {
    const id = String(m[1] ?? "");
    if (!id) continue;
    if (keywords.has(id)) continue;
    if (declared.has(id)) continue;
    ids.push(id);
  }

  return Array.from(new Set(ids));
}

function evaluateJsFormula(input: { code: string; vars: Record<string, number>; get: (key: string) => number }) {
  const raw = input.code.trim();
  if (!raw) return { ok: false as const, error: "emptyFormula" };

  const body = /\breturn\b/.test(raw) ? raw : `return (${raw});`;

  const vars = input.vars ?? {};
  const varsObj: Record<string, number> = {};
  const byNormalized = new Map<string, number>();
  for (const [k, v] of Object.entries(vars)) {
    const num = typeof v === "number" && Number.isFinite(v) ? v : 0;
    const n = normalizeVarName(k);
    byNormalized.set(n, num);
    // Keep multiple aliases to reduce case/format mismatches across formulas
    varsObj[String(k)] = num;
    varsObj[n] = num;
    varsObj[String(k).toLowerCase()] = num;
  }

  const varsProxy = new Proxy(varsObj, {
    get(target, prop) {
      if (typeof prop !== "string") return (target as unknown as Record<string, unknown>)[prop as unknown as string];
      if (prop in target) return target[prop];
      const n = normalizeVarName(prop);
      if (n in target) return target[n];
      if (byNormalized.has(n)) return byNormalized.get(n) ?? 0;
      return 0;
    },
  });

  const helperFns = {
    sum: (...args: number[]) => args.reduce((a, b) => a + b, 0),
    avg: (...args: number[]) => args.length > 0 ? args.reduce((a, b) => a + b, 0) / args.length : 0,
    min: Math.min,
    max: Math.max,
    abs: Math.abs,
  };

  const identifiers = extractJsIdentifiers(body);
  const params: string[] = ["vars"];
  const args: unknown[] = [varsProxy];

  for (const id of identifiers) {
    const helperCallRe = new RegExp(`\\b${id}\\s*\\(`);
    const isHelperCall = helperCallRe.test(body);

    if (id in helperFns && isHelperCall) {
      params.push(id);
      args.push(helperFns[id as keyof typeof helperFns]);
      continue;
    }

    const direct = vars[id];
    const norm = normalizeVarName(id);
    const mapped = byNormalized.has(norm) ? byNormalized.get(norm) : undefined;
    const value = typeof direct === "number" && Number.isFinite(direct) ? direct : typeof mapped === "number" && Number.isFinite(mapped) ? mapped : 0;
    params.push(id);
    args.push(value);
  }

  params.push("get");
  args.push(input.get);

  try {
    const result = Function(...params, `"use strict";\n${body}`)(...args);
    const num = typeof result === "number" && Number.isFinite(result) ? result : NaN;
    if (!Number.isFinite(num)) {
      return { ok: false as const, error: "invalidFormulaResult" };
    }
    return { ok: true as const, value: num };
  } catch {
    return { ok: false as const, error: "failedToEvaluateFormula" };
  }
}

function extractGetKeys(code: string) {
  const keys: string[] = [];
  const re = /get\(\s*["']([^"']+)["']\s*\)/g;
  for (const match of code.matchAll(re)) {
    const key = normalizeEntityKey(String(match[1] ?? ""));
    if (key) keys.push(key);
  }
  return Array.from(new Set(keys));
}

async function getLatestEntityNumericValuesByKeys(input: { orgId: string; keys: string[] }) {
  const keys = (input.keys ?? []).map((k) => normalizeEntityKey(String(k ?? ""))).filter(Boolean);
  if (keys.length === 0) return {} as Record<string, number>;

  const rows = await prisma.entity.findMany({
    where: {
      orgId: input.orgId,
      deletedAt: null,
      key: { in: keys, mode: "insensitive" as const },
    },
    select: {
      key: true,
      periodType: true,
      orgEntityType: { select: { code: true } },
      values: {
        orderBy: [{ createdAt: "desc" }],
        take: 1,
        select: {
          actualValue: true,
          calculatedValue: true,
          finalValue: true,
          achievementValue: true,
        },
      },
    },
  });

  const out: Record<string, number> = {};

  for (const r of rows) {
    const key = normalizeEntityKey(String(r.key ?? ""));
    if (!key) continue;
    if (!r.periodType) {
      out[key] = 0;
      continue;
    }

    const v = r.values?.[0] ?? null;
    const isKpi = String(r.orgEntityType?.code ?? "").toUpperCase() === "KPI";
    const kpiAchievementRaw = isKpi && typeof v?.achievementValue === "number" ? Number(v.achievementValue) : null;
    const kpiAchievement = typeof kpiAchievementRaw === "number" && Number.isFinite(kpiAchievementRaw)
      ? Math.max(0, Math.min(100, kpiAchievementRaw))
      : null;
    const value =
      typeof kpiAchievement === "number"
        ? kpiAchievement
        : typeof v?.finalValue === "number"
          ? Number(v.finalValue)
          : typeof v?.calculatedValue === "number"
            ? Number(v.calculatedValue)
            : typeof v?.actualValue === "number"
              ? Number(v.actualValue)
              : 0;
    out[key] = Number.isFinite(value) ? value : 0;
  }

  return out;
}

async function evaluateEntityFormulaForOrg(input: {
  orgId: string;
  formula: string;
  vars: Record<string, number>;
}): Promise<{ ok: true; value: number } | { ok: false; error: string }> {
  const formula = String(input.formula ?? "").trim();
  if (!formula) return { ok: false as const, error: "emptyFormula" };

  const likelyJs = /\breturn\b|\bconst\b|\blet\b|\bvars\.|\bget\s*\(/.test(formula);
  if (likelyJs) {
    const keys = extractGetKeys(formula);
    const refsByKey = await getLatestEntityNumericValuesByKeys({
      orgId: input.orgId,
      keys,
    });

    const res = evaluateJsFormula({
      code: formula,
      vars: input.vars,
      get: (key: string) => refsByKey[normalizeEntityKey(String(key ?? ""))] ?? 0,
    });

    if (!res.ok) return { ok: false as const, error: res.error };
    return { ok: true as const, value: res.value };
  }

  const res = evaluateFormula({ formula, valuesByCode: input.vars });
  if (!res.ok) return { ok: false as const, error: res.error };
  return { ok: true as const, value: res.value };
}

const testOrgEntityFormulaSchema = z.object({
  formula: z.string().trim().min(1),
  vars: z.record(z.string(), z.preprocess((v) => Number(v), z.number().finite())).optional(),
});

export async function testOrgEntityFormula(input: z.infer<typeof testOrgEntityFormulaSchema>) {
  const session = await requireOrgAdmin();
  const parsed = testOrgEntityFormulaSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "validationFailed", issues: zodIssues(parsed.error) };

  const res = await evaluateEntityFormulaForOrg({
    orgId: session.user.orgId,
    formula: parsed.data.formula,
    vars: parsed.data.vars ?? {},
  });

  if (!res.ok) return { success: false as const, error: res.error };
  return { success: true as const, value: res.value };
}

export async function getOrgEntitiesByKeys(input: { keys: string[] }) {
  const session = await requireOrgMember();
  const orgId = session.user.orgId;
  if (!orgId) return [];

  const normalizedKeys = input.keys.map(k => normalizeEntityKey(k)).filter(Boolean);
  if (normalizedKeys.length === 0) return [];

  const entities = await prisma.entity.findMany({
    where: {
      orgId,
      deletedAt: null,
      key: { in: normalizedKeys, mode: "insensitive" as const },
    },
    include: {
      orgEntityType: {
        select: {
          code: true,
          name: true,
          nameAr: true,
        },
      },
      values: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          actualValue: true,
          calculatedValue: true,
          finalValue: true,
          status: true,
        },
      },
    },
  });

  return entities.map(e => ({
    id: e.id,
    key: e.key,
    title: e.title,
    titleAr: e.titleAr,
    unit: e.unit,
    unitAr: e.unitAr,
    targetValue: e.targetValue,
    entityType: e.orgEntityType,
    latestValue: e.values[0] || null,
  }));
}

async function findDependentEntities(input: { orgId: string; dependsOnKey: string }) {
  const entities = await prisma.entity.findMany({
    where: {
      orgId: input.orgId,
      deletedAt: null,
      formula: { not: null },
    },
    select: {
      id: true,
      key: true,
      formula: true,
      periodType: true,
    },
  });

  const dependsOn = normalizeEntityKey(input.dependsOnKey);

  return entities.filter((e) => {
    if (!e.formula) return false;
    const deps = extractGetKeys(e.formula);
    return deps.includes(dependsOn);
  });
}

const entityTypeCodeSchema = z.string().trim().min(1);

async function getOrgEntityTypeByCode(input: { orgId: string; code: string }) {
  const code = input.code.trim();
  const row = await prisma.orgEntityType.findFirst({
    where: { orgId: input.orgId, code: { equals: code, mode: "insensitive" } },
    select: { id: true, code: true, name: true, nameAr: true, sortOrder: true },
  });
  return row
    ? {
        id: String(row.id),
        code: String(row.code),
        name: String(row.name),
        nameAr: row.nameAr ? String(row.nameAr) : null,
        sortOrder: Number(row.sortOrder ?? 0),
      }
    : null;
}

const getOrgEntitiesByTypeCodeSchema = z.object({
  entityTypeCode: entityTypeCodeSchema,
  q: z.string().trim().min(1).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(300).optional(),
});

export async function getOrgEntitiesByTypeCode(input: z.infer<typeof getOrgEntitiesByTypeCodeSchema>) {
  const session = await requireOrgMember();
  const parsed = getOrgEntitiesByTypeCodeSchema.safeParse(input);
  if (!parsed.success) {
    return { entityType: null, items: [], total: 0, page: 1, pageSize: 24 };
  }

  const page = parsed.data.page ?? 1;
  const pageSize = parsed.data.pageSize ?? 24;
  const q = parsed.data.q;

  const entityType = await getOrgEntityTypeByCode({ orgId: session.user.orgId, code: parsed.data.entityTypeCode });
  if (!entityType) {
    return { entityType: null, items: [], total: 0, page, pageSize };
  }

  const userRole = (session.user as { role?: string }).role;
  const isAdmin = userRole === "ADMIN";

  // Get readable entity IDs for non-admin users
  let readableEntityIds: string[] | undefined;
  if (!isAdmin) {
    readableEntityIds = await getUserReadableEntityIds(session.user.id, session.user.orgId);
    if (readableEntityIds.length === 0) {
      return { entityType, items: [], total: 0, page, pageSize };
    }
  }

  const where = {
    orgId: session.user.orgId,
    orgEntityTypeId: entityType.id,
    deletedAt: null as Date | null,
    ...(!isAdmin && readableEntityIds ? { id: { in: readableEntityIds } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
            { key: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.entity.count({ where }),
    prisma.entity.findMany({
      where,
      orderBy: [{ title: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        key: true,
        title: true,
        titleAr: true,
        description: true,
        descriptionAr: true,
        status: true,
        sourceType: true,
        periodType: true,
        unit: true,
        unitAr: true,
        baselineValue: true,
        targetValue: true,
        updatedAt: true,
        createdAt: true,
        values: {
          orderBy: [{ createdAt: "desc" }],
          take: 1,
          select: {
            createdAt: true,
            status: true,
            actualValue: true,
            calculatedValue: true,
            finalValue: true,
          },
        },
      },
    }),
  ]);

  return {
    entityType,
    items: items.map((e) => ({
      ...e,
      id: String(e.id),
      key: e.key ? String(e.key) : null,
      title: String(e.title),
      titleAr: e.titleAr ? String(e.titleAr) : null,
      description: e.description ? String(e.description) : null,
      descriptionAr: e.descriptionAr ? String(e.descriptionAr) : null,
    })),
    total,
    page,
    pageSize,
  };
}

export async function getOrgOwnerOptions() {
  const session = await requireOrgAdmin();

  const users = await prisma.user.findMany({
    where: { orgId: session.user.orgId, deletedAt: null },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      role: true,
    },
  });

  return users.map((u) => ({
    id: String(u.id),
    name: String(u.name),
    role: u.role as Role,
  }));
}

export async function getOrgFormulaReferenceOptions() {
  const session = await requireOrgAdmin();

  const rows = await prisma.entity.findMany({
    where: { orgId: session.user.orgId, deletedAt: null, key: { not: null } },
    orderBy: [{ title: "asc" }],
    take: 300,
    select: {
      id: true,
      key: true,
      title: true,
      titleAr: true,
      periodType: true,
      orgEntityType: { select: { code: true } },
      values: {
        orderBy: [{ createdAt: "desc" }],
        take: 1,
        select: {
          actualValue: true,
          calculatedValue: true,
          finalValue: true,
          achievementValue: true,
        },
      },
    },
  });

  return rows
    .map((r) => {
      const v = r.values?.[0];

      const isKpi = String(r.orgEntityType?.code ?? "").toUpperCase() === "KPI";
      const kpiAchievementRaw = isKpi && typeof v?.achievementValue === "number" ? Number(v.achievementValue) : null;
      const kpiAchievement = typeof kpiAchievementRaw === "number" && Number.isFinite(kpiAchievementRaw)
        ? Math.max(0, Math.min(100, kpiAchievementRaw))
        : null;
      const value =
        typeof kpiAchievement === "number"
          ? kpiAchievement
          : typeof v?.finalValue === "number"
          ? Number(v.finalValue)
          : typeof v?.calculatedValue === "number"
            ? Number(v.calculatedValue)
            : typeof v?.actualValue === "number"
              ? Number(v.actualValue)
              : null;
      return {
        id: String(r.id),
        key: String(r.key ?? "").trim(),
        title: String(r.title),
        titleAr: r.titleAr ? String(r.titleAr) : null,
        value,
      };
    })
    .filter((r) => r.key.length > 0);
}

const uuidSchema = z.string().uuid();

export async function getOrgEntityDetail(input: { entityId: string }) {
  const session = await requireOrgMember();
  const parsed = z.object({ entityId: uuidSchema }).safeParse(input);
  if (!parsed.success) return null;

  // Check if user has access to this entity
  const userRole = (session.user as { role?: string }).role;
  const isAdmin = userRole === "ADMIN";
  
  if (!isAdmin) {
    const access = await getEntityAccess(session.user.id, parsed.data.entityId, session.user.orgId);
    if (!access.canRead) {
      return null; // User doesn't have access
    }
  }

  const entity = await prisma.entity.findFirst({
    where: { id: parsed.data.entityId, orgId: session.user.orgId, deletedAt: null },
    select: {
      id: true,
      key: true,
      title: true,
      titleAr: true,
      description: true,
      descriptionAr: true,
      ownerUserId: true,
      status: true,
      sourceType: true,
      periodType: true,
      unit: true,
      unitAr: true,
      direction: true,
      aggregation: true,
      baselineValue: true,
      targetValue: true,
      weight: true,
      formula: true,
      createdAt: true,
      updatedAt: true,
      orgEntityType: {
        select: { id: true, code: true, name: true, nameAr: true, sortOrder: true },
      },
      variables: {
        orderBy: [{ displayName: "asc" }],
        select: {
          id: true,
          code: true,
          displayName: true,
          nameAr: true,
          dataType: true,
          isRequired: true,
          isStatic: true,
          staticValue: true,
        },
      },
      values: {
        orderBy: [{ createdAt: "desc" }],
        take: 12,
        select: {
          id: true,
          createdAt: true,
          actualValue: true,
          calculatedValue: true,
          finalValue: true,
          status: true,
          note: true,
          submittedAt: true,
          approvedAt: true,
          variableValues: {
            select: {
              entityVariableId: true,
              value: true,
            },
          },
        },
      },
    },
  });

  if (!entity) return null;

  const canAdmin = session.user.role === "ADMIN";
  
  // Get user's access level for this entity
  let userAccess: EntityAccess;
  if (!canAdmin) {
    userAccess = await getEntityAccess(session.user.id, entity.id, session.user.orgId);
  } else {
    // Admin can edit both values AND definition
    userAccess = { canRead: true, canEditValues: true, canEditDefinition: true, reason: "admin" };
  }

  // Get approval context
  const org = await prisma.organization.findFirst({
    where: { id: session.user.orgId, deletedAt: null },
    select: { kpiApprovalLevel: true },
  });
  const orgApprovalLevel = (org?.kpiApprovalLevel as "MANAGER" | "EXECUTIVE" | "ADMIN") ?? "MANAGER";

  const userRoleRank = resolveRoleRank(session.user.role);
  const requiredRoleRank = resolveRoleRank(orgApprovalLevel);
  const canApprove = userRoleRank >= requiredRoleRank;
  
  // Get current assignments if admin
  let assignments: Array<{ userId: string; userName: string; userRole: string }> = [];
  if (canAdmin) {
    const assignmentRecords = await prisma.userEntityAssignment.findMany({
      where: { entityId: entity.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });
    assignments = assignmentRecords.map((a) => ({
      userId: a.user.id,
      userName: a.user.name,
      userRole: String(a.user.role),
    }));
  }
  const latest = (entity.values ?? [])[0] ?? null;

  // For non-periodType entities with formulas, calculate value on-the-fly
  let calculatedPeriod = null;
  if (!entity.periodType && entity.formula && entity.formula.trim()) {
    const res = await evaluateEntityFormulaForOrg({
      orgId: session.user.orgId,
      formula: entity.formula,
      vars: {},
    });

    if (res.ok) {
      calculatedPeriod = {
        id: "calculated",
        createdAt: new Date(),
        actualValue: null,
        calculatedValue: res.value,
        finalValue: res.value,
        status: "DRAFT" as const,
        note: null,
        submittedAt: null,
        approvedAt: null,
        variableValues: [],
      };
    }
  }

  return {
    entity: {
      id: entity.id,
      key: entity.key,
      title: entity.title,
      titleAr: entity.titleAr,
      description: entity.description,
      descriptionAr: entity.descriptionAr,
      ownerUserId: entity.ownerUserId,
      status: entity.status,
      sourceType: entity.sourceType,
      formula: entity.formula,
      periodType: entity.periodType,
      direction: entity.direction,
      aggregation: entity.aggregation,
      baselineValue: entity.baselineValue,
      targetValue: entity.targetValue,
      weight: entity.weight,
      unit: entity.unit,
      unitAr: entity.unitAr,
      orgEntityType: {
        code: entity.orgEntityType.code,
        name: entity.orgEntityType.name,
        nameAr: entity.orgEntityType.nameAr,
      },
      variables: entity.variables.map((v) => ({
        id: v.id,
        code: String(v.code),
        displayName: String(v.displayName),
        nameAr: v.nameAr,
        isRequired: Boolean(v.isRequired),
        isStatic: Boolean(v.isStatic),
        staticValue: typeof v.staticValue === "number" ? v.staticValue : null,
        dataType: String(v.dataType),
      })),
      values: entity.values.map((val) => ({
        id: val.id,
        createdAt: val.createdAt,
        actualValue: val.actualValue,
        calculatedValue: val.calculatedValue,
        finalValue: val.finalValue,
        status: val.status,
        note: val.note,
        submittedAt: val.submittedAt,
        approvedAt: val.approvedAt,
      })),
    },
    currentPeriod: latest ?? calculatedPeriod,
    latest: latest ?? calculatedPeriod,
    canAdmin,
    userAccess,
    assignments,
    role: session.user.role as Role,
    approvalContext: {
      orgApprovalLevel,
      canApprove,
    },
  };
}

const createOrgEntitySchema = z.object({
  entityTypeCode: entityTypeCodeSchema,
  title: z.string().trim().min(1),
  titleAr: z.string().trim().optional(),
  key: z.string().trim().optional(),
  description: z.string().trim().optional(),
  descriptionAr: z.string().trim().optional(),

  ownerUserId: z.string().uuid().optional(),

  status: z.nativeEnum(Status).optional(),

  sourceType: z.nativeEnum(KpiSourceType).optional(),
  periodType: z.nativeEnum(KpiPeriodType).nullable().optional(),
  unit: z.string().trim().optional(),
  unitAr: z.string().trim().optional(),

  direction: z.nativeEnum(KpiDirection).optional(),
  aggregation: z.nativeEnum(KpiAggregationMethod).optional(),

  baselineValue: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
    z.number().finite().optional(),
  ),
  targetValue: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
    z.number().finite().optional(),
  ),

  weight: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
    z.number().finite().optional(),
  ),

  formula: z.string().trim().optional(),

  variables: z
    .array(
      z.object({
        code: z.string().trim().min(1),
        displayName: z.string().trim().min(1),
        nameAr: z.string().trim().optional(),
        dataType: z.nativeEnum(KpiVariableDataType).optional(),
        isRequired: z.boolean().optional(),
        isStatic: z.boolean().optional(),
        staticValue: z.preprocess(
          (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
          z.number().finite().optional(),
        ),
      }),
    )
    .optional(),
});

export async function createOrgEntity(input: z.infer<typeof createOrgEntitySchema>) {
  const session = await requireOrgAdmin();
  const parsed = createOrgEntitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "validationFailed", issues: zodIssues(parsed.error) };
  }

  const entityType = await getOrgEntityTypeByCode({ orgId: session.user.orgId, code: parsed.data.entityTypeCode });
  if (!entityType) {
    return { success: false as const, error: "notFound" };
  }

  const code = entityType.code.toLowerCase();
  const isKpi = code === "kpi";

  if (parsed.data.ownerUserId) {
    const owner = await prisma.user.findFirst({
      where: { id: parsed.data.ownerUserId, orgId: session.user.orgId, deletedAt: null },
      select: { id: true },
    });
    if (!owner) {
      return { success: false as const, error: "ownerNotFound" };
    }
  }

  try {
    const sourceType = parsed.data.sourceType ?? (isKpi ? KpiSourceType.CALCULATED : KpiSourceType.MANUAL);
    const periodType = typeof parsed.data.periodType === "undefined" ? (isKpi ? KpiPeriodType.MONTHLY : null) : parsed.data.periodType;
    const formula = typeof parsed.data.formula === "undefined" ? null : (parsed.data.formula.trim() ? parsed.data.formula.trim() : null);

    const created = await prisma.entity.create({
      data: {
        orgId: session.user.orgId,
        orgEntityTypeId: entityType.id,
        key: parsed.data.key?.trim() ? parsed.data.key.trim() : null,
        title: parsed.data.title.trim(),
        titleAr: parsed.data.titleAr?.trim() ? parsed.data.titleAr.trim() : null,
        description: parsed.data.description?.trim() ? parsed.data.description.trim() : null,
        descriptionAr: parsed.data.descriptionAr?.trim() ? parsed.data.descriptionAr.trim() : null,

        ownerUserId: parsed.data.ownerUserId ?? null,

        status: parsed.data.status ?? Status.PLANNED,

        sourceType,
        periodType,
        unit: parsed.data.unit?.trim() ? parsed.data.unit.trim() : null,
        unitAr: parsed.data.unitAr?.trim() ? parsed.data.unitAr.trim() : null,
        direction: parsed.data.direction ?? KpiDirection.INCREASE_IS_GOOD,
        aggregation: parsed.data.aggregation ?? KpiAggregationMethod.LAST_VALUE,
        baselineValue: typeof parsed.data.baselineValue === "undefined" ? null : parsed.data.baselineValue,
        targetValue: typeof parsed.data.targetValue === "undefined" ? null : parsed.data.targetValue,
        weight: typeof parsed.data.weight === "undefined" ? null : parsed.data.weight,
        formula,

        variables:
          parsed.data.variables && parsed.data.variables.length
            ? {
                create: parsed.data.variables.map((v) => ({
                  code: v.code.trim(),
                  displayName: v.displayName.trim(),
                  nameAr: v.nameAr?.trim() ? v.nameAr.trim() : null,
                  dataType: v.dataType ?? KpiVariableDataType.NUMBER,
                  isRequired: Boolean(v.isRequired),
                  isStatic: Boolean(v.isStatic),
                  staticValue: typeof v.staticValue === "number" ? v.staticValue : null,
                })),
              }
            : undefined,
      },
      select: { id: true },
    });

    const hasGetCalls = formula && /\bget\s*\(/.test(formula);
    if (hasGetCalls && periodType) {
      console.log(`[createOrgEntity] Auto-calculating initial value for entity: ${created.id}`);
      try {
        const calcResult = await saveOrgEntityKpiValuesDraft({
          entityId: created.id,
          values: {},
        });
        if (!calcResult.success) {
          console.error("[createOrgEntity] Auto-calculation failed:", calcResult.error);
        } else {
          console.log("[createOrgEntity] Auto-calculation succeeded for entity:", created.id);
        }
      } catch (calcError) {
        console.error("[createOrgEntity] Failed to auto-calculate initial value:", calcError);
      }
    }

    return { success: true as const, entityId: String(created.id) };
  } catch (error: unknown) {
    console.error("Failed to create entity", error);
    const errorMessage = error instanceof Error ? error.message : "failedToCreate";
    return { success: false as const, error: errorMessage };
  }
}

const updateOrgEntitySchema = z.object({
  entityId: uuidSchema,
  title: z.string().trim().min(1).optional(),
  titleAr: z.string().trim().optional(),
  key: z.string().trim().optional(),
  description: z.string().trim().optional(),
  descriptionAr: z.string().trim().optional(),

  ownerUserId: z.string().uuid().nullable().optional(),

  status: z.nativeEnum(Status).optional(),

  sourceType: z.nativeEnum(KpiSourceType).optional(),
  periodType: z.nativeEnum(KpiPeriodType).nullable().optional(),
  unit: z.string().trim().optional(),
  unitAr: z.string().trim().optional(),

  direction: z.nativeEnum(KpiDirection).optional(),
  aggregation: z.nativeEnum(KpiAggregationMethod).optional(),

  baselineValue: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v === null ? null : Number(v)),
    z.number().finite().nullable().optional(),
  ),
  targetValue: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v === null ? null : Number(v)),
    z.number().finite().nullable().optional(),
  ),

  weight: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v === null ? null : Number(v)),
    z.number().finite().nullable().optional(),
  ),

  formula: z.string().trim().nullable().optional(),

  variables: z
    .array(
      z.object({
        code: z.string().trim().min(1),
        displayName: z.string().trim().min(1),
        nameAr: z.string().trim().optional(),
        dataType: z.nativeEnum(KpiVariableDataType).optional(),
        isRequired: z.boolean().optional(),
        isStatic: z.boolean().optional(),
        staticValue: z.preprocess(
          (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
          z.number().finite().optional(),
        ),
      }),
    )
    .optional(),
});

export async function updateOrgEntity(input: z.infer<typeof updateOrgEntitySchema>) {
  const session = await requireOrgAdmin();
  const parsed = updateOrgEntitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "validationFailed", issues: zodIssues(parsed.error) };
  }

  const existing = await prisma.entity.findFirst({
    where: { id: parsed.data.entityId, orgId: session.user.orgId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return { success: false as const, error: "notFound" };

  if (typeof parsed.data.ownerUserId !== "undefined" && parsed.data.ownerUserId !== null) {
    const owner = await prisma.user.findFirst({
      where: { id: parsed.data.ownerUserId, orgId: session.user.orgId, deletedAt: null },
      select: { id: true },
    });
    if (!owner) {
      return { success: false as const, error: "ownerNotFound" };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.entity.update({
        where: { id: existing.id },
        data: {
          ...(typeof parsed.data.title === "string" ? { title: parsed.data.title.trim() } : {}),
          ...(typeof parsed.data.titleAr === "string" ? { titleAr: parsed.data.titleAr.trim() || null } : {}),
          ...(typeof parsed.data.key === "string" ? { key: parsed.data.key.trim() || null } : {}),
          ...(typeof parsed.data.description === "string" ? { description: parsed.data.description.trim() || null } : {}),
          ...(typeof parsed.data.descriptionAr === "string" ? { descriptionAr: parsed.data.descriptionAr.trim() || null } : {}),

          ...(typeof parsed.data.ownerUserId !== "undefined" ? { ownerUserId: parsed.data.ownerUserId } : {}),

          ...(typeof parsed.data.status !== "undefined" ? { status: parsed.data.status } : {}),
          ...(typeof parsed.data.sourceType !== "undefined" ? { sourceType: parsed.data.sourceType } : {}),
          ...(typeof parsed.data.periodType !== "undefined" ? { periodType: parsed.data.periodType } : {}),
          ...(typeof parsed.data.unit !== "undefined" ? { unit: parsed.data.unit.trim() || null } : {}),
          ...(typeof parsed.data.unitAr !== "undefined" ? { unitAr: parsed.data.unitAr.trim() || null } : {}),
          ...(typeof parsed.data.direction !== "undefined" ? { direction: parsed.data.direction } : {}),
          ...(typeof parsed.data.aggregation !== "undefined" ? { aggregation: parsed.data.aggregation } : {}),
          ...(typeof parsed.data.baselineValue !== "undefined" ? { baselineValue: parsed.data.baselineValue } : {}),
          ...(typeof parsed.data.targetValue !== "undefined" ? { targetValue: parsed.data.targetValue } : {}),
          ...(typeof parsed.data.weight !== "undefined" ? { weight: parsed.data.weight } : {}),
          ...(typeof parsed.data.formula !== "undefined" ? { formula: parsed.data.formula && parsed.data.formula.trim() ? parsed.data.formula.trim() : null } : {}),
        },
        select: { id: true },
      });

      if (typeof parsed.data.variables !== "undefined") {
        await tx.entityVariable.deleteMany({
          where: { entityId: existing.id },
        });

        if (parsed.data.variables && parsed.data.variables.length > 0) {
          await tx.entityVariable.createMany({
            data: parsed.data.variables.map((v) => ({
              entityId: existing.id,
              code: v.code.trim(),
              displayName: v.displayName.trim(),
              nameAr: v.nameAr?.trim() ? v.nameAr.trim() : null,
              dataType: v.dataType ?? KpiVariableDataType.NUMBER,
              isRequired: Boolean(v.isRequired),
              isStatic: Boolean(v.isStatic),
              staticValue: typeof v.staticValue === "number" ? v.staticValue : null,
            })),
          });
        }
      }
    });

    return { success: true as const };
  } catch (error: unknown) {
    console.error("Failed to update entity", error);
    const errorMessage = error instanceof Error ? error.message : "failedToUpdate";
    return { success: false as const, error: errorMessage };
  }
}

export async function deleteOrgEntity(input: { entityId: string }) {
  const session = await requireOrgAdmin();
  const parsed = z.object({ entityId: uuidSchema }).safeParse(input);
  if (!parsed.success) return { success: false as const, error: "validationFailed" };

  const existing = await prisma.entity.findFirst({
    where: { id: parsed.data.entityId, orgId: session.user.orgId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return { success: false as const, error: "notFound" };

  try {
    await prisma.entity.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });

    return { success: true as const };
  } catch (error: unknown) {
    console.error("Failed to delete entity", error);
    const errorMessage = error instanceof Error ? error.message : "failedToDelete";
    return { success: false as const, error: errorMessage };
  }
}

const saveOrgEntityKpiValuesDraftSchema = z.object({
  entityId: uuidSchema,
  note: z.string().max(500).optional(),
  manualValue: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
    z.number().finite().optional(),
  ),
  values: z.record(uuidSchema, z.preprocess((v) => Number(v), z.number().finite())),
  skipCascade: z.boolean().optional(),
});

export async function saveOrgEntityKpiValuesDraft(input: z.infer<typeof saveOrgEntityKpiValuesDraftSchema>) {
  const session = await requireOrgMember();
  const parsed = saveOrgEntityKpiValuesDraftSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "validationFailed", issues: zodIssues(parsed.error) };
  }

  // Check if user can edit values (assigned or hierarchical access)
  const userRole = (session.user as { role?: string }).role;
  const isAdmin = userRole === "ADMIN";
  
  if (!isAdmin) {
    const canEditValues = await canEditEntityValues(session.user.id, parsed.data.entityId, session.user.orgId);
    if (!canEditValues) {
      return { success: false as const, error: "unauthorized" };
    }
  }

  const entity = await prisma.entity.findFirst({
    where: { id: parsed.data.entityId, orgId: session.user.orgId, deletedAt: null },
    select: {
      id: true,
      key: true,
      periodType: true,
      formula: true,
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

  if (!entity) return { success: false as const, error: "notFound" };
  if (!entity.periodType) return { success: false as const, error: "notKpi" };

  const issues: ActionValidationIssue[] = [];
  const valuesByCode: Record<string, number> = {};

  for (const v of entity.variables) {
    if (v.isStatic) {
      if (v.isRequired && (v.staticValue === null || typeof v.staticValue === "undefined")) {
        issues.push({ path: ["values", String(v.id)], message: "staticVariableRequired", params: { code: String(v.code) } });
      }
      valuesByCode[String(v.code)] = Number(v.staticValue ?? 0);
      continue;
    }

    const val = parsed.data.values[String(v.id)];
    if (v.isRequired && (val === undefined || Number.isNaN(val))) {
      issues.push({ path: ["values", String(v.id)], message: "variableRequired", params: { code: String(v.code) } });
      continue;
    }

    valuesByCode[String(v.code)] = val !== undefined && Number.isFinite(val) ? Number(val) : 0;
  }

  if (issues.length) {
    return { success: false as const, error: "validationFailed", issues };
  }

  let calculatedValue: number | null = null;
  const hasVariables = entity.variables.length > 0;

  if (entity.formula && entity.formula.trim().length > 0) {
    const trimmed = entity.formula.trim();
    const res = await evaluateEntityFormulaForOrg({
      orgId: session.user.orgId,
      formula: trimmed,
      vars: valuesByCode,
    });

    if (!res.ok) return { success: false as const, error: res.error };
    calculatedValue = res.value;
  } else if (hasVariables) {
    calculatedValue = valuesByCode ? Object.values(valuesByCode).reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0) : 0;
  } else {
    if (typeof parsed.data.manualValue !== "number" || !Number.isFinite(parsed.data.manualValue)) {
      return {
        success: false as const,
        error: "valueIsRequired",
        issues: [{ path: ["manualValue"], message: "valueIsRequired" } satisfies ActionValidationIssue],
      };
    }
    calculatedValue = parsed.data.manualValue;
  }

  const note = parsed.data.note?.trim() ? parsed.data.note.trim() : null;

  try {
    const entityValue = await prisma.entityValue.create({
      data: {
        entityId: entity.id,
        status: KpiValueStatus.DRAFT,
        note,
        enteredBy: session.user.id,
        actualValue: hasVariables ? null : parsed.data.manualValue ?? null,
        calculatedValue,
        finalValue: calculatedValue,
      },
      select: { id: true },
    });

    const fillable = entity.variables.filter((v) => !v.isStatic);
    for (const v of fillable) {
      const value = parsed.data.values[String(v.id)];
      if (value === undefined) continue;

      await prisma.entityVariableValue.create({
        data: {
          entityValueId: entityValue.id,
          entityVariableId: v.id,
          value,
        },
        select: { id: true },
      });
    }

    if (!parsed.data.skipCascade && entity.key) {
      try {
        await cascadeRecalculateDependents({
          orgId: session.user.orgId,
          updatedKey: entity.key,
          maxDepth: 5,
        });
      } catch (cascadeError) {
        console.warn("Failed to cascade recalculate dependents:", cascadeError);
      }
    }

    return { success: true as const };
  } catch (error: unknown) {
    console.error("Failed to save entity KPI values", error);
    const errorMessage = error instanceof Error ? error.message : "failedToSave";
    return { success: false as const, error: errorMessage };
  }
}

const recalculateEntitySchema = z.object({
  entityId: uuidSchema,
});

export async function recalculateEntityValue(input: z.infer<typeof recalculateEntitySchema>) {
  const session = await requireOrgMember();
  const parsed = recalculateEntitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "validationFailed", issues: zodIssues(parsed.error) };
  }

  const entity = await prisma.entity.findFirst({
    where: { id: parsed.data.entityId, orgId: session.user.orgId, deletedAt: null },
    select: {
      id: true,
      key: true,
      periodType: true,
      formula: true,
      variables: {
        select: {
          id: true,
          code: true,
          isStatic: true,
          staticValue: true,
        },
      },
      values: {
        orderBy: [{ createdAt: "desc" }],
        take: 1,
        select: {
          id: true,
          variableValues: {
            select: {
              entityVariableId: true,
              value: true,
            },
          },
        },
      },
    },
  });

  if (!entity) return { success: false as const, error: "notFound" };
  if (!entity.periodType) return { success: false as const, error: "notKpi" };
  if (!entity.formula?.trim()) return { success: false as const, error: "noFormula" };

  const latestValue = entity.values?.[0];
  if (!latestValue) return { success: false as const, error: "noExistingValue" };

  const variableValues: Record<string, number> = {};
  for (const vv of latestValue.variableValues ?? []) {
    variableValues[vv.entityVariableId] = vv.value;
  }

  try {
    const result = await saveOrgEntityKpiValuesDraft({
      entityId: entity.id,
      values: variableValues,
    });

    if (!result.success) {
      return result;
    }

    return { success: true as const };
  } catch (error: unknown) {
    console.error("Failed to recalculate entity value", error);
    const errorMessage = error instanceof Error ? error.message : "failedToRecalculate";
    return { success: false as const, error: errorMessage };
  }
}

async function cascadeRecalculateDependents(input: {
  orgId: string;
  updatedKey: string;
  maxDepth: number;
  _visited?: Set<string>;
  _depth?: number;
}) {
  const visited = input._visited ?? new Set<string>();
  const depth = input._depth ?? 0;
  const updatedKey = normalizeEntityKey(input.updatedKey);

  if (depth >= input.maxDepth) {
    console.warn(`Cascade depth limit reached (${input.maxDepth}), stopping recalculation`);
    return;
  }

  if (visited.has(updatedKey)) {
    console.warn(`Circular dependency detected for key: ${updatedKey}, skipping`);
    return;
  }

  visited.add(updatedKey);

  const dependents = await findDependentEntities({
    orgId: input.orgId,
    dependsOnKey: updatedKey,
  });

  if (dependents.length === 0) {
    return;
  }

  console.log(`Recalculating ${dependents.length} dependent entities for key: ${updatedKey}`);

  for (const dependent of dependents) {
    if (!dependent.key || !dependent.periodType) continue;

    try {
      const existingValue = await prisma.entityValue.findFirst({
        where: {
          entityId: dependent.id,
        },
        orderBy: { createdAt: "desc" },
        select: {
          variableValues: {
            select: {
              entityVariableId: true,
              value: true,
            },
          },
        },
      });

      const variableValues: Record<string, number> = {};
      for (const vv of existingValue?.variableValues ?? []) {
        variableValues[vv.entityVariableId] = vv.value;
      }

      await saveOrgEntityKpiValuesDraft({
        entityId: dependent.id,
        values: variableValues,
        skipCascade: true,
      });

      if (dependent.key) {
        await cascadeRecalculateDependents({
          orgId: input.orgId,
          updatedKey: dependent.key,
          maxDepth: input.maxDepth,
          _visited: visited,
          _depth: depth + 1,
        });
      }
    } catch (err) {
      console.error(`Failed to recalculate dependent entity ${dependent.id}:`, err);
    }
  }
}

export async function getEntityDependencyTree(input: { entityId: string; maxDepth?: number }) {
  const session = await requireOrgMember();
  const orgId = session.user.orgId;
  if (!orgId) return null;

  const maxDepth = input.maxDepth ?? 5;
  const visited = new Set<string>();

  interface EntityNode {
    id: string;
    key: string;
    title: string;
    titleAr: string | null;
    formula: string | null;
    entityType: { code: string; name: string; nameAr: string | null };
    dependencies: EntityNode[];
  }

  async function fetchNode(entityId: string, depth: number): Promise<EntityNode | null> {
    if (depth > maxDepth || visited.has(entityId)) {
      return null;
    }

    visited.add(entityId);

    const entity = await prisma.entity.findFirst({
      where: {
        id: entityId,
        orgId,
        deletedAt: null,
      },
      include: {
        orgEntityType: {
          select: {
            code: true,
            name: true,
            nameAr: true,
          },
        },
      },
    });

    if (!entity) return null;

    const node: EntityNode = {
      id: entity.id,
      key: entity.key ?? entity.id,
      title: entity.title,
      titleAr: entity.titleAr,
      formula: entity.formula,
      entityType: entity.orgEntityType,
      dependencies: [],
    };

    if (entity.formula) {
      const keys = extractGetKeys(entity.formula);
      if (keys.length > 0) {
        const depEntities = await prisma.entity.findMany({
          where: {
            orgId,
            deletedAt: null,
            key: { in: keys },
          },
          select: {
            id: true,
          },
        });

        for (const dep of depEntities) {
          const depNode = await fetchNode(dep.id, depth + 1);
          if (depNode) {
            node.dependencies.push(depNode);
          }
        }
      }
    }

    return node;
  }

  return await fetchNode(input.entityId, 0);
}
