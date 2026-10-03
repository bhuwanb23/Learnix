// L-05 Book requests + procurement service.
// Docs: users/07-library-staff.md §3.5 · §4 L-05
//
// A student request is a procurement decision, not a status flag. Three things
// this service exists to guarantee:
//  1. A decision is never silent. `decideRequest` REQUIRES a note — a student
//     whose request was turned down is owed a reason, and it is shown to them.
//  2. Approving is not the end of the line. It raises a `BookProcurement`, and
//     `advanceProcurement` walks that purchase REQUESTED → ORDERED → RECEIVED.
//     Receiving CREATES the catalog `Book` and links it back, so request →
//     purchase → shelf is one traceable chain instead of a dead-end row.
//  3. Demand is visible. The list reports how many students asked for the same
//     title and whether the library already stocks it, because "12 students want
//     Clean Code and we own 5 copies" is a different decision from "1 student
//     wants an obscure title".
//
// Money: integer paise throughout (ADR-04).
import { prisma } from '../../db/prisma.js';
import { notFound, conflict, unprocessable, badRequest } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { syncOverdueStatus } from './circulation.service.js';
import { createBroadcast } from './notifications.service.js';
import { loadPolicy } from './settings.service.js';

const DAY_MS = 1000 * 60 * 60 * 24;
const toRupees = (paise: number) => Math.round(paise / 100);

export const REQUEST_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'PROCURED'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const PROCUREMENT_STATUSES = ['REQUESTED', 'ORDERED', 'RECEIVED', 'CANCELLED'] as const;
export type ProcurementStatus = (typeof PROCUREMENT_STATUSES)[number];

/** The only forward moves a purchase may make. RECEIVED is terminal. */
const PROCUREMENT_NEXT: Record<string, ProcurementStatus | null> = {
  REQUESTED: 'ORDERED',
  ORDERED: 'RECEIVED',
  RECEIVED: null,
  CANCELLED: null,
};

const daysWaiting = (from: Date, now: Date) =>
  Math.max(0, Math.floor((now.getTime() - from.getTime()) / DAY_MS));

const requestInclude = {
  studentProfile: {
    include: { user: { select: { id: true, fullName: true, email: true } } },
  },
} as const;

// ── Listing ─────────────────────────────────────────────────
export type RequestFilter = {
  q?: string;
  status?: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCURED';
  sort?: 'NEWEST' | 'OLDEST' | 'STUDENT' | 'TITLE';
};

/** Approximate title match — SQLite `contains` is case-insensitive for ASCII. */
const findCatalogMatches = async (institutionId: string, title: string) =>
  prisma.book.findMany({
    where: { institutionId, title: { contains: title.slice(0, 60) } },
    select: { id: true, title: true, author: true, availableCopies: true, totalCopies: true },
    take: 5,
  });

