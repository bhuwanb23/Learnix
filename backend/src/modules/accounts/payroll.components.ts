// Pure salary-component arithmetic for F-06 Payroll.
//
// Deliberately free of any Prisma import, for the same reason `payroll.rules.ts`
// and `expenses.money.ts` are: `prisma/seed.ts` raises its historic payroll with
// these exact functions, and a seed that reached through a service would open a
// second PrismaClient against the same SQLite file and lock it against itself.
// If the seed and the API disagreed about a payslip, every seeded payslip would be
// a lie — and the whole point of the component set is that the printed columns
// must add up to the printed total.
//
// Money: integer paise throughout (ADR-04).
import { unprocessable } from '../../lib/errors.js';

// ── Component vocabulary ───────────────────────────────────────────────────
//
// A component is a RULE ("40% of basic"), never a number that was already
// multiplied by hand — otherwise a raise silently leaves HRA at last year's
// figure, which is exactly the bug the old hard-coded 50/40/12 formula had.
export const COMPONENT_KINDS = ['EARNING', 'DEDUCTION'] as const;
export const COMPONENT_BASES = ['BASIC', 'GROSS'] as const;
export type ComponentKind = (typeof COMPONENT_KINDS)[number];
export type ComponentBase = (typeof COMPONENT_BASES)[number];

export const COMPONENT_CATALOG: Record<
  string,
  { kind: ComponentKind; label: string; base: ComponentBase | null; percent: number | null; taxable: boolean; icon: string; hint: string }
> = {
  BASIC: { kind: 'EARNING', label: 'Basic Pay', base: 'GROSS', percent: 50, taxable: false, icon: 'cash-outline', hint: 'The base most retirement and HRA are a % of. Drives taxable income.' },
  HRA: { kind: 'EARNING', label: 'HRA', base: 'BASIC', percent: 40, taxable: true, icon: 'home-outline', hint: 'House rent allowance — a share of basic, taxable unless exempted.' },
  DA: { kind: 'EARNING', label: 'Dearness Allowance', base: 'BASIC', percent: 0, taxable: true, icon: 'trending-up-outline', hint: 'Cost-of-living adjustment. Set a % of basic.' },
  TRANSPORT: { kind: 'EARNING', label: 'Transport Allowance', base: null, percent: null, taxable: false, icon: 'bus-outline', hint: 'Flat amount per month.' },
  MEDICAL: { kind: 'EARNING', label: 'Medical Allowance', base: null, percent: null, taxable: false, icon: 'medkit-outline', hint: 'Flat amount per month.' },
  SPECIAL: { kind: 'EARNING', label: 'Special Allowance', base: null, percent: null, taxable: false, icon: 'sparkles-outline', hint: 'Balancing line — absorbs rounding so earnings foot to gross exactly.' },
  PF: { kind: 'DEDUCTION', label: 'Provident Fund', base: 'BASIC', percent: 12, taxable: false, icon: 'shield-checkmark-outline', hint: 'Employee PF contribution — % of basic, not of gross.' },
  PROF_TAX: { kind: 'DEDUCTION', label: 'Professional Tax', base: null, percent: null, taxable: false, icon: 'receipt-outline', hint: 'State levy. Flat per month (₹200 in most states).' },
  TDS: { kind: 'DEDUCTION', label: 'Income Tax (TDS)', base: null, percent: null, taxable: false, icon: 'calculator-outline', hint: 'Computed from year-to-date taxable income — not typed.' },
  LOAN: { kind: 'DEDUCTION', label: 'Loan / Advance Recovery', base: null, percent: null, taxable: false, icon: 'card-outline', hint: 'Recovered from an active loan or advance.' },
  OTHER: { kind: 'DEDUCTION', label: 'Other Deduction', base: null, percent: null, taxable: false, icon: 'remove-circle-outline', hint: 'Anything else the desk must withhold — flat amount.' },
};

export const componentMeta = (code: string) =>
  COMPONENT_CATALOG[code] ?? {
    kind: 'OTHER' as ComponentKind,
    label: code,
    base: null,
    percent: null,
    taxable: false,
    icon: 'ellipsis-horizontal',
    hint: '',
  };

