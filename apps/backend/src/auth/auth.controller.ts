import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Cookies, CurrentUser, Public, UserAgent } from '@app/common';
import { TokenService } from '@app/token/token.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { ThrottlerGuard } from '@nestjs/throttler';

const REFRESH_TOKEN_COOKIE = 'refreshtoken';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  public async register(
    @Body() dto: RegisterDto,
    @UserAgent() agent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.register(dto, agent);
    this.tokenService.setRefreshTokenToCookies(tokens.refreshToken, res);
    return { user, accessToken: tokens.accessToken };
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  public async login(
    @Body() dto: LoginDto,
    @UserAgent() agent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.login(dto, agent);
    this.tokenService.setRefreshTokenToCookies(tokens.refreshToken, res);
    return { user, accessToken: tokens.accessToken };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout' })
  @ApiResponse({ status: 204, description: 'Logout successful' })
  public async logout(
    @Cookies(REFRESH_TOKEN_COOKIE) refreshToken: string | null,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    this.tokenService.clearRefreshTokenCookie(res);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({ status: 204, description: 'Logout all successful' })
  public async logoutAll(@CurrentUser('id') userId: string) {
    await this.authService.logoutAll(userId);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  public async refreshTokens(
    @Cookies(REFRESH_TOKEN_COOKIE) refreshToken: string | null,
    @UserAgent() agent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!refreshToken) {
      throw new UnauthorizedException();
    }
    const tokens = await this.authService.refreshTokens(refreshToken, agent);
    this.tokenService.setRefreshTokenToCookies(tokens.refreshToken, res);
    return { accessToken: tokens.accessToken };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user' })
  public me(@CurrentUser() user: JwtPayload) {
    return user;
  }
}
