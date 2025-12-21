import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Validate environment variables
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error('❌ ERROR: ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be set');
    console.error('Please set these in your .env file before running the seed script');
    process.exit(1);
  }

  // Validate password strength
  if (adminPassword.length < 8) {
    console.error('❌ ERROR: ADMIN_PASSWORD must be at least 8 characters long');
    process.exit(1);
  }

  // Create admin user if not exists
  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
      },
    });
    console.log(`✅ Admin user created: ${adminEmail}`);
  } else {
    console.log(`✅ Admin user already exists: ${adminEmail}`);
  }

  // Create default settings
  const defaultSettings = [
    { key: 'whatsapp_number', value: '+971501234567' },
    { key: 'phone_number', value: '+971501234567' },
    { key: 'n8n_url', value: 'https://lemzakov.app.n8n.cloud/webhook/44d1ca27-d30f-4088-841b-0853846bb000' },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log('✅ Default settings created');

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
