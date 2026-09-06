import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  institutionCode: z.string().min(1).optional(), // scope when email exists in multiple colleges
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});
