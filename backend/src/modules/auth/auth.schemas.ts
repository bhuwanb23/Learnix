import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  institutionCode: z.string().min(1).optional(), // scope when email exists in multiple colleges
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

// X-02 — password reset flow
export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(72),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});
