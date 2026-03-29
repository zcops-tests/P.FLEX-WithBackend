import { Test, TestingModule } from '@nestjs/testing';
import { MachinesService } from './machines.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('MachinesService', () => {
  let service: MachinesService;
  let prisma: PrismaService;

  const mockPrisma = {
    machine: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    area: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    printReport: {
      count: jest.fn(),
    },
    diecutReport: {
      count: jest.fn(),
    },
    rewindReport: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MachinesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MachinesService>(MachinesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('remove', () => {
    it('should throw ConflictException if used in printing', async () => {
      mockPrisma.machine.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.printReport.count.mockResolvedValue(1);
      mockPrisma.diecutReport.count.mockResolvedValue(0);
      mockPrisma.rewindReport.count.mockResolvedValue(0);

      await expect(service.remove('1')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if used in diecutting', async () => {
      mockPrisma.machine.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.printReport.count.mockResolvedValue(0);
      mockPrisma.diecutReport.count.mockResolvedValue(1);
      mockPrisma.rewindReport.count.mockResolvedValue(0);

      await expect(service.remove('1')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if used in rewinding', async () => {
      mockPrisma.machine.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.printReport.count.mockResolvedValue(0);
      mockPrisma.diecutReport.count.mockResolvedValue(0);
      mockPrisma.rewindReport.count.mockResolvedValue(1);

      await expect(service.remove('1')).rejects.toThrow(ConflictException);
    });

    it('should soft delete if not used', async () => {
      mockPrisma.machine.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.printReport.count.mockResolvedValue(0);
      mockPrisma.diecutReport.count.mockResolvedValue(0);
      mockPrisma.rewindReport.count.mockResolvedValue(0);
      mockPrisma.machine.update.mockResolvedValue({
        id: '1',
        deleted_at: new Date(),
      });

      const result = await service.remove('1');
      expect(result.deleted_at).toBeDefined();
    });
  });

  describe('create', () => {
    it('should derive the machine type from the selected area', async () => {
      mockPrisma.machine.findUnique.mockResolvedValueOnce(null);
      mockPrisma.area.findUnique.mockResolvedValue({
        id: 'area-rebob',
        name: 'Rebobinado',
        code: 'REBOB',
        active: true,
        deleted_at: null,
      });
      mockPrisma.machine.create.mockResolvedValue({
        id: 'mach-1',
        code: 'RB-01',
        name: 'Rebobinadora 1',
        type: 'REWIND',
        area: { name: 'Rebobinado', code: 'REBOB' },
      });

      const result = await service.create({
        code: ' RB-01 ',
        name: ' Rebobinadora 1 ',
        type: 'PRINT',
        area_id: 'area-rebob',
      });

      expect(mockPrisma.machine.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: 'RB-01',
            name: 'Rebobinadora 1',
            type: 'REWIND',
          }),
        }),
      );
      expect(result.type).toBe('REWIND');
    });
  });

  describe('findAll', () => {
    it('should repair legacy machine area assignments based on machine type', async () => {
      mockPrisma.machine.findMany
        .mockResolvedValueOnce([
          {
            id: 'mach-1',
            code: 'RB-01',
            name: 'Rebobinadora 1',
            type: 'REWIND',
            area_id: 'area-pack',
            area: { id: 'area-pack', name: 'Empaquetado', code: 'EMPAQ' },
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'mach-1',
            code: 'RB-01',
            name: 'Rebobinadora 1',
            type: 'REWIND',
            area_id: 'area-rebob',
            area: { id: 'area-rebob', name: 'Rebobinado', code: 'REBOB' },
          },
        ]);
      mockPrisma.area.findMany.mockResolvedValue([
        { id: 'area-print', name: 'Imprenta', code: 'IMP' },
        { id: 'area-rebob', name: 'Rebobinado', code: 'REBOB' },
        { id: 'area-pack', name: 'Empaquetado', code: 'EMPAQ' },
      ]);
      mockPrisma.machine.update.mockResolvedValue({
        id: 'mach-1',
        area_id: 'area-rebob',
      });

      const result = await service.findAll();

      expect(mockPrisma.machine.update).toHaveBeenCalledWith({
        where: { id: 'mach-1' },
        data: { area_id: 'area-rebob', type: 'REWIND' },
      });
      expect(result[0].area_name).toBe('Rebobinado');
    });
  });

  describe('update', () => {
    it('should update code and derive type from the new area', async () => {
      mockPrisma.machine.findUnique
        .mockResolvedValueOnce({
          id: 'mach-1',
          code: 'PR-01',
          name: 'Impresora 1',
          type: 'PRINT',
          deleted_at: null,
          area: { id: 'area-print', name: 'Imprenta', code: 'IMP' },
        })
        .mockResolvedValueOnce(null);
      mockPrisma.area.findUnique.mockResolvedValue({
        id: 'area-rebob',
        name: 'Rebobinado',
        code: 'REBOB',
        active: true,
        deleted_at: null,
      });
      mockPrisma.machine.update.mockResolvedValue({
        id: 'mach-1',
        code: 'RB-01',
        name: 'Rebobinadora 1',
        type: 'REWIND',
        area: { id: 'area-rebob', name: 'Rebobinado', code: 'REBOB' },
      });

      const result = await service.update('mach-1', {
        code: ' RB-01 ',
        name: ' Rebobinadora 1 ',
        type: 'PRINT',
        area_id: 'area-rebob',
      });

      expect(mockPrisma.machine.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: 'RB-01',
            name: 'Rebobinadora 1',
            type: 'REWIND',
            area_id: 'area-rebob',
          }),
        }),
      );
      expect(result.type).toBe('REWIND');
    });

    it('should throw ConflictException when updating to a duplicated code', async () => {
      mockPrisma.machine.findUnique
        .mockResolvedValueOnce({
          id: 'mach-1',
          code: 'PR-01',
          name: 'Impresora 1',
          type: 'PRINT',
          deleted_at: null,
          area: { id: 'area-print', name: 'Imprenta', code: 'IMP' },
        })
        .mockResolvedValueOnce({
          id: 'mach-2',
          code: 'RB-01',
          deleted_at: null,
        });

      await expect(
        service.update('mach-1', {
          code: 'RB-01',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
