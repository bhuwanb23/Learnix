// Idempotent reporting-history seed (docs/users/06 §3.8).
//
// The comparison screens are a listed requirement, and they cannot be tested
// against two months of payments. This module gives the reporting layer a full
// year to compare, WITHOUT disturbing the balances the rest of the app depends on:
//
//   · Payments  — the DATE is redistributed across 12 months. Amounts,
//     allocations, students and receipts are untouched, so every rupee that was
//     already collected stays collected and no due changes balance. The most
//     recent payments keep their real dates so the "today / last 30 days"
//     collections windows still have something in them.
//   · Expenses  — extra APPROVED claims are added for the earlier months and the
//     budget's spentMinor is RECOMPUTED from the claims, never incremented.
//   · Payroll   — extra months are priced with the same prisma-free arithmetic
//     the live run engine uses (`payroll.components.ts`), so a seeded historical
//     run shows what the engine would actually have produced that month rather
//     than arbitrary numbers.
//
// Written as its own module and called from seed.ts for the same reason
// syncPayrollSalary.ts and syncScholarships.ts are: it needs the institution's
// REAL students, dues, salaries and departments to be meaningful.
import type { PrismaClient } from '@prisma/client';
import { computeFromComponents } from '../src/modules/accounts/payroll.components.js';
import { computeIncomeTax } from '../src/modules/accounts/payroll.tax.js';

type Db = PrismaClient;

/** The shape handed to `payrollRun.upsert`'s nested entry create. */
type EntryShape = {
  staffUserId: string;
  employeeNo: string | null;
  designation: string | null;
  departmentName: string | null;
  grossMinor: number;
  deductionsMinor: number;
  netMinor: number;
  lopDays: number;
  earningsJson: string;
  deductionsJson: string;
  status: string;
  paidAt: Date;
  salaryRecordId: string;
};

const HISTORY_MONTHS = 12;

/**
 * Marks a payroll run as THIS module's, so a later run can rebuild it and a
 * month seeded by somebody else is left strictly alone.
 */
const REPORT_HISTORY_NOTE = 'Seeded history for reporting comparisons.';
const isOurs = (notes: string | null) => (notes ?? '').includes(REPORT_HISTORY_NOTE);

/** Whole months back from now, oldest first, as `YYYY-MM`. */
function monthKeys(count: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

/** A day inside `month`, never in the future, so no row claims to be paid later. */
function dayIn(month: string, dayOfMonth: number): Date {
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const now = new Date();
  const d = new Date(y, m - 1, Math.min(dayOfMonth, lastDay), 10, 30, 0);
  return d > now ? now : d;
}

/**
 * Which month a payment belongs in for reporting purposes.
 *
 * Deterministic and STABLE for a given id: the same payment lands in the same
 * month on every run, which is what makes this module idempotent. The index is
 * taken from a hash of the id rather than from row order, so the assignment
 * does not shift when other payments are added or removed.
 */
function monthForPayment(id: string, months: string[], offset: number): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return months[(h + offset) % months.length];
}