// ── Computation ────────────────────────────────────────────────────────────

export type ComponentSpec = {
  code: string;
  label?: string | null;
  percentOf?: ComponentBase | null;
  percent?: number | null;
  amountMinor?: number | null;
  isTaxable?: boolean;
  sequence?: number;
};

export type SalaryLine = { code: string; label: string; amountMinor: number; taxable: boolean };

export type SalaryComputation = {
  grossMinor: number;
  basicMinor: number;
  deductionsMinor: number;
  netMinor: number;
  earnings: SalaryLine[];
  deductions: SalaryLine[];
  taxableMinor: number;
  perDayMinor: number;
  lopDays: number;
  /** What the components DECLARE, before the balancing line. */
  declaredEarningsMinor: number;
  /** The balancing SPECIAL line's amount (0 when there is no residue). */
  residueMinor: number;
  warnings: string[];
};

export type ComputeInput = {
  grossMinor: number;
  month: string;
  components: ComponentSpec[];
  lopDays?: number;
  daysInMonth: number;
  /** TDS already computed for this month (paise). */
  taxMinor?: number;
  /** Loan recovery for this month (paise). */
  loanMinor?: number;
};

const wholeRupee = (paise: number) => Math.round(paise / 100) * 100;
const int = (n: unknown) => Math.max(0, Math.trunc(Number(n) || 0));

function componentAmount(spec: ComponentSpec, basicMinor: number, grossMinor: number): number {
  const base = spec.percentOf === 'BASIC' ? basicMinor : grossMinor;
  if (spec.percentOf && spec.percent !== null && spec.percent !== undefined) {
    return wholeRupee((base * int(spec.percent)) / 100);
  }
  return Math.max(0, int(spec.amountMinor));
}

/** Print order on a payslip — BASIC first, balancing line last. */
function orderOf(code: string): number {
  const order = ['BASIC', 'HRA', 'DA', 'TRANSPORT', 'MEDICAL', 'SPECIAL'];
  const i = order.indexOf(code);
  if (i >= 0) return i;
  const d = ['PF', 'PROF_TAX', 'TDS', 'LOAN', 'LOP', 'OTHER'];
  const j = d.indexOf(code);
  return 100 + (j >= 0 ? j : 50);
}

/**
 * Compute a month from a salary's COMPONENTS.
 *
 * Three invariants, all of which a payslip reader will check by adding the
 * printed columns:
 *
 *  1. The earnings lines sum to GROSS exactly. Percent components are rounded to
 *     a whole rupee, so the residue goes to the SPECIAL balancing line rather
 *     than being left as a rupee that appears nowhere.
 *  2. The deduction lines sum to DEDUCTIONS exactly, in paise.
 *  3. gross − deductions = net, and NET IS NEVER NEGATIVE. A payslip that paid a
 *     negative salary is a number no bank will honour, so when deductions would
 *     exceed gross the over-deduction is dropped from the most discretionary
 *     line and REPORTED in `warnings` — the desk is told rather than silently
 *     under-paying someone.
 */
