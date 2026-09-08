import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { prisma } from '../../db/prisma.js';
import { env } from '../../config/env.js';
import { forbidden, notFound, conflict, badRequest } from '../../lib/errors.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
void forbidden;
import { writeAudit } from '../../lib/audit.js';
import type { Role } from '../../lib/enums.js';

// Platform module — X-01..X-10 (docs/backend/07-feature-list.md, Platform & shared)
// PLATFORM_ADMIN operates WITH an institution context selected per request (ADR-05):
// every institution-scoped read here takes an explicit institutionId param.

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

// ── X-03: institutions list + create (+ first-admin provisioning) ──

export async function listInstitutions() {
  const institutions = await prisma.institution.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      code: true,
      timezone: true,
      address: true,
      createdAt: true,
      _count: { select: { users: true } },
    },
  });

  // Per-institution quick stats for the platform console
  const stats = await Promise.all(
    institutions.map(async (inst) => {
      const [students, staff, courses] = await Promise.all([
        prisma.studentProfile.count({ where: { institutionId: inst.id } }),
        prisma.staffProfile.count({ where: { institutionId: inst.id } }),
        prisma.course.count({ where: { institutionId: inst.id } }),
      ]);
      return { ...inst, students, staff, courses };
    }),
  );

  return { institutions: stats };
}

export async function createInstitution(
  actorUserId: string,
  input: {
    name: string;
    code: string;
    timezone: string;
    address?: string;
    admin: { fullName: string; email: string; password: string };
  },
) {
  const existing = await prisma.institution.findUnique({ where: { code: input.code } });
  if (existing) throw conflict(`Institution code ${input.code} already exists`);

  const emailTaken = await prisma.user.findFirst({
    where: { email: input.admin.email.toLowerCase() },
  });
  if (emailTaken) throw conflict('A user with this email already exists');

  const passwordHash = await bcrypt.hash(input.admin.password, env.bcryptRounds);

  const institution = await prisma.institution.create({
    data: {
      name: input.name,
      code: input.code,
      timezone: input.timezone,
      address: input.address,
    },
  });

  const admin = await prisma.user.create({
    data: {
      institutionId: institution.id,
      email: input.admin.email.toLowerCase(),
      passwordHash,
      fullName: input.admin.fullName,
      roles: { create: { role: 'ADMIN' } },
    },
  });

  // Seed the minimal academic spine so the new college can onboard immediately
  const ay = await prisma.academicYear.create({
    data: {
      institutionId: institution.id,
      name: 'AY 2026-27',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2027-05-31'),
      isCurrent: true,
    },
  });

  await writeAudit({
    actorUserId,
    institutionId: institution.id,
    action: 'PLATFORM_INSTITUTION_CREATE',
    entityType: 'Institution',
    entityId: institution.id,
    after: { code: input.code, adminEmail: input.admin.email, academicYearId: ay.id },
  });

  return {
    institution: { id: institution.id, name: institution.name, code: institution.code },
    admin: { id: admin.id, email: admin.email, fullName: admin.fullName },
    academicYear: { id: ay.id, name: ay.name },
  };
}

// ── X-04: master data reads (per selected institution) ──

