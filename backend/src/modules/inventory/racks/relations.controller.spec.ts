import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { RelationsController } from './relations.controller';
import { RelationsService } from './relations.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { PrismaService } from '../../../database/prisma.service';

describe('RelationsController', () => {
  let controller: RelationsController;

  const mockRelationsService = {
    linkCliseDie: jest.fn(),
    unlinkCliseDie: jest.fn(),
    getCliseDies: jest.fn(),
    getDieClises: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RelationsController],
      providers: [
        { provide: RelationsService, useValue: mockRelationsService },
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

    controller = module.get<RelationsController>(RelationsController);
  });

  it('delegates link', async () => {
    const dto = { clise_id: 'clise-1', die_id: 'die-1' };
    mockRelationsService.linkCliseDie.mockResolvedValue({ id: 'link-1' });

    const result = await controller.link(dto);

    expect(mockRelationsService.linkCliseDie).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'link-1' });
  });

  it('delegates unlink', async () => {
    mockRelationsService.unlinkCliseDie.mockResolvedValue({ success: true });

    const result = await controller.unlink('clise-1', 'die-1');

    expect(mockRelationsService.unlinkCliseDie).toHaveBeenCalledWith(
      'clise-1',
      'die-1',
    );
    expect(result).toEqual({ success: true });
  });

  it('delegates getCliseDies', async () => {
    mockRelationsService.getCliseDies.mockResolvedValue([{ id: 'link-1' }]);

    const result = await controller.getCliseDies('clise-1');

    expect(mockRelationsService.getCliseDies).toHaveBeenCalledWith('clise-1');
    expect(result).toEqual([{ id: 'link-1' }]);
  });

  it('delegates getDieClises', async () => {
    mockRelationsService.getDieClises.mockResolvedValue([{ id: 'link-1' }]);

    const result = await controller.getDieClises('die-1');

    expect(mockRelationsService.getDieClises).toHaveBeenCalledWith('die-1');
    expect(result).toEqual([{ id: 'link-1' }]);
  });
});
