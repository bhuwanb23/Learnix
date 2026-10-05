// F-04 Dues & Recovery — the money-OUT side of the desk.
// Docs: 06-accounts-finance.md §3.3 · §4 F-04
//
// The screen this replaces was a flat list with two icon buttons. What it could
// not do was answer the questions a recovery desk actually asks:
//   · who owes us, ranked by how badly?
//   · how much of that is overdue, and how old is the worst of it?
//   · have we already chased this family, and how many times?
//   · if this is waived, who waived it, why, and can that be undone?
//   · if I collect against this due, what else does the student owe?
//
// So this service returns, per due: the derived status (never the stale column),
// the BALANCE rather than the billed amount, the aging bucket, and the reminder
// history. It also adds `getDueDetail` (one due end-to-end, with the payments
// that settled it) and `reinstateDue` — a waiver you cannot reverse is a
// permanent, unauditable write-off.
//
// Tenant scoping: `FeeDue` has no `institutionId`; it reaches its tenant
// through `studentProfile.user`. Every read and write goes through that path.
//
// Money: integer paise throughout (ADR-04). Rupees appear only at the edge.
import type { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { notFound, conflict, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { syncDueOverdue } from './collections.service.js';
import { getDueLateFee } from './dues.fines.js';
import { getPlanForDue } from './dues.plans.js';
import {
  DAY_MS,
  toRupees,
  daysPastDue,
  balanceOf,
  totalClaimedMinor,
  deriveDueStatus,
  isOpenStatus,
  AGING_BUCKETS,
  bucketFor,
  type AgingBucketId,
} from './dues.money.js';

// The money rules live in dues.money.ts so that collections.service.ts (which
// collects against these dues) and this file cannot disagree about what a
// student owes once a late fine is on the bill. Re-exported here because every
// caller already depends on this module.
export {
  DAY_MS,
  toRupees,
  startOfDay,
  daysPastDue,
  balanceOf,
  totalClaimedMinor,
  deriveDueStatus,
  AGING_BUCKETS,
  bucketFor,
  type AgingBucketId,
} from './dues.money.js';

/** `FeeDue` has no institutionId of its own. Never bypass this. */
const dueScopeWhere = (institutionId: string) => ({
  studentProfile: { user: { institutionId, deletedAt: null } },
});

const isOpen = isOpenStatus;

export type DueSort =
  | 'SEVERITY'
  | 'OVERDUE_DESC'
  | 'AMOUNT_DESC'
  | 'AMOUNT_ASC'
  | 'DUE_DATE_ASC'
  | 'RECENTLY_REMINDED';

export type DueFilter = {
  q?: string;
  status?: 'ALL' | 'OPEN' | 'UNPAID' | 'PARTIAL' | 'CLEARED' | 'WAIVED' | 'SUPERSEDED';
  // `CLEARED` sits alongside the aging buckets so the chips can offer "settled"
  // next to "over 30 days" without a separate status filter.
  bucket?: 'ALL' | AgingBucketId | 'CLEARED';
  sort?: DueSort;
  take?: number;
  skip?: number;
};

const STUDENT_INCLUDE = {
  studentProfile: {
    select: {
      id: true,
      rollNo: true,
      currentSemester: true,
      programId: true,
      user: { select: { id: true, fullName: true, email: true } },
    },
  },
  feeStructure: {
    select: {
      id: true,
      tuitionMinor: true,
      otherMinor: true,
      totalMinor: true,
      academicYear: { select: { name: true } },
      program: { select: { name: true } },
    },
  },
} satisfies Prisma.FeeDueInclude;

/**
 * Repair any row whose stored `status` contradicts its `paidMinor`, and refresh
 * `daysOverdue`. Read paths call this first so the desk can never show a stale
 * column — the same reason `syncDueOverdue` exists.
 */
async function reconcileDues(institutionId: string) {
  const changed = await syncDueOverdue(institutionId);

  const drifted = await prisma.feeDue.findMany({
    where: { ...dueScopeWhere(institutionId), status: { in: ['UNPAID', 'PARTIAL', 'CLEARED'] } },
    select: { id: true, status: true, amountMinor: true, paidMinor: true },
  });

  let repaired = 0;
  for (const d of drifted) {
    const derived = deriveDueStatus(d);
    if (derived === d.status) continue;
    await prisma.feeDue.update({
      where: { id: d.id },
      // A due that just got fully paid has no aging any more; one that just
      // reopened keeps the day count it always had.
      data: { status: derived, ...(derived === 'CLEARED' ? { daysOverdue: 0 } : {}) },
    });
    repaired += 1;
  }
  return { overdueSynced: changed, statusesRepaired: repaired };
}

// ── List ─────────────────────────────────────────────────────
export async function listDues(institutionId: string, filter: DueFilter = {}) {
  await reconcileDues(institutionId);

  const q = filter.q?.trim();
  const rows = await prisma.feeDue.findMany({
    where: {
      ...dueScopeWhere(institutionId),
      ...(q
        ? {
            OR: [
              { studentProfile: { user: { fullName: { contains: q } } } },
              { studentProfile: { rollNo: { contains: q } } },
              { title: { contains: q } },
            ],
          }
        : {}),
      ...(filter.status && filter.status !== 'ALL'
        ? filter.status === 'OPEN'
          ? { status: { in: ['UNPAID', 'PARTIAL'] } }
          : { status: filter.status }
        : {}),
    },
    include: STUDENT_INCLUDE,
  });

  // Decorate with derived status + balance before any filtering, so the aging
  // buckets and stats below agree with the rows the officer actually sees.
  //
  // `daysLive` is DERIVED from `dueDate`, never read from `FeeDue.daysOverdue`.
  // That column is denormalised and drifts: it is only written on the paths that
  // happen to touch a due, so a bill that went unpaid quietly for two months
  // still reported 0. F-11 hit this on the dashboard, F-10 hit it again in the
  // broadcast audience, and this desk was the last reader left — which is how the
  // morning screen and the dues desk came to report the same overdue money as
  // ₹39,820 and ₹46,120. One derivation, three screens, no disagreement.
  const today = new Date();
  const decorated = rows.map((d) => {
    const status = deriveDueStatus(d);
    const daysLive = isOpen(status) ? daysPastDue(d.dueDate, today) : 0;
    return {
      ...d,
      derivedStatus: status,
      balanceMinor: balanceOf(d),
      bucketId: isOpen(status)
        ? bucketFor(daysLive).id
        : status === 'CLEARED'
          ? ('CLEARED' as const)
          : (status as 'WAIVED' | 'SUPERSEDED'),
      daysLive,
    };
  });

  const open = decorated.filter((d) => isOpen(d.derivedStatus));
  const totalOutstandingMinor = open.reduce((s, d) => s + d.balanceMinor, 0);
  const overdue = open.filter((d) => d.daysLive > 0);

  // Aging summary — always filter-independent so the officer can see where the
  // whole book sits regardless of what they have narrowed to.
  //
  // Built from `open`, NOT from `overdue`. A bill that is not yet due is still
  // money this institution is owed and still carries a NOT_DUE bucket on its own
  // row, so dropping it here made the five cards sum to LESS than the
  // "Outstanding" headline printed directly above them — two numbers on one
  // screen that could not both be true. The buckets already classify
  // daysOverdue <= 0 as NOT_DUE.
  const aging = AGING_BUCKETS.map((b) => {
    const inBucket = open.filter((d) => d.bucketId === b.id);
    return {
      id: b.id,
      label: b.label,
      color: b.color,
      count: inBucket.length,
      rupees: toRupees(inBucket.reduce((s, d) => s + d.balanceMinor, 0)),
    };
  });

  // Money actually recovered against dues in the last 30 days. This is the only
  // "are we winning" number on the screen, and it has to come from real
  // allocations — not from the raw payment count, which includes advances.
  const since = new Date(Date.now() - 30 * DAY_MS);
  const recentAllocations = await prisma.paymentAllocation.findMany({
    where: {
      createdAt: { gte: since },
      due: { ...dueScopeWhere(institutionId) },
      payment: { reversedAt: null },
    },
    select: { amountMinor: true },
  });

  const defaulterStudents = new Set(
    open.filter((d) => d.daysLive > 7).map((d) => d.studentProfile.id),
  );

  // ── Apply the view filter ──
  let view = decorated;
  const bucket = filter.bucket;
  if (bucket === 'NOT_DUE') {
    view = view.filter((d) => isOpen(d.derivedStatus) && d.daysLive <= 0);
  } else if (bucket === 'CLEARED') {
    view = view.filter((d) => d.derivedStatus === 'CLEARED');
  } else if (bucket && bucket !== 'ALL') {
    view = view.filter((d) => isOpen(d.derivedStatus) && (d.bucketId as string) === bucket);
  }

  const sort: DueSort = filter.sort ?? 'SEVERITY';
  const comparators: Record<DueSort, (a: typeof view[number], b: typeof view[number]) => number> = {
    SEVERITY: (a, b) =>
      Number(isOpen(b.derivedStatus)) - Number(isOpen(a.derivedStatus)) ||
      b.daysLive - a.daysLive ||
      b.balanceMinor - a.balanceMinor,
    OVERDUE_DESC: (a, b) => b.daysLive - a.daysLive || b.balanceMinor - a.balanceMinor,
    AMOUNT_DESC: (a, b) => b.balanceMinor - a.balanceMinor,
    AMOUNT_ASC: (a, b) => a.balanceMinor - b.balanceMinor,
    DUE_DATE_ASC: (a, b) => a.dueDate.getTime() - b.dueDate.getTime(),
    RECENTLY_REMINDED: (a, b) =>
      (b.lastRemindedAt?.getTime() ?? 0) - (a.lastRemindedAt?.getTime() ?? 0) ||
      b.reminderCount - a.reminderCount,
  };
  view = [...view].sort(comparators[sort] ?? comparators.SEVERITY);

  const filteredOpen = view.filter((d) => isOpen(d.derivedStatus));
  const skip = filter.skip ?? 0;
  const take = filter.take ?? 50;
  const page = view.slice(skip, skip + take);

  return {
    stats: {
      outstandingRupees: toRupees(totalOutstandingMinor),
      openCount: open.length,
      overdueRupees: toRupees(overdue.reduce((s, d) => s + d.balanceMinor, 0)),
      overdueCount: overdue.length,
      partialCount: open.filter((d) => d.derivedStatus === 'PARTIAL').length,
      defaulterCount: defaulterStudents.size,
      chasedCount: open.filter((d) => d.reminderCount > 0).length,
      clearedCount: decorated.filter((d) => d.derivedStatus === 'CLEARED').length,
      waivedCount: decorated.filter((d) => d.derivedStatus === 'WAIVED').length,
      waivedRupees: toRupees(
        decorated.filter((d) => d.derivedStatus === 'WAIVED').reduce((s, d) => s + d.balanceMinor, 0),
      ),
      recoveredMonthRupees: toRupees(recentAllocations.reduce((s, a) => s + a.amountMinor, 0)),
      recoveredMonthCount: recentAllocations.length,
      // Late fines currently standing on open bills. Broken out because a
      // recovery officer looking at "outstanding" needs to know how much of it
      // is a bill and how much is the cost of waiting.
      lateFeeRupees: toRupees(open.reduce((s, d) => s + (d.lateFeeMinor ?? 0), 0)),
      lateFeeCount: open.filter((d) => (d.lateFeeMinor ?? 0) > 0).length,
      // Installments are real dues, so they count in `openCount` above — these two
      // just let the screen say how much of the book is already agreed to pay
      // over time instead of being chased in full.
      installmentCount: decorated.filter((d) => d.installmentPlanId != null).length,
      installmentRupees: toRupees(
        decorated
          .filter((d) => d.installmentPlanId != null && d.status !== 'SUPERSEDED')
          .reduce((s, d) => s + totalClaimedMinor(d), 0),
      ),
      planCount: new Set(decorated.map((d) => d.installmentPlanId).filter(Boolean)).size,
      supersededCount: decorated.filter((d) => d.derivedStatus === 'SUPERSEDED').length,
    },
    aging,
    filteredCount: view.length,
    filteredOpenRupees: toRupees(filteredOpen.reduce((s, d) => s + d.balanceMinor, 0)),
    total: view.length,
    dues: page.map((d) => ({
      id: d.id,
      studentProfileId: d.studentProfile.id,
      student: d.studentProfile.user.fullName,
      rollNo: d.studentProfile.rollNo,
      semester: d.studentProfile.currentSemester,
      title: d.title,
      program: d.feeStructure?.program?.name ?? null,
      amountRupees: toRupees(d.amountMinor),
      lateFeeRupees: toRupees(d.lateFeeMinor ?? 0),
      paidRupees: toRupees(d.paidMinor),
      balanceRupees: toRupees(d.balanceMinor),
      dueDate: d.dueDate,
      daysOverdue: d.daysLive,
      status: d.derivedStatus,
      bucket: d.bucketId,
      reminderCount: d.reminderCount,
      lastRemindedAt: d.lastRemindedAt,
      waivedReason: d.waivedReason,
      waivedAt: d.waivedAt,
      collectible: isOpen(d.derivedStatus),
      // An installment is an ordinary bill that happens to know which plan it
      // belongs to, so the UI can badge it and count the plan's progress.
      installmentPlanId: d.installmentPlanId,
      installmentSequence: d.installmentSequence,
      isInstallment: d.installmentPlanId != null,
      supersededByPlanId: d.supersededByPlanId,
    })),
  };
}

// ── Detail ───────────────────────────────────────────────────
export async function getDueDetail(institutionId: string, dueId: string) {
  await reconcileDues(institutionId);

  const due = await prisma.feeDue.findFirst({
    where: { id: dueId, ...dueScopeWhere(institutionId) },
    include: {
      ...STUDENT_INCLUDE,
      allocations: {
        include: {
          payment: {
            select: {
              id: true,
              referenceNo: true,
              method: true,
              category: true,
              status: true,
              paidAt: true,
              createdAt: true,
              reversedAt: true,
              reversalReason: true,
              receipt: { select: { receiptNo: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!due) throw notFound('Fee due not found');

  const status = deriveDueStatus(due);
  const open = isOpen(status);
  const balanceMinor = balanceOf(due);

  // The student's whole position, so "can I collect this?" is answerable without
  // leaving the screen.
  const siblingDues = await prisma.feeDue.findMany({
    where: { studentProfileId: due.studentProfile.id, id: { not: due.id } },
    select: {
      id: true,
      title: true,
      amountMinor: true,
      paidMinor: true,
      lateFeeMinor: true,
      status: true,
      dueDate: true,
      daysOverdue: true,
      installmentSequence: true,
    },
    orderBy: { dueDate: 'asc' },
  });
  const siblingOpen = siblingDues
    .map((s) => ({ ...s, derivedStatus: deriveDueStatus(s), balanceMinor: balanceOf(s) }))
    .filter((s) => isOpen(s.derivedStatus));

  // Reminder history is reconstructed from the audit trail rather than a second
  // table: `fee.remind` is already written on every send, so the officer can see
  // who chased, when, and what they said.
  const reminders = await prisma.auditLog.findMany({
    where: { entityType: 'FeeDue', entityId: due.id, action: 'fee.remind' },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  const actorIds = [...new Set(reminders.map((r) => r.actorUserId).filter(Boolean))] as string[];
  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, fullName: true },
      })
    : [];
  const actorName = new Map(actors.map((a) => [a.id, a.fullName]));

  let waivedBy: string | null = null;
  if (due.waivedByUserId) {
    const u = await prisma.user.findUnique({
      where: { id: due.waivedByUserId },
      select: { fullName: true },
    });
    waivedBy = u?.fullName ?? null;
  }

  return {
    due: {
      id: due.id,
      title: due.title,
      amountRupees: toRupees(due.amountMinor),
      paidRupees: toRupees(due.paidMinor),
      balanceRupees: toRupees(balanceMinor),
      status,
      dueDate: due.dueDate,
      // Derived, like the list. The detail screen used to read the stored
      // column while the list derived it, so tapping through to a bill could
      // change its own age — and a user who saw "0 days overdue" on one screen
      // and "23 days overdue" on the next has no way to tell which is real.
      daysOverdue: open ? daysPastDue(due.dueDate) : 0,
      bucket: open
        ? bucketFor(daysPastDue(due.dueDate)).id
        : status === 'CLEARED'
          ? 'CLEARED'
          : status === 'WAIVED'
            ? 'WAIVED'
            : 'SUPERSEDED',
      createdAt: due.createdAt,
      lastPaymentAt: due.lastPaymentAt,
      reminderCount: due.reminderCount,
      lastRemindedAt: due.lastRemindedAt,
      waivedReason: due.waivedReason,
      waivedAt: due.waivedAt,
      waivedBy,
      // What this screen will let you do — decided server-side so the UI cannot
      // offer an action the backend will reject.
      canRemind: open,
      canCollect: open,
      canWaive: open && balanceMinor > 0,
      canReinstate: status === 'WAIVED',
      // A plan can only be agreed on a bill that is genuinely open and unpaid
      // money, has no plan yet, and has not already been split into installments.
      canPlan: open && balanceMinor > 0 && due.installmentPlanId == null,
      canAssessFine: open && due.lateFeeMinor === 0,
      canWaiveFine: open && due.lateFeeMinor > 0,
    },
    // Late-payment fine, shown as its own thing rather than folded silently into
    // the total: a family disputing ₹2,25,000 needs to see that ₹2,000 of it is a
    // penalty and exactly when and by whom it was added.
    lateFee: await getDueLateFee(institutionId, due),
    // The agreed payment plan, in whichever direction applies: an instalment
    // knows its plan, and a replaced parent knows the plan that replaced it.
    // Loaded here rather than in a second request so the detail screen never
    // renders a bill without the schedule that governs it.
    plan: await getPlanForDue(institutionId, {
      installmentPlanId: due.installmentPlanId,
      supersededByPlanId: due.supersededByPlanId,
    }),
    student: {
      id: due.studentProfile.id,
      name: due.studentProfile.user.fullName,
      email: due.studentProfile.user.email,
      rollNo: due.studentProfile.rollNo,
      semester: due.studentProfile.currentSemester,
      program: due.feeStructure?.program?.name ?? null,
    },
    feeStructure: due.feeStructure
      ? {
          tuitionRupees: toRupees(due.feeStructure.tuitionMinor),
          otherRupees: toRupees(due.feeStructure.otherMinor),
          totalRupees: toRupees(due.feeStructure.totalMinor),
          academicYear: due.feeStructure.academicYear?.name ?? null,
        }
      : null,
    position: {
      outstandingRupees: toRupees(
        (balanceMinor || 0) + siblingOpen.reduce((s, d) => s + d.balanceMinor, 0),
      ),
      openDues: siblingOpen.length + (open ? 1 : 0),
    },
    allocations: due.allocations.map((a) => ({
      id: a.id,
      paymentId: a.payment.id,
      referenceNo: a.payment.referenceNo,
      receiptNo: a.payment.receipt?.receiptNo ?? null,
      amountRupees: toRupees(a.amountMinor),
      method: a.payment.method,
      category: a.payment.category,
      status: a.payment.status,
      isReversed: !!a.payment.reversedAt,
      reversalReason: a.payment.reversalReason,
      paidAt: a.payment.paidAt,
      createdAt: a.createdAt,
    })),
    reminders: reminders.map((r) => ({
      id: r.id,
      actor: r.actorUserId ? actorName.get(r.actorUserId) ?? 'Unknown' : 'System',
      note: (() => {
        try {
          return r.afterJson ? (JSON.parse(r.afterJson) as { note?: string }).note ?? null : null;
        } catch {
          return null;
        }
      })(),
      sentAt: r.createdAt,
    })),
    otherOpenDues: siblingOpen.map((d) => ({
      id: d.id,
      title: d.title,
      balanceRupees: toRupees(d.balanceMinor),
      daysOverdue: daysPastDue(d.dueDate),
      status: d.derivedStatus,
    })),
  };
}

// ── Reminder ─────────────────────────────────────────────────
export async function remindDue(
  institutionId: string,
  actorUserId: string,
  dueId: string,
  note?: string,
) {
  const due = await prisma.feeDue.findFirst({
    where: { id: dueId, ...dueScopeWhere(institutionId) },
    include: { studentProfile: { include: { user: { select: { id: true, fullName: true } } } } },
  });
  if (!due) throw notFound('Fee due not found');

  const status = deriveDueStatus(due);
  if (status === 'CLEARED') throw conflict('This fee is already cleared — nothing to chase');
  if (status === 'WAIVED') throw conflict('This fee is waived — reinstate it before reminding');

  // A balance of zero on an "open" due means money already settled it but the
  // status column is behind. Chasing a family for a bill they paid is the worst
  // thing this screen can do, so refuse rather than guess.
  const balanceMinor = balanceOf(due);
  if (balanceMinor === 0) {
    throw unprocessable('This due has no outstanding balance — it looks settled.');
  }

  await prisma.feeDue.update({
    where: { id: due.id },
    data: { lastRemindedAt: new Date(), reminderCount: { increment: 1 } },
  });

  const amount = toRupees(balanceMinor);
  const body =
    `Your fee "${due.title}" of ₹${amount} is ` +
    (daysPastDue(due.dueDate) > 0 ? `${daysPastDue(due.dueDate)} day(s) overdue` : 'due') +
    `. Please clear it at the earliest.` +
    (note ? `\n\nNote from the accounts office: ${note}` : '');

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: due.studentProfile.userId,
      type: 'FEE_DUE',
      title: `Fee reminder: ${due.title}`,
      body,
      sourceModule: 'accounts',
      dataJson: JSON.stringify({ module: 'accounts', screen: 'Dues', dueId: due.id }),
    },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'fee.remind',
    entityType: 'FeeDue',
    entityId: dueId,
    after: { student: due.studentProfile.user.fullName, balanceRupees: amount, note: note ?? null },
  });

  return {
    id: due.id,
    reminded: true,
    reminderCount: due.reminderCount + 1,
    balanceRupees: amount,
    remindedAt: new Date(),
  };
}

// ── Waive / reinstate ────────────────────────────────────────
export async function waiveFee(
  institutionId: string,
  actorUserId: string,
  dueId: string,
  reason: string,
) {
  const due = await prisma.feeDue.findFirst({
    where: { id: dueId, ...dueScopeWhere(institutionId) },
    include: { studentProfile: { include: { user: { select: { id: true, fullName: true } } } } },
  });
  if (!due) throw notFound('Fee due not found');

  const status = deriveDueStatus(due);
  if (status === 'CLEARED') throw conflict('Fee is already cleared — nothing to waive');
  if (status === 'WAIVED') throw conflict('Fee is already waived');

  const balanceMinor = balanceOf(due);
  if (balanceMinor === 0) throw unprocessable('Fee has no outstanding balance to waive');

  await prisma.feeDue.update({
    where: { id: due.id },
    data: {
      status: 'WAIVED',
      waivedReason: reason,
      waivedAt: new Date(),
      waivedByUserId: actorUserId,
    },
  });

  const amount = toRupees(balanceMinor);
  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: due.studentProfile.user.id,
      type: 'FEE_DUE',
      title: `Fee waived: ${due.title}`,
      body: `Your fee "${due.title}" of ₹${amount} has been waived. Reason: ${reason}.`,
      sourceModule: 'accounts',
    },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'fee.waive',
    entityType: 'FeeDue',
    entityId: dueId,
    before: { status, balanceRupees: amount },
    after: { status: 'WAIVED', balanceRupees: amount, reason },
  });

  return { id: due.id, status: 'WAIVED', balanceRupees: amount, waivedAt: new Date() };
}

/**
 * Undo a waiver. Without this the desk's only answer to a mistaken write-off was
 * a direct database edit with no audit trail. The status is re-derived from the
 * balance, so reinstating a part-paid due brings back PARTIAL — not UNPAID.
 */
export async function reinstateDue(
  institutionId: string,
  actorUserId: string,
  dueId: string,
  reason: string,
) {
  const due = await prisma.feeDue.findFirst({
    where: { id: dueId, ...dueScopeWhere(institutionId) },
    include: { studentProfile: { include: { user: { select: { id: true, fullName: true } } } } },
  });
  if (!due) throw notFound('Fee due not found');
  if (due.status !== 'WAIVED') throw conflict(`Fee is ${due.status}, not WAIVED — nothing to reinstate`);

  const restored = deriveDueStatus({ ...due, status: 'UNPAID' });
  const daysOverdue = daysPastDue(due.dueDate);

  await prisma.feeDue.update({
    where: { id: due.id },
    data: {
      status: restored,
      waivedReason: null,
      waivedAt: null,
      waivedByUserId: null,
      daysOverdue: isOpen(restored) ? daysOverdue : 0,
    },
  });

  const amount = toRupees(balanceOf(due));
  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: due.studentProfile.user.id,
      type: 'FEE_DUE',
      title: `Fee reinstated: ${due.title}`,
      body: `The waiver on "${due.title}" has been reversed and ₹${amount} is payable again. Reason: ${reason}.`,
      sourceModule: 'accounts',
    },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'fee.reinstate',
    entityType: 'FeeDue',
    entityId: dueId,
    before: { status: 'WAIVED', waivedReason: due.waivedReason, balanceRupees: amount },
    after: { status: restored, balanceRupees: amount, reason },
  });

  return { id: due.id, status: restored, balanceRupees: amount, daysOverdue };
}
// ── Sub-modules ──────────────────────────────────────────────
// The fines, plans and insights logic lives in its own files because each is
// a self-contained concern with its own rules. They are re-exported here so
// `import * as dues from './dues.service.js'` in the router keeps working and
// every dues capability stays reachable from one module.
export {
  computeLateFee,
  getLateFeeSettings,
  getActiveLateFeeRule,
  saveLateFeeRule,
  getDueLateFee,
  assessLateFee,
  waiveLateFee,
  runLateFeeAssessment,
  type LateFeeRuleInput,
} from './dues.fines.js';

export {
  splitAmount,
  PLAN_FREQUENCIES,
  createInstallmentPlan,
  cancelInstallmentPlan,
  listPlans,
  getPlanForDue,
  getDuePlan,
  type PlanFrequency,
} from './dues.plans.js';

export {
  listStudentBalances,
  getStudentDues,
  listCourseDues,
  previewBulkRemind,
  remindBulk,
  type BulkRemindInput,
} from './dues.insights.js';
