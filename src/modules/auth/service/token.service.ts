import { AUTH_CONFIG } from '@app/common/config/auth.config';
import { AuthConfig } from '@app/common/types/env.type';
import { CryptoService } from '@app/common/utils/crypto/crypto.service';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, LessThan, Repository } from 'typeorm';
import { Token } from '../entities/tokens.entity';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
    private readonly cryptoService: CryptoService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new refresh token record
   * @param userId User ID
   * @param token Raw token string
   * @param deviceInfo Device information
   * @param ipAddress IP address
   * @param entityManager Optional entity manager for transactions
   */
  async createRefreshToken(
    userId: number,
    token: string,
    entityManager: EntityManager,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<Token> {
    const tokenHash = await this.cryptoService.createRefreshTokenHash(token);
    const jwtConfig = this.configService.get<AuthConfig['jwt']>(
      `${AUTH_CONFIG}.jwt`,
    );

    // Calculate expiration date based on JWT config
    const expiresAt = new Date();
    const refreshExpiration = jwtConfig?.refreshExpiration || '7d';

    // Parse expiration time (7d, 24h, etc.)
    const expirationMs = this.parseExpirationTime(refreshExpiration);
    expiresAt.setTime(expiresAt.getTime() + expirationMs);

    const tokenEntity = {
      userId,
      tokenHash,
      expiresAt,
      deviceInfo,
      ipAddress,
      isRevoked: false,
    };

    // Use the provided entity manager if available, otherwise use repository
    const tokenCreate = entityManager.create(Token, tokenEntity);
    return entityManager.save(tokenCreate);
  }

  /**
   * Find a refresh token by hash
   */
  async findRefreshTokenByHash(tokenHash: string): Promise<Token | null> {
    return this.tokenRepository.findOne({
      where: {
        tokenHash,
      },
      relations: ['user'],
    });
  }

  /**
   * Update token last used timestamp
   * @param tokenId Token ID
   * @param entityManager Optional entity manager for transactions
   */
  async updateLastUsed(
    tokenId: number,
    entityManager: EntityManager,
  ): Promise<void> {
    await entityManager.update(Token, tokenId, {
      lastUsedAt: new Date(),
    });
  }

  /**
   * Revoke a token
   * @param tokenId Token ID
   * @param entityManager Optional entity manager for transactions
   */
  async revokeToken(
    tokenId: number,
    entityManager: EntityManager,
  ): Promise<void> {
    await entityManager.update(Token, tokenId, {
      deletedAt: new Date(),
    });
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeAllUserTokens(userId: number): Promise<void> {
    await this.tokenRepository.update({ userId }, { deletedAt: new Date() });
  }

  /**
   * Get active tokens count for a user
   */
  async getActiveTokensCount(userId: number): Promise<number> {
    return this.tokenRepository.count({
      where: {
        userId,
        expiresAt: LessThan(new Date()),
      },
    });
  }

  /**
   * Parse expiration time string to milliseconds
   */
  private parseExpirationTime(expiration: string): number {
    const timeValue = parseInt(expiration.slice(0, -1));
    const timeUnit = expiration.slice(-1);

    switch (timeUnit) {
      case 's':
        return timeValue * 1000;
      case 'm':
        return timeValue * 60 * 1000;
      case 'h':
        return timeValue * 60 * 60 * 1000;
      case 'd':
        return timeValue * 24 * 60 * 60 * 1000;
      default:
        // Default to 7 days if parsing fails
        return 7 * 24 * 60 * 60 * 1000;
    }
  }
}
