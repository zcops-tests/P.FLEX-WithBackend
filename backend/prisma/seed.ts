import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createPrismaClientOptions } from '../src/database/prisma-client-options';
import { DEFAULT_ROLE_PERMISSION_CODES, PERMISSION_DEFINITIONS } from '../src/modules/auth/authorization/permission-catalog';

const prisma = new PrismaClient(createPrismaClientOptions());

function getEnvString(key: string, fallback: string) {
  const value = process.env[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback;
}

async function main() {
  console.log('Seeding database...');

  // 1. Roles
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
  ] as const;

  let adminRole = null as null | { id: string; name: string };
  for (const role of roleDefinitions) {
    const savedRole = await prisma.role.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        description: role.description,
        active: true,
        deleted_at: null,
      },
      create: {
        code: role.code,
        name: role.name,
        description: role.description,
      },
    });

    if (role.code === 'ADMIN') {
      adminRole = { id: savedRole.id, name: savedRole.name };
    }
  }

  // 1.1 Permissions and default role grants
  const permissionIdsByCode = new Map<string, string>();
  for (const permission of PERMISSION_DEFINITIONS) {
    const savedPermission = await prisma.permission.upsert({
      where: { code: permission.code },
      update: {
        name: permission.name,
        description: permission.description,
        deleted_at: null,
      },
      create: {
        code: permission.code,
        name: permission.name,
        description: permission.description,
      },
    });
    permissionIdsByCode.set(savedPermission.code, savedPermission.id);
  }

  const savedRoles = await prisma.role.findMany({
    where: { deleted_at: null },
    select: { id: true, code: true },
  });

  for (const role of savedRoles) {
    const desiredPermissionCodes = DEFAULT_ROLE_PERMISSION_CODES[role.code] || [];
    if (!(role.code in DEFAULT_ROLE_PERMISSION_CODES)) continue;
    const desiredPermissionIds = desiredPermissionCodes
      .map((permissionCode) => permissionIdsByCode.get(permissionCode))
      .filter((permissionId): permissionId is string => Boolean(permissionId));

    await prisma.rolePermission.updateMany({
      where: {
        role_id: role.id,
        ...(desiredPermissionIds.length ? { permission_id: { notIn: desiredPermissionIds } } : {}),
      },
      data: {
        deleted_at: new Date(),
      },
    });

    for (const permissionId of desiredPermissionIds) {

      await prisma.rolePermission.upsert({
        where: {
          role_id_permission_id: {
            role_id: role.id,
            permission_id: permissionId,
          },
        },
        update: {
          deleted_at: null,
        },
        create: {
          role_id: role.id,
          permission_id: permissionId,
        },
      });
    }
  }

  if (!adminRole) {
    throw new Error('No se pudo inicializar el rol ADMIN durante el seed.');
  }

  // 2. Dev Admin User
  const nodeEnv = getEnvString('NODE_ENV', 'development');
  const shouldSeedDevAdmin = process.env.SEED_DEV_ADMIN === 'true' || nodeEnv !== 'production';
  const devAdminUsername = getEnvString('DEV_ADMIN_USERNAME', '99999999');
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
  for (const area of [
    { code: 'IMP', name: 'Imprenta' },
    { code: 'TROQ', name: 'Troquelado' },
    { code: 'REBOB', name: 'Rebobinado' },
    { code: 'EMPAQ', name: 'Empaquetado' },
  ]) {
    await prisma.area.upsert({
      where: { code: area.code },
      update: {
        name: area.name,
        active: true,
        deleted_at: null,
      },
      create: area,
    });
  }

  // 4. Shifts
  await prisma.shift.upsert({
    where: { code: 'T1' },
    update: {
      name: 'Turno 1',
      start_time: '06:00:00',
      end_time: '14:00:00',
      crosses_midnight: false,
      active: true,
      deleted_at: null,
    },
    create: {
      code: 'T1',
      name: 'Turno 1',
      start_time: '06:00:00',
      end_time: '14:00:00',
      crosses_midnight: false,
      active: true,
    },
  });

  await prisma.shift.upsert({
    where: { code: 'T2' },
    update: {
      name: 'Turno 2',
      start_time: '14:00:00',
      end_time: '22:00:00',
      crosses_midnight: false,
      active: true,
      deleted_at: null,
    },
    create: {
      code: 'T2',
      name: 'Turno 2',
      start_time: '14:00:00',
      end_time: '22:00:00',
      crosses_midnight: false,
      active: true,
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
