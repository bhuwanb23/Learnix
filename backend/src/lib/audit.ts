// Audit helper. The audit_logs table belongs to Domain L (system), which lands
// later in the domain-by-domain build — until then this is a console stub so
// the request path never breaks. Wire to prisma.auditLog when Domain L lands.

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
  // TODO(Domain L): persist to audit_logs table.
  console.info(
    `[audit] ${entry.action} ${entry.entityType}:${entry.entityId ?? '-'} by ${entry.actorUserId ?? '-'}`,
  );
}
