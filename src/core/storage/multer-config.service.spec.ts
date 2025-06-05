import { STORAGE_CONFIG } from '@app/common/config/storage.config';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'crypto';
import { Request } from 'express';
import { MinioService } from './minio.service';
import { MulterConfigService } from './multer-config.service';

// Mock crypto module
jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('mock-uuid'),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mock-hash'),
  }),
}));

describe('MulterConfigService', () => {
  let service: MulterConfigService;
  let configService: ConfigService;
  let minioService: MinioService;

  const mockStorageConfig = {
    minio: {
      endpoint: 'localhost',
      port: 9000,
      useSSL: false,
      accessKey: 'minioadmin',
      secretKey: 'minioadmin',
      bucketName: 'test-bucket',
    },
    multer: {
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
      allowedFileTypes: ['image/jpeg', 'image/png', 'video/mp4'],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MulterConfigService,
        {
          provide: MinioService,
          useValue: {
            uploadFile: jest.fn(),
            getFileUrl: jest.fn(),
            fileExists: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === STORAGE_CONFIG) {
                return mockStorageConfig;
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MulterConfigService>(MulterConfigService);
    configService = module.get<ConfigService>(ConfigService);
    minioService = module.get<MinioService>(MinioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMulterOptions', () => {
    it('should create multer options with correct configuration', () => {
      const options = service.createMulterOptions();

      // Verify storage type is memoryStorage
      expect(options.storage.constructor.name).toBe('MemoryStorage');

      // Verify file size limit
      expect(options.limits?.fileSize).toBe(
        mockStorageConfig.multer.fileSizeLimit,
      );

      // Verify fileFilter exists
      expect(typeof options.fileFilter).toBe('function');
    });

    it('should throw error if multer config is missing', () => {
      // Mock missing config
      jest.spyOn(configService, 'get').mockReturnValue({
        minio: mockStorageConfig.minio,
        // Missing multer config
      });

      expect(() => service.createMulterOptions()).toThrow(
        'Multer configuration not found in StorageConfig',
      );
    });

    it('should accept valid file types in fileFilter', () => {
      const options = service.createMulterOptions();
      const mockFile = { mimetype: 'image/jpeg' } as Express.Multer.File;
      const mockCallback = jest.fn();

      options.fileFilter!({} as Request, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, true);
    });

    it('should reject invalid file types in fileFilter', () => {
      const options = service.createMulterOptions();
      const mockFile = { mimetype: 'application/exe' } as Express.Multer.File;
      const mockCallback = jest.fn();

      options.fileFilter!({} as Request, mockFile, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(expect.any(Error), false);
      expect(mockCallback.mock.calls[0][0].message).toContain(
        'Invalid file type',
      );
    });
  });

  describe('generateFileName', () => {
    it('should generate file name with UUID and correct folder', () => {
      const originalName = 'test-image.jpg';
      const mimetype = 'image/jpeg';

      const result = service.generateFileName(originalName, mimetype);

      expect(result).toBe('images/mock-uuid.jpg');
      expect(crypto.randomUUID).toHaveBeenCalled();
    });

    it('should use videos folder for video mimetypes', () => {
      const originalName = 'test-video.mp4';
      const mimetype = 'video/mp4';

      const result = service.generateFileName(originalName, mimetype);

      expect(result).toBe('videos/mock-uuid.mp4');
    });

    it('should use files folder for other mimetypes', () => {
      const originalName = 'test-doc.pdf';
      const mimetype = 'application/pdf';

      const result = service.generateFileName(originalName, mimetype);

      expect(result).toBe('files/mock-uuid.pdf');
    });
  });

  describe('generateHashedFileName', () => {
    it('should generate file name with content hash and correct folder', () => {
      const buffer = Buffer.from('test content');
      const originalName = 'test-image.jpg';
      const mimetype = 'image/jpeg';

      const result = service.generateHashedFileName(
        buffer,
        originalName,
        mimetype,
      );

      expect(result).toBe('images/mock-hash.jpg');
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
    });

    it('should handle different file extensions correctly', () => {
      const buffer = Buffer.from('test content');
      const originalName = 'test.png';
      const mimetype = 'image/png';

      const result = service.generateHashedFileName(
        buffer,
        originalName,
        mimetype,
      );

      expect(result).toBe('images/mock-hash.png');
    });

    it('should use correct folder for videos', () => {
      const buffer = Buffer.from('test content');
      const originalName = 'test.mp4';
      const mimetype = 'video/mp4';

      const result = service.generateHashedFileName(
        buffer,
        originalName,
        mimetype,
      );

      expect(result).toBe('videos/mock-hash.mp4');
    });
  });

  describe('getUploadFolder (private method)', () => {
    it('should return images folder for image mimetypes', () => {
      // Access private method using any type
      const result = (service as any).getUploadFolder('image/jpeg');
      expect(result).toBe('images');
    });

    it('should return videos folder for video mimetypes', () => {
      const result = (service as any).getUploadFolder('video/mp4');
      expect(result).toBe('videos');
    });

    it('should return files folder for other mimetypes', () => {
      const result = (service as any).getUploadFolder('application/pdf');
      expect(result).toBe('files');
    });
  });

  describe('isValidFileType (private method)', () => {
    it('should return true for allowed file types', () => {
      const allowed = ['image/jpeg', 'image/png', 'video/mp4'];

      // Test all allowed types
      expect((service as any).isValidFileType('image/jpeg', allowed)).toBe(
        true,
      );
      expect((service as any).isValidFileType('image/png', allowed)).toBe(true);
      expect((service as any).isValidFileType('video/mp4', allowed)).toBe(true);
    });

    it('should return false for disallowed file types', () => {
      const allowed = ['image/jpeg', 'image/png', 'video/mp4'];

      expect((service as any).isValidFileType('application/pdf', allowed)).toBe(
        false,
      );
      expect((service as any).isValidFileType('text/plain', allowed)).toBe(
        false,
      );
      expect((service as any).isValidFileType('application/exe', allowed)).toBe(
        false,
      );
    });
  });
});
