import { Test, TestingModule } from '@nestjs/testing';
import { StockService } from './stock.service';
import { PrismaService } from '../../../database/prisma.service';
import { ConflictException } from '@nestjs/common';
import { StockStatus } from './dto/stock.dto';

describe('StockService', () => {
  let service: StockService;

  const mockPrisma = {
    stockItem: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
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
        deleted_at: null,
      });

      const result = await service.create({ pallet_id: 'P1' } as any);
      expect(result.status).toBe(StockStatus.LIBERATED);
    });
  });

  describe('bulkCreate', () => {
    it('should create a full batch transactionally', async () => {
      mockPrisma.stockItem.findMany.mockResolvedValue([]);
      mockPrisma.$transaction.mockResolvedValue([
        { id: '1' },
        { id: '2' },
      ]);

      const result = await service.bulkCreate([
        { pallet_id: 'P1', quantity: 1, entry_date: '2026-04-01T10:00:00.000Z' } as any,
        { pallet_id: 'P2', quantity: 2, entry_date: '2026-04-01T10:05:00.000Z' } as any,
      ]);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ processed: 2, created: 2 });
    });

    it('should reject a batch with duplicate pallet ids in payload', async () => {
      await expect(
        service.bulkCreate([
          { pallet_id: 'P1', quantity: 1, entry_date: '2026-04-01T10:00:00.000Z' } as any,
          { pallet_id: 'P1', quantity: 2, entry_date: '2026-04-01T10:05:00.000Z' } as any,
        ]),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should reject a batch when a pallet already exists in database', async () => {
      mockPrisma.stockItem.findMany.mockResolvedValue([{ pallet_id: 'P2' }]);

      await expect(
        service.bulkCreate([
          { pallet_id: 'P1', quantity: 1, entry_date: '2026-04-01T10:00:00.000Z' } as any,
          { pallet_id: 'P2', quantity: 2, entry_date: '2026-04-01T10:05:00.000Z' } as any,
        ]),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should reject pallet collisions on update', async () => {
      mockPrisma.stockItem.findUnique
        .mockResolvedValueOnce({
          id: 'stock-1',
          pallet_id: 'P1',
          deleted_at: null,
          status: StockStatus.LIBERATED,
        })
        .mockResolvedValueOnce({
          id: 'stock-2',
          pallet_id: 'P2',
        });

      await expect(
        service.update('stock-1', { pallet_id: 'P2' } as any),
      ).rejects.toThrow(ConflictException);
    });
  });
});
