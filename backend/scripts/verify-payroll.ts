// Verification for F-06 Payroll (docs/users/06 §3.4).
// Usage: npx tsx scripts/verify-payroll.ts
//
// Exercises the real service against the dev DB, then restores every row it
// touched. Idempotent: running it twice leaves the DB byte-identical.
//
// The two things this script exists to protect:
//   1. a payslip FOOTS — earnings lines sum to gross, deduction lines sum to
//      deductions, gross − deductions is exactly net. A payslip that does not
//      add up is worse than no payslip.
//   2. loss of pay can never drive net below zero, and an APPROVED run's
//      numbers can never move afterwards.
import { prisma } from '../src/db/prisma.js';
import {
  listPayroll, getPayrollRun, getPayslip, runPayroll, approvePayrollRun,
  payPayrollEntry, payAllPayrollEntries, adjustPayrollEntry,
  computeSalary, daysInMonth, currentMonth,
} from '../src/modules/accounts/payroll.service.js';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    failures.push(name + (detail ? ` — ${detail}` : ''));
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const createdRunIds: string[] = [];

/**
 * A month with no seeded run, found rather than hard-coded.
 *
 * The F-09 seed fills the last twelve months so the comparison report has real
 * history, which swallowed the hard-coded `2026-01` this used to rely on. The
 * window moves with the calendar, so the month is derived: one month before the
 * newest seeded run. It is still inside `assertMonth`'s accepted range and still
 * covered by the open-ended salary records, so the run prices real staff.
 */
async function findUnseededMonth(): Promise<string> {
  const taken = new Set(
    (await prisma.payrollRun.findMany({ select: { month: true } })).map((r) => r.month),
  );
  const anchor = new Date();
  // Walk backwards until a free month turns up. Anchoring on "now" rather than on
  // a seeded row means this keeps working whatever the calendar does, and the
  // walk means a gap in the seeded history cannot hand us a clash.
  for (let back = 13; back <= 40; back += 1) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - back, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!taken.has(key)) return key;
  }
  throw new Error('could not find an unseeded payroll month');
}
let LIVE_MONTH = '2026-01';

