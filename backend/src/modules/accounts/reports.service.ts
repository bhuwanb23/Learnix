// F-09 Reports — the reporting centre (docs/users/06 §3.8).
//
// Seven reports behind one period selector. Three rules hold everywhere in this
// file:
//
//  1. TENANT SCOPE ON EVERY QUERY. The previous `getReports` aggregated
//     `feeDue` with NO filter at all. `FeeDue` carries no `institutionId` — it
//     reaches an institution through its student — so an unfiltered groupBy sums
//     every tenant's dues into one institution's "outstanding" headline. Every
//     dues query here goes through `studentProfile.user.institutionId`.
//
//  2. BALANCES, NOT BILLED AMOUNTS. "₹48 L unpaid" is a different and much
//     worse claim than "₹48 L billed, ₹31 L collected, ₹17 L still owing". A
//     part-paid bill still reported its original value in the old version.
//     Outstanding is always `amount + lateFee - paid`.
//
//  3. REVERSED MONEY IS EXCLUDED. A reversed payment keeps its row, because the
//     ledger must not lose history, but it stops counting toward collections.
import { prisma } from '../../db/prisma.js';
import { notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { AGING_BUCKETS } from './dues.money.js';
import {
  budgetVariance, growthPercent, monthKey, monthKeysBack, monthLabel, monthShortLabel,
  groupByGranularity, peak, PERIOD_META, PERIODS, recoveryStats, resolvePeriod, sharePercent,
  tally, trend, toRupees,
  type Granularity, type Period, type ResolvedPeriod, type ExportSheet,
} from './reports.rules.js';

/** Every due belongs to a student, and the student belongs to the institution. */
const duesScope = (institutionId: string) => ({
  studentProfile: { user: { institutionId } },
});

/** Collections are money that actually landed and has not been taken back. */
const clearedScope = (institutionId: string) => ({
  institutionId,
  status: 'CLEARED',
  reversedAt: null,
});

const academicYearsFor = async (institutionId: string) =>
  prisma.academicYear.findMany({
    where: { institutionId },
    select: { name: true, startDate: true, endDate: true },
    orderBy: { startDate: 'asc' },
  });

async function resolveFor(institutionId: string, period: Period, anchor?: string): Promise<ResolvedPeriod> {
  const years = await academicYearsFor(institutionId);
  // An explicit anchor lets a caller ask for a historical window; it is parsed
  // as a local date so a tenant in another timezone still gets its own day.
  let when = new Date();
  if (anchor) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(anchor);
    if (!m) when = new Date(anchor);
    else when = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (Number.isNaN(when.getTime())) when = new Date();
  }
  return resolvePeriod(period, when, years);
}

const within = (p: ResolvedPeriod) => ({
  gte: p.from ?? undefined,
  lte: p.to ?? undefined,
}) as { gte?: Date; lte?: Date };

/**
 * `Expense.departmentId` and `Expense.budgetId` are bare scalars, NOT relations.
 * Prisma cannot `include` them, so the department and budget rows are fetched
 * once and joined here.
 */
const departmentNames = async (institutionId: string) =>
  new Map(
    (await prisma.department.findMany({ where: { institutionId }, select: { id: true, name: true } }))
      .map((d) => [d.id, d.name]),
  );

/** Money as rupees, for the wire. */
const r = (paise: number) => toRupees(paise);

// ── 1. Collections ────────────────────────────────────────────────────────

