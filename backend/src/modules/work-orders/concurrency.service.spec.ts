import { Test, TestingModule } from '@nestjs/testing';
import { WorkOrdersService } from './work-orders.service';
import { PrismaService } from '../../database/prisma.service';
import { ConflictException } from '@nestjs/common';

describe('Concurrency (Optimistic Locking)', () => {
  let service: WorkOrdersService;

  const mockPrisma = {
    workOrder: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    workOrderManagementEntry: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkOrdersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WorkOrdersService>(WorkOrdersService);
    jest.clearAllMocks();
  });

  it('should prevent update if row_version mismatch', async () => {
    // Current state in DB has version 1
    mockPrisma.workOrder.findUnique.mockResolvedValue({
      id: '1',
      row_version: BigInt(1),
    });

    // Attempting to update with version 0 (outdated)
    await expect(service.update('1', { row_version: 0 })).rejects.toThrow(
      ConflictException,
    );
  });

  it('should allow update if row_version matches', async () => {
    mockPrisma.workOrder.findUnique.mockResolvedValue({
      id: '1',
      row_version: BigInt(1),
      deleted_at: null,
      raw_payload: {},
    });
    mockPrisma.workOrderManagementEntry.findFirst.mockResolvedValue(null);
    mockPrisma.workOrder.update.mockResolvedValue({
      id: '1',
      row_version: BigInt(2),
      deleted_at: null,
      raw_payload: {},
    });

    const result = await service.update('1', {
      row_version: 1,
      descripcion: 'Updated',
    });
    expect(result.row_version).toBe(BigInt(2));
  });
});
