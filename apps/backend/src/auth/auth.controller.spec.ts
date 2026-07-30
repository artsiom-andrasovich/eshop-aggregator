import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { TokenService } from '@app/token/token.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { ThrottlerModule } from '@nestjs/throttler';

interface MockResponse {
  cookie: jest.Mock;
  clearCookie: jest.Mock;
}

const createMockResponse = (): MockResponse => ({
  cookie: jest.fn(),
  clearCookie: jest.fn(),
});

const createTokens = (accessToken: string, refreshToken: string) => ({
  accessToken,
  refreshToken,
});

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<
    Pick<
      AuthService,
      'register' | 'login' | 'refreshTokens' | 'logout' | 'logoutAll'
    >
  >;
  let tokenService: jest.Mocked<
    Pick<TokenService, 'setRefreshTokenToCookies' | 'clearRefreshTokenCookie'>
  >;

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refreshTokens: jest.fn(),
      logout: jest.fn(),
      logoutAll: jest.fn(),
    };
    tokenService = {
      setRefreshTokenToCookies: jest.fn(),
      clearRefreshTokenCookie: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }])],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: TokenService, useValue: tokenService },
      ],
    }).compile();

    controller = module.get(AuthController);
  });

  it('register returns the created user shape and sets cookie', async () => {
    const user = {
      id: '1',
      email: 'a@b.com',
      displayName: 'abuser',
      role: 'USER' as const,
      createdAt: new Date(),
    };
    const tokens = createTokens('access-token', 'refresh-1');
    authService.register.mockResolvedValue({ user, tokens });
    const res = createMockResponse();

    const result = await controller.register(
      {
        email: 'a@b.com',
        password: 'Str0ng!Passw0rd',
        displayName: 'abuser',
      },
      'jest-agent',
      res as unknown as Response,
    );

    expect(tokenService.setRefreshTokenToCookies).toHaveBeenCalledWith(
      'refresh-1',
      res,
    );
    expect(result).toEqual({ user, accessToken: 'access-token' });
  });

  it('login sets the refresh cookie and returns the access token', async () => {
    const user = {
      id: '1',
      email: 'a@b.com',
      displayName: 'abuser',
      role: 'USER' as const,
      createdAt: new Date(),
    };
    const tokens = createTokens('access-token', 'refresh-1');
    authService.login.mockResolvedValue({ user, tokens });
    const res = createMockResponse();

    const result = await controller.login(
      { email: 'a@b.com', password: 'Str0ng!Passw0rd' },
      'jest-agent',
      res as unknown as Response,
    );

    expect(tokenService.setRefreshTokenToCookies).toHaveBeenCalledWith(
      'refresh-1',
      res,
    );
    expect(result).toEqual({ user, accessToken: 'access-token' });
  });

  it('refreshTokens rotates the cookie and returns a new access token', async () => {
    const tokens = createTokens('new-access-token', 'refresh-2');
    authService.refreshTokens.mockResolvedValue(tokens);
    const res = createMockResponse();

    const result = await controller.refreshTokens(
      'old-refresh-token',
      'jest-agent',
      res as unknown as Response,
    );

    expect(authService.refreshTokens).toHaveBeenCalledWith(
      'old-refresh-token',
      'jest-agent',
    );
    expect(tokenService.setRefreshTokenToCookies).toHaveBeenCalledWith(
      'refresh-2',
      res,
    );
    expect(result).toEqual({ accessToken: 'new-access-token' });
  });

  it('logout deletes the refresh token and clears the cookie', async () => {
    const res = createMockResponse();

    await controller.logout('refresh-1', res as unknown as Response);

    expect(authService.logout).toHaveBeenCalledWith('refresh-1');
    expect(tokenService.clearRefreshTokenCookie).toHaveBeenCalledWith(res);
  });

  it('logoutAll calls authService.logoutAll', async () => {
    await controller.logoutAll('user-id');
    expect(authService.logoutAll).toHaveBeenCalledWith('user-id');
  });

  it('me returns the current user from the request', () => {
    const user: JwtPayload = {
      id: '1',
      email: 'a@b.com',
      displayName: 'abuser',
      role: 'USER',
      status: 'ACTIVE',
    };

    const result = controller.me(user);

    expect(result).toBe(user);
  });
});
