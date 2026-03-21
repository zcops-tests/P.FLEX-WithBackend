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
    printActivity: {
      createMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockConflictException = require('@nestjs/common').ConflictException;

  beforeEach(async () => {
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
      mockPrisma.printReport.create.mockResolvedValue({ id: 'rep-1', total_meters: 100 });
      
      const result = await service.createReport({
        reported_at: new Date().toISOString(),
        machine_id: 'mach-1',
        activities: [
          { activity_type: PrintActivityType.RUN, meters: 100, start_time: '08:00' }
        ],
        production_status: 'TOTAL',
      }, 'op-1');

      expect(prisma.printReport.create).toHaveBeenCalled();
      expect(result.id).toBe('rep-1');
    });
    it('should throw ConflictException if overlaps exist', async () => {
      mockPrisma.printActivity.findFirst.mockResolvedValue({ id: 'old-act' });
      
      await expect(service.createReport({
        reported_at: new Date().toISOString(),
        machine_id: 'mach-1',
        activities: [
          { activity_type: PrintActivityType.RUN, start_time: '08:00', end_time: '10:00' }
        ],
      }, 'op-1')).rejects.toThrow(require('@nestjs/common').ConflictException);
    });
  });
});
