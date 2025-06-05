import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  PaginatedResponse,
  PaginationMetadata,
} from '../../dto/pagination.dto';

export interface Response<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[];
}

export interface PaginatedApiResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  metadata: PaginationMetadata;
  errors?: string[];
}

@Injectable() // Use 'any' for wrapped data type
export class ResponseInterceptor<T>
  implements NestInterceptor<T, Response<any> | PaginatedApiResponse<any>>
{
  private readonly logger = new Logger(ResponseInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>, // T is the type of data from the handler
  ): Observable<Response<any> | PaginatedApiResponse<any>> {
    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse();

    return next.handle().pipe(
      map((data: T) => {
        const statusCode = response.statusCode;
        // Only transform successful responses
        if (statusCode >= 200 && statusCode < 300) {
          if (this.isPaginatedResponse(data)) {
            // data is PaginatedResponse<unknown> here
            const transformedResponse = this.transformPaginatedResponse(
              data,
              statusCode,
            );
            this.logger.log(
              `Response sent [${statusCode}]: ${transformedResponse.message}`,
            );
            return transformedResponse;
          }
          // data is T (and not a PaginatedResponse)
          const transformedResponse = this.transformRegularResponse(
            data,
            statusCode,
          );
          this.logger.log(
            `Response sent [${statusCode}]: ${transformedResponse.message}`,
          );
          return transformedResponse;
        }
        // Pass through non-successful responses unchanged
        return data as any; // Cast to any if data is not meant to be transformed
      }),
      catchError((error) => {
        this.logger.error(`Error response: ${error.message}`);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Check if the response data is a paginated response.
   * The type guard narrows down the type of 'data' if it returns true.
   */
  private isPaginatedResponse(
    data: unknown,
  ): data is PaginatedResponse<unknown> {
    return (
      !!data &&
      typeof data === 'object' &&
      'data' in data &&
      Array.isArray((data as any).data) &&
      'metadata' in data &&
      typeof (data as any).metadata === 'object' &&
      typeof (data as any).metadata.currentPage === 'number' &&
      typeof (data as any).metadata.totalItems === 'number'
    );
  }

  /**
   * Transform paginated response.
   * U represents the type of items within the paginated data array.
   */
  private transformPaginatedResponse<U>(
    responseData: PaginatedResponse<U> & {
      message?: string;
      errors?: string[];
    },
    statusCode: number,
  ): PaginatedApiResponse<U> {
    const message =
      responseData.message ||
      HttpStatus[statusCode].replaceAll('_', ' ').toLowerCase();

    return {
      success: true,
      message,
      data: responseData.data,
      metadata: responseData.metadata,
      errors: responseData.errors,
    };
  }

  /**
   * Transform regular response.
   * DataType represents the type of the original data from the handler.
   * The 'data' field in the returned Response object is typed as 'any'
   * due to the dynamic extraction logic.
   */
  private transformRegularResponse<DataType>(
    originalData: DataType,
    statusCode: number,
  ): Response<any> {
    const httpStatusMessage = HttpStatus[statusCode]
      .replaceAll('_', ' ')
      .toLowerCase();

    let responseMessage: string = httpStatusMessage;
    let payload: any;
    let responseErrors: string[] | undefined = undefined;

    if (
      originalData &&
      typeof originalData === 'object' &&
      !Array.isArray(originalData)
    ) {
      const objData = originalData as {
        message?: string;
        data?: any; // data property within the object
        errors?: string[];
        [key: string]: any; // Allow other properties
      };

      if (typeof objData.message === 'string') {
        responseMessage = objData.message;
      }

      if (Array.isArray(objData.errors)) {
        responseErrors = objData.errors;
      }

      // Create 'rest' by excluding 'message' property, as per original logic
      const { message: _m, ...restProperties } = objData;

      // Mimic: processedData = data.data || rest
      // Check if 'data' property explicitly exists in originalData object
      if (Object.prototype.hasOwnProperty.call(objData, 'data')) {
        // If objData.data is falsy (null, undefined, 0, "", false), restProperties will be used.
        payload = objData.data || restProperties;
      } else {
        // 'data' property does not exist, so use rest (object without 'message')
        payload = restProperties;
      }
    } else {
      // Handle primitives, arrays, or null
      payload = originalData;
    }

    return {
      success: true,
      message: responseMessage,
      data: payload,
      errors: responseErrors,
    };
  }
}
