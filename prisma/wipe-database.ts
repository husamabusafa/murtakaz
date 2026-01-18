import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function wipeDatabase() {
  console.log("🗑️  Starting database wipe...");

  try {
    // Delete in order to respect foreign key constraints
    console.log("Deleting entity variable values...");
    await prisma.entityVariableValue.deleteMany();

    console.log("Deleting entity values...");
    await prisma.entityValue.deleteMany();

    console.log("Deleting entity variables...");
    await prisma.entityVariable.deleteMany();

    console.log("Deleting user entity assignments...");
    await prisma.userEntityAssignment.deleteMany();

    console.log("Deleting entities...");
    await prisma.entity.deleteMany();

    console.log("Deleting org entity types...");
    await prisma.orgEntityType.deleteMany();

    console.log("Deleting change approvals...");
    await prisma.changeApproval.deleteMany();

    console.log("Deleting change requests...");
    await prisma.changeRequest.deleteMany();

    console.log("Deleting user preferences...");
    await prisma.userPreference.deleteMany();

    console.log("Deleting sessions...");
    await prisma.session.deleteMany();

    console.log("Deleting accounts...");
    await prisma.account.deleteMany();

    console.log("Deleting verifications...");
    await prisma.verification.deleteMany();

    console.log("Deleting users...");
    await prisma.user.deleteMany();

    console.log("Deleting organizations...");
    await prisma.organization.deleteMany();

    console.log("✅ Database wiped successfully!");
    console.log("📊 All tables are now empty.");
  } catch (error) {
    console.error("❌ Error wiping database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

wipeDatabase()
  .then(() => {
    console.log("✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
