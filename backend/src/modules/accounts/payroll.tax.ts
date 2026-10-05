// Pure rules for F-06 Payroll: income tax, attendance→loss-of-pay, alert ageing.
//
// Deliberately free of any Prisma import, for the same reason payroll.rules.ts
// is: `prisma/seed.ts` raises historic payroll with these exact functions, and a
// seed that imported the service would open a second PrismaClient against the
// same SQLite file and lock it against itself. If the seed and the API ever
// disagreed about a person's tax, every seeded payslip would be a lie.
//
// Money: integer paise throughout (ADR-04). Percentages are whole numbers.
import { unprocessable, badRequest } from '../../lib/errors.js';

// ── Income tax (TDS) ───────────────────────────────────────────────────────
//
// A real Indian payroll deducts tax under the New Regime from AY 2024-25: a
// standard deduction, then slabs with a 4% cess on top, collected monthly as
// TDS. Modelling it honestly matters because "why is my net lower" is the
// question an employee asks, and TDS is the largest answer to it after PF.
//
// The default slabs below are the FY 2024-25 new-regime slabs and are a
// CONSTANT, not a database row, because a tax table that a finance user can edit
// by accident is a tax table that will be wrong. An institution overrides them
// per salary record (see `slabs` on the component set) rather than by editing
// this file mid-year.
export const TAX_RULES = {
  standardDeductionMinor: 75000_00, // ₹75,000 — new regime, FY 2024-25
  cessPercent: 4,
  /** Slab ceiling in paise. `null` on the last one = "and everything above". */
  slabs: [
    { upToMinor: 300000_00, ratePercent: 0 }, //   up to ₹3,00,000   — NIL
    { upToMinor: 700000_00, ratePercent: 5 }, //   ₹3–7 lakh        — 5%
    { upToMinor: 1000000_00, ratePercent: 10 }, //  ₹7–10 lakh       — 10%
    { upToMinor: 1200000_00, ratePercent: 20 }, //  ₹10–12 lakh      — 20%
    { upToMinor: null, ratePercent: 30 }, //         above ₹12 lakh   — 30%
  ],
} as const;

export type TaxSlab = { upToMinor: number | null; ratePercent: number };

export type TaxInput = {
  /** Gross earnings for the year to date, paise. */
  ytdGrossMinor: number;
  /** Non-taxable earnings for the year to date, paise (HRA exemption etc). */
  ytdExemptMinor?: number;
  /** Tax already deducted this year, paise — TDS is a YEAR-to-date liability. */
  ytdTdsMinor?: number;
  /** Override the default table (used when a salary record pins its own). */
  slabs?: readonly TaxSlab[];
  standardDeductionMinor?: number;
  cessPercent?: number;
};

export type TaxBreakdown = {
  grossMinor: number;
  exemptMinor: number;
  standardDeductionMinor: number;
  taxableMinor: number;
  slabTaxMinor: number;
  cessMinor: number;
  annualTaxMinor: number;
  /** Tax already deducted this year, paise. */
  alreadyTdsMinor: number;
  /** What is STILL to be collected this year, paise. Never negative. */
  remainingTaxMinor: number;
  /** `remainingTaxMinor` spread over the months left in the year, paise. */
  monthlyTdsMinor: number;
  monthsRemaining: number;
  /** Per-slab working, so the payslip can show HOW the number was reached. */
  lines: { fromRupees: number; toRupees: number | null; ratePercent: number; amountMinor: number }[];
};

const MONTHS_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function assertTaxMonth(month: string): string {
  if (!MONTHS_RE.test(month)) throw badRequest('month must look like YYYY-MM');
  return month;
}

/**
 * Months left in the CALENDAR year, counting the month being paid as one of
 * them. `2026-08` → 5 (Aug…Dec). TDS for August is collected across the
 * remaining months, which is how an annual liability is actually collected.
 */
export function monthsRemainingInYear(month: string): number {
  assertTaxMonth(month);
  return 13 - Number(month.slice(5, 7)); // month 8 → 5
}

/** Round paise to a whole rupee — tax is quoted in ₹, never in paise. */
const wholeRupee = (paise: number) => Math.round(paise / 100) * 100;

/**
 * Work out the tax on a year-to-date gross and how much more is to be collected.
 *
 * Three properties this must hold, because a payslip reader adds the columns:
 *
 *  1. `remainingTaxMinor` is NEVER negative. A refund is a separate exercise
 *     (and needs a PAN, a declaration and a form), so a desk that silently
 *     credited a negative deduction would be inventing money.
 *  2. `monthlyTdsMinor × monthsRemaining` never exceeds `remainingTaxMinor` by
 *     more than the rounding of a single rupee per month — otherwise the last
 *     instalment either over-collects or under-collects.
 *  3. The slab lines sum to `slabTaxMinor` exactly, in paise. The lines are
 *     computed in paise and only the totals are rounded, so the printed table
 *     adds up.
 */
