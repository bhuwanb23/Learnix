// Late-payment fines for the dues desk.
// Docs: 06-accounts-finance.md §3.3 "Fine / late-payment calculation"
//
// Charging interest on a late fee is a POLICY decision, not a universal rule —
// some institutions charge nothing, some charge a flat ₹500 the month after
// the due date, some charge 1.5% a month. So the arithmetic is universal and
// everything that feeds it is institution-configurable via `LateFeeRule`.
//
// The shape that matters: the rule computes a NUMBER, and an ASSESSMENT writes
// that number onto the due (`FeeDue.lateFeeMinor`). It is not computed live on
// read. A fine that only ever existed as a display value could not be collected,
// could not be disputed, and could not be given back when a family proved the
// bill was paid on time — which is exactly the complaint that makes a college
// drop its late-fee policy.
//
// Because `lateFeeMinor` is part of the due's claim (see dues.money.ts), an
// assessed fine immediately raises what the desk will accept as payment.
import type { LateFeeRule } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { badRequest, conflict, notFound, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { balanceOf, deriveDueStatus, daysPastDue, isOpenStatus, toRupees } from './dues.money.js';

export type LateFeeRuleInput = {
  name?: string;
  enabled?: boolean;
  graceDays?: number;
  mode?: 'PERCENT' | 'FLAT';
  valueBp?: number;
  flatMinor?: number;
  capBp?: number;
  maxMonths?: number;
  feeStructureId?: string | null;
  note?: string;
};

/**
 * The fine for one due, in paise.
 *
 * Deliberately pure and prisma-free: it is the one piece of arithmetic in the
 * dues module where a rounding mistake is a legal problem rather than a display
 * problem, so `verify-dues.ts` exercises it directly.
 *
 * Steps:
 *  1. inside the grace period → nothing
 *  2. count STARTED months past the grace date (a part-month counts — you are
 *     late from day one, and a rule that only charged on completed months would
 *     let a bill sit unpaid forever without cost)
 *  3. PERCENT → basis points of the outstanding balance; FLAT → a fixed sum
 *  4. clamp to `maxMonths` when set, then to the cap as a share of the billed
 *     amount
 *
 * `maxMonths: 0` means "keep accruing until the cap".
 */
export function computeLateFee(
  due: { amountMinor: number; paidMinor: number; dueDate: Date; lateFeeMinor?: number | null },
  rule: Pick<LateFeeRule, 'enabled' | 'graceDays' | 'mode' | 'valueBp' | 'flatMinor' | 'capBp' | 'maxMonths'>,
  today: Date = new Date(),
): number {
  if (!rule.enabled) return 0;

  // The fine is computed on what is STILL OWED ON THE BILL ITSELF — that is,
  // deliberately EXCLUDING any fine already standing on it.
  //
  // Using the full balance here (amount + fine − paid) looks equivalent but is a
  // silent ratchet: re-assessing raises the fine, the new fine is a percentage
  // of the inflated balance, and every run adds another slice. Rs 1L at 1.5% a
  // month over 2 months was Rs 3,000, then Rs 3,090, then Rs 3,184… until it
  // hit the cap. The cap hid it; it did not stop it.
  //
  // So the base is the unpaid BILL. A family that has paid 90% is fined on the
  // remaining 10%, and re-assessing on a later day gives the same answer plus
  // whatever whole months have passed since.
  const billBalance = Math.max(0, due.amountMinor - due.paidMinor);
  if (billBalance <= 0) return 0;

  const daysLate = daysPastDue(due.dueDate, today) - rule.graceDays;
  if (daysLate <= 0) return 0;

  // Days → started months. 30 days per month keeps this consistent with the
  // "monthly" cadence institutions actually bill on, and avoids the calendar
  // weirdness of a 31-day month costing more than a 28-day one.
  const startedMonths = Math.floor((daysLate - 1) / 30) + 1;
  const months = rule.maxMonths > 0 ? Math.min(startedMonths, rule.maxMonths) : startedMonths;

  let fee: number;
  if (rule.mode === 'FLAT') fee = rule.flatMinor * months;
  else fee = Math.round((billBalance * rule.valueBp * months) / 10000);

  const cap = Math.floor((due.amountMinor * rule.capBp) / 10000);
  fee = Math.min(fee, cap);

  // Finally, the fine can never exceed the unpaid bill itself: a penalty larger
  // than the debt cannot be justified to a family, and the counter would have
  // no way to accept a payment for it.
  return Math.max(0, Math.min(fee, billBalance));
}

const ruleWhere = (institutionId: string) => ({
  institutionId,
  feeStructureId: null,
});

function validateRule(input: LateFeeRuleInput) {
  if (input.graceDays != null && (input.graceDays < 0 || input.graceDays > 365)) {
    throw badRequest('Grace period must be between 0 and 365 days');
  }
  if (input.valueBp != null && (input.valueBp < 0 || input.valueBp > 10000)) {
    throw badRequest('Percentage must be between 0 and 10000 basis points (0–100%)');
  }
  if (input.flatMinor != null && input.flatMinor < 0) throw badRequest('Flat fine cannot be negative');
  if (input.capBp != null && (input.capBp < 0 || input.capBp > 10000)) {
    throw badRequest('Cap must be between 0 and 10000 basis points (0–100%)');
  }
  if (input.maxMonths != null && (input.maxMonths < 0 || input.maxMonths > 60)) {
    throw badRequest('Maximum months must be between 0 and 60');
  }
  if (input.mode === 'FLAT' && input.valueBp != null && input.valueBp > 0) {
    throw badRequest('A flat fine cannot also have a percentage');
  }
}

const shapeRule = (r: LateFeeRule | null) => ({
  id: r?.id ?? null,
  name: r?.name ?? 'No late-fee rule',
  enabled: r?.enabled ?? false,
  // Defaults are what the desk will save if the officer just toggles it on, so
  // the UI never has to invent a policy.
  graceDays: r?.graceDays ?? 0,
  mode: r?.mode ?? 'PERCENT',
  valueBp: r?.valueBp ?? 100,
  flatMinor: r?.flatMinor ?? 0,
  capBp: r?.capBp ?? 10000,
  maxMonths: r?.maxMonths ?? 0,
  updatedAt: r?.updatedAt ?? null,
});

/**
 * The rule that governs a bill, or the institution default when the bill's
 * structure has none of its own.
 *
 * `feeStructureId` overrides the institution-wide default. That override has to
 * be resolved HERE rather than in each caller, because the fee-structure screen
 * and the dues desk both show "what fine applies to this bill" — and if they
 * picked the rule independently, a structure with an override would show one
 * rate on the fee structure and another on the bill it governs.
 *
 * The lookup is two queries rather than one with an `OR`: SQLite sorts NULL
 * FIRST ascending, so a single `orderBy: { feeStructureId: 'asc' }` would
 * silently prefer the institution default over the more specific rule.
 */
export async function getActiveLateFeeRule(institutionId: string, feeStructureId?: string | null) {
  if (feeStructureId) {
    // A structure row governs whether or not it is ENABLED. Falling back to the
    // institution default when the program has deliberately switched its own
    // rule off would mean "this program charges no late fee" silently became
    // "charge them the default fine" — the opposite of what the officer set.
    const specific = await prisma.lateFeeRule.findFirst({
      where: { institutionId, feeStructureId },
      orderBy: { createdAt: 'desc' },
    });
    if (specific) return { ...shapeRule(specific), scope: 'STRUCTURE' as const };
  }
  const rule = await prisma.lateFeeRule.findFirst({
    where: { ...ruleWhere(institutionId), enabled: true },
    orderBy: { createdAt: 'desc' },
  });
  return { ...shapeRule(rule), scope: 'INSTITUTION' as const };
}

/**
 * Read + save in one call, because the screen needs to show the current policy
 * even when there is no rule row yet. Saving with `enabled: false` writes a
 * disabled rule rather than deleting one, so switching fines off and on again
 * does not silently restore the institution's real settings.
 */
export async function getLateFeeSettings(institutionId: string) {
  const rule = await prisma.lateFeeRule.findFirst({
    where: ruleWhere(institutionId),
    orderBy: { createdAt: 'desc' },
  });
  const active = await getActiveLateFeeRule(institutionId);

  // What the fine would be right now on the whole overdue book. Without this the
  // officer can only set a policy blind and find out the damage afterwards.
  const overdue = await prisma.feeDue.findMany({
    where: {
      studentProfile: { user: { institutionId, deletedAt: null } },
      status: { in: ['UNPAID', 'PARTIAL'] },
      dueDate: { lt: new Date(new Date().setHours(0, 0, 0, 0)) },
    },
    select: { id: true, amountMinor: true, paidMinor: true, lateFeeMinor: true, dueDate: true },
  });

  const alreadyAssessed = overdue.filter((d) => (d.lateFeeMinor ?? 0) > 0).length;
  const wouldAssess = active.enabled
    ? overdue.filter((d) => computeLateFee(d, active) > 0 && (d.lateFeeMinor ?? 0) === 0)
    : [];
  const projected = wouldAssess.reduce((s, d) => s + computeLateFee(d, active), 0);

  return {
    rule: { ...active, name: rule?.name ?? 'Late payment fine' },
    ruleId: rule?.id ?? null,
    updatedAt: rule?.updatedAt ?? null,
    // Only dues with a zero fine are projected; re-assessing one already fined
    // would double-charge by a different route.
    projection: {
      overdueCount: overdue.length,
      alreadyAssessedCount: alreadyAssessed,
      pendingCount: wouldAssess.length,
      pendingStudents: new Set(
        (
          await prisma.feeDue.findMany({
            where: { id: { in: wouldAssess.map((d) => d.id) } },
            select: { studentProfileId: true },
          })
        ).map((d) => d.studentProfileId),
      ).size,
      pendingRupees: toRupees(projected),
    },
  };
}

export async function saveLateFeeRule(
  institutionId: string,
  actorUserId: string,
  input: LateFeeRuleInput,
) {
  validateRule(input);

  const mode = input.mode ?? 'PERCENT';
  const valueBp = input.valueBp ?? 100;
  const flatMinor = input.flatMinor ?? 0;
  if (mode === 'FLAT' && flatMinor <= 0) throw badRequest('A flat fine needs an amount greater than zero');
  if (mode === 'PERCENT' && valueBp <= 0) {
    throw badRequest('A percentage fine needs a rate greater than zero');
  }

  const existing = await prisma.lateFeeRule.findFirst({
    where: ruleWhere(institutionId),
    orderBy: { createdAt: 'desc' },
  });

  const data = {
    name: input.name ?? 'Late payment fine',
    enabled: input.enabled ?? true,
    graceDays: input.graceDays ?? 0,
    mode,
    valueBp: mode === 'FLAT' ? 0 : valueBp,
    flatMinor: mode === 'FLAT' ? flatMinor : 0,
    capBp: input.capBp ?? 10000,
    maxMonths: input.maxMonths ?? 0,
    feeStructureId: input.feeStructureId ?? null,
    createdByUserId: actorUserId,
  };

  const saved = existing
    ? await prisma.lateFeeRule.update({ where: { id: existing.id }, data })
    : await prisma.lateFeeRule.create({ data: { ...data, institutionId } });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'fee.late-fee-rule',
    entityType: 'LateFeeRule',
    entityId: saved.id,
    before: existing ? shapeRule(existing) : null,
    after: shapeRule(saved),
  });

  return shapeRule(saved);
}

