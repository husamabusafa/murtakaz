import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Reordering entity types...\n");

  const org = await prisma.organization.findFirst();
  if (!org) throw new Error("No organization found");

  // Update INITIATIVE to appear before KPI
  await prisma.orgEntityType.updateMany({
    where: {
      orgId: org.id,
      code: "INITIATIVE",
    },
    data: {
      sortOrder: 0, // Put initiatives first
    },
  });

  // Update KPI to appear after INITIATIVE
  await prisma.orgEntityType.updateMany({
    where: {
      orgId: org.id,
      code: "KPI",
    },
    data: {
      sortOrder: 10,
    },
  });

  console.log("✅ Entity types reordered successfully");
  
  const types = await prisma.orgEntityType.findMany({
    orderBy: [{ sortOrder: "asc" }],
  });

  console.log("\nNew order:");
  for (const type of types) {
    console.log(`  ${type.sortOrder}: ${type.code} - ${type.name}`);
  }
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
