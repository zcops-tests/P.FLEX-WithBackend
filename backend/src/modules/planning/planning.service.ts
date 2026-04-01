import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  toFrontendPlanningScheduleEntry,
  toFrontendWorkOrder,
} from '../../common/utils/frontend-entity.util';
import {
  CreatePlanningScheduleDto,
  PlanningArea,
  PlanningScheduleQueryDto,
  PlanningShift,
  UpdatePlanningScheduleDto,
} from './dto/planning.dto';
import { WorkOrderStatus } from '../work-orders/dto/work-order.dto';

type MachineRecord = Awaited<
  ReturnType<PlanningService['requireMachineRecord']>
>;
type WorkOrderRecord = Awaited<
  ReturnType<PlanningService['requireWorkOrderRecord']>
>;

@Injectable()
export class PlanningService {
  constructor(private readonly prisma: PrismaService) {}

  async findSchedules(query: PlanningScheduleQueryDto) {
    const prisma = this.prisma as any;
    const where = {
      deleted_at: null,
      schedule_date: new Date(`${query.date}T00:00:00.000Z`),
      ...(query.shift ? { shift: query.shift } : {}),
      ...(query.area ? { area: query.area } : {}),
    };

    const items = await prisma.productionScheduleEntry.findMany({
      where,
      orderBy: [{ start_time: 'asc' }, { created_at: 'asc' }],
      include: {
        machine: true,
        work_order: true,
      },
    });

    return items.map((item) => toFrontendPlanningScheduleEntry(item));
  }

  async create(dto: CreatePlanningScheduleDto, userId?: string) {
    const prisma = this.prisma as any;
    const workOrder = await this.requireWorkOrderRecord(dto.work_order_id);
    const machine = await this.requireMachineRecord(dto.machine_id);
    const scheduleDate = this.toDateOnly(dto.schedule_date);
    const shift = this.resolveShift(dto.shift, dto.start_time);
    const area = this.resolveArea(dto.area, machine);

    await this.ensureNoConflict({
      machineId: machine.id,
      scheduleDate,
      startTime: dto.start_time,
      durationMinutes: dto.duration_minutes,
    });

    const snapshot = this.buildSnapshotPayload({
      workOrder,
      machine,
      scheduleDate: dto.schedule_date,
      shift,
      area,
      startTime: dto.start_time,
      durationMinutes: dto.duration_minutes,
      operatorName: dto.operator_name,
      notes: dto.notes,
    });

    const created = await prisma.productionScheduleEntry.create({
      data: {
        schedule_date: scheduleDate,
        shift,
        area,
        machine_id: machine.id,
        work_order_id: workOrder.id,
        start_time: this.toDbTime(dto.start_time),
        duration_minutes: dto.duration_minutes,
        operator_name: dto.operator_name,
        notes: dto.notes,
        snapshot_payload: snapshot as Prisma.InputJsonValue,
        created_by_user_id: userId,
        updated_by_user_id: userId,
      },
      include: {
        machine: true,
        work_order: true,
      },
    });

    await this.syncLegacyWorkOrderData({
      workOrder,
      machine,
      scheduleDate: dto.schedule_date,
      area,
      startTime: dto.start_time,
      durationMinutes: dto.duration_minutes,
      operatorName: dto.operator_name,
      notes: dto.notes,
    });

    await this.ensureManagementActivationIfToday(workOrder.id, dto.schedule_date, userId);

    return toFrontendPlanningScheduleEntry(created);
  }

