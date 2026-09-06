import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';

export async function writeAudit(entry: {
  actorUserId?: string | null;
  institutionId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorUserId: entry.actorUserId ?? null,
      institutionId: entry.institutionId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      beforeJson: entry.before === undefined ? null : JSON.stringify(entry.before),
      afterJson: entry.after === undefined ? null : JSON.stringify(entry.after),
      ip: entry.ip ?? null,
    },
  }).catch((err) => {
    // Audit must never break the request path; log loudly in dev.
    if (env.nodeEnv === 'development') console.error('[audit] write failed', err);
  });
}
