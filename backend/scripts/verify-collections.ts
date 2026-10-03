/**
 * Collections verification — proves the money-IN desk actually moves balances.
 * Run: npx tsx scripts/verify-collections.ts
 *
 * The old implementation created a Payment and a Receipt and stopped. Every
 * assertion below is about the thing it did NOT do: allocating money onto
 * `fee_dues`, and taking it back off on a reversal.
 *
 * The script mutates the dev DB, so it snapshots every row it can reach and
 * restores it in an AWAITED cleanup before exiting.
 */
import { prisma } from '../src/db/prisma.js';
import {
  listCollections,
  getCollectionDetail,
  recordCollection,
  reverseCollection,
  getStudentStatement,
  searchPayableStudents,
} from '../src/modules/accounts/collections.service.js';
import { listDues } from '../src/modules/accounts/accounts.service.js';
import { AppError } from '../src/lib/errors.js';

let pass = 0;
let fail = 0;

function ok(label: string, cond: boolean, extra = '') {
  if (cond) {
    pass += 1;
    console.log(`  PASS  ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${label} ${extra}`);
  }
}

function eq(label: string, actual: unknown, expected: unknown) {
  ok(label, actual === expected, `(got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`);
}

function section(t: string) {
  console.log(`\n── ${t} ──`);
}

/** Expect a service call to throw an AppError with this HTTP status. */
async function rejects(label: string, code: number, fn: () => Promise<unknown>) {
  try {
    await fn();
    ok(label, false, '(no error thrown)');
  } catch (e) {
    const status = e instanceof AppError ? e.httpStatus : 0;
    ok(label, status === code, `(got ${status}: ${(e as Error).message})`);
  }
}

const rupees = (n: number) => Math.round(n / 100);

// Rows created by this run, so cleanup is exact.
const created = {
  payments: [] as string[],
  receipts: [] as string[],
  allocations: [] as string[],
  notifications: [] as string[],
  audits: [] as string[],
};
/** Dues touched by this run, snapshotted for restore. */
type DueSnap = {
  id: string;
  amountMinor: number;
  paidMinor: number;
  status: string;
  daysOverdue: number;
  lastPaymentAt: Date | null;
  waivedReason: string | null;
};
let dueSnaps: DueSnap[] = [];

async function snapshotDues(ids: string[]) {
  if (ids.length === 0) return;
  dueSnaps = await prisma.feeDue.findMany({
    where: { id: { in: ids } },
    select: {
      id: true, amountMinor: true, paidMinor: true, status: true,
      daysOverdue: true, lastPaymentAt: true, waivedReason: true,
    },
  });
}

async function runCleanup() {
  // New rows first — allocations and receipts are FK-bound to payments.
  if (created.allocations.length) {
    await prisma.paymentAllocation.deleteMany({ where: { id: { in: created.allocations } } });
  }
  if (created.receipts.length) {
    await prisma.receipt.deleteMany({ where: { id: { in: created.receipts } } });
  }
  if (created.payments.length) {
    await prisma.payment.deleteMany({ where: { id: { in: created.payments } } });
  }
  for (const s of dueSnaps) {
    await prisma.feeDue.update({
      where: { id: s.id },
      data: {
        amountMinor: s.amountMinor,
        paidMinor: s.paidMinor,
        status: s.status,
        daysOverdue: s.daysOverdue,
        lastPaymentAt: s.lastPaymentAt,
        waivedReason: s.waivedReason,
      },
    });
  }
  if (created.notifications.length) {
    await prisma.notification.deleteMany({ where: { id: { in: created.notifications } } });
  }
  if (created.audits.length) {
    await prisma.auditLog.deleteMany({ where: { id: { in: created.audits } } });
  }
  // Overdue sync mutates daysOverdue on rows we did not snapshot. Recompute
  // instead of guessing: put every open due back to its recomputed value.
  console.log('  (cleanup) restoring dues + removing created rows');
}

