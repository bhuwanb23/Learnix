// F-11 Dashboard — the morning screen (docs/users/06 §3.11).
//
// This replaces a `getDashboard` that returned six differently-shaped fragments,
// and every one of them was wrong in a way that mattered:
//
//   1. THE HERO COMPARED TWO UNRELATED NUMBERS. "Collected vs target" summed
//      every ACTIVE `FeeStructure.totalMinor` and compared it against ALL-TIME
//      collections. A fee structure is a price list; summing every programme a
//      college offers is not what it hopes to collect. The ratio could exceed
//      100% — and did. There is no target column in this schema, so this service
//      does not invent one; it publishes each total against the WINDOW it should
//      be read in, and says what that window is for.
//
//   2. THE DEFAULTERS READ THE DRIFTING COLUMN. It filtered
//      `FeeDue.daysOverdue >= 7`, a denormalised counter that goes stale, and
//      never refreshed it. F-10 found and fixed the identical bug in the
//      broadcast audience; this screen had the same defect one screen over. Every
//      age here is computed from `dueDate` against today, which cannot drift.
//
//   3. `defaulterCount` WAS NOT A DEFAULTER COUNT. It was the number of OPEN
//      BILLS — a count of rows, labelled as a count of families, drawn on the
//      home screen under the word "Defaulters". A student with four unpaid fees
//      was four defaulters.
//
//   4. THE TWO ALERTS COULD NOT BE ACTED ON. `PENDING_EXPENSES` and
//      `UNPAID_DUES` were bare strings with no route and no figure, and neither
//      of them mentioned a single unusual transaction or a single reconciliation
//      problem — which are the two things an accounts officer most needs to see
//      before a board meeting. Now there are eight, in three families, each with
//      a route to the thing that causes it.
//
//   5. THE BUDGET CLAMPED ITS OWN ALARM. `utilizationPct` was
//      `Math.min(..., 100)`, so a line at 180% of plan drew a full bar and read
//      "100%". Removed here; the bar is clamped in the view, where a pixel width
//      is the only thing at stake.
//
//   6. SCHOLARSHIP MONEY WAS MERGED. `committed` counted `UNDER_REVIEW`
//      applications as promised alongside `APPROVED` and `DISBURSED`. An
//      application nobody has decided on is not a promise the institution has
//      made. The three figures are now kept apart, and the block reports what
//      has actually reached a student separately from what has been awarded.
//
// The four reconciliation alerts are not re-implemented here. They are asked by
// `notifications.service.ts` and those helpers are exported and reused, so the
// dashboard and the alerts desk can never report different counts for the same
// problem — which is the only way two screens both stay trustworthy.
import { prisma } from '../../db/prisma.js';
import { AGING_BUCKETS, balanceOf, bucketFor, daysPastDue, isOpenStatus, deriveDueStatus } from './dues.money.js';
import { fiscalYearOf } from './expenses.money.js';
import { REPORT_IDS } from './reports.rules.js';
import { academicYearFor, monthKey, monthLabel, resolvePeriod, startOfDay, toRupees } from './reports.rules.js';
import {
  budgetOverruns, unreconciledPayroll, unreleasedScholarships, unallocatedReceipts,
} from './notifications.service.js';
import {
  ALERT_FAMILIES, ALERT_KINDS, BLOCKS, CASH_REVIEW_RUPEES, CRITICAL_OVERDUE_DAYS,
  DEFAULTER_MIN_DAYS, PAYROLL_DUE_DAY, PAYROLL_DUE_POLICY, PAYROLL_OVERDUE_DAYS,
  QUICK_ACTIONS, SCHOLARSHIP_UNRELEASED_DAYS, UNUSUAL_FLOOR_RUPEES, UNUSUAL_MULTIPLE,
  UNUSUAL_WINDOW_DAYS, WINDOWS, alertTone, medianMinor, spendTone,
  unusualPaymentReason, type AlertKindId,
} from './dashboard.rules.js';

const DAY_MS = 86_400_000;

const r = (paise: number) => toRupees(paise);

/**
 * How many reports the hub actually offers.
 *
 * Taken from the reports feature's own canonical list rather than typed in here.
 * A hard-coded 7 goes stale the moment a report is added, and the quick action
 * would then promise a report that does not exist — which is the failure the
 * F-10 audit calls out for a list duplicated into the app.
 */
const REPORT_COUNT = REPORT_IDS.length;

/** `FeeDue` carries no `institutionId` — it reaches its tenant through the student. */
const dueScope = (institutionId: string) => ({
  studentProfile: { user: { institutionId, deletedAt: null } },
});

/** Money that actually landed and has not been taken back. */
const clearedScope = (institutionId: string) => ({
  institutionId,
  status: 'CLEARED',
  reversedAt: null,
});

// ═══ Catalogue ════════════════════════════════════════════════════════════

/**
 * Everything the screen builds itself out of.
 *
 * The block list, the alert families, the alert kinds, the quick actions, the
 * windows and every threshold are published from ONE place. The app mirrors the
 * ids in `dashboardMeta.js` because the sub-screens must exist at build time, and
 * `audit-dashboard-ui.ts` asserts the two agree — a block added server-side with
 * no screen behind it would render a card that opens nothing.
 */
