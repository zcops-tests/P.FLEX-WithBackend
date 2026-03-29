import { Test, TestingModule } from '@nestjs/testing';
import { ClisesService } from './clises.service';
import { PrismaService } from '../../../database/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('ClisesService', () => {
  let service: ClisesService;
  let prisma: PrismaService;

  const mockPrisma = {
    clise: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    printReport: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClisesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ClisesService>(ClisesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw ConflictException if item_code exists', async () => {
      mockPrisma.clise.findUnique.mockResolvedValue({ id: '1' });
      await expect(service.create({ item_code: 'EX' } as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should throw ConflictException if used in production', async () => {
      mockPrisma.clise.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.printReport.count.mockResolvedValue(1);
      await expect(service.remove('1')).rejects.toThrow(ConflictException);
    });

    it('should soft delete if not used', async () => {
      mockPrisma.clise.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.printReport.count.mockResolvedValue(0);
      mockPrisma.clise.update.mockResolvedValue({
        id: '1',
        deleted_at: new Date(),
      });

      const result = await service.remove('1');
      expect(result.deleted_at).toBeDefined();
    });
  });
});
