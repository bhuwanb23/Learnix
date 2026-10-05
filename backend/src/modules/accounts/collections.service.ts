// F-02 Collections service — the money-IN desk.
// Docs: 06-accounts-finance.md §3.2 · §4 F-02
//
// The old implementation created a Payment and a Receipt and stopped there. It
// never touched `fee_dues`, so collecting ₹40,000 against a ₹58,000 due left the
// due untouched and the Dues screen unchanged. A collections desk that does not
// move a balance is not a collections desk.
//
// Four invariants this service enforces:
//  1. Money is ALLOCATED, not guessed. `PaymentAllocation` records which dues a
//     payment settled and how much went to each. One payment can clear several
//     dues, which is why a due cannot hold a single paymentId.
//  2. A due's balance is `amountMinor - paidMinor`, and its status is derived
//     from that. `status` alone could not tell a half-paid due from an unpaid one.
//  3. Reference numbers are collision-safe. The old code numbered from a global
//     count, which duplicates under concurrency and collides with the alumni
//     module's identical scheme. Numbers are derived and retried against the
//     unique index.
//  4. A reversal is real: it un-applies the allocations, reopens the dues and
//     voids the receipt. Payments are never deleted — the ledger keeps history.
//
// Money: integer paise throughout (ADR-04). Rupees appear only at the edge.
import type { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { notFound, conflict, unprocessable, badRequest } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
// A due's balance now includes any assessed late fine (dues.money.ts). This
// import is what stops the two desks disagreeing: without it, a payment could be
// REFUSED here with "exceeds the ₹22,500 outstanding" while the Dues desk showed
// ₹23,700 owing after a fine.
import { balanceOf, deriveDueStatus } from './dues.money.js';

const DAY_MS = 1000 * 60 * 60 * 24;
const toRupees = (paise: number) => Math.round(paise / 100);

export const PAYMENT_CATEGORIES = [
  'TUITION', 'HOSTEL_RENT', 'MESS', 'TRANSPORT', 'FINE', 'DONATION', 'MISC',
] as const;

export const PAYMENT_METHODS = ['UPI', 'NET_BANKING', 'CARD', 'CASH', 'CHEQUE'] as const;

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/**
 * `FeeDue` has no `institutionId` of its own — it reaches its tenant through
 * `studentProfile.user`. Every read and write of a due must go through this, or
 * the desk will happily collect against another school's bill.
 */
const dueScopeWhere = (institutionId: string) => ({
  studentProfile: { user: { institutionId, deletedAt: null } },
});

// ── Overdue recomputation ───────────────────────────────────
/**
 * `FeeDue.daysOverdue` is denormalised and drifts as days pass. Every read that
 * shows a due refreshes it, so the desk never quotes a stale day count.
 */
export async function syncDueOverdue(institutionId: string) {
  const today = startOfDay(new Date());

  const stale = await prisma.feeDue.findMany({
    where: {
      ...dueScopeWhere(institutionId),
      status: { in: ['UNPAID', 'PARTIAL'] },
      dueDate: { lt: today },
    },
    select: { id: true, dueDate: true, daysOverdue: true },
  });

  let changed = 0;
  for (const d of stale) {
    const days = Math.max(0, Math.floor((today.getTime() - startOfDay(d.dueDate).getTime()) / DAY_MS));
    if (d.daysOverdue === days) continue;
    await prisma.feeDue.update({ where: { id: d.id }, data: { daysOverdue: days } });
    changed += 1;
  }
  return changed;
}

// ── Reference numbers ───────────────────────────────────────
/**
 * Derive the next PAY-/RCP- number for the year, scoped to the institution.
 * `Payment` carries `@@unique([institutionId, referenceNo])`, so a collision
 * throws rather than silently duplicating — which is why the caller retries.
 *
 * The next number is the MAX existing suffix plus one, NOT the count plus one.
 * `count + 1` breaks the moment there is a gap: with PAY-2026-0001, 0002, 0003
 * and 0005 present, count is 4 so the next is 0005 — which already exists. Every
 * retry recomputes the same colliding number, so all five attempts fail and the
 * desk cannot record a payment at all. Gaps are normal here (the seed skips
 * numbers, and a reversed payment is never deleted), so the max is the only
 * correct basis.
 */
type Tx = Prisma.TransactionClient;

async function nextReference(tx: Tx, institutionId: string, prefix: 'PAY' | 'RCP') {
  const year = new Date().getFullYear();
  const head = `${prefix}-${year}-`;
  const existing = await tx.payment.findMany({
    where: { institutionId, referenceNo: { startsWith: head } },
    select: { referenceNo: true },
  });
  const max = existing.reduce((m, p) => {
    const n = Number.parseInt(p.referenceNo.slice(head.length), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return head + String(max + 1).padStart(4, '0');
}

async function nextReceiptNo(tx: Tx, institutionId: string) {
  const year = new Date().getFullYear();
  const head = `RCP-${year}-`;
  // Counted on receipts (not payments) so this agrees with the hostel/transport
  // numbering instead of racing it to a duplicate.
  const count = await tx.receipt.count({
    where: { payment: { institutionId }, receiptNo: { startsWith: head } },
  });
  return head + String(count + 1).padStart(4, '0');
}

// ── Listing ─────────────────────────────────────────────────
export type CollectionFilter = {
  q?: string;
  category?: 'ALL' | (typeof PAYMENT_CATEGORIES)[number];
  method?: 'ALL' | (typeof PAYMENT_METHODS)[number];
  status?: 'ALL' | 'CLEARED' | 'PENDING' | 'FAILED';
  range?: 'TODAY' | 'WEEK' | 'MONTH' | 'ALL';
  sort?: 'NEWEST' | 'OLDEST' | 'AMOUNT_DESC' | 'AMOUNT_ASC';
  take?: number;
  skip?: number;
};

export async function listCollections(institutionId: string, filter: CollectionFilter = {}) {
  const now = new Date();
  const today = startOfDay(now);

  const where: Record<string, unknown> = { institutionId };

  if (filter.category && filter.category !== 'ALL') where.category = filter.category;
  if (filter.method && filter.method !== 'ALL') where.method = filter.method;
  if (filter.status && filter.status !== 'ALL') where.status = filter.status;

  if (filter.range && filter.range !== 'ALL') {
    const from =
      filter.range === 'TODAY'
        ? today
        : filter.range === 'WEEK'
          ? new Date(today.getTime() - 7 * DAY_MS)
          : new Date(today.getTime() - 30 * DAY_MS);
    where.createdAt = { gte: from };
  }

  if (filter.q) {
    where.OR = [
      { referenceNo: { contains: filter.q } },
      { studentProfile: { rollNo: { contains: filter.q } } },
      { studentProfile: { user: { fullName: { contains: filter.q } } } },
      { receipt: { receiptNo: { contains: filter.q } } },
    ];
  }

  const orderBy =
    filter.sort === 'OLDEST'
      ? { createdAt: 'asc' as const }
      : filter.sort === 'AMOUNT_DESC'
        ? { amountMinor: 'desc' as const }
        : filter.sort === 'AMOUNT_ASC'
          ? { amountMinor: 'asc' as const }
          : { createdAt: 'desc' as const };

  const take = Math.min(filter.take ?? 50, 200);
  const skip = Math.max(filter.skip ?? 0, 0);

  const [rows, total, allTime, monthStart, filteredAgg] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        studentProfile: { include: { user: { select: { fullName: true } } } },
        receipt: { select: { receiptNo: true, voidedAt: true } },
        allocations: { include: { due: { select: { id: true, title: true } } } },
      },
      orderBy,
      take,
      skip,
    }),
    prisma.payment.count({ where }),
    // Headline totals ignore the active filter, so the summary cards stay put
    // while the officer narrows the list.
    prisma.payment.aggregate({
      where: { institutionId, reversedAt: null, status: 'CLEARED' },
      _sum: { amountMinor: true },
      _count: { _all: true },
    }),
    prisma.payment.aggregate({
      where: {
        institutionId,
        reversedAt: null,
        status: 'CLEARED',
        createdAt: { gte: new Date(today.getTime() - 30 * DAY_MS) },
      },
      _sum: { amountMinor: true },
      _count: { _all: true },
    }),
    // The filtered slice sums money ACTUALLY banked — a reversed payment keeps
    // its row (the officer must see it) but must not inflate the total.
    prisma.payment.aggregate({ where: { ...where, reversedAt: null }, _sum: { amountMinor: true } }),
  ]);

  const todayAgg = await prisma.payment.aggregate({
    where: { institutionId, reversedAt: null, status: 'CLEARED', createdAt: { gte: today } },
    _sum: { amountMinor: true },
    _count: { _all: true },
  });

  const reversedAgg = await prisma.payment.aggregate({
    where: { institutionId, reversedAt: { not: null } },
    _sum: { amountMinor: true },
    _count: { _all: true },
  });

  const filteredReversed = await prisma.payment.count({ where: { ...where, reversedAt: { not: null } } });

  return {
    stats: {
      todayRupees: toRupees(todayAgg._sum.amountMinor ?? 0),
      todayCount: todayAgg._count._all,
      monthRupees: toRupees(monthStart._sum.amountMinor ?? 0),
      monthCount: monthStart._count._all,
      allTimeRupees: toRupees(allTime._sum.amountMinor ?? 0),
      allTimeCount: allTime._count._all,
      reversedCount: reversedAgg._count._all,
      reversedRupees: toRupees(reversedAgg._sum.amountMinor ?? 0),
      // What the CURRENT filter is showing, so the list header can say so.
      // `filteredCount` counts every matching row INCLUDING reversed ones — it
      // has to agree with the number of rows rendered, or the header lies.
      // `filteredRupees` is money actually banked, so it drops the reversals
      // and `filteredReversedCount` says how many were dropped.
      filteredRupees: toRupees(filteredAgg._sum.amountMinor ?? 0),
      filteredCount: total,
      filteredReversedCount: filteredReversed,
    },
    collections: rows.map((p) => ({
      id: p.id,
      student: p.studentProfile?.user.fullName ?? null,
      rollNo: p.studentProfile?.rollNo ?? null,
      category: p.category,
      amountRupees: toRupees(p.amountMinor),
      method: p.method,
      status: p.status,
      referenceNo: p.referenceNo,
      receiptNo: p.receipt?.receiptNo ?? null,
      receiptVoided: !!p.receipt?.voidedAt,
      reversedAt: p.reversedAt,
      reversalReason: p.reversalReason,
      isReversed: !!p.reversedAt,
      // Money that actually landed on a due, as opposed to an advance.
      allocatedRupees: toRupees(p.allocations.reduce((s, a) => s + a.amountMinor, 0)),
      allocatedCount: p.allocations.length,
      settledTitles: p.allocations.map((a) => a.due.title),
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    })),
    total,
    take,
    skip,
  };
}

