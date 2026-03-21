import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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
        // If the result already follows the standard structure (e.g. from a custom logic), return it as is
        if (res && typeof res === 'object' && 'success' in res && 'data' in res) {
          return res;
        }

        // Default structure for successful responses
        return {
          success: true,
          data: res,
          meta: res?.meta || {},
          error: null,
        };
      }),
    );
  }
}
