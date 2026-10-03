// L-04 Fines & overdues service — list, detail, collect, waive, extend, bulk settle.
// Docs: users/07-library-staff.md §3.4 · §4 L-04
//
// Two invariants this module exists to guarantee:
//  1. Receipt numbering is scoped to category FINE. The old code numbered from the
//     GLOBAL payment count, which drifts against the other reference schemes
//     (PAY-TUI-*, PAY-TF-*) and will collide once enough payments exist.
//  2. A waiver is an audited accounting decision, so the reason is mandatory and
//     stored — not a hardcoded string like "Waived by librarian".
//
// Money: integer paise throughout. Fine rate ₹5/day (500 paise).
import { prisma } from '../../db/prisma.js';
import { notFound, conflict, unprocessable, badRequest } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { syncOverdueStatus } from './circulation.service.js';
import { loadPolicy } from './settings.service.js';
const toRupees = (paise: number) => Math.round(paise / 100);

export const COLLECTION_METHODS = ['UPI', 'NET_BANKING', 'CARD', 'CASH'] as const;

const fineInclude = {
  bookIssue: {
    include: {
      book: { select: { id: true, title: true, author: true, category: true } },
      studentProfile: {
        include: { user: { select: { id: true, fullName: true, email: true } } },
      },
      finePayments: { include: { payment: true }, orderBy: { createdAt: 'desc' } },
    },
  },
} as const;

type FineRow = {
  id: string;
  amountMinor: number;
  daysOverdue: number;
  status: string;
  waivedReason: string | null;
  paidPaymentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  bookIssueId: string;
  bookIssue: {
    id: string;
    issueDate: Date;
    dueDate: Date;
    returnDate: Date | null;
    status: string;
    renewCount: number;
    book: { id: string; title: string; author: string | null; category: string | null };
    studentProfile: { id: string; rollNo: string; user: { id: string; fullName: string; email: string } };
    finePayments: { id: string; createdAt: Date; payment: {
      id: string; referenceNo: string; amountMinor: number; method: string;
      status: string; paidAt: Date | null;
    } }[];
  };
};

function shapeFine(f: FineRow) {
  return {
    id: f.id,
    amountRupees: toRupees(f.amountMinor),
    amountMinor: f.amountMinor,
    daysOverdue: f.daysOverdue,
    status: f.status,
    waivedReason: f.waivedReason,
    createdAt: f.createdAt,
    settledAt: f.status === 'PENDING' ? null : f.updatedAt,
    bookIssue: {
      id: f.bookIssue.id,
      book: {
        id: f.bookIssue.book.id,
        title: f.bookIssue.book.title,
        author: f.bookIssue.book.author,
        category: f.bookIssue.book.category,
      },
      student: {
        id: f.bookIssue.studentProfile.id,
        name: f.bookIssue.studentProfile.user.fullName,
        rollNo: f.bookIssue.studentProfile.rollNo,
        email: f.bookIssue.studentProfile.user.email,
      },
      issueDate: f.bookIssue.issueDate,
      dueDate: f.bookIssue.dueDate,
      returnDate: f.bookIssue.returnDate,
      loanStatus: f.bookIssue.status,
    },
    payment: f.bookIssue.finePayments[0]
      ? {
        referenceNo: f.bookIssue.finePayments[0].payment.referenceNo,
        method: f.bookIssue.finePayments[0].payment.method,
        paidAt: f.bookIssue.finePayments[0].payment.paidAt,
        status: f.bookIssue.finePayments[0].payment.status,
      }
      : null,
  };
}

// ── List ────────────────────────────────────────────────────
export type FineFilter = {
  q?: string;
  status?: 'ALL' | 'PENDING' | 'PAID' | 'WAIVED';
  minAmount?: number;
  sort?: 'NEWEST' | 'AMOUNT' | 'DAYS';
  limit?: number;
};

