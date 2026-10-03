// L-06 Digital library service — e-resource catalog, access grants, usage stats.
// Docs: users/07-library-staff.md §3.6 · §4 L-06
//
// Two invariants worth stating:
//  1. Audience grants point at a Program OR a Batch. Both sides must resolve to a
//     readable label, otherwise a batch grant renders blank in the UI.
//  2. `DigitalResource.accessCount` is denormalized. `recordAccess()` is the only
//     writer: it appends a DigitalResourceAccess row AND re-aggregates the counter
//     in the same call, so the stat can never drift from the log.
import { prisma } from '../../db/prisma.js';
import { notFound, conflict, unprocessable, badRequest } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

export const RESOURCE_TYPES = ['PDF', 'EBOOK', 'JOURNAL'] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

const grantInclude = {
  program: { select: { id: true, name: true, code: true, level: true } },
  batch: { select: { id: true, name: true, startYear: true, graduationYear: true } },
} as const;

type GrantRow = {
  id: string;
  programId: string | null;
  batchId: string | null;
  program: { id: string; name: string; code: string; level: string } | null;
  batch: { id: string; name: string; startYear: number; graduationYear: number } | null;
};

/** Resolve a grant into a label the UI can always render. */
function shapeGrant(g: GrantRow) {
  if (g.batch) {
    return {
      id: g.id,
      scope: 'BATCH' as const,
      programId: g.programId,
      batchId: g.batchId,
      label: g.batch.name,
      detail: `Batch ${g.batch.startYear}–${g.batch.graduationYear}`,
    };
  }
  if (g.program) {
    return {
      id: g.id,
      scope: 'PROGRAM' as const,
      programId: g.programId,
      batchId: null,
      label: g.program.name,
      detail: `${g.program.code} · ${g.program.level}`,
    };
  }
  // Orphaned grant (program/batch deleted) — surface it rather than hiding it.
  return {
    id: g.id,
    scope: 'UNKNOWN' as const,
    programId: g.programId,
    batchId: g.batchId,
    label: 'Deleted audience',
    detail: 'No longer linked to a program or batch',
  };
}

function shapeResource(r: {
  id: string; title: string; type: string; subject: string | null; license: string | null;
  externalUrl: string | null; description: string | null; publisher: string | null;
  status: string; accessCount: number; createdAt: Date; updatedAt: Date;
  grants: GrantRow[];
}) {
  const grants = r.grants.map(shapeGrant);
  return {
    id: r.id,
    title: r.title,
    type: r.type,
    subject: r.subject,
    license: r.license,
    externalUrl: r.externalUrl,
    description: r.description,
    publisher: r.publisher,
    status: r.status,
    accessCount: r.accessCount,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    grants,
    // Programs covered = distinct programs reached directly or via a batch.
    programCount: new Set(
      grants.map((g) => g.programId).filter((id): id is string => Boolean(id)),
    ).size,
    isPublic: grants.length === 0,
  };
}

const resourceInclude = { grants: { include: grantInclude, orderBy: { createdAt: 'asc' } } } as const;

// ── List ────────────────────────────────────────────────────
export type ResourceFilter = {
  q?: string;
  type?: string;
  status?: 'ALL' | 'ACTIVE' | 'ARCHIVED';
  audience?: 'ALL' | 'GRANTED' | 'PUBLIC';
  sort?: 'TITLE' | 'NEWEST' | 'POPULAR';
};

