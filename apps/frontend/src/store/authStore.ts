import { create } from 'zustand';
import type { AuthTokenPayload } from '@eshop/shared';

interface AuthState {
  user: AuthTokenPayload | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthTokenPayload, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
  clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false }),
}));
