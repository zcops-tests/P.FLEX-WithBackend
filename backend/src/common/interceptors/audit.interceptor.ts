import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip } = request;
    const correlationId = request.headers['x-correlation-id'];

    // We only audit mutations (POST, PUT, PATCH, DELETE)
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (data) => {
        try {
          const entity = this.extractEntityFromUrl(url);
          const action = this.mapMethodToAction(method);
          
          // Basic audit log entry
          // In a high-volume system, this should be sent to a queue (BullMQ) 
          // to avoid slowing down the response.
          await this.prisma.auditLog.create({
            data: {
              user_id: user?.sub || user?.id,
              user_name_snapshot: user?.username || user?.name,
              role_code_snapshot: user?.role,
              entity: entity,
              entity_id: data?.id || request.params?.id || 'unknown',
              action: action,
              old_values: undefined, // Would require fetching before mutation
              new_values: data ? JSON.parse(JSON.stringify(data)) : undefined,
              ip_address: ip,
              user_agent: request.headers['user-agent'],
              correlation_id: correlationId as string,
            },
          });
        } catch (error) {
          this.logger.error(`Failed to record audit log: ${error.message}`);
        }
      }),
    );
  }

  private extractEntityFromUrl(url: string): string {
    const parts = url.split('/');
    // Example: /api/v1/work-orders -> work-orders
    return parts[3] || 'unknown';
  }

  private mapMethodToAction(method: string): string {
    const mapping = {
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };
    return mapping[method] || 'UNKNOWN';
  }
}
