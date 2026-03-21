import { Test, TestingModule } from '@nestjs/testing';
import { ExportWorker } from './export.worker';
import { PrismaService } from '../../../database/prisma.service';
import { Job } from 'bullmq';

describe('ExportWorker', () => {
  let worker: ExportWorker;
  let prisma: PrismaService;

  const mockPrisma = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportWorker,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    worker = module.get<ExportWorker>(ExportWorker);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(worker).toBeDefined();
  });

  it('should process a job and return metadata', async () => {
    const mockJob = {
      data: {
        entity: 'WORK_ORDER',
        format: 'EXCEL',
        userId: 'user-1',
      },
      updateProgress: jest.fn().mockResolvedValue(undefined),
    } as unknown as Job;

    const result = await worker.process(mockJob);

    expect(result).toHaveProperty('fileUrl');
    expect(mockJob.updateProgress).toHaveBeenCalledWith(100);
  });
});
