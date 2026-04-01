import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  CreateWorkOrderDto,
  WorkOrderManagementExitAction,
  WorkOrderStatus,
} from './dto/work-order.dto';
import { PrismaService } from '../../database/prisma.service';

describe('WorkOrdersController', () => {
  let controller: WorkOrdersController;

  const mockWorkOrdersService = {
    create: jest.fn(),
    bulkUpsert: jest.fn(),
    findAll: jest.fn(),
    findManagement: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    enterManagement: jest.fn(),
    exitManagement: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkOrdersController],
      providers: [
        {
          provide: WorkOrdersService,
          useValue: mockWorkOrdersService,
        },
        {
          provide: JwtAuthGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
        {
          provide: PermissionsGuard,
          useValue: { canActivate: jest.fn().mockResolvedValue(true) },
        },
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn() },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<WorkOrdersController>(WorkOrdersController);
    jest.clearAllMocks();
  });

  it('should delegate create', async () => {
    const dto: CreateWorkOrderDto = {
      ot_number: 'OT-1001',
      descripcion: 'Nueva OT',
    };
    mockWorkOrdersService.create.mockResolvedValue({ id: 'ot-1' });

    const result = await controller.create(dto);

    expect(mockWorkOrdersService.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'ot-1' });
  });

  it('should delegate bulkUpsert', async () => {
    const dto = { items: [{ ot_number: 'OT-1001' }, { ot_number: 'OT-1002' }] };
    mockWorkOrdersService.bulkUpsert.mockResolvedValue({ total: 2 });

    const result = await controller.bulkUpsert(dto as any);

    expect(mockWorkOrdersService.bulkUpsert).toHaveBeenCalledWith(dto.items);
    expect(result).toEqual({ total: 2 });
  });

  it('should delegate findAll', async () => {
    const query = { q: 'OT-1001', page: 1, pageSize: 10 };
    mockWorkOrdersService.findAll.mockResolvedValue({ items: [] });

    const result = await controller.findAll(query as any);

    expect(mockWorkOrdersService.findAll).toHaveBeenCalledWith(query);
    expect(result).toEqual({ items: [] });
  });

  it('should delegate findManagement', async () => {
    mockWorkOrdersService.findManagement.mockResolvedValue([{ id: 'ot-1' }]);

    const result = await controller.findManagement();

    expect(mockWorkOrdersService.findManagement).toHaveBeenCalled();
    expect(result).toEqual([{ id: 'ot-1' }]);
  });

  it('should delegate findOne', async () => {
    mockWorkOrdersService.findOne.mockResolvedValue({ id: 'ot-1' });

    const result = await controller.findOne('ot-1');

    expect(mockWorkOrdersService.findOne).toHaveBeenCalledWith('ot-1');
    expect(result).toEqual({ id: 'ot-1' });
  });

  it('should delegate update', async () => {
    const dto = { descripcion: 'Actualizada' };
    mockWorkOrdersService.update.mockResolvedValue({ id: 'ot-1' });

    const result = await controller.update('ot-1', dto);

    expect(mockWorkOrdersService.update).toHaveBeenCalledWith('ot-1', dto);
    expect(result).toEqual({ id: 'ot-1' });
  });

  it('should delegate updateStatus', async () => {
    mockWorkOrdersService.updateStatus.mockResolvedValue({ id: 'ot-1' });

    const result = await controller.updateStatus('ot-1', {
      status: WorkOrderStatus.COMPLETED,
    });

    expect(mockWorkOrdersService.updateStatus).toHaveBeenCalledWith(
      'ot-1',
      WorkOrderStatus.COMPLETED,
    );
    expect(result).toEqual({ id: 'ot-1' });
  });

  it('should delegate enterManagement', async () => {
    mockWorkOrdersService.enterManagement.mockResolvedValue({ id: 'ot-1' });

    const result = await controller.enterManagement('ot-1', {
      user: { sub: 'user-1' },
    });

    expect(mockWorkOrdersService.enterManagement).toHaveBeenCalledWith(
      'ot-1',
      'user-1',
    );
    expect(result).toEqual({ id: 'ot-1' });
  });

  it('should delegate exitManagement', async () => {
    mockWorkOrdersService.exitManagement.mockResolvedValue({ id: 'ot-1' });

    const result = await controller.exitManagement(
      'ot-1',
      {
        exit_action: WorkOrderManagementExitAction.REMOVE_ONLY,
      },
      { user: { sub: 'user-1' } },
    );

    expect(mockWorkOrdersService.exitManagement).toHaveBeenCalledWith(
      'ot-1',
      WorkOrderManagementExitAction.REMOVE_ONLY,
      'user-1',
    );
    expect(result).toEqual({ id: 'ot-1' });
  });

  it('should delegate remove', async () => {
    mockWorkOrdersService.remove.mockResolvedValue({ success: true });

    const result = await controller.remove('ot-1');

    expect(mockWorkOrdersService.remove).toHaveBeenCalledWith('ot-1');
    expect(result).toEqual({ success: true });
  });
});
