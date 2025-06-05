import { TMDB_CONFIG } from '@app/common/config/tmdb.config';
import { MovieTag } from '@app/modules/movies/entities/movie-tag.entity';
import { Movie } from '@app/modules/movies/entities/movies.entity';
import { Tag } from '@app/modules/movies/entities/tags.entity';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TMDBMovie } from '../tmdb-client/tmdb-client.service';
import { MovieConvertService } from './movie-convert.service';

describe('MovieConvertService', () => {
  let service: MovieConvertService;
  let movieRepository: any;
  let tagRepository: any;
  let movieTagRepository: any;
  let configService: ConfigService;

  const mockTmdbConfig = {
    imageUrl: 'https://image.tmdb.org/t/p/original',
    apiKey: 'test-key',
    apiUrl: 'https://api.themoviedb.org/3',
    timeout: 5000,
    language: 'en-US',
  };

  const mockTmdbMovie: TMDBMovie = {
    id: 123,
    title: 'Test Movie',
    overview: 'Test overview',
    poster_path: '/test-poster.jpg',
    backdrop_path: '/test-backdrop.jpg',
    release_date: '2023-11-15',
    vote_average: 7.5,
    vote_count: 100,
    adult: false,
    genre_ids: [28, 12, 14], // Action, Adventure, Fantasy
    original_language: 'en',
    original_title: 'Test Movie Original',
    popularity: 100.5,
    video: false,
  };

  const mockExistingMovie = {
    id: 1,
    title: 'Existing Movie',
    overview: 'Existing overview',
    poster: 'https://image.tmdb.org/t/p/original/existing-poster.jpg',
    tmdbId: 123,
    rating: 7.0,
    movieTags: [],
  };

  const mockTag = {
    id: 1,
    name: 'Action',
    slug: 'genre-action',
    usageCount: 10,
  };

  beforeEach(async () => {
    const mockMovieRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve({ id: 1, ...entity })),
      create: jest.fn((entity) => entity),
      upsert: jest.fn(),
      findBy: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockExistingMovie]),
        getCount: jest.fn().mockResolvedValue(10),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ lastSync: new Date() }),
      }),
      count: jest.fn().mockResolvedValue(100),
    };

    const mockTagRepository = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve({ id: 1, ...entity })),
      create: jest.fn((entity) => entity),
      increment: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { name: 'Action', count: 15 },
          { name: 'Adventure', count: 10 },
        ]),
      }),
    };

    const mockMovieTagRepository = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key) => {
        if (key === TMDB_CONFIG) return mockTmdbConfig;
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovieConvertService,
        {
          provide: getRepositoryToken(Movie),
          useValue: mockMovieRepository,
        },
        {
          provide: getRepositoryToken(Tag),
          useValue: mockTagRepository,
        },
        {
          provide: getRepositoryToken(MovieTag),
          useValue: mockMovieTagRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MovieConvertService>(MovieConvertService);
    movieRepository = module.get(getRepositoryToken(Movie));
    tagRepository = module.get(getRepositoryToken(Tag));
    movieTagRepository = module.get(getRepositoryToken(MovieTag));
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upsertMovies', () => {
    it('should process multiple TMDB movies', async () => {
      jest
        .spyOn(service as any, 'upsertSingleMovie')
        .mockResolvedValue(mockExistingMovie);

      await service.upsertMovies([mockTmdbMovie, mockTmdbMovie]);

      expect(service['upsertSingleMovie']).toHaveBeenCalledTimes(2);
    });

    it('should handle errors for individual movies and continue processing', async () => {
      jest
        .spyOn(service as any, 'upsertSingleMovie')
        .mockResolvedValueOnce(mockExistingMovie)
        .mockRejectedValueOnce(new Error('Processing error'));

      await service.upsertMovies([mockTmdbMovie, mockTmdbMovie]);

      expect(service['upsertSingleMovie']).toHaveBeenCalledTimes(2);
    });
  });

  describe('upsertSingleMovie', () => {
    it('should update an existing movie', async () => {
      movieRepository.findOne.mockResolvedValue(mockExistingMovie);
      jest
        .spyOn(service as any, 'syncMovieGenres')
        .mockResolvedValue(undefined);

      await service['upsertSingleMovie'](mockTmdbMovie);

      expect(movieRepository.save).toHaveBeenCalled();
      expect(service['syncMovieGenres']).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1 }),
        mockTmdbMovie.genre_ids,
      );
    });

    it("should create a new movie when it doesn't exist", async () => {
      movieRepository.findOne.mockResolvedValue(null);
      jest
        .spyOn(service as any, 'syncMovieGenres')
        .mockResolvedValue(undefined);

      await service['upsertSingleMovie'](mockTmdbMovie);

      expect(movieRepository.create).toHaveBeenCalled();
      expect(movieRepository.save).toHaveBeenCalled();
      expect(service['syncMovieGenres']).toHaveBeenCalled();
    });
  });

  describe('getOrCreateTag', () => {
    it('should return existing tag when found by name', async () => {
      tagRepository.findOne.mockResolvedValueOnce(mockTag);

      const result = await service['getOrCreateTag']('Action', 'genre');

      expect(result).toEqual(mockTag);
      expect(tagRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'Action' },
      });
    });

    it('should create a new tag when not found', async () => {
      tagRepository.findOne.mockResolvedValue(null);

      const result = await service['getOrCreateTag']('New Tag', 'genre');

      expect(tagRepository.create).toHaveBeenCalledWith({
        name: 'New Tag',
        slug: 'genre-new-tag',
        usageCount: 0,
      });
      expect(tagRepository.save).toHaveBeenCalled();
    });
  });

  describe('getMovieStats', () => {
    it('should return movie statistics', async () => {
      const stats = await service.getMovieStats();

      expect(stats).toEqual({
        total: 100,
        lastSync: expect.any(Date),
        recentlyAdded: 10,
        activeMovies: 10,
        topGenres: [
          { name: 'Action', count: 15 },
          { name: 'Adventure', count: 10 },
        ],
      });
    });
  });

  describe('searchMovies', () => {
    it('should search for movies by query', async () => {
      await service.searchMovies('test');

      expect(movieRepository.createQueryBuilder).toHaveBeenCalled();
      const queryBuilder =
        movieRepository.createQueryBuilder.mock.results[0].value;
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledTimes(2);
      expect(queryBuilder.where).toHaveBeenCalled();
      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });
  });
});