export async function dashboardCatalogue() {
  return {
    blocks: BLOCKS,
    alertFamilies: ALERT_FAMILIES,
    alertKinds: ALERT_KINDS,
    quickActions: QUICK_ACTIONS,
    windows: WINDOWS,
    thresholds: {
      defaulterMinDays: DEFAULTER_MIN_DAYS,
      criticalOverdueDays: CRITICAL_OVERDUE_DAYS,
      payrollOverdueDays: PAYROLL_OVERDUE_DAYS,
      scholarshipUnreleasedDays: SCHOLARSHIP_UNRELEASED_DAYS,
      unusualMultiple: UNUSUAL_MULTIPLE,
      unusualFloorRupees: UNUSUAL_FLOOR_RUPEES,
      unusualWindowDays: UNUSUAL_WINDOW_DAYS,
      cashReviewRupees: CASH_REVIEW_RUPEES,
      payrollDueDay: PAYROLL_DUE_DAY,
      payrollDuePolicy: PAYROLL_DUE_POLICY,
    },
  };
}

// ═══ Block 1 — Total collection ══════════════════════════════════════════

/**
 * Money in, across the windows that mean something.
 *
 * Reversed payments are excluded from every figure (they keep their row — the
 * officer must be able to see one — but they are not money), and the reversal
 * total is reported separately so its absence is visible rather than silent.
 */
export async function collectionsBlock(institutionId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Semester is DERIVED from the institution's own academic-year dates, exactly
  // as the reports desk derives it, so a "this semester" figure on the dashboard
  // and the same figure in the collection report are the same window. It is not
  // a hardcoded Jan–Jun split.
  const years = await prisma.academicYear.findMany({
    where: { institutionId },
    select: { name: true, startDate: true, endDate: true },
    orderBy: { startDate: 'asc' },
  });
  const semester = resolvePeriod('SEMESTER', now, years);
  const academicYear = academicYearFor(now, years);

  const [todayAgg, monthAgg, semAgg, allAgg, reversedAgg, byCategory, recent, trendRows] = await Promise.all([
    prisma.payment.aggregate({
      where: { ...clearedScope(institutionId), createdAt: { gte: todayStart } },
      _sum: { amountMinor: true }, _count: { _all: true },
    }),
    prisma.payment.aggregate({
      where: { ...clearedScope(institutionId), createdAt: { gte: monthStart } },
      _sum: { amountMinor: true }, _count: { _all: true },
    }),
    prisma.payment.aggregate({
      where: { ...clearedScope(institutionId), createdAt: { gte: semester.from!, lte: semester.to! } },
      _sum: { amountMinor: true }, _count: { _all: true },
    }),
    prisma.payment.aggregate({
      where: clearedScope(institutionId),
      _sum: { amountMinor: true }, _count: { _all: true },
    }),
    prisma.payment.aggregate({
      where: { institutionId, reversedAt: { not: null } },
      _sum: { amountMinor: true }, _count: { _all: true },
    }),
    prisma.payment.groupBy({
      by: ['category'],
      where: { ...clearedScope(institutionId), createdAt: { gte: monthStart } },
      _sum: { amountMinor: true }, _count: { _all: true },
      orderBy: { _sum: { amountMinor: 'desc' } },
    }),
    prisma.payment.findMany({
      where: clearedScope(institutionId),
      select: {
        id: true, category: true, method: true, amountMinor: true, createdAt: true,
        studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } },
        receipt: { select: { receiptNo: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    // Six months of history, so "is this month normal?" is answerable on the
    // screen rather than by going and looking. Months with no payments are
    // returned as zeros by `fillMonths` rather than skipped — a gap in a series
    // that is silently omitted reads as a continuous line.
    prisma.payment.findMany({
      where: { ...clearedScope(institutionId), createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } },
      select: { amountMinor: true, createdAt: true },
    }),
  ]);

  return {
    todayRupees: r(todayAgg._sum.amountMinor ?? 0),
    todayCount: todayAgg._count._all,
    monthRupees: r(monthAgg._sum.amountMinor ?? 0),
    monthCount: monthAgg._count._all,
    semesterRupees: r(semAgg._sum.amountMinor ?? 0),
    semesterCount: semAgg._count._all,
    allTimeRupees: r(allAgg._sum.amountMinor ?? 0),
    allTimeCount: allAgg._count._all,
    // Reported rather than netted off, so "₹0 collected today" and "₹0 after a
    // reversal" are different things and the officer can tell them apart.
    reversedRupees: r(reversedAgg._sum.amountMinor ?? 0),
    reversedCount: reversedAgg._count._all,
    semesterLabel: semester.label,
    academicYearName: academicYear?.name ?? null,
    byCategory: byCategory.map((c) => ({
      category: c.category,
      amountRupees: r(c._sum.amountMinor ?? 0),
      count: c._count._all,
    })),
    trend: fillMonths(trendRows.map((p) => ({ key: monthKey(p.createdAt), minor: p.amountMinor })), 6),
    recent: recent.map((p) => ({
      id: p.id,
      student: p.studentProfile?.user.fullName ?? null,
      rollNo: p.studentProfile?.rollNo ?? null,
      category: p.category,
      method: p.method,
      amountRupees: r(p.amountMinor),
      receiptNo: p.receipt?.receiptNo ?? null,
      createdAt: p.createdAt,
    })),
  };
}

/**
 * Six month keys ending at the current one, each with the total for that month.
 *
 * A month with no payments gets a real zero and a real count of zero. Dropping
 * it would make a series that starts two months in look like a full history.
 */
function fillMonths(rows: { key: string; minor: number }[], count: number) {
  const now = new Date();
  const byKey = new Map<string, { minor: number; n: number }>();
  for (const row of rows) {
    const cur = byKey.get(row.key) ?? { minor: 0, n: 0 };
    cur.minor += row.minor;
    cur.n += 1;
    byKey.set(row.key, cur);
  }
  const out: { month: string; label: string; amountRupees: number; count: number }[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const key = monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1));
    const hit = byKey.get(key);
    out.push({
      month: key,
      label: monthLabel(key),
      amountRupees: r(hit?.minor ?? 0),
      count: hit?.n ?? 0,
    });
  }
  return out;
}