export function computeIncomeTax(input: TaxInput, month: string): TaxBreakdown {
  assertTaxMonth(month);
  const slabs = input.slabs?.length ? input.slabs : TAX_RULES.slabs;
  const standardDeductionMinor = input.standardDeductionMinor ?? TAX_RULES.standardDeductionMinor;
  const cessPercent = input.cessPercent ?? TAX_RULES.cessPercent;

  const grossMinor = Math.max(0, Math.trunc(input.ytdGrossMinor || 0));
  const exemptMinor = Math.max(0, Math.trunc(input.ytdExemptMinor || 0));
  const alreadyTdsMinor = Math.max(0, Math.trunc(input.ytdTdsMinor || 0));

  const taxableMinor = Math.max(0, grossMinor - exemptMinor - standardDeductionMinor);

  // Walk the slabs in paise. `floor` is the lower bound of the current band.
  let floor = 0;
  let slabTaxMinor = 0;
  const lines: TaxBreakdown['lines'] = [];
  for (const slab of slabs) {
    const ceiling = slab.upToMinor ?? Number.MAX_SAFE_INTEGER;
    if (taxableMinor > floor) {
      const inBand = Math.min(taxableMinor, ceiling) - floor;
      const amount = (inBand * slab.ratePercent) / 100;
      slabTaxMinor += amount;
      if (slab.ratePercent > 0 || taxableMinor > 0) {
        lines.push({
          fromRupees: Math.round(floor / 100),
          toRupees: slab.upToMinor === null ? null : Math.round(slab.upToMinor / 100),
          ratePercent: slab.ratePercent,
          amountMinor: wholeRupee(amount),
        });
      }
    }
    if (slab.upToMinor === null) break;
    floor = ceiling;
  }

  const cessMinor = (slabTaxMinor * cessPercent) / 100;
  const annualTaxMinor = wholeRupee(slabTaxMinor + cessMinor);
  const remainingTaxMinor = Math.max(0, annualTaxMinor - alreadyTdsMinor);
  const monthsRemaining = monthsRemainingInYear(month);
  // Spread evenly; the final month of the year sweeps whatever is left rather
  // than the even share, so the year never ends a rupee short.
  const monthlyTdsMinor =
    month.slice(5, 7) === '12'
      ? remainingTaxMinor
      : wholeRupee(remainingTaxMinor / monthsRemaining);

  return {
    grossMinor,
    exemptMinor,
    standardDeductionMinor,
    taxableMinor,
    slabTaxMinor: wholeRupee(slabTaxMinor),
    cessMinor: wholeRupee(cessMinor),
    annualTaxMinor,
    alreadyTdsMinor,
    remainingTaxMinor,
    monthlyTdsMinor,
    monthsRemaining,
    lines,
  };
}

// ── Attendance → loss of pay ───────────────────────────────────────────────

export const ATTENDANCE_RULES = {
  /** Leave types that are PAID. Anything else on an approved leave is unpaid. */
  paidLeaveTypes: ['EARNED', 'CASUAL', 'MEDICAL'] as readonly string[],
  /** A single unpaid day is not loss of pay — a desk never charges a rupee for
   * one absent day, it waits until the absence has a pattern. */
  graceUnpaidDays: 2,
} as const;

export type AttendanceInput = {
  /** Days the person was rostered in the month. */
  workingDays: number;
  presentDays?: number;
  paidLeaveDays?: number;
  unpaidLeaveDays?: number;
  /** Approved leave rows overlapping the month — the raw source. */
  leaves?: { type: string; days: number; status: string }[];
};

export type AttendanceResult = {
  workingDays: number;
  presentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  lopDays: number;
  /** Whether the `graceUnpaidDays` rule swallowed the whole absence. */
  withinGrace: boolean;
  presentPercent: number;
  /** Human-readable source of the numbers, for the payslip's "basis" note. */
  basis: string;
};

const int = (n: number | undefined) => Math.max(0, Math.trunc(n || 0));

/**
 * Derive loss-of-pay days from an attendance summary and the approved leave
 * rows that overlap the month.
 *
 * Two rules that the desk would otherwise apply by hand, inconsistently:
 *
 *  · Only APPROVED leave counts, and only EARNED / CASUAL / MEDICAL is paid.
 *    A PENDING leave request must not silently cost somebody money.
 *  · Absence below `graceUnpaidDays` is not charged. Nobody's payslip says
 *    "loss of pay: 1 day" for one Friday — that reads as a punishment.
 *
 * The result is clamped to the working days of the month, so a leave row that
 * overruns the month cannot produce more LOP days than the month has.
 */
