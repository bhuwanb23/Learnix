// Recurring contributions — standing giving instructions.
// Docs: 12-alumni-relations.md §3.4
//
// ─────────────────────────────────────────────────────────────
// There is no scheduler in this app
// ─────────────────────────────────────────────────────────────
// A mandate is a RECORD of intent plus a `nextDueAt`. The office presses "Charge
// due mandates" and every ACTIVE mandate whose date has arrived becomes a real
// donation, which the same confirmation path turns into a receipt.
//
// That is a deliberate trade against a background timer:
//   • a setInterval dies with the process, so a mandate would silently stop
//     being charged after every deploy and nobody would notice for a term;
//   • a button press is attributable, audited, and idempotent per due date.
// The honest cost is that nobody forgets to press it — which is why the mandate
// list reports `overdue` prominently rather than hiding it behind a status pill.

import { prisma } from '../../../db/prisma.js';
import { conflict, forbidden, notFound, unprocessable } from '../../../lib/errors.js';
import { writeAudit } from '../../../lib/audit.js';
import { toRupees, toMinor, FUNDS, CADENCES, nextDueDate, annualisedMinor, cadenceMeta, fundMeta } from './money.js';
import { isOpen } from './campaigns.service.js';
import type { Viewer } from '../directory.service.js';

function shapeMandate(
  m: {
    id: string;
    fund: string;
    amountMinor: number;
    cadence: string;
    status: string;
    nextDueAt: Date | null;
    lastChargedAt: Date | null;
    note: string | null;
    cancelledAt: Date | null;
    cancelReason: string | null;
    createdAt: Date;
    campaignId: string | null;
    campaign?: { id: string; name: string; status: string; deadline: Date | null } | null;
    _count?: { donations: number };
  },
  now = new Date(),
) {
  const overdue = m.status === 'ACTIVE' && !!m.nextDueAt && m.nextDueAt.getTime() <= now.getTime();
  return {
    id: m.id,
    fund: m.fund,
    fundLabel: fundMeta(m.fund).label,
    amountRupees: toRupees(m.amountMinor),
    cadence: m.cadence,
    cadenceLabel: cadenceMeta(m.cadence).short,
    status: m.status,
    nextDueAt: m.nextDueAt,
    lastChargedAt: m.lastChargedAt,
    note: m.note,
    cancelledAt: m.cancelledAt,
    cancelReason: m.cancelReason,
    createdAt: m.createdAt,
    campaign: m.campaign ? { id: m.campaign.id, name: m.campaign.name } : null,
    instalmentsCharged: m._count?.donations ?? 0,
    annualisedRupees: toRupees(annualisedMinor(m.amountMinor, m.cadence)),
    // Explicit, because "overdue" is the single most actionable fact on a
    // mandate and a status pill of "Active" hides it.
    isOverdue: overdue,
    daysOverdue: overdue ? Math.floor((now.getTime() - (m.nextDueAt as Date).getTime()) / 86400000) : 0,
  };
}

const mandateInclude = {
  campaign: { select: { id: true, name: true, status: true, deadline: true } },
  _count: { select: { donations: true } },
} as const;

/**
 * Create a mandate. The first due date is one full cycle from today, never today
 * itself — a mandate that is due on creation reads as an unpaid bill.
 */
