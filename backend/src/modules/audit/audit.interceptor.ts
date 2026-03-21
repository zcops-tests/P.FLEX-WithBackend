import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only audit mutating actions (POST, PUT, PATCH, DELETE)
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const { user, body, url, headers } = request;
    const correlationId = headers['x-correlation-id'];
    const userAgent = headers['user-agent'];
    const ipAddress = request.ip;

    // Entity identification (based on URL part, e.g., /api/v1/users -> User)
    const urlParts = url.split('/');
    const entity = urlParts[urlParts.length - 1] || 'Unknown';

    return next.handle().pipe(
      tap((response) => {
        this.auditService.createLog({
          userId: user?.id,
          sessionId: user?.sessionId,
          userNameSnapshot: user?.username,
          roleCodeSnapshot: user?.role,
          entity,
          entityId: response?.data?.id || body?.id,
          action: method,
          oldValues: null, // Capturing old values might require a database call before the update
          newValues: body,
          ipAddress,
          userAgent,
          correlationId,
        });
      }),
    );
  }
}
