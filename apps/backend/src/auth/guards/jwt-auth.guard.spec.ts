import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@app/common';
import { JwtAuthGuard } from './jwt-auth.guard';

function createContext(handlerMeta: Record<string, unknown> = {}) {
  const handler = () => undefined;
  Object.entries(handlerMeta).forEach(([key, value]) => {
    Reflect.defineMetadata(key, value, handler);
  });

  return {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({ headers: {} }),
    }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('allows access to routes marked @Public without invoking passport', () => {
    const reflector = new Reflector();
    const guard = new JwtAuthGuard(reflector);
    const ctx = createContext({ [IS_PUBLIC_KEY]: true });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects a request with no user/token via handleRequest', () => {
    const reflector = new Reflector();
    const guard = new JwtAuthGuard(reflector);

    expect(() => guard.handleRequest(null, null, null)).toThrow();
  });
});
