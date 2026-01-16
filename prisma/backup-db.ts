import { PrismaClient } from "@prisma/client";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();

async function main() {
  console.log("📦 Creating database backup...\n");

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(process.cwd(), "data", "backups");
  
  // Get all data
  const entities = await prisma.entity.findMany({
    include: {
      variables: {
        include: {
          values: true,
        },
      },
      values: true,
    },
  });

  const orgEntityTypes = await prisma.orgEntityType.findMany();
  const users = await prisma.user.findMany();
  const org = await prisma.organization.findFirst();

  const backup = {
    timestamp,
    version: "1.0",
    data: {
      organization: org,
      orgEntityTypes,
      users: users.map(u => ({ ...u, password: "[REDACTED]" })),
      entities,
      stats: {
        totalEntities: entities.length,
        totalVariables: entities.reduce((sum, e) => sum + e.variables.length, 0),
        totalValues: entities.reduce((sum, e) => sum + e.values.length, 0),
      },
    },
  };

  const filePath = path.join(backupDir, `backup_${timestamp}.json`);
  await writeFile(filePath, JSON.stringify(backup, null, 2), "utf8");

  console.log(`✅ Backup created successfully!`);
  console.log(`📁 File: ${filePath}`);
  console.log(`📊 Stats:`);
  console.log(`   - Entities: ${backup.data.stats.totalEntities}`);
  console.log(`   - Variables: ${backup.data.stats.totalVariables}`);
  console.log(`   - Values: ${backup.data.stats.totalValues}`);
}

main()
  .catch((e) => {
    console.error("❌ Backup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
