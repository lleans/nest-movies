import { BaseEntity } from '@app/common/entities/base.entity';
import { Seat } from '@app/modules/studio/entities/seats.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { MovieSchedule } from './movies-schedule.entity';
import { Order } from './orders.entity';

export enum SeatStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  PENDING = 'PENDING',
  EXPIRED = 'EXPIRED',
}

@Entity('order_items')
@Index(['orderId']) // Order items lookup
@Index(['movieScheduleId']) // Schedule booking tracking
@Index(['orderId', 'movieScheduleId']) // Prevent duplicate bookings
@Index(['seatId', 'movieScheduleId']) // Prevent double seat booking
export class OrderItem extends BaseEntity {
  @ManyToOne(() => Order, (order) => order.orderItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => MovieSchedule, (schedule) => schedule.orderItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'movie_schedule_id' })
  movieSchedule: MovieSchedule;

  @ManyToOne(() => Seat, (seat) => seat.orderItems)
  @JoinColumn({ name: 'seat_id' })
  seat: Seat;

  @Column({ type: 'bigint', name: 'order_id' })
  orderId: number;

  @Column({ type: 'bigint', name: 'movie_schedule_id' })
  movieScheduleId: number;

  @Column({ type: 'bigint', name: 'seat_id' })
  seatId: number;

  @Column({ type: 'int', default: 1 })
  qty: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'sub_total_price' })
  subTotalPrice: number;

  @Column({
    type: 'enum',
    enum: SeatStatus,
    default: SeatStatus.PENDING,
  })
  status: SeatStatus;

  @Column({ type: 'json' })
  snapshots: {
    movieTitle: string;
    moviePoster: string;
    studioNumber: number;
    startTime: string;
    endTime: string;
    date: string;
    priceAtPurchase: number;
    seatLabel?: string;
  };
}