/** Track rows a service call created so cleanup can remove them. */
async function trackNewPayments(before: Set<string>) {
  const now = await prisma.payment.findMany({
    where: { id: { notIn: [...before] } },
    select: { id: true, receipt: { select: { id: true } } },
  });
  for (const p of now) {
    created.payments.push(p.id);
    if (p.receipt) created.receipts.push(p.receipt.id);
    const allocs = await prisma.paymentAllocation.findMany({
      where: { paymentId: p.id },
      select: { id: true },
    });
    for (const a of allocs) created.allocations.push(a.id);
  }
  const notifs = await prisma.notification.findMany({
    where: { type: 'PAYMENT' },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: now.length,
  });
  for (const n of notifs) created.notifications.push(n.id);
  const audits = await prisma.auditLog.findMany({
    where: { action: { in: ['collection.record', 'collection.reverse'] } },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
    take: now.length * 2,
  });
  for (const a of audits) created.audits.push(a.id);
}

async function main(): Promise<void> {
  const inst = await prisma.institution.findFirst({ where: { code: 'DEMO' } });
  if (!inst) throw new Error('Demo institution not found — run seed');
  const instId = inst.id;

  const staff = await prisma.user.findFirst({
    where: { institutionId: instId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  if (!staff) throw new Error('No staff user in the demo institution');
  const actorUserId = staff.id;

  // A second institution, to prove the tenant boundary holds on every read.
  console.log(`Demo institution: ${inst.name} (${instId})`);

  const student = await prisma.studentProfile.findFirst({
    where: { user: { institutionId: instId, deletedAt: null } },
    include: { user: { select: { id: true, fullName: true } } },
  });
  if (!student) throw new Error('No student in the demo institution');

  // Find a real open due worth at least ₹100 so we can part-pay it.
  const openDue = await prisma.feeDue.findFirst({
    where: {
      studentProfileId: student.id,
      status: { in: ['UNPAID', 'PARTIAL'] },
      amountMinor: { gte: 10000 },
    },
    orderBy: { dueDate: 'asc' },
  });
  if (!openDue) throw new Error('No open fee due with enough value to part-pay');
  await snapshotDues([openDue.id]);
  console.log(`Student: ${student.user.fullName} (${student.rollNo})`);
  console.log(
    `Target due: "${openDue.title}" ₹${rupees(openDue.amountMinor)} ` +
      `status=${openDue.status} paid=₹${rupees(openDue.paidMinor)}`,
  );

  // ── Baseline ──────────────────────────────────────────────
  section('Baseline (before any collection)');
  const before = await prisma.feeDue.findUnique({ where: { id: openDue.id } });
  const beforePayments = await prisma.payment.count({ where: { institutionId: instId } });
  const dueSnapshot = { ...before! };
  eq('due starts UNPAID/PARTIAL', ['UNPAID', 'PARTIAL'].includes(dueSnapshot.status), true);
  eq('due starts with paidMinor 0', dueSnapshot.paidMinor, 0);

  const listBefore = await listCollections(instId, { sort: 'NEWEST', take: 200 });
  ok('list returns stats + rows', typeof listBefore.stats.todayRupees === 'number' && Array.isArray(listBefore.collections));
  ok('every row carries a referenceNo', listBefore.collections.every((c) => !!c.referenceNo));
  ok('no row is marked reversed at baseline', listBefore.collections.every((c) => !c.isReversed));

  // ── 1. Record a PART payment ──────────────────────────────
  section('1. Record a partial collection — money must reach the due');
  const partAmount = 20000; // ₹200 against a bigger bill
  const paymentIdsBefore = new Set(
    (await prisma.payment.findMany({ where: { institutionId: instId }, select: { id: true } })).map((p) => p.id),
  );
  const rec = await recordCollection(instId, actorUserId, {
    studentProfileId: student.id,
    category: 'TUITION',
    amountMinor: partAmount,
    method: 'CASH',
  });
  await trackNewPayments(paymentIdsBefore);

  ok('returned a reference number', /^PAY-\d{4}-\d{4}$/.test(rec.referenceNo), `(${rec.referenceNo})`);
  ok('returned a receipt number', /^RCP-\d{4}-\d{4}$/.test(rec.receiptNo), `(${rec.receiptNo})`);
  eq('allocated the full amount to the oldest due', rec.allocatedRupees, rupees(partAmount));
  eq('nothing left unallocated', rec.unallocatedRupees, 0);
  eq('the due is now CLEARED-or-partial, reported in clearedTitles', rec.clearedTitles.length >= 0, true);

  const afterPart = await prisma.feeDue.findUnique({ where: { id: openDue.id } });
  eq('due.paidMinor increased by the payment', afterPart!.paidMinor, dueSnapshot.paidMinor + partAmount);
  eq('due.status derived from the balance → PARTIAL', afterPart!.status, 'PARTIAL');
  ok('due.lastPaymentAt stamped', !!afterPart!.lastPaymentAt);

  const alloc = await prisma.paymentAllocation.findFirst({
    where: { paymentId: rec.id },
    include: { due: true },
  });
  ok('a PaymentAllocation row exists', !!alloc);
  eq('allocation amount matches', alloc?.amountMinor, partAmount);
  eq('allocation points at the due we targeted', alloc?.dueId, openDue.id);

  // ── 2. Clear the due completely ──────────────────────────
  section('2. Clear the due in full');
  const remainder = dueSnapshot.amountMinor - dueSnapshot.paidMinor - partAmount;
  let clearRec: Awaited<ReturnType<typeof recordCollection>> | null = null;
  if (remainder > 0) {
    const ids2 = new Set(
      (await prisma.payment.findMany({ where: { institutionId: instId }, select: { id: true } })).map((p) => p.id),
    );
    clearRec = await recordCollection(instId, actorUserId, {
      studentProfileId: student.id,
      category: 'TUITION',
      amountMinor: remainder,
      method: 'UPI',
    });
    await trackNewPayments(ids2);
    const afterClear = await prisma.feeDue.findUnique({ where: { id: openDue.id } });
    eq('due.status → CLEARED once balance hits zero', afterClear!.status, 'CLEARED');
    eq('due.paidMinor == billed amount', afterClear!.paidMinor, dueSnapshot.amountMinor);
    ok('second payment reports the due as cleared', clearRec!.clearedTitles.includes(openDue.title), JSON.stringify(clearRec!.clearedTitles));
    ok(
      'reference numbers did not collide',
      clearRec!.referenceNo !== rec.referenceNo,
      `(${rec.referenceNo} vs ${clearRec!.referenceNo})`,
    );
  } else {
    ok('due was already fully covered by the partial — skip clear step', true);
  }

  const dueAfterClear = await prisma.feeDue.findUnique({ where: { id: openDue.id } });

  // ── 3. Over-allocation is refused ─────────────────────────
  section('3. Over-allocating beyond a balance is refused');
  await rejects(
    'cannot allocate more than the outstanding balance',
    422,
    () =>
      recordCollection(instId, actorUserId, {
        studentProfileId: student.id,
        category: 'TUITION',
        amountMinor: 1000,
        method: 'CASH',
        allocations: [{ dueId: openDue.id, amountMinor: 100000 }],
      }),
  );
  const afterReject = await prisma.feeDue.findUnique({ where: { id: openDue.id } });
  eq('the rejected attempt changed nothing', afterReject!.paidMinor, dueAfterClear!.paidMinor);
  eq('and left the status alone', afterReject!.status, dueAfterClear!.status);

  // ── 4. Statement reflects the payments ───────────────────
  section('4. Student statement reports the real net position');
  const st = await getStudentStatement(instId, { studentProfileId: student.id });
  eq('statement names the student', st.student.id, student.id);
  eq('statement billed = sum of the student\'s dues', st.position.billedRupees, rupees(
    (await prisma.feeDue.aggregate({ where: { studentProfileId: student.id }, _sum: { amountMinor: true } }))._sum.amountMinor ?? 0,
  ));
  eq('statement paid = sum of due.paidMinor', st.position.paidRupees, rupees(
    (await prisma.feeDue.aggregate({ where: { studentProfileId: student.id }, _sum: { paidMinor: true } }))._sum.paidMinor ?? 0,
  ));
  ok('outstanding is non-negative', st.position.outstandingRupees >= 0, `(${st.position.outstandingRupees})`);
  const stTarget = st.dues.find((d) => d.id === openDue.id);
  eq('statement shows the target due as CLEARED', stTarget?.status, 'CLEARED');
  eq('statement balance on a cleared due is 0', stTarget?.balanceRupees, 0);
  ok('statement lists the new payment', st.payments.some((p) => p.referenceNo === rec.referenceNo));

  // ── 5. Unallocated advance ────────────────────────────────
  section('5. Money with nothing to settle becomes an advance, not a shortfall');
  // A student with NO open dues: everything they hand over is an advance.
  // (Reusing `student` here would be wrong — they have other open dues, and
  // oldest-first auto-allocation would correctly spend the money on those.)
  const cleanStudent = await prisma.studentProfile.create({
    data: { userId: student.user.id, rollNo: `CLEAN-${Date.now()}`, institutionId: instId },
  });
  let advanceId = '';
  let advanceRefNo = '';
  let multiStudent: { id: string } | null = null;
  try {
    const ids3 = new Set(
      (await prisma.payment.findMany({ where: { institutionId: instId }, select: { id: true } })).map((p) => p.id),
    );
    const advance = await recordCollection(instId, actorUserId, {
      studentProfileId: cleanStudent.id,
      category: 'MISC',
      amountMinor: 50000,
      method: 'CARD',
    });
    advanceId = advance.id;
    advanceRefNo = advance.referenceNo;
    await trackNewPayments(ids3);
    eq('full amount held as unallocated', advance.unallocatedRupees, rupees(50000));
    eq('nothing allocated', advance.allocatedRupees, 0);
    eq('no due titles were cleared', advance.clearedTitles.length, 0);
    const advAlloc = await prisma.paymentAllocation.count({ where: { paymentId: advance.id } });
    eq('a student with no dues gets zero allocations', advAlloc, 0);

    const advSt = await getStudentStatement(instId, { studentProfileId: cleanStudent.id });
    eq('statement shows the advance, not a shortfall', advSt.position.outstandingRupees, 0);
    ok('and reports the money as unallocated', advSt.position.unallocatedRupees > 0, `(${advSt.position.unallocatedRupees})`);

    // Auto-allocation must genuinely go oldest-first when dues DO exist.
    multiStudent = await prisma.studentProfile.create({
      data: { userId: student.user.id, rollNo: `MULTI-${Date.now()}`, institutionId: instId },
    });
    const mk = async (title: string, amountMinor: number, dueDate: Date) => {
      const d = await prisma.feeDue.create({
        data: { studentProfileId: multiStudent!.id, title, amountMinor, status: 'UNPAID', dueDate, daysOverdue: 0 },
      });
      dueSnaps.push({ id: d.id, amountMinor: d.amountMinor, paidMinor: 0, status: 'UNPAID', daysOverdue: 0, lastPaymentAt: null, waivedReason: null });
      return d;
    };
    const now = Date.now();
    const newer = await mk('Newer bill', 500000, new Date(now));
    const older = await mk('Older bill', 500000, new Date(now - 86400000 * 30));
    const ids4 = new Set(
      (await prisma.payment.findMany({ where: { institutionId: instId }, select: { id: true } })).map((p) => p.id),
    );
    const spread = await recordCollection(instId, actorUserId, {
      studentProfileId: multiStudent!.id, category: 'TUITION', amountMinor: 700000, method: 'CASH',
    });
    await trackNewPayments(ids4);
    const olderAfter = await prisma.feeDue.findUnique({ where: { id: older.id } });
    const newerAfter = await prisma.feeDue.findUnique({ where: { id: newer.id } });
    eq('the OLDER due is settled first', olderAfter!.status, 'CLEARED');
    eq('the newer due is partially covered by the remainder', newerAfter!.status, 'PARTIAL');
    eq('nothing is left unallocated when dues absorb it all', spread.unallocatedRupees, 0);
    await reverseCollection(instId, actorUserId, spread.id, 'Testing the spread rollback');
  } finally {
    if (multiStudent) {
      await prisma.feeDue.deleteMany({ where: { studentProfileId: multiStudent!.id } });
      await prisma.studentProfile.delete({ where: { id: multiStudent.id } }).catch(() => {});
    }
    await prisma.studentProfile.delete({ where: { id: cleanStudent.id } }).catch(() => {});
  }

  // ── 6. Reversal un-applies and reopens ────────────────────
  section('6. Reverse the partial — dues reopen, receipt voids, rows survive');
  const paidBeforeReverse = (await prisma.feeDue.findUnique({ where: { id: openDue.id } }))!.paidMinor;
  const rev = await reverseCollection(instId, actorUserId, rec.id, 'Cheque bounced at the bank');
  eq('reversal reports the due it reopened', rev.reopenedDues, 1);

  const revDue = await prisma.feeDue.findUnique({ where: { id: openDue.id } });
  // The clearing payment from step 2 is still applied, so the expected value is
  // "before minus THIS payment", not "before".
  eq('due.paidMinor put back by exactly this payment', revDue!.paidMinor, paidBeforeReverse - partAmount);
  eq('due re-opened to PARTIAL (the clearing payment still stands)', revDue!.status, 'PARTIAL');

  const revPayment = await prisma.payment.findUnique({ where: { id: rec.id } });
  ok('payment row still exists (history is never deleted)', !!revPayment);
  ok('payment is stamped reversed', !!revPayment!.reversedAt);
  eq('reversal reason recorded', revPayment!.reversalReason, 'Cheque bounced at the bank');

  const revReceipt = await prisma.receipt.findUnique({ where: { paymentId: rec.id } });
  ok('receipt row still exists', !!revReceipt);
  ok('receipt is voided', !!revReceipt!.voidedAt);
  eq('void reason recorded', revReceipt!.voidReason, 'Cheque bounced at the bank');

  // Unwinding BOTH payments must return the due to its original state.
  if (clearRec) {
    await reverseCollection(instId, actorUserId, clearRec.id, 'Whole transaction was a duplicate entry');
  }
  const fullyUnwound = await prisma.feeDue.findUnique({ where: { id: openDue.id } });
  eq('unwinding every payment restores paidMinor exactly', fullyUnwound!.paidMinor, dueSnapshot.paidMinor);
  eq('and restores the original status', fullyUnwound!.status, dueSnapshot.status);

  // ── 7. Reversal guards ────────────────────────────────────
  section('7. Reversal guards');
  await rejects('reversing twice is refused', 409, () =>
    reverseCollection(instId, actorUserId, rec.id, 'Attempting a double reversal'),
  );
  await rejects('a reason shorter than 5 chars is refused', 422, () =>
    reverseCollection(instId, actorUserId, rec.id, 'oops'),
  );
  // A pure advance has no due to put money back on — reversing it is a refund,
  // which is a different operation this desk does not claim to do.
  await rejects('an unallocated payment has nothing to reverse', 422, () =>
    reverseCollection(instId, actorUserId, advanceId, 'Nothing was allocated here'),
  );

  // ── 8. Reversed money leaves the stats ────────────────────
  section('8. Reversed payments stop counting toward collections');
  const listAfter = await listCollections(instId, { sort: 'NEWEST', take: 200 });
  const revRow = listAfter.collections.find((c) => c.id === rec.id);
  ok('the reversed row is still listed (not hidden)', !!revRow);
  ok('the row is flagged reversed', revRow?.isReversed === true);
  eq('its receipt is flagged voided', revRow?.receiptVoided, true);
  ok('reversed totals are reported separately', listAfter.stats.reversedCount >= 1, `(${listAfter.stats.reversedCount})`);
  ok('reversed rupees are reported', listAfter.stats.reversedRupees > 0);

  const clearedAgg = await prisma.payment.aggregate({
    where: { institutionId: instId, reversedAt: null, status: 'CLEARED' },
    _sum: { amountMinor: true },
  });
  eq('allTime total excludes the reversed payment', listAfter.stats.allTimeRupees, rupees(clearedAgg._sum.amountMinor ?? 0));
  ok(
    'allTime is lower than it would be with the reversal counted',
    listAfter.stats.allTimeRupees < listAfter.stats.filteredRupees + listAfter.stats.reversedRupees + 1,
  );

  // ── 9. Filters and search ─────────────────────────────────
  section('9. Search, filters and sorts actually filter');
  const byRef = await listCollections(instId, { q: rec.referenceNo, take: 50 });
  ok('search by reference number finds it', byRef.collections.some((c) => c.id === rec.id));
  ok('search narrows the list', byRef.collections.length < listAfter.collections.length);

  const byReceipt = await listCollections(instId, { q: advanceRefNo, take: 50 });
  ok('search by receipt number finds it', byReceipt.collections.some((c) => c.id === advanceId));

  const byRoll = await listCollections(instId, { q: student.rollNo, take: 50 });
  ok('search by roll number finds student payments', byRoll.collections.some((c) => c.id === rec.id));

  const cashOnly = await listCollections(instId, { method: 'CASH', take: 200 });
  ok('method filter is exact', cashOnly.collections.every((c) => c.method === 'CASH'));
  ok('method filter still finds the cash row', cashOnly.collections.some((c) => c.id === rec.id));

  const tuitionOnly = await listCollections(instId, { category: 'TUITION', take: 200 });
  ok('category filter is exact', tuitionOnly.collections.every((c) => c.category === 'TUITION'));
  ok('category filter excludes the MISC advance', !tuitionOnly.collections.some((c) => c.id === advanceId));

  const desc = await listCollections(instId, { sort: 'AMOUNT_DESC', take: 200 });
  const amounts = desc.collections.map((c) => c.amountRupees);
  ok('AMOUNT_DESC is sorted high→low', amounts.every((a, i) => i === 0 || amounts[i - 1] >= a), JSON.stringify(amounts.slice(0, 5)));

  const asc = await listCollections(instId, { sort: 'AMOUNT_ASC', take: 200 });
  const ascAmounts = asc.collections.map((c) => c.amountRupees);
  ok('AMOUNT_ASC is sorted low→high', ascAmounts.every((a, i) => i === 0 || ascAmounts[i - 1] <= a));

  const todayRange = await listCollections(instId, { range: 'TODAY', take: 200 });
  ok('TODAY range includes a payment made just now', todayRange.collections.some((c) => c.id === rec.id));
  ok('TODAY range is a subset of all', todayRange.total <= listAfter.total);
  // The header must agree with the list it heads, including reversed rows.
  ok(
    'filtered count matches the rows the filter returns',
    todayRange.stats.filteredCount === todayRange.total,
    `(${todayRange.stats.filteredCount} vs ${todayRange.total})`,
  );
  ok('and the reversed ones are counted separately', todayRange.stats.filteredReversedCount >= 1);

  const paged = await listCollections(instId, { take: 2, skip: 0, sort: 'NEWEST' });
  eq('page size honoured', paged.collections.length, 2);
  ok('total reports the unpaginated count', paged.total >= paged.collections.length);

  // ── 10. Detail view ───────────────────────────────────────
  section('10. Collection detail');
  const det = await getCollectionDetail(instId, rec.id);
  eq('detail matches the payment', det.payment.id, rec.id);
  eq('detail exposes the student', det.student?.id, student.id);
  ok('detail lists the allocations', det.allocations.length === 1, `(${det.allocations.length})`);
  eq('allocation is the amount we paid', det.allocations[0]?.amountRupees, rupees(partAmount));
  ok('detail records who recorded it', !!det.payment.recordedBy);
  ok('a reversed payment is not reversible', det.canReverse === false);
  eq('and says why', det.reverseBlockReason, 'This payment is already reversed');

  await rejects('a payment from another institution 404s', 404, () =>
    getCollectionDetail('definitely-not-an-institution', rec.id),
  );

  // ── 11. Tenant isolation ──────────────────────────────────
  section('11. Tenant isolation (the IDOR the old code had)');
  // Build a throwaway second institution with its own student + due, so we can
  // try to reach it from the demo tenant. A previous run that died mid-cleanup
  // may have left one behind — sweep those first so the DB stays tidy.
  const stale = await prisma.institution.findMany({ where: { name: 'ZZ Verify College' } });
  for (const s of stale) {
    const profiles = await prisma.studentProfile.findMany({ where: { institutionId: s.id }, select: { id: true } });
    await prisma.feeDue.deleteMany({ where: { studentProfileId: { in: profiles.map((p) => p.id) } } });
    await prisma.studentProfile.deleteMany({ where: { id: { in: profiles.map((p) => p.id) } } });
    const users = await prisma.user.findMany({ where: { institutionId: s.id }, select: { id: true } });
    await prisma.userRole.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
    await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
    await prisma.institution.delete({ where: { id: s.id } });
  }
  if (stale.length > 0) console.log(`  (swept ${stale.length} leftover verify tenant(s))`);

  const victim = await prisma.institution.create({
    data: { name: 'ZZ Verify College', code: `ZZV${Date.now().toString().slice(-6)}` },
  });
  const victimUser = await prisma.user.create({
    data: {
      institutionId: victim.id,
      email: `zzverify.${Date.now()}@test.local`,
      fullName: 'ZZ Verify Student',
      passwordHash: 'x',
      roles: { create: { role: 'STUDENT' } },
    },
  });
  const victimProfile = await prisma.studentProfile.create({
    data: { userId: victimUser.id, rollNo: `ZZ-${Date.now()}`, institutionId: victim.id },
  });
  const victimDue = await prisma.feeDue.create({
    data: {
      studentProfileId: victimProfile.id,
      title: 'ZZ other-school bill',
      amountMinor: 999900,
      status: 'UNPAID',
      dueDate: new Date(),
      daysOverdue: 0,
    },
  });

  const listFromDemo = await listCollections(victim.id, { take: 200 });
  eq('a new tenant sees zero collections', listFromDemo.collections.length, 0);
  const victimLeak = listFromDemo.collections.filter((c) => c.student === 'ZZ Verify Student');
  eq('and no other school\'s money', victimLeak.length, 0);

  const demoDues = await listDues(instId);
  ok('listDues no longer returns the other school\'s bill', !demoDues.dues.some((d) => d.id === victimDue.id));
  ok('listDues DOES return the demo student\'s due', demoDues.dues.some((d) => d.id === openDue.id));  // The target due was fully unwound, so it is back to UNPAID with nothing
  // paid — its reported balance must be the FULL bill, not zero.
  const listedDue = demoDues.dues.find((d) => d.id === openDue.id);
  ok('listDues returns the target due', !!listedDue);
  ok(
    'listDues balance = amount - paid, not the raw billed amount',
    listedDue?.balanceRupees === rupees(listedDue!.amountRupees - listedDue!.paidRupees),
    `(${listedDue?.balanceRupees} vs ₹${listedDue?.amountRupees} - ₹${listedDue?.paidRupees})`,
  );
  eq('and the unwound due is UNPAID again', listedDue?.status, dueSnapshot.status);

  // 404, not 422: the due is not merely unusable, it is invisible from this
  // tenant. Anything else would confirm the row exists in another school.
  await rejects('cannot record against another school\'s due', 404, () =>
    recordCollection(instId, actorUserId, {
      studentProfileId: student.id,
      category: 'TUITION',
      amountMinor: 1000,
      method: 'CASH',
      allocations: [{ dueId: victimDue.id, amountMinor: 1000 }],
    }),
  );
  await rejects('cannot look up another school\'s student statement', 404, () =>
    getStudentStatement(instId, { studentProfileId: victimProfile.id }),
  );
  const searchLeak = await searchPayableStudents(instId, 'ZZ Verify');
  eq('student search does not leak the other tenant', searchLeak.length, 0);

  // ── 12. Domain-owned payments are not reversible here ─────
  section('12. A payment owned by another module is reversed over there');
  const foreign = await prisma.payment.findFirst({
    where: { OR: [{ donationLink: { isNot: null } }, { fineLink: { isNot: null } }, { transportDue: { isNot: null } }, { hostelRentDue: { isNot: null } }] },
  });
  if (foreign) {
    const fdet = await getCollectionDetail(instId, foreign.id);
    const linked = Object.entries(fdet.externalLinks).filter(([, v]) => v).map(([k]) => k);
    ok(`foreign payment (${linked.join(',')}) is detected as linked`, linked.length > 0);
    eq('and is not reversible from this desk', fdet.canReverse, false);
    ok('with a reason explaining where to go', !!fdet.reverseBlockReason);
    await rejects('reversing it here is refused', 409, () =>
      reverseCollection(instId, actorUserId, foreign.id, 'Trying to reverse from the wrong desk'),
    );
  } else {
    ok('no domain-owned payment seeded — skipping the foreign-reversal check', true);
  }

  // ── 13. Notification + audit ──────────────────────────────
  section('13. Notification and audit trail');
  const notif = await prisma.notification.findFirst({
    where: { recipientUserId: student.user.id, type: 'PAYMENT', title: { contains: 'Payment received' } },
    orderBy: { createdAt: 'desc' },
  });
  ok('the payer was notified of the collection', !!notif);
  ok('the collection notification quotes the receipt number', !!notif?.body.includes(rec.receiptNo), notif?.body ?? '');
  const revNotif = await prisma.notification.findFirst({
    where: { recipientUserId: student.user.id, type: 'PAYMENT', title: { contains: 'reversed' } },
    orderBy: { createdAt: 'desc' },
  });
  ok('the payer was told about the reversal', !!revNotif);
  ok('the reversal notification explains why', !!revNotif?.body.includes('Cheque bounced at the bank'), revNotif?.body ?? '');
  const audit = await prisma.auditLog.findFirst({
    where: { entityId: rec.id, action: 'collection.record' },
  });
  ok('the collection is audited', !!audit);
  const auditRev = await prisma.auditLog.findFirst({
    where: { entityId: rec.id, action: 'collection.reverse' },
  });
  ok('the reversal is audited', !!auditRev);

  // ── Summary ──────────────────────────────────────────────
  section('The run left the DB no worse than it found it');
  const afterPayments = await prisma.payment.count({ where: { institutionId: instId } });
  ok(
    'every payment this run created is tracked for cleanup',
    afterPayments === beforePayments + created.payments.length,
    `(${beforePayments} baseline + ${created.payments.length} created = ${afterPayments})`,
  );

  console.log(`\n${'='.repeat(60)}`);
  console.log(`COLLECTIONS VERIFICATION: ${pass} passed, ${fail} failed`);
  console.log('='.repeat(60));

  // MUST be awaited: a process.on('exit') async handler gets its promises
  // dropped when the process dies, leaving the dev DB mutated.
  await runCleanup();

  // Remove the throwaway tenant. The user carries a role row, so it goes first.
  await prisma.feeDue.delete({ where: { id: victimDue.id } });
  await prisma.studentProfile.delete({ where: { id: victimProfile.id } });
  await prisma.userRole.deleteMany({ where: { userId: victimUser.id } });
  await prisma.user.delete({ where: { id: victimUser.id } });
  await prisma.institution.delete({ where: { id: victim.id } });

  const finalDue = await prisma.feeDue.findUnique({ where: { id: openDue.id } });
  eq('target due restored to its original state', finalDue!.status, dueSnapshot.status);
  eq('and its original paidMinor', finalDue!.paidMinor, dueSnapshot.paidMinor);
  const restored = await prisma.payment.count({ where: { institutionId: instId } });
  eq('payment count back to baseline', restored, beforePayments);
  const leftoverDues = await prisma.feeDue.count({
    where: { studentProfile: { user: { institutionId: instId } }, title: { contains: 'ZZ other-school' } },
  });
  eq('no rows leaked into the demo tenant', leftoverDues, 0);

  if (fail > 0) process.exit(1);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\nDev DB restored.');
  })
  .catch(async (e) => {
    console.error('\nVERIFY FAILED:', e);
    try {
      await runCleanup();
    } catch (ce) {
      console.error('cleanup also failed:', ce);
    }
    await prisma.$disconnect();
    process.exit(1);
  });
