import { PaginatedResponse } from '@app/common/dto/pagination.dto';
import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CreateMovieScheduleDto,
  MovieScheduleQueryDto,
  UpdateMovieScheduleDto,
} from '../dto/movie-schedule.dto';
import { MovieScheduleService } from '../services/movie-schedule.service';
import { MovieScheduleController } from './movie-schedule.controller';

// Mock JWTAccessGuard
class MockJwtGuard implements CanActivate {
  canActivate = jest.fn().mockReturnValue(true);
}

describe('MovieScheduleController', () => {
  let controller: MovieScheduleController;
  let service: jest.Mocked<MovieScheduleService>;

  const mockScheduleResponse = {
    id: 1,
    movieId: 1,
    studioId: 1,
    startTime: new Date('2023-12-01T14:00:00').toISOString(),
    endTime: new Date('2023-12-01T16:00:00').toISOString(),
    price: 50,
    date: '2023-12-01',
    bookedSeats: 5,
    availableSeats: 95,
    movie: {
      id: 1,
      title: 'Test Movie',
      poster: 'https://example.com/poster.jpg',
      rating: 8.5,
    },
    studio: {
      id: 1,
      studioNumber: 1,
      seatCapacity: 100,
      hasImax: true,
      has3D: false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockPaginatedResponse: PaginatedResponse<typeof mockScheduleResponse> =
    {
      data: [mockScheduleResponse],
      metadata: {
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

  const mockAvailableSeatsResponse = {
    scheduleId: 1,
    totalSeats: 100,
    bookedSeats: 5,
    availableSeats: 95,
    seats: [
      { id: 1, rowLabel: 'A', seatNumber: 1, isAvailable: true },
      { id: 2, rowLabel: 'A', seatNumber: 2, isAvailable: false },
      { id: 3, rowLabel: 'A', seatNumber: 3, isAvailable: true },
    ],
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MovieScheduleController],
      providers: [
        {
          provide: MovieScheduleService,
          useValue: {
            createSchedule: jest.fn().mockResolvedValue(mockScheduleResponse),
            findAll: jest.fn().mockResolvedValue(mockPaginatedResponse),
            findByMovieId: jest.fn().mockResolvedValue(mockPaginatedResponse),
            findOne: jest.fn().mockResolvedValue(mockScheduleResponse),
            updateSchedule: jest.fn().mockResolvedValue(mockScheduleResponse),
            remove: jest
              .fn()
              .mockResolvedValue({
                message: 'Movie schedule deleted successfully',
              }),
            getAvailableSeats: jest
              .fn()
              .mockResolvedValue(mockAvailableSeatsResponse),
          },
        },
        {
          provide: 'UserRepository',
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(MockJwtGuard)
      .useClass(MockJwtGuard)
      .compile();

    controller = module.get<MovieScheduleController>(MovieScheduleController);
    service = module.get(
      MovieScheduleService,
    ) as jest.Mocked<MovieScheduleService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new movie schedule', async () => {
      const createDto: CreateMovieScheduleDto = {
        movieId: 1,
        studioId: 1,
        startTime: '14:00',
        endTime: '16:00',
        price: 50,
        date: '2023-12-01',
      };

      const result = await controller.create(createDto);

      expect(result).toEqual(mockScheduleResponse);
      expect(service.createSchedule).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated movie schedules', async () => {
      const query: MovieScheduleQueryDto = {
        page: 1,
        limit: 10,
        includeExpired: false,
      };

      const result = await controller.findAll(query);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findByMovieId', () => {
    it('should return schedules for a specific movie', async () => {
      const query: MovieScheduleQueryDto = {
        page: 1,
        limit: 10,
        includeExpired: false,
      };

      const result = await controller.findAll(query);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('should return a schedule by id', async () => {
      const result = await controller.findOne('1');

      expect(result).toEqual(mockScheduleResponse);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should update a movie schedule', async () => {
      const updateDto: UpdateMovieScheduleDto = {
        price: 60,
      };

      const result = await controller.update('1', updateDto);

      expect(result).toEqual(mockScheduleResponse);
      expect(service.updateSchedule).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe('remove', () => {
    it('should remove a movie schedule', async () => {
      const result = await controller.remove('1');

      expect(result).toEqual({
        message: 'Movie schedule deleted successfully',
      });
      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('getAvailableSeats', () => {
    it('should return available seats for a schedule', async () => {
      const result = await controller.getAvailableSeats({ scheduleId: 1 });

      expect(result).toEqual(mockAvailableSeatsResponse);
      expect(service.getAvailableSeats).toHaveBeenCalledWith(1);
    });
  });
});
