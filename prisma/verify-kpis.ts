import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Verifying KPI seed data...\n");

  const kpisCount = await prisma.entity.count({
    where: { deletedAt: null },
  });
  console.log(`✅ Total KPIs in database: ${kpisCount}`);

  const kpisWithFormulas = await prisma.entity.count({
    where: { 
      deletedAt: null,
      formula: { not: null },
    },
  });
  console.log(`✅ KPIs with formulas: ${kpisWithFormulas}`);

  const variablesCount = await prisma.entityVariable.count();
  console.log(`✅ Total variables: ${variablesCount}`);

  const variableValuesCount = await prisma.entityVariableValue.count();
  console.log(`✅ Total variable values: ${variableValuesCount}`);

  console.log("\n📊 Sample KPI with variables:\n");
  const sampleKpi = await prisma.entity.findFirst({
    where: { 
      deletedAt: null,
      formula: { not: null },
    },
    include: {
      variables: {
        include: {
          values: true,
        },
      },
      values: true,
    },
  });

  if (sampleKpi) {
    console.log(`KPI: ${sampleKpi.title} (${sampleKpi.key})`);
    console.log(`Formula: ${sampleKpi.formula}`);
    console.log(`\nVariables (${sampleKpi.variables.length}):`);
    for (const variable of sampleKpi.variables) {
      const value = variable.values[0];
      console.log(`  - ${variable.code}: ${value?.value ?? 'no value'}`);
    }
    if (sampleKpi.values[0]) {
      console.log(`\nKPI Value:`);
      console.log(`  - Calculated: ${sampleKpi.values[0].calculatedValue}`);
      console.log(`  - Final: ${sampleKpi.values[0].finalValue}`);
      console.log(`  - Achievement: ${sampleKpi.values[0].achievementValue}%`);
    }
  }

  console.log("\n📋 KPIs by formula status:\n");
  const kpisWithoutFormulas = await prisma.entity.count({
    where: { 
      deletedAt: null,
      formula: null,
    },
  });
  console.log(`KPIs without formulas (manual): ${kpisWithoutFormulas}`);
  console.log(`KPIs with formulas (calculated): ${kpisWithFormulas}`);

  console.log("\n✅ Verification complete!");
}

main()
  .catch((e) => {
    console.error("❌ Verification failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