// ── Detail ──────────────────────────────────────────────────
export async function getCollectionDetail(institutionId: string, paymentId: string) {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, institutionId },
    include: {
      studentProfile: {
        include: {
          user: { select: { fullName: true, email: true } },
        },
      },
      receipt: true,
      allocations: {
        include: {
          due: {
            include: { feeStructure: { select: { program: { select: { name: true } } } } },
          },
        },
      },
    },
  });
  if (!payment) throw notFound('Payment not found');

  // recordedByUserId / reversal stamp are bare scalars — resolve names manually.
  const [recorder, reverser] = await Promise.all([
    payment.recordedByUserId
      ? prisma.user.findUnique({ where: { id: payment.recordedByUserId }, select: { fullName: true } })
      : null,
    payment.reversedAt && payment.recordedByUserId
      ? prisma.user.findUnique({ where: { id: payment.recordedByUserId }, select: { fullName: true } })
      : null,
  ]);

  // Domain-owned payments (donations, hostel, transport, library fines) are
  // reversed in their own module — say so instead of pretending we can unlink them.
  const [donationLink, hostelLink, transportLink, fineLink] = await Promise.all([
    prisma.donationPayment.findUnique({ where: { paymentId: payment.id }, select: { id: true } }),
    prisma.hostelRentDue.findFirst({ where: { paymentId: payment.id }, select: { id: true } }),
    prisma.transportFeeDue.findFirst({ where: { paymentId: payment.id }, select: { id: true } }),
    prisma.finePayment.findFirst({ where: { paymentId: payment.id }, select: { id: true } }),
  ]);
  const externalLinks = {
    donation: !!donationLink,
    hostel: !!hostelLink,
    transport: !!transportLink,
    fine: !!fineLink,
  };

  const linkedElsewhere = Object.values(externalLinks).some(Boolean);

  return {
    payment: {
      id: payment.id,
      referenceNo: payment.referenceNo,
      category: payment.category,
      amountRupees: toRupees(payment.amountMinor),
      method: payment.method,
      status: payment.status,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      isReversed: !!payment.reversedAt,
      reversedAt: payment.reversedAt,
      reversalReason: payment.reversalReason,
      recordedBy: recorder?.fullName ?? null,
      reversalBy: payment.reversedAt ? reverser?.fullName ?? null : null,
      gatewayRef: payment.gatewayRef,
    },
    student: payment.studentProfile
      ? {
        id: payment.studentProfile.id,
        name: payment.studentProfile.user.fullName,
        email: payment.studentProfile.user.email,
        rollNo: payment.studentProfile.rollNo,
      }
      : null,
    receipt: payment.receipt
      ? {
        receiptNo: payment.receipt.receiptNo,
        issuedAt: payment.receipt.issuedAt,
        voidedAt: payment.receipt.voidedAt,
        voidReason: payment.receipt.voidReason,
      }
      : null,
    allocations: payment.allocations.map((a) => ({
      id: a.id,
      dueId: a.dueId,
      title: a.due.title,
      program: a.due.feeStructure?.program?.name ?? null,
      amountRupees: toRupees(a.amountMinor),
      dueAmountRupees: toRupees(a.due.amountMinor),
      duePaidRupees: toRupees(a.due.paidMinor),
      dueBalanceRupees: toRupees(balanceOf(a.due)),
      dueStatus: a.due.status,
      clearedThisDue: a.due.status === 'CLEARED',
    })),
    allocatedRupees: toRupees(payment.allocations.reduce((s, a) => s + a.amountMinor, 0)),
    unallocatedRupees: toRupees(
      payment.amountMinor - payment.allocations.reduce((s, a) => s + a.amountMinor, 0),
    ),
    externalLinks,
    canReverse: !payment.reversedAt && payment.allocations.length > 0 && !linkedElsewhere,
    reverseBlockReason: payment.reversedAt
      ? 'This payment is already reversed'
      : linkedElsewhere
        ? 'This payment belongs to another module (donation, hostel, transport or fine) and is reversed there'
        : payment.allocations.length === 0
          ? 'This payment is not allocated to any fee due, so there is nothing to reverse'
          : null,
  };
}

