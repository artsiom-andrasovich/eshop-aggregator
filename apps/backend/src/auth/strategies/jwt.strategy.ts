import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { toAuthTokenPayload } from '@app/users/user.mapper';
import { UsersService } from '@app/users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') ?? '',
    });
  }

  public async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.usersService.findById(payload.id).catch(() => null);
    if (!user || user.status === 'BLOCKED') {
      throw new UnauthorizedException();
    }
    return toAuthTokenPayload(user);
  }
}
