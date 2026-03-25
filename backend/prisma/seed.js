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

    const roleDefinitions = [
      { code: 'ADMIN', name: 'Sistemas', description: 'Gestión global del sistema, seguridad, sincronización y administración completa.' },
      { code: 'MANAGER', name: 'Jefatura', description: 'Seguimiento ejecutivo, validación consolidada y revisión histórica.' },
      { code: 'SUPERVISOR', name: 'Supervisor', description: 'Supervisión operativa, validación de registros y control por turno.' },
      { code: 'PLANNER', name: 'Asistente', description: 'Carga asistida, corrección controlada y consolidación operativa.' },
      { code: 'PRODUCTION_ASSISTANT', name: 'Asistente de Producción', description: 'Apoyo directo al registro productivo y seguimiento de pendientes.' },
      { code: 'OPERATOR', name: 'Operario', description: 'Captura contextual de producción e incidencias operativas.' },
      { code: 'WAREHOUSE', name: 'Encargado de Clisés, Troqueles y Tintas', description: 'Gestión integral del inventario técnico y su vinculación con producción.' },
      { code: 'CLICHE_DIE_MANAGER', name: 'Encargado de Clisés y Troqueles', description: 'Control técnico y operativo de clisés y troqueles.' },
      { code: 'INK_MANAGER', name: 'Encargado de Tintas', description: 'Gestión técnica de tintas, fórmulas, consumo y comportamiento.' },
      { code: 'FINISHING_MANAGER', name: 'Encargado de Troquelado y Rebobinado', description: 'Control productivo de procesos finales, mermas y cierre por OT.' },
      { code: 'QUALITY_MANAGER', name: 'Jefe de Calidad', description: 'Validación transversal de calidad, incidencias y tendencias.' },
      { code: 'AUDITOR', name: 'Auditor', description: 'Consulta global, trazabilidad y revisión de integridad.' },
    ];

    let adminRole = null;
    for (const role of roleDefinitions) {
      const savedRole = await prisma.role.upsert({
        where: { code: role.code },
        update: {
          name: role.name,
          description: role.description,
          active: true,
        },
        create: {
          code: role.code,
          name: role.name,
          description: role.description,
        },
      });

      if (role.code === 'ADMIN') {
        adminRole = savedRole;
      }
    }

    if (!adminRole) {
      throw new Error('No se pudo inicializar el rol ADMIN durante el seed.');
    }

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
