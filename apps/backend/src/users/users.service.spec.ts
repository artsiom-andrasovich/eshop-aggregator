import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@app/prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      create: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(UsersService);
  });

  describe('create', () => {
    it('creates user with passed hash and lowercases email', async () => {
      const dto = {
        email: 'Test@Example.com',
        displayName: 'TestUser',
        passwordHash: 'hashed-password',
      };

      prisma.user.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: '1', ...data }),
      );

      const result = await service.create(dto);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          displayName: 'TestUser',
          passwordHash: 'hashed-password',
        },
      });
      expect(result.passwordHash).toBe(dto.passwordHash);
    });
  });

  describe('findByEmail', () => {
    it('returns null when the user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await service.findByEmail('nobody@example.com');
      expect(result).toBeNull();
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'nobody@example.com' },
      });
    });
  });
});
