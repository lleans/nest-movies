import {
  applyDecorators,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/users.entity';
import { JwtAccessGuard } from './jwt-access.guard';

@ApiForbiddenResponse({
  description: 'Forbidden - Administrator privileges required',
  schema: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: {
        type: 'string',
        example: 'Access denied. Administrator privileges required.',
      },
    },
  },
})
@Injectable()
export class AdminGuard extends JwtAccessGuard {
  constructor(
    reflector: Reflector,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super(reflector);
  }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First check if user is authenticated using JWT
    const isAuthenticated = await super.canActivate(context);
    if (!isAuthenticated) {
      return false;
    } // Get the request object
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Invalid user token');
    }

    // Query database to get fresh user data
    const userEntity = await this.userRepository.findOne({
      where: { id: user.id },
      select: ['id', 'isAdmin'],
    });
    if (!userEntity) {
      throw new UnauthorizedException('User not found');
    }

    if (!userEntity.isAdmin) {
      throw new ForbiddenException(
        'Access denied. Administrator privileges required.',
      );
    }

    // Replace the request.user with the userEntity to have accurate admin status
    request.user = userEntity;

    return true;
  }
}

export const RequireAdmin = applyDecorators(
  UseGuards(AdminGuard),

  ApiBearerAuth('JWT-auth'),
  ApiUnauthorizedResponse({
    description:
      'Unauthorized - Invalid JWT token or Required admin privileges',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Access denied. Administrator privileges required.',
        },
      },
    },
  }),
);
