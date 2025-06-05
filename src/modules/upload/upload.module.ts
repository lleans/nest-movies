import { MulterConfigService } from '@app/core/storage/multer-config.service';
import { StorageModule } from '@app/core/storage/storage.module';
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadController } from './upload.controller';

@Module({
  imports: [
    StorageModule,
    MulterModule.registerAsync({
      imports: [StorageModule],
      useExisting: MulterConfigService,
    }),
  ],
  controllers: [UploadController],
})
export class UploadModule {}
