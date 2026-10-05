// Accounts & Finance module service (docs/users/06 §4, tables: Domain E)
// Money: integer paise. All amounts converted to rupees at API edge. Tenant-scoped.
import { prisma } from '../../db/prisma.js';
import { notFound } from '../../lib/errors.js';
import { balanceOf } from './dues.money.js';

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
        select: { amountMinor: true, paidMinor: true, lateFeeMinor: true },
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
        include: {
          applications: { select: { status: true, grantedMinor: true, disbursedMinor: true } },
        },
      }),
    ]);

  const collectedPaise = totalCollected._sum.amountMinor ?? 0;
  const targetPaise = totalDues._sum.totalMinor ?? 0;
  // Outstanding is the balance still owed, not the amount originally billed.
  // Includes any assessed late fine — the same rule the dues desk uses, so the
  // two screens can never show different totals for the same institution.
  const unpaidPaise = unpaidDues.reduce((s, d) => s + balanceOf(d), 0);

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
    scholarships: scholarships.map((s) => {
      // Approved-but-undisbursed money is what a dashboard headline has to
      // separate: it is a promise, not a payment, and showing it as "given"
      // would overstate the aid this institution has actually delivered.
      let committed = 0;
      let disbursed = 0;
      for (const a of s.applications) {
        if (a.status === 'APPROVED' || a.status === 'UNDER_REVIEW' || a.status === 'DISBURSED') committed += a.grantedMinor;
        if (a.status === 'DISBURSED') disbursed += a.disbursedMinor;
      }
      return {
        name: s.name,
        type: s.type,
        status: s.status,
        applications: s.applications.length,
        committedRupees: toRupees(committed),
        disbursedRupees: toRupees(disbursed),
      };
    }),
  };
}

// F-02 Collections (list / record / reverse / statement) now lives in
// collections.service.ts — it has to allocate money onto `fee_dues`, which this
// file's fee-structure and dues helpers do not know about.

// ── F-03/F-04 Fee structures ────────────────────────────────
// Superseded by feestructure.service.ts / feestructure.routes.ts: components,
// versioned effective dates, concessions and instalment configuration. The two
// functions below remain only for the dashboard's roll-up call and are not the
// desk's source of truth.

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

// ── F-09 Reports ───────────────────────────────────────────
// Moved to reports.service.ts. The summary this file served came from a
// `feeDue.groupBy` with NO tenant filter, so one institution saw every other
// institution's unpaid dues in its headline, and "unpaid" summed the AMOUNT
// BILLED rather than the balance left owing. It is deleted rather than left
// reachable: nothing may serve those numbers.

// ── F-10 Notifications + broadcast ─────────────────────────────────────────
// MOVED to notifications.service.ts (docs/users/06 §3.9), served by
// notifications.routes.ts, mounted BEFORE this router.
//
// These three functions are deleted rather than left reachable, because each
// served something wrong:
//
//   • listNotifications returned the newest 50 rows of ANY type, so a transport
//     DELAY sat above a fee reminder, all painted the same blue bell. There was
//     no category, no unread filter, no pagination, and no way to read ONE
//     message — tapping any row called markAllRead.
//   • markAllRead survived, but as one of several read controls alongside
//     markRead/setRead rather than the only option.
//   • createBroadcast resolved its DEFAULTERS audience with NO institution
//     filter, so one college's fee reminder was delivered to every college's
//     defaulters on the instance. It also read `FeeDue.daysOverdue`, a
//     denormalised column that drifts, without ever refreshing it — so who
//     received the message depended on when somebody last opened the dues desk.
//
// The replacement scopes every audience branch to the institution and resolves
// defaulters from `dueDate`, which cannot go stale.

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
