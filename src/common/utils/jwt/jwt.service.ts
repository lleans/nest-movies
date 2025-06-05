import { AUTH_CONFIG } from '@app/common/config/auth.config';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { AuthConfig } from '../../types/env.type';
import { JwtPayload } from '../../types/jwt.type';

@Injectable()
export class JwtService {
  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateAccessToken(payload: JwtPayload): Promise<string> {
    const jwtConfig = this.configService.get<AuthConfig['jwt']>(
      `${AUTH_CONFIG}.jwt`,
    );

    return this.jwtService.signAsync(payload, {
      secret: jwtConfig?.accessSecret,
      expiresIn: jwtConfig?.accessExpiration,
    });
  }

  async generateRefreshToken(payload: JwtPayload): Promise<string> {
    const jwtConfig = this.configService.get<AuthConfig['jwt']>(
      `${AUTH_CONFIG}.jwt`,
    );

    return this.jwtService.signAsync(payload, {
      secret: jwtConfig?.refreshSecret,
      expiresIn: jwtConfig?.refreshExpiration,
    });
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    const jwtConfig = this.configService.get<AuthConfig['jwt']>(
      `${AUTH_CONFIG}.jwt`,
    );

    return this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: jwtConfig?.accessSecret,
    });
  }

  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    const jwtConfig = this.configService.get<AuthConfig['jwt']>(
      `${AUTH_CONFIG}.jwt`,
    );

    return this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: jwtConfig?.refreshSecret,
    });
  }

  decodeToken(token: string): JwtPayload {
    return this.jwtService.decode(token);
  }
}
