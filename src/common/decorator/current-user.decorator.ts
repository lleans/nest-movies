import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type RequestInfo = {
  ipAddress?: string;
  deviceInfo?: string;
};

/**
 * Custom parameter decorator to extract user information from the request.
 *
 * @param data Optional string to specify which data to extract:
 *   - 'token': Extracts the JWT token from the Authorization header
 *   - 'ip' or 'ipAddress': Extracts the client's IP address
 *   - 'deviceInfo' or 'userAgent': Extracts the User-Agent header
 *   - 'requestInfo': Returns an object with IP address and device info
 *   - any other string: Returns the specified property from the user object
 *   - undefined: Returns the entire user object
 *
 * @param context The execution context
 * @returns The requested user information
 *
 * @example
 * // Get the entire user object
 * @GetCurrentUser() user: User
 *
 * @example
 * // Get a specific user property
 * @GetCurrentUser('email') email: string
 */
export const GetCurrentUser = createParamDecorator(
  (data: string | undefined, context: ExecutionContext) => {
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
      const requestInfo: RequestInfo = {
        ipAddress:
          request.ip ||
          request.connection?.remoteAddress ||
          request.headers['x-forwarded-for']?.split(',')[0].trim(),
        deviceInfo: request.headers['user-agent'],
      };
      return requestInfo;
    }

    if (!data) return request.user;
    return request.user?.[data];
  },
);
