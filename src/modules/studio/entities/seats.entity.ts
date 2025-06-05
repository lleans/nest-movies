import { BaseEntity } from '@app/common/entities/base.entity';
import { OrderItem } from '@app/modules/orders/entities/order-item.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Studio } from './studio.entity';

@Entity('seats')
@Index(['studioId', 'id']) // Index for faster lookup of seats by studio
export class Seat extends BaseEntity {
  @Column({ name: 'studio_id' })
  studioId: number;

  @Column({ name: 'row_label', length: 10 })
  rowLabel: string;

  @Column({ name: 'seat_number' })
  seatNumber: number;

  @ManyToOne(() => Studio, (studio) => studio.seats)
  @JoinColumn({ name: 'studio_id' })
  studio: Studio;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.seat)
  orderItems: OrderItem[];
}