export async function collectionsReport(institutionId: string, period: Period, anchor?: string) {
  const p = await resolveFor(institutionId, period, anchor);
  const rows = await prisma.payment.findMany({
    where: { ...clearedScope(institutionId), createdAt: within(p) },
    select: {
      id: true, category: true, method: true, amountMinor: true, createdAt: true,
      studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalMinor = rows.reduce((s, x) => s + x.amountMinor, 0);
  const byCategory = tally(rows.map((x) => ({ key: x.category, label: x.category, amountMinor: x.amountMinor })));
  const byMethod = tally(rows.map((x) => ({ key: x.method, label: x.method, amountMinor: x.amountMinor })));

  // Daily buckets make the trend line on the screen a real one. A single point
  // per day across a month reads as noise; per-category totals do not trend.
  const byDay = new Map<string, { count: number; amountMinor: number }>();
  for (const x of rows) {
    const k = monthKey(x.createdAt);
    const hit = byDay.get(k) ?? { count: 0, amountMinor: 0 };
    hit.count += 1;
    hit.amountMinor += x.amountMinor;
    byDay.set(k, hit);
  }
  const daily = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => ({ key: k, label: monthShortLabel(k), count: v.count, amountMinor: v.amountMinor }));
  const trended = trend(daily);

  const unallocated = rows.filter((x) => !x.studentProfile).length;

  // The previous window, so "up 12%" has something to be up FROM.
  let previous = null;
  if (p.previousFrom) {
    const prev = await prisma.payment.aggregate({
      where: { ...clearedScope(institutionId), createdAt: { gte: p.previousFrom, lte: p.previousTo ?? undefined } },
      _sum: { amountMinor: true },
      _count: { _all: true },
    });
    previous = {
      label: p.previousLabel,
      totalRupees: r(prev._sum?.amountMinor ?? 0),
      count: prev._count?._all ?? 0,
      changePercent: growthPercent(totalMinor, prev._sum?.amountMinor ?? 0),
    };
  }

  return {
    period: p,
    totals: {
      collectedRupees: r(totalMinor),
      receipts: rows.length,
      averageReceiptRupees: rows.length ? r(Math.round(totalMinor / rows.length)) : 0,
      donationRupees: r(rows.filter((x) => x.category === 'DONATION').reduce((s, x) => s + x.amountMinor, 0)),
      unallocatedReceipts: unallocated,
    },
    previous,
    byCategory: byCategory.map((c) => ({
      category: c.key,
      count: c.count,
      amountRupees: r(c.amountMinor),
      sharePercent: sharePercent(c.amountMinor, totalMinor),
    })),
    byMethod: byMethod.map((c) => ({ method: c.key, count: c.count, amountRupees: r(c.amountMinor) })),
    trend: trended.map((d) => ({
      month: d.key,
      label: d.label,
      count: d.count,
      amountRupees: r(d.amountMinor),
      changePercent: d.changePercent,
    })),
    peakRupees: r(peak(trended.map((t) => t.amountMinor))),
    recent: rows.slice(0, 25).map((x) => ({
      id: x.id,
      category: x.category,
      method: x.method,
      amountRupees: r(x.amountMinor),
      date: x.createdAt.toISOString().slice(0, 10),
      student: x.studentProfile ? `${x.studentProfile.user.fullName} (${x.studentProfile.rollNo})` : 'Unallocated',
    })),
  };
}

// ── 2. Outstanding dues ───────────────────────────────────────────────────

export async function duesReport(institutionId: string, period: Period, anchor?: string) {
  const p = await resolveFor(institutionId, period, anchor);
  const dues = await prisma.feeDue.findMany({
    where: duesScope(institutionId),
    select: {
      id: true, title: true, amountMinor: true, paidMinor: true, lateFeeMinor: true,
      status: true, dueDate: true, daysOverdue: true,
      studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } },
    },
  });

  // Outstanding is the BALANCE. Billing a student ₹1,00,000 and collecting
  // ₹40,000 leaves ₹60,000 owing, and a report that says ₹1,00,000 is wrong by
  // ₹40,000.
  const open = dues.filter((d) => d.status !== 'WAIVED' && d.status !== 'CLEARED');
  const balance = (d: (typeof dues)[number]) =>
    Math.max(0, d.amountMinor + (d.lateFeeMinor ?? 0) - d.paidMinor);
  const outstandingMinor = open.reduce((s, d) => s + balance(d), 0);
  const billedMinor = open.reduce((s, d) => s + d.amountMinor + (d.lateFeeMinor ?? 0), 0);

  const recovery = recoveryStats(dues);

  // Ageing uses the SAME bands the dues desk and the collections desk render, so
  // a number on this report matches the number on the screen the user just saw.
  const buckets = AGING_BUCKETS.map((b) => {
    const rows = open.filter((d) => {
      const days = d.daysOverdue ?? daysBetween(d.dueDate, new Date());
      return days >= b.min && days <= b.max;
    });
    return {
      bucket: b.id,
      label: b.label,
      color: b.color,
      count: rows.length,
      amountRupees: r(rows.reduce((s, d) => s + balance(d), 0)),
      sharePercent: sharePercent(rows.reduce((s, d) => s + balance(d), 0), outstandingMinor),
    };
  });

  const byStudent = tally(
    open.map((d) => ({ key: d.studentProfile.rollNo, label: d.studentProfile.user.fullName, amountMinor: balance(d) })),
  );

  const waived = dues.filter((d) => d.status === 'WAIVED');
  const cleared = dues.filter((d) => d.status === 'CLEARED');

  // Payments INSIDE the window — what the period actually changed.
  let collectedInPeriod = null;
  if (p.from) {
    const agg = await prisma.payment.aggregate({
      where: { ...clearedScope(institutionId), createdAt: within(p) },
      _sum: { amountMinor: true },
      _count: { id: true },
    });
    collectedInPeriod = { amountRupees: r(agg._sum.amountMinor ?? 0), count: agg._count.id };
  }

  return {
    period: p,
    totals: {
      outstandingRupees: r(outstandingMinor),
      openBills: open.length,
      billedRupees: r(billedMinor),
      recoveredRupees: r(recovery.paidMinor),
      recoveryPercent: recovery.recoveryPercent,
      clearedBills: cleared.length,
      clearedRupees: r(cleared.reduce((s, d) => s + d.amountMinor + (d.lateFeeMinor ?? 0), 0)),
      waivedBills: waived.length,
      waivedRupees: r(waived.reduce((s, d) => s + d.amountMinor + (d.lateFeeMinor ?? 0), 0)),
      largestSingleBillRupees: r(peak(open.map(balance))),
    },
    collectedInPeriod,
    aging: buckets,
    topDebtors: byStudent.slice(0, 20).map((s) => ({
      rollNo: s.key,
      name: s.label,
      amountRupees: r(s.amountMinor),
      sharePercent: sharePercent(s.amountMinor, outstandingMinor),
    })),
  };
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((startOf(to).getTime() - startOf(from).getTime()) / 86400000);
}
const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// ── 3. Expenses ───────────────────────────────────────────────────────────

