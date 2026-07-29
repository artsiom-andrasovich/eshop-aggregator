import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TokenService } from '@app/token/token.service';
import { UsersService } from '@app/users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from '@prisma/client';

const BCRYPT_ROUNDS = 12;
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('dummy', BCRYPT_ROUNDS);

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
  ) {}

  public async register(dto: RegisterDto, agent: string) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      displayName: dto.displayName,
    });

    const tokens = await this.tokenService.generateTokens(user, agent);
    return {
      user: this.mapUser(user),
      tokens,
    };
  }

  public async login(dto: LoginDto, agent: string) {
    const user = await this.usersService.findByEmail(dto.email);
    const isMatch = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !isMatch || user.status === 'BLOCKED') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.tokenService.generateTokens(user, agent);
    return {
      user: this.mapUser(user),
      tokens,
    };
  }

  public async refreshTokens(refreshToken: string, agent: string) {
    const { refreshToken: newRefreshToken, userId } =
      await this.tokenService.rotate(refreshToken, agent);
    const user = await this.usersService.findById(userId);
    if (!user || user.status === 'BLOCKED') {
      throw new UnauthorizedException();
    }
    const accessToken = this.tokenService.generateAccessToken(user);
    return { accessToken, refreshToken: newRefreshToken };
  }

  public async logout(refreshToken: string) {
    await this.tokenService.revokeToken(refreshToken);
  }

  public async logoutAll(userId: string) {
    await this.tokenService.revokeAllForUser(userId);
  }

  private mapUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
