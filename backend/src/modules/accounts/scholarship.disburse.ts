// F-08 Scholarships — disbursement (docs/users/06 §3.7).
//
// THIS IS THE FIX. The old `disburseScholarship` created a `Payment` with the
// finance officer as `payerUserId` and category `MISC`, which meant:
//
//   · the institution's own outgoing money counted as INCOME in collections and
//     in the ledger, inflating both; and
//   · the student's FeeDue was never touched, so a "disbursed" scholarship left
//     the family still owing the full amount.
//
// A scholarship is money leaving the institution to clear a student's dues. It
// is allocated against `fee_dues` through `scholarship_allocations`, oldest due
// first, and `FeeDue.paidMinor` is raised so the balance actually falls. No
// Payment row is created: the institution paying is not a family paying.
import { prisma } from '../../db/prisma.js';
import { conflict, notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { balanceOf, deriveDueStatus } from './dues.money.js';
import { assertTransition } from './scholarship.rules.js';
import { getApplication, isoDay } from './scholarship.service.js';

/**
 * Release an approved award against the student's open dues.
 *
 * Properties this must hold, because they are what "the money arrived" means:
 *
 *  1. ALLOCATION IS OLDEST-DUE-FIRST and never exceeds the balance of the due it
 *     lands on. Over-allocating would set `paidMinor` above the claim and make
 *     the ledger claim the student overpaid.
 *  2. `disbursedMinor` is RECOMPUTED from the allocation rows, never
 *     incremented, so a retried disbursement cannot double-credit.
 *  3. The disbursement is all-or-nothing: it is one transaction. A half-credited
 *     award is the worst outcome — the desk thinks the money moved and the
 *     student's bill says otherwise.
 *  4. DISBURSED is terminal. The money is against real dues; un-crediting it
 *     would need a reversal, which is a separate, audited action.
 */
export async function disburseApplication(
  institutionId: string,
  actorUserId: string,
  applicationId: string,
  options: { amountRupees?: number | null; note?: string | null } = {},
) {
  const app = await prisma.scholarshipApplication.findFirst({
    where: { id: applicationId, institutionId },
    include: { scholarship: true, studentProfile: { select: { id: true, userId: true, rollNo: true } } },
  });
  if (!app) throw notFound('Application not found');
  assertTransition(app.status, 'DISBURSED');

  const remaining = Math.max(0, app.grantedMinor - app.disbursedMinor);
  if (remaining <= 0) throw conflict('This award is already fully disbursed');

  // A partial release is allowed, but never more than what is left to give.
  let amount = remaining;
  if (options.amountRupees !== null && options.amountRupees !== undefined) {
    amount = Math.round(options.amountRupees * 100);
    if (amount <= 0) throw conflict('Enter an amount greater than zero');
    if (amount > remaining) {
      throw conflict(
        `That is more than this award has left: ₹${Math.round(remaining / 100).toLocaleString('en-IN')} of ₹${Math.round(app.grantedMinor / 100).toLocaleString('en-IN')}`,
      );
    }
  }

  const openDues = await prisma.feeDue.findMany({
    where: { studentProfileId: app.studentProfileId, status: { in: ['UNPAID', 'PARTIAL'] } },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, title: true, amountMinor: true, paidMinor: true, lateFeeMinor: true, status: true },
  });

  const totalOutstanding = openDues.reduce((s, d) => s + balanceOf(d), 0);
  if (totalOutstanding <= 0) {
    throw conflict(`${app.studentProfile.rollNo} owes nothing right now, so there is no bill for this award to clear`);
  }

  // Allocate oldest-first, capped by what is actually owed on each due.
  const plan: { dueId: string; title: string; take: number }[] = [];
  let left = amount;
  for (const d of openDues) {
    if (left <= 0) break;
    const bal = balanceOf(d);
    if (bal <= 0) continue;
    const take = Math.min(bal, left);
    plan.push({ dueId: d.id, title: d.title, take });
    left -= take;
  }

  if (left > 0) {
    throw conflict(
      `Only ₹${Math.round((amount - left) / 100).toLocaleString('en-IN')} of this student's dues can be credited — they owe ₹${Math.round(totalOutstanding / 100).toLocaleString('en-IN')} in total`,
    );
  }

  const credited = plan.reduce((s, p) => s + p.take, 0);

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const due = await tx.feeDue.findUnique({ where: { id: p.dueId }, select: { amountMinor: true, paidMinor: true, lateFeeMinor: true, status: true } });
      if (!due) throw notFound(`Fee due ${p.dueId} no longer exists`);

      const paidAfter = due.paidMinor + p.take;
      const balanceAfter = Math.max(0, due.amountMinor + (due.lateFeeMinor ?? 0) - paidAfter);
      const statusAfter = deriveDueStatus({
        status: due.status,
        amountMinor: due.amountMinor,
        paidMinor: paidAfter,
        lateFeeMinor: due.lateFeeMinor,
      });

      await tx.feeDue.update({
        where: { id: p.dueId },
        data: { paidMinor: paidAfter, status: statusAfter, lastPaymentAt: new Date() },
      });

      await tx.scholarshipAllocation.upsert({
        where: { applicationId_feeDueId: { applicationId: app.id, feeDueId: p.dueId } },
        create: { applicationId: app.id, feeDueId: p.dueId, amountMinor: p.take, balanceAfterMinor: balanceAfter },
        // Re-crediting the same due ADDS to what was already credited. Overwriting
        // it would lose the earlier credit and make `disbursedMinor` disagree with
        // the allocations it is supposed to be the sum of.
        update: { amountMinor: { increment: p.take }, balanceAfterMinor: balanceAfter },
      });
    }

    // Recomputed from the rows, never incremented.
    const total = await tx.scholarshipAllocation.aggregate({
      where: { applicationId: app.id },
      _sum: { amountMinor: true },
    });
    const disbursed = total._sum.amountMinor ?? 0;
    const settled = disbursed >= app.grantedMinor;

    await tx.scholarshipApplication.update({
      where: { id: app.id },
      data: {
        disbursedMinor: disbursed,
        status: settled ? 'DISBURSED' : 'APPROVED',
        disbursedAt: settled ? new Date() : null,
        disbursedByUserId: settled ? actorUserId : app.disbursedByUserId,
      },
    });

    await tx.scholarshipApplicationEvent.create({
      data: {
        applicationId: app.id,
        fromStatus: app.status,
        toStatus: settled ? 'DISBURSED' : 'APPROVED',
        actorUserId,
        note:
          options.note?.trim() ||
          `Credited ₹${Math.round(credited / 100).toLocaleString('en-IN')} against ${plan.length} due${plan.length === 1 ? '' : 's'}${settled ? '' : ' (part disbursed)'}`,
      },
    });
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: app.studentProfile.userId,
      type: 'SCHOLARSHIP',
      title: `Scholarship credited: ${app.scholarship.name}`,
      body: `₹${Math.round(credited / 100).toLocaleString('en-IN')} has been credited against your fee dues for ${plan.map((p) => p.title).join(', ')}.`,
      sourceModule: 'accounts',
    },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'scholarship.disburse',
    entityType: 'ScholarshipApplication',
    entityId: app.id,
    before: { status: app.status, disbursedMinor: app.disbursedMinor, studentOutstandingMinor: totalOutstanding },
    after: {
      status: app.status,
      creditedMinor: credited,
      allocations: plan.map((p) => ({ title: p.title, amountMinor: p.take })),
      studentOutstandingMinor: totalOutstanding - credited,
    },
  });

  return getApplication(institutionId, app.id);
}

