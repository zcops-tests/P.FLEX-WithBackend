import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateDiecutReportDto, DiecutReportStatus } from './dto/diecut-report.dto';
import { StockService } from '../../inventory/stock/stock.service';
import { DiecutReportQueryDto } from './dto/diecut-report-query.dto';
import { buildPaginatedResult, resolvePagination } from '../../../common/utils/pagination.util';
import { assertAllowedTransition } from '../../../common/utils/state-transition.util';
import { assertReportLockAvailable } from '../../../common/utils/report-lock.util';
import { toFrontendDiecutReport } from '../../../common/utils/frontend-entity.util';

@Injectable()
export class DiecuttingService {
  constructor(
    private prisma: PrismaService,
    private stock: StockService,
  ) {}

  async createReport(dto: CreateDiecutReportDto, operatorId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Get snapshots
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
          throw new ConflictException(`Activity overlaps with existing record on machine ${dto.machine_id} at ${startTime}`);
        }
      }

      // 3. Create report
      const report = await tx.diecutReport.create({
        data: {
          reported_at: new Date(dto.reported_at),
          work_order_id: dto.work_order_id,
          machine_id: dto.machine_id,
          operator_id: operatorId,
          shift_id: dto.shift_id,
          die_id: dto.die_id,
          status: DiecutReportStatus.SUBMITTED,
          work_order_number_snapshot: woNumber,
          client_snapshot: client,
          product_snapshot: product,
          operator_name_snapshot: operator?.name || 'Unknown',
          observations: dto.observations,
          die_status: dto.die_status || 'OK',
          production_status: dto.production_status || 'TOTAL',
          good_units: dto.activities.reduce((acc, a) => acc + (a.quantity || 0), 0),
          waste_units: 0,
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
          })),
        });
      }

      // 4. Automatic Stock Entry (if units produced)
      const totalUnits = Number(report.good_units);
      if (totalUnits > 0) {
        await this.stock.create({
          work_order_id: dto.work_order_id,
          ot_number_snapshot: woNumber || undefined,
          client_snapshot: client || undefined,
          product_snapshot: product || undefined,
          quantity: totalUnits,
          entry_date: new Date().toISOString(),
          notes: `Auto-generated from Die-cutting Report ${report.id}`,
        });
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
    const { machineId, operatorId, status } = params;
    const pagination = resolvePagination(params);

    const where: Prisma.DiecutReportWhereInput = { deleted_at: null };
    if (machineId) where.machine_id = machineId;
    if (operatorId) where.operator_id = operatorId;
    if (status) where.status = status;

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
          work_order: { select: { ot_number: true } },
        },
      }),
    ]);

    return buildPaginatedResult(items.map((item) => toFrontendDiecutReport(item)), total, pagination);
  }

  async findOneReport(id: string) {
    const report = await this.prisma.diecutReport.findUnique({
      where: { id },
      include: {
        activities: true,
        machine: true,
        operator: true,
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
      [DiecutReportStatus.SUBMITTED]: [DiecutReportStatus.APPROVED, DiecutReportStatus.DRAFT],
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
    assertReportLockAvailable(report.locked_by_user_id, report.locked_at, userId);

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
