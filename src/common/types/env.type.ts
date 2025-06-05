export interface AppConfig {
  name: string;
  env: 'development' | 'production' | 'test';
  apiPrefix: string;
  port: number;
}

export interface DatabaseConfig {
  type: 'mysql';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
}

export interface AuthConfig {
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiration: string;
    refreshExpiration: string;
  };
  argon2: {
    memoryCost: number;
    timeCost: number;
    parallelism: number;
  };
}

export interface TmdbConfig {
  apiKey: string;
  apiUrl: string;
  timeout: number;
  imageUrl: string;
  language: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password: string;
}

export interface SecurityConfig {
  cors: {
    origins: string[];
    methods: string[];
    allowedHeaders: string[];
  };
  rateLimit: {
    ttl: number;
    limit: number;
    duration: number;
  };
  helmet: {
    contentSecurityPolicy: boolean;
    hidePoweredBy: boolean;
    xssFilter: boolean;
  };
}

export interface StorageConfig {
  minio: {
    endpoint: string;
    port: number;
    accessKey: string;
    secretKey: string;
    useSSL: boolean;
    bucketName: string;
    region: string;
  };
  multer: {
    fileSizeLimit: number; // Changed from string to number
    allowedFileTypes: string[]; // Renamed from filesTypes and type changed
  };
}
