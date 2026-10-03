// Library Staff module service (docs/users/07 §4, tables: Domain F + E write-throughs)
// Money: integer paise. Fine rate: ₹5/day (500 paise). Tenant-scoped by institutionId.
import { prisma } from '../../db/prisma.js';
import { notFound, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { syncOverdueStatus } from './circulation.service.js';
import { loadPolicy } from './settings.service.js';
import { createBroadcast } from './notifications.service.js';


// ── L-01 Dashboard ──────────────────────────────────────────
const DAY_MS = 1000 * 60 * 60 * 24;

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/**
 * The librarian's landing view. Everything here is derived live, because most
 * library figures (overdue, on-loan, availability) are a function of the current
 * date rather than stored state.
 *
 * Two things this deliberately does NOT do:
 *  - Count `status: 'ISSUED'` and call that "on loan". syncOverdueStatus() has
 *    already promoted every past-due loan to OVERDUE, so an ISSUED-only count
 *    reported "1 issued" while 11 books were actually out. On-loan means
 *    `returnDate: null`.
 *  - Derive the circulation rate from the low-stock list (an earlier bug that
 *    reported 100% utilisation on a 22% library). It is total copies minus the
 *    copies sitting on the shelf.
 */
export async function getDashboard(institutionId: string) {
  const now = new Date();
  // Promote past-due loans first, otherwise every counter below reads zero.
  await syncOverdueStatus(institutionId);

  const todayStart = startOfDay(now);
  const todayEnd = new Date(todayStart.getTime() + DAY_MS - 1);
  const tomorrowEnd = new Date(todayStart.getTime() + 2 * DAY_MS - 1);

  const [
    copies,
    shelf,
    titles,
    onLoan,
    issued,
    overdue,
    members,
    requests,
    procurements,
    fines,
    digital,
    issuesToday,
    returnsToday,
    lowStock,
  ] = await Promise.all([
    prisma.book.aggregate({ where: { institutionId }, _sum: { totalCopies: true } }),
    prisma.book.aggregate({ where: { institutionId }, _sum: { availableCopies: true } }),
    prisma.book.count({ where: { institutionId } }),
    prisma.bookIssue.count({ where: { book: { institutionId }, returnDate: null } }),
    prisma.bookIssue.count({
      where: { book: { institutionId }, returnDate: null, status: 'ISSUED' },
    }),
    prisma.bookIssue.count({
      where: { book: { institutionId }, returnDate: null, status: 'OVERDUE' },
    }),
    prisma.studentProfile.count({ where: { user: { institutionId, deletedAt: null } } }),
    // Scoped: a bare `status: 'PENDING'` would count other institutions'.
    prisma.bookRequest.count({
      where: { status: 'PENDING', studentProfile: { user: { institutionId, deletedAt: null } } },
    }),
    prisma.bookProcurement.count({
      where: { institutionId, status: { in: ['REQUESTED', 'ORDERED'] } },
    }),
    prisma.fine.aggregate({
      where: { status: 'PENDING', bookIssue: { book: { institutionId } } },
      _count: { _all: true },
      _sum: { amountMinor: true },
    }),
    prisma.digitalResource.count({ where: { institutionId, status: 'ACTIVE' } }),
    prisma.bookIssue.count({
      where: { book: { institutionId }, issueDate: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.bookIssue.count({
      where: { book: { institutionId }, returnDate: { gte: todayStart, lte: todayEnd } },
    }),
    // Shelf pressure is NOT out-of-stock: a title with 0 free copies is usually
    // one everyone is reading, which is a different message to the librarian.
    prisma.book.findMany({
      where: { institutionId, availableCopies: { lte: 1 } },
      select: { id: true, title: true, author: true, totalCopies: true, availableCopies: true },
      orderBy: { availableCopies: 'asc' },
      take: 5,
    }),
  ]);

  const totalCopies = copies._sum.totalCopies ?? 0;
  const available = shelf._sum.availableCopies ?? 0;
  const circulationRatePct =
    totalCopies === 0 ? 0 : Math.round(((totalCopies - available) / totalCopies) * 100);

  // What needs chasing: anything overdue, due today, or due tomorrow.
  const dueSoon = await prisma.bookIssue.findMany({
    where: {
      book: { institutionId },
      returnDate: null,
      dueDate: { lte: tomorrowEnd },
    },
    include: {
      book: { select: { id: true, title: true } },
      studentProfile: { include: { user: { select: { fullName: true } } } },
    },
    orderBy: { dueDate: 'asc' },
    take: 10,
  });

  const shapedDue = dueSoon.map((i) => {
    const isOverdue = i.status === 'OVERDUE' || i.dueDate < now;
    return {
      id: i.id,
      bookId: i.book.id,
      book: i.book.title,
      student: i.studentProfile.user.fullName,
      rollNo: i.studentProfile.rollNo,
      dueDate: i.dueDate,
      isOverdue,
      daysOverdue: isOverdue ? Math.ceil((now.getTime() - i.dueDate.getTime()) / DAY_MS) : 0,
      dueToday: startOfDay(i.dueDate).getTime() === todayStart.getTime(),
    };
  });

  // Overdue is already counted above; these two are the forward-looking ones.
  const dueTodayCount = shapedDue.filter((d) => d.dueToday && !d.isOverdue).length;
  const dueTomorrowCount = await prisma.bookIssue.count({
    where: { book: { institutionId }, returnDate: null, dueDate: { gt: todayEnd, lte: tomorrowEnd } },
  });

  // Most borrowed — lifetime issue count per title.
  const popularRaw = await prisma.bookIssue.groupBy({
    by: ['bookId'],
    where: { book: { institutionId } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5,
  });
  const popularBooks = popularRaw.length
    ? await prisma.book.findMany({
      where: { id: { in: popularRaw.map((r) => r.bookId) } },
      select: { id: true, title: true, author: true },
    })
    : [];
  const popularMap = new Map(popularBooks.map((b) => [b.id, b]));

  // Alerts are actionable sentences, each naming the number behind it.
  const alerts: { type: string; message: string; severity: 'HIGH' | 'MEDIUM' | 'LOW' }[] = [];
  if (overdue > 0) {
    alerts.push({
      type: 'OVERDUE',
      severity: 'HIGH',
      message: `${overdue} book${overdue === 1 ? '' : 's'} overdue`,
    });
  }
  if (requests > 0) {
    alerts.push({
      type: 'PENDING_REQUESTS',
      severity: 'MEDIUM',
      message: `${requests} book request${requests === 1 ? '' : 's'} awaiting a decision`,
    });
  }
  if (procurements > 0) {
    alerts.push({
      type: 'PROCUREMENT',
      severity: 'LOW',
      message: `${procurements} purchase${procurements === 1 ? '' : 's'} to order or receive`,
    });
  }
  for (const b of lowStock) {
    alerts.push({
      type: b.availableCopies === 0 ? 'ALL_ON_LOAN' : 'LOW_COPIES',
      severity: b.availableCopies === 0 ? 'MEDIUM' : 'LOW',
      message:
        b.availableCopies === 0
          ? `"${b.title}" — all ${b.totalCopies} cop${b.totalCopies === 1 ? 'y' : 'ies'} on loan`
          : `"${b.title}" — only ${b.availableCopies} of ${b.totalCopies} on the shelf`,
    });
  }

  return {
    hero: {
      titles,
      totalCopies,
      availableCopies: available,
      onLoan,
      totalMembers: members,
      circulationRatePct,
      overdueCount: overdue,
    },
    stats: {
      titles,
      totalBooks: totalCopies,
      onLoan,
      issued,
      overdue,
      members,
      pendingFines: fines._count._all,
      pendingFineRupees: Math.round((fines._sum.amountMinor ?? 0) / 100),
      pendingRequests: requests,
      digitalResources: digital,
    },
    today: {
      dueToday: dueTodayCount,
      dueTomorrow: dueTomorrowCount,
      overdue,
      issuesToday,
      returnsToday,
    },
    shelf: {
      totalCopies,
      onShelf: available,
      onLoan,
      ratePct: circulationRatePct,
      lowStock: lowStock.map((b) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        availableCopies: b.availableCopies,
        totalCopies: b.totalCopies,
        allOnLoan: b.availableCopies === 0,
      })),
    },
    dueSoon: shapedDue,
    popular: popularRaw.map((r) => ({
      id: r.bookId,
      title: popularMap.get(r.bookId)?.title ?? 'Unknown',
      author: popularMap.get(r.bookId)?.author ?? null,
      borrowed: r._count.id,
    })),
    alerts,
    pendingRequests: requests,
  };
}

// ── L-02 Catalog CRUD ───────────────────────────────────────
export async function listCatalog(
  institutionId: string,
  query: { q?: string; category?: string },
) {
  const where: Record<string, unknown> = { institutionId };
  if (query.q) {
    where.OR = [
      { title: { contains: query.q } },
      { author: { contains: query.q } },
      { isbn: { contains: query.q } },
    ];
  }
  if (query.category) {
    where.category = query.category;
  }

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      orderBy: { title: 'asc' },
      take: 100,
    }),
    prisma.book.count({ where }),
  ]);

  const totalCopies = books.reduce((s, b) => s + b.totalCopies, 0);
  const totalAvailable = books.reduce((s, b) => s + b.availableCopies, 0);
  const categories = [...new Set(books.map((b) => b.category).filter(Boolean))];

  return {
    stats: {
      totalTitles: total,
      totalCopies,
      totalAvailable,
      categories: categories.length,
    },
    books: books.map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      isbn: b.isbn,
      category: b.category,
      totalCopies: b.totalCopies,
      availableCopies: b.availableCopies,
      rackLocation: b.rackLocation,
    })),
    total,
  };
}

