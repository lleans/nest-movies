import { BulkDeleteDto } from '@app/common/dto/bulk-delete.dto';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JWTAccessGuard } from '../../auth/guards/jwt-access.guard';
import { User } from '../../users/entities/users.entity';
import { CreateMovieDto } from '../dto/create-movie.dto';
import { MovieQueryDto } from '../dto/movie-query.dto';
import { UpdateMovieDto } from '../dto/update-movie.dto';
import { MoviesService } from '../services/movies.service';
import { MoviesController } from './movies.controller';

// Create mock for the JWTAccessGuard
const mockJwtGuard = { canActivate: jest.fn().mockReturnValue(true) };

describe('MoviesController', () => {
  let controller: MoviesController;
  let service: MoviesService;

  const mockMovie = {
    id: 1,
    title: 'Test Movie',
    overview: 'Test overview',
    poster: 'https://example.com/poster.jpg',
    playUntil: new Date('2025-12-31'),
    tmdbId: 12345,
    rating: 8.5,
    searchKeywords: 'test movie keywords',
    createdAt: new Date(),
    updatedAt: new Date(),
    movieTags: [],
  };

  const mockMoviesService = {
    create: jest.fn().mockResolvedValue(mockMovie),
    findAll: jest.fn().mockResolvedValue({
      data: [mockMovie],
      metadata: {
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 1,
        totalPages: 1,
      },
    }),
    getActiveMovies: jest.fn().mockResolvedValue([mockMovie]),
    getMoviesByTag: jest.fn().mockResolvedValue({
      data: [mockMovie],
      metadata: {
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 1,
        totalPages: 1,
      },
    }),
    findOne: jest.fn().mockResolvedValue(mockMovie),
    update: jest.fn().mockResolvedValue(mockMovie),
    remove: jest.fn().mockResolvedValue(undefined),
    addTagsToMovie: jest.fn().mockResolvedValue(undefined),
    removeTagsFromMovie: jest.fn().mockResolvedValue(undefined),
    bulkRemove: jest
      .fn()
      .mockResolvedValue({ message: 'Movies deleted successfully', count: 3 }),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MoviesController],
      providers: [
        {
          provide: MoviesService,
          useValue: mockMoviesService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: APP_GUARD,
          useValue: mockJwtGuard,
        },
        Reflector,
      ],
    })
      .overrideGuard(JWTAccessGuard)
      .useValue(mockJwtGuard)
      .compile();

    controller = module.get<MoviesController>(MoviesController);
    service = module.get<MoviesService>(MoviesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a movie', async () => {
      const createMovieDto: CreateMovieDto = {
        title: 'Test Movie',
        overview: 'Test overview',
        poster: 'https://example.com/poster.jpg',
        playUntil: '2025-12-31T23:59:59Z',
        tmdbId: 12345,
        rating: 8.5,
        tagIds: [1],
      };

      const result = await controller.create(createMovieDto);

      expect(result).toEqual(mockMovie);
      expect(mockMoviesService.create).toHaveBeenCalledWith(createMovieDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated movies', async () => {
      const query: MovieQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
        includeDeleted: false,
        includeExpired: false,
      };

      const result = await controller.findAll(query);

      expect(result).toEqual({
        data: [mockMovie],
        metadata: {
          currentPage: 1,
          itemsPerPage: 10,
          totalItems: 1,
          totalPages: 1,
        },
      });
      expect(mockMoviesService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('getActiveMovies', () => {
    it('should return active movies', async () => {
      const result = await controller.getActiveMovies();

      expect(result).toEqual([mockMovie]);
      expect(mockMoviesService.getActiveMovies).toHaveBeenCalled();
    });
  });

  describe('getMoviesByTag', () => {
    it('should return movies with specified tag', async () => {
      const tagId = 1;
      const query: MovieQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
        includeDeleted: false,
        includeExpired: false,
      };

      const result = await controller.getMoviesByTag(tagId, query);

      expect(result).toEqual({
        data: [mockMovie],
        metadata: {
          currentPage: 1,
          itemsPerPage: 10,
          totalItems: 1,
          totalPages: 1,
        },
      });
      expect(mockMoviesService.getMoviesByTag).toHaveBeenCalledWith(
        tagId,
        query,
      );
    });
  });

  describe('findOne', () => {
    it('should return a movie by id', async () => {
      const id = 1;
      const includeDeleted = false;

      const result = await controller.findOne(id, includeDeleted);

      expect(result).toEqual(mockMovie);
      expect(mockMoviesService.findOne).toHaveBeenCalledWith(
        id,
        includeDeleted,
      );
    });
  });

  describe('update', () => {
    it('should update a movie', async () => {
      const id = 1;
      const updateMovieDto: UpdateMovieDto = {
        title: 'Updated Movie',
        overview: 'Updated overview',
        recover: false,
      };

      const result = await controller.update(id, updateMovieDto);

      expect(result).toEqual(mockMovie);
      expect(mockMoviesService.update).toHaveBeenCalledWith(id, updateMovieDto);
    });
  });

  describe('remove', () => {
    it('should remove a movie', async () => {
      const id = 1;

      await controller.remove(id);

      expect(mockMoviesService.remove).toHaveBeenCalledWith(id);
    });
  });

  describe('addTags', () => {
    it('should add tags to a movie', async () => {
      const id = 1;
      const tagIds = [1, 2, 3];

      await controller.addTags(id, tagIds);

      expect(mockMoviesService.addTagsToMovie).toHaveBeenCalledWith(id, tagIds);
    });
  });

  describe('removeTags', () => {
    it('should remove tags from a movie', async () => {
      const id = 1;
      const tagIds = [1, 2, 3];

      await controller.removeTags(id, tagIds);

      expect(mockMoviesService.removeTagsFromMovie).toHaveBeenCalledWith(
        id,
        tagIds,
      );
    });
  });

  describe('bulkDelete', () => {
    it('should bulk delete movies', async () => {
      const bulkDeleteDto: BulkDeleteDto = {
        ids: [1, 2, 3],
      };

      const result = await controller.bulkDelete(bulkDeleteDto);

      expect(result).toEqual({
        message: 'Movies deleted successfully',
        count: 3,
      });
      expect(mockMoviesService.bulkRemove).toHaveBeenCalledWith(
        bulkDeleteDto.ids,
      );
    });
  });
});
