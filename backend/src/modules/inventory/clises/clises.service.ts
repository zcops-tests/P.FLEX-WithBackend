import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  BulkUpsertCliseItemDto,
  CreateCliseDto,
  UpdateCliseDto,
} from './dto/clise.dto';
import { CliseQueryDto } from './dto/clise-query.dto';
import {
  buildPaginatedResult,
  resolvePagination,
} from '../../../common/utils/pagination.util';
import { toFrontendClise } from '../../../common/utils/frontend-entity.util';
import { normalizeOptionalDateInput } from '../../../common/utils/date-input.util';

const CLISE_BULK_CHUNK_SIZE = 200;

@Injectable()
export class ClisesService {
  constructor(private prisma: PrismaService) {}

  private readonly includeGraph = {
    color_usage: true,
    die_links: {
      where: { deleted_at: null },
      include: {
        die: true,
      },
    },
    history: {
      where: { deleted_at: null },
      include: {
        user: true,
        machine: true,
      },
    },
  } as const;

  async create(dto: CreateCliseDto) {
    const normalizedDto = this.normalizeCliseInput(dto);
    const existing = await this.prisma.clise.findUnique({
      where: { item_code: normalizedDto.item_code },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        `Clisé with item code ${normalizedDto.item_code} already exists`,
      );
    }

    const created = await this.prisma.clise.create({
      data: this.buildCreateData(normalizedDto),
      include: this.includeGraph,
    });

    return toFrontendClise(created);
  }

