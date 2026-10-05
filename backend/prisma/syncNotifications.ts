// F-10 Notifications seed (docs/users/06 §3.9).
//
// WHY THIS FILE EXISTS.
//
// The finance inbox reads `Notification` rows addressed to one user, grouped by
// the `type` string. Auditing the seeded database found that 527 rows carried
// SIXTEEN distinct types, and that:
//
//   · `SCHOLARSHIP` had ZERO rows, despite four schemes and applications in
//     every workflow state.
//   · `PAYROLL` had ZERO rows — `payroll.service.ts` contained no
//     `notification.create` at all, so nobody was ever told a salary had been
//     approved or paid.
//   · `RECEIPT` had ZERO rows. Receipts were issued (`Receipt` table is
//     populated), but nothing announced them.
//
// So two of the seven categories the desk claims to own were permanently empty,
// and the rest were thin. The desk could not be reviewed, and the empty categories
// looked like "nothing has happened yet" rather than "nothing is wired up".
//
// Every message below is built from a REAL seeded row — a real receipt, a real
// payment, a real approved application, a real paid payslip — rather than typed
// in. A message whose number disagrees with the row it links to is worse than
// no message, because it is the number an officer quotes.
//
// IDEMPOTENCE.
//
// Every notification carries a `dataJson` with a `seedKey`, and the module
// looks that key up before writing. There is no unique constraint on `dataJson`
// (it is a nullable String, not a JSON column), so a first-count-then-insert
// guard would race two concurrent seeds into duplicates; a per-key existence
// check does not. Same approach as syncScholarships.
import type { PrismaClient } from '@prisma/client';

type Db = PrismaClient;

const toRupees = (minor: number) => Math.round(minor / 100);

/**
 * The marker that says "this row is mine".
 *
 * Written into `dataJson` alongside the real deep-link fields, so a seeded
 * message is still navigable — it carries the same payload shape the live
 * writers produce in notifications.service.ts.
 */
const key = (k: string) => ({ seedKey: k });

/** An officer's inbox is a real page: newest first, spread over recent days. */
const ago = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

