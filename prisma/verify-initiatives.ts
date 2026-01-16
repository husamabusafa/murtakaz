import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Verifying Al-Mousa Initiatives...\n");

  const initiatives = await prisma.entity.findMany({
    where: {
      deletedAt: null,
      orgEntityType: {
        code: "INITIATIVE"
      }
    },
    include: {
      values: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
      orgEntityType: true,
    },
    orderBy: { key: "asc" },
  });

  console.log(`✅ Total Initiatives: ${initiatives.length}\n`);

  console.log("📊 Initiative Summary:\n");
  for (const init of initiatives) {
    const value = init.values[0];
    console.log(`${init.key} - ${init.title}`);
    console.log(`  Target: ${init.targetValue}% | Baseline: ${init.baselineValue}%`);
    console.log(`  Current Value: ${value?.finalValue?.toFixed(2) ?? 'N/A'}`);
    console.log(`  Achievement: ${value?.achievementValue?.toFixed(2) ?? 'N/A'}%`);
    console.log(`  Formula: ${init.formula ? 'Yes (KPI aggregation)' : 'Manual'}`);
    console.log();
  }

  // Summary statistics
  const withFormulas = initiatives.filter(i => i.formula);
  const withValues = initiatives.filter(i => i.values[0]?.finalValue !== null);
  const withAchievement = initiatives.filter(i => i.values[0]?.achievementValue !== null);

  console.log("\n📈 Statistics:");
  console.log(`  Total Initiatives: ${initiatives.length}`);
  console.log(`  With Formulas: ${withFormulas.length} (${((withFormulas.length/initiatives.length)*100).toFixed(0)}%)`);
  console.log(`  With Calculated Values: ${withValues.length} (${((withValues.length/initiatives.length)*100).toFixed(0)}%)`);
  console.log(`  With Achievement: ${withAchievement.length} (${((withAchievement.length/initiatives.length)*100).toFixed(0)}%)`);

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
