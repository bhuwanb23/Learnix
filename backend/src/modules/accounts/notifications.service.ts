// F-10 Notifications — the desk (docs/users/06 §3.9).
//
// What this replaces: `listNotifications` returned the newest 50 rows the
// platform had ever sent one officer, in one flat list, every row wearing the
// same icon. Three things were missing, and two of them were outright wrong:
//
//   1. THE INBOX WAS NOT FILTERED. No category, no unread-only, no pagination,
//      and no way to read ONE message — tapping any row called `read-all`.
//
//   2. THE `DEFAULTERS` BROADCAST AUDIENCE WAS NOT TENANT-SCOPED.
//      `accounts.service.ts` resolved it with
//      `feeDue.findMany({ where: { status, daysOverdue } })` and no institution
//      filter at all, so broadcasting a fee reminder notified defaulters at
//      EVERY college on the instance. The dashboard 190 lines above the same
//      function does scope this correctly; the broadcast did not.
//
//   3. THAT SAME AUDIENCE READ A STALE COLUMN. `FeeDue.daysOverdue` is
//      denormalised and drifts — `collections.service.ts` says so in a comment
//      and refreshes it on every read of the desk. A broadcast resolved an
//      audience without refreshing it, so who got the message depended on when
//      somebody last opened a screen.
//
// The four financial alerts are COMPUTED on every read rather than written to a
// table. A stored alert goes stale the moment the problem is fixed and has to be
// dismissed; a computed one cannot.
import { prisma } from '../../db/prisma.js';
import { notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { syncDueOverdue } from './collections.service.js';
import {
  ALERT_KINDS, AUDIENCES, CATEGORIES, DEFAULTER_MIN_DAYS,
  assertAudience, financeCategory, typeMeta,
  type AlertKind,
} from './notifications.rules.js';

export { CATEGORIES, AUDIENCES, ALERT_KINDS };

const toRupees = (minor: number) => Math.round(minor / 100);

/** Every due belongs to a student, and the student belongs to the institution. */
const dueScope = (institutionId: string) => ({
  studentProfile: { user: { institutionId } },
});

// ═══ Inbox ══════════════════════════════════════════════════════════════

export type InboxFilters = {
  category?: string;
  unreadOnly?: boolean;
  take?: number;
  skip?: number;
};

export async function listNotifications(
  userId: string,
  institutionId: string,
  filters: InboxFilters = {},
) {
  const { category, unreadOnly, take = 50, skip = 0 } = filters;
  const limit = Math.min(200, Math.max(1, take));
  const offset = Math.max(0, skip);

  // Read EVERY row this officer has, then filter in memory by category. The
  // category is derived from a `type` STRING, so it cannot be expressed in the
  // Prisma `where` clause without a hardcoded IN list that drifts from the
  // registry. The set is one officer's notifications, not the institution's —
  // bounded in practice, and the alternative is a query that goes wrong the
  // moment a type is re-categorised.
  const all = await prisma.notification.findMany({
    where: { recipientUserId: userId, institutionId },
    orderBy: { createdAt: 'desc' },
  });

  const shape = (n: (typeof all)[number]) => {
    const cat = financeCategory(n.type);
    const meta = typeMeta(n.type);
    return {
      id: n.id,
      type: n.type,
      typeLabel: meta.label,
      icon: meta.icon,
      color: meta.color,
      category: cat,
      categoryLabel: cat ? CATEGORIES.find((c) => c.id === cat)?.label ?? cat : null,
      inScope: cat !== null,
      title: n.title,
      body: n.body,
      read: n.readAt !== null,
      readAt: n.readAt,
      sourceModule: n.sourceModule,
      createdAt: n.createdAt,
      data: parseData(n.dataJson),
    };
  };

  const shaped = all.map(shape);
  const scoped = shaped.filter((n) => n.inScope);
  // Unread counts are counted over the WHOLE inbox, not the current page, so the
  // badge never changes just because the officer scrolled.
  const unreadByCategory = CATEGORIES.map((c) => ({
    category: c.id,
    count: scoped.filter((n) => n.category === c.id && !n.read).length,
  }));

  const filtered = scoped.filter((n) => {
    if (category && n.category !== category) return false;
    if (unreadOnly && n.read) return false;
    return true;
  });

  return {
    unread: scoped.filter((n) => !n.read).length,
    unreadByCategory,
    total: filtered.length,
    hasMore: offset + limit < filtered.length,
    skip: offset,
    take: limit,
    // What the screen shows when no filter is on: the finance inbox. The
    // out-of-scope count is reported rather than hidden, so an officer who
    // remembers a message can tell it was filtered, not lost.
    outOfScope: shaped.length - scoped.length,
    notifications: filtered.slice(offset, offset + limit),
  };
}

function parseData(json: string | null): Record<string, unknown> | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    // A malformed payload must not take the whole inbox down with it.
    return null;
  }
}