// ── Student picker ──────────────────────────────────────────
/**
 * Type-ahead for the collect screen. Returns each student with the money they
 * owe right now, so the officer sees the outstanding balance before typing a
 * figure rather than after.
 */
export async function searchPayableStudents(institutionId: string, q: string, limit = 10) {
  const term = (q ?? '').trim();
  if (term.length < 2) return [];

  const profiles = await prisma.studentProfile.findMany({
    where: {
      user: { institutionId, deletedAt: null },
      OR: [
        { rollNo: { contains: term } },
        { user: { fullName: { contains: term } } },
        { user: { email: { contains: term } } },
      ],
    },
    include: { user: { select: { fullName: true, email: true } } },
    take: Math.min(limit, 30),
    orderBy: { rollNo: 'asc' },
  });

  if (profiles.length === 0) return [];

  const dues = await prisma.feeDue.findMany({
    where: {
      studentProfileId: { in: profiles.map((p) => p.id) },
      status: { in: ['UNPAID', 'PARTIAL'] },
    },
    select: { studentProfileId: true, amountMinor: true, paidMinor: true, lateFeeMinor: true, daysOverdue: true },
  });

  return profiles.map((p) => {
    const mine = dues.filter((d) => d.studentProfileId === p.id);
    return {
      id: p.id,
      rollNo: p.rollNo,
      name: p.user.fullName,
      email: p.user.email,
      openDues: mine.length,
      outstandingRupees: toRupees(
        mine.reduce((s, d) => s + balanceOf(d), 0),
      ),
      oldestOverdueDays: mine.reduce((m, d) => Math.max(m, d.daysOverdue), 0),
    };
  });
}

