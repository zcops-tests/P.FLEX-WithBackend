import { Test, TestingModule } from '@nestjs/testing';
import { StockService } from './stock.service';
import { PrismaService } from '../../../database/prisma.service';
import { StockStatus } from './dto/stock.dto';

describe('StockService', () => {
  let service: StockService;

  const mockPrisma = {
    stockItem: {
      create: jest.fn(),
      createMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
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
    it('generates box_id as C + caja + 4-digit sequence', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback: any) =>
        callback({
          $executeRaw: jest.fn(),
          $queryRaw: jest.fn().mockResolvedValue([{ reserved_end: 8 }]),
          stockItem: {
            create: jest.fn().mockResolvedValue({
              id: '1',
              caja: '0001',
              medida: '100 x 200',
              status: StockStatus.QUARANTINE,
              box_id: 'C0001-0008',
              deleted_at: null,
            }),
          },
        }),
      );

      const result = await service.create({
        caja: '1',
        medida: '100 x 200',
        entry_date: '2026-04-01T10:00:00.000Z',
      } as any);

      expect(result.boxId).toBe('C0001-0008');
      expect(result.caja).toBe('0001');
      expect(result.status).toBe('Cuarentena');
    });
  });

  describe('bulkCreate', () => {
    it('creates a full batch transactionally with consecutive ids', async () => {
      const txCreateMany = jest.fn().mockResolvedValue({ count: 2 });
      mockPrisma.$transaction.mockImplementation(async (callback: any) =>
        callback({
          $executeRaw: jest.fn(),
          $queryRaw: jest.fn().mockResolvedValue([{ reserved_end: 12 }]),
          stockItem: {
            createMany: txCreateMany,
          },
        }),
      );

      const result = await service.bulkCreate([
        { caja: '1', medida: 'A', entry_date: '2026-04-01T10:00:00.000Z' } as any,
        { caja: '1', medida: 'B', entry_date: '2026-04-01T10:05:00.000Z' } as any,
      ]);

      expect(txCreateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({ box_id: 'C0001-0010', caja: '0001' }),
            expect.objectContaining({ box_id: 'C0001-0011', caja: '0001' }),
          ],
        }),
      );
      expect(result).toEqual({ processed: 2, created: 2 });
    });
  });

  describe('update', () => {
    it('updates product fields without overwriting existing box id', async () => {
      mockPrisma.stockItem.findUnique.mockResolvedValue({
        id: 'stock-1',
        box_id: 'C0001-0008',
        deleted_at: null,
      });
      mockPrisma.stockItem.update.mockResolvedValue({
        id: 'stock-1',
        caja: '0005',
        medida: 'Nueva Medida',
        box_id: 'C0001-0008',
        status: StockStatus.RETAINED,
        deleted_at: null,
      });

      const result = await service.update('stock-1', {
        caja: '5',
        medida: 'Nueva Medida',
        status: StockStatus.RETAINED,
        entry_date: '2026-04-01T10:00:00.000Z',
      } as any);

      expect(mockPrisma.stockItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'stock-1' },
          data: expect.not.objectContaining({ box_id: expect.anything() }),
        }),
      );
      expect(result.boxId).toBe('C0001-0008');
      expect(result.caja).toBe('0005');
    });
  });
});
