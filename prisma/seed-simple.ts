
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting minimal seed...');

  try {
    // 1. Create Organization
    const org = await prisma.organization.upsert({
      where: { id: 'org-1' },
      update: {},
      create: {
        id: 'org-1',
        name: 'Musa Group',
        domain: 'musa.com',
      },
    });
    console.log('Created Org:', org.id);

    // 2. Create One User
    const user = await prisma.user.upsert({
      where: { id: 'user-admin' },
      update: {},
      create: {
        id: 'user-admin',
        email: 'admin@murtakaz.com',
        name: 'System Admin',
        role: 'ADMIN',
        department: 'IT',
        orgId: 'org-1',
      },
    });
    console.log('Created User:', user.id);

  } catch (e) {
    console.error('Error in minimal seed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
