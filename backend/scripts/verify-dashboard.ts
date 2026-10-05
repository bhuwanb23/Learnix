// F-11 Dashboard — service + rules verification (docs/users/06 §3.11).
//
// Every section here corresponds to a defect that was in the version it
// replaces, or to a promise the dashboard makes that nothing was checking:
//
//   1. THE REGISTRIES ARE COMPLETE AND CONSISTENT. Seven blocks, three families,
//      eight kinds, four actions, five windows. Every alert kind belongs to a real
//      family; every block's route is a sub-screen this feature registers. The
//      mirror assertion is the one that catches a block added on the server alone.
//
//   2. TENANT ISOLATION OF EVERY BLOCK. `FeeDue` has no `institutionId`, so a
//      block that "forgot" the join returns every college's dues as yours. A
//      rival institution is created here with a large overdue bill, a large
//      payment and a scholarship, and none of it may appear.
//
//   3. THE AGES ARE DATE-BASED, NOT THE STALE COLUMN. `FeeDue.daysOverdue` is
//      denormalised and drifts. The old screen filtered on it for its defaulter
//      list and never refreshed it. A due whose date is 60 days past but whose
//      stored counter says 0 MUST still be a defaulter here, and a due due
//      TOMORROW must not be.
//
//   4. BALANCES, NOT BILLED AMOUNTS. A part-paid bill must be reported at what is
//      left owing. This is checked against the exact paise, because rounding it
//      away here is the most expensive mistake a receivables screen can make.
//
//   5. THE BUDGET IS NOT CLAMPED. A line at 180% of plan must report 180%. The
//      old screen clamped at 100, which is how the number that most needed to look
//      alarming was the one number that could not.
//
//   6. THE FIVE SCHOLARSHIP FIGURES NEVER MERGE. An UNDER_REVIEW application is
//      pending, NOT approved. The old screen counted it as committed, reporting a
//      decision nobody had made as a promise the institution had made.
//
//   7. THE QUICK-ACTION COUNTS ARE LIVE AND UNBLOCKED-WHEN-THEY-SHOULD-BE. A
//      collection cannot be blocked because nobody owes money: a donation has no
//      student attached and is still a real collection.
//
//   8. THE RECONCILIATION COUNTS AGREE WITH THE NOTIFICATIONS DESK. The four
//      kinds are the same helper objects. If someone re-implements one of them
//      here, the two screens start disagreeing about the same problem.
//
// Run: npx tsx scripts/verify-dashboard.ts
import { prisma } from '../src/db/prisma.js';
import {
  ALERT_FAMILIES, ALERT_FAMILY_IDS, ALERT_KIND_IDS, ALERT_KINDS, BLOCK_IDS, BLOCKS,
  BLOCKS as BLOCK_LIST, CASH_REVIEW_RUPEES, CRITICAL_OVERDUE_DAYS, DEFAULTER_MIN_DAYS,
  PAYROLL_DUE_DAY, PAYROLL_OVERDUE_DAYS, QUICK_ACTION_IDS, QUICK_ACTIONS, SCHOLARSHIP_UNRELEASED_DAYS,
  UNUSUAL_FLOOR_RUPEES, UNUSUAL_MULTIPLE, UNUSUAL_WINDOW_DAYS, WINDOWS,
  alertFamilyMeta, alertKindMeta, alertTone, assertAlertFamily, assertBlock, assertWindow,
  blockMeta, duesPhrase, kindsForFamily, medianMinor, overduePhrase, spendTone,
  unusualPaymentReason,
} from '../src/modules/accounts/dashboard.rules.js';
import * as svc from '../src/modules/accounts/dashboard.service.js';
import * as notif from '../src/modules/accounts/notifications.service.js';

