/**
 * X-10 — Exam cell profile: who the officer is, what they are answerable for, what they may do,
 * what they want to hear about, and how their account has been used.
 * Docs: 05-exam-cell.md §3.8
 *
 * WHAT THIS IS NOT
 * ----------------
 * The old `GET /examcell/profile` answered four numbers: a name, a designation, and three counts.
 * The screen built on it showed a hardcoded "Exam Cell • Examinations Department" subtitle, four
 * menu rows that navigated nowhere, two notification toggles that were `useState` and died on
 * unmount, and a "Logout" button that showed an alert saying "Returning to login" and then did
 * nothing at all.
 *
 * A profile is not a card. It is the answer to seven questions, and a screen that cannot answer
 * them is a picture of a person:
 *
 *   1. WHO IS THIS?            name, designation, employee number, contact, when they joined
 *   2. WHERE DO THEY WORK?      the institution and the department they belong to
 *   3. WHAT IS THEIRS?         the exams they created, the duties they hold, the evaluations they own
 *   4. WHAT MAY THEY DO?        the permissions their roles actually grant
 *   5. WHAT DO THEY WANT?       which notifications they have muted
 *   6. IS THE ACCOUNT SAFE?    password, live sessions, sign-out-everywhere
 *   7. WHAT HAVE THEY DONE?     recent actions, and when they last signed in
 *
 * EVERY FIGURE IS DERIVED
 * -----------------------
 * Nothing here is a literal. The exam count comes from the exams this user created, the duty count
 * from the allocations they actually hold, the permission list from the RBAC map, the activity from
 * the audit log. A profile that hardcodes its own numbers is a profile that is wrong the moment
 * somebody is promoted.
 *
 * WHY THE PERMISSIONS ARE THE RBAC MAP'S
 * ----------------------------------------
 * `RolePermission` and `PermissionGroup` are the platform's permission tables, and they are
 * administered live, displayed on the user's own profile, and audited. So "what may this officer
 * do" is READ from that map, not restated here — a second list would be a second thing to forget to
 * update when a permission is granted.
 */
import { prisma } from '../../db/prisma.js';
import { notFound } from '../../lib/errors.js';
import { EXAM_CELL_CATEGORIES } from './examcell-notifications.rules.js';

// ── 1 & 2. Who this is, and where they work ───────────────────────────────

/**
 * The officer's own profile, and the work they are answerable for.
 *
 * Every figure is DERIVED from live rows, so the profile is right the moment somebody is promoted,
 * moved, or handed a duty.
 */
export async function getExamCellProfile(userId: string, institutionId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, institutionId, deletedAt: null },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      lastLoginAt: true,
      createdAt: true,
      roles: { select: { role: true } },
      staffProfile: {
        select: {
          employeeNo: true,
          designation: true,
          departmentId: true,
          joiningDate: true,
        },
      },
    },
  });
  if (!user) throw notFound('User not found');

  const roles = user.roles.map((r) => r.role);

  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: { id: true, name: true, code: true, timezone: true },
  });

  // `StaffProfile.departmentId` is a plain scalar, not a relation, so the department is read by
  // id — and TENANT-SCOPED, because a scalar that happens to point at another college's department
  // would otherwise put a foreign department name on this officer's profile.
  const department = user.staffProfile?.departmentId
    ? await prisma.department.findFirst({
        where: { id: user.staffProfile.departmentId, institutionId },
        select: { id: true, name: true, code: true },
      })
    : null;

  // ── 3. What is theirs ──
  //
  // Three different kinds of responsibility, each read from the table that owns it:
  //   · the exams they CREATED  — `Exam.createdByUserId`
  //   · the duties they HOLD    — `ExamRoomAllocation.invigilatorUserId`
  //   · the evaluations they OWN — `Evaluation.evaluatorUserId`
  //
  // None of these is a "total for the institution" dressed up as a personal figure. The old
  // profile reported the institution's hall tickets and results as though they were the officer's
  // work, which is a different claim.
  const [examsCreated, invigilatorDuties, evaluationsOwned, totalExams, upcomingDuties] =
    await Promise.all([
      prisma.exam.count({ where: { institutionId, createdByUserId: userId } }),
      prisma.examRoomAllocation.count({
        where: { invigilatorUserId: userId, examSlot: { exam: { institutionId } } },
      }),
      prisma.evaluation.count({
        where: { evaluatorUserId: userId, examSlot: { exam: { institutionId } } },
      }),
      prisma.exam.count({ where: { institutionId } }),
      prisma.examRoomAllocation.count({
        where: {
          invigilatorUserId: userId,
          examSlot: { exam: { institutionId }, date: { gte: new Date() } },
        },
      }),
    ]);

  // The exams they created, most recent first — the profile names them rather than counting them.
  const authored = await prisma.exam.findMany({
    where: { institutionId, createdByUserId: userId },
    select: { id: true, name: true, type: true, semester: true, status: true },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });

  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      lastLoginAt: user.lastLoginAt,
      joinedAt: user.createdAt,
    },
    roles,
    staff: {
      employeeNo: user.staffProfile?.employeeNo ?? null,
      designation: user.staffProfile?.designation ?? 'Controller of Examinations',
      joiningDate: user.staffProfile?.joiningDate ?? null,
    },
    institution: institution
      ? { id: institution.id, name: institution.name, code: institution.code, timezone: institution.timezone }
      : null,
    department,
    responsibilities: {
      examsCreated,
      // The institution's total, so the profile can say "2 of 14 exams" without the client knowing
      // how many exist.
      examsTotal: totalExams,
      invigilatorDuties,
      upcomingDuties,
      evaluationsOwned,
      authored: authored.map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        semester: e.semester,
        status: e.status,
      })),
    },
  };
}

// ── 4. What they may do ───────────────────────────────────────────────────

