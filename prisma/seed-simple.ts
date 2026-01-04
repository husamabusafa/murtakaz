
import { PrismaClient, Role } from "@prisma/client";
import { auth } from "../web/src/lib/auth";

const prisma = new PrismaClient();

async function main() {
  console.log('Starting minimal seed...');

  try {
    const org =
      (await prisma.organization.findFirst({ where: { domain: "musa.com" } })) ??
      (await prisma.organization.create({
        data: {
          name: "Musa Group",
          domain: "musa.com",
        },
      }));
    console.log("Created Org:", org.id);

    const email = process.env.SEED_SUPERADMIN_EMAIL ?? "superadmin@murtakaz.com";
    const password = process.env.SEED_SUPERADMIN_PASSWORD ?? "Admin123!";
    const name = process.env.SEED_SUPERADMIN_NAME ?? "Super Admin";

    const existingUser = await prisma.user.findFirst({
      where: {
        orgId: org.id,
        email,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existingUser) {
      const credentialAccount = await prisma.account.findFirst({
        where: {
          userId: existingUser.id,
          providerId: "credential",
        },
        select: { id: true },
      });

      if (credentialAccount) {
        console.log("Seed user already exists:", existingUser.id);
        return;
      }

      console.log("Seed user exists without credential account. Recreating...", existingUser.id);
      await prisma.user.delete({ where: { id: existingUser.id } });
    }

    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
        role: Role.SUPER_ADMIN,
        orgId: org.id,
      },
    });

    console.log("Created User:", result.user.id);

  } catch (e) {
    console.error('Error in minimal seed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
