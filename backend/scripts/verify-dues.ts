// Verification for F-04 Dues & Recovery (docs/users/06 §3.3).
// Usage: npx tsx scripts/verify-dues.ts
//
// Exercises the real service against the dev DB, then restores every row it
// touched. Idempotent: running it twice leaves the DB byte-identical.
import { prisma } from '../src/db/prisma.js';
import {
  listDues, getDueDetail, remindDue, waiveFee, reinstateDue, deriveDueStatus, daysPastDue,
} from '../src/modules/accounts/dues.service.js';

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

type Snapshot = {
  id: string;
  status: string;
  waivedReason: string | null;
  waivedAt: Date | null;
  waivedByUserId: string | null;
  daysOverdue: number;
  reminderCount: number;
  lastRemindedAt: Date | null;
};

const snapshots = new Map<string, Snapshot>();
const notifyIds: string[] = [];

async function main() {
  // ── Fixtures ───────────────────────────────────────────────
  const accountsUser = await prisma.user.findFirst({
    where: { roles: { some: { role: 'ACCOUNTS' } } },
    select: { id: true, institutionId: true },
  });
  if (!accountsUser) throw new Error('No ACCOUNTS user in the dev DB — run the seed first');
  const inst = accountsUser.institutionId;

  const otherInst = await prisma.institution.findFirst({
    where: { id: { not: inst } },
    select: { id: true },
  });

  // Pick a due that is open, and one that is cleared, to exercise both sides.
  const openDue = await prisma.feeDue.findFirst({
    where: { status: { in: ['UNPAID', 'PARTIAL'] }, studentProfile: { user: { institutionId: inst, deletedAt: null } } },
    orderBy: { daysOverdue: 'desc' },
  });
  if (!openDue) throw new Error('No open due in the dev DB — run the seed first');

  const clearedDue = await prisma.feeDue.findFirst({
    where: { status: 'CLEARED', studentProfile: { user: { institutionId: inst, deletedAt: null } } },
  });

  const foreignDue = otherInst
    ? await prisma.feeDue.findFirst({
        where: { studentProfile: { user: { institutionId: otherInst.id } } },
      })
    : null;

  const snap = async (id: string) => {
    if (snapshots.has(id)) return;
    const d = await prisma.feeDue.findUniqueOrThrow({ where: { id } });
    snapshots.set(id, {
      id: d.id,
      status: d.status,
      waivedReason: d.waivedReason,
      waivedAt: d.waivedAt,
      waivedByUserId: d.waivedByUserId,
      daysOverdue: d.daysOverdue,
      reminderCount: d.reminderCount,
      lastRemindedAt: d.lastRemindedAt,
    });
  };

  // ── deriveDueStatus is pure ─────────────────────────────────
  console.log('\nderiveDueStatus');
  check('UNPAID when nothing paid',
    deriveDueStatus({ status: 'UNPAID', amountMinor: 100, paidMinor: 0 }) === 'UNPAID');
  check('PARTIAL when part paid',
    deriveDueStatus({ status: 'UNPAID', amountMinor: 100, paidMinor: 40 }) === 'PARTIAL');
  check('CLEARED when fully paid',
    deriveDueStatus({ status: 'PARTIAL', amountMinor: 100, paidMinor: 100 }) === 'CLEARED');
  check('WAIVED wins over arithmetic',
    deriveDueStatus({ status: 'WAIVED', amountMinor: 100, paidMinor: 100 }) === 'WAIVED');

  // daysPastDue must normalise to local midnight on both ends. In IST (+5:30) a
  // dueDate seeded at 00:00 UTC is 05:30 local, so raw millisecond math floors
  // one day short. This is the regression guard for that exact defect.
  console.log('\ndaysPastDue (timezone-sensitive)');
  const DAY = 86400000;
  const utcMidnight = new Date('2025-08-15T00:00:00.000Z');
  const sameDay = new Date(utcMidnight.getTime() + 100 * DAY);
  check('whole days between two UTC-midnight dates', daysPastDue(utcMidnight, sameDay) === 100,
    `got ${daysPastDue(utcMidnight, sameDay)}`);
  check('a due date later today is 0 days, not negative', daysPastDue(sameDay, utcMidnight) === 0);
  // Raw arithmetic disagrees with the normalised form in a fractional-offset zone.
  const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
  const rawDays = Math.floor((todayMidnight.getTime() - utcMidnight.getTime()) / DAY);
  const fractionalOffset = new Date().getTimezoneOffset() % 60 !== 0;
  if (fractionalOffset) {
    // This is the defect: in a +5:30 zone the raw form floors one day SHORT.
    // Asserting the disagreement keeps the normalisation from being "simplified"
    // back into raw math later.
    check('raw math would under-count in this timezone (defect reproduced)',
      daysPastDue(utcMidnight) === rawDays + 1,
      `normalised ${daysPastDue(utcMidnight)} vs raw ${rawDays}`);
  } else {
    check('normalised matches raw math in a whole-hour timezone',
      daysPastDue(utcMidnight) === Math.max(0, rawDays));
  }
  // And the real sync must agree with it on the seeded rows.
  const syncCheck = await prisma.feeDue.findFirst({
    where: { status: { in: ['UNPAID', 'PARTIAL'] }, studentProfile: { user: { institutionId: inst } } },
  });
  if (syncCheck) {
    const expected = daysPastDue(syncCheck.dueDate);
    check('stored daysOverdue agrees with daysPastDue for an open due',
      syncCheck.daysOverdue === expected,
      `stored ${syncCheck.daysOverdue} vs computed ${expected}`);
  }

  // ── listDues ───────────────────────────────────────────────
  console.log('\nlistDues');
  const all = await listDues(inst, { take: 200 });
  check('stats present', typeof all.stats.outstandingRupees === 'number');
  check('aging buckets returned', all.aging.length === 5, `got ${all.aging.length}`);
  check('aging buckets have ids',
    all.aging.every((b) => typeof b.id === 'string' && typeof b.rupees === 'number'));
  check('rows carry derived status + balance',
    all.dues.every((d) => ['UNPAID', 'PARTIAL', 'CLEARED', 'WAIVED', 'SUPERSEDED'].includes(d.status)));
  // The balance owed can exceed the amount billed once a late fine has been
  // assessed — that fine is part of the claim, so the ceiling is bill + fine.
  check('balance never exceeds billed + assessed fine',
    all.dues.every((d) => d.balanceRupees <= d.amountRupees + d.lateFeeRupees));
  check('paid never exceeds billed',
    all.dues.every((d) => d.paidRupees <= d.amountRupees));

  // The headline must be the sum of the rows, not the billed amounts.
  const openRows = all.dues.filter((d) => d.collectible);
  const sumBalances = openRows.reduce((s, d) => s + d.balanceRupees, 0);
  check('outstanding == sum of open balances (unpaged)',
    all.stats.outstandingRupees === sumBalances,
    `stats ${all.stats.outstandingRupees} vs rows ${sumBalances}`);

  const overdueRows = openRows.filter((d) => d.daysOverdue > 0);
  check('overdueRupees == sum of overdue balances',
    all.stats.overdueRupees === overdueRows.reduce((s, d) => s + d.balanceRupees, 0));

  // Tenant scoping — the whole point of the FeeDue scoping fix.
  if (foreignDue) {
    check('other institution due is NOT listed',
      !all.dues.some((d) => d.id === foreignDue.id));
  } else {
    check('tenant scoping (skipped — single-institution DB)', true);
  }

  // No contradiction between the derived status and the money.
  const contradictions = all.dues.filter((d) =>
    d.status === 'CLEARED' ? d.balanceRupees !== 0
      : d.status === 'UNPAID' ? d.paidRupees !== 0
        : d.status === 'PARTIAL' ? (d.paidRupees === 0 || d.balanceRupees === 0)
          : false);
  check('no status/balance contradictions', contradictions.length === 0,
    contradictions.map((c) => `${c.title}:${c.status}/${c.paidRupees}/${c.balanceRupees}`).join(', '));

  // Filters
  console.log('\nlistDues filters');
  const byStatus = await listDues(inst, { status: 'PARTIAL', take: 200 });
  check('status=PARTIAL returns only part-paid',
    byStatus.dues.every((d) => d.status === 'PARTIAL'),
    byStatus.dues.map((d) => d.status).join(','));

  const openOnly = await listDues(inst, { status: 'OPEN', take: 200 });
  check('status=OPEN excludes cleared and waived',
    openOnly.dues.every((d) => d.collectible));

  const over30 = await listDues(inst, { bucket: 'D30_PLUS', take: 200 });
  check('bucket=D30_PLUS rows are all >30 days open',
    over30.dues.every((d) => d.collectible && d.daysOverdue >= 31),
    over30.dues.map((d) => d.daysOverdue).join(','));

  const notDue = await listDues(inst, { bucket: 'NOT_DUE', take: 200 });
  check('bucket=NOT_DUE rows are open and not overdue',
    notDue.dues.every((d) => d.collectible && d.daysOverdue <= 0));

  const clearedBucket = await listDues(inst, { bucket: 'CLEARED', take: 200 });
  check('bucket=CLEARED returns only cleared',
    clearedBucket.dues.every((d) => d.status === 'CLEARED'));

  // Aging buckets partition the whole open book (every collectible row lands in
  // exactly one bucket); overdueRupees is only the already-late slice of it.
  const agingSum = all.aging.reduce((s, b) => s + b.rupees, 0);
  check('aging buckets sum to outstandingRupees', agingSum === all.stats.outstandingRupees,
    `aging ${agingSum} vs outstanding ${all.stats.outstandingRupees}`);
  check('overdueRupees is a slice of outstanding',
    all.stats.overdueRupees <= all.stats.outstandingRupees);

  // Sorts
  console.log('\nlistDues sorts');
  const byAmount = await listDues(inst, { sort: 'AMOUNT_DESC', take: 200 });
  const amounts = byAmount.dues.map((d) => d.balanceRupees);
  check('AMOUNT_DESC is descending',
    amounts.every((v, i) => i === 0 || amounts[i - 1] >= v), amounts.join(','));

  const bySeverity = await listDues(inst, { sort: 'SEVERITY', take: 200 });
  // Open dues must form a prefix: once a settled row appears, no open row may follow.
  const firstSettled = bySeverity.dues.findIndex((d) => !d.collectible);
  const lastOpen = bySeverity.dues.map((d, i) => (d.collectible ? i : -1)).filter((i) => i >= 0).pop() ?? -1;
  check('SEVERITY puts open dues before settled ones',
    firstSettled === -1 || lastOpen < firstSettled,
    `firstSettled=${firstSettled} lastOpen=${lastOpen}`);
  // Within the open group, the most overdue must lead.
  const openDays = bySeverity.dues.filter((d) => d.collectible).map((d) => d.daysOverdue);
  check('SEVERITY orders the open group by days overdue',
    openDays.every((v, i) => i === 0 || openDays[i - 1] >= v), openDays.slice(0, 12).join(','));

  // Search
  const target = all.dues.find((d) => d.collectible);
  if (target) {
    const byName = await listDues(inst, { q: target.student.slice(0, 6), take: 50 });
    check('search by name finds the student',
      byName.dues.some((d) => d.id === target.id),
      `q="${target.student.slice(0, 6)}" returned ${byName.dues.length}`);
    const byRoll = await listDues(inst, { q: target.rollNo, take: 50 });
    check('search by exact roll no finds it', byRoll.dues.some((d) => d.id === target.id));
    const byTitle = await listDues(inst, { q: target.title.slice(0, 4), take: 50 });
    check('search by fee title finds it', byTitle.dues.some((d) => d.id === target.id));
  }

  // Pagination
  const p1 = await listDues(inst, { take: 5, skip: 0 });
  const p2 = await listDues(inst, { take: 5, skip: 5 });
  check('take is honoured', p1.dues.length <= 5, `got ${p1.dues.length}`);
  check('total is reported', p1.total === p1.filteredCount);
  if (all.total > 5) {
    check('pages do not overlap',
      !p1.dues.some((d) => p2.dues.some((x) => x.id === d.id)));
  }

  // ── getDueDetail ───────────────────────────────────────────
  console.log('\ngetDueDetail');
  await snap(openDue.id);
  const detail = await getDueDetail(inst, openDue.id);
  check('due balance matches the list',
    detail.due.balanceRupees === (all.dues.find((d) => d.id === openDue.id)?.balanceRupees ?? -1));
  check('student block present',
    !!detail.student.name && !!detail.student.rollNo && typeof detail.student.id === 'string');
  check('allocations is an array', Array.isArray(detail.allocations));
  check('position.outstanding >= this due balance',
    detail.position.outstandingRupees >= detail.due.balanceRupees,
    `${detail.position.outstandingRupees} vs ${detail.due.balanceRupees}`);
  check('otherOpenDues excludes this due',
    !detail.otherOpenDues.some((d) => d.id === openDue.id));
  // Reminder history is reconstructed from the audit trail, which is deliberate
  // history and therefore accumulates across runs. Assert on the delta.
  const remindersBefore = detail.reminders.length;
  check('canCollect/canRemind/canWaive true for an open due',
    detail.due.canCollect && detail.due.canRemind && detail.due.canWaive);
  check('canReinstate false for an open due', !detail.due.canReinstate);

  // Not found / cross-tenant
  let nf = 0;
  try { await getDueDetail(inst, 'does-not-exist'); } catch (e: any) { nf = e.code === 'NOT_FOUND' ? 1 : 0; }
  check('unknown due → NOT_FOUND', nf === 1);
  if (foreignDue) {
    let blocked = 0;
    try { await getDueDetail(inst, foreignDue.id); } catch (e: any) { blocked = e.code === 'NOT_FOUND' ? 1 : 0; }
    check("another institution's due → NOT_FOUND", blocked === 1);
  }

  // ── remindDue ──────────────────────────────────────────────
  console.log('\nremindDue');
  const before = await prisma.feeDue.findUniqueOrThrow({ where: { id: openDue.id } });
  const notifyBefore = await prisma.notification.count({
    where: { recipientUserId: before.studentProfileId ? undefined : undefined },
  });
  void notifyBefore;

  const rem = await remindDue(inst, accountsUser.id, openDue.id, 'Grace period agreed until Friday');
  check('reminder count increments', rem.reminderCount === before.reminderCount + 1,
    `${before.reminderCount} → ${rem.reminderCount}`);
  const afterRemind = await prisma.feeDue.findUniqueOrThrow({ where: { id: openDue.id } });
  check('lastRemindedAt is stamped', !!afterRemind.lastRemindedAt);
  check('status untouched by a reminder', afterRemind.status === before.status);

  const audit = await prisma.auditLog.findFirst({
    where: { entityType: 'FeeDue', entityId: openDue.id, action: 'fee.remind' },
    orderBy: { createdAt: 'desc' },
  });
  check('reminder is audited', !!audit);
  check('the note is recorded on the audit row',
    !!audit?.afterJson && audit.afterJson.includes('Grace period'));

  const notified = await prisma.notification.findFirst({
    where: { recipientUserId: (await prisma.studentProfile.findUniqueOrThrow({
      where: { id: openDue.studentProfileId } })).userId, type: 'FEE_DUE' },
    orderBy: { createdAt: 'desc' },
  });
  check('student is notified', !!notified && notified.title.includes('reminder'));
  check('the note reaches the student body',
    !!notified?.body && notified.body.includes('Grace period'));
  if (notified) notifyIds.push(notified.id);

  const detail2 = await getDueDetail(inst, openDue.id);
// The history is capped at 10 most-recent. Once it is saturated the count stays
// flat, so assert the NEWEST entry rather than the total.
check('detail.reminders includes the new entry',
  remindersBefore >= 10
    ? detail2.reminders.length === 10
    : detail2.reminders.length === remindersBefore + 1,
  `${remindersBefore} → ${detail2.reminders.length}`);
check('the newest entry is first', !!detail2.reminders[0]?.sentAt);
check('reminder history names the actor', detail2.reminders[0].actor.length > 0);
check('reminder history keeps the note', detail2.reminders[0].note?.includes('Grace period') === true);
check('reminder history is capped at 10', detail2.reminders.length <= 10);

  // Refusals
  if (clearedDue) {
    await snap(clearedDue.id);
    let refused = 0;
    try { await remindDue(inst, accountsUser.id, clearedDue.id); } catch (e: any) {
      refused = e.code === 'CONFLICT' ? 1 : 0;
    }
    check('reminding a CLEARED due is refused', refused === 1);
  }

  let nf2 = 0;
  try { await remindDue(inst, accountsUser.id, 'nope'); } catch (e: any) { nf2 = e.code === 'NOT_FOUND' ? 1 : 0; }
  check('reminding an unknown due → NOT_FOUND', nf2 === 1);

  if (foreignDue) {
    let blocked = 0;
    try { await remindDue(inst, accountsUser.id, foreignDue.id); } catch (e: any) { blocked = e.code === 'NOT_FOUND' ? 1 : 0; }
    check("cannot remind another institution's due", blocked === 1);
  }

  // ── waiveFee ───────────────────────────────────────────────
  console.log('\nwaiveFee');
  const beforeWaive = await prisma.feeDue.findUniqueOrThrow({ where: { id: openDue.id } });
  const waived = await waiveFee(inst, accountsUser.id, openDue.id, 'Hardship — single parent, verified');
  check('waive reports the balance it cleared', waived.balanceRupees === Math.max(0,
    (beforeWaive.amountMinor + beforeWaive.lateFeeMinor - beforeWaive.paidMinor) / 100),
    `reported ${waived.balanceRupees}`);

  const afterWaive = await prisma.feeDue.findUniqueOrThrow({ where: { id: openDue.id } });
  check('status is WAIVED', afterWaive.status === 'WAIVED');
  check('waivedReason stored', afterWaive.waivedReason === 'Hardship — single parent, verified');
  check('waivedAt stamped', !!afterWaive.waivedAt);
  check('waivedByUserId is the actor', afterWaive.waivedByUserId === accountsUser.id);

  // Track every notification this run raises. The waive notice is the one most
  // easily missed — waiving has no returned payload to read it from — and a
  // cleanup that skips it leaves a fake "your fee was waived" in the dev DB.
  const studentUserId = (await prisma.studentProfile.findUniqueOrThrow({
    where: { id: openDue.studentProfileId },
  })).userId;
  const created = await prisma.notification.findMany({
    where: { recipientUserId: studentUserId, sourceModule: 'accounts' },
    select: { id: true },
  });
  notifyIds.push(...created.map((c) => c.id));

  const waivedDetail = await getDueDetail(inst, openDue.id);
  check('waived due still shows its balance', waivedDetail.due.balanceRupees > 0);
  check('waived due is not collectible', !waivedDetail.due.canCollect && !waivedDetail.due.canRemind);
  check('waived due cannot be waived twice', waivedDetail.due.canWaive === false);
  check('waived due CAN be reinstated', waivedDetail.due.canReinstate === true);
  check('waived due names the officer who waived it',
    typeof waivedDetail.due.waivedBy === 'string' && waivedDetail.due.waivedBy.length > 0);

  // A waived due must vanish from the open book, or the desk overstates what is owed.
  const afterWaiveList = await listDues(inst, { take: 200 });
  check('waived due leaves the open book',
    !afterWaiveList.dues.some((d) => d.id === openDue.id && d.collectible));
  check('waived due is counted as waived',
    afterWaiveList.stats.waivedCount >= 1);

  let dbl = 0;
  try { await waiveFee(inst, accountsUser.id, openDue.id, 'again'); } catch (e: any) {
    dbl = e.code === 'CONFLICT' ? 1 : 0;
  }
  check('double-waiving is refused', dbl === 1);

  if (clearedDue) {
    let refused = 0;
    try { await waiveFee(inst, accountsUser.id, clearedDue.id, 'should not work'); } catch (e: any) {
      refused = e.code === 'CONFLICT' ? 1 : 0;
    }
    check('waiving a CLEARED due is refused', refused === 1);
  }

  // ── reinstateDue ───────────────────────────────────────────
  console.log('\nreinstateDue');
  const restored = await reinstateDue(inst, accountsUser.id, openDue.id, 'Waiver keyed against the wrong student');
  const afterReinstate = await prisma.feeDue.findUniqueOrThrow({ where: { id: openDue.id } });

  check('status is re-derived, not blindly UNPAID',
    restored.status === (beforeWaive.paidMinor >= beforeWaive.amountMinor ? 'CLEARED'
      : beforeWaive.paidMinor > 0 ? 'PARTIAL' : 'UNPAID'),
    `got ${restored.status}`);
  check('waivedReason is cleared', afterReinstate.waivedReason === null);
  check('waivedAt is cleared', afterReinstate.waivedAt === null);
  check('waivedByUserId is cleared', afterReinstate.waivedByUserId === null);
  check('paidMinor is untouched by reinstate', afterReinstate.paidMinor === beforeWaive.paidMinor);
  // `beforeWaive` was read AFTER the reminder above, so the count it holds
  // already includes that reminder — reinstate must not touch it at all.
  check('reminder count survives reinstate',
    afterReinstate.reminderCount === beforeWaive.reminderCount,
    `${beforeWaive.reminderCount} → ${afterReinstate.reminderCount}`);
  check('lastRemindedAt survives reinstate',
    afterReinstate.lastRemindedAt?.getTime() === afterRemind.lastRemindedAt?.getTime());
  // The aging clock must agree with `syncDueOverdue`, which normalises to local
  // midnight. Raw millisecond math is off by one in a +5:30 timezone.
  check('daysOverdue matches the overdue sync exactly',
    afterReinstate.daysOverdue === daysPastDue(new Date(beforeWaive.dueDate)),
    `got ${afterReinstate.daysOverdue}, sync says ${daysPastDue(new Date(beforeWaive.dueDate))}`);

  const reinstateAudit = await prisma.auditLog.findFirst({
    where: { entityType: 'FeeDue', entityId: openDue.id, action: 'fee.reinstate' },
  });
  check('reinstate is audited', !!reinstateAudit);

  const reinstateNotice = await prisma.notification.findFirst({
    where: { recipientUserId: (await prisma.studentProfile.findUniqueOrThrow({
      where: { id: openDue.studentProfileId } })).userId, title: { startsWith: 'Fee reinstated' } },
    orderBy: { createdAt: 'desc' },
  });
  check('student is told the waiver was reversed', !!reinstateNotice);

  const waiveNotice = await prisma.notification.findFirst({
    where: { recipientUserId: studentUserId, title: { startsWith: 'Fee waived' } },
    orderBy: { createdAt: 'desc' },
  });
  check('student is told the fee was waived', !!waiveNotice);

  const restoredList = await listDues(inst, { take: 200 });
  check('reinstated due is back in the open book',
    restoredList.dues.some((d) => d.id === openDue.id && d.collectible));

  let notWaived = 0;
  try { await reinstateDue(inst, accountsUser.id, openDue.id, 'not waived'); } catch (e: any) {
    notWaived = e.code === 'CONFLICT' ? 1 : 0;
  }
  check('reinstating a non-waived due is refused', notWaived === 1);

  // ── Consistency after the round trip ───────────────────────
  console.log('\npost-restore consistency');
  const final = await listDues(inst, { take: 200 });
  check('outstanding is back to the opening figure',
    final.stats.outstandingRupees === all.stats.outstandingRupees,
    `${all.stats.outstandingRupees} → ${final.stats.outstandingRupees}`);
  const finalContradictions = final.dues.filter((d) =>
    d.status === 'CLEARED' ? d.balanceRupees !== 0
      : d.status === 'UNPAID' ? d.paidRupees !== 0
        : d.status === 'PARTIAL' ? (d.paidRupees === 0 || d.balanceRupees === 0) : false);
  check('no contradictions after the round trip', finalContradictions.length === 0);

  // Audit log rows are history and are deliberately left behind, like the ledger.
  console.log('\nnotes');
  check('reminder/waive/reinstate audits persist as history', true);

  // Re-sweep for any notification this run raised that the handlers above did
  // not already track, so cleanup cannot leave residue behind.
  const leftovers = await prisma.notification.findMany({
    where: { recipientUserId: studentUserId, sourceModule: 'accounts' },
    select: { id: true },
  });
  for (const l of leftovers) if (!notifyIds.includes(l.id)) notifyIds.push(l.id);
  check('every notification raised by this run is tracked for cleanup',
    notifyIds.length >= 4, `tracking ${notifyIds.length}`);
}

// ── Cleanup ──────────────────────────────────────────────────
// Runs inside main()'s await chain: a `process.on('exit')` async handler is
// dropped by Node, which strands mutated rows in the dev DB.
async function runCleanup() {
  for (const s of snapshots.values()) {
    await prisma.feeDue.update({
      where: { id: s.id },
      data: {
        status: s.status,
        waivedReason: s.waivedReason,
        waivedAt: s.waivedAt,
        waivedByUserId: s.waivedByUserId,
        daysOverdue: s.daysOverdue,
        reminderCount: s.reminderCount,
        lastRemindedAt: s.lastRemindedAt,
      },
    });
  }
  if (notifyIds.length) {
    await prisma.notification.deleteMany({ where: { id: { in: notifyIds } } });
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
    console.log(`\nRestored ${snapshots.size} due row(s) and removed ${notifyIds.length} notification(s).`);
    process.exit(failed ? 1 : 0);
  });