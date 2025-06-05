import {
  PaginatedResponse,
  createPaginatedResponse,
} from '@app/common/dto/pagination.dto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  IsNull,
  MoreThan,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { CreateMovieDto } from '../dto/create-movie.dto';
import { MovieQueryDto } from '../dto/movie-query.dto';
import { UpdateMovieDto } from '../dto/update-movie.dto';
import { MovieTag } from '../entities/movie-tag.entity';
import { Movie } from '../entities/movies.entity';
import { Tag } from '../entities/tags.entity';

@Injectable()
export class MoviesService {
  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(MovieTag)
    private readonly movieTagRepository: Repository<MovieTag>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createMovieDto: CreateMovieDto): Promise<Movie> {
    const { tagIds, ...movieData } = createMovieDto;

    // Start transaction for creating movie and adding tags
    return this.dataSource.transaction(async (manager) => {
      // Check if movie with same TMDB ID already exists
      if (movieData.tmdbId) {
        const existingMovie = await manager.findOne(Movie, {
          where: { tmdbId: movieData.tmdbId, deletedAt: IsNull() },
        });
        if (existingMovie) {
          throw new BadRequestException(
            'Movie with this TMDB ID already exists',
          );
        }
      }

      // Create movie
      const movie = manager.create(Movie, {
        ...movieData,
        playUntil: new Date(movieData.playUntil),
      });
      const savedMovie = await manager.save(movie);

      // Add tags if provided
      if (tagIds && tagIds.length > 0) {
        await this.addTagsToMovieWithTransaction(
          manager,
          savedMovie.id,
          tagIds,
        );
      }

      // Get the complete movie with relations
      return this.findOneWithManager(manager, savedMovie.id);
    });
  }

  async findAll(query: MovieQueryDto): Promise<PaginatedResponse<Movie>> {
    const {
      page,
      limit,
      search,
      tagIds,
      rating,
      sortBy,
      sortOrder,
      includeExpired,
      includeDeleted,
    } = query;

    const queryBuilder = this.createMovieQueryBuilder(includeDeleted);

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(movie.title LIKE :search OR movie.overview LIKE :search OR movie.searchKeywords LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (tagIds && tagIds.length > 0) {
      queryBuilder
        .innerJoin('movie.movieTags', 'movieTag')
        .andWhere('movieTag.tagId IN (:...tagIds)', { tagIds });
    }

    if (rating !== undefined) {
      queryBuilder.andWhere('movie.rating >= :rating', { rating });
    }

    if (!includeExpired) {
      queryBuilder.andWhere('movie.playUntil > :now', { now: new Date() });
    }

    // Apply sorting and pagination
    queryBuilder
      .orderBy(`movie.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [movies, total] = await queryBuilder.getManyAndCount();

    return createPaginatedResponse(movies, page, limit, total);
  }

  async findOne(id: number, includeDeleted: boolean = false): Promise<Movie> {
    return this.findOneWithRepository(id, includeDeleted);
  }

  private async findOneWithRepository(
    id: number,
    includeDeleted: boolean = false,
  ): Promise<Movie> {
    const movie = await this.createMovieQueryBuilder(includeDeleted)
      .andWhere('movie.id = :id', { id })
      .getOne();

    if (!movie) {
      throw new NotFoundException(`Movie with ID ${id} not found`);
    }

    return movie;
  }

  private async findOneWithManager(
    manager: any,
    id: number,
    includeDeleted: boolean = false,
  ): Promise<Movie> {
    const queryBuilder = manager
      .createQueryBuilder(Movie, 'movie')
      .leftJoinAndSelect('movie.movieTags', 'movieTags')
      .leftJoinAndSelect('movieTags.tag', 'tag');

    if (!includeDeleted) {
      queryBuilder.where('movie.deletedAt IS NULL');
    }

    queryBuilder
      .andWhere('movie.id = :id', { id })
      .andWhere('(movieTags.deletedAt IS NULL OR movieTags.deletedAt IS NULL)');

    const movie = await queryBuilder.getOne();

    if (!movie) {
      throw new NotFoundException(`Movie with ID ${id} not found`);
    }

    return movie;
  }

  async update(id: number, updateMovieDto: UpdateMovieDto): Promise<Movie> {
    const { tagIds, recover, ...movieData } = updateMovieDto;

    return this.dataSource.transaction(async (manager) => {
      const movie = await this.findOneWithManager(manager, id, recover);

      // Check TMDB ID uniqueness if updating
      if (movieData.tmdbId && movieData.tmdbId !== movie.tmdbId) {
        const existingMovie = await manager.findOne(Movie, {
          where: { tmdbId: movieData.tmdbId, deletedAt: IsNull() },
        });
        if (existingMovie && existingMovie.id !== id) {
          throw new BadRequestException(
            'Movie with this TMDB ID already exists',
          );
        }
      }

      // Extract playUntil from movieData and handle the rest separately
      const { playUntil, ...restOfMovieData } = movieData;

      // Create updateData with properly typed properties
      const updateData: Partial<Movie> = {
        ...restOfMovieData,
        ...(playUntil ? { playUntil: new Date(playUntil) } : {}),
        ...(recover ? { deletedAt: null as any } : {}),
      };

      await manager.update(Movie, id, updateData);

      // Update tags if provided
      if (tagIds !== undefined) {
        await this.updateMovieTagsWithTransaction(manager, id, tagIds);
      }

      return this.findOneWithManager(manager, id);
    });
  }

  async remove(id: number): Promise<void> {
    await this.movieRepository.softDelete(id);
  }

  /**
   * Bulk remove (soft delete) multiple movies
   */
  async bulkRemove(ids: number[]): Promise<{ message: string; count: number }> {
    const result = await this.movieRepository.softDelete(ids);
    return {
      message: 'Movies deleted successfully',
      count: result.affected || 0,
    };
  }

  async addTagsToMovie(movieId: number, tagIds: number[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await this.addTagsToMovieWithTransaction(manager, movieId, tagIds);
    });
  }

  private async addTagsToMovieWithTransaction(
    manager: any,
    movieId: number,
    tagIds: number[],
  ): Promise<void> {
    // Verify tags exist
    const tags = await manager.find(Tag, {
      where: { id: In(tagIds), deletedAt: IsNull() },
    });

    if (tags.length !== tagIds.length) {
      throw new BadRequestException('One or more tags not found');
    }

    // Create movie-tag relationships
    const movieTags = tagIds.map((tagId) => ({
      movieId,
      tagId,
    }));

    await manager.save(MovieTag, movieTags);

    // Update tag usage counts
    await this.updateTagUsageCountsWithTransaction(manager, tagIds, 1);
  }

  async removeTagsFromMovie(movieId: number, tagIds: number[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await this.removeTagsFromMovieWithTransaction(manager, movieId, tagIds);
    });
  }

  private async removeTagsFromMovieWithTransaction(
    manager: any,
    movieId: number,
    tagIds: number[],
  ): Promise<void> {
    await manager.softDelete(MovieTag, {
      movieId,
      tagId: In(tagIds),
    });

    // Update tag usage counts
    await this.updateTagUsageCountsWithTransaction(manager, tagIds, -1);
  }

  async updateMovieTags(movieId: number, tagIds: number[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await this.updateMovieTagsWithTransaction(manager, movieId, tagIds);
    });
  }

  private async updateMovieTagsWithTransaction(
    manager: any,
    movieId: number,
    tagIds: number[],
  ): Promise<void> {
    // Get current tags
    const currentTags = await manager.find(MovieTag, {
      where: { movieId, deletedAt: IsNull() },
      select: ['tagId'],
    });
    const currentTagIds = currentTags.map((mt) => mt.tagId);

    // Find tags to add and remove
    const tagsToAdd = tagIds.filter((id) => !currentTagIds.includes(id));
    const tagsToRemove = currentTagIds.filter((id) => !tagIds.includes(id));

    // Add new tags
    if (tagsToAdd.length > 0) {
      await this.addTagsToMovieWithTransaction(manager, movieId, tagsToAdd);
    }

    // Remove old tags
    if (tagsToRemove.length > 0) {
      await this.removeTagsFromMovieWithTransaction(
        manager,
        movieId,
        tagsToRemove,
      );
    }
  }

  async getMoviesByTag(
    tagId: number,
    query: MovieQueryDto,
  ): Promise<PaginatedResponse<Movie>> {
    const { page, limit, sortBy, sortOrder, includeExpired } = query;

    const queryBuilder = this.createMovieQueryBuilder()
      .innerJoin('movie.movieTags', 'movieTag')
      .andWhere('movieTag.tagId = :tagId', { tagId });

    // Filter expired movies
    if (!includeExpired) {
      queryBuilder.andWhere('movie.playUntil > :now', { now: new Date() });
    }

    // Apply sorting and pagination
    queryBuilder
      .orderBy(`movie.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [movies, total] = await queryBuilder.getManyAndCount();

    return createPaginatedResponse(movies, page, limit, total);
  }

  async getActiveMovies(): Promise<Movie[]> {
    return this.movieRepository.find({
      where: {
        playUntil: MoreThan(new Date()),
        deletedAt: IsNull(),
      },
      relations: ['movieTags', 'movieTags.tag'],
      order: { createdAt: 'DESC' },
    });
  }

  private createMovieQueryBuilder(
    includeDeleted: boolean = false,
  ): SelectQueryBuilder<Movie> {
    const queryBuilder = this.movieRepository
      .createQueryBuilder('movie')
      .leftJoinAndSelect('movie.movieTags', 'movieTags')
      .leftJoinAndSelect('movieTags.tag', 'tag');

    if (!includeDeleted) {
      queryBuilder.where('movie.deletedAt IS NULL');
    }

    queryBuilder.andWhere(
      '(movieTags.deletedAt IS NULL OR movieTags.deletedAt IS NULL)',
    );

    return queryBuilder;
  }

  private async updateTagUsageCountsWithTransaction(
    manager: any,
    tagIds: number[],
    increment: number,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(Tag)
      .set({ usageCount: () => `usageCount + ${increment}` })
      .where('id IN (:...tagIds)', { tagIds })
      .execute();
  }
}