export function computeFromComponents(input: ComputeInput): SalaryComputation {
  const warnings: string[] = [];
  const grossMinor = int(input.grossMinor);
  if (grossMinor <= 0) throw unprocessable('Salary must be a positive whole amount');
  if (grossMinor % 100 !== 0) throw unprocessable('Salary must be in whole rupees');
  const dim = Math.max(1, int(input.daysInMonth));

  const comps = (input.components ?? []).filter((c) => c && COMPONENT_KINDS.includes(componentMeta(c.code).kind));
  const earningSpecs = comps.filter((c) => componentMeta(c.code).kind === 'EARNING');
  const deductionSpecs = comps.filter((c) => componentMeta(c.code).kind === 'DEDUCTION');

  // Basic first: almost everything else is a percentage OF basic, so it has to
  // be resolved before any other line can be priced.
  const basicSpec = earningSpecs.find((c) => c.code === 'BASIC');
  let basicMinor = basicSpec ? componentAmount(basicSpec, grossMinor, grossMinor) : wholeRupee((grossMinor * 50) / 100);
  if (basicMinor <= 0 || basicMinor > grossMinor) {
    warnings.push('Basic pay must be between ₹1 and the monthly gross — defaulted to 50%.');
    basicMinor = wholeRupee((grossMinor * 50) / 100);
  }

  const earnings: SalaryLine[] = [];
  let declaredEarningsMinor = 0;
  let specialIdx = -1;
  for (const spec of earningSpecs) {
    const meta = componentMeta(spec.code);
    if (spec.code === 'BASIC') {
      earnings.push({ code: 'BASIC', label: spec.label || meta.label, amountMinor: basicMinor, taxable: !!spec.isTaxable });
      declaredEarningsMinor += basicMinor;
      continue;
    }
    if (spec.code === 'SPECIAL') specialIdx = earnings.length;
    const amount = componentAmount(spec, basicMinor, grossMinor);
    declaredEarningsMinor += amount;
    earnings.push({ code: spec.code, label: spec.label || meta.label, amountMinor: amount, taxable: !!spec.isTaxable });
  }

  // The balancing line. Without it the printed earnings do not add up to the
  // gross printed at the foot of the slip — the exact complaint this desk had
  // before allowances were data.
  const residue = grossMinor - declaredEarningsMinor;
  let residueMinor = 0;
  if (residue !== 0) {
    if (specialIdx >= 0) {
      earnings[specialIdx].amountMinor += residue;
      residueMinor = residue;
    } else {
      warnings.push(
        `Components declare ₹${Math.round(declaredEarningsMinor / 100)} but gross is ₹${Math.round(grossMinor / 100)} — a Special Allowance balancing line was added.`,
      );
      earnings.push({ code: 'SPECIAL', label: COMPONENT_CATALOG.SPECIAL.label, amountMinor: residue, taxable: false });
      residueMinor = residue;
    }
  }
  if (specialIdx >= 0 && earnings[specialIdx].amountMinor < 0) {
    // The components say more than the gross. Silently clamping here would leave
    // the desk believing a salary they cannot pay is valid, so it is reported.
    warnings.push(
      `Components declare ₹${Math.round(declaredEarningsMinor / 100)} against a gross of ₹${Math.round(grossMinor / 100)} — the shortfall was taken off the balancing line.`,
    );
    earnings[specialIdx].amountMinor = 0;
  } else if (specialIdx >= 0 && residue < 0) {
    warnings.push(
      `Components declare more than the gross — ₹${Math.round(-residue / 100)} was taken off the balancing line.`,
    );
  }
  earnings.sort((a, b) => orderOf(a.code) - orderOf(b.code));

  let deductions: SalaryLine[] = [];
  for (const spec of deductionSpecs) {
    const meta = componentMeta(spec.code);
    if (spec.code === 'TDS' || spec.code === 'LOAN') continue; // handled below
    deductions.push({
      code: spec.code,
      label: spec.label || meta.label,
      amountMinor: componentAmount(spec, basicMinor, grossMinor),
      taxable: false,
    });
  }

  // TDS and loan recovery are COMPUTED, never typed — so they are applied from
  // the computed amount whether or not the salary record happens to declare a
  // component for them. Gating them on a declared component silently
  // under-collected tax: a structure without a TDS line paid no income tax at
  // all, and nothing in the response said so.
  const tdsAmount = int(input.taxMinor);
  if (tdsAmount > 0) {
    deductions.push({ code: 'TDS', label: 'Income Tax (TDS)', amountMinor: tdsAmount, taxable: false });
    if (!deductionSpecs.some((s) => s.code === 'TDS')) {
      warnings.push('Income tax was deducted even though this salary structure declares no TDS line — add one so the payslip shows it.');
    }
  }
  const loanAmount = int(input.loanMinor);
  if (loanAmount > 0) {
    deductions.push({ code: 'LOAN', label: 'Loan / Advance Recovery', amountMinor: loanAmount, taxable: false });
    if (!deductionSpecs.some((s) => s.code === 'LOAN')) {
      warnings.push('A loan recovery was deducted even though this salary structure declares no LOAN line.');
    }
  }
  deductions.sort((a, b) => orderOf(a.code) - orderOf(b.code));

  const perDayMinor = Math.max(100, wholeRupee(grossMinor / dim));
  const wanted = Math.min(Math.max(0, int(input.lopDays)), dim);
  const fixed = deductions.reduce((s, d) => s + d.amountMinor, 0);
  const affordable = Math.max(0, Math.floor((grossMinor - fixed) / perDayMinor));
  const applied = Math.min(wanted, affordable);
  if (applied > 0) {
    deductions.push({
      code: 'LOP',
      label: `Loss of Pay (${applied} day${applied === 1 ? '' : 's'})`,
      amountMinor: applied * perDayMinor,
      taxable: false,
    });
  }
  if (applied < wanted) {
    warnings.push(
      `Loss of pay capped at ${applied} day${applied === 1 ? '' : 's'} — ${wanted} would have left a negative net.`,
    );
  }

  let deductionsMinor = deductions.reduce((s, d) => s + d.amountMinor, 0);
  if (deductionsMinor > grossMinor) {
    const excess = deductionsMinor - grossMinor;
    let left = excess;
    for (const code of ['OTHER', 'LOAN', 'PROF_TAX', 'TDS']) {
      const line = deductions.find((d) => d.code === code);
      if (!line || left <= 0) continue;
      const take = Math.min(line.amountMinor, left);
      line.amountMinor -= take;
      left -= take;
    }
    deductions = deductions.filter((d) => d.amountMinor > 0);
    deductionsMinor = deductions.reduce((s, d) => s + d.amountMinor, 0);
    warnings.push(`Deductions exceeded gross by ₹${Math.round(left / 100)} — that amount was not withheld.`);
  }

  return {
    grossMinor,
    basicMinor,
    deductionsMinor,
    netMinor: grossMinor - deductionsMinor,
    earnings,
    deductions,
    taxableMinor: earnings.filter((e) => e.taxable).reduce((s, e) => s + e.amountMinor, 0),
    perDayMinor,
    lopDays: applied,
    declaredEarningsMinor,
    residueMinor,
    warnings,
  };
}

