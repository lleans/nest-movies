import { AUTH_CONFIG } from '@app/common/config/auth.config';
import { AuthConfig } from '@app/common/types/env.type';
import { JwtPayload } from '@app/common/types/jwt.type';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/users.entity';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtAccessStrategy.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    const config = configService.get<AuthConfig['jwt']>(`${AUTH_CONFIG}.jwt`);
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config?.accessSecret,
      passReqToCallback: true, // Pass request to validate method
    });
  }

  async validate(request: any, payload: JwtPayload): Promise<User> {
    try {
      const { sub, device, ip } = payload;

      // If payload contains device or IP fingerprints, verify them
      if (device || ip) {
        const currentDeviceInfo = request.headers['user-agent'];
        const currentIp =
          request.ip ||
          request.connection?.remoteAddress ||
          request.headers['x-forwarded-for']?.split(',')[0].trim();

        // Check device fingerprint if present in token
        if (device && currentDeviceInfo !== device) {
          this.logger.warn(`Device hash mismatch for user ${sub}`);
          throw new UnauthorizedException(
            'Token used from unrecognized device',
          );
        }

        // Check IP fingerprint if present in token (optional, IPs can change)
        // This is generally less strict as IP addresses can legitimately change
        const strictIpCheck = false; // Set to true to enforce strict IP checking
        if (strictIpCheck && ip && currentIp !== ip) {
          this.logger.warn(`IP hash mismatch for user ${sub}`);
          throw new UnauthorizedException(
            'Token used from unrecognized location',
          );
        }
      }

      const user = await this.userRepository.findOne({
        where: { id: sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(
        `Access token validation error: ${error.message}`,
        error.stack,
      );
      throw new UnauthorizedException('Invalid token');
    }
  }
}
