// Accounts & Finance module service (docs/users/06 §4, tables: Domain E)
// Money: integer paise. All amounts converted to rupees at API edge. Tenant-scoped.
import { prisma } from '../../db/prisma.js';
import { notFound } from '../../lib/errors.js';

const toRupees = (paise: number) => Math.round(paise / 100);

// ── F-01 Dashboard ─────────────────────────────────────────────────────────
// MOVED to dashboard.service.ts (docs/users/06 §3.11), served by
// dashboard.routes.ts, mounted BEFORE this router.
//
// `getDashboard` is deleted rather than left reachable, because every part of
// it that mattered was wrong in a way a user would act on:
//
//   • THE HERO COMPARED TWO UNRELATED NUMBERS. "Collected vs target" summed
//     every ACTIVE `FeeStructure.totalMinor` against ALL-TIME collections. A fee
//     structure is a price list; summing every programme a college offers is not
//     what it hopes to collect, and the ratio could exceed 100% — and did.
//     There is no target column in this schema and none was invented.
//
//   • THE DEFAULTERS READ THE DRIFTING COLUMN. It filtered
//     `FeeDue.daysOverdue >= 7`, a denormalised counter that goes stale and was
//     never refreshed. F-10 found and fixed the identical bug in the broadcast
//     audience one file over; this screen had it too. Every age is now computed
//     from `dueDate` against today, which cannot drift.
//
//   • `defaulterCount` WAS NOT A COUNT OF DEFAULTERS. It was `unpaidDues.length`
//     — the number of OPEN BILLS — drawn on the home screen under the word
//     "Defaulters". A student with four unpaid fees was four defaulters.
//
//   • THE TWO ALERTS COULD NOT BE ACTED ON. `PENDING_EXPENSES` and
//     `UNPAID_DUES` were bare strings with no route and no figure, and neither
//     mentioned a single unusual transaction or reconciliation problem — the two
//     things an officer most needs before a board meeting. There are now eight,
//     in three families, each routed to the thing that causes it.
//
//   • THE BUDGET CLAMPED ITS OWN ALARM. `utilizationPct` was
//     `Math.min(..., 100)`, so a line at 180% of plan drew a full bar and read
//     "100%". The one number that most needed to look alarming could not.
//
//   • SCHOLARSHIP MONEY WAS MERGED. `committed` counted `UNDER_REVIEW`
//     applications as promised alongside `APPROVED` and `DISBURSED`, reporting a
//     decision nobody had made as a promise the institution had made.
//
// What survives here is the ledger, the profile, and the comment trail.

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
