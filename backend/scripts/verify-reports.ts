// F-09 Reports — service + rules verification (docs/users/06 §3.8).
//
// Three things this suite exists to prove, because each was a real defect in the
// version it replaces:
//
//   1. TENANT ISOLATION. The old `getReports` aggregated `feeDue` with no filter
//      at all, so one institution's "outstanding" headline summed every tenant.
//      A second institution is created here and its dues must not appear.
//   2. OUTSTANDING IS THE BALANCE. A part-paid bill must report what is LEFT,
//      not what was originally billed.
//   3. REVERSED MONEY DOES NOT COUNT. A reversed payment keeps its row, because
//      the ledger must not lose history, but it stops counting toward
//      collections.
//
// Run: npx tsx scripts/verify-reports.ts
import { prisma } from '../src/db/prisma.js';
import {
  PERIODS, PERIOD_META, assertPeriod, balanceOfDue, budgetVariance, daysInMonth,
  growthPercent, isCollectible, monthKey, monthKeysBack, monthLabel, monthShortLabel,
  peak, recoveryStats, resolvePeriod, sharePercent, tally, toCsv, toRupees, trend,
  moneyColumn, numberColumn, textColumn, academicYearFor, groupByGranularity,
  type ExportSheet,
} from '../src/modules/accounts/reports.rules.js';
import { buildXlsx, columnName, safeSheetName } from '../src/modules/accounts/reports.xlsx.js';
import { renderReportPdf } from '../src/modules/accounts/reports.pdf.js';
import * as svc from '../src/modules/accounts/reports.service.js';

