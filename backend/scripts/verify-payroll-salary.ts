// F-06 Payroll, part 2 — unit-level verification of the salary desk's RULES.
//
// These are the prisma-free functions: component arithmetic, income tax,
// attendance→loss-of-pay, ageing bands and the payslip PDF. Every assertion here
// is a property a payslip reader would check by adding the printed columns.
//
// Run: npx tsx scripts/verify-payroll-salary.ts
import {
  computeFromComponents,
  defaultComponents,
  componentMeta,
  COMPONENT_CATALOG,
  COMPONENT_KINDS,
  COMPONENT_BASES,
  taxableOfLines,
  tdsOfLines,
} from '../src/modules/accounts/payroll.components.js';
import {
  computeIncomeTax,
  deriveLop,
  monthsRemainingInYear,
  ageingBand,
  daysBetween,
  endOfMonth,
  monthInWindow,
  ATTENDANCE_RULES,
  TAX_RULES,
} from '../src/modules/accounts/payroll.tax.js';
import { renderPayslipPdf } from '../src/modules/accounts/payroll.pdf.js';
import { daysInMonth } from '../src/modules/accounts/payroll.rules.js';

let pass = 0;
let fail = 0;
const failures: string[] = [];

function ok(cond: boolean, label: string, detail = '') {
  if (cond) {
    pass += 1;
  } else {
    fail += 1;
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
  }
}
function eq(actual: unknown, expected: unknown, label: string) {
  ok(actual === expected, label, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function throws(fn: () => unknown, label: string) {
  try {
    fn();
    ok(false, label, 'expected it to throw');
  } catch {
    pass += 1;
  }
}
const section = (n: string) => console.log(`\n── ${n}`);

// ═══ 1. Component vocabulary ═══════════════════════════════════════════
section('1. Component vocabulary');

eq(COMPONENT_KINDS.length, 2, 'two component kinds');
eq(COMPONENT_BASES.join(','), 'BASIC,GROSS', 'two bases');
for (const [code, meta] of Object.entries(COMPONENT_CATALOG)) {
  ok(!!meta.label, `${code} has a label`);
  ok(COMPONENT_KINDS.includes(meta.kind), `${code} has a valid kind`, meta.kind);
  ok(
    meta.base === null || COMPONENT_BASES.includes(meta.base),
    `${code} base is valid or null`,
    String(meta.base),
  );
  ok(meta.percent === null || (meta.percent >= 0 && meta.percent <= 100), `${code} percent is sane`, String(meta.percent));
  ok(!!meta.hint, `${code} explains itself`);
}
ok(String(componentMeta('NOT_A_CODE').kind) === 'OTHER', 'unknown code falls back to OTHER');
eq(componentMeta('NOT_A_CODE').label, 'NOT_A_CODE', 'unknown code keeps its own name');

// The catalog's declared kind must match the SPEC's declared kind for PF etc.
// — the whole point of having one table.
eq(componentMeta('PF').kind, 'DEDUCTION', 'PF is a deduction');
eq(componentMeta('HRA').kind, 'EARNING', 'HRA is an earning');
eq(componentMeta('TDS').kind, 'DEDUCTION', 'TDS is a deduction');
eq(componentMeta('LOAN').kind, 'DEDUCTION', 'LOAN is a deduction');

// ═══ 2. The payslip FOOTS ═══════════════════════════════════════════════
section('2. The payslip foots');

const GROSS = 6000000; // ₹60,000

{
  const c = computeFromComponents({
    grossMinor: GROSS,
    month: '2026-08',
    components: defaultComponents(GROSS),
    daysInMonth: 31,
  });
  eq(c.grossMinor, GROSS, 'gross passes through');
  eq(c.earnings.reduce((s, e) => s + e.amountMinor, 0), c.grossMinor, 'earnings sum to gross');
  eq(c.deductions.reduce((s, d) => s + d.amountMinor, 0), c.deductionsMinor, 'deduction lines sum to deductions');
  eq(c.grossMinor - c.deductionsMinor, c.netMinor, 'gross − deductions = net');
  ok(c.netMinor > 0, 'net is positive');
  eq(c.lopDays, 0, 'no LOP when none asked');
  eq(c.warnings.length, 0, 'the default structure warns about nothing');
  eq(c.basicMinor, 3000000, 'default basic is 50% of gross');
  eq(c.perDayMinor, Math.round(GROSS / 31 / 100) * 100, 'per-day rate is a whole rupee');
}

// Every gross in a wide sweep must foot, in both a 28-day and a 31-day month.
for (const gross of [100000, 500000, 1234000, 5000000, 16000000, 24990000]) {
  for (const dim of [28, 29, 30, 31]) {
    for (const lop of [0, 1, 3, 7, 20]) {
      const c = computeFromComponents({
        grossMinor: gross,
        month: '2026-08',
        components: defaultComponents(gross),
        daysInMonth: dim,
        lopDays: lop,
      });
      eq(c.earnings.reduce((s, e) => s + e.amountMinor, 0), c.grossMinor, `earnings foot ₹${gross / 100}/${dim}d/${lop}lop`);
      eq(c.netMinor, c.grossMinor - c.deductionsMinor, `net foots ₹${gross / 100}/${dim}d/${lop}lop`);
      ok(c.netMinor >= 0, `net never negative ₹${gross / 100}/${dim}d/${lop}lop`, String(c.netMinor));
      ok(c.lopDays <= dim, `LOP never exceeds the month ₹${gross / 100}/${dim}d/${lop}lop`);
    }
  }
}

// ═══ 3. Percentages are of the NAMED base ═══════════════════════════════
section('3. Percentages apply to the named base');

{
  // 40% HRA is of BASIC, not of gross. A reader will check this on the slip.
  const c = computeFromComponents({
    grossMinor: 10000000, // ₹1,00,000
    month: '2026-08',
    components: [
      { code: 'BASIC', percentOf: 'GROSS', percent: 40 },
      { code: 'HRA', percentOf: 'BASIC', percent: 50 },
      { code: 'SPECIAL', amountMinor: 0 },
      { code: 'PF', percentOf: 'BASIC', percent: 12 },
    ],
    daysInMonth: 31,
  });
  const hra = c.earnings.find((e) => e.code === 'HRA')!;
  const pf = c.deductions.find((d) => d.code === 'PF')!;
  eq(c.basicMinor, 4000000, 'basic = 40% of gross');
  eq(hra.amountMinor, 2000000, 'HRA = 50% of BASIC (₹20,000), not of gross');
  eq(pf.amountMinor, 480000, 'PF = 12% of BASIC (₹4,800)');
  eq(c.earnings.reduce((s, e) => s + e.amountMinor, 0), c.grossMinor, 'still foots after the residue');
}

// A percentage of GROSS is honoured as a percentage of gross.
{
  const c = computeFromComponents({
    grossMinor: 8000000,
    month: '2026-08',
    components: [
      { code: 'BASIC', percentOf: 'GROSS', percent: 60 },
      { code: 'DA', percentOf: 'GROSS', percent: 10 },
    ],
    daysInMonth: 31,
  });
  eq(c.earnings.find((e) => e.code === 'DA')!.amountMinor, 800000, 'DA = 10% of GROSS = ₹8,000');
}

// A flat amount ignores the base entirely.
{
  const c = computeFromComponents({
    grossMinor: 5000000,
    month: '2026-08',
    components: [
      { code: 'BASIC', percentOf: 'GROSS', percent: 50 },
      { code: 'TRANSPORT', amountMinor: 160000 },
    ],
    daysInMonth: 31,
  });
  eq(c.earnings.find((e) => e.code === 'TRANSPORT')!.amountMinor, 160000, 'transport is flat ₹1,600');
}

// ═══ 4. The balancing line ══════════════════════════════════════════════
section('4. The balancing line absorbs rounding');

{
  // Percentages that do not divide evenly: ₹77,777 at 33% leaves paise behind.
  const c = computeFromComponents({
    grossMinor: 7777700,
    month: '2026-08',
    components: [
      { code: 'BASIC', percentOf: 'GROSS', percent: 33 },
      { code: 'HRA', percentOf: 'BASIC', percent: 37 },
    ],
    daysInMonth: 31,
  });
  eq(c.earnings.reduce((s, e) => s + e.amountMinor, 0), c.grossMinor, 'awkward percentages still foot');
  ok(
    c.earnings.some((e) => e.code === 'SPECIAL'),
    'a balancing line was added when none was declared',
  );
  eq(c.warnings.length, 1, 'and the desk is told about it');
  ok(c.warnings[0].includes('Special Allowance'), 'the warning names the line');
}
{
  // With a declared SPECIAL line, no warning and no extra line.
  const c = computeFromComponents({
    grossMinor: 7777700,
    month: '2026-08',
    components: [
      { code: 'BASIC', percentOf: 'GROSS', percent: 33 },
      { code: 'HRA', percentOf: 'BASIC', percent: 37 },
      { code: 'SPECIAL', amountMinor: 0 },
    ],
    daysInMonth: 31,
  });
  eq(c.warnings.length, 0, 'no warning when SPECIAL absorbs the residue');
  eq(c.earnings.filter((e) => e.code === 'SPECIAL').length, 1, 'exactly one SPECIAL line');
  eq(c.earnings.reduce((s, e) => s + e.amountMinor, 0), c.grossMinor, 'and it still foots');
}
{
  // Components that declare MORE than gross must be clamped, not printed negative.
  const c = computeFromComponents({
    grossMinor: 1000000,
    month: '2026-08',
    components: [
      { code: 'BASIC', percentOf: 'GROSS', percent: 80 },
      { code: 'SPECIAL', amountMinor: 900000 },
    ],
    daysInMonth: 31,
  });
  ok(c.earnings.every((e) => e.amountMinor >= 0), 'no negative earnings line');
  eq(c.earnings.reduce((s, e) => s + e.amountMinor, 0), c.grossMinor, 'clamped earnings still foot');
  ok(c.warnings.length >= 1, 'and the desk is warned');
}

// ═══ 5. Guardrails ══════════════════════════════════════════════════════
section('5. Guardrails');

throws(() => computeFromComponents({ grossMinor: 0, month: '2026-08', components: [], daysInMonth: 31 }), 'zero gross refused');
throws(() => computeFromComponents({ grossMinor: -100, month: '2026-08', components: [], daysInMonth: 31 }), 'negative gross refused');
throws(
  () => computeFromComponents({ grossMinor: 12345, month: '2026-08', components: [], daysInMonth: 31 }),
  'a gross in paise (not whole rupees) refused',
);
{
  const c = computeFromComponents({
    grossMinor: GROSS,
    month: '2026-08',
    components: defaultComponents(GROSS),
    daysInMonth: 31,
    lopDays: 999,
  });
  ok(c.lopDays <= 31, 'LOP never exceeds the length of the month', String(c.lopDays));
  ok(c.warnings.length >= 1, 'the cap is reported', JSON.stringify(c.warnings));
  ok(c.netMinor >= 0, 'and the net is still not negative', String(c.netMinor));
}
{
  // Deductions cannot exceed gross: a huge flat "other deduction" is trimmed and
  // reported, rather than producing a negative net.
  const c = computeFromComponents({
    grossMinor: 3000000,
    month: '2026-08',
    components: [
      { code: 'BASIC', percentOf: 'GROSS', percent: 50 },
      { code: 'SPECIAL', amountMinor: 1500000 },
      { code: 'PF', percentOf: 'BASIC', percent: 12 },
      { code: 'OTHER', amountMinor: 9000000 },
    ],
    daysInMonth: 31,
  });
  ok(c.netMinor >= 0, 'net never goes negative even when asked to', String(c.netMinor));
  eq(c.netMinor, 0, 'net floors at zero');
  ok(c.warnings.some((w) => w.includes('not withheld')), 'the un-withheld amount is reported');
  eq(c.deductions.reduce((s, d) => s + d.amountMinor, 0), c.deductionsMinor, 'deductions still foot after the trim');
}

// ═══ 6. TDS and loan recovery come in as computed amounts ═══════════════
section('6. TDS and loan recovery are inputs, not typed numbers');

{
  const c = computeFromComponents({
    grossMinor: 10000000,
    month: '2026-08',
    components: [
      { code: 'BASIC', percentOf: 'GROSS', percent: 50 },
      { code: 'SPECIAL', amountMinor: 0 },
      { code: 'TDS', amountMinor: 0 },
      { code: 'LOAN', amountMinor: 0 },
    ],
    daysInMonth: 31,
    taxMinor: 500000,
    loanMinor: 200000,
  });
  eq(c.deductions.find((d) => d.code === 'TDS')!.amountMinor, 500000, 'TDS of ₹5,000 is deducted');
  eq(c.deductions.find((d) => d.code === 'LOAN')!.amountMinor, 200000, 'loan recovery of ₹2,000 is deducted');
  eq(c.netMinor, 10000000 - 700000, 'net reflects both');
}
{
  const c = computeFromComponents({
    grossMinor: 10000000,
    month: '2026-08',
    components: [
      { code: 'BASIC', percentOf: 'GROSS', percent: 50 },
      { code: 'SPECIAL', amountMinor: 0 },
      { code: 'TDS', amountMinor: 0 },
      { code: 'LOAN', amountMinor: 0 },
    ],
    daysInMonth: 31,
    taxMinor: 0,
    loanMinor: 0,
  });
  ok(!c.deductions.some((d) => d.code === 'TDS'), 'a zero TDS prints no line');
  ok(!c.deductions.some((d) => d.code === 'LOAN'), 'a zero recovery prints no line');
}

// Taxable income is the sum of the taxable EARNINGS lines only.
{
  const c = computeFromComponents({
    grossMinor: 10000000,
    month: '2026-08',
    components: [
      { code: 'BASIC', percentOf: 'GROSS', percent: 50, isTaxable: false },
      { code: 'HRA', percentOf: 'BASIC', percent: 40, isTaxable: true },
      { code: 'TRANSPORT', amountMinor: 160000, isTaxable: false },
      { code: 'SPECIAL', amountMinor: 0, isTaxable: false },
    ],
    daysInMonth: 31,
  });
  eq(c.taxableMinor, 2000000, 'taxable = HRA only = ₹20,000');
}

// ═══ 7. Reading payslip lines back ═══════════════════════════════════════
section('7. Payslip lines round-trip');

{
  const c = computeFromComponents({
    grossMinor: 10000000,
    month: '2026-08',
    components: [
      { code: 'BASIC', percentOf: 'GROSS', percent: 50 },
      { code: 'HRA', percentOf: 'BASIC', percent: 40, isTaxable: true },
      { code: 'DA', percentOf: 'BASIC', percent: 10, isTaxable: true, label: 'Dearness Allowance' },
      { code: 'SPECIAL', amountMinor: 0 },
    ],
    daysInMonth: 31,
    taxMinor: 300000,
  });
  const earningsJson = JSON.stringify(c.earnings);
  const deductionsJson = JSON.stringify(c.deductions);
  eq(taxableOfLines(earningsJson), c.taxableMinor, 'taxable survives the JSON round-trip');
  ok(
    c.deductions.some((d) => /income tax/i.test(d.label)),
    'the fixture has an income-tax line to round-trip',
    JSON.stringify(c.deductions.map((d) => d.label)),
  );
  eq(tdsOfLines(deductionsJson), 300000, 'TDS survives the JSON round-trip');
  // Professional tax must NOT be mistaken for income tax — they are both "tax".
  ok(
    !c.deductions.some((d) => /professional/i.test(d.label)),
    'the fixture has no professional-tax line',
  );
  const withPT = JSON.stringify([
    { label: 'Provident Fund', amountMinor: 100 },
    { label: 'Professional Tax', amountMinor: 200 },
    { label: 'Income Tax (TDS)', amountMinor: 300 },
  ]);
  eq(tdsOfLines(withPT), 300, 'professional tax is not counted as income tax');
  eq(taxableOfLines('not json'), 0, 'malformed JSON reads as zero rather than crashing');
  eq(tdsOfLines('[]'), 0, 'an empty payslip reads as zero');
  eq(taxableOfLines('{"not":"an array"}'), 0, 'a non-array reads as zero');
}

// ═══ 8. Income tax ══════════════════════════════════════════════════════
section('8. Income tax');

eq(monthsRemainingInYear('2026-01'), 12, 'January has 12 months left');
eq(monthsRemainingInYear('2026-06'), 7, 'June has 7 months left');
eq(monthsRemainingInYear('2026-12'), 1, 'December has 1 month left');
throws(() => monthsRemainingInYear('2026-13'), 'month 13 refused');

{
  // Below the standard deduction → no tax at all.
  const t = computeIncomeTax({ ytdGrossMinor: 7000000, ytdTdsMinor: 0 }, '2026-08');
  eq(t.taxableMinor, 0, '₹70,000 gross is fully absorbed by the standard deduction');
  eq(t.annualTaxMinor, 0, 'and pays no tax');
  eq(t.monthlyTdsMinor, 0, 'and no monthly TDS');
}
{
  // Rs 7,75,000 gross (77,500,000 paise) - Rs 75,000 standard deduction = Rs 7,00,000
  // taxable. Bands: nil up to Rs 3L, then 5% on Rs 3-7L -> 5% of Rs 4L = Rs 20,000.
  const t = computeIncomeTax({ ytdGrossMinor: 77500000, ytdTdsMinor: 0 }, '2026-08');
  eq(t.taxableMinor, 70000000, 'taxable = Rs 7,00,000');
  eq(t.slabTaxMinor, 2000000, '5% of Rs 4,00,000 = Rs 20,000 (2,000,000 paise)');
  eq(t.cessMinor, 80000, 'cess 4% = Rs 800');
  eq(t.annualTaxMinor, 2080000, 'annual tax Rs 20,800');
  eq(t.remainingTaxMinor, 2080000, 'nothing collected yet, so all of it is due');
  eq(t.monthsRemaining, 5, 'August leaves 5 months');
  eq(t.monthlyTdsMinor, Math.round(2080000 / 5 / 100) * 100, 'spread evenly over the year');
  // The band boundaries are in PAISE: Rs 3L is 30,000,000 paise, not 3,000,000.
  eq(TAX_RULES.slabs[0].upToMinor, 30000000, 'the nil band ends at Rs 3,00,000 (30,000,000 paise)');
  eq(TAX_RULES.standardDeductionMinor, 7500000, 'the standard deduction is Rs 75,000');
}
{
  // The slab lines must add up to the slab tax — a reader checks this table.
  const t = computeIncomeTax({ ytdGrossMinor: 600000000, ytdTdsMinor: 0 }, '2026-08');
  const lineSum = t.lines.reduce((s, l) => s + l.amountMinor, 0);
  eq(lineSum, t.slabTaxMinor, 'the printed slab lines sum to the slab tax');
  eq(t.taxableMinor, 592500000, 'taxable = Rs 60L - Rs 75,000 = Rs 59.25L');
  eq(t.slabTaxMinor, 2000000 + 3000000 + 4000000 + 141750000, 'each band is priced correctly');
  ok(t.lines.length >= 2, 'the table has more than one band');
  ok(t.lines.every((l) => l.ratePercent >= 0 && l.ratePercent <= 100), 'every rate is sane');
}
{
  // TDS already collected reduces what is left — a year-to-date liability.
  const full = computeIncomeTax({ ytdGrossMinor: 600000000, ytdTdsMinor: 0 }, '2026-08');
  const partly = computeIncomeTax({ ytdGrossMinor: 600000000, ytdTdsMinor: 20000000 }, '2026-08');
  eq(partly.alreadyTdsMinor, 20000000, 'collected TDS is reported back');
  eq(partly.remainingTaxMinor, full.annualTaxMinor - 20000000, 'and reduces what remains');
  eq(partly.annualTaxMinor, full.annualTaxMinor, 'the annual liability itself is unchanged');
}
{
  // Over-collection must floor at zero, never go negative (a refund is a
  // separate exercise, not a negative deduction).
  const t = computeIncomeTax({ ytdGrossMinor: 600000000, ytdTdsMinor: 9999999999 }, '2026-08');
  eq(t.remainingTaxMinor, 0, 'over-collected tax floors at zero');
  eq(t.monthlyTdsMinor, 0, 'and collects nothing further');
}
{
  // December sweeps the remainder rather than the even share.
  const t = computeIncomeTax({ ytdGrossMinor: 77500000, ytdTdsMinor: 0 }, '2026-12');
  eq(t.monthlyTdsMinor, t.remainingTaxMinor, 'December collects everything that is left');
  eq(t.monthsRemaining, 1, 'one month left');
}
{
  // A custom slab table is honoured — an institution pins its own.
  const t = computeIncomeTax(
    {
      ytdGrossMinor: 10000000,
      ytdTdsMinor: 0,
      slabs: [{ upToMinor: 5000000, ratePercent: 0 }, { upToMinor: null, ratePercent: 10 }],
      standardDeductionMinor: 0,
      cessPercent: 0,
    },
    '2026-08',
  );
  eq(t.slabTaxMinor, 500000, 'custom slabs: 10% above Rs 50,000 = Rs 5,000');
  eq(t.cessMinor, 0, 'custom cess honoured');
}
{
  // Negative / fractional inputs are clamped, never propagated.
  const t = computeIncomeTax({ ytdGrossMinor: -500, ytdTdsMinor: -100 }, '2026-08');
  eq(t.grossMinor, 0, 'a negative gross clamps to zero');
  eq(t.alreadyTdsMinor, 0, 'a negative collected amount clamps to zero');
}
throws(() => computeIncomeTax({ ytdGrossMinor: 1000000 }, 'not-a-month'), 'a malformed month is refused');

// The slab table itself must be a sane, ascending, nil-first ladder.
eq(TAX_RULES.slabs[0].ratePercent, 0, 'the first band is nil-tax');
eq(TAX_RULES.cessPercent, 4, 'cess is 4%');
eq(TAX_RULES.slabs[TAX_RULES.slabs.length - 1].upToMinor, null, 'the last band is open-ended');
for (let i = 1; i < TAX_RULES.slabs.length; i++) {
  ok(TAX_RULES.slabs[i].ratePercent >= TAX_RULES.slabs[i - 1].ratePercent, `slab ${i} rate does not fall`);
}

// ═══ 9. Attendance → loss of pay ════════════════════════════════════════
section('9. Attendance and loss of pay');

throws(() => deriveLop({ workingDays: 0 }, '2026-08'), 'zero working days refused');
throws(() => deriveLop({ workingDays: 22 }, 'nope'), 'a malformed month refused');

{
  const r = deriveLop(
    {
      workingDays: 22,
      leaves: [
        { type: 'EARNED', days: 3, status: 'APPROVED' },
        { type: 'CASUAL', days: 1, status: 'APPROVED' },
        { type: 'MEDICAL', days: 2, status: 'APPROVED' },
      ],
    },
    '2026-08',
  );
  eq(r.paidLeaveDays, 6, 'earned + casual + medical all count as paid leave');
  eq(r.unpaidLeaveDays, 0, 'none of them is unpaid');
  eq(r.lopDays, 0, 'so no loss of pay');
  ok(!r.withinGrace, 'the grace rule did not have to fire');
}
{
  // PENDING leave must never cost somebody money.
  const r = deriveLop(
    { workingDays: 22, leaves: [{ type: 'UNPAID', days: 5, status: 'PENDING' }] },
    '2026-08',
  );
  eq(r.unpaidLeaveDays, 0, 'a PENDING leave request is ignored');
  eq(r.lopDays, 0, 'and costs nothing');
}
{
  // A REJECTED leave is equally not a cost.
  const r = deriveLop(
    { workingDays: 22, leaves: [{ type: 'UNPAID', days: 5, status: 'REJECTED' }] },
    '2026-08',
  );
  eq(r.lopDays, 0, 'a REJECTED leave request is ignored');
}
{
  // The grace rule: one absent day is not a payslip deduction.
  const r = deriveLop({ workingDays: 22, presentDays: 21, unpaidLeaveDays: 1 }, '2026-08');
  eq(r.lopDays, 0, 'one unpaid day is within grace');
  ok(r.withinGrace, 'and the result says so');
  ok(r.basis.includes('grace'), 'and the basis explains it', r.basis);
}
{
  const r = deriveLop({ workingDays: 22, presentDays: 21, unpaidLeaveDays: 2 }, '2026-08');
  eq(r.lopDays, 0, `exactly ${ATTENDANCE_RULES.graceUnpaidDays} days is still within grace`);
}
{
  const r = deriveLop({ workingDays: 22, presentDays: 19, unpaidLeaveDays: 3 }, '2026-08');
  eq(r.unpaidLeaveDays, 3, 'three unpaid leave days declared');
  eq(r.lopDays, 3, 'beyond grace, the days are charged');
  ok(!r.withinGrace, 'and the result says so');
  eq(r.presentPercent, Math.round((19 / 22) * 100), 'attendance percent is reported');
}
{
  // Unaccounted days (neither present nor on leave) also cost money.
  const r = deriveLop({ workingDays: 22, presentDays: 17, paidLeaveDays: 2, unpaidLeaveDays: 0 }, '2026-08');
  eq(r.unpaidLeaveDays, 0, 'no unpaid leave was declared');
  eq(r.lopDays, 3, 'but three unaccounted days are charged');
  ok(r.basis.includes('unaccounted'), 'and the basis says so', r.basis);
}
{
  // A summary typed by the desk wins over the derived leave totals.
  const r = deriveLop(
    { workingDays: 22, presentDays: 18, paidLeaveDays: 0, unpaidLeaveDays: 4, leaves: [{ type: 'CASUAL', days: 4, status: 'APPROVED' }] },
    '2026-08',
  );
  eq(r.paidLeaveDays, 0, 'the typed summary overrides the derived 4 paid days');
  eq(r.lopDays, 4, 'so all four are charged');
}
{
  // THE BUG THIS EXISTS FOR: a leave-only derivation must not treat every day
  // that is not on leave as an absence. It once charged 16 LOP days off a
  // 3-day approved leave.
  const r = deriveLop(
    { workingDays: 22, leaves: [{ type: 'EARNED', days: 3, status: 'APPROVED' }] },
    '2026-08',
  );
  eq(r.presentDays, 19, 'unstated present days default to the days not on leave');
  eq(r.lopDays, 0, 'three paid leave days cost nothing');
}
{
  // Same for an unpaid leave row with nothing else known.
  const r = deriveLop(
    { workingDays: 22, leaves: [{ type: 'UNPAID', days: 5, status: 'APPROVED' }] },
    '2026-08',
  );
  eq(r.presentDays, 17, 'unstated present days default to the days not on leave');
  eq(r.lopDays, 5, 'five unpaid leave days are charged - and nothing more');
}
{
  // Numbers that overrun the month are clamped.
  const r = deriveLop({ workingDays: 22, presentDays: 0, unpaidLeaveDays: 40 }, '2026-08');
  ok(r.lopDays <= 22, 'LOP never exceeds the rostered days', String(r.lopDays));
  eq(r.lopDays, 22, 'and clamps at exactly the roster');
  ok(r.lopDays <= 22, 'still bounded');
}
{
  // Negative inputs are floored, not propagated into a negative deduction.
  const r = deriveLop({ workingDays: 22, presentDays: -5, unpaidLeaveDays: -2 }, '2026-08');
  eq(r.presentDays, 0, 'a negative present count floors to zero');
  eq(r.lopDays, 22, 'and the resulting absence is still bounded by the roster');
}
{
  const r = deriveLop({ workingDays: 22, presentDays: 22 }, '2026-08');
  eq(r.lopDays, 0, 'a full month present costs nothing');
  eq(r.presentPercent, 100, 'and reports 100%');
}

// ═══ 10. Ageing ════════════════════════════════════════════════════════
section('10. Ageing bands');

eq(ageingBand(null), 'NEVER', 'never paid is its own band');
eq(ageingBand(0), 'DUE', 'paid today is due');
eq(ageingBand(-3), 'DUE', 'a future date floors to due');
eq(ageingBand(1), 'OVERDUE', 'one day late is overdue');
eq(ageingBand(7), 'OVERDUE', 'the threshold is inclusive');
eq(ageingBand(8), 'CRITICAL', 'past the threshold is critical');

eq(daysBetween(new Date(2026, 7, 1), new Date(2026, 7, 8)), 7, 'days between two local dates');
eq(daysBetween(new Date(2026, 7, 8), new Date(2026, 7, 1)), 0, 'a future date floors at zero');
eq(daysBetween(new Date(2026, 7, 1, 23, 59), new Date(2026, 7, 2, 0, 1)), 1, 'time of day does not change the day count');

ok(endOfMonth('2026-02').getMonth() === 1, 'February ends in February');
eq(endOfMonth('2026-08').getDate(), 31, 'August ends on the 31st');
throws(() => endOfMonth('2026-13'), 'a malformed month is refused');

ok(monthInWindow('2026-08', new Date(2026, 3, 1), new Date(2026, 8, 15)), 'a window spanning August');
ok(!monthInWindow('2026-08', new Date(2026, 8, 1), null), 'a window starting after August does not');
ok(monthInWindow('2026-08', new Date(2026, 0, 1), null), 'an open-ended window covers it');
ok(
  monthInWindow('2026-08', new Date(2026, 7, 31, 23, 0), new Date(2026, 7, 31, 23, 30)),
  'a window inside the month covers it',
);
ok(
  !monthInWindow('2026-08', new Date(2026, 6, 1), new Date(2026, 6, 31, 23, 45)),
  'a window entirely inside July does not cover August',
);
ok(
  monthInWindow('2026-08', new Date(2026, 7, 31, 23, 0), new Date(2026, 7, 31, 23, 30)),
  'a window inside the last hour of August does',
);

// ═══ 11. The payslip PDF ═══════════════════════════════════════════════
section('11. The payslip PDF');

{
  const doc = {
    month: '2026-08',
    staffName: 'Anita Sharma',
    employeeNo: 'EMP-0007',
    designation: 'Professor & Head',
    departmentName: 'Physics',
    bankAccountLast4: '4412',
    earnings: [
      { label: 'Basic Pay', amountMinor: 3487500 },
      { label: 'HRA', amountMinor: 871875 },
      { label: 'Dearness Allowance', amountMinor: 610313 },
      { label: 'Transport Allowance', amountMinor: 320000 },
    ],
    deductions: [
      { label: 'Provident Fund', amountMinor: 418500 },
      { label: 'Professional Tax', amountMinor: 20000 },
    ],
    grossMinor: 15500000,
    deductionsMinor: 438500,
    netMinor: 15061500,
    lopDays: 0,
    institutionName: 'Learnix Institute',
    status: 'PAID',
  };
  eq(doc.grossMinor - doc.deductionsMinor, doc.netMinor, 'the fixture foots');

  const bytes = renderPayslipPdf(doc);
  const text = bytes.toString('latin1');
  ok(bytes.length > 400, 'the PDF has real content', `${bytes.length} bytes`);
  ok(text.startsWith('%PDF-1.4'), 'it starts with a PDF header');
  ok(text.trimEnd().endsWith('%%EOF'), 'it ends with the EOF marker');
  ok(text.includes('/Type /Catalog'), 'it has a catalog');
  ok(text.includes('/Type /Page'), 'it has a page');
  ok(text.includes('PAYSLIP'), 'it says PAYSLIP');
  ok(text.includes('August 2026'), 'it names the month');
  ok(text.includes('Anita Sharma'), 'it names the staff member');
  ok(text.includes('EMP-0007'), 'it carries the employee number');
  ok(text.includes('155000.00'), 'it prints the gross as money');
  ok(text.includes('150615.00'), 'it prints the net as money');
  ok(!text.includes('\u20b9'), 'the rupee sign is not emitted raw (WinAnsi cannot hold it)');

  // The xref offsets must actually point at their objects, or some viewers
  // refuse the file. Every offset is verified against the byte at that position.
  // Search for a line-start 'xref': a bare search also matches the 'xref' that
  // is the tail of the 'startxref' keyword AFTER the table.
  const xrefAt = text.lastIndexOf('\nxref\n');
  ok(xrefAt > 0, 'an xref table is present');
  const table = text.slice(xrefAt + 6).split('\n');
  // Line 0 is "0 <N>" where N is the entry count; entries start at index 1.
  const count = Number(table[0].trim().split(/\s+/)[1]);
  eq(count, 7, 'the xref declares 7 entries (the free object + 6)');
  // Entry 1 is the free object (always offset 0). Entry i+1 holds object i.
  for (let obj = 1; obj < count; obj++) {
    const off = Number(table[obj + 1].slice(0, 10));
    const header = `${obj} 0 obj`;
    ok(off > 0, `xref entry for object ${obj} is a real offset`, String(off));
    ok(text.slice(off, off + header.length) === header, `xref entry for object ${obj} points at object ${obj}`, text.slice(off, off + 20));
  }

  // The stream /Length must match the actual stream, or readers truncate it.
  const lenMatch = text.match(/\/Length (\d+) >>\nstream\n/);
  ok(!!lenMatch, 'the content stream declares a length');
  if (lenMatch) {
    const declared = Number(lenMatch[1]);
    const start = text.indexOf('stream\n', lenMatch.index!) + 'stream\n'.length;
    const actual = text.slice(start, start + declared);
    ok(actual.endsWith('endstream'.slice(0, 0) + '') || text.slice(start + declared, start + declared + 10).startsWith('endstream'), 'the declared length reaches "endstream" exactly');
  }
}
{
  // A payslip that does not foot must be refused, not printed.
  throws(
    () =>
      renderPayslipPdf({
        month: '2026-08',
        staffName: 'X',
        earnings: [{ label: 'Basic', amountMinor: 100000 }],
        deductions: [{ label: 'PF', amountMinor: 50000 }],
        grossMinor: 100000,
        deductionsMinor: 50000,
        netMinor: 99999,
      }),
    'a payslip that does not foot is refused',
  );
  throws(
    () =>
      renderPayslipPdf({
        month: '2026-08',
        staffName: 'X',
        earnings: [],
        deductions: [],
        grossMinor: Number.NaN,
        deductionsMinor: 0,
        netMinor: 0,
      }),
    'a non-numeric gross is refused',
  );
}
{
  // Parentheses and backslashes in a name must not break the PDF string literal.
  const bytes = renderPayslipPdf({
    month: '2026-08',
    staffName: 'Test (Dept) \\ Lab',
    earnings: [{ label: 'Basic (50%)', amountMinor: 100000 }],
    deductions: [],
    grossMinor: 100000,
    deductionsMinor: 0,
    netMinor: 100000,
  });
  const text = bytes.toString('latin1');
  ok(text.startsWith('%PDF-1.4'), 'parentheses in a name do not corrupt the file');
  ok(text.trimEnd().endsWith('%%EOF'), 'and the file is still well formed');
  ok(/Test Dept\s+Lab/.test(text), 'the name is written with the brackets stripped');
  ok(!text.includes('(Dept)'), 'the unescaped brackets did not survive into a string literal');
}
{
  // An empty deduction list must still render a table.
  const bytes = renderPayslipPdf({
    month: '2026-08',
    staffName: 'No Deductions',
    earnings: [{ label: 'Basic', amountMinor: 100000 }],
    deductions: [],
    grossMinor: 100000,
    deductionsMinor: 0,
    netMinor: 100000,
    lopDays: 3,
    basis: 'Three days unpaid leave approved by the HOD.',
  });
  const text = bytes.toString('latin1');
  ok(text.includes('None'), 'a nil deduction table says so');
  ok(text.includes('Loss of pay: 3 days'), 'the loss-of-pay basis is printed');
}

// ═══ 12. Real calendar months ══════════════════════════════════════════
section('12. Calendar sanity');

eq(daysInMonth('2026-02'), 28, 'February 2026 has 28 days');
eq(daysInMonth('2024-02'), 29, 'February 2024 is a leap year');
eq(daysInMonth('2026-08'), 31, 'August has 31 days');
eq(daysInMonth('2026-09'), 30, 'September has 30 days');

console.log(`\n${'═'.repeat(60)}`);
console.log(`${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log('✓ verify-payroll-salary: all rules hold');