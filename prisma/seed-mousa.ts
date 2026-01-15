import { readFile } from "node:fs/promises";
import path from "node:path";
import { KpiApprovalLevel, KpiDirection, KpiPeriodType, KpiSourceType, KpiValueStatus, KpiVariableDataType, PrismaClient, Role, Status, KpiAggregationMethod } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

type SeedFile<T> = {
  entityType: string;
  version: string;
  data: T[];
};

type KpiSeedRow = {
  id: string;
  initiativeId: string | null;
  objectiveId: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  unit?: string;
  targetValue?: number;
  currentValue?: number;
  baselineValue?: number;
  frequency?: string;
  dataSource?: string;
  ownerDepartmentId?: string;
  isActive?: boolean;
  formula?: string;
  achievementFormula?: string;
};

type InitiativeSeedRow = {
  id: string;
  objectiveId: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  status?: string;
  progress?: number;
  isActive?: boolean;
};

type DepartmentSeedRow = {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  code?: string;
  parentId?: string | null;
  level?: number;
  headName?: string;
  headEmail?: string;
  employeeCount?: number;
  isActive?: boolean;
  relatedPillars?: string[];
  relatedObjectives?: string[];
};

type ObjectiveSeedRow = {
  id: string;
  pillarId: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  weight?: number;
  isActive?: boolean;
};

type PillarSeedRow = {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  order?: number;
  weight?: number;
  isActive?: boolean;
};

async function readSeedJson<T>(filename: string): Promise<SeedFile<T>> {
  const filePath = path.join(process.cwd(), "data", filename);
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as SeedFile<T>;
}

function normalizeKey(key: string) {
  return String(key ?? "").trim().toUpperCase();
}

function toEntityKey(prefix: string, id: string) {
  const raw = String(id ?? "");
  const lowerPrefix = `${prefix.toLowerCase()}-`;
  const stripped = raw.toLowerCase().startsWith(lowerPrefix) ? raw.slice(lowerPrefix.length) : raw;
  const normalized = stripped
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  return `${prefix.toUpperCase()}_${normalized}`;
}

function mapPeriodTypeFromFrequency(raw: string | undefined): KpiPeriodType {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "quarterly") return KpiPeriodType.QUARTERLY;
  if (v === "yearly") return KpiPeriodType.YEARLY;
  return KpiPeriodType.MONTHLY;
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

function mapStatus(raw: string | undefined, fallback: Status) {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "completed") return Status.COMPLETED;
  if (v === "planned") return Status.PLANNED;
  if (v === "at_risk") return Status.AT_RISK;
  if (v === "active" || v === "in_progress") return Status.ACTIVE;
  return fallback;
}

function safeNumber(n: unknown) {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : null;
}

function progressPercent(current: number | null, target: number | null) {
  if (typeof current !== "number" || !Number.isFinite(current)) return 0;
  if (typeof target !== "number" || !Number.isFinite(target) || target === 0) return 0;
  return (current / target) * 100;
}

function weightedAverage(items: Array<{ value: number; weight?: number | null }>) {
  let sumW = 0;
  let sum = 0;
  for (const i of items) {
    const w = typeof i.weight === "number" && Number.isFinite(i.weight) ? i.weight : 1;
    sumW += w;
    sum += i.value * w;
  }
  return sumW > 0 ? sum / sumW : 0;
}

function evaluateAchievementFormula(input: { achievementFormula?: string; baselineValue: number | null; currentValue: number | null; targetValue: number | null }) {
  const raw = String(input.achievementFormula ?? "").trim();
  if (!raw) return null;

  const body = /\breturn\b/.test(raw) ? raw : `return (${raw});`;
  try {
    const result = Function(
      "baselineValue",
      "currentValue",
      "targetValue",
      `"use strict";\n${body}`,
    )(input.baselineValue ?? 0, input.currentValue ?? 0, input.targetValue ?? 0);
    const num = typeof result === "number" && Number.isFinite(result) ? result : NaN;
    return Number.isFinite(num) ? num : null;
  } catch {
    return null;
  }
}

