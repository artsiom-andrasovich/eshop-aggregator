import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const Cookies = createParamDecorator(
  (key: string | undefined, ctx: ExecutionContext) => {
    const { cookies } = ctx.switchToHttp().getRequest<Request>();
    return key ? ((cookies as Record<string, string>)?.[key] ?? null) : cookies;
  },
);