  async update(id: string, dto: UpdatePlanningScheduleDto, userId?: string) {
    const prisma = this.prisma as any;
    const existing = await prisma.productionScheduleEntry.findUnique({
      where: { id },
      include: {
        machine: true,
        work_order: true,
        revisions: {
          orderBy: { revision_number: 'desc' },
          take: 1,
        },
      },
    });

    if (!existing || existing.deleted_at) {
      throw new NotFoundException(`Planning schedule ${id} not found`);
    }

    const scheduleDateText = dto.schedule_date || this.toDateText(existing.schedule_date);
    const isHistoricalEdit = scheduleDateText < this.getCurrentLocalDate();
    if (isHistoricalEdit && !String(dto.change_reason || '').trim()) {
      throw new BadRequestException(
        'Debe indicar un motivo para modificar una planificación histórica.',
      );
    }

    const machine = dto.machine_id
      ? await this.requireMachineRecord(dto.machine_id)
      : existing.machine;
    const workOrder = existing.work_order;
    const startTime = dto.start_time || String(existing.start_time || '').slice(0, 5);
    const durationMinutes =
      dto.duration_minutes ?? Number(existing.duration_minutes || 0);
    const shift = this.resolveShift(dto.shift || (existing.shift as PlanningShift), startTime);
    const area = this.resolveArea(dto.area || (existing.area as PlanningArea), machine);

    await this.ensureNoConflict({
      machineId: machine.id,
      scheduleDate: this.toDateOnly(scheduleDateText),
      startTime,
      durationMinutes,
      excludeId: existing.id,
    });

    const previousPayload = toFrontendPlanningScheduleEntry(existing);
    const snapshot = this.buildSnapshotPayload({
      workOrder,
      machine,
      scheduleDate: scheduleDateText,
      shift,
      area,
      startTime,
      durationMinutes,
      operatorName: dto.operator_name ?? existing.operator_name ?? undefined,
      notes: dto.notes ?? existing.notes ?? undefined,
    });

    const revisionNumber =
      Number(existing.revisions[0]?.revision_number || 0) + 1;

    const updated = await this.prisma.$transaction(async (tx) => {
      const typedTx = tx as any;
      const saved = await typedTx.productionScheduleEntry.update({
        where: { id },
        data: {
          schedule_date: this.toDateOnly(scheduleDateText),
          shift,
          area,
          machine_id: machine.id,
          start_time: this.toDbTime(startTime),
          duration_minutes: durationMinutes,
          operator_name: dto.operator_name ?? existing.operator_name ?? null,
          notes: dto.notes ?? existing.notes ?? null,
          snapshot_payload: snapshot as Prisma.InputJsonValue,
          updated_by_user_id: userId,
          row_version: { increment: 1 },
        },
        include: {
          machine: true,
          work_order: true,
        },
      });

      await typedTx.productionScheduleRevision.create({
        data: {
          schedule_entry_id: id,
          revision_number: revisionNumber,
          changed_by_user_id: userId,
          change_reason: dto.change_reason,
          before_payload: previousPayload as Prisma.InputJsonValue,
          after_payload: toFrontendPlanningScheduleEntry(saved) as Prisma.InputJsonValue,
        },
      });

      return saved;
    });

    await this.syncLegacyWorkOrderData({
      workOrder,
      machine,
      scheduleDate: scheduleDateText,
      area,
      startTime,
      durationMinutes,
      operatorName: dto.operator_name ?? existing.operator_name ?? undefined,
      notes: dto.notes ?? existing.notes ?? undefined,
    });

    await this.ensureManagementActivationIfToday(workOrder.id, scheduleDateText, userId);

    return toFrontendPlanningScheduleEntry(updated);
  }

