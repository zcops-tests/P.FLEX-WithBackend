import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreatePrintReportDto, PrintReportStatus, UpdatePrintReportDto } from './dto/print-report.dto';

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

      return report;
    });
  }

  async findAllReports(params: {
    machineId?: string;
    operatorId?: string;
    status?: PrintReportStatus;
    page?: number;
    pageSize?: number;
  }) {
    const { machineId, operatorId, status, page = 1, pageSize = 20 } = params;
    const skip = (page - 1) * pageSize;

    const where: any = { deleted_at: null };
    if (machineId) where.machine_id = machineId;
    if (operatorId) where.operator_id = operatorId;
    if (status) where.status = status;

    const [total, items] = await Promise.all([
      this.prisma.printReport.count({ where }),
      this.prisma.printReport.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { reported_at: 'desc' },
        include: {
          machine: { select: { name: true, code: true } },
          operator: { select: { name: true } },
          work_order: { select: { ot_number: true } },
        },
      }),
    ]);

    return { items, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
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
    return report;
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

    if (!allowed[report.status as string]?.includes(status)) {
      throw new ConflictException(`Invalid status transition from ${report.status} to ${status}`);
    }

    return this.prisma.printReport.update({
      where: { id },
      data: { status },
    });
  }

  async lockReport(id: string, userId: string) {
    const report = await this.findOneReport(id);
    if (report.locked_by_user_id && report.locked_by_user_id !== userId) {
      // Check if lock is old (e.g. > 15 mins)
      const lockTime = report.locked_at ? new Date(report.locked_at).getTime() : 0;
      const now = Date.now();
      if (now - lockTime < 15 * 60 * 1000) {
        throw new ConflictException(`Report is locked by another user`);
      }
    }

    return this.prisma.printReport.update({
      where: { id },
      data: {
        locked_by_user_id: userId,
        locked_at: new Date(),
      },
    });
  }

  async unlockReport(id: string) {
    return this.prisma.printReport.update({
      where: { id },
      data: {
        locked_by_user_id: null,
        locked_at: null,
      },
    });
  }
}
