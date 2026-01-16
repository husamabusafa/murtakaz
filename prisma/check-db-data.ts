import { PrismaClient } from '@prisma/client';

const DATABASE_URL = 'postgres://postgres:CT4DzRSwa7LAXpylF4MmWgAkTbxtJLaJHPI72lT8f3XCPuY6kQDcMtRcLz855Dfl@94.130.161.59:5768/postgres';

async function checkDatabaseData() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL,
      },
    },
  });

  try {
    console.log('Connecting to database...');
    
    // Check if we can connect
    await prisma.$connect();
    console.log('✓ Connected successfully\n');

    // Get all table names
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    console.log(`Found ${tables.length} tables:\n`);
    
    if (tables.length === 0) {
      console.log('⚠ Database has no tables in public schema');
      return;
    }

    // Check row counts for each table
    for (const table of tables) {
      const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*) as count FROM "${table.tablename}"`
      );
      const count = Number(result[0].count);
      console.log(`  ${table.tablename}: ${count} rows`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseData();