export async function listFines(institutionId: string, filter: FineFilter) {
  const where: Record<string, unknown> = { bookIssue: { book: { institutionId } } };
  if (filter.status && filter.status !== 'ALL') where.status = filter.status;
  if (filter.minAmount) where.amountMinor = { gte: filter.minAmount * 100 };
  if (filter.q) {
    where.bookIssue = {
      book: { institutionId },
      OR: [
        { studentProfile: { rollNo: { contains: filter.q } } },
        { studentProfile: { user: { fullName: { contains: filter.q } } } },
        { book: { title: { contains: filter.q } } },
      ],
    };
  }

  const orderBy =
    filter.sort === 'AMOUNT'
      ? { amountMinor: 'desc' as const }
      : filter.sort === 'DAYS'
        ? { daysOverdue: 'desc' as const }
        : { createdAt: 'desc' as const };

  const fines = await prisma.fine.findMany({
    where,
    include: fineInclude,
    orderBy,
    take: Math.min(filter.limit ?? 200, 500),
  });

  const shaped = fines.map(shapeFine);
  const pending = shaped.filter((f) => f.status === 'PENDING');
  const paid = shaped.filter((f) => f.status === 'PAID');
  const waived = shaped.filter((f) => f.status === 'WAIVED');

  // Group outstanding fines by student so the desk can chase one student once.
  const byStudentMap = new Map<string, { student: any; count: number; amountMinor: number }>();
  pending.forEach((f) => {
    const key = f.bookIssue.student.id;
    const entry = byStudentMap.get(key);
    if (entry) {
      entry.count += 1;
      entry.amountMinor += f.amountMinor;
    } else {
      byStudentMap.set(key, {
        student: f.bookIssue.student,
        count: 1,
        amountMinor: f.amountMinor,
      });
    }
  });
  const debtors = [...byStudentMap.values()]
    .map((e) => ({
      student: e.student,
      fineCount: e.count,
      amountRupees: toRupees(e.amountMinor),
    }))
    .sort((a, b) => b.amountRupees - a.amountRupees);

  return {
    stats: {
      pendingCount: pending.length,
      pendingAmountRupees: pending.reduce((s, f) => s + f.amountRupees, 0),
      paidCount: paid.length,
      paidAmountRupees: paid.reduce((s, f) => s + f.amountRupees, 0),
      waivedCount: waived.length,
      waivedAmountRupees: waived.reduce((s, f) => s + f.amountRupees, 0),
      debtorCount: debtors.length,
    },
    debtors,
    fines: shaped,
    total: shaped.length,
  };
}

// ── Detail ──────────────────────────────────────────────────
export async function getFineDetail(institutionId: string, fineId: string) {
  const fine = await prisma.fine.findFirst({
    where: { id: fineId, bookIssue: { book: { institutionId } } },
    include: fineInclude,
  });
  if (!fine) throw notFound('Fine not found');

  const shaped = shapeFine(fine as unknown as FineRow);

  // Other outstanding fines for the same student — the desk usually settles all of
  // them together, so surface the total up front.
  const siblings = await prisma.fine.findMany({
    where: {
      status: 'PENDING',
      bookIssue: { studentProfileId: fine.bookIssue.studentProfile.id, book: { institutionId } },
    },
    include: fineInclude,
  });
  const otherPending = siblings
    .filter((s) => s.id !== fine.id)
    .map(shapeFine);

  // Rate breakdown so the amount is auditable on screen. `computedRupees` uses
  // TODAY's configured rate; if the librarian changed it after the return, the
  // charged amount stands and `rateChangedSinceCharge` says so out loud.
  const policy = await loadPolicy(institutionId);
  const computedRupees = toRupees(fine.daysOverdue * policy.finePerDayPaise);
  const breakdown = {
    ratePerDayRupees: toRupees(policy.finePerDayPaise),
    daysOverdue: fine.daysOverdue,
    computedRupees,
    chargedRupees: shaped.amountRupees,
    rateChangedSinceCharge: computedRupees !== shaped.amountRupees,
  };

  return {
    ...shaped,
    breakdown,
    canCollect: fine.status === 'PENDING',
    canWaive: fine.status === 'PENDING',
    blockReason: fine.status === 'PENDING' ? null : `Fine is already ${fine.status}`,
    studentTotals: {
      pendingCount: otherPending.length + 1,
      pendingAmountRupees: toRupees(
        otherPending.reduce((s, f) => s + f.amountMinor, 0) + fine.amountMinor,
      ),
    },
    siblings: otherPending,
  };
}

/**
 * Next receipt/payment reference, numbered ONLY over FINE payments so it can never
 * collide with the tuition (PAY-TUI-*) or transport (PAY-TF-*) sequences.
 */
