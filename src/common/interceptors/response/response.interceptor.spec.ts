import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { lastValueFrom, of, throwError } from 'rxjs';
import { PaginatedResponse } from '../../dto/pagination.dto';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<any>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResponseInterceptor],
    }).compile();

    interceptor = module.get<ResponseInterceptor<any>>(ResponseInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should transform response to standard format with status 200', async () => {
    // Mock data
    const testData = { id: 1, name: 'Test' };

    // Mock call handler
    const callHandler: CallHandler = {
      handle: () => of(testData),
    };

    // Mock HTTP response
    const mockResponse = {
      statusCode: 200,
    };

    // Mock execution context
    const executionContext: ExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue({}),
      }),
      getType: jest.fn().mockReturnValue('http'),
      getClass: jest.fn().mockReturnValue(ResponseInterceptor),
      getHandler: jest.fn().mockReturnValue({}),
      getArgs: jest.fn().mockReturnValue([]),
      getArgByIndex: jest.fn().mockReturnValue(null),
      switchToRpc: jest.fn().mockReturnValue({}),
      switchToWs: jest.fn().mockReturnValue({}),
    };

    // Call interceptor
    const observable = interceptor.intercept(executionContext, callHandler);
    const result = await lastValueFrom(observable);

    // Expectations
    expect(result).toEqual({
      success: true,
      message: 'ok',
      data: testData,
      errors: undefined,
    });
  });

  it('should preserve message and data when they exist in response', async () => {
    // Mock data with message and data properties
    const testData = {
      message: 'Custom message',
      data: { id: 1, name: 'Test' },
    };

    // Mock call handler
    const callHandler: CallHandler = {
      handle: () => of(testData),
    };

    // Mock HTTP response
    const mockResponse = {
      statusCode: 200,
    };

    // Mock execution context
    const executionContext: ExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue({}),
      }),
      getType: jest.fn().mockReturnValue('http'),
      getClass: jest.fn().mockReturnValue(ResponseInterceptor),
      getHandler: jest.fn().mockReturnValue({}),
      getArgs: jest.fn().mockReturnValue([]),
      getArgByIndex: jest.fn().mockReturnValue(null),
      switchToRpc: jest.fn().mockReturnValue({}),
      switchToWs: jest.fn().mockReturnValue({}),
    };

    // Call interceptor
    const observable = interceptor.intercept(executionContext, callHandler);
    const result = await lastValueFrom(observable);

    // Expectations
    expect(result).toEqual({
      success: true,
      message: 'Custom message',
      data: testData.data,
      errors: undefined,
    });
  });

  it('should include errors when they exist in response', async () => {
    // Mock data with errors
    const testData = {
      data: { id: 1 },
      errors: ['Error 1', 'Error 2'],
    };

    // Mock call handler
    const callHandler: CallHandler = {
      handle: () => of(testData),
    };

    // Mock HTTP response
    const mockResponse = {
      statusCode: 200,
    };

    // Mock execution context
    const executionContext: ExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue({}),
      }),
      getType: jest.fn().mockReturnValue('http'),
      getClass: jest.fn().mockReturnValue(ResponseInterceptor),
      getHandler: jest.fn().mockReturnValue({}),
      getArgs: jest.fn().mockReturnValue([]),
      getArgByIndex: jest.fn().mockReturnValue(null),
      switchToRpc: jest.fn().mockReturnValue({}),
      switchToWs: jest.fn().mockReturnValue({}),
    };

    // Call interceptor
    const observable = interceptor.intercept(executionContext, callHandler);
    const result = await lastValueFrom(observable);

    // Expectations
    expect(result).toEqual({
      success: true,
      message: 'ok',
      data: testData.data,
      errors: testData.errors,
    });
  });

  // New pagination tests
  describe('Pagination Support', () => {
    it('should transform paginated response correctly', async () => {
      // Mock paginated data
      const paginatedData: PaginatedResponse<{ id: number; name: string }> = {
        data: [
          { id: 1, name: 'User 1' },
          { id: 2, name: 'User 2' },
        ],
        metadata: {
          currentPage: 1,
          itemsPerPage: 10,
          totalItems: 25,
          totalPages: 3,
          hasNextPage: true,
          hasPreviousPage: false,
        },
      };

      // Mock call handler
      const callHandler: CallHandler = {
        handle: () => of(paginatedData),
      };

      // Mock HTTP response
      const mockResponse = {
        statusCode: 200,
      };

      // Mock execution context
      const executionContext: ExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: jest.fn().mockReturnValue(mockResponse),
          getRequest: jest.fn().mockReturnValue({}),
        }),
        getType: jest.fn().mockReturnValue('http'),
        getClass: jest.fn().mockReturnValue(ResponseInterceptor),
        getHandler: jest.fn().mockReturnValue({}),
        getArgs: jest.fn().mockReturnValue([]),
        getArgByIndex: jest.fn().mockReturnValue(null),
        switchToRpc: jest.fn().mockReturnValue({}),
        switchToWs: jest.fn().mockReturnValue({}),
      };

      // Call interceptor
      const observable = interceptor.intercept(executionContext, callHandler);
      const result = await lastValueFrom(observable);

      // Expectations
      expect(result).toEqual({
        success: true,
        message: 'ok',
        data: paginatedData.data,
        metadata: paginatedData.metadata,
        errors: undefined,
      });
    });

    it('should preserve custom message in paginated response', async () => {
      // Mock paginated data with custom message
      const paginatedData = {
        data: [{ id: 1, name: 'User 1' }],
        metadata: {
          currentPage: 1,
          itemsPerPage: 10,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        message: 'Successfully retrieved users',
      };

      // Mock call handler
      const callHandler: CallHandler = {
        handle: () => of(paginatedData),
      };

      // Mock HTTP response
      const mockResponse = {
        statusCode: 200,
      };

      // Mock execution context
      const executionContext: ExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: jest.fn().mockReturnValue(mockResponse),
          getRequest: jest.fn().mockReturnValue({}),
        }),
        getType: jest.fn().mockReturnValue('http'),
        getClass: jest.fn().mockReturnValue(ResponseInterceptor),
        getHandler: jest.fn().mockReturnValue({}),
        getArgs: jest.fn().mockReturnValue([]),
        getArgByIndex: jest.fn().mockReturnValue(null),
        switchToRpc: jest.fn().mockReturnValue({}),
        switchToWs: jest.fn().mockReturnValue({}),
      };

      // Call interceptor
      const observable = interceptor.intercept(executionContext, callHandler);
      const result = await lastValueFrom(observable);

      // Expectations
      expect(result).toEqual({
        success: true,
        message: 'Successfully retrieved users',
        data: paginatedData.data,
        metadata: paginatedData.metadata,
        errors: undefined,
      });
    });

    it('should handle paginated response with errors', async () => {
      // Mock paginated data with errors
      const paginatedData = {
        data: [{ id: 1, name: 'User 1' }],
        metadata: {
          currentPage: 1,
          itemsPerPage: 10,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        errors: ['Warning: Some data might be outdated'],
      };

      // Mock call handler
      const callHandler: CallHandler = {
        handle: () => of(paginatedData),
      };

      // Mock HTTP response
      const mockResponse = {
        statusCode: 200,
      };

      // Mock execution context
      const executionContext: ExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: jest.fn().mockReturnValue(mockResponse),
          getRequest: jest.fn().mockReturnValue({}),
        }),
        getType: jest.fn().mockReturnValue('http'),
        getClass: jest.fn().mockReturnValue(ResponseInterceptor),
        getHandler: jest.fn().mockReturnValue({}),
        getArgs: jest.fn().mockReturnValue([]),
        getArgByIndex: jest.fn().mockReturnValue(null),
        switchToRpc: jest.fn().mockReturnValue({}),
        switchToWs: jest.fn().mockReturnValue({}),
      };

      // Call interceptor
      const observable = interceptor.intercept(executionContext, callHandler);
      const result = await lastValueFrom(observable);

      // Expectations
      expect(result).toEqual({
        success: true,
        message: 'ok',
        data: paginatedData.data,
        metadata: paginatedData.metadata,
        errors: paginatedData.errors,
      });
    });

    it('should not treat regular arrays as paginated responses', async () => {
      // Mock regular array data
      const arrayData = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];

      // Mock call handler
      const callHandler: CallHandler = {
        handle: () => of(arrayData),
      };

      // Mock HTTP response
      const mockResponse = {
        statusCode: 200,
      };

      // Mock execution context
      const executionContext: ExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: jest.fn().mockReturnValue(mockResponse),
          getRequest: jest.fn().mockReturnValue({}),
        }),
        getType: jest.fn().mockReturnValue('http'),
        getClass: jest.fn().mockReturnValue(ResponseInterceptor),
        getHandler: jest.fn().mockReturnValue({}),
        getArgs: jest.fn().mockReturnValue([]),
        getArgByIndex: jest.fn().mockReturnValue(null),
        switchToRpc: jest.fn().mockReturnValue({}),
        switchToWs: jest.fn().mockReturnValue({}),
      };

      // Call interceptor
      const observable = interceptor.intercept(executionContext, callHandler);
      const result = await lastValueFrom(observable);

      // Expectations - should be treated as regular response, not paginated
      expect(result).toEqual({
        success: true,
        message: 'ok',
        data: arrayData,
        errors: undefined,
      });
      expect(result).not.toHaveProperty('metadata');
    });
  });

  it('should handle errors gracefully', async () => {
    // Mock error
    const testError = new Error('Test error');

    // Mock call handler that throws an error
    const callHandler: CallHandler = {
      handle: () => throwError(() => testError),
    };

    // Mock HTTP response
    const mockResponse = {
      statusCode: 500,
    };

    // Mock execution context
    const executionContext: ExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue({}),
      }),
      getType: jest.fn().mockReturnValue('http'),
      getClass: jest.fn().mockReturnValue(ResponseInterceptor),
      getHandler: jest.fn().mockReturnValue({}),
      getArgs: jest.fn().mockReturnValue([]),
      getArgByIndex: jest.fn().mockReturnValue(null),
      switchToRpc: jest.fn().mockReturnValue({}),
      switchToWs: jest.fn().mockReturnValue({}),
    };

    // Call interceptor and expect it to propagate the error
    const observable = interceptor.intercept(executionContext, callHandler);
    try {
      await lastValueFrom(observable);
      fail('Observable should have thrown an error');
    } catch (error) {
      expect(error).toBe(testError);
    }
  });
});
