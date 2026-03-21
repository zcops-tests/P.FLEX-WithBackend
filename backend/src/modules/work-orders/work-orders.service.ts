import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateWorkOrderDto, WorkOrderStatus } from './dto/work-order.dto';

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

    return this.prisma.workOrder.create({
      data: {
        ...dto,
        status: WorkOrderStatus.IMPORTED,
      },
    });
  }

  async findAll(params: {
    page?: number;
    pageSize?: number;
    status?: WorkOrderStatus;
    q?: string;
  }) {
    const { page = 1, pageSize = 20, status, q } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {
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
        skip,
        take: pageSize,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
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
    return wo;
  }

  async update(id: string, data: any) {
    const wo = await this.findOne(id);
    
    // Optimistic Locking: if row_version is provided, it must match
    if (data.row_version !== undefined && BigInt(data.row_version) !== wo.row_version) {
      throw new ConflictException('Concurrency conflict: The record has been modified by another user');
    }

    return this.prisma.workOrder.update({
      where: { id },
      data: {
        ...data,
        row_version: { increment: 1 },
      },
    });
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

    if (!allowedTransitions[wo.status as string]?.includes(status)) {
      throw new ConflictException(`Transition from ${wo.status} to ${status} is not allowed`);
    }

    return this.prisma.workOrder.update({
      where: { id },
      data: { status },
    });
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
