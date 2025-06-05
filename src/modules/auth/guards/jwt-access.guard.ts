import { IS_PUBLIC_KEY } from '@app/common/decorator/public.decorator';
import {
  applyDecorators,
  ExecutionContext,
  Injectable,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';

@Injectable()
export class JwtAccessGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context);
  }
}

export const JWTAccessGuard = applyDecorators(
  UseGuards(JwtAccessGuard),

  ApiBearerAuth('JWT-auth'),
  ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT Access token',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Invalid access token',
        },
      },
    },
  }),
);
