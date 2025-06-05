import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MinioService } from './minio.service';
import { MulterConfigService } from './multer-config.service';

@Module({
  imports: [ConfigModule],
  providers: [MinioService, MulterConfigService],
  exports: [MinioService, MulterConfigService],
})
export class StorageModule {}