  async remove(id: string, userId?: string) {
    const prisma = this.prisma as any;
    const existing = await prisma.productionScheduleEntry.findUnique({
      where: { id },
    });

    if (!existing || existing.deleted_at) {
      throw new NotFoundException(`Planning schedule ${id} not found`);
    }

    return prisma.productionScheduleEntry.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        updated_by_user_id: userId,
        row_version: { increment: 1 },
      },
    });
  }

  private async requireWorkOrderRecord(id: string) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id },
    });

    if (!workOrder || workOrder.deleted_at) {
      throw new NotFoundException(`Work order ${id} not found`);
    }

    return workOrder;
  }

  private async requireMachineRecord(id: string) {
    const machine = await this.prisma.machine.findUnique({
      where: { id },
      include: {
        area: true,
      },
    });

    if (!machine || machine.deleted_at || !machine.active) {
      throw new NotFoundException(`Machine ${id} not found`);
    }

    return machine;
  }

  private buildSnapshotPayload(input: {
    workOrder: WorkOrderRecord;
    machine: MachineRecord;
    scheduleDate: string;
    shift: PlanningShift;
    area: PlanningArea;
    startTime: string;
    durationMinutes: number;
    operatorName?: string;
    notes?: string;
  }) {
    const frontendWorkOrder = toFrontendWorkOrder(input.workOrder);

    return {
      ot: String(frontendWorkOrder.OT || input.workOrder.ot_number || '').trim(),
      client: String(frontendWorkOrder['Razon Social'] || input.workOrder.cliente_razon_social || '').trim(),
      description: String(frontendWorkOrder.descripcion || input.workOrder.descripcion || '').trim(),
      meters: Number(frontendWorkOrder.total_mtl || input.workOrder.total_metros || 0) || 0,
      machine_code: String(input.machine.code || '').trim(),
      machine_name: String(input.machine.name || '').trim(),
      operator: String(input.operatorName || '').trim(),
      scheduled_date: input.scheduleDate,
      start_time: input.startTime,
      duration_minutes: input.durationMinutes,
      area: input.area,
      shift: input.shift,
      notes: String(input.notes || '').trim(),
    };
  }

  private async ensureNoConflict(input: {
    machineId: string;
    scheduleDate: Date;
    startTime: string;
    durationMinutes: number;
    excludeId?: string;
  }) {
    const dateText = this.toDateText(input.scheduleDate);
    const requestedStart = this.toMinutes(input.startTime);
    const requestedEnd = requestedStart + input.durationMinutes;
    const prisma = this.prisma as any;
    const existingEntries = await prisma.productionScheduleEntry.findMany({
      where: {
        machine_id: input.machineId,
        schedule_date: input.scheduleDate,
        deleted_at: null,
        ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
      },
      select: {
        id: true,
        start_time: true,
        duration_minutes: true,
        snapshot_payload: true,
      },
    });

    const conflict = existingEntries.find((entry) => {
      const start = this.toMinutes(String(entry.start_time || '').slice(0, 5));
      const end = start + Number(entry.duration_minutes || 0);
      return requestedStart < end && requestedEnd > start;
    });

    if (conflict) {
      const snapshot =
        conflict.snapshot_payload &&
        typeof conflict.snapshot_payload === 'object' &&
        !Array.isArray(conflict.snapshot_payload)
          ? conflict.snapshot_payload
          : {};
      const conflictOt = String((snapshot as Record<string, unknown>).ot || '').trim();
      throw new ConflictException(
        `La maquina ya tiene una programación${conflictOt ? ` para la OT ${conflictOt}` : ''} el ${dateText} en ese rango horario.`,
      );
    }
  }

  private async syncLegacyWorkOrderData(input: {
    workOrder: WorkOrderRecord;
    machine: MachineRecord;
    scheduleDate: string;
    area: PlanningArea;
    startTime: string;
    durationMinutes: number;
    operatorName?: string;
    notes?: string;
  }) {
    const current = toFrontendWorkOrder(input.workOrder);
    const rawPayload: Record<string, unknown> = {
      ...(current.raw_payload || {}),
      fechaPrd: input.scheduleDate,
      codmaquina: input.machine.code,
      maquina: input.machine.name,
      Linea_produccion: input.area,
      scheduleMachineId: input.machine.id,
      scheduleStartTime: input.startTime,
      scheduleDurationMinutes: input.durationMinutes,
      scheduleOperator: input.operatorName || '',
      scheduleNotes: input.notes || '',
      scheduleDateTime: `${input.scheduleDate}T${input.startTime}`,
      Estado_pedido: 'PLANIFICADO',
    };

    await this.prisma.workOrder.update({
      where: { id: input.workOrder.id },
      data: {
        fecha_programada_produccion: this.toDateOnly(input.scheduleDate),
        maquina_texto: input.machine.name,
        status:
          input.workOrder.status === WorkOrderStatus.IMPORTED
            ? WorkOrderStatus.PLANNED
            : input.workOrder.status,
        raw_payload: rawPayload as Prisma.InputJsonValue,
        row_version: { increment: 1 },
      },
    });
  }

  private async ensureManagementActivationIfToday(
    workOrderId: string,
    scheduleDate: string,
    userId?: string,
  ) {
    if (!userId || scheduleDate !== this.getCurrentLocalDate()) {
      return;
    }

    const activeEntry = await this.prisma.workOrderManagementEntry.findFirst({
      where: {
        work_order_id: workOrderId,
        exited_at: null,
      },
      select: { id: true },
    });

    if (activeEntry) {
      return;
    }

    await this.prisma.workOrderManagementEntry.create({
      data: {
        work_order_id: workOrderId,
        entered_by_user_id: userId,
      },
    });
  }

  private resolveShift(requestedShift: PlanningShift, startTime: string) {
    const hour = Number(String(startTime || '').split(':')[0]);
    const matchesDay = hour >= 7 && hour <= 18;
    const matchesNight = hour >= 19 || hour <= 6;

    if (
      (requestedShift === PlanningShift.DIA && !matchesDay) ||
      (requestedShift === PlanningShift.NOCHE && !matchesNight)
    ) {
      throw new BadRequestException(
        'La hora seleccionada no corresponde al turno indicado.',
      );
    }

    return requestedShift;
  }

  private resolveArea(requestedArea: PlanningArea, machine: MachineRecord) {
    const machineArea = this.normalizeArea(machine.type, machine.area?.name, machine.area?.code);
    if (machineArea !== requestedArea) {
      throw new BadRequestException(
        'La maquina seleccionada no pertenece al area indicada.',
      );
    }

    return requestedArea;
  }

  private normalizeArea(
    machineType?: string | null,
    areaName?: string | null,
    areaCode?: string | null,
  ): PlanningArea {
    const token = `${machineType || ''} ${areaName || ''} ${areaCode || ''}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    if (token.includes('TROQ') || token.includes('DIECUT')) {
      return PlanningArea.TROQUELADO;
    }
    if (token.includes('REBOB') || token.includes('REWIND')) {
      return PlanningArea.REBOBINADO;
    }

    return PlanningArea.IMPRESION;
  }

  private toDateOnly(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private toDateText(value: Date | string) {
    return new Date(value).toISOString().slice(0, 10);
  }

  private toDbTime(value: string) {
    return `${String(value || '').slice(0, 5)}:00`;
  }

  private toMinutes(value: string) {
    const [hours, minutes] = String(value || '00:00')
      .slice(0, 5)
      .split(':')
      .map((part) => Number(part) || 0);
    return hours * 60 + minutes;
  }

  private getCurrentLocalDate() {
    const now = new Date();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    const day = `${now.getDate()}`.padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }
}
