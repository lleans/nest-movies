import { MovieConvertService } from '@app/core/scheduler/tmdb-sync/movie-convert/movie-convert.service';
import { Token } from '@app/modules/auth/entities/tokens.entity';
import { MovieTag } from '@app/modules/movies/entities/movie-tag.entity';
import { Movie } from '@app/modules/movies/entities/movies.entity';
import { Tag } from '@app/modules/movies/entities/tags.entity';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TmdbClientService } from './tmdb-sync/tmdb-client/tmdb-client.service';
import { TmdbSyncService } from './tmdb-sync/tmdb-sync.service';
import { TokenCleanupService } from './token-cleanup/token-cleanup.service';
@Module({
  imports: [
    ScheduleModule.forRoot(),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    TypeOrmModule.forFeature([Movie, Tag, MovieTag, Token]),
  ],
  providers: [
    TmdbClientService,
    MovieConvertService,
    TmdbSyncService,
    TokenCleanupService,
  ],
  exports: [TmdbSyncService, MovieConvertService, TokenCleanupService],
})
export class SchedulerModule {}
