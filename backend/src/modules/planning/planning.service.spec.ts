import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PlanningService } from './planning.service';
import {
  PlanningArea,
  PlanningShift,
} from './dto/planning.dto';
import { WorkOrderStatus } from '../work-orders/dto/work-order.dto';

describe('PlanningService', () => {
  let service: PlanningService;

  const mockPrisma = {
    productionScheduleEntry: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    productionScheduleRevision: {
      create: jest.fn(),
    },
    machine: {
      findUnique: jest.fn(),
    },
    workOrder: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    workOrderManagementEntry: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanningService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PlanningService>(PlanningService);
    jest.clearAllMocks();
  });

  it('lists schedules by date and maps the response for frontend', async () => {
    mockPrisma.productionScheduleEntry.findMany.mockResolvedValue([
      {
        id: 'schedule-1',
        row_version: BigInt(1),
        work_order_id: 'wo-1',
        machine_id: 'machine-1',
        schedule_date: new Date('2026-04-01T00:00:00.000Z'),
        shift: PlanningShift.DIA,
        area: PlanningArea.IMPRESION,
        start_time: '08:00:00',
        duration_minutes: 120,
        operator_name: 'Juan',
        notes: 'Notas',
        snapshot_payload: {
          ot: 'OT-1001',
          client: 'Cliente Demo',
          description: 'Etiqueta',
          meters: 1200,
          machine_code: 'IMP-01',
          machine_name: 'Impresora 1',
        },
        machine: { id: 'machine-1', code: 'IMP-01', name: 'Impresora 1' },
        work_order: { id: 'wo-1', ot_number: 'OT-1001', cliente_razon_social: 'Cliente Demo', descripcion: 'Etiqueta' },
      },
    ]);

    const result = await service.findSchedules({
      date: '2026-04-01',
      shift: PlanningShift.DIA,
      area: PlanningArea.IMPRESION,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        ot: 'OT-1001',
        machineCode: 'IMP-01',
        scheduledDate: '2026-04-01',
      }),
    );
  });

  it('creates a schedule entry and syncs legacy fields in the OT', async () => {
    mockPrisma.workOrder.findUnique.mockResolvedValue({
      id: 'wo-1',
      ot_number: 'OT-1001',
      status: WorkOrderStatus.IMPORTED,
      descripcion: 'Etiqueta',
      cliente_razon_social: 'Cliente Demo',
      total_metros: 1500,
      raw_payload: { OT: 'OT-1001', descripcion: 'Etiqueta', 'Razon Social': 'Cliente Demo' },
      deleted_at: null,
    });
    mockPrisma.machine.findUnique.mockResolvedValue({
      id: 'machine-1',
      code: 'IMP-01',
      name: 'Impresora 1',
      type: 'Impresión',
      active: true,
      deleted_at: null,
      area: { name: 'Impresión', code: 'IMP' },
    });
    mockPrisma.productionScheduleEntry.findMany.mockResolvedValue([]);
    mockPrisma.productionScheduleEntry.create.mockResolvedValue({
      id: 'schedule-1',
      row_version: BigInt(1),
      work_order_id: 'wo-1',
      machine_id: 'machine-1',
      schedule_date: new Date('2026-04-01T00:00:00.000Z'),
      shift: PlanningShift.DIA,
      area: PlanningArea.IMPRESION,
      start_time: '08:00:00',
      duration_minutes: 120,
      operator_name: 'Juan',
      notes: 'Notas',
      snapshot_payload: {
        ot: 'OT-1001',
        client: 'Cliente Demo',
        description: 'Etiqueta',
        meters: 1500,
        machine_code: 'IMP-01',
        machine_name: 'Impresora 1',
      },
      machine: { id: 'machine-1', code: 'IMP-01', name: 'Impresora 1' },
      work_order: { id: 'wo-1', ot_number: 'OT-1001', cliente_razon_social: 'Cliente Demo', descripcion: 'Etiqueta' },
    });
    mockPrisma.workOrder.update.mockResolvedValue({});
    mockPrisma.workOrderManagementEntry.findFirst.mockResolvedValue(null);
    mockPrisma.workOrderManagementEntry.create.mockResolvedValue({});

    const result = await service.create({
      work_order_id: 'wo-1',
      machine_id: 'machine-1',
      schedule_date: '2026-04-01',
      shift: PlanningShift.DIA,
      area: PlanningArea.IMPRESION,
      start_time: '08:00',
      duration_minutes: 120,
      operator_name: 'Juan',
      notes: 'Notas',
    }, 'user-1');

    expect(mockPrisma.productionScheduleEntry.create).toHaveBeenCalled();
    expect(mockPrisma.workOrder.update).toHaveBeenCalledWith({
      where: { id: 'wo-1' },
      data: expect.objectContaining({
        fecha_programada_produccion: new Date('2026-04-01T00:00:00.000Z'),
        maquina_texto: 'Impresora 1',
        status: WorkOrderStatus.PLANNED,
        raw_payload: expect.objectContaining({
          scheduleMachineId: 'machine-1',
          scheduleStartTime: '08:00',
          fechaPrd: '2026-04-01',
          Estado_pedido: 'PLANIFICADO',
        }),
      }),
    });
    expect(result.ot).toBe('OT-1001');
  });

  it('blocks overlapping schedules on the same machine and date', async () => {
    mockPrisma.workOrder.findUnique.mockResolvedValue({
      id: 'wo-1',
      ot_number: 'OT-1001',
      status: WorkOrderStatus.IMPORTED,
      descripcion: 'Etiqueta',
      cliente_razon_social: 'Cliente Demo',
      total_metros: 1500,
      raw_payload: { OT: 'OT-1001' },
      deleted_at: null,
    });
    mockPrisma.machine.findUnique.mockResolvedValue({
      id: 'machine-1',
      code: 'IMP-01',
      name: 'Impresora 1',
      type: 'Impresión',
      active: true,
      deleted_at: null,
      area: { name: 'Impresión', code: 'IMP' },
    });
    mockPrisma.productionScheduleEntry.findMany.mockResolvedValue([
      {
        id: 'schedule-existing',
        start_time: '08:00:00',
        duration_minutes: 120,
        snapshot_payload: { ot: 'OT-2002' },
      },
    ]);

    await expect(
      service.create({
        work_order_id: 'wo-1',
        machine_id: 'machine-1',
        schedule_date: '2026-04-01',
        shift: PlanningShift.DIA,
        area: PlanningArea.IMPRESION,
        start_time: '09:00',
        duration_minutes: 60,
      }, 'user-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('requires a change reason for historical edits', async () => {
    const pastDate = '2026-03-30';
    mockPrisma.productionScheduleEntry.findUnique.mockResolvedValue({
      id: 'schedule-1',
      row_version: BigInt(1),
      work_order_id: 'wo-1',
      machine_id: 'machine-1',
      schedule_date: new Date(`${pastDate}T00:00:00.000Z`),
      shift: PlanningShift.DIA,
      area: PlanningArea.IMPRESION,
      start_time: '08:00:00',
      duration_minutes: 120,
      operator_name: 'Juan',
      notes: 'Notas',
      snapshot_payload: { ot: 'OT-1001' },
      deleted_at: null,
      machine: {
        id: 'machine-1',
        code: 'IMP-01',
        name: 'Impresora 1',
        type: 'Impresión',
        area: { name: 'Impresión', code: 'IMP' },
      },
      work_order: {
        id: 'wo-1',
        ot_number: 'OT-1001',
        status: WorkOrderStatus.PLANNED,
        descripcion: 'Etiqueta',
        cliente_razon_social: 'Cliente Demo',
        total_metros: 1000,
        raw_payload: { OT: 'OT-1001' },
      },
      revisions: [],
    });

    await expect(
      service.update('schedule-1', {
        notes: 'Cambio histórico',
      }, 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });
});
