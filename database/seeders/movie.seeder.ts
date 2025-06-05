import { MovieTag } from '@app/modules/movies/entities/movie-tag.entity';
import { Movie } from '@app/modules/movies/entities/movies.entity';
import { Tag } from '@app/modules/movies/entities/tags.entity';
import axios from 'axios';
import { config } from 'dotenv';
import { DataSource, Repository } from 'typeorm';
import { Seeder } from './seeder.interface';

// Load environment variables
config();

// TMDB Interface types
interface TMDBResponse {
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  genre_ids: number[];
  vote_average: number;
  vote_count: number;
  popularity: number;
  adult: boolean;
  video: boolean;
  original_language: string;
}

export class MovieSeeder implements Seeder {
  private readonly tmdbApiKey: string;
  private readonly tmdbApiUrl: string;
  private readonly tmdbImageUrl: string;

  constructor(private readonly dataSource: DataSource) {
    // Get TMDB credentials from environment
    this.tmdbApiKey = process.env.TMDB_API_KEY || '';
    this.tmdbApiUrl =
      process.env.TMDB_API_URL || 'https://api.themoviedb.org/3';
    this.tmdbImageUrl =
      process.env.TMDB_IMAGE_URL || 'https://image.tmdb.org/t/p/w500';

    if (!this.tmdbApiKey) {
      console.warn('⚠️ TMDB_API_KEY not found in environment variables');
    }
  }
  async run(): Promise<void> {
    console.time('🎬 Seeding movies');
    console.log('🎬 Seeding movies from TMDB...');

    const movieRepository = this.dataSource.getRepository(Movie);
    const tagRepository = this.dataSource.getRepository(Tag);
    const movieTagRepository = this.dataSource.getRepository(MovieTag);

    try {
      // Fetch movies from TMDB
      if (!this.tmdbApiKey) {
        console.log('⚠️ Missing TMDB API key. Using fallback sample data...');
        await this.seedSampleMovies(
          movieRepository,
          tagRepository,
          movieTagRepository,
        );
        return;
      }

      const tmdbMovies = await this.fetchMoviesFromTMDB();
      if (!tmdbMovies || tmdbMovies.length === 0) {
        console.log(
          '⚠️ No movies fetched from TMDB. Using fallback sample data...',
        );
        await this.seedSampleMovies(
          movieRepository,
          tagRepository,
          movieTagRepository,
        );
        return;
      }

      // Get all existing tags first to avoid duplicates
      const existingTags = await tagRepository.find();
      const existingTagsMap = new Map<string, Tag>();
      existingTags.forEach((tag) => {
        existingTagsMap.set(tag.name, tag);
      });

      // Create/get genre tags
      const genreMapping = this.getTMDBGenreMapping();
      const createdTags = new Map<string, Tag>();

      for (const [, genreName] of Object.entries(genreMapping)) {
        if (existingTagsMap.has(genreName)) {
          // Use existing tag
          createdTags.set(genreName, existingTagsMap.get(genreName)!);
          console.log(`📌 Using existing tag: ${genreName}`);
        } else {
          // Create new tag
          try {
            const tag = await this.getOrCreateTag(
              tagRepository,
              genreName,
              'genre',
            );
            createdTags.set(genreName, tag);
          } catch (error) {
            console.error(
              `❌ Failed to create/get tag "${genreName}":`,
              error.message,
            );
            // Continue with other tags
            continue;
          }
        }
      } // Process and save movies
      let newMoviesCount = 0;
      let updatedMoviesCount = 0;

      // Prepare arrays for bulk operations
      const moviesToInsert: Partial<Movie>[] = [];

      // Use this map to link TMDB IDs to actual DB movie IDs later
      const tmdbIdToMovieMap = new Map<number, number>();
      const tagRelationships: { tmdbId: number; tagIds: number[] }[] = [];

      for (const tmdbMovie of tmdbMovies) {
        try {
          // Check if movie already exists by TMDB ID or title
          const existingMovie = await movieRepository.findOne({
            where: [{ tmdbId: tmdbMovie.id }, { title: tmdbMovie.title }],
            relations: ['movieTags', 'movieTags.tag'],
          });

          let movie: Movie;
          if (existingMovie) {
            // Update existing movie
            const movieData = this.transformTMDBToEntity(tmdbMovie);
            Object.assign(existingMovie, movieData);
            movie = await movieRepository.save(existingMovie);
            updatedMoviesCount++;
            console.log(`🔄 Updated existing movie: ${movie.title}`);
          } else {
            // Create new movie - add to bulk insert array
            const movieData = this.transformTMDBToEntity(tmdbMovie);
            moviesToInsert.push(movieData);
            // Create a temporary movie object to use for tag relationships
            movie = movieRepository.create(movieData);
            newMoviesCount++;
          }

          // Handle movie-tag relationships
          if (tmdbMovie.genre_ids && tmdbMovie.genre_ids.length > 0) {
            // For existing movies, check existing tags
            const existingTagIds = new Set<number>();

            if (existingMovie) {
              // Get existing movie tags
              const existingMovieTags = await movieTagRepository.find({
                where: { movieId: existingMovie.id },
                relations: ['tag'],
              });

              existingMovieTags.forEach((mt) => existingTagIds.add(mt.tagId));
            }

            // Collect tag IDs for this movie
            const tagIdsForMovie: number[] = [];

            for (const genreId of tmdbMovie.genre_ids) {
              const genreName = genreMapping[genreId];
              if (genreName && createdTags.has(genreName)) {
                const tag = createdTags.get(genreName)!;

                // Only create movie-tag relationship if it doesn't exist
                if (!existingTagIds.has(tag.id)) {
                  try {
                    if (existingMovie) {
                      // For existing movies, create relationship immediately
                      const movieTag = movieTagRepository.create({
                        movieId: existingMovie.id,
                        tagId: tag.id,
                      });
                      await movieTagRepository.save(movieTag);
                    } else {
                      // For new movies, just collect the tag IDs
                      tagIdsForMovie.push(tag.id);
                    }

                    // Update tag usage count
                    await tagRepository.increment(
                      { id: tag.id },
                      'usageCount',
                      1,
                    );
                    console.log(
                      `🏷️ Added tag "${genreName}" to movie "${movie.title}"`,
                    );
                  } catch (error) {
                    // Handle duplicate movie-tag relationship
                    if (
                      error.code === 'ER_DUP_ENTRY' ||
                      error.code === '23505'
                    ) {
                      console.log(
                        `⚠️ Tag "${genreName}" already exists for movie "${movie.title}", skipping...`,
                      );
                    } else {
                      console.error(
                        `❌ Error adding tag "${genreName}" to movie "${movie.title}":`,
                        error.message,
                      );
                    }
                  }
                }
              }
            }

            // Store the tag IDs for this TMDB movie if it's a new movie
            if (!existingMovie && tagIdsForMovie.length > 0) {
              tagRelationships.push({
                tmdbId: tmdbMovie.id,
                tagIds: tagIdsForMovie,
              });
            }
          }
        } catch (error) {
          console.error(
            `❌ Error processing movie "${tmdbMovie.title}":`,
            error.message,
          );
          // Continue with other movies
          continue;
        }
      } // Process bulk inserts for new movies
      if (moviesToInsert.length > 0) {
        console.log(`Bulk inserting ${moviesToInsert.length} new movies...`);

        // Insert movies in chunks to avoid query size limitations
        const chunkSize = 50;
        for (let i = 0; i < moviesToInsert.length; i += chunkSize) {
          const chunk = moviesToInsert.slice(i, i + chunkSize);
          const result = await movieRepository
            .createQueryBuilder()
            .insert()
            .into(Movie)
            .values(chunk)
            .execute();

          // Map TMDB IDs to actual DB IDs
          if (result.identifiers && result.identifiers.length > 0) {
            for (let j = 0; j < chunk.length; j++) {
              const movie = chunk[j];
              const insertedId = result.identifiers[j].id;
              if (movie.tmdbId && insertedId) {
                tmdbIdToMovieMap.set(movie.tmdbId, insertedId);
              }
            }
          }
        }

        console.log(
          `✨ Created ${moviesToInsert.length} new movies via bulk insert`,
        );

        // Now create movie-tag relationships for newly inserted movies
        if (tagRelationships.length > 0) {
          console.log(`Creating movie-tag relationships for new movies...`);

          const movieTagsToInsert: Partial<MovieTag>[] = [];

          for (const relationship of tagRelationships) {
            const movieId = tmdbIdToMovieMap.get(relationship.tmdbId);
            if (movieId) {
              for (const tagId of relationship.tagIds) {
                movieTagsToInsert.push({
                  movieId,
                  tagId,
                });
              }
            }
          }

          if (movieTagsToInsert.length > 0) {
            // Insert movie-tag relationships in chunks
            const tagChunkSize = 100;
            for (let i = 0; i < movieTagsToInsert.length; i += tagChunkSize) {
              const chunk = movieTagsToInsert.slice(i, i + tagChunkSize);
              await movieTagRepository
                .createQueryBuilder()
                .insert()
                .into(MovieTag)
                .values(chunk)
                .execute();
            }

            console.log(
              `✨ Created ${movieTagsToInsert.length} movie-tag relationships via bulk insert`,
            );
          }
        }
      }

      console.timeEnd('🎬 Seeding movies');
      console.log(`✅ Movie seeding completed:`);
      console.log(`   📊 New movies created: ${newMoviesCount}`);
      console.log(`   🔄 Existing movies updated: ${updatedMoviesCount}`);
      console.log(
        `   🎬 Total movies processed: ${newMoviesCount + updatedMoviesCount}`,
      );
    } catch (error) {
      console.error('❌ Failed to seed movies:', error.message);
      console.log('⚠️ Using fallback sample data...');
      await this.seedSampleMovies(
        movieRepository,
        tagRepository,
        movieTagRepository,
      );
    }
  }

