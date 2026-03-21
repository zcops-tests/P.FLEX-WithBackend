import { Test, TestingModule } from '@nestjs/testing';
import { WorkOrdersService } from './work-orders.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('WorkOrdersService', () => {
  let service: WorkOrdersService;
  let prisma: PrismaService;

  const mockPrisma = {
    workOrder: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkOrdersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WorkOrdersService>(WorkOrdersService);
    prisma = module.get<PrismaService>(PrismaService);
    
    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return a work order if it exists', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue({ id: 'ot-1', ot_number: '12345' });
      
      const result = await service.findOne('ot-1');
      expect(result.ot_number).toBe('12345');
    });

    it('should throw NotFoundException if it does not exist', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue(null);
      
      await expect(service.findOne('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should throw ConflictException if has reports', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue({ 
        id: '1', 
        print_reports: [{ id: 'r1' }], 
        diecut_reports: [] 
      });
      await expect(service.remove('1')).rejects.toThrow(ConflictException);
    });
  });
});
