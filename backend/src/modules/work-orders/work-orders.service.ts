import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateWorkOrderDto, WorkOrderStatus } from './dto/work-order.dto';
import { WorkOrderQueryDto } from './dto/work-order-query.dto';
import { buildPaginatedResult, resolvePagination } from '../../common/utils/pagination.util';
import { assertAllowedTransition } from '../../common/utils/state-transition.util';
import { toFrontendWorkOrder } from '../../common/utils/frontend-entity.util';
import { normalizeOptionalDateInput } from '../../common/utils/date-input.util';

const WORK_ORDER_BULK_CHUNK_SIZE = 200;
type NormalizedWorkOrderInput = CreateWorkOrderDto & { ot_number: string };

@Injectable()
export class WorkOrdersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkOrderDto) {
    const normalizedDto = this.normalizeInput(dto);
    const existing = await this.prisma.workOrder.findUnique({
      where: { ot_number: normalizedDto.ot_number },
    });
    if (existing) {
      throw new ConflictException(`Work Order ${normalizedDto.ot_number} already exists`);
    }

    const created = await this.prisma.workOrder.create({
      data: this.buildCreateData(normalizedDto),
    });

    return toFrontendWorkOrder(created);
  }

  async bulkUpsert(items: CreateWorkOrderDto[]) {
    const uniqueItems = Array.from(
      new Map(
        items
          .map((item) => this.normalizeInput(item))
          .filter((item) => item.ot_number)
          .map((item) => [item.ot_number, item]),
      ).values(),
    );

    if (!uniqueItems.length) {
      return { created: 0, updated: 0, total: 0 };
    }

    let created = 0;
    let updated = 0;

    for (let index = 0; index < uniqueItems.length; index += WORK_ORDER_BULK_CHUNK_SIZE) {
      const chunk = uniqueItems.slice(index, index + WORK_ORDER_BULK_CHUNK_SIZE);
      const otNumbers = chunk.map((item) => item.ot_number);
      const existing = await this.prisma.workOrder.findMany({
        where: { ot_number: { in: otNumbers } },
        select: { ot_number: true },
      });
      const existingSet = new Set(existing.map((item) => item.ot_number));

      created += chunk.filter((item) => !existingSet.has(item.ot_number)).length;
      updated += chunk.filter((item) => existingSet.has(item.ot_number)).length;

      await this.prisma.$transaction(
        chunk.map((item) =>
          this.prisma.workOrder.upsert({
            where: { ot_number: item.ot_number },
            create: this.buildCreateData(item),
            update: this.buildUpdateData(item),
          }),
        ),
      );
    }

    return { created, updated, total: uniqueItems.length };
  }

  async findAll(params: WorkOrderQueryDto) {
    const { status, q } = params;
    const pagination = resolvePagination(params);

    const where: Prisma.WorkOrderWhereInput = {
      deleted_at: null,
    };

    if (status) {
      where.status = status;
    }

    if (q) {
      where.OR = [
        { ot_number: { contains: q } },
        { descripcion: { contains: q } },
        { cliente_razon_social: { contains: q } },
        { material: { contains: q } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.workOrder.count({ where }),
      this.prisma.workOrder.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    return buildPaginatedResult(items.map((item) => toFrontendWorkOrder(item)), total, pagination);
  }

  async findOne(id: string) {
    const wo = await this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        print_reports: true,
        diecut_reports: true,
      },
    });

    if (!wo || wo.deleted_at) {
      throw new NotFoundException(`Work Order with ID ${id} not found`);
    }
    return toFrontendWorkOrder(wo);
  }

  async update(id: string, data: Partial<CreateWorkOrderDto> & { row_version?: bigint | number | string }) {
    const wo = await this.findOne(id);

    if (data.row_version !== undefined && BigInt(data.row_version) !== wo.row_version) {
      throw new ConflictException('Concurrency conflict: The record has been modified by another user');
    }

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: {
        ...this.buildUpdateData(data),
        row_version: { increment: 1 },
      },
    });

    return toFrontendWorkOrder(updated);
  }

  async updateStatus(id: string, status: WorkOrderStatus) {
    const wo = await this.findOne(id);

    const allowedTransitions: Record<string, string[]> = {
      [WorkOrderStatus.IMPORTED]: [WorkOrderStatus.PLANNED, WorkOrderStatus.CANCELLED],
      [WorkOrderStatus.PLANNED]: [WorkOrderStatus.IN_PRODUCTION, WorkOrderStatus.CANCELLED],
      [WorkOrderStatus.IN_PRODUCTION]: [WorkOrderStatus.PARTIAL, WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED],
      [WorkOrderStatus.PARTIAL]: [WorkOrderStatus.IN_PRODUCTION, WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED],
      [WorkOrderStatus.COMPLETED]: [],
      [WorkOrderStatus.CANCELLED]: [],
    };

    assertAllowedTransition(wo.status, status, allowedTransitions, 'Transition');

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: { status },
    });

    return toFrontendWorkOrder(updated);
  }

  async remove(id: string) {
    const wo = await this.findOne(id);

    if (wo.print_reports.length > 0 || wo.diecut_reports.length > 0) {
      throw new ConflictException(`Cannot delete Work Order with ID ${id} because it has associated production reports`);
    }

    return this.prisma.workOrder.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        status: WorkOrderStatus.CANCELLED,
      },
    });
  }

  private buildCreateData(dto: Partial<CreateWorkOrderDto>): Prisma.WorkOrderCreateInput {
    return {
      ot_number: String(dto.ot_number || '').trim(),
      status: dto.status || WorkOrderStatus.IMPORTED,
      descripcion: dto.descripcion ?? undefined,
      nro_cotizacion: dto.nro_cotizacion ?? undefined,
      nro_ficha: dto.nro_ficha ?? undefined,
      pedido: dto.pedido ?? undefined,
      orden_compra: dto.orden_compra ?? undefined,
      cliente_razon_social: dto.cliente_razon_social ?? undefined,
      vendedor: dto.vendedor ?? undefined,
      fecha_pedido: this.toDate(dto.fecha_pedido),
      fecha_entrega: this.toDate(dto.fecha_entrega),
      fecha_ingreso_planta: this.toDate(dto.fecha_ingreso_planta),
      fecha_programada_produccion: this.toDate(dto.fecha_programada_produccion),
      cantidad_pedida: dto.cantidad_pedida ?? undefined,
      unidad: dto.unidad ?? undefined,
      material: dto.material ?? undefined,
      ancho_mm: dto.ancho_mm ?? undefined,
      avance_mm: dto.avance_mm ?? undefined,
      desarrollo_mm: dto.desarrollo_mm ?? undefined,
      columnas: dto.columnas ?? undefined,
      adhesivo: dto.adhesivo ?? undefined,
      acabado: dto.acabado ?? undefined,
      troquel: dto.troquel ?? undefined,
      maquina_texto: dto.maquina_texto ?? undefined,
      total_metros: dto.total_metros ?? undefined,
      total_m2: dto.total_m2 ?? undefined,
      observaciones_diseno: dto.observaciones_diseno ?? undefined,
      observaciones_cotizacion: dto.observaciones_cotizacion ?? undefined,
      raw_payload: dto.raw_payload ? (dto.raw_payload as Prisma.InputJsonValue) : undefined,
    };
  }

  private buildUpdateData(dto: Partial<CreateWorkOrderDto>): Prisma.WorkOrderUpdateInput {
    return {
      status: dto.status ?? undefined,
      descripcion: dto.descripcion ?? undefined,
      nro_cotizacion: dto.nro_cotizacion ?? undefined,
      nro_ficha: dto.nro_ficha ?? undefined,
      pedido: dto.pedido ?? undefined,
      orden_compra: dto.orden_compra ?? undefined,
      cliente_razon_social: dto.cliente_razon_social ?? undefined,
      vendedor: dto.vendedor ?? undefined,
      fecha_pedido: this.toDate(dto.fecha_pedido),
      fecha_entrega: this.toDate(dto.fecha_entrega),
      fecha_ingreso_planta: this.toDate(dto.fecha_ingreso_planta),
      fecha_programada_produccion: this.toDate(dto.fecha_programada_produccion),
      cantidad_pedida: dto.cantidad_pedida ?? undefined,
      unidad: dto.unidad ?? undefined,
      material: dto.material ?? undefined,
      ancho_mm: dto.ancho_mm ?? undefined,
      avance_mm: dto.avance_mm ?? undefined,
      desarrollo_mm: dto.desarrollo_mm ?? undefined,
      columnas: dto.columnas ?? undefined,
      adhesivo: dto.adhesivo ?? undefined,
      acabado: dto.acabado ?? undefined,
      troquel: dto.troquel ?? undefined,
      maquina_texto: dto.maquina_texto ?? undefined,
      total_metros: dto.total_metros ?? undefined,
      total_m2: dto.total_m2 ?? undefined,
      observaciones_diseno: dto.observaciones_diseno ?? undefined,
      observaciones_cotizacion: dto.observaciones_cotizacion ?? undefined,
      raw_payload: dto.raw_payload ? (dto.raw_payload as Prisma.InputJsonValue) : undefined,
      deleted_at: null,
    };
  }

  private toDate(value?: string) {
    return normalizeOptionalDateInput(value);
  }

  private normalizeInput(dto: Partial<CreateWorkOrderDto>): NormalizedWorkOrderInput {
    const rawPayload = dto.raw_payload && typeof dto.raw_payload === 'object' && !Array.isArray(dto.raw_payload)
      ? { ...dto.raw_payload }
      : {};

    return {
      ...(dto as CreateWorkOrderDto),
      ot_number: String(dto.ot_number || '').trim().toUpperCase(),
      raw_payload: rawPayload,
    };
  }
}
