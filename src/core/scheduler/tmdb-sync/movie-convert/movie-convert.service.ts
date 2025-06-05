import { TMDB_CONFIG } from '@app/common/config/tmdb.config';
import { TmdbConfig } from '@app/common/types/env.type';
import { MovieTag } from '@app/modules/movies/entities/movie-tag.entity';
import { Movie } from '@app/modules/movies/entities/movies.entity';
import { Tag } from '@app/modules/movies/entities/tags.entity';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TMDBMovie } from '../tmdb-client/tmdb-client.service';

@Injectable()
export class MovieConvertService implements OnModuleInit {
  private readonly logger = new Logger(MovieConvertService.name);
  private readonly imgBaseUrl: string;

  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(MovieTag)
    private readonly movieTagRepository: Repository<MovieTag>,
    private readonly configService: ConfigService,
  ) {
    this.imgBaseUrl =
      this.configService.get<TmdbConfig>(TMDB_CONFIG)?.imageUrl!;
  }
  async upsertMovies(tmdbMovies: TMDBMovie[]): Promise<void> {
    this.logger.log(`Processing ${tmdbMovies.length} movies for database sync`);

    let successCount = 0;
    let errorCount = 0;

    for (const tmdbMovie of tmdbMovies) {
      try {
        await this.upsertSingleMovie(tmdbMovie);
        successCount++;
      } catch (error) {
        errorCount++;
        this.logger.error(
          `Failed to process movie "${tmdbMovie.title}" (TMDB ID: ${tmdbMovie.id}):`,
          error.message,
        );
        // Continue with other movies instead of failing completely
        continue;
      }
    }

    this.logger.log(
      `Movie sync completed. Success: ${successCount}, Errors: ${errorCount}, Total: ${tmdbMovies.length}`,
    );

    // Only throw if all movies failed
    if (errorCount === tmdbMovies.length && tmdbMovies.length > 0) {
      throw new Error(`All ${tmdbMovies.length} movies failed to sync`);
    }
  }
  private async upsertSingleMovie(tmdbMovie: TMDBMovie): Promise<Movie> {
    try {
      // Check if movie already exists by tmdbId
      let movie = await this.movieRepository.findOne({
        where: { tmdbId: tmdbMovie.id },
        relations: ['movieTags', 'movieTags.tag'],
      });

      const movieData = this.transformTMDBToEntity(tmdbMovie);

      if (movie) {
        // Update existing movie
        Object.assign(movie, movieData);
        movie = await this.movieRepository.save(movie);
      } else {
        // Create new movie
        movie = this.movieRepository.create(movieData);
        movie = await this.movieRepository.save(movie);
      }

      // Handle genre tags
      await this.syncMovieGenres(movie, tmdbMovie.genre_ids);

      return movie;
    } catch (error) {
      this.logger.error(
        `Failed to upsert movie "${tmdbMovie.title}" (TMDB ID: ${tmdbMovie.id}):`,
        error.message,
      );
      throw error;
    }
  }

  private transformTMDBToEntity(tmdbMovie: TMDBMovie): Partial<Movie> {
    // Calculate play until date (e.g., 6 months from release date or current date)
    const playUntilDate = new Date();
    if (tmdbMovie.release_date) {
      const releaseDate = new Date(tmdbMovie.release_date);
      playUntilDate.setTime(
        Math.max(releaseDate.getTime(), new Date().getTime()),
      );
    }
    playUntilDate.setMonth(playUntilDate.getMonth() + 6); // Play for 6 months

    // Generate search keywords
    const searchKeywords = this.generateSearchKeywords(tmdbMovie);

    return {
      title: tmdbMovie.title,
      overview: tmdbMovie.overview || '',
      poster: tmdbMovie.poster_path
        ? `${this.imgBaseUrl}/${tmdbMovie.poster_path}`
        : '',
      playUntil: playUntilDate,
      tmdbId: tmdbMovie.id,
      searchKeywords,
      rating: tmdbMovie.vote_average || 0,
    };
  }

  private generateSearchKeywords(tmdbMovie: TMDBMovie): string {
    const keywords = [
      tmdbMovie.title,
      tmdbMovie.original_title,
      ...tmdbMovie.overview.split(' ').filter((word) => word.length > 3), // Extract meaningful words
    ];

    return keywords
      .filter(Boolean)
      .map((keyword) => keyword.toLowerCase())
      .join(' ')
      .substring(0, 255); // Limit to column length
  }
  private async syncMovieGenres(
    movie: Movie,
    genreIds: number[],
  ): Promise<void> {
    if (!genreIds || genreIds.length === 0) return;

    // TMDB Genre ID to name mapping
    const genreMapping = this.getTMDBGenreMapping();

    try {
      // Get or create genre tags
      const genreTags = await Promise.all(
        genreIds.map(async (genreId) => {
          const genreName = genreMapping[genreId];
          if (!genreName) return null;

          try {
            return await this.getOrCreateTag(genreName, 'genre');
          } catch (error) {
            this.logger.error(
              `Failed to get or create tag for genre ${genreName}:`,
              error.message,
            );
            return null;
          }
        }),
      );

      const validGenreTags = genreTags.filter(Boolean);

      // Get existing movie tags for this movie
      const existingMovieTags = await this.movieTagRepository.find({
        where: { movieId: movie.id },
        relations: ['tag'],
      });

      const existingTagIds = new Set(existingMovieTags.map((mt) => mt.tag.id));

      // Add new genre tags (only if they don't already exist)
      const movieTagsToCreate = validGenreTags
        .filter((tag) => tag && !existingTagIds.has(tag.id))
        .map((tag) => ({
          movieId: movie.id,
          tagId: tag!.id,
        }));

      if (movieTagsToCreate.length > 0) {
        try {
          await this.movieTagRepository.save(movieTagsToCreate);

          // Update usage count for tags
          await Promise.all(
            movieTagsToCreate.map(async (movieTag) => {
              try {
                await this.tagRepository.increment(
                  { id: movieTag.tagId },
                  'usageCount',
                  1,
                );
              } catch (error) {
                this.logger.warn(
                  `Failed to increment usage count for tag ${movieTag.tagId}:`,
                  error.message,
                );
              }
            }),
          );
        } catch (error) {
          // Handle duplicate movie-tag relationship
          if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') {
            this.logger.warn(
              `Some movie-tag relationships already exist for movie "${movie.title}", skipping duplicates...`,
            );
          } else {
            this.logger.error(
              `Failed to create movie-tag relationships for movie "${movie.title}":`,
              error.message,
            );
            throw error;
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to sync genres for movie "${movie.title}":`,
        error.message,
      );
      throw error;
    }
  }
  private async getOrCreateTag(
    name: string,
    type: string = 'genre',
  ): Promise<Tag> {
    const slug = `${type}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    try {
      // Try to find existing tag by name first (most reliable)
      let tag = await this.tagRepository.findOne({
        where: { name },
      });

      if (tag) {
        return tag;
      }

      // Try to find by slug as fallback
      tag = await this.tagRepository.findOne({
        where: { slug },
      });

      if (tag) {
        return tag;
      }

      // Create new tag only if it doesn't exist
      tag = this.tagRepository.create({
        name: name,
        slug,
        usageCount: 0,
      });

      tag = await this.tagRepository.save(tag);
      return tag;
    } catch (error) {
      // Handle duplicate tag creation at database level
      if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') {
        this.logger.warn(
          `Tag "${name}" already exists due to race condition, retrieving existing tag...`,
        );

        // Try to fetch the existing tag again
        let existingTag = await this.tagRepository.findOne({
          where: { name },
        });

        if (!existingTag) {
          existingTag = await this.tagRepository.findOne({
            where: { slug },
          });
        }

        if (existingTag) {
          return existingTag;
        } else {
          // This should rarely happen, but handle it gracefully
          this.logger.error(
            `Could not retrieve existing tag after duplicate error: ${name}`,
          );
          throw new Error(`Could not create or retrieve tag: ${name}`);
        }
      } else {
        this.logger.error(
          `Unexpected error creating tag "${name}":`,
          error.message,
        );
        throw error;
      }
    }
  }

  private getTMDBGenreMapping(): Record<number, string> {
    return {
      28: 'Action',
      12: 'Adventure',
      16: 'Animation',
      35: 'Comedy',
      80: 'Crime',
      99: 'Documentary',
      18: 'Drama',
      10751: 'Family',
      14: 'Fantasy',
      36: 'History',
      27: 'Horror',
      10402: 'Music',
      9648: 'Mystery',
      10749: 'Romance',
      878: 'Science Fiction',
      10770: 'TV Movie',
      53: 'Thriller',
      10752: 'War',
      37: 'Western',
    };
  }

  async getMovieStats(): Promise<{
    total: number;
    lastSync: Date;
    recentlyAdded: number;
    activeMovies: number;
    topGenres: Array<{ name: string; count: number }>;
  }> {
    const total = await this.movieRepository.count();

    const lastSyncResult = await this.movieRepository
      .createQueryBuilder('movie')
      .select('MAX(movie.updatedAt)', 'lastSync')
      .getRawOne();

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const recentlyAdded = await this.movieRepository
      .createQueryBuilder('movie')
      .where('movie.createdAt > :date', { date: oneDayAgo })
      .getCount();

    const activeMovies = await this.movieRepository
      .createQueryBuilder('movie')
      .where('movie.playUntil > :now', { now: new Date() })
      .getCount();

    // Get top genres
    const topGenres = await this.tagRepository
      .createQueryBuilder('tag')
      .select(['tag.name as name', 'tag.usageCount as count'])
      .where('tag.slug LIKE :prefix', { prefix: 'genre-%' })
      .orderBy('tag.usageCount', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      total,
      lastSync: lastSyncResult.lastSync,
      recentlyAdded,
      activeMovies,
      topGenres,
    };
  }

  async searchMovies(query: string, limit: number = 20): Promise<Movie[]> {
    return await this.movieRepository
      .createQueryBuilder('movie')
      .leftJoinAndSelect('movie.movieTags', 'movieTags')
      .leftJoinAndSelect('movieTags.tag', 'tag')
      .where('movie.playUntil > :now', { now: new Date() })
      .andWhere(
        '(movie.title LIKE :query OR movie.searchKeywords LIKE :query OR movie.overview LIKE :query)',
        { query: `%${query}%` },
      )
      .orderBy('movie.rating', 'DESC')
      .limit(limit)
      .getMany();
  }

  async getMoviesByGenre(
    genreName: string,
    limit: number = 20,
  ): Promise<Movie[]> {
    return await this.movieRepository
      .createQueryBuilder('movie')
      .innerJoin('movie.movieTags', 'movieTags')
      .innerJoin('movieTags.tag', 'tag')
      .where('movie.playUntil > :now', { now: new Date() })
      .andWhere('tag.name = :genreName', { genreName })
      .orderBy('movie.rating', 'DESC')
      .limit(limit)
      .getMany();
  }
  async onModuleInit() {
    // Initialize all TMDB genre tags at service startup
    await this.initializeGenreTags();
  }

  private async initializeGenreTags(): Promise<void> {
    try {
      this.logger.log('Initializing TMDB genre tags...');

      const genreMapping = this.getTMDBGenreMapping();
      const genreNames = Object.values(genreMapping);

      let createdCount = 0;
      let existingCount = 0;

      for (const genreName of genreNames) {
        try {
          const tag = await this.getOrCreateTag(genreName, 'genre');
          if (tag) {
            // Check if it was just created by checking if usageCount is 0
            if (tag.usageCount === 0) {
              createdCount++;
            } else {
              existingCount++;
            }
          }
        } catch (error) {
          this.logger.warn(
            `Failed to initialize genre tag "${genreName}":`,
            error.message,
          );
        }
      }

      this.logger.log(
        `Genre tags initialized. Created: ${createdCount}, Existing: ${existingCount}`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize genre tags:', error.message);
      // Don't throw here - service should still work even if initialization fails
    }
  }
}
