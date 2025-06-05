import { Token } from '@app/modules/auth/entities/tokens.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenCleanupService } from './token-cleanup.service';

describe('TokenCleanupService', () => {
  let service: TokenCleanupService;
  let tokenRepository: jest.Mocked<Repository<Token>>;

  beforeEach(async () => {
    const mockTokenRepository = {
      delete: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenCleanupService,
        {
          provide: getRepositoryToken(Token),
          useValue: mockTokenRepository,
        },
      ],
    }).compile();

    service = module.get<TokenCleanupService>(TokenCleanupService);
    tokenRepository = module.get(getRepositoryToken(Token));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired tokens', async () => {
      const mockResult = { affected: 5 };
      tokenRepository.delete.mockResolvedValue(mockResult as any);

      await service.cleanupExpiredTokens();

      expect(tokenRepository.delete).toHaveBeenCalledWith({
        expiresAt: expect.any(Object), // LessThan(new Date())
      });
    });

    it('should handle no expired tokens', async () => {
      const mockResult = { affected: 0 };
      tokenRepository.delete.mockResolvedValue(mockResult as any);

      await service.cleanupExpiredTokens();

      expect(tokenRepository.delete).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      tokenRepository.delete.mockRejectedValue(new Error('Database error'));

      await expect(service.cleanupExpiredTokens()).resolves.not.toThrow();
    });
  });

  describe('cleanupOldRevokedTokens', () => {
    it('should delete old revoked tokens', async () => {
      const mockResult = { affected: 3 };
      tokenRepository.delete.mockResolvedValue(mockResult as any);
      await service.cleanupOldRevokedTokens();

      expect(tokenRepository.delete).toHaveBeenCalledWith({
        deletedAt: expect.any(Object), // Not(IsNull())
        updatedAt: expect.any(Object), // LessThan(thirtyDaysAgo)
      });
    });
  });

  describe('logTokenStatistics', () => {
    it('should log token statistics', async () => {
      tokenRepository.count
        .mockResolvedValueOnce(10) // active tokens
        .mockResolvedValueOnce(5) // expired tokens
        .mockResolvedValueOnce(2); // revoked tokens

      await service.logTokenStatistics();

      expect(tokenRepository.count).toHaveBeenCalledTimes(3);
    });

    it('should handle errors gracefully', async () => {
      tokenRepository.count.mockRejectedValue(new Error('Database error'));

      await expect(service.logTokenStatistics()).resolves.not.toThrow();
    });
  });
});
