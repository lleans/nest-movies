import { BaseEntity } from '@app/common/entities/base.entity';
import { Entity, ManyToOne, JoinColumn, Index, Column } from 'typeorm';
import { Movie } from './movies.entity';
import { Tag } from './tags.entity';

@Entity('movie_tags')
@Index(['movieId', 'tagId'], { unique: true }) // Prevent duplicates
@Index(['movieId']) // Movies by tag queries
@Index(['tagId']) // Tags by movie queries
@Index(['movieId', 'deletedAt']) // Active movie tags
@Index(['tagId', 'deletedAt']) // Active tag movies
export class MovieTag extends BaseEntity {
  @ManyToOne(() => Movie, (movie) => movie.movieTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'movie_id' })
  movie: Movie;

  @ManyToOne(() => Tag, (tag) => tag.movieTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;

  @Column({ type: 'bigint', name: 'movie_id' })
  movieId: number;

  @Column({ type: 'bigint', name: 'tag_id' })
  tagId: number;
}
