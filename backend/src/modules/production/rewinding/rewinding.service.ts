import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  buildPaginatedResult,
  resolvePagination,
} from '../../../common/utils/pagination.util';
import { toFrontendRewindReport } from '../../../common/utils/frontend-entity.util';
import { machineSupportsProcess } from '../../../common/utils/production-machine.util';
import { CreateRewindReportDto } from './dto/rewind-report.dto';
import { RewindReportQueryDto } from './dto/rewind-report-query.dto';

@Injectable()
export class RewindingService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(dto: CreateRewindReportDto, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const effectiveOperatorId = dto.operator_id || actorUserId;

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

      if (!machineSupportsProcess(machine, 'REWIND')) {
        throw new BadRequestException(
          'La máquina seleccionada no pertenece al área de rebobinado.',
        );
      }

      let workOrder: any = null;
      if (dto.work_order_id) {
        workOrder = await tx.workOrder.findUnique({
          where: { id: dto.work_order_id },
        });
      }

      const rollsFinished = Math.max(
        0,
        Math.trunc(Number(dto.rolls_finished || 0)),
      );
      const labelsPerRoll = Math.max(
        0,
        Math.trunc(Number(dto.labels_per_roll || 0)),
      );
      const totalLabels = Number(
        dto.total_labels ?? rollsFinished * labelsPerRoll,
      );
      const totalMeters = Number(
        dto.total_meters ?? workOrder?.total_metros ?? 0,
      );

      const report = await tx.rewindReport.create({
        data: {
          reported_at: new Date(dto.reported_at),
          work_order_id: dto.work_order_id,
          machine_id: dto.machine_id,
          operator_id: effectiveOperatorId,
          shift_id: dto.shift_id,
          status: 'SUBMITTED',
          work_order_number_snapshot: workOrder?.ot_number || null,
          client_snapshot: workOrder?.cliente_razon_social || null,
          product_snapshot: workOrder?.descripcion || null,
          operator_name_snapshot: operator.name,
          rolls_finished: rollsFinished,
          labels_per_roll: labelsPerRoll,
          total_labels: totalLabels,
          total_meters: totalMeters,
          waste_rolls: Math.max(0, Math.trunc(Number(dto.waste_rolls || 0))),
          quality_check: dto.quality_check !== false,
          observations: dto.observations,
          production_status: dto.production_status || 'PARTIAL',
        },
        include: {
          machine: true,
          operator: true,
          shift: true,
          work_order: true,
        },
      });

      return toFrontendRewindReport(report);
    });
  }

  async findAllReports(params: RewindReportQueryDto) {
    const pagination = resolvePagination(params);
    const where: Prisma.RewindReportWhereInput = { deleted_at: null };

    if (params.machineId) where.machine_id = params.machineId;
    if (params.operatorId) where.operator_id = params.operatorId;
    if (params.startDate || params.endDate) {
      where.reported_at = {};
      if (params.startDate) where.reported_at.gte = new Date(params.startDate);
      if (params.endDate) where.reported_at.lte = new Date(params.endDate);
    }

    const [total, items] = await Promise.all([
      this.prisma.rewindReport.count({ where }),
      this.prisma.rewindReport.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { reported_at: 'desc' },
        include: {
          machine: { select: { name: true, code: true } },
          operator: { select: { name: true } },
          shift: { select: { name: true } },
          work_order: { select: { ot_number: true } },
        },
      }),
    ]);

    return buildPaginatedResult(
      items.map((item) => toFrontendRewindReport(item)),
      total,
      pagination,
    );
  }

  async findOneReport(id: string) {
    const report = await this.prisma.rewindReport.findUnique({
      where: { id },
      include: {
        machine: true,
        operator: true,
        shift: true,
        work_order: true,
      },
    });

    if (!report || report.deleted_at) {
      throw new NotFoundException(`Rewind Report with ID ${id} not found`);
    }

    return toFrontendRewindReport(report);
  }
}
