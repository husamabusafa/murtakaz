import { readFile } from "node:fs/promises";
import path from "node:path";
import { KpiDirection, KpiSourceType, KpiValueStatus, KpiVariableDataType, PrismaClient, Role, Status, KpiAggregationMethod, KpiPeriodType } from "@prisma/client";
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

async function readSeedJson<T>(filename: string): Promise<SeedFile<T>> {
  const filePath = path.join(process.cwd(), "data", filename);
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as SeedFile<T>;
}

function safeNumber(n: unknown) {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : null;
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

function extractVariableNames(formula: string): string[] {
  const cleaned = formula
    .replace(/\breturn\b/g, '')
    .replace(/\bconst\b/g, '')
    .replace(/\blet\b/g, '')
    .replace(/\bvar\b/g, '');
  
  const identifierPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  const matches = Array.from(cleaned.matchAll(identifierPattern));
  
  const jsKeywords = new Set([
    'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break',
    'continue', 'function', 'var', 'let', 'const', 'true', 'false', 'null',
    'undefined', 'this', 'new', 'typeof', 'instanceof', 'get', 'Math', 'Number',
    'String', 'Boolean', 'Array', 'Object', 'Date', 'console', 'log', 'abs', 'sum'
  ]);
  
  const variables = matches
    .map(m => m[1])
    .filter(v => !jsKeywords.has(v) && v.length > 0);
  
  return Array.from(new Set(variables));
}

function generateSampleValuesForVariables(input: {
  variables: string[];
  targetValue: number | null;
  currentValue: number | null;
  baselineValue: number | null;
  formula: string;
  unit: string | null;
}): Record<string, number> {
  const { variables, targetValue, currentValue, baselineValue, formula, unit } = input;
  const target = targetValue ?? 50;
  const baseline = baselineValue ?? target * 0.8;
  const current = currentValue ?? (baseline + target) / 2;
  const values: Record<string, number> = {};

  if (variables.length === 0) return values;

  const formulaLower = formula.toLowerCase();
  const unitLower = (unit || "").toLowerCase();

  // Helper to generate realistic value between baseline and target
  const generateBetween = (min: number, max: number, preferCurrent: boolean = true) => {
    if (preferCurrent && currentValue !== null) {
      // Generate near current value (±15%)
      const variance = Math.abs(max - min) * 0.15;
      return Math.max(min, Math.min(max, currentValue + (Math.random() - 0.5) * variance));
    }
    // Generate 70-90% progress from baseline to target
    const progress = 0.7 + Math.random() * 0.2;
    return min + (max - min) * progress;
  };

  // Detect if formula returns ratio/percentage
  const isRatioFormula = formulaLower.includes('/') && !formulaLower.includes('* 100');
  const isPercentageUnit = unitLower === '%' || unitLower === 'percent';
  const isMultiplicationFormula = formulaLower.includes('*') && !formulaLower.includes('/');

  variables.forEach(v => {
    const vLower = v.toLowerCase();
    
    // Special case: multiplication formulas with % unit need factors in 0-1 range
    // e.g., availability * performance * quality should each be 0.7-0.95
    if (isMultiplicationFormula && isPercentageUnit) {
      const expectedFactor = Math.pow(current / 100, 1 / variables.length);
      const minFactor = Math.max(0.5, expectedFactor * 0.9);
      const maxFactor = Math.min(0.95, expectedFactor * 1.1);
      values[v] = generateBetween(minFactor, maxFactor);
      return;
    }
    
    // For ratio formulas (division without * 100), generate values between 0-1
    if (isRatioFormula && isPercentageUnit) {
      if (vLower.includes('count') || vLower.includes('total') || vLower.includes('units')) {
        // Denominator - larger number
        values[v] = Math.round(Math.max(100, current * 10 * (0.9 + Math.random() * 0.2)));
      } else {
        // Numerator - smaller number, respecting target percentage
        const expectedRatio = target / 100; // Convert % to ratio
        const denominator = Math.max(...Object.values(values).filter(v => v > 10), 1000);
        values[v] = Math.round(denominator * expectedRatio * (0.85 + Math.random() * 0.3));
      }
    }
    // Time values (minutes, hours, days) - use realistic scales
    else if (vLower.includes('time') && !vLower.includes('ontime')) {
      if (unitLower.includes('minute') || unitLower.includes('دقيقة')) {
        values[v] = generateBetween(Math.min(baseline, target), Math.max(baseline, target));
      } else if (unitLower.includes('hour') || unitLower.includes('ساعة')) {
        values[v] = generateBetween(Math.min(baseline, target), Math.max(baseline, target));
      } else if (unitLower.includes('day') || unitLower.includes('يوم')) {
        values[v] = generateBetween(Math.min(baseline, target), Math.max(baseline, target));
      } else {
        values[v] = generateBetween(Math.min(baseline, target) * 0.9, Math.max(baseline, target) * 1.1);
      }
    }
    // Count variables - integers near target
    else if (vLower.includes('count') || vLower.includes('total') || vLower.includes('produced') ||
             vLower.includes('units') || vLower.includes('inspections') || vLower.includes('delivered') ||
             vLower.includes('employees') || vLower.includes('hires') || vLower.includes('branches') ||
             vLower.includes('products') || vLower.includes('programs') || vLower.includes('leaders') ||
             vLower.includes('modules') || vLower.includes('systems') || vLower.includes('downloads') ||
             vLower.includes('users') || vLower.includes('incidents') || vLower.includes('threats') ||
             vLower.includes('controls') || vLower.includes('detections') || vLower.includes('beneficiaries')) {
      // Generate realistic count based on target
      if (target < 10) {
        values[v] = Math.round(Math.max(1, target * (0.8 + Math.random() * 0.4)));
      } else if (target < 100) {
        values[v] = Math.round(generateBetween(Math.min(baseline, target) * 0.9, Math.max(baseline, target) * 1.1));
      } else {
        values[v] = Math.round(generateBetween(Math.min(baseline, target) * 0.85, Math.max(baseline, target) * 1.15));
      }
    }
    // Revenue, sales, costs - large numbers
    else if (vLower.includes('revenue') || vLower.includes('sales') || vLower.includes('cost') ||
             vLower.includes('inventory') || vLower.includes('emissions') || vLower.includes('energy') ||
             vLower.includes('consumption') || vLower.includes('waste') || vLower.includes('capacity')) {
      values[v] = generateBetween(Math.min(baseline, target) * 0.85, Math.max(baseline, target) * 1.15);
    }
    // Percentage/rate variables (0-1 range for ratio formulas)
    else if (vLower.includes('percent') || vLower.includes('rate') || vLower.includes('ratio')) {
      if (isRatioFormula) {
        values[v] = generateBetween(Math.min(baseline, target) / 100, Math.max(baseline, target) / 100);
      } else {
        values[v] = generateBetween(Math.min(baseline, target), Math.max(baseline, target));
      }
    }
    // Generic variables - use ratio if formula suggests it
    else {
      if (isRatioFormula && isPercentageUnit && target < 10) {
        // Likely a ratio variable (0-1 range)
        values[v] = generateBetween(Math.min(baseline, target) / 100, Math.max(baseline, target) / 100);
      } else {
        values[v] = generateBetween(Math.min(baseline, target) * 0.8, Math.max(baseline, target) * 1.2);
      }
    }
  });

  return values;
}

function evaluateJs(input: { code: string; variables: Record<string, number> }) {
  const raw = String(input.code ?? "").trim();
  if (!raw) return { ok: false as const, error: "emptyFormula" };
  const body = /\breturn\b/.test(raw) ? raw : `return (${raw});`;
  try {
    // Provide helper functions for formulas
    const abs = Math.abs;
    const sum = (...args: number[]) => args.reduce((a, b) => a + b, 0);
    const avg = (...args: number[]) => args.length > 0 ? sum(...args) / args.length : 0;
    const min = Math.min;
    const max = Math.max;
    
    // Create parameter list from variable names plus helper functions
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

async function main() {
  console.log("🌱 Starting Al-Mousa KPI-only seed...");

  await wipeDatabase();

  const org = await prisma.organization.create({
    data: {
      name: "Musa Bin Abdulaziz Al-Mousa & Sons Holding Group",
      nameAr: "مجموعة موسى بن عبدالعزيز الموسى وأولاده القابضة",
      domain: "almousa.local",
      mission: "We invest in vital sectors with economic impact to create sustainable value that embodies the Group's efficiency and leadership.",
      missionAr: "نستثمر في القطاعات الحيوية ذات الأثر الاقتصادي لخلق قيمة مستدامة تجسد كفاءة المجموعة وريادتها",
      vision: "An ambitious investment group with efficiency that builds growth sustainability in vital sectors.",
      visionAr: "مجموعة استثمارية طموحة ذات كفاءه تبني استدامة النمو في قطاعات حيوية",
      contacts: { email: "info@almousa.local", phone: "+966 11 000 0000" },
    },
  });

  const etKPI = await prisma.orgEntityType.create({
    data: { orgId: org.id, code: "KPI", name: "KPI", nameAr: "مؤشر أداء", sortOrder: 1 },
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
  const kpis = kpisFile.data;

  console.log(`✅ Seeding ${kpis.length} KPIs...`);
  
  let successCount = 0;
  let errorCount = 0;

  for (const row of kpis) {
    try {
      const periodType = mapPeriodTypeFromFrequency(row.frequency);
      const baselineValue = safeNumber(row.baselineValue);
      const targetValue = safeNumber(row.targetValue);
      const currentValue = safeNumber(row.currentValue);
      
      const direction = typeof baselineValue === "number" && typeof targetValue === "number" && targetValue < baselineValue
        ? KpiDirection.DECREASE_IS_GOOD
        : KpiDirection.INCREASE_IS_GOOD;

      const formula = row.formula?.trim() || null;
      const hasFormula = Boolean(formula && formula.length > 0);

      console.log(`\n📊 Creating KPI: ${row.nameEn} (${row.id})`);
      if (hasFormula) {
        console.log(`   Formula: ${formula}`);
      }

      const ent = await prisma.entity.create({
        data: {
          orgId: org.id,
          orgEntityTypeId: etKPI.id,
          key: row.id.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
          title: row.nameEn,
          titleAr: row.nameAr,
          description: row.descriptionEn ?? null,
          descriptionAr: row.descriptionAr ?? null,
          ownerUserId: admin.id,
          status: row.isActive ? Status.ACTIVE : Status.PLANNED,
          sourceType: hasFormula ? KpiSourceType.CALCULATED : KpiSourceType.MANUAL,
          periodType,
          unit: row.unit ?? null,
          direction,
          aggregation: KpiAggregationMethod.LAST_VALUE,
          baselineValue: baselineValue ?? null,
          targetValue: targetValue ?? null,
          formula: formula,
        },
        select: { id: true, key: true, periodType: true },
      });

      const range = resolvePeriodRange({ now, periodType });

      let calculatedKpiValue: number | null = null;
      const variableRecords: Array<{ variable: any; value: number }> = [];
      
      if (hasFormula && formula) {
        const variableNames = extractVariableNames(formula);
        console.log(`   Variables found: ${variableNames.join(', ')}`);
        
        const sampleValues = generateSampleValuesForVariables({
          variables: variableNames,
          targetValue: targetValue,
          currentValue: currentValue,
          baselineValue: baselineValue,
          formula: formula,
          unit: row.unit ?? null,
        });

        for (const varName of variableNames) {
          const variable = await prisma.entityVariable.create({
            data: {
              entityId: ent.id,
              code: varName.toUpperCase(),
              displayName: varName.replace(/([A-Z])/g, ' $1').trim(),
              nameAr: varName,
              dataType: KpiVariableDataType.NUMBER,
              isRequired: true,
              isStatic: false,
              staticValue: null,
            },
          });
          
          const varValue = sampleValues[varName] ?? 0;
          console.log(`   - ${varName} = ${varValue.toFixed(2)}`);
          
          variableRecords.push({
            variable,
            value: varValue,
          });
        }

        const evalResult = evaluateJs({
          code: formula,
          variables: sampleValues,
        });
        
        if (evalResult.ok) {
          calculatedKpiValue = evalResult.value;
          console.log(`   ✓ Calculated value: ${calculatedKpiValue.toFixed(2)}`);
        } else {
          console.log(`   ⚠️  Formula evaluation failed: ${evalResult.error}`);
        }
      }

      const achievementValue = evaluateAchievementFormula({
        achievementFormula: row.achievementFormula,
        baselineValue,
        currentValue: hasFormula && calculatedKpiValue !== null ? calculatedKpiValue : currentValue,
        targetValue,
      });

      const finalKpiValue = hasFormula && calculatedKpiValue !== null ? calculatedKpiValue : currentValue;
      const shouldSetValue = !hasFormula || calculatedKpiValue !== null;

      const valuePeriod = await prisma.entityValuePeriod.create({
        data: {
          entityId: ent.id,
          periodStart: range.start,
          periodEnd: range.end,
          actualValue: shouldSetValue ? finalKpiValue : null,
          calculatedValue: hasFormula ? calculatedKpiValue : finalKpiValue,
          finalValue: shouldSetValue ? finalKpiValue : null,
          achievementValue: shouldSetValue ? achievementValue : null,
          status: KpiValueStatus.DRAFT,
          enteredBy: admin.id,
        },
      });

      for (const { variable, value } of variableRecords) {
        await prisma.entityVariableValue.create({
          data: {
            entityValueId: valuePeriod.id,
            entityVariableId: variable.id,
            value: value,
          },
        });
      }

      successCount++;
      console.log(`   ✅ KPI created successfully`);
    } catch (error) {
      errorCount++;
      console.error(`   ❌ Error creating KPI ${row.id}:`, error);
    }
  }

  console.log(`\n🎉 Al-Mousa KPI seed completed!`);
  console.log(`   ✅ Success: ${successCount} KPIs`);
  if (errorCount > 0) {
    console.log(`   ❌ Errors: ${errorCount} KPIs`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
