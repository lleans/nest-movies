import { TMDB_CONFIG } from '@app/common/config/tmdb.config';
import { TmdbConfig } from '@app/common/types/env.type';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface TMDBResponse {
  dates: {
    maximum: string;
    minimum: string;
  };
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

export interface TMDBMovie {
  adult: boolean;
  backdrop_path: string;
  genre_ids: number[];
  id: number;
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string;
  release_date: string;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
}

@Injectable()
export class TmdbClientService {
  private readonly logger = new Logger(TmdbClientService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly language: string;
  private readonly timeout: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const tmdbConfig = this.configService.get<TmdbConfig>(TMDB_CONFIG)!;
    this.apiUrl = tmdbConfig.apiUrl;
    this.apiKey = tmdbConfig.apiKey;
    this.language = tmdbConfig.language;
    this.timeout = tmdbConfig.timeout;

    // Validate API key on service initialization
    if (!this.apiKey || this.apiKey.trim() === '') {
      this.logger.error('TMDB API key is missing or empty');
      throw new Error('TMDB API key is required');
    }
  }

  async getNowPlayingMovies(page: number = 1): Promise<TMDBResponse> {
    try {
      this.logger.log(`Fetching now playing movies - Page ${page}`);

      if (!this.apiKey) {
        throw new Error('TMDB API key is not configured');
      }

      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/movie/now_playing`, {
          params: {
            page,
            language: this.language,
          },
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          timeout: this.timeout,
        }),
      );

      if (response.status === 401) {
        throw new Error('Invalid TMDB API key');
      }

      if (response.status !== 200) {
        throw new Error(`TMDB API returned status ${response.status}`);
      }

      this.logger.log(
        `Successfully fetched ${response.data.results?.length || 0} movies from page ${page}`,
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        this.logger.error(
          'TMDB API authentication failed - check your API key',
        );
        throw new Error('TMDB API authentication failed');
      } else if (error.response?.status === 429) {
        this.logger.error('TMDB API rate limit exceeded');
        throw new Error('TMDB API rate limit exceeded');
      } else if (
        error.code === 'ECONNABORTED' ||
        error.message.includes('timeout')
      ) {
        this.logger.error(`TMDB API request timeout for page ${page}`);
        throw new Error('TMDB API request timeout');
      } else {
        this.logger.error(
          `Failed to fetch now playing movies from TMDB page ${page}: ${error.message}`,
          error.stack,
        );
        throw error;
      }
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/configuration`, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }),
      );
      return response.status === 200;
    } catch (error) {
      this.logger.error('TMDB API key validation failed', error.message);
      return false;
    }
  }
}
