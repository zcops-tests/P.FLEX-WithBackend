import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { PlanningArea, PlanningShift } from './dto/planning.dto';

describe('PlanningController', () => {
  let controller: PlanningController;

  const planningServiceMock = {
    findSchedules: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlanningController],
      providers: [
        { provide: PlanningService, useValue: planningServiceMock },
        { provide: JwtAuthGuard, useValue: { canActivate: jest.fn().mockReturnValue(true) } },
        { provide: PermissionsGuard, useValue: { canActivate: jest.fn().mockResolvedValue(true) } },
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<PlanningController>(PlanningController);
    jest.clearAllMocks();
  });

  it('delegates listing schedules', async () => {
    const query = {
      date: '2026-04-01',
      shift: PlanningShift.DIA,
      area: PlanningArea.IMPRESION,
    };
    planningServiceMock.findSchedules.mockResolvedValue([{ id: 'schedule-1' }]);

    const result = await controller.findSchedules(query);

    expect(planningServiceMock.findSchedules).toHaveBeenCalledWith(query);
    expect(result).toEqual([{ id: 'schedule-1' }]);
  });

  it('delegates create with current user', async () => {
    planningServiceMock.create.mockResolvedValue({ id: 'schedule-1' });

    const result = await controller.create({
      work_order_id: 'wo-1',
      machine_id: 'machine-1',
      schedule_date: '2026-04-01',
      shift: PlanningShift.DIA,
      area: PlanningArea.IMPRESION,
      start_time: '08:00',
      duration_minutes: 120,
    }, { user: { sub: 'user-1' } });

    expect(planningServiceMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ work_order_id: 'wo-1' }),
      'user-1',
    );
    expect(result).toEqual({ id: 'schedule-1' });
  });

  it('delegates update with current user', async () => {
    planningServiceMock.update.mockResolvedValue({ id: 'schedule-1' });

    const result = await controller.update(
      'schedule-1',
      { notes: 'Cambio', change_reason: 'Ajuste' },
      { user: { sub: 'user-1' } },
    );

    expect(planningServiceMock.update).toHaveBeenCalledWith(
      'schedule-1',
      { notes: 'Cambio', change_reason: 'Ajuste' },
      'user-1',
    );
    expect(result).toEqual({ id: 'schedule-1' });
  });

  it('delegates remove with current user', async () => {
    planningServiceMock.remove.mockResolvedValue({ id: 'schedule-1' });

    const result = await controller.remove('schedule-1', { user: { sub: 'user-1' } });

    expect(planningServiceMock.remove).toHaveBeenCalledWith('schedule-1', 'user-1');
    expect(result).toEqual({ id: 'schedule-1' });
  });
});
