import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateIncidentDto, IncidentStatus, CreateCapaActionDto } from './dto/incident.dto';

@Injectable()
export class QualityService {
  constructor(private prisma: PrismaService) {}

  async createIncident(dto: CreateIncidentDto, userId: string) {
    return this.prisma.incident.create({
      data: {
        ...dto,
        status: IncidentStatus.OPEN,
        reported_by_user_id: userId,
      },
    });
  }

  async findAllIncidents(params: {
    status?: IncidentStatus;
    priority?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { status, priority, q, page = 1, pageSize = 20 } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {
      deleted_at: null,
    };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (q) {
      where.OR = [
        { code: { contains: q } },
        { title: { contains: q } },
        { ot_number_snapshot: { contains: q } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.incident.count({ where }),
      this.prisma.incident.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { reported_at: 'desc' },
        include: {
          reportedBy: { select: { name: true } },
          assignedTo: { select: { name: true } },
        },
      }),
    ]);

    return { items, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async findOneIncident(id: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      include: {
        reportedBy: true,
        assignedTo: true,
        capaActions: {
          include: { responsible: true },
        },
        work_order: true,
        machine: true,
      },
    });

    if (!incident || incident.deleted_at) {
      throw new NotFoundException(`Incident with ID ${id} not found`);
    }
    return incident;
  }

  async updateIncidentStatus(id: string, status: IncidentStatus, rootCause?: string) {
    const incident = await this.findOneIncident(id);
    
    // Basic state machine validation
    const allowedTransitions: Record<string, string[]> = {
      [IncidentStatus.OPEN]: [IncidentStatus.ANALYSIS, IncidentStatus.CLOSED],
      [IncidentStatus.ANALYSIS]: [IncidentStatus.CORRECTIVE_ACTION, IncidentStatus.CLOSED],
      [IncidentStatus.CORRECTIVE_ACTION]: [IncidentStatus.CLOSED],
      [IncidentStatus.CLOSED]: [IncidentStatus.OPEN], // Allow re-opening
    };

    if (!allowedTransitions[incident.status as string]?.includes(status)) {
      throw new ConflictException(`Transition from ${incident.status} to ${status} is not allowed`);
    }

    return this.prisma.incident.update({
      where: { id },
      data: { 
        status,
        root_cause: rootCause || incident.root_cause,
      },
    });
  }

  async addCapaAction(incidentId: string, dto: CreateCapaActionDto) {
    await this.findOneIncident(incidentId);
    return this.prisma.capaAction.create({
      data: {
        ...dto,
        incident_id: incidentId,
      },
    });
  }

  async completeCapaAction(actionId: string) {
    const action = await this.prisma.capaAction.findUnique({ where: { id: actionId } });
    if (!action || action.deleted_at) {
      throw new NotFoundException(`CAPA Action with ID ${actionId} not found`);
    }

    return this.prisma.capaAction.update({
      where: { id: actionId },
      data: { 
        completed: true,
        completed_at: new Date(),
      },
    });
  }
}