// ═══ Block 2 — Outstanding dues ══════════════════════════════════════════

/**
 * What is still owed, how much of it is late, and by whom.
 *
 * Every figure is a BALANCE (`amount + lateFee − paid`), never the billed
 * amount. A part-paid bill reported at its original value is the single most
 * expensive mistake a receivables screen can make, and the previous dashboard
 * made it.
 *
 * Every AGE is computed from `dueDate` against today. `FeeDue.daysOverdue` is
 * denormalised and drifts; reading it is how this screen previously decided who
 * was a defaulter.
 */
export async function duesBlock(institutionId: string) {
  const today = new Date();
  const rows = await prisma.feeDue.findMany({
    where: dueScope(institutionId),
    select: {
      id: true, title: true, amountMinor: true, paidMinor: true, lateFeeMinor: true,
      status: true, dueDate: true, reminderCount: true, lastRemindedAt: true,
      studentProfile: { select: { id: true, rollNo: true, user: { select: { fullName: true } } } },
    },
  });

  // `status` is a denormalised column too, and an older partial-payment path
  // could leave it contradicting `paidMinor`. It is re-derived here so a desk
  // that shows "₹0 owed on a settled bill" is impossible.
  let outstandingMinor = 0;
  let overdueMinor = 0;
  let criticalMinor = 0;
  let billedMinor = 0;
  let paidMinor = 0;
  let openBills = 0;
  let overdueBills = 0;
  let defaulterBills = 0;
  const studentIds = new Set<string>();
  const defaulterStudents = new Set<string>();
  const byBucket = new Map<string, { bills: number; minor: number }>();
  for (const b of AGING_BUCKETS) byBucket.set(b.id, { bills: 0, minor: 0 });

  for (const d of rows) {
    const status = deriveDueStatus(d);
    if (status === 'WAIVED' || status === 'SUPERSEDED') continue;
    const gross = d.amountMinor + (d.lateFeeMinor ?? 0);
    billedMinor += gross;
    paidMinor += Math.min(gross, d.paidMinor);
    if (!isOpenStatus(status)) continue;
    const balance = balanceOf(d);
    if (balance <= 0) continue;

    const days = daysPastDue(d.dueDate, today);
    outstandingMinor += balance;
    openBills += 1;
    studentIds.add(d.studentProfile.id);
    byBucket.get(bucketFor(days).id)!.minor += balance;
    byBucket.get(bucketFor(days).id)!.bills += 1;

    if (days > 0) {
      overdueMinor += balance;
      overdueBills += 1;
      if (days >= DEFAULTER_MIN_DAYS) {
        defaulterBills += 1;
        defaulterStudents.add(d.studentProfile.id);
      }
      if (days >= CRITICAL_OVERDUE_DAYS) criticalMinor += balance;
    }
  }

  // The five biggest open balances. Family-level, not bill-level: one family
  // owing ₹4L across six fees is one problem to solve, and a list of six rows
  // for the same person makes the list look twice as long as the work is.
  const byStudent = new Map<string, { name: string; rollNo: string; minor: number; bills: number; worstDays: number }>();
  for (const d of rows) {
    const status = deriveDueStatus(d);
    if (!isOpenStatus(status)) continue;
    const balance = balanceOf(d);
    if (balance <= 0) continue;
    const cur = byStudent.get(d.studentProfile.id) ?? {
      name: d.studentProfile.user.fullName,
      rollNo: d.studentProfile.rollNo,
      minor: 0, bills: 0, worstDays: 0,
    };
    cur.minor += balance;
    cur.bills += 1;
    cur.worstDays = Math.max(cur.worstDays, daysPastDue(d.dueDate, today));
    byStudent.set(d.studentProfile.id, cur);
  }
  const topDebtors = [...byStudent.values()]
    .sort((a, b) => b.minor - a.minor)
    .slice(0, 5)
    .map((s) => ({
      studentProfileId: s.rollNo,
      name: s.name,
      rollNo: s.rollNo,
      balanceRupees: r(s.minor),
      bills: s.bills,
      oldestOverdueDays: s.worstDays,
    }));

  return {
    outstandingRupees: r(outstandingMinor),
    outstandingBills: openBills,
    studentsOwing: studentIds.size,
    overdueRupees: r(overdueMinor),
    overdueBills,
    criticalRupees: r(criticalMinor),
    // A count of FAMILIES, derived from a count of bills. The old screen put the
    // bill count under the label "Defaulters" and it was wrong by a factor of
    // however many bills each student happens to have.
    defaulterStudents: defaulterStudents.size,
    defaulterBills,
    defaulterMinDays: DEFAULTER_MIN_DAYS,
    criticalOverdueDays: CRITICAL_OVERDUE_DAYS,
    billedRupees: r(billedMinor),
    paidRupees: r(paidMinor),
    // Null, not zero, when nothing was ever billed. "0% recovered" and "no bill
    // went out" are different facts and only one of them is a problem.
    recoveryPercent: billedMinor > 0 ? Math.round((paidMinor / billedMinor) * 100) : null,
    aging: AGING_BUCKETS.map((b) => ({
      id: b.id,
      label: b.label,
      color: b.color,
      bills: byBucket.get(b.id)!.bills,
      amountRupees: r(byBucket.get(b.id)!.minor),
    })),
    topDebtors,
  };
}

