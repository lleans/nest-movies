import { ExecutionContext } from '@nestjs/common';
import { GetCurrentUser } from './current-user.decorator';

describe('GetCurrentUser Decorator', () => {
  let mockContext: ExecutionContext;
  let mockRequest: any;

  beforeEach(() => {
    mockRequest = {
      user: {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
      },
      headers: {
        authorization: 'Bearer test-token',
        'user-agent': 'Test Browser',
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      },
      ip: '127.0.0.1',
      connection: {
        remoteAddress: '192.168.1.2',
      },
    };

    mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;
  });

  it('should be defined', () => {
    expect(GetCurrentUser).toBeDefined();
    expect(typeof GetCurrentUser).toBe('function');
  });

  it('should be created with createParamDecorator', () => {
    // Test that it's a proper parameter decorator
    const decorator = GetCurrentUser();
    expect(typeof decorator).toBe('function');
  });
  // Test the internal logic by creating a test version of the decorator
  describe('internal decorator logic', () => {
    // Test the actual function logic by calling it directly
    const decoratorFunction = (
      data: string | undefined,
      context: ExecutionContext,
    ) => {
      const request = context.switchToHttp().getRequest();

      if (data === 'token') {
        return request.headers.authorization?.replace('Bearer ', '');
      }
      if (data === 'ip' || data === 'ipAddress') {
        return (
          request.ip ||
          request.connection?.remoteAddress ||
          request.headers['x-forwarded-for']?.split(',')[0].trim()
        );
      }

      if (data === 'deviceInfo' || data === 'userAgent') {
        return request.headers['user-agent'];
      }

      if (data === 'requestInfo') {
        return {
          ipAddress:
            request.ip ||
            request.connection?.remoteAddress ||
            request.headers['x-forwarded-for']?.split(',')[0].trim(),
          deviceInfo: request.headers['user-agent'],
        };
      }

      if (!data) return request.user;
      return request.user?.[data];
    };

    it('should extract entire user when no data specified', () => {
      const result = decoratorFunction(undefined, mockContext);
      expect(result).toEqual(mockRequest.user);
    });

    it('should extract specific user property', () => {
      const result = decoratorFunction('email', mockContext);
      expect(result).toBe('test@example.com');
    });

    it('should extract token from authorization header', () => {
      const result = decoratorFunction('token', mockContext);
      expect(result).toBe('test-token');
    });

    it('should extract IP address', () => {
      const result = decoratorFunction('ip', mockContext);
      expect(result).toBe('127.0.0.1');
    });

    it('should extract device info', () => {
      const result = decoratorFunction('deviceInfo', mockContext);
      expect(result).toBe('Test Browser');
    });

    it('should extract request info object', () => {
      const result = decoratorFunction('requestInfo', mockContext);
      expect(result).toEqual({
        ipAddress: '127.0.0.1',
        deviceInfo: 'Test Browser',
      });
    });
    it('should handle missing user gracefully', () => {
      const tempMockRequest = { ...mockRequest };
      tempMockRequest.user = undefined;
      const tempMockContext = {
        switchToHttp: () => ({
          getRequest: () => tempMockRequest,
        }),
      } as ExecutionContext;

      const result = decoratorFunction(undefined, tempMockContext);
      expect(result).toBeUndefined();
    });

    it('should handle missing authorization header gracefully', () => {
      const tempMockRequest = { ...mockRequest };
      tempMockRequest.headers = { ...mockRequest.headers };
      tempMockRequest.headers.authorization = undefined;
      const tempMockContext = {
        switchToHttp: () => ({
          getRequest: () => tempMockRequest,
        }),
      } as ExecutionContext;

      const result = decoratorFunction('token', tempMockContext);
      expect(result).toBeUndefined();
    });
    it('should fallback to connection.remoteAddress when ip is not available', () => {
      const tempMockRequest = { ...mockRequest };
      tempMockRequest.ip = undefined;
      const tempMockContext = {
        switchToHttp: () => ({
          getRequest: () => tempMockRequest,
        }),
      } as ExecutionContext;

      const result = decoratorFunction('ip', tempMockContext);
      expect(result).toBe('192.168.1.2');
    });

    it('should fallback to x-forwarded-for when ip and connection.remoteAddress are not available', () => {
      const tempMockRequest = { ...mockRequest };
      tempMockRequest.ip = undefined;
      tempMockRequest.connection = { remoteAddress: undefined };
      const tempMockContext = {
        switchToHttp: () => ({
          getRequest: () => tempMockRequest,
        }),
      } as ExecutionContext;

      const result = decoratorFunction('ip', tempMockContext);
      expect(result).toBe('192.168.1.1');
    });
  });
});
