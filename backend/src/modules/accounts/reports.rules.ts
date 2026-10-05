// F-09 Reports — the prisma-free reporting rules (docs/users/06 §3.8).
//
// Everything here is pure arithmetic and date logic, with no Prisma import, for
// two reasons. It is unit-testable on its own, and the SEED can compute the same
// figures the API will serve. A report whose total can only be produced by
// running the database is a report nobody can check.
//
// Money is integer paise throughout (ADR-04). Rupees appear only at the edge,
// where a number is handed to a spreadsheet cell or formatted for a screen.
import { unprocessable } from '../../lib/errors.js';

// ── Periods ───────────────────────────────────────────────────────────────

export const PERIODS = ['MONTH', 'QUARTER', 'SEMESTER', 'YEAR', 'ALL'] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_META: Record<Period, { label: string; short: string; hint: string }> = {
  MONTH: { label: 'This month', short: 'Month', hint: 'One calendar month, back from the anchor date.' },
  QUARTER: { label: 'This quarter', short: 'Quarter', hint: 'Three calendar months.' },
  SEMESTER: {
    label: 'This semester',
    short: 'Semester',
    hint: 'Half of the academic year the anchor falls in, split from its real start and end dates.',
  },
  YEAR: { label: 'This year', short: 'Year', hint: 'One calendar year.' },
  ALL: { label: 'All time', short: 'All', hint: 'Everything the institution has ever recorded.' },
};

export type ResolvedPeriod = {
  period: Period;
  /** Inclusive start, local midnight. */
  from: Date | null;
  /** Inclusive end, local end-of-day. null for ALL. */
  to: Date | null;
  label: string;
  /** The equivalent window immediately BEFORE this one, for a real comparison. */
  previousFrom: Date | null;
  previousTo: Date | null;
  previousLabel: string | null;
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
export const endOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

export const monthKey = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const monthLabel = (key: string): string => {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_NAMES[m - 1] ?? key} ${y}`;
};

export const monthShortLabel = (key: string): string => {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_SHORT[m - 1] ?? m}/${String(y).slice(2)}`;
};

export const isMonthKey = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

export function assertPeriod(v: unknown): Period {
  const s = String(v ?? '').toUpperCase();
  if (!PERIODS.includes(s as Period)) {
    throw unprocessable(`Unknown period "${v}"`, [{ code: 'BAD_PERIOD', message: `Supported: ${PERIODS.join(', ')}` }]);
  }
  return s as Period;
}

export const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Days in `m` (1-based, as people count months). */
export const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();

/**
 * The last instant of the month at 0-based index `m0`.
 *
 * This exists because `Date.getMonth()` is 0-based while `daysInMonth` is
 * 1-based, and mixing the two silently shifts every window by a month — October
 * was ending on 30 September. Callers holding a `Date` should use this.
 */
export const endOfMonth = (y: number, m0: number): Date => endOfDay(new Date(y, m0 + 1, 0));

/** Whole months back from the anchor, oldest first, as `YYYY-MM`. */
export function monthKeysBack(count: number, anchor: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    out.push(monthKey(new Date(anchor.getFullYear(), anchor.getMonth() - i, 1)));
  }
  return out;
}

export type AcademicYearRef = { name: string; startDate: Date; endDate: Date };

/**
 * The academic year whose real dates contain `anchor`.
 *
 * Semester is DERIVED from those dates rather than stored, because there is no
 * Semester entity in this schema and money rows carry dates only. Splitting the
 * year in half on its own start/end is honest: it uses the institution's real
 * calendar instead of inventing a convention.
 */
export function academicYearFor(anchor: Date, years: AcademicYearRef[]): AcademicYearRef | null {
  const t = anchor.getTime();
  return years.find((y) => y.startDate.getTime() <= t && y.endDate.getTime() >= t) ?? null;
}