export async function listRequests(institutionId: string, filter: RequestFilter = {}) {
  const now = new Date();

  const where: Record<string, unknown> = {
    studentProfile: { user: { institutionId, deletedAt: null } },
  };
  if (filter.status && filter.status !== 'ALL') where.status = filter.status;

  if (filter.q) {
    where.OR = [
      { title: { contains: filter.q } },
      { author: { contains: filter.q } },
      { studentProfile: { rollNo: { contains: filter.q } } },
      { studentProfile: { user: { fullName: { contains: filter.q } } } },
    ];
  }

  const orderBy =
    filter.sort === 'OLDEST'
      ? { createdAt: 'asc' as const }
      : filter.sort === 'STUDENT'
        ? { studentProfile: { rollNo: 'asc' as const } }
        : filter.sort === 'TITLE'
          ? { title: 'asc' as const }
          : { createdAt: 'desc' as const };

  const requests = await prisma.bookRequest.findMany({
    where,
    include: requestInclude,
    orderBy,
    take: 200,
  });

  // Stats and demand aggregation run over ALL requests, independent of the
  // active filter, so the summary cards stay stable while the list narrows.
  const all = await prisma.bookRequest.findMany({
    where: { studentProfile: { user: { institutionId, deletedAt: null } } },
    include: requestInclude,
  });

  // How many students want each title, and do we already stock it?
  const titleGroups = new Map<string, { count: number; pending: number; inCatalog: number }>();
  for (const r of all) {
    const key = r.title.trim().toLowerCase();
    const g = titleGroups.get(key) ?? { count: 0, pending: 0, inCatalog: 0 };
    g.count++;
    if (r.status === 'PENDING') g.pending++;
    titleGroups.set(key, g);
  }
  const catalogTitles = new Set(
    (
      await prisma.book.findMany({ where: { institutionId }, select: { title: true } })
    ).map((b) => b.title.trim().toLowerCase()),
  );
  for (const [key, g] of titleGroups) {
    g.inCatalog = catalogTitles.has(key) ? 1 : 0;
  }

  const byStatus = (s: string) => all.filter((r) => r.status === s).length;

  const topDemand = [...titleGroups.entries()]
    .map(([title, g]) => ({ title, ...g }))
    .filter((g) => g.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const pendingAging = all
    .filter((r) => r.status === 'PENDING')
    .map((r) => ({ id: r.id, title: r.title, waitingDays: daysWaiting(r.createdAt, now) }));
  const oldestWait = pendingAging.reduce((m, p) => Math.max(m, p.waitingDays), 0);

  return {
    stats: {
      pending: byStatus('PENDING'),
      approved: byStatus('APPROVED'),
      rejected: byStatus('REJECTED'),
      procured: byStatus('PROCURED'),
      total: all.length,
      oldestPendingDays: oldestWait,
      decidedThisMonth: all.filter(
        (r) =>
          r.decidedAt &&
          r.decidedAt.getTime() > now.getTime() - 30 * DAY_MS,
      ).length,
    },
    requests: requests.map((r) => {
      const group = titleGroups.get(r.title.trim().toLowerCase())!;
      return {
        id: r.id,
        student: r.studentProfile.user.fullName,
        studentUserId: r.studentProfile.userId,
        rollNo: r.studentProfile.rollNo,
        title: r.title,
        author: r.author,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt,
        decidedAt: r.decidedAt,
        decisionNote: r.decisionNote,
        procurementId: r.procurementId,
        waitingDays: r.status === 'PENDING' ? daysWaiting(r.createdAt, now) : 0,
        // Demand context, so the librarian decides with the full picture.
        sameTitleRequests: group.count,
        inCatalog: group.inCatalog > 0,
        canDecide: r.status === 'PENDING',
      };
    }),
    topDemand,
    total: requests.length,
  };
}

// ── Detail ──────────────────────────────────────────────────
export async function getRequestDetail(institutionId: string, requestId: string) {
  await syncOverdueStatus(institutionId);
  const now = new Date();

  const request = await prisma.bookRequest.findFirst({
    where: { id: requestId, studentProfile: { user: { institutionId, deletedAt: null } } },
    include: requestInclude,
  });
  if (!request) throw notFound('Book request not found');

  // programId/batchId are scalar FKs without generated relations.
  const [program, batch] = await Promise.all([
    request.studentProfile.programId
      ? prisma.program.findUnique({ where: { id: request.studentProfile.programId }, select: { name: true } })
      : null,
    request.studentProfile.batchId
      ? prisma.batch.findUnique({ where: { id: request.studentProfile.batchId }, select: { name: true } })
      : null,
  ]);

  // The student asking: what they already hold tells you how urgent this is.
  const [loans, fines] = await Promise.all([
    prisma.bookIssue.findMany({
      where: { studentProfileId: request.studentProfileId, returnDate: null },
      select: {
        id: true, dueDate: true, status: true,
        book: { select: { title: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 20,
    }),
    prisma.fine.findMany({
      where: { bookIssue: { studentProfileId: request.studentProfileId } },
      select: { id: true, status: true, amountMinor: true, daysOverdue: true },
    }),
  ]);

  const [sameTitle, procurement] = await Promise.all([
    prisma.bookRequest.findMany({
      where: {
        studentProfile: { user: { institutionId, deletedAt: null } },
        title: request.title,
        id: { not: request.id },
      },
      include: requestInclude,
      orderBy: { createdAt: 'desc' },
    }),
    request.procurementId
      ? prisma.bookProcurement.findUnique({ where: { id: request.procurementId } })
      : null,
  ]);

  const catalogMatches = await findCatalogMatches(institutionId, request.title);

  const decider = request.decidedByUserId
    ? await prisma.user.findUnique({
      where: { id: request.decidedByUserId },
      select: { fullName: true },
    })
    : null;

  const activeLoans = loans.filter((l) => l.status !== 'RETURNED');
  const pendingFines = fines.filter((f) => f.status === 'PENDING');

  return {
    request: {
      id: request.id,
      title: request.title,
      author: request.author,
      reason: request.reason,
      status: request.status,
      createdAt: request.createdAt,
      decidedAt: request.decidedAt,
      decisionNote: request.decisionNote,
      decidedBy: decider?.fullName ?? null,
      procurementId: request.procurementId,
      waitingDays: request.status === 'PENDING' ? daysWaiting(request.createdAt, now) : 0,
    },
    student: {
      id: request.studentProfile.id,
      name: request.studentProfile.user.fullName,
      email: request.studentProfile.user.email,
      rollNo: request.studentProfile.rollNo,
      semester: request.studentProfile.currentSemester,
      section: request.studentProfile.section,
      program: program?.name ?? null,
      batch: batch?.name ?? null,
      status: request.studentProfile.status,
    },
    // What the librarian needs to judge: does this student already have the shelf?
    standing: {
      activeLoans: activeLoans.length,
      overdueLoans: activeLoans.filter((l) => l.status === 'OVERDUE').length,
      pendingFineCount: pendingFines.length,
      pendingFineRupees: toRupees(pendingFines.reduce((s, f) => s + f.amountMinor, 0)),
      holdsThisTitle: catalogMatches.some((b) => b.availableCopies > 0),
    },
    activeLoans: activeLoans.map((l) => ({
      id: l.id,
      book: l.book.title,
      dueDate: l.dueDate,
      status: l.status,
    })),
    catalogMatches,
    sameTitleRequests: sameTitle.map((r) => ({
      id: r.id,
      student: r.studentProfile.user.fullName,
      rollNo: r.studentProfile.rollNo,
      status: r.status,
      createdAt: r.createdAt,
    })),
    procurement: procurement
      ? {
        id: procurement.id,
        status: procurement.status,
        copies: procurement.copies,
        costRupees: toRupees(procurement.costMinor),
        orderedAt: procurement.orderedAt,
        receivedAt: procurement.receivedAt,
        bookId: procurement.bookId,
        rackLocation: procurement.rackLocation,
        note: procurement.note,
      }
      : null,
  };
}

// ── Decide ──────────────────────────────────────────────────
export async function decideRequest(
  institutionId: string,
  actorUserId: string,
  requestId: string,
  input: { decision: 'APPROVED' | 'REJECTED'; note?: string },
) {
  const note = (input.note ?? '').trim();
  if (note.length < 5) {
    // A bare approve/reject with no explanation is not a desk decision.
    throw unprocessable('Add a short note so the student knows why (at least 5 characters)');
  }

  const request = await prisma.bookRequest.findFirst({
    where: { id: requestId, studentProfile: { user: { institutionId, deletedAt: null } } },
    include: { studentProfile: { include: { user: { select: { id: true, fullName: true } } } } },
  });
  if (!request) throw notFound('Book request not found');
  if (request.status !== 'PENDING') throw conflict(`Request is already ${request.status}`);

  const decidedAt = new Date();
  const newStatus = input.decision;

  let procurementId: string | null = null;
  if (input.decision === 'APPROVED') {
    const procurement = await prisma.bookProcurement.create({
      data: {
        requestId: request.id,
        institutionId,
        title: request.title,
        author: request.author,
        copies: 1,
        status: 'REQUESTED',
      },
    });
    procurementId = procurement.id;
  }

  await prisma.bookRequest.update({
    where: { id: request.id },
    data: {
      status: newStatus,
      decidedByUserId: actorUserId,
      decidedAt,
      decisionNote: note,
      procurementId,
    },
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: request.studentProfile.userId,
      type: 'BOOK_REQUEST',
      title:
        input.decision === 'APPROVED'
          ? `Book request approved: ${request.title}`
          : `Book request declined: ${request.title}`,
      body:
        input.decision === 'APPROVED'
          ? `Your request for "${request.title}" was approved. ${note}`
          : `Your request for "${request.title}" was declined. ${note}`,
      sourceModule: 'library',
    },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: `request.${input.decision.toLowerCase()}`,
    entityType: 'BookRequest',
    entityId: request.id,
    before: { status: request.status },
    after: { status: newStatus, note, procurementId },
  });

  return { id: request.id, status: newStatus, note, procurementId, decidedAt };
}

// ── Procurement ─────────────────────────────────────────────
export async function listProcurements(institutionId: string, filter: { status?: 'ALL' | ProcurementStatus } = {}) {
  const where: Record<string, unknown> = { institutionId };
  if (filter.status && filter.status !== 'ALL') where.status = filter.status;

  const rows = await prisma.bookProcurement.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const all = await prisma.bookProcurement.findMany({ where: { institutionId } });
  const byStatus = (s: string) => all.filter((r) => r.status === s).length;

  // requestId is a bare scalar — resolve the requesting students in one query.
  const requestIds = rows.map((r) => r.requestId).filter((v): v is string => !!v);
  const requests = requestIds.length
    ? await prisma.bookRequest.findMany({
      where: { id: { in: requestIds } },
      include: requestInclude,
    })
    : [];
  const requestById = new Map(requests.map((r) => [r.id, r]));

  const ordered = all.filter((r) => r.status === 'ORDERED');
  const received = all.filter((r) => r.status === 'RECEIVED');
  const spendMinor = all.reduce((s, r) => s + r.costMinor, 0);

  return {
    stats: {
      requested: byStatus('REQUESTED'),
      ordered: byStatus('ORDERED'),
      received: byStatus('RECEIVED'),
      cancelled: byStatus('CANCELLED'),
      total: all.length,
      copiesOnOrder: ordered.reduce((s, r) => s + r.copies, 0),
      copiesReceived: received.reduce((s, r) => s + r.copies, 0),
      totalSpendRupees: toRupees(spendMinor),
    },
    procurements: rows.map((r) => {
      const req = r.requestId ? requestById.get(r.requestId) : undefined;
      return {
        id: r.id,
        title: r.title,
        author: r.author,
        copies: r.copies,
        status: r.status,
        costRupees: toRupees(r.costMinor),
        category: r.category,
        rackLocation: r.rackLocation,
        orderedAt: r.orderedAt,
        receivedAt: r.receivedAt,
        bookId: r.bookId,
        note: r.note,
        createdAt: r.createdAt,
        requestId: r.requestId,
        requestedBy: req ? req.studentProfile.user.fullName : null,
        requestedByRollNo: req ? req.studentProfile.rollNo : null,
        nextStatus: PROCUREMENT_NEXT[r.status] ?? null,
        isCancelled: r.status === 'CANCELLED',
        isReceived: r.status === 'RECEIVED',
      };
    }),
  };
}

export async function getProcurement(institutionId: string, procurementId: string) {
  const row = await prisma.bookProcurement.findFirst({
    where: { id: procurementId, institutionId },
  });
  if (!row) throw notFound('Procurement not found');

  const request = row.requestId
    ? await prisma.bookRequest.findUnique({ where: { id: row.requestId }, include: requestInclude })
    : null;
  const book = row.bookId
    ? await prisma.book.findUnique({
      where: { id: row.bookId },
      select: { id: true, title: true, availableCopies: true, totalCopies: true, rackLocation: true, category: true },
    })
    : null;

  return {
    id: row.id,
    title: row.title,
    author: row.author,
    copies: row.copies,
    status: row.status,
    costRupees: toRupees(row.costMinor),
    category: row.category,
    rackLocation: row.rackLocation,
    orderedAt: row.orderedAt,
    receivedAt: row.receivedAt,
    note: row.note,
    createdAt: row.createdAt,
    nextStatus: PROCUREMENT_NEXT[row.status] ?? null,
    request: request
      ? {
        id: request.id,
        student: request.studentProfile.user.fullName,
        rollNo: request.studentProfile.rollNo,
        reason: request.reason,
        decisionNote: request.decisionNote,
        status: request.status,
      }
      : null,
    book,
  };
}

/**
 * Walk a purchase forward. REQUESTED → ORDERED records cost and expected
 * delivery; ORDERED → RECEIVED is the interesting one: it creates the catalog
 * `Book`, links it, and tells the student who asked for it that the book is in.
 */
export async function advanceProcurement(
  institutionId: string,
  actorUserId: string,
  procurementId: string,
  input: {
    status: ProcurementStatus;
    costRupees?: number;
    note?: string;
    category?: string;
    rackLocation?: string;
    copies?: number;
  },
) {
  const row = await prisma.bookProcurement.findFirst({
    where: { id: procurementId, institutionId },
  });
  if (!row) throw notFound('Procurement not found');
  if (row.status === 'RECEIVED') throw conflict('This purchase is already received');
  if (row.status === 'CANCELLED') throw conflict('This purchase was cancelled');

  const target = input.status;

  if (target === 'CANCELLED') {
    await prisma.bookProcurement.update({
      where: { id: row.id },
      data: { status: 'CANCELLED', note: input.note?.trim() ?? row.note },
    });
    if (row.requestId) {
      // The student's request dies with the purchase — say so rather than
      // leaving it APPROVED forever.
      await prisma.bookRequest.updateMany({
        where: { id: row.requestId, status: 'APPROVED' },
        data: { status: 'REJECTED', decisionNote: `Purchase cancelled: ${input.note?.trim() ?? 'no reason given'}` },
      });
    }
    await writeAudit({
      actorUserId,
      institutionId,
      action: 'procurement.cancel',
      entityType: 'BookProcurement',
      entityId: row.id,
      before: { status: row.status },
      after: { status: 'CANCELLED' },
    });
    return { id: row.id, status: 'CANCELLED', book: null };
  }

  const allowed = PROCUREMENT_NEXT[row.status];
  if (!allowed) throw conflict(`Cannot advance a ${row.status} purchase`);
  if (target !== allowed) {
    throw unprocessable(`A ${row.status} purchase can only move to ${allowed}`);
  }

  if (target === 'ORDERED') {
    const cost = input.costRupees ?? toRupees(row.costMinor);
    if (cost < 0) throw badRequest('Cost cannot be negative');
    await prisma.bookProcurement.update({
      where: { id: row.id },
      data: {
        status: 'ORDERED',
        costMinor: Math.round(cost * 100),
        orderedAt: new Date(),
        note: input.note?.trim() ?? row.note,
        copies: input.copies && input.copies > 0 ? Math.round(input.copies) : row.copies,
      },
    });
    await writeAudit({
      actorUserId,
      institutionId,
      action: 'procurement.order',
      entityType: 'BookProcurement',
      entityId: row.id,
      before: { status: row.status },
      after: { status: 'ORDERED', costRupees: cost },
    });
    return { id: row.id, status: 'ORDERED', costRupees: cost, book: null };
  }

  // ── RECEIVED: the purchase becomes a catalog book ──
  const copies = input.copies && input.copies > 0 ? Math.round(input.copies) : row.copies;
  const category = input.category?.trim() || row.category || null;
  const rackLocation = input.rackLocation?.trim() || row.rackLocation || null;

  const policy = await loadPolicy(institutionId);

  const book = await prisma.book.create({
    data: {
      institutionId,
      title: row.title,
      author: row.author,
      category,
      totalCopies: copies,
      availableCopies: copies,
      rackLocation,
    },
  });

  await prisma.bookProcurement.update({
    where: { id: row.id },
    data: {
      status: 'RECEIVED',
      copies,
      category,
      rackLocation,
      receivedAt: new Date(),
      bookId: book.id,
      note: input.note?.trim() ?? row.note,
    },
  });

  // The requesting student gets the good news, and their request closes.
  let notifiedStudent: string | null = null;
  if (row.requestId) {
    const request = await prisma.bookRequest.findUnique({
      where: { id: row.requestId },
      include: { studentProfile: { include: { user: { select: { id: true, fullName: true } } } } },
    });
    if (request) {
      notifiedStudent = request.studentProfile.user.fullName;
      await prisma.bookRequest.update({
        where: { id: request.id },
        data: { status: 'PROCURED' },
      });
      await prisma.notification.create({
        data: {
          institutionId,
          recipientUserId: request.studentProfile.userId,
          type: 'BOOK_REQUEST',
          title: `Requested book arrived: ${row.title}`,
          body: `"${row.title}"${row.author ? ` by ${row.author}` : ''} is now on the shelves (${copies} cop${copies === 1 ? 'y' : 'ies'}). It can be borrowed from the circulation desk.`,
          sourceModule: 'library',
        },
      });
    }
  }

  // Announce only when the library has asked for arrival announcements to go out.
  let announcement: { recipients: number } | null = null;
  if (policy.announceNewArrivals) {
    const sent = await createBroadcast(institutionId, actorUserId, {
      audience: 'ALL_STUDENTS',
      title: `New arrival: ${row.title}`,
      body: `${row.author ? `${row.author}'s ` : ''}"${row.title}" is now on the shelves (${copies} cop${copies === 1 ? 'y' : 'ies'}). Browse the Catalog to find it.`,
    });
    announcement = { recipients: sent.recipients };
  }

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'procurement.receive',
    entityType: 'BookProcurement',
    entityId: row.id,
    before: { status: row.status },
    after: { status: 'RECEIVED', bookId: book.id, copies },
  });

  return {
    id: row.id,
    status: 'RECEIVED',
    book: {
      id: book.id,
      title: book.title,
      author: book.author,
      totalCopies: book.totalCopies,
      availableCopies: book.availableCopies,
      rackLocation: book.rackLocation,
      category: book.category,
    },
    notifiedStudent,
    announcement,
  };
}
