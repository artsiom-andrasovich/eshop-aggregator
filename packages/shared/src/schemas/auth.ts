import { z } from 'zod';
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
} from '../constants/limits';

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters long`)
  .max(PASSWORD_MAX, `Password cannot be longer than ${PASSWORD_MAX} characters`)
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a symbol')
  .refine((val) => new TextEncoder().encode(val).length <= 72, 'Password cannot exceed 72 bytes');

export const registerSchema = z
  .object({
    email: z.email('Invalid email address').trim().toLowerCase(),
    password: passwordSchema,
    displayName: z.string().min(1, 'Display name is required'),
  })
  .meta({ id: 'Register' });

export const loginSchema = z
  .object({
    email: z.email('Invalid email address').trim().toLowerCase(),
    password: z.string().min(1, 'Password is required'),
  })
  .meta({ id: 'Login' });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