export function resolvePeriod(
  period: Period,
  anchor: Date = new Date(),
  academicYears: AcademicYearRef[] = [],
): ResolvedPeriod {
  const a = startOfDay(anchor);
  const build = (
    from: Date | null,
    to: Date | null,
    label: string,
    prevFrom: Date | null,
    prevTo: Date | null,
    prevLabel: string | null,
  ): ResolvedPeriod => ({ period, from, to, label, previousFrom: prevFrom, previousTo: prevTo, previousLabel: prevLabel });

  if (period === 'ALL') {
    return build(null, null, 'All time', null, null, null);
  }

  if (period === 'MONTH') {
    const from = new Date(a.getFullYear(), a.getMonth(), 1);
    const to = endOfMonth(a.getFullYear(), a.getMonth());
    const pFrom = new Date(a.getFullYear(), a.getMonth() - 1, 1);
    const pTo = endOfMonth(pFrom.getFullYear(), pFrom.getMonth());
    return build(from, to, monthLabel(monthKey(a)), pFrom, pTo, monthLabel(monthKey(pFrom)));
  }

  if (period === 'QUARTER') {
    const qStart = Math.floor(a.getMonth() / 3) * 3;
    const from = new Date(a.getFullYear(), qStart, 1);
    const to = endOfMonth(a.getFullYear(), qStart + 2);
    const pFrom = new Date(a.getFullYear(), qStart - 3, 1);
    const pTo = endOfMonth(pFrom.getFullYear(), pFrom.getMonth() + 2);
    return build(
      from, to,
      `Q${Math.floor(qStart / 3) + 1} ${a.getFullYear()}`,
      pFrom, pTo,
      `Q${Math.floor(((qStart + 9) % 12) / 3) + 1} ${pFrom.getFullYear()}`,
    );
  }

  if (period === 'SEMESTER') {
    const ay = academicYearFor(a, academicYears);
    if (!ay) {
      // No academic year covers the anchor. Rather than invent a calendar, fall
      // back to a six-month split of the calendar year and say so in the label.
      const firstHalf = a.getMonth() < 6;
      const from = new Date(a.getFullYear(), firstHalf ? 0 : 6, 1);
      const to = endOfMonth(a.getFullYear(), firstHalf ? 5 : 11);
      const pFrom = new Date(a.getFullYear(), firstHalf ? -6 : 0, 1);
      const pTo = endOfMonth(pFrom.getFullYear(), firstHalf ? 5 : 11);
      return build(
        from, to,
        `${firstHalf ? 'Jan–Jun' : 'Jul–Dec'} ${a.getFullYear()} (no academic year covers this date)`,
        pFrom, pTo,
        `${firstHalf ? 'Jul–Dec' : 'Jan–Jun'} ${pFrom.getFullYear()}`,
      );
    }
    // The academic year is split into its FIRST SIX and LAST SIX MONTHS, counted
    // from the month the year really starts in. A July–June year therefore gives
    // Jul–Dec / Jan–Jun, and a January-start year gives Jan–Jun / Jul–Dec — the
    // institution's own calendar, not a hardcoded convention. Whole months (not a
    // mid-point timestamp) keep the two halves from ending on 30 December.
    const ayStart = ay.startDate;
    const sem2Month = new Date(ayStart.getFullYear(), ayStart.getMonth() + 6, 1);
    const anchorMonth = new Date(a.getFullYear(), a.getMonth(), 1);
    const secondHalf = anchorMonth.getTime() >= sem2Month.getTime();
    const from = secondHalf ? startOfDay(sem2Month) : startOfDay(ayStart);
    const to = secondHalf
      ? endOfDay(ay.endDate)
      : endOfMonth(ayStart.getFullYear(), ayStart.getMonth() + 5);
    const label = `${ay.name} semester ${secondHalf ? 2 : 1}`;
    // The previous half may belong to an earlier academic year, which is only
    // derivable when the caller supplied more than one year. Inventing a window
    // for a year that was never loaded would compare against nothing.
    const idx = academicYears.findIndex((y) => y.name === ay.name);
    let prevFrom: Date | null = null;
    let prevTo: Date | null = null;
    let prevLabel: string | null = null;
    if (secondHalf) {
      prevFrom = startOfDay(ayStart);
      prevTo = endOfMonth(ayStart.getFullYear(), ayStart.getMonth() + 5);
      prevLabel = `${ay.name} semester 1`;
    } else if (idx > 0) {
      const py = academicYears[idx - 1];
      prevFrom = startOfDay(new Date(py.startDate.getFullYear(), py.startDate.getMonth() + 6, 1));
      prevTo = endOfDay(py.endDate);
      prevLabel = `${py.name} semester 2`;
    }
    return build(from, to, label, prevFrom, prevTo, prevLabel);
  }

  // YEAR
  const from = new Date(a.getFullYear(), 0, 1);
  const to = endOfDay(new Date(a.getFullYear(), 11, 31));
  const pFrom = new Date(a.getFullYear() - 1, 0, 1);
  const pTo = endOfDay(new Date(a.getFullYear() - 1, 11, 31));
  return build(from, to, String(a.getFullYear()), pFrom, pTo, String(a.getFullYear() - 1));
}

// ── Arithmetic ────────────────────────────────────────────────────────────

/** Rupees for display and for the wire. */
export const toRupees = (paise: number): number => Math.round(paise / 100);

/**
 * Percent change between two figures, as a whole percent.
 *
 * Returns null when there is no base to compare against. A jump from zero to
 * something is not "infinite growth" — reporting a number the user cannot act on
 * is worse than reporting that there is no comparable base.
 */
export function growthPercent(current: number, previous: number): number | null {
  const c = Math.trunc(current) || 0;
  const p = Math.trunc(previous) || 0;
  if (p === 0) return null;
  return Math.round(((c - p) / p) * 1000) / 10;
}