/** The default component set for a gross — the old 50/40/12 rule, as data. */
export function defaultComponents(grossMinor: number): ComponentSpec[] {
  const g = int(grossMinor);
  const basic = wholeRupee((g * 50) / 100);
  return [
    { code: 'BASIC', percentOf: 'GROSS', percent: 50, isTaxable: false, sequence: 0 },
    { code: 'HRA', percentOf: 'BASIC', percent: 40, isTaxable: true, sequence: 1 },
    { code: 'SPECIAL', amountMinor: Math.max(0, g - basic - wholeRupee((basic * 40) / 100)), isTaxable: false, sequence: 2 },
    { code: 'PF', percentOf: 'BASIC', percent: 12, isTaxable: false, sequence: 0 },
    { code: 'PROF_TAX', amountMinor: 20000, isTaxable: false, sequence: 1 },
    { code: 'TDS', amountMinor: 0, isTaxable: false, sequence: 2 },
  ];
}

// ── Reading a payslip's own JSON lines back ────────────────────────────────
//
// A stored earnings line is only {label, amountMinor}, so taxable-ness and TDS
// have to be recovered from the canonical label. This is why the computation
// writes "HRA" / "Dearness Allowance" / "Income Tax (TDS)" rather than free text.

const parseLines = (json: string): { label: string; amountMinor: number }[] => {
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((l) => l && typeof l.label === 'string')
      .map((l) => ({ label: l.label, amountMinor: Number(l.amountMinor) || 0 }));
  } catch {
    return [];
  }
};

const TAXABLE_LABEL = /^(HRA|DA|Dearness Allow)/i;
const TDS_LABEL = /income tax/i;

export function taxableOfLines(json: string): number {
  return parseLines(json).reduce((s, l) => s + (TAXABLE_LABEL.test(l.label) ? l.amountMinor : 0), 0);
}

export function tdsOfLines(json: string): number {
  return parseLines(json).reduce((s, l) => s + (TDS_LABEL.test(l.label) ? l.amountMinor : 0), 0);
}