async function nextFineReferences(institutionId: string, tx: any) {
  const count = await tx.payment.count({
    where: { institutionId, category: 'FINE' },
  });
  const year = new Date().getFullYear();
  const seq = String(count + 1).padStart(4, '0');
  return {
    referenceNo: `PAY-FINE-${year}-${seq}`,
    receiptNo: `RCP-FINE-${year}-${seq}`,
  };
}

// ── Collect ─────────────────────────────────────────────────
export async function collectFine(
  institutionId: string,
  actorUserId: string,
  fineId: string,
  method: string,
) {
  if (!COLLECTION_METHODS.includes(method as (typeof COLLECTION_METHODS)[number])) {
    throw badRequest(`method must be one of ${COLLECTION_METHODS.join(', ')}`);
  }

  const fine = await prisma.fine.findFirst({
    where: { id: fineId, bookIssue: { book: { institutionId } } },
    include: fineInclude,
  });
  if (!fine) throw notFound('Fine not found');
  if (fine.status === 'PAID') throw conflict('Fine already paid');
  if (fine.status === 'WAIVED') throw conflict('Fine already waived');

  // Write-through: Payment(FINE) + Receipt + FinePayment, all atomic.
  const result = await prisma.$transaction(async (tx) => {
    const { referenceNo, receiptNo } = await nextFineReferences(institutionId, tx);

    const payment = await tx.payment.create({
      data: {
        institutionId,
        payerUserId: fine.bookIssue.studentProfile.user.id,
        studentProfileId: fine.bookIssue.studentProfile.id,
        category: 'FINE',
        referenceNo,
        amountMinor: fine.amountMinor,
        method: method as 'UPI' | 'NET_BANKING' | 'CARD' | 'CASH',
        status: 'CLEARED',
        paidAt: new Date(),
        recordedByUserId: actorUserId,
      },
    });

    const receipt = await tx.receipt.create({
      data: { paymentId: payment.id, receiptNo },
    });

    await tx.finePayment.create({
      data: { paymentId: payment.id, bookIssueId: fine.bookIssueId },
    });

    await tx.fine.update({
      where: { id: fine.id },
      data: { status: 'PAID', paidPaymentId: payment.id },
    });

    return { payment, receipt };
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: fine.bookIssue.studentProfile.user.id,
      type: 'FINE',
      title: 'Fine collected',
      body: `Your fine of ₹${toRupees(fine.amountMinor)} for "${fine.bookIssue.book.title}" has been collected via ${method}. Receipt: ${result.receipt.receiptNo}.`,
      sourceModule: 'library',
    },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'fine.collect',
    entityType: 'Fine',
    entityId: fineId,
    before: { status: 'PENDING' },
    after: { status: 'PAID', method, paymentRef: result.payment.referenceNo, receiptNo: result.receipt.receiptNo },
  });

  return {
    id: fine.id,
    status: 'PAID',
    student: fine.bookIssue.studentProfile.user.fullName,
    amountRupees: toRupees(fine.amountMinor),
    method,
    paymentReference: result.payment.referenceNo,
    receiptNo: result.receipt.receiptNo,
    receipt: {
      no: result.receipt.receiptNo,
      issuedAt: result.receipt.issuedAt,
      amountRupees: toRupees(result.payment.amountMinor),
      method: result.payment.method,
    },
  };
}

// ── Waive ───────────────────────────────────────────────────
export async function waiveFine(
  institutionId: string,
  actorUserId: string,
  fineId: string,
  reason: string,
) {
  const trimmed = reason?.trim();
  if (!trimmed || trimmed.length < 3) throw badRequest('A waiver reason of at least 3 characters is required');

  const fine = await prisma.fine.findFirst({
    where: { id: fineId, bookIssue: { book: { institutionId } } },
    include: fineInclude,
  });
  if (!fine) throw notFound('Fine not found');
  if (fine.status !== 'PENDING') throw conflict(`Fine is already ${fine.status}`);

  await prisma.fine.update({
    where: { id: fine.id },
    data: { status: 'WAIVED', waivedReason: trimmed },
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: fine.bookIssue.studentProfile.user.id,
      type: 'FINE',
      title: 'Fine waived',
      body: `Your fine of ₹${toRupees(fine.amountMinor)} for "${fine.bookIssue.book.title}" has been waived. Reason: ${trimmed}.`,
      sourceModule: 'library',
    },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'fine.waive',
    entityType: 'Fine',
    entityId: fineId,
    before: { status: 'PENDING' },
    after: { status: 'WAIVED', reason: trimmed },
  });

  return {
    id: fine.id,
    status: 'WAIVED',
    amountRupees: toRupees(fine.amountMinor),
    waivedReason: trimmed,
    student: fine.bookIssue.studentProfile.user.fullName,
  };
}

