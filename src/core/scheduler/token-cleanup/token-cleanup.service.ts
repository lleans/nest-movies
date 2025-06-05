import { Token } from '@app/modules/auth/entities/tokens.entity';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Not, Repository } from 'typeorm';

@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredTokens(): Promise<void> {
    this.logger.log('Starting token cleanup process...');

    try {
      const result = await this.tokenRepository.delete({
        expiresAt: LessThan(new Date()),
      });

      const deletedCount = result.affected || 0;

      if (deletedCount > 0) {
        this.logger.log(
          `Successfully cleaned up ${deletedCount} expired tokens`,
        );
      } else {
        this.logger.log('No expired tokens found to clean up');
      }
    } catch (error) {
      this.logger.error(
        `Error during token cleanup: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Clean up revoked tokens older than 30 days (manual trigger or can be scheduled)
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async cleanupOldRevokedTokens(): Promise<void> {
    this.logger.log('Starting cleanup of old revoked tokens...');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.tokenRepository.delete({
        deletedAt: Not(IsNull()),
        updatedAt: LessThan(thirtyDaysAgo),
      });

      const deletedCount = result.affected || 0;

      if (deletedCount > 0) {
        this.logger.log(
          `Successfully cleaned up ${deletedCount} old revoked tokens`,
        );
      } else {
        this.logger.log('No old revoked tokens found to clean up');
      }
    } catch (error) {
      this.logger.error(
        `Error during old revoked token cleanup: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Log token statistics for monitoring purposes
   */
  async logTokenStatistics(): Promise<void> {
    try {
      const totalTokens = await this.tokenRepository.count();
      const expiredTokens = await this.tokenRepository.count({
        where: { expiresAt: LessThan(new Date()) },
      });
      const revokedTokens = await this.tokenRepository.count({
        where: { deletedAt: Not(IsNull()) },
      });

      this.logger.log(
        `Token Statistics - Total: ${totalTokens}, Expired: ${expiredTokens}, Revoked: ${revokedTokens}`,
      );
    } catch (error) {
      this.logger.error(
        `Error logging token statistics: ${error.message}`,
        error.stack,
      );
    }
  }
}