export async function getBookDetail(institutionId: string, bookId: string) {
  const book = await prisma.book.findFirst({
    where: { id: bookId, institutionId },
    include: {
      issues: {
        include: {
          studentProfile: { include: { user: { select: { fullName: true } } } },
        },
        orderBy: { issueDate: 'desc' },
        take: 20,
      },
    },
  });
  if (!book) throw notFound('Book not found');

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    category: book.category,
    totalCopies: book.totalCopies,
    availableCopies: book.availableCopies,
    rackLocation: book.rackLocation,
    recentIssues: book.issues.map((i) => ({
      id: i.id,
      student: i.studentProfile.user.fullName,
      rollNo: i.studentProfile.rollNo,
      issueDate: i.issueDate,
      dueDate: i.dueDate,
      returnDate: i.returnDate,
      status: i.status,
    })),
  };
}

export async function addBook(
  institutionId: string,
  actorUserId: string,
  input: { title: string; author?: string; isbn?: string; category?: string; totalCopies: number; rackLocation?: string },
) {
  const book = await prisma.book.create({
    data: {
      institutionId,
      title: input.title,
      author: input.author ?? null,
      isbn: input.isbn ?? null,
      category: input.category ?? null,
      totalCopies: input.totalCopies,
      availableCopies: input.totalCopies,
      rackLocation: input.rackLocation ?? null,
    },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'catalog.add_book',
    entityType: 'Book',
    entityId: book.id,
    after: { title: book.title, totalCopies: book.totalCopies },
  });

  // announceNewArrivals is a real policy: when on, adding a title sends the
  // whole student body an in-app notice. Off by default — a librarian adding a
  // replacement copy should not spam 200 students.
  const policy = await loadPolicy(institutionId);
  let announcement: { id: string; recipients: number } | null = null;
  if (policy.announceNewArrivals) {
    const where = book.author ? `"${book.title}" by ${book.author}` : `"${book.title}"`;
    const sent = await createBroadcast(institutionId, actorUserId, {
      audience: 'ALL_STUDENTS',
      title: `New arrival: ${book.title}`,
      body: `${where} is now on the shelves (${book.totalCopies} cop${book.totalCopies === 1 ? 'y' : 'ies'}). Browse the Catalog to find it.`,
    });
    announcement = { id: sent.id, recipients: sent.recipients };
  }

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    totalCopies: book.totalCopies,
    availableCopies: book.availableCopies,
    announcement,
  };
}

