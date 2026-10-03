// L-08b Profile service — who is at the desk, and what they can do.
// Docs: 07-library-staff.md §3.8 · §4 L-08
//
// The old profile screen showed three invented numbers, five "Coming soon" rows
// and three toggles that lived in React state. Everything here is read from the
// database: the librarian's real staff record, the library's real holdings and
// circulation counters, the real list of staff who can work this desk, and the
// real permission keys granted to their role by RBAC.
import { prisma } from '../../db/prisma.js';
import { notFound } from '../../lib/errors.js';
import { syncOverdueStatus } from './circulation.service.js';
import { loadPolicy } from './settings.service.js';

const DAY_MS = 1000 * 60 * 60 * 24;

const toRupees = (paise: number) => Math.round(paise / 100);

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/** Library-wide stats. Deliberately wider than the old 3 numbers — every one is real. */
async function libraryStats(institutionId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = new Date(todayStart.getTime() + DAY_MS - 1);

  const [copies, titles, available, activeLoans, overdueLoans, members, pendingFines, pendingRequests, issuesToday, returnsToday, digitalResources] =
    await Promise.all([
      prisma.book.aggregate({ where: { institutionId }, _sum: { totalCopies: true } }),
      prisma.book.count({ where: { institutionId } }),
      prisma.book.aggregate({ where: { institutionId }, _sum: { availableCopies: true } }),
      prisma.bookIssue.count({ where: { book: { institutionId }, returnDate: null, status: { in: ['ISSUED', 'OVERDUE'] } } }),
      prisma.bookIssue.count({ where: { book: { institutionId }, returnDate: null, status: 'OVERDUE' } }),
      prisma.studentProfile.count({ where: { user: { institutionId, deletedAt: null } } }),
      prisma.fine.aggregate({
        where: { status: 'PENDING', bookIssue: { book: { institutionId } } },
        _sum: { amountMinor: true },
        _count: true,
      }),
      prisma.bookRequest.count({ where: { status: 'PENDING', studentProfile: { user: { institutionId, deletedAt: null } } } }),
      prisma.bookIssue.count({ where: { book: { institutionId }, issueDate: { gte: todayStart, lte: todayEnd } } }),
      prisma.bookIssue.count({ where: { book: { institutionId }, returnDate: { gte: todayStart, lte: todayEnd } } }),
      prisma.digitalResource.count({ where: { institutionId, status: 'ACTIVE' } }),
    ]);

  return {
    titles,
    copies: copies._sum.totalCopies ?? 0,
    copiesOnShelf: available._sum.availableCopies ?? 0,
    copiesIssued: (copies._sum.totalCopies ?? 0) - (available._sum.availableCopies ?? 0),
    activeLoans,
    overdueLoans,
    members,
    pendingFineCount: pendingFines._count,
    pendingFineRupees: toRupees(pendingFines._sum.amountMinor ?? 0),
    pendingRequests,
    issuesToday,
    returnsToday,
    digitalResources,
    circulationRatePct:
      (copies._sum.totalCopies ?? 0) === 0
        ? 0
        : Math.round(
          (((copies._sum.totalCopies ?? 0) - (available._sum.availableCopies ?? 0)) /
            (copies._sum.totalCopies ?? 0)) *
            100,
        ),
  };
}

// ── Profile ─────────────────────────────────────────────────
export async function getProfile(userId: string, institutionId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, institutionId, deletedAt: null },
    include: {
      roles: true,
      institution: { select: { id: true, name: true, code: true, timezone: true } },
      staffProfile: true,
    },
  });
  if (!user) throw notFound('User not found');

  // Overdue status is derived, so promote it before counting anything overdue.
  await syncOverdueStatus(institutionId);

  const [stats, policy, myBroadcasts, myLoansIssued] = await Promise.all([
    libraryStats(institutionId),
    loadPolicy(institutionId),
    prisma.broadcast.count({ where: { institutionId, senderUserId: userId } }),
    prisma.bookIssue.count({ where: { book: { institutionId }, issuedByUserId: userId } }),
  ]);

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    joinedAt: user.createdAt,
    roles: user.roles.map((r) => r.role),
    institution: user.institution,
    designation: user.staffProfile?.designation ?? null,
    employeeNo: user.staffProfile?.employeeNo ?? null,
    joiningDate: user.staffProfile?.joiningDate ?? null,
    staffStatus: user.staffProfile?.status ?? null,
    maxWorkloadHours: user.staffProfile?.maxWorkloadHours ?? null,
    initials: initialsOf(user.fullName),
    stats,
    // The librarian's own footprint, so the profile reflects this desk's activity.
    contribution: { broadcastsSent: myBroadcasts, loansIssued: myLoansIssued },
    policy: {
      loanPeriodDays: policy.loanPeriodDays,
      maxActiveLoans: policy.maxActiveLoans,
      maxRenewalsPerLoan: policy.maxRenewalsPerLoan,
      finePerDayRupees: toRupees(policy.finePerDayPaise),
      maxOutstandingFineRupees: toRupees(policy.maxOutstandingFinePaise),
      openTime: policy.openTime,
      closeTime: policy.closeTime,
      closedDays: policy.closedDays,
      dueRemindersEnabled: policy.dueRemindersEnabled,
      autoFineEnabled: policy.autoFineEnabled,
      announceNewArrivals: policy.announceNewArrivals,
    },
  };
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';

