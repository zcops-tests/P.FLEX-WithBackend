import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateDiecutReportDto,
  DiecutReportStatus,
} from './dto/diecut-report.dto';
import { StockService } from '../../inventory/stock/stock.service';
import { DiecutReportQueryDto } from './dto/diecut-report-query.dto';
import {
  buildPaginatedResult,
  resolvePagination,
} from '../../../common/utils/pagination.util';
import { assertAllowedTransition } from '../../../common/utils/state-transition.util';
import { assertReportLockAvailable } from '../../../common/utils/report-lock.util';
import { toFrontendDiecutReport } from '../../../common/utils/frontend-entity.util';
import { machineSupportsProcess } from '../../../common/utils/production-machine.util';

@Injectable()
export class DiecuttingService {
  constructor(
    private prisma: PrismaService,
    private stock: StockService,
  ) {}

  private readWorkOrderRawValue(
    payload: Record<string, unknown> | null | undefined,
    key: string,
  ) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return '';
    }
    return String(payload[key] ?? '').trim();
  }

  private parseNumericRawValue(
    payload: Record<string, unknown> | null | undefined,
    ...keys: string[]
  ) {
    for (const key of keys) {
      const raw = this.readWorkOrderRawValue(payload, key);
      if (!raw) continue;
      const normalized = raw.replace(',', '.');
      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return undefined;
  }

  private buildAutomaticStockPayload(
    workOrder: any,
    reportId: string,
    producedUnits: number,
  ) {
    const rawPayload =
      workOrder?.raw_payload &&
      typeof workOrder.raw_payload === 'object' &&
      !Array.isArray(workOrder.raw_payload)
        ? (workOrder.raw_payload as Record<string, unknown>)
        : null;

    const caja =
      this.readWorkOrderRawValue(rawPayload, 'CAJA') ||
      this.readWorkOrderRawValue(rawPayload, 'Caja');

    if (!caja) {
      return null;
    }

    const prepicadoHorizontal = this.readWorkOrderRawValue(
      rawPayload,
      'prepicado_h',
    );
    const prepicadoVertical = this.readWorkOrderRawValue(
      rawPayload,
      'prepicado_v',
    );
    const prepicado = [prepicadoHorizontal, prepicadoVertical]
      .filter(Boolean)
      .join(' / ');

    return {
      work_order_id: workOrder?.id,
      ot_number_snapshot: workOrder?.ot_number || undefined,
      client_snapshot: workOrder?.cliente_razon_social || undefined,
      product_snapshot: workOrder?.descripcion || undefined,
      medida:
        this.readWorkOrderRawValue(rawPayload, 'Medida') ||
        workOrder?.descripcion ||
        undefined,
      ancho_mm: workOrder?.ancho_mm ? Number(workOrder.ancho_mm) : undefined,
      avance_mm: workOrder?.avance_mm
        ? Number(workOrder.avance_mm)
        : undefined,
      material: workOrder?.material || undefined,
      columnas: workOrder?.columnas ?? undefined,
      prepicado: prepicado || undefined,
      cantidad_x_rollo: this.parseNumericRawValue(
        rawPayload,
        'cant_etq_xrollohojas',
        'p_cant_rollo_ficha',
      ),
      cantidad_millares: Number((producedUnits / 1000).toFixed(3)),
      etiqueta: workOrder?.descripcion || undefined,
      forma: this.readWorkOrderRawValue(rawPayload, 'forma') || undefined,
      tipo_producto:
        this.readWorkOrderRawValue(rawPayload, 'tipoimpre1') || undefined,
      caja,
      ubicacion: 'PRODUCCION',
      quantity: producedUnits,
      entry_date: new Date().toISOString(),
      notes: `Auto-generated from Die-cutting Report ${reportId}`,
    };
  }

  async createReport(dto: CreateDiecutReportDto, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const effectiveOperatorId = dto.operator_id || actorUserId;

      // 1. Get snapshots
      let woNumber: string | null = null;
      let client: string | null = null;
      let product: string | null = null;

      let workOrder: any = null;
      if (dto.work_order_id) {
        workOrder = await tx.workOrder.findUnique({
          where: { id: dto.work_order_id },
        });
        if (workOrder) {
          woNumber = workOrder.ot_number;
          client = workOrder.cliente_razon_social;
          product = workOrder.descripcion;
        }
      }

      const operator = await tx.user.findUnique({
        where: { id: effectiveOperatorId },
        include: { role: true },
      });

      if (!operator || operator.deleted_at || operator.active === false) {
        throw new NotFoundException(
          `Operator with ID ${effectiveOperatorId} not found`,
        );
      }

      const machine = await tx.machine.findUnique({
        where: { id: dto.machine_id },
        include: { area: true },
      });

      if (!machine || machine.deleted_at || machine.active === false) {
        throw new NotFoundException(
          `Machine with ID ${dto.machine_id} not found`,
        );
      }

      if (!machineSupportsProcess(machine, 'DIECUT')) {
        throw new BadRequestException(
          'La máquina seleccionada no pertenece al área de troquelado.',
        );
      }

      const die = dto.die_id
        ? await tx.die.findUnique({ where: { id: dto.die_id } })
        : dto.die_series
          ? await tx.die.findUnique({ where: { serie: dto.die_series.trim() } })
          : null;

      if (dto.die_id && !die) {
        throw new NotFoundException(`Die with ID ${dto.die_id} not found`);
      }

      if (!dto.die_id && dto.die_series && !die) {
        throw new NotFoundException(
          `Die with serie ${dto.die_series} not found`,
        );
      }

      // 2. Check for time overlaps
      for (const activity of dto.activities) {
        if (!activity.start_time) continue;
        const startTime = activity.start_time;
        const endTime = activity.end_time || '23:59:59';

        const overlaps = await tx.diecutActivity.findFirst({
          where: {
            report: {
              machine_id: dto.machine_id,
              reported_at: new Date(dto.reported_at),
              deleted_at: null,
            },
            OR: [
              { start_time: { lte: startTime }, end_time: { gte: startTime } },
              { start_time: { lte: endTime }, end_time: { gte: endTime } },
              { start_time: { gte: startTime }, end_time: { lte: endTime } },
            ],
          },
        });

        if (overlaps) {
          throw new ConflictException(
            `Activity overlaps with existing record on machine ${dto.machine_id} at ${startTime}`,
          );
        }
      }

      // 3. Create report
      const report = await tx.diecutReport.create({
        data: {
          reported_at: new Date(dto.reported_at),
          work_order_id: dto.work_order_id,
          machine_id: dto.machine_id,
          operator_id: effectiveOperatorId,
          shift_id: dto.shift_id,
          die_id: die?.id || dto.die_id,
          status: DiecutReportStatus.SUBMITTED,
          work_order_number_snapshot: woNumber,
          client_snapshot: client,
          product_snapshot: product,
          operator_name_snapshot: operator?.name || 'Unknown',
          observations: dto.observations,
          frequency: dto.frequency,
          die_status: dto.die_status || 'OK',
          production_status: dto.production_status || 'TOTAL',
          good_units: dto.activities.reduce(
            (acc, a) => acc + (a.quantity || 0),
            0,
          ),
          waste_units: dto.waste_units || 0,
        },
      });

      // 3. Create activities
      if (dto.activities && dto.activities.length > 0) {
        await tx.diecutActivity.createMany({
          data: dto.activities.map((a) => ({
            report_id: report.id,
            activity_type: a.activity_type,
            start_time: a.start_time,
            end_time: a.end_time || '',
            duration_minutes: Math.max(0, a.duration_minutes || 0),
            quantity: a.quantity || 0,
            observations: a.observations,
          })),
        });
      }

      // 4. Automatic Stock Entry (if units produced)
      const totalUnits = Number(report.good_units);
      const automaticStockPayload = this.buildAutomaticStockPayload(
        workOrder,
        report.id,
        totalUnits,
      );

      if (totalUnits > 0 && automaticStockPayload) {
        await this.stock.create(automaticStockPayload);
      }

      const fullReport = await tx.diecutReport.findUnique({
        where: { id: report.id },
        include: {
          activities: true,
          machine: true,
          operator: true,
          shift: true,
          work_order: true,
          die: true,
        },
      });

      return toFrontendDiecutReport(fullReport || report);
    });
  }

  async findAllReports(params: DiecutReportQueryDto) {
    const { machineId, operatorId, status, startDate, endDate } = params;
    const pagination = resolvePagination(params);

    const where: Prisma.DiecutReportWhereInput = { deleted_at: null };
    if (machineId) where.machine_id = machineId;
    if (operatorId) where.operator_id = operatorId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.reported_at = {};
      if (startDate) where.reported_at.gte = new Date(startDate);
      if (endDate) where.reported_at.lte = new Date(endDate);
    }

    const [total, items] = await Promise.all([
      this.prisma.diecutReport.count({ where }),
      this.prisma.diecutReport.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { reported_at: 'desc' },
        include: {
          machine: { select: { name: true, code: true } },
          operator: { select: { name: true } },
          shift: { select: { name: true } },
          work_order: { select: { ot_number: true } },
          die: { select: { serie: true } },
          activities: {
            select: {
              activity_type: true,
              start_time: true,
              end_time: true,
              duration_minutes: true,
              quantity: true,
              observations: true,
            },
          },
        },
      }),
    ]);

    return buildPaginatedResult(
      items.map((item) => toFrontendDiecutReport(item)),
      total,
      pagination,
    );
  }

  async findOneReport(id: string) {
    const report = await this.prisma.diecutReport.findUnique({
      where: { id },
      include: {
        activities: true,
        machine: true,
        operator: true,
        shift: true,
        work_order: true,
        die: true,
      },
    });

    if (!report || report.deleted_at) {
      throw new NotFoundException(`Die-cutting Report with ID ${id} not found`);
    }
    return toFrontendDiecutReport(report);
  }

  async updateStatus(id: string, status: DiecutReportStatus) {
    const report = await this.findOneReport(id);

    const allowed: Record<string, string[]> = {
      [DiecutReportStatus.DRAFT]: [DiecutReportStatus.SUBMITTED],
      [DiecutReportStatus.SUBMITTED]: [
        DiecutReportStatus.APPROVED,
        DiecutReportStatus.DRAFT,
      ],
      [DiecutReportStatus.APPROVED]: [DiecutReportStatus.CORRECTED],
      [DiecutReportStatus.CORRECTED]: [DiecutReportStatus.APPROVED],
    };

    assertAllowedTransition(report.status, status, allowed, 'Transition');

    const updated = await this.prisma.diecutReport.update({
      where: { id },
      data: { status },
      include: {
        activities: true,
        machine: true,
        operator: true,
        shift: true,
        work_order: true,
        die: true,
      },
    });

    return toFrontendDiecutReport(updated);
  }

  async lockReport(id: string, userId: string) {
    const report = await this.findOneReport(id);
    assertReportLockAvailable(
      report.locked_by_user_id,
      report.locked_at,
      userId,
    );

    const updated = await this.prisma.diecutReport.update({
      where: { id },
      data: {
        locked_by_user_id: userId,
        locked_at: new Date(),
      },
      include: {
        activities: true,
        machine: true,
        operator: true,
        shift: true,
        work_order: true,
        die: true,
      },
    });

    return toFrontendDiecutReport(updated);
  }

  async unlockReport(id: string) {
    const updated = await this.prisma.diecutReport.update({
      where: { id },
      data: {
        locked_by_user_id: null,
        locked_at: null,
      },
      include: {
        activities: true,
        machine: true,
        operator: true,
        shift: true,
        work_order: true,
        die: true,
      },
    });

    return toFrontendDiecutReport(updated);
  }
}
