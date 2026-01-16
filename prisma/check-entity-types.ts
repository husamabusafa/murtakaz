import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Checking entity types and sort order...\n");

  const types = await prisma.orgEntityType.findMany({
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });

  console.log("Current entity types:");
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