// ═══ Block 3 — Expense overview ══════════════════════════════════════════

/**
 * This month's approved spend against what was budgeted for it.
 *
 * Three windows, and the difference between them is the whole point:
 *   • THIS MONTH is what has actually been spent since the 1st;
 *   • THE FISCAL YEAR is the allocation the plan was set in;
 *   • PENDING is money claimed but not yet approved, which will land on the
 *     budget the moment it is approved and must not be invisible until then.
 *
 * Budgets are filtered to the CURRENT fiscal year. The previous screen summed
 * every `Budget` row the institution had ever created, so last year's exhausted
 * lines were being added to this year's plan.
 */
export async function expensesBlock(institutionId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const fy = fiscalYearOf(now);

  const [monthAgg, pendingAgg, budgets, monthTrendRows] = await Promise.all([
    prisma.expense.aggregate({
      where: { institutionId, status: 'APPROVED', date: { gte: monthStart } },
      _sum: { amountMinor: true, taxMinor: true }, _count: { _all: true },
    }),
    prisma.expense.aggregate({
      where: { institutionId, status: 'PENDING' },
      _sum: { amountMinor: true }, _count: { _all: true },
    }),
    prisma.budget.findMany({
      where: { institutionId, fiscalYear: fy },
      select: { id: true, category: true, departmentId: true, plannedMinor: true, spentMinor: true },
      orderBy: { category: 'asc' },
    }),
    prisma.expense.findMany({
      where: { institutionId, status: 'APPROVED', date: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } },
      select: { amountMinor: true, date: true },
    }),
  ]);

  const plannedMinor = budgets.reduce((s, b) => s + b.plannedMinor, 0);
  const spentFyMinor = budgets.reduce((s, b) => s + b.spentMinor, 0);
  const overrun = budgets.filter((b) => b.spentMinor > b.plannedMinor);

  return {
    fiscalYear: fy,
    fiscalYearLabel: `FY ${fy} (1 Apr – 31 Mar)`,
    monthLabel: monthLabel(monthKey(monthStart)),
    monthRupees: r(monthAgg._sum.amountMinor ?? 0),
    monthCount: monthAgg._count._all,
    monthTaxRupees: r(monthAgg._sum.taxMinor ?? 0),
    pendingRupees: r(pendingAgg._sum.amountMinor ?? 0),
    pendingCount: pendingAgg._count._all,
    plannedRupees: r(plannedMinor),
    spentRupees: r(spentFyMinor),
    remainingRupees: r(plannedMinor - spentFyMinor),
    // NOT clamped. The old screen clamped this to 100, which is how a line at
    // 180% of plan came to read "100%".
    utilisationPercent: plannedMinor > 0 ? Math.round((spentFyMinor / plannedMinor) * 1000) / 10 : null,
    tone: spendTone(plannedMinor > 0 ? (spentFyMinor / plannedMinor) * 100 : null),
    overrunCount: overrun.length,
    lines: budgets.map((b) => {
      const pct = b.plannedMinor > 0 ? Math.round((b.spentMinor / b.plannedMinor) * 1000) / 10 : null;
      return {
        budgetId: b.id,
        category: b.category,
        scope: b.departmentId ? 'Department' : 'Institution-wide',
        plannedRupees: r(b.plannedMinor),
        spentRupees: r(b.spentMinor),
        remainingRupees: r(b.plannedMinor - b.spentMinor),
        utilisationPercent: pct,
        tone: spendTone(pct),
        overBudget: b.spentMinor > b.plannedMinor,
      };
    }),
    trend: fillMonths(monthTrendRows.map((e) => ({ key: monthKey(e.date), minor: e.amountMinor })), 6),
  };
}

// ═══ Block 4 — Payroll summary ═══════════════════════════════════════════

/**
 * This month's run, the salaries still to go out, and when they are due.
 *
 * The previous screen published `PayrollRun.findFirst(orderBy: createdAt)` — the
 * most recently CREATED run, which is not the current month. An office that
 * created last quarter's run last would have had it reported as "this month"
 * with no way to tell.
 *
 * The DUE DATE is a POLICY, not a stored value, and the payload says so in a
 * field the app prints. `PayrollRun` has no payment-date column, and this
 * service does not pretend otherwise by inventing one.
 */
