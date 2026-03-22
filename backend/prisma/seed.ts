import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createPrismaClientOptions } from '../src/database/prisma-client-options';

const prisma = new PrismaClient(createPrismaClientOptions());

function getEnvString(key: string, fallback: string) {
  const value = process.env[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback;
}

async function main() {
  console.log('Seeding database...');

  // 1. Roles
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

  // 2. Dev Admin User
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

  // 3. Areas
  const printArea = await prisma.area.upsert({
    where: { code: 'IMP' },
    update: {},
    create: {
      code: 'IMP',
      name: 'Imprenta',
    },
  });

  // 4. Shifts
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