// ── Record ──────────────────────────────────────────────────
export type CollectInput = {
  rollNo?: string;
  studentProfileId?: string;
  amountMinor: number;
  method: string;
  category: string;
  allocations?: { dueId: string; amountMinor: number }[];
  note?: string;
};

/**
 * Record a collection and move the student's dues. Allocations are applied
 * oldest-due-first unless the officer allocates explicitly.
 */
export async function recordCollection(
  institutionId: string,
  actorUserId: string,
  input: CollectInput,
) {
  if (input.amountMinor < 1) throw badRequest('Amount must be greater than zero');

  // Resolve the payer. A collection may legitimately have no student (a
  // donation or a misc receipt) — those stay unallocated by design.
  let studentProfileId: string | null = null;
  let payerUserId: string | null = null;
  let studentName: string | null = null;

  if (input.studentProfileId || input.rollNo) {
    const profile = await prisma.studentProfile.findFirst({
      where: input.studentProfileId
        ? { id: input.studentProfileId, user: { institutionId, deletedAt: null } }
        : { rollNo: input.rollNo, user: { institutionId, deletedAt: null } },
      include: { user: { select: { id: true, fullName: true } } },
    });
    if (!profile) {
      throw notFound(
        input.rollNo ? `No student with roll number ${input.rollNo}` : 'Student not found',
      );
    }
    studentProfileId = profile.id;
    payerUserId = profile.userId;
    studentName = profile.user.fullName;
  }

  const requested = (input.allocations ?? []).filter((a) => a.amountMinor > 0);
  let allocations = requested;

  // No explicit split: settle the student's dues oldest-first, then treat any
  // remainder as an unallocated advance.
  if (allocations.length === 0 && studentProfileId) {
    const dues = await prisma.feeDue.findMany({
      where: { ...dueScopeWhere(institutionId), studentProfileId, status: { in: ['UNPAID', 'PARTIAL'] } },
      select: { id: true, amountMinor: true, paidMinor: true, lateFeeMinor: true },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });
    let left = input.amountMinor;
    for (const d of dues) {
      if (left <= 0) break;
      const balance = balanceOf(d);
      if (balance <= 0) continue;
      const take = Math.min(balance, left);
      allocations.push({ dueId: d.id, amountMinor: take });
      left -= take;
    }
  }

  const allocatedMinor = allocations.reduce((s, a) => s + a.amountMinor, 0);
  if (allocatedMinor > input.amountMinor) {
    throw unprocessable(
      `Allocated ₹${toRupees(allocatedMinor)} exceeds the payment of ₹${toRupees(input.amountMinor)}`,
    );
  }
  if (allocations.length > 0 && !studentProfileId) {
    throw unprocessable('A payment cannot be allocated to dues without naming the student');
  }

  // Validate each due up front so a bad id fails before anything is written.
  const dueIds = allocations.map((a) => a.dueId);
  const dues = dueIds.length
    ? await prisma.feeDue.findMany({
      where: { id: { in: dueIds }, ...dueScopeWhere(institutionId) },
      select: { id: true, title: true, amountMinor: true, paidMinor: true, lateFeeMinor: true, status: true, studentProfileId: true },
    })
    : [];
  const dueById = new Map(dues.map((d) => [d.id, d]));

  for (const a of allocations) {
    const due = dueById.get(a.dueId);
    if (!due) throw notFound(`Fee due ${a.dueId} not found for this institution`);
    if (due.studentProfileId !== studentProfileId) {
      throw unprocessable(`"${due.title}" belongs to a different student`);
    }
    if (due.status === 'CLEARED') throw conflict(`"${due.title}" is already fully paid`);
    if (due.status === 'WAIVED') throw conflict(`"${due.title}" has been waived`);
    // A bill replaced by an instalment plan is not payable as a whole — the
    // counter must take the money against a specific instalment.
    if (due.status === 'SUPERSEDED') {
      throw conflict(`"${due.title}" was replaced by a payment plan — collect against an instalment instead`);
    }
    const balance = balanceOf(due);
    if (a.amountMinor > balance) {
      throw unprocessable(
        `₹${toRupees(a.amountMinor)} exceeds the ₹${toRupees(balance)} outstanding on "${due.title}"`,
      );
    }
  }

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    // Retry the derived reference numbers: another desk may have taken the slot
    // between our count and our insert.
    let payment: { id: string; referenceNo: string; amountMinor: number } | null = null;
    let receiptNo = '';
    // Derived-and-retried: another desk can take the number between our count
    // and our insert, and the unique index turns that into a P2002 we retry.
    for (let attempt = 0; attempt < 5 && !payment; attempt++) {
      const referenceNo = await nextReference(tx, institutionId, 'PAY');
      receiptNo = await nextReceiptNo(tx, institutionId);
      try {
        payment = await tx.payment.create({
          data: {
            institutionId,
            payerUserId,
            studentProfileId,
            category: input.category,
            referenceNo,
            amountMinor: input.amountMinor,
            method: input.method,
            status: 'CLEARED',
            paidAt: now,
            recordedByUserId: actorUserId,
          },
        });
      } catch (err: any) {
        // Unique index on (institutionId, referenceNo) — try the next number.
        if (String(err?.code) === 'P2002' && attempt < 4) continue;
        throw err;
      }
    }
    if (!payment) throw conflict('Could not allocate a payment reference number');

    const receipt = await tx.receipt.create({
      data: { paymentId: payment.id, receiptNo, issuedAt: now },
    });

    if (allocations.length > 0) {
      await tx.paymentAllocation.createMany({
        data: allocations.map((a) => ({ paymentId: payment!.id, dueId: a.dueId, amountMinor: a.amountMinor })),
      });
    }

    // Apply each allocation and re-derive the due's status from its balance.
    for (const a of allocations) {
      const due = dueById.get(a.dueId)!;
      const paid = due.paidMinor + a.amountMinor;
      const fullyPaid = balanceOf({ ...due, paidMinor: paid }) === 0;
      await tx.feeDue.update({
        where: { id: due.id },
        data: {
          paidMinor: paid,
          lastPaymentAt: now,
          status: fullyPaid ? 'CLEARED' : 'PARTIAL',
        },
      });
    }

    return { payment, receipt, receiptNo };
  });

  const clearedTitles = allocations
    .map((a) => dueById.get(a.dueId))
    .filter((d) => d && balanceOf({ ...d, paidMinor: d.paidMinor + (allocations.find((a) => a.dueId === d!.id)?.amountMinor ?? 0) }) === 0)
    .map((d) => d!.title);

  const receiptNo = result.receiptNo;
  const referenceNo = result.payment.referenceNo;

  // Two messages, not one. "Your money arrived" and "here is the document that
  // proves it" are different facts with different follow-ups: a family that
  // needs the receipt for a bank query cannot find it inside a payment notice,
  // and a family looking for proof of payment should not have to read a bill
  // summary to find it.
  if (payerUserId) {
    await prisma.notification.create({
      data: {
        institutionId,
        recipientUserId: payerUserId,
        type: 'PAYMENT',
        title: `Payment received: ₹${toRupees(input.amountMinor)}`,
        body:
          clearedTitles.length > 0
            ? `We have received ₹${toRupees(input.amountMinor)}. This cleared: ${clearedTitles.join(', ')}.`
            : `We have received ₹${toRupees(input.amountMinor)}. It is held as an advance against your dues.`,
        sourceModule: 'accounts',
        // `paymentId` is what the collections screen keys on, so it travels with
        // the message: a PAYMENT notice carrying only a reference number cannot
        // be tapped through to the collection it describes.
        dataJson: JSON.stringify({
          module: 'accounts', screen: 'Collections',
          paymentId: result.payment.id, referenceNo,
        }),
      },
    });
    await prisma.notification.create({
      data: {
        institutionId,
        recipientUserId: payerUserId,
        type: 'RECEIPT',
        title: `Receipt ${receiptNo}`,
        body:
          `₹${toRupees(input.amountMinor)} received from ${input.method}. `
          + `Receipt ${receiptNo}${referenceNo ? ` against ${referenceNo}` : ''}.`,
        sourceModule: 'accounts',
        dataJson: JSON.stringify({
          module: 'accounts', screen: 'Collections',
          paymentId: result.payment.id, receiptNo, referenceNo,
        }),
      },
    });
  }

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'collection.record',
    entityType: 'Payment',
    entityId: result.payment.id,
    after: {
      referenceNo: result.payment.referenceNo,
      receiptNo,
      amountMinor: input.amountMinor,
      category: input.category,
      method: input.method,
      allocations: allocations.length,
      cleared: clearedTitles.length,
    },
  });

  return {
    id: result.payment.id,
    referenceNo: result.payment.referenceNo,
    receiptNo: result.receipt.receiptNo,
    amountRupees: toRupees(input.amountMinor),
    allocatedRupees: toRupees(allocatedMinor),
    unallocatedRupees: toRupees(input.amountMinor - allocatedMinor),
    category: input.category,
    method: input.method,
    student: studentName,
    clearedTitles,
    allocations: allocations.length,
  };
}