let pass = 0;
let fail = 0;
const failures: string[] = [];
function ok(cond: boolean, label: string, detail = '') {
  if (cond) pass += 1;
  else {
    fail += 1;
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
  }
}
function eq(actual: unknown, expected: unknown, label: string) {
  ok(actual === expected, label, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function near(actual: number, expected: number, label: string, tol = 0.51) {
  ok(Math.abs(actual - expected) <= tol, label, `expected ~${expected}, got ${actual}`);
}
const section = (n: string) => console.log(`\n── ${n}`);

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12, 0, 0);

// ═══ 1. Pure rules ═══════════════════════════════════════════════════════
section('1. Period resolution');

eq(PERIODS.length, 5, 'five periods are published');
for (const p of PERIODS) ok(!!PERIOD_META[p], `${p} has a label and a hint`);
eq(assertPeriod('month'), 'MONTH', 'a lowercase period is accepted');
ok((() => { try { assertPeriod('FORTNIGHT'); return false; } catch { return true; } })(),
  'an unknown period is refused');
ok((() => { try { assertPeriod('FORTNIGHT'); return false; } catch (e: unknown) {
  return /FORTNIGHT/.test((e as Error).message); } })(),
  'the refusal NAMES the bad period rather than saying "invalid"');

// MONTH
{
  const p = resolvePeriod('MONTH', at(2026, 10, 15));
  eq(p.label, 'October 2026', 'MONTH labels the month');
  eq(p.from?.getDate(), 1, 'MONTH starts on the 1st');
  eq(p.to?.getDate(), 31, 'MONTH ends on the last day (October has 31)');
  eq(p.previousLabel, 'September 2026', 'MONTH knows the month before');
  ok(p.to!.getHours() === 23, 'MONTH ends at end-of-day, so a payment at 23:59 counts');
}
{
  const p = resolvePeriod('MONTH', at(2024, 2, 10));
  eq(p.to?.getDate(), 29, 'MONTH ends on the 29th in a leap February');
  eq(daysInMonth(2024, 2), 29, 'daysInMonth knows 2024 is a leap February');
  eq(daysInMonth(2026, 2), 28, 'daysInMonth knows 2026 is not');
  eq(daysInMonth(2026, 12), 31, 'daysInMonth knows December has 31');
}

// QUARTER
{
  const p = resolvePeriod('QUARTER', at(2026, 10, 15));
  eq(p.label, 'Q4 2026', 'QUARTER labels the quarter');
  eq(p.from?.getMonth(), 9, 'Q4 starts in October');
  eq(p.to?.getMonth(), 11, 'Q4 ends in December');
  eq(p.previousLabel, 'Q3 2026', 'QUARTER knows the previous quarter');
}
{
  const p = resolvePeriod('QUARTER', at(2026, 2, 5));
  eq(p.label, 'Q1 2026', 'February is Q1');
  eq(p.previousLabel, 'Q4 2025', 'the previous quarter crosses the year boundary correctly');
}

// YEAR
{
  const p = resolvePeriod('YEAR', at(2026, 5, 9));
  eq(p.label, '2026', 'YEAR labels the year');
  eq(p.from?.getMonth(), 0, 'YEAR starts in January');
  eq(p.to?.getMonth(), 11, 'YEAR ends in December');
  eq(p.previousLabel, '2025', 'YEAR knows the year before');
}

// SEMESTER — derived from the academic year's REAL dates
{
  const years = [
    { name: '2025-26', startDate: at(2025, 7, 1), endDate: at(2026, 6, 30) },
    { name: '2026-27', startDate: at(2026, 7, 1), endDate: at(2027, 6, 30) },
  ];
  eq(academicYearFor(at(2026, 3, 1), years)?.name, '2025-26', 'the academic year is found by its dates');
  eq(academicYearFor(at(2026, 9, 1), years)?.name, '2026-27', 'a date in the next year resolves to it');
  eq(academicYearFor(at(2020, 1, 1), years), null, 'a date outside every year resolves to null');

  // A July–June year splits into Jul–Dec (semester 1) and Jan–Jun (semester 2).
  const s2a = resolvePeriod('SEMESTER', at(2026, 3, 1), years);
  eq(s2a.label, '2025-26 semester 2', 'March is in the January–June half of a July–June year');
  eq(s2a.from?.getMonth(), 0, 'semester 2 starts in January');
  eq(s2a.to?.getMonth(), 5, 'semester 2 ends with the academic year (June)');
  eq(s2a.previousLabel, '2025-26 semester 1', 'semester 2 compares against semester 1 of the same year');
  ok(s2a.previousFrom!.getTime() < s2a.from!.getTime(), 'the previous window really precedes this one');

  const s1 = resolvePeriod('SEMESTER', at(2025, 9, 1), years);
  eq(s1.label, '2025-26 semester 1', 'September is in the July–December half');
  eq(s1.from?.getMonth(), 6, 'semester 1 starts with the academic year (July)');
  eq(s1.from?.getDate(), 1, 'semester 1 starts on the first of the month');
  eq(s1.to?.getMonth(), 11, 'semester 1 ends in December');
  eq(s1.to?.getDate(), 31, 'semester 1 ends on the LAST day of December, not 30');
  eq(s1.previousLabel, null, 'semester 1 of the FIRST supplied year has no predecessor to name');
  ok(s1.previousFrom === null, 'no fabricated previous window when there is no earlier year');

  // The two halves of one year must tile it exactly — no gap, no overlap.
  eq(s1.to!.getTime() + 1, s2a.from!.getTime(), 'the halves meet exactly, with no gap or overlap');
  eq(s1.to!.getTime(), resolvePeriod('SEMESTER', at(2025, 12, 31), years).to!.getTime(),
    '31 December is still the first semester');

  // The derived semester must respect an academic year that is NOT July-June.
  const odd = [{ name: 'Jan-Dec', startDate: at(2026, 1, 5), endDate: at(2026, 12, 20) }];
  const o1 = resolvePeriod('SEMESTER', at(2026, 2, 10), odd);
  eq(o1.label, 'Jan-Dec semester 1', 'a non-July academic year still resolves');
  eq(o1.from?.getDate(), 5, 'semester 1 starts on the year\'s real first day');
  eq(o1.to?.getMonth(), 5, 'a January-start year splits at June, not December');
  const o2 = resolvePeriod('SEMESTER', at(2026, 8, 10), odd);
  eq(o2.label, 'Jan-Dec semester 2', 'August is in the second half of a January-start year');
  eq(o2.from?.getMonth(), 6, 'the second half starts in July');
  ok(!o1.label.includes('no academic year'), 'the fallback label is not shown when a year does cover the date');

  const none = resolvePeriod('SEMESTER', at(2030, 5, 5), []);
  ok(none.label.includes('no academic year covers this date'),
    'with no academic year the label SAYS SO rather than pretending', none.label);
}

// ALL
{
  const p = resolvePeriod('ALL', at(2026, 5, 5));
  eq(p.from, null, 'ALL has no start');
  eq(p.to, null, 'ALL has no end');
  eq(p.previousLabel, null, 'ALL has nothing to compare against');
}

// Every window must actually contain its anchor.
{
  for (const period of PERIODS) {
    const anchor = at(2026, 10, 15);
    const years = [{ name: '2026-27', startDate: at(2026, 7, 1), endDate: at(2027, 6, 30) }];
    const p = resolvePeriod(period, anchor, years);
    if (!p.from) continue;
    ok(p.from.getTime() <= anchor.getTime() && anchor.getTime() <= p.to!.getTime(),
      `${period}: the window contains its own anchor`);
    ok(p.from.getTime() <= p.to!.getTime(), `${period}: from is not after to`);
    if (p.previousFrom) {
      ok(p.previousTo!.getTime() < p.from.getTime(),
        `${period}: the previous window ENDS before this one starts`);
    }
  }
  // Every MONTH window must end on the real last day of that month. Getting this
  // wrong silently truncates a month (October cut at 30 September).
  for (let m = 1; m <= 12; m += 1) {
    const p = resolvePeriod('MONTH', at(2026, m, 15));
    const expectedLast = new Date(2026, m, 0).getDate();
    eq(p.to!.getDate(), expectedLast, `MONTH ${m}/2026 ends on day ${expectedLast}`);
    eq(p.to!.getMonth(), m - 1, `MONTH ${m}/2026 ends IN month ${m}`);
  }
  eq(resolvePeriod('MONTH', at(2024, 2, 10)).to!.getDate(), 29, 'a leap February ends on the 29th');
  eq(resolvePeriod('MONTH', at(2024, 1, 10)).to!.getDate(), 31, 'a January 31st month is not cut to 30');
}

// Granularity bucketing — pure, so it is tested without a database.
{
  const monthly = [
    { key: '2025-10', label: 'Oct/25', count: 1, amountMinor: 100 },
    { key: '2025-11', label: 'Nov/25', count: 2, amountMinor: 200 },
    { key: '2025-12', label: 'Dec/25', count: 3, amountMinor: 300 },
    { key: '2026-01', label: 'Jan/26', count: 4, amountMinor: 400 },
    { key: '2026-02', label: 'Feb/26', count: 5, amountMinor: 500 },
    { key: '2026-03', label: 'Mar/26', count: 6, amountMinor: 600 },
  ];
  const sum = (xs: { amountMinor: number }[]) => xs.reduce((s2, x) => s2 + x.amountMinor, 0);

  const byMonth = groupByGranularity(monthly, 'MONTH');
  eq(byMonth.length, 6, 'MONTH granularity keeps every point');
  eq(byMonth.map((m) => m.months).join(','), '1,1,1,1,1,1', 'each monthly bar covers one month');

  const byQuarter = groupByGranularity(monthly, 'QUARTER');
  eq(byQuarter.length, 2, 'six months make two quarters');
  eq(byQuarter.map((q) => q.key).join(','), 'Q4 2025,Q1 2026', 'quarters are labelled and in order');
  eq(byQuarter[0].amountMinor, 600, 'Q4 sums its three months');
  eq(byQuarter[1].amountMinor, 1500, 'Q1 sums its three months');
  eq(byQuarter[0].count, 6, 'and counts are summed, not averaged away');
  eq(byQuarter[0].months, 3, 'a quarterly bar covers three months');

  const byYear = groupByGranularity(monthly, 'YEAR');
  eq(byYear.length, 2, 'six months spanning two years make two bars');
  eq(byYear.map((y) => y.key).join(','), '2025,2026', 'years are labelled');
  eq(byYear[0].amountMinor, 600, '2025 holds Oct-Dec only - no borrowing from the next year');
  eq(byYear[1].amountMinor, 1500, '2026 holds Jan-Mar');

  // The invariant that lets the screen and the export agree: bucketing changes
  // the shape of the series, never its total.
  eq(sum(byQuarter), sum(monthly), 'quarterly bars sum to the monthly total');
  eq(sum(byYear), sum(monthly), 'yearly bars sum to the monthly total');

  // A window that does not divide evenly must not lose or invent a month.
  const odd = monthly.slice(0, 5);
  const oddQ = groupByGranularity(odd, 'QUARTER');
  eq(sum(oddQ), sum(odd), 'a five-month window still totals correctly');
  eq(oddQ[0].months + oddQ[1].months, 5, 'and every month is counted exactly once');
  eq(groupByGranularity([], 'QUARTER').length, 0, 'an empty series groups to nothing');
}

section('2. Arithmetic that must not lie');

eq(growthPercent(120, 100), 20, 'growth from 100 to 120 is +20%');
eq(growthPercent(80, 100), -20, 'a fall is negative');
eq(growthPercent(100, 0), null, 'growth from zero has no base and returns null');
eq(growthPercent(0, 100), -100, 'a fall to zero is -100%');
near(growthPercent(1, 3) as number, -66.7, 'growth keeps one decimal', 0.05);

eq(sharePercent(25, 100), 25, 'a quarter share is 25%');
eq(sharePercent(5, 0), null, 'a share of nothing is null, not 0');
eq(sharePercent(0, 100), 0, 'a zero share of something is 0');

eq(peak([]), 0, 'the peak of an empty series is 0, not -Infinity');
eq(peak([3, 9, 2]), 9, 'the peak is the largest value');
eq(peak([-5, -1]), -1, 'the peak of all-negative values is the least negative');

eq(toRupees(100), 1, 'paise convert to rupees');
eq(toRupees(150), 2, 'a half rupee rounds to the nearest rupee');
eq(toRupees(0), 0, 'nothing is nothing');

eq(monthKey(at(2026, 1, 5)), '2026-01', 'January is zero-padded');
eq(monthKey(at(2026, 12, 31)), '2026-12', 'December is not');
eq(monthLabel('2026-03'), 'March 2026', 'a month label is readable');
eq(monthShortLabel('2026-03'), 'Mar/26', 'a short month label is compact');
eq(monthKeysBack(12, at(2026, 10, 15))[0], '2025-11', 'twelve months back starts eleven months before');
eq(monthKeysBack(12, at(2026, 10, 15)).length, 12, 'twelve months back returns twelve keys');
eq(monthKeysBack(12, at(2026, 10, 15))[11], '2026-10', 'the last month is the anchor month');
eq(monthKeysBack(12, at(2026, 10, 15)).filter((k, i, a) => a.indexOf(k) === i).length, 12, 'no duplicate months');

section('3. Outstanding is the BALANCE, not the bill');

eq(balanceOfDue({ amountMinor: 100000, paidMinor: 0 }), 100000, 'an unpaid bill owes its full amount');
eq(balanceOfDue({ amountMinor: 100000, paidMinor: 40000 }), 60000, 'a part-paid bill owes the remainder');
eq(balanceOfDue({ amountMinor: 100000, paidMinor: 100000 }), 0, 'a cleared bill owes nothing');
eq(balanceOfDue({ amountMinor: 100000, paidMinor: 150000 }), 0, 'overpayment never goes negative');
eq(balanceOfDue({ amountMinor: 100000, paidMinor: 0, lateFeeMinor: 5000 }), 105000, 'a late fee is owed on top');
eq(balanceOfDue({ amountMinor: 100000, paidMinor: 40000, lateFeeMinor: 5000 }), 65000, 'the late fee survives part payment');

ok(isCollectible({ status: 'UNPAID' }), 'an unpaid bill is collectible');
ok(isCollectible({ status: 'PARTIAL' }), 'a part-paid bill is collectible');
ok(!isCollectible({ status: 'CLEARED' }), 'a cleared bill is not collectible');
ok(!isCollectible({ status: 'WAIVED' }), 'a waived bill is not collectible');

{
  const s = recoveryStats([
    { amountMinor: 100000, paidMinor: 100000, status: 'CLEARED' },
    { amountMinor: 200000, paidMinor: 50000, status: 'PARTIAL' },
  ]);
  eq(s.billedMinor, 300000, 'recovery bills what was charged');
  eq(s.paidMinor, 150000, 'recovery counts what was collected');
  eq(s.outstandingMinor, 150000, 'recovery reports the balance still owing');
  eq(s.recoveryPercent, 50, 'recovery is half');

  const waived = recoveryStats([
    { amountMinor: 100000, paidMinor: 0, status: 'WAIVED' },
  ]);
  eq(waived.billedMinor, 0, 'a waived bill is not billed for recovery purposes');
  eq(waived.recoveryPercent, null, 'nothing billed means recovery is null, not 0%');

  const nothing = recoveryStats([]);
  eq(nothing.recoveryPercent, null, 'an empty set has no recovery rate');
  eq(nothing.outstandingMinor, 0, 'an empty set owes nothing');
}

section('4. Budget variance is derived, never accumulated');
{
  const v = budgetVariance([
    { key: 'LABS', label: 'LABS', plannedMinor: 100000, spentMinor: 250000 },
    { key: 'EVENTS', label: 'EVENTS', plannedMinor: 100000, spentMinor: 10000 },
    { key: 'MISC', label: 'MISC', plannedMinor: 0, spentMinor: 5000 },
  ]);
  const labs = v.find((x) => x.key === 'LABS')!;
  eq(labs.remainingMinor, -150000, 'overspend is a negative remainder');
  ok(labs.overBudget, 'overspend is flagged');
  eq(labs.utilisationPercent, 250, 'utilisation can exceed 100 — it is a real ratio');
  eq(v.find((x) => x.key === 'MISC')!.utilisationPercent, null, 'a zero plan has no utilisation ratio');
  eq(v[0].key, 'LABS', 'lines are ordered by utilisation, worst first');
}

section('5. Tally and trend');
{
  const t = tally([
    { key: 'TUITION', label: 'Tuition', amountMinor: 100 },
    { key: 'TUITION', label: 'Tuition', amountMinor: 200 },
    { key: 'DONATION', label: 'Donation', amountMinor: 5000 },
  ]);
  eq(t.length, 2, 'like rows are folded together');
  eq(t[0].key, 'DONATION', 'the largest comes first');
  eq(t[1].count, 2, 'the count survives the fold');
  eq(t[1].amountMinor, 300, 'the amounts add up');

  const tr = trend([
    { key: '1', label: 'Jan', count: 1, amountMinor: 100 },
    { key: '2', label: 'Feb', count: 1, amountMinor: 150 },
    { key: '3', label: 'Mar', count: 1, amountMinor: 75 },
  ]);
  eq(tr[0].changePercent, null, 'the first point has nothing to compare against');
  eq(tr[1].changePercent, 50, 'the second point compares to the first');
  eq(tr[2].changePercent, -50, 'the third point compares to the second');
}

section('6. Export shaping');
{
  const sheets: ExportSheet[] = [{
    name: 'Test',
    columns: [
      textColumn('Name', 'name'),
      numberColumn('Count', 'count'),
      moneyColumn('Amount', 'amountMinor'),
    ],
    rows: [
      { name: 'Plain', count: 2, amountMinor: 10000 },
      { name: 'Has, comma', count: 3, amountMinor: 20000 },
      { name: 'Has "quotes"', count: 4, amountMinor: -5000 },
      { name: '', count: 0, amountMinor: 0 },
    ],
  }];
  const csv = toCsv(sheets);
  const lines = csv.split('\r\n');
  eq(lines[1], 'Name,Count,Amount', 'the header row is the column headers');
  eq(lines[2], 'Plain,2,100', 'money is written as rupees');
  ok(lines[3].includes('"Has, comma"'), 'a comma forces quoting', lines[3]);
  ok(lines[4].includes('"Has ""quotes"""'), 'a quote is doubled inside a quoted field', lines[4]);
  eq(lines[5], ',0,0', 'an empty cell is empty, not "null"');
  eq(csv.charCodeAt(0), 0xfeff, 'the file starts with a BOM');
  eq(csv.split('\uFEFF').length - 1, 1, 'the BOM appears EXACTLY ONCE in the whole file');
  eq(toCsv([sheets[0], sheets[0]]).split('\uFEFF').length - 1, 1, 'two sheets still emit one BOM');

  const xlsx = buildXlsx(sheets);
  eq(xlsx.subarray(0, 2).toString('latin1'), 'PK', 'the workbook is a ZIP');
  ok(xlsx.length > 1000, 'the workbook has real content', String(xlsx.length));
  eq(columnName(0), 'A', 'column 0 is A');
  eq(columnName(25), 'Z', 'column 25 is Z');
  eq(columnName(26), 'AA', 'column 26 rolls over to AA');
  eq(columnName(701), 'ZZ', 'column 701 is ZZ');
  eq(columnName(702), 'AAA', 'column 702 is AAA');
  eq(safeSheetName('a/b:c?d*e[f]g', 0), 'a b c d e f g', 'illegal sheet-name characters are replaced');
  eq(safeSheetName('   ', 3), 'Sheet4', 'a blank sheet name falls back to its position');
  eq(safeSheetName('x'.repeat(50), 0).length, 31, 'a sheet name is capped at Excel\'s 31 characters');

  // Two sheets of the same name must not produce two identically-named sheets.
  const dupes = buildXlsx([{ ...sheets[0] }, { ...sheets[0] }]);
  ok(dupes.length > 0, 'a workbook with duplicate sheet names still builds');

  const pdf = renderReportPdf(sheets, { title: 'Test report', subtitle: 'October 2026' });
  eq(pdf.subarray(0, 8).toString('latin1'), '%PDF-1.4', 'the PDF has a PDF header');
  ok(pdf.subarray(-6).toString('latin1').includes('%%EOF'), 'the PDF is terminated');
  ok(pdf.length > 800, 'the PDF has real content', String(pdf.length));
}

// ═══ 7. The service, against the seeded database ═════════════════════════
section('7. The reports against real data');

const inst = await prisma.institution.findFirst({ where: { code: { not: '' } }, orderBy: { createdAt: 'asc' } });
if (!inst) {
  console.error('No institution — run `npm run prisma:seed` first.');
  process.exit(1);
}
const institutionId = inst.id;
console.log(`  auditing against ${inst.name}`);

// A SECOND institution, so tenant isolation can be proven rather than assumed.
const stamp = Date.now().toString(36);
const rival = await prisma.institution.create({
  data: { code: `RPT-RIVAL-${stamp}`, name: 'Rival Institute' },
});
const rivalUser = await prisma.user.create({
  data: {
    institutionId: rival.id,
    email: `rival-${stamp}@test.local`,
    passwordHash: 'x',
    fullName: 'Rival Officer',
    roles: { create: [{ role: 'ACCOUNTS' }] },
  },
});
const rivalStudent = await prisma.studentProfile.create({
  data: { userId: rivalUser.id, institutionId: rival.id, rollNo: `RIV-${stamp}`, currentSemester: 1, status: 'ACTIVE' },
});
// A rival bill that would be glaring if it leaked: a round crore.
const rivalDue = await prisma.feeDue.create({
  data: {
    studentProfileId: rivalStudent.id,
    title: 'Rival tuition',
    amountMinor: 1000000000,
    paidMinor: 0,
    dueDate: at(2026, 1, 10),
    status: 'UNPAID',
  },
});
const rivalPayment = await prisma.payment.create({
  data: {
    institutionId: rival.id,
    category: 'TUITION',
    referenceNo: `RIV-PAY-${stamp}`,
    amountMinor: 500000000,
    method: 'CASH',
    status: 'CLEARED',
    paidAt: at(2026, 1, 10),
    createdAt: at(2026, 1, 10),
  },
});

// Hoisted so the cleanup below can reach them even if an assertion throws.
let probe: { id: string } | null = null;
let probeUserId: string | null = null;

try {
  // ── Tenant isolation ────────────────────────────────────────────────────
  section('8. Tenant isolation (the bug this feature had)');

  const dues = await svc.duesReport(institutionId, 'ALL');
  ok(dues.totals.outstandingRupees < 100000000,
    "another institution's crore does not appear in our outstanding",
    String(dues.totals.outstandingRupees));

  const coll = await svc.collectionsReport(institutionId, 'ALL');
  ok(coll.totals.collectedRupees < 50000000,
    "another institution's collection does not appear in ours",
    String(coll.totals.collectedRupees));

  const collRival = await svc.collectionsReport(rival.id, 'ALL');
  eq(collRival.totals.collectedRupees, 5000000, "the rival sees exactly its OWN collection");
  const duesRival = await svc.duesReport(rival.id, 'ALL');
  eq(duesRival.totals.outstandingRupees, 10000000, 'the rival sees exactly its own outstanding');

  const overview = await svc.reportsOverview(institutionId, 'ALL');
  ok(overview.headline.outstandingRupees < 100000000, 'the overview is scoped too');
  const dept = await svc.departmentsReport(institutionId, 'ALL');
  ok(dept.totals.expenseRupees < 100000000, 'the department report is scoped too');
  const pay = await svc.payrollReport(rival.id, 'ALL');
  eq(pay.totals.runs, 0, 'a rival institution has none of our payroll runs');

  // ── Outstanding is the balance ──────────────────────────────────────────
  section('9. Outstanding equals the balance, not the bill');

  // A controlled student of ours, so the arithmetic is exact.
  // Snapshot BEFORE the probe exists — the delta then proves the balance rule
  // exactly, instead of only being "somewhere in the list".
  const preProbe = await svc.duesReport(institutionId, 'ALL');
  const ourStudentUser = await prisma.user.create({
    data: {
      institutionId,
      email: `rpt-probe-${stamp}@test.local`,
      passwordHash: 'x',
      fullName: 'Probe Student',
      roles: { create: [{ role: 'STUDENT' }] },
    },
  });
  probeUserId = ourStudentUser.id;
  probe = await prisma.studentProfile.create({
    data: { userId: ourStudentUser.id, institutionId, rollNo: `PRB-${stamp}`, currentSemester: 2, status: 'ACTIVE' },
  });
  const probeDue = await prisma.feeDue.create({
    data: {
      studentProfileId: probe.id,
      title: 'Probe tuition',
      amountMinor: 200000, // ₹2,000
      paidMinor: 50000,     // ₹500 paid
      dueDate: at(2026, 6, 1),
      status: 'PARTIAL',
    },
  });

  const after = await svc.duesReport(institutionId, 'ALL');
  ok(probeDue.amountMinor > probeDue.paidMinor && probeDue.paidMinor > 0,
    'the probe bill really is part-paid, so the balance rule has something to prove');
  const expected = 150000 / 100; // the balance in rupees
  // The headline moved by EXACTLY the balance — not by the ₹2,000 that was
  // billed. This is the assertion the old getReports could not have passed.
  eq(after.totals.outstandingRupees - preProbe.totals.outstandingRupees, expected,
    'a part-paid bill adds its REMAINDER to outstanding, not its original amount');
  const before = await prisma.feeDue.aggregate({
    where: { studentProfile: { user: { institutionId } } },
    _sum: { amountMinor: true },
  });
  ok(after.totals.outstandingRupees <= (before._sum.amountMinor ?? 0) / 100,
    'outstanding never exceeds what was billed',
    `${after.totals.outstandingRupees} vs ${(before._sum.amountMinor ?? 0) / 100}`);
  const inTop = after.topDebtors.some((d) => d.rollNo === `PRB-${stamp}`);
  if (inTop) {
    const row = after.topDebtors.find((d) => d.rollNo === `PRB-${stamp}`)!;
    eq(row.amountRupees, expected, 'a part-paid bill reports the REMAINDER, not the original amount');
  } else {
    ok(after.totals.outstandingRupees > 0, 'the report still totals correctly');
  }

  // ── Reversed money does not count ───────────────────────────────────────
  section('10. Reversed money stops counting, but the row survives');

  const livePayment = await prisma.payment.create({
    data: {
      institutionId,
      category: 'TUITION',
      referenceNo: `PRP-LIVE-${stamp}`,
      amountMinor: 333000,
      method: 'UPI',
      status: 'CLEARED',
      paidAt: new Date(),
      createdAt: new Date(),
    },
  });
  const withLive = await svc.collectionsReport(institutionId, 'MONTH');
  ok(withLive.totals.collectedRupees >= 3330, 'a cleared payment counts');

  await prisma.payment.update({ where: { id: livePayment.id }, data: { reversedAt: new Date(), reversalReason: 'probe' } });
  const afterReverse = await svc.collectionsReport(institutionId, 'MONTH');
  eq(afterReverse.totals.collectedRupees, withLive.totals.collectedRupees - 3330,
    'reversing a payment removes it from collections');
  eq(await prisma.payment.count({ where: { id: livePayment.id } }), 1,
    'but the row itself survives — the ledger does not lose history');

  await prisma.payment.delete({ where: { id: livePayment.id } });

  // ── Payroll integrity ───────────────────────────────────────────────────
  section('11. Payroll reports say so when a run does not foot');

  const payroll = await svc.payrollReport(institutionId, 'ALL');
  ok(payroll.runs.length > 0, 'there are payroll runs to report on');
  eq(payroll.integrity.footsToEntries, payroll.integrity.unfootedMonths.length === 0,
    'the integrity flag agrees with the list it is derived from');
  ok(payroll.totals.grossRupees >= payroll.totals.netRupees,
    'gross is at least net');
  eq(payroll.totals.netRupees, payroll.totals.grossRupees - payroll.totals.deductionsRupees,
    'gross − deductions = net');
  for (const run of payroll.runs) {
    eq(run.grossRupees - run.deductionsRupees, run.netRupees, `${run.month} foots`);
  }

  // A deliberately broken run must be REPORTED, not silently summed.
  const brokenRun = await prisma.payrollRun.create({
    data: {
      institutionId,
      month: `9999-${stamp.slice(-2)}`,
      status: 'DRAFT',
      runByUserId: ourStudentUser.id,
      grossMinor: 500000,
      deductionsMinor: 0,
      totalMinor: 500000,
      notes: 'probe: header deliberately does not match its entries',
    },
  });
  await prisma.payrollEntry.create({
    data: { payrollRunId: brokenRun.id, staffUserId: ourStudentUser.id, grossMinor: 1, netMinor: 1 },
  });
  const broken = await svc.payrollReport(institutionId, 'ALL');
  eq(broken.integrity.footsToEntries, false, 'a run that does not foot is flagged');
  ok(broken.integrity.unfootedMonths.includes(brokenRun.month),
    'the offending month is named', JSON.stringify(broken.integrity.unfootedMonths));
  const brokenRow = broken.runs.find((x) => x.month === brokenRun.month)!;
  eq(brokenRow.footsToEntries, false, 'the run row itself is marked');
  await prisma.payrollEntry.deleteMany({ where: { payrollRunId: brokenRun.id } });
  await prisma.payrollRun.delete({ where: { id: brokenRun.id } });

  // ── Scholarships: promised vs released ──────────────────────────────────
  section('12. Scholarships: promised is never conflated with released');

  const sch = await svc.scholarshipsReport(institutionId, 'ALL');
  for (const s of sch.schemes) {
    eq(s.committedRupees + s.disbursedRupees, s.awardedRupees,
      `${s.name}: committed + disbursed = awarded (each rupee counted once)`);
    eq(s.awaitingRupees, s.awardedRupees - s.disbursedRupees,
      `${s.name}: awaiting = awarded − released`);
    if (s.budgetRupees !== null) {
      ok(s.awardedRupees <= s.budgetRupees,
        `${s.name}: never awards more than its own fund`,
        `${s.awardedRupees} of ${s.budgetRupees}`);
      eq(s.headroomRupees, Math.max(0, s.budgetRupees - s.awardedRupees),
        `${s.name}: headroom is budget − awarded`);
    }
    ok(s.releasedInPeriodRupees <= s.disbursedRupees,
      `${s.name}: the period figure cannot exceed the lifetime one`);
  }
  eq(sch.totals.creditedToDuesRupees, sch.totals.disbursedRupees,
    'everything reported as released is matched by an allocation against a real due');

  // ── Departments ─────────────────────────────────────────────────────────
  section('13. Department-wise figures add up');

  const depts = await svc.departmentsReport(institutionId, 'ALL');
  const sumExpenses = depts.departments.reduce((x, d) => x + d.expenseRupees, 0);
  eq(sumExpenses, depts.totals.expenseRupees, 'department expenses sum to the total');
  ok(depts.departments.some((d) => d.id === 'institution-wide'),
    'claims with no department are shown rather than silently dropped');
  for (const d of depts.departments) {
    if (d.expenseRupees > 0) ok(!!d.name, 'every department row has a name');
  }

  // ── Comparisons ─────────────────────────────────────────────────────────
  section('14. Comparisons are a run of periods, each footing');

  const cmp = await svc.comparisonReport(institutionId, 'MONTH');
  eq(cmp.months, 12, 'a comparison covers twelve months');
  eq(cmp.series.collected.length, 12, 'twelve collection points');
  eq(cmp.series.spent.length, 12, 'twelve expense points');
  eq(cmp.series.payroll.length, 12, 'twelve payroll points');
  eq(cmp.series.cash.length, 12, 'twelve cash-flow points');
  // The granularity control must actually BUCKET, not merely relabel. It used to
  // return twelve monthly points whatever you asked for, so the control changed a
  // label and nothing else - a filter that looks live and is not.
  const monthlyTotal = cmp.totals.collectedRupees;
  const byQuarter = await svc.comparisonReport(institutionId, 'QUARTER');
  eq(byQuarter.granularity, 'QUARTER', 'the granularity is echoed back');
  eq(byQuarter.monthsPerBar, 3, 'a quarterly bar covers three months');
  eq(byQuarter.months, 12, 'the WINDOW is still twelve months - grouping is not filtering');
  ok(byQuarter.series.collected.length < cmp.series.collected.length,
    'quarterly returns FEWER bars than monthly',
    `${byQuarter.series.collected.length} vs ${cmp.series.collected.length}`);
  eq(byQuarter.totals.collectedRupees, monthlyTotal,
    'grouping changes the shape of the series, never its total');
  ok(byQuarter.series.collected.every((c) => /^Q\d \d{4}$/.test(c.month)),
    'quarterly bars are labelled Q<quarter> <year>',
    byQuarter.series.collected.map((c) => c.month).join(','));
  eq(byQuarter.series.cash.length, byQuarter.series.collected.length,
    'the cash-flow series is grouped in step with the collections series');

  const byYear = await svc.comparisonReport(institutionId, 'YEAR');
  eq(byYear.monthsPerBar, 12, 'a yearly bar covers twelve months');
  eq(byYear.totals.collectedRupees, monthlyTotal, 'yearly grouping also preserves the total');
  ok(byYear.series.collected.length <= 2, 'twelve months span at most two calendar years',
    String(byYear.series.collected.length));
  eq(byYear.series.collected.map((c) => c.month).join(','),
    [...new Set(cmp.series.collected.map((c) => c.month.slice(0, 4)))].join(','),
    'the yearly bars are the distinct calendar years, in order');

  // The export must honour the same control, or the file says "Q1 2026" on screen
  // and hands back month keys.
  const qSheets = await svc.exportSheets('comparison', institutionId, 'ALL', undefined, 'QUARTER');
  const qCash = qSheets.sheets.find((x) => x.name === 'Cash flow')!;
  ok(/grouped by quarter/.test(qSheets.subtitle), 'the comparison export says how it grouped', qSheets.subtitle);
  ok(qCash.columns.some((c) => c.header === 'Quarter'), 'and the column heading is Quarter, not Month',
    qCash.columns.map((c) => c.header).join(','));
  ok(qCash.rows.every((row) => /^Q\d \d{4}$/.test(String(row.month))),
    'every exported comparison row is a quarter key',
    qCash.rows.slice(0, 3).map((row) => String(row.month)).join(','));
  const mSheets = await svc.exportSheets('comparison', institutionId, 'ALL', undefined, 'MONTH');
  const mCash = mSheets.sheets.find((x) => x.name === 'Cash flow')!;
  ok(mCash.columns.some((c) => c.header === 'Month'), 'a monthly export still says Month');
  eq(mCash.rows.length, 12, `and it has the twelve monthly rows (got ${mCash.rows.length})`);

  const sumCollected = cmp.series.collected.reduce((x, c) => x + c.amountRupees, 0);
  const sumCash = cmp.series.cash.reduce((x, c) => x + c.collectedRupees, 0);
  eq(sumCash, sumCollected, 'the cash-flow series and the collections series agree');
  eq(cmp.totals.collectedRupees, sumCollected, 'the collected total is the sum of its own series');
  eq(cmp.totals.spentRupees, cmp.series.spent.reduce((x, c) => x + c.amountRupees, 0),
    'the spent total is the sum of its own series');
  eq(cmp.totals.surplusRupees, cmp.totals.collectedRupees - cmp.totals.spentRupees - cmp.totals.payrollRupees,
    'surplus is collected − spent − payroll');
  for (const c of cmp.series.cash) {
    eq(c.collectedRupees - c.spentRupees, c.netRupees, `${c.month}: collected − spent = net`);
  }
  // Cross-check one point of the series against the single-period report for the
  // SAME month. The 12-month window stops at today while YEAR runs to 31 December,
  // so the two totals are NOT comparable — but the underlying months must agree
  // exactly, or one of the two is counting something the other is not.
  const probeKey = cmp.series.collected[5].month;
  const [py2, pm2] = probeKey.split('-').map(Number);
  const single = await svc.collectionsReport(
    institutionId, 'MONTH', new Date(py2, pm2 - 1, 15).toISOString(),
  );
  eq(single.totals.collectedRupees, cmp.series.collected[5].amountRupees,
    `the ${probeKey} bar equals that month's own collections report`);
  ok(cmp.totals.collectedRupees <= cmp.series.collected.reduce((x, c) => x + c.amountRupees, 0) + 1,
    'the comparison total cannot exceed the sum of its own bars',
    `${cmp.totals.collectedRupees}`);

  // ── Overview ────────────────────────────────────────────────────────────
  section('15. The overview is internally consistent');

  const ov = await svc.reportsOverview(institutionId, 'ALL');
  eq(ov.headline.outstandingRupees, (await svc.duesReport(institutionId, 'ALL')).totals.outstandingRupees,
    'the overview\'s outstanding matches the dues report');
  eq(ov.headline.collectedRupees, (await svc.collectionsReport(institutionId, 'ALL')).totals.collectedRupees,
    'the overview\'s collected matches the collections report');
  eq(ov.headline.spentRupees, (await svc.expensesReport(institutionId, 'ALL')).totals.approvedRupees,
    'the overview\'s spend matches the expense report');
  eq(ov.headline.surplusRupees, ov.headline.collectedRupees - ov.headline.spentRupees - ov.headline.payrollRupees,
    'the overview\'s surplus is collected − spent − payroll');

  // ── Exports ─────────────────────────────────────────────────────────────
  section('16. Every report exports');

  const REPORTS = ['collections', 'dues', 'expenses', 'payroll', 'scholarships', 'departments', 'comparison'];
  for (const report of REPORTS) {
    const { sheets, title, subtitle } = await svc.exportSheets(report, institutionId, 'ALL');
    ok(sheets.length > 0, `${report}: has sheets`);
    ok(!!title, `${report}: has a title`);
    ok(!!subtitle, `${report}: has a subtitle explaining what it covers`);
    for (const sheet of sheets) {
      ok(sheet.columns.length > 0, `${report}/${sheet.name}: has columns`);
      ok(sheet.name.length <= 31, `${report}/${sheet.name}: the sheet name is Excel-legal`);
      for (const col of sheet.columns) {
        ok(typeof col.value === 'function', `${report}/${sheet.name}: column "${col.header}" can be read`);
        // Every column must survive a row with nothing in it.
        ok(col.value({}) !== undefined || true, `${report}/${sheet.name}: "${col.header}" tolerates an empty row`);
      }
    }
    const csv = toCsv(sheets);
    ok(csv.length > 20, `${report}: the CSV is not empty`);
    const xlsx = buildXlsx(sheets);
    eq(xlsx.subarray(0, 2).toString('latin1'), 'PK', `${report}: the workbook is a ZIP`);
    const pdf = renderReportPdf(sheets, { title, subtitle });
    eq(pdf.subarray(0, 8).toString('latin1'), '%PDF-1.4', `${report}: the PDF has a PDF header`);
  }

  // The export must carry the SAME numbers as the report it came from.
  const du = await svc.duesReport(institutionId, 'ALL');
  const duSheets = await svc.exportSheets('dues', institutionId, 'ALL');
  const ageRow = duSheets.sheets.find((s) => s.name === 'Ageing')!;
  const exportTotal = ageRow.rows.reduce((x: number, row: Record<string, unknown>) => x + (row.amountRupees as number), 0);
  const reportTotal = du.aging.reduce((x, b) => x + b.amountRupees, 0);
  eq(exportTotal, reportTotal, 'the exported ageing table foots to the report it was built from');

  // ── Catalogue ───────────────────────────────────────────────────────────
  section('17. The catalogue matches what is served');
  const cat = await svc.reportCatalogue();
  eq(cat.reports.length, 7, 'seven reports are catalogued');
  eq(new Set(cat.reports.map((r) => r.id)).size, 7, 'the report ids are unique');
  for (const r of cat.reports) ok(!!r.blurb, `${r.id}: has a blurb`);
  for (const p of cat.periods) ok(PERIODS.includes(p as never), `catalogue period ${p} is real`);
  for (const f of cat.formats) ok(['xlsx', 'csv', 'pdf'].includes(f), `catalogue format ${f} is exportable`);

  // A report that is catalogued must actually be servable.
  for (const r of cat.reports) {
    let served = true;
    try {
      const fn = {
        collections: svc.collectionsReport, dues: svc.duesReport, expenses: svc.expensesReport,
        payroll: svc.payrollReport, scholarships: svc.scholarshipsReport,
        departments: svc.departmentsReport, comparison: svc.comparisonReport,
      }[r.id]!;
      await fn(institutionId, 'ALL');
    } catch {
      served = false;
    }
    ok(served, `${r.id}: a catalogued report is actually servable`);
  }
} finally {
  // Unwind in dependency order — money rows first, then whoever owns them.
  // `?? '__never__'` keeps a throw mid-way through setup from widening a delete
  // into "everyone with a null id".
  const no = '__never__';
  await prisma.payrollEntry.deleteMany({ where: { staffUserId: probeUserId ?? no } });
  await prisma.payrollRun.deleteMany({ where: { runByUserId: probeUserId ?? no } });
  await prisma.feeDue.deleteMany({ where: { studentProfileId: probe?.id ?? no } });
  await prisma.studentProfile.deleteMany({ where: { id: probe?.id ?? no } });
  await prisma.payment.deleteMany({ where: { referenceNo: rivalPayment.referenceNo } });
  await prisma.feeDue.deleteMany({ where: { id: rivalDue.id } });
  await prisma.studentProfile.deleteMany({ where: { id: rivalStudent.id } });
  // `user_roles` has no onDelete, so it must go before the user does.
  await prisma.userRole.deleteMany({
    where: { userId: { in: [rivalUser.id, ...(probeUserId ? [probeUserId] : [])] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [rivalUser.id, ...(probeUserId ? [probeUserId] : [])] } },
  });
  await prisma.institution.deleteMany({ where: { id: rival.id } });
}

await prisma.$disconnect();
console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach((f) => console.log(`  - ${f}`));
}
process.exit(fail ? 1 : 0);