export async function updateBook(
  institutionId: string,
  actorUserId: string,
  bookId: string,
  input: { title?: string; author?: string; isbn?: string; category?: string; totalCopies?: number; rackLocation?: string },
) {
  const existing = await prisma.book.findFirst({ where: { id: bookId, institutionId } });
  if (!existing) throw notFound('Book not found');

  // If totalCopies changes, adjust availableCopies proportionally
  let availableDelta = 0;
  if (input.totalCopies !== undefined && input.totalCopies !== existing.totalCopies) {
    availableDelta = input.totalCopies - existing.totalCopies;
    if (existing.availableCopies + availableDelta < 0) {
      throw unprocessable('Cannot reduce copies below currently issued count');
    }
  }

  const updated = await prisma.book.update({
    where: { id: bookId },
    data: {
      ...input,
      availableCopies: availableDelta !== 0 ? { increment: availableDelta } : undefined,
    },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'catalog.update_book',
    entityType: 'Book',
    entityId: bookId,
    before: { title: existing.title, totalCopies: existing.totalCopies },
    after: { title: updated.title, totalCopies: updated.totalCopies },
  });

  return {
    id: updated.id,
    title: updated.title,
    author: updated.author,
    totalCopies: updated.totalCopies,
    availableCopies: updated.availableCopies,
  };
}