// ── Assessment ───────────────────────────────────────────────

/**
 * What the desk would see on ONE bill's fine line: what is charged, what it
 * would be if re-assessed, and whether the rule even applies yet.
 */
export async function getDueLateFee(
  institutionId: string,
  due: {
    id: string;
    amountMinor: number;
    paidMinor: number;
    lateFeeMinor?: number | null;
    dueDate: Date;
    status?: string;
    lateFeeAssessedAt?: Date | null;
    lateFeeRuleId?: string | null;
    feeStructureId?: string | null;
  },
) {
  const rule = await getActiveLateFeeRule(institutionId, due.feeStructureId);
  const daysOverdue = daysPastDue(due.dueDate);
  const wouldBe = computeLateFee(due, rule);
  const status = deriveDueStatus({ ...due, status: due.status ?? 'UNPAID' });
  const open = isOpenStatus(status);

  return {
    ruleEnabled: rule.enabled,
    ruleName: rule.name,
    ruleMode: rule.mode,
    ruleValueBp: rule.valueBp,
    ruleFlatRupees: toRupees(rule.flatMinor),
    ruleGraceDays: rule.graceDays,
    ruleCapBp: rule.capBp,
    ruleMaxMonths: rule.maxMonths,
    // Plain-English sentence, because "capBp" tells an accounts officer nothing
    // and "1% a month after a 15-day grace, capped at 25%" tells them everything.
    ruleSummary: rule.enabled
      ? `${rule.graceDays}-day grace · ${
          rule.mode === 'FLAT'
            ? `₹${toRupees(rule.flatMinor)} a month late`
            : `${(rule.valueBp / 100).toFixed(2).replace(/\.?0+$/, '')}% a month late`
        } · cap ${
          rule.capBp >= 10000 ? 'none' : `${(rule.capBp / 100).toFixed(0)}% of the bill`
        }${rule.maxMonths > 0 ? ` · stops after ${rule.maxMonths} months` : ''}`
      : 'This institution does not charge a late fine.',
    assessedRupees: toRupees(due.lateFeeMinor ?? 0),
    assessedAt: due.lateFeeAssessedAt ?? null,
    /** The live number when nothing has been assessed — the "would be" the officer confirms. */
    wouldBeRupees: toRupees(wouldBe),
    /** Days still inside the grace period, so the screen can explain a ₹0 fine. */
    graceDaysRemaining: Math.max(0, rule.graceDays - daysOverdue),
    stillAccruing: open && rule.enabled && wouldBe > (due.lateFeeMinor ?? 0),
    canAssess: open && rule.enabled && (due.lateFeeMinor ?? 0) === 0 && wouldBe > 0,
  };
}

