import { PrismaClient } from "@prisma/client";
import { auth } from "../web/src/lib/auth";

const prisma = new PrismaClient();

async function createSuperAdmin() {
  console.log("👤 Creating Super Admin user...\n");

  try {
    // Get configuration from environment or use defaults
    const email = process.env.SEED_SUPERADMIN_EMAIL || "superadmin@almousa.local";
    const password = process.env.SEED_SUPERADMIN_PASSWORD || "password123";
    const name = process.env.SEED_SUPERADMIN_NAME || "Super Admin";

    // Check if organization exists
    const org = await prisma.organization.findFirst({
      where: { deletedAt: null },
    });

    if (!org) {
      console.error("❌ No organization found. Please create an organization first.");
      process.exit(1);
    }

    console.log(`📋 Organization: ${org.name}`);
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Name: ${name}\n`);

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        orgId: org.id,
        email,
        deletedAt: null,
      },
    });

    if (existingUser) {
      console.log("⚠️  User already exists, updating role...");
      
      const updated = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          role: "SUPER_ADMIN",
          title: "Super Admin",
        },
      });

      console.log("✅ Super Admin user updated successfully!");
      console.log(`   ID: ${updated.id}`);
      console.log(`   Email: ${updated.email}`);
      console.log(`   Role: ${updated.role}\n`);
    } else {
      // Create user using better-auth API
      const result = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name,
          role: "SUPER_ADMIN",
          orgId: org.id,
        },
      });

      await prisma.user.update({
        where: { id: result.user.id },
        data: {
          title: "Super Admin",
        },
      });

      console.log("✅ Super Admin user created successfully!");
      console.log(`   ID: ${result.user.id}`);
      console.log(`   Email: ${result.user.email}`);
      console.log(`   Role: ${result.user.role}\n`);
    }

    console.log("🔑 Login credentials:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
  } catch (error) {
    console.error("❌ Error creating super admin:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
