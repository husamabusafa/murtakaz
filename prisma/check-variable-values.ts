const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  try {
    const kpi = await prisma.entity.findFirst({
      where: {
        deletedAt: null,
        orgEntityType: { code: 'KPI' },
        formula: { not: null },
      },
      include: {
        variables: true,
        values: {
          take: 1,
          orderBy: { periodStart: 'desc' },
          include: {
            variableValues: {
              include: {
                entityVariable: true,
              }
            }
          }
        }
      },
    });
    
    if (!kpi) {
      console.log("No KPI found");
      return;
    }
    
    console.log(`\n📊 KPI: ${kpi.title}`);
    console.log(`Formula: ${kpi.formula}`);
    console.log(`\nVariables defined (${kpi.variables.length}):`);
    for (const v of kpi.variables) {
      console.log(`  - ${v.code}: ${v.displayName}`);
    }
    
    const period = kpi.values[0];
    if (period) {
      console.log(`\n📅 Latest Period:`);
      console.log(`  Actual Value: ${period.actualValue}`);
      console.log(`  Calculated Value: ${period.calculatedValue}`);
      console.log(`  Final Value: ${period.finalValue}`);
      console.log(`\n🔢 Variable Values (${period.variableValues.length}):`);
      if (period.variableValues.length === 0) {
        console.log(`  ⚠️  NO VARIABLE VALUES STORED`);
      } else {
        for (const vv of period.variableValues) {
          console.log(`  - ${vv.entityVariable.code}: ${vv.value}`);
        }
      }
    }
    
    console.log(`\n🔍 Analysis:`);
    if (kpi.formula && kpi.variables.length > 0 && period?.calculatedValue && period.variableValues.length === 0) {
      console.log(`  ❌ ISSUE: KPI has calculated value but no variable values stored!`);
      console.log(`  This is inconsistent - calculated values should be derived from variable inputs.`);
    } else {
      console.log(`  ✅ Data looks consistent`);
    }
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
