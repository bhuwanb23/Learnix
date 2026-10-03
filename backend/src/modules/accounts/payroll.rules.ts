// Pure salary arithmetic for F-06 Payroll.
//
// Deliberately free of any Prisma import: `prisma/seed.ts` reuses these exact
// rules to raise its historic runs, and a seed that imported the service would
// open a second PrismaClient against the same SQLite file and lock it against
// itself. If the seed and the API ever disagreed about what a payslip foots to,
// every seeded payslip would be a lie.
//
// Money: integer paise throughout (ADR-04).
import { unprocessable, badRequest } from '../../lib/errors.js';

// Kept explicit and integer-only so a payslip always foots: the earnings lines
// sum to gross, the deduction lines sum to deductions, and gross − deductions
// is exactly net. Percentages are of the right base (HRA and PF are of BASIC,
// not of gross) because that is what a payslip reader will check.
export const SALARY_RULES = {
  basicPercentOfGross: 50,
  hraPercentOfBasic: 40,
  pfPercentOfBasic: 12,
  professionalTaxMinor: 20000, // ₹200 flat
} as const;

export type SalaryLine = { label: string; amountMinor: number };

export type ComputedSalary = {
  grossMinor: number;
  deductionsMinor: number;
  netMinor: number;
  lopDays: number;
  earnings: SalaryLine[];
  deductions: SalaryLine[];
  perDayMinor: number;
};

/** Real days in a "YYYY-MM" month — loss of pay is charged per calendar day. */
export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** The month the desk is currently in, as "YYYY-MM" in the server's own zone. */
export function currentMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Split a monthly gross into payslip lines, optionally charging loss of pay.
 *
 * Loss of pay is capped so deductions can never exceed the gross: a fully absent
 * month still owes PF and professional tax, and letting LOP run to a negative
 * net would produce a "payslip" that pays the employee a negative salary — a
 * number no bank will honour and nobody can reconcile. The cap is reported
 * back to the caller, which refuses a request that would exceed it rather than
 * silently paying less than the officer asked for.
 */
export function computeSalary(grossMinor: number, month: string, lopDays = 0): ComputedSalary {
  if (!Number.isInteger(grossMinor) || grossMinor <= 0) {
    throw unprocessable('Salary must be a positive whole amount');
  }
  const dim = daysInMonth(month);
  const basic = Math.round((grossMinor * SALARY_RULES.basicPercentOfGross) / 100);
  const hra = Math.round((basic * SALARY_RULES.hraPercentOfBasic) / 100);
  const special = grossMinor - basic - hra;

  const earnings: SalaryLine[] = [
    { label: 'Basic Pay', amountMinor: basic },
    { label: 'HRA', amountMinor: hra },
    { label: 'Special Allowance', amountMinor: special },
  ];

  const pf = Math.round((basic * SALARY_RULES.pfPercentOfBasic) / 100);
  const professionalTax = SALARY_RULES.professionalTaxMinor;
  const deductions: SalaryLine[] = [
    { label: 'Provident Fund', amountMinor: pf },
    { label: 'Professional Tax', amountMinor: professionalTax },
  ];

  const perDayMinor = Math.floor(grossMinor / dim);
  const wanted = Math.max(0, Math.min(Math.floor(lopDays || 0), dim));
  // Leave room for PF + professional tax so net never goes negative.
  const affordable = Math.max(0, Math.floor((grossMinor - pf - professionalTax) / Math.max(perDayMinor, 1)));
  const applied = Math.min(wanted, affordable);
  if (applied > 0) {
    deductions.push({
      label: `Loss of Pay (${applied} day${applied === 1 ? '' : 's'})`,
      amountMinor: applied * perDayMinor,
    });
  }

  const deductionsMinor = deductions.reduce((s, d) => s + d.amountMinor, 0);
  return {
    grossMinor,
    deductionsMinor,
    netMinor: grossMinor - deductionsMinor,
    lopDays: applied,
    earnings,
    deductions,
    perDayMinor,
  };
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Guard the desk against "payroll for 2026-13" and payroll from 2099. */
export function assertMonth(month: string): string {
  if (!MONTH_RE.test(month)) throw badRequest('month must look like YYYY-MM');
  const year = Number(month.slice(0, 4));
  const now = new Date();
  if (year > now.getFullYear() + 1) throw badRequest('month is too far in the future');
  if (year < now.getFullYear() - 5) throw badRequest('month is too far in the past');
  return month;
}