async function wipeDatabase() {
  console.log("🗑️  Wiping database...");
  await prisma.entityVariableValue.deleteMany();
  await prisma.entityValuePeriod.deleteMany();
  await prisma.entityVariable.deleteMany();
  await prisma.userEntityAssignment.deleteMany();
  await prisma.entity.deleteMany();
  await prisma.changeApproval.deleteMany();
  await prisma.changeRequest.deleteMany();
  await prisma.userPreference.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();
  await prisma.orgEntityType.deleteMany();
  await prisma.organization.deleteMany();
  console.log("✅ Database wiped");
}

function extractGetKeys(code: string) {
  const keys: string[] = [];
  const re = /get\(\s*["']([^"']+)["']\s*\)/g;
  for (const match of code.matchAll(re)) {
    const k = normalizeKey(String(match[1] ?? ""));
    if (k) keys.push(k);
  }
  return Array.from(new Set(keys));
}

function extractVariableNames(formula: string): string[] {
  // Remove return statement, spaces, and common operators to get variable names
  const cleaned = formula
    .replace(/\breturn\b/g, '')
    .replace(/\bconst\b/g, '')
    .replace(/\blet\b/g, '')
    .replace(/\bvar\b/g, '');
  
  // Match JavaScript identifiers (variable names)
  const identifierPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  const matches = Array.from(cleaned.matchAll(identifierPattern));
  
  // Filter out JavaScript keywords and common function names
  const jsKeywords = new Set([
    'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break',
    'continue', 'function', 'var', 'let', 'const', 'true', 'false', 'null',
    'undefined', 'this', 'new', 'typeof', 'instanceof', 'get', 'Math', 'Number',
    'String', 'Boolean', 'Array', 'Object', 'Date', 'console', 'log'
  ]);
  
  const variables = matches
    .map(m => m[1])
    .filter(v => !jsKeywords.has(v) && v.length > 0);
  
  return Array.from(new Set(variables));
}

function evaluateJs(input: { code: string; get: (key: string) => number }) {
  const raw = String(input.code ?? "").trim();
  if (!raw) return { ok: false as const, error: "emptyFormula" };
  const body = /\breturn\b/.test(raw) ? raw : `return (${raw});`;
  try {
    const result = Function("vars", "get", `"use strict";\n${body}`)({}, input.get);
    const num = typeof result === "number" && Number.isFinite(result) ? result : NaN;
    if (!Number.isFinite(num)) return { ok: false as const, error: "invalidFormulaResult" };
    return { ok: true as const, value: num };
  } catch {
    return { ok: false as const, error: "failedToEvaluateFormula" };
  }
}