/** Read ONE message. Scoped to the recipient, so nobody can mark another's. */
export async function markRead(id: string, userId: string, institutionId: string) {
  const existing = await prisma.notification.findFirst({
    where: { id, recipientUserId: userId, institutionId },
    select: { id: true, readAt: true },
  });
  if (!existing) throw notFound('Notification not found');
  if (existing.readAt) return { id, alreadyRead: true };
  await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  return { id, alreadyRead: false };
}

export async function markAllRead(userId: string, institutionId: string) {
  const res = await prisma.notification.updateMany({
    where: { recipientUserId: userId, institutionId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: res.count };
}

/** Read or un-read, so "mark unread" is possible from the row menu. */
export async function setRead(
  id: string,
  userId: string,
  institutionId: string,
  read: boolean,
) {
  const existing = await prisma.notification.findFirst({
    where: { id, recipientUserId: userId, institutionId },
    select: { id: true },
  });
  if (!existing) throw notFound('Notification not found');
  await prisma.notification.update({
    where: { id },
    data: { readAt: read ? new Date() : null },
  });
  return { id, read };
}

// ═══ Catalogue ═══════════════════════════════════════════════════════════

/** Everything the hub builds itself from — same contract as the reports hub. */
export async function notificationCatalogue(institutionId: string) {
  const [students, staff, defaulters] = await Promise.all([
    prisma.studentProfile.count({ where: { user: { institutionId, deletedAt: null } } }),
    prisma.staffProfile.count({ where: { institutionId, user: { deletedAt: null } } }),
    defaulterRecipients(institutionId),
  ]);
  return {
    categories: CATEGORIES,
    audiences: AUDIENCES.map((a) => ({
      ...a,
      // The count is live, so the officer can see "Defaulters (0)" before
      // composing rather than after sending to nobody.
      recipientCount:
        a.id === 'ALL_STUDENTS' ? students : a.id === 'ALL_STAFF' ? staff : defaulters.length,
    })),
    alerts: ALERT_KINDS,
    defaulterMinDays: DEFAULTER_MIN_DAYS,
  };
}

// ═══ System-generated financial alerts ════════════════════════════════════
//
// Four questions, each answerable right now from live rows.

export async function systemAlerts(institutionId: string) {
  const [budgets, runs, unreleased, unallocated] = await Promise.all([
    budgetOverruns(institutionId),
    unreconciledPayroll(institutionId),
    unreleasedScholarships(institutionId),
    unallocatedReceipts(institutionId),
  ]);

  const byId: Record<AlertKind, { count: number; items: unknown[] }> = {
    BUDGET_OVERRUN: budgets,
    PAYROLL_UNFOOTED: runs,
    SCHOLARSHIP_UNRELEASED: unreleased,
    UNALLOCATED_RECEIPTS: unallocated,
  };

  const alerts = ALERT_KINDS.map((k) => ({
    ...k,
    count: byId[k.id].count,
    items: byId[k.id].items,
  }));

  return {
    alerts,
    firing: alerts.filter((a) => a.count > 0).length,
    total: alerts.reduce((s, a) => s + a.count, 0),
  };
}

/** Approved spend past the plan, per budget line. */
async function budgetOverruns(institutionId: string) {
  const budgets = await prisma.budget.findMany({
    where: { institutionId },
    select: { id: true, category: true, fiscalYear: true, plannedMinor: true, spentMinor: true, departmentId: true },
  });
  const over = budgets.filter((b) => b.spentMinor > b.plannedMinor);
  return {
    count: over.length,
    items: over.map((b) => ({
      budgetId: b.id,
      category: b.category,
      fiscalYear: b.fiscalYear,
      plannedRupees: toRupees(b.plannedMinor),
      spentRupees: toRupees(b.spentMinor),
      overRupees: toRupees(b.spentMinor - b.plannedMinor),
      percent: b.plannedMinor > 0
        ? Math.round((b.spentMinor / b.plannedMinor) * 1000) / 10
        : null,
    })),
  };
}

/**
 * A run whose header disagrees with its payslips.
 *
 * The same identity the reports feature checks. It is an alert here because a
 * header that does not foot is money the institution cannot defend.
 */
async function unreconciledPayroll(institutionId: string) {
  const runs = await prisma.payrollRun.findMany({
    where: { institutionId },
    select: { id: true, month: true, status: true, grossMinor: true, deductionsMinor: true, totalMinor: true },
    orderBy: { month: 'desc' },
  });
  const items: unknown[] = [];
  for (const run of runs) {
    const agg = await prisma.payrollEntry.aggregate({
      where: { payrollRunId: run.id },
      _sum: { grossMinor: true, deductionsMinor: true, netMinor: true },
      _count: { id: true },
    });
    const g = agg._sum.grossMinor ?? 0;
    const d = agg._sum.deductionsMinor ?? 0;
    const n = agg._sum.netMinor ?? 0;
    if (g === run.grossMinor && d === run.deductionsMinor && n === run.totalMinor) continue;
    items.push({
      runId: run.id,
      month: run.month,
      status: run.status,
      headerNetRupees: toRupees(run.totalMinor),
      entryNetRupees: toRupees(n),
      differenceRupees: toRupees(run.totalMinor - n),
    });
  }
  return { count: items.length, items };
}

/** Awarded and approved, still not in a student's hands. */
async function unreleasedScholarships(institutionId: string) {
  const apps = await prisma.scholarshipApplication.findMany({
    where: { institutionId, status: 'APPROVED' },
    select: {
      id: true,
      grantedMinor: true,
      disbursedMinor: true,
      approvedAt: true,
      scholarship: { select: { name: true } },
      studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } },
    },
  });
  const items = apps.map((a) => {
    const outstanding = Math.max(0, a.grantedMinor - a.disbursedMinor);
    return {
      applicationId: a.id,
      scheme: a.scholarship.name,
      student: a.studentProfile.user.fullName,
      rollNo: a.studentProfile.rollNo,
      outstandingRupees: toRupees(outstanding),
      approvedRupees: toRupees(a.grantedMinor),
      daysWaiting: a.approvedAt
        ? Math.floor((Date.now() - a.approvedAt.getTime()) / 86400000)
        : null,
    };
  }).filter((i) => i.outstandingRupees > 0);
  return { count: items.length, items };
}