// ── Staff directory ─────────────────────────────────────────
/**
 * Everyone who can work the library desk, straight from user_roles. Per-person
 * activity (loans issued, broadcasts sent) comes from the scalar actor stamps,
 * which have no Prisma relation, so they are grouped in the database instead.
 */
export async function listLibraryStaff(institutionId: string) {
  const users = await prisma.user.findMany({
    where: {
      institutionId,
      deletedAt: null,
      roles: { some: { role: 'LIBRARY' } },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      status: true,
      lastLoginAt: true,
      staffProfile: { select: { designation: true, employeeNo: true, joiningDate: true, status: true } },
      roles: { select: { role: true } },
    },
    orderBy: { fullName: 'asc' },
  });

  const ids = users.map((u) => u.id);

  const [loansByStaff, broadcastsByStaff] = await Promise.all([
    prisma.bookIssue.groupBy({
      by: ['issuedByUserId'],
      where: { book: { institutionId }, issuedByUserId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.broadcast.groupBy({
      by: ['senderUserId'],
      where: { institutionId, senderUserId: { in: ids } },
      _count: { _all: true },
    }),
  ]);

  const loanCount = new Map(loansByStaff.map((r) => [r.issuedByUserId, r._count._all]));
  const broadcastCount = new Map(broadcastsByStaff.map((r) => [r.senderUserId, r._count._all]));

  return {
    staff: users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      status: u.status,
      staffStatus: u.staffProfile?.status ?? null,
      designation: u.staffProfile?.designation ?? 'Librarian',
      employeeNo: u.staffProfile?.employeeNo ?? null,
      joiningDate: u.staffProfile?.joiningDate ?? null,
      lastLoginAt: u.lastLoginAt,
      initials: initialsOf(u.fullName),
      roles: u.roles.map((r) => r.role),
      loansIssued: loanCount.get(u.id) ?? 0,
      broadcastsSent: broadcastCount.get(u.id) ?? 0,
    })),
    total: users.length,
  };
}

export async function getStaffMember(institutionId: string, userId: string) {
  const { staff } = await listLibraryStaff(institutionId);
  const member = staff.find((s) => s.id === userId);
  if (!member) throw notFound('Staff member not found');

  // Their recent desk activity, from the same scalar stamps as the counts above.
  const [recentLoans, recentBroadcasts] = await Promise.all([
    prisma.bookIssue.findMany({
      where: { book: { institutionId }, issuedByUserId: userId },
      select: {
        id: true,
        issueDate: true,
        status: true,
        book: { select: { title: true } },
        studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } },
      },
      orderBy: { issueDate: 'desc' },
      take: 10,
    }),
    prisma.broadcast.findMany({
      where: { institutionId, senderUserId: userId },
      select: { id: true, title: true, audienceJson: true, sentAt: true },
      orderBy: { sentAt: 'desc' },
      take: 10,
    }),
  ]);

  return {
    ...member,
    recentLoans: recentLoans.map((l) => ({
      id: l.id,
      book: l.book.title,
      student: l.studentProfile.user.fullName,
      rollNo: l.studentProfile.rollNo,
      issueDate: l.issueDate,
      status: l.status,
    })),
    recentBroadcasts: recentBroadcasts.map((b) => ({
      id: b.id,
      title: b.title,
      audience: safeParse(b.audienceJson).audience ?? 'UNKNOWN',
      sentAt: b.sentAt,
    })),
  };
}

const safeParse = (json: string | null): { audience?: string } => {
  try {
    return json ? JSON.parse(json) : {};
  } catch {
    return {};
  }
};

// ── Permissions ─────────────────────────────────────────────
/**
 * Read-only view of what this librarian's roles actually grant, from
 * role_permissions ⋈ permission_groups. Not editable here — RBAC is an admin
 * concern (docs/users/03-admin.md §3.15); showing it honestly is the point.
 */
export async function getMyPermissions(userId: string, institutionId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, institutionId, deletedAt: null },
    select: { roles: { select: { role: true } } },
  });
  if (!user) throw notFound('User not found');

  const roles = user.roles.map((r) => r.role);
  if (roles.length === 0) return { roles: [], groups: [], total: 0 };

  const rows = await prisma.rolePermission.findMany({
    where: { role: { in: roles } },
    include: { permissionGroup: true },
  });

  const byKey = new Map<string, { key: string; name: string; category: string; roles: string[] }>();
  for (const r of rows) {
    const key = r.permissionKey;
    const existing = byKey.get(key);
    if (existing) {
      if (!existing.roles.includes(r.role)) existing.roles.push(r.role);
    } else {
      byKey.set(key, {
        key,
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
    // Permissions in the RBAC map that no role grants — surfaced so an empty
    // screen is explained rather than looking like a broken query.
    ungrantedCategories: [
      'ACADEMICS', 'EXAMS', 'STUDENTS', 'FINANCE', 'PLACEMENT', 'HOSTEL',
      'TRANSPORT', 'SPORTS', 'ALUMNI', 'SYSTEM',
    ].filter((c) => !categories.includes(c)),
  };
}

/** Library-domain permissions specifically — what this desk may touch. */
export async function getLibraryPermissions(userId: string, institutionId: string) {
  const full = await getMyPermissions(userId, institutionId);
  const libraryGroup = full.groups.find((g) => g.category === 'LIBRARY');
  return { ...full, library: libraryGroup?.permissions ?? [] };
}
