import {
  applyDecorators,
  ExecutionContext,
  Injectable,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {
  constructor() {
    super();
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}

export const JWTRefreshGuard = applyDecorators(
  UseGuards(JwtRefreshGuard),

  ApiBearerAuth('JWT-auth'),
  ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT Refresh token',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Invalid refresh token',
        },
      },
    },
  }),
);
