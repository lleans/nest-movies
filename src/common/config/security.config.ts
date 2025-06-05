import { registerAs } from '@nestjs/config';
import { SecurityConfig } from '../types/env.type';

export const SECURITY_CONFIG = 'SECURITY_CONFIG';

export default registerAs<SecurityConfig>(SECURITY_CONFIG, () => ({
  cors: {
    origins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : ['*'], // Default to allow all origins
    methods: process.env.CORS_METHODS
      ? process.env.CORS_METHODS.split(',')
      : ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Default methods
    allowedHeaders: process.env.CORS_ALLOWED_HEADERS
      ? process.env.CORS_ALLOWED_HEADERS.split(',')
      : ['Content-Type', 'Authorization', 'X-Requested-With'], // Default headers
  },
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60000', 10), // Default to 60 seconds
    limit: parseInt(process.env.RATE_LIMIT_LIMIT || '100', 10), // Default to 100 requests
    duration: parseInt(process.env.RATE_LIMIT_DURATION || '60000', 10), // Default to 60 seconds
  },
  helmet: {
    contentSecurityPolicy:
      process.env.HELMET_CONTENT_SECURITY_POLICY === 'true' || false,
    hidePoweredBy: process.env.HELMET_HIDE_POWERED_BY === 'true' || false,
    xssFilter: process.env.HELMET_XSS_FILTER === 'true' || false,
  },
}));