async function main() {
  console.log("🌱 Starting Al-Mousa JSON seed...");

  await wipeDatabase();

  const org = await prisma.organization.create({
    data: {
      name: "Musa Bin Abdulaziz Al-Mousa & Sons Holding Group",
      nameAr: "مجموعة موسى بن عبدالعزيز الموسى وأولاده القابضة",
      domain: "almousa.local",
      kpiApprovalLevel: KpiApprovalLevel.MANAGER,
      mission: "We invest in vital sectors with economic impact to create sustainable value that embodies the Group's efficiency and leadership.",
      missionAr: "نستثمر في القطاعات الحيوية ذات الأثر الاقتصادي لخلق قيمة مستدامة تجسد كفاءة المجموعة وريادتها",
      vision: "An ambitious investment group with efficiency that builds growth sustainability in vital sectors.",
      visionAr: "مجموعة استثمارية طموحة ذات كفاءه تبني استدامة النمو في قطاعات حيوية",
      contacts: { email: "info@almousa.local", phone: "+966 11 000 0000" },
    },
  });

  const etPillar = await prisma.orgEntityType.create({
    data: { orgId: org.id, code: "PILLAR", name: "Pillar", nameAr: "ركيزة", sortOrder: 1 },
  });

  const etObjective = await prisma.orgEntityType.create({
    data: { orgId: org.id, code: "OBJECTIVE", name: "Objective", nameAr: "هدف استراتيجي", sortOrder: 2 },
  });

  const etDepartment = await prisma.orgEntityType.create({
    data: { orgId: org.id, code: "DEPARTMENT", name: "Department", nameAr: "قسم", sortOrder: 3 },
  });

  const etInitiative = await prisma.orgEntityType.create({
    data: { orgId: org.id, code: "INITIATIVE", name: "Initiative", nameAr: "مبادرة", sortOrder: 4 },
  });

  const etKPI = await prisma.orgEntityType.create({
    data: { orgId: org.id, code: "KPI", name: "KPI", nameAr: "مؤشر أداء", sortOrder: 5 },
  });

  const defaultPassword = "password123";
  const hashedPassword = await hashPassword(defaultPassword);

  const ceo = await prisma.user.create({
    data: {
      email: "ceo@almousa.local",
      name: "عبدالله الموسى",
      role: Role.EXECUTIVE,
      orgId: org.id,
      title: "Group CEO",
      emailVerified: true,
    },
  });

  await prisma.account.create({
    data: {
      userId: ceo.id,
      accountId: ceo.email,
      providerId: "credential",
      password: hashedPassword,
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: "admin@almousa.local",
      name: "مدير النظام",
      role: Role.ADMIN,
      orgId: org.id,
      managerId: ceo.id,
      title: "Administrator",
      emailVerified: true,
    },
  });

  await prisma.account.create({
    data: {
      userId: admin.id,
      accountId: admin.email,
      providerId: "credential",
      password: hashedPassword,
    },
  });

  const now = new Date();

  const kpisFile = await readSeedJson<KpiSeedRow>("kpis.json");
  const initiativesFile = await readSeedJson<InitiativeSeedRow>("initiatives.json");
  const departmentsFile = await readSeedJson<DepartmentSeedRow>("departments.json");
  const objectivesFile = await readSeedJson<ObjectiveSeedRow>("objectives.json");
  const pillarsFile = await readSeedJson<PillarSeedRow>("pillars.json");

  const kpis = kpisFile.data;
  const initiatives = initiativesFile.data;
  const departments = departmentsFile.data;
  const objectives = objectivesFile.data;
  const pillars = pillarsFile.data;

  console.log("✅ Seeding KPIs...");
  for (const row of kpis) {
    const key = toEntityKey("KPI", row.id);
    const periodType = mapPeriodTypeFromFrequency(row.frequency);
    const baselineValue = safeNumber(row.baselineValue);
    const targetValue = safeNumber(row.targetValue);
    const currentValue = safeNumber(row.currentValue);
    const direction = typeof baselineValue === "number" && typeof targetValue === "number" && targetValue < baselineValue
      ? KpiDirection.DECREASE_IS_GOOD
      : KpiDirection.INCREASE_IS_GOOD;

    const ent = await prisma.entity.create({
      data: {
        orgId: org.id,
        orgEntityTypeId: etKPI.id,
        key,
        title: row.nameEn,
        titleAr: row.nameAr,
        description: row.descriptionEn ?? null,
        descriptionAr: row.descriptionAr ?? null,
        ownerUserId: admin.id,
        status: row.isActive ? Status.ACTIVE : Status.PLANNED,
        sourceType: KpiSourceType.MANUAL,
        periodType,
        unit: row.unit ?? null,
        direction,
        aggregation: KpiAggregationMethod.LAST_VALUE,
        baselineValue: baselineValue ?? null,
        targetValue: targetValue ?? null,
        formula: null,
      },
      select: { id: true, key: true, periodType: true },
    });

    const range = resolvePeriodRange({ now, periodType });
    const achievementValue = evaluateAchievementFormula({
      achievementFormula: row.achievementFormula,
      baselineValue,
      currentValue,
      targetValue,
    });

    await prisma.entityValuePeriod.upsert({
      where: { entity_period_unique: { entityId: ent.id, periodStart: range.start, periodEnd: range.end } },
      create: {
        entityId: ent.id,
        periodStart: range.start,
        periodEnd: range.end,
        actualValue: currentValue,
        calculatedValue: currentValue,
        finalValue: currentValue,
        achievementValue,
        status: KpiValueStatus.DRAFT,
        enteredBy: admin.id,
      },
      update: {
        actualValue: currentValue,
        calculatedValue: currentValue,
        finalValue: currentValue,
        achievementValue,
        status: KpiValueStatus.DRAFT,
        enteredBy: admin.id,
      },
    });
  }

  console.log("✅ Seeding initiatives...");
  for (const row of initiatives) {
    const key = toEntityKey("INIT", row.id);
    const kpiKeys = kpis
      .filter((k) => k.initiativeId === row.id)
      .map((k) => toEntityKey("KPI", k.id));
    const formula = kpiKeys.length
      ? `return (${kpiKeys.map((k) => `get('${k}')`).join(" + ")}) / ${kpiKeys.length};`
      : null;

    const ent = await prisma.entity.create({
      data: {
        orgId: org.id,
        orgEntityTypeId: etInitiative.id,
        key,
        title: row.nameEn,
        titleAr: row.nameAr,
        description: row.descriptionEn ?? null,
        descriptionAr: row.descriptionAr ?? null,
        ownerUserId: admin.id,
        status: mapStatus(row.status, row.isActive ? Status.ACTIVE : Status.PLANNED),
        sourceType: KpiSourceType.CALCULATED,
        periodType: KpiPeriodType.MONTHLY,
        unit: "%",
        direction: KpiDirection.INCREASE_IS_GOOD,
        aggregation: KpiAggregationMethod.LAST_VALUE,
        baselineValue: 0,
        targetValue: 100,
        formula,
      },
      select: { id: true, key: true },
    });
    const range = resolvePeriodRange({ now, periodType: KpiPeriodType.MONTHLY });
    const seedValue = typeof row.progress === "number" && Number.isFinite(row.progress) ? row.progress : 0;
    await prisma.entityValuePeriod.upsert({
      where: { entity_period_unique: { entityId: ent.id, periodStart: range.start, periodEnd: range.end } },
      create: {
        entityId: ent.id,
        periodStart: range.start,
        periodEnd: range.end,
        actualValue: null,
        calculatedValue: seedValue,
        finalValue: seedValue,
        achievementValue: seedValue,
        status: KpiValueStatus.DRAFT,
        enteredBy: admin.id,
      },
      update: {
        actualValue: null,
        calculatedValue: seedValue,
        finalValue: seedValue,
        achievementValue: seedValue,
        status: KpiValueStatus.DRAFT,
        enteredBy: admin.id,
      },
    });
  }

  console.log("✅ Seeding departments...");
  for (const row of departments) {
    const key = toEntityKey("DEPT", row.id);
    const objectiveKeys = (row.relatedObjectives ?? []).map((id) => toEntityKey("OBJ", id));
    const formula = objectiveKeys.length
      ? `return (${objectiveKeys.map((k) => `get('${k}')`).join(" + ")}) / ${objectiveKeys.length};`
      : null;

    const ent = await prisma.entity.create({
      data: {
        orgId: org.id,
        orgEntityTypeId: etDepartment.id,
        key,
        title: row.nameEn,
        titleAr: row.nameAr,
        description: row.descriptionEn ?? null,
        descriptionAr: row.descriptionAr ?? null,
        ownerUserId: admin.id,
        status: row.isActive ? Status.ACTIVE : Status.PLANNED,
        sourceType: KpiSourceType.CALCULATED,
        periodType: KpiPeriodType.MONTHLY,
        unit: "%",
        direction: KpiDirection.INCREASE_IS_GOOD,
        aggregation: KpiAggregationMethod.LAST_VALUE,
        baselineValue: 0,
        targetValue: 100,
        formula,
      },
      select: { id: true, key: true },
    });
    const range = resolvePeriodRange({ now, periodType: KpiPeriodType.MONTHLY });
    await prisma.entityValuePeriod.upsert({
      where: { entity_period_unique: { entityId: ent.id, periodStart: range.start, periodEnd: range.end } },
      create: {
        entityId: ent.id,
        periodStart: range.start,
        periodEnd: range.end,
        actualValue: null,
        calculatedValue: 0,
        finalValue: 0,
        achievementValue: 0,
        status: KpiValueStatus.DRAFT,
        enteredBy: admin.id,
      },
      update: { enteredBy: admin.id },
    });
  }

  console.log("✅ Seeding objectives...");
  for (const row of objectives) {
    const key = toEntityKey("OBJ", row.id);

    const initKeys = initiatives
      .filter((i) => i.objectiveId === row.id)
      .map((i) => toEntityKey("INIT", i.id));

    const seedProgress = progressPercent(safeNumber(row.currentValue), safeNumber(row.targetValue));
    const formula = initKeys.length
      ? `return (${initKeys.map((k) => `get('${k}')`).join(" + ")}) / ${initKeys.length};`
      : null;

    const ent = await prisma.entity.create({
      data: {
        orgId: org.id,
        orgEntityTypeId: etObjective.id,
        key,
        title: row.nameEn,
        titleAr: row.nameAr,
        description: row.descriptionEn ?? null,
        descriptionAr: row.descriptionAr ?? null,
        ownerUserId: admin.id,
        status: row.isActive ? Status.ACTIVE : Status.PLANNED,
        sourceType: KpiSourceType.CALCULATED,
        periodType: KpiPeriodType.MONTHLY,
        unit: "%",
        direction: KpiDirection.INCREASE_IS_GOOD,
        aggregation: KpiAggregationMethod.LAST_VALUE,
        baselineValue: 0,
        targetValue: 100,
        weight: safeNumber(row.weight) ?? null,
        formula,
      },
      select: { id: true, key: true },
    });

    const range = resolvePeriodRange({ now, periodType: KpiPeriodType.MONTHLY });
    await prisma.entityValuePeriod.upsert({
      where: { entity_period_unique: { entityId: ent.id, periodStart: range.start, periodEnd: range.end } },
      create: {
        entityId: ent.id,
        periodStart: range.start,
        periodEnd: range.end,
        actualValue: null,
        calculatedValue: seedProgress,
        finalValue: seedProgress,
        achievementValue: seedProgress,
        status: KpiValueStatus.DRAFT,
        enteredBy: admin.id,
      },
      update: {
        actualValue: null,
        calculatedValue: seedProgress,
        finalValue: seedProgress,
        achievementValue: seedProgress,
        status: KpiValueStatus.DRAFT,
        enteredBy: admin.id,
      },
    });
  }

  console.log("✅ Seeding pillars...");
  for (const row of pillars) {
    const key = toEntityKey("PILLAR", row.id);
    const relatedObjectives = objectives
      .filter((o) => o.pillarId === row.id)
      .map((o) => ({ key: toEntityKey("OBJ", o.id), weight: safeNumber(o.weight) }));

    let formula: string | null = null;
    if (relatedObjectives.length) {
      const numerator = relatedObjectives
        .map((o) => `get('${o.key}') * ${typeof o.weight === "number" && Number.isFinite(o.weight) ? o.weight : 1}`)
        .join(" + ");
      const denom = relatedObjectives.reduce((sum, o) => sum + (typeof o.weight === "number" && Number.isFinite(o.weight) ? o.weight : 1), 0);
      formula = `return (${numerator}) / ${denom};`;
    }

    const ent = await prisma.entity.create({
      data: {
        orgId: org.id,
        orgEntityTypeId: etPillar.id,
        key,
        title: row.nameEn,
        titleAr: row.nameAr,
        description: row.descriptionEn ?? null,
        descriptionAr: row.descriptionAr ?? null,
        ownerUserId: admin.id,
        status: row.isActive ? Status.ACTIVE : Status.PLANNED,
        sourceType: KpiSourceType.CALCULATED,
        periodType: KpiPeriodType.MONTHLY,
        unit: "%",
        direction: KpiDirection.INCREASE_IS_GOOD,
        aggregation: KpiAggregationMethod.LAST_VALUE,
        baselineValue: 0,
        targetValue: 100,
        weight: safeNumber(row.weight) ?? null,
        formula,
      },
      select: { id: true, key: true },
    });

    const range = resolvePeriodRange({ now, periodType: KpiPeriodType.MONTHLY });
    await prisma.entityValuePeriod.upsert({
      where: { entity_period_unique: { entityId: ent.id, periodStart: range.start, periodEnd: range.end } },
      create: {
        entityId: ent.id,
        periodStart: range.start,
        periodEnd: range.end,
        actualValue: null,
        calculatedValue: 0,
        finalValue: 0,
        achievementValue: 0,
        status: KpiValueStatus.DRAFT,
        enteredBy: admin.id,
      },
      update: { enteredBy: admin.id },
    });
  }

  console.log("🧮 Recalculating derived entities...");
  const cacheByKey = new Map<string, number>();
  const visiting = new Set<string>();

  async function computeKeyValue(key: string): Promise<number> {
    const normalized = normalizeKey(key);
    if (!normalized) return 0;
    if (cacheByKey.has(normalized)) return cacheByKey.get(normalized) ?? 0;
    if (visiting.has(normalized)) return 0;

    visiting.add(normalized);

    const ent = await prisma.entity.findFirst({
      where: { orgId: org.id, deletedAt: null, key: { equals: normalized, mode: "insensitive" } },
      select: {
        id: true,
        key: true,
        orgEntityType: { select: { code: true } },
        formula: true,
        values: {
          orderBy: [{ periodEnd: "desc" }],
          take: 1,
          select: { actualValue: true, calculatedValue: true, finalValue: true, achievementValue: true },
        },
      },
    });

    if (!ent) {
      cacheByKey.set(normalized, 0);
      visiting.delete(normalized);
      return 0;
    }

    const latest = ent.values?.[0] ?? null;

    // When rolling up progress, prefer KPI achievement percent if present.
    const isKpi = String(ent.orgEntityType?.code ?? "").toUpperCase() === "KPI";
    const kpiAchievement = isKpi && typeof latest?.achievementValue === "number" ? Number(latest.achievementValue) : null;

    const stored =
      typeof kpiAchievement === "number"
        ? kpiAchievement
        : typeof latest?.finalValue === "number"
        ? Number(latest.finalValue)
        : typeof latest?.calculatedValue === "number"
          ? Number(latest.calculatedValue)
          : typeof latest?.actualValue === "number"
            ? Number(latest.actualValue)
            : 0;

    const formulaRaw = ent.formula?.trim() ? String(ent.formula).trim() : "";
    if (!formulaRaw) {
      cacheByKey.set(normalized, stored);
      visiting.delete(normalized);
      return stored;
    }

    const deps = extractGetKeys(formulaRaw);
    const depValues: Record<string, number> = {};
    for (const d of deps) depValues[d] = await computeKeyValue(d);

    const res = evaluateJs({
      code: formulaRaw,
      get: (k: string) => depValues[normalizeKey(String(k ?? ""))] ?? 0,
    });

    const computed = res.ok ? res.value : stored;
    cacheByKey.set(normalized, computed);
    visiting.delete(normalized);
    return computed;
  }

  const range = resolvePeriodRange({ now, periodType: KpiPeriodType.MONTHLY });
  const nonKpiEntities = await prisma.entity.findMany({
    where: {
      orgId: org.id,
      deletedAt: null,
      orgEntityType: { code: { in: ["INITIATIVE", "DEPARTMENT", "OBJECTIVE", "PILLAR"] } },
    },
    select: { id: true, key: true },
  });

  for (const e of nonKpiEntities) {
    const key = normalizeKey(String(e.key ?? ""));
    if (!key) continue;
    const value = await computeKeyValue(key);
    await prisma.entityValuePeriod.upsert({
      where: { entity_period_unique: { entityId: e.id, periodStart: range.start, periodEnd: range.end } },
      create: {
        entityId: e.id,
        periodStart: range.start,
        periodEnd: range.end,
        actualValue: null,
        calculatedValue: value,
        finalValue: value,
        achievementValue: value,
        status: KpiValueStatus.DRAFT,
        enteredBy: admin.id,
      },
      update: {
        actualValue: null,
        calculatedValue: value,
        finalValue: value,
        achievementValue: value,
        status: KpiValueStatus.DRAFT,
        enteredBy: admin.id,
      },
    });
  }

  console.log("🎉 Al-Mousa JSON seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
