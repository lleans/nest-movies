import { MovieTag } from '@app/modules/movies/entities/movie-tag.entity';
import { Movie } from '@app/modules/movies/entities/movies.entity';
import { Tag } from '@app/modules/movies/entities/tags.entity';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LessThan } from 'typeorm';
import { MovieConvertService } from './movie-convert/movie-convert.service';
import {
  TMDBMovie,
  TMDBResponse,
  TmdbClientService,
} from './tmdb-client/tmdb-client.service';
import { TmdbSyncService } from './tmdb-sync.service';

describe('TmdbSyncService', () => {
  let service: TmdbSyncService;
  let tmdbClientService: TmdbClientService;
  let movieConvertService: MovieConvertService;
  let movieRepository: any;
  let tagRepository: any;
  let movieTagRepository: any;
  let configService: ConfigService;

  const mockMovieData: TMDBMovie[] = [
    {
      id: 123,
      title: 'Test Movie',
      overview: 'Test overview',
      poster_path: '/test-poster.jpg',
      backdrop_path: '/test-backdrop.jpg',
      release_date: '2023-11-15',
      vote_average: 7.5,
      vote_count: 100,
      adult: false,
      genre_ids: [28, 12, 14],
      original_language: 'en',
      original_title: 'Test Movie Original',
      popularity: 100.5,
      video: false,
    },
  ];

  const mockApiResponse: TMDBResponse = {
    dates: {
      maximum: '2023-12-31',
      minimum: '2023-11-01',
    },
    page: 1,
    results: mockMovieData,
    total_pages: 3,
    total_results: 60,
  };

  beforeEach(async () => {
    const mockMovieRepository = {
      find: jest.fn(),
      delete: jest.fn().mockResolvedValue({ affected: 5 }),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
        getRawMany: jest.fn().mockResolvedValue([
          { tag_id: 1, actualCount: '5' },
          { tag_id: 2, actualCount: '3' },
        ]),
      }),
    };

    const mockTagRepository = {
      update: jest.fn().mockResolvedValue({}),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 2 }),
        getRawMany: jest.fn().mockResolvedValue([
          { tag_id: 1, actualCount: '5' },
          { tag_id: 2, actualCount: '3' },
        ]),
      }),
    };

    const mockMovieTagRepository = {
      find: jest.fn(),
    };

    const mockTmdbClientService = {
      getNowPlayingMovies: jest.fn().mockResolvedValue(mockApiResponse),
    };

    const mockMovieConvertService = {
      upsertMovies: jest.fn().mockResolvedValue(undefined),
    };

    const mockConfigService = {
      get: jest.fn((key, defaultValue) => {
        if (key === 'TMDB_MAX_PAGES_PER_SYNC') return 3;
        if (key === 'TMDB_SYNC_ENABLED') return true;
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TmdbSyncService,
        {
          provide: TmdbClientService,
          useValue: mockTmdbClientService,
        },
        {
          provide: MovieConvertService,
          useValue: mockMovieConvertService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
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
      ],
    }).compile();

    service = module.get<TmdbSyncService>(TmdbSyncService);
    tmdbClientService = module.get<TmdbClientService>(TmdbClientService);
    movieConvertService = module.get<MovieConvertService>(MovieConvertService);
    movieRepository = module.get(getRepositoryToken(Movie));
    tagRepository = module.get(getRepositoryToken(Tag));
    movieTagRepository = module.get(getRepositoryToken(MovieTag));
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncNowPlayingMovies', () => {
    it('should fetch and sync now playing movies', async () => {
      await service.syncNowPlayingMovies();

      expect(tmdbClientService.getNowPlayingMovies).toHaveBeenCalledWith(1);
      expect(movieConvertService.upsertMovies).toHaveBeenCalledWith(
        mockMovieData,
      );
    });

    it('should handle errors gracefully', async () => {
      jest
        .spyOn(tmdbClientService, 'getNowPlayingMovies')
        .mockRejectedValueOnce(new Error('API error'));

      await expect(service.syncNowPlayingMovies()).resolves.not.toThrow();
    });

    it('should skip sync when disabled', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key) => {
        if (key === 'TMDB_SYNC_ENABLED') return false;
        return 3;
      });

      await service.syncNowPlayingMovies();

      expect(tmdbClientService.getNowPlayingMovies).not.toHaveBeenCalled();
    });
  });

  describe('dailyComprehensiveSync', () => {
    it('should perform sync and cleanup tasks', async () => {
      jest
        .spyOn(service as any, 'syncMoviePages')
        .mockResolvedValueOnce(undefined);
      jest
        .spyOn(service as any, 'cleanupExpiredMovies')
        .mockResolvedValueOnce(undefined);
      jest
        .spyOn(service as any, 'performMaintenanceTasks')
        .mockResolvedValueOnce(undefined);

      await service.dailyComprehensiveSync();

      expect(service['syncMoviePages']).toHaveBeenCalledWith('now_playing', 5);
      expect(service['cleanupExpiredMovies']).toHaveBeenCalled();
      expect(service['performMaintenanceTasks']).toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredMovies', () => {
    it('should delete movies with playUntil date in the past', async () => {
      await service['cleanupExpiredMovies']();

      expect(movieRepository.delete).toHaveBeenCalledWith({
        playUntil: LessThan(expect.any(Date)),
      });
    });
  });

  describe('updateTagUsageCounts', () => {
    it('should update tag usage counts based on actual usage', async () => {
      await service['updateTagUsageCounts']();

      expect(tagRepository.update).toHaveBeenCalledWith(
        { id: 1 },
        { usageCount: 5 },
      );
      expect(tagRepository.update).toHaveBeenCalledWith(
        { id: 2 },
        { usageCount: 3 },
      );
    });
  });
});
