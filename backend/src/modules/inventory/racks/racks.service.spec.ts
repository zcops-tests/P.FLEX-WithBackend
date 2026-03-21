import { Test, TestingModule } from '@nestjs/testing';
import { RacksService } from './racks.service';
import { PrismaService } from '../../../database/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('RacksService', () => {
  let service: RacksService;
  let prisma: PrismaService;

  const mockPrisma = {
    rackConfig: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    clise: {
      count: jest.fn(),
    },
    die: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RacksService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RacksService>(RacksService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw ConflictException if rack name exists', async () => {
      mockPrisma.rackConfig.findFirst.mockResolvedValue({ id: '1' });
      await expect(service.create({ name: 'R1' } as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should throw ConflictException if rack is not empty', async () => {
      mockPrisma.rackConfig.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.clise.count.mockResolvedValue(1);
      mockPrisma.die.count.mockResolvedValue(0);
      
      await expect(service.remove('1')).rejects.toThrow(ConflictException);
    });
  });
});