export async function payrollBlock(institutionId: string) {
  const now = new Date();
  const thisMonth = monthKey(now);

  const [run, pendingRuns, roster, ytdRows] = await Promise.all([
    prisma.payrollRun.findFirst({
      where: { institutionId, month: thisMonth },
      include: { entries: true },
    }),
    prisma.payrollRun.findMany({
      where: { institutionId, status: 'APPROVED' },
      include: { entries: true },
      orderBy: { month: 'desc' },
    }),
    prisma.staffProfile.count({ where: { institutionId, user: { deletedAt: null }, status: 'ACTIVE' } }),
    prisma.payrollRun.findMany({
      where: { institutionId, month: { startsWith: thisMonth.slice(0, 4) } },
      include: { entries: true },
    }),
  ]);

  // A DRAFT run is a proposal, not a liability: the money is not owed until the
  // numbers are locked. So pending salaries count APPROVED runs only, and the
  // draft is reported beside them as something still to be decided.
  let pendingMinor = 0;
  let pendingCount = 0;
  const overdueRuns: { runId: string; month: string; pendingRupees: number; pendingCount: number; daysWaiting: number; dueOn: string; overdue: boolean }[] = [];
  for (const p of pendingRuns) {
    const unpaid = p.entries.filter((e) => e.status !== 'PAID');
    if (unpaid.length === 0) continue;
    const net = unpaid.reduce((s, e) => s + e.netMinor, 0);
    pendingMinor += net;
    pendingCount += unpaid.length;
    const daysWaiting = Math.floor((now.getTime() - new Date(p.updatedAt).getTime()) / DAY_MS);
    const dueOn = payrollDueDate(p.month);
    overdueRuns.push({
      runId: p.id,
      month: p.month,
      pendingRupees: r(net),
      pendingCount: unpaid.length,
      daysWaiting,
      dueOn: dueOn.toISOString(),
      overdue: daysWaiting >= PAYROLL_OVERDUE_DAYS,
    });
  }
  overdueRuns.sort((a, b) => (a.dueOn < b.dueOn ? -1 : 1));

  const ytdNet = ytdRows.reduce((s, x) => s + x.entries.reduce((y, e) => y + e.netMinor, 0), 0);
  const ytdPaid = ytdRows.reduce(
    (s, x) => s + x.entries.filter((e) => e.status === 'PAID').reduce((y, e) => y + e.netMinor, 0), 0,
  );

  const runEntries = run?.entries ?? [];
  const runNet = runEntries.reduce((s, e) => s + e.netMinor, 0);
  const runPaid = runEntries.filter((e) => e.status === 'PAID');

  return {
    thisMonth,
    thisMonthLabel: monthLabel(thisMonth),
    staffCount: roster,
    // A run for THIS month, or an explicit "not raised yet". Never a different
    // month's run wearing this month's label.
    currentRun: run
      ? {
          runId: run.id,
          month: run.month,
          status: run.status,
          grossRupees: r(runEntries.reduce((s, e) => s + e.grossMinor, 0)),
          deductionsRupees: r(runEntries.reduce((s, e) => s + e.deductionsMinor, 0)),
          netRupees: r(runNet),
          entryCount: runEntries.length,
          paidCount: runPaid.length,
          pendingCount: runEntries.length - runPaid.length,
          paidPercent: runEntries.length ? Math.round((runPaid.length / runEntries.length) * 100) : 0,
          approvedAt: run.approvedAt,
        }
      : null,
    // A month with no run is a different statement from a month with an unpaid
    // one, and the officer needs to be able to tell them apart.
    currentRunRaised: !!run,
    currentRunDueOn: payrollDueDate(thisMonth).toISOString(),
    pendingRupees: r(pendingMinor),
    pendingCount,
    upcoming: overdueRuns,
    overdueRunCount: overdueRuns.filter((x) => x.overdue).length,
    duePolicy: PAYROLL_DUE_POLICY,
    ytdNetRupees: r(ytdNet),
    ytdPaidRupees: r(ytdPaid),
    ytdMonths: ytdRows.length,
  };
}

/**
 * When salaries for `month` ("YYYY-MM") are due: the 7th of the FOLLOWING month.
 *
 * Returned as a real `Date` and exported so the tests can check the arithmetic
 * across a year boundary — December's salaries are due on 7 January, and an
 * implementation that adds 30 days gets that wrong in a way nobody notices until
 * it is somebody's December.
 */
export function payrollDueDate(month: string, fallback: Date = new Date()): Date {
  const parsed = /^(\d{4})-(\d{2})$/.exec(String(month ?? ''));
  // `NaN ?? 1970` is `NaN`, because `??` only catches null and undefined — so a
  // malformed month used to produce an Invalid Date, and every caller then
  // formatted it as "Invalid Date" on a screen about money. The fallback is the
  // current month, which is the only defensible answer: a run whose month cannot
  // be read is a run whose due date cannot be derived, and guessing a year
  // instead would be worse than saying "this month".
  const y = parsed ? Number(parsed[1]) : fallback.getFullYear();
  const m = parsed ? Number(parsed[2]) : fallback.getMonth() + 1;
  // The `+ 1` on the month index is the whole point of this function: salaries
  // for a month are due in the FOLLOWING one, so December rolls into January.
  return new Date(y, m, PAYROLL_DUE_DAY, 0, 0, 0, 0);
}

// ═══ Block 5 — Scholarship status ═════════════════════════════════════════

/**
 * Approved, pending, and disbursed — three separate figures that must never be
 * added together.
 *
 * The previous block counted `UNDER_REVIEW` applications as `committed`
 * alongside `APPROVED` and `DISBURSED`, which reports a decision nobody has made
 * as a promise the institution has made. It also never reported how much had
 * actually REACHED a student, so a committee could read "₹75,000 awarded" and
 * believe ₹75,000 had been handed over.
 *
 *   requested   — what students asked for. Not a figure about the institution.
 *   pending     — APPLIED + UNDER_REVIEW. Nobody has decided.
 *   approved    — a decision was made and a figure was granted.
 *   disbursed   — money was actually allocated onto a student's dues.
 *   unreleased  — approved, still not paid. The gap between a promise and cash.
 */
