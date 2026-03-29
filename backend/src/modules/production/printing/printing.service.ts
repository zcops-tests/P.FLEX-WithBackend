import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreatePrintReportDto,
  PrintDieType,
  PrintReportStatus,
  UpdatePrintReportDto,
} from './dto/print-report.dto';
import { PrintReportQueryDto } from './dto/print-report-query.dto';
import {
  buildPaginatedResult,
  resolvePagination,
} from '../../../common/utils/pagination.util';
import { assertAllowedTransition } from '../../../common/utils/state-transition.util';
import { assertReportLockAvailable } from '../../../common/utils/report-lock.util';
import { toFrontendPrintReport } from '../../../common/utils/frontend-entity.util';
import { machineSupportsProcess } from '../../../common/utils/production-machine.util';

@Injectable()
export class PrintingService {
  constructor(private prisma: PrismaService) {}

  async createReport(dto: CreatePrintReportDto, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const effectiveOperatorId = dto.operator_id || actorUserId;
      const normalizedDieType = this.normalizePrintDieType(dto.die_type);
      const dieSeriesSnapshot = this.normalizeOptionalText(dto.die_series);
      const dieLocationSnapshot = this.normalizeOptionalText(dto.die_location);

      this.assertPrintDiePayload(
        normalizedDieType,
        dieSeriesSnapshot,
        dieLocationSnapshot,
      );

      // 1. Get snapshots if WO exists
      let woNumber: string | null = null;
      let client: string | null = null;
      let product: string | null = null;

      if (dto.work_order_id) {
        const wo = await tx.workOrder.findUnique({
          where: { id: dto.work_order_id },
        });
        if (wo) {
          woNumber = wo.ot_number;
          client = wo.cliente_razon_social;
          product = wo.descripcion;
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

      if (!machineSupportsProcess(machine, 'PRINT')) {
        throw new BadRequestException(
          'La máquina seleccionada no pertenece al área de impresión.',
        );
      }

      const clise = dto.clise_id
        ? await tx.clise.findUnique({ where: { id: dto.clise_id } })
        : dto.clise_item_code
          ? await tx.clise.findUnique({
              where: { item_code: dto.clise_item_code.trim() },
            })
          : null;

      const die = dto.die_id
        ? await tx.die.findUnique({ where: { id: dto.die_id } })
        : dieSeriesSnapshot
          ? await tx.die.findUnique({ where: { serie: dieSeriesSnapshot } })
          : dieLocationSnapshot
            ? await tx.die.findFirst({
                where: {
                  ubicacion: dieLocationSnapshot,
                  deleted_at: null,
                },
              })
            : null;

      if (dto.clise_id && !clise) {
        throw new NotFoundException(`Clise with ID ${dto.clise_id} not found`);
      }

      if (!dto.clise_id && dto.clise_item_code && !clise) {
        throw new NotFoundException(
          `Clise with item code ${dto.clise_item_code} not found`,
        );
      }

      if (dto.die_id && !die) {
        throw new NotFoundException(`Die with ID ${dto.die_id} not found`);
      }

      // 2. Check for time overlaps on the same machine
      for (const activity of dto.activities) {
        if (!activity.start_time) continue;
        const startTime = activity.start_time;
        const endTime = activity.end_time || '23:59:59';

        const overlaps = await tx.printActivity.findFirst({
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

      const runMinutes = dto.activities.reduce((acc, activity) => {
        if (String(activity.activity_type || '').toUpperCase() !== 'RUN')
          return acc;
        return (
          acc +
          this.resolveActivityDuration(
            activity.start_time,
            activity.end_time,
            activity.duration_minutes,
          )
        );
      }, 0);

      const setupMinutes = dto.activities.reduce((acc, activity) => {
        if (String(activity.activity_type || '').toUpperCase() !== 'SETUP')
          return acc;
        return (
          acc +
          this.resolveActivityDuration(
            activity.start_time,
            activity.end_time,
            activity.duration_minutes,
          )
        );
      }, 0);

      // 3. Create the report
      const report = await tx.printReport.create({
        data: {
          reported_at: new Date(dto.reported_at),
          work_order_id: dto.work_order_id,
          machine_id: dto.machine_id,
          operator_id: effectiveOperatorId,
          shift_id: dto.shift_id,
          clise_id: clise?.id || dto.clise_id,
          die_id: die?.id || dto.die_id,
          die_type_snapshot: normalizedDieType,
          die_series_snapshot: dieSeriesSnapshot,
          die_location_snapshot: dieLocationSnapshot,
          status: PrintReportStatus.SUBMITTED,
          work_order_number_snapshot: woNumber,
          client_snapshot: client,
          product_snapshot: product,
          operator_name_snapshot: operator?.name || 'Unknown',
          observations: dto.observations,
          production_status: dto.production_status || 'TOTAL',
          clise_status: dto.clise_status || 'OK',
          die_status: dto.die_status || 'OK',
          // Aggregates
          total_meters: dto.activities.reduce(
            (acc, a) => acc + (a.meters || 0),
            0,
          ),
          waste_meters: 0, // Not in schema for report aggregate currently or moved to activities
          run_minutes: runMinutes,
          setup_minutes: setupMinutes,
        },
      });

      // 3. Create activities
      if (dto.activities && dto.activities.length > 0) {
        await tx.printActivity.createMany({
          data: dto.activities.map((a) => ({
            report_id: report.id,
            activity_type: a.activity_type,
            start_time: a.start_time,
            end_time: a.end_time || '',
            duration_minutes: Math.max(0, a.duration_minutes || 0),
            meters: a.meters || 0,
          })),
        });
      }

      const fullReport = await tx.printReport.findUnique({
        where: { id: report.id },
        include: {
          activities: true,
          machine: true,
          operator: true,
          shift: true,
          work_order: true,
          clise: true,
          die: true,
        },
      });

      return toFrontendPrintReport(fullReport || report);
    });
  }

  async findAllReports(params: PrintReportQueryDto) {
    const { machineId, operatorId, status, startDate, endDate } = params;
    const pagination = resolvePagination(params);

    const where: Prisma.PrintReportWhereInput = { deleted_at: null };
    if (machineId) where.machine_id = machineId;
    if (operatorId) where.operator_id = operatorId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.reported_at = {};
      if (startDate) where.reported_at.gte = new Date(startDate);
      if (endDate) where.reported_at.lte = new Date(endDate);
    }

    const [total, items] = await Promise.all([
      this.prisma.printReport.count({ where }),
      this.prisma.printReport.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { reported_at: 'desc' },
        include: {
          machine: { select: { name: true, code: true } },
          operator: { select: { name: true } },
          shift: { select: { name: true } },
          work_order: { select: { ot_number: true } },
          clise: { select: { item_code: true } },
          die: { select: { serie: true } },
          activities: {
            select: {
              activity_type: true,
              start_time: true,
              end_time: true,
              duration_minutes: true,
              meters: true,
            },
          },
        },
      }),
    ]);

    return buildPaginatedResult(
      items.map((item) => toFrontendPrintReport(item)),
      total,
      pagination,
    );
  }

