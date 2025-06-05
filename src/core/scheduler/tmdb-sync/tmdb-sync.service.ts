import { MovieTag } from '@app/modules/movies/entities/movie-tag.entity';
import { Movie } from '@app/modules/movies/entities/movies.entity';
import { Tag } from '@app/modules/movies/entities/tags.entity';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { MovieConvertService } from './movie-convert/movie-convert.service';
import { TmdbClientService } from './tmdb-client/tmdb-client.service';

@Injectable()
export class TmdbSyncService {
  private readonly logger = new Logger(TmdbSyncService.name);
  private readonly maxPagesPerSync: number;

  constructor(
    private readonly tmdbService: TmdbClientService,
    private readonly movieService: MovieConvertService,
    private readonly configService: ConfigService,
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(MovieTag)
    private readonly movieTagRepository: Repository<MovieTag>,
  ) {
    this.maxPagesPerSync = this.configService.get<number>(
      'TMDB_MAX_PAGES_PER_SYNC',
      3,
    );
  }

  private get syncEnabled(): boolean {
    return this.configService.get<boolean>('TMDB_SYNC_ENABLED', true);
  }
  // Sync now playing movies every 2 hours
  @Cron('0 */2 * * *', {
    name: 'sync-now-playing-movies',
    timeZone: 'UTC',
  })
  async syncNowPlayingMovies() {
    if (!this.syncEnabled) {
      this.logger.log('TMDB sync is disabled');
      return;
    }

    try {
      this.logger.log('Starting now playing movies sync...');
      await this.syncMoviePages('now_playing');
      this.logger.log('Now playing movies sync completed successfully');
    } catch (error) {
      this.logger.error('Now playing movies sync failed:', error.message);
      // Don't throw - let the scheduler continue with next iteration
    }
  }

  // Daily comprehensive sync with cleanup
  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: 'daily-comprehensive-sync',
    timeZone: 'UTC',
  })
  async dailyComprehensiveSync() {
    if (!this.syncEnabled) {
      this.logger.log('TMDB daily sync is disabled');
      return;
    }

    this.logger.log('Starting daily comprehensive sync...');

    try {
      // Sync movies
      await this.syncMoviePages('now_playing', 5);

      // Perform cleanup
      await this.cleanupExpiredMovies();

      // Maintenance tasks
      await this.performMaintenanceTasks();

      this.logger.log('Daily comprehensive sync completed successfully');
    } catch (error) {
      this.logger.error('Daily comprehensive sync failed:', error.stack);
    }
  }

  // Weekly deep sync for more comprehensive data
  @Cron(CronExpression.EVERY_WEEK, {
    name: 'weekly-deep-sync',
    timeZone: 'UTC',
  })
  async weeklyDeepSync() {
    if (!this.syncEnabled) {
      this.logger.log('TMDB weekly sync is disabled');
      return;
    }

    this.logger.log('Starting weekly deep sync...');

    try {
      // Sync more pages for comprehensive coverage
      await this.syncMoviePages('now_playing', 10);

      // Additional maintenance
      await this.performMaintenanceTasks();

      this.logger.log('Weekly deep sync completed successfully');
    } catch (error) {
      this.logger.error('Weekly deep sync failed:', error.stack);
    }
  }

  private async syncMoviePages(
    endpoint: 'now_playing',
    maxPages: number = this.maxPagesPerSync,
  ): Promise<void> {
    let currentPage = 1;
    let totalMoviesSynced = 0;

    try {
      while (currentPage <= maxPages) {
        this.logger.log(`Syncing ${endpoint} movies - Page ${currentPage}`);

        try {
          // Fetch movies from TMDB
          const response =
            await this.tmdbService.getNowPlayingMovies(currentPage);

          if (!response.results || response.results.length === 0) {
            this.logger.log(
              `No more movies found on page ${currentPage}, stopping sync`,
            );
            break;
          }

          // Use the existing upsertMovies method which handles duplicates
          await this.movieService.upsertMovies(response.results);
          totalMoviesSynced += response.results.length;

          // Rate limiting to avoid overwhelming TMDB API
          if (currentPage < maxPages) {
            await this.sleep(1000); // 1 second delay between pages
          }

          currentPage++;

          // Stop if we've reached the total pages available
          if (currentPage > response.total_pages) {
            this.logger.log(
              `Reached last page (${response.total_pages}), stopping sync`,
            );
            break;
          }
        } catch (error) {
          this.logger.error(
            `Failed to fetch page ${currentPage} from TMDB: ${error.message}`,
          );

          // For API errors, stop the sync
          if (
            error.message.includes('authentication') ||
            error.message.includes('rate limit')
          ) {
            this.logger.error('Critical API error, stopping sync');
            break;
          }

          // For other errors, try next page
          currentPage++;
          continue;
        }
      }
      this.logger.log(
        `Sync completed. Total movies processed: ${totalMoviesSynced} from ${currentPage - 1} pages`,
      );
    } catch (error) {
      this.logger.error(`Movie sync failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async cleanupExpiredMovies(): Promise<void> {
    try {
      this.logger.log('Starting cleanup of expired movies...');

      // Delete movies where playUntil date has passed
      const result = await this.movieRepository.delete({
        playUntil: LessThan(new Date()),
      });

      const deletedCount = result.affected || 0;
      this.logger.log(
        `Cleanup completed. Deleted ${deletedCount} expired movies`,
      );
    } catch (error) {
      this.logger.error('Failed to cleanup expired movies:', error.stack);
    }
  }

  private async performMaintenanceTasks(): Promise<void> {
    try {
      this.logger.log('Performing maintenance tasks...');

      // Update tag usage counts
      await this.updateTagUsageCounts();

      // Clean up orphaned tags
      await this.cleanupOrphanedTags();

      this.logger.log('Maintenance tasks completed');
    } catch (error) {
      this.logger.error('Maintenance tasks failed:', error.stack);
    }
  }

  private async updateTagUsageCounts(): Promise<void> {
    try {
      // Get all tags with their actual usage counts
      const tags = await this.tagRepository
        .createQueryBuilder('tag')
        .leftJoin('tag.movieTags', 'movieTag')
        .select(['tag.id', 'COUNT(movieTag.id) as actualCount'])
        .groupBy('tag.id')
        .getRawMany();

      // Update each tag's usage count
      for (const tag of tags) {
        await this.tagRepository.update(
          { id: tag.tag_id },
          { usageCount: parseInt(tag.actualCount) || 0 },
        );
      }

      this.logger.log(`Updated usage counts for ${tags.length} tags`);
    } catch (error) {
      this.logger.error('Failed to update tag usage counts:', error.stack);
    }
  }

  private async cleanupOrphanedTags(): Promise<void> {
    try {
      // Delete tags that are not associated with any movies
      const result = await this.tagRepository
        .createQueryBuilder('tag')
        .leftJoin('tag.movieTags', 'movieTag')
        .where('movieTag.id IS NULL')
        .delete()
        .execute();

      const deletedCount = result.affected || 0;
      this.logger.log(`Cleaned up ${deletedCount} orphaned tags`);
    } catch (error) {
      this.logger.error('Failed to cleanup orphaned tags:', error.stack);
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
