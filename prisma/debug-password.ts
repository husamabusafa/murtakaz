const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

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
    
    if (!account) {
      console.log("❌ No account found");
      return;
    }
    
    console.log("\n🔍 Account Debug Info:");
    console.log("  User Email:", account.user.email);
    console.log("  Account ID:", account.accountId);
    console.log("  Provider ID:", account.providerId);
    console.log("  Has Password:", !!account.password);
    
    if (account.password) {
      console.log("  Password Hash Length:", account.password.length);
      console.log("  Password Hash Prefix:", account.password.substring(0, 10));
      
      // Test if it's a valid bcrypt hash
      const isBcryptFormat = /^\$2[ayb]\$.{56}$/.test(account.password);
      console.log("  Is Valid Bcrypt Format:", isBcryptFormat);
      
      // Try to verify the password
      try {
        const isMatch = await bcrypt.compare("password123", account.password);
        console.log("\n  ✅ Password Verification:", isMatch ? "MATCH" : "NO MATCH");
      } catch (err) {
        console.log("\n  ❌ Error verifying:", err.message);
      }
    }
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