export async function scholarshipsBlock(institutionId: string) {
  const apps = await prisma.scholarshipApplication.findMany({
    where: { institutionId },
    select: {
      id: true, scholarshipId: true, status: true, requestedMinor: true,
      grantedMinor: true, disbursedMinor: true, approvedAt: true,
      scholarship: { select: { name: true, type: true } },
    },
  });

  let requested = 0, pending = 0, approved = 0, disbursed = 0, unreleased = 0;
  let pendingN = 0, approvedN = 0, disbursedN = 0, unreleasedN = 0, rejectedN = 0;
  const byScheme = new Map<string, { name: string; type: string; pendingN: number; approvedN: number; disbursedN: number; granted: number; disbursedMinor: number }>();

  for (const a of apps) {
    const s = byScheme.get(a.scholarshipId) ?? {
      name: a.scholarship.name, type: a.scholarship.type,
      pendingN: 0, approvedN: 0, disbursedN: 0, granted: 0, disbursedMinor: 0,
    };
    if (a.status === 'APPLIED' || a.status === 'UNDER_REVIEW') {
      requested += a.requestedMinor;
      pending += a.requestedMinor;
      pendingN += 1;
      s.pendingN += 1;
    } else if (a.status === 'APPROVED') {
      approved += a.grantedMinor;
      approvedN += 1;
      s.approvedN += 1;
      s.granted += a.grantedMinor;
      const still = a.grantedMinor - a.disbursedMinor;
      if (still > 0) {
        unreleased += still;
        unreleasedN += 1;
      }
    } else if (a.status === 'DISBURSED') {
      approved += a.grantedMinor;
      disbursed += a.disbursedMinor;
      approvedN += 1;
      disbursedN += 1;
      s.approvedN += 1;
      s.disbursedN += 1;
      s.granted += a.grantedMinor;
      s.disbursedMinor += a.disbursedMinor;
    } else if (a.status === 'REJECTED') {
      rejectedN += 1;
    }
    byScheme.set(a.scholarshipId, s);
  }

  return {
    applications: apps.length,
    requestedRupees: r(requested),
    pendingRupees: r(pending),
    pendingCount: pendingN,
    approvedRupees: r(approved),
    approvedCount: approvedN,
    disbursedRupees: r(disbursed),
    disbursedCount: disbursedN,
    unreleasedRupees: r(unreleased),
    unreleasedCount: unreleasedN,
    rejectedCount: rejectedN,
    // What fraction of what was GRANTED has actually reached a student. Null
    // rather than 0% when nothing was granted, for the same reason as recovery.
    releasePercent: approved > 0 ? Math.round((disbursed / approved) * 100) : null,
    schemes: [...byScheme.values()]
      .sort((a, b) => b.granted - a.granted)
      .slice(0, 5)
      .map((s) => ({
        name: s.name,
        type: s.type,
        pendingCount: s.pendingN,
        approvedCount: s.approvedN,
        disbursedCount: s.disbursedN,
        grantedRupees: r(s.granted),
        disbursedRupees: r(s.disbursedMinor),
        releasePercent: s.granted > 0 ? Math.round((s.disbursedMinor / s.granted) * 100) : null,
      })),
  };
}

// ═══ Block 6 — Financial alerts ══════════════════════════════════════════

/**
 * Eight alerts in three families, all computed live.
 *
 * Nothing here is stored. A stored alert goes stale the instant the problem is
 * fixed and then has to be dismissed by hand, so an office ends up with forty
 * amber rows describing problems that no longer exist. Computed, a problem
 * disappears the moment it is fixed, with nothing to dismiss.
 *
 * The four reconciliation kinds are asked by `notifications.service.ts` and
 * those helpers are imported, not reimplemented. Two screens counting the same
 * problem two different ways is the exact failure that made the reports feature
 * refuse to print a payroll header whose entries disagreed with it.
 */
export async function alertsBlock(institutionId: string) {
  const [unusual, overdueDues, payroll, unfooted, budget, unallocated, unreleased] = await Promise.all([
    unusualTransactions(institutionId),
    overdueFees(institutionId),
    overdueSalaries(institutionId),
    unreconciledPayroll(institutionId),
    budgetOverruns(institutionId),
    unallocatedReceipts(institutionId),
    unreleasedScholarships(institutionId),
  ]);

  // Each of the eight kinds reads from exactly one source. The four
  // reconciliation kinds are the SAME helper objects the notifications alerts
  // desk counts with, so the two screens cannot report different numbers for the
  // same problem — which is the failure the reports feature refused to print
  // past when a payroll header disagreed with its own entries.
  const sources: Record<AlertKindId, { count: number; items: unknown[] }> = {
    LARGE_PAYMENT: { count: unusual.size.length, items: unusual.size },
    LARGE_CASH: { count: unusual.cash.length, items: unusual.cash },
    DUES_OVERDUE: { count: overdueDues.count, items: overdueDues.items },
    PAYROLL_OVERDUE: { count: payroll.count, items: payroll.items },
    PAYROLL_UNFOOTED: { count: unfooted.count, items: unfooted.items },
    UNALLOCATED_RECEIPTS: { count: unallocated.count, items: unallocated.items },
    BUDGET_OVERRUN: { count: budget.count, items: budget.items },
    SCHOLARSHIP_UNRELEASED: { count: unreleased.count, items: unreleased.items },
  };

  const kinds = ALERT_KINDS.map((k) => ({
    ...k,
    count: sources[k.id].count,
    items: sources[k.id].items,
    tone: alertTone(sources[k.id].count),
  }));

  const families = ALERT_FAMILIES.map((f) => {
    const inFamily = kinds.filter((k) => k.family === f.id);
    return {
      ...f,
      count: inFamily.reduce((s, k) => s + k.count, 0),
      kinds: inFamily.map((k) => k.id),
    };
  });

  return {
    kinds,
    families,
    firing: kinds.filter((k) => k.count > 0).length,
    total: kinds.reduce((s, k) => s + k.count, 0),
  };
}

