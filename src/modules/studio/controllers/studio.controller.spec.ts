import { PaginatedResponse } from '@app/common/dto/pagination.dto';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../users/entities/users.entity';
import {
  CreateStudioDto,
  GetStudiosQueryDto,
  StudioResponseDto,
  UpdateStudioDto,
} from '../dto/studio.dto';
import { StudioService } from '../services/studio.service';
import { StudioController } from './studio.controller';

describe('StudioController', () => {
  let controller: StudioController;
  let service: StudioService;

  const mockStudioResponse: StudioResponseDto = {
    id: 1,
    studioNumber: 1,
    seatCapacity: 150,
    hasImax: true,
    has3D: false,
    isActive: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };
  const mockStudioService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    bulkRemove: jest.fn(),
    getStats: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudioController],
      providers: [
        {
          provide: StudioService,
          useValue: mockStudioService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    controller = module.get<StudioController>(StudioController);
    service = module.get<StudioService>(StudioService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated list of studios', async () => {
      const paginatedResponse: PaginatedResponse<StudioResponseDto> = {
        data: [mockStudioResponse],
        metadata: {
          hasNextPage: false,
          hasPreviousPage: false,
          totalItems: 1,
          itemsPerPage: 10,
          currentPage: 1,
          totalPages: 1,
        },
      };

      mockStudioService.findAll.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll({
        sortOrder: 'ASC',
        page: 1,
        limit: 10,
      });

      expect(result).toEqual(paginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sortOrder: 'ASC',
      });
    });

    it('should handle filters when provided', async () => {
      const query: GetStudiosQueryDto = {
        sortOrder: 'ASC',
        page: 1,
        limit: 10,
        isActive: true,
        hasImax: true,
        minCapacity: 100,
      };

      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('should return a studio by ID', async () => {
      mockStudioService.findOne.mockResolvedValue(mockStudioResponse);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockStudioResponse);
      expect(service.findOne).toHaveBeenCalledWith(1, false);
    });

    it('should include deleted studios when flag is set', async () => {
      await controller.findOne(1, true);

      expect(service.findOne).toHaveBeenCalledWith(1, true);
    });
  });

  describe('create', () => {
    it('should create a new studio', async () => {
      const createDto: CreateStudioDto = {
        studioNumber: 1,
        seatCapacity: 150,
        hasImax: true,
        has3D: false,
        isActive: true,
      };

      const createResponse = {
        message: 'Studio created successfully',
        studio: mockStudioResponse,
      };

      mockStudioService.create.mockResolvedValue(createResponse);

      const result = await controller.create(createDto);

      expect(result).toEqual(createResponse);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should update a studio', async () => {
      const updateDto: UpdateStudioDto = {
        seatCapacity: 200,
        hasImax: false,
        recover: false,
      };

      const updateResponse = {
        message: 'Studio updated successfully',
        studio: {
          ...mockStudioResponse,
          seatCapacity: 200,
          hasImax: false,
        },
      };

      mockStudioService.update.mockResolvedValue(updateResponse);

      const result = await controller.update(1, updateDto);

      expect(result).toEqual(updateResponse);
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe('remove', () => {
    it('should delete a studio', async () => {
      const deleteResponse = {
        message: 'Studio deleted successfully',
      };

      mockStudioService.remove.mockResolvedValue(deleteResponse);

      const result = await controller.remove(1);

      expect(result).toEqual(deleteResponse);
      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('bulkRemove', () => {
    it('should bulk delete studios', async () => {
      const bulkDeleteResponse = {
        message: 'Studios deleted successfully',
        count: 3,
      };

      mockStudioService.bulkRemove.mockResolvedValue(bulkDeleteResponse);

      const result = await controller.bulkRemove({ ids: [1, 2, 3] });

      expect(result).toEqual(bulkDeleteResponse);
      expect(service.bulkRemove).toHaveBeenCalledWith([1, 2, 3]);
    });
  });

  describe('getStats', () => {
    it('should return studio statistics', async () => {
      const statsResponse = {
        total: 10,
        active: 8,
        inactive: 2,
        withImax: 3,
        with3D: 5,
        totalCapacity: 1500,
        averageCapacity: 150,
      };

      mockStudioService.getStats.mockResolvedValue(statsResponse);

      const result = await controller.getStats();

      expect(result).toEqual(statsResponse);
      expect(service.getStats).toHaveBeenCalled();
    });
  });
});
