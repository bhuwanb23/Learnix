import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../db/prisma.js';
import { env } from '../../config/env.js';
import { unauthenticated, forbidden, badRequest } from '../../lib/errors.js';
import { sha256 } from '../../lib/hash.js';
import type { Role } from '../../lib/enums.js';

interface AccessTokenPayload {
  sub: string;
  institutionId: string;
  roles: Role[];
}

function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.accessTokenTtl as jwt.SignOptions['expiresIn'],
  });
}

async function issueRefreshToken(userId: string, replacedById?: string): Promise<string> {
  const raw = randomUUID() + '.' + randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30d
  await prisma.refreshToken.create({
    data: { userId, tokenHash: sha256(raw), expiresAt, replacedById },
  });
  return raw;
}

export async function login(input: { email: string; password: string; institutionCode?: string }) {
  const users = await prisma.user.findMany({
    where: { email: input.email.toLowerCase(), deletedAt: null, status: 'ACTIVE' },
    include: { roles: true, institution: true },
  });
  if (users.length === 0) throw unauthenticated('Invalid email or password');

  let user = users[0];
  if (users.length > 1 && input.institutionCode) {
    const match = users.find((u) => u.institution.code === input.institutionCode);
    if (!match) throw unauthenticated('Invalid email or password');
    user = match;
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw unauthenticated('Invalid email or password');

  const roles = user.roles.map((r) => r.role as Role);
  const accessToken = signAccessToken({
    sub: user.id,
    institutionId: user.institutionId,
    roles,
  });
  const refreshToken = await issueRefreshToken(user.id);

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      institutionId: user.institutionId,
      institutionCode: user.institution.code,
      roles,
    },
  };
}

export async function refresh(rawToken: string) {
  const tokenHash = sha256(rawToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored) throw unauthenticated('Invalid refresh token');
  if (stored.revokedAt) {
    // Reuse detected: revoke the whole family (all tokens of this user)
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw forbidden('Refresh token reuse detected — all sessions revoked');
  }
  if (stored.expiresAt < new Date()) throw unauthenticated('Refresh token expired');

  const user = await prisma.user.findUnique({
    where: { id: stored.userId },
    include: { roles: true },
  });
  if (!user || user.deletedAt || user.status !== 'ACTIVE') {
    throw unauthenticated('User unavailable');
  }

  const roles = user.roles.map((r) => r.role as Role);
  const accessToken = signAccessToken({
    sub: user.id,
    institutionId: user.institutionId,
    roles,
  });
  const newRefreshToken = await issueRefreshToken(user.id, stored.id);
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date(), replacedById: newRefreshToken },
  });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: true,
      institution: { select: { id: true, name: true, code: true } },
      studentProfile: true,
      staffProfile: true,
    },
  });
  if (!user || user.deletedAt) throw unauthenticated('User unavailable');
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    status: user.status,
    institution: user.institution,
    roles: user.roles.map((r) => r.role),
    studentProfile: user.studentProfile,
    staffProfile: user.staffProfile,
  };
}

export async function logout(rawToken: string): Promise<void> {
  const tokenHash = sha256(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// ── X-02 — password reset (email delivery stubbed in v1 per ADR-07) ──

export async function forgotPassword(email: string) {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null, status: 'ACTIVE' },
  });

  // Always return ok — never leak whether the email exists.
  if (!user) return { ok: true };

  const raw = randomUUID() + '.' + randomUUID();
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash: sha256(raw),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h
    },
  });

  // v1: no mailer wired — token is returned only in non-production so the
  // flow is testable. In production this is where an email job goes.
  if (env.nodeEnv !== 'production') return { ok: true, devToken: raw };
  return { ok: true };
}

export async function resetPassword(token: string, newPassword: string) {
  const record = await prisma.passwordReset.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw badRequest('Invalid or expired reset token');
  }

  const passwordHash = await bcrypt.hash(newPassword, env.bcryptRounds);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Revoke every session — password change invalidates existing logins
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return { ok: true };
}