export const sharePercent = (part: number, whole: number): number | null => {
  const w = Math.trunc(whole) || 0;
  if (w === 0) return null;
  return Math.round(((Math.trunc(part) || 0) / w) * 1000) / 10;
};

// ── Collection shapes ─────────────────────────────────────────────────────

export type Tally = { key: string; label: string; count: number; amountMinor: number };

/**
 * Fold rows into a tally.
 *
 * Every report row carries BOTH the amount and the count, because "₹18 L across
 * 22 receipts" and "₹18 L across one receipt" are different stories and a
 * report that shows only the amount hides the second one.
 */
export function tally(rows: { key: string; label: string; amountMinor: number }[]): Tally[] {
  const map = new Map<string, Tally>();
  for (const r of rows) {
    const hit = map.get(r.key);
    if (hit) {
      hit.count += 1;
      hit.amountMinor += r.amountMinor;
    } else {
      map.set(r.key, { key: r.key, label: r.label, count: 1, amountMinor: r.amountMinor });
    }
  }
  return [...map.values()].sort((a, b) => b.amountMinor - a.amountMinor);
}

/** One point on a trend line, with the delta against the point before it. */
export type TrendPoint = {
  key: string;
  label: string;
  count: number;
  amountMinor: number;
  previousMinor: number | null;
  changePercent: number | null;
};

export function trend(points: { key: string; label: string; count: number; amountMinor: number }[]): TrendPoint[] {
  return points.map((p, i) => {
    const prev = i > 0 ? points[i - 1].amountMinor : null;
    return {
      ...p,
      previousMinor: prev,
      changePercent: prev === null ? null : growthPercent(p.amountMinor, prev),
    };
  });
}

export type Granularity = 'MONTH' | 'QUARTER' | 'YEAR';

/**
 * Collapse a run of MONTHLY points into quarters or years.
 *
 * This is what makes the comparison's granularity control real. Without it the
 * control only changed a label while the series stayed monthly — a filter that
 * looks live and is not, which is worse than having none.
 *
 * The window itself never changes: the caller decides how many months it read,
 * and this only decides how those months are BUCKETS. Buckets are contiguous and
 * emitted in order, so `grouped[i]` and `monthly[i]` cover the same first N
 * months — the series total is identical either way, which is what lets the
 * export and the screen agree.
 */
export function groupByGranularity(
  monthly: { key: string; label: string; count: number; amountMinor: number }[],
  granularity: Granularity,
): { key: string; label: string; count: number; amountMinor: number; months: number }[] {
  if (granularity === 'MONTH' || monthly.length === 0) {
    return monthly.map((m) => ({ ...m, months: 1 }));
  }
  const out: { key: string; label: string; count: number; amountMinor: number; months: number }[] = [];
  for (const m of monthly) {
    const [y, mm] = m.key.split('-').map(Number);
    const key = granularity === 'YEAR' ? String(y) : `Q${Math.floor((mm - 1) / 3) + 1} ${y}`;
    const last = out[out.length - 1];
    if (last && last.key === key) {
      last.count += m.count;
      last.amountMinor += m.amountMinor;
      last.months += 1;
    } else {
      out.push({ key, label: key, count: m.count, amountMinor: m.amountMinor, months: 1 });
    }
  }
  return out;
}

/** Largest value in a series, so a bar chart has a scale. 0 for an empty series. */
export function peak(values: number[]): number {
  // 0 is only the answer for an EMPTY series. Seeding the fold with 0 would make
  // a run of all-negative figures (a credit balance, a reversal month) report a
  // peak that never occurred.
  return values.length === 0 ? 0 : values.reduce((m, v) => (v > m ? v : m));
}

// ── Dues ageing ───────────────────────────────────────────────────────────
//
// The dues module already owns the ageing bands (dues.money.ts AGING_BUCKETS) and
// the collections desk already renders them. A report that invented its own,
// slightly different, bands would disagree with the screen a user just looked at.

export const DUE_STATUS_META: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Open', color: '#d97706' },
  UNPAID: { label: 'Unpaid', color: '#dc2626' },
  PARTIAL: { label: 'Partially paid', color: '#d97706' },
  CLEARED: { label: 'Cleared', color: '#059669' },
  WAIVED: { label: 'Waived', color: '#64748b' },
};

/** What a student still owes: the bill plus any late fee, less what is paid. */
export const balanceOfDue = (d: { amountMinor: number; paidMinor: number; lateFeeMinor?: number | null }): number =>
  Math.max(0, (d.amountMinor ?? 0) + (d.lateFeeMinor ?? 0) - (d.paidMinor ?? 0));

/** A waived due is nobody's problem any more, however much was billed. */
export const isCollectible = (d: { status: string }): boolean => d.status !== 'WAIVED' && d.status !== 'CLEARED';

