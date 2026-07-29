import type { AuthTokenPayload } from '@eshop/shared';
import type { User } from '@prisma/client';

export const toAuthTokenPayload = (user: User): AuthTokenPayload => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  role: user.role,
  status: user.status,
});
