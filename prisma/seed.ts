import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user if not exists
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@oqta.ai';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

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