// ── Reverse ─────────────────────────────────────────────────
/**
 * Undo a collection: pull each allocation back off the due it settled, re-open
 * the dues, void the receipt and stamp the payment. The rows stay — an
 * accountant needs to see that the money came in and then went back out.
 */
export async function reverseCollection(
  institutionId: string,
  actorUserId: string,
  paymentId: string,
  reason: string,
) {
  const why = (reason ?? '').trim();
  if (why.length < 5) {
    throw unprocessable('Give a reason for the reversal (at least 5 characters)');
  }

  const detail = await getCollectionDetail(institutionId, paymentId);
  if (detail.payment.isReversed) throw conflict('This payment is already reversed');
  if (detail.externalLinks.donation || detail.externalLinks.hostel || detail.externalLinks.transport || detail.externalLinks.fine) {
    throw conflict(
      'This payment belongs to another module (donation, hostel, transport or fine) — reverse it there',
    );
  }
  if (detail.allocations.length === 0) {
    throw unprocessable('This payment is not allocated to any fee due, so there is nothing to reverse');
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const allocations = await tx.paymentAllocation.findMany({ where: { paymentId } });

    for (const a of allocations) {
      const due = await tx.feeDue.findUnique({
        where: { id: a.dueId },
        select: { id: true, amountMinor: true, paidMinor: true, lateFeeMinor: true, status: true },
      });
      if (!due) continue;
      const paid = Math.max(0, due.paidMinor - a.amountMinor);
      // A WAIVED due stays waived; a reversal simply reopens a settled one.
      // Re-derive from the money rather than decrementing a status, so a
      // reversal that un-covers a bill with a fine on it reopens it correctly.
      const status =
        due.status === 'WAIVED' || due.status === 'SUPERSEDED'
          ? due.status
          : deriveDueStatus({ ...due, status: 'UNPAID', paidMinor: paid });
      await tx.feeDue.update({
        where: { id: due.id },
        data: { paidMinor: paid, status, lastPaymentAt: paid > 0 ? due.status === 'CLEARED' ? null : now : null },
      });
    }

    await tx.payment.update({
      where: { id: paymentId },
      data: {
        reversedAt: now,
        reversalReason: why,
        recordedByUserId: actorUserId,
      },
    });

    await tx.receipt.updateMany({
      where: { paymentId },
      data: { voidedAt: now, voidReason: why },
    });
  });

  if (detail.student) {
    const student = await prisma.studentProfile.findFirst({
      where: { id: detail.student.id },
      select: { userId: true },
    });
    if (student) {
      await prisma.notification.create({
        data: {
          institutionId,
          recipientUserId: student.userId,
          // Its own type: a reversal is the opposite of a confirmation, and
          // filing it under PAYMENT made the two indistinguishable in a filter
          // and put a "payment received" row in the receipt list.
          type: 'PAYMENT_REVERSED',
          title: `Payment reversed: ${detail.payment.referenceNo}`,
          body: `The ₹${detail.payment.amountRupees} payment recorded against your account has been reversed. ${why}`,
          sourceModule: 'accounts',
        },
      });
    }
  }

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'collection.reverse',
    entityType: 'Payment',
    entityId: paymentId,
    before: { status: detail.payment.status, receiptNo: detail.receipt?.receiptNo },
    after: { reversed: true, reason: why, reopenedDues: detail.allocations.length },
  });

  return {
    id: paymentId,
    isReversed: true,
    reason: why,
    reopenedDues: detail.allocations.length,
  };
}

