import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { PrismaService } from '../../database/prisma.service';
import {
  WorkOrderManagementExitAction,
  WorkOrderStatus,
} from './dto/work-order.dto';

describe('WorkOrdersService', () => {
  let service: WorkOrdersService;

  const buildWorkOrder = (overrides: Record<string, any> = {}) => ({
    id: 'ot-1',
    ot_number: 'OT-1001',
    status: WorkOrderStatus.IMPORTED,
    descripcion: 'Descripcion base',
    nro_cotizacion: 'COT-1',
    nro_ficha: 'FICHA-1',
    pedido: 'PED-1',
    orden_compra: 'OC-1',
    cliente_razon_social: 'Cliente Demo',
    vendedor: 'Vendedor Demo',
    fecha_pedido: new Date('2026-03-20T00:00:00.000Z'),
    fecha_entrega: new Date('2026-04-01T00:00:00.000Z'),
    fecha_ingreso_planta: null,
    fecha_programada_produccion: null,
    cantidad_pedida: 1000,
    unidad: 'UNIDADES',
    material: 'BOPP',
    ancho_mm: 120,
    avance_mm: 220,
    desarrollo_mm: 320,
    columnas: 2,
    adhesivo: 'Hot Melt',
    acabado: 'Barniz',
    troquel: 'TRQ-1',
    maquina_texto: 'IMP-01',
    total_metros: 1500,
    total_m2: 800,
    observaciones_diseno: 'Obs diseño',
    observaciones_cotizacion: 'Obs cot',
    raw_payload: {
      OT: 'OT-1001',
      descripcion: 'Descripcion base',
      Estado_pedido: 'PENDIENTE',
    },
    row_version: BigInt(1),
    print_reports: [],
    diecut_reports: [],
    rewind_reports: [],
    packaging_reports: [],
    deleted_at: null,
    ...overrides,
  });

  const mockPrisma = {
    workOrder: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
    },
    workOrderManagementEntry: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    mockPrisma.$transaction.mockImplementation(async (input: any) => {
      if (typeof input === 'function') {
        return input(mockPrisma);
      }

      return Promise.all(input);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkOrdersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WorkOrdersService>(WorkOrdersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return a work order if it exists', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue(
        buildWorkOrder({ ot_number: '12345' }),
      );

      const result = await service.findOne('ot-1');
      expect(result.ot_number).toBe('12345');
    });

    it('should throw NotFoundException if it does not exist', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new work order when ot_number is unique', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue(null);
      mockPrisma.workOrder.create.mockResolvedValue(
        buildWorkOrder({
          ot_number: 'OT-9001',
          descripcion: 'Nueva OT',
          raw_payload: {
            OT: 'OT-9001',
            descripcion: 'Nueva OT',
          },
        }),
      );

      const result = await service.create({
        ot_number: 'ot-9001',
        descripcion: 'Nueva OT',
      } as any);

      expect(mockPrisma.workOrder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ot_number: 'OT-9001',
          descripcion: 'Nueva OT',
        }),
      });
      expect(result.ot_number).toBe('OT-9001');
    });

    it('should throw ConflictException when ot_number already exists', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue(
        buildWorkOrder({ ot_number: 'OT-1001' }),
      );

      await expect(
        service.create({ ot_number: 'ot-1001' } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated work orders filtered by query params', async () => {
      mockPrisma.workOrder.count.mockResolvedValue(1);
      mockPrisma.workOrder.findMany.mockResolvedValue([
        buildWorkOrder({
          id: 'ot-2',
          ot_number: 'OT-2001',
          descripcion: 'Filtrada',
          raw_payload: {
            OT: 'OT-2001',
            descripcion: 'Filtrada',
            Estado_pedido: 'PENDIENTE',
          },
        }),
      ]);

      const result = await service.findAll({
        page: 1,
        pageSize: 10,
        q: 'OT-2001',
        status: WorkOrderStatus.IMPORTED,
      } as any);

      expect(mockPrisma.workOrder.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          deleted_at: null,
          status: WorkOrderStatus.IMPORTED,
          OR: expect.any(Array),
        }),
      });
      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.items[0].OT).toBe('OT-2001');
    });
  });

  describe('findManagement', () => {
    it('should prefer the frozen management snapshot over imported work order changes', async () => {
      mockPrisma.workOrderManagementEntry.findMany.mockResolvedValue([
        {
          id: 'entry-1',
          work_order: {
            id: 'ot-1',
            ot_number: 'OT-1001',
            status: WorkOrderStatus.PLANNED,
            raw_payload: {
              OT: 'OT-1001',
              descripcion: 'Descripcion importada',
              Estado_pedido: 'PENDIENTE',
              __management_snapshot: {
                OT: 'OT-1001',
                descripcion: 'Descripcion congelada en gestion',
                Estado_pedido: 'EN PROCESO',
                scheduleStartTime: '08:00',
              },
            },
            deleted_at: null,
          },
        },
      ]);

      const result = await service.findManagement();

      expect(result[0].descripcion).toBe('Descripcion congelada en gestion');
      expect(result[0].Estado_pedido).toBe('EN PROCESO');
      expect(result[0].scheduleStartTime).toBe('08:00');
      expect(result[0].raw_payload).toEqual(
        expect.objectContaining({
          descripcion: 'Descripcion congelada en gestion',
          Estado_pedido: 'EN PROCESO',
          scheduleStartTime: '08:00',
        }),
      );
    });
  });

  describe('update', () => {
    it('should update a work order when it is not active in management', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue(buildWorkOrder());
      mockPrisma.workOrderManagementEntry.findFirst.mockResolvedValue(null);
      mockPrisma.workOrder.update.mockResolvedValue(
        buildWorkOrder({
          descripcion: 'Descripcion actualizada',
          row_version: BigInt(2),
          raw_payload: {
            OT: 'OT-1001',
            descripcion: 'Descripcion actualizada',
            Estado_pedido: 'PENDIENTE',
          },
        }),
      );

      const result = await service.update('ot-1', {
        row_version: 1,
        descripcion: 'Descripcion actualizada',
      });

      expect(mockPrisma.workOrder.update).toHaveBeenCalledWith({
        where: { id: 'ot-1' },
        data: expect.objectContaining({
          descripcion: 'Descripcion actualizada',
          row_version: { increment: 1 },
        }),
      });
      expect(result.descripcion).toBe('Descripcion actualizada');
    });

    it('should refresh the management snapshot when updating an active work order', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue(
        buildWorkOrder({
          status: WorkOrderStatus.PLANNED,
          raw_payload: {
            OT: 'OT-1001',
            descripcion: 'Descripcion activa',
            __management_snapshot: {
              OT: 'OT-1001',
              descripcion: 'Descripcion congelada',
              Estado_pedido: 'EN PROCESO',
            },
          },
        }),
      );
      mockPrisma.workOrderManagementEntry.findFirst.mockResolvedValue({
        id: 'entry-1',
      });
      mockPrisma.workOrder.update.mockResolvedValue(
        buildWorkOrder({
          status: WorkOrderStatus.PLANNED,
          row_version: BigInt(2),
          raw_payload: {
            OT: 'OT-1001',
            descripcion: 'Descripcion importada',
            __management_snapshot: {
              OT: 'OT-1001',
              descripcion: 'Descripcion congelada',
              Estado_pedido: 'EN PROCESO',
            },
          },
        }),
      );

      await service.update('ot-1', {
        row_version: 1,
        raw_payload: {
          descripcion: 'Descripcion importada',
        },
      });

      expect(mockPrisma.workOrder.update).toHaveBeenCalledWith({
        where: { id: 'ot-1' },
        data: expect.objectContaining({
          raw_payload: expect.objectContaining({
            descripcion: 'Descripcion importada',
            __management_snapshot: expect.objectContaining({
              descripcion: 'Descripcion importada',
            }),
          }),
          row_version: { increment: 1 },
        }),
      });
    });
  });

  describe('enterManagement', () => {
    it('should create a management entry and update plant data when imported', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'ot-1',
        ot_number: 'OT-1001',
        status: WorkOrderStatus.IMPORTED,
        fecha_ingreso_planta: null,
        raw_payload: {},
        deleted_at: null,
      });
      mockPrisma.workOrderManagementEntry.findFirst.mockResolvedValue(null);
      mockPrisma.workOrder.update.mockResolvedValue({
        id: 'ot-1',
        ot_number: 'OT-1001',
        status: WorkOrderStatus.PLANNED,
        fecha_ingreso_planta: new Date('2026-03-28T00:00:00.000Z'),
        raw_payload: {
          'FECHA INGRESO PLANTA': '2026-03-28',
          Estado_pedido: 'PENDIENTE',
        },
        deleted_at: null,
      });

      await service.enterManagement('ot-1', 'user-1');

      expect(mockPrisma.workOrder.update).toHaveBeenCalled();
      expect(mockPrisma.workOrderManagementEntry.create).toHaveBeenCalledWith({
        data: {
          work_order_id: 'ot-1',
          entered_by_user_id: 'user-1',
        },
      });
    });

    it('should throw ConflictException when the work order is already active in management', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'ot-1',
        ot_number: 'OT-1001',
        status: WorkOrderStatus.PLANNED,
        fecha_ingreso_planta: new Date('2026-03-28T00:00:00.000Z'),
        raw_payload: {},
        deleted_at: null,
      });
      mockPrisma.workOrderManagementEntry.findFirst.mockResolvedValue({
        id: 'entry-1',
      });

      await expect(service.enterManagement('ot-1', 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('bulkUpsert', () => {
    it('should preserve the active management snapshot while importing internal database changes', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValue([
        {
          id: 'ot-1',
          ot_number: 'OT-1001',
          status: WorkOrderStatus.PLANNED,
          fecha_ingreso_planta: new Date('2026-03-28T00:00:00.000Z'),
          fecha_programada_produccion: new Date('2026-03-30T00:00:00.000Z'),
          maquina_texto: 'IMP-01',
          raw_payload: {
            OT: 'OT-1001',
            descripcion: 'Descripcion activa',
            scheduleStartTime: '08:00',
            __management_snapshot: {
              OT: 'OT-1001',
              descripcion: 'Descripcion activa',
              scheduleStartTime: '08:00',
            },
          },
          management_entries: [{ id: 'entry-1' }],
        },
      ]);

      await service.bulkUpsert([
        {
          ot_number: 'OT-1001',
          descripcion: 'Descripcion importada',
          status: WorkOrderStatus.IMPORTED,
          raw_payload: {
            OT: 'OT-1001',
            descripcion: 'Descripcion importada',
          },
        } as any,
      ]);

      expect(mockPrisma.workOrder.upsert).toHaveBeenCalledWith({
        where: { ot_number: 'OT-1001' },
        create: expect.any(Object),
        update: expect.objectContaining({
          status: WorkOrderStatus.PLANNED,
          maquina_texto: 'IMP-01',
          raw_payload: expect.objectContaining({
            descripcion: 'Descripcion importada',
            scheduleStartTime: '08:00',
            __management_snapshot: expect.objectContaining({
              descripcion: 'Descripcion activa',
              scheduleStartTime: '08:00',
            }),
          }),
        }),
      });
    });
  });

  describe('updateStatus', () => {
    it('should treat same-status updates as a no-op', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'ot-1',
        ot_number: 'OT-1001',
        status: WorkOrderStatus.IN_PRODUCTION,
        raw_payload: {
          Estado_pedido: 'EN PROCESO',
        },
        deleted_at: null,
      });

      const result = await service.updateStatus(
        'ot-1',
        WorkOrderStatus.IN_PRODUCTION,
      );

      expect(mockPrisma.workOrder.update).not.toHaveBeenCalled();
      expect(result.Estado_pedido).toBe('EN PROCESO');
    });

    it('should allow direct status jumps without conflict', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue(
        buildWorkOrder({
          status: WorkOrderStatus.PLANNED,
          raw_payload: {
            OT: 'OT-1001',
            Estado_pedido: 'PENDIENTE',
          },
        }),
      );
      mockPrisma.workOrderManagementEntry.findFirst.mockResolvedValue(null);
      mockPrisma.workOrder.update.mockResolvedValue({
        ...buildWorkOrder(),
        status: WorkOrderStatus.COMPLETED,
        raw_payload: {
          OT: 'OT-1001',
          Estado_pedido: 'FINALIZADO',
        },
      });

      const result = await service.updateStatus(
        'ot-1',
        WorkOrderStatus.COMPLETED,
      );

      expect(mockPrisma.workOrder.update).toHaveBeenCalledWith({
        where: { id: 'ot-1' },
        data: {
          status: WorkOrderStatus.COMPLETED,
          raw_payload: expect.objectContaining({
            Estado_pedido: 'FINALIZADO',
          }),
          row_version: { increment: 1 },
        },
      });
      expect(result.Estado_pedido).toBe('FINALIZADO');
    });

    it('should refresh management snapshot when updating status for an active work order', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue(
        buildWorkOrder({
          status: WorkOrderStatus.PLANNED,
          raw_payload: {
            OT: 'OT-1001',
            Estado_pedido: 'PENDIENTE',
            __management_snapshot: {
              OT: 'OT-1001',
              Estado_pedido: 'EN PROCESO',
            },
          },
        }),
      );
      mockPrisma.workOrderManagementEntry.findFirst.mockResolvedValue({
        id: 'entry-1',
      });
      mockPrisma.workOrder.update.mockResolvedValue(
        buildWorkOrder({
          status: WorkOrderStatus.IN_PRODUCTION,
          row_version: BigInt(2),
          raw_payload: {
            OT: 'OT-1001',
            Estado_pedido: 'EN PROCESO',
            __management_snapshot: {
              OT: 'OT-1001',
              Estado_pedido: 'PENDIENTE',
            },
          },
        }),
      );

      await service.updateStatus('ot-1', WorkOrderStatus.IN_PRODUCTION);

      expect(mockPrisma.workOrder.update).toHaveBeenCalledWith({
        where: { id: 'ot-1' },
        data: expect.objectContaining({
          raw_payload: expect.objectContaining({
            Estado_pedido: 'EN PROCESO',
            __management_snapshot: expect.objectContaining({
              Estado_pedido: 'EN PROCESO',
            }),
          }),
          row_version: { increment: 1 },
        }),
      });
    });
  });

  describe('exitManagement', () => {
    it('should remove a work order from management without changing status when action is REMOVE_ONLY', async () => {
      mockPrisma.workOrderManagementEntry.findFirst.mockResolvedValue({
        id: 'entry-1',
        work_order: buildWorkOrder({
          status: WorkOrderStatus.PLANNED,
        }),
      });

      const result = await service.exitManagement(
        'ot-1',
        WorkOrderManagementExitAction.REMOVE_ONLY,
        'user-1',
      );

      expect(mockPrisma.workOrder.update).not.toHaveBeenCalled();
      expect(mockPrisma.workOrderManagementEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: expect.objectContaining({
          exited_by_user_id: 'user-1',
          exit_action: WorkOrderManagementExitAction.REMOVE_ONLY,
        }),
      });
      expect(result.ot_number).toBe('OT-1001');
    });

    it('should clear plant entry when exiting management with CLEAR_PLANT_ENTRY', async () => {
      mockPrisma.workOrderManagementEntry.findFirst.mockResolvedValue({
        id: 'entry-1',
        work_order: buildWorkOrder({
          status: WorkOrderStatus.PLANNED,
          fecha_ingreso_planta: new Date('2026-03-28T00:00:00.000Z'),
        }),
      });
      mockPrisma.workOrder.update.mockResolvedValue(
        buildWorkOrder({
          fecha_ingreso_planta: null,
          row_version: BigInt(2),
          raw_payload: {
            OT: 'OT-1001',
            'FECHA INGRESO PLANTA': '',
            Estado_pedido: 'PENDIENTE',
          },
        }),
      );

      const result = await service.exitManagement(
        'ot-1',
        WorkOrderManagementExitAction.CLEAR_PLANT_ENTRY,
        'user-1',
      );

      expect(mockPrisma.workOrder.update).toHaveBeenCalledWith({
        where: { id: 'ot-1' },
        data: expect.objectContaining({
          fecha_ingreso_planta: null,
          row_version: { increment: 1 },
        }),
      });
      expect(result['FECHA INGRESO PLANTA']).toBe('');
    });

    it('should reject a revert when the work order already started production', async () => {
      mockPrisma.workOrderManagementEntry.findFirst.mockResolvedValue({
        id: 'entry-1',
        work_order: {
          id: 'ot-1',
          ot_number: 'OT-1001',
          status: WorkOrderStatus.IN_PRODUCTION,
          fecha_ingreso_planta: new Date('2026-03-28T00:00:00.000Z'),
          raw_payload: {},
          deleted_at: null,
        },
      });

      await expect(
        service.exitManagement(
          'ot-1',
          WorkOrderManagementExitAction.REVERT_TO_IMPORTED,
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should throw ConflictException if has reports', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue(
        buildWorkOrder({
          id: '1',
          ot_number: 'OT-1',
          print_reports: [{ id: 'r1' }],
        }),
      );

      await expect(service.remove('1')).rejects.toThrow(ConflictException);
    });

    it('should soft-delete a work order without reports', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue(
        buildWorkOrder({
          id: '1',
          ot_number: 'OT-1',
          raw_payload: {
            OT: 'OT-1',
            Estado_pedido: 'PENDIENTE',
          },
        }),
      );
      mockPrisma.workOrder.update.mockResolvedValue(
        buildWorkOrder({
          id: '1',
          ot_number: 'OT-1',
          status: WorkOrderStatus.CANCELLED,
          deleted_at: new Date('2026-04-01T00:00:00.000Z'),
          row_version: BigInt(2),
          raw_payload: {
            OT: 'OT-1',
            Estado_pedido: 'PAUSADA',
          },
        }),
      );

      const result = await service.remove('1');

      expect(mockPrisma.workOrder.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          status: WorkOrderStatus.CANCELLED,
          deleted_at: expect.any(Date),
          row_version: { increment: 1 },
        }),
      });
      expect(result.status).toBe(WorkOrderStatus.CANCELLED);
    });
  });
});
