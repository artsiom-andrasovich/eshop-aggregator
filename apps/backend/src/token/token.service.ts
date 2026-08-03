import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { Response } from 'express';
import * as crypto from 'node:crypto';
import { PrismaService } from '@app/prisma/prisma.service';
import { toAuthTokenPayload } from '@app/users/user.mapper';

const REFRESH_TOKEN_COOKIE = 'refreshtoken';
const REFRESH_TOKEN_BYTES = 32;

class RefreshTokenReuseError extends Error {}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  public generateAccessToken(user: User): string {
    return this.jwtService.sign(toAuthTokenPayload(user));
  }

  public async generateTokens(user: User, agent: string): Promise<Tokens> {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(user.id, agent);
    return { accessToken, refreshToken };
  }

  public async resolveUserId(presentedToken: string): Promise<string> {
    const record = await this.findActiveRefreshToken(presentedToken);
    return record.userId;
  }

  public async rotate(
    presentedToken: string,
    agent: string,
  ): Promise<{ refreshToken: string; userId: string }> {
    const record = await this.findActiveRefreshToken(presentedToken);

    const newValue = this.generateTokenValue();
    const newHash = this.hashToken(newValue);
    const ttlDays = parseInt(
      this.configService.get('REFRESH_TOKEN_TTL_DAYS', '7'),
      10,
    );
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    try {
      await this.prisma.$transaction(async (tx) => {
        // Guarded revoke: only one concurrent refresh can claim the same token.
        const claimed = await tx.refreshToken.updateMany({
          where: { id: record.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        if (claimed.count === 0) {
          throw new RefreshTokenReuseError();
        }

        const newToken = await tx.refreshToken.create({
          data: {
            userId: record.userId,
            tokenHash: newHash,
            familyId: record.familyId,
            expiresAt,
            userAgent: agent,
          },
        });
        await tx.refreshToken.update({
          where: { id: record.id },
          data: { replacedById: newToken.id },
        });
      });
    } catch (error) {
      if (error instanceof RefreshTokenReuseError) {
        await this.revokeFamily(record.familyId);
        throw new UnauthorizedException();
      }
      throw error;
    }

    return { refreshToken: newValue, userId: record.userId };
  }

  public async revokeToken(presentedToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(presentedToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  public async revokeFamily(familyId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  public async revokeAllForUser(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  public setRefreshTokenToCookies(refreshToken: string, res: Response): void {
    const ttlDays = parseInt(
      this.configService.get('REFRESH_TOKEN_TTL_DAYS', '7'),
      10,
    );
    const secure = this.configService.get<string>('COOKIE_SECURE') === 'true';

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: secure ? 'none' : 'lax',
      expires: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000),
      secure,
      path: '/api/auth',
    });
  }

  public clearRefreshTokenCookie(res: Response): void {
    const secure = this.configService.get<string>('COOKIE_SECURE') === 'true';
    res.cookie(REFRESH_TOKEN_COOKIE, '', {
      httpOnly: true,
      sameSite: secure ? 'none' : 'lax',
      expires: new Date(0),
      secure,
      path: '/api/auth',
    });
  }

  private generateTokenValue(): string {
    return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
  }

  // SHA-256, not bcrypt: token is high-entropy and must be lookup-able by hash.
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async findActiveRefreshToken(presentedToken: string) {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(presentedToken) },
    });

    if (!record) throw new UnauthorizedException();

    if (record.revokedAt !== null) {
      await this.revokeFamily(record.familyId);
      throw new UnauthorizedException();
    }

    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException();
    }

    return record;
  }

  private async createRefreshToken(
    userId: string,
    agent: string,
  ): Promise<string> {
    const token = this.generateTokenValue();
    const hash = this.hashToken(token);
    const familyId = crypto.randomUUID();
    const ttlDays = parseInt(
      this.configService.get('REFRESH_TOKEN_TTL_DAYS', '7'),
      10,
    );
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hash,
        familyId,
        expiresAt,
        userAgent: agent,
      },
    });

    return token;
  }
}
