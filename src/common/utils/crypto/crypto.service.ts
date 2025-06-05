import { AUTH_CONFIG } from '@app/common/config/auth.config';
import { AuthConfig } from '@app/common/types/env.type';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Hashes a password using the Argon2 algorithm with settings from configuration.
   *
   * @param password - The plain text password to hash
   * @returns A promise that resolves to the hashed password string
   *
   * @example
   * ```typescript
   * const hashedPassword = await cryptoService.hashPassword('user_password');
   * // Returns: '$argon2id$v=19$m=65536,t=3,p=4$...'
   * ```
   */
  async hashPassword(password: string): Promise<string> {
    // Get the Argon2 configuration from configService
    const argonConfig = this.configService.get<AuthConfig['argon2']>(
      `${AUTH_CONFIG}.argon2`,
    );

    // Hash the password using Argon2
    return await argon2.hash(password, {
      memoryCost: argonConfig?.memoryCost || 65536,
      timeCost: argonConfig?.timeCost || 3,
      parallelism: argonConfig?.parallelism || 4,
      hashLength: 32,
    });
  }

  /**
   * Verifies a password against a stored Argon2 hash.
   *
   * @param password - The plain text password to verify
   * @param hash - The stored Argon2 hash to verify against
   * @returns A promise that resolves to a boolean indicating whether the password matches
   *
   * @example
   * ```typescript
   * const isValid = await cryptoService.verifyPassword('user_password', storedHash);
   * // Returns: true (if password matches) or false (if it doesn't)
   * ```
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await argon2.verify(hash, password);
  }

  /**
   * Creates a SHA-256 hash of a refresh token and truncates it to 32 characters.
   *
   * @param refreshToken - The refresh token to hash
   * @returns A promise that resolves to a 32-character hex string hash
   *
   * @example
   * ```typescript
   * const tokenHash = await cryptoService.createRefreshTokenHash('some-refresh-token');
   * // Returns: '8f434346648f6b96df89dda901c5176b'
   * ```
   */
  async createRefreshTokenHash(refreshToken: string): Promise<string> {
    // Make sure to import crypto at the top of the file:
    // import * as crypto from 'crypto';

    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Return a substring to keep it under 32 characters
    return hash.substring(0, 32);
  }
}
