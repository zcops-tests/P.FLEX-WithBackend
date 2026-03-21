import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

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
      this.logger.error(`Failed to create audit log for ${data.entity}/${data.action}`, error.stack);
      // We don't throw here to avoid breaking the main request if auditing fails
    }
  }
}
