import { PrismaClient, KpiPeriodType, KpiVariableDataType, KpiDirection } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();

type InitiativeData = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  pillarIds?: string[];
  objectiveIds?: string[];
  budget?: number;
  duration?: number;
  owner?: string;
  frequency?: string;
  isActive?: boolean;
  unit?: string;
  targetValue?: number;
  currentValue?: number;
  baselineValue?: number;
  direction?: string;
};

async function readJsonFile<T>(fileName: string): Promise<T> {
  const filePath = path.join(process.cwd(), "data", fileName);
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

function mapPeriodTypeFromFrequency(freq: string | undefined): KpiPeriodType {
  const f = String(freq).toLowerCase();
  if (f.includes("month")) return KpiPeriodType.MONTHLY;
  if (f.includes("quarter")) return KpiPeriodType.QUARTERLY;
  if (f.includes("year")) return KpiPeriodType.YEARLY;
  return KpiPeriodType.MONTHLY;
}

function resolvePeriodRange(periodType: KpiPeriodType): {
  periodStart: Date;
  periodEnd: Date;
  year: number;
  period: number;
} {
  const now = new Date();
  const year = now.getFullYear();
  let period = 1;
  let periodStart: Date;
  let periodEnd: Date;

  if (periodType === KpiPeriodType.MONTHLY) {
    period = now.getMonth() + 1;
    periodStart = new Date(year, period - 1, 1);
    periodEnd = new Date(year, period, 0, 23, 59, 59);
  } else if (periodType === KpiPeriodType.QUARTERLY) {
    period = Math.floor(now.getMonth() / 3) + 1;
    const quarterStartMonth = (period - 1) * 3;
    periodStart = new Date(year, quarterStartMonth, 1);
    periodEnd = new Date(year, quarterStartMonth + 3, 0, 23, 59, 59);
  } else {
    period = 1;
    periodStart = new Date(year, 0, 1);
    periodEnd = new Date(year, 11, 31, 23, 59, 59);
  }

  return { periodStart, periodEnd, year, period };
}

function evaluateJs(input: { code: string; variables: Record<string, number> }) {
  const raw = String(input.code ?? "").trim();
  if (!raw) return { ok: false as const, error: "emptyFormula" };
  const body = /\breturn\b/.test(raw) ? raw : `return (${raw});`;
  try {
    const abs = Math.abs;
    const sum = (...args: number[]) => args.reduce((a, b) => a + b, 0);
    const avg = (...args: number[]) => args.length > 0 ? sum(...args) / args.length : 0;
    const min = Math.min;
    const max = Math.max;
    
    const varNames = Object.keys(input.variables);
    const varValues = Object.values(input.variables);
    const params = [...varNames, "abs", "sum", "avg", "min", "max"];
    const args = [...varValues, abs, sum, avg, min, max];
    
    const func = Function(...params, `"use strict";\n${body}`);
    const result = func(...args);
    const num = typeof result === "number" && Number.isFinite(result) ? result : NaN;
    if (!Number.isFinite(num)) return { ok: false as const, error: "invalidFormulaResult" };
    return { ok: true as const, value: num };
  } catch (error) {
    return { ok: false as const, error: "failedToEvaluateFormula", details: String(error) };
  }
}

function evaluateAchievementFormula(input: {
  achievementFormula?: string;
  baselineValue: number | null;
  currentValue: number | null;
  targetValue: number | null;
}) {
  const raw = String(input.achievementFormula ?? "").trim();
  if (!raw) return null;

  const body = /\breturn\b/.test(raw) ? raw : `return (${raw});`;
  try {
    const result = Function(
      "baselineValue",
      "currentValue",
      "targetValue",
      `"use strict";\n${body}`
    )(input.baselineValue, input.currentValue, input.targetValue);
    return typeof result === "number" && Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

async function main() {
  console.log("🚀 Seeding Al-Mousa Initiatives...\n");

  // Get organization and entity type
  const org = await prisma.organization.findFirst();
  if (!org) {
    throw new Error("No organization found");
  }

  let initiativeType = await prisma.orgEntityType.findFirst({
    where: { orgId: org.id, code: "INITIATIVE" },
  });

  if (!initiativeType) {
    console.log("📝 Creating INITIATIVE entity type...");
    initiativeType = await prisma.orgEntityType.create({
      data: {
        orgId: org.id,
        code: "INITIATIVE",
        name: "Initiative",
        nameAr: "مبادرة",
        sortOrder: 20,
      },
    });
  }

  // Read initiatives data
  const initiativesFile = await readJsonFile<{ data: InitiativeData[] }>("initiatives-almousa.json");
  const initiatives = initiativesFile.data;

  console.log(`📋 Found ${initiatives.length} initiatives to seed\n`);

  let successCount = 0;

  for (const row of initiatives) {
    console.log(`\n📊 Creating Initiative: ${row.nameEn} (${row.code})`);

    const targetValue = row.targetValue ?? null;
    const baselineValue = row.baselineValue ?? null;
    const periodType = mapPeriodTypeFromFrequency(row.frequency);
    const { periodStart, periodEnd } = resolvePeriodRange(periodType);

    // Calculate realistic current value (progress between baseline and target)
    // Start initiatives at 20-40% completion
    const progressPercent = 0.2 + (Math.random() * 0.2); // 20-40%
    const currentValue = baselineValue !== null && targetValue !== null
      ? baselineValue + ((targetValue - baselineValue) * progressPercent)
      : row.currentValue ?? 25;

    console.log(`   Target: ${targetValue}% | Baseline: ${baselineValue}% | Current: ${currentValue.toFixed(1)}%`);
    console.log(`   Progress: ~${(progressPercent * 100).toFixed(0)}% toward target`)

    // Create initiative entity (manual tracking, no formulas)
    const ent = await prisma.entity.create({
      data: {
        orgId: org.id,
        orgEntityTypeId: initiativeType.id,
        key: row.code,
        title: row.nameEn,
        titleAr: row.nameAr || row.nameEn,
        description: row.descriptionEn,
        descriptionAr: row.descriptionAr,
        unit: row.unit || "%",
        targetValue: targetValue,
        baselineValue: baselineValue,
        periodType: periodType,
        direction: row.direction === "INCREASE_IS_GOOD" ? KpiDirection.INCREASE_IS_GOOD : KpiDirection.DECREASE_IS_GOOD,
        formula: null, // No formula - initiatives track manual completion %
      },
    });

    // Calculate achievement based on current progress
    const finalValue = currentValue;
    let achievementValue: number | null = null;

    if (finalValue !== null && targetValue !== null && baselineValue !== null) {
      if (row.direction === "INCREASE_IS_GOOD") {
        achievementValue = ((finalValue - baselineValue) / (targetValue - baselineValue)) * 100;
      } else {
        achievementValue = ((baselineValue - finalValue) / (baselineValue - targetValue)) * 100;
      }
      achievementValue = Math.max(0, Math.min(150, achievementValue)); // Cap at 150%
      console.log(`   Achievement: ${achievementValue.toFixed(1)}%`);
    }

    // Create initiative value record with manual entry
    await prisma.entityValuePeriod.create({
      data: {
        entityId: ent.id,
        periodStart,
        periodEnd,
        actualValue: finalValue,
        calculatedValue: null,
        finalValue: finalValue,
        achievementValue: achievementValue,
        status: "SUBMITTED",
      },
    });

    console.log(`   ✅ Initiative created successfully`);
    successCount++;
  }

  console.log(`\n🎉 Al-Mousa Initiative seed completed!`);
  console.log(`   ✅ Success: ${successCount} initiatives`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
