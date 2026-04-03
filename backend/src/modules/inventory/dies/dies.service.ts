import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  BulkUpsertDieItemDto,
  CreateDieDto,
  UpdateDieDto,
} from './dto/die.dto';
import { DieQueryDto } from './dto/die-query.dto';
import {
  buildPaginatedResult,
  resolvePagination,
} from '../../../common/utils/pagination.util';
import { toFrontendDie } from '../../../common/utils/frontend-entity.util';
import { normalizeOptionalDateInput } from '../../../common/utils/date-input.util';

@Injectable()
export class DiesService {
  constructor(private prisma: PrismaService) {}

  private prepareBulkUpsertItem(dto: BulkUpsertDieItemDto) {
    const displaySerie = String(dto.serie || '').trim();
    const cliente = String(dto.cliente || '').trim();
    const conflictReasons: string[] = [];

    if (!displaySerie) conflictReasons.push('SERIE_REQUIRED');
    if (!cliente) conflictReasons.push('CLIENT_REQUIRED');

    const rawPayload =
      dto.raw_payload && typeof dto.raw_payload === 'object'
        ? { ...dto.raw_payload }
        : {};

    return {
      ...dto,
      serie: displaySerie || `__IMPORTED_DIE__${randomUUID()}`,
      cliente: cliente || undefined,
      raw_payload: {
        ...rawPayload,
        display_serie: displaySerie,
        import_conflict: conflictReasons.length > 0,
        conflict_reasons: conflictReasons,
      },
    };
  }

  private buildPersistenceData(
    dto: CreateDieDto | UpdateDieDto | BulkUpsertDieItemDto,
  ) {
    return {
      ...dto,
      fecha_ingreso: normalizeOptionalDateInput(dto.fecha_ingreso),
      raw_payload: dto.raw_payload
        ? (dto.raw_payload as Prisma.InputJsonValue)
        : undefined,
    };
  }

  async create(dto: CreateDieDto) {
    const existing = await this.prisma.die.findUnique({
      where: { serie: dto.serie },
    });
    if (existing) {
      throw new ConflictException(`Die with serie ${dto.serie} already exists`);
    }

    const created = await this.prisma.die.create({
      data: {
        ...this.buildPersistenceData(dto),
        serie: dto.serie,
        metros_acumulados: dto.metros_acumulados ?? 0,
      },
    });

    return toFrontendDie(created);
  }

  async bulkUpsert(dtos: BulkUpsertDieItemDto[]) {
    const normalizedItems = dtos.map((dto) => this.prepareBulkUpsertItem(dto));

    const uniqueItems = Array.from(
      new Map(normalizedItems.map((dto) => [dto.serie, dto])).values(),
    );

    if (uniqueItems.length === 0) {
      return { processed: 0, created: 0, updated: 0 };
    }

    const existing = await this.prisma.die.findMany({
      where: {
        serie: { in: uniqueItems.map((dto) => dto.serie) },
      },
      select: {
        id: true,
        serie: true,
      },
    });

    const existingBySerie = new Map(
      existing.map((item) => [item.serie, item.id]),
    );
    let created = 0;
    let updated = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const dto of uniqueItems) {
        const data = {
          ...this.buildPersistenceData(dto),
          serie: dto.serie,
          metros_acumulados: dto.metros_acumulados ?? 0,
        };

        const existingId = existingBySerie.get(dto.serie);
        if (existingId) {
          await tx.die.update({
            where: { id: existingId },
            data: {
              ...data,
              deleted_at: null,
            },
          });
          updated += 1;
          continue;
        }

        await tx.die.create({
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

  async findAll(params: DieQueryDto) {
    const { q } = params;
    const pagination = resolvePagination(params);

    const where: Prisma.DieWhereInput = {
      deleted_at: null,
    };

    if (q) {
      where.OR = [
        { serie: { contains: q } },
        { medida: { contains: q } },
        { cliente: { contains: q } },
        { material: { contains: q } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.die.count({ where }),
      this.prisma.die.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { created_at: 'desc' },
        include: {
          clise_links: {
            include: {
              clise: true,
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

    return buildPaginatedResult(
      items.map((item) => toFrontendDie(item)),
      total,
      pagination,
    );
  }

  async findCatalog() {
    const items = await this.prisma.die.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
      include: {
        clise_links: {
          include: {
            clise: true,
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

    return items.map((item) => toFrontendDie(item));
  }

  async findOne(id: string) {
    const die = await this.prisma.die.findUnique({
      where: { id },
      include: {
        clise_links: {
          include: {
            clise: true,
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

    if (!die || die.deleted_at) {
      throw new NotFoundException(`Die with ID ${id} not found`);
    }
    return toFrontendDie(die);
  }

  async update(id: string, dto: UpdateDieDto) {
    await this.findOne(id);
    const updated = await this.prisma.die.update({
      where: { id },
      data: this.buildPersistenceData(dto),
      include: {
        clise_links: {
          include: {
            clise: true,
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

    return toFrontendDie(updated);
  }

  async remove(id: string) {
    await this.findOne(id);

    // Check if used in active diecut reports
    const activeRefs = await this.prisma.diecutReport.count({
      where: { die_id: id },
    });

    if (activeRefs > 0) {
      throw new ConflictException(
        `Cannot delete Die with ID ${id} because it is referenced by active production reports`,
      );
    }

    return this.prisma.die.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });
  }
}
