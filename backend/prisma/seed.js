require('dotenv/config');

const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

function getEnvString(key, fallback) {
  const value = process.env[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback;
}

function createPrisma() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to seed the database.');
  }

  return new PrismaClient({
    adapter: new PrismaMariaDb(databaseUrl),
    log: ['error', 'warn'],
  });
}

async function main() {
  const prisma = createPrisma();

  try {
    console.log('Seeding database...');

    const adminRole = await prisma.role.upsert({
      where: { code: 'ADMIN' },
      update: { name: 'Sistemas' },
      create: {
        code: 'ADMIN',
        name: 'Sistemas',
      },
    });

    await prisma.role.upsert({
      where: { code: 'SUPERVISOR' },
      update: { name: 'Supervisor' },
      create: {
        code: 'SUPERVISOR',
        name: 'Supervisor',
      },
    });

    await prisma.role.upsert({
      where: { code: 'PLANNER' },
      update: { name: 'Asistente' },
      create: {
        code: 'PLANNER',
        name: 'Asistente',
      },
    });

    await prisma.role.upsert({
      where: { code: 'OPERATOR' },
      update: { name: 'Operario' },
      create: {
        code: 'OPERATOR',
        name: 'Operario',
      },
    });

    await prisma.role.upsert({
      where: { code: 'WAREHOUSE' },
      update: { name: 'Encargado' },
      create: {
        code: 'WAREHOUSE',
        name: 'Encargado',
      },
    });

    await prisma.role.upsert({
      where: { code: 'MANAGER' },
      update: { name: 'Jefatura' },
      create: {
        code: 'MANAGER',
        name: 'Jefatura',
      },
    });

    const nodeEnv = getEnvString('NODE_ENV', 'development');
    const shouldSeedDevAdmin = process.env.SEED_DEV_ADMIN === 'true' || nodeEnv !== 'production';
    const devAdminUsername = getEnvString('DEV_ADMIN_USERNAME', 'admin');
    const devAdminPassword = getEnvString('DEV_ADMIN_PASSWORD', 'admin123');
    const devAdminName = getEnvString('DEV_ADMIN_NAME', 'System Admin');

    if (shouldSeedDevAdmin) {
      const hashedPassword = await bcrypt.hash(devAdminPassword, 10);
      await prisma.user.upsert({
        where: { username: devAdminUsername },
        update: {
          name: devAdminName,
          password_hash: hashedPassword,
          role_id: adminRole.id,
          active: true,
        },
        create: {
          username: devAdminUsername,
          name: devAdminName,
          password_hash: hashedPassword,
          role_id: adminRole.id,
        },
      });

      console.log(`Dev admin seeded: ${devAdminUsername} (rol: ${adminRole.name})`);
      if (nodeEnv !== 'production') {
        console.log(`Dev admin password: ${devAdminPassword}`);
      }
    }

    await prisma.area.upsert({
      where: { code: 'IMP' },
      update: {},
      create: {
        code: 'IMP',
        name: 'Imprenta',
      },
    });

    await prisma.shift.upsert({
      where: { code: 'T1' },
      update: {},
      create: {
        code: 'T1',
        name: 'Turno 1',
        start_time: '06:00:00',
        end_time: '14:00:00',
      },
    });

    console.log('Seed completed successfully.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
