import { AUTH_CONFIG } from '@app/common/config/auth.config';
import { AuthConfig } from '@app/common/types/env.type';
import { JwtPayload } from '@app/common/types/jwt.type';
import { CryptoService } from '@app/common/utils/crypto/crypto.service';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/users.entity';
import { TokenService } from '../service/token.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  private readonly logger = new Logger(JwtRefreshStrategy.name);

  constructor(
    private configService: ConfigService,
    private cryptoService: CryptoService,
    private tokenService: TokenService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    const config = configService.get<AuthConfig['jwt']>(`${AUTH_CONFIG}.jwt`);
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config?.refreshSecret,
      passReqToCallback: true, // This passes the request to the validate method
    });
  }

  async validate(request: any, payload: JwtPayload): Promise<User> {
    try {
      const { sub } = payload;
      const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);

      // Get current request device info and IP
      const currentDeviceInfo = request.headers['user-agent'];
      const currentIp =
        request.ip ||
        request.connection?.remoteAddress ||
        request.headers['x-forwarded-for']?.split(',')[0].trim();

      // Find the token in the database
      const tokenHash = await this.cryptoService.createRefreshTokenHash(token);
      const tokenRecord =
        await this.tokenService.findRefreshTokenByHash(tokenHash);

      if (!tokenRecord) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Validate that the token belongs to the correct user
      if (tokenRecord.userId !== sub) {
        this.logger.warn(
          `Token user mismatch: ${tokenRecord.userId} vs ${sub}`,
        );
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Validate device info if strict checking is enabled
      // You can make this configurable based on your security requirements
      const strictDeviceCheck = true;
      if (
        strictDeviceCheck &&
        tokenRecord.deviceInfo &&
        tokenRecord.deviceInfo !== currentDeviceInfo
      ) {
        this.logger.warn(`Device info mismatch for user ${sub}`);
        throw new UnauthorizedException('Token used from unrecognized device');
      }

      // Validate IP address (optional, as IPs can change for legitimate users)
      // Consider making this configurable or using partial matching
      const strictIpCheck = false; // Less strict by default since IPs can change legitimately
      if (
        strictIpCheck &&
        tokenRecord.ipAddress &&
        tokenRecord.ipAddress !== currentIp
      ) {
        this.logger.warn(
          `IP address mismatch for user ${sub}: ${tokenRecord.ipAddress} vs ${currentIp}`,
        );
        throw new UnauthorizedException(
          'Token used from unrecognized location',
        );
      }

      const user = await this.userRepository.findOne({
        where: { id: sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Attach token info to user object for possible later use
      user['tokenInfo'] = {
        id: tokenRecord.id,
        deviceInfo: tokenRecord.deviceInfo,
        ipAddress: tokenRecord.ipAddress,
      };

      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(
        `Token validation error: ${error.message}`,
        error.stack,
      );
      throw new UnauthorizedException('Invalid token');
    }
  }
}
