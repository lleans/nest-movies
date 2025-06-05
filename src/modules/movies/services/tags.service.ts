import {
  PaginatedResponse,
  createPaginatedResponse,
} from '@app/common/dto/pagination.dto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  IsNull,
  MoreThan,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { CreateTagDto } from '../dto/create-tag.dto';
import { TagQueryDto } from '../dto/tag-query.dto';
import { UpdateTagDto } from '../dto/update-tag.dto';
import { Tag } from '../entities/tags.entity';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createTagDto: CreateTagDto): Promise<Tag> {
    const { name, slug } = createTagDto;

    // Generate slug if not provided
    const finalSlug = slug || this.generateSlug(name);

    return this.dataSource.transaction(async (manager) => {
      // Check if tag with same name or slug exists
      const existingTag = await manager.findOne(Tag, {
        where: [
          { name, deletedAt: IsNull() },
          { slug: finalSlug, deletedAt: IsNull() },
        ],
      });

      if (existingTag) {
        throw new BadRequestException(
          existingTag.name === name
            ? 'Tag with this name already exists'
            : 'Tag with this slug already exists',
        );
      }

      const tag = manager.create(Tag, {
        name,
        slug: finalSlug,
        usageCount: 0,
      });

      return manager.save(Tag, tag);
    });
  }

  async findAll(query: TagQueryDto): Promise<PaginatedResponse<Tag>> {
    const { page, limit, search, sortBy, sortOrder, includeDeleted } = query;

    const queryBuilder = this.createTagQueryBuilder(includeDeleted);

    // Filter by search term
    if (search) {
      queryBuilder.andWhere(
        '(tag.name LIKE :search OR tag.slug LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Apply sorting and pagination
    queryBuilder
      .orderBy(`tag.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [tags, total] = await queryBuilder.getManyAndCount();

    return createPaginatedResponse(tags, page, limit, total);
  }

  async findOne(id: number, includeDeleted: boolean = false): Promise<Tag> {
    const tag = await this.createTagQueryBuilder(includeDeleted)
      .andWhere('tag.id = :id', { id })
      .getOne();

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    return tag;
  }

  async findBySlug(slug: string): Promise<Tag> {
    const tag = await this.createTagQueryBuilder()
      .andWhere('tag.slug = :slug', { slug })
      .getOne();

    if (!tag) {
      throw new NotFoundException(`Tag with slug "${slug}" not found`);
    }

    return tag;
  }

  /**
   * Update a tag
   */
  async update(
    id: number,
    updateTagDto: UpdateTagDto,
  ): Promise<{ message: string; tag: Tag }> {
    return this.dataSource.transaction(async (manager) => {
      // Find tag first to verify it exists
      const tagRepository = manager.getRepository(Tag);
      const tag = await tagRepository.findOne({
        where: { id },
        withDeleted: updateTagDto.recover,
      });

      if (!tag) {
        throw new NotFoundException(`Tag with ID ${id} not found`);
      }

      // Check if slug is being updated and if it already exists
      if (updateTagDto.slug !== undefined && updateTagDto.slug !== tag.slug) {
        const existingTag = await tagRepository.findOne({
          where: { slug: updateTagDto.slug, deletedAt: IsNull() },
        });

        if (existingTag && existingTag.id !== id) {
          throw new ConflictException(
            `Tag with slug "${updateTagDto.slug}" already exists`,
          );
        }
      }

      const { recover, ...otherUpdateData } = updateTagDto;

      const updateData: Partial<Tag> = {
        ...otherUpdateData,
        updatedAt: new Date(),
        ...(recover ? { deletedAt: null as any } : {}),
      };

      // Update tag
      await tagRepository.update(id, updateData);

      // Fetch updated tag
      const updatedTag = await tagRepository.findOne({
        where: { id },
      });

      if (!updatedTag) {
        throw new NotFoundException(`Tag with ID ${id} not found after update`);
      }

      return {
        message: 'Tag updated successfully',
        tag: updatedTag,
      };
    });
  }

  async remove(id: number): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const tagRepository = manager.getRepository(Tag);
      const tag = await tagRepository.findOne({
        where: { id, deletedAt: IsNull() },
      });

      if (!tag) {
        throw new NotFoundException(`Tag with ID ${id} not found`);
      }

      // Check if tag is being used
      if (tag.usageCount > 0) {
        throw new BadRequestException(
          'Cannot delete tag that is currently associated with movies',
        );
      }

      await tagRepository.softDelete(id);
    });
  }

  async bulkRemove(ids: number[]): Promise<{ message: string; count: number }> {
    return this.dataSource.transaction(async (manager) => {
      const tagRepository = manager.getRepository(Tag);

      // Check if any of the tags are in use
      const tagsWithUsage = await tagRepository.find({
        where: { id: In(ids), usageCount: MoreThan(0) },
      });

      if (tagsWithUsage.length > 0) {
        throw new BadRequestException(
          'Cannot delete tags that are currently associated with movies',
        );
      }

      const result = await tagRepository.softDelete(ids);

      return {
        message: 'Tags deleted successfully',
        count: result.affected || 0,
      };
    });
  }

  async getPopularTags(limit: number = 10): Promise<Tag[]> {
    return this.tagRepository.find({
      where: { deletedAt: IsNull() },
      order: { usageCount: 'DESC', name: 'ASC' },
      take: limit,
    });
  }

  async searchTags(
    query: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<Tag>> {
    const queryBuilder = this.createTagQueryBuilder()
      .andWhere(
        '(LOWER(tag.name) LIKE LOWER(:query) OR LOWER(tag.slug) LIKE LOWER(:query))',
        {
          query: `%${query}%`,
        },
      )
      .orderBy('tag.usageCount', 'DESC')
      .addOrderBy('tag.name', 'ASC');

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [tags, total] = await queryBuilder.getManyAndCount();

    return createPaginatedResponse(tags, page, limit, total);
  }

  private createTagQueryBuilder(
    includeDeleted: boolean = false,
  ): SelectQueryBuilder<Tag> {
    const queryBuilder = this.tagRepository.createQueryBuilder('tag');

    if (!includeDeleted) {
      queryBuilder.where('tag.deletedAt IS NULL');
    }

    return queryBuilder;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }
}