  private async fetchMoviesFromTMDB(): Promise<TMDBMovie[]> {
    try {
      console.log('🔍 Fetching movies from TMDB API...');

      // Set up headers for TMDB API
      const headers = {
        Authorization: `Bearer ${this.tmdbApiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      };

      // Fetch now playing and popular movies
      const nowPlayingResponse = await axios.get<TMDBResponse>(
        `${this.tmdbApiUrl}/movie/now_playing`,
        {
          params: {
            language: 'en-US',
            page: 1,
          },
          headers,
          timeout: 10000,
        },
      );

      const popularResponse = await axios.get<TMDBResponse>(
        `${this.tmdbApiUrl}/movie/popular`,
        {
          params: {
            language: 'en-US',
            page: 1,
          },
          headers,
          timeout: 10000,
        },
      );

      // Combine results and remove duplicates
      const allMovies = [
        ...nowPlayingResponse.data.results,
        ...popularResponse.data.results,
      ];
      const uniqueMovies = allMovies.filter(
        (movie, index, self) =>
          index === self.findIndex((m) => m.id === movie.id),
      );

      // Limit to 20 movies for seeding
      const moviesToSeed = uniqueMovies.slice(0, 20);

      console.log(`📊 Fetched ${moviesToSeed.length} unique movies from TMDB`);
      return moviesToSeed;
    } catch (error) {
      if (error.response?.status === 401) {
        console.error('❌ TMDB API authentication failed - check your API key');
      } else if (error.response?.status === 429) {
        console.error('❌ TMDB API rate limit exceeded');
      } else {
        console.error('❌ Error fetching movies from TMDB:', error.message);
      }
      return [];
    }
  }

  private transformTMDBToEntity(tmdbMovie: TMDBMovie): Partial<Movie> {
    // Calculate play until date (6 months from now or release date)
    const playUntilDate = new Date();
    if (tmdbMovie.release_date) {
      const releaseDate = new Date(tmdbMovie.release_date);
      playUntilDate.setTime(
        Math.max(releaseDate.getTime(), new Date().getTime()),
      );
    }
    playUntilDate.setMonth(playUntilDate.getMonth() + 6);

    // Generate search keywords
    const searchKeywords = this.generateSearchKeywords(tmdbMovie);

    return {
      title: tmdbMovie.title,
      overview: tmdbMovie.overview || '',
      poster: tmdbMovie.poster_path
        ? `${this.tmdbImageUrl}${tmdbMovie.poster_path}`
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
      ...(tmdbMovie.overview?.split(' ').filter((word) => word.length > 3) ||
        []),
    ];

    return keywords
      .filter(Boolean)
      .map((keyword) => keyword.toLowerCase())
      .join(' ')
      .substring(0, 255);
  }

  private async getOrCreateTag(
    tagRepository: Repository<Tag>,
    name: string,
    type: string = 'genre',
  ): Promise<Tag> {
    const slug = `${type}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    try {
      // Try to find existing tag by name first (most reliable)
      let tag = await tagRepository.findOne({
        where: { name },
      });

      if (tag) {
        console.log(`📌 Found existing tag by name: ${name}`);
        return tag;
      }

      // Try to find by slug as fallback
      tag = await tagRepository.findOne({
        where: { slug },
      });

      if (tag) {
        console.log(`📌 Found existing tag by slug: ${name} (${slug})`);
        return tag;
      }

      // Create new tag only if it doesn't exist
      tag = tagRepository.create({
        name: name,
        slug,
        usageCount: 0,
      });

      tag = await tagRepository.save(tag);
      console.log(`📌 Created new tag: ${name} (${slug})`);
      return tag;
    } catch (error) {
      // Handle duplicate tag creation at database level
      if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') {
        console.log(
          `⚠️ Tag "${name}" already exists due to race condition, retrieving existing tag...`,
        );

        // Try to fetch the existing tag again
        let existingTag = await tagRepository.findOne({
          where: { name },
        });

        if (!existingTag) {
          existingTag = await tagRepository.findOne({
            where: { slug },
          });
        }

        if (existingTag) {
          console.log(
            `📌 Retrieved existing tag after duplicate error: ${name}`,
          );
          return existingTag;
        } else {
          // This should rarely happen, but handle it gracefully
          console.error(
            `❌ Could not retrieve existing tag after duplicate error: ${name}`,
          );
          throw new Error(`Could not create or retrieve tag: ${name}`);
        }
      } else {
        console.error(
          `❌ Unexpected error creating tag "${name}":`,
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

  // Fallback method to seed sample movies if TMDB fetch fails
  private async seedSampleMovies(
    movieRepository: Repository<Movie>,
    tagRepository: Repository<Tag>,
    movieTagRepository: Repository<MovieTag>,
  ): Promise<void> {
    console.log('🎬 Seeding with sample movie data...');

    const movieData = [
      {
        title: 'The Dark Knight',
        overview:
          'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
        poster:
          'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
        rating: 9.0,
        tagNames: ['Action', 'Crime', 'Drama'],
      },
      {
        title: 'Inception',
        overview:
          'Dom Cobb is a skilled thief, the absolute best in the dangerous art of extraction, stealing valuable secrets from deep within the subconscious during the dream state.',
        poster:
          'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
        rating: 8.8,
        tagNames: ['Action', 'Sci-Fi', 'Thriller'],
      },
      {
        title: 'Interstellar',
        overview:
          'The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.',
        poster:
          'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
        rating: 8.6,
        tagNames: ['Adventure', 'Drama', 'Sci-Fi'],
      },
      {
        title: 'The Shawshank Redemption',
        overview:
          'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
        poster:
          'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
        rating: 9.3,
        tagNames: ['Drama'],
      },
      {
        title: 'Pulp Fiction',
        overview:
          'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.',
        poster:
          'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
        rating: 8.9,
        tagNames: ['Crime', 'Drama'],
      },
    ];

    // Get all existing tags first
    const existingTags = await tagRepository.find();
    const existingTagsMap = new Map<string, Tag>();
    existingTags.forEach((tag) => {
      existingTagsMap.set(tag.name, tag);
    });

    // Create or get existing tags
    const createdTags = new Map<string, Tag>();
    const allTagNames = [
      ...new Set(movieData.flatMap((movie) => movie.tagNames)),
    ];

    for (const tagName of allTagNames) {
      if (existingTagsMap.has(tagName)) {
        // Use existing tag
        createdTags.set(tagName, existingTagsMap.get(tagName)!);
        console.log(`📌 Using existing tag: ${tagName}`);
      } else {
        // Create new tag
        try {
          const tag = await this.getOrCreateTag(
            tagRepository,
            tagName,
            'genre',
          );
          createdTags.set(tagName, tag);
        } catch (error) {
          console.error(
            `❌ Failed to create/get tag "${tagName}":`,
            error.message,
          );
          // Continue with other tags
          continue;
        }
      }
    }

    // Create or update movies
    let newMoviesCount = 0;
    let updatedMoviesCount = 0;

    for (const movieInfo of movieData) {
      try {
        // Check if movie already exists
        const existingMovie = await movieRepository.findOne({
          where: { title: movieInfo.title },
          relations: ['movieTags', 'movieTags.tag'],
        });

        let movie: Movie;

        if (existingMovie) {
          // Update existing movie
          existingMovie.overview = movieInfo.overview;
          existingMovie.poster = movieInfo.poster;
          existingMovie.rating = movieInfo.rating;
          movie = await movieRepository.save(existingMovie);
          updatedMoviesCount++;
          console.log(`🔄 Updated existing movie: ${movie.title}`);
        } else {
          // Create new movie
          const playUntil = new Date();
          playUntil.setMonth(playUntil.getMonth() + 6);

          movie = movieRepository.create({
            title: movieInfo.title,
            overview: movieInfo.overview,
            poster: movieInfo.poster,
            rating: movieInfo.rating,
            playUntil,
            searchKeywords:
              `${movieInfo.title} ${movieInfo.overview}`.toLowerCase(),
            tmdbId: Math.floor(Math.random() * 900000) + 100000,
          });

          movie = await movieRepository.save(movie);
          newMoviesCount++;
          console.log(`✨ Created new movie: ${movie.title}`);
        }

        // Handle movie-tag relationships
        const existingMovieTags = await movieTagRepository.find({
          where: { movieId: movie.id },
          relations: ['tag'],
        });

        const existingTagIds = new Set(
          existingMovieTags.map((mt) => mt.tag.id),
        );

        for (const tagName of movieInfo.tagNames) {
          const tag = createdTags.get(tagName);
          if (tag && !existingTagIds.has(tag.id)) {
            try {
              const movieTag = movieTagRepository.create({
                movieId: movie.id,
                tagId: tag.id,
                movie: movie,
                tag: tag,
              });
              await movieTagRepository.save(movieTag);

              // Update tag usage count
              await tagRepository.increment({ id: tag.id }, 'usageCount', 1);
              console.log(
                `🏷️ Added tag "${tagName}" to movie "${movie.title}"`,
              );
            } catch (error) {
              if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') {
                console.log(
                  `⚠️ Tag "${tagName}" already exists for movie "${movie.title}", skipping...`,
                );
              } else {
                console.error(
                  `❌ Error adding tag "${tagName}" to movie "${movie.title}":`,
                  error.message,
                );
              }
            }
          }
        }
      } catch (error) {
        console.error(
          `❌ Error processing sample movie "${movieInfo.title}":`,
          error.message,
        );
        // Continue with other movies
        continue;
      }
    }

    console.log(`✅ Sample movie seeding completed:`);
    console.log(`   📊 New movies created: ${newMoviesCount}`);
    console.log(`   🔄 Existing movies updated: ${updatedMoviesCount}`);
    console.log(
      `   🎬 Total movies processed: ${newMoviesCount + updatedMoviesCount}`,
    );
  }
}
