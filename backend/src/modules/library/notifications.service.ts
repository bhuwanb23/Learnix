// L-07 Notifications, broadcasts + reminder schedule.
// Docs: users/07-library-staff.md §3.7
//
// The librarian's own inbox is empty by design — notifications in this schema are
// addressed to `recipientUserId`, and the library only ever addresses students.
// So "Inbox" for staff is derived from two real sources instead of invented data:
//   1. the activity feed  — library-domain events (issues, returns, fines, requests)
//   2. sent broadcasts    — what this librarian pushed, and to whom
//
// Broadcast audience targeting calls syncOverdueStatus() first. Without it the
// OVERDUE_MEMBERS audience matches `status = 'OVERDUE'`, which nothing else sets,
// so an "overdue members" broadcast would silently reach nobody.
import { prisma } from '../../db/prisma.js';
import { notFound, badRequest, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { syncOverdueStatus } from './circulation.service.js';
import { loadPolicy } from './settings.service.js';

export const AUDIENCES = ['ALL_STUDENTS', 'BORROWERS', 'OVERDUE_MEMBERS'] as const;
export type Audience = (typeof AUDIENCES)[number];

/** Automated due-date reminders. Offsets are days relative to the due date. */
export const REMINDER_SCHEDULE = [
  { key: 'DUE_3_DAYS', offsetDays: -3, title: 'Due in 3 days', channel: 'IN_APP' },
  { key: 'DUE_1_DAY', offsetDays: -1, title: 'Due tomorrow', channel: 'IN_APP' },
  { key: 'DUE_TODAY', offsetDays: 0, title: 'Due today', channel: 'IN_APP' },
  { key: 'OVERDUE_FINAL', offsetDays: 7, title: 'Overdue — final reminder', channel: 'IN_APP' },
] as const;

const parseAudience = (json: string | null): { audience?: string; role?: string } => {
  try {
    return json ? JSON.parse(json) : {};
  } catch {
    return {};
  }
};

// ── Activity feed ───────────────────────────────────────────
type ActivityKind = 'ISSUE' | 'RETURN' | 'FINE' | 'REQUEST' | 'RENEWAL' | 'DIGITAL';

/**
 * Library-domain activity for the desk. Built from the domain tables rather than
 * the notifications table, because staff are never notification recipients.
 */
export async function getActivityFeed(institutionId: string, limit = 60) {
  await syncOverdueStatus(institutionId);

  const take = Math.min(limit, 200);

  const studentSelect = { user: { select: { fullName: true } }, rollNo: true } as const;

  const [issues, fines, requests, renewals, digitalAccess] = await Promise.all([
    prisma.bookIssue.findMany({
      where: { book: { institutionId } },
      include: {
        book: { select: { title: true } },
        studentProfile: { select: studentSelect },
      },
      orderBy: { createdAt: 'desc' },
      take,
    }),
    prisma.fine.findMany({
      where: { bookIssue: { book: { institutionId } } },
      include: {
        bookIssue: {
          include: {
            book: { select: { title: true } },
            studentProfile: { select: studentSelect },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
    }),
    prisma.bookRequest.findMany({
      where: { studentProfile: { user: { institutionId } } },
      include: { studentProfile: { select: studentSelect } },
      orderBy: { createdAt: 'desc' },
      take,
    }),
    prisma.bookIssue.findMany({
      where: { book: { institutionId }, renewCount: { gt: 0 }, lastRenewedAt: { not: null } },
      include: {
        book: { select: { title: true } },
        studentProfile: { select: studentSelect },
      },
      orderBy: { lastRenewedAt: 'desc' },
      take,
    }),
    prisma.digitalResourceAccess.findMany({
      where: { resource: { institutionId } },
      include: {
        resource: { select: { id: true, title: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    }),
  ]);

  const events: {
    id: string;
    kind: ActivityKind;
    title: string;
    detail: string;
    student: string | null;
    rollNo: string | null;
    amountRupees?: number;
    at: Date;
    deepLink: { module: string; id: string } | null;
  }[] = [];

  issues.forEach((i) => {
    const returned = Boolean(i.returnDate);
    events.push({
      id: `issue-${i.id}`,
      kind: returned ? 'RETURN' : 'ISSUE',
      title: returned ? 'Book returned' : 'Book issued',
      detail: `"${i.book.title}" · ${i.studentProfile.user.fullName}`,
      student: i.studentProfile.user.fullName,
      rollNo: i.studentProfile.rollNo,
      at: i.returnDate ?? i.createdAt,
      deepLink: { module: 'LoanDetail', id: i.id },
    });
  });

  renewals.forEach((i) => {
    if (!i.lastRenewedAt) return;
    events.push({
      id: `renew-${i.id}`,
      kind: 'RENEWAL',
      title: 'Loan renewed',
      detail: `"${i.book.title}" · ${i.studentProfile.user.fullName}`,
      student: i.studentProfile.user.fullName,
      rollNo: i.studentProfile.rollNo,
      at: i.lastRenewedAt,
      deepLink: { module: 'LoanDetail', id: i.id },
    });
  });

  fines.forEach((f) => {
    const r = Math.round(f.amountMinor / 100);
    events.push({
      id: `fine-${f.id}`,
      kind: 'FINE',
      title: f.status === 'PENDING' ? 'Fine raised' : `Fine ${f.status.toLowerCase()}`,
      detail: `${r === 0 ? '₹0' : `₹${r}`} · "${f.bookIssue.book.title}" · ${f.bookIssue.studentProfile.user.fullName}`,
      student: f.bookIssue.studentProfile.user.fullName,
      rollNo: f.bookIssue.studentProfile.rollNo,
      amountRupees: r,
      at: f.updatedAt ?? f.createdAt,
      deepLink: { module: 'FineDetail', id: f.id },
    });
  });

  requests.forEach((r) => {
    events.push({
      id: `request-${r.id}`,
      kind: 'REQUEST',
      title: `Book request ${r.status.toLowerCase()}`,
      detail: `"${r.title}" · ${r.studentProfile.user.fullName}`,
      student: r.studentProfile.user.fullName,
      rollNo: r.studentProfile.rollNo,
      at: r.updatedAt ?? r.createdAt,
      deepLink: { module: 'BookRequests', id: r.id },
    });
  });

  digitalAccess.forEach((a) => {
    events.push({
      id: `digital-${a.id}`,
      kind: 'DIGITAL',
      title: a.accessType === 'DOWNLOAD' ? 'Digital resource downloaded' : 'Digital resource opened',
      detail: `"${a.resource.title}"`,
      student: null,
      rollNo: null,
      at: a.createdAt,
      deepLink: { module: 'ResourceDetail', id: a.resource.id },
    });
  });

  events.sort((a, b) => b.at.getTime() - a.at.getTime());
  const recent = events.slice(0, take);

  const byKind = (k: ActivityKind) => recent.filter((e) => e.kind === k).length;

  return {
    stats: {
      total: events.length,
      issues: byKind('ISSUE'),
      returns: byKind('RETURN'),
      fines: byKind('FINE'),
      renewals: byKind('RENEWAL'),
      requests: byKind('REQUEST'),
      digital: byKind('DIGITAL'),
    },
    events: recent,
  };
}

// ── Audience resolution ─────────────────────────────────────
export async function resolveAudienceRecipients(
  institutionId: string,
  audience: string,
): Promise<string[]> {
  await syncOverdueStatus(institutionId);

  if (audience === 'ALL_STUDENTS') {
    const students = await prisma.studentProfile.findMany({
      where: { user: { institutionId, deletedAt: null } },
      select: { userId: true },
    });
    return students.map((s) => s.userId);
  }

  const statusFilter: Record<string, unknown> | null =
    audience === 'OVERDUE_MEMBERS'
      ? { status: 'OVERDUE' }
      : audience === 'BORROWERS'
        ? { status: { in: ['ISSUED', 'OVERDUE'] } }
        : null;

  if (!statusFilter) throw badRequest(`Unknown audience "${audience}"`);

  const issues = await prisma.bookIssue.findMany({
    where: { book: { institutionId }, returnDate: null, ...statusFilter },
    select: { studentProfile: { select: { userId: true } } },
    distinct: ['studentProfileId'],
  });
  return [...new Set(issues.map((i) => i.studentProfile.userId))];
}

/** Audience sizes for the composer, so a 0-recipient send is visible up front. */
export async function getAudienceInsights(institutionId: string) {
  await syncOverdueStatus(institutionId);
  const now = new Date();

  const [totalStudents, activeLoans, overdueLoans, pendingFines, pendingRequests] =
    await Promise.all([
      prisma.studentProfile.count({ where: { user: { institutionId, deletedAt: null } } }),
      prisma.bookIssue.count({
        where: { book: { institutionId }, returnDate: null, status: { in: ['ISSUED', 'OVERDUE'] } },
      }),
      prisma.bookIssue.count({
        where: { book: { institutionId }, returnDate: null, status: 'OVERDUE' },
      }),
      prisma.fine.count({ where: { status: 'PENDING', bookIssue: { book: { institutionId } } } }),
      prisma.bookRequest.count({
        where: { status: 'PENDING', studentProfile: { user: { institutionId } } },
      }),
    ]);

  const [allStudents, borrowers, overdueMembers] = await Promise.all([
    resolveAudienceRecipients(institutionId, 'ALL_STUDENTS'),
    resolveAudienceRecipients(institutionId, 'BORROWERS'),
    resolveAudienceRecipients(institutionId, 'OVERDUE_MEMBERS'),
  ]);

  // Who is due a reminder right now — feeds the automated schedule view.
  const in3 = new Date(now.getTime() + 3 * 864e5);
  const tomorrow = new Date(now.getTime() + 1 * 864e5);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const [dueSoon, dueTomorrow, dueToday, overdue7] = await Promise.all([
    prisma.bookIssue.count({
      where: {
        book: { institutionId }, returnDate: null, status: 'ISSUED',
        dueDate: { gte: in3, lte: endOfDay },
      },
    }),
    prisma.bookIssue.count({
      where: {
        book: { institutionId }, returnDate: null, status: 'ISSUED',
        dueDate: { gte: tomorrow, lte: endOfDay },
      },
    }),
    prisma.bookIssue.count({
      where: {
        book: { institutionId }, returnDate: null, status: { in: ['ISSUED', 'OVERDUE'] },
        dueDate: { gte: new Date(now.setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.bookIssue.count({
      where: {
        book: { institutionId }, returnDate: null, status: 'OVERDUE',
        dueDate: { lte: new Date(now.getTime() - 7 * 864e5) },
      },
    }),
  ]);

  const coverage = totalStudents ? Math.round((overdueLoans / totalStudents) * 100) : 0;

  return {
    audiences: [
      {
        id: 'ALL_STUDENTS',
        label: 'All Students',
        description: 'Every active student profile',
        recipients: allStudents.length,
        icon: 'school-outline',
      },
      {
        id: 'BORROWERS',
        label: 'Borrowers',
        description: 'Students holding at least one book',
        recipients: borrowers.length,
        icon: 'people-outline',
      },
      {
        id: 'OVERDUE_MEMBERS',
        label: 'Overdue Members',
        description: 'Students with an overdue loan',
        recipients: overdueMembers.length,
        icon: 'alarm-outline',
      },
    ],
    library: {
      totalStudents,
      activeLoans,
      overdueLoans,
      overdueCoveragePct: coverage,
      pendingFines,
      pendingRequests,
    },
    remindersDueNow: {
      dueIn3Days: dueSoon,
      dueTomorrow,
      dueToday,
      overdueFinal: overdue7,
    },
  };
}

// ── Broadcasts ──────────────────────────────────────────────
export async function listBroadcasts(institutionId: string, limit = 50) {
  const rows = await prisma.broadcast.findMany({
    where: { institutionId },
    orderBy: { sentAt: 'desc' },
    take: Math.min(limit, 200),
  });

  // senderUserId is a bare scalar (no relation), so resolve names separately.
  const senderIds = [...new Set(rows.map((r) => r.senderUserId))];
  const senders = await prisma.user.findMany({
    where: { id: { in: senderIds } },
    select: { id: true, fullName: true },
  });
  const senderMap = new Map(senders.map((s) => [s.id, s.fullName]));

  // Recipient counts are not stored on the Broadcast row, so re-resolve per row.
  // Cached per audience within this request to avoid N duplicate queries.
  const cache = new Map<string, number>();
  // Broadcasts are shared across modules, so an audience this service doesn't own
  // (e.g. the role-scoped "STUDENT" used by other modules) must degrade to "not
  // resolvable" rather than throwing and taking the whole list down.
  const countFor = async (audience: string) => {
    if (cache.has(audience)) return cache.get(audience)!;
    if (!AUDIENCES.includes(audience as Audience)) {
      cache.set(audience, -1); // -1 = not resolvable by the library module
      return -1;
    }
    const ids = await resolveAudienceRecipients(institutionId, audience);
    cache.set(audience, ids.length);
    return ids.length;
  };

  const broadcasts = await Promise.all(
    rows.map(async (b) => {
      const parsed = parseAudience(b.audienceJson);
      const audience = parsed.audience ?? parsed.role ?? 'UNKNOWN';
      const recipients = await countFor(audience);
      return {
        id: b.id,
        title: b.title,
        body: b.body,
        audience,
        audienceLabel:
          AUDIENCES.includes(audience as Audience)
            ? audience === 'ALL_STUDENTS'
              ? 'All Students'
              : audience === 'BORROWERS'
                ? 'Borrowers'
                : 'Overdue Members'
            : audience,
        channels: b.channels,
        sentAt: b.sentAt,
        createdAt: b.createdAt,
        sender: senderMap.get(b.senderUserId) ?? 'Unknown sender',
        currentAudienceSize: recipients,
        ownedByLibrary: recipients >= 0,
      };
    }),
  );

  return {
    stats: {
      total: broadcasts.length,
      lastSentAt: broadcasts[0]?.sentAt ?? null,
      channels: [...new Set(broadcasts.map((b) => b.channels))],
    },
    broadcasts,
  };
}

export async function getBroadcastDetail(institutionId: string, broadcastId: string) {
  const b = await prisma.broadcast.findFirst({
    where: { id: broadcastId, institutionId },
  });
  if (!b) throw notFound('Broadcast not found');

  // senderUserId is a bare scalar (no relation) — resolve the name separately.
  const senderUser = await prisma.user.findUnique({
    where: { id: b.senderUserId },
    select: { id: true, fullName: true },
  });

  const parsed = parseAudience(b.audienceJson);
  const audience = parsed.audience ?? parsed.role ?? 'UNKNOWN';
  const recipients = AUDIENCES.includes(audience as Audience)
    ? await resolveAudienceRecipients(institutionId, audience)
    : [];

  // Students who received this specific broadcast (matched on title + timestamp).
  const delivered = await prisma.notification.findMany({
    where: {
      institutionId,
      type: 'BROADCAST',
      title: b.title,
      createdAt: { gte: b.createdAt ?? new Date(0) },
    },
    include: { recipient: { select: { fullName: true } } },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });

  return {
    id: b.id,
    title: b.title,
    body: b.body,
    audience,
    audienceLabel:
      audience === 'ALL_STUDENTS'
        ? 'All Students'
        : audience === 'BORROWERS'
          ? 'Borrowers'
          : audience === 'OVERDUE_MEMBERS'
            ? 'Overdue Members'
            : audience,
    channels: b.channels,
    sentAt: b.sentAt,
    createdAt: b.createdAt,
    sender: senderUser ?? { id: b.senderUserId, fullName: 'Unknown sender' },
    recipientCount: recipients.length,
    deliveredCount: delivered.length,
    recipients: delivered.map((d) => d.recipient.fullName),
  };
}

export async function createBroadcast(
  institutionId: string,
  senderUserId: string,
  body: { audience: string; title: string; body: string },
) {
  if (!AUDIENCES.includes(body.audience as Audience)) {
    throw badRequest(`audience must be one of ${AUDIENCES.join(', ')}`);
  }
  if (!body.title.trim() || !body.body.trim()) {
    throw unprocessable('Both a title and a message are required');
  }

  // Sync overdue status BEFORE resolving, or OVERDUE_MEMBERS matches nobody.
  const recipientIds = await resolveAudienceRecipients(institutionId, body.audience);

  const broadcast = await prisma.broadcast.create({
    data: {
      institutionId,
      senderUserId,
      audienceJson: JSON.stringify({ audience: body.audience }),
      title: body.title.trim(),
      body: body.body.trim(),
      channels: 'IN_APP',
      sentAt: new Date(),
    },
  });

  if (recipientIds.length > 0) {
    await prisma.notification.createMany({
      data: recipientIds.map((rid) => ({
        institutionId,
        recipientUserId: rid,
        type: 'BROADCAST',
        title: body.title.trim(),
        body: body.body.trim(),
        sourceModule: 'library',
      })),
    });
  }

  await writeAudit({
    actorUserId: senderUserId,
    institutionId,
    action: 'broadcast.send',
    entityType: 'Broadcast',
    entityId: broadcast.id,
    after: { audience: body.audience, recipients: recipientIds.length },
  });

  return {
    id: broadcast.id,
    audience: body.audience,
    recipients: recipientIds.length,
    sentAt: broadcast.sentAt,
  };
}

// ── Reminder schedule ───────────────────────────────────────
/**
 * The automated due-date reminder policy and how many students it would currently
 * reach. These reminders are defined but not dispatched by a worker yet — this
 * endpoint makes the policy visible so the librarian can see coverage.
 */
export async function getReminderSchedule(institutionId: string) {
  const [insights, policy] = await Promise.all([
    getAudienceInsights(institutionId),
    loadPolicy(institutionId),
  ]);
  const now = new Date();

  const map: Record<string, number> = {
    DUE_3_DAYS: insights.remindersDueNow.dueIn3Days,
    DUE_1_DAY: insights.remindersDueNow.dueTomorrow,
    DUE_TODAY: insights.remindersDueNow.dueToday,
    OVERDUE_FINAL: insights.remindersDueNow.overdueFinal,
  };

  const stages = REMINDER_SCHEDULE.map((s) => ({
    ...s,
    matchedNow: map[s.key] ?? 0,
    description:
      s.offsetDays < 0
        ? `${Math.abs(s.offsetDays)} day(s) before the due date`
        : s.offsetDays === 0
          ? 'On the due date'
          : `${s.offsetDays} day(s) after the due date`,
  }));

  return {
    automationEnabled: false,
    // The librarian can switch reminder counting off in Settings; say so here
    // rather than silently reporting coverage for a policy that is switched off.
    remindersEnabled: policy.dueRemindersEnabled,
    stages: policy.dueRemindersEnabled
      ? stages
      : stages.map((s) => ({ ...s, matchedNow: 0 })),
    totalReachable: policy.dueRemindersEnabled
      ? stages.reduce((sum, s) => sum + s.matchedNow, 0)
      : 0,
    lastRunAt: null,
    nextRunAt: null,
    checkedAt: now,
    note: policy.dueRemindersEnabled
      ? 'Reminder delivery runs on a schedule worker. Until that is enabled, broadcast manually to reach these students.'
      : 'Due reminders are switched off in Library Settings, so no stage is counted. Turn them back on in Settings.',
  };
}