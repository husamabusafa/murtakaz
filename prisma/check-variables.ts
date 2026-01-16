const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  try {
    const kpisWithVariables = await prisma.entity.findMany({
      where: {
        deletedAt: null,
        orgEntityType: { code: 'KPI' },
      },
      include: {
        variables: true,
      },
      orderBy: { key: 'asc' },
      take: 10,
    });
    
    console.log('\n📊 KPIs with Variables:\n');
    
    for (const kpi of kpisWithVariables) {
      console.log(`\n✅ ${kpi.key}: ${kpi.title}`);
      console.log(`   Formula: ${kpi.formula || 'None'}`);
      console.log(`   Variables (${kpi.variables.length}):`);
      
      if (kpi.variables.length === 0) {
        console.log('     ⚠️  No variables defined');
      } else {
        for (const v of kpi.variables) {
          console.log(`     - ${v.code} (${v.displayName}) - ${v.isStatic ? 'Static' : 'Input'}`);
        }
      }
    }
    
    const totalKpis = await prisma.entity.count({
      where: {
        deletedAt: null,
        orgEntityType: { code: 'KPI' },
      },
    });
    
    const kpisWithFormulas = await prisma.entity.count({
      where: {
        deletedAt: null,
        orgEntityType: { code: 'KPI' },
        formula: { not: null },
      },
    });
    
    const totalVariables = await prisma.entityVariable.count();
    
    console.log(`\n📈 Summary:`);
    console.log(`  Total KPIs: ${totalKpis}`);
    console.log(`  KPIs with formulas: ${kpisWithFormulas}`);
    console.log(`  Total variables: ${totalVariables}`);
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
