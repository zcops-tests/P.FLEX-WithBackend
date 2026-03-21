import { Test, TestingModule } from '@nestjs/testing';
import { ImportsService } from './imports.service';
import { PrismaService } from '../../database/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { ImportStatus } from './dto/import.dto';

describe('ImportsService', () => {
  let service: ImportsService;
  let prisma: PrismaService;

  const mockPrisma = {
    importJob: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    workOrderImportRow: {
      findMany: jest.fn(),
    },
  };

  const mockQueue = {
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('imports'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<ImportsService>(ImportsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createJob', () => {
    it('should create a job and add to queue', async () => {
      mockPrisma.importJob.create.mockResolvedValue({ id: 'test-id', status: ImportStatus.PENDING });
      
      const result = await service.createJob(
        { entity_name: 'WORK_ORDER', file_id: 'file-1' },
        'user-1'
      );

      expect(prisma.importJob.create).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalled();
      expect(result.id).toBe('test-id');
    });
  });

  describe('getJob', () => {
    it('should return job with string totals', async () => {
      mockPrisma.importJob.findUnique.mockResolvedValue({
        id: 'test-id',
        status: ImportStatus.PROCESSING,
        total_rows: 10,
        valid_rows: 5,
        invalid_rows: 5,
        applied_rows: 0,
      });

      const result = await service.getJob('test-id');
      expect(result.total_rows).toBe(10);
      expect(result.id).toBe('test-id');
    });
  });
});
