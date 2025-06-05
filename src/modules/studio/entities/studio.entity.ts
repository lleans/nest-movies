import { BaseEntity } from '@app/common/entities/base.entity';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { MovieSchedule } from '../../orders/entities/movies-schedule.entity';
import { Seat } from './seats.entity';

@Entity('studios')
@Index(['seatCapacity']) // Capacity-based filtering
@Index(['hasImax', 'has3D']) // Feature-based search
export class Studio extends BaseEntity {
  @Column({ type: 'int', name: 'studio_number', unique: true })
  studioNumber: number;

  @Column({ type: 'int', name: 'seat_capacity' })
  seatCapacity: number;

  @Column({ type: 'boolean', default: false })
  hasImax: boolean;

  @Column({ type: 'boolean', default: false })
  has3D: boolean;

  // Add studio status tracking
  @Column({ type: 'boolean', default: true })
  @Index() // Active/maintenance filtering
  isActive: boolean;

  @OneToMany(() => MovieSchedule, (schedule) => schedule.studio)
  schedules: MovieSchedule[];

  @OneToMany(() => Seat, (seat) => seat.studio)
  seats: Seat[];
}
