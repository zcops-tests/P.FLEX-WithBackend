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
  private readonly ignoredPaths = [
    '/api/v1/sync',
    '/api/v1/auth/login',
    '/api/v1/auth/logout',
    '/api/v1/auth/logout-all',
    '/api/v1/auth/sessions',
    '/api/v1/users/operator-identification',
    '/api/v1/auth/refresh',
    '/docs',
  ];

  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, user, ip } = request;
    const correlationId = request.headers['x-correlation-id'] || request.id;
    const url = this.normalizeUrl(request.originalUrl || request.url);

    // We only audit mutations (POST, PUT, PATCH, DELETE)
    if (
      !['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ||
      this.shouldSkipAudit(url)
    ) {
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
          user_name_snapshot:
            (user?.username as string) || (user?.name as string),
          role_code_snapshot: user?.role as string,
          entity: this.extractEntityFromUrl(url),
          entity_id: this.extractEntityId(url, request, data),
          action: this.mapMethodToAction(method),
          old_values: undefined,
          new_values: this.toJsonValue(this.extractPayloadForAudit(request, data)),
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

    if (path.startsWith('system-config/contract')) {
      return 'system_config';
    }
    if (path.startsWith('system-config')) {
      return 'system_config';
    }
    if (path.startsWith('production/printing/reports')) {
      return 'print_reports';
    }
    if (path.startsWith('production/diecutting/reports')) {
      return 'diecut_reports';
    }
    if (path.startsWith('production/rewinding/reports')) {
      return 'rewind_reports';
    }
    if (path.startsWith('production/packaging/reports')) {
      return 'packaging_reports';
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
    return firstSegment?.replace(/-/g, '_') || 'system';
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

  private extractPayloadForAudit(request: any, data: unknown) {
    const body = this.toPlainRecord(request?.body);
    if (body && Object.keys(body).length > 0) {
      return body;
    }

    const response = this.unwrapResponseData(data);
    const responseRecord = this.toPlainRecord(response);
    if (responseRecord && Object.keys(responseRecord).length > 0) {
      return responseRecord;
    }

    return response;
  }

  private extractEntityId(url: string, request: any, data: unknown): string | null {
    const path = url.replace(/^\/api\/v\d+\//, '');
    if (path.startsWith('system-config')) {
      return 'GLOBAL';
    }

    const response = this.unwrapResponseData(data);
    const responseRecord = this.toPlainRecord(response);
    const body = this.toPlainRecord(request?.body);
    const params = this.toPlainRecord(request?.params);

    const candidates = [
      params?.id,
      params?.userId,
      params?.areaId,
      params?.sessionId,
      body?.id,
      body?.user_id,
      body?.userId,
      body?.entity_id,
      body?.entityId,
      responseRecord?.id,
      responseRecord?.user_id,
      responseRecord?.userId,
      this.findNestedId(responseRecord),
      this.findNestedId(body),
    ];

    for (const candidate of candidates) {
      const normalized = this.normalizeCandidateId(candidate);
      if (normalized) {
        return normalized;
      }
    }

    return null;
  }

  private unwrapResponseData(data: unknown): unknown {
    if (
      data &&
      typeof data === 'object' &&
      'success' in (data as Record<string, unknown>) &&
      'data' in (data as Record<string, unknown>)
    ) {
      return (data as Record<string, unknown>).data;
    }

    return data;
  }

  private toPlainRecord(value: unknown): Record<string, any> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, any>;
  }

  private findNestedId(value: Record<string, any> | null): string | null {
    if (!value) {
      return null;
    }

    const directKeys = ['system_config', 'user', 'item', 'record'];
    for (const key of directKeys) {
      const nested = this.toPlainRecord(value[key]);
      const normalized = this.normalizeCandidateId(nested?.id);
      if (normalized) {
        return normalized;
      }
    }

    return null;
  }

  private normalizeCandidateId(value: unknown): string | null {
    const normalized = String(value ?? '').trim();
    if (!normalized || normalized.toLowerCase() === 'unknown') {
      return null;
    }
    return normalized.slice(0, 36);
  }
}
