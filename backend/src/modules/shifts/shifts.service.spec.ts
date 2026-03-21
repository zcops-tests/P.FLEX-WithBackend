import { Test, TestingModule } from '@nestjs/testing';
import { ShiftsService } from './shifts.service';
import { PrismaService } from '../../database/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

const mockPrismaService = {
  shift: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('ShiftsService', () => {
  let service: ShiftsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ShiftsService>(ShiftsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw ConflictException if shift code exists', async () => {
      mockPrismaService.shift.findUnique.mockResolvedValue({ id: '1', code: 'T1' });
      await expect(service.create({ code: 'T1', name: 'Turno 1', start_time: '06:00', end_time: '14:00' }))
        .rejects.toThrow(ConflictException);
    });

    it('should create a shift if it does not exist', async () => {
      mockPrismaService.shift.findUnique.mockResolvedValue(null);
      mockPrismaService.shift.create.mockResolvedValue({ id: '1', code: 'T1' });
      const result = await service.create({ code: 'T1', name: 'Turno 1', start_time: '06:00', end_time: '14:00' });
      expect(result).toEqual({ id: '1', code: 'T1' });
    });
  });

  describe('findOne', () => {
    it('should return a shift if found', async () => {
      const shift = { id: '1', code: 'T1', deleted_at: null };
      mockPrismaService.shift.findUnique.mockResolvedValue(shift);
      expect(await service.findOne('1')).toEqual(shift);
    });

    it('should throw NotFoundException if shift not found', async () => {
      mockPrismaService.shift.findUnique.mockResolvedValue(null);
      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });
});
