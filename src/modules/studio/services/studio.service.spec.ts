import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Between, DataSource, EntityManager, Repository } from 'typeorm';
import { CreateStudioDto, UpdateStudioDto } from '../dto/studio.dto';
import { Studio } from '../entities/studio.entity';
import { SeatService } from './seat.service';
import { StudioService } from './studio.service';

describe('StudioService', () => {
  let service: StudioService;
  let repository: jest.Mocked<Repository<Studio>>;
  let seatService: SeatService;
  let dataSource: jest.Mocked<DataSource>;

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

  const mockEntityManager = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    delete: jest.fn(),
    getRepository: jest.fn(),
  } as unknown as jest.Mocked<EntityManager>;

  const mockDataSource = {
    transaction: jest.fn((callback) => callback(mockEntityManager)),
  } as unknown as jest.Mocked<DataSource>;

  const mockSeatService = {
    createSeatsForStudio: jest.fn(),
    purgeAllSeatsForStudio: jest.fn(),
    removeAllSeatsForStudio: jest.fn(),
  };

  const mockRepository = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as unknown as jest.Mocked<Repository<Studio>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudioService,
        {
          provide: getRepositoryToken(Studio),
          useValue: mockRepository,
        },
        {
          provide: SeatService,
          useValue: mockSeatService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<StudioService>(StudioService);
    repository = module.get(getRepositoryToken(Studio)) as jest.Mocked<
      Repository<Studio>
    >;
    seatService = module.get<SeatService>(SeatService);
    dataSource = module.get<DataSource>(DataSource) as jest.Mocked<DataSource>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a studio when found', async () => {
      repository.findOne.mockResolvedValue(mockStudio);

      const result = await service.findById(1);

      expect(result).toEqual(mockStudio);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        withDeleted: undefined,
      });
    });

    it('should include deleted studios when requested', async () => {
      repository.findOne.mockResolvedValue(mockStudio);

      await service.findById(1, true);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        withDeleted: true,
      });
    });

    it('should throw NotFoundException when studio not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByStudioNumber', () => {
    it('should return a studio when found by studio number', async () => {
      repository.findOne.mockResolvedValue(mockStudio);

      const result = await service.findByStudioNumber(1);

      expect(result).toEqual(mockStudio);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { studioNumber: 1 },
      });
    });

    it('should return null when studio not found by number', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findByStudioNumber(999);

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated studios', async () => {
      repository.findAndCount.mockResolvedValue([[mockStudio], 1]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        sortOrder: 'ASC',
      });

      expect(result.data).toHaveLength(1);
      expect(result.metadata.totalItems).toBe(1);
      expect(repository.findAndCount).toHaveBeenCalled();
    });

    it('should apply filters when provided', async () => {
      repository.findAndCount.mockResolvedValue([[mockStudio], 1]);

      await service.findAll({
        sortOrder: 'ASC',
        page: 1,
        limit: 10,
        isActive: true,
        hasImax: true,
        minCapacity: 100,
        maxCapacity: 200,
      });

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            hasImax: true,
            seatCapacity: Between(100, 200),
          }),
        }),
      );
    });
  });

  describe('create', () => {
    const createStudioDto: CreateStudioDto = {
      studioNumber: 1,
      seatCapacity: 150,
      hasImax: true,
      has3D: false,
      isActive: true,
    };

    it('should create a studio successfully', async () => {
      // No existing studio with the same number
      repository.findOne.mockResolvedValue(null);

      // Mock transaction behavior
      mockEntityManager.create.mockReturnValue(mockStudio as any);
      mockEntityManager.save.mockResolvedValue(mockStudio);

      const result = await service.create(createStudioDto);

      expect(result.message).toBe('Studio created successfully');
      expect(result.studio).toEqual(
        expect.objectContaining({
          id: mockStudio.id,
          studioNumber: mockStudio.studioNumber,
        }),
      );
      expect(seatService.createSeatsForStudio).toHaveBeenCalledWith(
        mockStudio.id,
        mockStudio.seatCapacity,
        undefined,
        mockEntityManager,
      );
    });

    it('should throw ConflictException when studio number already exists', async () => {
      repository.findOne.mockResolvedValue(mockStudio);

      await expect(service.create(createStudioDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('should update a studio without changing seat capacity', async () => {
      const updateStudioDto: UpdateStudioDto = {
        hasImax: false,
        has3D: true,
        recover: false,
      };

      repository.findOne.mockResolvedValue(mockStudio);
      repository.update.mockResolvedValue({ affected: 1 } as any);
      repository.findOne.mockResolvedValueOnce(mockStudio);
      repository.findOne.mockResolvedValueOnce({
        ...mockStudio,
        hasImax: false,
        has3D: true,
      });

      const result = await service.update(1, updateStudioDto);

      expect(result.message).toBe('Studio updated successfully');
      expect(repository.update).toHaveBeenCalled();
      expect(seatService.purgeAllSeatsForStudio).not.toHaveBeenCalled();
    });

    it('should update a studio with seat capacity change using transaction', async () => {
      const updateStudioDto: UpdateStudioDto = {
        seatCapacity: 200,
        recover: false,
      };

      repository.findOne.mockResolvedValue(mockStudio);
      mockEntityManager.findOne.mockResolvedValue({
        ...mockStudio,
        seatCapacity: 200,
      });

      const result = await service.update(1, updateStudioDto);

      expect(result.message).toBe(
        'Studio updated successfully with new seat capacity',
      );
      expect(mockEntityManager.update).toHaveBeenCalled();
      expect(seatService.purgeAllSeatsForStudio).toHaveBeenCalledWith(
        1,
        mockEntityManager,
      );
      expect(seatService.createSeatsForStudio).toHaveBeenCalledWith(
        1,
        200,
        undefined,
        mockEntityManager,
      );
    });

    it('should throw ConflictException when updating to existing studio number', async () => {
      const existingStudio = { ...mockStudio, id: 2, studioNumber: 2 };
      repository.findOne.mockResolvedValueOnce(mockStudio); // First call for findById
      repository.findOne.mockResolvedValueOnce(existingStudio); // Second call for findByStudioNumber

      await expect(
        service.update(1, { studioNumber: 2, recover: false }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft delete a studio using transaction', async () => {
      repository.findOne.mockResolvedValue(mockStudio);

      const result = await service.remove(1);

      expect(result.message).toBe('Studio deleted successfully');
      expect(dataSource.transaction).toHaveBeenCalled();
      expect(seatService.removeAllSeatsForStudio).toHaveBeenCalledWith(
        1,
        mockEntityManager,
      );
      expect(mockEntityManager.softDelete).toHaveBeenCalledWith(Studio, 1);
    });
  });

  describe('bulkRemove', () => {
    it('should soft delete multiple studios using transaction', async () => {
      mockEntityManager.findOne.mockResolvedValue(mockStudio);

      const result = await service.bulkRemove([1, 2, 3]);

      expect(result.message).toBe('Studios deleted successfully');
      expect(dataSource.transaction).toHaveBeenCalled();
      expect(seatService.removeAllSeatsForStudio).toHaveBeenCalledTimes(3);
      expect(mockEntityManager.softDelete).toHaveBeenCalledWith(
        Studio,
        [1, 2, 3],
      );
    });
  });

  describe('getStats', () => {
    it('should return studio statistics', async () => {
      repository.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8) // active
        .mockResolvedValueOnce(2) // inactive
        .mockResolvedValueOnce(3) // withImax
        .mockResolvedValueOnce(5); // with3D

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalCapacity: '1500',
          averageCapacity: '150.5',
        }),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getStats();

      expect(result).toEqual({
        total: 10,
        active: 8,
        inactive: 2,
        withImax: 3,
        with3D: 5,
        totalCapacity: 1500,
        averageCapacity: 150.5,
      });
    });
  });
});
