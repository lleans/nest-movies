import { BaseEntity } from '@app/common/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { User } from '../../users/entities/users.entity';

@Entity('tokens')
@Index(['userId']) // Optimize queries by user and token type
@Index(['expiresAt']) // Optimize cleanup queries
@Index(['tokenHash'], { unique: true }) // Ensure token uniqueness
export class Token extends BaseEntity {
  @Column({ type: 'bigint', name: 'user_id' })
  userId: number;

  @Column({ type: 'varchar', length: 500, name: 'token_hash' })
  tokenHash: string;

  @Column({ type: 'datetime', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'datetime', name: 'last_used_at', nullable: true })
  lastUsedAt?: Date;

  @Column({ type: 'varchar', length: 255, name: 'device_info', nullable: true })
  deviceInfo?: string;

  @Column({ type: 'varchar', length: 45, name: 'ip_address', nullable: true })
  ipAddress?: string;
  // Relations
  @ManyToOne(() => User, (user) => user.tokens, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
