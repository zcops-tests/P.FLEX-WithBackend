import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { HttpException } from '@nestjs/common';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: PrismaService;
  let redis: RedisService;

  const mockPrisma = {
    $queryRaw: jest.fn(),
  };

  const mockRedis = {
    getClient: jest.fn().mockReturnValue({
      ping: jest.fn().mockResolvedValue('PONG'),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('live', () => {
    it('should return UP', () => {
      const result = controller.live();
      expect(result.status).toBe('UP');
    });
  });

  describe('ready', () => {
    it('should return UP if all components are ready', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([1]);

      const result = await controller.ready();
      expect(result.status).toBe('UP');
      expect(result.components.database).toBe('UP');
      expect(result.components.redis).toBe('UP');
    });

    it('should throw 503 if a component is down', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('DB Down'));

      await expect(controller.ready()).rejects.toThrow(HttpException);
    });
  });
});