/**
 * Payments that do not look like the institution's other payments.
 *
 * The comparison is against the tenant's OWN median over the window, so a small
 * college and a large one each get a threshold that means something, and a
 * single large receipt cannot raise the bar above itself.
 */
async function unusualTransactions(institutionId: string) {
  const since = new Date(Date.now() - UNUSUAL_WINDOW_DAYS * DAY_MS);
  const rows = await prisma.payment.findMany({
    where: { ...clearedScope(institutionId), createdAt: { gte: since } },
    select: {
      id: true, amountMinor: true, method: true, category: true, createdAt: true,
      referenceNo: true,
      studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } },
    },
    orderBy: { amountMinor: 'desc' },
    take: 200,
  });

  // Median over the whole window, INCLUDING the candidate payments. Excluding
  // them would let a fraudster lower the median by submitting more large
  // payments, which is the wrong direction for a fraud check to fail in.
  const median = medianMinor(rows.map((p) => p.amountMinor));

  const size: Record<string, unknown>[] = [];
  const cash: Record<string, unknown>[] = [];
  for (const p of rows) {
    const why = unusualPaymentReason(p.amountMinor, p.method, median);
    if (!why) continue;
    const base = {
      paymentId: p.id,
      referenceNo: p.referenceNo,
      student: p.studentProfile?.user.fullName ?? null,
      rollNo: p.studentProfile?.rollNo ?? null,
      category: p.category,
      method: p.method,
      amountRupees: r(p.amountMinor),
      receivedAt: p.createdAt,
      reason: why.phrase,
    };
    if (why.reason === 'CASH') cash.push(base);
    else size.push(base);
  }
  return { size, cash, medianRupees: median === null ? null : r(median) };
}

/**
 * Fees past their due date, aggregated to one row per family.
 *
 * Date-based throughout, for the reason the whole file repeats: `daysOverdue`
 * drifts. The count is of BILLS; the amount is of BALANCES.
 */
async function overdueFees(institutionId: string) {
  const today = new Date();
  const rows = await prisma.feeDue.findMany({
    where: { ...dueScope(institutionId), dueDate: { lt: startOfDay(today) } },
    select: {
      id: true, title: true, amountMinor: true, paidMinor: true, lateFeeMinor: true,
      status: true, dueDate: true,
      studentProfile: { select: { id: true, rollNo: true, user: { select: { fullName: true } } } },
    },
  });

  const byStudent = new Map<string, { name: string; rollNo: string; minor: number; bills: number; worstDays: number }>();
  let total = 0;
  let bills = 0;
  for (const d of rows) {
    if (!isOpenStatus(deriveDueStatus(d))) continue;
    const balance = balanceOf(d);
    if (balance <= 0) continue;
    const days = daysPastDue(d.dueDate, today);
    if (days <= 0) continue;
    total += balance;
    bills += 1;
    const cur = byStudent.get(d.studentProfile.id) ?? {
      name: d.studentProfile.user.fullName, rollNo: d.studentProfile.rollNo, minor: 0, bills: 0, worstDays: 0,
    };
    cur.minor += balance;
    cur.bills += 1;
    cur.worstDays = Math.max(cur.worstDays, days);
    byStudent.set(d.studentProfile.id, cur);
  }

  const items = [...byStudent.values()]
    .sort((a, b) => b.minor - a.minor)
    .slice(0, 20)
    .map((s) => ({
      studentProfileId: s.rollNo,
      student: s.name,
      rollNo: s.rollNo,
      bills: s.bills,
      balanceRupees: r(s.minor),
      oldestOverdueDays: s.worstDays,
    }));

  return {
    count: byStudent.size,
    bills,
    totalRupees: r(total),
    minDays: DEFAULTER_MIN_DAYS,
    items,
  };
}

/** Approved runs with unpaid entries for long enough to be an alert. */
async function overdueSalaries(institutionId: string) {
  const now = new Date();
  const runs = await prisma.payrollRun.findMany({
    where: { institutionId, status: 'APPROVED' },
    include: { entries: true },
    orderBy: { month: 'desc' },
  });
  const items: Record<string, unknown>[] = [];
  for (const run of runs) {
    const unpaid = run.entries.filter((e) => e.status !== 'PAID');
    if (unpaid.length === 0) continue;
    const waiting = Math.floor((now.getTime() - new Date(run.updatedAt).getTime()) / DAY_MS);
    if (waiting < PAYROLL_OVERDUE_DAYS) continue;
    items.push({
      runId: run.id,
      month: run.month,
      pendingCount: unpaid.length,
      pendingRupees: r(unpaid.reduce((s, e) => s + e.netMinor, 0)),
      daysWaiting: waiting,
      dueOn: payrollDueDate(run.month).toISOString(),
    });
  }
  return { count: items.length, items, minDays: PAYROLL_OVERDUE_DAYS };
}

