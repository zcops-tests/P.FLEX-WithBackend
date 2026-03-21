import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Roles
  const adminRole = await prisma.role.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: {
      code: 'ADMIN',
      name: 'Administrador del Sistema',
    },
  });

  const operatorRole = await prisma.role.upsert({
    where: { code: 'OPERATOR' },
    update: {},
    create: {
      code: 'OPERATOR',
      name: 'Operario de Producción',
    },
  });

  // 2. Admin User
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      name: 'System Admin',
      password_hash: hashedPassword,
      role_id: adminRole.id,
    },
  });

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
