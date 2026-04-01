import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ClisesService } from './clises.service';
import { PrismaService } from '../../../database/prisma.service';

describe('ClisesService', () => {
  let service: ClisesService;

  const txClise = {
    upsert: jest.fn(),
  };

  const mockPrisma = {
    clise: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    printReport: {
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const buildClise = (overrides: Record<string, unknown> = {}) => ({
    id: 'clise-1',
    item_code: 'CL-001',
    cliente: 'Cliente Demo',
    descripcion: 'Clise demo',
    color_usage: [],
    die_links: [],
    history: [],
    raw_payload: {},
    deleted_at: null,
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (callback: any) =>
      callback({ clise: txClise }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClisesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ClisesService>(ClisesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a clise when item_code is available', async () => {
      mockPrisma.clise.findUnique.mockResolvedValue(null);
      mockPrisma.clise.create.mockResolvedValue(buildClise());

      const result = await service.create({
        item_code: 'CL-001',
        cliente: 'Cliente Demo',
      } as any);

      expect(mockPrisma.clise.create).toHaveBeenCalled();
      expect(result.id).toBe('clise-1');
      expect(result.item).toBe('CL-001');
    });

    it('throws ConflictException if item_code exists', async () => {
      mockPrisma.clise.findUnique.mockResolvedValue({ id: '1' });

      await expect(service.create({ item_code: 'EX' } as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('bulkUpsert', () => {
    it('returns empty counters when there are no items', async () => {
      await expect(service.bulkUpsert([])).resolves.toEqual({
        processed: 0,
        created: 0,
        updated: 0,
      });
    });

    it('counts created and updated items', async () => {
      mockPrisma.clise.findMany.mockResolvedValue([{ item_code: 'CL-002' }]);
      txClise.upsert.mockResolvedValue(undefined);

      const result = await service.bulkUpsert([
        { item_code: 'CL-001', cliente: 'Cliente 1' } as any,
        { item_code: 'CL-002', cliente: 'Cliente 2' } as any,
      ]);

      expect(txClise.upsert).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ processed: 2, created: 1, updated: 1 });
    });

    it('converts known Prisma errors into import exceptions', async () => {
      mockPrisma.clise.findMany.mockResolvedValue([]);
      txClise.upsert.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.bulkUpsert([{ item_code: 'CL-001', cliente: 'Cliente' } as any]),
      ).rejects.toThrow(ConflictException);
    });

    it('wraps unexpected batch errors', async () => {
      mockPrisma.clise.findMany.mockResolvedValue([]);
      mockPrisma.$transaction.mockRejectedValue(new Error('boom'));

      await expect(
        service.bulkUpsert([{ item_code: 'CL-001', cliente: 'Cliente' } as any]),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findAll', () => {
    it('returns paginated clises', async () => {
      mockPrisma.clise.count.mockResolvedValue(1);
      mockPrisma.clise.findMany.mockResolvedValue([buildClise()]);

      const result = await service.findAll({ page: 1, pageSize: 10 } as any);

      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('returns a clise by id', async () => {
      mockPrisma.clise.findUnique.mockResolvedValue(buildClise());

      const result = await service.findOne('clise-1');

      expect(result.id).toBe('clise-1');
    });

    it('throws NotFoundException when clise does not exist', async () => {
      mockPrisma.clise.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates a clise when item_code remains unique', async () => {
      mockPrisma.clise.findUnique.mockResolvedValue(buildClise());
      mockPrisma.clise.findFirst.mockResolvedValue(null);
      mockPrisma.clise.update.mockResolvedValue(
        buildClise({ descripcion: 'Actualizado' }),
      );

      const result = await service.update('clise-1', {
        item_code: 'CL-001',
        cliente: 'Cliente Demo',
        descripcion: 'Actualizado',
      } as any);

      expect(mockPrisma.clise.update).toHaveBeenCalled();
      expect(result.descripcion).toBe('Actualizado');
    });

    it('throws ConflictException when another clise has same item_code', async () => {
      mockPrisma.clise.findUnique.mockResolvedValue(buildClise());
      mockPrisma.clise.findFirst.mockResolvedValue({ id: 'clise-2' });

      await expect(
        service.update('clise-1', { item_code: 'CL-002' } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('throws ConflictException if used in production', async () => {
      mockPrisma.clise.findUnique.mockResolvedValue(buildClise());
      mockPrisma.printReport.count.mockResolvedValue(1);

      await expect(service.remove('1')).rejects.toThrow(ConflictException);
    });

    it('soft deletes if not used', async () => {
      mockPrisma.clise.findUnique.mockResolvedValue(buildClise());
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
