import { BaseEntity } from '@app/common/entities/base.entity';
import { Entity, Column, OneToMany, Index } from 'typeorm';
import { MovieTag } from './movie-tag.entity';

@Entity('tags')
@Index(['name', 'deletedAt']) // Active tags search
export class Tag extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  slug: string;

  // Add usage tracking for popular tags
  @Column({ type: 'int', default: 0 })
  @Index() // Sort by popularity
  usageCount: number;

  @OneToMany(() => MovieTag, (movieTag) => movieTag.tag)
  movieTags: MovieTag[];
}
