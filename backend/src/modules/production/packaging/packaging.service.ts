import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  buildPaginatedResult,
  resolvePagination,
} from '../../../common/utils/pagination.util';
import { toFrontendPackagingReport } from '../../../common/utils/frontend-entity.util';
import {
  CreatePackagingReportDto,
  UpdatePackagingReportDto,
} from './dto/packaging-report.dto';
import { PackagingReportQueryDto } from './dto/packaging-report-query.dto';

@Injectable()
export class PackagingService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(dto: CreatePackagingReportDto, actorUserId: string) {
    return this.persistReport(dto, actorUserId);
  }

  async updateReport(
    id: string,
    dto: UpdatePackagingReportDto,
    actorUserId: string,
  ) {
    const existing = await this.prisma.packagingReport.findUnique({
      where: { id },
    });
    if (!existing || existing.deleted_at) {
      throw new NotFoundException(`Packaging Report with ID ${id} not found`);
    }

    return this.persistReport(dto, actorUserId, id);
  }

  private async persistReport(
    dto: CreatePackagingReportDto | UpdatePackagingReportDto,
    actorUserId: string,
    reportId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = reportId
        ? await tx.packagingReport.findUnique({
            where: { id: reportId },
            include: { operator: true, shift: true, work_order: true },
          })
        : null;

      if (reportId && (!existing || existing.deleted_at)) {
        throw new NotFoundException(
          `Packaging Report with ID ${reportId} not found`,
        );
      }

      const effectiveOperatorId =
        dto.operator_id || existing?.operator_id || actorUserId;

      const operator = await tx.user.findUnique({
        where: { id: effectiveOperatorId },
        include: { role: true },
      });

      if (!operator || operator.deleted_at || operator.active === false) {
        throw new NotFoundException(
          `Operator with ID ${effectiveOperatorId} not found`,
        );
      }

      const effectiveWorkOrderId =
        dto.work_order_id ?? existing?.work_order_id ?? undefined;
      let workOrder: any = null;
      if (effectiveWorkOrderId) {
        workOrder = await tx.workOrder.findUnique({
          where: { id: effectiveWorkOrderId },
        });
      }

      const reportedAt = dto.reported_at
        ? new Date(dto.reported_at)
        : existing?.reported_at || new Date();

      const payload = {
        reported_at: reportedAt,
        work_order_id: effectiveWorkOrderId,
        operator_id: effectiveOperatorId,
        shift_id: dto.shift_id ?? existing?.shift_id ?? undefined,
        status: 'SUBMITTED',
        lot_status: dto.lot_status || 'COMPLETE',
        work_order_number_snapshot: workOrder?.ot_number || null,
        client_snapshot: workOrder?.cliente_razon_social || null,
        product_snapshot: workOrder?.descripcion || null,
        operator_name_snapshot:
          dto.operator_name ||
          existing?.operator_name_snapshot ||
          operator.name,
        shift_name_snapshot:
          dto.shift_name || existing?.shift_name_snapshot || null,
        rolls: Math.max(0, Math.trunc(Number(dto.rolls || 0))),
        total_meters: Number(dto.total_meters || 0),
        demasia_rolls: Math.max(0, Math.trunc(Number(dto.demasia_rolls || 0))),
        demasia_meters: Number(dto.demasia_meters || 0),
        notes: dto.notes,
      } satisfies Prisma.PackagingReportUncheckedCreateInput;

      const report = reportId
        ? await tx.packagingReport.update({
            where: { id: reportId },
            data: {
              ...payload,
              row_version: { increment: 1 },
            },
            include: {
              operator: true,
              shift: true,
              work_order: true,
            },
          })
        : await tx.packagingReport.create({
            data: payload,
            include: {
              operator: true,
              shift: true,
              work_order: true,
            },
          });

      return toFrontendPackagingReport(report);
    });
  }

  async findAllReports(params: PackagingReportQueryDto) {
    const pagination = resolvePagination(params);
    const where: Prisma.PackagingReportWhereInput = { deleted_at: null };

    if (params.operatorId) where.operator_id = params.operatorId;
    if (params.lotStatus) where.lot_status = params.lotStatus;
    if (params.startDate || params.endDate) {
      where.reported_at = {};
      if (params.startDate) where.reported_at.gte = new Date(params.startDate);
      if (params.endDate) where.reported_at.lte = new Date(params.endDate);
    }

    const [total, items] = await Promise.all([
      this.prisma.packagingReport.count({ where }),
      this.prisma.packagingReport.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { reported_at: 'desc' },
        include: {
          operator: { select: { name: true } },
          shift: { select: { name: true } },
          work_order: { select: { ot_number: true } },
        },
      }),
    ]);

    return buildPaginatedResult(
      items.map((item) => toFrontendPackagingReport(item)),
      total,
      pagination,
    );
  }

  async findOneReport(id: string) {
    const report = await this.prisma.packagingReport.findUnique({
      where: { id },
      include: {
        operator: true,
        shift: true,
        work_order: true,
      },
    });

    if (!report || report.deleted_at) {
      throw new NotFoundException(`Packaging Report with ID ${id} not found`);
    }

    return toFrontendPackagingReport(report);
  }
}