/**
 * Undo a disbursement — the reversal path. It restores each due's `paidMinor`
 * and RE-DERIVES the status from the money, because a due that was cleared by a
 * scholarship has to stop being cleared the moment the credit is reversed.
 */
export async function reverseDisbursement(
  institutionId: string,
  actorUserId: string,
  applicationId: string,
  reason: string,
) {
  if (!reason?.trim() || reason.trim().length < 5) {
    throw conflict('Give a reason for reversing this disbursement');
  }
  const app = await prisma.scholarshipApplication.findFirst({
    where: { id: applicationId, institutionId },
    include: { allocations: true },
  });
  if (!app) throw notFound('Application not found');
  if (!app.disbursedMinor || app.disbursedMinor <= 0) throw conflict('Nothing has been disbursed on this award');
  if (app.status === 'DISBURSED') {
    throw conflict('A settled award cannot be reversed here — raise it as an adjustment so the audit trail records why');
  }

  await prisma.$transaction(async (tx) => {
    for (const alloc of app.allocations) {
      const due = await tx.feeDue.findUnique({
        where: { id: alloc.feeDueId },
        select: { amountMinor: true, paidMinor: true, lateFeeMinor: true, status: true },
      });
      if (!due) continue;
      // Clamp: the due may have been partly paid by a real payment since, and
      // subtracting a scholarship credit from money that is no longer there
      // would produce a negative paidMinor.
      const paidAfter = Math.max(0, due.paidMinor - alloc.amountMinor);
      const statusAfter = deriveDueStatus({
        status: due.status,
        amountMinor: due.amountMinor,
        paidMinor: paidAfter,
        lateFeeMinor: due.lateFeeMinor,
      });
      await tx.feeDue.update({ where: { id: alloc.feeDueId }, data: { paidMinor: paidAfter, status: statusAfter } });
    }
    await tx.scholarshipAllocation.deleteMany({ where: { applicationId: app.id } });
    await tx.scholarshipApplication.update({
      where: { id: app.id },
      data: { disbursedMinor: 0, disbursedAt: null, status: 'APPROVED' },
    });
    await tx.scholarshipApplicationEvent.create({
      data: { applicationId: app.id, fromStatus: app.status, toStatus: 'APPROVED', actorUserId, note: `Reversed: ${reason.trim()}` },
    });
  });

  await writeAudit({ actorUserId, institutionId, action: 'scholarship.disburse.reverse', entityType: 'ScholarshipApplication', entityId: app.id, before: { disbursedMinor: app.disbursedMinor }, after: { disbursedMinor: 0, reason: reason.trim() } });
  return getApplication(institutionId, app.id);
}

