import { Test, TestingModule } from '@nestjs/testing';
import { QualityService } from './quality.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { IncidentStatus } from './dto/incident.dto';

describe('QualityService', () => {
  let service: QualityService;
  let prisma: PrismaService;

  const mockPrisma = {
    incident: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    capaAction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QualityService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<QualityService>(QualityService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateIncidentStatus', () => {
    it('should allow valid transitions', async () => {
      mockPrisma.incident.findUnique.mockResolvedValue({
        id: '1',
        status: IncidentStatus.OPEN,
      });
      mockPrisma.incident.update.mockResolvedValue({
        id: '1',
        status: IncidentStatus.ANALYSIS,
      });

      const result = await service.updateIncidentStatus(
        '1',
        IncidentStatus.ANALYSIS,
      );
      expect(result.status).toBe(IncidentStatus.ANALYSIS);
    });

    it('should throw ConflictException for invalid transitions', async () => {
      mockPrisma.incident.findUnique.mockResolvedValue({
        id: '1',
        status: IncidentStatus.OPEN,
      });
      await expect(
        service.updateIncidentStatus('1', IncidentStatus.CORRECTIVE_ACTION),
      ).rejects.toThrow(ConflictException);
    });
  });
});
