import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface SerializedHttpErrorResponse {
  message?: string | string[];
  error?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const correlationId =
      (request.headers['x-correlation-id'] as string) || request['id'] || 'N/A';
    const normalizedMessage = this.extractMessage(message);
    const details = this.extractDetails(message);

    const errorResponse = {
      success: false,
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        path: request.originalUrl || request.url,
        correlationId,
      },
      error: {
        statusCode: status,
        message: normalizedMessage,
        details,
      },
    };

    if (status >= 500) {
      this.logger.error(
        `[${correlationId}] ${request.method} ${request.originalUrl || request.url} - ${status} - ${JSON.stringify(normalizedMessage)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `[${correlationId}] ${request.method} ${request.originalUrl || request.url} - ${status} - ${JSON.stringify(normalizedMessage)}`,
      );
    }

    response.status(status).json(errorResponse);
  }

  private extractMessage(message: string | object) {
    if (typeof message === 'string') {
      return message;
    }

    const response = message as SerializedHttpErrorResponse;
    return response.message ?? 'Request failed';
  }

  private extractDetails(message: string | object) {
    if (typeof message === 'string') {
      return null;
    }

    const response = message as SerializedHttpErrorResponse;
    return response.error ?? null;
  }
}