export async function createMandate(
  viewer: Viewer,
  body: {
    amountRupees: number;
    cadence?: string;
    campaignId?: string | null;
    fund?: string;
    note?: string;
    startFrom?: string;
  },
) {
  const profile = await prisma.alumniProfile.findFirst({
    where: { userId: viewer.userId, institutionId: viewer.institutionId },
    select: { id: true },
  });
  if (!profile) throw unprocessable('Complete your alumni profile before setting up a standing gift');

  const cadence = body.cadence ?? 'MONTHLY';
  if (!CADENCES.includes(cadence as never)) throw unprocessable(`cadence must be one of ${CADENCES.join(', ')}`);
  if (body.fund && !FUNDS.includes(body.fund as never)) {
    throw unprocessable(`fund must be one of ${FUNDS.join(', ')}`);
  }
  const amountMinor = toMinor(body.amountRupees);

  let campaignId = body.campaignId ?? null;
  if (campaignId) {
    const campaign = await prisma.fundraisingCampaign.findFirst({
      where: { id: campaignId, institutionId: viewer.institutionId },
      select: { id: true, status: true, deadline: true, name: true },
    });
    if (!campaign) throw notFound('Campaign not found');
    // A standing gift to a closed campaign would fail on every future charge —
    // better to refuse it now, at the moment it can still be changed.
    if (!isOpen(campaign)) throw unprocessable(`"${campaign.name}" is closed`);
  }

  let anchor = new Date();
  if (body.startFrom) {
    const s = new Date(body.startFrom);
    if (Number.isNaN(s.getTime())) throw unprocessable('Invalid start date');
    anchor = s;
  }
  const nextDueAt = nextDueDate(anchor, cadence);

  const mandate = await prisma.recurringContribution.create({
    data: {
      institutionId: viewer.institutionId,
      donorUserId: viewer.userId,
      campaignId,
      fund: body.fund ?? 'GENERAL',
      amountMinor,
      cadence,
      status: 'ACTIVE',
      nextDueAt,
      note: body.note?.trim() || null,
    },
    include: mandateInclude,
  });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'donation.recurring.create',
    entityType: 'RecurringContribution',
    entityId: mandate.id,
    after: { amountRupees: toRupees(amountMinor), cadence, nextDueAt },
  });

  return shapeMandate(mandate as never);
}

export async function listMandates(institutionId: string, viewer: Viewer, opts: { dueOnly?: boolean } = {}) {
  // The office sees every mandate (it is the one charging them); a graduate sees
  // only their own.
  const where: Record<string, unknown> = { institutionId };
  if (!viewer.isOffice) where.donorUserId = viewer.userId;
  if (opts.dueOnly === true) {
    where.status = 'ACTIVE';
    where.nextDueAt = { lte: new Date() };
  }

  const rows = await prisma.recurringContribution.findMany({
    where,
    include: {
      ...mandateInclude,
      // Always selected so the shape is stable; the donor's name is STRIPPED for
      // anyone who is not the office, below.
      donor: { select: { fullName: true, alumniProfile: { select: { graduationYear: true } } } },
    },
    orderBy: [{ status: 'asc' }, { nextDueAt: 'asc' }],
  });

  const now = new Date();
  return {
    count: rows.length,
    dueNow: rows.filter((m) => m.status === 'ACTIVE' && m.nextDueAt && m.nextDueAt.getTime() <= now.getTime()).length,
    mandates: rows.map((m) => {
      const shaped = shapeMandate(m as never, now);
      if (!viewer.isOffice) return shaped;
      return { ...shaped, donor: m.donor.fullName, batch: m.donor.alumniProfile?.graduationYear ?? null };
    }),
  };
}

/** Pause keeps the schedule; cancelling ends it. Pausing is reversible. */
export async function setMandateStatus(
  viewer: Viewer,
  mandateId: string,
  action: 'pause' | 'resume' | 'cancel',
  reason?: string,
) {
  const existing = await prisma.recurringContribution.findFirst({
    where: { id: mandateId, institutionId: viewer.institutionId },
    select: { id: true, status: true, donorUserId: true, campaignId: true, cadence: true },
  });
  if (!existing) throw notFound('Standing gift not found');
  if (!(viewer.isOffice || viewer.userId === existing.donorUserId)) {
    throw forbidden('Only the donor or the Alumni Relations Office can change this standing gift');
  }
  if (existing.status === 'CANCELLED' && action !== 'cancel') {
    throw conflict('This standing gift was cancelled and cannot be resumed — create a new one');
  }

  if (action === 'pause') {
    if (existing.status !== 'ACTIVE') throw conflict(`Only an active standing gift can be paused (this one is ${existing.status})`);
    const updated = await prisma.recurringContribution.update({
      where: { id: existing.id },
      data: { status: 'PAUSED' },
      include: mandateInclude,
    });
    return shapeMandate(updated as never);
  }

  if (action === 'resume') {
    if (existing.status !== 'PAUSED') throw conflict(`Only a paused standing gift can be resumed (this one is ${existing.status})`);
    // Resuming rolls the due date forward from now, otherwise a gift paused for a
    // term is charged twice on the day it resumes.
    const updated = await prisma.recurringContribution.update({
      where: { id: existing.id },
      data: { status: 'ACTIVE', nextDueAt: nextDueDate(new Date(), existing.cadence) },
      include: mandateInclude,
    });
    return shapeMandate(updated as never);
  }

  if (!reason || reason.trim().length < 5) {
    throw unprocessable('Give a reason for cancelling (at least 5 characters)');
  }
  const updated = await prisma.recurringContribution.update({
    where: { id: existing.id },
    data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason.trim(), nextDueAt: null },
    include: mandateInclude,
  });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'donation.recurring.cancel',
    entityType: 'RecurringContribution',
    entityId: updated.id,
    before: { status: existing.status },
    after: { status: 'CANCELLED', reason: reason.trim() },
  });

  return shapeMandate(updated as never);
}

