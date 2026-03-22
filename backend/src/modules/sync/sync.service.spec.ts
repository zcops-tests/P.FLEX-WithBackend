import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from './sync.service';
import { PrismaService } from '../../database/prisma.service';

describe('SyncService', () => {
  let service: SyncService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: PrismaService,
          useValue: {
            changeLog: { findMany: jest.fn() },
            syncMutationLog: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllowedEntitiesForProfile', () => {
    it('should return correct tables for PRINT_STATION', () => {
      const tables = (service as any).getAllowedEntitiesForProfile('PRINT_STATION');
      expect(tables).toContain('work_orders');
      expect(tables).toContain('clises');
    });

    it('should return all tables for defaults or unknown', () => {
       const tables = (service as any).getAllowedEntitiesForProfile('UNKNOWN');
       expect(tables.length).toBeGreaterThan(5);
    });
  });
});
