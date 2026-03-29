import { Test, TestingModule } from '@nestjs/testing';
import { DiecuttingService } from './diecutting.service';
import { PrismaService } from '../../../database/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { DiecutActivityType } from './dto/diecut-report.dto';

describe('DiecuttingService', () => {
  let service: DiecuttingService;
  let prisma: PrismaService;

  const mockPrisma = {
    $transaction: jest.fn((callback) => callback(mockPrisma)),
    diecutReport: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    workOrder: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    machine: {
      findUnique: jest.fn(),
    },
    die: {
      findUnique: jest.fn(),
    },
    diecutActivity: {
      createMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockStockService = {
    create: jest.fn().mockResolvedValue({ id: 'stock-1' }),
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
    mockPrisma.machine.findUnique.mockResolvedValue({
      id: 'mach-1',
      type: 'DIECUT',
      deleted_at: null,
      active: true,
      area: { name: 'Troquelado', code: 'TROQ' },
    });
    mockPrisma.diecutActivity.findFirst.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiecuttingService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: require('../../inventory/stock/stock.service').StockService,
          useValue: mockStockService,
        },
      ],
    }).compile();

    service = module.get<DiecuttingService>(DiecuttingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReport', () => {
    it('should create a diecutting report and automatic stock entry', async () => {
      mockPrisma.diecutReport.create.mockResolvedValue({
        id: 'rep-1',
        good_units: 500,
      });
      mockPrisma.diecutActivity.findFirst.mockResolvedValue(null);

      const result = await service.createReport(
        {
          reported_at: new Date().toISOString(),
          machine_id: 'mach-1',
          activities: [
            {
              activity_type: DiecutActivityType.RUN,
              quantity: 500,
              start_time: '08:00',
            },
          ],
          die_status: 'OK',
          production_status: 'TOTAL',
        },
        'op-1',
      );

      expect(prisma.diecutReport.create).toHaveBeenCalled();
      expect(mockStockService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 500,
        }),
      );
      expect(result.id).toBe('rep-1');
    });

    it('should throw ConflictException if overlaps exist', async () => {
      mockPrisma.diecutActivity.findFirst.mockResolvedValue({ id: 'old-act' });

      await expect(
        service.createReport(
          {
            reported_at: new Date().toISOString(),
            machine_id: 'mach-1',
            activities: [
              {
                activity_type: DiecutActivityType.RUN,
                start_time: '08:00',
                end_time: '10:00',
              },
            ],
          },
          'op-1',
        ),
      ).rejects.toThrow(require('@nestjs/common').ConflictException);
    });

    it('should reject a machine outside the diecutting area', async () => {
      mockPrisma.machine.findUnique.mockResolvedValue({
        id: 'mach-9',
        type: 'PRINT',
        deleted_at: null,
        active: true,
        area: { name: 'Imprenta', code: 'IMP' },
      });

      await expect(
        service.createReport(
          {
            reported_at: new Date().toISOString(),
            machine_id: 'mach-9',
            activities: [
              {
                activity_type: DiecutActivityType.RUN,
                quantity: 500,
                start_time: '08:00',
              },
            ],
          },
          'op-1',
        ),
      ).rejects.toThrow(require('@nestjs/common').BadRequestException);
    });
  });
});