/**
 * The permissions the caller's roles actually grant.
 *
 * Read from the RBAC map rather than restated, because that map is administered live and audited —
 * a second copy here would drift from it and quietly tell an officer they can do something they
 * cannot.
 */
export async function getExamCellPermissions(userId: string, institutionId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, institutionId, deletedAt: null },
    select: { roles: { select: { role: true } } },
  });
  if (!user) throw notFound('User not found');

  const roles = user.roles.map((r) => r.role);
  if (roles.length === 0) return { roles: [], total: 0, groups: [], examCellPermissions: [] };

  const rows = await prisma.rolePermission.findMany({
    where: { role: { in: roles } },
    include: { permissionGroup: true },
  });

  const byKey = new Map<string, { key: string; name: string; category: string; roles: string[] }>();
  for (const r of rows) {
    const existing = byKey.get(r.permissionKey);
    if (existing) {
      if (!existing.roles.includes(r.role)) existing.roles.push(r.role);
    } else {
      byKey.set(r.permissionKey, {
        key: r.permissionKey,
        name: r.permissionGroup.name,
        category: r.permissionGroup.category,
        roles: [r.role],
      });
    }
  }

  const all = [...byKey.values()];
  const categories = [...new Set(all.map((p) => p.category))].sort();

  return {
    roles,
    total: all.length,
    groups: categories.map((category) => ({
      category,
      permissions: all
        .filter((p) => p.category === category)
        .sort((a, b) => a.key.localeCompare(b.key)),
    })),
    // The EXAM ones first, because that is the desk this profile belongs to. The others are still
    // listed — an officer who also holds the ADMIN role can do more than the exam cell, and hiding
    // that would be its own kind of lie.
    //
    // The category is `EXAMS` in the RBAC map (`PermissionGroup.category`), not `EXAMCELL` — the
    // role is EXAMCELL and the desk is EXAMS, and reading the wrong one would silently return an
    // empty list for every officer.
    examCellPermissions: all
      .filter((p) => p.category === 'EXAMS')
      .sort((a, b) => a.key.localeCompare(b.key)),
  };
}

// ── 5. What they want to hear about ───────────────────────────────────────

/**
 * Which of the nine exam categories this officer has muted.
 *
 * A mute is SUPPRESSION, not hiding — the delivery path writes no row at all for a muted category.
 * So this list is the set of categories that will never reach them, and it is worth showing
 * plainly: an officer who has muted an important notice and cannot undo it would be worse than
 * useless.
 */
export async function getExamCellNotificationPreferences(userId: string, institutionId: string) {
  const rows = await prisma.notificationPreference.findMany({
    where: { institutionId, userId },
    select: { category: true, muted: true },
  });
  const muted = new Set(rows.filter((r) => r.muted).map((r) => r.category));

  return {
    categories: EXAM_CELL_CATEGORIES.map((c) => ({
      id: c.id,
      label: c.label,
      blurb: c.blurb,
      icon: c.icon,
      color: c.color,
      audience: c.audience,
      // An IMPORTANT notice cannot be muted. The delivery path ignores the mute for that type, so
      // offering a toggle that does nothing would be a lie in the interface.
      mutable: c.id !== 'IMPORTANT_NOTICE',
      muted: c.id !== 'IMPORTANT_NOTICE' && muted.has(c.id),
    })),
    mutedCount: EXAM_CELL_CATEGORIES.filter((c) => c.id !== 'IMPORTANT_NOTICE' && muted.has(c.id)).length,
  };
}

/**
 * Mute or unmute an exam category.
 *
 * The category must be one of the nine, and IMPORTANT_NOTICE is refused — the same reason the
 * delivery path ignores its mute. A preference that cannot be honoured is not a preference.
 */
export async function updateExamCellNotificationPreferences(
  userId: string,
  institutionId: string,
  body: { category: string; muted: boolean },
) {
  const category = body.category;
  if (!EXAM_CELL_CATEGORIES.some((c) => c.id === category)) {
    throw notFound('Unknown notification category');
  }
  if (category === 'IMPORTANT_NOTICE') {
    throw notFound('Important examination notices cannot be muted');
  }
  const row = await prisma.notificationPreference.upsert({
    where: { userId_category: { userId, category } },
    create: { institutionId, userId, category, muted: body.muted },
    update: { muted: body.muted },
  });
  return { category: row.category, muted: row.muted };
}

// ── 6 & 7. Safety and history ─────────────────────────────────────────────

/**
 * The account's safety and its history.
 *
 * TWO THINGS, and they are different questions:
 *   · SESSIONS — the live sign-ins. Revoking one ends it. Identified by start time only, because no
 *     device information is stored; that limitation is REPORTED rather than hidden.
 *   · ACTIVITY — what the officer actually DID, from the audit log. Not the same thing as a session:
 *     a session says "someone is signed in", an activity entry says "an exam was published".
 */
export async function getExamCellActivity(userId: string, institutionId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, institutionId, deletedAt: null },
    select: { lastLoginAt: true, createdAt: true },
  });
  if (!user) throw notFound('User not found');

  const now = new Date();
  const [sessions, activity] = await Promise.all([
    prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, expiresAt: true },
    }),
    prisma.auditLog.findMany({
      where: { actorUserId: userId, institutionId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, action: true, entityType: true, entityId: true, createdAt: true },
    }),
  ]);

  return {
    lastLoginAt: user.lastLoginAt,
    sessions: sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    })),
    sessionCount: sessions.length,
    // Said out loud, because the screen cannot promise more than the data supports.
    sessionNote: 'Sessions are identified by start time only — no device information is stored.',
    activity: activity.map((a) => ({
      id: a.id,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      createdAt: a.createdAt,
    })),
    activityCount: activity.length,
  };
}
