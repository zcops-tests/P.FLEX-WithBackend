import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  private static readonly BOX_SEQUENCE_NAME = 'stock_box_id';
  private static readonly IMPORT_CONFLICT_PREFIX = '[IMPORT_CONFLICT:';

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

  private extractConflictReasons(notes: string | null | undefined) {
    return String(notes || '')
      .match(/\[IMPORT_CONFLICT:([^\]]+)\]/g)
      ?.flatMap((entry) =>
        String(entry)
          .replace(StockService.IMPORT_CONFLICT_PREFIX, '')
          .replace(']', '')
          .split('|'),
      )
      .map((entry) => String(entry || '').trim())
      .filter(Boolean) || [];
  }

  private stripConflictNotes(notes: string | null | undefined) {
    const text = String(notes || '')
      .replace(/\[IMPORT_CONFLICT:[^\]]+\]\s*/g, '')
      .trim();
    return text || undefined;
  }

  private composeNotes(
    notes: string | null | undefined,
    conflictReasons: string[] = [],
  ) {
    const cleanNotes = this.stripConflictNotes(notes);
    const uniqueReasons = Array.from(
      new Set(conflictReasons.map((entry) => String(entry || '').trim()).filter(Boolean)),
    );

    if (uniqueReasons.length === 0) {
      return cleanNotes;
    }

    const marker = `${StockService.IMPORT_CONFLICT_PREFIX}${uniqueReasons.join('|')}]`;
    return cleanNotes ? `${marker} ${cleanNotes}` : marker;
  }

  private assertCaja(value: string | null | undefined) {
    const normalized = this.normalizeCaja(value);
    if (!normalized) {
      throw new BadRequestException(
        'La columna CAJA es obligatoria para registrar producto terminado.',
      );
    }
    return normalized;
  }

  private async reserveBoxSequenceRange(
    tx: PrismaService | Prisma.TransactionClient,
    count: number,
  ) {
    if (!Number.isInteger(count) || count <= 0) {
      throw new BadRequestException(
        'La reserva de correlativos requiere al menos un registro.',
      );
    }

    await tx.$executeRaw`
      INSERT INTO sequence_counters (name, next_value, created_at, updated_at)
      VALUES (${StockService.BOX_SEQUENCE_NAME}, 0, NOW(3), NOW(3))
      ON DUPLICATE KEY UPDATE updated_at = VALUES(updated_at)
    `;

    await tx.$executeRaw`
      UPDATE sequence_counters
      SET next_value = LAST_INSERT_ID(next_value + ${count}), updated_at = NOW(3)
      WHERE name = ${StockService.BOX_SEQUENCE_NAME}
    `;

    const rows =
      await tx.$queryRaw<Array<{ reserved_end: bigint | number }>>`
        SELECT LAST_INSERT_ID() AS reserved_end
      `;

    const reservedEnd = Number(rows[0]?.reserved_end ?? 0);
    const start = reservedEnd - count;
    return Array.from({ length: count }, (_, index) => start + index);
  }

  private buildGeneratedBoxId(caja: string | null | undefined, sequence: number) {
    const normalizedCaja = this.assertCaja(caja);
    return `C${normalizedCaja}-${String(sequence).padStart(4, '0')}`;
  }

  private normalizeCreateData(
    dto: CreateStockItemDto,
    options: { requireCaja?: boolean } = {},
  ) {
    const normalizedCaja = options.requireCaja === false
      ? this.normalizeCaja(dto.caja)
      : this.assertCaja(dto.caja);

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
      caja: normalizedCaja,
      location: this.normalizeText(dto.ubicacion),
      status: dto.status || StockStatus.QUARANTINE,
      entry_date: dto.entry_date,
      notes: this.stripConflictNotes(dto.notes),
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
      const [nextSequence] = await this.reserveBoxSequenceRange(tx, 1);

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
    await this.prisma.$transaction(async (tx) => {
      const reservedSequences = await this.reserveBoxSequenceRange(
        tx,
        normalizedItems.length,
      );
      const data = normalizedItems.map((item, index) => ({
        ...item,
        box_id: this.buildGeneratedBoxId(item.caja, reservedSequences[index]),
      }));

      const chunkSize = 500;
      for (let index = 0; index < data.length; index += chunkSize) {
        await tx.stockItem.createMany({
          data: data.slice(index, index + chunkSize),
        });
      }
    });

    return {
      processed: normalizedItems.length,
      created: normalizedItems.length,
    };
  }

  async bulkUpsert(dtos: CreateStockItemDto[]) {
    if (!Array.isArray(dtos) || dtos.length === 0) {
      return { imported: 0, conflicts: 0, created: 0, updated: 0 };
    }

    const normalizedItems = dtos.map((dto) => {
      const normalized = this.normalizeCreateData(dto, { requireCaja: false });
      const conflictReasons = normalized.caja ? [] : ['MISSING_CAJA'];
      return {
        ...normalized,
        conflictReasons,
        notes: this.composeNotes(normalized.notes, conflictReasons),
      };
    });

    const cajas = Array.from(
      new Set(
        normalizedItems
          .map((item) => item.caja)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const existingItems = cajas.length
      ? await this.prisma.stockItem.findMany({
          where: {
            deleted_at: null,
            caja: { in: cajas },
          },
          select: {
            id: true,
            caja: true,
            box_id: true,
            notes: true,
          },
        })
      : [];

    const existingByCaja = new Map(
      existingItems.map((item) => [this.normalizeCaja(item.caja) || '', item]),
    );

    const createItems = normalizedItems.filter((item) => !item.caja || !existingByCaja.has(item.caja));
    const updateItems = normalizedItems
      .filter((item) => item.caja && existingByCaja.has(item.caja))
      .map((item) => ({
        ...item,
        current: existingByCaja.get(item.caja!),
      }));

    const createWithCaja = createItems.filter((item) => item.caja);
    const updateNeedingBoxId = updateItems.filter((item) => item.caja && !item.current?.box_id);

    await this.prisma.$transaction(async (tx) => {
      const reservedSequences =
        createWithCaja.length + updateNeedingBoxId.length > 0
          ? await this.reserveBoxSequenceRange(
              tx,
              createWithCaja.length + updateNeedingBoxId.length,
            )
          : [];
      let sequenceIndex = 0;

      for (const item of createItems) {
        const { conflictReasons, ...persistableItem } = item;
        const boxId = item.caja
          ? this.buildGeneratedBoxId(item.caja, reservedSequences[sequenceIndex++])
          : null;

        await tx.stockItem.create({
          data: {
            ...persistableItem,
            box_id: boxId || undefined,
          },
        });
      }

      for (const item of updateItems) {
        const { current, conflictReasons, ...persistableItem } = item;
        const nextBoxId =
          item.caja && !item.current?.box_id
            ? this.buildGeneratedBoxId(item.caja, reservedSequences[sequenceIndex++])
            : undefined;

        await tx.stockItem.update({
          where: { id: item.current!.id },
          data: {
            ...persistableItem,
            box_id: nextBoxId,
          },
        });
      }
    });

    return {
      imported: normalizedItems.length,
      conflicts: normalizedItems.filter((item) => item.conflictReasons.length > 0).length,
      created: createItems.length,
      updated: updateItems.length,
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
      ];
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

  async findCatalog() {
    const items = await this.prisma.stockItem.findMany({
      where: { deleted_at: null },
      orderBy: { entry_date: 'desc' },
    });

    return items.map((item) => toFrontendStockItem(item));
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
        caja: true,
        notes: true,
        deleted_at: true,
      },
    });

    if (!current || current.deleted_at) {
      throw new NotFoundException(`Stock item with ID ${id} not found`);
    }

    const normalizedDto = this.normalizeCreateData(dto, { requireCaja: false });
    const conflictReasons = normalizedDto.caja ? [] : this.extractConflictReasons(current.notes);

    const updated = await this.prisma.$transaction(async (tx) => {
      let nextBoxId: string | undefined;

      if (!current.box_id && normalizedDto.caja) {
        const [nextSequence] = await this.reserveBoxSequenceRange(tx, 1);
        nextBoxId = this.buildGeneratedBoxId(normalizedDto.caja, nextSequence);
      }

      return tx.stockItem.update({
        where: { id },
        data: {
          ...normalizedDto,
          notes: this.composeNotes(normalizedDto.notes, conflictReasons),
          box_id: nextBoxId,
        },
      });
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
