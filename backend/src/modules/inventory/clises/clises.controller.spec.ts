import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ClisesController } from './clises.controller';
import { ClisesService } from './clises.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { PrismaService } from '../../../database/prisma.service';

describe('ClisesController', () => {
  let controller: ClisesController;

  const mockClisesService = {
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
      controllers: [ClisesController],
      providers: [
        { provide: ClisesService, useValue: mockClisesService },
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

    controller = module.get<ClisesController>(ClisesController);
  });

  it('delegates create', async () => {
    const dto = { item_code: 'CL-001' };
    mockClisesService.create.mockResolvedValue({ id: 'clise-1' });

    const result = await controller.create(dto as any);

    expect(mockClisesService.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'clise-1' });
  });

  it('delegates bulkUpsert', async () => {
    const dto = { items: [{ item_code: 'CL-001' }] };
    mockClisesService.bulkUpsert.mockResolvedValue({ processed: 1 });

    const result = await controller.bulkUpsert(dto as any);

    expect(mockClisesService.bulkUpsert).toHaveBeenCalledWith(dto.items);
    expect(result).toEqual({ processed: 1 });
  });

  it('delegates findAll', async () => {
    const query = { q: 'CL-001' };
    mockClisesService.findAll.mockResolvedValue({ items: [] });

    const result = await controller.findAll(query as any);

    expect(mockClisesService.findAll).toHaveBeenCalledWith(query);
    expect(result).toEqual({ items: [] });
  });

  it('delegates findOne', async () => {
    mockClisesService.findOne.mockResolvedValue({ id: 'clise-1' });

    const result = await controller.findOne('clise-1');

    expect(mockClisesService.findOne).toHaveBeenCalledWith('clise-1');
    expect(result).toEqual({ id: 'clise-1' });
  });

  it('delegates update', async () => {
    const dto = { descripcion: 'Nueva' };
    mockClisesService.update.mockResolvedValue({ id: 'clise-1' });

    const result = await controller.update('clise-1', dto as any);

    expect(mockClisesService.update).toHaveBeenCalledWith('clise-1', dto);
    expect(result).toEqual({ id: 'clise-1' });
  });

  it('delegates remove', async () => {
    mockClisesService.remove.mockResolvedValue({ success: true });

    const result = await controller.remove('clise-1');

    expect(mockClisesService.remove).toHaveBeenCalledWith('clise-1');
    expect(result).toEqual({ success: true });
  });
});