export async function expensesReport(institutionId: string, period: Period, anchor?: string) {
  const p = await resolveFor(institutionId, period, anchor);
  const [rows, deptNames, budgetRows] = await Promise.all([
    prisma.expense.findMany({
      where: { institutionId, date: within(p) },
      select: {
        id: true, title: true, category: true, subcategory: true, vendor: true, status: true,
        amountMinor: true, taxMinor: true, date: true, paymentMethod: true,
        departmentId: true, budgetId: true,
      },
      orderBy: { date: 'desc' },
    }),
    departmentNames(institutionId),
    prisma.budget.findMany({ where: { institutionId }, select: { id: true, category: true, plannedMinor: true } }),
  ]);
  const budgetCategoryById = new Map(budgetRows.map((b) => [b.id, b.category]));

  const approved = rows.filter((x) => x.status === 'APPROVED');
  const pending = rows.filter((x) => x.status === 'PENDING');
  const rejected = rows.filter((x) => x.status === 'REJECTED');
  const sum = (xs: typeof rows) => xs.reduce((s, x) => s + x.amountMinor, 0);

  // Budget lines are filtered to the period too, and `spentMinor` is RE-DERIVED
  // from the claims inside the window rather than read off the budget row, whose
  // stored figure is all-time.
  const budgets = budgetRows;
  const variance = budgetVariance(
    budgets.map((b) => ({
      key: b.category,
      label: b.category,
      plannedMinor: b.plannedMinor,
      spentMinor: approved
        .filter((x) => x.budgetId && budgetCategoryById.get(x.budgetId) === b.category)
        .reduce((s, x) => s + x.amountMinor, 0),
    })),
  );

  const byMonth = trend(
    monthKeysBack(period === 'ALL' ? 12 : 12, new Date())
      .map((k) => {
        const inMonth = rows.filter((x) => monthKey(x.date) === k);
        return { key: k, label: monthShortLabel(k), count: inMonth.length, amountMinor: sum(inMonth) };
      }),
  );

  let previous = null;
  if (p.previousFrom) {
    const prevRows = await prisma.expense.findMany({
      where: { institutionId, status: 'APPROVED', date: { gte: p.previousFrom, lte: p.previousTo ?? undefined } },
      select: { amountMinor: true },
    });
    previous = {
      label: p.previousLabel,
      totalRupees: r(sum(prevRows as never) || prevRows.reduce((s, x) => s + x.amountMinor, 0)),
      changePercent: growthPercent(sum(approved), prevRows.reduce((s, x) => s + x.amountMinor, 0)),
    };
  }

  return {
    period: p,
    totals: {
      claimedRupees: r(sum(rows)),
      approvedRupees: r(sum(approved)),
      pendingRupees: r(sum(pending)),
      rejectedRupees: r(sum(rejected)),
      taxRupees: r(approved.reduce((s, x) => s + x.taxMinor, 0)),
      claimCount: rows.length,
      averageClaimRupees: rows.length ? r(Math.round(sum(rows) / rows.length)) : 0,
      withVendor: rows.filter((x) => !!x.vendor).length,
    },
    previous,
    byCategory: tally(rows.map((x) => ({ key: x.category, label: x.category, amountMinor: x.amountMinor })))
      .map((c) => ({ category: c.key, count: c.count, amountRupees: r(c.amountMinor), sharePercent: sharePercent(c.amountMinor, sum(rows)) })),
    bySubcategory: tally(
      rows.filter((x) => !!x.subcategory).map((x) => ({ key: x.subcategory!, label: x.subcategory!, amountMinor: x.amountMinor })),
    ).map((c) => ({ subcategory: c.key, count: c.count, amountRupees: r(c.amountMinor) })),
    byVendor: tally(rows.filter((x) => !!x.vendor).map((x) => ({ key: x.vendor!, label: x.vendor!, amountMinor: x.amountMinor })))
      .map((c) => ({ vendor: c.key, count: c.count, amountRupees: r(c.amountMinor) })),
    budget: {
      plannedRupees: r(budgets.reduce((s, b) => s + b.plannedMinor, 0)),
      spentRupees: r(variance.reduce((s, v) => s + v.spentMinor, 0)),
      lines: variance.map((v) => ({
        category: v.key,
        plannedRupees: r(v.plannedMinor),
        spentRupees: r(v.spentMinor),
        remainingRupees: r(v.remainingMinor),
        utilisationPercent: v.utilisationPercent,
        overBudget: v.overBudget,
      })),
    },
    trend: byMonth.map((m) => ({ month: m.key, label: m.label, count: m.count, amountRupees: r(m.amountMinor), changePercent: m.changePercent })),
    statements: rows.slice(0, 100).map((x) => ({
      id: x.id,
      date: x.date.toISOString().slice(0, 10),
      title: x.title ?? x.category,
      category: x.category,
      vendor: x.vendor ?? '—',
      department: x.departmentId ? deptNames.get(x.departmentId) ?? 'Unknown department' : 'Institution-wide',
      status: x.status,
      amountRupees: r(x.amountMinor),
      taxRupees: r(x.taxMinor),
      method: x.paymentMethod ?? '—',
    })),
  };
}

// ── 4. Payroll ────────────────────────────────────────────────────────────

export async function payrollReport(institutionId: string, period: Period, anchor?: string) {
  const p = await resolveFor(institutionId, period, anchor);
  const runs = await prisma.payrollRun.findMany({
    where: { institutionId, ...(p.from ? { month: { gte: monthKey(p.from), lte: monthKey(p.to ?? new Date()) } } : {}) },
    orderBy: { month: 'asc' },
  });

  const withEntries = await Promise.all(
    runs.map(async (run) => {
      const agg = await prisma.payrollEntry.aggregate({
        where: { payrollRunId: run.id },
        _sum: { grossMinor: true, deductionsMinor: true, netMinor: true, lopDays: true },
        _count: { id: true },
      });
      return { run, agg };
    }),
  );

  const gross = withEntries.reduce((s, x) => s + (x.agg._sum.grossMinor ?? 0), 0);
  const deductions = withEntries.reduce((s, x) => s + (x.agg._sum.deductionsMinor ?? 0), 0);
  const net = withEntries.reduce((s, x) => s + (x.agg._sum.netMinor ?? 0), 0);
  const headcount = withEntries.reduce((s, x) => s + x.agg._count.id, 0);
  const lopDays = withEntries.reduce((s, x) => s + (x.agg._sum.lopDays ?? 0), 0);

  // The run header must foot to its own entries. When it does not, the report
  // says so rather than quietly printing the header — a report that reports a
  // figure the database cannot corroborate is worse than no report.
  const unfooted = withEntries
    .filter((x) =>
      (x.agg._sum.grossMinor ?? 0) !== x.run.grossMinor ||
      (x.agg._sum.deductionsMinor ?? 0) !== x.run.deductionsMinor ||
      (x.agg._sum.netMinor ?? 0) !== x.run.totalMinor)
    .map((x) => x.run.month);

  // Which deduction lines are actually being collected, by amount and label.
  const lineTotals = new Map<string, { label: string; amountMinor: number; count: number }>();
  for (const { run } of withEntries) {
    const entries = await prisma.payrollEntry.findMany({
      where: { payrollRunId: run.id },
      select: { deductionsJson: true },
    });
    for (const e of entries) {
      let lines: { label?: string; amountMinor?: number }[] = [];
      try {
        lines = JSON.parse(e.deductionsJson || '[]');
      } catch {
        continue;
      }
      for (const l of lines) {
        const key = l.label ?? 'Other';
        const hit = lineTotals.get(key) ?? { label: key, amountMinor: 0, count: 0 };
        hit.amountMinor += l.amountMinor ?? 0;
        hit.count += 1;
        lineTotals.set(key, hit);
      }
    }
  }

  return {
    period: p,
    totals: {
      grossRupees: r(gross),
      deductionsRupees: r(deductions),
      netRupees: r(net),
      runs: runs.length,
      entries: headcount,
      averageGrossRupees: headcount ? r(Math.round(gross / headcount)) : 0,
      lossOfPayDays: lopDays,
      deductionRatePercent: sharePercent(deductions, gross),
    },
    integrity: { unfootedMonths: unfooted, footsToEntries: unfooted.length === 0 },
    deductionLines: [...lineTotals.values()]
      .sort((a, b) => b.amountMinor - a.amountMinor)
      .map((l) => ({ label: l.label, count: l.count, amountRupees: r(l.amountMinor), sharePercent: sharePercent(l.amountMinor, deductions) })),
    runs: withEntries.map((x) => ({
      month: x.run.month,
      label: monthLabel(x.run.month),
      status: x.run.status,
      grossRupees: r(x.agg._sum.grossMinor ?? 0),
      deductionsRupees: r(x.agg._sum.deductionsMinor ?? 0),
      netRupees: r(x.agg._sum.netMinor ?? 0),
      headcount: x.agg._count.id,
      footsToEntries:
        (x.agg._sum.grossMinor ?? 0) === x.run.grossMinor &&
        (x.agg._sum.deductionsMinor ?? 0) === x.run.deductionsMinor &&
        (x.agg._sum.netMinor ?? 0) === x.run.totalMinor,
    })),
    trend: trend(runs.map((x) => {
      const e = withEntries.find((w) => w.run.id === x.id)!;
      return {
        key: x.month,
        label: monthShortLabel(x.month),
        count: e.agg._count.id,
        amountMinor: e.agg._sum.netMinor ?? 0,
      };
    })).map((t) => ({ month: t.key, label: t.label, headcount: t.count, netRupees: r(t.amountMinor), changePercent: t.changePercent })),
  };
}

