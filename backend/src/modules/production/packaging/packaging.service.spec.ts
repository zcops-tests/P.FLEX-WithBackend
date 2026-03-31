import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PackagingService } from './packaging.service';
import { PrismaService } from '../../../database/prisma.service';

describe('PackagingService', () => {
  let service: PackagingService;

  const mockPrisma = {
    $transaction: jest.fn((callback) => callback(mockPrisma)),
    packagingReport: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    workOrder: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'op-1',
      name: 'Operario Test',
      active: true,
      deleted_at: null,
      role: { code: 'OPERATOR' },
    });
    mockPrisma.workOrder.findUnique.mockResolvedValue({
      id: 'ot-1',
      ot_number: 'OT-SMOKE-1',
      cliente_razon_social: 'Cliente Smoke',
      descripcion: 'Producto Smoke',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PackagingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PackagingService>(PackagingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReport', () => {
    it('should create a packaging report with work order snapshots', async () => {
      mockPrisma.packagingReport.create.mockResolvedValue({
        id: 'pkg-1',
        reported_at: new Date('2026-03-31T10:00:00.000Z'),
        work_order_id: 'ot-1',
        work_order_number_snapshot: 'OT-SMOKE-1',
        client_snapshot: 'Cliente Smoke',
        product_snapshot: 'Producto Smoke',
        operator_name_snapshot: 'Operario Test',
        shift_name_snapshot: 'Turno Dia',
        lot_status: 'COMPLETE',
        rolls: 12,
        total_meters: 480,
        demasia_rolls: 2,
        demasia_meters: 18,
        notes: 'Observacion smoke',
      });

      const result = await service.createReport(
        {
          reported_at: new Date('2026-03-31T10:00:00.000Z').toISOString(),
          work_order_id: 'ot-1',
          shift_name: 'Turno Dia',
          rolls: 12,
          total_meters: 480,
          demasia_rolls: 2,
          demasia_meters: 18,
          notes: 'Observacion smoke',
        },
        'op-1',
      );

      expect(mockPrisma.packagingReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            work_order_id: 'ot-1',
            work_order_number_snapshot: 'OT-SMOKE-1',
            client_snapshot: 'Cliente Smoke',
            product_snapshot: 'Producto Smoke',
            operator_name_snapshot: 'Operario Test',
            lot_status: 'COMPLETE',
            rolls: 12,
          }),
        }),
      );
      expect(result.id).toBe('pkg-1');
      expect(result.status).toBe('Completo');
    });
  });

  describe('updateReport', () => {
    it('should throw NotFoundException when the report does not exist', async () => {
      mockPrisma.packagingReport.findUnique.mockResolvedValue(null);

      await expect(
        service.updateReport(
          'missing-report',
          {
            reported_at: new Date().toISOString(),
          },
          'op-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllReports', () => {
    it('should return paginated packaging reports mapped to frontend shape', async () => {
      mockPrisma.packagingReport.count.mockResolvedValue(1);
      mockPrisma.packagingReport.findMany.mockResolvedValue([
        {
          id: 'pkg-1',
          reported_at: new Date('2026-03-31T10:00:00.000Z'),
          work_order_id: 'ot-1',
          work_order_number_snapshot: 'OT-SMOKE-1',
          client_snapshot: 'Cliente Smoke',
          product_snapshot: 'Producto Smoke',
          operator_name_snapshot: 'Operario Test',
          shift_name_snapshot: 'Turno Dia',
          lot_status: 'PARTIAL',
          rolls: 8,
          total_meters: 320,
          demasia_rolls: 1,
          demasia_meters: 12,
          notes: 'Parcial',
          operator: { name: 'Operario Test' },
          shift: { name: 'Turno Dia' },
          work_order: { ot_number: 'OT-SMOKE-1' },
        },
      ]);

      const result = await service.findAllReports({ page: 1, pageSize: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          id: 'pkg-1',
          ot: 'OT-SMOKE-1',
          client: 'Cliente Smoke',
          description: 'Producto Smoke',
          status: 'Parcial',
          rolls: 8,
        }),
      );
      expect(result.meta.total).toBe(1);
    });
  });
});
