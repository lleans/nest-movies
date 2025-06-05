import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { MovieTag } from '../entities/movie-tag.entity';
import { Movie } from '../entities/movies.entity';
import { Tag } from '../entities/tags.entity';
import { MoviesService } from './movies.service';

describe('MoviesService', () => {
  let service: MoviesService;
  let movieRepository: jest.Mocked<Repository<Movie>>;
  let tagRepository: jest.Mocked<Repository<Tag>>;
  let movieTagRepository: jest.Mocked<Repository<MovieTag>>;
  let dataSource: jest.Mocked<DataSource>;

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
    deletedAt: null,
    movieTags: [],
    schedules: [],
  };

  const mockTag = {
    id: 1,
    name: 'Action',
    slug: 'action',
    usageCount: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    movieTags: [],
  };

  const mockEntityManager = {
    findOne: jest.fn().mockImplementation((entity, options) => {
      // Handle the case for existing TMDB ID check
      if (options?.where?.tmdbId === 12345) {
        return mockMovie;
      }
      // For finding movie by ID
      if (options?.where?.id === 1) {
        return mockMovie;
      }
      return null;
    }),
    // Fix for tags.length issue - mock find to return array for Tag entity
    find: jest.fn().mockImplementation((entity, options) => {
      if (entity === Tag) {
        return [mockTag]; // Return an array with the mock tag
      }
      return [];
    }),
    create: jest.fn().mockReturnValue(mockMovie),
    save: jest.fn().mockImplementation(() => mockMovie), // Return mockMovie with ID
    update: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(mockMovie),
      // Add these methods for the updateTagUsageCountsWithTransaction function
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    })),
    getRepository: jest.fn().mockReturnValue({
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    }),
  };

  const mockDataSource = {
    transaction: jest.fn((callback) => callback(mockEntityManager)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoviesService,
        {
          provide: getRepositoryToken(Movie),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn(),
              getOne: jest.fn(),
            })),
          },
        },
        {
          provide: getRepositoryToken(Tag),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              update: jest.fn().mockReturnThis(),
              set: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              execute: jest.fn(),
            })),
          },
        },
        {
          provide: getRepositoryToken(MovieTag),
          useValue: {
            save: jest.fn(),
            find: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<MoviesService>(MoviesService);
    movieRepository = module.get(getRepositoryToken(Movie));
    tagRepository = module.get(getRepositoryToken(Tag));
    movieTagRepository = module.get(getRepositoryToken(MovieTag));
    dataSource = module.get<DataSource>(DataSource) as jest.Mocked<DataSource>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a movie successfully', async () => {
      const createMovieDto = {
        title: 'Test Movie',
        overview: 'Test overview',
        poster: 'https://example.com/poster.jpg',
        playUntil: '2025-12-31T23:59:59Z',
        tmdbId: 12345,
        rating: 8.5,
        tagIds: [1],
      };

      // Modify mocks for this specific test
      mockEntityManager.findOne.mockImplementationOnce(() => null); // No existing movie
      tagRepository.find.mockResolvedValue([mockTag as any]);
      movieTagRepository.save.mockResolvedValue([
        {
          id: 1,
          movieId: 1,
          tagId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);

      const result = await service.create(createMovieDto);

      expect(result).toEqual(mockMovie);
    });

    it('should throw BadRequestException if TMDB ID already exists', async () => {
      const createMovieDto = {
        title: 'Test Movie',
        overview: 'Test overview',
        poster: 'https://example.com/poster.jpg',
        playUntil: '2025-12-31T23:59:59Z',
        tmdbId: 12345,
      };

      // Existing movie with same TMDB ID
      mockEntityManager.findOne.mockResolvedValueOnce(mockMovie);

      await expect(service.create(createMovieDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a movie when found', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockMovie),
      };
      movieRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.findOne(1);

      expect(result).toEqual(mockMovie);
    });

    it('should throw NotFoundException when movie not found', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      movieRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
  describe('getActiveMovies', () => {
    it('should return active movies', async () => {
      const activeMovies = [mockMovie];
      movieRepository.find.mockResolvedValue(activeMovies as any);

      const result = await service.getActiveMovies();

      expect(movieRepository.find).toHaveBeenCalledWith({
        where: {
          playUntil: expect.any(Object),
          deletedAt: expect.any(Object),
        },
        relations: ['movieTags', 'movieTags.tag'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(activeMovies);
    });
  });
});
