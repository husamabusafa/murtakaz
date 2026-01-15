const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  try {
    const accounts = await prisma.account.findMany({
      include: {
        user: {
          select: {
            email: true,
            name: true,
            role: true,
          }
        }
      }
    });
    
    console.log('\n📋 Account Records:\n');
    console.log('┌────────────────────────────┬──────────────────────────┬──────────┬────────────┬──────────┐');
    console.log('│ Email                      │ Name                     │ Role     │ Provider   │ Password │');
    console.log('├────────────────────────────┼──────────────────────────┼──────────┼────────────┼──────────┤');
    
    for (const acc of accounts) {
      const email = (acc.user.email || '').padEnd(26);
      const name = (acc.user.name || '').padEnd(24);
      const role = (acc.user.role || '').padEnd(8);
      const provider = (acc.providerId || '').padEnd(10);
      const hasPassword = acc.password ? 'Yes' : 'No';
      
      console.log(`│ ${email} │ ${name} │ ${role} │ ${provider} │ ${hasPassword.padEnd(8)} │`);
    }
    
    console.log('└────────────────────────────┴──────────────────────────┴──────────┴────────────┴──────────┘');
    
    console.log(`\nTotal accounts: ${accounts.length}`);
    
    if (accounts.length > 0 && accounts[0].password) {
      console.log('\n✅ Accounts have passwords set and should work for login.');
      console.log('\nTest login with:');
      console.log('  Email: admin@almousa.local');
      console.log('  Password: password123');
    }
    
  } catch (error) {
    console.error("Error checking accounts:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
