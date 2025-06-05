import { MinioService } from '@app/core/storage/minio.service';
import { MulterConfigService } from '@app/core/storage/multer-config.service';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UploadController } from './upload.controller';

describe('UploadController', () => {
  let controller: UploadController;
  let minioService: MinioService;
  let multerConfigService: MulterConfigService;

  // Mock file for testing
  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test-image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('test-image-content'),
    size: 1024,
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  };

  // Mock MinioService and MulterConfigService
  const mockMinioService = {
    uploadFile: jest.fn(),
    getFileUrl: jest.fn(),
    fileExists: jest.fn(),
  };

  const mockMulterConfigService = {
    generateHashedFileName: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        {
          provide: MinioService,
          useValue: mockMinioService,
        },
        {
          provide: MulterConfigService,
          useValue: mockMulterConfigService,
        },
      ],
    }).compile();

    controller = module.get<UploadController>(UploadController);
    minioService = module.get<MinioService>(MinioService);
    multerConfigService = module.get<MulterConfigService>(MulterConfigService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should upload a new file successfully', async () => {
      // Setup mocks
      const hashedFilename = 'images/abc123def456.jpg';
      const fileUrl = 'https://storage.example.com/files/image.jpg';

      mockMulterConfigService.generateHashedFileName.mockReturnValue(
        hashedFilename,
      );
      mockMinioService.fileExists.mockResolvedValue(false);
      mockMinioService.uploadFile.mockResolvedValue(undefined);
      mockMinioService.getFileUrl.mockResolvedValue(fileUrl);

      // Execute test
      const result = await controller.uploadFile(mockFile);

      // Verify results
      expect(
        mockMulterConfigService.generateHashedFileName,
      ).toHaveBeenCalledWith(
        mockFile.buffer,
        mockFile.originalname,
        mockFile.mimetype,
      );
      expect(mockMinioService.fileExists).toHaveBeenCalledWith(hashedFilename);
      expect(mockMinioService.uploadFile).toHaveBeenCalledWith(
        hashedFilename,
        mockFile.buffer,
        mockFile.size,
        expect.objectContaining({
          'Content-Type': mockFile.mimetype,
          'Original-Name': mockFile.originalname,
        }),
      );
      expect(mockMinioService.getFileUrl).toHaveBeenCalledWith(hashedFilename);

      // Check response structure
      expect(result).toEqual({
        message: 'File uploaded successfully',
        url: fileUrl,
        filename: hashedFilename,
        originalName: mockFile.originalname,
        size: mockFile.size,
        mimetype: mockFile.mimetype,
        isExisting: false,
      });
    });

    it('should return existing file URL when file already exists', async () => {
      // Setup mocks
      const hashedFilename = 'images/abc123def456.jpg';
      const fileUrl = 'https://storage.example.com/files/image.jpg';

      mockMulterConfigService.generateHashedFileName.mockReturnValue(
        hashedFilename,
      );
      mockMinioService.fileExists.mockResolvedValue(true);
      mockMinioService.getFileUrl.mockResolvedValue(fileUrl);

      // Execute test
      const result = await controller.uploadFile(mockFile);

      // Verify results
      expect(mockMinioService.fileExists).toHaveBeenCalledWith(hashedFilename);
      expect(mockMinioService.uploadFile).not.toHaveBeenCalled(); // Should not upload again
      expect(mockMinioService.getFileUrl).toHaveBeenCalledWith(hashedFilename);

      // Check response structure
      expect(result).toEqual({
        message: 'File already exists, URL retrieved',
        url: fileUrl,
        filename: hashedFilename,
        originalName: mockFile.originalname,
        size: mockFile.size,
        mimetype: mockFile.mimetype,
        isExisting: true,
      });
    });

    it('should throw BadRequestException when no file is provided', async () => {
      await expect(controller.uploadFile(null as any)).rejects.toThrow(
        new BadRequestException('No file provided'),
      );
    });

    it('should throw BadRequestException when upload fails', async () => {
      // Setup mocks
      const hashedFilename = 'images/abc123def456.jpg';
      const errorMessage = 'Storage connection failed';

      mockMulterConfigService.generateHashedFileName.mockReturnValue(
        hashedFilename,
      );
      mockMinioService.fileExists.mockResolvedValue(false);
      mockMinioService.uploadFile.mockRejectedValue(new Error(errorMessage));

      // Execute test and verify
      await expect(controller.uploadFile(mockFile)).rejects.toThrow(
        new BadRequestException(`Upload failed: ${errorMessage}`),
      );
    });

    it('should handle file exists check failure', async () => {
      // Setup mocks
      const hashedFilename = 'images/abc123def456.jpg';
      const errorMessage = 'Cannot check if file exists';

      mockMulterConfigService.generateHashedFileName.mockReturnValue(
        hashedFilename,
      );
      mockMinioService.fileExists.mockRejectedValue(new Error(errorMessage));

      // Execute test and verify
      await expect(controller.uploadFile(mockFile)).rejects.toThrow(
        new BadRequestException(`Upload failed: ${errorMessage}`),
      );
    });
  });
});
