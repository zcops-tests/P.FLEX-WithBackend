import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateIncidentDto,
  IncidentStatus,
  CreateCapaActionDto,
} from './dto/incident.dto';
import { IncidentsQueryDto } from './dto/incidents-query.dto';
import {
  buildPaginatedResult,
  resolvePagination,
} from '../../common/utils/pagination.util';
import { assertAllowedTransition } from '../../common/utils/state-transition.util';
import {
  toFrontendCapaAction,
  toFrontendIncident,
} from '../../common/utils/frontend-entity.util';

@Injectable()
export class QualityService {
  constructor(private prisma: PrismaService) {}

  async createIncident(dto: CreateIncidentDto, userId: string) {
    const incident = await this.prisma.incident.create({
      data: {
        ...dto,
        status: IncidentStatus.OPEN,
        reported_by_user_id: userId,
      },
      include: {
        reportedBy: { select: { name: true } },
        assignedTo: { select: { name: true } },
        capaActions: {
          include: { responsible: true },
        },
        work_order: true,
        machine: true,
      },
    });

    return toFrontendIncident(incident);
  }

  async findAllIncidents(params: IncidentsQueryDto) {
    const { status, priority, q } = params;
    const pagination = resolvePagination(params);

    const where: Prisma.IncidentWhereInput = {
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
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { reported_at: 'desc' },
        include: {
          reportedBy: { select: { name: true } },
          assignedTo: { select: { name: true } },
          capaActions: {
            include: { responsible: true },
          },
          work_order: true,
          machine: true,
        },
      }),
    ]);

    return buildPaginatedResult(
      items.map((item) => toFrontendIncident(item)),
      total,
      pagination,
    );
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
    return toFrontendIncident(incident);
  }

  async updateIncidentStatus(
    id: string,
    status: IncidentStatus,
    rootCause?: string,
  ) {
    const incident = await this.findOneIncident(id);

    // Basic state machine validation
    const allowedTransitions: Record<string, string[]> = {
      [IncidentStatus.OPEN]: [IncidentStatus.ANALYSIS, IncidentStatus.CLOSED],
      [IncidentStatus.ANALYSIS]: [
        IncidentStatus.CORRECTIVE_ACTION,
        IncidentStatus.CLOSED,
      ],
      [IncidentStatus.CORRECTIVE_ACTION]: [IncidentStatus.CLOSED],
      [IncidentStatus.CLOSED]: [IncidentStatus.OPEN], // Allow re-opening
    };

    assertAllowedTransition(
      incident.status,
      status,
      allowedTransitions,
      'Transition',
    );

    const updated = await this.prisma.incident.update({
      where: { id },
      data: {
        status,
        root_cause: rootCause || incident.root_cause,
      },
      include: {
        reportedBy: { select: { name: true } },
        assignedTo: { select: { name: true } },
        capaActions: {
          include: { responsible: true },
        },
        work_order: true,
        machine: true,
      },
    });

    return toFrontendIncident(updated);
  }

  async updateIncidentRootCause(id: string, rootCause?: string) {
    await this.findOneIncident(id);

    const updated = await this.prisma.incident.update({
      where: { id },
      data: {
        root_cause: rootCause || null,
      },
      include: {
        reportedBy: { select: { name: true } },
        assignedTo: { select: { name: true } },
        capaActions: {
          include: { responsible: true },
        },
        work_order: true,
        machine: true,
      },
    });

    return toFrontendIncident(updated);
  }

  async addCapaAction(incidentId: string, dto: CreateCapaActionDto) {
    await this.findOneIncident(incidentId);
    const action = await this.prisma.capaAction.create({
      data: {
        ...dto,
        incident_id: incidentId,
      },
      include: {
        responsible: true,
      },
    });

    return toFrontendCapaAction(action);
  }

  async completeCapaAction(actionId: string) {
    const existingAction = await this.prisma.capaAction.findUnique({
      where: { id: actionId },
    });
    if (!existingAction || existingAction.deleted_at) {
      throw new NotFoundException(`CAPA Action with ID ${actionId} not found`);
    }

    const action = await this.prisma.capaAction.update({
      where: { id: actionId },
      data: {
        completed: true,
        completed_at: new Date(),
      },
      include: {
        responsible: true,
      },
    });

    return toFrontendCapaAction(action);
  }
}
