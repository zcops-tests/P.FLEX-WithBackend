import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateStockItemDto, UpdateStockItemDto, StockStatus } from './dto/stock.dto';

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

    return this.prisma.stockItem.create({
      data: {
        ...dto,
        status: dto.status || StockStatus.LIBERATED,
      },
    });
  }

  async findAll(params: {
    page?: number;
    pageSize?: number;
    status?: StockStatus;
    q?: string;
  }) {
    const { page = 1, pageSize = 20, status, q } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {
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
        skip,
        take: pageSize,
        orderBy: { entry_date: 'desc' },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
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
    return item;
  }

  async update(id: string, dto: UpdateStockItemDto) {
    await this.findOne(id);
    return this.prisma.stockItem.update({
      where: { id },
      data: dto,
    });
  }

  async updateStatus(id: string, status: StockStatus) {
    await this.findOne(id);
    return this.prisma.stockItem.update({
      where: { id },
      data: { status },
    });
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
