import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateWorkOrderDto,
  WorkOrderManagementExitAction,
  WorkOrderStatus,
} from './dto/work-order.dto';
import { WorkOrderQueryDto } from './dto/work-order-query.dto';
import {
  buildPaginatedResult,
  resolvePagination,
} from '../../common/utils/pagination.util';
import { toFrontendWorkOrder } from '../../common/utils/frontend-entity.util';
import { normalizeOptionalDateInput } from '../../common/utils/date-input.util';

const WORK_ORDER_BULK_CHUNK_SIZE = 200;
const MANAGEMENT_SNAPSHOT_KEY = '__management_snapshot';

type NormalizedWorkOrderInput = CreateWorkOrderDto & { ot_number: string };
type RawPayloadRecord = Record<string, unknown>;

@Injectable()
export class WorkOrdersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkOrderDto) {
    const normalizedDto = this.normalizeInput(dto);
    const existing = await this.prisma.workOrder.findUnique({
      where: { ot_number: normalizedDto.ot_number },
    });
    if (existing) {
      throw new ConflictException(
        `Work Order ${normalizedDto.ot_number} already exists`,
      );
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

    for (
      let index = 0;
      index < uniqueItems.length;
      index += WORK_ORDER_BULK_CHUNK_SIZE
    ) {
      const chunk = uniqueItems.slice(
        index,
        index + WORK_ORDER_BULK_CHUNK_SIZE,
      );
      const otNumbers = chunk.map((item) => item.ot_number);
      const existing = await this.prisma.workOrder.findMany({
        where: { ot_number: { in: otNumbers } },
        select: {
          id: true,
          ot_number: true,
          status: true,
          fecha_ingreso_planta: true,
          fecha_programada_produccion: true,
          maquina_texto: true,
          raw_payload: true,
          management_entries: {
            where: { exited_at: null },
            select: { id: true },
            take: 1,
          },
        },
      });
      const existingSet = new Set(existing.map((item) => item.ot_number));
      const existingMap = new Map(existing.map((item) => [item.ot_number, item]));

      created += chunk.filter(
        (item) => !existingSet.has(item.ot_number),
      ).length;
      updated += chunk.filter((item) => existingSet.has(item.ot_number)).length;

      await this.prisma.$transaction(
        chunk.map((item) => {
          const current = existingMap.get(item.ot_number);
          const isActiveInManagement = Boolean(current?.management_entries?.length);
          const updateData = this.buildUpdateData(item);

          if (isActiveInManagement && current) {
            updateData.status = current.status;
            updateData.fecha_ingreso_planta = current.fecha_ingreso_planta;
            updateData.fecha_programada_produccion = current.fecha_programada_produccion;
            updateData.maquina_texto = current.maquina_texto;
            updateData.raw_payload = this.buildBulkUpsertRawPayload(
              current.raw_payload,
              item.raw_payload,
            );
          }

          return this.prisma.workOrder.upsert({
            where: { ot_number: item.ot_number },
            create: this.buildCreateData(item),
            update: updateData,
          });
        }),
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

    return buildPaginatedResult(
      items.map((item) => toFrontendWorkOrder(item)),
      total,
      pagination,
    );
  }

  async findManagement() {
    const entries = await this.prisma.workOrderManagementEntry.findMany({
      where: {
        exited_at: null,
        work_order: {
          is: {
            deleted_at: null,
          },
        },
      },
      orderBy: { entered_at: 'desc' },
      include: {
        work_order: true,
      },
    });

    return entries.map((entry) =>
      this.applyManagementSnapshot(toFrontendWorkOrder(entry.work_order)),
    );
  }

  async findOne(id: string) {
    const wo = await this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        print_reports: true,
        diecut_reports: true,
        rewind_reports: true,
        packaging_reports: true,
      },
    });

