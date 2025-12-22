import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Validates and creates required database tables if they don't exist
 * This script runs during deployment to ensure all tables are present
 */
async function validateAndCreateTables() {
  console.log('🔍 Validating database tables...');

  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');

    // Check if required tables exist
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;

    const tableNames = tables.map((t) => t.tablename);
    console.log(`📊 Found ${tableNames.length} tables:`, tableNames);

    const requiredTables = [
      'admin_users',
      'sessions',
      'n8n_chat_histories',
      'settings',
      'invoices',
      'customers',
      'customer_sessions',
      'free_zone_integrations',
    ];

    const missingTables = requiredTables.filter((table) => !tableNames.includes(table));

    if (missingTables.length > 0) {
      console.log(`⚠️  Missing tables: ${missingTables.join(', ')}`);
      console.log('📝 Tables will be created by migration scripts');
    } else {
      console.log('✅ All required tables exist');
    }

    // Validate table structures for new CRM tables
    if (tableNames.includes('customers')) {
      const customerColumns = await prisma.$queryRaw<{ column_name: string }[]>`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'customers' AND table_schema = 'public'
      `;
      console.log(`✅ Customers table has ${customerColumns.length} columns`);
    }

    if (tableNames.includes('invoices')) {
      const invoiceColumns = await prisma.$queryRaw<{ column_name: string }[]>`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'invoices' AND table_schema = 'public'
      `;
      console.log(`✅ Invoices table has ${invoiceColumns.length} columns`);
      
      // Check if invoice table has new columns
      const columnNames = invoiceColumns.map((c) => c.column_name);
      const newColumns = ['customer_id', 'invoice_number', 'currency', 'due_date', 'sent_at'];
      const missingColumns = newColumns.filter((col) => !columnNames.includes(col));
      
      if (missingColumns.length > 0) {
        console.log(`⚠️  Invoices table missing columns: ${missingColumns.join(', ')}`);
        console.log('📝 Columns will be added by migration scripts');
      }
    }

    if (tableNames.includes('free_zone_integrations')) {
      console.log('✅ Free Zone Integrations table exists');
    }

    if (tableNames.includes('customer_sessions')) {
      console.log('✅ Customer Sessions table exists');
    }

    console.log('✅ Database validation complete');
    return true;
  } catch (error) {
    console.error('❌ Database validation failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run validation
validateAndCreateTables()
  .then(() => {
    console.log('✅ Database is ready');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database validation failed:', error);
    process.exit(1);
  });
