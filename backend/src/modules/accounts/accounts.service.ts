// Accounts & Finance module service (docs/users/06 §4, tables: Domain E)
// Money: integer paise. All amounts converted to rupees at API edge. Tenant-scoped.
import { prisma } from '../../db/prisma.js';
import { notFound, conflict } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

const toRupees = (paise: number) => Math.round(paise / 100);

// ── F-01 Dashboard ──────────────────────────────────────────
export async function getDashboard(institutionId: string) {
  // `FeeDue` has no institutionId — it inherits its tenant from the student.
  // The dashboard used to aggregate every institution's dues into this one.
  const dueTenant = { studentProfile: { user: { institutionId, deletedAt: null } } };

  const [totalCollected, totalDues, unpaidDues, payrollRun, budgets, scholarships] =
    await Promise.all([
      prisma.payment.aggregate({
        where: { institutionId, status: 'CLEARED', reversedAt: null },
        _sum: { amountMinor: true },
        _count: { id: true },
      }),
      prisma.feeStructure.aggregate({
        where: { institutionId, status: 'ACTIVE' },
        _sum: { totalMinor: true },
      }),
      prisma.feeDue.findMany({
        where: { status: { in: ['UNPAID', 'PARTIAL'] }, ...dueTenant },
        select: { amountMinor: true, paidMinor: true },
      }),
      prisma.payrollRun.findFirst({
        where: { institutionId },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { entries: true } } },
      }),
      prisma.budget.findMany({
        where: { institutionId },
        orderBy: { category: 'asc' },
      }),
      prisma.scholarship.findMany({
        where: { institutionId },
        include: { _count: { select: { awards: true } } },
      }),
    ]);

  const collectedPaise = totalCollected._sum.amountMinor ?? 0;
  const targetPaise = totalDues._sum.totalMinor ?? 0;
  // Outstanding is the balance still owed, not the amount originally billed.
  const unpaidPaise = unpaidDues.reduce((s, d) => s + Math.max(0, d.amountMinor - d.paidMinor), 0);

  const unpaidCount = unpaidDues.length;
  const targetPct = targetPaise === 0 ? 0 : Math.min(Math.round((collectedPaise / targetPaise) * 100), 100);

  // Budget utilization
  const budgetData = budgets.map((b) => ({
    id: b.id,
    category: b.category,
    plannedRupees: toRupees(b.plannedMinor),
    spentRupees: toRupees(b.spentMinor),
    utilizationPct: b.plannedMinor === 0 ? 0 : Math.min(Math.round((b.spentMinor / b.plannedMinor) * 100), 100),
  }));

  // Recent collections
  const recentPayments = await prisma.payment.findMany({
    where: { institutionId, status: 'CLEARED', reversedAt: null },
    include: {
      studentProfile: { include: { user: { select: { fullName: true } } } },
      receipt: { select: { receiptNo: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  // Defaulters (dues overdue > 7 days)
  const defaulterDues = await prisma.feeDue.findMany({
    where: { status: { in: ['UNPAID', 'PARTIAL'] }, daysOverdue: { gte: 7 }, ...dueTenant },
    include: {
      studentProfile: { include: { user: { select: { fullName: true } } } },
    },
    orderBy: { daysOverdue: 'desc' },
    take: 5,
  });

  // Pending expenses
  const pendingExpenses = await prisma.expense.count({ where: { institutionId, status: 'PENDING' } });

  return {
    hero: {
      collectedRupees: toRupees(collectedPaise),
      targetRupees: toRupees(targetPaise),
      targetPct,
    },
    stats: {
      collected: toRupees(collectedPaise),
      target: toRupees(targetPaise),
      unpaidDues: toRupees(unpaidPaise),
      defaulterCount: unpaidCount,
    },
    recentCollections: recentPayments.map((p) => ({
      id: p.id,
      student: p.studentProfile?.user.fullName ?? 'Donor',
      amountRupees: toRupees(p.amountMinor),
      method: p.method,
      category: p.category,
      receiptNo: p.receipt?.receiptNo ?? null,
      createdAt: p.createdAt,
    })),
    defaulters: defaulterDues.map((d) => ({
      id: d.id,
      student: d.studentProfile.user.fullName,
      rollNo: d.studentProfile.rollNo,
      title: d.title,
      amountRupees: toRupees(Math.max(0, d.amountMinor - d.paidMinor)),
      daysOverdue: d.daysOverdue,
    })),
    budget: budgetData,
    alerts: [
      ...(pendingExpenses > 0
        ? [{ type: 'PENDING_EXPENSES' as const, message: `${pendingExpenses} expense(s) awaiting approval` }]
        : []),
      ...(unpaidCount > 0
        ? [{ type: 'UNPAID_DUES' as const, message: `${unpaidCount} student(s) with unpaid dues` }]
        : []),
      ...(payrollRun && payrollRun.status === 'DRAFT'
        ? [{ type: 'PAYROLL_DUE' as const, message: `Payroll ${payrollRun.month} is in DRAFT` }]
        : []),
    ],
    payroll: payrollRun
      ? { month: payrollRun.month, status: payrollRun.status, entries: payrollRun._count.entries }
      : null,
    scholarships: scholarships.map((s) => ({
      name: s.name,
      type: s.type,
      awards: s._count.awards,
    })),
  };
}

// F-02 Collections (list / record / reverse / statement) now lives in
// collections.service.ts — it has to allocate money onto `fee_dues`, which this
// file's fee-structure and dues helpers do not know about.

// ── F-03 Fee structures ─────────────────────────────────────
export async function listFeeStructures(institutionId: string) {
  const structures = await prisma.feeStructure.findMany({
    where: { institutionId },
    include: {
      program: { select: { name: true, code: true } },
      academicYear: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return structures.map((s) => ({
    id: s.id,
    program: s.program.name,
    programCode: s.program.code,
    academicYear: s.academicYear.name,
    tuitionRupees: toRupees(s.tuitionMinor),
    otherRupees: toRupees(s.otherMinor),
    totalRupees: toRupees(s.totalMinor),
    status: s.status,
  }));
}

export async function requestRevision(
  institutionId: string,
  actorUserId: string,
  feeStructureId: string,
) {
  const fs = await prisma.feeStructure.findFirst({
    where: { id: feeStructureId, institutionId },
  });
  if (!fs) throw notFound('Fee structure not found');
  if (fs.status === 'REVISION_REQUESTED') throw conflict('Revision already requested');

  await prisma.feeStructure.update({
    where: { id: fs.id },
    data: { status: 'REVISION_REQUESTED', requestedByUserId: actorUserId },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'fee_structure.revision_request',
    entityType: 'FeeStructure',
    entityId: fs.id,
    before: { status: fs.status },
    after: { status: 'REVISION_REQUESTED' },
  });

  return { id: fs.id, status: 'REVISION_REQUESTED' };
}

// F-04 Dues & Recovery (list / detail / remind / waive / reinstate) now lives in
// dues.service.ts. It has to derive status from `paidMinor`, age the book into
// buckets and read the audit trail for reminder history — none of which this
// file's fee-structure helpers know about.

// ── F-05 Unified ledger ─────────────────────────────────────
export async function getLedger(institutionId: string) {
  const payments = await prisma.payment.findMany({
    where: { institutionId },
    include: {
      studentProfile: { include: { user: { select: { fullName: true } } } },
      receipt: { select: { receiptNo: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const byCategory = new Map<string, number>();
  for (const p of payments) {
    // A reversed payment keeps its ledger row but is not money in the bank.
    if (p.status === 'CLEARED' && !p.reversedAt) {
      byCategory.set(p.category, (byCategory.get(p.category) ?? 0) + p.amountMinor);
    }
  }

  return {
    total: payments.length,
    byCategory: Object.fromEntries([...byCategory.entries()].map(([k, v]) => [k, toRupees(v)])),
    entries: payments.map((p) => ({
      id: p.id,
      referenceNo: p.referenceNo,
      student: p.studentProfile?.user.fullName ?? null,
      category: p.category,
      amountRupees: toRupees(p.amountMinor),
      method: p.method,
      status: p.status,
      isReversed: !!p.reversedAt,
      reversalReason: p.reversalReason,
      receiptNo: p.receipt?.receiptNo ?? null,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    })),
  };
}

// ── F-06 Payroll ────────────────────────────────────────────
// Moved to payroll.service.ts: the run lifecycle (DRAFT → APPROVED → PAID),
// per-entry payment, loss-of-pay adjustments and the payslip all live there.
// The hard-coded ₹60,000 gross / ₹6,000 deduction this desk used to write for
// every employee regardless of who they were is gone — gross now comes from
// StaffProfile.monthlyGrossMinor.

// ── F-07 Expenses ───────────────────────────────────────────
export async function listExpenses(institutionId: string) {
  const [expenses, budgets] = await Promise.all([
    prisma.expense.findMany({
      where: { institutionId },
      include: {
        budget: { select: { category: true, plannedMinor: true, spentMinor: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.budget.findMany({ where: { institutionId } }),
  ]);

  return {
    expenses: expenses.map((e) => ({
      id: e.id,
      category: e.category,
      vendor: e.vendor,
      amountRupees: toRupees(e.amountMinor),
      date: e.date,
      status: e.status,
      budgetCategory: e.budget?.category ?? null,
    })),
    budgets: budgets.map((b) => ({
      id: b.id,
      category: b.category,
      fiscalYear: b.fiscalYear,
      plannedRupees: toRupees(b.plannedMinor),
      spentRupees: toRupees(b.spentMinor),
      utilizationPct: b.plannedMinor === 0 ? 0 : Math.min(Math.round((b.spentMinor / b.plannedMinor) * 100), 100),
    })),
  };
}

export async function addExpense(
  institutionId: string,
  actorUserId: string,
  input: { category: string; vendor?: string; amountMinor: number; budgetId?: string },
) {
  const expense = await prisma.expense.create({
    data: {
      institutionId,
      category: input.category,
      vendor: input.vendor ?? null,
      amountMinor: input.amountMinor,
      date: new Date(),
      status: 'PENDING',
      requestedByUserId: actorUserId,
      budgetId: input.budgetId ?? null,
    },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'expense.create',
    entityType: 'Expense',
    entityId: expense.id,
    after: { category: input.category, amountMinor: input.amountMinor },
  });

  return { id: expense.id, category: input.category, amountRupees: toRupees(input.amountMinor), status: 'PENDING' };
}

export async function approveExpense(
  institutionId: string,
  actorUserId: string,
  expenseId: string,
) {
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, institutionId },
  });
  if (!expense) throw notFound('Expense not found');
  if (expense.status !== 'PENDING') throw conflict(`Expense is already ${expense.status}`);

  await prisma.$transaction(async (tx) => {
    await tx.expense.update({
      where: { id: expense.id },
      data: { status: 'APPROVED', approvedByUserId: actorUserId },
    });
    if (expense.budgetId) {
      await tx.budget.update({
        where: { id: expense.budgetId },
        data: { spentMinor: { increment: expense.amountMinor } },
      });
    }
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'expense.approve',
    entityType: 'Expense',
    entityId: expenseId,
    before: { status: 'PENDING' },
    after: { status: 'APPROVED' },
  });

  return { id: expense.id, status: 'APPROVED' };
}

export async function rejectExpense(
  institutionId: string,
  actorUserId: string,
  expenseId: string,
) {
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, institutionId },
  });
  if (!expense) throw notFound('Expense not found');
  if (expense.status !== 'PENDING') throw conflict(`Expense is already ${expense.status}`);

  await prisma.expense.update({
    where: { id: expense.id },
    data: { status: 'REJECTED', approvedByUserId: actorUserId },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'expense.reject',
    entityType: 'Expense',
    entityId: expenseId,
    before: { status: 'PENDING' },
    after: { status: 'REJECTED' },
  });

  return { id: expense.id, status: 'REJECTED' };
}

// ── F-08 Scholarships ───────────────────────────────────────
export async function listScholarships(institutionId: string) {
  const scholarships = await prisma.scholarship.findMany({
    where: { institutionId },
    include: {
      academicYear: { select: { name: true } },
      awards: {
        include: {
          studentProfile: { include: { user: { select: { fullName: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return scholarships.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    coveragePercent: s.coveragePercent,
    academicYear: s.academicYear.name,
    awards: s.awards.map((a) => ({
      id: a.id,
      student: a.studentProfile.user.fullName,
      rollNo: a.studentProfile.rollNo,
      amountRupees: toRupees(a.amountMinor),
      status: a.status,
    })),
    totalAwards: s.awards.length,
    approved: s.awards.filter((a) => a.status === 'APPROVED').length,
    disbursed: s.awards.filter((a) => a.status === 'DISBURSED').length,
  }));
}

export async function approveScholarship(
  institutionId: string,
  _actorUserId: string,
  awardId: string,
) {
  const award = await prisma.scholarshipAward.findFirst({
    where: { id: awardId, scholarship: { institutionId } },
    include: {
      scholarship: { select: { name: true } },
      studentProfile: { include: { user: { select: { id: true, fullName: true } } } },
    },
  });
  if (!award) throw notFound('Scholarship award not found');
  if (award.status !== 'APPROVED') throw conflict(`Award is already ${award.status}`);

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: award.studentProfile.userId,
      type: 'SCHOLARSHIP',
      title: `Scholarship approved: ${award.scholarship.name}`,
      body: `Your application for "${award.scholarship.name}" has been approved. Amount: ₹${toRupees(award.amountMinor)}.`,
      sourceModule: 'accounts',
    },
  });

  return { id: award.id, status: 'APPROVED', student: award.studentProfile.user.fullName };
}

export async function disburseScholarship(
  institutionId: string,
  actorUserId: string,
  awardId: string,
) {
  const award = await prisma.scholarshipAward.findFirst({
    where: { id: awardId, scholarship: { institutionId } },
    include: {
      scholarship: { select: { name: true } },
      studentProfile: { include: { user: { select: { id: true, fullName: true } } } },
    },
  });
  if (!award) throw notFound('Scholarship award not found');
  if (award.status !== 'APPROVED') throw conflict(`Award must be APPROVED before disbursement`);

  // Create payment (write-through)
  const count = await prisma.payment.count({ where: { institutionId } });
  const payment = await prisma.payment.create({
    data: {
      institutionId,
      payerUserId: actorUserId,
      studentProfileId: award.studentProfileId,
      category: 'MISC',
      referenceNo: `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`,
      amountMinor: award.amountMinor,
      method: 'NET_BANKING',
      status: 'CLEARED',
      paidAt: new Date(),
      recordedByUserId: actorUserId,
    },
  });

  await prisma.scholarshipAward.update({
    where: { id: award.id },
    data: { status: 'DISBURSED', disbursedPaymentId: payment.id },
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: award.studentProfile.userId,
      type: 'SCHOLARSHIP',
      title: `Scholarship disbursed: ${award.scholarship.name}`,
      body: `₹${toRupees(award.amountMinor)} from "${award.scholarship.name}" has been credited to your account.`,
      sourceModule: 'accounts',
    },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'scholarship.disburse',
    entityType: 'ScholarshipAward',
    entityId: awardId,
    before: { status: 'APPROVED' },
    after: { status: 'DISBURSED', paymentRef: payment.referenceNo },
  });

  return { id: award.id, status: 'DISBURSED', paymentRef: payment.referenceNo };
}

// ── F-09 Reports ────────────────────────────────────────────
export async function getReports(institutionId: string) {
  const [payments, dues, payrollRuns, expenses, budgets] = await Promise.all([
    prisma.payment.groupBy({
      by: ['category'],
      where: { institutionId, status: 'CLEARED' },
      _sum: { amountMinor: true },
      _count: { id: true },
    }),
    prisma.feeDue.groupBy({
      by: ['status'],
      _sum: { amountMinor: true },
      _count: { id: true },
    }),
    prisma.payrollRun.findMany({
      where: { institutionId },
      orderBy: { month: 'desc' },
      take: 6,
    }),
    prisma.expense.groupBy({
      by: ['category'],
      where: { institutionId },
      _sum: { amountMinor: true },
      _count: { id: true },
    }),
    prisma.budget.findMany({ where: { institutionId } }),
  ]);

  const totalCollected = payments.reduce((s, p) => s + (p._sum.amountMinor ?? 0), 0);
  const totalDuesUnpaid = dues
    .filter((d) => d.status === 'UNPAID' || d.status === 'PARTIAL')
    .reduce((s, d) => s + (d._sum.amountMinor ?? 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e._sum.amountMinor ?? 0), 0);
  const totalBudget = budgets.reduce((s, b) => s + b.plannedMinor, 0);

  return {
    summary: {
      totalCollectedRupees: toRupees(totalCollected),
      totalUnpaidDuesRupees: toRupees(totalDuesUnpaid),
      totalExpensesRupees: toRupees(totalExpenses),
      totalBudgetRupees: toRupees(totalBudget),
    },
    collectionsByCategory: payments.map((p) => ({
      category: p.category,
      amountRupees: toRupees(p._sum.amountMinor ?? 0),
      count: p._count.id,
    })),
    duesByStatus: dues.map((d) => ({
      status: d.status,
      amountRupees: toRupees(d._sum.amountMinor ?? 0),
      count: d._count.id,
    })),
    expensesByCategory: expenses.map((e) => ({
      category: e.category,
      amountRupees: toRupees(e._sum.amountMinor ?? 0),
      count: e._count.id,
    })),
    payrollHistory: payrollRuns.map((r) => ({
      month: r.month,
      status: r.status,
      totalRupees: toRupees(r.totalMinor),
    })),
  };
}

// ── F-10 Notifications + broadcast + profile ────────────────
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
  } else if (body.audience === 'DEFAULTERS') {
    const duelist = await prisma.feeDue.findMany({
      where: { status: { in: ['UNPAID', 'PARTIAL'] }, daysOverdue: { gte: 7 } },
      select: { studentProfile: { select: { userId: true } } },
      distinct: ['studentProfileId'],
    });
    recipientIds = [...new Set(duelist.map((d) => d.studentProfile.userId))];
  } else if (body.audience === 'ALL_STAFF') {
    const staff = await prisma.staffProfile.findMany({
      where: { institutionId, user: { deletedAt: null } },
      select: { userId: true },
    });
    recipientIds = staff.map((s) => s.userId);
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
        sourceModule: 'accounts',
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

  const [totalCollected, totalStaff, totalScholarships] = await Promise.all([
    prisma.payment.aggregate({
      where: { institutionId, status: 'CLEARED' },
      _sum: { amountMinor: true },
    }),
    prisma.staffProfile.count({ where: { institutionId, user: { deletedAt: null } } }),
    prisma.scholarship.count({ where: { institutionId } }),
  ]);

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    roles: user.roles.map((r) => r.role),
    designation: user.staffProfile?.designation ?? null,
    employeeNo: user.staffProfile?.employeeNo ?? null,
    stats: {
      totalCollectedRupees: toRupees(totalCollected._sum.amountMinor ?? 0),
      totalStaff,
      totalScholarships,
    },
  };
}