  async bulkUpsert(dtos: BulkUpsertCliseItemDto[]) {
    const normalizedItems = dtos.map((dto) => this.prepareBulkUpsertItem(dto));
    const uniqueItems = Array.from(
      new Map(normalizedItems.map((dto) => [dto.item_code, dto])).values(),
    );

    if (uniqueItems.length === 0) {
      return { processed: 0, created: 0, updated: 0 };
    }

    let created = 0;
    let updated = 0;

    for (
      let index = 0;
      index < uniqueItems.length;
      index += CLISE_BULK_CHUNK_SIZE
    ) {
      const chunk = uniqueItems.slice(index, index + CLISE_BULK_CHUNK_SIZE);
      const chunkNumber = Math.floor(index / CLISE_BULK_CHUNK_SIZE) + 1;
      const existing = await this.prisma.clise.findMany({
        where: {
          item_code: { in: chunk.map((dto) => dto.item_code) },
        },
        select: {
          item_code: true,
        },
      });

      const existingSet = new Set(existing.map((item) => item.item_code));
      created += chunk.filter(
        (item) => !existingSet.has(item.item_code),
      ).length;
      updated += chunk.filter((item) => existingSet.has(item.item_code)).length;

      try {
        await this.prisma.$transaction(async (tx) => {
          for (const dto of chunk) {
            try {
              await tx.clise.upsert({
                where: { item_code: dto.item_code },
                create: this.buildCreateData(dto),
                update: this.buildUpdateData(dto),
              });
            } catch (error) {
              throw this.buildImportException(dto, error);
            }
          }
        });
      } catch (error) {
        if (
          error instanceof BadRequestException ||
          error instanceof ConflictException ||
          error instanceof InternalServerErrorException
        ) {
          throw error;
        }

        throw new InternalServerErrorException(
          `Falló la importación del lote ${chunkNumber}. ${this.describeImportError(error)}`,
        );
      }
    }

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
        include: this.includeGraph,
      }),
    ]);

    return buildPaginatedResult(
      items.map((item) => toFrontendClise(item)),
      total,
      pagination,
    );
  }

  async findOne(id: string) {
    const clise = await this.prisma.clise.findUnique({
      where: { id },
      include: this.includeGraph,
    });

    if (!clise || clise.deleted_at) {
      throw new NotFoundException(`Clisé with ID ${id} not found`);
    }

    return toFrontendClise(clise);
  }

  async update(id: string, dto: UpdateCliseDto) {
    await this.findOne(id);
    const normalizedDto = this.normalizeCliseInput(dto);

    const duplicate = await this.prisma.clise.findFirst({
      where: {
        item_code: normalizedDto.item_code,
        id: { not: id },
        deleted_at: null,
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException(
        `Clisé with item code ${normalizedDto.item_code} already exists`,
      );
    }

    const updated = await this.prisma.clise.update({
      where: { id },
      data: this.buildUpdateData(normalizedDto),
      include: this.includeGraph,
    });

    return toFrontendClise(updated);
  }

  async remove(id: string) {
    await this.findOne(id);

    const activeRefs = await this.prisma.printReport.count({
      where: { clise_id: id },
    });

    if (activeRefs > 0) {
      throw new ConflictException(
        `Cannot delete Clisé with ID ${id} because it is referenced by active production reports`,
      );
    }

    return this.prisma.clise.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });
  }

  private prepareBulkUpsertItem(dto: BulkUpsertCliseItemDto) {
    const normalizedDto = this.normalizeCliseInput(dto);
    const displayItemCode = normalizedDto.item_code || '';
    const cliente = normalizedDto.cliente || '';
    const conflictReasons: string[] = [];

    if (!displayItemCode) conflictReasons.push('ITEM_REQUIRED');
    if (!cliente) conflictReasons.push('CLIENT_REQUIRED');

    return {
      ...normalizedDto,
      item_code: displayItemCode || `__IMPORTED_CLISE__${randomUUID()}`,
      cliente,
      raw_payload: {
        ...this.pickSafeRawPayload(normalizedDto.raw_payload),
        display_item_code: displayItemCode,
        import_conflict: conflictReasons.length > 0,
        conflict_reasons: conflictReasons,
      },
    };
  }

  private buildCreateData(dto: NormalizedCliseInput): Prisma.CliseCreateInput {
    return {
      item_code: dto.item_code,
      ...this.buildPersistenceData(dto),
      metros_acumulados: dto.metros_acumulados ?? 0,
    };
  }

  private buildUpdateData(dto: NormalizedCliseInput): Prisma.CliseUpdateInput {
    return {
      ...this.buildPersistenceData(dto),
      deleted_at: null,
    };
  }

  private buildPersistenceData(dto: NormalizedCliseInput) {
    return {
      ubicacion: dto.ubicacion ?? undefined,
      descripcion: dto.descripcion ?? undefined,
      cliente: dto.cliente ?? undefined,
      z_value: dto.z_value ?? undefined,
      ancho_mm: dto.ancho_mm ?? undefined,
      avance_mm: dto.avance_mm ?? undefined,
      columnas: dto.columnas ?? undefined,
      repeticiones: dto.repeticiones ?? undefined,
      estandar: dto.estandar ?? undefined,
      espesor_mm: dto.espesor_mm ?? undefined,
      numero_clises: dto.numero_clises ?? undefined,
      fecha_ingreso: normalizeOptionalDateInput(dto.fecha_ingreso),
      observaciones: dto.observaciones ?? undefined,
      maquina_texto: dto.maquina_texto ?? undefined,
      ficha_fler: dto.ficha_fler ?? undefined,
      metros_acumulados: dto.metros_acumulados ?? undefined,
      colores_json: dto.colores_json?.length
        ? (dto.colores_json as Prisma.InputJsonValue)
        : undefined,
      raw_payload: Object.keys(dto.raw_payload || {}).length
        ? (dto.raw_payload as Prisma.InputJsonValue)
        : undefined,
    };
  }

  private buildImportException(dto: NormalizedCliseInput, error: unknown) {
    const baseMessage = `No se pudo importar el clisé ${dto.item_code || '(sin código)'}`;
    const detail = this.describeImportError(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2000':
          return new BadRequestException(
            `${baseMessage}: uno de los campos excede el tamaño permitido. ${detail}`,
          );
        case 'P2002':
          return new ConflictException(
            `${baseMessage}: conflicto por valor único duplicado. ${detail}`,
          );
        case 'P2003':
          return new BadRequestException(
            `${baseMessage}: referencia relacionada inválida. ${detail}`,
          );
        case 'P2020':
          return new BadRequestException(
            `${baseMessage}: uno de los valores numéricos está fuera de rango. ${detail}`,
          );
        default:
          return new BadRequestException(`${baseMessage}: ${detail}`);
      }
    }

    return new InternalServerErrorException(`${baseMessage}: ${detail}`);
  }

  private describeImportError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const meta = error.meta ? ` meta=${JSON.stringify(error.meta)}` : '';
      return `${error.code}: ${error.message}${meta}`;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  private normalizeCliseInput(
    dto: Partial<CreateCliseDto | UpdateCliseDto | BulkUpsertCliseItemDto>,
  ): NormalizedCliseInput {
    return {
      item_code: this.trimToLength(dto.item_code, 100),
      ubicacion: this.trimToLength(dto.ubicacion, 100),
      descripcion: this.trimLongText(dto.descripcion),
      cliente: this.trimToLength(dto.cliente, 150),
      z_value: this.trimToLength(dto.z_value, 50),
      ancho_mm: this.toFiniteNumber(dto.ancho_mm),
      avance_mm: this.toFiniteNumber(dto.avance_mm),
      columnas: this.toFiniteInteger(dto.columnas),
      repeticiones: this.toFiniteInteger(dto.repeticiones),
      estandar: this.trimToLength(dto.estandar, 100),
      espesor_mm: this.toFiniteNumber(dto.espesor_mm),
      numero_clises: this.toFiniteInteger(dto.numero_clises),
      fecha_ingreso: dto.fecha_ingreso || undefined,
      observaciones: this.trimLongText(dto.observaciones),
      maquina_texto: this.trimToLength(dto.maquina_texto, 100),
      ficha_fler: this.trimToLength(dto.ficha_fler, 100),
      metros_acumulados: this.toFiniteNumber(dto.metros_acumulados),
      colores_json: Array.isArray(dto.colores_json)
        ? dto.colores_json
            .map((entry) => this.trimToLength(entry, 100))
            .filter(Boolean)
        : undefined,
      raw_payload: this.pickSafeRawPayload(dto.raw_payload),
    };
  }

  private pickSafeRawPayload(payload: unknown): Record<string, unknown> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return {};
    }

    const source = payload as Record<string, unknown>;
    const safePayload: Record<string, unknown> = {};

    if (typeof source.display_item_code === 'string') {
      safePayload.display_item_code = this.trimToLength(
        source.display_item_code,
        100,
      );
    }

    if (typeof source.import_conflict === 'boolean') {
      safePayload.import_conflict = source.import_conflict;
    }

    if (Array.isArray(source.conflict_reasons)) {
      safePayload.conflict_reasons = source.conflict_reasons
        .map((entry) => this.trimToLength(entry, 64))
        .filter(Boolean);
    }

    if (typeof source.medidas === 'string') {
      safePayload.medidas = this.trimToLength(source.medidas, 100);
    }

    if (typeof source.troquel === 'string') {
      safePayload.troquel = this.trimToLength(source.troquel, 100);
    }

    if (typeof source.colores === 'string') {
      safePayload.colores = this.trimToLength(source.colores, 500);
    }

    return safePayload;
  }

  private trimToLength(value: unknown, maxLength: number) {
    return String(value ?? '')
      .trim()
      .slice(0, maxLength);
  }

  private trimLongText(value: unknown) {
    const trimmedValue = String(value ?? '').trim();
    return trimmedValue || '';
  }

  private toFiniteNumber(value: unknown) {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private toFiniteInteger(value: unknown) {
    const parsed = this.toFiniteNumber(value);
    return parsed === undefined ? undefined : Math.trunc(parsed);
  }
}

type NormalizedCliseInput = {
  item_code: string;
  ubicacion: string;
  descripcion: string;
  cliente: string;
  z_value: string;
  ancho_mm?: number;
  avance_mm?: number;
  columnas?: number;
  repeticiones?: number;
  estandar: string;
  espesor_mm?: number;
  numero_clises?: number;
  fecha_ingreso?: string;
  observaciones: string;
  maquina_texto: string;
  ficha_fler: string;
  metros_acumulados?: number;
  colores_json?: string[];
  raw_payload: Record<string, unknown>;
};
