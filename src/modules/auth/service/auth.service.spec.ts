import { CryptoService } from '@app/common/utils/crypto/crypto.service';
import { JwtService } from '@app/common/utils/jwt/jwt.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../users/entities/users.entity';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    const mockJwtService = {
      generateTokens: jest.fn(),
      verifyRefreshToken: jest.fn(),
    };

    const mockCryptoService = {
      hashPassword: jest.fn(),
      verifyPassword: jest.fn(),
    };

    const mockTokenService = {
      createRefreshToken: jest.fn(),
      deleteRefreshToken: jest.fn(),
      findRefreshToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: CryptoService,
          useValue: mockCryptoService,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