/**
 * Money received that no bill was matched against.
 *
 * It is the institution's cash, but it is sitting against no student, so it
 * cannot be applied and is easy to forget. Reported, never reallocated — quietly
 * matching it to a bill here would be inventing a decision.
 */
async function unallocatedReceipts(institutionId: string) {
  const payments = await prisma.payment.findMany({
    where: { institutionId, status: 'CLEARED', reversedAt: null },
    select: {
      id: true,
      referenceNo: true,
      amountMinor: true,
      createdAt: true,
      allocations: { select: { amountMinor: true } },
    },
  });
  const items = payments
    .map((p) => {
      const allocated = p.allocations.reduce((s, a) => s + a.amountMinor, 0);
      return {
        paymentId: p.id,
        referenceNo: p.referenceNo,
        amountRupees: toRupees(p.amountMinor),
        unallocatedRupees: toRupees(p.amountMinor - allocated),
        receivedAt: p.createdAt,
      };
    })
    .filter((i) => i.unallocatedRupees > 0);
  return { count: items.length, items };
}

// ═══ Broadcasts ═══════════════════════════════════════════════════════════

/** Who a `DEFAULTERS` broadcast would reach — and the fix for the two bugs. */
async function defaulterRecipients(institutionId: string): Promise<string[]> {
  // The audience is resolved from `dueDate`, never from `FeeDue.daysOverdue`.
  // That column is denormalised and drifts as the days pass; the old code read
  // it without refreshing it, so the audience depended on when somebody last
  // opened the dues desk. Comparing dates cannot go stale.
  //
  // (`syncDueOverdue` is still called below so the DESK's own stale counts are
  // refreshed — but the selection below does not depend on it.)
  const duelist = await prisma.feeDue.findMany({
    where: {
      ...dueScope(institutionId),
      status: { in: ['UNPAID', 'PARTIAL'] },
      dueDate: { lte: cutoff(DEFAULTER_MIN_DAYS) },
    },
    select: { studentProfile: { select: { userId: true } } },
    distinct: ['studentProfileId'],
  });
  return [...new Set(duelist.map((d) => d.studentProfile.userId))];
}

const cutoff = (days: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
};

/**
 * Compose and send.
 *
 * Audience resolution is tenant-scoped for every branch. The `DEFAULTERS` branch
 * used to have no institution filter at all, which meant one college's fee
 * reminder was delivered to every college's defaulters.
 */
