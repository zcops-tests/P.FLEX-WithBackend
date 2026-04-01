import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DiesService } from './dies.service';
import { PrismaService } from '../../../database/prisma.service';

describe('DiesService', () => {
  let service: DiesService;

  const mockPrisma = {
    die: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    diecutReport: {
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const buildDie = (overrides: Record<string, unknown> = {}) => ({
    id: 'die-1',
    serie: 'DIE-001',
    cliente: 'Cliente Demo',
    clise_links: [],
    history: [],
    raw_payload: {},
    deleted_at: null,
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (callback: any) =>
      callback({ die: mockPrisma.die }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DiesService>(DiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a die when serie is unique', async () => {
      mockPrisma.die.findUnique.mockResolvedValue(null);
      mockPrisma.die.create.mockResolvedValue(buildDie());

      const result = await service.create({ serie: 'DIE-001' } as any);

      expect(mockPrisma.die.create).toHaveBeenCalled();
      expect(result.id).toBe('die-1');
      expect(result.serie).toBe('DIE-001');
    });

    it('throws ConflictException when serie already exists', async () => {
      mockPrisma.die.findUnique.mockResolvedValue({ id: 'die-1' });

      await expect(service.create({ serie: 'DIE-001' } as any)).rejects.toThrow(
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

    it('upserts dies and counts created vs updated', async () => {
      mockPrisma.die.findMany.mockResolvedValue([{ id: 'die-2', serie: 'DIE-002' }]);
      mockPrisma.die.update.mockResolvedValue(buildDie({ id: 'die-2', serie: 'DIE-002' }));
      mockPrisma.die.create.mockResolvedValue(buildDie());

      const result = await service.bulkUpsert([
        { serie: 'DIE-001', cliente: 'Cliente 1' } as any,
        { serie: 'DIE-002', cliente: 'Cliente 2' } as any,
      ]);

      expect(mockPrisma.die.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.die.update).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ processed: 2, created: 1, updated: 1 });
    });
  });

  describe('findAll', () => {
    it('returns paginated dies', async () => {
      mockPrisma.die.count.mockResolvedValue(1);
      mockPrisma.die.findMany.mockResolvedValue([buildDie()]);

      const result = await service.findAll({ page: 1, pageSize: 10 } as any);

      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('returns a die by id', async () => {
      mockPrisma.die.findUnique.mockResolvedValue(buildDie());

      const result = await service.findOne('die-1');

      expect(result.id).toBe('die-1');
    });

    it('throws NotFoundException when die does not exist', async () => {
      mockPrisma.die.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates a die', async () => {
      mockPrisma.die.findUnique.mockResolvedValue(buildDie());
      mockPrisma.die.update.mockResolvedValue(buildDie({ forma: 'RECT' }));

      const result = await service.update('die-1', {
        serie: 'DIE-001',
        forma: 'RECT',
      } as any);

      expect(mockPrisma.die.update).toHaveBeenCalled();
      expect(result.forma).toBe('RECT');
    });
  });

  describe('remove', () => {
    it('throws ConflictException if used in production', async () => {
      mockPrisma.die.findUnique.mockResolvedValue(buildDie());
      mockPrisma.diecutReport.count.mockResolvedValue(1);

      await expect(service.remove('die-1')).rejects.toThrow(ConflictException);
    });

    it('soft deletes a die if not used', async () => {
      mockPrisma.die.findUnique.mockResolvedValue(buildDie());
      mockPrisma.diecutReport.count.mockResolvedValue(0);
      mockPrisma.die.update.mockResolvedValue({
        id: 'die-1',
        deleted_at: new Date(),
      });

      const result = await service.remove('die-1');

      expect(result.deleted_at).toBeDefined();
    });
  });
});