/**
 * Assess (or re-assess) the fine on one bill.
 *
 * Re-assessing RAISES to the current figure rather than adding to it — otherwise
 * running this every month would compound the fine on top of a fine, which is
 * how a desk ends up asking a family for a penalty larger than the bill.
 */
export async function assessLateFee(
  institutionId: string,
  actorUserId: string,
  dueId: string,
  opts: { reason?: string } = {},
) {
  const due = await prisma.feeDue.findFirst({
    where: { id: dueId, studentProfile: { user: { institutionId, deletedAt: null } } },
    include: { studentProfile: { include: { user: { select: { id: true, fullName: true } } } } },
  });
  if (!due) throw notFound('Fee due not found');

  const status = deriveDueStatus(due);
  if (!isOpenStatus(status)) {
    throw conflict(`This fee is ${status} — there is nothing left to fine`);
  }
  if (balanceOf(due) <= 0) throw unprocessable('This fee has no outstanding balance');

  const rule = await getActiveLateFeeRule(institutionId, due.feeStructureId);
  if (!rule.enabled) {
    throw conflict('This institution has no late-fee rule. Turn it on first.');
  }
  const ruleRow = rule.id
    ? await prisma.lateFeeRule.findUnique({ where: { id: rule.id } })
    : await prisma.lateFeeRule.findFirst({
        where: { ...ruleWhere(institutionId) },
        orderBy: { createdAt: 'desc' },
      });

  const amount = computeLateFee(due, rule);
  if (amount <= 0) {
    throw unprocessable(
      rule.graceDays > 0
        ? `No fine applies — this bill is still inside its ${rule.graceDays}-day grace period.`
        : 'No fine applies to this bill.',
    );
  }

  await prisma.feeDue.update({
    where: { id: due.id },
    data: {
      lateFeeMinor: amount,
      lateFeeAssessedAt: new Date(),
      lateFeeAssessedByUserId: actorUserId,
      lateFeeRuleId: ruleRow?.id ?? null,
    },
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: due.studentProfile.user.id,
      type: 'FEE_DUE',
      title: `Late fee applied: ${due.title}`,
      body:
        `A late fee of ₹${toRupees(amount)} has been added to "${due.title}". ` +
        `Policy: ${rule.name}. Your total payable on this bill is now ₹${toRupees(due.amountMinor + amount - due.paidMinor)}.` +
        (opts.reason ? `

Reason recorded by the accounts office: ${opts.reason}` : ''),
      sourceModule: 'accounts',
      dataJson: JSON.stringify({ module: 'accounts', screen: 'Dues', dueId: due.id }),
    },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'fee.late-fee.assess',
    entityType: 'FeeDue',
    entityId: due.id,
    before: { lateFeeRupees: toRupees(due.lateFeeMinor ?? 0), balanceRupees: toRupees(balanceOf(due)) },
    after: { lateFeeRupees: toRupees(amount), balanceRupees: toRupees(balanceOf({ ...due, lateFeeMinor: amount })) },
  });

  return {
    id: due.id,
    lateFeeRupees: toRupees(amount),
    balanceRupees: toRupees(balanceOf({ ...due, lateFeeMinor: amount })),
    assessedAt: new Date(),
    ruleName: rule.name,
  };
}