export async function createBroadcast(
  institutionId: string,
  senderUserId: string,
  body: { audience: string; title: string; body: string },
) {
  const audience = assertAudience(body.audience);

  // Refresh the denormalised overdue counter so the DESK agrees with what is
  // about to be sent, even though the selection above does not read it.
  let refreshed = 0;
  try {
    refreshed = await syncDueOverdue(institutionId);
  } catch {
    // A failed refresh must not stop an officer sending a reminder; the
    // selection is date-based and correct either way.
    refreshed = 0;
  }

  let recipientIds: string[] = [];
  if (audience === 'ALL_STUDENTS') {
    recipientIds = (await prisma.studentProfile.findMany({
      where: { user: { institutionId, deletedAt: null } },
      select: { userId: true },
    })).map((s) => s.userId);
  } else if (audience === 'DEFAULTERS') {
    recipientIds = await defaulterRecipients(institutionId);
  } else if (audience === 'ALL_STAFF') {
    recipientIds = (await prisma.staffProfile.findMany({
      where: { institutionId, user: { deletedAt: null } },
      select: { userId: true },
    })).map((s) => s.userId);
  }

  const broadcast = await prisma.broadcast.create({
    data: {
      institutionId,
      senderUserId,
      audienceJson: JSON.stringify({ audience }),
      title: body.title,
      body: body.body,
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
        title: body.title,
        body: body.body,
        sourceModule: 'accounts',
        dataJson: JSON.stringify({ module: 'accounts', screen: 'Notifications', broadcastId: broadcast.id }),
      })),
    });
  }

  await writeAudit({
    actorUserId: senderUserId,
    institutionId,
    action: 'broadcast.send',
    entityType: 'Broadcast',
    entityId: broadcast.id,
    after: { audience, recipients: recipientIds.length, refreshedDues: refreshed },
  });

  return {
    id: broadcast.id,
    // Echoed back so the client can show exactly what it sent, and so a caller
    // (or a test) can find the rows this send produced without re-querying.
    title: broadcast.title,
    audience,
    audienceLabel: AUDIENCES.find((a) => a.id === audience)?.label ?? audience,
    recipients: recipientIds.length,
    refreshedDues: refreshed,
  };
}

/** What has been sent, and to how many people. The old desk could send blind. */
export async function listBroadcasts(institutionId: string, limit = 20) {
  const rows = await prisma.broadcast.findMany({
    where: { institutionId },
    orderBy: { sentAt: 'desc' },
    take: Math.min(100, Math.max(1, limit)),
  });
  const senders = [...new Set(rows.map((r) => r.senderUserId))];
  const names = await prisma.user.findMany({
    where: { id: { in: senders } },
    select: { id: true, fullName: true },
  });
  const byId = new Map(names.map((n) => [n.id, n.fullName]));

  return {
    broadcasts: rows.map((r) => {
      let audience = 'ALL_STUDENTS';
      try {
        audience = (JSON.parse(r.audienceJson) as { audience?: string }).audience ?? audience;
      } catch {
        // A malformed audience string must not lose the row from the history.
      }
      return {
        id: r.id,
        title: r.title,
        body: r.body,
        audience,
        audienceLabel: AUDIENCES.find((a) => a.id === audience)?.label ?? audience,
        sentBy: byId.get(r.senderUserId) ?? 'Unknown',
        sentAt: r.sentAt ?? r.createdAt,
      };
    }),
  };
}

// ═══ Writing notifications from other modules ═════════════════════════════

/**
 * The single way other finance modules raise a message.
 *
 * Every writer previously open-coded its own `prisma.notification.create`, which
 * is how `SCHOLARSHIP` ended up with zero rows in the seed and `PAYROLL` with no
 * writer at all: nothing failed loudly, the message was simply never sent.
 */
export async function notify(input: {
  institutionId: string;
  recipientUserId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  sourceModule?: string;
}): Promise<void> {
  await prisma.notification.create({
    data: {
      institutionId: input.institutionId,
      recipientUserId: input.recipientUserId,
      type: input.type,
      title: input.title,
      body: input.body,
      sourceModule: input.sourceModule ?? 'accounts',
      dataJson: input.data ? JSON.stringify(input.data) : null,
    },
  });
}

/** Tell every person on a payroll run something. Used by approve and pay. */
export async function notifyRunStaff(
  institutionId: string,
  runId: string,
  build: (entry: { id: string; staffUserId: string; month: string; netMinor: number }) => {
    type: string;
    title: string;
    body: string;
  },
): Promise<number> {
  const entries = await prisma.payrollEntry.findMany({
    where: { payrollRunId: runId },
    select: { id: true, staffUserId: true, payrollRun: { select: { month: true } }, netMinor: true },
  });
  for (const e of entries) {
    const msg = build({ id: e.id, staffUserId: e.staffUserId, month: e.payrollRun.month, netMinor: e.netMinor });
    await notify({
      institutionId,
      recipientUserId: e.staffUserId,
      type: msg.type,
      title: msg.title,
      body: msg.body,
      data: { module: 'accounts', screen: 'Payroll', entryId: e.id },
    });
  }
  return entries.length;
}