export function deriveLop(input: AttendanceInput, month: string): AttendanceResult {
  assertTaxMonth(month);
  const workingDays = int(input.workingDays);
  if (workingDays <= 0) {
    throw unprocessable('workingDays must be at least 1 — there is no month with no working days');
  }

  const approved = (input.leaves ?? []).filter((l) => l.status === 'APPROVED');
  const fromLeaves = {
    paid: approved
      .filter((l) => ATTENDANCE_RULES.paidLeaveTypes.includes(l.type.toUpperCase()))
      .reduce((s, l) => s + int(l.days), 0),
    unpaid: approved
      .filter((l) => !ATTENDANCE_RULES.paidLeaveTypes.includes(l.type.toUpperCase()))
      .reduce((s, l) => s + int(l.days), 0),
  };

  // A summary that was typed in wins over the derived leave totals — the desk
  // has seen the register, the leave table has not.
  const paidLeaveDays = input.paidLeaveDays !== undefined ? int(input.paidLeaveDays) : fromLeaves.paid;
  const unpaidLeaveDays =
    input.unpaidLeaveDays !== undefined ? int(input.unpaidLeaveDays) : fromLeaves.unpaid;
  // When the caller supplies only LEAVE (the "derive from leave" flow) the
  // honest reading of an unstated present count is "present on every day they
  // were not on leave" — not "absent every other day". Defaulting to 0 here
  // turned a three-day leave into a sixteen-day deduction, which is how a
  // one-click derivation would quietly dock somebody most of a month.
  const presentDays =
    input.presentDays !== undefined
      ? int(input.presentDays)
      : Math.max(0, workingDays - paidLeaveDays - unpaidLeaveDays);

  const absentDays = Math.max(0, workingDays - presentDays - paidLeaveDays - unpaidLeaveDays);
  const rawLop = Math.min(workingDays, unpaidLeaveDays + absentDays);
  const withinGrace = rawLop > 0 && rawLop <= ATTENDANCE_RULES.graceUnpaidDays;
  const lopDays = withinGrace ? 0 : rawLop;

  return {
    workingDays,
    presentDays,
    paidLeaveDays,
    unpaidLeaveDays,
    lopDays,
    withinGrace,
    presentPercent: workingDays ? Math.round((presentDays / workingDays) * 100) : 0,
    basis: withinGrace
      ? `Absence of ${rawLop} day${rawLop === 1 ? '' : 's'} is within the ${ATTENDANCE_RULES.graceUnpaidDays}-day grace — not charged.`
      : `${unpaidLeaveDays} unpaid leave day${unpaidLeaveDays === 1 ? '' : 's'}${
          absentDays ? ` + ${absentDays} unaccounted` : ''
        } of ${workingDays} rostered.`,
  };
}

// ── Pending-salary alerts ──────────────────────────────────────────────────

export const ALERT_RULES = {
  /** Days an APPROVED run may sit unpaid before it is an overdue alert. */
  overdueDays: 7,
  /** A DRAFT run older than this is "left in draft". */
  staleDraftDays: 5,
  /** Attendance below this percent flags a person for review. */
  lowAttendancePercent: 60,
  /** A recovery not posted for this many months is a stalled loan. */
  stalledLoanMonths: 3,
} as const;

/**
 * Bucket a number of days into the ageing bands a finance desk actually uses.
 * `null` days = never paid, which is its own (worst) band, not a zero.
 */
export function ageingBand(days: number | null): 'NEVER' | 'DUE' | 'OVERDUE' | 'CRITICAL' {
  if (days === null) return 'NEVER';
  if (days <= 0) return 'DUE';
  if (days <= ALERT_RULES.overdueDays) return 'OVERDUE';
  return 'CRITICAL';
}

export const AGEING_META = {
  NEVER: { label: 'Never raised', color: '#dc2626', bg: '#fef2f2', icon: 'alert-circle-outline' },
  DUE: { label: 'Due now', color: '#d97706', bg: '#fffbeb', icon: 'time-outline' },
  OVERDUE: { label: 'Overdue', color: '#d97706', bg: '#fffbeb', icon: 'warning-outline' },
  CRITICAL: { label: 'Critically overdue', color: '#dc2626', bg: '#fef2f2', icon: 'alert-circle-outline' },
} as const;

/** Whole days between two dates, in the server's own zone, floored at 0. */
export function daysBetween(from: Date, to: Date = new Date()): number {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.max(0, Math.floor((startOf(to) - startOf(from)) / 86400000));
}

/** "2026-08" → the last instant of that month, in the server's zone. */
export function endOfMonth(month: string): Date {
  assertTaxMonth(month);
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0, 23, 59, 59, 999);
}

/** The month a salary window was in force for, or null if it never was. */
export function monthInWindow(month: string, from: Date, to: Date | null): boolean {
  assertTaxMonth(month);
  const start = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1).getTime();
  const end = endOfMonth(month).getTime();
  const f = from.getTime();
  const t = to ? to.getTime() : Infinity;
  return f <= end && t >= start;
}