import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { lastValueFrom, of } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;
  let logSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggingInterceptor],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);

    // Mock request object
    mockRequest = {
      method: 'GET',
      url: '/test',
    };

    // Mock execution context
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ExecutionContext;

    // Mock call handler
    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ data: 'test' })),
    } as unknown as CallHandler;

    // Spy on logger
    logSpy = jest.spyOn(interceptor['logger'], 'log');
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should log request method and URL', async () => {
    await lastValueFrom(
      interceptor.intercept(mockExecutionContext, mockCallHandler),
    );
    expect(logSpy).toHaveBeenCalledWith('Request: GET /test');
  });

  it('should call next handler', async () => {
    await lastValueFrom(
      interceptor.intercept(mockExecutionContext, mockCallHandler),
    );
    expect(mockCallHandler.handle).toHaveBeenCalled();
  });

  it('should return handler response unchanged', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(mockExecutionContext, mockCallHandler),
    );
    expect(result).toEqual({ data: 'test' });
  });
});
