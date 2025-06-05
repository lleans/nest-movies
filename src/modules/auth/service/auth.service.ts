import { RequestInfo } from '@app/common/decorator/current-user.decorator';
import { JwtPayload } from '@app/common/types/jwt.type';
import { CryptoService } from '@app/common/utils/crypto/crypto.service';
import { JwtService } from '@app/common/utils/jwt/jwt.service';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/users.entity';
import { SignUpInput } from '../dto/auth.dto';
import { TokenService } from './token.service';

export type AuthResponse = {
  user: {
    id: number;
    email: string;
    name: string;
    isAdmin: boolean;
  };
  accessToken: string;
  refreshToken: string;
};

const createAuthResponse = (
  user: User,
  accessToken: string,
  refreshToken: string,
): AuthResponse => ({
  user: {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
  },
  accessToken,
  refreshToken,
});

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly cryptoService: CryptoService,
    private readonly tokenService: TokenService,
  ) {}

  findOneByEmailOrName(email: string, name?: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: [{ email }, ...(name ? [{ name }] : [])],
    });
  }

  private async generateTokens(
    user: User,
    isRefresh: boolean = false,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      device: deviceInfo,
      ip: ipAddress,
    };
    return isRefresh
      ? this.jwtService.generateRefreshToken(payload)
      : this.jwtService.generateAccessToken(payload);
  }

  async signUp(
    signUpDto: SignUpInput,
    userInfo: RequestInfo,
  ): Promise<AuthResponse> {
    const { name, email, password } = signUpDto;

    const existingUser = await this.findOneByEmailOrName(email, name);

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException('User already exists');
      }

      if (existingUser.name === name) {
        throw new ConflictException('User with this name already exists');
      }
    }

    const hashPassword = await this.cryptoService.hashPassword(password);

    try {
      const result = await this.userRepository.manager.transaction(
        async (transactionalEntityManager) => {
          const newUser = transactionalEntityManager.create(User, {
            name,
            email,
            password: hashPassword,
          });

          const savedUser = await transactionalEntityManager.save(newUser);

          const accessToken = await this.generateTokens(
            savedUser,
            false,
            userInfo?.deviceInfo,
            userInfo?.ipAddress,
          );
          const refreshToken = await this.generateTokens(savedUser, true);

          // Pass transaction manager to ensure token is created within the transaction
          await this.tokenService.createRefreshToken(
            savedUser.id,
            refreshToken,
            transactionalEntityManager,
            userInfo?.deviceInfo,
            userInfo?.ipAddress,
          );

          await transactionalEntityManager.update(User, savedUser.id, {
            lastLoginAt: new Date(),
          });

          return createAuthResponse(savedUser, accessToken, refreshToken);
        },
      );

      return result;
    } catch (error) {
      this.logger.error(`Error creating user: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async signIn(
    email: string,
    password: string,
    userInfo: RequestInfo,
  ): Promise<AuthResponse> {
    const user = await this.findOneByEmailOrName(email);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await this.cryptoService.verifyPassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('User already deleted');
    }

    try {
      const result = await this.userRepository.manager.transaction(
        async (transactionalEntityManager) => {
          const accessToken = await this.generateTokens(
            user,
            false,
            userInfo?.deviceInfo,
            userInfo?.ipAddress,
          );
          const refreshToken = await this.generateTokens(user, true);

          // Pass transaction manager to ensure token is created within the transaction
          await this.tokenService.createRefreshToken(
            user.id,
            refreshToken,
            transactionalEntityManager,
            userInfo?.deviceInfo,
            userInfo?.ipAddress,
          );

          await transactionalEntityManager.update(User, user.id, {
            lastLoginAt: new Date(),
          });

          return createAuthResponse(user, accessToken, refreshToken);
        },
      );

      return result;
    } catch (error) {
      this.logger.error(`Error signing in user: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to sign in user');
    }
  }

  async refreshToken(
    token: string,
    userInfo: RequestInfo,
  ): Promise<AuthResponse> {
    try {
      const payload = await this.jwtService.verifyRefreshToken(token);

      // Find token in tokens table
      const refreshTokenHash =
        await this.cryptoService.createRefreshTokenHash(token);
      const tokenRecord =
        await this.tokenService.findRefreshTokenByHash(refreshTokenHash);

      if (!tokenRecord || tokenRecord.userId !== payload.sub) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (tokenRecord.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token expired');
      }

      if (tokenRecord.deletedAt) {
        throw new UnauthorizedException('Refresh token revoked');
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const result = await this.userRepository.manager.transaction(
        async (transactionalEntityManager) => {
          const accessToken = await this.generateTokens(
            user,
            false,
            userInfo?.deviceInfo,
            userInfo?.ipAddress,
          );

          // Update last used timestamp for the refresh token within the transaction
          await this.tokenService.updateLastUsed(
            tokenRecord.id,
            transactionalEntityManager,
          );

          await transactionalEntityManager.update(User, user.id, {
            lastLoginAt: new Date(),
          });

          return createAuthResponse(
            user,
            accessToken,
            token, // Return the same refresh token
          );
        },
      );

      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(
        `Error refreshing token: ${error.message}`,
        error.stack,
      );
      throw new UnauthorizedException('Failed to refresh token');
    }
  }

  async logout(userId: number, token?: string): Promise<void> {
    try {
      if (token) {
        await this.userRepository.manager.transaction(
          async (transactionalEntityManager) => {
            // Revoke specific token within transaction
            const refreshTokenHash =
              await this.cryptoService.createRefreshTokenHash(token);
            const tokenRecord =
              await this.tokenService.findRefreshTokenByHash(refreshTokenHash);

            if (tokenRecord && tokenRecord.userId === userId) {
              await this.tokenService.revokeToken(
                tokenRecord.id,
                transactionalEntityManager,
              );
            }
          },
        );
      } else {
        // For multiple tokens, a transaction might be less important
        // but you could add one if needed
        await this.tokenService.revokeAllUserTokens(userId);
      }
    } catch (error) {
      this.logger.error(`Error during logout: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to logout');
    }
  }
}
