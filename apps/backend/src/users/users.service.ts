import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '@app/prisma/prisma.service';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  displayName: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  public async create(dto: CreateUserData): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: dto.passwordHash,
        displayName: dto.displayName,
      },
    });
  }

  public async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });
  }

  public async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