// ── Extend due date (overdue loans) ─────────────────────────
/**
 * Give an overdue, still-outstanding loan more time. The fine is only raised at
 * RETURN time, so extending the due date before the book comes back means no fine
 * is charged at all — this is the "Extend Due Date" action from the spec.
 */
export async function extendDueDate(
  institutionId: string,
  actorUserId: string,
  fineId: string,
  days: number,
) {
  if (!Number.isInteger(days) || days < 1 || days > 60) {
    throw badRequest('Extension must be between 1 and 60 days');
  }
  await syncOverdueStatus(institutionId);

  const fine = await prisma.fine.findFirst({
    where: { id: fineId, bookIssue: { book: { institutionId } } },
    include: fineInclude,
  });
  if (!fine) throw notFound('Fine not found');
  if (fine.bookIssue.returnDate) {
    throw conflict('The book has already been returned — the fine stands');
  }

  const newDueDate = new Date();
  newDueDate.setDate(newDueDate.getDate() + days);

  const updated = await prisma.bookIssue.update({
    where: { id: fine.bookIssue.id },
    data: { dueDate: newDueDate, status: 'ISSUED' },
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: fine.bookIssue.studentProfile.user.id,
      type: 'BOOK_RENEWAL',
      title: `Due date extended: ${fine.bookIssue.book.title}`,
      body: `"${fine.bookIssue.book.title}" now has a new due date of ${newDueDate.toLocaleDateString('en-IN')}. No fine will apply if it is returned by then.`,
      sourceModule: 'library',
    },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'fine.extend_due_date',
    entityType: 'BookIssue',
    entityId: fine.bookIssue.id,
    before: { dueDate: fine.bookIssue.dueDate, status: fine.bookIssue.status },
    after: { dueDate: updated.dueDate, status: 'ISSUED', waivedFine: fine.id },
  });

  return {
    fineId: fine.id,
    book: fine.bookIssue.book.title,
    student: fine.bookIssue.studentProfile.user.fullName,
    previousDueDate: fine.bookIssue.dueDate,
    newDueDate: updated.dueDate,
    daysOverdueAtExtension: fine.daysOverdue,
    amountAtRisk: toRupees(fine.amountMinor),
  };
}

