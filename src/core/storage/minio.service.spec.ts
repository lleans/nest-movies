import { STORAGE_CONFIG } from '@app/common/config/storage.config';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as Minio from 'minio';
import { MinioService } from './minio.service';

// Create a mock for the Minio.Client
jest.mock('minio', () => {
  return {
    Client: jest.fn().mockImplementation(() => ({
      bucketExists: jest.fn(),
      makeBucket: jest.fn(),
      putObject: jest.fn(),
      removeObject: jest.fn(),
      presignedGetObject: jest.fn(),
      statObject: jest.fn(),
    })),
  };
});

describe('MinioService', () => {
  let service: MinioService;
  let configService: ConfigService;
  let minioClientMock: any;

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
      fileSizeLimit: 10 * 1024 * 1024,
      allowedFileTypes: ['image/jpeg', 'image/png', 'video/mp4'],
    },
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MinioService,
        {
          provide: 'MINIO',
          useValue: minioClientMock,
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

    service = module.get<MinioService>(MinioService);
    configService = module.get<ConfigService>(ConfigService);

    // Get the Minio client instance created in the service
    minioClientMock = (service as any).minioClient;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize the MinIO client and check bucket', async () => {
      // Mock the bucket exists response
      minioClientMock.bucketExists.mockResolvedValue(true);

      await service.onModuleInit();

      // Verify Minio.Client was initialized with correct config
      expect(Minio.Client).toHaveBeenCalledWith({
        endPoint: mockStorageConfig.minio.endpoint,
        port: mockStorageConfig.minio.port,
        useSSL: mockStorageConfig.minio.useSSL,
        accessKey: mockStorageConfig.minio.accessKey,
        secretKey: mockStorageConfig.minio.secretKey,
      });

      // Verify bucket existence was checked
      expect(minioClientMock.bucketExists).toHaveBeenCalledWith(
        mockStorageConfig.minio.bucketName,
      );

      // Bucket already exists, so makeBucket should not be called
      expect(minioClientMock.makeBucket).not.toHaveBeenCalled();

      // Verify isConnected flag is set
      expect((service as any).isConnected).toBe(true);
    });

    it('should create bucket if it does not exist', async () => {
      // Mock bucket doesn't exist
      minioClientMock.bucketExists.mockResolvedValue(false);
      minioClientMock.makeBucket.mockResolvedValue(undefined);

      await service.onModuleInit();

      // Verify bucket was created
      expect(minioClientMock.makeBucket).toHaveBeenCalledWith(
        mockStorageConfig.minio.bucketName,
      );

      // Verify isConnected flag is set
      expect((service as any).isConnected).toBe(true);
    });

    it('should handle initialization errors gracefully', async () => {
      // Force an error during initialization
      minioClientMock.bucketExists.mockRejectedValue(
        new Error('Connection failed'),
      );

      // Spy on logger to verify error was logged
      const loggerWarnSpy = jest.spyOn((service as any).logger, 'warn');

      await service.onModuleInit();

      // Service should continue running, but isConnected should be false
      expect((service as any).isConnected).toBe(false);
      expect(loggerWarnSpy).toHaveBeenCalled();
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      // Setup
      (service as any).isConnected = true;
      minioClientMock.putObject.mockResolvedValue(undefined);

      const objectName = 'images/test-image.jpg';
      const buffer = Buffer.from('test content');
      const metadata = { 'Content-Type': 'image/jpeg' };

      // Test
      const result = await service.uploadFile(
        objectName,
        buffer,
        buffer.length,
        metadata,
      );

      // Verify
      expect(minioClientMock.putObject).toHaveBeenCalledWith(
        mockStorageConfig.minio.bucketName,
        objectName,
        buffer,
        buffer.length,
        metadata,
      );
      expect(result).toBe(objectName);
    });

    it('should attempt reconnection if not connected', async () => {
      // Setup
      (service as any).isConnected = false;
      const tryReconnectSpy = jest
        .spyOn(service as any, 'tryReconnect')
        .mockResolvedValue(true);
      minioClientMock.putObject.mockResolvedValue(undefined);

      const objectName = 'images/test-image.jpg';
      const buffer = Buffer.from('test content');

      // Test
      await service.uploadFile(objectName, buffer);

      // Verify reconnection was attempted
      expect(tryReconnectSpy).toHaveBeenCalled();
      expect(minioClientMock.putObject).toHaveBeenCalled();
    });

    it('should throw error if reconnection fails', async () => {
      // Setup
      (service as any).isConnected = false;
      jest.spyOn(service as any, 'tryReconnect').mockResolvedValue(false);

      const objectName = 'images/test-image.jpg';
      const buffer = Buffer.from('test content');

      // Test and verify
      await expect(service.uploadFile(objectName, buffer)).rejects.toThrow(
        'Unable to upload file: MinIO service is not connected',
      );
    });

    it('should handle upload errors and mark as disconnected', async () => {
      // Setup
      (service as any).isConnected = true;
      minioClientMock.putObject.mockRejectedValue(new Error('Upload failed'));

      const objectName = 'images/test-image.jpg';
      const buffer = Buffer.from('test content');

      // Test and verify
      await expect(service.uploadFile(objectName, buffer)).rejects.toThrow(
        'Upload failed',
      );
      expect((service as any).isConnected).toBe(false); // Should mark as disconnected
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      // Setup
      (service as any).isConnected = true;
      minioClientMock.removeObject.mockResolvedValue(undefined);

      const objectName = 'images/test-image.jpg';

      // Test
      await service.deleteFile(objectName);

      // Verify
      expect(minioClientMock.removeObject).toHaveBeenCalledWith(
        mockStorageConfig.minio.bucketName,
        objectName,
      );
    });
  });

  describe('getFileUrl', () => {
    it('should return presigned URL', async () => {
      // Setup
      const objectName = 'images/test-image.jpg';
      const expectedUrl =
        'https://minio.example.com/test-bucket/images/test-image.jpg';
      minioClientMock.presignedGetObject.mockResolvedValue(expectedUrl);

      // Test
      const result = await service.getFileUrl(objectName);

      // Verify
      expect(minioClientMock.presignedGetObject).toHaveBeenCalledWith(
        mockStorageConfig.minio.bucketName,
        objectName,
        7 * 24 * 60 * 60, // Default expiry
      );
      expect(result).toBe(expectedUrl);
    });

    it('should use custom expiry time when provided', async () => {
      // Setup
      const objectName = 'images/test-image.jpg';
      const customExpiry = 3600; // 1 hour
      minioClientMock.presignedGetObject.mockResolvedValue('some-url');

      // Test
      await service.getFileUrl(objectName, customExpiry);

      // Verify
      expect(minioClientMock.presignedGetObject).toHaveBeenCalledWith(
        mockStorageConfig.minio.bucketName,
        objectName,
        customExpiry,
      );
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      // Setup
      minioClientMock.statObject.mockResolvedValue({ size: 1024 });

      // Test
      const result = await service.fileExists('images/existing.jpg');

      // Verify
      expect(result).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      // Setup
      const notFoundError = new Error('Not found');
      notFoundError['code'] = 'NotFound';
      minioClientMock.statObject.mockRejectedValue(notFoundError);

      // Test
      const result = await service.fileExists('images/nonexistent.jpg');

      // Verify
      expect(result).toBe(false);
    });

    it('should propagate other errors', async () => {
      // Setup
      minioClientMock.statObject.mockRejectedValue(
        new Error('Connection error'),
      );

      // Test and verify
      await expect(service.fileExists('images/test.jpg')).rejects.toThrow(
        'Connection error',
      );
    });
  });

  describe('getFileMetadata', () => {
    it('should return file metadata', async () => {
      // Setup
      const metadata = {
        size: 1024,
        etag: 'abc123',
        'content-type': 'image/jpeg',
      };
      minioClientMock.statObject.mockResolvedValue(metadata);

      // Test
      const result = await service.getFileMetadata('images/test.jpg');

      // Verify
      expect(result).toEqual(metadata);
    });
  });

  describe('getFileSize', () => {
    it('should return file size', async () => {
      // Setup
      minioClientMock.statObject.mockResolvedValue({ size: 1024 });

      // Test
      const result = await service.getFileSize('images/test.jpg');

      // Verify
      expect(result).toBe(1024);
    });

    it('should return 0 when file does not exist', async () => {
      // Setup
      const notFoundError = new Error('Not found');
      notFoundError['code'] = 'NotFound';
      minioClientMock.statObject.mockRejectedValue(notFoundError);

      // Test
      const result = await service.getFileSize('images/nonexistent.jpg');

      // Verify
      expect(result).toBe(0);
    });
  });
});