export async function getMasterData(institutionId: string) {
  const [academicYears, departments, programs, batches, sections, courses] = await Promise.all([
    prisma.academicYear.findMany({ where: { institutionId }, orderBy: { startDate: 'asc' } }),
    prisma.department.findMany({ where: { institutionId }, orderBy: { code: 'asc' } }),
    prisma.program.findMany({
      where: { department: { institutionId } },
      include: { department: { select: { code: true, name: true } } },
      orderBy: { code: 'asc' },
    }),
    prisma.batch.findMany({
      where: { program: { department: { institutionId } } },
      include: { program: { select: { code: true } } },
      orderBy: { startYear: 'desc' },
    }),
    prisma.section.findMany({
      where: { program: { department: { institutionId } } },
      include: { batch: { select: { name: true } }, program: { select: { code: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.course.findMany({ where: { institutionId }, orderBy: { code: 'asc' } }),
  ]);

  return { academicYears, departments, programs, batches, sections, courses };
}

export async function createAcademicYear(
  institutionId: string,
  actorUserId: string,
  input: { name: string; startDate: string; endDate: string; isCurrent: boolean },
) {
  const dup = await prisma.academicYear.findFirst({
    where: { institutionId, name: input.name },
  });
  if (dup) throw conflict(`Academic year ${input.name} already exists`);

  const result = await prisma.$transaction(async (tx) => {
    if (input.isCurrent) {
      await tx.academicYear.updateMany({
        where: { institutionId, isCurrent: true },
        data: { isCurrent: false },
      });
    }
    return tx.academicYear.create({
      data: {
        institutionId,
        name: input.name,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        isCurrent: input.isCurrent,
      },
    });
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'PLATFORM_ACADEMIC_YEAR_CREATE',
    entityType: 'AcademicYear',
    entityId: result.id,
    after: { name: result.name, isCurrent: result.isCurrent },
  });

  return result;
}

// ── X-09: config + feature flags (platform view, per institution) ──

export async function getConfig(institutionId: string) {
  const [configs, flags] = await Promise.all([
    prisma.systemConfig.findMany({ where: { institutionId }, orderBy: { key: 'asc' } }),
    prisma.featureFlag.findMany({ where: { institutionId }, orderBy: { key: 'asc' } }),
  ]);
  return { configs, flags };
}

// ── X-10: RBAC — permission groups + role→permission map ──

export async function getRbac(institutionId: string) {
  const [permissionGroups, rolePermissions, roles] = await Promise.all([
    prisma.permissionGroup.findMany({ orderBy: [{ category: 'asc' }, { key: 'asc' }] }),
    prisma.rolePermission.findMany({ orderBy: [{ role: 'asc' }, { permissionKey: 'asc' }] }),
    prisma.userRole.findMany({
      where: { user: { institutionId } },
      select: { role: true },
      distinct: ['role'],
    }),
  ]);
  const rolesInUse = roles.map((r) => r.role);
  return { permissionGroups, rolePermissions, rolesInUse };
}

export async function setRolePermissions(
  institutionId: string,
  actorUserId: string,
  input: { role: Role; permissionKeys: string[] },
) {
  // Validate all keys exist
  const groups = await prisma.permissionGroup.findMany({
    where: { key: { in: input.permissionKeys } },
  });
  if (groups.length !== input.permissionKeys.length) {
    throw badRequest('One or more unknown permission keys');
  }

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({
      where: { role: input.role, permissionKey: { notIn: input.permissionKeys } },
    }),
    ...input.permissionKeys.map((key) =>
      prisma.rolePermission.upsert({
        where: { role_permissionKey: { role: input.role, permissionKey: key } },
        update: {},
        create: { role: input.role, permissionKey: key },
      }),
    ),
  ]);

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'PLATFORM_ROLE_PERMISSIONS_SET',
    entityType: 'RolePermission',
    entityId: input.role,
    after: { role: input.role, permissionKeys: input.permissionKeys },
  });

  return { role: input.role, permissionKeys: input.permissionKeys };
}

// ── X-07/X-08 oversight: files + audit logs (platform view) ──

export async function listFiles(institutionId: string) {
  const files = await prisma.file.findMany({
    where: { institutionId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const uploaderIds = [...new Set(files.map((f) => f.uploaderUserId))];
  const uploaders = await prisma.user.findMany({
    where: { id: { in: uploaderIds } },
    select: { id: true, fullName: true, email: true },
  });
  const uploaderMap = new Map(uploaders.map((u) => [u.id, u]));
  return {
    files: files.map((f) => ({
      ...f,
      uploader: uploaderMap.get(f.uploaderUserId) ?? null,
    })),
  };
}

export async function listAuditLogs(institutionId: string) {
  const logs = await prisma.auditLog.findMany({
    where: { institutionId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  const actorIds = [...new Set(logs.map((l) => l.actorUserId).filter((v): v is string => !!v))];
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, fullName: true, email: true },
  });
  const actorMap = new Map(actors.map((u) => [u.id, u]));
  return {
    logs: logs.map((l) => ({
      ...l,
      actor: l.actorUserId ? actorMap.get(l.actorUserId) ?? null : null,
    })),
  };
}

// ── Platform broadcasts (X-06 audience ALL/ADMINS) ──

export async function createBroadcast(
  institutionId: string,
  senderUserId: string,
  body: { audience: 'ALL' | 'ADMINS'; title: string; body: string },
) {
  const users = await prisma.user.findMany({
    where: { institutionId, deletedAt: null, status: 'ACTIVE' },
    select: { id: true },
  });

  const recipients =
    body.audience === 'ADMINS'
      ? await prisma.user.findMany({
          where: { institutionId, deletedAt: null, roles: { some: { role: 'ADMIN' } } },
          select: { id: true },
        })
      : users;

  const notifications = await prisma.$transaction(
    recipients.map((u) =>
      prisma.notification.create({
        data: {
          institutionId,
          recipientUserId: u.id,
          type: 'BROADCAST',
          title: body.title,
          body: body.body,
          sourceModule: 'PLATFORM',
        },
      }),
    ),
  );

  await writeAudit({
    actorUserId: senderUserId,
    institutionId,
    action: 'PLATFORM_BROADCAST',
    entityType: 'Broadcast',
    after: { audience: body.audience, recipients: recipients.length, title: body.title },
  });

  return { sent: notifications.length, audience: body.audience };
}

// ── X-02 helper: token generation for password reset (used by auth module) ──

export function generateResetToken(): { raw: string; hash: string } {
  const raw = randomUUID() + '.' + randomUUID();
  return { raw, hash: sha256(raw) };
}

export { notFound };