export async function syncReportHistory(db: Db): Promise<void> {
  const institution = await db.institution.findFirst({
    where: { code: { not: '' } },
    orderBy: { createdAt: 'asc' },
  });
  if (!institution) {
    console.log('  - report history skipped: no institution');
    return;
  }
  const institutionId = institution.id;
  const months = monthKeys(HISTORY_MONTHS);
  const thisMonth = months[months.length - 1];

  // ── 1. Payments: move the DATE, never the money ─────────────────────────
  //
  // The newest few payments keep their real timestamp: the collections desk
  // reports "today" and "last 30 days", and emptying those windows would make an
  // unrelated feature look broken. The guard is a COUNT, not a date cutoff: on
  // a freshly built database every payment is inside the last 21 days, so a
  // date-based guard would skip all of them and leave the collection comparison
  // with a single month to plot.
  const payments = await db.payment.findMany({
    where: { institutionId, reversedAt: null },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  const KEEP_RECENT = 8;
  let moved = 0;
  for (const p of payments.slice(KEEP_RECENT)) {
    const target = monthForPayment(p.id, months, 0);
    const when = dayIn(target, 6 + (p.id.length % 20));
    if (
      when.getFullYear() === p.createdAt.getFullYear() &&
      when.getMonth() === p.createdAt.getMonth() &&
      when.getDate() === p.createdAt.getDate()
    ) {
      continue;
    }
    await db.payment.update({ where: { id: p.id }, data: { createdAt: when } });
    moved += 1;
  }

  // Guarantee the current month is never empty, so a "this month" report has a
  // figure to show even if every payment hashed into an earlier month.
  const monthStart = new Date(`${thisMonth}-01T00:00:00`);
  const inCurrent = await db.payment.count({
    where: { institutionId, createdAt: { gte: monthStart } },
  });
  if (inCurrent === 0 && payments.length > 0) {
    const keep = payments[payments.length - 1];
    await db.payment.update({
      where: { id: keep.id },
      data: { createdAt: dayIn(thisMonth, Math.max(1, Math.min(26, new Date().getDate()))) },
    });
  }

  // ── 2. Expenses: add the earlier months, recompute what is spent ───────
  const departments = await db.department.findMany({
    where: { institutionId },
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  });
  const budgets = await db.budget.findMany({
    where: { institutionId },
    select: { id: true, category: true, plannedMinor: true },
  });
  const budgetFor = (category: string) => budgets.find((b) => b.category === category) ?? null;

  const EXPENSE_CATEGORIES = ['LABS', 'EVENTS', 'MAINTENANCE', 'UTILITIES', 'MISC'];
  const VENDORS = ['Nova Supplies', 'Brightprint', 'Campus Services', 'Urban Graphics', 'Zenith Labs'];
  const requester = await db.user.findFirst({
    where: { institutionId, deletedAt: null },
    select: { id: true },
  });
  const approver = await db.user.findFirst({
    where: { institutionId, deletedAt: null },
    select: { id: true },
  });
  if (!requester || !approver || !budgets.length) {
    console.log('  - report history expenses skipped: no users or budgets');
    console.log(`\u2713 report history: ${moved} payment dates spread over ${HISTORY_MONTHS} months`);
    return;
  }

  // Two claims per older month. The reference no. embeds the month, so a second
  // run finds the existing row instead of creating a duplicate.
  let addedExpenses = 0;
  for (const month of months.slice(0, months.length - 2)) {
    for (let k = 0; k < 2; k += 1) {
      const category = EXPENSE_CATEGORIES[(months.indexOf(month) + k) % EXPENSE_CATEGORIES.length];
      // `paymentReference` is the expense's own transfer reference and is what
      // marks a row as ours, so it doubles as the idempotency key. (Expense has
      // no `referenceNo` — that field belongs to Payment.)
      const reference = `RPTREF-${month}-${k + 1}`;
      const exists = await db.expense.findFirst({
        where: { institutionId, paymentReference: reference },
        select: { id: true },
      });
      if (exists) continue;

      const budget = budgetFor(category);
      if (!budget) continue;
      // Sized against the remaining plan so the seeded history cannot blow the
      // budget past 100% and make the variance report read as a lie.
      const planned = budget.plannedMinor;
      const amount = Math.max(1000, Math.round((planned * (0.02 + ((months.indexOf(month) * 7 + k * 3) % 5) / 100))));
      const department = departments[(months.indexOf(month) + k) % Math.max(1, departments.length)] ?? null;

      await db.expense.create({
        data: {
          institutionId,
          category,
          vendor: VENDORS[(months.indexOf(month) + k) % VENDORS.length],
          amountMinor: amount,
          taxMinor: Math.round(amount * 0.18),
          date: dayIn(month, 9 + k * 11),
          status: 'APPROVED',
          requestedByUserId: requester.id,
          approvedByUserId: approver.id,
          approvedAt: dayIn(month, 10 + k * 11),
          approvedByName: 'seed',
          budgetId: budget.id,
          departmentId: department?.id ?? null,
          paymentMethod: ['BANK_TRANSFER', 'UPI', 'CHEQUE'][k % 3],
          paymentReference: reference,
          title: `Routine ${category.toLowerCase()} — ${month}`,
          note: 'Seeded history so the reporting comparisons have a full year to compare.',
        },
      });
      addedExpenses += 1;
    }
  }

  // Spent is RE-DERIVED from the claims, the way seed.ts does it — never added
  // to, or a re-run would inflate every budget.
  for (const b of budgets) {
    const agg = await db.expense.aggregate({
      where: { budgetId: b.id, institutionId, status: 'APPROVED' },
      _sum: { amountMinor: true },
    });
    await db.budget.update({
      where: { id: b.id },
      data: { spentMinor: agg._sum.amountMinor ?? 0 },
    });
  }

  // ── 3. Payroll: price the missing months with the real engine ───────────
  //
  // `computeFromComponents` is the same arithmetic `runPayroll` uses, so a
  // seeded month is priced by the engine rather than by a number typed here.
  const salaryRecords = await db.staffSalaryRecord.findMany({
    where: { institutionId },
    include: { components: true },
    orderBy: { effectiveFrom: 'asc' },
  });
  if (salaryRecords.length) {
    // The designation / department snapshot on an entry, read off the user once
    // rather than invented per run.
    const staffUsers = await db.user.findMany({
      where: { id: { in: salaryRecords.map((r) => r.staffUserId) } },
      select: { id: true, fullName: true, staffProfile: { select: { designation: true, departmentId: true } } },
    });
    const staffById = new Map(staffUsers.map((u) => [u.id, u]));
    const departmentsById = new Map(departments.map((d) => [d.id, d.name]));

    let addedRuns = 0;
    // Year-to-date taxable income and TDS already collected, per person per
    // calendar year. Seeded months are walked oldest-first so the liability
    // accumulates the way it would in a real year.
    const ytd = new Map<string, { taxable: number; tds: number }>();
    for (const month of months) {
      const y = Number(month.slice(0, 4));
      const m = Number(month.slice(5, 7));
      const from = new Date(y, m - 1, 1);
      const to = new Date(y, m, 0, 23, 59, 59);
      const daysInMonth = new Date(y, m, 0).getDate();
      // The version in force THAT month, matching how the desk picks it: for a
      // person, the MOST RECENT record that covers the month. A person can have
      // two records covering one month — the increment closes the outgoing one
      // on a date inside the month, so both windows still contain it — and
      // taking both would produce two entries for one person, which the
      // (payrollRunId, staffUserId) unique constraint rightly rejects.
      const inForce = new Map<string, (typeof salaryRecords)[number]>();
      for (const r of salaryRecords) {
        const covers = r.effectiveFrom <= to && (r.effectiveTo ? r.effectiveTo >= from : true);
        if (!covers) continue;
        const held = inForce.get(r.staffUserId);
        if (!held || r.effectiveFrom > held.effectiveFrom) inForce.set(r.staffUserId, r);
      }
      const priced = [...inForce.values()];

      let gross = 0;
      let deductions = 0;
      const year = month.slice(0, 4);
      const entries: EntryShape[] = [];
      for (const rec of priced) {
        // The SAME call the live run engine makes, with the same arguments — the
        // record's own gross, this month, this month's length. The component
        // columns are `percentOf`/`percent`/`amountMinor`, NOT `base`/`value`:
        // passing invented names silently priced every component at zero, which
        // produced runs where gross exactly equalled net and no tax was ever
        // collected.
        const specs = rec.components.map((c) => ({
          code: c.code,
          label: c.label,
          percentOf: c.percentOf,
          percent: c.percent,
          amountMinor: c.amountMinor,
          isTaxable: c.isTaxable,
          sequence: c.sequence,
        }));

        // TDS is a year-to-date liability and `computeFromComponents` does not
        // compute it — the caller does, and passes the result back in. So the
        // month is priced twice: once untaxed to learn this month's taxable
        // income, then again with the tax the slab actually demands.
        const untaxed = computeFromComponents({
          grossMinor: rec.monthlyGrossMinor,
          month,
          daysInMonth,
          components: specs,
          lopDays: 0,
          taxMinor: 0,
          loanMinor: 0,
        });
        const key = `${rec.staffUserId}:${year}`;
        const acc = ytd.get(key) ?? { taxable: 0, tds: 0 };
        const ytdTaxable = acc.taxable + untaxed.taxableMinor;
        const tax = computeIncomeTax({ ytdGrossMinor: ytdTaxable, ytdTdsMinor: acc.tds }, month);
        // `monthlyTdsMinor`, NOT the TaxBreakdown object: passing the object
        // here silently coerces to 0 and the TDS line simply vanishes from the
        // payslip, which reads as "this month collected no tax" rather than as
        // a bug. (At these salaries the honest figure really is zero — the
        // annual taxable income falls inside the first 0% slab — but the code
        // has to be right so a raise crosses the slab and tax appears.)
        const taxMinor = tax.monthlyTdsMinor;
        ytd.set(key, { taxable: ytdTaxable, tds: acc.tds + taxMinor });

        const computed = computeFromComponents({
          grossMinor: rec.monthlyGrossMinor,
          month,
          daysInMonth,
          components: specs,
          lopDays: 0,
          taxMinor,
          loanMinor: 0,
        });
        if (computed.grossMinor <= 0) continue;

        gross += computed.grossMinor;
        deductions += computed.deductionsMinor;
        const who = staffById.get(rec.staffUserId);
        entries.push({
          staffUserId: rec.staffUserId,
          employeeNo: null,
          designation: who?.staffProfile?.designation ?? null,
          departmentName: who?.staffProfile?.departmentId
            ? departmentsById.get(who.staffProfile.departmentId) ?? null
            : null,
          grossMinor: computed.grossMinor,
          deductionsMinor: computed.deductionsMinor,
          netMinor: computed.grossMinor - computed.deductionsMinor,
          lopDays: 0,
          earningsJson: JSON.stringify(computed.earnings),
          deductionsJson: JSON.stringify(computed.deductions),
          status: 'PAID',
          paidAt: dayIn(month, 28),
          salaryRecordId: rec.id,
        });
      }

      if (!entries.length) continue;

      // OWNERSHIP BOUNDARY. A month this module did not create belongs to
      // somebody else — the payroll desk, syncPayrollSalary — and its entries
      // are the real thing. Recomputing its totals from a DIFFERENT set of
      // salary records leaves a run whose header does not foot to its own
      // entries, which is exactly the kind of lie a report must never tell.
      const existingRun = await db.payrollRun.findUnique({
        where: { institutionId_month: { institutionId, month } },
        select: { id: true, notes: true },
      });
      if (existingRun && !isOurs(existingRun.notes)) {
        continue;
      }

      if (existingRun) {
        await db.payrollEntry.deleteMany({ where: { payrollRunId: existingRun.id } });
      }
      const run = await db.payrollRun.upsert({
        where: { institutionId_month: { institutionId, month } },
        create: {
          institutionId,
          month,
          status: 'PAID',
          runByUserId: approver.id,
          approvedByUserId: approver.id,
          approvedAt: dayIn(month, 27),
          paidByUserId: approver.id,
          paidAt: dayIn(month, 28),
          grossMinor: 0,
          deductionsMinor: 0,
          totalMinor: 0,
          notes: REPORT_HISTORY_NOTE,
        },
        update: {
          approvedAt: dayIn(month, 27),
          paidAt: dayIn(month, 28),
          notes: REPORT_HISTORY_NOTE,
        },
      });

      // Entries are written AFTER the upsert, never as a nested `create`.
      // Prisma only applies a nested create on INSERT, so the rebuild path
      // (delete, then upsert->update) would have silently produced a run with no
      // entries at all — a month that reads as "payroll of zero" forever.
      await db.payrollEntry.createMany({
        data: entries.map((e) => ({ ...e, payrollRunId: run.id })),
      });

      const footed = await db.payrollEntry.aggregate({
        where: { payrollRunId: run.id },
        _sum: { grossMinor: true, deductionsMinor: true, netMinor: true },
      });
      const g = footed._sum.grossMinor ?? 0;
      const d = footed._sum.deductionsMinor ?? 0;
      await db.payrollRun.update({
        where: { id: run.id },
        data: { grossMinor: g, deductionsMinor: d, totalMinor: g - d },
      });
      addedRuns += 1;
    }
    console.log(
      `\u2713 report history: ${moved} payment dates spread over ${HISTORY_MONTHS} months, ` +
      `${addedExpenses} expense claims, ${addedRuns} payroll months priced by the engine`,
    );
    return;
  }

  console.log(
    `\u2713 report history: ${moved} payment dates spread over ${HISTORY_MONTHS} months, ` +
    `${addedExpenses} expense claims (no salary records, payroll history skipped)`,
  );
}
