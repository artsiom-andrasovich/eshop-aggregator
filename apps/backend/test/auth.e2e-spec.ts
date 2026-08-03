import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import cookieParser from 'cookie-parser';

const refreshCookieOf = (res: request.Response): string => {
  const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = cookies?.find((c) => c.startsWith('refreshtoken='));
  if (!cookie) {
    throw new Error('response did not set a refreshtoken cookie');
  }
  return cookie;
};

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('Authentication Lifecycle', () => {
    it('handles full lifecycle: register -> me -> refresh -> login -> logout', async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          displayName: 'Tester',
        })
        .expect(201);

      const registerBody = registerRes.body as {
        accessToken: string;
        user: { email: string };
      };
      expect(registerBody.user.email).toBe('test@example.com');

      const refreshTokenCookie = refreshCookieOf(registerRes);
      expect(refreshTokenCookie).toContain('HttpOnly');
      expect(refreshTokenCookie).toContain('Path=/api/auth');

      const accessToken = registerBody.accessToken;
      expect(accessToken.startsWith('Bearer')).toBe(false);

      const meRes = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect((meRes.body as { email: string }).email).toBe('test@example.com');

      await request(app.getHttpServer()).get('/api/auth/me').expect(401);

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid')
        .expect(401);

      const refreshRes = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', refreshTokenCookie)
        .expect(200);

      expect((refreshRes.body as { accessToken: string }).accessToken).toEqual(
        expect.any(String),
      );
      const newRefreshTokenCookie = refreshCookieOf(refreshRes);
      expect(newRefreshTokenCookie).not.toEqual(refreshTokenCookie);

      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', refreshTokenCookie)
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', newRefreshTokenCookie)
        .expect(401);

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Password123!' })
        .expect(200);

      const loginRefreshTokenCookie = refreshCookieOf(loginRes);

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', loginRefreshTokenCookie)
        .expect(204);

      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', loginRefreshTokenCookie)
        .expect(401);
    });
  });
});
