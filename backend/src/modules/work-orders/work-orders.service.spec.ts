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

  const mockPrisma = {
    workOrder: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
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
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'ot-1',
        ot_number: '12345',
        deleted_at: null,
        print_reports: [],
        diecut_reports: [],
      });

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
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'ot-1',
        ot_number: 'OT-1001',
        status: WorkOrderStatus.PLANNED,
        raw_payload: {
          Estado_pedido: 'PENDIENTE',
        },
        deleted_at: null,
      });
      mockPrisma.workOrder.update.mockResolvedValue({
        id: 'ot-1',
        ot_number: 'OT-1001',
        status: WorkOrderStatus.COMPLETED,
        raw_payload: {
          Estado_pedido: 'FINALIZADO',
        },
        deleted_at: null,
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
  });

  describe('exitManagement', () => {
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
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: '1',
        ot_number: 'OT-1',
        deleted_at: null,
        print_reports: [{ id: 'r1' }],
        diecut_reports: [],
      });

      await expect(service.remove('1')).rejects.toThrow(ConflictException);
    });
  });
});
