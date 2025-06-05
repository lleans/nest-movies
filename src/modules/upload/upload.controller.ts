import {
  CommonErrorSchemas,
  UploadErrorSchemas,
} from '@app/common/dto/error-response.dto';
import { ZodValidationPipe } from '@app/common/pipes/zod-validation/zod-validation.pipe';
import { MinioService } from '@app/core/storage/minio.service';
import { MulterConfigService } from '@app/core/storage/multer-config.service';
import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JWTAccessGuard } from '../auth/guards/jwt-access.guard';
import { FileUploadResponse, UploadFileSchema } from './dto/upload.dto';

@Controller('upload')
@ApiTags('File Upload')
@JWTAccessGuard
export class UploadController {
  constructor(
    private readonly minioService: MinioService,
    private readonly multerConfigService: MulterConfigService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload file',
    description:
      'Upload a file (image or video) and get the URL. Uses content-based deduplication to optimize storage.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File to upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            'File to upload (images: jpeg, jpg, png, gif, webp; videos: mp4, mpeg, quicktime)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'File uploaded successfully' },
        data: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'File uploaded successfully' },
            url: {
              type: 'string',
              description: 'Accessible URL of the uploaded file',
              example: 'https://storage.example.com/files/image.jpg',
            },
            filename: {
              type: 'string',
              description: 'Generated filename in storage',
              example: 'images/abc123def456.jpg',
            },
            originalName: {
              type: 'string',
              description: 'Original filename',
              example: 'my-image.jpg',
            },
            size: {
              type: 'number',
              description: 'File size in bytes',
              example: 1024567,
            },
            mimetype: {
              type: 'string',
              description: 'File MIME type',
              example: 'image/jpeg',
            },
            isExisting: {
              type: 'boolean',
              description: 'Whether file already existed (deduplication)',
              example: false,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - No file provided, invalid file type, or validation failed',
    schema: UploadErrorSchemas.InvalidFileType,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: CommonErrorSchemas.Unauthorized,
  })
  async uploadFile(
    @UploadedFile(new ZodValidationPipe(UploadFileSchema))
    file: Express.Multer.File,
  ): Promise<FileUploadResponse> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    try {
      // Generate hash-based filename for deduplication
      const hashedFilename = this.multerConfigService.generateHashedFileName(
        file.buffer,
        file.originalname,
        file.mimetype,
      );

      // Check if file already exists (size optimization)
      const fileExists = await this.minioService.fileExists(hashedFilename);

      let fileUrl: string;
      let isExisting = false;

      if (fileExists) {
        // File already exists, just get the URL
        fileUrl = await this.minioService.getFileUrl(hashedFilename);
        isExisting = true;
      } else {
        // Upload new file
        await this.minioService.uploadFile(
          hashedFilename,
          file.buffer,
          file.size,
          {
            'Content-Type': file.mimetype,
            'Upload-Date': new Date().toISOString(),
            'Original-Name': file.originalname,
          },
        );

        // Get the file URL
        fileUrl = await this.minioService.getFileUrl(hashedFilename);
      }

      return {
        message: isExisting
          ? 'File already exists, URL retrieved'
          : 'File uploaded successfully',
        url: fileUrl,
        filename: hashedFilename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        isExisting,
      };
    } catch (error) {
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }
}
