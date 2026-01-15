const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  try {
    const orgCount = await prisma.organization.count();
    console.log(`\n📊 Verification Results:`);
    console.log(`Organizations: ${orgCount}`);
    
    const userCount = await prisma.user.count();
    console.log(`Users: ${userCount}`);
    
    const entityTypes = await prisma.orgEntityType.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { entities: true } } }
    });
    
    console.log(`\n📋 Entity Types:`);
    for (const et of entityTypes) {
      console.log(`  ${et.code}: ${et._count.entities} entities`);
    }
    
    const entitiesWithValues = await prisma.entity.findMany({
      where: { deletedAt: null },
      include: {
        orgEntityType: { select: { code: true, sortOrder: true } },
        values: {
          orderBy: { periodStart: 'desc' },
          take: 1,
          select: {
            actualValue: true,
            calculatedValue: true,
            finalValue: true,
            achievementValue: true,
          }
        }
      },
      orderBy: [
        { orgEntityType: { sortOrder: 'asc' } },
        { key: 'asc' }
      ],
      take: 20
    });
    
    console.log(`\n🔍 Sample Entities with Values (first 20):`);
    for (const e of entitiesWithValues) {
      const latest = e.values[0];
      const effectiveValue = latest?.finalValue ?? latest?.calculatedValue ?? latest?.actualValue ?? null;
      const valueStr = effectiveValue !== null ? effectiveValue.toFixed(2) : 'NULL';
      const hasValue = effectiveValue !== null ? '✅' : '❌';
      console.log(`  ${hasValue} [${e.orgEntityType.code}] ${e.key}: ${e.title} = ${valueStr}`);
    }
    
    const entitiesWithoutValues = await prisma.entity.count({
      where: {
        deletedAt: null,
        values: { none: {} }
      }
    });
    
    console.log(`\n⚠️  Entities without values: ${entitiesWithoutValues}`);
    
    const totalEntities = await prisma.entity.count({ where: { deletedAt: null } });
    const totalPeriods = await prisma.entityValuePeriod.count();
    console.log(`\n📈 Summary:`);
    console.log(`  Total entities: ${totalEntities}`);
    console.log(`  Total value periods: ${totalPeriods}`);
    console.log(`  Coverage: ${((totalEntities - entitiesWithoutValues) / totalEntities * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error("Error verifying seed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
