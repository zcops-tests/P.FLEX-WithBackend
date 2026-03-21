import { Test, TestingModule } from '@nestjs/testing';
import { OutboxService } from './outbox.service';
import { PrismaService } from '../../database/prisma.service';

describe('OutboxService', () => {
  let service: OutboxService;
  let prisma: PrismaService;

  const mockPrisma = {
    outboxEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OutboxService>(OutboxService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createEvent', () => {
    it('should create a pending event', async () => {
      mockPrisma.outboxEvent.create.mockResolvedValue({ id: 'ev-1', status: 'PENDING' });
      
      const result = await service.createEvent('WORK_ORDER_CREATED', 'WORK_ORDER', '1', { key: 'val' });
      expect(result.status).toBe('PENDING');
      expect(prisma.outboxEvent.create).toHaveBeenCalled();
    });
  });

  describe('processPendingEvents', () => {
    it('should process events and mark as published', async () => {
      mockPrisma.outboxEvent.findMany.mockResolvedValue([
        { id: 'ev-1', event_name: 'TEST', aggregate_type: 'T', aggregate_id: '1', status: 'PENDING', attempts: 0 }
      ]);
      mockPrisma.outboxEvent.update.mockResolvedValue({ id: 'ev-1', status: 'PUBLISHED' });

      await service.processPendingEvents();

      expect(mockPrisma.outboxEvent.update).toHaveBeenCalledWith({
        where: { id: 'ev-1' },
        data: expect.objectContaining({ status: 'PUBLISHED' }),
      });
    });
  });
});
