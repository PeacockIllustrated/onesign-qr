/**
 * Zod validation schemas for authentication operations
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Reusable field schemas
// ---------------------------------------------------------------------------

/** Email field — trimmed, lowercased, max 254 per RFC 5321 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(254, 'Email is too long')
  .transform((s) => s.trim().toLowerCase());

/** Password field — 8-72 chars (72 = bcrypt limit used by Supabase) */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters');

// ---------------------------------------------------------------------------
// Form schemas
// ---------------------------------------------------------------------------

/** Sign-in form */
export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

/** Sign-up form — includes confirm password */
export const signUpSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/** Forgot password form */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/** Reset password form — includes confirm password */
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
