import type { AuthTokenPayload } from '@eshop/shared';

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends AuthTokenPayload {}
  }
}
