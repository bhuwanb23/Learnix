import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomUUID } from 'node:crypto';
import { prisma } from '../../db/prisma.js';
import { env } from '../../config/env.js';
import { unauthenticated, forbidden, badRequest } from '../../lib/errors.js';
import type { Role } from '../../lib/enums.js';

interface AccessTokenPayload {
  sub: string;
  institutionId: string;
  roles: Role[];
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
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

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw unauthenticated('User unavailable');

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw unauthenticated('Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, env.bcryptRounds);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return { ok: true };
}

export { signAccessToken, sha256 };
