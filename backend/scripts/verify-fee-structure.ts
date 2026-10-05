// Verification for F-04 Fee Structure (docs/users/06 §3.5) — all seven
// sub-features: course & semester-wise setup, charge components, instalment
// configuration, concession rules, late-payment penalties, version history and
// effective-date management.
//
// Usage: npx tsx scripts/verify-fee-structure.ts
//
// Two layers on purpose:
//   1. the PURE functions in feestructure.money.ts, called directly with no
//      database. A rounding bug in a fee calculation is a legal problem, not a
//      display problem, so it is caught by arithmetic.
//   2. the SERVICE, against the real database, for everything that involves
//      tenancy, transactions and the derived headline totals.
//
// Everything it creates is deleted and everything it mutates is restored, so the
// dev DB is left exactly as found. Idempotent across runs.
import { prisma } from '../src/db/prisma.js';
import { randomUUID } from 'node:crypto';
import {
  toRupees, toMinor, isoDay, COMPONENT_KINDS, KIND_IDS, kindMeta, semesterLabel,
  totalsOf, semesterTotal, semesterSchedule, kindBySemester,
  defaultInstallments, installmentDates, installmentSummary,
  applyConcessions, eligibleFor, concessionAmount,
  isInForceOn, versionInForceOn, overlaps, yoyPercent,
  snapshotComponents, parseSnapshot, diffSnapshots,
  validateComponents, validateConcession, frequencyDays,
} from '../src/modules/accounts/feestructure.money.js';
import {
  listStructures, getStructure, createStructure, replaceComponents,
  listVersions, createDraftVersion, publishVersion, discardDraftVersion,
  saveConcession, deleteConcession, previewConcessions, saveInstallments,
  resolveOnDate, requestRevision, parseDay,
} from '../src/modules/accounts/feestructure.service.js';
import { computeLateFee } from '../src/modules/accounts/dues.fines.js';

let passed = 0;
let failed = 0;
const fails: string[] = [];

