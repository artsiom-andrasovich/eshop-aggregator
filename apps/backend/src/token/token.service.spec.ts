import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, User, UserStatus } from '@prisma/client';
import { PrismaService } from '@app/prisma/prisma.service';
import { TokenService } from './token.service';
import { UnauthorizedException } from '@nestjs/common';

const anyDate = expect.any(Date) as Date;

describe('TokenService', () => {
  let service: TokenService;
  let prisma: {
    refreshToken: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const user: User = {
    id: 'user-1',
    email: 'user@example.com',
    displayName: 'user1',
    passwordHash: 'hashed',
    role: Role.USER,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'new-token-id' }),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn((cb: (tx: typeof prisma) => Promise<unknown>) =>
        cb(prisma),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: PrismaService, useValue: prisma },
        JwtService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, fallback?: unknown) => {
              if (key === 'JWT_ACCESS_SECRET') return 'test-secret';
              if (key === 'REFRESH_TOKEN_TTL_DAYS') return '7';
              return fallback;
            },
          },
        },
      ],
    })
      .overrideProvider(JwtService)
      .useValue(new JwtService({ secret: 'test-secret' }))
      .compile();

    service = module.get(TokenService);
  });

  describe('generateTokens', () => {
    it('signs an access token that can be decoded back to the payload', async () => {
      const tokens = await service.generateTokens(user, 'jest-agent');

      expect(tokens.accessToken.startsWith('Bearer')).toBe(false);

      const jwtService = new JwtService({ secret: 'test-secret' });
      const decoded = jwtService.verify<{
        id: string;
        email: string;
        role: string;
      }>(tokens.accessToken);

      expect(decoded).toMatchObject({
        id: user.id,
        email: user.email,
        role: user.role,
      });
      expect(prisma.refreshToken.create).toHaveBeenCalled();
      expect(tokens.refreshToken).toBeDefined();
    });
  });

  describe('rotate', () => {
    it('rotates a valid token', async () => {
      const existingToken = {
        id: '1',
        userId: 'user-1',
        familyId: 'family-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 10000),
      };
      prisma.refreshToken.findUnique.mockResolvedValue(existingToken);

      const result = await service.rotate('some-token', 'agent');

      expect(result.userId).toBe('user-1');
      expect(result.refreshToken).toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.refreshToken.create).toHaveBeenCalled();
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: '1', revokedAt: null },
        data: { revokedAt: anyDate },
      });
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { replacedById: 'new-token-id' },
      });
    });

    it('revokes the family when a concurrent refresh already consumed the token', async () => {
      const existingToken = {
        id: '1',
        userId: 'user-1',
        familyId: 'family-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 10000),
      };
      prisma.refreshToken.findUnique.mockResolvedValue(existingToken);
      prisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.rotate('some-token', 'agent')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
      expect(prisma.refreshToken.updateMany).toHaveBeenLastCalledWith({
        where: { familyId: 'family-1', revokedAt: null },
        data: { revokedAt: anyDate },
      });
    });

    it('throws UnauthorizedException and revokes family if token is already revoked', async () => {
      const existingToken = {
        id: '1',
        userId: 'user-1',
        familyId: 'family-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 10000),
      };
      prisma.refreshToken.findUnique.mockResolvedValue(existingToken);

      await expect(service.rotate('some-token', 'agent')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: 'family-1', revokedAt: null },
        data: { revokedAt: anyDate },
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException if token is expired', async () => {
      const existingToken = {
        id: '1',
        userId: 'user-1',
        familyId: 'family-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 10000),
      };
      prisma.refreshToken.findUnique.mockResolvedValue(existingToken);

      await expect(service.rotate('some-token', 'agent')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
