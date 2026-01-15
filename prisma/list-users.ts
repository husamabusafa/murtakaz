const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        title: true,
        hashedPassword: true,
        emailVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log('\n📋 Users in Database:\n');
    console.log('┌────────────────────────────┬──────────────────────────┬──────────┬─────────────────┬──────────┬──────────────┐');
    console.log('│ Email                      │ Name                     │ Role     │ Title           │ Password │ Verified     │');
    console.log('├────────────────────────────┼──────────────────────────┼──────────┼─────────────────┼──────────┼──────────────┤');
    
    for (const user of users) {
      const email = (user.email || '').padEnd(26);
      const name = (user.name || '').padEnd(24);
      const role = (user.role || '').padEnd(8);
      const title = (user.title || '').padEnd(15);
      const hasPassword = user.hashedPassword ? 'Yes' : 'No';
      const verified = user.emailVerified ? 'Yes' : 'No';
      
      console.log(`│ ${email} │ ${name} │ ${role} │ ${title} │ ${hasPassword.padEnd(8)} │ ${verified.padEnd(12)} │`);
    }
    
    console.log('└────────────────────────────┴──────────────────────────┴──────────┴─────────────────┴──────────┴──────────────┘');
    
    console.log(`\nTotal users: ${users.length}`);
    
    console.log('\n⚠️  Note: Users were created without passwords in the seed script.');
    console.log('   To set passwords, you need to use better-auth API or hash passwords manually.\n');
    
  } catch (error) {
    console.error("Error listing users:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
