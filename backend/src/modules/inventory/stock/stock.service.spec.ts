import { Test, TestingModule } from '@nestjs/testing';
import { StockService } from './stock.service';
import { PrismaService } from '../../../database/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { StockStatus } from './dto/stock.dto';

describe('StockService', () => {
  let service: StockService;
  let prisma: PrismaService;

  const mockPrisma = {
    stockItem: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw ConflictException if pallet_id exists', async () => {
      mockPrisma.stockItem.findUnique.mockResolvedValue({ id: '1' });
      await expect(service.create({ pallet_id: 'P1' } as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create stock item with default status', async () => {
      mockPrisma.stockItem.findUnique.mockResolvedValue(null);
      mockPrisma.stockItem.create.mockResolvedValue({
        id: '1',
        status: StockStatus.LIBERATED,
      });

      const result = await service.create({ pallet_id: 'P1' } as any);
      expect(result.status).toBe(StockStatus.LIBERATED);
    });
  });
});
