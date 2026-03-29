import { Test, TestingModule } from '@nestjs/testing';
import { RewindingService } from './rewinding.service';
import { PrismaService } from '../../../database/prisma.service';

describe('RewindingService', () => {
  let service: RewindingService;

  const mockPrisma = {
    $transaction: jest.fn((callback) => callback(mockPrisma)),
    user: {
      findUnique: jest.fn(),
    },
    machine: {
      findUnique: jest.fn(),
    },
    workOrder: {
      findUnique: jest.fn(),
    },
    rewindReport: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'op-1',
      name: 'Operario Rewind',
      active: true,
      deleted_at: null,
      role: { code: 'OPERATOR' },
    });
    mockPrisma.machine.findUnique.mockResolvedValue({
      id: 'mach-1',
      type: 'REWIND',
      deleted_at: null,
      active: true,
      area: { name: 'Rebobinado', code: 'REBOB' },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewindingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RewindingService>(RewindingService);
  });

  it('should create a rewinding report for a rewind machine', async () => {
    mockPrisma.rewindReport.create.mockResolvedValue({
      id: 'rw-1',
      machine: { name: 'Rebobinadora 1', code: 'RB-01' },
      operator: { name: 'Operario Rewind' },
      shift: { name: 'Turno Dia' },
      work_order: { ot_number: 'OT-1' },
      rolls_finished: 10,
      labels_per_roll: 1000,
      total_labels: 10000,
      total_meters: 450,
      waste_rolls: 1,
      production_status: 'PARTIAL',
    });

    const result = await service.createReport(
      {
        reported_at: new Date().toISOString(),
        machine_id: 'mach-1',
        rolls_finished: 10,
        labels_per_roll: 1000,
      },
      'op-1',
    );

    expect(mockPrisma.rewindReport.create).toHaveBeenCalled();
    expect(result.id).toBe('rw-1');
  });

  it('should reject a machine outside the rewinding area', async () => {
    mockPrisma.machine.findUnique.mockResolvedValue({
      id: 'mach-9',
      type: 'PRINT',
      deleted_at: null,
      active: true,
      area: { name: 'Imprenta', code: 'IMP' },
    });

    await expect(
      service.createReport(
        {
          reported_at: new Date().toISOString(),
          machine_id: 'mach-9',
          rolls_finished: 5,
          labels_per_roll: 800,
        },
        'op-1',
      ),
    ).rejects.toThrow(require('@nestjs/common').BadRequestException);
  });
});
