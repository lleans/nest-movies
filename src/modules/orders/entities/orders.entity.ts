import { BaseEntity } from '@app/common/entities/base.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/users.entity';
import { OrderItem } from './order-item.entity';

export enum PaymentMethod {
  CASH = 'CASH',
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity('orders')
// ⚡ Critical indexes for order management
@Index(['userId']) // User order history
@Index(['status']) // Order status filtering
@Index(['expiresAt']) // Expiry job processing
@Index(['createdAt', 'status']) // Recent orders by status
@Index(['userId', 'status']) // User orders by status
@Index(['status', 'expiresAt']) // Pending expired orders
@Index(['paidAt']) // Payment history
export class Order extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'bigint', name: 'user_id' })
  userId: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    name: 'payment_method',
  })
  paymentMethod: PaymentMethod;
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'total_item_price',
  })
  totalItemPrice: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ type: 'varchar', length: 100, unique: true })
  orderNumber: string;

  @Column({ type: 'datetime', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'datetime', name: 'paid_at', nullable: true })
  paidAt?: Date;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, { cascade: true })
  orderItems: OrderItem[];
}
