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
    printReport: {
      count: jest.fn(),
    },
    diecutReport: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
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
      
      await expect(service.remove('1')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if used in diecutting', async () => {
      mockPrisma.machine.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.printReport.count.mockResolvedValue(0);
      mockPrisma.diecutReport.count.mockResolvedValue(1);
      
      await expect(service.remove('1')).rejects.toThrow(ConflictException);
    });

    it('should soft delete if not used', async () => {
      mockPrisma.machine.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.printReport.count.mockResolvedValue(0);
      mockPrisma.diecutReport.count.mockResolvedValue(0);
      mockPrisma.machine.update.mockResolvedValue({ id: '1', deleted_at: new Date() });
      
      const result = await service.remove('1');
      expect(result.deleted_at).toBeDefined();
    });
  });
});
