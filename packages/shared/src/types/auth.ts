export type Role = 'USER' | 'ADMIN'; // must match schema.prisma's Role enum

export const ROLES: Role[] = ['USER', 'ADMIN'];

export interface AuthTokenPayload {
  id: string;
  email: string;
  displayName: string;
  status: 'ACTIVE' | 'BLOCKED'; // must match schema.prisma's UserStatus enum
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
}
