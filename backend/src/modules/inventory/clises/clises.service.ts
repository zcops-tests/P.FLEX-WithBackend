import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { BulkUpsertCliseItemDto, CreateCliseDto, UpdateCliseDto } from './dto/clise.dto';
import { CliseQueryDto } from './dto/clise-query.dto';
import { buildPaginatedResult, resolvePagination } from '../../../common/utils/pagination.util';
import { toFrontendClise } from '../../../common/utils/frontend-entity.util';
import { normalizeOptionalDateInput } from '../../../common/utils/date-input.util';

@Injectable()
export class ClisesService {
  constructor(private prisma: PrismaService) {}

  private prepareBulkUpsertItem(dto: BulkUpsertCliseItemDto) {
    const displayItemCode = String(dto.item_code || '').trim();
    const cliente = String(dto.cliente || '').trim();
    const conflictReasons: string[] = [];

    if (!displayItemCode) conflictReasons.push('ITEM_REQUIRED');
    if (!cliente) conflictReasons.push('CLIENT_REQUIRED');

    const rawPayload = dto.raw_payload && typeof dto.raw_payload === 'object'
      ? { ...dto.raw_payload }
      : {};

    return {
      ...dto,
      item_code: displayItemCode || `__IMPORTED_CLISE__${randomUUID()}`,
      cliente: cliente || undefined,
      raw_payload: {
        ...rawPayload,
        display_item_code: displayItemCode,
        import_conflict: conflictReasons.length > 0,
        conflict_reasons: conflictReasons,
      },
    };
  }

  private buildPersistenceData(dto: CreateCliseDto | UpdateCliseDto) {
    return {
      ...dto,
      fecha_ingreso: normalizeOptionalDateInput(dto.fecha_ingreso),
      colores_json: dto.colores_json ? (dto.colores_json as Prisma.InputJsonValue) : undefined,
      raw_payload: dto.raw_payload ? (dto.raw_payload as Prisma.InputJsonValue) : undefined,
    };
  }

  async create(dto: CreateCliseDto) {
    const existing = await this.prisma.clise.findUnique({
      where: { item_code: dto.item_code },
    });
    if (existing) {
      throw new ConflictException(`Clisé with item code ${dto.item_code} already exists`);
    }

    const created = await this.prisma.clise.create({
      data: {
        ...this.buildPersistenceData(dto),
        metros_acumulados: dto.metros_acumulados ?? 0,
      },
    });

    return toFrontendClise(created);
  }

  async bulkUpsert(dtos: BulkUpsertCliseItemDto[]) {
    const normalizedItems = dtos.map((dto) => this.prepareBulkUpsertItem(dto));

    const uniqueItems = Array.from(new Map(normalizedItems.map((dto) => [dto.item_code, dto])).values());

    if (uniqueItems.length === 0) {
      return { processed: 0, created: 0, updated: 0 };
    }

    const existing = await this.prisma.clise.findMany({
      where: {
        item_code: { in: uniqueItems.map((dto) => dto.item_code) },
      },
      select: {
        id: true,
        item_code: true,
      },
    });

    const existingByItemCode = new Map(existing.map((item) => [item.item_code, item.id]));
    let created = 0;
    let updated = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const dto of uniqueItems) {
        const data = {
          ...this.buildPersistenceData(dto),
          metros_acumulados: dto.metros_acumulados ?? 0,
        };

        const existingId = existingByItemCode.get(dto.item_code);
        if (existingId) {
          await tx.clise.update({
            where: { id: existingId },
            data: {
              ...data,
              deleted_at: null,
            },
          });
          updated += 1;
          continue;
        }

        await tx.clise.create({
          data,
        });
        created += 1;
      }
    });

    return {
      processed: uniqueItems.length,
      created,
      updated,
    };
  }

  async findAll(params: CliseQueryDto) {
    const { q } = params;
    const pagination = resolvePagination(params);

    const where: Prisma.CliseWhereInput = {
      deleted_at: null,
    };

    if (q) {
      where.OR = [
        { item_code: { contains: q } },
        { descripcion: { contains: q } },
        { cliente: { contains: q } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.clise.count({ where }),
      this.prisma.clise.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { created_at: 'desc' },
        include: {
          color_usage: true,
          die_links: {
            include: {
              die: true,
            },
          },
          history: {
            include: {
              user: true,
              machine: true,
            },
          },
        },
      }),
    ]);

    return buildPaginatedResult(items.map((item) => toFrontendClise(item)), total, pagination);
  }

  async findOne(id: string) {
    const clise = await this.prisma.clise.findUnique({
      where: { id },
      include: {
        color_usage: true,
        die_links: {
          include: {
            die: true,
          },
        },
        history: {
          include: {
            user: true,
            machine: true,
          },
        },
      },
    });

    if (!clise || clise.deleted_at) {
      throw new NotFoundException(`Clisé with ID ${id} not found`);
    }
    return toFrontendClise(clise);
  }

  async update(id: string, dto: UpdateCliseDto) {
    await this.findOne(id);
    const updated = await this.prisma.clise.update({
      where: { id },
      data: this.buildPersistenceData(dto),
      include: {
        color_usage: true,
        die_links: {
          include: {
            die: true,
          },
        },
        history: {
          include: {
            user: true,
            machine: true,
          },
        },
      },
    });

    return toFrontendClise(updated);
  }

  async remove(id: string) {
    await this.findOne(id);
    
    // Check if used in active print reports or work orders
    const activeRefs = await this.prisma.printReport.count({
      where: { clise_id: id },
    });

    if (activeRefs > 0) {
      throw new ConflictException(`Cannot delete Clisé with ID ${id} because it is referenced by active production reports`);
    }

    return this.prisma.clise.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });
  }
}
