// Audit helper (ADR-10) — persists every state-changing mutation to audit_logs
// (Domain L). Audit writes must never break the request path: failures are
// logged and swallowed. actorUserId/institutionId may be null for system actions.
import { prisma } from '../db/prisma.js';

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
  try {
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
    });
  } catch (err) {
    console.error('[audit] write failed', err);
  }
}
