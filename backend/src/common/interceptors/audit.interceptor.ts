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
import { sanitizeForJson } from '../utils/serialization.util';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);
  private readonly ignoredPaths = ['/api/v1/sync', '/api/v1/auth/refresh', '/docs'];

  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, user, ip } = request;
    const correlationId = request.headers['x-correlation-id'] || request.id;
    const url = this.normalizeUrl(request.originalUrl || request.url);

    // We only audit mutations (POST, PUT, PATCH, DELETE)
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) || this.shouldSkipAudit(url)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((data) => {
        void this.recordAudit({
          data,
          request,
          method,
          url,
          ip,
          correlationId: correlationId as string | undefined,
          user,
        });
      }),
    );
  }

  private async recordAudit(params: {
    data: any;
    request: any;
    method: string;
    url: string;
    ip: string;
    correlationId?: string;
    user?: Record<string, unknown>;
  }) {
    const { data, request, method, url, ip, correlationId, user } = params;

    try {
      await this.prisma.auditLog.create({
        data: {
          user_id: (user?.sub as string) || (user?.id as string),
          user_name_snapshot: (user?.username as string) || (user?.name as string),
          role_code_snapshot: user?.role as string,
          entity: this.extractEntityFromUrl(url),
          entity_id: data?.id || request.params?.id || 'unknown',
          action: this.mapMethodToAction(method),
          old_values: undefined,
          new_values: this.toJsonValue(data),
          ip_address: ip,
          user_agent: request.headers['user-agent'],
          correlation_id: correlationId,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to record audit log: ${error.message}`);
    }
  }

  private normalizeUrl(url: string) {
    return url.split('?')[0];
  }

  private shouldSkipAudit(url: string) {
    return this.ignoredPaths.some((path) => url.startsWith(path));
  }

  private extractEntityFromUrl(url: string): string {
    const path = url.replace(/^\/api\/v\d+\//, '');

    if (path.startsWith('production/printing/reports')) {
      return 'print_reports';
    }
    if (path.startsWith('production/diecutting/reports')) {
      return 'diecut_reports';
    }
    if (path.startsWith('quality/incidents')) {
      return 'incidents';
    }
    if (path.startsWith('quality/capa-actions')) {
      return 'capa_actions';
    }
    if (path.startsWith('inventory/stock')) {
      return 'stock_items';
    }
    if (path.startsWith('inventory/clises')) {
      return 'clises';
    }
    if (path.startsWith('inventory/dies')) {
      return 'dies';
    }

    const [firstSegment] = path.split('/');
    return firstSegment?.replace(/-/g, '_') || 'unknown';
  }

  private mapMethodToAction(method: string): string {
    const mapping: Record<string, string> = {
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };
    return mapping[method] || 'UNKNOWN';
  }

  private toJsonValue(data: unknown) {
    if (data === undefined) {
      return undefined;
    }

    return JSON.parse(JSON.stringify(sanitizeForJson(data)));
  }
}
