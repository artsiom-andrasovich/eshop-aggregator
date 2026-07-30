import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role, User, UserStatus } from '@prisma/client';
import { UsersService } from '@app/users/users.service';
import { TokenService } from '@app/token/token.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  hashSync: jest.fn().mockReturnValue('dummy-hash'),
  compare: jest.fn(),
}));

const compareMock = bcrypt.compare as unknown as jest.MockedFunction<
  (data: string, hash: string) => Promise<boolean>
>;

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<
    Pick<UsersService, 'findByEmail' | 'create' | 'findById'>
  >;
  let tokenService: jest.Mocked<
    Pick<
      TokenService,
      | 'generateTokens'
      | 'generateAccessToken'
      | 'rotate'
      | 'resolveUserId'
      | 'revokeToken'
    >
  >;

  const user: User = {
    id: 'user-1',
    email: 'test@example.com',
    displayName: 'TestUser',
    passwordHash: 'hashed-password',
    role: Role.USER,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    };

    tokenService = {
      generateTokens: jest.fn(),
      generateAccessToken: jest.fn(),
      rotate: jest.fn(),
      resolveUserId: jest.fn(),
      revokeToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: TokenService, useValue: tokenService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('throws ConflictException if email already in use', async () => {
      usersService.findByEmail.mockResolvedValue(user);

      await expect(
        service.register(
          {
            email: 'test@example.com',
            displayName: 'TestUser',
            password: 'password123',
          },
          'agent',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('creates a user and returns tokens', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(user);
      tokenService.generateTokens.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'ref',
      });

      const result = await service.register(
        {
          email: 'test@example.com',
          displayName: 'TestUser',
          password: 'password123',
        },
        'agent',
      );

      expect(usersService.create).toHaveBeenCalled();
      expect(result.tokens.accessToken).toBe('access-token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException for unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      compareMock.mockResolvedValue(false);

      await expect(
        service.login(
          { email: 'nobody@example.com', password: 'password123' },
          'agent',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('compares against a dummy hash when the email is unknown', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      compareMock.mockResolvedValue(false);

      await expect(
        service.login(
          { email: 'nobody@example.com', password: 'password123' },
          'agent',
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(compareMock).toHaveBeenCalledWith('password123', 'dummy-hash');
    });

    it('throws UnauthorizedException for wrong password', async () => {
      usersService.findByEmail.mockResolvedValue(user);
      compareMock.mockResolvedValue(false);

      await expect(
        service.login(
          { email: 'test@example.com', password: 'wrong' },
          'agent',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens on successful login', async () => {
      usersService.findByEmail.mockResolvedValue(user);
      compareMock.mockResolvedValue(true);
      tokenService.generateTokens.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'ref',
      });

      const result = await service.login(
        { email: 'test@example.com', password: 'correct' },
        'agent',
      );

      expect(result.tokens.accessToken).toBe('access-token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('refreshTokens', () => {
    it('returns new access and refresh tokens', async () => {
      tokenService.resolveUserId.mockResolvedValue('user-1');
      usersService.findById.mockResolvedValue(user);
      tokenService.rotate.mockResolvedValue({
        refreshToken: 'new-ref',
        userId: 'user-1',
      });
      tokenService.generateAccessToken.mockReturnValue('new-access-token');

      const result = await service.refreshTokens('old-ref', 'agent');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-ref');
      expect(tokenService.rotate).toHaveBeenCalledWith('old-ref', 'agent');
    });

    it('revokes the token and does not rotate when the user is blocked', async () => {
      tokenService.resolveUserId.mockResolvedValue('user-1');
      usersService.findById.mockResolvedValue({
        ...user,
        status: UserStatus.BLOCKED,
      });

      await expect(
        service.refreshTokens('old-ref', 'agent'),
      ).rejects.toThrow(UnauthorizedException);

      expect(tokenService.revokeToken).toHaveBeenCalledWith('old-ref');
      expect(tokenService.rotate).not.toHaveBeenCalled();
    });
  });
});