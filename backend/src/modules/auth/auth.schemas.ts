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

/**
 * `refreshToken` is optional and exists for one reason: to keep the CALLER'S OWN
 * session alive while revoking every other one.
 *
 * `req.auth` carries only the JWT payload (userId, institutionId, roles) — it has no
 * refresh token, and the raw token is stored client-side anyway. So the client sends
 * the refresh token it already holds, and the route resolves it to a row id to exclude
 * from the revocation.
 *
 * Omitting it revokes EVERYTHING including the caller's own, which is the correct
 * fail-safe: somebody whose client cannot produce the token gets signed out rather than
 * silently keeping a session during a password change.
 *
 * `max(512)` rather than a tighter bound: the token is `randomUUID().randomUUID()`,
 * so it is a fixed 73 characters, and a cap that tight would break silently if that
 * ever changed.
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
  refreshToken: z.string().min(1).max(512).optional(),
});

export const sessionScopeSchema = z.object({
  refreshToken: z.string().min(1).max(512).optional(),
});