export async function listDigitalResources(
  institutionId: string,
  filter: ResourceFilter,
) {
  const where: Record<string, unknown> = { institutionId };

  if (filter.status && filter.status !== 'ALL') where.status = filter.status;
  if (filter.type && filter.type !== 'ALL') where.type = filter.type;
  if (filter.audience === 'GRANTED') where.grants = { some: {} };
  if (filter.audience === 'PUBLIC') where.grants = { none: {} };

  if (filter.q) {
    where.OR = [
      { title: { contains: filter.q } },
      { subject: { contains: filter.q } },
      { publisher: { contains: filter.q } },
      { license: { contains: filter.q } },
      { description: { contains: filter.q } },
    ];
  }

  const orderBy =
    filter.sort === 'POPULAR'
      ? { accessCount: 'desc' as const }
      : filter.sort === 'NEWEST'
        ? { createdAt: 'desc' as const }
        : { title: 'asc' as const };

  const resources = await prisma.digitalResource.findMany({
    where,
    include: resourceInclude,
    orderBy,
  });

  const shaped = resources.map(shapeResource);
  const subjects = [...new Set(resources.map((r) => r.subject).filter(Boolean))].sort() as string[];

  const byType = (t: string) => shaped.filter((r) => r.type === t).length;

  return {
    stats: {
      total: shaped.length,
      active: shaped.filter((r) => r.status === 'ACTIVE').length,
      archived: shaped.filter((r) => r.status === 'ARCHIVED').length,
      totalAccessGrants: shaped.reduce((s, r) => s + r.grants.length, 0),
      totalAccesses: shaped.reduce((s, r) => s + r.accessCount, 0),
      publicResources: shaped.filter((r) => r.isPublic).length,
      byType: {
        PDF: byType('PDF'),
        EBOOK: byType('EBOOK'),
        JOURNAL: byType('JOURNAL'),
      },
    },
    subjects,
    resources: shaped,
  };
}

// ── Detail ──────────────────────────────────────────────────
export async function getDigitalResourceDetail(institutionId: string, resourceId: string) {
  const resource = await prisma.digitalResource.findFirst({
    where: { id: resourceId, institutionId },
    include: resourceInclude,
  });
  if (!resource) throw notFound('Digital resource not found');

  // Recent access log so the librarian can see who is actually using the resource.
  const recentAccess = await prisma.digitalResourceAccess.findMany({
    where: { resourceId },
    include: {
      resource: false,
    },
    orderBy: { createdAt: 'desc' },
    take: 25,
  });

  const shaped = shapeResource(resource);
  const last7 = new Date();
  last7.setDate(last7.getDate() - 7);
  const accessesLast7 = recentAccess.filter((a) => a.createdAt >= last7).length;

  return {
    ...shaped,
    usage: {
      totalAccesses: resource.accessCount,
      recentAccesses: recentAccess.length,
      accessesLast7,
      lastAccessedAt: recentAccess[0]?.createdAt ?? null,
    },
    recentAccess: recentAccess.map((a) => ({
      id: a.id,
      accessType: a.accessType,
      studentProfileId: a.studentProfileId,
      createdAt: a.createdAt,
    })),
  };
}

