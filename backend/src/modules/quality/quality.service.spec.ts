import { Test, TestingModule } from '@nestjs/testing';
import { QualityService } from './quality.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { IncidentStatus } from './dto/incident.dto';

describe('QualityService', () => {
  let service: QualityService;
  let prisma: PrismaService;

  const mockPrisma = {
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
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
    jest.clearAllMocks();
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

  describe('createIncident', () => {
    it('generates the incident code in backend when not provided', async () => {
      const currentYear = new Date().getFullYear();
      mockPrisma.$queryRaw.mockResolvedValue([{ reserved_end: 12 }]);
      mockPrisma.incident.create.mockResolvedValue({
        id: 'inc-1',
        code: `INC-${currentYear}-0012`,
        status: IncidentStatus.OPEN,
        reportedBy: { name: 'Tester' },
        assignedTo: null,
        capaActions: [],
        work_order: null,
        machine: null,
      });

      const result = await service.createIncident(
        {
          title: 'Falla',
          priority: 'MEDIUM' as any,
          type: 'QUALITY' as any,
          reported_at: '2026-04-03T10:00:00.000Z',
        },
        'user-1',
      );

      expect(mockPrisma.incident.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: `INC-${currentYear}-0012`,
            reported_by_user_id: 'user-1',
          }),
        }),
      );
      expect(result.code).toBe(`INC-${currentYear}-0012`);
    });
  });
});