  async findOneReport(id: string) {
    const report = await this.prisma.printReport.findUnique({
      where: { id },
      include: {
        activities: true,
        machine: true,
        operator: true,
        shift: true,
        work_order: true,
        clise: true,
        die: true,
      },
    });

    if (!report || report.deleted_at) {
      throw new NotFoundException(`Print Report with ID ${id} not found`);
    }
    return toFrontendPrintReport(report);
  }

  async updateStatus(id: string, status: PrintReportStatus) {
    const report = await this.findOneReport(id);

    // State machine: DRAFT -> SUBMITTED -> APPROVED
    // APPROVED can be CORRECTED
    const allowed: Record<string, string[]> = {
      [PrintReportStatus.DRAFT]: [PrintReportStatus.SUBMITTED],
      [PrintReportStatus.SUBMITTED]: [
        PrintReportStatus.APPROVED,
        PrintReportStatus.DRAFT,
      ],
      [PrintReportStatus.APPROVED]: [PrintReportStatus.CORRECTED],
      [PrintReportStatus.CORRECTED]: [PrintReportStatus.APPROVED],
    };

    assertAllowedTransition(report.status, status, allowed, 'Transition');

    const updated = await this.prisma.printReport.update({
      where: { id },
      data: { status },
      include: {
        activities: true,
        machine: true,
        operator: true,
        shift: true,
        work_order: true,
        clise: true,
        die: true,
      },
    });

    return toFrontendPrintReport(updated);
  }

  async lockReport(id: string, userId: string) {
    const report = await this.findOneReport(id);
    assertReportLockAvailable(
      report.locked_by_user_id,
      report.locked_at,
      userId,
    );

    const updated = await this.prisma.printReport.update({
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
        clise: true,
        die: true,
      },
    });

    return toFrontendPrintReport(updated);
  }

  async unlockReport(id: string) {
    const updated = await this.prisma.printReport.update({
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
        clise: true,
        die: true,
      },
    });

    return toFrontendPrintReport(updated);
  }

  private resolveActivityDuration(
    startTime: string,
    endTime?: string,
    providedDuration?: number,
  ) {
    if (
      typeof providedDuration === 'number' &&
      Number.isFinite(providedDuration) &&
      providedDuration >= 0
    ) {
      return Math.trunc(providedDuration);
    }

    if (!startTime || !endTime) {
      return 0;
    }

    const start = this.toMinutes(startTime);
    const end = this.toMinutes(endTime);
    if (start === null || end === null) {
      return 0;
    }

    const diff = end >= start ? end - start : 24 * 60 - start + end;
    return Math.max(0, diff);
  }

  private toMinutes(value: string) {
    const [hour, minute] = String(value || '')
      .split(':')
      .map((part) => Number(part));

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      return null;
    }

    return hour * 60 + minute;
  }

  private normalizeOptionalText(value: string | null | undefined) {
    const normalized = String(value || '').trim();
    return normalized || null;
  }

  private normalizePrintDieType(value: PrintDieType | string | undefined) {
    const normalized = String(value || '').trim().toUpperCase();
    if (!normalized) {
      return null;
    }

    if (normalized.includes('FLAT') || normalized.includes('PLANO')) {
      return PrintDieType.FLATBED;
    }
    if (normalized.includes('MAG') || normalized.includes('IMAN')) {
      return PrintDieType.MAGNETIC;
    }
    if (normalized.includes('SOLID') || normalized.includes('SOLIDO')) {
      return PrintDieType.SOLID;
    }

    throw new BadRequestException('Selecciona un tipo de troquel válido.');
  }

  private assertPrintDiePayload(
    dieType: PrintDieType | null,
    dieSeries: string | null,
    dieLocation: string | null,
  ) {
    if (!dieType) {
      return;
    }

    if (dieType === PrintDieType.MAGNETIC && !dieSeries) {
      throw new BadRequestException(
        'Ingresa la serie del troquel magnético para registrar el reporte.',
      );
    }

    if (
      (dieType === PrintDieType.FLATBED || dieType === PrintDieType.SOLID) &&
      !dieSeries &&
      !dieLocation
    ) {
      throw new BadRequestException(
        'Ingresa la serie o la ubicación del troquel para registrar el reporte.',
      );
    }
  }
}