/** What a scheme's money has done, across every application it holds. */
export async function amountTracking(institutionId: string) {
  const schemes = await prisma.scholarship.findMany({
    where: { institutionId },
    include: { academicYear: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const rows = await Promise.all(
    schemes.map(async (s) => {
      const apps = await prisma.scholarshipApplication.findMany({
        where: { scholarshipId: s.id },
        select: { status: true, grantedMinor: true, disbursedMinor: true, requestedMinor: true },
      });
      let committed = 0;
      let disbursed = 0;
      let requested = 0;
      let settledGranted = 0;
      for (const a of apps) {
        requested += a.requestedMinor;
        // The SAME definitions as `schemeTotals` in scholarship.service.ts, so
        // the tracking screen and the scheme list can never disagree about what
        // "committed" means for the same scheme.
        if (a.status === 'APPROVED' || a.status === 'UNDER_REVIEW') committed += a.grantedMinor;
        if (a.status === 'DISBURSED') {
          settledGranted += a.grantedMinor;
          disbursed += a.disbursedMinor;
        }
      }
      // What the scheme has promised in total: each rupee counted once.
      const awards = committed + settledGranted;
      const budget = s.budgetMinor;
      return {
        schemeId: s.id,
        name: s.name,
        type: s.type,
        academicYear: s.academicYear.name,
        status: s.status,
        amountMode: s.amountMode,
        awardPercent: s.awardPercent,
        budgetRupees: budget === null ? null : Math.round(budget / 100),
        requestedRupees: Math.round(requested / 100),
        committedRupees: Math.round(committed / 100),
        disbursedRupees: Math.round(disbursed / 100),
        awardedRupees: Math.round(awards / 100),
        headroomRupees: budget === null ? null : Math.round(Math.max(0, budget - awards) / 100),
        utilisationPercent: budget ? Math.min(100, Math.round((awards / budget) * 100)) : null,
        // Share of the budget that has actually reached a student's bill, as
        // opposed to merely been approved. An approved-but-undisbursed award is
        // money the desk has promised and not yet moved.
        disbursementPercent: awards > 0 ? Math.round((disbursed / awards) * 100) : null,
        capacity: s.capacity,
        awardsCount: awards,
      };
    }),
  );

  const sum = (pick: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + (pick(r) ?? 0), 0);
  return {
    schemes: rows,
    totals: {
      budgetRupees: sum((r) => r.budgetRupees ?? 0),
      committedRupees: sum((r) => r.committedRupees),
      disbursedRupees: sum((r) => r.disbursedRupees),
      awardedRupees: sum((r) => r.awardedRupees),
      headroomRupees: sum((r) => r.headroomRupees ?? 0),
    },
  };
}

/** Everything one student has been awarded, across every scheme and year. */
export async function studentHistory(institutionId: string, studentProfileId: string) {
  const student = await prisma.studentProfile.findFirst({
    where: { id: studentProfileId, user: { institutionId, deletedAt: null } },
    include: { user: { select: { fullName: true, email: true } } },
  });
  if (!student) throw notFound('Student not found in this institution');

  const apps = await prisma.scholarshipApplication.findMany({
    where: { institutionId, studentProfileId },
    include: {
      scholarship: { select: { id: true, name: true, type: true, academicYear: { select: { name: true } } } },
      allocations: { include: { feeDue: { select: { title: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const openDues = await prisma.feeDue.findMany({
    where: { studentProfileId, status: { in: ['UNPAID', 'PARTIAL'] } },
    select: { amountMinor: true, paidMinor: true, lateFeeMinor: true },
  });

  const awarded = apps.reduce((s, a) => s + (a.status === 'APPROVED' || a.status === 'DISBURSED' ? a.grantedMinor : 0), 0);
  const received = apps.reduce((s, a) => s + a.disbursedMinor, 0);

  return {
    student: {
      id: student.id,
      name: student.user.fullName,
      email: student.user.email,
      rollNo: student.rollNo,
      currentSemester: student.currentSemester,
      status: student.status,
    },
    applications: apps.map((a) => ({
      id: a.id,
      status: a.status,
      scheme: a.scholarship.name,
      schemeType: a.scholarship.type,
      academicYear: a.scholarship.academicYear.name,
      requestedRupees: Math.round(a.requestedMinor / 100),
      awardedRupees: Math.round(a.grantedMinor / 100),
      receivedRupees: Math.round(a.disbursedMinor / 100),
      appliedAt: isoDay(a.createdAt),
      approvedAt: isoDay(a.approvedAt),
      disbursedAt: isoDay(a.disbursedAt),
      rejectedReason: a.rejectedReason,
      creditedAgainst: a.allocations.map((x) => ({
        dueTitle: x.feeDue.title,
        amountRupees: Math.round(x.amountMinor / 100),
      })),
    })),
    totals: {
      applications: apps.length,
      awardedRupees: Math.round(awarded / 100),
      receivedRupees: Math.round(received / 100),
      // What the desk has promised but not yet put against a bill.
      awaitingRupees: Math.round((awarded - received) / 100),
      outstandingRupees: Math.round(openDues.reduce((s, d) => s + balanceOf(d), 0) / 100),
    },
  };
}