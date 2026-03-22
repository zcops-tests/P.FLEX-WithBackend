import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateStockItemDto, UpdateStockItemDto, StockStatus } from './dto/stock.dto';
import { StockQueryDto } from './dto/stock-query.dto';
import { buildPaginatedResult, resolvePagination } from '../../../common/utils/pagination.util';
import { toFrontendStockItem } from '../../../common/utils/frontend-entity.util';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateStockItemDto) {
    if (dto.pallet_id) {
      const existingPallet = await this.prisma.stockItem.findUnique({
        where: { pallet_id: dto.pallet_id },
      });
      if (existingPallet) {
        throw new ConflictException(`Pallet ID ${dto.pallet_id} already exists`);
      }
    }

    const created = await this.prisma.stockItem.create({
      data: {
        ...dto,
        status: dto.status || StockStatus.LIBERATED,
      },
      include: {
        work_order: true,
      },
    });

    return toFrontendStockItem(created);
  }

  async findAll(params: StockQueryDto) {
    const { status, q } = params;
    const pagination = resolvePagination(params);

    const where: Prisma.StockItemWhereInput = {
      deleted_at: null,
    };

    if (status) {
      where.status = status;
    }

    if (q) {
      where.OR = [
        { ot_number_snapshot: { contains: q } },
        { client_snapshot: { contains: q } },
        { product_snapshot: { contains: q } },
        { pallet_id: { contains: q } },
        { location: { contains: q } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.stockItem.count({ where }),
      this.prisma.stockItem.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { entry_date: 'desc' },
        include: {
          work_order: true,
        },
      }),
    ]);

    return buildPaginatedResult(items.map((item) => toFrontendStockItem(item)), total, pagination);
  }

  async findOne(id: string) {
    const item = await this.prisma.stockItem.findUnique({
      where: { id },
      include: {
        work_order: true,
      },
    });

    if (!item || item.deleted_at) {
      throw new NotFoundException(`Stock item with ID ${id} not found`);
    }
    return toFrontendStockItem(item);
  }

  async update(id: string, dto: UpdateStockItemDto) {
    await this.findOne(id);
    const updated = await this.prisma.stockItem.update({
      where: { id },
      data: dto,
      include: {
        work_order: true,
      },
    });

    return toFrontendStockItem(updated);
  }

  async updateStatus(id: string, status: StockStatus) {
    await this.findOne(id);
    const updated = await this.prisma.stockItem.update({
      where: { id },
      data: { status },
      include: {
        work_order: true,
      },
    });

    return toFrontendStockItem(updated);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.stockItem.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });
  }
}