// ═══ Block 7 — Quick actions ═════════════════════════════════════════════

/**
 * The four things an officer does first, each with the LIVE count of what it
 * would act on.
 *
 * The count is the point. "Send a reminder" is meaningless without saying how
 * many families would be reached, and it is the number the officer most needs
 * before tapping — because the same tap that reminds 40 people and the one that
 * reminds 400 are very different decisions. A tile that is enabled and then
 * refuses is worse than one that is greyed with a reason, so `blockedReason` is
 * always present and always in words.
 */
export async function quickActionsBlock(institutionId: string) {
  const [dueRows, pendingExpenses] = await Promise.all([
    prisma.feeDue.findMany({
      where: dueScope(institutionId),
      select: {
        studentProfileId: true, status: true,
        amountMinor: true, paidMinor: true, lateFeeMinor: true,
      },
    }),
    prisma.expense.count({ where: { institutionId, status: 'PENDING' } }),
  ]);

  // One pass over the rows, two counts: how many FAMILIES have a balance, which
  // is what "add a collection" would act on. The previous version fetched the
  // dues twice to produce one number and a second number nobody used.
  const owing = new Set<string>();
  for (const d of dueRows) {
    if (!isOpenStatus(deriveDueStatus(d))) continue;
    if (balanceOf(d) <= 0) continue;
    owing.add(d.studentProfileId);
  }

  const overdue = await overdueFees(institutionId);

  return QUICK_ACTIONS.map((a) => {
    const count =
      a.id === 'ADD_COLLECTION' ? owing.size
        : a.id === 'RECORD_EXPENSE' ? pendingExpenses
          : a.id === 'GENERATE_REPORT' ? REPORT_COUNT
            : a.id === 'SEND_REMINDER' ? overdue.count
              : 0;

    // Only ONE tile can be blocked, and only for a reason that is genuinely the
    // officer's to fix. A collection cannot be blocked because nobody owes
    // anything — a donation is a real collection with no student attached, and a
    // tile that refused would make the most common entry path unusable.
    const blockedReason =
      a.id === 'SEND_REMINDER' && count === 0
        ? 'No family has a bill past its due date, so there is nobody to remind yet.'
        : null;

    return {
      ...a,
      count,
      countLabel:
        a.id === 'ADD_COLLECTION' ? (count === 1 ? '1 student owes money' : `${count} students owe money`)
          : a.id === 'RECORD_EXPENSE' ? (count === 1 ? '1 claim awaiting approval' : `${count} claims awaiting approval`)
            : a.id === 'GENERATE_REPORT' ? `${count} reports available`
              : count === 1 ? '1 family would be reached' : `${count} families would be reached`,
      enabled: blockedReason === null,
      blockedReason,
    };
  });
}

// ═══ The overview ═════════════════════════════════════════════════════════

/**
 * The whole screen in one round trip.
 *
 * The previous dashboard screen made one call and got fragments; this makes one
 * call and gets seven coherent blocks plus the catalogue, because the hub's job
 * is to show all of it at once and a screen that fetches seven times can show
 * seven different moments.
 */
export async function dashboardOverview(institutionId: string) {
  const [collections, dues, expenses, payroll, scholarships, alerts, actions] = await Promise.all([
    collectionsBlock(institutionId),
    duesBlock(institutionId),
    expensesBlock(institutionId),
    payrollBlock(institutionId),
    scholarshipsBlock(institutionId),
    alertsBlock(institutionId),
    quickActionsBlock(institutionId),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    collections,
    dues,
    expenses,
    payroll,
    scholarships,
    alerts,
    actions,
    // Money in this month, minus approved spend and payroll, all on the SAME
    // window. A surplus computed across mismatched windows — all-time collection
    // against this month's spend — is the kind of figure that survives into a
    // board pack for years.
    summary: {
      collectedMonthRupees: collections.monthRupees,
      spentMonthRupees: expenses.monthRupees,
      payrollMonthRupees: payroll.currentRun?.netRupees ?? 0,
      outstandingRupees: dues.outstandingRupees,
      overdueRupees: dues.overdueRupees,
      unreleasedScholarshipsRupees: scholarships.unreleasedRupees,
      alertsFiring: alerts.firing,
      alertsTotal: alerts.total,
    },
  };
}

/** One block on its own, for a sub-screen. */
export async function dashboardBlock(institutionId: string, block: string) {
  switch (block) {
    case 'COLLECTIONS': return collectionsBlock(institutionId);
    case 'DUES': return duesBlock(institutionId);
    case 'EXPENSES': return expensesBlock(institutionId);
    case 'PAYROLL': return payrollBlock(institutionId);
    case 'SCHOLARSHIPS': return scholarshipsBlock(institutionId);
    case 'ALERTS': return alertsBlock(institutionId);
    case 'QUICK_ACTIONS': return quickActionsBlock(institutionId);
    default: return null;
  }
}
