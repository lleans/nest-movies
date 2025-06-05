import { BulkDeleteDto } from '@app/common/dto/bulk-delete.dto';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JWTAccessGuard } from '../../auth/guards/jwt-access.guard';
import { User } from '../../users/entities/users.entity';
import { CreateTagDto } from '../dto/create-tag.dto';
import { TagQueryDto } from '../dto/tag-query.dto';
import { UpdateTagDto } from '../dto/update-tag.dto';
import { TagsService } from '../services/tags.service';
import { TagsController } from './tags.controller';

// Create mock for the JWTAccessGuard
const mockJwtGuard = { canActivate: jest.fn().mockReturnValue(true) };

describe('TagsController', () => {
  let controller: TagsController;
  let service: TagsService;

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

  const mockTagsService = {
    create: jest.fn().mockResolvedValue(mockTag),
    findAll: jest.fn().mockResolvedValue({
      data: [mockTag],
      metadata: {
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 1,
        totalPages: 1,
      },
    }),
    findOne: jest.fn().mockResolvedValue(mockTag),
    findBySlug: jest.fn().mockResolvedValue(mockTag),
    update: jest
      .fn()
      .mockResolvedValue({ message: 'Tag updated successfully', tag: mockTag }),
    remove: jest.fn().mockResolvedValue(undefined),
    bulkRemove: jest
      .fn()
      .mockResolvedValue({ message: 'Tags deleted successfully', count: 3 }),
    getPopularTags: jest.fn().mockResolvedValue([mockTag]),
    searchTags: jest.fn().mockResolvedValue({
      data: [mockTag],
      metadata: {
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 1,
        totalPages: 1,
      },
    }),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagsController],
      providers: [
        {
          provide: TagsService,
          useValue: mockTagsService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: APP_GUARD,
          useValue: mockJwtGuard,
        },
        Reflector,
      ],
    })
      .overrideGuard(JWTAccessGuard)
      .useValue(mockJwtGuard)
      .compile();

    controller = module.get<TagsController>(TagsController);
    service = module.get<TagsService>(TagsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a tag', async () => {
      const createTagDto: CreateTagDto = {
        name: 'Action',
        slug: 'action',
      };

      const result = await controller.create(createTagDto);

      expect(result).toEqual(mockTag);
      expect(mockTagsService.create).toHaveBeenCalledWith(createTagDto);
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

      const result = await controller.findAll(query);

      expect(result).toEqual({
        data: [mockTag],
        metadata: {
          currentPage: 1,
          itemsPerPage: 10,
          totalItems: 1,
          totalPages: 1,
        },
      });
      expect(mockTagsService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('getPopularTags', () => {
    it('should return popular tags', async () => {
      const limit = 5;

      const result = await controller.getPopularTags(limit);

      expect(result).toEqual([mockTag]);
      expect(mockTagsService.getPopularTags).toHaveBeenCalledWith(limit);
    });
  });

  describe('searchTags', () => {
    it('should search tags and return results', async () => {
      const query = 'action';
      const limit = 5;

      const result = await controller.searchTags(query, limit);

      expect(result).toEqual({
        data: [mockTag],
        metadata: {
          currentPage: 1,
          itemsPerPage: 10,
          totalItems: 1,
          totalPages: 1,
        },
      });
      expect(mockTagsService.searchTags).toHaveBeenCalledWith(query, limit);
    });
  });

  describe('findBySlug', () => {
    it('should return a tag by slug', async () => {
      const slug = 'action';

      const result = await controller.findBySlug(slug);

      expect(result).toEqual(mockTag);
      expect(mockTagsService.findBySlug).toHaveBeenCalledWith(slug);
    });
  });

  describe('findOne', () => {
    it('should return a tag by id', async () => {
      const id = 1;
      const includeDeleted = false;

      const result = await controller.findOne(id, includeDeleted);

      expect(result).toEqual(mockTag);
      expect(mockTagsService.findOne).toHaveBeenCalledWith(id, includeDeleted);
    });
  });

  describe('update', () => {
    it('should update a tag', async () => {
      const id = 1;
      const updateTagDto: UpdateTagDto = {
        name: 'Updated Action',
        recover: false,
      };

      const result = await controller.update(id, updateTagDto);

      expect(result).toEqual({
        message: 'Tag updated successfully',
        tag: mockTag,
      });
      expect(mockTagsService.update).toHaveBeenCalledWith(id, updateTagDto);
    });
  });

  describe('remove', () => {
    it('should remove a tag', async () => {
      const id = 1;

      await controller.remove(id);

      expect(mockTagsService.remove).toHaveBeenCalledWith(id);
    });
  });

  describe('bulkRemove', () => {
    it('should bulk remove tags', async () => {
      const bulkDeleteDto: BulkDeleteDto = {
        ids: [1, 2, 3],
      };

      const result = await controller.bulkRemove(bulkDeleteDto);

      expect(result).toEqual({
        message: 'Tags deleted successfully',
        count: 3,
      });
      expect(mockTagsService.bulkRemove).toHaveBeenCalledWith(
        bulkDeleteDto.ids,
      );
    });
  });
});
