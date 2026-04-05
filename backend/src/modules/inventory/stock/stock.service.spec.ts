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
      findMany: jest.fn(),
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
        caja: '0001',
        notes: '',
        deleted_at: null,
      });
      const txUpdate = jest.fn().mockResolvedValue({
        id: 'stock-1',
        caja: '0005',
        medida: 'Nueva Medida',
        box_id: 'C0001-0008',
        status: StockStatus.RETAINED,
        notes: '',
        deleted_at: null,
      });
      mockPrisma.$transaction.mockImplementation(async (callback: any) =>
        callback({
          stockItem: {
            update: txUpdate,
          },
        }),
      );

      const result = await service.update('stock-1', {
        caja: '5',
        medida: 'Nueva Medida',
        status: StockStatus.RETAINED,
        entry_date: '2026-04-01T10:00:00.000Z',
      } as any);

      expect(txUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'stock-1' },
          data: expect.not.objectContaining({ box_id: expect.anything() }),
        }),
      );
      expect(result.boxId).toBe('C0001-0008');
      expect(result.caja).toBe('0005');
    });

    it('generates box_id when resolving a conflicted record with caja', async () => {
      mockPrisma.stockItem.findUnique.mockResolvedValue({
        id: 'stock-2',
        box_id: null,
        caja: null,
        notes: '[IMPORT_CONFLICT:MISSING_CAJA] pendiente',
        deleted_at: null,
      });
      mockPrisma.$transaction.mockImplementation(async (callback: any) =>
        callback({
          $executeRaw: jest.fn(),
          $queryRaw: jest.fn().mockResolvedValue([{ reserved_end: 4 }]),
          stockItem: {
            update: jest.fn().mockResolvedValue({
              id: 'stock-2',
              caja: '0007',
              medida: 'Nueva',
              box_id: 'C0007-0004',
              notes: 'pendiente',
              status: StockStatus.QUARANTINE,
              deleted_at: null,
            }),
          },
        }),
      );

      const result = await service.update('stock-2', {
        caja: '7',
        medida: 'Nueva',
        entry_date: '2026-04-01T10:00:00.000Z',
      } as any);

      expect(result.boxId).toBe('C0007-0004');
      expect(result.hasConflict).toBe(false);
    });
  });

  describe('bulkUpsert', () => {
    it('upserts by normalized caja and creates missing-caja rows as conflicts', async () => {
      const txCreate = jest.fn().mockResolvedValue({});
      const txUpdate = jest.fn().mockResolvedValue({});
      mockPrisma.stockItem.findMany.mockResolvedValue([
        {
          id: 'existing-1',
          caja: '0001',
          box_id: 'C0001-0008',
          notes: '',
        },
      ]);
      mockPrisma.$transaction.mockImplementation(async (callback: any) =>
        callback({
          $executeRaw: jest.fn(),
          $queryRaw: jest.fn().mockResolvedValue([{ reserved_end: 12 }]),
          stockItem: {
            create: txCreate,
            update: txUpdate,
          },
        }),
      );

      const result = await service.bulkUpsert([
        { caja: '1', medida: 'Actualiza', entry_date: '2026-04-01T10:00:00.000Z' } as any,
        { caja: '', medida: 'Sin caja', entry_date: '2026-04-01T10:00:00.000Z' } as any,
        { caja: '2', medida: 'Nueva caja', entry_date: '2026-04-01T10:00:00.000Z' } as any,
      ]);

      expect(txUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'existing-1' },
          data: expect.objectContaining({
            caja: '0001',
            box_id: undefined,
          }),
        }),
      );
      expect(txCreate).toHaveBeenCalledTimes(2);
      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            caja: null,
            box_id: undefined,
            notes: expect.stringContaining('[IMPORT_CONFLICT:MISSING_CAJA]'),
          }),
        }),
      );
      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            caja: '0002',
            box_id: 'C0002-0011',
          }),
        }),
      );
      expect(result).toEqual({ imported: 3, conflicts: 1, created: 2, updated: 1 });
    });
  });
});
