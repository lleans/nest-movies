import { BulkDeleteDto } from '@app/common/dto/bulk-delete.dto';
import { PaginatedResponse } from '@app/common/dto/pagination.dto';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../users/entities/users.entity';
import {
  BulkCreateSeatsDto,
  CreateSeatDto,
  SeatResponseDto,
  UpdateSeatDto,
} from '../dto/seat.dto';
import { Studio } from '../entities/studio.entity';
import { SeatService } from '../services/seat.service';
import { SeatController } from './seat.controller';

describe('SeatController', () => {
  let controller: SeatController;
  let service: SeatService;

  const mockSeatResponse: SeatResponseDto = {
    id: 1,
    studioId: 1,
    rowLabel: 'A',
    seatNumber: 1,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  const mockStudio: Studio = {
    id: 1,
    studioNumber: 1,
    seatCapacity: 150,
    hasImax: true,
    has3D: false,
    isActive: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    deletedAt: undefined,
    schedules: [],
    seats: [],
  };
  const mockSeatService = {
    findAllByStudio: jest.fn(),
    createSeat: jest.fn(),
    updateSeat: jest.fn(),
    removeSeat: jest.fn(),
    removeAllSeatsForStudio: jest.fn(),
    bulkRemoveSeats: jest.fn(),
    createSeatsForStudio: jest.fn(),
    regenerateSeatsForStudio: jest.fn(),
    findStudioById: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeatController],
      providers: [
        {
          provide: SeatService,
          useValue: mockSeatService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    controller = module.get<SeatController>(SeatController);
    service = module.get<SeatService>(SeatService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAllByStudio', () => {
    it('should return paginated list of seats for a studio', async () => {
      const paginatedResponse: PaginatedResponse<SeatResponseDto> = {
        data: [mockSeatResponse],
        metadata: {
          hasNextPage: false,
          hasPreviousPage: false,
          totalItems: 1,
          itemsPerPage: 50,
          currentPage: 1,
          totalPages: 1,
        },
      };

      mockSeatService.findAllByStudio.mockResolvedValue(paginatedResponse);

      const result = await controller.findAllByStudio(1, {
        sortOrder: 'ASC',
        page: 1,
        limit: 50,
        includeDeleted: false,
      });

      expect(result).toEqual(paginatedResponse);
      expect(service.findAllByStudio).toHaveBeenCalledWith(1, 1, 50, false);
    });
  });

  describe('create', () => {
    it('should create a new seat', async () => {
      const createDto: CreateSeatDto = {
        studioId: 1,
        rowLabel: 'A',
        seatNumber: 1,
      };

      mockSeatService.createSeat.mockResolvedValue(mockSeatResponse);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockSeatResponse);
      expect(service.createSeat).toHaveBeenCalledWith(createDto);
    });
  });

  describe('bulkCreate', () => {
    it('should create seats in bulk without regeneration', async () => {
      const bulkCreateDto: BulkCreateSeatsDto = {
        studioId: 1,
        regenerate: false,
      };

      mockSeatService.findStudioById.mockResolvedValue(mockStudio);
      mockSeatService.createSeatsForStudio.mockResolvedValue(undefined);

      const result = await controller.bulkCreate(bulkCreateDto);

      expect(result).toEqual({ message: 'Seats created successfully' });
      expect(service.findStudioById).toHaveBeenCalledWith(1);
      expect(service.createSeatsForStudio).toHaveBeenCalledWith(
        1,
        150,
        undefined,
      );
      expect(service.regenerateSeatsForStudio).not.toHaveBeenCalled();
    });

    it('should regenerate seats when regenerate flag is true', async () => {
      const bulkCreateDto: BulkCreateSeatsDto = {
        studioId: 1,
        regenerate: true,
        options: {
          rowPattern: 'ABCDEFGH',
          seatsPerRow: 15,
        },
      };

      mockSeatService.findStudioById.mockResolvedValue(mockStudio);
      mockSeatService.regenerateSeatsForStudio.mockResolvedValue({
        message: 'Successfully regenerated 150 seats for studio 1',
      });

      const result = await controller.bulkCreate(bulkCreateDto);

      expect(result).toEqual({
        message: 'Successfully regenerated 150 seats for studio 1',
      });
      expect(service.findStudioById).toHaveBeenCalledWith(1);
      expect(service.regenerateSeatsForStudio).toHaveBeenCalledWith(
        1,
        150,
        bulkCreateDto.options,
      );
    });
  });

  describe('update', () => {
    it('should update a seat', async () => {
      const updateDto: UpdateSeatDto = {
        rowLabel: 'B',
        seatNumber: 2,
      };

      const updatedSeat = {
        ...mockSeatResponse,
        rowLabel: 'B',
        seatNumber: 2,
      };

      mockSeatService.updateSeat.mockResolvedValue(updatedSeat);

      const result = await controller.update(1, updateDto);

      expect(result).toEqual(updatedSeat);
      expect(service.updateSeat).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe('remove', () => {
    it('should delete a seat', async () => {
      const deleteResponse = {
        message: 'Seat deleted successfully',
      };

      mockSeatService.removeSeat.mockResolvedValue(deleteResponse);

      const result = await controller.remove(1);

      expect(result).toEqual(deleteResponse);
      expect(service.removeSeat).toHaveBeenCalledWith(1);
    });
  });

  describe('removeAllForStudio', () => {
    it('should delete all seats for a studio', async () => {
      const deleteResponse = {
        message: 'Seats deleted successfully',
        count: 150,
      };

      mockSeatService.removeAllSeatsForStudio.mockResolvedValue(deleteResponse);

      const result = await controller.removeAllForStudio(1);

      expect(result).toEqual(deleteResponse);
      expect(service.removeAllSeatsForStudio).toHaveBeenCalledWith(1);
    });
  });

  describe('bulkRemove', () => {
    it('should bulk delete seats', async () => {
      const bulkDeleteDto: BulkDeleteDto = {
        ids: [1, 2, 3, 4, 5],
      };

      const bulkDeleteResponse = {
        message: 'Seats deleted successfully',
        count: 5,
      };

      mockSeatService.bulkRemoveSeats.mockResolvedValue(bulkDeleteResponse);

      const result = await controller.bulkRemove(bulkDeleteDto);

      expect(result).toEqual(bulkDeleteResponse);
      expect(service.bulkRemoveSeats).toHaveBeenCalledWith([1, 2, 3, 4, 5]);
    });
  });
});
