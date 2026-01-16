import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🗑️  Deleting all initiatives...\n");

  const result = await prisma.entity.deleteMany({
    where: {
      orgEntityType: {
        code: "INITIATIVE"
      }
    },
  });

  console.log(`✅ Deleted ${result.count} initiatives`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