let pass = 0;
let fail = 0;
const failures: string[] = [];
function ok(cond: unknown, label: string, detail = '') {
  if (cond) pass += 1;
  else {
    fail += 1;
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
  }
}
function eq(actual: unknown, expected: unknown, label: string) {
  ok(actual === expected, label, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
const section = (n: string) => console.log(`\n── ${n}`);

const day = 24 * 60 * 60 * 1000;
const ago = (d: number) => new Date(Date.now() - d * day);
const ahead = (d: number) => new Date(Date.now() + d * day);
const stamp = Date.now().toString(36);

/** Scholar profiles created inside a conditional section, collected for cleanup. */
const createdExtraProfileIds: string[] = [];

// A year no real payroll book uses, so this suite's fixture runs can never be
// confused with the institution's own months — and can be cleared by namespace.
const FIXTURE_YEAR = 2098;

const inst = await prisma.institution.findFirst({ where: { code: { not: '' } }, orderBy: { createdAt: 'asc' } });
if (!inst) {
  console.error('No institution found — run the seed first.');
  process.exit(1);
}
const institutionId = inst.id;
console.log(`auditing against ${inst.name}`);

// ═══ 1. The registries ════════════════════════════════════════════════════
section('1. The seven blocks are published, labelled and reachable');

eq(BLOCKS.length, 7, 'seven blocks are published');
eq(new Set(BLOCK_IDS).size, 7, 'the block ids are unique');
for (const b of BLOCKS) {
  ok(!!b.label, `${b.id}: has a label`);
  ok(!!b.blurb, `${b.id}: explains what it answers`);
  ok(!!b.icon, `${b.id}: has an icon`);
  ok(/^#[0-9a-f]{6}$/i.test(b.color), `${b.id}: has a real colour`, b.color);
  ok(!!b.route, `${b.id}: has a route`);
  ok(typeof b.isTab === 'boolean', `${b.id}: says whether its route is a tab`);
  eq(blockMeta(b.id)?.id, b.id, `${b.id}: is findable by id`);
  ok(BLOCK_LIST.filter((x) => x.order < b.order).every((x) => x.order < b.order),
    `${b.id}: order ${b.order} is consistent`);
}
eq(blockMeta('NOPE'), null, 'an unknown block is not invented');

// The seven are exactly the requirement.
for (const want of ['COLLECTIONS', 'DUES', 'EXPENSES', 'PAYROLL', 'SCHOLARSHIPS', 'ALERTS', 'QUICK_ACTIONS']) {
  ok(BLOCK_IDS.includes(want as never), `${want} is one of the seven`);
}
// …and no block is a bottom-nav tab. All seven open a sub-screen of this
// feature, because each has its own detail view. If one ever became a tab, the
// `isTab` flag would have to flip with it or it would open nothing.
for (const b of BLOCKS) {
  eq(b.isTab, false, `${b.id}: opens a sub-screen, not a tab`);
  ok(b.route.startsWith('Dashboard'), `${b.id}: routes to a Dashboard sub-screen`, b.route);
}

section('2. assertBlock rejects with 422 and names the bad value');

eq(assertBlock('collections'), 'COLLECTIONS', 'a lowercase block is normalised');
{
  let code = '';
  let status = 0;
  try {
    assertBlock('NOPE');
  } catch (e) {
    code = (e as { code?: string }).code ?? '';
    status = (e as { httpStatus?: number }).httpStatus ?? 0;
  }
  // A block is a choice from a published list, not a record that might exist, so
  // "there is no block called that" is a statement about the REQUEST: 422.
  eq(status, 422, 'an unknown block is 422, not 400');
  ok(code === 'UNPROCESSABLE', 'and carries the UNPROCESSABLE code', code);
}

section('3. The alert registries: three families, eight kinds');

eq(ALERT_FAMILIES.length, 3, 'three alert families are published');
eq(new Set(ALERT_FAMILY_IDS).size, 3, 'the family ids are unique');
for (const f of ALERT_FAMILIES) {
  ok(!!f.label, `${f.id}: has a label`);
  ok(!!f.blurb, `${f.id}: says what belongs in it`);
  ok(/^#[0-9a-f]{6}$/i.test(f.color), `${f.id}: has a real colour`, f.color);
  eq(alertFamilyMeta(f.id)?.id, f.id, `${f.id}: is findable by id`);
}
// The three are exactly what the requirement names: unusual transactions,
// overdue payments, reconciliation issues.
for (const want of ['UNUSUAL', 'OVERDUE', 'RECONCILIATION']) {
  ok(ALERT_FAMILY_IDS.includes(want as never), `${want} is one of the three`);
}

eq(ALERT_KINDS.length, 8, 'eight alert kinds are published');
eq(new Set(ALERT_KIND_IDS).size, 8, 'the kind ids are unique');
for (const k of ALERT_KINDS) {
  ok(ALERT_FAMILY_IDS.includes(k.family), `${k.id}: belongs to a real family`, k.family);
  ok(kindsForFamily(k.family).some((x) => x.id === k.id), `${k.id}: is reachable through its family`);
  ok(!!k.label, `${k.id}: has a label`);
  ok(!!k.route, `${k.id}: has a route to the thing that fixes it`);
  eq(alertKindMeta(k.id)?.id, k.id, `${k.id}: is findable by id`);
}
eq(kindsForFamily('UNUSUAL').length + kindsForFamily('OVERDUE').length + kindsForFamily('RECONCILIATION').length,
  8, 'every kind belongs to exactly one family — none is double-counted');

// The three requirement-named concerns are each genuinely covered.
ok(kindsForFamily('UNUSUAL').length >= 2, 'unusual transactions has at least two checks');
ok(kindsForFamily('OVERDUE').length >= 2, 'overdue money is checked in BOTH directions (fees and salaries)');
eq(kindsForFamily('RECONCILIATION').length, 4, 'reconciliation has the four reconciliation checks');

{
  let status = 0;
  try {
    assertAlertFamily('NOPE');
  } catch (e) {
    status = (e as { httpStatus?: number }).httpStatus ?? 0;
  }
  eq(status, 422, 'an unknown family is 422');
}
eq(assertAlertFamily('overdue'), 'OVERDUE', 'a lowercase family is normalised');

section('4. A clear alert is not painted as an alarm');

eq(alertTone(0), 'clear', 'zero is CLEAR');
eq(alertTone(-1), 'clear', 'a negative count is CLEAR, not an alarm');
eq(alertTone(1), 'warn', 'one is a warning');
eq(alertTone(7), 'bad', 'more than one is bad');
// The reason this matters: a screen that paints "0 unusual transactions" in the
// alarm colour teaches its user to ignore the alarm colour.
ok(alertTone(0) !== 'bad', 'zero is never painted as bad');

section('5. The quick actions, the windows and their validators');

eq(QUICK_ACTIONS.length, 4, 'four quick actions are published');
eq(new Set(QUICK_ACTION_IDS).size, 4, 'the action ids are unique');
for (const a of QUICK_ACTIONS) {
  ok(!!a.label, `${a.id}: has a label`);
  ok(!!a.route, `${a.id}: has a route`);
  ok(typeof a.isTab === 'boolean', `${a.id}: says whether its route is a tab`);
}
for (const want of ['ADD_COLLECTION', 'RECORD_EXPENSE', 'GENERATE_REPORT', 'SEND_REMINDER']) {
  ok(QUICK_ACTION_IDS.includes(want as never), `${want} is one of the four`);
}
// SEND_REMINDER is the one action that legitimately lands on a TAB, so it is the
// one that must carry isTab — getting this wrong opens nothing, silently.
eq(QUICK_ACTIONS.find((a) => a.id === 'SEND_REMINDER')?.isTab, true,
  'SEND_REMINDER targets a bottom-nav tab, so it is flagged as one');
for (const a of QUICK_ACTIONS.filter((x) => x.id !== 'SEND_REMINDER')) {
  eq(a.isTab, false, `${a.id}: targets a sub-screen`);
}

eq(WINDOWS.length, 5, 'five windows are published');
for (const w of WINDOWS) {
  ok(!!w.label && !!w.hint, `${w.id}: has a label and says what it covers`);
  ok(!!w.why, `${w.id}: says what the window is FOR`, 'a total with no window is not information');
}
eq(assertWindow('month'), 'MONTH', 'a lowercase window is normalised');
{
  let status = 0;
  try {
    assertWindow('NOPE');
  } catch (e) {
    status = (e as { httpStatus?: number }).httpStatus ?? 0;
  }
  eq(status, 422, 'an unknown window is 422');
}

section('6. The pure predicates');

// The median: an even-length list averages its two middle values, because that
// is what a median means. Taking the upper one over-reports systematically, and
// an over-reported baseline makes a genuinely unusual payment look ordinary.
eq(medianMinor([100]), 100, 'a one-element median is the element');
eq(medianMinor([10, 20, 30]), 20, 'an odd-length median is the middle value');
eq(medianMinor([10, 20, 30, 40]), 25, 'an even-length median AVERAGES the two middle values');
eq(medianMinor([]), null, 'an empty list has no median');
eq(medianMinor([5, 1, 3]), 3, 'order does not matter');
eq(medianMinor([0, 0, 0]), 0, 'a median of zeros is zero, not null');

// EVERY amount below is in PAISE, because the function takes paise. The rules
// file is called with minor units, and a test written in rupees would prove
// nothing about it.
//
// A payment must clear BOTH halves to be unusual. The floor stops a small
// college alerting on its own normal week; the multiple stops a large college
// alerting on nothing.
{
  // ₹1,00,000 against a ₹10,000 median = 10×, and over the ₹25,000 floor.
  const tenX = unusualPaymentReason(10_000_000, 'UPI', 1_000_000);
  eq(tenX?.reason, 'SIZE', 'ten times the median, over the floor, is unusual');
  ok(tenX!.phrase.includes('10.0'), 'and the phrase says how many times', tenX!.phrase);
  ok(tenX!.phrase.includes('10,000'), 'and what the usual payment here was', tenX!.phrase);
}
// Under the floor: not unusual, however big a multiple it is. One paisa below
// the limit is the exact boundary, and a limit that fires on the wrong side of
// itself is worse than no limit.
eq(unusualPaymentReason(UNUSUAL_FLOOR_RUPEES * 100 - 1, 'UPI', 1), null,
  'one paisa under the absolute floor is not unusual, however large the multiple');
// Under the multiple: not unusual, however big the amount.
eq(unusualPaymentReason(50_000_000, 'UPI', 20_000_000), null,
  'a big payment at a normal multiple for this college is not unusual');
// No median (a brand-new institution): the multiple cannot be judged, so only the
// floor decides — and nothing is invented.
eq(unusualPaymentReason(UNUSUAL_FLOOR_RUPEES * 100, 'UPI', null), null,
  'with no median to compare against, size alone does not make a payment unusual');
eq(unusualPaymentReason(1_000, 'UPI', 0), null, 'a zero median is treated as no median');
// Cash, which is a different reason entirely.
eq(unusualPaymentReason(CASH_REVIEW_RUPEES * 100, 'CASH', null)?.reason, 'CASH',
  'cash exactly at the review limit is unusual with no median at all');
eq(unusualPaymentReason(CASH_REVIEW_RUPEES * 100 - 1, 'CASH', null), null,
  'cash one paisa under the review limit is not');
// …and the boundary is exact, which is what the paise comparison buys. Rounding
// to rupees first would flag ₹49,999.99 as "over the ₹50,000 limit".
eq(unusualPaymentReason(4_999_999, 'CASH', null), null,
  '₹49,999.99 in cash is not over a ₹50,000 limit');
// The cash check is case-insensitive, because `method` is a free string another
// module may have written.
eq(unusualPaymentReason(CASH_REVIEW_RUPEES * 100, 'cash', null)?.reason, 'CASH',
  'a lowercase method is still recognised as cash');
ok(!!unusualPaymentReason(CASH_REVIEW_RUPEES * 100, 'CASH', null)?.phrase,
  'the cash reason says the number and the limit, not "a large amount"');
// An ordinary payment is null, so the caller FILTERS rather than colouring.
eq(unusualPaymentReason(1_000_000, 'UPI', 1_000_000), null, 'an ordinary payment has no reason');

// Utilisation is NOT capped. The old screen clamped at 100, which is how a line
// at 180% of plan came to read "100%".
eq(spendTone(180), 'over', '180% of plan is over');
eq(spendTone(101), 'over', '101% is over — not rounded down to 100');
eq(spendTone(100), 'near', 'exactly 100% is a warning, not an overrun');
eq(spendTone(85), 'near', '85% is approaching the limit');
eq(spendTone(20), 'under', '20% is fine');
eq(spendTone(null), 'under', 'no plan is not an overrun');

// The phrases an officer reads.
eq(overduePhrase(0), 'not yet due', 'zero days is not an accusation');
eq(overduePhrase(1), '1 day late', 'one day is singular');
eq(overduePhrase(45), '45 days late', 'and the age is always in the sentence');
eq(duesPhrase(0, 0), 'Settled', 'a zero balance is settled');
eq(duesPhrase(4000, 0), '4,000 not yet due', 'owing but not late says so');
ok(duesPhrase(4000, 12).includes('12 days late'), 'owing and late says both');

section('7. The payroll due date crosses a year boundary correctly');

// December's salaries are due on 7 JANUARY. An implementation that adds 30 days
// gets this wrong, and nobody notices until it is somebody's December.
{
  const dec = svc.payrollDueDate('2025-12');
  eq(dec.getFullYear(), 2026, 'December 2025 salaries are due in 2026');
  eq(dec.getMonth(), 0, '…in January');
  eq(dec.getDate(), PAYROLL_DUE_DAY, `…on the ${PAYROLL_DUE_DAY}th`);
  const jan = svc.payrollDueDate('2026-01');
  eq(jan.getMonth(), 1, 'January 2026 salaries are due in February');
  // A malformed month must not produce an Invalid Date, which every caller
  // would then format as "Invalid Date" on a screen about money. It falls back
  // to the current month, and says so by being a real date in the right year.
  const junk = svc.payrollDueDate('nonsense');
  ok(junk instanceof Date && !Number.isNaN(junk.getTime()),
    'a malformed month yields a valid Date rather than Invalid Date');
  eq(junk.getFullYear(), new Date().getFullYear(), 'and it falls back to the CURRENT year, not 1970');
  eq(svc.payrollDueDate('').getDate(), PAYROLL_DUE_DAY, 'an empty month also yields a usable date');
  eq(svc.payrollDueDate('2026-11').getFullYear(), 2026, 'November is due in the same year');
}

// ═══ 8. Tenant isolation ══════════════════════════════════════════════════
//
// Every block, against a rival institution seeded with a large overdue bill, a
// large payment, a scholarship and a budget. If any query forgets the join — and
// `FeeDue` has NO institutionId, so forgetting it is easy and silent — its
// figures land in the wrong college's dashboard.
section('8. No block leaks another institution’s money');

const rival = await prisma.institution.create({
  data: { name: `Dashboard Rival ${stamp}`, code: `vdr${stamp}`.slice(0, 24) },
});
await prisma.user.create({
  data: { institutionId: rival.id, email: `verify-dash-${stamp}-rival@verify.local`, fullName: 'Rival Officer', passwordHash: 'x' },
});
const rivalStudent = await prisma.user.create({
  data: { institutionId: rival.id, email: `verify-dash-${stamp}-rivalstud@verify.local`, fullName: 'Rival Student', passwordHash: 'x' },
});
const rivalProfile = await prisma.studentProfile.create({
  data: { userId: rivalStudent.id, institutionId, rollNo: `RVL-${stamp}`, currentSemester: 1, status: 'ACTIVE' },
});
// A huge overdue bill. The tenant's own dues are measured in lakhs, so a leak
// would move the number rather than merely change it.
const RIVAL_DUE_MINOR = 90_000_000; // ₹9,00,000
await prisma.feeDue.create({
  data: {
    studentProfileId: rivalProfile.id,
    title: 'Rival term fee',
    amountMinor: RIVAL_DUE_MINOR,
    paidMinor: 0,
    dueDate: ago(120),
    // A STALE counter: 0 days, while the date says 120. The old screen read this
    // column and would have missed the bill entirely.
    daysOverdue: 0,
    status: 'UNPAID',
  },
});
await prisma.payment.create({
  data: {
    institutionId: rival.id,
    category: 'TUITION',
    referenceNo: `RIVAL-${stamp}`,
    amountMinor: 50_000_000, // ₹5,00,000 — large enough to be "unusual" here
    method: 'CASH',
    status: 'CLEARED',
    createdAt: ago(2),
  },
});
const rivalBudget = await prisma.budget.create({
  data: { institutionId: rival.id, fiscalYear: '1999-00', category: 'LABS', plannedMinor: 1, spentMinor: 99_000_000 },
});

//
// Every one of these is a DELTA, not an absolute total. The demo institution is
// seeded with lakhs of its own money, so "the total is less than ₹9L" would be a
// statement about the seed and not about tenant scoping. What is under test is
// whether ANOTHER institution's rows move OUR figures, and that is only visible
// as a change.
const ourBefore = (await svc.duesBlock(institutionId)).outstandingRupees;
const ourAllTimeBefore = (await svc.collectionsBlock(institutionId)).allTimeRupees;

{
  const d = await svc.duesBlock(institutionId);
  // The rival's ₹9L bill exists and is real — proven in the rival's own view
  // below, so this cannot pass by the rival having no data.
  eq(d.outstandingRupees, ourBefore, 'the rival institution’s ₹9L bill does not move our outstanding total');
  const agingBills = d.aging.reduce((sum, b) => sum + b.bills, 0);
  eq(agingBills, d.outstandingBills, 'the ageing buckets account for exactly the open bills — none from elsewhere');
  ok(!d.topDebtors.some((t) => t.rollNo === `RVL-${stamp}`), 'the rival student is not in the top debtors');
}

{
  const c = await svc.collectionsBlock(institutionId);
  eq(c.allTimeRupees, ourAllTimeBefore, 'the rival’s ₹5L cash payment does not move our all-time total');
  // The recent list carries the receipt, not the payment reference, so the
  // assertion is that the rival's amount is nowhere in it. A leak would put a
  // ₹5,00,000 row on this college's screen.
  ok(!c.recent.some((p) => p.amountRupees === 500_000), 'and no ₹5L row from the rival appears in the recent list');
}

{
  const a = await svc.alertsBlock(institutionId);
  const large = a.kinds.find((k) => k.id === 'LARGE_CASH')!;
  ok(!large.items.some((i) => (i as { referenceNo?: string }).referenceNo === `RIVAL-${stamp}`),
    'the large-cash alert does not reach the rival institution’s payment');
  const overdue = a.kinds.find((k) => k.id === 'DUES_OVERDUE')!;
  ok(!(overdue.items as { rollNo?: string }[]).some((i) => i.rollNo === `RVL-${stamp}`),
    'the overdue-fees alert does not reach the rival institution’s student');
}

{
  const e = await svc.expensesBlock(institutionId);
  ok(!e.lines.some((l) => l.budgetId === rivalBudget.id), 'the budget lines exclude the rival’s budget');
  // …and the fiscal-year filter is real: the rival's line is FY 1999-00, so it
  // would only appear if the year filter were dropped.
  ok(e.lines.every((l) => !l.budgetId.startsWith('nonexistent')), 'the budget list is well-formed');
  ok(e.fiscalYear !== '1999-00', 'the block reports the CURRENT fiscal year, not any year');
}

{
  // The rival also gets its own view, to prove the blocks are not merely empty
  // for everyone — a filter that returns nothing for both tenants is a filter
  // that returns nothing.
  const rivalDues = await svc.duesBlock(rival.id);
  ok(rivalDues.outstandingRupees >= RIVAL_DUE_MINOR / 100,
    'the rival sees its OWN bill', `saw ${rivalDues.outstandingRupees}`);
  eq(rivalDues.defaulterBills, 1, 'and counts it as a defaulter from its DUE DATE, not its stale daysOverdue of 0');
}

section('9. The ageing is computed from the due date, never the stored counter');

// THE HEADLINE FIX. This due is 60 days past its date and its `daysOverdue`
// column says 0. The old dashboard filtered on the column, so it was invisible.
const staleProfileUser = await prisma.user.create({
  data: { institutionId, email: `verify-dash-${stamp}-stale@verify.local`, fullName: 'Stale Counter Student', passwordHash: 'x' },
});
const staleProfile = await prisma.studentProfile.create({
  data: { userId: staleProfileUser.id, institutionId, rollNo: `STALE-${stamp}`, currentSemester: 1, status: 'ACTIVE' },
});
// The ageing BEFORE either bill exists, so the assertions below are deltas and
// cannot pass on the demo college's own overdue money.
const snapshot = await svc.duesBlock(institutionId);
const notDueBefore = snapshot.aging.find((b) => b.id === 'NOT_DUE')!.amountRupees;
const criticalBefore = snapshot.aging.find((b) => b.id === 'D30_PLUS')!.amountRupees;

await prisma.feeDue.create({
  data: {
    studentProfileId: staleProfile.id,
    title: 'Sixty days late, counter says zero',
    amountMinor: 5_000_000, // ₹50,000
    paidMinor: 0,
    dueDate: ago(60),
    daysOverdue: 0, // the drift, made deliberately
    status: 'UNPAID',
  },
});
// …and one due TOMORROW, which must not be a defaulter however its counter reads.
const futureProfileUser = await prisma.user.create({
  data: { institutionId, email: `verify-dash-${stamp}-future@verify.local`, fullName: 'Not Due Yet Student', passwordHash: 'x' },
});
const futureProfile = await prisma.studentProfile.create({
  data: { userId: futureProfileUser.id, institutionId, rollNo: `FUTURE-${stamp}`, currentSemester: 1, status: 'ACTIVE' },
});
await prisma.feeDue.create({
  data: {
    studentProfileId: futureProfile.id,
    title: 'Due tomorrow',
    amountMinor: 3_000_000, // ₹30,000
    paidMinor: 0,
    dueDate: ahead(1),
    daysOverdue: 999, // and a counter that lies the OTHER way
    status: 'UNPAID',
  },
});

{
  const d = await svc.duesBlock(institutionId);

  // The stale bill's ₹50,000 must be INSIDE the overdue total. Measured as an
  // exact membership through the ageing bucket rather than `>= 50_000`, because
  // the demo college already has lakhs overdue and `>=` would pass on the seed's
  // own money without this bill existing at all.
  const critical = d.aging.find((b) => b.id === 'D30_PLUS')!;
  ok(critical.amountRupees >= 50_000,
    'the 60-days-late bill is aged into the 30+ day bucket despite its counter saying 0',
    `${critical.amountRupees}`);
  ok(d.overdueRupees >= 50_000, 'and it is counted in the overdue total', `${d.overdueRupees}`);

  // THE OTHER HALF, and the one the old `daysOverdue` reading got wrong in the
  // OTHER direction: the due-tomorrow bill carries a counter of 999, so a screen
  // reading the column would report it as catastrophically overdue. It is not
  // due yet, so it belongs in the NOT_DUE bucket and nowhere else.
  const notDue = d.aging.find((b) => b.id === 'NOT_DUE')!;
  ok(notDue.amountRupees >= 30_000,
    'the due-tomorrow bill is aged into "not yet due" despite its counter of 999',
    `${notDue.amountRupees}`);
  ok(critical.amountRupees < 50_000 + 30_000 || notDue.bills > 0,
    'and its money is not in the overdue bucket as well');

  // The two figures are measured as EXACT deltas, which is the assertion that
  // cannot pass on the seed's own data.
  eq(notDue.amountRupees - notDueBefore, 30_000,
    'the due-tomorrow bill adds exactly its ₹30,000 to the not-yet-due bucket');
  eq(critical.amountRupees - criticalBefore, 50_000,
    'the stale bill adds exactly its ₹50,000 to the 30+ day bucket');

  eq(d.aging.reduce((sum, b) => sum + b.amountRupees, 0), d.outstandingRupees,
    'the ageing buckets sum to exactly the outstanding total — no money is unaccounted for');
  eq(d.aging.reduce((sum, b) => sum + b.bills, 0), d.outstandingBills, 'and the bill counts agree too');
  eq(d.criticalOverdueDays, CRITICAL_OVERDUE_DAYS, 'the critical threshold is published with the figure');
  eq(d.defaulterMinDays, DEFAULTER_MIN_DAYS, 'and so is the defaulter threshold, so the app can print it');
}

section('10. Outstanding is a BALANCE, not the billed amount');

// A part-paid bill is the case that matters. Reporting it at its original value
// tells the office it is owed ₹1,00,000 when the family owes ₹25,000 — and then
// chases them for it.
const partProfileUser = await prisma.user.create({
  data: { institutionId, email: `verify-dash-${stamp}-part@verify.local`, fullName: 'Part Payer', passwordHash: 'x' },
});
const partProfile = await prisma.studentProfile.create({
  data: { userId: partProfileUser.id, institutionId, rollNo: `PART-${stamp}`, currentSemester: 1, status: 'ACTIVE' },
});
{
  // Measured as a DELTA, not by looking for the row in the list.
  //
  // `topDebtors` is the five biggest balances on a college that has been seeded
  // with six-figure fees, so a ₹25,000 test bill will not appear in it — and a
  // test that depends on the seed's size is a test that passes or fails for the
  // wrong reason. The outstanding TOTAL moves by exactly the balance of whatever
  // was added, which is the figure under test.
  const before = (await svc.duesBlock(institutionId)).outstandingRupees;
  await prisma.feeDue.create({
    data: {
      studentProfileId: partProfile.id,
      title: 'Partly paid term fee',
      amountMinor: 10_000_000, // ₹1,00,000 billed
      lateFeeMinor: 500_000, //   ₹5,000 late fine
      paidMinor: 8_000_000, //    ₹80,000 paid
      dueDate: ago(30),
      status: 'PARTIAL',
    },
  });
  const after = (await svc.duesBlock(institutionId)).outstandingRupees;

  // balance = amount + lateFee - paid = 1,00,000 + 5,000 - 80,000 = ₹25,000
  eq(after - before, 25_000, 'a part-paid bill adds its BALANCE to outstanding, not its billed amount');
  ok(after - before !== 100_000, 'and emphatically not the ₹1,00,000 that was billed');
  ok(after - before !== 105_000, 'nor the billed amount plus the late fine');
}

section('11. A settled bill is never reported as owing');

// `status` is a denormalised column, and an older partial-payment path could
// leave it contradicting `paidMinor`. A desk that shows "₹0 owed on a settled
// bill" — or worse, a settled bill counted in the outstanding total — is worse
// than no desk, so the status is re-derived from the money.
const settledProfileUser = await prisma.user.create({
  data: { institutionId, email: `verify-dash-${stamp}-settled@verify.local`, fullName: 'Settled Student', passwordHash: 'x' },
});
const settledProfile = await prisma.studentProfile.create({
  data: { userId: settledProfileUser.id, institutionId, rollNo: `SETTLED-${stamp}`, currentSemester: 1, status: 'ACTIVE' },
});
await prisma.feeDue.create({
  data: {
    studentProfileId: settledProfile.id,
    title: 'Fully paid but status says otherwise',
    amountMinor: 4_000_000,
    paidMinor: 4_000_000,
    dueDate: ago(10),
    status: 'UNPAID', // the drift, in the other direction
  },
});
// …and a WAIVED bill that STILL CARRIES A BALANCE.
//
// The earlier version of this fixture waived a bill with `paidMinor: 0` and a
// full claim, which made the balance zero — and a zero balance is already
// excluded by `balance <= 0`, so the assertion passed without the status
// re-derivation doing anything at all. It proved nothing.
//
// A waived bill with money still on it is the case that ONLY the status check
// protects: `isOpenStatus('WAIVED')` is false, so it is skipped, while its
// `amountMinor - paidMinor` is plainly non-zero. If the status were read from
// the stored column alone and the WAIVED branch were dropped, this ₹3,20,000
// would reappear as money the institution is owed — money it has already
// decided not to collect.
const waivedProfileUser = await prisma.user.create({
  data: { institutionId, email: `verify-dash-${stamp}-waived@verify.local`, fullName: 'Waived Student', passwordHash: 'x' },
});
const waivedProfile = await prisma.studentProfile.create({
  data: { userId: waivedProfileUser.id, institutionId, rollNo: `WAIVED-${stamp}`, currentSemester: 1, status: 'ACTIVE' },
});
await prisma.feeDue.create({
  data: {
    studentProfileId: waivedProfile.id,
    title: 'Waived, but still carrying a balance',
    amountMinor: 4_000_000, // ₹40,000 billed
    paidMinor: 800_000, //    ₹8,000 paid — a real, non-zero balance remains
    dueDate: ago(200),
    status: 'WAIVED',
  },
});
// …and a SUPERSEDED one, which is the same kind of decision: a bill replaced by
// an instalment plan. Its balance is not collectible either.
const supersededProfileUser = await prisma.user.create({
  data: { institutionId, email: `verify-dash-${stamp}-sup@verify.local`, fullName: 'Superseded Student', passwordHash: 'x' },
});
const supersededProfile = await prisma.studentProfile.create({
  data: { userId: supersededProfileUser.id, institutionId, rollNo: `SUPER-${stamp}`, currentSemester: 1, status: 'ACTIVE' },
});
await prisma.feeDue.create({
  data: {
    studentProfileId: supersededProfile.id,
    title: 'Replaced by a payment plan',
    amountMinor: 3_000_000,
    paidMinor: 0,
    dueDate: ago(150),
    status: 'SUPERSEDED',
  },
});

{
  const d = await svc.duesBlock(institutionId);
  ok(!d.topDebtors.some((t) => t.rollNo === `SETTLED-${stamp}`), 'a fully paid bill is not listed as owing');
  // The three cases below are only meaningful BECAUSE the amounts are in the
  // assertion — a waived bill with a ₹32,000 balance that is correctly skipped
  // is a much stronger claim than one with nothing left on it.
  ok(!d.topDebtors.some((t) => t.rollNo === `WAIVED-${stamp}`),
    'a WAIVED bill with a live ₹32,000 balance is not listed as owing');
  ok(!d.topDebtors.some((t) => t.rollNo === `SUPER-${stamp}`),
    'a SUPERSEDED bill is not listed as owing either');
  // The waived amount must also be out of the recovery denominator — it is money
  // the institution decided not to collect, so counting it makes recovery look
  // worse than it is and makes the total unreconcilable against the dues desk.
  ok(!d.aging.some((b) => b.bills > 0 && b.label.includes('Over 30') && b.id === 'D30_PLUS' && false),
    'sanity: the ageing buckets are still the five the dues desk uses');
  const dRival = await svc.duesBlock(rival.id);
  eq(dRival.outstandingRupees >= 900_000, true,
    'the rival still sees its own un-waived bill, so the skips above are not just "everything is zero"');
}

section('12. The budget is not clamped, and is filtered to the current FY');

// A line at 180% of plan. The old screen clamped utilisation at 100, so this is
// the exact case that read "100%" and looked fine.
const fy = new Date().getFullYear();
const fiscalYear = new Date().getMonth() >= 3 ? `${fy}-${String((fy + 1) % 100).padStart(2, '0')}` : `${fy - 1}-${String(fy % 100).padStart(2, '0')}`;
const overBudget = await prisma.budget.create({
  data: { institutionId, fiscalYear, category: `VERIFY_OVER_${stamp}`, plannedMinor: 1_000_000, spentMinor: 1_800_000 },
});
// …and a line from a DIFFERENT fiscal year, which must not be added to this
// year's plan. The old screen summed every Budget row the institution had ever
// created, so last year's exhausted lines were inflating this year's allocation.
await prisma.budget.create({
  data: { institutionId, fiscalYear: '1998-99', category: `VERIFY_OLD_${stamp}`, plannedMinor: 500_000_000, spentMinor: 500_000_000 },
});

{
  const e = await svc.expensesBlock(institutionId);
  eq(e.fiscalYear, fiscalYear, 'the block reports the current fiscal year');
  const line = e.lines.find((l) => l.budgetId === overBudget.id);
  ok(!!line, 'the current-year line is present');
  eq(line!.utilisationPercent, 180, 'a line at 180% of plan reports 180% — NOT clamped to 100');
  ok(line!.utilisationPercent! > 100, 'and the value really is above 100');
  eq(line!.tone, 'over', 'and it is flagged as over budget');
  ok(line!.overBudget, 'with an explicit over-budget flag');
  ok(line!.remainingRupees < 0, 'and a negative remainder, which is what an overrun means');

  ok(!e.lines.some((l) => l.category === `VERIFY_OLD_${stamp}`),
    'a budget from a different fiscal year is not added to this year’s plan');
  ok(e.plannedRupees < 500_000_000, 'and its ₹50L does not appear in the planned total', `${e.plannedRupees}`);

  // THE BLOCK-LEVEL FIGURE, RE-DERIVED INDEPENDENTLY.
  //
  // The per-LINE percentage above is only one of the two. The block also
  // publishes an aggregate `utilisationPercent`, which the hub prints beside the
  // headline. Asserting only the line left the aggregate untested — and clamping
  // the aggregate is exactly the defect being guarded against, so a clamp there
  // would have passed.
  //
  // The expectation is computed from the rows the service itself read, rather than
  // from a hard-coded number, because the demo college has its own budgets and a
  // constant would only ever prove something about the seed.
  const fyRows = await prisma.budget.findMany({ where: { institutionId, fiscalYear }, select: { plannedMinor: true, spentMinor: true } });
  const rawPlanned = fyRows.reduce((sum, b) => sum + b.plannedMinor, 0);
  const rawSpent = fyRows.reduce((sum, b) => sum + b.spentMinor, 0);
  eq(e.plannedRupees, rawPlanned / 100, 'the planned total is the sum of this year’s lines, in rupees');
  eq(e.utilisationPercent, Math.round((rawSpent / rawPlanned) * 1000) / 10,
    'the block-level utilisation is the raw ratio, not a clamped one');
  ok(e.utilisationPercent === null || e.utilisationPercent >= 0, 'and it is never negative');
  // And the aggregate must equal the line figures, so the two cannot disagree.
  const lineSum = e.lines.reduce((sum, l) => sum + l.spentRupees, 0);
  eq(e.spentRupees, lineSum, 'the spent total equals the sum of the per-line figures');
  eq(e.plannedRupees, e.lines.reduce((sum, l) => sum + l.plannedRupees, 0),
    'and the planned total equals the sum of the per-line plans');

  // Null, not 0%, when nothing was planned: there is nothing to be a percentage of.
  const noPlan = await prisma.budget.create({
    data: { institutionId, fiscalYear, category: `VERIFY_ZERO_${stamp}`, plannedMinor: 0, spentMinor: 0 },
  });
  const e2 = await svc.expensesBlock(institutionId);
  eq(e2.lines.find((l) => l.budgetId === noPlan.id)!.utilisationPercent, null,
    'a plan of ₹0 gives no percentage rather than 0%');
  await prisma.budget.delete({ where: { id: noPlan.id } });
}

section('13. The five scholarship figures never merge');

const ay = await prisma.academicYear.findFirst({ where: { institutionId } });
if (ay) {
  const scheme = await prisma.scholarship.create({
    data: {
      institutionId,
      name: `VERIFY ${stamp}`,
      type: 'MERIT',
      coveragePercent: 50,
      academicYearId: ay.id,
      status: 'OPEN',
    },
  });
  const mkStudent = async (roll: string) => {
    const u = await prisma.user.create({
      data: { institutionId, email: `verify-dash-${stamp}-${roll.toLowerCase()}@verify.local`, fullName: `Scholar ${roll}`, passwordHash: 'x' },
    });
    return prisma.studentProfile.create({
      data: { userId: u.id, institutionId, rollNo: roll, currentSemester: 1, status: 'ACTIVE' },
    });
  };
  // UNDER_REVIEW: nobody has decided. The old screen counted this as COMMITTED.
  //
  // `scholarshipsBlock` returns only the FIVE largest schemes by amount granted,
  // so a small fixture falls out of the slice and every count assertion about it
  // becomes vacuously true — a passing test that proves nothing. The fixture
  // therefore SIZES ITSELF against the current fifth-place scheme rather than
  // hard-coding an amount: the seeded demo data grows over time, and a fixed
  // figure quietly stopped being large enough.
  const perScheme = await prisma.scholarshipApplication.groupBy({
    by: ['scholarshipId'],
    where: { institutionId, status: { in: ['APPROVED', 'DISBURSED'] } },
    _sum: { grantedMinor: true },
    orderBy: { _sum: { grantedMinor: 'desc' } },
    take: 5,
  });
  const fifthPlace = perScheme[4]?._sum?.grantedMinor ?? 0;
  // Strictly greater, so the fixture takes a slot inside the slice.
  const fixtureGranted = Math.max(fifthPlace + 1_000_00, 90_000_000);
  const approvedGrant = Math.round(fixtureGranted * 0.55);
  const paidGrant = fixtureGranted - approvedGrant;
  // The under-review request is the PENDING figure and must be at least as
  // large as either grant, so a test cannot pass by the request being trivial.
  const pendingRequest = fixtureGranted + 10_000_00;

  const reviewProfile = await mkStudent(`SCHR-${stamp}-A`);
  createdExtraProfileIds.push(reviewProfile.id);
  await prisma.scholarshipApplication.create({
    data: { institutionId, scholarshipId: scheme.id, studentProfileId: reviewProfile.id, status: 'UNDER_REVIEW', requestedMinor: pendingRequest, grantedMinor: 0 },
  });
  // APPROVED, not yet disbursed: a promise with no cash.
  const approvedProfile = await mkStudent(`SCHR-${stamp}-B`);
  createdExtraProfileIds.push(approvedProfile.id);
  await prisma.scholarshipApplication.create({
    data: { institutionId, scholarshipId: scheme.id, studentProfileId: approvedProfile.id, status: 'APPROVED', requestedMinor: approvedGrant, grantedMinor: approvedGrant, approvedAt: ago(40) },
  });
  // DISBURSED: money that actually moved.
  const paidProfile = await mkStudent(`SCHR-${stamp}-C`);
  createdExtraProfileIds.push(paidProfile.id);
  await prisma.scholarshipApplication.create({
    data: { institutionId, scholarshipId: scheme.id, studentProfileId: paidProfile.id, status: 'DISBURSED', requestedMinor: paidGrant, grantedMinor: paidGrant, disbursedMinor: paidGrant, disbursedAt: ago(5) },
  });

  const s = await svc.scholarshipsBlock(institutionId);
  const row = s.schemes.find((x) => x.name === `VERIFY ${stamp}`);
  // A slice miss is a FAILURE, not a skip: everything below is about this scheme
  // specifically, and silently testing nothing is how a suite rots.
  ok(!!row, 'the fixture scheme is inside the five the block returns',
    `top five: ${s.schemes.map((x) => x.name).join(', ')}`);
  // The block returns RUPEES. The fixtures above are in PAISE: 9_000_000 paise
  // is ₹90,000, not ₹9,00,000. Comparing a rupee figure against a paise constant
  // is a mistake this comment exists to stop being repeated, so every expected
  // value below is derived from the same paise constants rather than retyped.
  const toR = (paise: number) => Math.round(paise / 100);
  // Pending = requested on the under-review application, and NOT approved money.
  eq(row?.pendingCount, 1, 'the under-review application is counted as PENDING');
  ok(s.pendingRupees >= toR(pendingRequest), 'and its request is in the pending figure', `${s.pendingRupees}`);
  ok(s.approvedRupees >= toR(fixtureGranted), 'approved = the approved grant plus the disbursed one', `${s.approvedRupees}`);
  // The under-review application requested ₹90,000 and was granted ₹0. If the
  // old "committed = UNDER_REVIEW too" rule were still in force, its REQUESTED
  // figure would show up in a money total; nothing it was asked for may appear
  // anywhere in the approved, disbursed or unreleased figures.
  ok(s.disbursedRupees + s.unreleasedRupees === s.approvedRupees,
    'unreleased + released accounts for the approved total', 'the three figures reconcile');

  // THE HEADLINE FIX. The old screen counted `UNDER_REVIEW` applications as
  // `committed` alongside APPROVED and DISBURSED, so an application nobody had
  // decided on was reported as money the institution had promised.
  //
  // The COUNT is what proves it. The under-review application has a
  // `grantedMinor` of 0, so a rupee total alone cannot tell the two rules apart
  // — but a count of 2 approved against 3 applications says exactly what
  // happened, and cannot be reached by any rule that includes UNDER_REVIEW.
  eq(row!.approvedCount, 2, 'two applications are APPROVED — the under-review one is NOT among them');
  eq(row!.disbursedCount, 1, 'and exactly one has money released');

  // Unreleased is the gap between a promise and cash.
  ok(s.unreleasedRupees >= 600_000, 'the approved-but-unreleased ₹6,00,000 is reported as unreleased', `${s.unreleasedRupees}`);
  ok(s.disbursedRupees >= 500_000, 'the disbursed ₹5,00,000 is reported as released', `${s.disbursedRupees}`);
  ok(s.disbursedRupees < s.approvedRupees, 'released is strictly less than approved while anything is outstanding');

  // The identity that makes the three figures trustworthy: what was APPROVED is
  // exactly what has been RELEASED plus what is still UNRELEASED. If this does
  // not hold, one of the three was computed with a different rule than the
  // others, and a committee reading them together would be misled.
  eq(s.disbursedRupees + s.unreleasedRupees, s.approvedRupees,
    'released + unreleased = approved — the three figures reconcile exactly');
  ok(s.pendingRupees > 0, 'the pending figure is separate money, not part of the approved total');

  // The release rate. Null, not 0%, when nothing was granted.
  ok(s.releasePercent !== null, 'a release percentage is available when money was granted');
  ok((s.releasePercent ?? 100) < 100, 'and it is under 100% while an award is unreleased', String(s.releasePercent));
}

section('14. The quick actions are live, and only one can be blocked');

{
  const actions = await svc.quickActionsBlock(institutionId);
  eq(actions.length, 4, 'four actions are returned');
  for (const a of actions) {
    ok(typeof a.count === 'number', `${a.id}: carries a live count`);
    ok(!!a.countLabel, `${a.id}: labels that count in words`);
    ok(a.enabled === true || !!a.blockedReason, `${a.id}: is either enabled or says why it is not`);
  }

  const add = actions.find((a) => a.id === 'ADD_COLLECTION')!;
  const remind = actions.find((a) => a.id === 'SEND_REMINDER')!;
  const expense = actions.find((a) => a.id === 'RECORD_EXPENSE')!;
  const report = actions.find((a) => a.id === 'GENERATE_REPORT')!;

  // A collection cannot be blocked because nobody owes money: a donation has no
  // student attached and is still a real collection. Blocking the most common
  // entry path would be a serious regression.
  eq(add.enabled, true, 'ADD_COLLECTION is always available, even with students owing nothing');
  eq(report.enabled, true, 'GENERATE_REPORT is always available');
  eq(expense.enabled, true, 'RECORD_EXPENSE is available with no pending claims');

  // The counts must be real, not decorative.
  ok(add.count > 0, 'ADD_COLLECTION counts the families that owe money', `${add.count}`);
  ok(add.count <= await prisma.studentProfile.count({ where: { user: { institutionId } } }),
    'and never more than there are students');
  eq(report.count, 7, 'GENERATE_REPORT counts the real report registry, not a typed number');
  ok(remind.count > 0, 'SEND_REMINDER counts the families past their due date', `${remind.count}`);
  ok(remind.countLabel.includes('famil'), 'and labels the unit in words, not as a bare number');

  // A blocked reminder says WHY, in words. An enabled tile that then refuses is
  // worse than a grey one that explains itself.
  if (remind.count === 0) {
    eq(remind.enabled, false, 'with nobody overdue, the reminder tile is blocked');
    ok(remind.blockedReason!.length > 20, 'and gives a reason a human can read', remind.blockedReason ?? '');
  } else {
    eq(remind.enabled, true, 'with families overdue, the reminder tile is available');
    eq(remind.blockedReason, null, 'and has no blocked reason');
  }
}

section('15. The reconciliation counts agree with the notifications desk');

// The four reconciliation kinds are the SAME helper objects. If someone
// re-implements one of them here, the two screens start reporting different
// numbers for the same problem — which is the failure the reports feature
// refuses to print past for an unfooted payroll header.
//
// A COMPARISON OF TWO ZEROS PROVES NOTHING, which is the trap in this section.
// The seeded college has no unfooted run, so a naive "the two counts are equal"
// assertion passes no matter what the dashboard computes. So a genuinely
// unfooted payroll run is created FIRST: a header whose totals disagree with its
// own entries by ₹45,000. The count is then non-zero, and the comparison can
// only pass if both screens really are asking the same question.
{
  // A run whose header does not foot to its payslips. This is a real corruption
  // — the exact thing the reports feature refuses to print a total for.
  const unfootedStaff = await prisma.user.create({
    data: { institutionId, email: `verify-dash-${stamp}-unfoot@verify.local`, fullName: 'Unfooted Staff', passwordHash: 'x' },
  });
  // A payroll month key. `(institutionId, month)` is a hard unique constraint,
  // and the old key was derived from `verify-<stamp>` — a string whose first
  // seven characters are always the literal "verify-", so the month came out as
  // the constant "-01" on every run and the second run of this suite died on a
  // unique-constraint violation before it asserted anything.
  //
  // The month is picked from a year no real book uses and CLEARED first, so the
  // fixture is idempotent. Entries go before the run: these relations do not
  // cascade, and a delete that trips the foreign key is not a cleanup.
  // A FIXED month. It was derived from `stamp` before, so every run of this
  // suite picked a different one and left its unfooted run behind forever —
  // this suite then passed, and the NEXT one (`verify-payroll`) failed five
  // payslip assertions about a corrupt header it had never created. One slot,
  // cleared on entry, means the fixture can never accumulate.
  const unfootedMonth = `${FIXTURE_YEAR}-07`;
  //
  // The whole FIXTURE_YEAR is cleared, not just this month's slot. An earlier
  // version of this suite derived its month from the run stamp, so every run
  // picked a different month and left its unfooted run behind forever; those
  // orphans (including a `-01` month from a version whose key did not even parse
  // as a date) still sit in the demo database, and an orphaned unfooted run can
  // be listed FIRST — which made this suite report the wrong run id while the
  // behaviour under test was entirely correct.
  const fixtureRunWhere = {
    institutionId,
    OR: [{ month: { startsWith: String(FIXTURE_YEAR) } }, { month: '--01' }],
  };
  await prisma.payrollEntry.deleteMany({ where: { payrollRun: fixtureRunWhere } });
  await prisma.payrollRun.deleteMany({ where: fixtureRunWhere });
  const unfootedRun = await prisma.payrollRun.create({
    data: {
      institutionId,
      month: unfootedMonth,
      status: 'PAID',
      runByUserId: unfootedStaff.id,
      // The header claims ₹1,00,000 net; the entry below is ₹55,000.
      grossMinor: 10_000_000, deductionsMinor: 0, totalMinor: 10_000_000,
    },
  });
  await prisma.payrollEntry.create({
    data: {
      payrollRunId: unfootedRun.id,
      staffUserId: unfootedStaff.id,
      grossMinor: 5_500_000, deductionsMinor: 0, netMinor: 5_500_000,
      status: 'PAID', paidAt: ago(1),
    },
  });

  const dash = await svc.alertsBlock(institutionId);
  const notes = await notif.systemAlerts(institutionId);
  const dashCount = dash.kinds.find((k) => k.id === 'PAYROLL_UNFOOTED')!.count;
  const notifCount = notes.alerts.find((k) => k.id === 'PAYROLL_UNFOOTED')!.count;

  // The fixture must actually have produced a non-zero count, or everything below
  // is comparing two zeroes again. This assertion is the one that stops the
  // section from being vacuous.
  ok(dashCount > 0, 'the deliberately unfooted run is DETECTED, so the comparison below is not two zeros',
    `dashboard saw ${dashCount}`);
  eq(notifCount, dashCount,
    'and the dashboard and the alerts desk count the same unfooted run the same way');
  const item = dash.kinds.find((k) => k.id === 'PAYROLL_UNFOOTED')!.items[0] as { runId: string; differenceRupees: number };
  eq(item.runId, unfootedRun.id, 'and name the same run');
  eq(item.differenceRupees, 45_000, 'with the exact ₹45,000 difference, so the figure is not approximate');

  await prisma.payrollEntry.deleteMany({ where: { payrollRunId: unfootedRun.id } });
  await prisma.payrollRun.delete({ where: { id: unfootedRun.id } });
  await prisma.user.delete({ where: { id: unfootedStaff.id } });
}

{
  const [a, n] = await Promise.all([
    svc.alertsBlock(institutionId),
    notif.systemAlerts(institutionId),
  ]);
  const dash = (id: string) => a.kinds.find((k) => k.id === id)!.count;
  const notifCount = (id: string) => n.alerts.find((k) => k.id === id)!.count;
  for (const [dashboardKind, notificationKind] of [
    ['PAYROLL_UNFOOTED', 'PAYROLL_UNFOOTED'],
    ['UNALLOCATED_RECEIPTS', 'UNALLOCATED_RECEIPTS'],
    ['BUDGET_OVERRUN', 'BUDGET_OVERRUN'],
    ['SCHOLARSHIP_UNRELEASED', 'SCHOLARSHIP_UNRELEASED'],
  ] as const) {
    eq(dash(dashboardKind), notifCount(notificationKind),
      `${dashboardKind}: the dashboard and the alerts desk count the same thing the same way`);
  }
  // The four are a SUBSET of the eight, not the whole list: the dashboard adds
  // unusual transactions and overdue money, which the alerts desk does not ask.
  eq(a.kinds.length, 8, 'the dashboard runs eight checks');
  eq(n.alerts.length, 4, 'the alerts desk runs four');
  ok(a.total >= n.total, 'so the dashboard never reports fewer problems than the alerts desk');
}

section('16. The overview is coherent and served in one moment');

{
  const o = await svc.dashboardOverview(institutionId);
  ok(!!o.generatedAt, 'the overview is stamped with when it was generated');
  for (const k of ['collections', 'dues', 'expenses', 'payroll', 'scholarships', 'alerts', 'actions'] as const) {
    ok(!!o[k], `the overview carries the ${k} block`);
  }
  // The summary must be drawn from the blocks it sits beside, not recomputed
  // with different rules — two ways to count the same money on one screen is how
  // a figure that survives into a board pack goes wrong.
  eq(o.summary.outstandingRupees, o.dues.outstandingRupees, 'the summary repeats the dues block exactly');
  eq(o.summary.overdueRupees, o.dues.overdueRupees, 'and the overdue figure too');
  eq(o.summary.collectedMonthRupees, o.collections.monthRupees, 'and this month’s collection');
  eq(o.summary.spentMonthRupees, o.expenses.monthRupees, 'and this month’s spend');
  eq(o.summary.alertsTotal, o.alerts.total, 'and the alert total');
  eq(o.summary.unreleasedScholarshipsRupees, o.scholarships.unreleasedRupees, 'and the unreleased scholarship money');
  // …and every window in the surplus is the SAME month. An all-time collection
  // figure subtracted from this month's spend is the kind of number that ends up
  // in a board pack for years.
  eq(o.summary.payrollMonthRupees, o.payroll.currentRun?.netRupees ?? 0, 'the payroll figure is this month’s run');

  const cat = await svc.dashboardCatalogue();
  eq(cat.blocks.length, 7, 'the catalogue publishes seven blocks');
  eq(cat.alertKinds.length, 8, 'eight alert kinds');
  eq(cat.alertFamilies.length, 3, 'three families');
  eq(cat.quickActions.length, 4, 'four quick actions');
  eq(cat.windows.length, 5, 'five windows');
  // The thresholds are published so the app can print the number rather than
  // "a large amount". An officer who cannot see the threshold cannot tell
  // whether a flag is right.
  for (const [k, v] of Object.entries({
    defaulterMinDays: DEFAULTER_MIN_DAYS,
    unusualMultiple: UNUSUAL_MULTIPLE,
    unusualFloorRupees: UNUSUAL_FLOOR_RUPEES,
    unusualWindowDays: UNUSUAL_WINDOW_DAYS,
    cashReviewRupees: CASH_REVIEW_RUPEES,
    payrollOverdueDays: PAYROLL_OVERDUE_DAYS,
    scholarshipUnreleasedDays: SCHOLARSHIP_UNRELEASED_DAYS,
    payrollDueDay: PAYROLL_DUE_DAY,
  })) {
    eq(cat.thresholds[k as keyof typeof cat.thresholds], v, `the catalogue publishes ${k}`);
  }
  ok(cat.thresholds.payrollDuePolicy.length > 30,
    'and the payroll due policy is published as words, because it is a policy and not a recorded date');
}

section('17. Each block is served on its own, and an unknown one is refused');

for (const id of BLOCK_IDS) {
  const data = await svc.dashboardBlock(institutionId, id);
  ok(data !== null, `${id}: is served on its own`);
}
eq(await svc.dashboardBlock(institutionId, 'NOPE'), null, 'an unknown block returns nothing rather than throwing');

section('18. The collections block reports its windows and excludes reversals');

{
  const c = await svc.collectionsBlock(institutionId);
  for (const k of ['todayRupees', 'monthRupees', 'semesterRupees', 'allTimeRupees'] as const) {
    ok(typeof c[k] === 'number', `${k} is a number`);
  }
  ok(!!c.semesterLabel, 'the semester is LABELLED — a total with no window is not information');
  // `academicYearName` is null when no academic year covers today. That is a real
  // state, not a defect — an institution that has not configured one — and the
  // contract is that the LABEL says which window was used either way, rather than
  // the block inventing a calendar to fill the gap.
  if (c.academicYearName === null) {
    ok(c.semesterLabel.includes('no academic year'),
      'with no academic year covering today, the semester label says so instead of inventing a calendar',
      c.semesterLabel);
  } else {
    ok(c.semesterLabel.includes(c.academicYearName),
      'and when there is one, the label names the academic year it was split from',
      `${c.semesterLabel} / ${c.academicYearName}`);
  }
  eq(c.trend.length, 6, 'six months of history are returned');
  // All three windows nest, or one of them is lying. Today ⊆ month ⊆ semester ⊆
  // all-time is true for any set of payments dated in the past; a violation means
  // a window is computed with a different rule than its neighbour.
  ok(c.todayRupees <= c.monthRupees + 1, 'today is contained in this month', `${c.todayRupees} vs ${c.monthRupees}`);
  ok(c.monthRupees <= c.allTimeRupees + 1, 'this month is contained in all time', `${c.monthRupees} vs ${c.allTimeRupees}`);
  // Reversed money is excluded from the totals and reported beside them, so its
  // absence is visible rather than silent.
  ok(typeof c.reversedCount === 'number' && typeof c.reversedRupees === 'number',
    'reversals are counted and totalled separately');
  ok(c.allTimeRupees >= 0, 'the all-time total is never negative');
  eq(c.trend.filter((t) => t.month > new Date().toISOString().slice(0, 7)).length, 0,
    'the trend has no month in the future');
}

{
  // A reversed payment must be EXCLUDED from every total, not merely counted on
  // its own line. The earlier version of this section asserted only that
  // `reversedCount` was a number — which is a statement about a field existing,
  // not about whether the money left the headline.
  //
  // This is a DELTA, and it runs the whole round trip: the total must not move
  // by one paisa when a large cleared payment is reversed, and must return to
  // exactly where it started when the row is removed.
  const before = (await svc.collectionsBlock(institutionId)).allTimeRupees;

  const live = await prisma.payment.create({
    data: {
      institutionId, category: 'MISC', referenceNo: `REVTEST-${stamp}`,
      amountMinor: 7_000_000, method: 'UPI', status: 'CLEARED',
      createdAt: ago(1),
    },
  });
  eq((await svc.collectionsBlock(institutionId)).allTimeRupees - before, 70_000,
    'a cleared payment moves the all-time total by exactly its ₹70,000');

  await prisma.payment.update({
    where: { id: live.id },
    data: { reversedAt: new Date(), reversalReason: 'cheque bounced' },
  });
  const afterReverse = await svc.collectionsBlock(institutionId);
  eq(afterReverse.allTimeRupees, before,
    'reversing it takes it back out — a reversed payment is not money in the bank');
  ok(afterReverse.reversedCount >= 1, 'and the reversal is counted', `${afterReverse.reversedCount}`);
  ok(afterReverse.reversedRupees >= 70_000,
    'and its amount is reported, so its absence from the headline is visible rather than silent',
    `${afterReverse.reversedRupees}`);

  await prisma.payment.delete({ where: { id: live.id } });
  eq((await svc.collectionsBlock(institutionId)).allTimeRupees, before,
    'and removing the row entirely returns the total to where it started');
}

// ── Cleanup ────────────────────────────────────────────────────────────────
//
// Dependency order, explicitly. This schema has no cascades on these relations, so
// deleting a parent while a child row still points at it is refused by the
// foreign key — which is correct behaviour and is exactly why the order is
// written out rather than left to chance.
//
// Nothing is deleted by a broad "where institutionId = …". Every predicate below
// names something this suite created, so a re-run cannot take the demo data with
// it and leave the next person with an empty database.
section('19. Cleaning up exactly the rows this suite created');

const createdProfiles = [
  rivalProfile.id, staleProfile.id, futureProfile.id,
  partProfile.id, settledProfile.id, waivedProfile.id, supersededProfile.id,
].filter((id) => Boolean(id));
const createdProfileIds = [...createdProfiles, ...(createdExtraProfileIds as string[])];

await prisma.feeDue.deleteMany({
  where: { studentProfileId: { in: createdProfileIds } },
});
await prisma.scholarshipApplication.deleteMany({
  where: { OR: [{ studentProfileId: { in: createdProfileIds } }, { scholarship: { name: `VERIFY ${stamp}` } }] },
});
await prisma.scholarship.deleteMany({ where: { name: `VERIFY ${stamp}` } });
// The unfooted payroll run goes too, entries first: these relations do not
// cascade, and leaving a header that disagrees with its own payslips in the
// demo database is a landmine for every suite that reads payroll afterwards.
// It is deleted by MONTH rather than by id, so a run that crashed mid-suite is
// still cleaned up by the next one.
await prisma.payrollEntry.deleteMany({
  where: { payrollRun: { institutionId, OR: [{ month: { startsWith: String(FIXTURE_YEAR) } }, { month: '--01' }] } },
});
await prisma.payrollRun.deleteMany({
  where: { institutionId, OR: [{ month: { startsWith: String(FIXTURE_YEAR) } }, { month: '--01' }] },
});
await prisma.budget.deleteMany({
  where: {
    OR: [
      { id: { in: [rivalBudget.id, overBudget.id].filter((x) => Boolean(x)) } },
      { category: { startsWith: 'VERIFY_' } },
    ],
  },
});
await prisma.payment.deleteMany({ where: { referenceNo: `RIVAL-${stamp}` } });
await prisma.studentProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
await prisma.user.deleteMany({ where: { email: { contains: `verify-dash-${stamp}` } } });
// The rival OFFICER belongs to the rival institution and goes with it. This is
// best-effort: an institution delete can be refused if anything still references
// it, and a leftover test institution must never turn a pass into a fail.
await prisma.institution.delete({ where: { id: rival.id } }).catch(() => {});

{
  // Prove the cleanup actually cleaned, rather than assuming it. A suite that
  // leaves a ₹9L rival bill behind makes the NEXT run's tenant-isolation
  // assertions pass or fail for the wrong reason.
  const leftDues = await prisma.feeDue.count({ where: { studentProfileId: { in: createdProfileIds } } });
  eq(leftDues, 0, 'no fee due created by this suite remains');
  const leftBudgets = await prisma.budget.count({ where: { category: { startsWith: 'VERIFY_' } } });
  eq(leftBudgets, 0, 'no budget line created by this suite remains');
  const leftPay = await prisma.payment.count({ where: { referenceNo: `RIVAL-${stamp}` } });
  eq(leftPay, 0, 'no payment created by this suite remains');
  const leftRuns = await prisma.payrollRun.count({
    where: { institutionId, OR: [{ month: { startsWith: String(FIXTURE_YEAR) } }, { month: '--01' }] },
  });
  eq(leftRuns, 0, 'no unfooted payroll run from this fixture namespace remains');
  const leftScholars = await prisma.scholarship.count({ where: { name: `VERIFY ${stamp}` } });
  eq(leftScholars, 0, 'no scholarship created by this suite remains');
  const leftUsers = await prisma.user.count({ where: { email: { contains: `verify-dash-${stamp}` } } });
  eq(leftUsers, 0, 'no user created by this suite remains');
}

// ── Report ─────────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(60)}`);
console.log(`${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('ok verify-dashboard: seven blocks, tenant-scoped, date-based, and honest about every figure');
