import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CryptoService } from './utils/crypto/crypto.service';
import { JwtService } from './utils/jwt/jwt.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}), // Register without options, we'll provide them in the service
  ],
  providers: [CryptoService, ConfigService, JwtService],
  exports: [CryptoService, JwtService],
})
export class CommonModule {}
