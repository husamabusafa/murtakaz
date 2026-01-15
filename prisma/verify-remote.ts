const { PrismaClient } = require("@prisma/client");

const remoteUrl = "postgres://postgres:CT4DzRSwa7LAXpylF4MmWgAkTbxtJLaJHPI72lT8f3XCPuY6kQDcMtRcLz855Dfl@94.130.161.59:5768/postgres";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: remoteUrl
    }
  }
});

async function main() {
  try {
    console.log('\n🔍 Verifying Remote Database...\n');
    
    const orgCount = await prisma.organization.count();
    console.log(`Organizations: ${orgCount}`);
    
    const userCount = await prisma.user.count();
    console.log(`Users: ${userCount}`);
    
    const accountCount = await prisma.account.count();
    console.log(`Accounts: ${accountCount}`);
    
    const entityTypes = await prisma.orgEntityType.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { entities: true } } }
    });
    
    console.log('\n📋 Entity Types:');
    for (const et of entityTypes) {
      console.log(`  ${et.code}: ${et._count.entities} entities`);
    }
    
    const totalEntities = await prisma.entity.count({ where: { deletedAt: null } });
    const totalPeriods = await prisma.entityValuePeriod.count();
    
    console.log(`\n📈 Summary:`);
    console.log(`  Total entities: ${totalEntities}`);
    console.log(`  Total value periods: ${totalPeriods}`);
    
    const sampleEntity = await prisma.entity.findFirst({
      where: { deletedAt: null },
      include: {
        values: { take: 1, orderBy: { periodStart: 'desc' } }
      }
    });
    
    if (sampleEntity) {
      console.log(`\n✅ Sample Entity:`);
      console.log(`  Key: ${sampleEntity.key}`);
      console.log(`  Title: ${sampleEntity.title}`);
      console.log(`  Has Value: ${sampleEntity.values.length > 0 ? 'Yes' : 'No'}`);
    }
    
    console.log('\n✅ Remote database verification successful!');
    
  } catch (error: any) {
    console.error('\n❌ Error verifying remote database:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