// ── 5. Scholarships ───────────────────────────────────────────────────────

export async function scholarshipsReport(institutionId: string, period: Period, anchor?: string) {
  const p = await resolveFor(institutionId, period, anchor);
  const schemes = await prisma.scholarship.findMany({
    where: { institutionId },
    select: {
      id: true, name: true, type: true, status: true, budgetMinor: true, amountMode: true,
      academicYear: { select: { name: true } },
      applications: {
        select: {
          id: true, status: true, requestedMinor: true, grantedMinor: true, disbursedMinor: true,
          createdAt: true, disbursedAt: true,
          allocations: { select: { amountMinor: true, feeDue: { select: { title: true } } } },
          studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // The window filters WHICH APPLICATIONS the report counts, using the date the
  // money actually moved — an award disbursed last month belongs in last month's
  // report even though it was approved this month.
  const inWindow = (d: Date | null | undefined) => {
    if (!p.from) return true;
    if (!d) return false;
    return d >= p.from && d <= (p.to ?? new Date());
  };

  const rows = schemes.map((s) => {
    const apps = s.applications;
    const disbursed = apps.reduce((sum, a) => sum + a.disbursedMinor, 0);
    const awarded = apps.filter((a) => a.status === 'APPROVED' || a.status === 'DISBURSED').reduce((sum, a) => sum + a.grantedMinor, 0);
    const released = apps.filter((a) => inWindow(a.disbursedAt)).reduce((sum, a) => sum + a.disbursedMinor, 0);
    const budget = s.budgetMinor;
    return {
      id: s.id,
      name: s.name,
      type: s.type,
      status: s.status,
      academicYear: s.academicYear.name,
      applications: apps.length,
      approved: apps.filter((a) => a.status === 'APPROVED').length,
      rejected: apps.filter((a) => a.status === 'REJECTED').length,
      disbursed: apps.filter((a) => a.status === 'DISBURSED').length,
      requestedRupees: r(apps.reduce((sum, a) => sum + a.requestedMinor, 0)),
      awardedRupees: r(awarded),
      // Promised = granted on anything not yet fully settled. Kept separate from
      // `granted`, which is every rupee ever awarded including what has already
      // been released — conflating the two is how a scheme ends up reporting
      // twice its own budget as committed.
      committedRupees: r(apps.filter((a) => a.status === 'APPROVED' || a.status === 'UNDER_REVIEW').reduce((sum, a) => sum + a.grantedMinor, 0)),
      disbursedRupees: r(disbursed),
      releasedInPeriodRupees: r(released),
      awaitingRupees: r(Math.max(0, awarded - disbursed)),
      budgetRupees: budget === null ? null : r(budget),
      headroomRupees: budget === null ? null : r(Math.max(0, budget - awarded)),
      utilisationPercent: budget ? sharePercent(awarded, budget) : null,
      releasePercent: sharePercent(released, awarded),
      allocations: apps.reduce((sum, a) => sum + a.allocations.length, 0),
      creditedRupees: r(apps.reduce((sum, a) => sum + a.allocations.reduce((x, al) => x + al.amountMinor, 0), 0)),
    };
  });

  const totals = {
    schemes: schemes.length,
    openSchemes: schemes.filter((s) => s.status === 'OPEN').length,
    applications: schemes.reduce((s, x) => s + x.applications.length, 0),
    awardedRupees: rows.reduce((s, x) => s + x.awardedRupees, 0),
    disbursedRupees: rows.reduce((s, x) => s + x.disbursedRupees, 0),
    releasedInPeriodRupees: rows.reduce((s, x) => s + x.releasedInPeriodRupees, 0),
    committedRupees: rows.reduce((s, x) => s + x.committedRupees, 0),
    budgetRupees: rows.reduce((s, x) => s + (x.budgetRupees ?? 0), 0),
    creditedToDuesRupees: rows.reduce((s, x) => s + x.creditedRupees, 0),
    allocationRows: rows.reduce((s, x) => s + x.allocations, 0),
  };

  const allocationRows = await prisma.scholarshipAllocation.findMany({
    where: { application: { institutionId } },
    select: { amountMinor: true, feeDue: { select: { title: true } } },
  });

  return {
    period: p,
    totals: {
      ...totals,
      headroomRupees: Math.max(0, totals.budgetRupees - totals.awardedRupees),
      utilisationPercent: sharePercent(totals.awardedRupees, totals.budgetRupees),
      releasePercent: sharePercent(totals.releasedInPeriodRupees, totals.awardedRupees),
    },
    schemes: rows,
    creditedTo: tally(
      allocationRows.map((a) => ({ key: a.feeDue.title, label: a.feeDue.title, amountMinor: a.amountMinor })),
    ).map((t) => ({ title: t.key, count: t.count, amountRupees: r(t.amountMinor) })),
  };
}

// ── 6. Department-wise ────────────────────────────────────────────────────

export async function departmentsReport(institutionId: string, period: Period, anchor?: string) {
  const p = await resolveFor(institutionId, period, anchor);

  const departments = await prisma.department.findMany({
    where: { institutionId },
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' },
  });

  const expenses = await prisma.expense.findMany({
    where: { institutionId, date: within(p) },
    select: { departmentId: true, amountMinor: true, status: true, taxMinor: true },
  });
  const payrollEntries = await prisma.payrollEntry.findMany({
    where: { payrollRun: { institutionId, ...(p.from ? { month: { gte: monthKey(p.from), lte: monthKey(p.to ?? new Date()) } } : {}) } },
    select: { departmentName: true, netMinor: true, grossMinor: true },
  });

  // Payroll snapshots `departmentName` as TEXT (it is a historical document), so
  // it is matched by name. Expenses carry a real `departmentId`.
  const byName = new Map(departments.map((d) => [d.name, d]));
  const rows = departments.map((d) => {
    const spent = expenses.filter((e) => e.departmentId === d.id && e.status === 'APPROVED').reduce((s, e) => s + e.amountMinor, 0);
    const claimed = expenses.filter((e) => e.departmentId === d.id).reduce((s, e) => s + e.amountMinor, 0);
    const staffEntries = payrollEntries.filter((e) => e.departmentName === d.name);
    return {
      id: d.id,
      name: d.name,
      code: d.code,
      expenseRupees: r(spent),
      claimedRupees: r(claimed),
      taxRupees: r(expenses.filter((e) => e.departmentId === d.id && e.status === 'APPROVED').reduce((s, e) => s + e.taxMinor, 0)),
      payrollRupees: r(staffEntries.reduce((s, e) => s + e.netMinor, 0)),
      payrollGrossRupees: r(staffEntries.reduce((s, e) => s + e.grossMinor, 0)),
      staffPaid: staffEntries.length,
      claims: expenses.filter((e) => e.departmentId === d.id).length,
    };
  });

  const unattributed = expenses.filter((e) => !e.departmentId && e.status === 'APPROVED');
  const institutionWide: typeof rows[number] = {
    id: 'institution-wide',
    name: 'Institution-wide (no department)',
    code: '—',
    expenseRupees: r(unattributed.reduce((s, e) => s + e.amountMinor, 0)),
    claimedRupees: r(expenses.filter((e) => !e.departmentId).reduce((s, e) => s + e.amountMinor, 0)),
    taxRupees: r(unattributed.reduce((s, e) => s + e.taxMinor, 0)),
    payrollRupees: r(payrollEntries.filter((e) => !e.departmentName || !byName.has(e.departmentName)).reduce((s, e) => s + e.netMinor, 0)),
    payrollGrossRupees: r(payrollEntries.filter((e) => !e.departmentName || !byName.has(e.departmentName)).reduce((s, e) => s + e.grossMinor, 0)),
    staffPaid: payrollEntries.filter((e) => !e.departmentName || !byName.has(e.departmentName)).length,
    claims: expenses.filter((e) => !e.departmentId).length,
  };

  const all = [...rows, institutionWide];
  const spendTotal = all.reduce((s, x) => s + x.expenseRupees, 0);
  const payrollTotal = all.reduce((s, x) => s + x.payrollRupees, 0);

  return {
    period: p,
    totals: {
      departments: departments.length,
      expenseRupees: spendTotal,
      payrollRupees: payrollTotal,
      combinedRupees: spendTotal + payrollTotal,
      staffPaid: all.reduce((s, x) => s + x.staffPaid, 0),
      unattributedRupees: institutionWide.expenseRupees,
    },
    departments: all
      .map((d) => ({
        ...d,
        sharePercent: sharePercent(d.expenseRupees, spendTotal),
        costPerStaffRupees: d.staffPaid ? r(Math.round((d.expenseRupees * 100) / d.staffPaid)) : null,
      }))
      .sort((a, b) => b.expenseRupees - a.expenseRupees),
  };
}

// ── 7. Comparisons ────────────────────────────────────────────────────────

/**
 * Month-over-month / quarter / year comparison across the headline measures.
 *
 * Each series is built from the SAME per-month queries the single-period reports
 * use, so a comparison can never disagree with the report it summarises.
 */
export async function comparisonReport(institutionId: string, granularity: Period, anchor?: string) {
  const g: Granularity = (['MONTH', 'QUARTER', 'YEAR'] as Period[]).includes(granularity)
    ? (granularity as Granularity)
    : 'MONTH';
  const p = await resolveFor(institutionId, g, anchor);

  // The WINDOW is always the last 12 months — that is what makes the series a
  // comparison. `granularity` buckets those twelve months into the bars that are
  // drawn and exported. Both halves matter and neither substitutes for the other:
  // grouping alone (the old behaviour) changed a label and nothing else.
  const keys = monthKeysBack(12);
  const from = new Date(Number(keys[0].slice(0, 4)), Number(keys[0].slice(5, 7)) - 1, 1);
  const to = new Date();

  const [payments, expenses, runs, allocations] = await Promise.all([
    prisma.payment.findMany({
      where: { ...clearedScope(institutionId), createdAt: { gte: from, lte: to } },
      select: { createdAt: true, amountMinor: true },
    }),
    prisma.expense.findMany({
      where: { institutionId, status: 'APPROVED', date: { gte: from, lte: to } },
      select: { date: true, amountMinor: true },
    }),
    prisma.payrollRun.findMany({
      where: { institutionId, month: { gte: keys[0], lte: keys[keys.length - 1] } },
      select: { month: true, totalMinor: true, grossMinor: true, deductionsMinor: true },
    }),
    prisma.scholarshipAllocation.findMany({
      where: { application: { institutionId } },
      select: { amountMinor: true, createdAt: true },
    }),
  ]);

  const pick = (d: Date) => monthKey(d);
  const perMonth = (xs: { d: Date; amountMinor: number }[]) =>
    keys.map((k) => ({
      key: k,
      label: monthShortLabel(k),
      count: xs.filter((x) => pick(x.d) === k).length,
      amountMinor: xs.filter((x) => pick(x.d) === k).reduce((s, x) => s + x.amountMinor, 0),
    }));

  // Monthly first, then bucketed — the bucketing is a pure fold over the monthly
  // points, so the twelve-month total is identical whichever way it is drawn.
  const monthlyOf = (xs: { d: Date; amountMinor: number }[]) =>
    groupByGranularity(perMonth(xs), g);
  const monthlyCollected = perMonth(payments.map((x) => ({ d: x.createdAt, amountMinor: x.amountMinor })));
  const monthlySpent = perMonth(expenses.map((x) => ({ d: x.date, amountMinor: x.amountMinor })));
  const runMap = new Map(runs.map((x) => [x.month, x]));
  const monthlyPayroll = keys.map((k) => {
    const run = runMap.get(k);
    return { key: k, label: monthShortLabel(k), count: run ? 1 : 0, amountMinor: run?.totalMinor ?? 0 };
  });
  const monthlyReleased = perMonth(allocations.map((x) => ({ d: x.createdAt, amountMinor: x.amountMinor })));

  const collected = trend(groupByGranularity(monthlyCollected, g));
  const spent = trend(groupByGranularity(monthlySpent, g));
  const trendedPayroll = trend(groupByGranularity(monthlyPayroll, g));
  const released = trend(groupByGranularity(monthlyReleased, g));
  // Kept for the assertions that the grouping preserves the total.
  void monthlyOf;
  const monthsInWindow = keys.length;

  const cash = collected.map((c, i) => ({
    key: c.key,
    label: c.label,
    collectedMinor: c.amountMinor,
    spentMinor: spent[i]?.amountMinor ?? 0,
    netMinor: c.amountMinor - (spent[i]?.amountMinor ?? 0),
  }));

  const sumOf = (xs: { amountMinor: number }[]) => xs.reduce((s, x) => s + x.amountMinor, 0);
  const totalCollected = sumOf(collected);
  const totalSpent = sumOf(spent);
  const totalPayroll = sumOf(trendedPayroll);
  const totalReleased = sumOf(released);
  const best = [...collected].sort((a, b) => b.amountMinor - a.amountMinor)[0] ?? null;
  const worst = [...collected].sort((a, b) => a.amountMinor - b.amountMinor)[0] ?? null;

  return {
    period: p,
    granularity: g,
    months: monthsInWindow,
    /** How many months each bar covers — 1 for MONTH, 3 for QUARTER, 12 for YEAR. */
    monthsPerBar: g === 'MONTH' ? 1 : g === 'QUARTER' ? 3 : 12,
    bars: collected.length,
    totals: {
      collectedRupees: r(totalCollected),
      spentRupees: r(totalSpent),
      payrollRupees: r(totalPayroll),
      scholarshipsReleasedRupees: r(totalReleased),
      netRupees: r(totalCollected - totalSpent),
      // The one number a trustee asks for: money in, minus money out.
      surplusRupees: r(totalCollected - totalSpent - totalPayroll),
      averageCollectedRupees: r(Math.round(totalCollected / keys.length)),
      averageSpentRupees: r(Math.round(totalSpent / keys.length)),
    },
    best: best ? { month: best.key, label: monthLabel(best.key), amountRupees: r(best.amountMinor) } : null,
    worst: worst ? { month: worst.key, label: monthLabel(worst.key), amountRupees: r(worst.amountMinor) } : null,
    series: {
      collected: collected.map((c) => ({ month: c.key, label: c.label, amountRupees: r(c.amountMinor), count: c.count, changePercent: c.changePercent })),
      spent: spent.map((s) => ({ month: s.key, label: s.label, amountRupees: r(s.amountMinor), count: s.count, changePercent: s.changePercent })),
      payroll: trendedPayroll.map((s) => ({ month: s.key, label: s.label, netRupees: r(s.amountMinor), changePercent: s.changePercent, hasRun: s.count > 0 })),
      scholarships: released.map((s) => ({ month: s.key, label: s.label, amountRupees: r(s.amountMinor), changePercent: s.changePercent })),
      cash: cash.map((c) => ({
        month: c.key,
        label: c.label,
        collectedRupees: r(c.collectedMinor),
        spentRupees: r(c.spentMinor),
        netRupees: r(c.netMinor),
      })),
    },
    peakRupees: r(peak(collected.map((c) => c.amountMinor))),
  };
}

// ── Hub + catalogue ───────────────────────────────────────────────────────

/** The headline strip and the report catalogue the hub screen renders. */
export async function reportsOverview(institutionId: string, period: Period, anchor?: string) {
  const [collections, dues, expenses, payroll, scholarships] = await Promise.all([
    collectionsReport(institutionId, period, anchor),
    duesReport(institutionId, period, anchor),
    expensesReport(institutionId, period, anchor),
    payrollReport(institutionId, period, anchor),
    scholarshipsReport(institutionId, period, anchor),
  ]);

  const collected = collections.totals.collectedRupees;
  const spent = expenses.totals.approvedRupees;
  const payrollNet = payroll.totals.netRupees;

  return {
    period: collections.period,
    headline: {
      collectedRupees: collected,
      outstandingRupees: dues.totals.outstandingRupees,
      recoveryPercent: dues.totals.recoveryPercent,
      spentRupees: spent,
      payrollRupees: payrollNet,
      scholarshipsReleasedRupees: scholarships.totals.releasedInPeriodRupees,
      // Money in minus money out, including payroll. A positive number is the
      // only thing that makes the other five worth reading together.
      surplusRupees: collected - spent - payrollNet,
    },
    collections: collections.totals,
    dues: dues.totals,
    expenses: expenses.totals,
    payroll: payroll.totals,
    payrollIntegrity: payroll.integrity,
    scholarships: scholarships.totals,
  };
}

export async function reportCatalogue() {
  // `route` and `periodMeta` are published rather than hard-coded in the app:
  // the hub builds seven entry points and a period filter out of this payload,
  // and a screen that invented its own copy would drift from the server the
  // first time a route or a period changed.
  return {
    reports: [
      { id: 'collections', title: 'Collection report', blurb: 'What came in, by category, method and month.', icon: 'cash-outline', color: '#059669', route: '/reports/collections' },
      { id: 'dues', title: 'Outstanding dues', blurb: 'What is still owed, how old it is, and by whom.', icon: 'alert-circle-outline', color: '#dc2626', route: '/reports/dues' },
      { id: 'expenses', title: 'Expense statement', blurb: 'Claims by category and vendor, against the budget.', icon: 'receipt-outline', color: '#d97706', route: '/reports/expenses' },
      { id: 'payroll', title: 'Payroll report', blurb: 'Gross, deductions and net, month by month.', icon: 'card-outline', color: '#2563eb', route: '/reports/payroll' },
      { id: 'scholarships', title: 'Scholarship report', blurb: 'Awarded, released, and credited to which dues.', icon: 'ribbon-outline', color: '#7c3aed', route: '/reports/scholarships' },
      { id: 'departments', title: 'Department-wise', blurb: 'Spend and staff cost per department.', icon: 'business-outline', color: '#0284c7', route: '/reports/departments' },
      { id: 'comparison', title: 'Period comparison', blurb: 'Twelve months of collections, spend and payroll.', icon: 'trending-up-outline', color: '#4f46e5', route: '/reports/comparison' },
    ],
    periods: PERIODS,
    periodMeta: PERIODS.map((p) => ({ id: p, ...PERIOD_META[p] })),
    granularities: ['MONTH', 'QUARTER', 'YEAR'],
    formats: ['xlsx', 'csv', 'pdf'],
  };
}

// ── Export sheets ─────────────────────────────────────────────────────────

/**
 * Turn a report into spreadsheet sheets.
 *
 * The same `ExportSheet[]` feeds the workbook, the PDF and the CSV, so the three
 * exports can never show different numbers from each other.
 */
export async function exportSheets(
  report: string,
  institutionId: string,
  period: Period,
  anchor?: string,
  granularity?: Period,
): Promise<{ sheets: ExportSheet[]; title: string; subtitle: string }> {
  const { moneyColumn, numberColumn, textColumn } = await import('./reports.rules.js');
  void (await resolveFor(institutionId, period, anchor));

  if (report === 'collections') {
    const d = await collectionsReport(institutionId, period, anchor);
    return {
      title: 'Collection report',
      subtitle: `${d.period.label}${d.previous ? ` compared with ${d.period.previousLabel}` : ''} — cleared, unreversed receipts only`,
      sheets: [
        {
          name: 'By category',
          columns: [
            textColumn('Category', 'category'),
            numberColumn('Receipts', 'count'),
            moneyColumn('Amount (INR)', 'amountRupees'),
            numberColumn('Share %', 'sharePercent'),
          ],
          rows: d.byCategory as unknown as Record<string, unknown>[],
        },
        {
          name: 'By method',
          columns: [textColumn('Method', 'method'), numberColumn('Receipts', 'count'), moneyColumn('Amount (INR)', 'amountRupees')],
          rows: d.byMethod as unknown as Record<string, unknown>[],
        },
        {
          name: 'By month',
          columns: [
            textColumn('Month', 'label'),
            textColumn('Key', 'month'),
            numberColumn('Receipts', 'count'),
            moneyColumn('Amount (INR)', 'amountRupees'),
            numberColumn('Change %', 'changePercent'),
          ],
          rows: d.trend as unknown as Record<string, unknown>[],
        },
      ],
    };
  }

  if (report === 'dues') {
    const d = await duesReport(institutionId, period, anchor);
    return {
      title: 'Outstanding dues report',
      subtitle: `${d.period.label} — balances, not billed amounts`,
      sheets: [
        {
          name: 'Ageing',
          columns: [
            textColumn('Bucket', 'label'),
            numberColumn('Bills', 'count'),
            moneyColumn('Outstanding (INR)', 'amountRupees'),
            numberColumn('Share %', 'sharePercent'),
          ],
          rows: d.aging as unknown as Record<string, unknown>[],
        },
        {
          name: 'Top debtors',
          columns: [
            textColumn('Roll no', 'rollNo'),
            textColumn('Student', 'name'),
            moneyColumn('Outstanding (INR)', 'amountRupees'),
            numberColumn('Share %', 'sharePercent'),
          ],
          rows: d.topDebtors as unknown as Record<string, unknown>[],
        },
      ],
    };
  }

  if (report === 'expenses') {
    const d = await expensesReport(institutionId, period, anchor);
    return {
      title: 'Expense statement',
      subtitle: `${d.period.label} — approved claims against the planned budget`,
      sheets: [
        {
          name: 'By category',
          columns: [
            textColumn('Category', 'category'),
            numberColumn('Claims', 'count'),
            moneyColumn('Amount (INR)', 'amountRupees'),
            numberColumn('Share %', 'sharePercent'),
          ],
          rows: d.byCategory as unknown as Record<string, unknown>[],
        },
        {
          name: 'Budget variance',
          columns: [
            textColumn('Category', 'category'),
            moneyColumn('Planned (INR)', 'plannedRupees'),
            moneyColumn('Spent (INR)', 'spentRupees'),
            moneyColumn('Remaining (INR)', 'remainingRupees'),
            numberColumn('Utilisation %', 'utilisationPercent'),
            textColumn('Over budget', 'overBudget'),
          ],
          rows: d.budget.lines as unknown as Record<string, unknown>[],
        },
        {
          name: 'Statements',
          columns: [
            textColumn('Date', 'date'),
            textColumn('Title', 'title'),
            textColumn('Category', 'category'),
            textColumn('Vendor', 'vendor'),
            textColumn('Department', 'department'),
            textColumn('Status', 'status'),
            textColumn('Method', 'method'),
            moneyColumn('Amount (INR)', 'amountRupees'),
            moneyColumn('Tax (INR)', 'taxRupees'),
          ],
          rows: d.statements as unknown as Record<string, unknown>[],
        },
      ],
    };
  }

  if (report === 'payroll') {
    const d = await payrollReport(institutionId, period, anchor);
    return {
      title: 'Payroll report',
      subtitle: `${d.period.label}${d.integrity.footsToEntries ? '' : ' — WARNING: some months do not foot to their entries'}`,
      sheets: [
        {
          name: 'By month',
          columns: [
            textColumn('Month', 'label'),
            textColumn('Key', 'month'),
            textColumn('Status', 'status'),
            numberColumn('Staff', 'headcount'),
            moneyColumn('Gross (INR)', 'grossRupees'),
            moneyColumn('Deductions (INR)', 'deductionsRupees'),
            moneyColumn('Net (INR)', 'netRupees'),
            textColumn('Foots to entries', 'footsToEntries'),
          ],
          rows: d.runs as unknown as Record<string, unknown>[],
        },
        {
          name: 'Deduction lines',
          columns: [
            textColumn('Line', 'label'),
            numberColumn('Occurrences', 'count'),
            moneyColumn('Amount (INR)', 'amountRupees'),
            numberColumn('Share %', 'sharePercent'),
          ],
          rows: d.deductionLines as unknown as Record<string, unknown>[],
        },
      ],
    };
  }

  if (report === 'scholarships') {
    const d = await scholarshipsReport(institutionId, period, anchor);
    return {
      title: 'Scholarship report',
      subtitle: `${d.period.label} — awarded, released and credited against fee dues`,
      sheets: [
        {
          name: 'By scheme',
          columns: [
            textColumn('Scheme', 'name'),
            textColumn('Type', 'type'),
            textColumn('Year', 'academicYear'),
            textColumn('Status', 'status'),
            numberColumn('Applications', 'applications'),
            moneyColumn('Requested (INR)', 'requestedRupees'),
            moneyColumn('Awarded (INR)', 'awardedRupees'),
            moneyColumn('Committed (INR)', 'committedRupees'),
            moneyColumn('Released (INR)', 'disbursedRupees'),
            moneyColumn('Released in period (INR)', 'releasedInPeriodRupees'),
            moneyColumn('Budget (INR)', 'budgetRupees'),
            moneyColumn('Headroom (INR)', 'headroomRupees'),
            numberColumn('Utilisation %', 'utilisationPercent'),
            moneyColumn('Credited to dues (INR)', 'creditedRupees'),
          ],
          rows: d.schemes as unknown as Record<string, unknown>[],
        },
        {
          name: 'Credited against',
          columns: [textColumn('Fee due', 'title'), numberColumn('Allocations', 'count'), moneyColumn('Credited (INR)', 'amountRupees')],
          rows: d.creditedTo as unknown as Record<string, unknown>[],
        },
      ],
    };
  }

  if (report === 'departments') {
    const d = await departmentsReport(institutionId, period, anchor);
    return {
      title: 'Department-wise financial report',
      subtitle: `${d.period.label} — spend and staff cost per department`,
      sheets: [
        {
          name: 'Departments',
          columns: [
            textColumn('Department', 'name'),
            textColumn('Code', 'code'),
            numberColumn('Claims', 'claims'),
            moneyColumn('Expense (INR)', 'expenseRupees'),
            moneyColumn('Tax (INR)', 'taxRupees'),
            moneyColumn('Payroll net (INR)', 'payrollRupees'),
            numberColumn('Staff paid', 'staffPaid'),
            moneyColumn('Cost per staff (INR)', 'costPerStaffRupees'),
            numberColumn('Share %', 'sharePercent'),
          ],
          rows: d.departments as unknown as Record<string, unknown>[],
        },
      ],
    };
  }

  if (report === 'comparison') {
    // The comparison's OWN granularity is what buckets the bars — not the period
    // window. Passing `period` here (as an earlier version did) meant a screen
    // set to "by quarter" exported a file whose rows were still month keys.
    const d = await comparisonReport(institutionId, (granularity ?? 'MONTH') as Period, anchor);
    const bucket = d.granularity === 'MONTH' ? 'month' : d.granularity === 'QUARTER' ? 'quarter' : 'year';
    return {
      title: 'Period comparison',
      subtitle: `${d.months} months to date, grouped by ${bucket} — collected against spent`,
      sheets: [
        {
          name: 'Cash flow',
          columns: [
            textColumn(bucketLabel(d.granularity), 'label'),
            textColumn('Key', 'month'),
            moneyColumn('Collected (INR)', 'collectedRupees'),
            moneyColumn('Spent (INR)', 'spentRupees'),
            moneyColumn('Net (INR)', 'netRupees'),
          ],
          rows: d.series.cash as unknown as Record<string, unknown>[],
        },
        {
          name: 'Payroll net',
          columns: [
            textColumn(bucketLabel(d.granularity), 'label'),
            textColumn('Key', 'month'),
            moneyColumn('Net paid (INR)', 'netRupees'),
            numberColumn('Change %', 'changePercent'),
          ],
          rows: d.series.payroll as unknown as Record<string, unknown>[],
        },
        {
          name: 'Scholarships released',
          columns: [
            textColumn(bucketLabel(d.granularity), 'label'),
            textColumn('Key', 'month'),
            moneyColumn('Released (INR)', 'amountRupees'),
            numberColumn('Change %', 'changePercent'),
          ],
          rows: d.series.scholarships as unknown as Record<string, unknown>[],
        },
      ],
    };
  }

  throw notFound(`Unknown report "${report}"`);
}

/** The column heading for a comparison row, so a quarterly file does not say "Month". */
const bucketLabel = (g: string) =>
  g === 'QUARTER' ? 'Quarter' : g === 'YEAR' ? 'Year' : 'Month';

export { exportSheets as buildExportSheets };

/** Audit the export itself — a report leaves the building as a document. */
export async function auditExport(
  institutionId: string,
  actorUserId: string,
  report: string,
  format: string,
  period: Period,
): Promise<void> {
  await writeAudit({
    institutionId,
    actorUserId,
    action: 'REPORT_EXPORTED',
    entityType: 'Report',
    entityId: report,
    after: { format: format.toUpperCase(), period },
  });
}
