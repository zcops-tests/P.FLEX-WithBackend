import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateStockItemDto,
  StockStatus,
  UpdateStockItemDto,
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

  private normalizeCaja(value: string | null | undefined) {
    const caja = String(value || '').trim();
    if (!caja) return null;
    if (/^\d+$/.test(caja)) return caja.padStart(4, '0');
    return caja.toUpperCase();
  }

  private normalizeText(value: string | null | undefined) {
    const text = String(value || '').trim();
    return text || undefined;
  }

  private extractBoxSequence(value: string | null | undefined) {
    const match = String(value || '')
      .trim()
      .match(/(\d+)$/);

    if (!match) return null;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private async getNextBoxSequence(tx: PrismaService | Prisma.TransactionClient) {
    const existingBoxes = await tx.stockItem.findMany({
      where: {
        box_id: {
          startsWith: 'C',
        },
      },
      select: {
        box_id: true,
      },
    });

    const maxSequence = existingBoxes.reduce((currentMax, item) => {
      const sequence = this.extractBoxSequence(item.box_id);
      return sequence !== null && sequence > currentMax ? sequence : currentMax;
    }, -1);

    return maxSequence + 1;
  }

  private buildGeneratedBoxId(caja: string | null | undefined, sequence: number) {
    const normalizedCaja = this.normalizeCaja(caja) || '0000';
    return `C${normalizedCaja}-${String(sequence).padStart(4, '0')}`;
  }

  private normalizeCreateData(dto: CreateStockItemDto) {
    return {
      work_order_id: dto.work_order_id || undefined,
      ot_number_snapshot: this.normalizeText(dto.ot_number_snapshot),
      client_snapshot: this.normalizeText(dto.client_snapshot),
      product_snapshot: this.normalizeText(dto.product_snapshot),
      medida: this.normalizeText(dto.medida),
      ancho_mm: dto.ancho_mm ?? undefined,
      avance_mm: dto.avance_mm ?? undefined,
      material: this.normalizeText(dto.material),
      columnas: dto.columnas ?? undefined,
      prepicado: this.normalizeText(dto.prepicado),
      cantidad_x_rollo: dto.cantidad_x_rollo ?? undefined,
      cantidad_millares: dto.cantidad_millares ?? undefined,
      etiqueta: this.normalizeText(dto.etiqueta),
      forma: this.normalizeText(dto.forma),
      tipo_producto: this.normalizeText(dto.tipo_producto),
      caja: this.normalizeCaja(dto.caja) || '0000',
      location: this.normalizeText(dto.ubicacion),
      status: dto.status || StockStatus.QUARANTINE,
      entry_date: dto.entry_date,
      notes: this.normalizeText(dto.notes),
      quantity:
        dto.quantity ??
        dto.cantidad_millares ??
        dto.cantidad_x_rollo ??
        undefined,
      unit: 'PT',
      millares: dto.cantidad_millares ?? undefined,
    };
  }

  async create(dto: CreateStockItemDto) {
    const normalizedDto = this.normalizeCreateData(dto);
    const created = await this.prisma.$transaction(async (tx) => {
      const nextSequence = await this.getNextBoxSequence(tx);

      return tx.stockItem.create({
        data: {
          ...normalizedDto,
          box_id: this.buildGeneratedBoxId(normalizedDto.caja, nextSequence),
        },
      });
    });

    return toFrontendStockItem(created);
  }

  async bulkCreate(dtos: CreateStockItemDto[]) {
    if (!Array.isArray(dtos) || dtos.length === 0) {
      return { processed: 0, created: 0 };
    }

    const normalizedItems = dtos.map((dto) => this.normalizeCreateData(dto));
    let nextSequence = await this.getNextBoxSequence(this.prisma);
    const data = normalizedItems.map((item) => {
      const generated = {
        ...item,
        box_id: this.buildGeneratedBoxId(item.caja, nextSequence),
      };
      nextSequence += 1;
      return generated;
    });

    const chunkSize = 500;
    for (let index = 0; index < data.length; index += chunkSize) {
      await this.prisma.stockItem.createMany({
        data: data.slice(index, index + chunkSize),
      });
    }

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
        { medida: { contains: q } },
        { material: { contains: q } },
        { etiqueta: { contains: q } },
        { forma: { contains: q } },
        { tipo_producto: { contains: q } },
        { caja: { contains: q } },
        { box_id: { contains: q } },
        { location: { contains: q } },
      ] as any;
    }

    const [total, items] = await Promise.all([
      this.prisma.stockItem.count({ where }),
      this.prisma.stockItem.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { entry_date: 'desc' },
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
        box_id: true,
        deleted_at: true,
      },
    });

    if (!current || current.deleted_at) {
      throw new NotFoundException(`Stock item with ID ${id} not found`);
    }

    const normalizedDto = this.normalizeCreateData(dto);

    const updated = await this.prisma.stockItem.update({
      where: { id },
      data: {
        ...normalizedDto,
      },
    });

    return toFrontendStockItem(updated);
  }

  async updateStatus(id: string, status: StockStatus) {
    await this.findOne(id);
    const updated = await this.prisma.stockItem.update({
      where: { id },
      data: { status },
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
