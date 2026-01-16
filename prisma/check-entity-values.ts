const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  try {
    const entities = await (prisma as any).entity.findMany({
      where: {
        deletedAt: null,
        formula: { not: null },
      },
      include: {
        orgEntityType: true,
        variables: true,
        values: {
          take: 2,
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
    
    if (entities.length === 0) {
      console.log("No entities with formulas found");
      return;
    }
    
    for (const entity of entities) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📊 ${entity.orgEntityType.name}: ${entity.title}`);
      console.log(`   Key: ${entity.key}`);
      console.log(`   Formula: ${entity.formula}`);
      console.log(`\n   Variables defined (${entity.variables.length}):`);
      for (const v of entity.variables) {
        console.log(`     • ${v.code}: ${v.displayName} (${v.dataType})`);
      }
      
      if (entity.values.length === 0) {
        console.log(`\n   ⚠️  No value periods found`);
        continue;
      }
      
      for (const period of entity.values) {
        console.log(`\n   📅 Period: ${period.periodStart.toISOString().split('T')[0]} to ${period.periodEnd.toISOString().split('T')[0]}`);
        console.log(`      Status: ${period.status}`);
        console.log(`      Calculated Value: ${period.calculatedValue}`);
        console.log(`      Final Value: ${period.finalValue}`);
        console.log(`\n      🔢 Variable Values (${period.variableValues.length}):`);
        
        if (period.variableValues.length === 0) {
          console.log(`         ⚠️  NO VARIABLE VALUES STORED`);
        } else {
          for (const vv of period.variableValues) {
            console.log(`         • ${vv.entityVariable.code}: ${vv.value}`);
          }
          
          // Verify calculation
          const valuesByCode: Record<string, number> = {};
          for (const vv of period.variableValues) {
            valuesByCode[vv.entityVariable.code] = vv.value;
          }
          
          if (entity.formula) {
            try {
              const formulaText = entity.formula.replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, (token) => {
                if (Object.prototype.hasOwnProperty.call(valuesByCode, token)) {
                  return String(valuesByCode[token] ?? 0);
                }
                return "0";
              });
              const expectedResult = Function(`"use strict"; return (${formulaText});`)();
              console.log(`\n      ✓ Manual calculation check: ${formulaText} = ${expectedResult}`);
              if (Math.abs(expectedResult - (period.calculatedValue ?? 0)) < 0.01) {
                console.log(`      ✅ Matches calculated value!`);
              } else {
                console.log(`      ⚠️  Mismatch: Expected ${expectedResult}, Got ${period.calculatedValue}`);
              }
            } catch (e) {
              console.log(`      ❌ Error calculating: ${e}`);
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
