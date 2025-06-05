import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MovieSchedule } from '../orders/entities/movies-schedule.entity';
import { User } from '../users/entities/users.entity';
import { MoviesController } from './controllers/movies.controller';
import { TagsController } from './controllers/tags.controller';
import { MovieTag } from './entities/movie-tag.entity';
import { Movie } from './entities/movies.entity';
import { Tag } from './entities/tags.entity';
import { MoviesService } from './services/movies.service';
import { TagsService } from './services/tags.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Movie, Tag, MovieTag, MovieSchedule, User]),
    AuthModule,
  ],
  controllers: [MoviesController, TagsController],
  providers: [MoviesService, TagsService],
  exports: [MoviesService, TagsService, TypeOrmModule],
})
export class MoviesModule {}
