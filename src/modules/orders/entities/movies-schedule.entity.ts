import { BaseEntity } from '@app/common/entities/base.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Movie } from '../../movies/entities/movies.entity';
import { Studio } from '../../studio/entities/studio.entity';
import { OrderItem } from './order-item.entity';

@Entity('movie_schedules')
// ⚡ Critical indexes for movie booking queries
@Index(['date', 'startTime']) // Schedule lookup by date/time
@Index(['movieId', 'date']) // Movie schedules by date
@Index(['studioId', 'date']) // Studio schedules by date
@Index(['movieId', 'studioId', 'date']) // Composite: movie in studio on date
@Index(['date', 'startTime', 'deletedAt']) // Active schedules by time
@Index(['startTime', 'endTime']) // Time overlap queries
@Index(['price']) // Price-based filtering
@Index(['date', 'movieId', 'startTime']) // User schedule search optimization
export class MovieSchedule extends BaseEntity {
  @ManyToOne(() => Movie, (movie) => movie.schedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'movie_id' })
  movie: Movie;

  @ManyToOne(() => Studio, (studio) => studio.schedules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'studio_id' })
  studio: Studio;
  @Column({ type: 'datetime', name: 'start_time' })
  startTime: Date;

  @Column({ type: 'datetime', name: 'end_time' })
  endTime: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'bigint', name: 'movie_id' })
  movieId: number;

  @Column({ type: 'bigint', name: 'studio_id' })
  studioId: number;

  // Add seat tracking for availability
  @Column({ type: 'int', default: 0 })
  @Index() // Quick availability check
  bookedSeats: number;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.movieSchedule)
  orderItems: OrderItem[];
}
