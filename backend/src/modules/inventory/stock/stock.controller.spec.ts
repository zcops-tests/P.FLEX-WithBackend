import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../modules/auth/guards/permissions.guard';
import { StockStatus } from './dto/stock.dto';
import { PrismaService } from '../../../database/prisma.service';

describe('StockController', () => {
  let controller: StockController;

  const mockStockService = {
    create: jest.fn(),
    bulkCreate: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockController],
      providers: [
        { provide: StockService, useValue: mockStockService },
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

    controller = module.get<StockController>(StockController);
  });

  it('delegates create', async () => {
    const dto = { caja: '1', medida: '100 x 200', entry_date: '2026-04-01T10:00:00.000Z' };
    mockStockService.create.mockResolvedValue({ id: 'stock-1' });

    const result = await controller.create(dto as any);

    expect(mockStockService.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'stock-1' });
  });

  it('delegates bulkCreate', async () => {
    const dto = { items: [{ caja: '1', entry_date: '2026-04-01T10:00:00.000Z' }] };
    mockStockService.bulkCreate.mockResolvedValue({ processed: 1 });

    const result = await controller.bulkCreate(dto as any);

    expect(mockStockService.bulkCreate).toHaveBeenCalledWith(dto.items);
    expect(result).toEqual({ processed: 1 });
  });

  it('delegates findAll', async () => {
    const query = { q: 'OT-1' };
    mockStockService.findAll.mockResolvedValue({ items: [] });

    const result = await controller.findAll(query as any);

    expect(mockStockService.findAll).toHaveBeenCalledWith(query);
    expect(result).toEqual({ items: [] });
  });

  it('delegates findOne', async () => {
    mockStockService.findOne.mockResolvedValue({ id: 'stock-1' });

    const result = await controller.findOne('stock-1');

    expect(mockStockService.findOne).toHaveBeenCalledWith('stock-1');
    expect(result).toEqual({ id: 'stock-1' });
  });

  it('delegates update', async () => {
    const dto = { location: 'A-01' };
    mockStockService.update.mockResolvedValue({ id: 'stock-1' });

    const result = await controller.update('stock-1', dto as any);

    expect(mockStockService.update).toHaveBeenCalledWith('stock-1', dto);
    expect(result).toEqual({ id: 'stock-1' });
  });

  it('delegates updateStatus', async () => {
    mockStockService.updateStatus.mockResolvedValue({ id: 'stock-1' });

    const result = await controller.updateStatus('stock-1', {
      status: StockStatus.RETAINED,
    });

    expect(mockStockService.updateStatus).toHaveBeenCalledWith(
      'stock-1',
      StockStatus.RETAINED,
    );
    expect(result).toEqual({ id: 'stock-1' });
  });

  it('delegates remove', async () => {
    mockStockService.remove.mockResolvedValue({ success: true });

    const result = await controller.remove('stock-1');

    expect(mockStockService.remove).toHaveBeenCalledWith('stock-1');
    expect(result).toEqual({ success: true });
  });
});
