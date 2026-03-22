import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreatePrintReportDto, PrintReportStatus, UpdatePrintReportDto } from './dto/print-report.dto';
import { PrintReportQueryDto } from './dto/print-report-query.dto';
import { buildPaginatedResult, resolvePagination } from '../../../common/utils/pagination.util';
import { assertAllowedTransition } from '../../../common/utils/state-transition.util';
import { assertReportLockAvailable } from '../../../common/utils/report-lock.util';
import { toFrontendPrintReport } from '../../../common/utils/frontend-entity.util';

@Injectable()
export class PrintingService {
  constructor(private prisma: PrismaService) {}

  async createReport(dto: CreatePrintReportDto, operatorId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Get snapshots if WO exists
      let woNumber: string | null = null;
      let client: string | null = null;
      let product: string | null = null;

      if (dto.work_order_id) {
        const wo = await tx.workOrder.findUnique({ where: { id: dto.work_order_id } });
        if (wo) {
          woNumber = wo.ot_number;
          client = wo.cliente_razon_social;
          product = wo.descripcion;
        }
      }

      const operator = await tx.user.findUnique({ where: { id: operatorId } });

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
          throw new ConflictException(`Activity overlaps with existing record on machine ${dto.machine_id} at ${startTime}`);
        }
      }

      // 3. Create the report
      const report = await tx.printReport.create({
        data: {
          reported_at: new Date(dto.reported_at),
          work_order_id: dto.work_order_id,
          machine_id: dto.machine_id,
          operator_id: operatorId,
          shift_id: dto.shift_id,
          clise_id: dto.clise_id,
          die_id: dto.die_id,
          status: PrintReportStatus.SUBMITTED,
          work_order_number_snapshot: woNumber,
          client_snapshot: client,
          product_snapshot: product,
          operator_name_snapshot: operator?.name || 'Unknown',
          observations: dto.observations,
          production_status: dto.production_status || 'TOTAL',
          // Aggregates
          total_meters: dto.activities.reduce((acc, a) => acc + (a.meters || 0), 0),
          waste_meters: 0, // Not in schema for report aggregate currently or moved to activities
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
    const { machineId, operatorId, status } = params;
    const pagination = resolvePagination(params);

    const where: Prisma.PrintReportWhereInput = { deleted_at: null };
    if (machineId) where.machine_id = machineId;
    if (operatorId) where.operator_id = operatorId;
    if (status) where.status = status;

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
          work_order: { select: { ot_number: true } },
        },
      }),
    ]);

    return buildPaginatedResult(items.map((item) => toFrontendPrintReport(item)), total, pagination);
  }

  async findOneReport(id: string) {
    const report = await this.prisma.printReport.findUnique({
      where: { id },
      include: {
        activities: true,
        machine: true,
        operator: true,
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
      [PrintReportStatus.SUBMITTED]: [PrintReportStatus.APPROVED, PrintReportStatus.DRAFT],
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
    assertReportLockAvailable(report.locked_by_user_id, report.locked_at, userId);

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
}
