import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { sanitizeForJson } from '../utils/serialization.util';

export interface Response<T> {
  success: boolean;
  data: T;
  meta?: any;
  error?: any;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((res) => {
        const sanitized = sanitizeForJson(res);

        // If the result already follows the standard structure (e.g. from a custom logic), return it as is
        if (
          sanitized &&
          typeof sanitized === 'object' &&
          'success' in sanitized &&
          'data' in sanitized
        ) {
          return sanitized;
        }

        // Default structure for successful responses
        return {
          success: true,
          data: sanitized,
          meta:
            sanitized && typeof sanitized === 'object' && 'meta' in sanitized
              ? sanitized.meta
              : {},
          error: null,
        };
      }),
    );
  }
}