export type RecoveryStats = {
  billedMinor: number;
  paidMinor: number;
  outstandingMinor: number;
  /** Share of billed money actually collected, as a whole percent. null when nothing was billed. */
  recoveryPercent: number | null;
};

/**
 * Recovery for a set of dues.
 *
 * `recoveryPercent` divides the money COLLECTED by the money BILLED. It is null
 * when nothing was billed, because "0% recovered" and "no bill went out" are
 * very different facts and only one of them is a problem.
 */
export function recoveryStats(dues: {
  amountMinor: number;
  paidMinor: number;
  lateFeeMinor?: number | null;
  status: string;
}[]): RecoveryStats {
  let billed = 0;
  let paid = 0;
  let outstanding = 0;
  for (const d of dues) {
    if (d.status === 'WAIVED') continue;
    const gross = (d.amountMinor ?? 0) + (d.lateFeeMinor ?? 0);
    billed += gross;
    paid += Math.min(gross, d.paidMinor ?? 0);
    if (isCollectible(d)) outstanding += balanceOfDue(d);
  }
  return {
    billedMinor: billed,
    paidMinor: paid,
    outstandingMinor: outstanding,
    recoveryPercent: sharePercent(paid, billed),
  };
}

// ── Budget variance ───────────────────────────────────────────────────────

export type BudgetVariance = {
  key: string;
  label: string;
  plannedMinor: number;
  spentMinor: number;
  remainingMinor: number;
  /** Spend against plan as a whole percent. null when nothing was planned. */
  utilisationPercent: number | null;
  overBudget: boolean;
};

/**
 * Budget variance.
 *
 * `spentMinor` is passed in ALREADY COMPUTED from the claims, never accumulated
 * here — so a re-run re-derives the truth instead of adding to yesterday's
 * total.
 */
export function budgetVariance(
  lines: { key: string; label: string; plannedMinor: number; spentMinor: number }[],
): BudgetVariance[] {
  return lines
    .map((l) => {
      const planned = Math.max(0, Math.trunc(l.plannedMinor) || 0);
      const spent = Math.max(0, Math.trunc(l.spentMinor) || 0);
      return {
        key: l.key,
        label: l.label,
        plannedMinor: planned,
        spentMinor: spent,
        remainingMinor: planned - spent,
        utilisationPercent: sharePercent(spent, planned),
        overBudget: spent > planned,
      };
    })
    .sort((a, b) => (b.utilisationPercent ?? -1) - (a.utilisationPercent ?? -1));
}

// ── Export shaping ────────────────────────────────────────────────────────

export type ExportColumn = {
  header: string;
  /** Which cell type the spreadsheet should use. */
  type: 'text' | 'number' | 'money';
  /** Pull the cell's value out of a row. */
  value: (row: Record<string, unknown>) => unknown;
};

export type ExportSheet = { name: string; columns: ExportColumn[]; rows: Record<string, unknown>[] };

/**
 * RFC-4180 CSV.
 *
 * A field is quoted when it contains a comma, a quote, a newline, or leading or
 * trailing space — the last two because a spreadsheet silently trims them and the
 * number then reads wrong. A literal quote inside a field is doubled, which is
 * what the RFC says, not backslash-escaped.
 */
export function toCsv(sheets: ExportSheet[]): string {
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n\r]|^ | $/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const out: string[] = [];
  sheets.forEach((sheet, si) => {
    // The BOM goes ONCE, at the very start of the FILE. Emitting it before every
    // sheet leaves a U+FEFF sitting in the middle of the document, which shows
    // up as a stray character in the middle of the second sheet's first cell.
    const title = si === 0 ? `\uFEFF${sheet.name}` : sheet.name;
    out.push(title);
    out.push(sheet.columns.map((c) => escape(c.header)).join(','));
    for (const row of sheet.rows) {
      out.push(sheet.columns.map((c) => escape(c.value(row))).join(','));
    }
    // A blank line between sheets, so the second header row is not read as data.
    out.push('');
  });
  return out.join('\r\n');
}

export const moneyColumn = (header: string, key: string): ExportColumn => ({
  header,
  type: 'money',
  value: (row) => {
    const v = row[key];
    return typeof v === 'number' ? v / 100 : v ?? null;
  },
});

export const numberColumn = (header: string, key: string): ExportColumn => ({
  header,
  type: 'number',
  value: (row) => row[key] ?? null,
});

export const textColumn = (header: string, key: string): ExportColumn => ({
  header,
  type: 'text',
  value: (row) => {
    const v = row[key];
    return v === null || v === undefined ? '' : String(v);
  },
});

/** Money in a spreadsheet cell must be a NUMBER, not "₹18,000" as text. */
export const MONEY_FORMAT = '#,##0.00';
