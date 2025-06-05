import { BaseEntity } from '@app/common/entities/base.entity';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { Token } from '../../auth/entities/tokens.entity';
import { Order } from '../../orders/entities/orders.entity';

@Entity('users')
@Index(['isAdmin']) // Admin user filtering
@Index(['createdAt']) // User registration date filtering
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string; // Already indexed due to unique constraint
  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatar?: string;

  @Column({ type: 'boolean', name: 'is_admin', default: false })
  isAdmin: boolean;

  @Column({ type: 'timestamp', name: 'last_login_at', nullable: true })
  lastLoginAt?: Date;

  // Relations with proper indexing
  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => Token, (token) => token.user)
  tokens: Token[];
}
