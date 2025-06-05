import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { CreateTagDto } from '../dto/create-tag.dto';
import { TagQueryDto } from '../dto/tag-query.dto';
import { UpdateTagDto } from '../dto/update-tag.dto';
import { Tag } from '../entities/tags.entity';
import { TagsService } from './tags.service';

describe('TagsService', () => {
  let service: TagsService;
  let tagRepository: jest.Mocked<Repository<Tag>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockTag = {
    id: 1,
    name: 'Action',
    slug: 'action',
    usageCount: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: undefined,
    movieTags: [],
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockTag], 1]),
    getOne: jest.fn().mockResolvedValue(mockTag),
  };

  const mockTagRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockEntityManager = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    getRepository: jest.fn().mockReturnValue({
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: getRepositoryToken(Tag),
          useValue: mockTagRepository,
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((cb) => cb(mockEntityManager)),
          },
        },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
    tagRepository = module.get(getRepositoryToken(Tag));
    dataSource = module.get<DataSource>(DataSource) as jest.Mocked<DataSource>;

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a tag successfully', async () => {
      const createTagDto: CreateTagDto = {
        name: 'Action',
        slug: 'action',
      };

      mockEntityManager.findOne.mockResolvedValue(null); // No existing tag
      mockEntityManager.create.mockReturnValue(mockTag);
      mockEntityManager.save.mockResolvedValue(mockTag);

      const result = await service.create(createTagDto);

      expect(result).toEqual(mockTag);
      expect(mockEntityManager.findOne).toHaveBeenCalled();
      expect(mockEntityManager.create).toHaveBeenCalledWith(Tag, {
        name: 'Action',
        slug: 'action',
        usageCount: 0,
      });
      expect(mockEntityManager.save).toHaveBeenCalled();
    });

    it('should generate slug if not provided', async () => {
      const createTagDto: CreateTagDto = {
        name: 'Action Movie',
      };

      mockEntityManager.findOne.mockResolvedValue(null);
      mockEntityManager.create.mockReturnValue({
        ...mockTag,
        name: 'Action Movie',
        slug: 'action-movie',
      });
      mockEntityManager.save.mockResolvedValue({
        ...mockTag,
        name: 'Action Movie',
        slug: 'action-movie',
      });

      await service.create(createTagDto);

      expect(mockEntityManager.create).toHaveBeenCalledWith(Tag, {
        name: 'Action Movie',
        slug: 'action-movie',
        usageCount: 0,
      });
    });

    it('should throw BadRequestException if tag with same name exists', async () => {
      const createTagDto: CreateTagDto = {
        name: 'Action',
      };

      mockEntityManager.findOne.mockResolvedValue(mockTag); // Existing tag

      await expect(service.create(createTagDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockEntityManager.findOne).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated tags', async () => {
      const query: TagQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'usageCount',
        sortOrder: 'DESC',
        includeDeleted: false,
      };

      const expected = {
        data: [mockTag],
        metadata: {
          currentPage: 1,
          itemsPerPage: 10,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      const result = await service.findAll(query);

      expect(result).toEqual(expected);
      expect(tagRepository.createQueryBuilder).toHaveBeenCalledWith('tag');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'tag.usageCount',
        'DESC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should filter by search term if provided', async () => {
      const query: TagQueryDto = {
        page: 1,
        limit: 10,
        search: 'action',
        sortBy: 'usageCount',
        sortOrder: 'DESC',
        includeDeleted: false,
      };

      await service.findAll(query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(tag.name LIKE :search OR tag.slug LIKE :search)',
        { search: '%action%' },
      );
    });
  });

  describe('findOne', () => {
    it('should return a tag when found', async () => {
      const result = await service.findOne(1);

      expect(result).toEqual(mockTag);
      expect(tagRepository.createQueryBuilder).toHaveBeenCalledWith('tag');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('tag.id = :id', {
        id: 1,
      });
    });

    it('should throw NotFoundException when tag not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('tag.id = :id', {
        id: 999,
      });
    });

    it('should include deleted tags if includeDeleted is true', async () => {
      await service.findOne(1, true);

      expect(mockQueryBuilder.where).not.toHaveBeenCalled();
    });
  });

  describe('findBySlug', () => {
    it('should return a tag when found by slug', async () => {
      const result = await service.findBySlug('action');

      expect(result).toEqual(mockTag);
      expect(tagRepository.createQueryBuilder).toHaveBeenCalledWith('tag');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'tag.slug = :slug',
        { slug: 'action' },
      );
    });

    it('should throw NotFoundException when tag not found by slug', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(service.findBySlug('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a tag successfully', async () => {
      const updateTagDto: UpdateTagDto = {
        name: 'Updated Action',
        recover: false,
      };

      const updatedTag = { ...mockTag, name: 'Updated Action' };
      const tagRepo = mockEntityManager.getRepository();

      tagRepo.findOne.mockResolvedValueOnce(mockTag); // First call to find tag
      tagRepo.update.mockResolvedValue({ affected: 1 });
      tagRepo.findOne.mockResolvedValueOnce(updatedTag); // Second call to get updated tag

      const result = await service.update(1, updateTagDto);

      expect(result.message).toEqual('Tag updated successfully');
      expect(result.tag).toEqual(updatedTag);
      expect(tagRepo.findOne).toHaveBeenCalledTimes(2);
      expect(tagRepo.update).toHaveBeenCalled();
    });

    it('should recover a soft-deleted tag if recover is true', async () => {
      const updateTagDto: UpdateTagDto = {
        recover: true,
      };

      const deletedTag = { ...mockTag, deletedAt: new Date() };
      const recoveredTag = { ...mockTag, deletedAt: null };
      const tagRepo = mockEntityManager.getRepository();

      tagRepo.findOne.mockResolvedValueOnce(deletedTag);
      tagRepo.update.mockResolvedValue({ affected: 1 });
      tagRepo.findOne.mockResolvedValueOnce(recoveredTag);

      const result = await service.update(1, updateTagDto);

      expect(result.tag.deletedAt).toBeNull();
      expect(tagRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          deletedAt: null,
        }),
      );
    });

    it('should throw NotFoundException when tag not found', async () => {
      const tagRepo = mockEntityManager.getRepository();
      tagRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(999, { name: 'Updated', recover: false }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when updated slug already exists', async () => {
      const updateTagDto: UpdateTagDto = {
        slug: 'existing-slug',
        recover: false,
      };
      const tagRepo = mockEntityManager.getRepository();

      tagRepo.findOne.mockResolvedValueOnce(mockTag); // First call to find tag
      tagRepo.findOne.mockResolvedValueOnce({
        id: 2,
        slug: 'existing-slug',
        deletedAt: null,
      }); // Second call to check slug

      await expect(service.update(1, updateTagDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should remove a tag successfully', async () => {
      const tagRepo = mockEntityManager.getRepository();
      tagRepo.findOne.mockResolvedValue({
        ...mockTag,
        usageCount: 0, // Tag not in use
      });
      tagRepo.softDelete.mockResolvedValue({ affected: 1 });

      await service.remove(1);

      expect(tagRepo.findOne).toHaveBeenCalled();
      expect(tagRepo.softDelete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when tag not found', async () => {
      const tagRepo = mockEntityManager.getRepository();
      tagRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when tag is in use', async () => {
      const tagRepo = mockEntityManager.getRepository();
      tagRepo.findOne.mockResolvedValue(mockTag); // usageCount > 0

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('bulkRemove', () => {
    it('should bulk remove tags successfully', async () => {
      const tagRepo = mockEntityManager.getRepository();
      tagRepo.find.mockResolvedValue([]); // No tags in use
      tagRepo.softDelete.mockResolvedValue({ affected: 3 });

      const result = await service.bulkRemove([1, 2, 3]);

      expect(result.message).toEqual('Tags deleted successfully');
      expect(result.count).toEqual(3);
      expect(tagRepo.find).toHaveBeenCalled();
      expect(tagRepo.softDelete).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('should throw BadRequestException when any tag is in use', async () => {
      const tagRepo = mockEntityManager.getRepository();
      tagRepo.find.mockResolvedValue([mockTag]); // Tag with usageCount > 0

      await expect(service.bulkRemove([1, 2, 3])).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getPopularTags', () => {
    it('should return popular tags', async () => {
      tagRepository.find.mockResolvedValue([mockTag]);

      const result = await service.getPopularTags();

      expect(result).toEqual([mockTag]);
      expect(tagRepository.find).toHaveBeenCalledWith({
        where: { deletedAt: IsNull() },
        order: { usageCount: 'DESC', name: 'ASC' },
        take: 10,
      });
    });

    it('should limit results to specified number', async () => {
      tagRepository.find.mockResolvedValue([mockTag]);

      await service.getPopularTags(5);

      expect(tagRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  describe('searchTags', () => {
    it('should search tags and return paginated results', async () => {
      const expected = {
        data: [mockTag],
        metadata: {
          currentPage: 1,
          itemsPerPage: 10,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      const result = await service.searchTags('action');

      expect(result).toEqual(expected);
      expect(tagRepository.createQueryBuilder).toHaveBeenCalledWith('tag');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(LOWER(tag.name) LIKE LOWER(:query) OR LOWER(tag.slug) LIKE LOWER(:query))',
        { query: '%action%' },
      );
    });
  });
});
