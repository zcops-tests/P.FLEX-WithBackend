import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  buildPaginatedResult,
  resolvePagination,
} from '../../common/utils/pagination.util';
import { AuditQueryDto } from './dto/audit-query.dto';

export interface AuditLogData {
  userId?: string;
  sessionId?: string;
  userNameSnapshot?: string;
  roleCodeSnapshot?: string;
  entity: string;
  entityId?: string;
  action: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async createLog(data: AuditLogData) {
    try {
      await this.prisma.auditLog.create({
        data: {
          user_id: data.userId,
          session_id: data.sessionId,
          user_name_snapshot: data.userNameSnapshot,
          role_code_snapshot: data.roleCodeSnapshot,
          entity: data.entity,
          entity_id: data.entityId,
          action: data.action,
          old_values: data.oldValues,
          new_values: data.newValues,
          ip_address: data.ipAddress,
          user_agent: data.userAgent,
          correlation_id: data.correlationId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create audit log for ${data.entity}/${data.action}`,
        error.stack,
      );
      // We don't throw here to avoid breaking the main request if auditing fails
    }
  }

  async findLogs(params: AuditQueryDto) {
    const { q, entity, action, user_id } = params;
    const pagination = resolvePagination(params, {
      defaultPageSize: 50,
      maxPageSize: 200,
    });

    const where: Prisma.AuditLogWhereInput = {};

    if (entity) {
      where.entity = { contains: entity };
    }

    if (action) {
      where.action = { contains: action };
    }

    if (user_id) {
      where.user_id = user_id;
    }

    if (q) {
      where.OR = [
        { user_name_snapshot: { contains: q } },
        { role_code_snapshot: { contains: q } },
        { entity: { contains: q } },
        { entity_id: { contains: q } },
        { action: { contains: q } },
        { correlation_id: { contains: q } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    return buildPaginatedResult(
      items.map((item) => ({
        id: item.id.toString(),
        timestamp: item.created_at,
        user: item.user_name_snapshot || 'Sistema',
        role: item.role_code_snapshot || 'N/A',
        module: item.entity,
        entityId: item.entity_id,
        action: item.action,
        details: this.buildDetails(item),
        ip: item.ip_address || 'N/A',
        correlationId: item.correlation_id,
      })),
      total,
      pagination,
    );
  }

  private buildDetails(item: {
    entity_id?: string | null;
    old_values?: Prisma.JsonValue | null;
    new_values?: Prisma.JsonValue | null;
  }) {
    const parts: string[] = [];

    if (item.entity_id) {
      parts.push(`ID: ${item.entity_id}`);
    }

    if (item.new_values && typeof item.new_values === 'object') {
      const keys = Object.keys(
        item.new_values as Record<string, unknown>,
      ).slice(0, 5);
      if (keys.length) {
        parts.push(`Campos: ${keys.join(', ')}`);
      }
    } else if (item.old_values && typeof item.old_values === 'object') {
      const keys = Object.keys(
        item.old_values as Record<string, unknown>,
      ).slice(0, 5);
      if (keys.length) {
        parts.push(`Campos previos: ${keys.join(', ')}`);
      }
    }

    return parts.join(' | ');
  }
}
