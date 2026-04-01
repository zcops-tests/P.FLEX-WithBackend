import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateStockItemDto,
  UpdateStockItemDto,
  StockStatus,
} from './dto/stock.dto';
import { StockQueryDto } from './dto/stock-query.dto';
import {
  buildPaginatedResult,
  resolvePagination,
} from '../../../common/utils/pagination.util';
import { toFrontendStockItem } from '../../../common/utils/frontend-entity.util';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  private normalizePalletId(value: string | null | undefined) {
    const palletId = String(value || '').trim();
    return palletId || null;
  }

  private normalizeCreateData(dto: CreateStockItemDto) {
    return {
      ...dto,
      pallet_id: this.normalizePalletId(dto.pallet_id) ?? undefined,
      status: dto.status || StockStatus.LIBERATED,
    };
  }

  async create(dto: CreateStockItemDto) {
    const normalizedDto = this.normalizeCreateData(dto);

    if (normalizedDto.pallet_id) {
      const existingPallet = await this.prisma.stockItem.findUnique({
        where: { pallet_id: normalizedDto.pallet_id },
      });
      if (existingPallet) {
        throw new ConflictException(
          `Pallet ID ${normalizedDto.pallet_id} already exists`,
        );
      }
    }

    const created = await this.prisma.stockItem.create({
      data: normalizedDto,
      include: {
        work_order: true,
      },
    });

    return toFrontendStockItem(created);
  }

  async bulkCreate(dtos: CreateStockItemDto[]) {
    if (!Array.isArray(dtos) || dtos.length === 0) {
      return { processed: 0, created: 0 };
    }

    const normalizedItems = dtos.map((dto) => this.normalizeCreateData(dto));
    const palletIds = normalizedItems
      .map((dto) => dto.pallet_id)
      .filter((value): value is string => Boolean(value));

    const duplicateInPayload = palletIds.find(
      (palletId, index) => palletIds.indexOf(palletId) !== index,
    );

    if (duplicateInPayload) {
      throw new ConflictException(
        `Pallet ID ${duplicateInPayload} is duplicated in this batch`,
      );
    }

    if (palletIds.length > 0) {
      const existingPallets = await this.prisma.stockItem.findMany({
        where: {
          pallet_id: {
            in: palletIds,
          },
          deleted_at: null,
        },
        select: {
          pallet_id: true,
        },
      });

      if (existingPallets.length > 0) {
        throw new ConflictException(
          `Pallet ID ${existingPallets[0].pallet_id} already exists`,
        );
      }
    }

    await this.prisma.$transaction(
      normalizedItems.map((item) =>
        this.prisma.stockItem.create({
          data: item,
        }),
      ),
    );

    return {
      processed: normalizedItems.length,
      created: normalizedItems.length,
    };
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

    return buildPaginatedResult(
      items.map((item) => toFrontendStockItem(item)),
      total,
      pagination,
    );
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
    const current = await this.prisma.stockItem.findUnique({
      where: { id },
      select: {
        id: true,
        pallet_id: true,
        deleted_at: true,
      },
    });

    if (!current || current.deleted_at) {
      throw new NotFoundException(`Stock item with ID ${id} not found`);
    }

    const normalizedPalletId = this.normalizePalletId(dto.pallet_id);
    if (normalizedPalletId && normalizedPalletId !== current.pallet_id) {
      const existingPallet = await this.prisma.stockItem.findUnique({
        where: { pallet_id: normalizedPalletId },
      });
      if (existingPallet && existingPallet.id !== id) {
        throw new ConflictException(
          `Pallet ID ${normalizedPalletId} already exists`,
        );
      }
    }

    const updated = await this.prisma.stockItem.update({
      where: { id },
      data: {
        ...dto,
        pallet_id: normalizedPalletId ?? undefined,
      },
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
