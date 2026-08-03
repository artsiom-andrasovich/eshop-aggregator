import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthTokenPayload } from '@eshop/shared';
import type { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (
    key: keyof AuthTokenPayload | undefined,
    ctx: ExecutionContext,
  ): AuthTokenPayload | AuthTokenPayload[keyof AuthTokenPayload] => {
    const { user } = ctx.switchToHttp().getRequest<Request>();
    if (!user) {
      throw new UnauthorizedException();
    }
    return key ? user[key] : user;
  },
);
