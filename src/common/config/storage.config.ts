import { registerAs } from '@nestjs/config';
import { StorageConfig } from '../types/env.type';

export const STORAGE_CONFIG = 'STORAGE_CONFIG';

// Parse allowed file types from environment or use default
const parsedAllowedFileTypes = (
  process.env.MULTER_ALLOWED_FILE_TYPES || 'image/jpeg,image/png,video/mp4'
)
  .split(',')
  .map((type) => type.trim());

// Export for use in other modules like DTOs
export const configuredMulterAllowedFileTypes = parsedAllowedFileTypes;

export default registerAs<StorageConfig>(
  STORAGE_CONFIG,
  (): StorageConfig => ({
    minio: {
      endpoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      useSSL: process.env.MINIO_USE_SSL === 'true',
      bucketName: process.env.MINIO_BUCKET_NAME || 'nest-movies',
      region: process.env.MINIO_REGION || 'us-east-1',
    },
    multer: {
      fileSizeLimit: parseInt(
        process.env.MULTER_FILE_SIZE_LIMIT || '10485760', // Default 10MB
        10,
      ),
      allowedFileTypes: configuredMulterAllowedFileTypes, // Use the pre-parsed array
    },
  }),
);
