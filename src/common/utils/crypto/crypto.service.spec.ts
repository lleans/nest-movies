import { AUTH_CONFIG } from '@app/common/config/auth.config';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CryptoService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === `${AUTH_CONFIG}.argon2`) {
                return {
                  memoryCost: 65536,
                  timeCost: 3,
                  parallelism: 4,
                };
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should hash password with argon2', async () => {
    const hashed = await service.hashPassword('password');
    expect(hashed).toBeDefined();
    expect(typeof hashed).toBe('string');
    expect(hashed).not.toBe('password');
  });

  it('should verify argon2 hashed password', async () => {
    const password = 'test-password';
    const hashed = await service.hashPassword(password);

    const isValid = await service.verifyPassword(password, hashed);
    expect(isValid).toBe(true);

    const isInvalid = await service.verifyPassword('wrong-password', hashed);
    expect(isInvalid).toBe(false);
  });

  it('should create a refresh token hash', async () => {
    const refreshToken = 'test-refresh-token';
    const hash = await service.createRefreshTokenHash(refreshToken);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash.length).toBe(32);

    // Create the same hash again to ensure consistency
    const sameHash = await service.createRefreshTokenHash(refreshToken);
    expect(hash).toBe(sameHash);
  });
});