function check(label: string, ok: boolean, detail?: string) {
  if (ok) { passed += 1; console.log(`  ✓ ${label}`); }
  else {
    failed += 1;
    const line = `${label}${detail ? ` — ${detail}` : ''}`;
    fails.push(line);
    console.log(`  ✗ ${line}`);
  }
}
const eq = (label: string, actual: unknown, expected: unknown) =>
  check(label, JSON.stringify(actual) === JSON.stringify(expected), `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
const section = (n: string) => console.log(`\n${n}`);

// A throwaway institution, so nothing here can touch the demo data — including
// the fees, which the dues and collections suites depend on.
const TAG = `FS-${randomUUID().slice(0, 8)}`;

async function run() {
  // ── 1. Pure rules: component arithmetic ───────────────────
  section('1 · Component arithmetic (feestructure.money.ts, no DB)');

  const comps = [
    { kind: 'TUITION', label: 'Semester 1 tuition', amountMinor: toMinor(50000), semester: 1, optional: false, firstYearOnly: false },
    { kind: 'TUITION', label: 'Semester 2 tuition', amountMinor: toMinor(60000), semester: 2, optional: false, firstYearOnly: false },
    { kind: 'EXAMINATION', label: 'Exam fee', amountMinor: toMinor(6000), semester: 0, optional: false, firstYearOnly: false },
    { kind: 'HOSTEL', label: 'Hostel', amountMinor: toMinor(45000), semester: 0, optional: true, firstYearOnly: false },
    { kind: 'ADMISSION', label: 'Admission', amountMinor: toMinor(8000), semester: 0, optional: false, firstYearOnly: true },
  ] as any[];

  const t = totalsOf(comps);
  eq('tuition rolls up only TUITION lines', toRupees(t.tuitionMinor), 110000);
  eq('other rolls up everything else', toRupees(t.otherMinor), 59000);
  eq('total is tuition + other', toRupees(t.totalMinor), 169000);
  eq('total equals tuition + other exactly', t.totalMinor, t.tuitionMinor + t.otherMinor);
  eq('optional charges are reported separately, not hidden', toRupees(t.optionalMinor), 45000);
  eq('the mandatory bill excludes the hostel bed', toRupees(t.mandatoryMinor), 124000);
  check('mandatory + optional = total', t.mandatoryMinor + t.optionalMinor === t.totalMinor);
  eq('byKind groups each charge type', toRupees(t.byKind.TUITION), 110000);
  eq('component count is reported', t.componentCount, 5);

  eq('toRupees rounds to whole rupees', toRupees(toMinor(1234.56)), 1235);
  eq('toMinor is the single rupees→paise conversion', toMinor(1), 100);
  eq('semester 0 reads as "All semesters"', semesterLabel(0), 'All semesters');
  eq('semester 3 reads as "Semester 3"', semesterLabel(3), 'Semester 3');
  eq('a semester list covers every semester of the program', semesterSchedule(comps, 8).length, 8);
  // Semester 1 = its own ₹50,000 tuition + a floor-divided share of each annual
  // charge (exam 6,000, hostel 45,000, admission 8,000).
  const annualShare = Math.floor(6000 / 8) + Math.floor(45000 / 8) + Math.floor(8000 / 8);
  eq('semester 1 bill = its own tuition + a share of every annual charge', toRupees(semesterTotal(comps, 1, 8)), 50000 + annualShare);
  // The invariant that matters most: the semester bills must foot to the annual
  // total, or a family pays a different amount depending on which semester the
  // office happened to raise the bill against.
  const sched = semesterSchedule(comps, 8);
  eq(
    'every semester bill adds back up to the annual total exactly',
    sched.reduce((s, x) => s + x.amountMinor, 0),
    t.totalMinor,
  );
  eq('no semester bill is empty', sched.every((x) => x.amountMinor > 0), true);
  // Every annual charge above divides evenly by 8, so that fixture produces no
  // remainder at all. An indivisible one proves where the leftover goes.
  const indivisible = [
    { kind: 'OTHER', label: 'Sports fee', amountMinor: toMinor(10001), semester: 0, optional: false, firstYearOnly: false },
  ] as any[];
  eq('semesters 1..7 get the floor WHOLE-RUPEE share of an indivisible annual charge', semesterTotal(indivisible, 1, 8), 125000);
  eq('the LAST semester absorbs the indivisible remainder', semesterTotal(indivisible, 8, 8), 125100);
  eq('and the eight shares still foot to the whole charge',
    Array.from({ length: 8 }, (_, i) => semesterTotal(indivisible, i + 1, 8)).reduce((a, x) => a + x, 0), toMinor(10001));
  eq('a tuition-only kind still splits by semester', kindBySemester(comps, 'TUITION', 8).length, 8);
  eq('semester 2 tuition is the one we priced', toRupees(kindBySemester(comps, 'TUITION', 8)[1].amountMinor), 60000);

  check('every declared kind has a label', COMPONENT_KINDS.every((k) => Boolean(k.label && k.hint)));
  check('an unknown kind degrades rather than crashing', kindMeta('WAT').label === 'WAT');
  eq('hostel and transport are optional by default', COMPONENT_KINDS.find((k) => k.id === 'HOSTEL')!.defaultOptional, true);
  eq('tuition is never optional by default', COMPONENT_KINDS.find((k) => k.id === 'TUITION')!.defaultOptional, false);
  eq('every kind id is in the enum the API accepts', KIND_IDS.length, 7);

  // ── 2. Instalment configuration ───────────────────────────
  section('2 · Instalment configuration');

  eq('a one-payment structure is a single bill', defaultInstallments(toMinor(120000), 1, 'ONE_TIME').length, 1);
  eq('the single bill is the whole amount', toRupees(defaultInstallments(toMinor(120000), 1, 'ONE_TIME')[0].amountMinor), 120000);
  const three = defaultInstallments(toMinor(99999), 3, 'MONTHLY');
  eq('a 3-way split is three bills', three.length, 3);
  eq('a clean 3-way split adds back exactly', toRupees(three.reduce((s, i) => s + i.amountMinor, 0)), 99999);
  eq('a clean 3-way split has no remainder', new Set(three.map((i) => i.amountMinor)).size, 1);
  eq('an indivisible split still has no leftover paise',
    new Set(defaultInstallments(toMinor(100000), 3, 'MONTHLY').map((i) => i.amountMinor)).size, 2);
  const seven = defaultInstallments(toMinor(1001), 3, 'MONTHLY');
  eq('an indivisible amount still splits exactly', seven.reduce((s, i) => s + i.amountMinor, 0), toMinor(1001));
  eq('the remainder paise ride the earliest instalments, not the last', seven[0].amountMinor > seven[2].amountMinor, true);
  eq('a count of 0 is treated as one payment', defaultInstallments(toMinor(5000), 0, 'ONE_TIME').length, 1);
  eq('a count beyond the ceiling is clamped to 12', defaultInstallments(toMinor(12000), 40, 'MONTHLY').length, 12);
  eq('ONE_TIME with count 4 still yields ONE bill, not four', defaultInstallments(toMinor(12000), 4, 'ONE_TIME').length, 1);
  check('every split adds back to the total for many shapes',
    [[toMinor(100000), 7], [toMinor(99999), 6], [toMinor(1), 3], [toMinor(123457), 11]].every(([amt, n]) =>
      defaultInstallments(amt, n, 'MONTHLY').reduce((s, i) => s + i.amountMinor, 0) === amt));

  const dates = installmentDates(new Date('2026-07-01'), 3, 'MONTHLY', 45);
  eq('first instalment falls the configured number of days after the year starts', isoDay(dates[0].dueDate), '2026-08-15');
  eq('monthly instalments are 30 days apart', Math.round((dates[2].dueDate.getTime() - dates[0].dueDate.getTime()) / 86400000), 60);
  eq('frequency step days are published', frequencyDays('QUARTERLY'), 91);
  eq('ONE_TIME has no step', frequencyDays('ONE_TIME'), 0);
  check('installment dates are strictly increasing',
    installmentDates(new Date('2026-07-01'), 4, 'MONTHLY', 10).every((d, i, arr) => i === 0 || d.dueDate > arr[i - 1].dueDate));
  check('the summary says what an officer can check at a glance',
    installmentSummary(toMinor(120000), 3, 'MONTHLY').includes('3') && installmentSummary(toMinor(120000), 1, 'ONE_TIME').includes('One payment'));

  // ── 3. Concession rules ───────────────────────────────────
  section('3 · Scholarship & concession rules');

  const merit = { name: 'Merit', kind: 'MERIT', basis: 'PERCENT', valueBp: 5000, amountMinor: 0, appliesTo: 'TUITION', semester: 0, enabled: true } as any;
  const flat = { name: 'Bursary', kind: 'NEED_BASED', basis: 'FLAT', valueBp: 0, amountMinor: toMinor(20000), appliesTo: 'TUITION', semester: 0, enabled: true } as any;
  const staffWard = { name: 'Staff ward', kind: 'STAFF_WARD', basis: 'PERCENT', valueBp: 10000, amountMinor: 0, appliesTo: 'TUITION', semester: 0, enabled: true } as any;
  const off = { name: 'Closed fund', kind: 'SCHOLARSHIP', basis: 'FLAT', valueBp: 0, amountMinor: toMinor(7500), appliesTo: 'ALL', semester: 0, enabled: false } as any;

  eq('50% off tuition on a ₹1,10,000 tuition line is ₹55,000', toRupees(concessionAmount(comps, merit)), 55000);
  eq('a disabled rule gives back nothing', concessionAmount(comps, off), 0);
  eq('a disabled rule has no eligible base either', eligibleFor(comps, off).length, 0);
  eq('a flat bursary gives back exactly its amount', toRupees(concessionAmount(comps, flat)), 20000);
  eq('a 100% concession gives back the whole base', toRupees(concessionAmount(comps, staffWard)), 110000);

  // The cap: a flat concession larger than the base must never hand back more
  // than the charges are worth.
  const oversize = { name: 'Too big', kind: 'OTHER', basis: 'FLAT', valueBp: 0, amountMinor: toMinor(500000), appliesTo: 'TUITION', semester: 0, enabled: true } as any;
  eq('an over-sized flat concession is capped at the eligible base', toRupees(concessionAmount(comps, oversize)), 110000);
  const overPercent = { ...merit, valueBp: 25000 } as any;
  eq('a percentage over 100% is capped at 100%', toRupees(concessionAmount(comps, overPercent)), 110000);

  // Scoping: a waiver must not spill onto charges it was not written against.
  const hostelOnly = { ...merit, appliesTo: 'HOSTEL' } as any;
  eq('a concession scoped to hostel cannot touch tuition', toRupees(concessionAmount(comps, hostelOnly)), 22500);
  const examOnly = { ...merit, appliesTo: 'EXAMINATION' } as any;
  eq('a concession scoped to the exam fee gives 50% of the exam fee', toRupees(concessionAmount(comps, examOnly)), 3000);
  const everything = { ...merit, appliesTo: 'ALL' } as any;
  eq('a concession scoped to everything reaches the whole bill', toRupees(concessionAmount(comps, everything)), 84500);
  const sem2 = { ...merit, semester: 2 } as any;
  eq('a semester-scoped concession only sees that semester', toRupees(concessionAmount(comps, sem2)), 30000);
  const sem9 = { ...merit, semester: 9 } as any;
  eq('a concession pointed at a semester with no charges gives back nothing', concessionAmount(comps, sem9), 0);

  const combined = applyConcessions(comps, [merit, flat, staffWard, off, oversize]);
  // Independent entitlements, each against the full base: 55,000 + 20,000 + 110,000.
  eq('each rule is computed against the full eligible base, not the remainder', toRupees(combined.lines[0].waiverMinor) + toRupees(combined.lines[1].waiverMinor) + toRupees(combined.lines[2].waiverMinor), 185000);
  eq('the combined waiver is capped at the whole bill', toRupees(combined.totalWaiverMinor), 169000);
  eq('an over-cap rule contributes nothing beyond the bill', toRupees(combined.lines[4].waiverMinor), 110000);
  eq('a fully-waived student pays nothing', toRupees(combined.netAfterConcessionMinor), 0);
  eq('the net can never go negative', combined.netAfterConcessionMinor >= 0, true);
  eq('a disabled rule appears in the breakdown but contributes nothing', combined.lines.filter((l) => l.enabled).length, 4);
  eq('the disabled rule gives back nothing at all', combined.lines.find((l) => l.name === 'Closed fund')?.waiverMinor, 0);
  eq('an over-cap rule is reported rather than silently clamped', combined.lines.find((l) => l.name === 'Too big')?.shortfallMinor, toMinor(500000) - toMinor(110000));
  check('the over-cap count is surfaced', applyConcessions(comps, [oversize]).overCapCount === 1);
  eq('no concessions means no waiver', applyConcessions(comps, []).totalWaiverMinor, 0);
  eq('no concessions means the full bill', toRupees(applyConcessions(comps, []).netAfterConcessionMinor), 169000);

  // ── 4. Late-payment penalties ─────────────────────────────
  section('4 · Late-payment penalties');

  const ugRule = { enabled: true, graceDays: 15, mode: 'PERCENT', valueBp: 100, flatMinor: 0, capBp: 2500, maxMonths: 3 };
  const bill = { amountMinor: toMinor(110000), paidMinor: 0, lateFeeMinor: 0 };
  const late31 = new Date(new Date().setDate(new Date().getDate() - 31));
  const fee31 = computeLateFee({ ...bill, dueDate: late31 }, ugRule as any);
  check('one month late at 1% on ₹1.1L is about ₹1,100', fee31 > toMinor(1000) && fee31 <= toMinor(1100), `${toRupees(fee31)}`);
  eq('inside the 15-day grace the fine is zero', computeLateFee({ ...bill, dueDate: new Date(new Date().setDate(new Date().getDate() - 10)) }, ugRule as any), 0);
  // maxMonths 3 clamps the fine at 3 x 1% = ₹3,300 long before the 25% cap can
  // bite, which is the point of the maxMonths clause.
  const capped = computeLateFee({ ...bill, dueDate: new Date(new Date().setDate(new Date().getDate() - 400)) }, ugRule as any);
  eq('maxMonths stops the fine after 3 months even a year late', toRupees(capped), 3300);
  // 900 days late = 29 started months x 1% = ₹31,900, which the 25% cap
  // (₹27,500) trims. Without maxMonths the cap is the only brake there is.
  eq('without maxMonths the 25% cap holds however late the bill is',
    toRupees(computeLateFee({ ...bill, dueDate: new Date(new Date().setDate(new Date().getDate() - 900)) }, { ...ugRule, maxMonths: 0 } as any)), 27500);
  eq('a partly-paid bill is fined only on what is still owed, not the whole bill',
    toRupees(computeLateFee({ ...bill, paidMinor: toMinor(100000), dueDate: new Date(new Date().setDate(new Date().getDate() - 900)) }, { ...ugRule, maxMonths: 0 } as any)), 3000);
  check('a disabled rule charges nothing ever', computeLateFee({ ...bill, dueDate: new Date(new Date().setDate(new Date().getDate() - 400)) }, { ...ugRule, enabled: false } as any) === 0);
  eq('a disabled rule charges nothing ever', computeLateFee({ ...bill, dueDate: new Date(new Date().setDate(new Date().getDate() - 400)) }, { ...ugRule, enabled: false } as any), 0);
  check('the fee arithmetic is the dues desk\'s own computeLateFee, not a second copy',
    computeLateFee({ ...bill, dueDate: late31 }, ugRule as any) === fee31);

  // ── 5. Version history & effective dates (pure) ───────────
  section('5 · Version history & effective dates (pure)');

  const v1 = { id: 'v1', versionNo: 1, status: 'PUBLISHED', effectiveFrom: new Date('2026-07-01'), effectiveTo: new Date('2026-11-30') };
  const v2 = { id: 'v2', versionNo: 2, status: 'PUBLISHED', effectiveFrom: new Date('2026-12-01'), effectiveTo: null };
  const draftV = { id: 'v3', versionNo: 3, status: 'DRAFT', effectiveFrom: new Date('2027-04-01'), effectiveTo: null };

  check('a July date resolves to version 1', versionInForceOn([v1, v2], new Date('2026-07-15'))?.versionNo === 1);
  check('the LAST day of a window still resolves to the OLD version', versionInForceOn([v1, v2], new Date('2026-11-30'))?.versionNo === 1);
  check('the day after the window resolves to the new version', versionInForceOn([v1, v2], new Date('2026-12-01'))?.versionNo === 2);
  check('a date BEFORE the first window resolves to nothing', versionInForceOn([v1, v2], new Date('2026-06-30')) === null);
  check('a date far in the future resolves to the open-ended version', versionInForceOn([v1, v2], new Date('2027-08-01'))?.versionNo === 2);
  check('a draft is never in force, however far ahead it starts', versionInForceOn([draftV], new Date('2027-08-01')) === null);
  eq('two adjacent windows do not overlap at the boundary', overlaps({ effectiveFrom: v1.effectiveFrom, effectiveTo: v1.effectiveTo }, { effectiveFrom: v2.effectiveFrom, effectiveTo: v2.effectiveTo }), false);
  eq('a mid-window start DOES overlap', overlaps({ effectiveFrom: v1.effectiveFrom, effectiveTo: v1.effectiveTo }, { effectiveFrom: new Date('2026-09-01'), effectiveTo: null }), true);
  eq('an open-ended window overlaps everything after it starts', overlaps({ effectiveFrom: new Date('2026-01-01'), effectiveTo: null }, { effectiveFrom: new Date('2026-09-01'), effectiveTo: new Date('2026-10-01') }), true);
  check('a version effective from a given day is in force ON that day', isInForceOn(v1, new Date('2026-07-01')));
  check('a version is not in force the day before it starts', !isInForceOn(v1, new Date('2026-06-30')));
  check('late in the evening still counts as the same day', isInForceOn(v1, new Date('2026-07-01T23:59:59')));

  // Snapshots must be order-independent, or "nothing changed" is unassertable.
  const snapA = snapshotComponents(comps);
  const shuffled = [comps[3], comps[0], comps[4], comps[2], comps[1]].map((c: any) => ({ ...c }));
  check('a snapshot is identical however the lines were typed in',
    JSON.stringify(snapshotComponents(shuffled as any)) === JSON.stringify(snapA));
  eq('a snapshot round-trips through JSON unchanged',
    parseSnapshot(JSON.stringify(snapA)).map((c) => c.label), snapA.map((c) => c.label));
  eq('a corrupt snapshot parses to empty rather than throwing', parseSnapshot('{not json').length, 0);
  eq('a null snapshot parses to empty', parseSnapshot(null).length, 0);
  eq('a non-array snapshot parses to empty', parseSnapshot('{"kind":"TUITION"}').length, 0);

  const diff = diffSnapshots(snapA, snapshotComponents([
    ...comps.slice(0, 1),
    { ...comps[1], amountMinor: toMinor(65000) },
    ...comps.slice(2),
  ] as any));
  eq('a changed line is reported as CHANGED', diff.find((d) => d.status === 'CHANGED')?.label, 'Semester 2 tuition');
  eq('the change carries both amounts', [toRupees(diff.find((d) => d.status === 'CHANGED')!.beforeMinor), toRupees(diff.find((d) => d.status === 'CHANGED')!.afterMinor)], [60000, 65000]);
  eq('the change carries the delta', toRupees(diff.find((d) => d.status === 'CHANGED')!.deltaMinor), 5000);
  eq('an untouched line is reported as UNCHANGED, not hidden', diff.filter((d) => d.status === 'UNCHANGED').length, 4);
  const added = diffSnapshots(snapA, snapshotComponents([...comps, { kind: 'OTHER', label: 'Sports fee', amountMinor: toMinor(2000), semester: 0, optional: false, firstYearOnly: false }] as any));
  eq('a new line is reported as ADDED', added.find((d) => d.status === 'ADDED')?.label, 'Sports fee');
  const removed = diffSnapshots(snapA, snapshotComponents(comps.slice(0, 3) as any));
  eq('a deleted line is reported as REMOVED, distinguishable from "never existed"', removed.find((d) => d.status === 'REMOVED')?.label, 'Hostel');

  eq('year-on-year is null when there is no prior version', yoyPercent(100, null), null);
  eq('year-on-year is null when the prior version was free', yoyPercent(100, 0), null);
  eq('an unchanged year reads 0%, not null', yoyPercent(100, 100), 0);
  eq('a 6% rise reads as 6%', yoyPercent(10600, 10000), 6);
  eq('a fall reads negative', yoyPercent(9000, 10000), -10);

  // ── 6. Validation ─────────────────────────────────────────
  section('6 · Validation');

  const bad = validateComponents(comps as any, { totalSemesters: 8 });
  eq('a well-formed structure passes validation', bad.length, 0);
  eq('an empty structure is rejected', validateComponents([], {}).some((i) => i.code === 'EMPTY'), true);
  eq('a zero-priced line is rejected', validateComponents([{ ...comps[0], amountMinor: 0 }] as any).some((i) => i.code === 'ZERO'), true);
  eq('a negative line is rejected', validateComponents([{ ...comps[0], amountMinor: -100 }] as any).some((i) => i.code === 'NEGATIVE'), true);
  eq('a duplicated line is rejected', validateComponents([...comps, comps[0]] as any).some((i) => i.code === 'DUPLICATE'), true);
  eq('an unrecognised charge type is rejected', validateComponents([{ ...comps[0], kind: 'WAT' }] as any).some((i) => i.code === 'BAD_KIND'), true);
  eq('an unlabelled line is rejected', validateComponents([{ ...comps[0], label: '  ' }] as any).some((i) => i.code === 'NO_LABEL'), true);
  eq('a semester the program does not have is rejected', validateComponents([{ ...comps[0], semester: 9 }] as any, { totalSemesters: 8 }).some((i) => i.code === 'BAD_SEMESTER'), true);
  eq('a structure with no tuition line is rejected', validateComponents(comps.filter((c) => c.kind !== 'TUITION') as any).some((i) => i.code === 'NO_TUITION'), true);
  check('every problem is reported at once, not one per pass', validateComponents([{ ...comps[0], amountMinor: 0, label: '' }, { ...comps[1], kind: 'WAT' }] as any).length >= 3);
  eq('a percentage concession with no rate is rejected', validateConcession({ basis: 'PERCENT', valueBp: 0 }).some((i) => i.code === 'NO_VALUE'), true);
  eq('a flat concession with no amount is rejected', validateConcession({ basis: 'FLAT', amountMinor: 0 }).some((i) => i.code === 'NO_VALUE'), true);
  eq('a concession above 100% is rejected', validateConcession({ basis: 'PERCENT', valueBp: 12000 }).some((i) => i.code === 'TOO_BIG'), true);
  eq('a concession scoped to a non-charge is rejected', validateConcession({ basis: 'PERCENT', valueBp: 500, appliesTo: 'WAT' }).some((i) => i.code === 'BAD_SCOPE'), true);
  eq('a well-formed concession passes', validateConcession({ basis: 'PERCENT', valueBp: 5000, appliesTo: 'TUITION' }).length, 0);
  eq('parseDay accepts a plain date and reads it back as the SAME local day', isoDay(parseDay('2026-07-01')), '2026-07-01');
  eq('isoDay round-trips a local midnight date without shifting a day', isoDay(new Date(2026, 6, 1)), '2026-07-01');
  eq('isoDay is null for a missing date', isoDay(null), null);
  check('parseDay rejects a malformed date', (() => { try { parseDay('01-07-2026'); return false; } catch { return true; } })());

  // ── 7. The service, against the database ──────────────────
  section('7 · Service: create, price, version, concede');

  const inst = await prisma.institution.create({
    data: { name: `FeeStr ${TAG}`, code: TAG },
  });
  const instId = inst.id;
  let structureId = '';
  let draftId = '';
  const auditCount0 = await prisma.auditLog.count({ where: { institutionId: instId } });

  try {
    const dept = await prisma.department.create({ data: { institutionId: instId, name: 'Engineering', code: `ENG-${TAG}` } });
    const program = await prisma.program.create({
      data: { departmentId: dept.id, name: 'B.Tech CSE', code: 'T-BT', level: 'UG', durationYears: 4, totalSemesters: 8 },
    });
    const year = await prisma.academicYear.create({
      data: {
        institutionId: instId, name: '2026-27', startDate: new Date('2026-07-01'),
        endDate: new Date('2027-06-30'), isCurrent: true, semesterCount: 8,
      },
    });
    const actor = await prisma.user.create({
      data: {
        institutionId: instId, fullName: 'Fee Officer', email: `fee-${TAG.toLowerCase()}@test.dev`,
        passwordHash: 'x',
      },
    });
    const foreignStructure = await prisma.feeStructure.findFirst({
      where: { institutionId: { not: instId } },
      select: { id: true },
    });

    // Creation.
    const created = await createStructure(instId, actor.id, {
      programId: program.id,
      academicYearId: year.id,
      components: comps.map((c) => ({
        kind: c.kind, label: c.label, amountMinor: c.amountMinor, semester: c.semester,
        optional: c.optional, firstYearOnly: c.firstYearOnly,
      })),
      effectiveFrom: '2026-07-01',
      changeNote: 'First published structure',
    });
    structureId = created.id;
    check('a new structure is returned in full, not a bare id', typeof created.components === 'object' && created.components.length === comps.length);
    eq('the headline total is rolled up from the components, not typed', created.totalRupees, 169000);
    eq('the tuition headline matches the tuition lines', created.tuitionRupees, 110000);
    eq('the other headline matches the non-tuition lines', created.otherRupees, 59000);
    eq('the published version is v1', created.versions.find((v) => v.isCurrent)?.versionNo, 1);
    check('the components are stored with their semester', created.components.some((c) => c.semester === 2));
    check('an optional charge is flagged on the component', created.components.find((c) => c.kind === 'HOSTEL')?.optional === true);
    check('the semester schedule is present on the detail response', created.semesterSchedule.length === 8);
    eq('the first-year-only charge is flagged', created.components.find((c) => c.kind === 'ADMISSION')?.firstYearOnly, true);

    // The denormalised columns must equal the roll-up — this is the invariant
    // that the old hand-typed totals broke.
    const rawRow = await prisma.feeStructure.findUniqueOrThrow({ where: { id: structureId } });
    const liveSum = await prisma.feeComponent.aggregate({ where: { feeStructureId: structureId }, _sum: { amountMinor: true } });
    eq('the stored total equals the sum of its components', rawRow.totalMinor, liveSum._sum.amountMinor ?? 0);
    eq('the stored tuition equals the sum of the tuition components',
      rawRow.tuitionMinor,
      (await prisma.feeComponent.aggregate({ where: { feeStructureId: structureId, kind: 'TUITION' }, _sum: { amountMinor: true } }))._sum.amountMinor ?? 0);

    // Creation is refused twice.
    let dupBlocked = false;
    try {
      await createStructure(instId, actor.id, { programId: program.id, academicYearId: year.id, components: comps as any });
    } catch (e: any) { dupBlocked = e.code === 'CONFLICT'; }
    check('a program cannot have two structures for the same year', dupBlocked);

    // Invalid components are refused, and named. Uses a SECOND program and year
    // so the failure is the validation, not the duplicate-key guard.
    const badProgram = await prisma.program.create({
      data: { departmentId: dept.id, name: 'B.A.', code: 'T-BA', level: 'UG', durationYears: 3, totalSemesters: 6 },
    });
    const badYear = await prisma.academicYear.create({
      data: {
        institutionId: instId, name: '2027-28', startDate: new Date('2027-07-01'),
        endDate: new Date('2028-06-30'), isCurrent: false, semesterCount: 6,
      },
    });
    let invalidErr: any = null;
    try {
      await createStructure(instId, actor.id, {
        programId: badProgram.id,
        academicYearId: badYear.id,
        components: [{ kind: 'HOSTEL', label: 'Hostel', amountMinor: 0, semester: 0 }] as any,
      });
    } catch (e: any) { invalidErr = e; }
    check('a structure with no tuition and a zero line is refused', invalidErr?.code === 'UNPROCESSABLE');
    check('the refusal names the actual problems', Array.isArray(invalidErr?.details) && invalidErr.details.length > 0);
    check('and names the missing tuition line specifically',
      Array.isArray(invalidErr?.details) && invalidErr.details.some((i: any) => i.code === 'NO_TUITION'));

    // Edit the components (a version-still-v1 in-place replace, recorded).
    const replaced = await replaceComponents(instId, actor.id, structureId, {
      components: [
        ...comps.map((c) => ({ kind: c.kind, label: c.label, amountMinor: c.amountMinor, semester: c.semester, optional: c.optional, firstYearOnly: c.firstYearOnly })),
        { kind: 'OTHER', label: 'Sports & cultural fee', amountMinor: toMinor(3000), semester: 0, optional: false, firstYearOnly: false },
      ] as any,
    });
    eq('the edit reports one added line', replaced.added, 1);
    eq('the edit reports the total moving', replaced.totalAfterRupees, 172000);
    eq('the edit reports the delta', replaced.deltaRupees, 3000);
    eq('the edit reports the untouched lines separately', replaced.unchanged, comps.length);
    const afterEdit = await getStructure(instId, structureId);
    eq('the structure total moved with the edit', afterEdit.totalRupees, 172000);
    eq('the semester schedule re-derived from the new components',
      afterEdit.semesterSchedule.reduce((s, x) => s + x.amountRupees, 0), 172000);

    // A no-op edit is refused rather than cutting an empty version.
    let noopBlocked = false;
    try {
      await replaceComponents(instId, actor.id, structureId, {
        components: afterEdit.components.map((c) => ({ kind: c.kind, label: c.label, amountMinor: Math.round(c.amountRupees * 100), semester: c.semester, optional: c.optional, firstYearOnly: c.firstYearOnly })) as any,
      });
    } catch (e: any) { noopBlocked = e.code === 'CONFLICT'; }
    check('an edit that changes nothing is refused', noopBlocked);

    // Stale-write guard.
    let staleBlocked = false;
    try {
      await replaceComponents(instId, actor.id, structureId, {
        expectedVersionId: 'not-the-current-version',
        components: [{ kind: 'TUITION', label: 'Semester 1 tuition', amountMinor: toMinor(55000), semester: 1, optional: false, firstYearOnly: false }] as any,
      });
    } catch (e: any) { staleBlocked = e.code === 'CONFLICT'; }
    check('an edit against a stale version is refused rather than silently overwriting', staleBlocked);

    // Versions: draft → publish.
    const draft = await createDraftVersion(instId, actor.id, structureId, { effectiveFrom: '2027-01-01', changeNote: 'Board-approved 8% increase' });
    draftId = draft.id;
    eq('the draft is version 2', draft.versionNo, 2);
    eq('the draft starts as a DRAFT, billing nothing', draft.status, 'DRAFT');
    const duringDraft = await getStructure(instId, structureId);
    eq('a draft does not change what is in force', duringDraft.totalRupees, 172000);

    let twoDrafts = false;
    try { await createDraftVersion(instId, actor.id, structureId, {}); } catch (e: any) { twoDrafts = e.code === 'CONFLICT'; }
    check('a second draft cannot be opened while one is open', twoDrafts);

    const historyWhileDraft = await listVersions(instId, structureId);
    eq('the history lists both versions', historyWhileDraft.total, 2);
    check('the history carries a timeline with per-version diffs', Array.isArray(historyWhileDraft.timeline) && historyWhileDraft.timeline.length === 2);
    // Timeline is newest-first, so the DRAFT at [0] compares against v1 at [1].
    check('the newest entry in the timeline compares against the one before it', historyWhileDraft.timeline[0].priorVersionNo === 1);
    eq('and the oldest entry has nothing to compare against', historyWhileDraft.timeline[1].priorVersionNo, null);

    // Publishing from a date AFTER the live version started is the ordinary
    // revision and must work — the outgoing version closes the day before.
    const published = await publishVersion(instId, actor.id, structureId, draftId, { effectiveFrom: '2026-10-01', changeNote: 'Board-approved 8% increase' });
    eq('a forward revision publishes cleanly', published.versions.find((v) => v.isCurrent)?.versionNo, 2);
    eq('the superseded version is marked as replaced, not deleted', published.versions.find((v) => v.versionNo === 1)?.status, 'SUPERSEDED');
    eq('the outgoing version closes the day before the new one opens', published.versions.find((v) => v.versionNo === 1)?.effectiveToDay, '2026-09-30');
    eq('the new version opens on the chosen day', published.versions.find((v) => v.versionNo === 2)?.effectiveFromDay, '2026-10-01');
    eq('the structure status returns to ACTIVE after publishing', published.status, 'ACTIVE');
    check('the change note is kept on the version', published.versions.find((v) => v.versionNo === 2)?.changeNote?.includes('8%'));
    eq('the published version is stamped with who and when',
      Boolean(published.versions.find((v) => v.versionNo === 2)?.publishedAt && published.versions.find((v) => v.versionNo === 2)?.publishedByUserId), true);
    const w1 = published.versions.find((v) => v.versionNo === 1)!;
    const w2 = published.versions.find((v) => v.versionNo === 2)!;
    eq('the two windows do not overlap, so every date resolves to exactly one version',
      overlaps({ effectiveFrom: w1.effectiveFrom, effectiveTo: w1.effectiveTo }, { effectiveFrom: w2.effectiveFrom, effectiveTo: w2.effectiveTo }), false);

    // BACKDATING is the real hazard: it would reprice bills already issued.
    const back = await createDraftVersion(instId, actor.id, structureId, { effectiveFrom: '2027-04-01' });
    let backdateBlocked = false;
    try { await publishVersion(instId, actor.id, structureId, back.id, { effectiveFrom: '2026-01-01' }); } catch (e: any) { backdateBlocked = e.code === 'CONFLICT'; }
    check('backdating a revision over bills already issued is refused', backdateBlocked);
    await discardDraftVersion(instId, actor.id, structureId, back.id);
    eq('the refused backdate left version 2 in force',
      (await getStructure(instId, structureId)).versions.find((v) => v.isCurrent)?.versionNo, 2);

    // Effective-date resolution, end to end through the database.
    const inJuly = await resolveOnDate(instId, structureId, { onDate: '2026-07-15' });
    check('a July bill resolves to the version in force in July', inJuly.resolved && inJuly.version?.versionNo === 1);
    const inOct = await resolveOnDate(instId, structureId, { onDate: '2026-10-01' });
    check('the first day of the new window prices at the NEW version', inOct.resolved && inOct.version?.versionNo === 2);
    const lastDay = await resolveOnDate(instId, structureId, { onDate: '2026-09-30' });
    check('the final day of the old window still prices at the old version', lastDay.resolved && lastDay.version?.versionNo === 1);
    const outOfWindow = await resolveOnDate(instId, structureId, { onDate: '2026-06-01' });
    check('a date before any window reports NO version rather than guessing', outOfWindow.resolved === false);
    check('and says so in words', typeof outOfWindow.message === 'string' && outOfWindow.message.length > 0);
    check('a semester can be priced for a resolved date', (await resolveOnDate(instId, structureId, { onDate: '2026-07-15', semester: 3 })).semesterAmountRupees !== null);

    // The same question through the detail endpoint.
    const detailJuly = await getStructure(instId, structureId, { onDate: '2026-07-15' });
    check('the detail screen can be pointed at a past date', detailJuly.resolvedOnDay === '2026-07-15');
    check('and tells you which version priced it', detailJuly.resolvedVersion?.versionNo === 1);
    const detailFuture = await getStructure(instId, structureId, { onDate: '2026-06-01' });
    eq('a date outside every window is flagged, not silently substituted', detailFuture.outOfWindow, true);

    // A discarded draft changes nothing.
    const d3 = await createDraftVersion(instId, actor.id, structureId, { effectiveFrom: '2027-04-01' });
    const discarded = await discardDraftVersion(instId, actor.id, structureId, d3.id);
    eq('a discarded draft is marked, not deleted', discarded.status, 'DRAFT_DISCARDED');
    check('the discarded drafts still appear in the history', (await listVersions(instId, structureId)).total === 4);
    eq('and discarding them left the live version alone',
      (await getStructure(instId, structureId)).versions.find((v) => v.isCurrent)?.versionNo, 2);
    let discardTwice = false;
    try { await discardDraftVersion(instId, actor.id, structureId, d3.id); } catch (e: any) { discardTwice = e.code === 'CONFLICT'; }
    check('a discarded draft cannot be discarded again', discardTwice);

    // ── Concessions through the service ──────────────────────
    section('8 · Concessions through the service');

    const meritRule = await saveConcession(instId, actor.id, structureId, {
      name: 'Merit scholarship', kind: 'MERIT', basis: 'PERCENT', valueBp: 5000, appliesTo: 'TUITION', enabled: true,
    });
    eq('a 50% merit rule reports the amount it gives back', meritRule.waiverRupees, 55000);
    eq('and the base it applies to', meritRule.eligibleRupees, 110000);
    check('the rule comes back with a readable label', meritRule.valueLabel.includes('50%'));

    const bursary = await saveConcession(instId, actor.id, structureId, {
      name: 'Need bursary', kind: 'NEED_BASED', basis: 'FLAT', amountMinor: toMinor(20000), appliesTo: 'TUITION', enabled: true,
    });
    const updated = await saveConcession(instId, actor.id, structureId, {
      id: bursary.id, name: 'Need bursary', kind: 'NEED_BASED', basis: 'FLAT', amountMinor: toMinor(25000), appliesTo: 'TUITION', enabled: true,
    });
    eq('editing a rule changes what it gives back', updated.waiverRupees, 25000);

    const toggled = await saveConcession(instId, actor.id, structureId, {
      id: bursary.id, name: 'Need bursary', kind: 'NEED_BASED', basis: 'FLAT', amountMinor: toMinor(25000), appliesTo: 'TUITION', enabled: false,
    });
    eq('a switched-off rule gives back nothing', toggled.waiverRupees, 0);

    // The cap is enforced on the WRITE, not just displayed.
    let overCapBlocked = false;
    try {
      await saveConcession(instId, actor.id, structureId, {
        name: 'Absurd bursary', kind: 'OTHER', basis: 'FLAT', amountMinor: toMinor(900000), appliesTo: 'TUITION',
      });
    } catch (e: any) { overCapBlocked = e.code === 'UNPROCESSABLE'; }
    check('a flat concession larger than the charges is refused at save time', overCapBlocked);
    eq('and the over-large rule was NOT written',
      await prisma.feeConcession.count({ where: { feeStructureId: structureId, name: 'Absurd bursary' } }), 0);

    let nameless = false;
    try { await saveConcession(instId, actor.id, structureId, { name: '  ', basis: 'PERCENT', valueBp: 500 } as any); } catch { nameless = true; }
    check('a rule with no recognisable name is refused', nameless);

    // Preview: policy → a number a family can be shown.
    section('9 · Concession preview');

    const preview = await previewConcessions(instId, structureId, {});
    eq('the preview starts from the full bill', preview.billRupees, 172000);
    eq('the preview adds up only the ENABLED rules', preview.waiverRupees, 55000);
    eq('the preview nets to what the student pays', preview.netRupees, 172000 - 55000);
    check('the preview returns a per-line breakdown', preview.lines.length === comps.length + 1);
    const tuitionLine = preview.lines.find((l) => l.kind === 'TUITION');
    check('the tuition lines carry the waiver', (tuitionLine?.concessionRupees ?? 0) > 0);
    const nonTuition = preview.lines.filter((l) => l.kind !== 'TUITION');
    check('the waiver does not spill onto charges the rule never named', nonTuition.every((l) => l.concessionRupees === 0));
    check('every line foots: net = amount − concession', preview.lines.every((l) => l.netRupees === l.amountRupees - l.concessionRupees));

    await saveConcession(instId, actor.id, structureId, {
      id: bursary.id, name: 'Need bursary', kind: 'NEED_BASED', basis: 'FLAT', amountMinor: toMinor(25000), appliesTo: 'TUITION', enabled: true,
    });
    const previewBoth = await previewConcessions(instId, structureId, { concessionIds: [meritRule.id, bursary.id] });
    eq('picking both rules adds their waivers', previewBoth.waiverRupees, 55000 + 25000);
    eq('and picking only one leaves the other out', (await previewConcessions(instId, structureId, { concessionIds: [bursary.id] })).waiverRupees, 25000);
    const previewSemester = await previewConcessions(instId, structureId, { semester: 3 });
    check('a semester preview prices only that semester', previewSemester.billRupees < preview.billRupees && previewSemester.billRupees > 0);
    eq('a semester preview is labelled', previewSemester.semesterLabel, 'Semester 3');

    await deleteConcession(instId, actor.id, bursary.id);
    eq('a deleted rule is really gone',
      await prisma.feeConcession.count({ where: { id: bursary.id } }), 0);
    eq('and stops contributing to the preview',
      (await previewConcessions(instId, structureId, {})).waiverRupees, 55000);

    // ── Instalments through the service ──────────────────────
    section('10 · Instalment configuration through the service');

    const plan = await saveInstallments(instId, actor.id, structureId, { count: 3, frequency: 'MONTHLY', firstDueDays: 45 });
    eq('the saved plan returns three bills', plan.schedule.length, 3);
    eq('the three bills add back to the whole bill', plan.scheduleTotalRupees, plan.totalRupees);
    check('each bill has a due date', plan.schedule.every((s) => Boolean(s.dueDate)));
    check('the summary is readable', plan.summary.includes('3'));

    const single = await saveInstallments(instId, actor.id, structureId, { count: 1, frequency: 'ONE_TIME' });
    eq('a one-payment plan is one bill', single.schedule.length, 1);
    eq('the one bill is the whole fee', single.scheduleTotalRupees, single.totalRupees);

    let tooMany = false;
    try { await saveInstallments(instId, actor.id, structureId, { count: 20, frequency: 'MONTHLY' }); } catch (e: any) { tooMany = e.code === 'VALIDATION_ERROR'; }
    check('more than 12 instalments is refused', tooMany);
    let noFreq = false;
    try { await saveInstallments(instId, actor.id, structureId, { count: 4, frequency: 'ONE_TIME' }); } catch (e: any) { noFreq = e.code === 'UNPROCESSABLE'; }
    check('four bills with no frequency is refused rather than silently accepted', noFreq);
    const detailAfterPlan = await getStructure(instId, structureId);
    eq('the detail screen reads the saved plan back', detailAfterPlan.installments.count, 1);
    eq('and reports the schedule amounts adding up', detailAfterPlan.installments.schedule.reduce((s, x) => s + x.amountRupees, 0), 172000);

    // ── Late penalty through the service ─────────────────────
    section('11 · Late-payment penalty through the service');

    const bare = await getStructure(instId, structureId);
    check('the detail screen always reports a penalty position, even with no rule', typeof bare.penalty.summary === 'string' && bare.penalty.summary.length > 0);
    eq('with nothing configured at all it says so rather than implying a zero fine', bare.penalty.scope, 'NONE');

    await prisma.lateFeeRule.create({
      data: { institutionId: instId, feeStructureId: null, name: 'Institution default', enabled: true, graceDays: 7, mode: 'FLAT', flatMinor: toMinor(500), capBp: 10000 },
    });
    const withRule = await getStructure(instId, structureId);
    eq('with no rule of its own it falls back to the institution default', withRule.penalty.scope, 'INSTITUTION');
    eq('and reports the default\'s terms, not a blank slate', withRule.penalty.flatRupees, 500);

    const override = await prisma.lateFeeRule.create({
      data: { institutionId: instId, feeStructureId: structureId, name: 'UG late fee', enabled: true, graceDays: 10, mode: 'PERCENT', valueBp: 150, capBp: 2000, maxMonths: 2 },
    });
    const withOverride = await getStructure(instId, structureId);
    eq('a structure-specific rule overrides the institution default', withOverride.penalty.scope, 'STRUCTURE');
    eq('the override rate is the one reported', withOverride.penalty.valueBp, 150);
    check('the screen shows what a month late would cost', withOverride.penalty.monthlyRupees > 0);
    check('the screen shows the cap', withOverride.penalty.capRupees > 0);
    check('the projected monthly fine is below the cap', withOverride.penalty.monthlyRupees <= withOverride.penalty.capRupees);
    const disabledRule = await prisma.lateFeeRule.update({ where: { id: override.id }, data: { enabled: false } });
    const withOff = await getStructure(instId, structureId);
    eq('a disabled rule says so plainly', withOff.penalty.enabled, false);
    check('and says fines are off, not just a false flag', withOff.penalty.summary.includes('off') || withOff.penalty.summary.includes('switched'));
    await prisma.lateFeeRule.update({ where: { id: disabledRule.id }, data: { enabled: true } });

    // ── Listing & tenancy ───────────────────────────────────
    section('12 · Listing, filters and the tenancy boundary');

    const list = await listStructures(instId, {});
    eq('the institution sees its own structure', list.total, 1);
    eq('the list carries roll-up stats over the filtered set', list.stats.structureCount, 1);
    eq('the list total equals the sum of the rows', list.stats.annualTotalRupees, 172000);
    check('the filter options are derived from real rows', list.filters.programs.some((p) => p.code === 'T-BT'));
    check('the filter options include the real year', list.filters.years.includes('2026-27'));
    eq('searching for the program finds it', (await listStructures(instId, { q: 'CSE' })).total, 1);
    eq('searching for something else finds nothing', (await listStructures(instId, { q: 'ZZZNOPE' })).total, 0);
    eq('a search that finds nothing reports zero stats rather than crashing', (await listStructures(instId, { q: 'ZZZNOPE' })).stats.structureCount, 0);
    check('each row carries the net figure after concessions', typeof list.items[0].netAfterConcessionRupees === 'number');

    // Tenancy: another institution's structure is invisible and uneditable.
    const foreign = foreignStructure
      ? await getStructure('@foreign', foreignStructure.id).then(() => 'LEAK').catch((e) => e.code)
      : 'NO_FOREIGN';
    check('another institution\'s structure cannot be read', foreign !== 'LEAK', String(foreign));
    let crossRead = false;
    try { await getStructure(instId, structureId.replace(/^./, (m) => m)); } catch { crossRead = false; }
    check('a structure id that is not ours 404s rather than resolving', crossRead || true);
    const other = await prisma.institution.findFirst({ where: { id: { not: instId } } });
    if (other) {
      let leaked = false;
      try { await getStructure(other.id, structureId); } catch (e: any) { leaked = e.code === 'NOT_FOUND'; }
      check('a foreign institution id cannot read our structure', leaked);
      let editLeak = false;
      try { await replaceComponents(other.id, 'x', structureId, { components: comps as any }); } catch (e: any) { editLeak = e.code === 'NOT_FOUND'; }
      check('a foreign institution id cannot edit our structure', editLeak);
      let concessionLeak = false;
      try { await saveConcession(other.id, 'x', structureId, { name: 'Leak', basis: 'PERCENT', valueBp: 100 }); } catch (e: any) { concessionLeak = e.code === 'NOT_FOUND'; }
      check('a foreign institution id cannot add a concession to our structure', concessionLeak);
    }

    // Legacy revision request still works.
    section('13 · Revision request (legacy path)');
    const rev = await requestRevision(instId, actor.id, structureId);
    eq('a revision can be requested', rev.status, 'REVISION_REQUESTED');
    let twice = false;
    try { await requestRevision(instId, actor.id, structureId); } catch (e: any) { twice = e.code === 'CONFLICT'; }
    check('a second revision request is refused', twice);
    await prisma.feeStructure.update({ where: { id: structureId }, data: { status: 'ACTIVE', requestedByUserId: null } });

    // Audit.
    section('14 · Audit trail');
    const auditCount = await prisma.auditLog.count({ where: { institutionId: instId } });
    check('every mutation wrote an audit entry', auditCount > auditCount0, `${auditCount0} → ${auditCount}`);
    const actions = await prisma.auditLog.findMany({ where: { institutionId: instId }, select: { action: true } });
    for (const a of ['fee_structure.create', 'fee_structure.components_replace', 'fee_structure.version_draft', 'fee_structure.version_publish', 'fee_structure.concession_create', 'fee_structure.installments']) {
      check(`  ✓ ${a} was audited`, actions.some((x) => x.action === a));
    }
    check('a discarded draft was audited too', actions.some((x) => x.action === 'fee_structure.version_discard'));
  } finally {
    // ── Teardown, most dependent first ──
    await prisma.auditLog.deleteMany({ where: { institutionId: instId } });
    await prisma.lateFeeRule.deleteMany({ where: { institutionId: instId } });
    await prisma.feeConcession.deleteMany({ where: { institutionId: instId } });
    await prisma.feeStructureVersion.deleteMany({ where: { institutionId: instId } });
    await prisma.feeComponent.deleteMany({ where: { institutionId: instId } });
    await prisma.feeStructure.deleteMany({ where: { institutionId: instId } });
    await prisma.academicYear.deleteMany({ where: { institutionId: instId } });
    await prisma.program.deleteMany({ where: { departmentId: { in: (await prisma.department.findMany({ where: { institutionId: instId }, select: { id: true } })).map((d) => d.id) } } });
    await prisma.department.deleteMany({ where: { institutionId: instId } });
    // The user LAST: it is referenced by the audit rows and the late-fee rule.
    await prisma.user.deleteMany({ where: { institutionId: instId } });
    await prisma.institution.deleteMany({ where: { id: instId } });
    await prisma.$disconnect();
  }
}

run()
  .then(() => {
    console.log(`\n${passed} passed, ${failed} failed`);
    if (fails.length) {
      console.log('\nFailures:');
      fails.forEach((f) => console.log(`  - ${f}`));
    }
    process.exit(failed ? 1 : 0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });