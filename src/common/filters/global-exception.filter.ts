import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Response as ExpressResponse } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse<ExpressResponse>();

    // Determine HTTP status
    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Format response body to match expected test format
    const responseBody = {
      success: false,
      message: this.getErrorMessage(exception),
      errors: this.getErrorDetails(exception) || undefined,
    };

    // Add stack trace only in development mode (not in test or production)
    if (process.env.NODE_ENV === 'development' && exception instanceof Error) {
      (responseBody as any).stack = exception.stack;
    }

    // Log error with metadata
    this.logger.error(
      `Exception occurred - ${this.getErrorMessage(exception)} - ${request.method} ${request.url}${
        process.env.NODE_ENV === 'development' && exception instanceof Error
          ? '\n' + exception.stack
          : ''
      }`,
    );

    // Send error response to client
    httpAdapter.reply(response, responseBody, httpStatus);
  }

  // Get error message
  private getErrorMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return response;
      } else if (typeof response === 'object' && response) {
        const responseObj = response as any;
        // If message is an array, use error field or status text as message
        if (Array.isArray(responseObj.message)) {
          return responseObj.error || HttpStatus[exception.getStatus()];
        }
        return responseObj.message || responseObj.error || 'An error occurred';
      }
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return String(exception);
  }

  // Get additional error details (e.g., validation failures)
  private getErrorDetails(exception: unknown): string[] | undefined {
    if (exception instanceof HttpException) {
      const response = exception.getResponse() as any;
      if (typeof response === 'object' && response) {
        if ('errors' in response && Array.isArray(response.errors)) {
          return response.errors;
        } else if ('message' in response && Array.isArray(response.message)) {
          return response.message;
        }
      }
    }
    return undefined;
  }
}
