import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Checking KPI Achievement Values...\n");

  const kpisWithHighAchievement = await prisma.entityValuePeriod.findMany({
    where: {
      achievementValue: { gt: 100 },
    },
    include: {
      entity: {
        select: {
          key: true,
          title: true,
          unit: true,
          formula: true,
          baselineValue: true,
          targetValue: true,
          direction: true,
        },
      },
    },
    orderBy: {
      achievementValue: 'desc',
    },
    take: 15,
  });

  console.log(`Found ${kpisWithHighAchievement.length} KPIs with achievement > 100%\n`);

  for (const vp of kpisWithHighAchievement) {
    console.log(`\n📊 ${vp.entity.title} (${vp.entity.key})`);
    console.log(`   Formula: ${vp.entity.formula?.substring(0, 60)}...`);
    console.log(`   Baseline: ${vp.entity.baselineValue} | Target: ${vp.entity.targetValue} | Unit: ${vp.entity.unit}`);
    console.log(`   Calculated Value: ${vp.calculatedValue}`);
    console.log(`   Achievement: ${vp.achievementValue?.toFixed(2)}%`);
    console.log(`   Direction: ${vp.entity.direction}`);
  }

  console.log("\n\n📈 Achievement Distribution:");
  const ranges = [
    { min: 0, max: 100, label: "0-100%" },
    { min: 100, max: 200, label: "100-200%" },
    { min: 200, max: 500, label: "200-500%" },
    { min: 500, max: 1000, label: "500-1000%" },
    { min: 1000, max: Infinity, label: ">1000%" },
  ];

  for (const range of ranges) {
    const count = await prisma.entityValuePeriod.count({
      where: {
        achievementValue: {
          gte: range.min,
          lt: range.max === Infinity ? undefined : range.max,
        },
      },
    });
    console.log(`   ${range.label}: ${count} KPIs`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Check failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
