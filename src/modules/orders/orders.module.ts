import { QueueModule } from '@app/core/queue/queue.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Movie } from '../movies/entities/movies.entity';
import { Seat } from '../studio/entities/seats.entity';
import { Studio } from '../studio/entities/studio.entity';
import { User } from '../users/entities/users.entity';
import { UsersModule } from '../users/users.module';
import { MovieScheduleController } from './controllers/movie-schedule.controller';
import { OrdersController } from './controllers/orders.controller';
import { MovieSchedule } from './entities/movies-schedule.entity';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/orders.entity';
import { OrderExpiryProcessor } from './processors/order-expiry.processor';
import { MovieScheduleService } from './services/movie-schedule.service';
import { OrdersService } from './services/orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      MovieSchedule,
      Movie,
      Studio,
      Seat,
      User,
    ]),
    QueueModule,
    AuthModule,
    UsersModule,
    BullModule.registerQueue({
      name: 'order-expiry',
    }),
  ],
  controllers: [OrdersController, MovieScheduleController],
  providers: [OrdersService, MovieScheduleService, OrderExpiryProcessor],
  exports: [OrdersService, MovieScheduleService],
})
export class OrdersModule {}
