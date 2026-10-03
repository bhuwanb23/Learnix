// Library Staff module service (docs/users/07 §4, tables: Domain F + E write-throughs)
// Money: integer paise. Fine rate: ₹5/day (500 paise). Tenant-scoped by institutionId.
import { prisma } from '../../db/prisma.js';
import { notFound, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { syncOverdueStatus } from './circulation.service.js';
import { loadPolicy } from './settings.service.js';
import { createBroadcast } from './notifications.service.js';


// ── L-01 Dashboard ──────────────────────────────────────────
export async function getDashboard(institutionId: string) {
  const now = new Date();
  // Promote past-due loans first, otherwise the overdue counters below read zero.
  await syncOverdueStatus(institutionId);

  const [
    totalBooks,
    totalIssued,
    totalOverdue,
    pendingFines,
    pendingRequests,
    totalMembers,
    lowCopiesBooks,
  ] = await Promise.all([
    prisma.book.aggregate({ where: { institutionId }, _sum: { totalCopies: true } }),
    prisma.bookIssue.count({ where: { book: { institutionId }, status: 'ISSUED' } }),
    prisma.bookIssue.count({ where: { book: { institutionId }, status: 'OVERDUE' } }),
    prisma.fine.count({
      where: { status: 'PENDING', bookIssue: { book: { institutionId } } },
    }),
    prisma.bookRequest.count({ where: { status: 'PENDING' } }),
    prisma.studentProfile.count({ where: { user: { institutionId, deletedAt: null } } }),
    prisma.book.findMany({
      where: { institutionId, availableCopies: 0 },
      select: { id: true, title: true, author: true, totalCopies: true, availableCopies: true },
      take: 5,
    }),
  ]);

  // Today's due returns (due today or overdue, still ISSUED)
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const dueToday = await prisma.bookIssue.findMany({
    where: {
      book: { institutionId },
      status: { in: ['ISSUED', 'OVERDUE'] },
      dueDate: { lte: todayEnd },
    },
    include: {
      book: { select: { title: true } },
      studentProfile: { include: { user: { select: { fullName: true } } } },
    },
    orderBy: { dueDate: 'asc' },
    take: 10,
  });

  // Popular books (most borrowed — count issues per book)
  const popularRaw = await prisma.bookIssue.groupBy({
    by: ['bookId'],
    where: { book: { institutionId } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5,
  });
  const popularBookIds = popularRaw.map((r) => r.bookId);
  const popularBooks = popularBookIds.length
    ? await prisma.book.findMany({ where: { id: { in: popularBookIds } } })
    : [];
  const popularMap = new Map(popularBooks.map((b) => [b.id, b]));
  const popular = popularRaw.map((r) => ({
    id: r.bookId,
    title: popularMap.get(r.bookId)?.title ?? 'Unknown',
    author: popularMap.get(r.bookId)?.author ?? null,
    borrowed: r._count.id,
  }));

  const totalBookCount = totalBooks._sum.totalCopies ?? 0;
  const utilizationPct = totalBookCount === 0 ? 0 : Math.round(((totalBookCount - (lowCopiesBooks.reduce((s, b) => s + b.availableCopies, 0))) / totalBookCount) * 100);

  return {
    hero: {
      totalBooks: totalBookCount,
      totalIssued,
      totalMembers,
      utilizationPct,
      overdueCount: totalOverdue,
    },
    stats: {
      totalBooks: totalBookCount,
      issued: totalIssued,
      overdue: totalOverdue,
      pendingFines,
    },
    dueToday: dueToday.map((i) => ({
      id: i.id,
      book: i.book.title,
      student: i.studentProfile.user.fullName,
      rollNo: i.studentProfile.rollNo,
      dueDate: i.dueDate,
      isOverdue: i.status === 'OVERDUE' || i.dueDate < now,
    })),
    popular,
    alerts: [
      ...lowCopiesBooks.map((b) => ({
        type: 'LOW_COPIES' as const,
        message: `"${b.title}" has 0 available copies`,
      })),
      ...(pendingRequests > 0
        ? [{ type: 'PENDING_REQUESTS' as const, message: `${pendingRequests} book request(s) awaiting decision` }]
        : []),
      ...(totalOverdue > 0
        ? [{ type: 'OVERDUE' as const, message: `${totalOverdue} book(s) overdue` }]
        : []),
    ],
    pendingRequests,
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
