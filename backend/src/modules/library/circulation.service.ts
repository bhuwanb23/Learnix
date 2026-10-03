// L-03 Circulation service — issue, renew, return, loan queries, borrowing profiles.
// Docs: users/07-library-staff.md §3.3 · §4 L-03
//
// Key invariant: `BookIssue.status` is DERIVED from dueDate, never trusted blindly.
// syncOverdueStatus() promotes ISSUED → OVERDUE for anything past due, and is called
// before every read that filters on status. Without it, overdue counts and the
// OVERDUE_MEMBERS broadcast audience would always read zero.
//
// Money: integer paise. Fine rate ₹5/day (500 paise). Tenant-scoped by institutionId.
import { prisma } from '../../db/prisma.js';
import { notFound, conflict, unprocessable, badRequest } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

const FINE_PER_DAY_PAISE = 500; // ₹5/day
const toRupees = (paise: number) => Math.round(paise / 100);

export const MAX_RENEWALS = 2; // per loan
export const MAX_ACTIVE_LOANS = 4; // per student
export const MAX_TOTAL_FINE_PAISE = 20000; // ₹200 — blocks issuing until cleared/waived

const DAY_MS = 1000 * 60 * 60 * 24;

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

export const daysBetween = (from: Date, to: Date) =>
  Math.ceil((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);

/**
 * Promote past-due ISSUED loans to OVERDUE so status-based queries are truthful.
 * Idempotent and cheap (single indexed-ish update on a tenant slice).
 */
export async function syncOverdueStatus(institutionId: string) {
  return prisma.bookIssue.updateMany({
    where: {
      book: { institutionId },
      status: 'ISSUED',
      returnDate: null,
      dueDate: { lt: new Date() },
    },
    data: { status: 'OVERDUE' },
  });
}

type IssueWithRefs = {
  id: string;
  issueDate: Date;
  dueDate: Date;
  returnDate: Date | null;
  status: string;
  renewCount: number;
  lastRenewedAt: Date | null;
  book: { id: string; title: string; author: string | null; category: string | null; rackLocation: string | null };
  studentProfile: { id: string; rollNo: string; user: { id: string; fullName: string } };
  fine?: { id: string; amountMinor: number; status: string; daysOverdue: number } | null;
};

/** Shape one issue row for the client, with derived loan health. */
function shapeLoan(issue: IssueWithRefs, now = new Date()) {
  const overdue = issue.status === 'OVERDUE' || (!issue.returnDate && issue.dueDate < now);
  const daysOverdue = overdue ? daysBetween(issue.dueDate, now) : 0;
  const daysLeft = issue.returnDate ? null : daysBetween(now, issue.dueDate);
  const renewalsLeft = Math.max(0, MAX_RENEWALS - issue.renewCount);

  return {
    id: issue.id,
    book: {
      id: issue.book.id,
      title: issue.book.title,
      author: issue.book.author,
      category: issue.book.category,
      rackLocation: issue.book.rackLocation,
    },
    student: {
      id: issue.studentProfile.id,
      name: issue.studentProfile.user.fullName,
      rollNo: issue.studentProfile.rollNo,
    },
    issueDate: issue.issueDate,
    dueDate: issue.dueDate,
    returnDate: issue.returnDate,
    status: issue.status,
    renewCount: issue.renewCount,
    renewalsLeft,
    lastRenewedAt: issue.lastRenewedAt,
    isOverdue: overdue,
    daysOverdue,
    daysLeft,
    fine: issue.fine
      ? {
        id: issue.fine.id,
        amountRupees: toRupees(issue.fine.amountMinor),
        status: issue.fine.status,
        daysOverdue: issue.fine.daysOverdue,
      }
      : null,
  };
}

const loanInclude = {
  book: { select: { id: true, title: true, author: true, category: true, rackLocation: true } },
  studentProfile: { include: { user: { select: { id: true, fullName: true } } } },
  fine: true,
} as const;

// ── Loan queries ────────────────────────────────────────────
export type LoanFilter = {
  q?: string;
  status?: 'ALL' | 'ACTIVE' | 'ISSUED' | 'OVERDUE' | 'DUE_SOON' | 'DUE_TODAY';
  limit?: number;
};

export async function listLoans(institutionId: string, filter: LoanFilter) {
  await syncOverdueStatus(institutionId);
  const now = new Date();

  const where: Record<string, unknown> = {
    book: { institutionId },
    returnDate: null,
  };

  if (filter.status === 'ISSUED') where.status = 'ISSUED';
  else if (filter.status === 'OVERDUE') where.status = 'OVERDUE';
  else if (filter.status === 'DUE_SOON') {
    where.status = 'ISSUED';
    where.dueDate = { gte: now, lte: new Date(now.getTime() + 3 * DAY_MS) };
  } else if (filter.status === 'DUE_TODAY') {
    where.status = { in: ['ISSUED', 'OVERDUE'] };
    where.dueDate = { gte: startOfDay(now), lte: endOfDay(now) };
  } else {
    where.status = { in: ['ISSUED', 'OVERDUE'] };
  }

  if (filter.q) {
    where.OR = [
      { book: { title: { contains: filter.q } } },
      { studentProfile: { rollNo: { contains: filter.q } } },
      { studentProfile: { user: { fullName: { contains: filter.q } } } },
    ];
  }

  const issues = await prisma.bookIssue.findMany({
    where,
    include: loanInclude,
    orderBy: { dueDate: 'asc' },
    take: Math.min(filter.limit ?? 100, 200),
  });

  // Stats are computed over ALL active loans, independent of the active filter,
  // so the summary cards stay stable while the user narrows the list.
  const allActive = await prisma.bookIssue.findMany({
    where: { book: { institutionId }, returnDate: null, status: { in: ['ISSUED', 'OVERDUE'] } },
    include: loanInclude,
  });
  const shapedAll = allActive.map((i) => shapeLoan(i, now));

  const issued = shapedAll.filter((l) => !l.isOverdue).length;
  const overdue = shapedAll.filter((l) => l.isOverdue);
  const dueToday = shapedAll.filter(
    (l) => startOfDay(l.dueDate).getTime() === startOfDay(now).getTime(),
  );

  return {
    stats: {
      active: shapedAll.length,
      issued,
      overdue: overdue.length,
      dueToday: dueToday.length,
      renewalsLeft: shapedAll.reduce((s, l) => s + l.renewalsLeft, 0),
    },
    loans: issues.map((i) => shapeLoan(i, now)),
    total: issues.length,
  };
}

export async function getLoanDetail(institutionId: string, issueId: string) {
  await syncOverdueStatus(institutionId);
  const issue = await prisma.bookIssue.findFirst({
    where: { id: issueId, book: { institutionId } },
    include: {
      ...loanInclude,
      // Amount/method live on Payment; FinePayment is just the link row.
      finePayments: { include: { payment: true }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!issue) throw notFound('Loan record not found');

  const loan = shapeLoan(issue as unknown as IssueWithRefs);
  const now = new Date();

  // Timeline entries make the loan auditable at a glance for the desk.
  const timeline: { label: string; at: Date; icon: string; color: string }[] = [
    { label: 'Issued', at: issue.issueDate, icon: 'arrow-forward-circle', color: '#b45309' },
  ];
  if (issue.lastRenewedAt) {
    timeline.push({ label: 'Renewed', at: issue.lastRenewedAt, icon: 'refresh-circle', color: '#2563eb' });
  }
  if (issue.returnDate) {
    timeline.push({ label: 'Returned', at: issue.returnDate, icon: 'checkmark-circle', color: '#059669' });
  } else if (loan.isOverdue) {
    timeline.push({ label: 'Became overdue', at: issue.dueDate, icon: 'alert-circle', color: '#dc2626' });
  } else {
    timeline.push({ label: 'Due', at: issue.dueDate, icon: 'time', color: '#64748b' });
  }

  // Projected fine if returned right now — lets staff warn the student upfront.
  const projectedFineRupees = !issue.returnDate && loan.isOverdue
    ? toRupees(Math.max(0, loan.daysOverdue) * FINE_PER_DAY_PAISE)
    : 0;

  return {
    ...loan,
    projectedFineRupees,
    canRenew:
      !issue.returnDate &&
      !loan.isOverdue &&
      issue.renewCount < MAX_RENEWALS,
    renewBlockReason: issue.returnDate
      ? 'Loan is already returned'
      : loan.isOverdue
        ? 'Overdue loans cannot be renewed'
        : issue.renewCount >= MAX_RENEWALS
          ? `Maximum ${MAX_RENEWALS} renewals reached`
          : null,
    timeline: timeline.sort((a, b) => a.at.getTime() - b.at.getTime()),
    finePayments: (issue.finePayments ?? []).map((p) => ({
      id: p.id,
      amountRupees: toRupees(p.payment.amountMinor),
      method: p.payment.method,
      referenceNo: p.payment.referenceNo,
      status: p.payment.status,
      paidAt: p.payment.paidAt ?? p.payment.createdAt,
    })),
    now,
  };
}

// ── Student borrowing profile ───────────────────────────────
export async function getStudentBorrowingProfile(
  institutionId: string,
  studentProfileId: string,
) {
  await syncOverdueStatus(institutionId);
  const now = new Date();

  const student = await prisma.studentProfile.findFirst({
    where: { id: studentProfileId, user: { institutionId, deletedAt: null } },
    include: { user: { select: { id: true, fullName: true, email: true } } },
  });
  if (!student) throw notFound('Student not found');

  // programId/batchId are scalar FKs without generated relations, so resolve names separately.
  const [program, batch] = await Promise.all([
    student.programId
      ? prisma.program.findUnique({ where: { id: student.programId }, select: { name: true } })
      : null,
    student.batchId
      ? prisma.batch.findUnique({ where: { id: student.batchId }, select: { name: true } })
      : null,
  ]);

  const [activeIssues, fines] = await Promise.all([
    prisma.bookIssue.findMany({
      where: { studentProfileId, returnDate: null, status: { in: ['ISSUED', 'OVERDUE'] } },
      include: loanInclude,
      orderBy: { dueDate: 'asc' },
    }),
    prisma.fine.findMany({
      where: { bookIssue: { studentProfile: { user: { institutionId } } } },
      include: { bookIssue: { include: { book: { select: { title: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const active = activeIssues.map((i) => shapeLoan(i, now));
  const pendingFines = fines.filter((f) => f.status === 'PENDING');
  const pendingMinor = pendingFines.reduce((s, f) => s + f.amountMinor, 0);

  // Eligibility gates the issue desk, so each reason is explicit and ordered.
  const blockers: { code: string; message: string }[] = [];
  if (student.status !== 'ACTIVE') {
    blockers.push({ code: 'INACTIVE', message: `Profile status is ${student.status}` });
  }
  if (active.length >= MAX_ACTIVE_LOANS) {
    blockers.push({
      code: 'LOAN_LIMIT',
      message: `Already holds ${active.length} of ${MAX_ACTIVE_LOANS} allowed books`,
    });
  }
  if (pendingMinor > MAX_TOTAL_FINE_PAISE) {
    blockers.push({
      code: 'FINE_BLOCK',
      message: `Unpaid fines of ₹${toRupees(pendingMinor)} exceed the ₹${toRupees(MAX_TOTAL_FINE_PAISE)} limit`,
    });
  }
  if (active.some((l) => l.isOverdue)) {
    blockers.push({
      code: 'HAS_OVERDUE',
      message: `${active.filter((l) => l.isOverdue).length} overdue book(s) must be returned first`,
    });
  }

  return {
    student: {
      id: student.id,
      name: student.user.fullName,
      email: student.user.email,
      rollNo: student.rollNo,
      section: student.section,
      semester: student.currentSemester,
      batch: batch?.name ?? null,
      program: program?.name ?? null,
      status: student.status,
    },
    limits: {
      maxActiveLoans: MAX_ACTIVE_LOANS,
      maxTotalFineRupees: toRupees(MAX_TOTAL_FINE_PAISE),
      maxRenewalsPerLoan: MAX_RENEWALS,
    },
    stats: {
      activeLoans: active.length,
      overdueLoans: active.filter((l) => l.isOverdue).length,
      totalBorrowed: await prisma.bookIssue.count({ where: { studentProfileId } }),
      pendingFines: pendingFines.length,
      pendingFineRupees: toRupees(pendingMinor),
    },
    eligible: blockers.length === 0,
    blockers,
    activeLoans: active,
    fines: fines.slice(0, 25).map((f) => ({
      id: f.id,
      book: f.bookIssue.book.title,
      amountRupees: toRupees(f.amountMinor),
      daysOverdue: f.daysOverdue,
      status: f.status,
      createdAt: f.createdAt,
    })),
  };
}

/** Student lookup for the issue desk — resolves a typed roll number to a profile. */
export async function searchStudents(
  institutionId: string,
  query: { q: string; limit?: number },
) {
  const q = query.q.trim();
  if (!q) return { students: [] };

  const students = await prisma.studentProfile.findMany({
    where: {
      user: { institutionId, deletedAt: null },
      OR: [
        { rollNo: { contains: q } },
        { user: { fullName: { contains: q } } },
      ],
    },
    include: { user: { select: { id: true, fullName: true, email: true } } },
    orderBy: { rollNo: 'asc' },
    take: Math.min(query.limit ?? 20, 50),
  });

  if (students.length === 0) return { students: [] };

  const ids = students.map((s) => s.id);
  const activeCounts = await prisma.bookIssue.groupBy({
    by: ['studentProfileId'],
    where: { studentProfileId: { in: ids }, returnDate: null, status: { in: ['ISSUED', 'OVERDUE'] } },
    _count: { id: true },
  });
  const countMap = new Map(activeCounts.map((c) => [c.studentProfileId, c._count.id]));

  return {
    students: students.map((s) => ({
      id: s.id,
      name: s.user.fullName,
      rollNo: s.rollNo,
      email: s.user.email,
      status: s.status,
      activeLoans: countMap.get(s.id) ?? 0,
    })),
  };
}

// ── Loan history ────────────────────────────────────────────
export async function listLoanHistory(
  institutionId: string,
  query: { q?: string; studentId?: string; from?: string; to?: string; limit?: number },
) {
  const now = new Date();
  const where: Record<string, unknown> = {
    book: { institutionId },
    returnDate: { not: null },
  };

  if (query.studentId) where.studentProfileId = query.studentId;
  if (query.q) {
    where.OR = [
      { book: { title: { contains: query.q } } },
      { studentProfile: { rollNo: { contains: query.q } } },
      { studentProfile: { user: { fullName: { contains: query.q } } } },
    ];
  }
  if (query.from || query.to) {
    const range: Record<string, Date> = {};
    if (query.from) range.gte = new Date(query.from);
    if (query.to) {
      const to = new Date(query.to);
      to.setHours(23, 59, 59, 999);
      range.lte = to;
    }
    where.returnDate = range;
  }

  const issues = await prisma.bookIssue.findMany({
    where,
    include: loanInclude,
    orderBy: { returnDate: 'desc' },
    take: Math.min(query.limit ?? 100, 200),
  });

  const shaped = issues.map((i) => {
    const loan = shapeLoan(i as unknown as IssueWithRefs, now);
    const daysKept = i.returnDate ? daysBetween(i.issueDate, i.returnDate) : 0;
    return {
      ...loan,
      daysKept,
      wasOverdue: Boolean(i.fine) || i.returnDate! > i.dueDate,
    };
  });

  const collected = shaped.filter((l) => l.fine?.status === 'PAID');
  const waived = shaped.filter((l) => l.fine?.status === 'WAIVED');

  return {
    stats: {
      returned: shaped.length,
      onTime: shaped.filter((l) => !l.wasOverdue).length,
      late: shaped.filter((l) => l.wasOverdue).length,
      fineCollectedRupees: collected.reduce((s, l) => s + (l.fine?.amountRupees ?? 0), 0),
      fineWaivedCount: waived.length,
    },
    history: shaped,
    total: shaped.length,
  };
}

// ── Issue ───────────────────────────────────────────────────
export async function issueBook(
  institutionId: string,
  actorUserId: string,
  input: { rollNo: string; bookId: string; dueDays: number },
) {
  await syncOverdueStatus(institutionId);

  const studentProfile = await prisma.studentProfile.findFirst({
    where: { rollNo: input.rollNo, user: { institutionId, deletedAt: null } },
    include: { user: { select: { id: true, fullName: true } } },
  });
  if (!studentProfile) throw notFound(`No student with roll number ${input.rollNo}`);
  if (studentProfile.status !== 'ACTIVE') {
    throw unprocessable(`${studentProfile.user.fullName} is not an active student`);
  }

  const book = await prisma.book.findFirst({ where: { id: input.bookId, institutionId } });
  if (!book) throw notFound('Book not found');
  if (book.availableCopies <= 0) throw unprocessable(`No copies of "${book.title}" available`);

  const existingIssue = await prisma.bookIssue.findFirst({
    where: {
      bookId: book.id,
      studentProfileId: studentProfile.id,
      status: { in: ['ISSUED', 'OVERDUE'] },
    },
  });
  if (existingIssue) throw conflict(`${studentProfile.user.fullName} already has this book issued`);

  // Borrowing-limit gate: count first so we can report the exact numbers.
  const activeCount = await prisma.bookIssue.count({
    where: { studentProfileId: studentProfile.id, returnDate: null, status: { in: ['ISSUED', 'OVERDUE'] } },
  });
  if (activeCount >= MAX_ACTIVE_LOANS) {
    throw unprocessable(
      `${studentProfile.user.fullName} already holds ${activeCount} books (limit ${MAX_ACTIVE_LOANS}). Return one first.`,
    );
  }

  const pendingFine = await prisma.fine.aggregate({
    where: { status: 'PENDING', bookIssue: { studentProfileId: studentProfile.id } },
    _sum: { amountMinor: true },
  });
  const pendingMinor = pendingFine._sum.amountMinor ?? 0;
  if (pendingMinor > MAX_TOTAL_FINE_PAISE) {
    throw unprocessable(
      `${studentProfile.user.fullName} has unpaid fines of ₹${toRupees(pendingMinor)} (limit ₹${toRupees(MAX_TOTAL_FINE_PAISE)}). Collect or waive before issuing.`,
    );
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + input.dueDays);

  const issue = await prisma.bookIssue.create({
    data: {
      bookId: book.id,
      studentProfileId: studentProfile.id,
      issueDate: new Date(),
      dueDate,
      status: 'ISSUED',
      issuedByUserId: actorUserId,
      renewCount: 0,
    },
  });

  await prisma.book.update({
    where: { id: book.id },
    data: { availableCopies: { decrement: 1 } },
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: studentProfile.userId,
      type: 'BOOK_ISSUE',
      title: `Book issued: ${book.title}`,
      body: `"${book.title}" has been issued to you. Due date: ${dueDate.toLocaleDateString('en-IN')}.`,
      sourceModule: 'library',
    },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'circulation.issue',
    entityType: 'BookIssue',
    entityId: issue.id,
    after: { book: book.title, student: studentProfile.user.fullName, dueDate },
  });

  return {
    id: issue.id,
    book: { id: book.id, title: book.title, author: book.author },
    student: {
      id: studentProfile.id,
      name: studentProfile.user.fullName,
      rollNo: studentProfile.rollNo,
    },
    issueDate: issue.issueDate,
    dueDate: issue.dueDate,
    status: issue.status,
    renewCount: 0,
    renewalsLeft: MAX_RENEWALS,
    copiesRemaining: book.availableCopies - 1,
  };
}

// ── Renew ───────────────────────────────────────────────────
export async function renewLoan(
  institutionId: string,
  actorUserId: string,
  issueId: string,
  input: { days?: number },
) {
  await syncOverdueStatus(institutionId);
  const days = input.days ?? 14;
  if (days < 1 || days > 60) throw badRequest('Renewal period must be between 1 and 60 days');

  const issue = await prisma.bookIssue.findFirst({
    where: { id: issueId, book: { institutionId } },
    include: {
      book: { select: { id: true, title: true } },
      studentProfile: { include: { user: { select: { id: true, fullName: true } } } },
    },
  });
  if (!issue) throw notFound('Loan record not found');
  if (issue.returnDate || issue.status === 'RETURNED') throw conflict('Book already returned');
  if (issue.status === 'OVERDUE' || issue.dueDate < new Date()) {
    throw unprocessable('Overdue loans cannot be renewed. Collect the book instead.');
  }
  if (issue.renewCount >= MAX_RENEWALS) {
    throw unprocessable(`Maximum ${MAX_RENEWALS} renewals reached for this loan`);
  }

  // Extend from the current due date, never from today, so renewals add up predictably.
  const newDueDate = new Date(issue.dueDate);
  newDueDate.setDate(newDueDate.getDate() + days);

  const updated = await prisma.bookIssue.update({
    where: { id: issue.id },
    data: {
      dueDate: newDueDate,
      renewCount: { increment: 1 },
      lastRenewedAt: new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: issue.studentProfile.userId,
      type: 'BOOK_RENEWAL',
      title: `Book renewed: ${issue.book.title}`,
      body: `"${issue.book.title}" was renewed for ${days} more day(s). New due date: ${newDueDate.toLocaleDateString('en-IN')}.`,
      sourceModule: 'library',
    },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'circulation.renew',
    entityType: 'BookIssue',
    entityId: issue.id,
    before: { dueDate: issue.dueDate, renewCount: issue.renewCount },
    after: { dueDate: updated.dueDate, renewCount: updated.renewCount },
  });

  return {
    id: updated.id,
    book: issue.book.title,
    student: issue.studentProfile.user.fullName,
    dueDate: updated.dueDate,
    previousDueDate: issue.dueDate,
    renewCount: updated.renewCount,
    renewalsLeft: Math.max(0, MAX_RENEWALS - updated.renewCount),
  };
}

// ── Return ──────────────────────────────────────────────────
export async function returnBook(
  institutionId: string,
  actorUserId: string,
  issueId: string,
) {
  await syncOverdueStatus(institutionId);
  const issue = await prisma.bookIssue.findFirst({
    where: { id: issueId, book: { institutionId } },
    include: {
      book: { select: { id: true, title: true } },
      studentProfile: { include: { user: { select: { id: true, fullName: true } } } },
    },
  });
  if (!issue) throw notFound('Issue record not found');
  if (issue.returnDate || issue.status === 'RETURNED') throw conflict('Book already returned');

  const now = new Date();
  const isOverdue = now > issue.dueDate;

  await prisma.bookIssue.update({
    where: { id: issue.id },
    data: { status: 'RETURNED', returnDate: now },
  });

  const updatedBook = await prisma.book.update({
    where: { id: issue.bookId },
    data: { availableCopies: { increment: 1 } },
  });

  let fine = null;
  if (isOverdue) {
    const daysOverdue = daysBetween(issue.dueDate, now);
    const amountMinor = daysOverdue * FINE_PER_DAY_PAISE;

    fine = await prisma.fine.create({
      data: { bookIssueId: issue.id, amountMinor, daysOverdue, status: 'PENDING' },
    });

    await prisma.notification.create({
      data: {
        institutionId,
        recipientUserId: issue.studentProfile.userId,
        type: 'FINE',
        title: `Overdue fine: ${issue.book.title}`,
        body: `You returned "${issue.book.title}" ${daysOverdue} day(s) overdue. Fine: ₹${toRupees(amountMinor)}.`,
        sourceModule: 'library',
      },
    });
  }

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'circulation.return',
    entityType: 'BookIssue',
    entityId: issue.id,
    before: { status: issue.status, dueDate: issue.dueDate },
    after: {
      status: 'RETURNED',
      returnDate: now,
      fine: fine ? { amountMinor: fine.amountMinor, daysOverdue: fine.daysOverdue } : null,
    },
  });

  return {
    id: issue.id,
    book: issue.book.title,
    student: issue.studentProfile.user.fullName,
    returnDate: now,
    wasOverdue: isOverdue,
    daysKept: daysBetween(issue.issueDate, now),
    copiesAvailable: updatedBook.availableCopies,
    fine: fine
      ? { id: fine.id, amountRupees: toRupees(fine.amountMinor), daysOverdue: fine.daysOverdue }
      : null,
  };
}
