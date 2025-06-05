import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let httpAdapterHost: HttpAdapterHost;
  let loggerSpy: jest.SpyInstance;
  let originalNodeEnv: string | undefined;

  // Mock objects
  let mockHttpAdapter: any;
  let mockArgumentsHost: ArgumentsHost;
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(async () => {
    // Save original NODE_ENV
    originalNodeEnv = process.env.NODE_ENV;

    // Spy on Logger prototype
    loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    // Mock httpAdapter with the 'reply' method
    mockHttpAdapter = {
      reply: jest.fn(),
    };

    // Mock HttpAdapterHost
    const mockHttpAdapterHost = {
      httpAdapter: mockHttpAdapter,
    };

    // Setup mock request and response
    mockRequest = {
      url: '/test',
      method: 'GET',
    };

    mockResponse = {};

    // Mock ArgumentsHost
    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
      getArgByIndex: jest.fn(),
      getArgs: jest.fn(),
      getType: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalExceptionFilter,
        {
          provide: HttpAdapterHost,
          useValue: mockHttpAdapterHost,
        },
      ],
    }).compile();

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);
    httpAdapterHost = module.get<HttpAdapterHost>(HttpAdapterHost);
  });

  afterEach(() => {
    // Restore the spy
    loggerSpy.mockRestore();
    // Restore NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should handle HttpException with the correct response format', () => {
    // Create an HttpException to test with
    const exception = new HttpException('Access denied', HttpStatus.FORBIDDEN);

    // Call the filter
    filter.catch(exception, mockArgumentsHost);

    // Verify logger was called
    expect(loggerSpy).toHaveBeenCalled();

    // Verify httpAdapter.reply was called with the correct arguments
    expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
      mockResponse,
      {
        success: false,
        message: 'Access denied',
        errors: undefined,
      },
      HttpStatus.FORBIDDEN,
    );
  });

  it('should handle non-HttpException errors with INTERNAL_SERVER_ERROR status', () => {
    // Create a regular Error
    const exception = new Error('Something went wrong');

    // Call the filter
    filter.catch(exception, mockArgumentsHost);

    // Verify logger was called
    expect(loggerSpy).toHaveBeenCalled();

    // Verify httpAdapter.reply was called with the correct arguments
    expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
      mockResponse,
      {
        success: false,
        message: 'Something went wrong',
        errors: undefined,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });

  it('should include stack trace in non-production environment', () => {
    // Set environment to development
    process.env.NODE_ENV = 'development';

    // Create a regular Error with stack trace
    const exception = new Error('Development error');

    // Call the filter
    filter.catch(exception, mockArgumentsHost);

    // Verify stack trace is included
    expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
      mockResponse,
      expect.objectContaining({
        success: false,
        message: 'Development error',
        stack: expect.any(String),
      }),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });

  it('should not include stack trace in production environment', () => {
    // Set environment to production
    process.env.NODE_ENV = 'production';

    // Create a regular Error with stack trace
    const exception = new Error('Production error');

    // Call the filter
    filter.catch(exception, mockArgumentsHost);

    // Verify stack trace is not included
    expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
      mockResponse,
      {
        success: false,
        message: 'Production error',
        errors: undefined,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });

  it('should extract errors array from HttpException response', () => {
    // Create HttpException with errors array
    const exceptionResponse = {
      message: 'Validation failed',
      errors: ['Field is required', 'Invalid format'],
    };
    const exception = new HttpException(
      exceptionResponse,
      HttpStatus.BAD_REQUEST,
    );

    // Call the filter
    filter.catch(exception, mockArgumentsHost);

    // Verify errors are extracted correctly
    expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
      mockResponse,
      {
        success: false,
        message: 'Validation failed',
        errors: ['Field is required', 'Invalid format'],
      },
      HttpStatus.BAD_REQUEST,
    );
  });

  it('should extract message array as errors from HttpException response', () => {
    // Create HttpException with message array (common in NestJS validation errors)
    const exceptionResponse = {
      message: ['Username is required', 'Password is too short'],
      error: 'Bad Request',
    };
    const exception = new HttpException(
      exceptionResponse,
      HttpStatus.BAD_REQUEST,
    );

    // Call the filter
    filter.catch(exception, mockArgumentsHost);

    // Verify message array is extracted as errors
    expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
      mockResponse,
      {
        success: false,
        message: 'Bad Request',
        errors: ['Username is required', 'Password is too short'],
      },
      HttpStatus.BAD_REQUEST,
    );
  });

  it('should handle nested validation errors from class-validator', () => {
    // Create a response that mimics NestJS validation pipe errors
    const validationError = {
      message: 'Validation failed',
      errors: [
        {
          property: 'username',
          constraints: {
            isNotEmpty: 'Username should not be empty',
            isString: 'Username must be a string',
          },
        },
        {
          property: 'email',
          constraints: {
            isEmail: 'Email must be valid',
          },
        },
      ],
    };

    const exception = new HttpException(
      validationError,
      HttpStatus.BAD_REQUEST,
    );

    // Call the filter
    filter.catch(exception, mockArgumentsHost);

    // Verify validation errors are extracted correctly
    expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
      mockResponse,
      {
        success: false,
        message: 'Validation failed',
        errors: validationError.errors,
      },
      HttpStatus.BAD_REQUEST,
    );
  });

  it('should handle string message in HttpException', () => {
    // Create HttpException with a string message
    const exception = new HttpException(
      'Simple error message',
      HttpStatus.BAD_REQUEST,
    );

    // Call the filter
    filter.catch(exception, mockArgumentsHost);

    // Verify response
    expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
      mockResponse,
      {
        success: false,
        message: 'Simple error message',
        errors: undefined,
      },
      HttpStatus.BAD_REQUEST,
    );
  });

  it('should handle non-object exceptions', () => {
    // Test with a string exception
    const exception = 'String exception';

    // Call the filter
    filter.catch(exception, mockArgumentsHost);

    // Verify response
    expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
      mockResponse,
      {
        success: false,
        message: 'String exception',
        errors: undefined,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });
});