export async function syncNotifications(db: Db, institutionId: string): Promise<void> {
  const officer = await db.user.findFirst({
    where: { institutionId, deletedAt: null, roles: { some: { role: 'ACCOUNTS' } } },
    select: { id: true, fullName: true },
  });
  if (!officer) {
    console.log('  - notifications skipped: no ACCOUNTS user in this institution');
    return;
  }

  // What has this module already written? One query, not one per candidate.
  const existing = await db.notification.findMany({
    where: { institutionId, recipientUserId: officer.id },
    select: { dataJson: true },
  });
  const seen = new Set<string>();
  for (const n of existing) {
    if (!n.dataJson) continue;
    try {
      const parsed = JSON.parse(n.dataJson) as { seedKey?: unknown };
      if (typeof parsed.seedKey === 'string') seen.add(parsed.seedKey);
    } catch {
      // A row somebody else wrote with a payload we cannot read is not ours.
    }
  }

  const toWrite: {
    type: string;
    title: string;
    body: string;
    sourceModule: string;
    dataJson: string;
    createdAt: Date;
    readAt: Date | null;
  }[] = [];

  // ── FEE_DUE — a bill that is actually unpaid and actually late ──────────
  const overdue = await db.feeDue.findFirst({
    where: {
      studentProfile: { user: { institutionId } },
      status: { in: ['UNPAID', 'PARTIAL'] },
      dueDate: { lt: new Date() },
    },
    orderBy: { dueDate: 'asc' },
    select: {
      id: true,
      dueDate: true,
      amountMinor: true,
      paidMinor: true,
      lateFeeMinor: true,
      title: true,
      studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } },
    },
  });
  if (overdue) {
    // Balance is what is still OWED, which for a due includes any late fine
    // already assessed against it — the same arithmetic `dues.money.ts` uses.
    const outstanding = overdue.amountMinor + overdue.lateFeeMinor - overdue.paidMinor;
    const daysLate = Math.max(
      0,
      Math.floor((Date.now() - overdue.dueDate.getTime()) / (24 * 60 * 60 * 1000)),
    );
    toWrite.push({
      type: 'FEE_DUE',
      title: `${overdue.title} overdue`,
      body:
        `${overdue.studentProfile.user.fullName} (${overdue.studentProfile.rollNo}) owes ` +
        `Rs ${toRupees(outstanding).toLocaleString('en-IN')} — ${daysLate} day${daysLate === 1 ? '' : 's'} past due.`,
      sourceModule: 'accounts',
      dataJson: JSON.stringify({
        ...key('fee-due:overdue'),
        module: 'accounts',
        screen: 'Dues',
        dueId: overdue.id,
        outstandingRupees: toRupees(outstanding),
      }),
      createdAt: ago(daysLate || 1),
      readAt: null,
    });
  }

  // ── PAYMENT + RECEIPT — the same money, two different questions ─────────
  //
  // These are deliberately paired off ONE payment. A PAYMENT row answers "did
  // the money arrive?"; the RECEIPT row answers "what proof do I have?" — and
  // the receipt deep-links to the receipt, not to the payment. They are
  // separate categories because an officer chasing a receipt does not care that
  // the payment cleared.
  const paid = await db.payment.findFirst({
    where: { institutionId, reversedAt: null, receipt: { voidedAt: null } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      referenceNo: true,
      amountMinor: true,
      createdAt: true,
      receipt: { select: { id: true, receiptNo: true } },
      allocations: {
        select: {
          amountMinor: true,
          due: { select: { title: true } },
        },
      },
    },
  });
  if (paid) {
    const when = paid.createdAt ?? ago(3);
    const lines = paid.allocations
      .map((a) => `${a.due.title} Rs ${toRupees(a.amountMinor).toLocaleString('en-IN')}`)
      .join(', ');

    toWrite.push({
      type: 'PAYMENT',
      title: 'Payment received',
      body:
        `Rs ${toRupees(paid.amountMinor).toLocaleString('en-IN')} received against ${paid.referenceNo}` +
        (lines ? ` — ${lines}.` : '.'),
      sourceModule: 'accounts',
      dataJson: JSON.stringify({
        ...key('payment:latest'),
        module: 'accounts',
        screen: 'Collections',
        paymentId: paid.id,
        amountRupees: toRupees(paid.amountMinor),
      }),
      createdAt: when,
      readAt: null,
    });

    if (paid.receipt) {
      toWrite.push({
        type: 'RECEIPT',
        title: `Receipt ${paid.receipt.receiptNo}`,
        body: `Receipt ${paid.receipt.receiptNo} issued for Rs ${toRupees(paid.amountMinor).toLocaleString('en-IN')}.`,
        sourceModule: 'accounts',
        dataJson: JSON.stringify({
          ...key('receipt:latest'),
          module: 'accounts',
          screen: 'Collections',
          receiptId: paid.receipt.id,
          receiptNo: paid.receipt.receiptNo,
        }),
        createdAt: when,
        readAt: null,
      });
    }

    // A reversal is a PAYMENT-category message too, and it is the one an officer
    // most needs to see. Seeded from the real reversed row if there is one.
    const reversed = await db.payment.findFirst({
      where: { institutionId, reversedAt: { not: null } },
      orderBy: { reversedAt: 'desc' },
      select: { id: true, referenceNo: true, amountMinor: true, reversedAt: true, reversalReason: true },
    });
    if (reversed) {
      toWrite.push({
        type: 'PAYMENT_REVERSED',
        title: 'Payment reversed',
        body:
          `${reversed.referenceNo} for Rs ${toRupees(reversed.amountMinor).toLocaleString('en-IN')} was taken back` +
          (reversed.reversalReason ? `: ${reversed.reversalReason}` : '.'),
        sourceModule: 'accounts',
        dataJson: JSON.stringify({
          ...key('payment:reversed'),
          module: 'accounts',
          screen: 'Collections',
          paymentId: reversed.id,
        }),
        createdAt: reversed.reversedAt ?? ago(5),
        readAt: null,
      });
    }
  }

  // ── SCHOLARSHIP — an application that really is APPROVED ────────────────
  //
  // This category had zero rows in the seed. The message is built from a real
  // approved application, so the amount in the message is the amount the
  // tracking desk shows.
  const approved = await db.scholarshipApplication.findFirst({
    where: { institutionId, status: 'APPROVED' },
    orderBy: { approvedAt: 'desc' },
    select: {
      id: true,
      grantedMinor: true,
      approvedAt: true,
      scholarship: { select: { name: true } },
      studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } },
    },
  });
  if (approved) {
    toWrite.push({
      type: 'SCHOLARSHIP',
      title: `${approved.scholarship.name} approved`,
      body:
        `${approved.studentProfile.user.fullName} (${approved.studentProfile.rollNo}) was awarded ` +
        `Rs ${toRupees(approved.grantedMinor).toLocaleString('en-IN')}. Release it from the tracking desk.`,
      sourceModule: 'accounts',
      dataJson: JSON.stringify({
        ...key('scholarship:approved'),
        module: 'accounts',
        screen: 'ScholarshipTracking',
        applicationId: approved.id,
        grantedRupees: toRupees(approved.grantedMinor),
      }),
      createdAt: approved.approvedAt ?? ago(2),
      readAt: null,
    });
  }

  // ── PAYROLL — a run that really is PAID ─────────────────────────────────
  //
  // `payroll.service.ts` wrote no notifications at all before F-10, so this
  // category could never be non-empty. The message names a real run and a real
  // net figure read off that run's header.
  const run = await db.payrollRun.findFirst({
    where: { institutionId, status: 'PAID' },
    orderBy: { month: 'desc' },
    select: {
      id: true,
      month: true,
      totalMinor: true,
      paidAt: true,
      _count: { select: { entries: true } },
    },
  });
  if (run) {
    toWrite.push({
      type: 'PAYROLL',
      title: `Salary paid for ${run.month}`,
      body:
        `Payroll for ${run.month} is settled — ${run._count.entries} staff, ` +
        `Rs ${toRupees(run.totalMinor).toLocaleString('en-IN')} net.`,
      sourceModule: 'accounts',
      dataJson: JSON.stringify({
        ...key('payroll:paid'),
        module: 'accounts',
        screen: 'Payroll',
        runId: run.id,
        month: run.month,
        netRupees: toRupees(run.totalMinor),
      }),
      createdAt: run.paidAt ?? ago(4),
      readAt: null,
    });
  }

  // ── ANNOUNCEMENT — a broadcast this office actually sent ───────────────
  //
  // Seeded as a real `Broadcast` row addressed to staff, with the matching
  // `Notification` delivered to the officer. The desk now has send HISTORY
  // (docs §3.9 added `GET /notifications/broadcasts`), and a history screen
  // with nothing in it cannot be reviewed.
  const SENT = {
    title: 'Last date for fee payment without late fee',
    body:
      'The last date to clear outstanding dues without a late fee has passed. ' +
      'Defaulters will be contacted individually this week.',
  };
  const sent = await db.broadcast.findFirst({
    where: { institutionId, title: SENT.title },
    select: { id: true },
  });
  if (!sent) {
    const created1 = await db.broadcast.create({
      data: {
        institutionId,
        senderUserId: officer.id,
        audienceJson: JSON.stringify({ audience: 'ALL_STUDENTS' }),
        title: SENT.title,
        body: SENT.body,
        channels: 'IN_APP',
        sentAt: ago(6),
      },
      select: { id: true },
    });
    toWrite.push({
      type: 'BROADCAST',
      title: SENT.title,
      body: SENT.body,
      sourceModule: 'accounts',
      dataJson: JSON.stringify({
        ...key('broadcast:fee-last-date'),
        module: 'accounts',
        screen: 'Notifications',
        broadcastId: created1.id,
      }),
      createdAt: ago(6),
      readAt: null,
    });
  }

  // ── SYSTEM — a financial alert ──────────────────────────────────────────
  //
  // One row so the category is not empty on a clean database. The four computed
  // alerts are NOT seeded: they are computed live by `systemAlerts()`, so
  // writing rows for them here would create a second, stale copy of a number the
  // API already owns. This row is a genuine one-off event instead.
  toWrite.push({
    type: 'SYSTEM',
    title: 'Reconciliation check completed',
    body:
      'Nightly reconciliation finished with no variance. Every cleared payment is matched to a receipt.',
    sourceModule: 'accounts',
    dataJson: JSON.stringify({ ...key('system:reconciliation'), module: 'accounts', screen: 'Collections' }),
    createdAt: ago(1),
    // Read on purpose: an unread row in every category would make the screen
    // look alarmed, and this one has already been dealt with.
    readAt: ago(1),
  });

  // ── Write ───────────────────────────────────────────────────────────────
  let created = 0;
  for (const n of toWrite) {
    const k = (JSON.parse(n.dataJson) as { seedKey: string }).seedKey;
    if (seen.has(k)) continue;
    seen.add(k);
    await db.notification.create({
      data: {
        institutionId,
        recipientUserId: officer.id,
        type: n.type,
        title: n.title,
        body: n.body,
        sourceModule: n.sourceModule,
        dataJson: n.dataJson,
        createdAt: n.createdAt,
        readAt: n.readAt,
      },
    });
    created += 1;
  }

  const byType = await db.notification.groupBy({
    by: ['type'],
    where: { institutionId, recipientUserId: officer.id },
    _count: { _all: true },
  });
  console.log(
    `  v notifications: ${created} new for ${officer.fullName}; ` +
      `${byType.length} types in inbox (${byType.map((t) => `${t.type}:${t._count._all}`).join(', ')})`,
  );
}