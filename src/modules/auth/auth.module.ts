import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/users.entity';
import { AuthController } from './controller/auth.controller';
import { Token } from './entities/tokens.entity';
import { AdminGuard } from './guards/admin.guard';
import { AuthService } from './service/auth.service';
import { TokenService } from './service/token.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

@Module({
  imports: [TypeOrmModule.forFeature([User, Token]), ConfigModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    AdminGuard,
  ],
  exports: [AdminGuard, TokenService],
})
export class AuthModule {}
