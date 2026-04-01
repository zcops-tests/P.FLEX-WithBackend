import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RelationsService } from './relations.service';
import { PrismaService } from '../../../database/prisma.service';

describe('RelationsService', () => {
  let service: RelationsService;

  const mockPrisma = {
    cliseDieLink: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RelationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RelationsService>(RelationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('linkCliseDie', () => {
    it('creates a new active link', async () => {
      mockPrisma.cliseDieLink.findUnique.mockResolvedValue(null);
      mockPrisma.cliseDieLink.create.mockResolvedValue({ id: 'link-1' });

      const result = await service.linkCliseDie({
        clise_id: 'clise-1',
        die_id: 'die-1',
      });

      expect(mockPrisma.cliseDieLink.create).toHaveBeenCalled();
      expect(result).toEqual({ id: 'link-1' });
    });

    it('rejects an already active link', async () => {
      mockPrisma.cliseDieLink.findUnique.mockResolvedValue({
        id: 'link-1',
        deleted_at: null,
      });

      await expect(
        service.linkCliseDie({ clise_id: 'clise-1', die_id: 'die-1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('reactivates a soft-deleted link', async () => {
      mockPrisma.cliseDieLink.findUnique.mockResolvedValue({
        id: 'link-1',
        deleted_at: new Date(),
      });
      mockPrisma.cliseDieLink.update.mockResolvedValue({
        id: 'link-1',
        deleted_at: null,
      });

      const result = await service.linkCliseDie({
        clise_id: 'clise-1',
        die_id: 'die-1',
      });

      expect(result.deleted_at).toBeNull();
    });
  });

  describe('unlinkCliseDie', () => {
    it('soft deletes an active link', async () => {
      mockPrisma.cliseDieLink.findUnique.mockResolvedValue({
        id: 'link-1',
        deleted_at: null,
      });
      mockPrisma.cliseDieLink.update.mockResolvedValue({
        id: 'link-1',
        deleted_at: new Date(),
      });

      const result = await service.unlinkCliseDie('clise-1', 'die-1');

      expect(result.deleted_at).toBeDefined();
    });

    it('throws NotFoundException if link does not exist', async () => {
      mockPrisma.cliseDieLink.findUnique.mockResolvedValue(null);

      await expect(
        service.unlinkCliseDie('clise-1', 'die-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('query helpers', () => {
    it('gets dies linked to a clise', async () => {
      mockPrisma.cliseDieLink.findMany.mockResolvedValue([{ id: 'link-1' }]);

      const result = await service.getCliseDies('clise-1');

      expect(mockPrisma.cliseDieLink.findMany).toHaveBeenCalledWith({
        where: { clise_id: 'clise-1', deleted_at: null },
        include: { die: true },
      });
      expect(result).toEqual([{ id: 'link-1' }]);
    });

    it('gets clises linked to a die', async () => {
      mockPrisma.cliseDieLink.findMany.mockResolvedValue([{ id: 'link-1' }]);

      const result = await service.getDieClises('die-1');

      expect(mockPrisma.cliseDieLink.findMany).toHaveBeenCalledWith({
        where: { die_id: 'die-1', deleted_at: null },
        include: { clise: true },
      });
      expect(result).toEqual([{ id: 'link-1' }]);
    });
  });
});