/**
 * Office action: turn every due mandate into a PLEDGED donation.
 *
 * Two properties this must have, because it is a button that will be pressed
 * twice:
 *   1. **Idempotent per due date** — a mandate is skipped when
 *      `lastChargedAt >= nextDueAt`, so pressing again charges nothing.
 *   2. **Per-mandate isolation** — one closed campaign must not abort the whole
 *      run, so each mandate is attempted independently and failures are collected
 *      and returned rather than thrown.
 *
 * The created donations are PLEDGED, not RECEIVED: the same office confirmation
 * that mints a receipt for a one-off gift mints it for an instalment. Charging a
 * mandate and issuing a tax document are two different acts.
 */
export async function chargeDueMandates(viewer: Viewer) {
  if (!viewer.isOffice) throw forbidden('Only the Alumni Relations Office can charge standing gifts');

  const now = new Date();
  const due = await prisma.recurringContribution.findMany({
    where: { institutionId: viewer.institutionId, status: 'ACTIVE', nextDueAt: { lte: now } },
    include: { campaign: { select: { id: true, name: true, status: true, deadline: true } }, donor: { select: { fullName: true } } },
  });

  const charged: string[] = [];
  const skipped: { id: string; reason: string }[] = [];

  for (const m of due) {
    // Idempotency guard.
    if (m.lastChargedAt && m.nextDueAt && m.lastChargedAt.getTime() >= m.nextDueAt.getTime()) {
      skipped.push({ id: m.id, reason: 'already charged for this due date' });
      continue;
    }
    // A campaign that closed between signing and charging.
    if (m.campaignId && m.campaign && !isOpen(m.campaign)) {
      skipped.push({ id: m.id, reason: `campaign "${m.campaign.name}" is closed` });
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.donation.create({
          data: {
            institutionId: m.institutionId,
            campaignId: m.campaignId,
            alumniUserId: m.donorUserId,
            fund: m.fund,
            amountMinor: m.amountMinor,
            recurringId: m.id,
            method: 'NET_BANKING',
            note: m.note,
            // Inherit the mandate's donor preference — a recurring gift should not
            // suddenly become attributable because it was charged by a machine.
            isAnonymous: m.isAnonymous,
            status: 'PLEDGED',
          },
        });
        await tx.recurringContribution.update({
          where: { id: m.id },
          data: {
            lastChargedAt: now,
            chargedThrough: m.nextDueAt,
            nextDueAt: nextDueDate(m.nextDueAt ?? now, m.cadence, now),
          },
        });
      });
      charged.push(m.id);
    } catch (e) {
      skipped.push({ id: m.id, reason: e instanceof Error ? e.message : 'unknown error' });
    }
  }

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'donation.recurring.charge',
    entityType: 'RecurringContribution',
    entityId: 'batch',
    after: { charged: charged.length, skipped: skipped.length },
  });

  return {
    dueCount: due.length,
    chargedCount: charged.length,
    skippedCount: skipped.length,
    chargedIds: charged,
    // Returned so the office can see WHICH mandate failed and why, rather than
    // discovering next term that one donor quietly stopped giving.
    skipped,
    awaitingConfirmation: charged.length,
  };
}
