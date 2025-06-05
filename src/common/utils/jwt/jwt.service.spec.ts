import { AUTH_CONFIG } from '@app/common/config/auth.config';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from './jwt.service';

describe('JwtService', () => {
  let service: JwtService;
  let nestJwtService: NestJwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtService,
        {
          provide: NestJwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('test-token'),
            verifyAsync: jest
              .fn()
              .mockResolvedValue({ sub: '123', email: 'test@example.com' }),
            decode: jest
              .fn()
              .mockReturnValue({ sub: '123', email: 'test@example.com' }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === `${AUTH_CONFIG}.jwt`) {
                return {
                  accessSecret: 'test-access-secret',
                  accessExpiration: '1h',
                  refreshSecret: 'test-refresh-secret',
                  refreshExpiration: '7d',
                };
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<JwtService>(JwtService);
    nestJwtService = module.get<NestJwtService>(NestJwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAccessToken', () => {
    it('should call nestJwtService.signAsync with correct parameters', async () => {
      const payload = { sub: 123 };

      await service.generateAccessToken(payload);

      expect(nestJwtService.signAsync).toHaveBeenCalledWith(
        payload,
        expect.objectContaining({
          secret: 'test-access-secret',
          expiresIn: '1h',
        }),
      );
    });

    it('should return the token from nestJwtService.signAsync', async () => {
      const result = await service.generateAccessToken({ sub: 123 });
      expect(result).toBe('test-token');
    });
  });

  describe('generateRefreshToken', () => {
    it('should call nestJwtService.signAsync with correct refresh parameters', async () => {
      const payload = { sub: 123 };

      await service.generateRefreshToken(payload);

      expect(nestJwtService.signAsync).toHaveBeenCalledWith(
        payload,
        expect.objectContaining({
          secret: 'test-refresh-secret',
          expiresIn: '7d',
        }),
      );
    });

    it('should return the token from nestJwtService.signAsync', async () => {
      const result = await service.generateRefreshToken({ sub: 123 });
      expect(result).toBe('test-token');
    });
  });

  describe('verifyAccessToken', () => {
    it('should call nestJwtService.verifyAsync with the token and access secret', async () => {
      await service.verifyAccessToken('some-token');

      expect(nestJwtService.verifyAsync).toHaveBeenCalledWith(
        'some-token',
        expect.objectContaining({
          secret: 'test-access-secret',
        }),
      );
    });

    it('should return the decoded payload', async () => {
      const result = await service.verifyAccessToken('some-token');
      expect(result).toEqual({ sub: '123', email: 'test@example.com' });
    });
  });

  describe('verifyRefreshToken', () => {
    it('should call nestJwtService.verifyAsync with the token and refresh secret', async () => {
      await service.verifyRefreshToken('some-refresh-token');

      expect(nestJwtService.verifyAsync).toHaveBeenCalledWith(
        'some-refresh-token',
        expect.objectContaining({
          secret: 'test-refresh-secret',
        }),
      );
    });

    it('should return the decoded payload', async () => {
      const result = await service.verifyRefreshToken('some-refresh-token');
      expect(result).toEqual({ sub: '123', email: 'test@example.com' });
    });
  });

  describe('decodeToken', () => {
    it('should call nestJwtService.decode with the token', () => {
      service.decodeToken('some-token');
      expect(nestJwtService.decode).toHaveBeenCalledWith('some-token');
    });

    it('should return the decoded payload', () => {
      const result = service.decodeToken('some-token');
      expect(result).toEqual({ sub: '123', email: 'test@example.com' });
    });
  });
});