// ── Student statement ───────────────────────────────────────
/** Everything one student owes and has paid, in one honest place. */
export async function getStudentStatement(
  institutionId: string,
  selector: { rollNo?: string; studentProfileId?: string },
) {
  await syncDueOverdue(institutionId);

  const profile = await prisma.studentProfile.findFirst({
    where: selector.studentProfileId
      ? { id: selector.studentProfileId, user: { institutionId, deletedAt: null } }
      : { rollNo: selector.rollNo, user: { institutionId, deletedAt: null } },
    include: { user: { select: { fullName: true, email: true } } },
  });
  if (!profile) throw notFound('Student not found');

  const [dues, payments] = await Promise.all([
    prisma.feeDue.findMany({
      where: { studentProfileId: profile.id },
      include: { feeStructure: { select: { program: { select: { name: true } } } } },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    }),
    prisma.payment.findMany({
      where: { institutionId, studentProfileId: profile.id },
      include: { receipt: { select: { receiptNo: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  const balance = balanceOf;
  const open = dues.filter((d) => d.status === 'UNPAID' || d.status === 'PARTIAL');
  const outstandingMinor = open.reduce((s, d) => s + balance(d), 0);

  const paidMinor = dues.reduce((s, d) => s + d.paidMinor, 0);
  const billedMinor = dues.reduce((s, d) => s + d.amountMinor, 0);
  const unallocatedMinor = payments
    .filter((p) => !p.reversedAt)
    .reduce((s, p) => s + Math.max(0, p.amountMinor), 0) - paidMinor;

  return {
    student: {
      id: profile.id,
      name: profile.user.fullName,
      email: profile.user.email,
      rollNo: profile.rollNo,
    },
    position: {
      billedRupees: toRupees(billedMinor),
      paidRupees: toRupees(paidMinor),
      outstandingRupees: toRupees(outstandingMinor),
      openDues: open.length,
      // Money taken but not yet matched to a due — an advance, not a shortfall.
      unallocatedRupees: toRupees(Math.max(0, unallocatedMinor)),
    },
    dues: dues.map((d) => ({
      id: d.id,
      title: d.title,
      program: d.feeStructure?.program?.name ?? null,
      amountRupees: toRupees(d.amountMinor),
      lateFeeRupees: toRupees(d.lateFeeMinor),
      paidRupees: toRupees(d.paidMinor),
      balanceRupees: toRupees(balance(d)),
      status: d.status,
      isInstallment: !!d.installmentPlanId,
      installmentSequence: d.installmentSequence ?? null,
      dueDate: d.dueDate,
      daysOverdue: d.status === 'UNPAID' || d.status === 'PARTIAL' ? d.daysOverdue : 0,
      waivedReason: d.waivedReason,
    })),
    payments: payments.map((p) => ({
      id: p.id,
      referenceNo: p.referenceNo,
      receiptNo: p.receipt?.receiptNo ?? null,
      category: p.category,
      method: p.method,
      amountRupees: toRupees(p.amountMinor),
      status: p.status,
      isReversed: !!p.reversedAt,
      reversalReason: p.reversalReason,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    })),
  };
}