/** Give the fine back. The bill keeps whatever was actually paid. */
export async function waiveLateFee(
  institutionId: string,
  actorUserId: string,
  dueId: string,
  reason: string,
) {
  const due = await prisma.feeDue.findFirst({
    where: { id: dueId, studentProfile: { user: { institutionId, deletedAt: null } } },
    include: { studentProfile: { include: { user: { select: { id: true, fullName: true } } } } },
  });
  if (!due) throw notFound('Fee due not found');
  if ((due.lateFeeMinor ?? 0) === 0) throw conflict('There is no late fee on this bill to remove');

  const removed = due.lateFeeMinor ?? 0;
  await prisma.feeDue.update({
    where: { id: due.id },
    data: {
      lateFeeMinor: 0,
      lateFeeAssessedAt: null,
      lateFeeAssessedByUserId: null,
      lateFeeRuleId: null,
    },
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: due.studentProfile.user.id,
      type: 'FEE_DUE',
      title: `Late fee removed: ${due.title}`,
      body: `The late fee of ₹${toRupees(removed)} on "${due.title}" has been removed. Reason: ${reason}.`,
      sourceModule: 'accounts',
    },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'fee.late-fee.waive',
    entityType: 'FeeDue',
    entityId: due.id,
    before: { lateFeeRupees: toRupees(removed) },
    after: { lateFeeRupees: 0, reason },
  });

  return {
    id: due.id,
    removedRupees: toRupees(removed),
    balanceRupees: toRupees(balanceOf({ ...due, lateFeeMinor: 0 })),
    status: deriveDueStatus({ ...due, lateFeeMinor: 0 }),
  };
}

