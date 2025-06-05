import { STORAGE_CONFIG } from '@app/common/config/storage.config';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { StorageConfig } from '../../common/types/env.type';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private minioClient: Minio.Client;
  private bucketName: string;
  private isConnected: boolean = false;
  private storageConfig: StorageConfig;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      this.storageConfig =
        this.configService.get<StorageConfig>(STORAGE_CONFIG)!;

      if (!this.storageConfig || !this.storageConfig.minio) {
        this.logger.warn(
          'MinIO configuration not found, storage service will be unavailable',
        );
        return;
      }

      await this.initializeClient();
    } catch (error) {
      this.logger.warn(`Failed to initialize MinIO service: ${error.message}`);
      this.logger.warn(
        'Application will continue to run, but file storage operations will fail until connection is established',
      );
      // Don't rethrow - let the app continue to start
    }
  }

  private async initializeClient(): Promise<void> {
    try {
      const minioConfig = this.storageConfig.minio;

      this.minioClient = new Minio.Client({
        endPoint: minioConfig.endpoint,
        port: minioConfig.port,
        useSSL: minioConfig.useSSL,
        accessKey: minioConfig.accessKey,
        secretKey: minioConfig.secretKey,
      });

      this.bucketName = minioConfig.bucketName;

      // Test connection
      await this.ensureBucketExists();
      this.isConnected = true;
      this.logger.log('Successfully connected to MinIO server');
    } catch (error) {
      this.isConnected = false;
      throw error;
    }
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName);
        this.logger.log(`Created bucket: ${this.bucketName}`);
      } else {
        this.logger.log(`Bucket already exists: ${this.bucketName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure bucket exists: ${error.message}`);
      throw error;
    }
  }

  private async tryReconnect(): Promise<boolean> {
    if (this.isConnected) return true;

    try {
      this.logger.log('Attempting to reconnect to MinIO server...');
      await this.initializeClient();
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to reconnect to MinIO server: ${error.message}`,
      );
      return false;
    }
  }

  getClient(): Minio.Client {
    if (!this.isConnected) {
      this.logger.warn('MinIO client requested but not connected');
    }
    return this.minioClient;
  }

  getBucketName(): string {
    return this.bucketName;
  }

  async uploadFile(
    objectName: string,
    buffer: Buffer,
    size?: number,
    metaData?: Record<string, any>,
  ): Promise<string> {
    if (!this.isConnected && !(await this.tryReconnect())) {
      throw new Error('Unable to upload file: MinIO service is not connected');
    }

    try {
      await this.minioClient.putObject(
        this.bucketName,
        objectName,
        buffer,
        size,
        metaData,
      );
      this.logger.log(`Uploaded file: ${objectName}`);
      return objectName;
    } catch (error) {
      this.isConnected = false; // Mark as disconnected on error
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw error;
    }
  }

  async deleteFile(objectName: string): Promise<void> {
    if (!this.isConnected && !(await this.tryReconnect())) {
      throw new Error('Unable to delete file: MinIO service is not connected');
    }

    try {
      await this.minioClient.removeObject(this.bucketName, objectName);
      this.logger.log(`Deleted file: ${objectName}`);
    } catch (error) {
      this.isConnected = false; // Mark as disconnected on error
      this.logger.error(`Failed to delete file: ${error.message}`);
      throw error;
    }
  }

  async getFileUrl(
    objectName: string,
    expiry: number = 7 * 24 * 60 * 60,
  ): Promise<string> {
    try {
      return await this.minioClient.presignedGetObject(
        this.bucketName,
        objectName,
        expiry,
      );
    } catch (error) {
      this.logger.error(`Failed to get file URL: ${error.message}`);
      throw error;
    }
  }

  async fileExists(objectName: string): Promise<boolean> {
    try {
      await this.minioClient.statObject(this.bucketName, objectName);
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  async getFileMetadata(objectName: string): Promise<any> {
    try {
      return await this.minioClient.statObject(this.bucketName, objectName);
    } catch (error) {
      this.logger.error(`Failed to get file metadata: ${error.message}`);
      throw error;
    }
  }

  async getFileSize(objectName: string): Promise<number> {
    try {
      const stat = await this.minioClient.statObject(
        this.bucketName,
        objectName,
      );
      return stat.size;
    } catch (error) {
      if (error.code === 'NotFound') {
        return 0;
      }
      throw error;
    }
  }
}