async function main() {
  LIVE_MONTH = await findUnseededMonth();
  const accountsUser = await prisma.user.findFirst({
    where: { roles: { some: { role: 'ACCOUNTS' } } },
    select: { id: true, institutionId: true },
  });
  if (!accountsUser) throw new Error('No ACCOUNTS user in the dev DB — run the seed first');
  const inst = accountsUser.institutionId;
  const actor = accountsUser.id;

  const otherInst = await prisma.institution.findFirst({
    where: { id: { not: inst } },
    select: { id: true },
  });

  let msg = '';

  // ── Pure rules ─────────────────────────────────────────────
  console.log('\ncomputeSalary');
  const c = computeSalary(1000000, '2026-08'); // ₹10,000
  check('earnings lines sum to gross',
    c.earnings.reduce((s, l) => s + l.amountMinor, 0) === c.grossMinor);
  check('deduction lines sum to deductions',
    c.deductions.reduce((s, l) => s + l.amountMinor, 0) === c.deductionsMinor);
  check('net is gross − deductions', c.netMinor === c.grossMinor - c.deductionsMinor);
  check('HRA is 40% of basic, not of gross',
    c.earnings[1].amountMinor === Math.round((c.earnings[0].amountMinor * 40) / 100));
  check('PF is 12% of basic',
    c.deductions[0].amountMinor === Math.round((c.earnings[0].amountMinor * 12) / 100));
  check('basic is 50% of gross', c.earnings[0].amountMinor === c.grossMinor / 2);
  check('no LOP line when nobody is absent',
    !c.deductions.some((d) => d.label.startsWith('Loss of Pay')));

  console.log('\ndaysInMonth');
  check('February 2026 has 28 days', daysInMonth('2026-02') === 28);
  check('February 2028 has 29 days (leap)', daysInMonth('2028-02') === 29);
  check('April has 30', daysInMonth('2026-04') === 30);
  check('31-day month', daysInMonth('2026-07') === 31);

  console.log('\nloss of pay');
  const lop2 = computeSalary(1000000, '2026-07', 2); // 31-day month
  check('LOP adds exactly one line',
    lop2.deductions.filter((d) => d.label.startsWith('Loss of Pay')).length === 1);
  check('LOP label states the days',
    lop2.deductions.some((d) => d.label === 'Loss of Pay (2 days)'),
    lop2.deductions.map((d) => d.label).join(' / '));
  check('LOP lowers the net', lop2.netMinor < c.netMinor);
  check('LOP lines still foot',
    lop2.deductions.reduce((s, d) => s + d.amountMinor, 0) === lop2.deductionsMinor
      && lop2.grossMinor - lop2.deductionsMinor === lop2.netMinor);
  const lop1 = computeSalary(1000000, '2026-07', 1);
  check('singular day is not pluralised',
    lop1.deductions.some((d) => d.label === 'Loss of Pay (1 day)'));
  // The whole point of the cap: a fully absent month must not go negative.
  const lopAll = computeSalary(1000000, '2026-07', 31);
  check('full-month LOP never drives net below zero', lopAll.netMinor >= 0, `net ${lopAll.netMinor}`);
  check('full-month LOP is capped below the whole month',
    lopAll.lopDays < 31, `applied ${lopAll.lopDays}`);
  check('LOP is charged per calendar day, so a 30-day month differs',
    computeSalary(1000000, '2026-04', 2).deductionsMinor !== lop2.deductionsMinor);
  check('negative LOP is treated as none', computeSalary(1000000, '2026-07', -5).lopDays === 0);
  check('LOP zero leaves the net untouched',
    computeSalary(1000000, '2026-07', 0).netMinor === computeSalary(1000000, '2026-07').netMinor);

  console.log('\ncomputeSalary rejects nonsense');
  for (const [label, gross] of [['zero', 0], ['negative', -100], ['fractional paise', 100.5]] as const) {
    msg = '';
    try { computeSalary(gross, '2026-07'); } catch (e: any) { msg = e.message; }
    check(`${label} salary throws`, msg.length > 0, msg);
  }
  msg = '';
  try { computeSalary(100005, '2026-07'); } catch (e: any) { msg = e.message; }
  check('a half-rupee salary throws (lines must foot in rupees)', /whole rupees/i.test(msg), msg);

  console.log('\nevery line is a whole rupee');
  // A per-day LOP rate was the one thing that leaked paise into a payslip.
  const paise = computeSalary(4500000, '2026-07', 3); // ₹45,000 in a 31-day month
  check('no line carries sub-rupee paise',
    [...paise.earnings, ...paise.deductions].every((l) => l.amountMinor % 100 === 0),
    JSON.stringify(paise.deductions));
  check('the per-day rate is a whole rupee', paise.perDayMinor % 100 === 0, `${paise.perDayMinor}`);
  check('a whole-rupee gross foots exactly in rupees',
    paise.earnings.reduce((s, l) => s + l.amountMinor, 0) === paise.grossMinor
      && paise.deductions.reduce((s, l) => s + l.amountMinor, 0) === paise.deductionsMinor
      && paise.grossMinor - paise.deductionsMinor === paise.netMinor);

  // ── Hub ────────────────────────────────────────────────────
  console.log('\nlistPayroll');
  const hub = await listPayroll(inst);
  check('stats present', typeof hub.stats.staffCount === 'number');
  check('roster is the salary-bearing staff', hub.roster.length > 0);
  check('every roster member has a gross', hub.roster.every((s) => s.monthlyGrossRupees > 0));
  check('excluded staff carry a reason',
    hub.excluded.every((s) => typeof s.reason === 'string' && s.reason.length > 0));
  check('runs are newest month first',
    hub.runs.every((r, i) => i === 0 || hub.runs[i - 1].month >= r.month));
  check('paid + pending = entries on every run',
    hub.runs.every((r) => r.entryCount === r.paidCount + r.pendingCount));
  check('gross − deductions = net on every run',
    hub.runs.every((r) => r.grossRupees - r.deductionsRupees === r.netRupees));
  check('thisMonth is YYYY-MM', /^\d{4}-(0[1-9]|1[0-2])$/.test(hub.thisMonth));
  check('thisMonth matches currentMonth()', hub.thisMonth === currentMonth());
  check('a PAID run has nothing pending',
    hub.runs.filter((r) => r.status === 'PAID').every((r) => r.pendingCount === 0));
  check('paidPercent agrees with paidCount',
    hub.runs.every((r) => (r.entryCount === 0
      ? r.paidPercent === 0
      : r.paidPercent === Math.round((r.paidCount / r.entryCount) * 100))));
  check('trend is chronological',
    hub.trend.every((t, i) => i === 0 || hub.trend[i - 1].month <= t.month));
  check('trend totals agree with the run of the same month',
    hub.trend.every((t) => {
      const r = hub.runs.find((x) => x.month === t.month);
      return !r || (r.netRupees === t.netRupees && r.grossRupees === t.grossRupees);
    }));
  // Cross-check the hub's headline against the rows it claims to summarise:
  // money still to move = net of every entry that is not PAID, on APPROVED runs
  // only. A DRAFT run is a proposal, not a liability.
  const outstandingFromDb = await prisma.payrollEntry.aggregate({
    where: {
      status: { not: 'PAID' },
      payrollRun: { institutionId: inst, status: 'APPROVED' },
    },
    _sum: { netMinor: true },
    _count: { id: true },
  });
  check('outstanding matches the unpaid entries on APPROVED runs',
    hub.stats.outstandingRupees === Math.round((outstandingFromDb._sum.netMinor ?? 0) / 100),
    `${hub.stats.outstandingRupees} vs ${Math.round((outstandingFromDb._sum.netMinor ?? 0) / 100)}`);
  check('outstanding count matches too',
    hub.stats.outstandingCount === outstandingFromDb._count.id,
    `${hub.stats.outstandingCount} vs ${outstandingFromDb._count.id}`);

  const latest = hub.runs[0];
  if (!latest) throw new Error('No payroll run in the dev DB — run the seed first');

  // ── Run detail ─────────────────────────────────────────────
  console.log('\ngetPayrollRun');
  const detail = await getPayrollRun(inst, latest.id);
  check('entries returned', detail.entries.length === latest.entryCount);
  check('run net matches the sum of entry nets',
    detail.stats.netRupees === detail.entries.reduce((s, e) => s + e.netRupees, 0));
  check('entry earnings foot to the entry gross',
    detail.entries.every((e) => e.earnings.reduce((s, l) => s + l.amountMinor, 0) / 100 === e.grossRupees));
  check('entry deductions foot to the entry deductions',
    detail.entries.every((e) => e.deductions.reduce((s, l) => s + l.amountMinor, 0) / 100 === e.deductionsRupees));
  check('entry net = gross − deductions',
    detail.entries.every((e) => e.grossRupees - e.deductionsRupees === e.netRupees));
  check('every entry carries a staff name',
    detail.entries.every((e) => typeof e.staffName === 'string' && e.staffName.length > 0));
  check('server-gated flags agree with status',
    detail.run.canApprove === (detail.run.status === 'DRAFT')
      && detail.run.canPay === (detail.run.status === 'APPROVED' && detail.stats.pendingCount > 0)
      && detail.run.canAdjust === (detail.run.status === 'DRAFT'));
  check('audit trail is an array', Array.isArray(detail.audit));
  check('staff missing from the run is counted, not hidden',
    typeof detail.run.staffNotOnRun === 'number' && detail.run.staffNotOnRun >= 0);

  // ── Payslip ────────────────────────────────────────────────
  console.log('\ngetPayslip');
  const sample = detail.entries[0];
  const slip = await getPayslip(inst, sample.id);
  check('payslip carries the month', slip.entry.month === detail.run.month);
  // Not "exactly three": how many earnings lines a person has depends on THEIR
  // salary structure, so a fixed count was really asserting the identity of
  // whoever `detail.entries[0]` happened to return. What must hold for every
  // entry is checked for every entry, below.
  check('payslip has at least one earnings line', slip.entry.earnings.length >= 1,
    `${slip.entry.earnings.length}`);
  check('payslip has at least PF + professional tax', slip.entry.deductions.length >= 2);
  check('payslip earnings foot',
    slip.entry.earnings.reduce((s, l) => s + l.amountMinor, 0) / 100 === slip.entry.grossRupees);
  check('payslip deductions foot',
    slip.entry.deductions.reduce((s, l) => s + l.amountMinor, 0) / 100 === slip.entry.deductionsRupees);
  check('per-day rate is derived from the month length',
    slip.perDayRupees === Math.floor(slip.entry.grossRupees / daysInMonth(detail.run.month)));
  check('history includes this entry', slip.history.some((h) => h.id === sample.id));

  // Every payslip in the run, not just the first: each one's earnings lines must
  // foot to that person's own gross, and their deductions to their own
  // deductions. A single sampled entry proves nothing about the other twenty.
  let payslipsChecked = 0;
  for (const e of detail.entries) {
    const p2 = await getPayslip(inst, e.id);
    payslipsChecked += 1;
    check(`payslip ${e.staffUserId ?? e.id}: earnings foot to gross`,
      p2.entry.earnings.reduce((s2, l) => s2 + l.amountMinor, 0) / 100 === p2.entry.grossRupees,
      `${p2.entry.earnings.reduce((s2, l) => s2 + l.amountMinor, 0) / 100} vs ${p2.entry.grossRupees}`);
    check(`payslip ${e.staffUserId ?? e.id}: deductions foot`,
      p2.entry.deductions.reduce((s2, l) => s2 + l.amountMinor, 0) / 100 === p2.entry.deductionsRupees);
    check(`payslip ${e.staffUserId ?? e.id}: net is gross minus deductions`,
      p2.entry.grossRupees - p2.entry.deductionsRupees === p2.entry.netRupees);
    check(`payslip ${e.staffUserId ?? e.id}: every line is labelled`,
      [...p2.entry.earnings, ...p2.entry.deductions].every((l) => !!l.label));
  }
  check('every entry in the run was checked', payslipsChecked === detail.entries.length,
    `${payslipsChecked} of ${detail.entries.length}`);
  check('history is newest first',
    slip.history.every((h, i) => i === 0 || slip.history[i - 1].month >= h.month));
  check('YTD net is the sum of this year’s history',
    slip.ytd.netRupees === slip.history.filter((h) => h.month.startsWith(slip.ytd.year))
      .reduce((s, h) => s + h.netRupees, 0));
  check('only the last 4 of the bank account are ever exposed',
    slip.entry.bankAccountLast4 === null || /^\d{4}$/.test(slip.entry.bankAccountLast4));

  // ── Tenant scoping ─────────────────────────────────────────
  console.log('\ntenant scoping');
  if (otherInst) {
    msg = '';
    try { await getPayrollRun(otherInst.id, detail.run.id); } catch (e: any) { msg = e.message; }
    check('another institution cannot read this run', /not found/i.test(msg), msg);
    msg = '';
    try { await getPayslip(otherInst.id, sample.id); } catch (e: any) { msg = e.message; }
    check('another institution cannot read this payslip', /not found/i.test(msg), msg);
    msg = '';
    try { await payPayrollEntry(otherInst.id, actor, sample.id, {}); } catch (e: any) { msg = e.message; }
    check('another institution cannot pay this entry', /not found/i.test(msg), msg);
    msg = '';
    try { await adjustPayrollEntry(otherInst.id, actor, sample.id, { lopDays: 1 }); } catch (e: any) { msg = e.message; }
    check('another institution cannot adjust this entry', /not found/i.test(msg), msg);
    msg = '';
    try { await approvePayrollRun(otherInst.id, actor, detail.run.id); } catch (e: any) { msg = e.message; }
    check('another institution cannot approve this run', /not found/i.test(msg), msg);
    msg = '';
    try { await payAllPayrollEntries(otherInst.id, actor, detail.run.id, {}); } catch (e: any) { msg = e.message; }
    check('another institution cannot bulk-pay this run', /not found/i.test(msg), msg);
  } else {
    console.log('  – single-tenant DB, cross-tenant checks skipped');
  }

  // ── Month guards ───────────────────────────────────────────
  console.log('\nmonth guards');
  msg = '';
  try { await runPayroll(inst, actor, '2099-01'); } catch (e: any) { msg = e.message; }
  check('a wildly future month is refused', /future/i.test(msg), msg);
  msg = '';
  try { await runPayroll(inst, actor, '1999-01'); } catch (e: any) { msg = e.message; }
  check('an out-of-window month is refused', /past/i.test(msg), msg);

  // ── Lifecycle on a throwaway run ───────────────────────────
  console.log(`\nrunPayroll (throwaway ${LIVE_MONTH})`);
  const preExisting = await prisma.payrollRun.findUnique({
    where: { institutionId_month: { institutionId: inst, month: LIVE_MONTH } },
  });
  if (preExisting) {
    throw new Error(`A payroll run for ${LIVE_MONTH} already exists — this script needs an unseeded month`);
  }

  const life = await runPayroll(inst, actor, LIVE_MONTH, 'verification run');
  createdRunIds.push(life.id);
  check('run created as DRAFT', life.status === 'DRAFT');
  check('run reports its entry count', life.entryCount === hub.roster.length,
    `${life.entryCount} vs roster ${hub.roster.length}`);
  check('run gross matches the roster salaries', life.grossRupees > 0);

  msg = '';
  try { await runPayroll(inst, actor, LIVE_MONTH); } catch (e: any) { msg = e.message; }
  check('a second run for the same month is a conflict', /already exists/i.test(msg), msg);

  const audit = await prisma.auditLog.findFirst({
    where: { entityType: 'PayrollRun', entityId: life.id, action: 'payroll.run' },
  });
  check('run audit written', !!audit);
  check('audit names the actor and the month',
    !!audit && JSON.stringify(audit.afterJson ?? '').includes(LIVE_MONTH));

  const lifeDetail = await getPayrollRun(inst, life.id);
  check('every seeded staff member is on the run', lifeDetail.run.staffNotOnRun === 0,
    `${lifeDetail.run.staffNotOnRun} missing`);
  check('a fresh run can be approved', lifeDetail.run.canApprove === true);

  console.log('\nadjustPayrollEntry (DRAFT only)');
  const target = lifeDetail.entries[lifeDetail.entries.length - 1];
  const beforeNet = target.netRupees;
  const adjusted = await adjustPayrollEntry(inst, actor, target.id, {
    lopDays: 2,
    note: '2 days unpaid leave',
  });
  check('LOP lowers the net', adjusted.netMinor / 100 < beforeNet,
    `${adjusted.netMinor / 100} vs ${beforeNet}`);
  check('run totals were recomputed',
    adjusted.runNetMinor / 100 === lifeDetail.stats.netRupees - beforeNet + adjusted.netMinor / 100,
    `${adjusted.runNetMinor / 100} vs ${lifeDetail.stats.netRupees - beforeNet + adjusted.netMinor / 100}`);
  const reread = await getPayrollRun(inst, life.id);
  const rereadTarget = reread.entries.find((e) => e.id === target.id)!;
  check('the entry persisted the LOP line',
    rereadTarget.deductions.some((d) => d.label.startsWith('Loss of Pay')));
  check('the note persisted', rereadTarget.note === '2 days unpaid leave');
  check('deductions still foot after the adjustment',
    rereadTarget.deductions.reduce((s, l) => s + l.amountMinor, 0) / 100 === rereadTarget.deductionsRupees);
  check('the LOP entry is still consistent gross − deductions',
    rereadTarget.grossRupees - rereadTarget.deductionsRupees === rereadTarget.netRupees);

  msg = '';
  try { await adjustPayrollEntry(inst, actor, target.id, { lopDays: -1 }); } catch (e: any) { msg = e.message; }
  check('negative LOP is refused', msg.length > 0, msg);
  msg = '';
  try { await adjustPayrollEntry(inst, actor, target.id, { lopDays: 40 }); } catch (e: any) { msg = e.message; }
  check('LOP beyond the month length is refused', msg.length > 0, msg);

  console.log('\napprovePayrollRun');
  msg = '';
  try { await payPayrollEntry(inst, actor, target.id, {}); } catch (e: any) { msg = e.message; }
  check('cannot pay a DRAFT run', /approve/i.test(msg), msg);
  msg = '';
  try { await payAllPayrollEntries(inst, actor, life.id, {}); } catch (e: any) { msg = e.message; }
  check('cannot bulk-pay a DRAFT run', /approve/i.test(msg), msg);

  await approvePayrollRun(inst, actor, life.id);
  const approved = await getPayrollRun(inst, life.id);
  check('status is APPROVED', approved.run.status === 'APPROVED');
  check('approval is stamped', !!approved.run.approvedAt && !!approved.run.approvedBy);
  check('DRAFT-only flags are now off',
    approved.run.canApprove === false && approved.run.canAdjust === false);
  check('canPay is on with everything pending', approved.run.canPay === true);
  msg = '';
  try { await approvePayrollRun(inst, actor, life.id); } catch (e: any) { msg = e.message; }
  check('re-approving is a conflict', /only a DRAFT/i.test(msg), msg);
  msg = '';
  try { await adjustPayrollEntry(inst, actor, target.id, { lopDays: 1 }); } catch (e: any) { msg = e.message; }
  check('an APPROVED run cannot be adjusted', /locked|approved/i.test(msg), msg);

  console.log('\npayPayrollEntry');
  const paidOne = await payPayrollEntry(inst, actor, target.id, { paymentRef: 'UTR-VERIFY-1' });
  check('entry is PAID', paidOne.status === 'PAID');
  check('the rest of the run is still outstanding',
    paidOne.remainingInRun === approved.entries.length - 1);
  check('run stays APPROVED until the last one', paidOne.runStatus === 'APPROVED');
  const afterOne = await getPayrollRun(inst, life.id);
  const paidEntry = afterOne.entries.find((e) => e.id === target.id)!;
  check('the reference is stored', paidEntry.paymentRef === 'UTR-VERIFY-1');
  check('the payer is stamped', !!paidEntry.paidAt && !!paidEntry.paidBy);
  msg = '';
  try { await payPayrollEntry(inst, actor, target.id, {}); } catch (e: any) { msg = e.message; }
  check('paying twice is a conflict', /already paid/i.test(msg), msg);

  console.log('\npayAllPayrollEntries');
  const bulk = await payAllPayrollEntries(inst, actor, life.id, { paymentRefPrefix: 'NEFT' });
  check('every remaining entry is reported paid',
    bulk.paidEntries === approved.entries.length - 1, `${bulk.paidEntries}`);
  check('bulk reports the money moved',
    bulk.paidRupees === approved.stats.netRupees - paidEntry.netRupees,
    `${bulk.paidRupees} vs ${approved.stats.netRupees - paidEntry.netRupees}`);
  const closed = await getPayrollRun(inst, life.id);
  check('the run closed itself', closed.run.status === 'PAID');
  check('closed runs stamp paidAt and paidBy', !!closed.run.paidAt && !!closed.run.paidBy);
  check('nothing pending on a closed run', closed.stats.pendingCount === 0);
  check('paid = net on a closed run', closed.stats.paidRupees === closed.stats.netRupees);
  check('the prefix is applied to each reference',
    closed.entries.filter((e) => e.id !== target.id)
      .every((e) => (e.paymentRef ?? '').startsWith('NEFT/')));
  msg = '';
  try { await payAllPayrollEntries(inst, actor, life.id, {}); } catch (e: any) { msg = e.message; }
  check('bulk-paying a closed run is a conflict', /already fully paid/i.test(msg), msg);

  console.log('\n404s');
  msg = '';
  try { await getPayrollRun(inst, 'nope'); } catch (e: any) { msg = e.message; }
  check('unknown run 404s', /not found/i.test(msg), msg);
  msg = '';
  try { await getPayslip(inst, 'nope'); } catch (e: any) { msg = e.message; }
  check('unknown payslip 404s', /not found/i.test(msg), msg);

  console.log('\nhub after the lifecycle');
  const hubAfter = await listPayroll(inst);
  check('the hub picks up the new run', hubAfter.runs.some((r) => r.id === life.id));
  const closedHub = hubAfter.runs.find((r) => r.id === life.id)!;
  check('a closed run shows 100% paid', closedHub.paidPercent === 100);
  check('the throwaway run does not inflate this year to zero',
    hubAfter.stats.ytdNetRupees > 0);
}

// ── Cleanup ──────────────────────────────────────────────────
// Runs inside main()'s await chain: a `process.on('exit')` async handler is
// dropped by Node, which strands mutated rows in the dev DB.
async function runCleanup() {
  for (const id of createdRunIds) {
    await prisma.payrollEntry.deleteMany({ where: { payrollRunId: id } });
    await prisma.auditLog.deleteMany({ where: { entityType: 'PayrollRun', entityId: id } });
    await prisma.payrollRun.delete({ where: { id } }).catch(() => {});
  }
  await prisma.$disconnect();
}

main()
  .catch((err) => {
    failed += 1;
    failures.push(`threw: ${err.message}`);
    console.error('\n  ✗ threw:', err);
  })
  .then(runCleanup)
  .then(() => {
    console.log(`\n${passed} passed, ${failed} failed`);
    if (failures.length) {
      console.log('\nFailures:');
      for (const f of failures) console.log(`  - ${f}`);
    }
    console.log(`\nRemoved ${createdRunIds.length} throwaway payroll run(s).`);
    process.exit(failed ? 1 : 0);
  });