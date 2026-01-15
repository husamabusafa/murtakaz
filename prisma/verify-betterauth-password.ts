const { PrismaClient } = require("@prisma/client");
const { verifyPassword } = require("better-auth/crypto");

const prisma = new PrismaClient();

async function main() {
  try {
    const account = await prisma.account.findFirst({
      where: { 
        user: { email: "admin@almousa.local" }
      },
      include: {
        user: { select: { email: true } }
      }
    });
    
    if (!account || !account.password) {
      console.log("❌ No account or password found");
      return;
    }
    
    console.log("\n🔍 Better-Auth Password Verification:");
    console.log("  Email:", account.user.email);
    console.log("  Hash Format:", account.password.includes(':') ? 'scrypt (salt:hash)' : 'other');
    console.log("  Hash Length:", account.password.length);
    
    const testPassword = "password123";
    console.log(`\n  Testing password: "${testPassword}"`);
    
    try {
      const isValid = await verifyPassword({
        hash: account.password,
        password: testPassword
      });
      
      if (isValid) {
        console.log("  ✅ Password verification: SUCCESS");
        console.log("\n🎉 Login should work now!");
      } else {
        console.log("  ❌ Password verification: FAILED");
        console.log("  The hash doesn't match the password");
      }
    } catch (err: any) {
      console.log("  ❌ Error during verification:", err.message);
    }
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