// ── Audience catalogue (populates the grant picker) ─────────
export async function listAudiences(institutionId: string) {
  const [programs, batches] = await Promise.all([
    prisma.program.findMany({
      where: { department: { institutionId } },
      select: { id: true, name: true, code: true, level: true, _count: { select: { batches: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.batch.findMany({
      where: { program: { department: { institutionId } } },
      select: { id: true, name: true, startYear: true, graduationYear: true, programId: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return {
    programs: programs.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      level: p.level,
      batchCount: p._count.batches,
    })),
    batches: batches.map((b) => ({
      id: b.id,
      name: b.name,
      programId: b.programId,
      yearRange: `${b.startYear}–${b.graduationYear}`,
    })),
  };
}

// ── Create / update / delete ────────────────────────────────
export async function createDigitalResource(
  institutionId: string,
  actorUserId: string,
  input: {
    title: string; type: string; subject?: string; license?: string;
    externalUrl?: string; description?: string; publisher?: string;
  },
) {
  if (!RESOURCE_TYPES.includes(input.type as ResourceType)) {
    throw unprocessable(`Type must be one of ${RESOURCE_TYPES.join(', ')}`);
  }
  if (input.externalUrl && !/^https?:\/\//i.test(input.externalUrl)) {
    throw badRequest('externalUrl must start with http:// or https://');
  }

  const duplicate = await prisma.digitalResource.findFirst({
    where: { institutionId, title: input.title },
  });
  if (duplicate) throw conflict(`"${input.title}" already exists in the digital library`);

  const resource = await prisma.digitalResource.create({
    data: {
      institutionId,
      title: input.title,
      type: input.type,
      subject: input.subject ?? null,
      license: input.license ?? null,
      externalUrl: input.externalUrl ?? null,
      description: input.description ?? null,
      publisher: input.publisher ?? null,
    },
    include: resourceInclude,
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'digital.add_resource',
    entityType: 'DigitalResource',
    entityId: resource.id,
    after: { title: resource.title, type: resource.type },
  });

  return shapeResource(resource);
}

export async function updateDigitalResource(
  institutionId: string,
  actorUserId: string,
  resourceId: string,
  input: {
    title?: string; type?: string; subject?: string | null; license?: string | null;
    externalUrl?: string | null; description?: string | null; publisher?: string | null;
    status?: string;
  },
) {
  const existing = await prisma.digitalResource.findFirst({
    where: { id: resourceId, institutionId },
  });
  if (!existing) throw notFound('Digital resource not found');

  if (input.type && !RESOURCE_TYPES.includes(input.type as ResourceType)) {
    throw unprocessable(`Type must be one of ${RESOURCE_TYPES.join(', ')}`);
  }
  if (input.status && !['ACTIVE', 'ARCHIVED'].includes(input.status)) {
    throw badRequest('status must be ACTIVE or ARCHIVED');
  }
  if (input.externalUrl && !/^https?:\/\//i.test(input.externalUrl)) {
    throw badRequest('externalUrl must start with http:// or https://');
  }

  if (input.title && input.title !== existing.title) {
    const clash = await prisma.digitalResource.findFirst({
      where: { institutionId, title: input.title, NOT: { id: resourceId } },
    });
    if (clash) throw conflict(`"${input.title}" already exists in the digital library`);
  }

  const updated = await prisma.digitalResource.update({
    where: { id: resourceId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.subject !== undefined && { subject: input.subject || null }),
      ...(input.license !== undefined && { license: input.license || null }),
      ...(input.externalUrl !== undefined && { externalUrl: input.externalUrl || null }),
      ...(input.description !== undefined && { description: input.description || null }),
      ...(input.publisher !== undefined && { publisher: input.publisher || null }),
      ...(input.status !== undefined && { status: input.status }),
    },
    include: resourceInclude,
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'digital.update_resource',
    entityType: 'DigitalResource',
    entityId: resourceId,
    before: { title: existing.title, type: existing.type, status: existing.status },
    after: { title: updated.title, type: updated.type, status: updated.status },
  });

  return shapeResource(updated);
}

export async function deleteDigitalResource(
  institutionId: string,
  actorUserId: string,
  resourceId: string,
) {
  const resource = await prisma.digitalResource.findFirst({
    where: { id: resourceId, institutionId },
  });
  if (!resource) throw notFound('Digital resource not found');

  // Archive instead of destroying: access logs are referenced by analytics.
  const archived = await prisma.digitalResource.update({
    where: { id: resourceId },
    data: { status: 'ARCHIVED' },
    include: resourceInclude,
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'digital.archive_resource',
    entityType: 'DigitalResource',
    entityId: resourceId,
    before: { status: resource.status },
    after: { status: 'ARCHIVED' },
  });

  return shapeResource(archived);
}

// ── Grants ──────────────────────────────────────────────────
export async function grantAccess(
  institutionId: string,
  actorUserId: string,
  resourceId: string,
  input: { programId?: string; batchId?: string },
) {
  const resource = await prisma.digitalResource.findFirst({
    where: { id: resourceId, institutionId },
  });
  if (!resource) throw notFound('Digital resource not found');
  if (!input.programId && !input.batchId) {
    throw unprocessable('Choose a program or a batch to grant access to');
  }
  if (input.programId && input.batchId) {
    throw badRequest('Choose either a program or a batch, not both');
  }

  const existing = await prisma.digitalAccessGrant.findFirst({
    where: {
      resourceId,
      programId: input.programId ?? null,
      batchId: input.batchId ?? null,
    },
  });
  if (existing) throw conflict('This audience already has access');

  // Validate the audience actually exists and belongs to this institution —
  // otherwise a stale client id silently creates an orphaned grant.
  let label: string;
  if (input.programId) {
    const program = await prisma.program.findFirst({
      where: { id: input.programId, department: { institutionId } },
      select: { name: true },
    });
    if (!program) throw notFound('Program not found for this institution');
    label = program.name;
  } else {
    const batch = await prisma.batch.findFirst({
      where: { id: input.batchId, program: { department: { institutionId } } },
      select: { name: true },
    });
    if (!batch) throw notFound('Batch not found for this institution');
    label = batch.name;
  }

  const grant = await prisma.digitalAccessGrant.create({
    data: {
      resourceId,
      programId: input.programId ?? null,
      batchId: input.batchId ?? null,
    },
    include: grantInclude,
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'digital.grant_access',
    entityType: 'DigitalAccessGrant',
    entityId: grant.id,
    after: { resource: resource.title, audience: label },
  });

  return { id: grant.id, resource: resource.title, grant: shapeGrant(grant) };
}

export async function revokeAccess(
  institutionId: string,
  actorUserId: string,
  resourceId: string,
  grantId: string,
) {
  const grant = await prisma.digitalAccessGrant.findFirst({
    where: { id: grantId, resourceId, resource: { institutionId } },
    include: grantInclude,
  });
  if (!grant) throw notFound('Access grant not found');

  await prisma.digitalAccessGrant.delete({ where: { id: grant.id } });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'digital.revoke_access',
    entityType: 'DigitalAccessGrant',
    entityId: grant.id,
    before: { resource: resourceId, audience: shapeGrant(grant).label },
    after: null,
  });

  return { revoked: shapeGrant(grant) };
}

// ── Usage ───────────────────────────────────────────────────
/**
 * Record one access to a resource. The aggregate counter is re-derived from the
 * log here so the two can never disagree.
 */
export async function recordAccess(
  institutionId: string,
  resourceId: string,
  input: { studentProfileId?: string; accessType?: string },
) {
  const resource = await prisma.digitalResource.findFirst({
    where: { id: resourceId, institutionId },
    select: { id: true, title: true, status: true },
  });
  if (!resource) throw notFound('Digital resource not found');
  if (resource.status !== 'ACTIVE') throw unprocessable('This resource is archived');

  const accessType = input.accessType ?? 'OPEN';
  if (!['OPEN', 'DOWNLOAD', 'VIEW'].includes(accessType)) {
    throw badRequest('accessType must be OPEN, DOWNLOAD or VIEW');
  }

  const log = await prisma.digitalResourceAccess.create({
    data: {
      resourceId,
      studentProfileId: input.studentProfileId ?? null,
      accessType,
    },
  });

  const aggregate = await prisma.digitalResourceAccess.aggregate({
    where: { resourceId },
    _count: { id: true },
  });
  const total = aggregate._count.id;

  await prisma.digitalResource.update({
    where: { id: resourceId },
    data: { accessCount: total },
  });

  return {
    id: log.id,
    accessType: log.accessType,
    createdAt: log.createdAt,
    accessCount: total,
  };
}

/** Usage rollup across the whole digital library for the analytics view. */
export async function getUsageReport(institutionId: string) {
  const [resources, byDay, byType] = await Promise.all([
    prisma.digitalResource.findMany({
      where: { institutionId },
      select: { id: true, title: true, type: true, accessCount: true, subject: true },
      orderBy: { accessCount: 'desc' },
    }),
    prisma.digitalResourceAccess.groupBy({
      by: ['createdAt'],
      where: { resource: { institutionId } },
      _count: { id: true },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    prisma.digitalResourceAccess.groupBy({
      by: ['accessType'],
      where: { resource: { institutionId } },
      _count: { id: true },
    }),
  ]);

  const total = resources.reduce((s, r) => s + r.accessCount, 0);
  const bySubjectMap = new Map<string, number>();
  resources.forEach((r) => {
    const key = r.subject || 'Uncategorised';
    bySubjectMap.set(key, (bySubjectMap.get(key) ?? 0) + r.accessCount);
  });

  return {
    totalAccesses: total,
    resourceCount: resources.length,
    averagePerResource: resources.length ? Math.round(total / resources.length) : 0,
    unusedResources: resources.filter((r) => r.accessCount === 0).length,
    byType: Object.fromEntries(byType.map((t) => [t.accessType, t._count.id])),
    bySubject: [...bySubjectMap.entries()]
      .map(([subject, accesses]) => ({ subject, accesses }))
      .sort((a, b) => b.accesses - a.accesses),
    topResources: resources.slice(0, 10).map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      subject: r.subject,
      accessCount: r.accessCount,
    })),
    recentActivity: byDay.map((d) => ({
      date: d.createdAt,
      accesses: d._count.id,
    })),
  };
}