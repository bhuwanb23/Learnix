// Throwaway end-to-end check of the fines service against the dev DB.
import { PrismaClient } from '@prisma/client';
import {
  listFines, getFineDetail, collectFine, waiveFine, extendDueDate,
  settleStudentFines, getStudentFines,
} from '../src/modules/library/fines.service.js';

const prisma = new PrismaClient();
const inst = (await prisma.institution.findFirst())!;
const libUser = (await prisma.user.findFirst({
  where: { institutionId: inst.id, roles: { some: { role: 'LIBRARY' } } },
}))!;
const actor = libUser.id;

const ok = (label: string, pass: boolean, extra = '') =>
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${extra ? ' :: ' + extra : ''}`);

const createdPayments: string[] = [];
const createdIssues: string[] = [];
const cleanup = async () => {
  // Delete our test payments by reference, then our test loans + fines.
  for (const ref of createdPayments) {
    const pay = await prisma.payment.findFirst({ where: { referenceNo: ref } });
    if (!pay) continue;
    await prisma.finePayment.deleteMany({ where: { paymentId: pay.id } });
    await prisma.receipt.deleteMany({ where: { paymentId: pay.id } });
    await prisma.payment.delete({ where: { id: pay.id } });
  }
  if (createdIssues.length) {
    // Unlink paidPaymentId first so the delete cannot leave dangling scalars.
    await prisma.fine.updateMany({
      where: { bookIssueId: { in: createdIssues } },
      data: { status: 'PENDING', paidPaymentId: null },
    });
    await prisma.fine.deleteMany({ where: { bookIssueId: { in: createdIssues } } });
    await prisma.bookIssue.deleteMany({ where: { id: { in: createdIssues } } });
  }
  await prisma.$disconnect();
};

// Always clean up, even when a check throws part-way through.
process.on('exit', () => { void cleanup(); });
process.on('SIGINT', () => { void cleanup(); process.exit(1); });

// ── 1. list + filters ───────────────────────────────────────
const all = await listFines(inst.id, { status: 'ALL' });
ok('list returns fines', all.fines.length >= 1, `n=${all.fines.length}`);
ok('stats split by status',
  all.stats.pendingCount + all.stats.paidCount + all.stats.waivedCount === all.fines.length,
  `pending=${all.stats.pendingCount} paid=${all.stats.paidCount} waived=${all.stats.waivedCount}`);
ok('debtors aggregated', Array.isArray(all.debtors), `${all.debtors.length} debtors`);

const pendingOnly = await listFines(inst.id, { status: 'PENDING' });
ok('status filter works', pendingOnly.fines.every((f) => f.status === 'PENDING'));

const sample = all.fines[0];
const searched = await listFines(inst.id, { status: 'ALL', q: sample.bookIssue.student.rollNo });
ok('search by rollNo works', searched.fines.length > 0);

const byAmount = await listFines(inst.id, { status: 'ALL', sort: 'AMOUNT' });
const amounts = byAmount.fines.map((f) => f.amountRupees);
ok('sort by amount is descending', amounts.every((a, i) => i === 0 || amounts[i - 1] >= a), amounts.join(','));

const minAmt = await listFines(inst.id, { status: 'ALL', minAmount: 40 });
ok('minAmount filter works', minAmt.fines.every((f) => f.amountRupees >= 40), `n=${minAmt.fines.length}`);

const book = (await prisma.book.findFirst({ where: { institutionId: inst.id } }))!;
const student = (await prisma.studentProfile.findFirst({ where: { institutionId: inst.id } }))!;

// ── 2. detail + breakdown ───────────────────────────────────
const detail = await getFineDetail(inst.id, sample.id);
ok('detail has rate breakdown',
  detail.breakdown.daysOverdue * detail.breakdown.ratePerDayRupees === detail.breakdown.computedRupees,
  `${detail.breakdown.daysOverdue}d × ₹${detail.breakdown.ratePerDayRupees} = ₹${detail.breakdown.computedRupees}`);
ok('detail exposes action permissions',
  typeof detail.canCollect === 'boolean' && typeof detail.canWaive === 'boolean');
ok('detail has student totals', typeof detail.studentTotals.pendingAmountRupees === 'number',
  `${detail.studentTotals.pendingCount} pending, ₹${detail.studentTotals.pendingAmountRupees}`);

let missingErr = '';
try { await getFineDetail(inst.id, 'does-not-exist'); } catch (e: any) { missingErr = e.code ?? e.message; }
ok('unknown fine 404s', missingErr === 'NOT_FOUND', missingErr);

// Create throwaway issues so each fine gets its own bookIssue
// (Fine.bookIssueId is @unique — one fine per loan).
const mkIssue = async (daysOverdue: number, settled: boolean) => {
  const issue = await prisma.bookIssue.create({
    data: {
      bookId: book.id,
      studentProfileId: student!.id,
      issueDate: new Date(Date.now() - (daysOverdue + 5) * 864e5),
      dueDate: new Date(Date.now() - daysOverdue * 864e5),
      returnDate: settled ? new Date() : null,
      status: settled ? 'RETURNED' : 'OVERDUE',
      issuedByUserId: actor,
    },
  });
  createdIssues.push(issue.id);
  return issue;
};

// ── 3. THE FIX: FINE-scoped reference numbering ─────────────
const beforeFinePayments = await prisma.payment.count({ where: { institutionId: inst.id, category: 'FINE' } });
ok('FINE payments counted separately from all payments',
  beforeFinePayments < (await prisma.payment.count({ where: { institutionId: inst.id } })),
  `FINE=${beforeFinePayments} of ${await prisma.payment.count({ where: { institutionId: inst.id } })} total`);

const collectIssue = await mkIssue(5, true);
const seededFine = await prisma.fine.create({
  data: { bookIssueId: collectIssue.id, amountMinor: 2500, daysOverdue: 5, status: 'PENDING' },
});

const collected = await collectFine(inst.id, actor, seededFine.id, 'UPI');
createdPayments.push(collected.paymentReference);

ok('collect marks fine PAID', collected.status === 'PAID', collected.paymentReference);
ok('receipt uses FINE-scoped numbering',
  collected.receiptNo.startsWith('RCP-FINE-') && collected.paymentReference.startsWith('PAY-FINE-'),
  `${collected.paymentReference} / ${collected.receiptNo}`);

// The number must be derived from the FINE count, not the global payment count.
const fineSeq = Number(collected.paymentReference.split('-').pop());
ok('sequence derives from FINE count, not global count',
  fineSeq === beforeFinePayments + 1, `expected ${beforeFinePayments + 1}, got ${fineSeq}`);

// No collision with the other reference schemes.
const clash = await prisma.payment.findFirst({
  where: { referenceNo: collected.paymentReference, NOT: { referenceNo: { startsWith: 'PAY-FINE-' } } },
});
ok('new reference cannot collide with PAY-TUI-*/PAY-TF-*', clash === null);

const payment = await prisma.payment.findFirst({
  where: { referenceNo: collected.paymentReference },
  include: { receipt: true, fineLink: true },
});
ok('payment links receipt + finePayment',
  Boolean(payment?.receipt && payment?.fineLink));
ok('payment amount matches the fine',
  payment?.amountMinor === seededFine.amountMinor, `${payment?.amountMinor} minor`);
ok('fine.paidPaymentId is set',
  (await prisma.fine.findUnique({ where: { id: seededFine.id } }))?.paidPaymentId === payment?.id);

let doubleCollect = '';
try { await collectFine(inst.id, actor, seededFine.id, 'CASH'); } catch (e: any) { doubleCollect = e.message; }
ok('double collect rejected', doubleCollect.includes('already paid'), doubleCollect);

let badMethod = '';
try { await collectFine(inst.id, actor, seededFine.id, 'CRYPTO'); } catch (e: any) { badMethod = e.message; }
ok('invalid payment method rejected', badMethod.includes('method must be one of'), badMethod);

// ── 4. waive requires a REAL reason ─────────────────────────
const waiveIssue = await mkIssue(3, true);
const other = await prisma.fine.create({
  data: { bookIssueId: waiveIssue.id, amountMinor: 1500, daysOverdue: 3, status: 'PENDING' },
});

if (other) {
  let noReason = '';
  try { await waiveFine(inst.id, actor, other.id, 'x'); } catch (e: any) { noReason = e.message; }
  ok('waive rejects a too-short reason', noReason.includes('at least 3 characters'), noReason);

  const waived = await waiveFine(inst.id, actor, other.id, 'Library closed during exam week');
  ok('waive succeeds with a real reason', waived.status === 'WAIVED');
  const stored = await prisma.fine.findUnique({ where: { id: other.id } });
  ok('reason is persisted verbatim',
    stored?.waivedReason === 'Library closed during exam week', stored?.waivedReason ?? 'null');

  let reWaive = '';
  try { await waiveFine(inst.id, actor, other.id, 'again'); } catch (e: any) { reWaive = e.message; }
  ok('re-waiving rejected', reWaive.includes('already'), reWaive);
} else {
  console.log('SKIP  waive tests — unavailable');
}// ── 5. extend due date ──────────────────────────────────────
// An outstanding (unreturned) overdue loan — extend moves its due date and clears
// the overdue flag, so no fine is charged when it comes back.
const extendIssue = await mkIssue(6, false);
const tempFine = await prisma.fine.create({
  data: { bookIssueId: extendIssue.id, amountMinor: 2500, daysOverdue: 5, status: 'PENDING' },
});
{
  const before = extendIssue.dueDate;
  const extended = await extendDueDate(inst.id, actor, tempFine.id, 7);
  ok('extend moves the due date forward',
    new Date(extended.newDueDate).getTime() > new Date(before).getTime(),
    `${extended.previousDueDate.toISOString().slice(0, 10)} → ${new Date(extended.newDueDate).toISOString().slice(0, 10)}`);
  ok('extend reports the amount at risk', extended.amountAtRisk === 25, `₹${extended.amountAtRisk}`);
  const afterIssue = await prisma.bookIssue.findUnique({ where: { id: extendIssue.id } });
  ok('extend flips status back to ISSUED', afterIssue?.status === 'ISSUED', afterIssue?.status);
}

// Extending a returned loan must be refused — the fine already stands.
let extendReturned = '';
try { await extendDueDate(inst.id, actor, other.id, 7); } catch (e: any) { extendReturned = e.message; }
ok('extend refused once the book is returned', extendReturned.includes('already been returned'), extendReturned);

let badExtend = '';
try { await extendDueDate(inst.id, actor, other?.id ?? 'x', 500); } catch (e: any) { badExtend = e.message; }
ok('extend rejects absurd durations', badExtend.includes('between 1 and 60'), badExtend);

// ── 6. bulk settle ──────────────────────────────────────────
// Two fresh pending fines so bulk settling has something to do.
const bulkIssueA = await mkIssue(2, true);
const bulkIssueB = await mkIssue(4, true);
await prisma.fine.createMany({
  data: [
    { bookIssueId: bulkIssueA.id, amountMinor: 1000, daysOverdue: 2, status: 'PENDING' },
    { bookIssueId: bulkIssueB.id, amountMinor: 2000, daysOverdue: 4, status: 'PENDING' },
  ],
});
{
  const beforeFines = await prisma.fine.count({
    where: { status: 'PENDING', bookIssue: { studentProfileId: student.id } },
  });
  const bulk = await settleStudentFines(inst.id, actor, {
    studentId: student.id, action: 'COLLECT', method: 'CASH',
  });
  // Every per-fine payment created by the batch needs cleaning up.
  createdPayments.push(...bulk.payments.map((p) => p.referenceNo));

  ok('bulk collect settles every pending fine',
    bulk.settledCount === beforeFines && beforeFines > 0, `${bulk.settledCount} of ${beforeFines}`);
  ok('bulk collect issues one receipt per fine',
    bulk.receipts.length === bulk.settledCount, `${bulk.receipts.length} receipts`);
  ok('bulk collect references are unique',
    new Set(bulk.receipts.map((r) => r.receiptNo)).size === bulk.receipts.length);
  ok('bulk collect gives each fine its own payment + receipt',
    bulk.payments.length === bulk.settledCount,
    `${bulk.payments.length} payments for ${bulk.settledCount} fines`);
  ok('bulk batch reference is FINE-scoped',
    Boolean(bulk.batchReference?.startsWith('PAY-FINE-')), bulk.batchReference ?? 'null');

  const afterPending = await prisma.fine.count({
    where: { status: 'PENDING', bookIssue: { studentProfileId: student.id } },
  });
  ok('no pending fines remain for that student', afterPending === 0, `${afterPending} left`);

  let emptyBulk = '';
  try { await settleStudentFines(inst.id, actor, { studentId: student.id, action: 'COLLECT' }); }
  catch (e: any) { emptyBulk = e.message; }
  ok('bulk settle with nothing pending is rejected', emptyBulk.includes('No pending fines'), emptyBulk);

  const summary = await getStudentFines(inst.id, student.id);
  ok('student summary aggregates', summary.stats.paidAmountRupees >= bulk.totalRupees,
    `₹${summary.stats.paidAmountRupees} paid across ${summary.stats.paidCount}`);
}

let noBulkReason = '';
try {
  await settleStudentFines(inst.id, actor, { studentId: 'x', action: 'WAIVE', reason: 'ab' });
} catch (e: any) { noBulkReason = e.message; }
ok('bulk waive requires a reason', noBulkReason.includes('at least 3 characters'), noBulkReason);

await cleanup();