// ── Bulk settle ─────────────────────────────────────────────
export async function settleStudentFines(
  institutionId: string,
  actorUserId: string,
  input: { studentId: string; action: 'COLLECT' | 'WAIVE'; method?: string; reason?: string; fineIds?: string[] },
) {
  const { studentId, action } = input;

  if (action === 'COLLECT' && input.method && !COLLECTION_METHODS.includes(input.method as any)) {
    throw badRequest(`method must be one of ${COLLECTION_METHODS.join(', ')}`);
  }
  if (action === 'WAIVE' && (!input.reason || input.reason.trim().length < 3)) {
    throw badRequest('A waiver reason of at least 3 characters is required');
  }

  const student = await prisma.studentProfile.findFirst({
    where: { id: studentId, user: { institutionId, deletedAt: null } },
    include: { user: { select: { id: true, fullName: true } } },
  });
  if (!student) throw notFound('Student not found');

  const where: Record<string, unknown> = {
    status: 'PENDING',
    bookIssue: { studentProfileId: studentId, book: { institutionId } },
  };
  if (input.fineIds?.length) where.id = { in: input.fineIds };

  const fines = await prisma.fine.findMany({ where, include: fineInclude });
  if (fines.length === 0) throw unprocessable('No pending fines match this selection');

  const totalMinor = fines.reduce((s, f) => s + f.amountMinor, 0);

  const settled = await prisma.$transaction(async (tx) => {
    if (action === 'COLLECT') {
      const method = input.method ?? 'CASH';
      // Payment ↔ Receipt is strictly 1:1 (Receipt.paymentId is @unique), so each
      // fine gets its own payment + receipt rather than sharing one consolidated
      // payment. The reference sequence is reserved ONCE for the whole batch so the
      // numbers stay contiguous, then sub-numbered per fine.
      const base = await nextFineReferences(institutionId, tx);

      const receipts: { receiptNo: string; amountMinor: number; referenceNo: string }[] = [];
      const payments: { id: string; referenceNo: string }[] = [];

      let seq = 0;
      for (const f of fines) {
        seq += 1;
        const referenceNo = `${base.referenceNo}-${String(seq).padStart(2, '0')}`;
        const receiptNo = `${base.receiptNo}-${String(seq).padStart(2, '0')}`;

        const payment = await tx.payment.create({
          data: {
            institutionId,
            payerUserId: student.user.id,
            studentProfileId: studentId,
            category: 'FINE',
            referenceNo,
            amountMinor: f.amountMinor,
            method: method as any,
            status: 'CLEARED',
            paidAt: new Date(),
            recordedByUserId: actorUserId,
          },
        });

        await tx.receipt.create({ data: { paymentId: payment.id, receiptNo } });
        await tx.finePayment.create({ data: { paymentId: payment.id, bookIssueId: f.bookIssueId } });
        await tx.fine.update({
          where: { id: f.id },
          data: { status: 'PAID', paidPaymentId: payment.id },
        });

        payments.push({ id: payment.id, referenceNo });
        receipts.push({ receiptNo, amountMinor: f.amountMinor, referenceNo });
      }

      return { payments, receipts, baseReferenceNo: base.referenceNo };
    }

    const reason = input.reason!.trim();
    await tx.fine.updateMany({ where, data: { status: 'WAIVED', waivedReason: reason } });
    return { payments: [], receipts: [], baseReferenceNo: null };
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: student.user.id,
      type: 'FINE',
      title: action === 'COLLECT' ? 'Fines settled' : 'Fines waived',
      body:
        action === 'COLLECT'
          ? `${fines.length} fine(s) totalling ₹${toRupees(totalMinor)} have been settled. Receipts: ${settled.receipts.map((r) => r.receiptNo).join(', ')}.`
          : `${fines.length} fine(s) totalling ₹${toRupees(totalMinor)} have been waived. Reason: ${input.reason!.trim()}.`,
      sourceModule: 'library',
    },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: action === 'COLLECT' ? 'fine.bulk_collect' : 'fine.bulk_waive',
    entityType: 'StudentProfile',
    entityId: studentId,
    before: { pendingFines: fines.length, amountMinor: totalMinor },
    after: {
      action,
      fineIds: fines.map((f) => f.id),
      ...(action === 'COLLECT'
        ? { paymentRefs: settled.payments.map((p) => p.referenceNo), receipts: settled.receipts.length }
        : { reason: input.reason!.trim() }),
    },
  });

  return {
    student: student.user.fullName,
    settledCount: fines.length,
    totalRupees: toRupees(totalMinor),
    action,
    batchReference: settled.baseReferenceNo,
    payments: settled.payments,
    receipts: settled.receipts,
  };
}

// ── Student fine summary ────────────────────────────────────
export async function getStudentFines(institutionId: string, studentId: string) {
  const student = await prisma.studentProfile.findFirst({
    where: { id: studentId, user: { institutionId, deletedAt: null } },
    include: { user: { select: { fullName: true, email: true } } },
  });
  if (!student) throw notFound('Student not found');

  const fines = await prisma.fine.findMany({
    where: { bookIssue: { studentProfileId: studentId, book: { institutionId } } },
    include: fineInclude,
    orderBy: { createdAt: 'desc' },
  });

  const shaped = fines.map(shapeFine);
  const pending = shaped.filter((f) => f.status === 'PENDING');
  const paid = shaped.filter((f) => f.status === 'PAID');
  const waived = shaped.filter((f) => f.status === 'WAIVED');

  return {
    student: { id: student.id, name: student.user.fullName, email: student.user.email, rollNo: student.rollNo },
    stats: {
      pendingCount: pending.length,
      pendingAmountRupees: pending.reduce((s, f) => s + f.amountRupees, 0),
      paidCount: paid.length,
      paidAmountRupees: paid.reduce((s, f) => s + f.amountRupees, 0),
      waivedCount: waived.length,
      waivedAmountRupees: waived.reduce((s, f) => s + f.amountRupees, 0),
      largestFineRupees: pending.reduce((m, f) => Math.max(m, f.amountRupees), 0),
    },
    pending,
    settled: [...paid, ...waived],
  };
}