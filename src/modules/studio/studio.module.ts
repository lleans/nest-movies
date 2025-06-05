import { AuthModule } from '@app/modules/auth/auth.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/users.entity';
import { SeatController } from './controllers/seat.controller';
import { StudioController } from './controllers/studio.controller';
import { Seat } from './entities/seats.entity';
import { Studio } from './entities/studio.entity';
import { SeatService } from './services/seat.service';
import { StudioService } from './services/studio.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Studio, Seat, User]),
    AuthModule, // For AdminGuard dependencies
  ],
  controllers: [StudioController, SeatController],
  providers: [StudioService, SeatService],
  exports: [StudioService, SeatService],
})
export class StudioModule {}