/**
 * Change the password of a SIGNED-IN user.
 *
 * The revocation below is the whole point of this function, and it was missing. The
 * forgot-password flow (`resetPassword`, ~30 lines above) revokes every session in the
 * same transaction and carries the comment "password change invalidates existing
 * logins" — but this path, which is what the Account Security screen calls, only
 * rewrote the hash. The observable consequence: change your password because you think
 * a device is compromised, and that device stays signed in until its refresh token
 * expires on its own.
 *
 * The transaction matters. Revoking in a separate statement opens a window where the
 * new hash is committed but the old sessions are still live — so a crash between them
 * leaves exactly the state this function exists to prevent.
 *
 * `keepTokenId` is the caller's OWN refresh token, passed when the request carries one.
 * It survives so the person who just changed their password is not logged out of the
 * device they did it on. Everything else is revoked. If the request has no refresh
 * token (an access-token-only client), every session goes and the caller is expected
 * to re-authenticate — that is the safer default, not a bug.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  keepTokenId?: string | null,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw unauthenticated('User unavailable');

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw unauthenticated('Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, env.bcryptRounds);

  const [, revoked] = await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({
      where: {
        userId: user.id,
        revokedAt: null,
        // Keep the session that made this change. `keepTokenId` is the RefreshToken
        // row id, resolved from the raw token by the route.
        ...(keepTokenId ? { NOT: { id: keepTokenId } } : {}),
      },
      data: { revokedAt: new Date() },
    }),
  ]);

  return { ok: true, revokedSessions: revoked.count, keptCurrentSession: Boolean(keepTokenId) };
}

/**
 * The caller's live sessions, newest first.
 *
 * "Live" means `revokedAt IS NULL AND expiresAt > now` — an expired-but-unrevoked row
 * is not a session, and counting it would tell somebody they are signed in on four
 * devices when they are signed in on one.
 *
 * There is no device label: `RefreshToken` stores no user agent or IP, so each row is
 * identified by when it started and when it lapses. That is a real limit and worth
 * saying out loud rather than dressing up `createdAt` as "Chrome on Windows" — adding
 * a `userAgent` column is the fix, and it touches every login path, so it is not a
 * change to smuggle in beside a bug fix.
 *
 * `isCurrent` is computed here rather than stored because "current" is a per-request
 * property: it depends on which token made the call.
 */
export async function listSessions(userId: string, currentTokenId?: string | null) {
  const now = new Date();
  const rows = await prisma.refreshToken.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, createdAt: true, expiresAt: true },
  });

  return {
    sessions: rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
      isCurrent: Boolean(currentTokenId) && r.id === currentTokenId,
    })),
    total: rows.length,
    // Called out in the response so the UI does not have to hardcode the limitation.
    note: 'Sessions are identified by start time only — no device information is stored.',
  };
}

/**
 * Revoke every live session for a user.
 *
 * `keepTokenId` behaves exactly as in `changePassword`: the caller's own session
 * survives so "sign out everywhere else" does not also sign out the device you pressed
 * it on. Omitting it is a genuine "sign me out of everything", which is what you want
 * when you have just realised the token cache is not yours.
 */
export async function revokeAllSessions(userId: string, keepTokenId?: string | null) {
  const res = await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(keepTokenId ? { NOT: { id: keepTokenId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
  return { revoked: res.count, keptCurrentSession: Boolean(keepTokenId) };
}

/**
 * Resolve a raw refresh token to its row id.
 *
 * Needed because `req.auth` carries only the JWT payload, so the only way to know
 * which session belongs to the device making the request is to look up the token the
 * client already holds. Returns null for an unknown or already-revoked token — the
 * caller's session is simply not excluded from the revocation, which is the safe
 * direction.
 */
export async function resolveTokenId(userId: string, rawToken?: string | null): Promise<string | null> {
  if (!rawToken) return null;
  const row = await prisma.refreshToken.findFirst({
    where: { tokenHash: sha256(rawToken), userId, revokedAt: null },
    select: { id: true },
  });
  return row?.id ?? null;
}

export { signAccessToken, sha256 };
