// Payment plans / instalments for the dues desk.
// Docs: 06-accounts-finance.md §3.3 "Payment-plan / installment tracking"
//
// A plan REPLACES the original bill with N real `FeeDue` rows, one per
// instalment, and marks the parent SUPERSEDED.
//
// That is the whole design decision, so it is worth stating why. The obvious
// alternative — keep one due and store a schedule beside it — produces a plan
// nobody can act on: the instalments would not age, so the aging strip would lie
// about how much of the book is actually late; they would not be collectable, so
// the counter could not take the first instalment against them; and each one
// would need its own waive/remind path. Making them ordinary dues means all of
// that comes for free, and a counter clerk collecting "instalment 2" is doing the
// same thing they do for every other bill.
//
// What the parent keeps is its identity, so the desk can still show the original
// bill and the agreement behind it.
import { prisma } from '../../db/prisma.js';
import { badRequest, conflict, notFound, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { balanceOf, deriveDueStatus, daysPastDue, isOpenStatus, toRupees } from './dues.money.js';

export type PlanFrequency = 'MONTHLY' | 'FORTNIGHTLY' | 'WEEKLY';
const FREQUENCY_DAYS: Record<PlanFrequency, number> = {
  MONTHLY: 30,
  FORTNIGHTLY: 14,
  WEEKLY: 7,
};

export const PLAN_FREQUENCIES: Array<{ id: PlanFrequency; label: string; days: number }> = [
  { id: 'MONTHLY', label: 'Every month', days: 30 },
  { id: 'FORTNIGHTLY', label: 'Every 2 weeks', days: 14 },
  { id: 'WEEKLY', label: 'Every week', days: 7 },
];

/**
 * Split an amount into `count` parts that SUM EXACTLY to it.
 *
 * Naively dividing and rounding loses or invents paise: ₹10,000 over 3 becomes
 * 3333.33 × 3 = 9,999.99, and a plan whose instalments do not add up to the
 * agreed total is an argument at the counter. The remainder is spread one paise
 * at a time over the earliest instalments, so the total is preserved to the
 * paisa and no instalment is ever ₹0.
 */
export function splitAmount(totalMinor: number, count: number): number[] {
  const base = Math.floor(totalMinor / count);
  const remainder = totalMinor - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

type PlanRow = {
  id: string;
  institutionId: string;
  parentDueId: string;
  totalMinor: number;
  count: number;
  frequency: string;
  startDate: Date;
  note: string | null;
  status: string;
  createdAt: Date;
  cancelledAt: Date | null;
  cancelReason: string | null;
  children: Array<{
    id: string;
    title: string;
    amountMinor: number;
    paidMinor: number;
    lateFeeMinor: number | null;
    status: string;
    dueDate: Date;
    installmentSequence: number | null;
    daysOverdue: number;
  }>;
};

/** Turn a plan row into the shape the screens render, with live progress. */
function shapePlan(plan: PlanRow, opts: { withChildren?: boolean } = {}) {
  const children = plan.children
    .slice()
    .sort((a, b) => (a.installmentSequence ?? 0) - (b.installmentSequence ?? 0));

  const settled = children.filter((c) => {
    const s = deriveDueStatus(c);
    return s === 'CLEARED' || s === 'WAIVED';
  });
  const paidMinor = children.reduce((s, c) => s + c.paidMinor, 0);
  const claimedMinor = children.reduce((s, c) => s + c.amountMinor + (c.lateFeeMinor ?? 0), 0);
  const nextDue = children.find((c) => isOpenStatus(deriveDueStatus(c)));
  const overdueCount = children.filter((c) => isOpenStatus(deriveDueStatus(c)) && daysPastDue(c.dueDate) > 0).length;

  return {
    id: plan.id,
    parentDueId: plan.parentDueId,
    totalRupees: toRupees(plan.totalMinor),
    count: plan.count,
    frequency: plan.frequency,
    frequencyLabel: PLAN_FREQUENCIES.find((f) => f.id === plan.frequency)?.label ?? 'Monthly',
    startDate: plan.startDate,
    note: plan.note,
    status: plan.status,
    createdAt: plan.createdAt,
    cancelledAt: plan.cancelledAt,
    cancelReason: plan.cancelReason,
    paidRupees: toRupees(paidMinor),
    balanceRupees: toRupees(Math.max(0, claimedMinor - paidMinor)),
    settledCount: settled.length,
    overdueCount,
    // Percentage of the agreed total that has actually landed. Computed from
    // claimed rather than from `plan.totalMinor` because a fine on one instalment
    // changes what "the whole plan" costs.
    progressPercent: claimedMinor > 0 ? Math.round((paidMinor / claimedMinor) * 100) : 0,
    nextDueId: nextDue?.id ?? null,
    nextDueDate: nextDue?.dueDate ?? null,
    nextDueRupees: nextDue ? toRupees(balanceOf(nextDue)) : 0,
    complete: plan.status === 'COMPLETED' || (children.length > 0 && settled.length === children.length),
    ...(opts.withChildren
      ? {
          installments: children.map((c) => ({
            id: c.id,
            sequence: c.installmentSequence,
            title: c.title,
            amountRupees: toRupees(c.amountMinor),
            lateFeeRupees: toRupees(c.lateFeeMinor ?? 0),
            paidRupees: toRupees(c.paidMinor),
            balanceRupees: toRupees(balanceOf(c)),
            dueDate: c.dueDate,
            daysOverdue: isOpenStatus(deriveDueStatus(c)) ? daysPastDue(c.dueDate) : 0,
            status: deriveDueStatus(c),
          })),
        }
      : {}),
  };
}

async function loadPlan(institutionId: string, planId: string) {
  const plan = await prisma.installmentPlan.findFirst({
    where: { id: planId, institutionId },
    include: {
      children: {
        select: {
          id: true,
          title: true,
          amountMinor: true,
          paidMinor: true,
          lateFeeMinor: true,
          status: true,
          dueDate: true,
          installmentSequence: true,
          daysOverdue: true,
        },
      },
    },
  });
  if (!plan) throw notFound('Payment plan not found');
  return plan as unknown as PlanRow;
}

/**
 * The plan attached to a due id, looked up in whichever direction applies.
 * Tenant-scoped through the due itself, so a plan id from another institution
 * resolves to nothing rather than to someone else's schedule.
 */
export async function getDuePlan(institutionId: string, dueId: string) {
  const due = await prisma.feeDue.findFirst({
    where: { id: dueId, studentProfile: { user: { institutionId, deletedAt: null } } },
    select: {
      id: true,
      title: true,
      amountMinor: true,
      paidMinor: true,
      installmentPlanId: true,
      supersededByPlanId: true,
    },
  });
  if (!due) throw notFound('Fee due not found');
  const plan = await getPlanForDue(institutionId, due);
  return {
    dueId: due.id,
    dueTitle: due.title,
    isInstallment: due.installmentPlanId != null,
    wasReplaced: due.supersededByPlanId != null,
    plan,
  };
}

/** The plan a given due belongs to — as an instalment, or as the replaced parent. */
export async function getPlanForDue(institutionId: string, due: {
  installmentPlanId: string | null;
  supersededByPlanId: string | null;
}) {
  const planId = due.installmentPlanId ?? due.supersededByPlanId;
  if (!planId) return null;
  try {
    return shapePlan(await loadPlan(institutionId, planId), { withChildren: true });
  } catch {
    // A dangling plan id must not take the whole due-detail screen down; the
    // bill is still perfectly readable without its plan.
    return null;
  }
}

export async function listPlans(institutionId: string, opts: { status?: string } = {}) {
  const plans = await prisma.installmentPlan.findMany({
    where: { institutionId, ...(opts.status && opts.status !== 'ALL' ? { status: opts.status } : {}) },
    include: {
      children: {
        select: {
          id: true,
          title: true,
          amountMinor: true,
          paidMinor: true,
          lateFeeMinor: true,
          status: true,
          dueDate: true,
          installmentSequence: true,
          daysOverdue: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // COMPLETED is derived, never stored, so a plan whose last instalment was
  // paid shows as complete even though nothing wrote it down.
  // Children are always included: the plan list is the screen where the desk
  // reads and compares schedules, and a plan without its instalments is just a
  // number. A plan is at most 12 bills, so this stays cheap.
  const shaped = (plans as unknown as PlanRow[]).map((p) => shapePlan(p, { withChildren: true }));

  return {
    plans: shaped,
    stats: {
      activeCount: shaped.filter((p) => p.status === 'ACTIVE').length,
      completedCount: shaped.filter((p) => p.complete).length,
      cancelledCount: shaped.filter((p) => p.status === 'CANCELLED').length,
      // Money that is overdue *inside* an agreed plan. Not the same as money
      // nobody has agreed a plan for, and the desk chases it differently.
      overdueRupees: shaped.reduce((s, p) => s + p.overdueCount, 0) > 0
        ? shaped.reduce((s, p) => s + Math.round(p.balanceRupees * (p.overdueCount / Math.max(1, p.count))), 0)
        : 0,
    },
  };
}

/**
 * Agree a plan. The parent becomes SUPERSEDED and N instalments are created as
 * ordinary dues.
 *
 * Rules that exist to stop the desk creating an impossible promise:
 *  · the parent must be open and unpaid money
 *  · it must not already BE an instalment (no plans of plans)
 *  · it must not have an existing plan
 *  · 2–12 instalments — one instalment is not a plan, and twelve monthly
 *    instalments on a hostel bill is a bookkeeping habit, not an agreement
 *  · anything already PAID on the parent stays paid: the plan covers the
 *    remaining balance only, so it can never be used to erase money received
 */
export async function createInstallmentPlan(
  institutionId: string,
  actorUserId: string,
  dueId: string,
  input: { count: number; frequency?: PlanFrequency; startDate?: string; note?: string },
) {
  const due = await prisma.feeDue.findFirst({
    where: { id: dueId, studentProfile: { user: { institutionId, deletedAt: null } } },
    include: {
      studentProfile: { select: { id: true, user: { select: { id: true, fullName: true } } } },
      feeStructure: { select: { id: true, programId: true, academicYearId: true } },
    },
  });
  if (!due) throw notFound('Fee due not found');

  const status = deriveDueStatus(due);
  if (!isOpenStatus(status)) {
    throw conflict(`This fee is ${status.toLowerCase()} — a plan can only be agreed on an open bill`);
  }
  if (due.installmentPlanId) throw conflict('This bill is already an instalment of another plan');
  if (due.supersededByPlanId) throw conflict('A payment plan was already agreed on this bill');
  if (due.amountMinor <= 0) throw unprocessable('This fee has no amount to split');

  const count = Number(input.count);
  if (!Number.isInteger(count) || count < 2 || count > 12) {
    throw badRequest('A plan needs between 2 and 12 instalments');
  }

  const frequency = input.frequency ?? 'MONTHLY';
  if (!FREQUENCY_DAYS[frequency]) throw badRequest('Unknown instalment frequency');

  const balance = balanceOf(due);
  // The plan covers what is LEFT. Money already received is never re-scheduled
  // into an instalment — that is how a plan becomes a way to un-collect a payment.
  const parts = splitAmount(balance, count);
  const step = FREQUENCY_DAYS[frequency];

  const start = input.startDate ? new Date(input.startDate) : new Date();
  if (Number.isNaN(start.getTime())) throw badRequest('Start date is not a valid date');
  start.setHours(0, 0, 0, 0);
  // A plan starting in the past would instantly create overdue instalments on
  // day one, which is a clerical accident and looks like a hostile act.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (start.getTime() < today.getTime() && start.getTime() < new Date(due.createdAt).setHours(0, 0, 0, 0)) {
    throw badRequest('The first instalment cannot be dated before the bill was raised');
  }

  const plan = await prisma.$transaction(async (tx) => {
    const created = await tx.installmentPlan.create({
      data: {
        institutionId,
        parentDueId: due.id,
        totalMinor: balance,
        count,
        frequency,
        startDate: start,
        note: input.note ?? null,
        status: 'ACTIVE',
        createdByUserId: actorUserId,
      },
    });

    await tx.feeDue.update({
      where: { id: due.id },
      data: { status: 'SUPERSEDED', supersededByPlanId: created.id, daysOverdue: 0 },
    });

    // Instalment 1 keeps the original bill's title so the family recognises it;
    // later ones are numbered.
    for (let i = 0; i < count; i += 1) {
      const date = new Date(start.getTime() + i * step * 24 * 60 * 60 * 1000);
      await tx.feeDue.create({
        data: {
          studentProfileId: due.studentProfile.id,
          feeStructureId: due.feeStructureId,
          title: count === 1 ? due.title : `${due.title} · instalment ${i + 1} of ${count}`,
          amountMinor: parts[i],
          dueDate: date,
          status: 'UNPAID',
          paidMinor: 0,
          installmentPlanId: created.id,
          installmentSequence: i + 1,
          daysOverdue: 0,
        },
      });
    }

    return created;
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'fee.plan.create',
    entityType: 'InstallmentPlan',
    entityId: plan.id,
    before: { dueId: due.id, title: due.title, balanceRupees: toRupees(balance) },
    after: {
      count,
      frequency,
      totalRupees: toRupees(balance),
      startDate: start,
      note: input.note ?? null,
    },
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: due.studentProfile.user.id,
      type: 'FEE_DUE',
      title: `Payment plan agreed: ${due.title}`,
      body:
        `"${due.title}" has been split into ${count} instalments of about ₹${toRupees(Math.round(balance / count))}, ` +
        `${PLAN_FREQUENCIES.find((f) => f.id === frequency)?.label.toLowerCase()}, starting ${start.toLocaleDateString('en-IN')}.` +
        (input.note ? `\n\nNote from the accounts office: ${input.note}` : ''),
      sourceModule: 'accounts',
      dataJson: JSON.stringify({ module: 'accounts', screen: 'Dues', planId: plan.id }),
    },
  });

  return shapePlan(await loadPlan(institutionId, plan.id), { withChildren: true });
}

/**
 * Undo a plan: the instalments are deleted and the parent becomes payable again.
 *
 * Refuses if any instalment already has money against it. Those payments are
 * real receipts with receipts issued; silently deleting the bill they sit on
 * would leave a family with a paid receipt and nothing to show for it.
 */
export async function cancelInstallmentPlan(
  institutionId: string,
  actorUserId: string,
  planId: string,
  reason: string,
) {
  const plan = await prisma.installmentPlan.findFirst({
    where: { id: planId, institutionId },
    include: {
      children: { select: { id: true, paidMinor: true, amountMinor: true, status: true, dueDate: true } },
    },
  });
  if (!plan) throw notFound('Payment plan not found');
  if (plan.status === 'CANCELLED') throw conflict('This plan is already cancelled');

  const paidChildren = plan.children.filter((c) => c.paidMinor > 0);
  if (paidChildren.length > 0) {
    throw conflict(
      `${paidChildren.length} instalment(s) already have payments against them. ` +
        'Waive or adjust those bills instead — deleting them would lose the receipts.',
    );
  }

  const parent = await prisma.feeDue.findFirst({
    where: { id: plan.parentDueId, studentProfile: { user: { institutionId, deletedAt: null } } },
    include: { studentProfile: { include: { user: { select: { id: true, fullName: true } } } } },
  });
  if (!parent) throw notFound('The original bill for this plan no longer exists');

  await prisma.$transaction(async (tx) => {
    // Allocation rows first — a FK, and there should be none, but a dangling
    // allocation would break the delete.
    await tx.paymentAllocation.deleteMany({
      where: { dueId: { in: plan.children.map((c) => c.id) } },
    });
    await tx.feeDue.deleteMany({ where: { id: { in: plan.children.map((c) => c.id) } } });
    await tx.installmentPlan.update({
      where: { id: plan.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledByUserId: actorUserId,
        cancelReason: reason,
      },
    });
    await tx.feeDue.update({
      where: { id: parent.id },
      data: {
        status: deriveDueStatus({ ...parent, status: 'UNPAID' }),
        supersededByPlanId: null,
        daysOverdue: isOpenStatus(deriveDueStatus({ ...parent, status: 'UNPAID' }))
          ? daysPastDue(parent.dueDate)
          : 0,
      },
    });
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'fee.plan.cancel',
    entityType: 'InstallmentPlan',
    entityId: plan.id,
    before: { status: plan.status, count: plan.count, parentDueId: plan.parentDueId },
    after: { status: 'CANCELLED', reason },
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: parent.studentProfile.user.id,
      type: 'FEE_DUE',
      title: `Payment plan cancelled: ${parent.title}`,
      body:
        `The instalment plan for "${parent.title}" has been cancelled and the full amount is payable again. ` +
        `Reason: ${reason}.`,
      sourceModule: 'accounts',
    },
  });

  return { id: plan.id, status: 'CANCELLED', parentDueId: parent.id, removedInstalments: plan.children.length };
}
