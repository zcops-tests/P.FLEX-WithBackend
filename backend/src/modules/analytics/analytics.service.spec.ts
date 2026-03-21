import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../database/prisma.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: {
            productionKpiDaily: { findMany: jest.fn() },
            printReport: { aggregate: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateOEE', () => {
    it('should correctly calculate OEE from components', () => {
      // OEE = A * P * Q
      const result = (service as any).calculateOEE(0.9, 0.9, 0.9);
      expect(result).toBeCloseTo(0.729, 3);
    });
  });
});
