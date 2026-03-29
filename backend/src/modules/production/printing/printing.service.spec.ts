import { Test, TestingModule } from '@nestjs/testing';
import { PrintingService } from './printing.service';
import { PrismaService } from '../../../database/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { PrintActivityType } from './dto/print-report.dto';

describe('PrintingService', () => {
  let service: PrintingService;
  let prisma: PrismaService;

  const mockPrisma = {
    $transaction: jest.fn((callback) => callback(mockPrisma)),
    printReport: {
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
    clise: {
      findUnique: jest.fn(),
    },
    die: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    printActivity: {
      createMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockConflictException = require('@nestjs/common').ConflictException;

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
      type: 'PRINT',
      deleted_at: null,
      active: true,
      area: { name: 'Imprenta', code: 'IMP' },
    });
    mockPrisma.die.findFirst.mockResolvedValue(null);
    mockPrisma.printActivity.findFirst.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrintingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PrintingService>(PrintingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReport', () => {
    it('should create a printing report and update accumulation', async () => {
      mockPrisma.printReport.create.mockResolvedValue({
        id: 'rep-1',
        total_meters: 100,
      });

      const result = await service.createReport(
        {
          reported_at: new Date().toISOString(),
          machine_id: 'mach-1',
          activities: [
            {
              activity_type: PrintActivityType.RUN,
              meters: 100,
              start_time: '08:00',
            },
          ],
          production_status: 'TOTAL',
        },
        'op-1',
      );

      expect(prisma.printReport.create).toHaveBeenCalled();
      expect(result.id).toBe('rep-1');
    });
    it('should throw ConflictException if overlaps exist', async () => {
      mockPrisma.printActivity.findFirst.mockResolvedValue({ id: 'old-act' });

      await expect(
        service.createReport(
          {
            reported_at: new Date().toISOString(),
            machine_id: 'mach-1',
            activities: [
              {
                activity_type: PrintActivityType.RUN,
                start_time: '08:00',
                end_time: '10:00',
              },
            ],
          },
          'op-1',
        ),
      ).rejects.toThrow(require('@nestjs/common').ConflictException);
    });

    it('should allow saving a print report with die snapshots even if the die is not found in inventory', async () => {
      mockPrisma.printReport.create.mockResolvedValue({
        id: 'rep-2',
        total_meters: 50,
      });
      mockPrisma.die.findUnique.mockResolvedValue(null);
      mockPrisma.die.findFirst.mockResolvedValue(null);

      const result = await service.createReport(
        {
          reported_at: new Date().toISOString(),
          machine_id: 'mach-1',
          die_type: 'FLATBED' as any,
          die_location: 'RACK-A1',
          activities: [
            {
              activity_type: PrintActivityType.RUN,
              meters: 50,
              start_time: '08:00',
            },
          ],
          production_status: 'PARCIAL',
        },
        'op-1',
      );

      expect(prisma.printReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            die_type_snapshot: 'FLATBED',
            die_location_snapshot: 'RACK-A1',
          }),
        }),
      );
      expect(result.id).toBe('rep-2');
    });

    it('should reject a machine outside the printing area', async () => {
      mockPrisma.machine.findUnique.mockResolvedValue({
        id: 'mach-9',
        type: 'REWIND',
        deleted_at: null,
        active: true,
        area: { name: 'Rebobinado', code: 'REBOB' },
      });

      await expect(
        service.createReport(
          {
            reported_at: new Date().toISOString(),
            machine_id: 'mach-9',
            activities: [
              {
                activity_type: PrintActivityType.RUN,
                meters: 50,
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
