import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { DiesController } from './dies.controller';
import { DiesService } from './dies.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { PrismaService } from '../../../database/prisma.service';

describe('DiesController', () => {
  let controller: DiesController;

  const mockDiesService = {
    create: jest.fn(),
    bulkUpsert: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiesController],
      providers: [
        { provide: DiesService, useValue: mockDiesService },
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

    controller = module.get<DiesController>(DiesController);
  });

  it('delegates create', async () => {
    const dto = { serie: 'DIE-001' };
    mockDiesService.create.mockResolvedValue({ id: 'die-1' });

    const result = await controller.create(dto as any);

    expect(mockDiesService.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'die-1' });
  });

  it('delegates bulkUpsert', async () => {
    const dto = { items: [{ serie: 'DIE-001' }] };
    mockDiesService.bulkUpsert.mockResolvedValue({ processed: 1 });

    const result = await controller.bulkUpsert(dto as any);

    expect(mockDiesService.bulkUpsert).toHaveBeenCalledWith(dto.items);
    expect(result).toEqual({ processed: 1 });
  });

  it('delegates findAll', async () => {
    const query = { q: 'DIE-001' };
    mockDiesService.findAll.mockResolvedValue({ items: [] });

    const result = await controller.findAll(query as any);

    expect(mockDiesService.findAll).toHaveBeenCalledWith(query);
    expect(result).toEqual({ items: [] });
  });

  it('delegates findOne', async () => {
    mockDiesService.findOne.mockResolvedValue({ id: 'die-1' });

    const result = await controller.findOne('die-1');

    expect(mockDiesService.findOne).toHaveBeenCalledWith('die-1');
    expect(result).toEqual({ id: 'die-1' });
  });

  it('delegates update', async () => {
    const dto = { forma: 'RECT' };
    mockDiesService.update.mockResolvedValue({ id: 'die-1' });

    const result = await controller.update('die-1', dto as any);

    expect(mockDiesService.update).toHaveBeenCalledWith('die-1', dto);
    expect(result).toEqual({ id: 'die-1' });
  });

  it('delegates remove', async () => {
    mockDiesService.remove.mockResolvedValue({ success: true });

    const result = await controller.remove('die-1');

    expect(mockDiesService.remove).toHaveBeenCalledWith('die-1');
    expect(result).toEqual({ success: true });
  });
});
