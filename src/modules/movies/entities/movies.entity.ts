import { BaseEntity } from '@app/common/entities/base.entity';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { MovieSchedule } from '../../orders/entities/movies-schedule.entity';
import { MovieTag } from './movie-tag.entity';

@Entity('movies')
@Index(['title']) // Movie search by title
@Index(['playUntil']) // Active movies filter
@Index(['title', 'playUntil']) // Composite: active movies search
@Index(['createdAt', 'playUntil']) // Recently added active movies
export class Movie extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  overview: string;

  @Column({ type: 'varchar', length: 255 })
  poster: string;
  @Column({ type: 'datetime', name: 'play_until' })
  playUntil: Date;
  @Column({ type: 'bigint', name: 'tmdb_id', nullable: true, unique: true })
  tmdbId?: number;

  // Add search optimization fields
  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index() // Full-text search optimization
  searchKeywords?: string; // Combined title + overview keywords

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  @Index() // Sort by rating
  rating?: number;

  @OneToMany(() => MovieTag, (movieTag) => movieTag.movie, { cascade: true })
  movieTags: MovieTag[];

  @OneToMany(() => MovieSchedule, (schedule) => schedule.movie)
  schedules: MovieSchedule[];
}