/**
 * Assess across the whole overdue book.
 *
 * Bulk assessment is the reason the fine is worth having as a feature at all:
 * nobody runs this desk bill-by-bill. It is all-or-nothing per bill, never
 * partial, and it skips anything already fined rather than compounding it.
 */
export async function runLateFeeAssessment(
  institutionId: string,
  actorUserId: string,
  opts: { reason?: string; minDaysOverdue?: number } = {},
) {
  const rule = await getActiveLateFeeRule(institutionId);
  if (!rule.enabled) throw conflict('This institution has no late-fee rule. Turn it on first.');

  const minDays = opts.minDaysOverdue ?? 0;
  const today = startOfLocalDay();
  const candidates = await prisma.feeDue.findMany({
    where: {
      studentProfile: { user: { institutionId, deletedAt: null } },
      status: { in: ['UNPAID', 'PARTIAL'] },
      lateFeeMinor: 0,
      dueDate: { lt: today },
    },
    select: {
      id: true,
      studentProfileId: true,
      amountMinor: true,
      paidMinor: true,
      dueDate: true,
      // Per-structure overrides mean one rule cannot price the whole book, so
      // the structure has to be known here. Without it a bill governed by a
      // structure-specific rule would be fined at the institution rate.
      feeStructureId: true,
    },
  });

  // Resolve each distinct structure's rule ONCE and reuse it, rather than
  // querying per bill — a month of overdue dues is hundreds of rows and this is
  // the batch job.
  const structureIds = [...new Set(candidates.map((d) => d.feeStructureId).filter(Boolean))] as string[];
  const ruleByStructure = new Map<string, ReturnType<typeof getActiveLateFeeRule> extends Promise<infer T> ? T : never>();
  await Promise.all(
    structureIds.map(async (sid) => {
      ruleByStructure.set(sid, await getActiveLateFeeRule(institutionId, sid));
    }),
  );

  let assessed = 0;
  let skipped = 0;
  let addedMinor = 0;
  let overrideAssessed = 0;
  const rows: Array<{ id: string; lateFeeRupees: number }> = [];

  for (const due of candidates) {
    const applicable = (due.feeStructureId ? ruleByStructure.get(due.feeStructureId) : undefined) ?? rule;
    // A bill whose structure has a rule of its own, and that rule is switched
    // off, is skipped rather than dropped back to the institution rate: an
    // explicit "this program does not charge a late fee" is a decision, not a
    // gap to be filled with the default.
    if (applicable.scope === 'STRUCTURE' && !applicable.enabled) {
      skipped += 1;
      continue;
    }
    const amount = computeLateFee(due, applicable);
    if (amount <= 0) {
      skipped += 1;
      continue;
    }
    if (daysPastDue(due.dueDate) < minDays) {
      skipped += 1;
      continue;
    }
    if (applicable.scope === 'STRUCTURE') overrideAssessed += 1;
    await prisma.feeDue.update({
      where: { id: due.id },
      data: {
        lateFeeMinor: amount,
        lateFeeAssessedAt: new Date(),
        lateFeeAssessedByUserId: actorUserId,
        lateFeeRuleId: applicable.id,
      },
    });
    assessed += 1;
    addedMinor += amount;
    rows.push({ id: due.id, lateFeeRupees: toRupees(amount) });
  }

  let notifiedStudentIds: string[] = [];
  if (assessed > 0) {
    // One audit row for the run plus one notification per student, so the desk
    // can answer "who was fined this month and by whom" from the trail.
    const assessedIds = new Set(rows.map((r) => r.id));
    const studentIds = [...new Set(candidates.filter((d) => assessedIds.has(d.id)).map((d) => d.studentProfileId))];
    notifiedStudentIds = studentIds;
    const students = await prisma.studentProfile.findMany({
      where: { id: { in: studentIds } },
      select: { user: { select: { id: true, fullName: true } } },
    });
    await prisma.notification.createMany({
      data: students.map((s) => ({
        institutionId,
        recipientUserId: s.user.id,
        type: 'FEE_DUE' as const,
        title: 'A late fee has been added',
        body: `A late fee has been added to an overdue fee under ${rule.name}. Please check your fee statement.`,
        sourceModule: 'accounts',
      })),
    });

    await writeAudit({
      actorUserId,
      institutionId,
      action: 'fee.late-fee.run',
      entityType: 'LateFeeRule',
      entityId: rule.id ?? 'none',
      before: null,
      after: {
        assessedCount: assessed,
        skippedCount: skipped,
        addedRupees: toRupees(addedMinor),
        // How many of those were priced by a program-specific override rather
        // than the institution default, so a surprising total is explainable.
        overrideAssessedCount: overrideAssessed,
        minDaysOverdue: minDays,
        reason: opts.reason ?? null,
      },
    });
  }

  return {
    ruleName: rule.name,
    assessedCount: assessed,
    skippedCount: skipped,
    studentsNotified: notifiedStudentIds.length,
    addedRupees: toRupees(addedMinor),
    assessed: rows.slice(0, 50),
  };
}

const startOfLocalDay = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
