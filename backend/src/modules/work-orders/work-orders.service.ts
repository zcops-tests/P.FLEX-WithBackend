import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateWorkOrderDto, WorkOrderStatus } from './dto/work-order.dto';
import { WorkOrderQueryDto } from './dto/work-order-query.dto';
import { buildPaginatedResult, resolvePagination } from '../../common/utils/pagination.util';
import { assertAllowedTransition } from '../../common/utils/state-transition.util';
import { toFrontendWorkOrder } from '../../common/utils/frontend-entity.util';

@Injectable()
export class WorkOrdersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkOrderDto) {
    const existing = await this.prisma.workOrder.findUnique({
      where: { ot_number: dto.ot_number },
    });
    if (existing) {
      throw new ConflictException(`Work Order ${dto.ot_number} already exists`);
    }

    const created = await this.prisma.workOrder.create({
      data: {
        ...dto,
        status: WorkOrderStatus.IMPORTED,
      },
    });

    return toFrontendWorkOrder(created);
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

  async update(id: string, data: any) {
    const wo = await this.findOne(id);
    
    // Optimistic Locking: if row_version is provided, it must match
    if (data.row_version !== undefined && BigInt(data.row_version) !== wo.row_version) {
      throw new ConflictException('Concurrency conflict: The record has been modified by another user');
    }

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: {
        ...data,
        row_version: { increment: 1 },
      },
    });

    return toFrontendWorkOrder(updated);
  }

  async updateStatus(id: string, status: WorkOrderStatus) {
    const wo = await this.findOne(id);
    
    // Basic state machine validation
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
}
