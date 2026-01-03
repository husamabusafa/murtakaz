const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  try {
    const userCount = await prisma.user.count();
    console.log(`Total users: ${userCount}`);
    const orgCount = await prisma.organization.count();
    console.log(`Total organizations: ${orgCount}`);
  } catch (error) {
    console.error("Error verifying seed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
