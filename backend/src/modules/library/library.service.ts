// Library Staff module service (docs/users/07 §4, tables: Domain F + E write-throughs)
// Money: integer paise. Fine rate: ₹5/day (500 paise). Tenant-scoped by institutionId.
import { prisma } from '../../db/prisma.js';
import { notFound, conflict, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { syncOverdueStatus } from './circulation.service.js';

const toRupees = (paise: number) => Math.round(paise / 100);

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

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    totalCopies: book.totalCopies,
    availableCopies: book.availableCopies,
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

// ── L-04 Fines: collect / waive ─────────────────────────────
export async function listFines(institutionId: string) {
  const [pendingFines, collectedFines] = await Promise.all([
    prisma.fine.findMany({
      where: { status: 'PENDING', bookIssue: { book: { institutionId } } },
      include: {
        bookIssue: {
          include: {
            book: { select: { title: true } },
            studentProfile: { include: { user: { select: { fullName: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.fine.findMany({
      where: {
        status: { in: ['PAID', 'WAIVED'] },
        bookIssue: { book: { institutionId } },
      },
      include: {
        bookIssue: {
          include: {
            book: { select: { title: true } },
            studentProfile: { include: { user: { select: { fullName: true } } } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
  ]);

  const totalPending = pendingFines.reduce((s, f) => s + f.amountMinor, 0);
  const totalCollected = collectedFines
    .filter((f) => f.status === 'PAID')
    .reduce((s, f) => s + f.amountMinor, 0);

  return {
    stats: {
      pendingCount: pendingFines.length,
      pendingAmountRupees: toRupees(totalPending),
      collectedCount: collectedFines.filter((f) => f.status === 'PAID').length,
      collectedAmountRupees: toRupees(totalCollected),
      waivedCount: collectedFines.filter((f) => f.status === 'WAIVED').length,
    },
    pending: pendingFines.map((f) => ({
      id: f.id,
      bookIssueId: f.bookIssueId,
      student: f.bookIssue.studentProfile.user.fullName,
      rollNo: f.bookIssue.studentProfile.rollNo,
      book: f.bookIssue.book.title,
      amountRupees: toRupees(f.amountMinor),
      daysOverdue: f.daysOverdue,
      createdAt: f.createdAt,
    })),
    collected: collectedFines.map((f) => ({
      id: f.id,
      student: f.bookIssue.studentProfile.user.fullName,
      book: f.bookIssue.book.title,
      amountRupees: toRupees(f.amountMinor),
      status: f.status,
      waivedReason: f.waivedReason,
      updatedAt: f.updatedAt,
    })),
  };
}

export async function collectFine(
  institutionId: string,
  actorUserId: string,
  fineId: string,
  method: string,
) {
  const fine = await prisma.fine.findFirst({
    where: { id: fineId, bookIssue: { book: { institutionId } } },
    include: {
      bookIssue: {
        include: {
          book: { select: { title: true } },
          studentProfile: { include: { user: { select: { id: true, fullName: true } } } },
        },
      },
    },
  });
  if (!fine) throw notFound('Fine not found');
  if (fine.status === 'PAID') throw conflict('Fine already paid');
  if (fine.status === 'WAIVED') throw conflict('Fine already waived');

  // Write-through: Payment(FINE) + Receipt + FinePayment link
  const result = await prisma.$transaction(async (tx) => {
    const count = await tx.payment.count({ where: { institutionId } });
    const payment = await tx.payment.create({
      data: {
        institutionId,
        payerUserId: fine.bookIssue.studentProfile.userId,
        studentProfileId: fine.bookIssue.studentProfileId,
        category: 'FINE',
        referenceNo: `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`,
        amountMinor: fine.amountMinor,
        method: method as 'UPI' | 'NET_BANKING' | 'CARD' | 'CASH',
        status: 'CLEARED',
        paidAt: new Date(),
        recordedByUserId: actorUserId,
      },
    });
    const receipt = await tx.receipt.create({
      data: {
        paymentId: payment.id,
        receiptNo: `RCP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`,
      },
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

  // Notify student
  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: fine.bookIssue.studentProfile.userId,
      type: 'FINE',
      title: 'Fine collected',
      body: `Your fine of ₹${toRupees(fine.amountMinor)} for "${fine.bookIssue.book.title}" has been collected. Receipt: ${result.receipt.receiptNo}.`,
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
    after: { status: 'PAID', paymentRef: result.payment.referenceNo, receiptNo: result.receipt.receiptNo },
  });

  return {
    id: fine.id,
    status: 'PAID',
    student: fine.bookIssue.studentProfile.user.fullName,
    amountRupees: toRupees(fine.amountMinor),
    paymentReference: result.payment.referenceNo,
    receiptNo: result.receipt.receiptNo,
  };
}

export async function waiveFine(
  institutionId: string,
  actorUserId: string,
  fineId: string,
  reason: string,
) {
  const fine = await prisma.fine.findFirst({
    where: { id: fineId, bookIssue: { book: { institutionId } } },
    include: {
      bookIssue: {
        include: {
          book: { select: { title: true } },
          studentProfile: { include: { user: { select: { id: true, fullName: true } } } },
        },
      },
    },
  });
  if (!fine) throw notFound('Fine not found');
  if (fine.status !== 'PENDING') throw conflict(`Fine is already ${fine.status}`);

  await prisma.fine.update({
    where: { id: fine.id },
    data: { status: 'WAIVED', waivedReason: reason },
  });

  // Notify student
  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: fine.bookIssue.studentProfile.userId,
      type: 'FINE',
      title: 'Fine waived',
      body: `Your fine of ₹${toRupees(fine.amountMinor)} for "${fine.bookIssue.book.title}" has been waived. Reason: ${reason}.`,
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
    after: { status: 'WAIVED', reason },
  });

  return { id: fine.id, status: 'WAIVED', amountRupees: toRupees(fine.amountMinor) };
}

// ── L-05 Book requests: approve / reject ────────────────────
export async function listRequests(institutionId: string) {
  const requests = await prisma.bookRequest.findMany({
    where: {
      studentProfile: { user: { institutionId } },
    },
    include: {
      studentProfile: { include: { user: { select: { fullName: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const pending = requests.filter((r) => r.status === 'PENDING').length;
  const approved = requests.filter((r) => r.status === 'APPROVED').length;

  return {
    stats: { pending, approved, total: requests.length },
    requests: requests.map((r) => ({
      id: r.id,
      student: r.studentProfile.user.fullName,
      rollNo: r.studentProfile.rollNo,
      title: r.title,
      author: r.author,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt,
    })),
  };
}

export async function decideRequest(
  institutionId: string,
  actorUserId: string,
  requestId: string,
  decision: 'APPROVED' | 'REJECTED',
) {
  const request = await prisma.bookRequest.findFirst({
    where: { id: requestId, studentProfile: { user: { institutionId } } },
    include: {
      studentProfile: { include: { user: { select: { id: true, fullName: true } } } },
    },
  });
  if (!request) throw notFound('Book request not found');
  if (request.status !== 'PENDING') throw conflict(`Request is already ${request.status}`);

  const newStatus = decision;
  await prisma.bookRequest.update({
    where: { id: request.id },
    data: { status: newStatus },
  });

  // If approved, create a procurement record
  if (decision === 'APPROVED') {
    await prisma.bookProcurement.create({
      data: {
        requestId: request.id,
        institutionId,
        title: request.title,
        copies: 1,
        status: 'REQUESTED',
      },
    });
  }

  // Notify student
  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: request.studentProfile.userId,
      type: 'BOOK_REQUEST',
      title: decision === 'APPROVED' ? `Book request approved: ${request.title}` : `Book request rejected: ${request.title}`,
      body:
        decision === 'APPROVED'
          ? `Your request for "${request.title}" has been approved. It will be procured and added to the catalog.`
          : `Your request for "${request.title}" has been rejected.`,
      sourceModule: 'library',
    },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: `request.${decision.toLowerCase()}`,
    entityType: 'BookRequest',
    entityId: requestId,
    before: { status: 'PENDING' },
    after: { status: newStatus },
  });

  return { id: request.id, status: newStatus, title: request.title };
}

// ── L-07 Notifications + broadcast + profile ────────────────
export async function listNotifications(userId: string, institutionId: string) {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientUserId: userId, institutionId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({ where: { recipientUserId: userId, institutionId, readAt: null } }),
  ]);
  return {
    unread,
    notifications: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      read: n.readAt !== null,
      createdAt: n.createdAt,
    })),
  };
}

export async function markAllRead(userId: string, institutionId: string) {
  const res = await prisma.notification.updateMany({
    where: { recipientUserId: userId, institutionId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: res.count };
}

export async function createBroadcast(
  institutionId: string,
  senderUserId: string,
  body: { audience: string; title: string; body: string },
) {
  let recipientIds: string[] = [];

  if (body.audience === 'ALL_STUDENTS') {
    const students = await prisma.studentProfile.findMany({
      where: { user: { institutionId, deletedAt: null } },
      select: { userId: true },
    });
    recipientIds = students.map((s) => s.userId);
  } else if (body.audience === 'BORROWERS') {
    const issues = await prisma.bookIssue.findMany({
      where: { book: { institutionId }, status: { in: ['ISSUED', 'OVERDUE'] } },
      select: { studentProfile: { select: { userId: true } } },
      distinct: ['studentProfileId'],
    });
    recipientIds = [...new Set(issues.map((i) => i.studentProfile.userId))];
  } else if (body.audience === 'OVERDUE_MEMBERS') {
    const issues = await prisma.bookIssue.findMany({
      where: { book: { institutionId }, status: 'OVERDUE' },
      select: { studentProfile: { select: { userId: true } } },
      distinct: ['studentProfileId'],
    });
    recipientIds = [...new Set(issues.map((i) => i.studentProfile.userId))];
  }

  const broadcast = await prisma.broadcast.create({
    data: {
      institutionId,
      senderUserId,
      audienceJson: JSON.stringify({ audience: body.audience }),
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

  return { id: broadcast.id, recipients: recipientIds.length };
}

export async function getProfile(userId: string, institutionId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, institutionId },
    include: {
      roles: true,
      staffProfile: { select: { designation: true, employeeNo: true } },
    },
  });
  if (!user) throw notFound('User not found');

  const [totalBooks, issuedBooks, activeMembers] = await Promise.all([
    prisma.book.aggregate({ where: { institutionId }, _sum: { totalCopies: true } }),
    prisma.bookIssue.count({ where: { book: { institutionId }, status: { in: ['ISSUED', 'OVERDUE'] } } }),
    prisma.studentProfile.count({ where: { user: { institutionId, deletedAt: null } } }),
  ]);

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    roles: user.roles.map((r) => r.role),
    designation: user.staffProfile?.designation ?? null,
    employeeNo: user.staffProfile?.employeeNo ?? null,
    stats: {
      totalBooks: totalBooks._sum.totalCopies ?? 0,
      issuedBooks,
      activeMembers,
    },
  };
}
