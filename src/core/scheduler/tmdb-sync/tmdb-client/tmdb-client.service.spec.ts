import { TMDB_CONFIG } from '@app/common/config/tmdb.config';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { TmdbClientService } from './tmdb-client.service';

describe('TmdbClientService', () => {
  let service: TmdbClientService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockTmdbConfig = {
    apiUrl: 'https://api.themoviedb.org/3',
    apiKey: 'test-api-key',
    language: 'en-US',
    timeout: 5000,
    imageUrl: 'https://image.tmdb.org/t/p/original',
  };

  const mockNowPlayingResponse = {
    data: {
      dates: {
        maximum: '2023-12-31',
        minimum: '2023-11-01',
      },
      page: 1,
      results: [
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
      ],
      total_pages: 10,
      total_results: 200,
    },
    status: 200,
  };

  beforeEach(async () => {
    const mockHttpService = {
      get: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key) => {
        if (key === TMDB_CONFIG) return mockTmdbConfig;
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TmdbClientService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TmdbClientService>(TmdbClientService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getNowPlayingMovies', () => {
    it('should successfully fetch now playing movies', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValueOnce(of(mockNowPlayingResponse as any));

      const result = await service.getNowPlayingMovies(1);

      expect(result).toEqual(mockNowPlayingResponse.data);
      expect(httpService.get).toHaveBeenCalledWith(
        `${mockTmdbConfig.apiUrl}/movie/now_playing`,
        expect.objectContaining({
          params: {
            page: 1,
            language: mockTmdbConfig.language,
          },
          headers: {
            Authorization: `Bearer ${mockTmdbConfig.apiKey}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }),
      );
    });

    it('should handle authentication error (401)', async () => {
      jest.spyOn(httpService, 'get').mockImplementationOnce(() =>
        throwError(() => ({
          response: { status: 401 },
          message: 'Unauthorized',
        })),
      );

      await expect(service.getNowPlayingMovies(1)).rejects.toThrow(
        'TMDB API authentication failed',
      );
    });

    it('should handle rate limit error (429)', async () => {
      jest.spyOn(httpService, 'get').mockImplementationOnce(() =>
        throwError(() => ({
          response: { status: 429 },
          message: 'Too Many Requests',
        })),
      );

      await expect(service.getNowPlayingMovies(1)).rejects.toThrow(
        'TMDB API rate limit exceeded',
      );
    });

    it('should handle timeout error', async () => {
      jest.spyOn(httpService, 'get').mockImplementationOnce(() =>
        throwError(() => ({
          code: 'ECONNABORTED',
          message: 'timeout of 5000ms exceeded',
        })),
      );

      await expect(service.getNowPlayingMovies(1)).rejects.toThrow(
        'TMDB API request timeout',
      );
    });
  });

  it('should return false for invalid API key', async () => {
    jest.spyOn(httpService, 'get').mockImplementationOnce(() =>
      throwError(() => ({
        response: { status: 401 },
        message: 'Unauthorized',
      })),
    );

    const result = await service.validateApiKey();

    expect(result).toBe(false);
  });
});
