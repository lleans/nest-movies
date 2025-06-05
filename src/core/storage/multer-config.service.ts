import { STORAGE_CONFIG } from '@app/common/config/storage.config';
import { StorageConfig } from '@app/common/types/env.type';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MulterModuleOptions,
  MulterOptionsFactory,
} from '@nestjs/platform-express';
import * as crypto from 'crypto';
import { Request } from 'express';
import { memoryStorage } from 'multer';
import * as path from 'path';
import { MinioService } from './minio.service';

@Injectable()
export class MulterConfigService implements MulterOptionsFactory {
  constructor(
    private readonly minioService: MinioService,
    private readonly configService: ConfigService,
  ) {}

  createMulterOptions(): MulterModuleOptions {
    const storageConfig = this.configService.get<StorageConfig>(STORAGE_CONFIG);
    if (!storageConfig || !storageConfig.multer) {
      throw new Error('Multer configuration not found in StorageConfig');
    }
    const multerConfig = storageConfig.multer;

    return {
      storage: memoryStorage(), // Store files in memory temporarily
      limits: {
        fileSize: multerConfig.fileSizeLimit,
      },
      fileFilter: (
        req: Request,
        file: Express.Multer.File,
        callback: Function,
      ) => {
        if (
          this.isValidFileType(file.mimetype, multerConfig.allowedFileTypes)
        ) {
          callback(null, true);
        } else {
          callback(
            new Error(
              `Invalid file type. Allowed types: ${multerConfig.allowedFileTypes.join(
                ', ',
              )}`,
            ),
            false,
          );
        }
      },
    };
  }
  generateFileName(originalName: string, mimetype: string): string {
    const fileExtension = path.extname(originalName);
    const fileName = `${crypto.randomUUID()}${fileExtension}`;
    const folder = this.getUploadFolder(mimetype);
    return `${folder}/${fileName}`;
  }

  generateHashedFileName(
    buffer: Buffer,
    originalName: string,
    mimetype: string,
  ): string {
    // Generate hash from file content for deduplication
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const fileExtension = path.extname(originalName);
    const fileName = `${hash}${fileExtension}`;
    const folder = this.getUploadFolder(mimetype);
    return `${folder}/${fileName}`;
  }

  private getUploadFolder(mimetype: string): string {
    if (mimetype.startsWith('image/')) {
      return 'images';
    }
    if (mimetype.startsWith('video/')) {
      return 'videos';
    }
    return 'files';
  }

  private isValidFileType(mimetype: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(mimetype);
  }
}
