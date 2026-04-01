require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to backfill planning history.');
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(databaseUrl),
  log: ['error', 'warn'],
});

function normalizeArea(machineType, areaName, areaCode, lineValue) {
  const token = `${machineType || ''} ${areaName || ''} ${areaCode || ''} ${lineValue || ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  if (token.includes('TROQ') || token.includes('DIECUT')) return 'TROQUELADO';
  if (token.includes('REBOB') || token.includes('REWIND')) return 'REBOBINADO';
  return 'IMPRESION';
}

function inferShift(startTime) {
  const hour = Number(String(startTime || '00:00').slice(0, 2));
  return hour >= 7 && hour <= 18 ? 'DIA' : 'NOCHE';
}

function buildSnapshot(workOrder, machine, payload, area, shift, scheduledDate) {
  return {
    ot: String(payload.OT || workOrder.ot_number || '').trim(),
    client: String(payload['Razon Social'] || workOrder.cliente_razon_social || '').trim(),
    description: String(payload.descripcion || workOrder.descripcion || '').trim(),
    meters: Number(payload.total_mtl || workOrder.total_metros || 0) || 0,
    machine_code: String(machine?.code || payload.codmaquina || '').trim(),
    machine_name: String(machine?.name || payload.maquina || '').trim(),
    operator: String(payload.scheduleOperator || '').trim(),
    scheduled_date: scheduledDate,
    start_time: String(payload.scheduleStartTime || '').slice(0, 5),
    duration_minutes: Number(payload.scheduleDurationMinutes || 60) || 60,
    area,
    shift,
    notes: String(payload.scheduleNotes || '').trim(),
  };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const report = {
    scanned: 0,
    migrated: 0,
    skipped: [],
  };

  const workOrders = await prisma.workOrder.findMany({
    where: {
      deleted_at: null,
      raw_payload: { not: null },
    },
    include: {
      management_entries: {
        where: { exited_at: null },
        take: 1,
      },
    },
  });

  for (const workOrder of workOrders) {
    report.scanned += 1;
    const payload = workOrder.raw_payload && typeof workOrder.raw_payload === 'object' ? workOrder.raw_payload : {};
    const scheduledDate = String(payload.fechaPrd || '').trim();
    const startTime = String(payload.scheduleStartTime || '').trim();
    const machineId = String(payload.scheduleMachineId || '').trim();
    const machineCode = String(payload.codmaquina || '').trim().toUpperCase();
    const machineName = String(payload.maquina || '').trim().toUpperCase();

    if (!scheduledDate || !startTime) {
      report.skipped.push({ ot: workOrder.ot_number, reason: 'missing_schedule_fields' });
      continue;
    }

    let machine = null;
    if (machineId) {
      machine = await prisma.machine.findUnique({
        where: { id: machineId },
        include: { area: true },
      });
    }

    if (!machine && machineCode) {
      machine = await prisma.machine.findFirst({
        where: { code: machineCode, deleted_at: null },
        include: { area: true },
      });
    }

    if (!machine && machineName) {
      machine = await prisma.machine.findFirst({
        where: { name: machineName, deleted_at: null },
        include: { area: true },
      });
    }

    if (!machine) {
      report.skipped.push({ ot: workOrder.ot_number, reason: 'machine_not_found' });
      continue;
    }

    const existing = await prisma.productionScheduleEntry.findFirst({
      where: {
        deleted_at: null,
        work_order_id: workOrder.id,
        machine_id: machine.id,
        schedule_date: new Date(`${scheduledDate}T00:00:00.000Z`),
        start_time: `${startTime.slice(0, 5)}:00`,
      },
    });

    if (existing) {
      report.skipped.push({ ot: workOrder.ot_number, reason: 'already_migrated' });
      continue;
    }

    const area = normalizeArea(machine.type, machine.area?.name, machine.area?.code, payload.Linea_produccion);
    const shift = inferShift(startTime);
    const snapshot = buildSnapshot(workOrder, machine, payload, area, shift, scheduledDate);

    if (apply) {
      await prisma.productionScheduleEntry.create({
        data: {
          schedule_date: new Date(`${scheduledDate}T00:00:00.000Z`),
          shift,
          area,
          machine_id: machine.id,
          work_order_id: workOrder.id,
          start_time: `${startTime.slice(0, 5)}:00`,
          duration_minutes: Number(payload.scheduleDurationMinutes || 60) || 60,
          operator_name: String(payload.scheduleOperator || '').trim() || null,
          notes: String(payload.scheduleNotes || '').trim() || null,
          snapshot_payload: snapshot,
          created_by_user_id: workOrder.management_entries[0]?.entered_by_user_id || null,
          updated_by_user_id: workOrder.management_entries[0]?.entered_by_user_id || null,
        },
      });
    }

    report.migrated += 1;
  }

  console.log(JSON.stringify({ apply, ...report }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