    if (!wo || wo.deleted_at) {
      throw new NotFoundException(`Work Order with ID ${id} not found`);
    }
    return toFrontendWorkOrder(wo);
  }

  async update(
    id: string,
    data: Partial<CreateWorkOrderDto> & {
      row_version?: bigint | number | string;
    },
  ) {
    const wo = await this.requireWorkOrderRecord(id);

    if (
      data.row_version !== undefined &&
      BigInt(data.row_version) !== wo.row_version
    ) {
      throw new ConflictException(
        'Concurrency conflict: The record has been modified by another user',
      );
    }

    const isActiveInManagement = await this.hasActiveManagementEntry(id);
    const updateData = this.buildUpdateData(data);

    if (isActiveInManagement) {
      updateData.raw_payload = this.buildManagedRawPayload(
        wo.raw_payload,
        data.raw_payload,
      );
    }

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: {
        ...updateData,
        row_version: { increment: 1 },
      },
    });

    return toFrontendWorkOrder(updated);
  }

  async updateStatus(id: string, status: WorkOrderStatus) {
    const workOrder = await this.requireWorkOrderRecord(id);
    const isActiveInManagement = await this.hasActiveManagementEntry(id);
    const nextRawPayload = this.mergeRawPayload(workOrder.raw_payload, {
      Estado_pedido: this.toFrontendStatus(status),
    });
    const managedRawPayload = isActiveInManagement
      ? this.upsertManagementSnapshot(nextRawPayload)
      : nextRawPayload;

    if (workOrder.status === status) {
      const current = toFrontendWorkOrder({
        ...workOrder,
        raw_payload: managedRawPayload,
      });
      return isActiveInManagement
        ? this.applyManagementSnapshot(current)
        : current;
    }

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: {
        status,
        raw_payload: managedRawPayload,
        row_version: { increment: 1 },
      },
    });

    return toFrontendWorkOrder(updated);
  }

  async enterManagement(id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const workOrder = await tx.workOrder.findUnique({
        where: { id },
      });

      if (!workOrder || workOrder.deleted_at) {
        throw new NotFoundException(`Work Order with ID ${id} not found`);
      }

      const activeEntry = await tx.workOrderManagementEntry.findFirst({
        where: {
          work_order_id: id,
          exited_at: null,
        },
      });

      if (activeEntry) {
        throw new ConflictException(
          `Work Order ${workOrder.ot_number} is already in management`,
        );
      }

      const today = new Date();
      const effectivePlantEntryDate = workOrder.fecha_ingreso_planta ?? today;
      const effectivePlantEntryDateText = this.toDateString(
        effectivePlantEntryDate,
      );
      const nextStatus =
        workOrder.status === WorkOrderStatus.IMPORTED
          ? WorkOrderStatus.PLANNED
          : workOrder.status;

      const rawPayload = this.toRawPayloadRecord(workOrder.raw_payload);
      const nextRawPayload = this.upsertManagementSnapshot(
        this.mergeRawPayload(workOrder.raw_payload, {
          'FECHA INGRESO PLANTA': effectivePlantEntryDateText,
          Estado_pedido: this.toFrontendStatus(nextStatus),
        }),
      );
      const needsUpdate =
        !workOrder.fecha_ingreso_planta ||
        workOrder.status !== nextStatus ||
        String(rawPayload['FECHA INGRESO PLANTA'] ?? '') !==
          effectivePlantEntryDateText ||
        String(rawPayload.Estado_pedido ?? '') !==
          this.toFrontendStatus(nextStatus) ||
        !Object.keys(this.extractManagementSnapshot(rawPayload)).length;

      const updatedWorkOrder = needsUpdate
        ? await tx.workOrder.update({
            where: { id },
            data: {
              fecha_ingreso_planta: effectivePlantEntryDate,
              status: nextStatus,
              raw_payload: nextRawPayload,
              row_version: { increment: 1 },
            },
          })
        : workOrder;

      await tx.workOrderManagementEntry.create({
        data: {
          work_order_id: id,
          entered_by_user_id: userId,
        },
      });

      return toFrontendWorkOrder(updatedWorkOrder);
    });
  }

  async exitManagement(
    id: string,
    exitAction: WorkOrderManagementExitAction,
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const activeEntry = await tx.workOrderManagementEntry.findFirst({
        where: {
          work_order_id: id,
          exited_at: null,
        },
        include: {
          work_order: true,
        },
      });

      if (!activeEntry || activeEntry.work_order.deleted_at) {
        throw new NotFoundException(
          `Work Order with ID ${id} is not currently in management`,
        );
      }

      let updatedWorkOrder = activeEntry.work_order;

      if (exitAction === WorkOrderManagementExitAction.REVERT_TO_IMPORTED) {
        if (activeEntry.work_order.status !== WorkOrderStatus.PLANNED) {
          throw new ConflictException(
            'Only work orders still in PLANNED status can be reverted to IMPORTED',
          );
        }

        updatedWorkOrder = await tx.workOrder.update({
          where: { id },
          data: {
            status: WorkOrderStatus.IMPORTED,
            fecha_ingreso_planta: null,
            raw_payload: this.mergeRawPayload(
              activeEntry.work_order.raw_payload,
              {
                'FECHA INGRESO PLANTA': '',
                Estado_pedido: this.toFrontendStatus(WorkOrderStatus.IMPORTED),
              },
            ),
            row_version: { increment: 1 },
          },
        });
      } else if (
        exitAction === WorkOrderManagementExitAction.CLEAR_PLANT_ENTRY
      ) {
        updatedWorkOrder = await tx.workOrder.update({
          where: { id },
          data: {
            fecha_ingreso_planta: null,
            raw_payload: this.mergeRawPayload(
              activeEntry.work_order.raw_payload,
              {
                'FECHA INGRESO PLANTA': '',
              },
            ),
            row_version: { increment: 1 },
          },
        });
      }

      await tx.workOrderManagementEntry.update({
        where: { id: activeEntry.id },
        data: {
          exited_at: new Date(),
          exited_by_user_id: userId,
          exit_action: exitAction,
        },
      });

      return toFrontendWorkOrder(updatedWorkOrder);
    });
  }

  async remove(id: string) {
    const wo = await this.findOne(id);

    if (
      wo.print_reports.length > 0 ||
      wo.diecut_reports.length > 0 ||
      wo.rewind_reports.length > 0 ||
      wo.packaging_reports.length > 0
    ) {
      throw new ConflictException(
        `Cannot delete Work Order with ID ${id} because it has associated production reports`,
      );
    }

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        status: WorkOrderStatus.CANCELLED,
        raw_payload: this.mergeRawPayload(wo.raw_payload, {
          Estado_pedido: this.toFrontendStatus(WorkOrderStatus.CANCELLED),
        }),
        row_version: { increment: 1 },
      },
    });

    return toFrontendWorkOrder(updated);
  }

  private async requireWorkOrderRecord(id: string) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id },
    });

    if (!workOrder || workOrder.deleted_at) {
      throw new NotFoundException(`Work Order with ID ${id} not found`);
    }

    return workOrder;
  }

  private buildCreateData(
    dto: Partial<CreateWorkOrderDto>,
  ): Prisma.WorkOrderCreateInput {
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
      raw_payload: dto.raw_payload
        ? (dto.raw_payload as Prisma.InputJsonValue)
        : undefined,
    };
  }

  private buildUpdateData(
    dto: Partial<CreateWorkOrderDto>,
  ): Prisma.WorkOrderUpdateInput {
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
      raw_payload: dto.raw_payload
        ? (dto.raw_payload as Prisma.InputJsonValue)
        : undefined,
      deleted_at: null,
    };
  }

  private toDate(value?: string) {
    return normalizeOptionalDateInput(value);
  }

  private normalizeInput(
    dto: Partial<CreateWorkOrderDto>,
  ): NormalizedWorkOrderInput {
    const rawPayload =
      dto.raw_payload &&
      typeof dto.raw_payload === 'object' &&
      !Array.isArray(dto.raw_payload)
        ? { ...dto.raw_payload }
        : {};

    return {
      ...(dto as CreateWorkOrderDto),
      ot_number: String(dto.ot_number || '')
        .trim()
        .toUpperCase(),
      raw_payload: rawPayload,
    };
  }

  private toFrontendStatus(status: string) {
    const normalized = String(status || '').toUpperCase();
    if (normalized === WorkOrderStatus.IN_PRODUCTION) return 'EN PROCESO';
    if (normalized === WorkOrderStatus.COMPLETED) return 'FINALIZADO';
    if (
      normalized === WorkOrderStatus.PARTIAL ||
      normalized === WorkOrderStatus.CANCELLED
    )
      return 'PAUSADA';
    return 'PENDIENTE';
  }

  private toRawPayloadRecord(rawPayload: unknown): RawPayloadRecord {
    if (
      !rawPayload ||
      typeof rawPayload !== 'object' ||
      Array.isArray(rawPayload)
    ) {
      return {};
    }

    return { ...(rawPayload as RawPayloadRecord) };
  }

  private mergeRawPayload(
    rawPayload: unknown,
    updates: Record<string, unknown>,
  ) {
    const merged = this.toRawPayloadRecord(rawPayload);

    Object.entries(updates).forEach(([key, value]) => {
      merged[key] = value ?? '';
    });

    return merged as Prisma.InputJsonValue;
  }

  private extractManagementSnapshot(rawPayload: unknown): RawPayloadRecord {
    const normalized = this.toRawPayloadRecord(rawPayload);
    const snapshot = normalized[MANAGEMENT_SNAPSHOT_KEY];

    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      return {};
    }

    return { ...(snapshot as RawPayloadRecord) };
  }

  private upsertManagementSnapshot(rawPayload: unknown) {
    const normalized = this.toRawPayloadRecord(rawPayload);
    const snapshot = { ...normalized };
    delete snapshot[MANAGEMENT_SNAPSHOT_KEY];

    if (Object.keys(snapshot).length > 0) {
      normalized[MANAGEMENT_SNAPSHOT_KEY] = snapshot;
    }

    return normalized as Prisma.InputJsonValue;
  }

  private buildManagedRawPayload(
    currentRawPayload: unknown,
    incomingRawPayload?: Record<string, unknown>,
  ) {
    const merged =
      incomingRawPayload &&
      typeof incomingRawPayload === 'object' &&
      !Array.isArray(incomingRawPayload)
        ? this.mergeRawPayload(currentRawPayload, incomingRawPayload)
        : this.toRawPayloadRecord(currentRawPayload);

    return this.upsertManagementSnapshot(merged);
  }

  private buildBulkUpsertRawPayload(
    currentRawPayload: unknown,
    incomingRawPayload: unknown,
  ) {
    const merged = this.toRawPayloadRecord(currentRawPayload);
    const incoming = this.toRawPayloadRecord(incomingRawPayload);
    delete incoming[MANAGEMENT_SNAPSHOT_KEY];

    Object.entries(incoming).forEach(([key, value]) => {
      merged[key] = value;
    });

    const existingSnapshot = this.extractManagementSnapshot(currentRawPayload);
    const snapshot =
      Object.keys(existingSnapshot).length > 0
        ? existingSnapshot
        : this.toRawPayloadRecord(currentRawPayload);

    delete snapshot[MANAGEMENT_SNAPSHOT_KEY];
    merged[MANAGEMENT_SNAPSHOT_KEY] = snapshot;
    return merged as Prisma.InputJsonValue;
  }

  private applyManagementSnapshot(workOrder: any) {
    const snapshot = this.extractManagementSnapshot(workOrder?.raw_payload);
    if (!Object.keys(snapshot).length) {
      return workOrder;
    }

    const rawPayload = {
      ...this.toRawPayloadRecord(workOrder?.raw_payload),
      ...snapshot,
    };

    return {
      ...workOrder,
      raw_payload: rawPayload,
      ...snapshot,
    };
  }

  private async hasActiveManagementEntry(id: string) {
    const activeEntry = await this.prisma.workOrderManagementEntry.findFirst({
      where: {
        work_order_id: id,
        exited_at: null,
      },
      select: { id: true },
    });

    return Boolean(activeEntry);
  }

  private toDateString(value: Date | string) {
    return new Date(value).toISOString().slice(0, 10);
  }
}
