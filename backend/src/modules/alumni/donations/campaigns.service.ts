// Fundraising campaigns — the "cause" a donation is directed at.
// Docs: 12-alumni-relations.md §3.4
//
// A campaign used to be a name and a one-line description, which is not enough to
// decide whether to give. This adds the detail that makes a decision possible:
// what the money is for (category), who it reaches (beneficiary), how it is
// going (progress, donor count, recent gifts) and whether it is still open.
//
// ─────────────────────────────────────────────────────────────
// Why progress is NOT recomputed here
// ─────────────────────────────────────────────────────────────
// `raisedMinor` is denormalised and incremented on receipt. This service READS it
// rather than re-summing donations, because the chapter-initiative performance
// view reads the same column and a second source of truth would let the two
// disagree. The seed recomputes it from the donations so a drifted value
// self-heals on the next seeding pass.

import { prisma } from '../../../db/prisma.js';
import { notFound, unprocessable } from '../../../lib/errors.js';
import { writeAudit } from '../../../lib/audit.js';
import { toRupees, toMinor, categoryMeta, fundMeta } from './money.js';
import type { Viewer } from '../directory.service.js';

/**
 * Progress, with two deliberate decisions.
 *
 * 1. **The percentage is NOT clamped.** A reunion fund that raised 128% of target
 *    is a real and common outcome; clamping the number would state a falsehood.
 *    The UI renders the BAR at 100% while showing the true percentage as text.
 * 2. **`remainingRupees` is 0 once the target is met**, never negative — a
 *    negative "still needed" reads as a debt the college owes the donor.
 */
export function progress(c: { targetMinor: number; raisedMinor: number }) {
  const percent = c.targetMinor === 0 ? 0 : Math.round((c.raisedMinor / c.targetMinor) * 100);
  return {
    targetRupees: toRupees(c.targetMinor),
    raisedRupees: toRupees(c.raisedMinor),
    percent,
    remainingRupees: Math.max(0, toRupees(c.targetMinor - c.raisedMinor)),
    met: c.raisedMinor >= c.targetMinor && c.targetMinor > 0,
  };
}

/** Is this campaign still accepting money? Both checks, in one place. */
export function isOpen(c: { status: string; deadline: Date | null }, now = new Date()): boolean {
  if (c.status !== 'ACTIVE') return false;
  if (!c.deadline) return true;
  return c.deadline.getTime() > now.getTime();
}

export async function listCampaigns(
  institutionId: string,
  query: { category?: string; includeClosed?: boolean } = {},
) {
  const includeClosed = query.includeClosed === true || query.includeClosed === ('true' as never);
  const campaigns = await prisma.fundraisingCampaign.findMany({
    where: {
      institutionId,
      ...(query.category ? { category: query.category } : {}),
      // "Closed" is derived, not stored: a campaign whose deadline has passed is
      // closed even while its status still says ACTIVE. Filtering on `status`
      // alone showed expired appeals as open indefinitely.
      ...(includeClosed
        ? {}
        : { OR: [{ status: 'ACTIVE', deadline: null }, { status: 'ACTIVE', deadline: { gt: new Date() } }] }),
    },
    include: {
      donations: {
        where: { status: 'RECEIVED' },
        select: { amountMinor: true, alumniUserId: true },
      },
      _count: { select: { donations: true } },
    },
    orderBy: [{ status: 'asc' }, { deadline: 'asc' }, { createdAt: 'desc' }],
  });

  return {
    count: campaigns.length,
    campaigns: campaigns.map((c) => {
      const donors = new Set(c.donations.map((d) => d.alumniUserId));
      return {
        id: c.id,
        name: c.name,
        description: c.description,
        category: c.category,
        categoryLabel: categoryMeta(c.category).label,
        beneficiary: c.beneficiary,
        imageUrl: c.imageUrl,
        status: c.status,
        // A campaign can be past its deadline and still say ACTIVE, so the
        // effective state is computed rather than read.
        isOpen: isOpen(c),
        daysLeft: c.deadline ? Math.ceil((c.deadline.getTime() - Date.now()) / 86400000) : null,
        deadline: c.deadline,
        // `donations` counts PLEDGED too (via _count) while `donors` counts only
        // people who actually paid. Both are shown, labelled, because a campaign
        // with 40 pledges from 9 donors is a very different story from 9 pledges
        // from 9 donors — and the old screen showed neither.
        donorCount: donors.size,
        pledgeCount: c._count.donations,
        ...progress(c),
      };
    }),
  };
}

export async function getCampaign(institutionId: string, campaignId: string, viewer: Viewer | undefined) {
  const c = await prisma.fundraisingCampaign.findFirst({
    where: { id: campaignId, institutionId },
    include: {
      donations: {
        where: { status: 'RECEIVED' },
        orderBy: { receivedAt: 'desc' },
        take: 12,
        include: {
          alumniUser: {
            select: { fullName: true, alumniProfile: { select: { graduationYear: true } } },
          },
        },
      },
    },
  });
  if (!c) throw notFound('Campaign not found');

  const full = await prisma.donation.count({ where: { campaignId: c.id, status: 'RECEIVED' } });
  const donorIds = await prisma.donation.findMany({
    where: { campaignId: c.id, status: 'RECEIVED' },
    distinct: ['alumniUserId'],
    select: { alumniUserId: true },
  });

  const isOffice = !!viewer?.isOffice;
  const myTotal = await prisma.donation.aggregate({
    where: { campaignId: c.id, status: 'RECEIVED', alumniUserId: viewer?.userId ?? '__none__' },
    _sum: { amountMinor: true },
  });

  return {
    id: c.id,
    name: c.name,
    description: c.description,
    category: c.category,
    categoryLabel: categoryMeta(c.category).label,
    beneficiary: c.beneficiary,
    imageUrl: c.imageUrl,
    status: c.status,
    isOpen: isOpen(c),
    daysLeft: c.deadline ? Math.ceil((c.deadline.getTime() - Date.now()) / 86400000) : null,
    deadline: c.deadline,
    createdAt: c.createdAt,
    donorCount: donorIds.length,
    giftCount: full,
    ...progress(c),
    // What THIS viewer has put in. Null rather than 0 for a non-donor: "I have
    // given nothing here" and "this campaign has received nothing" are different
    // statements and must not render identically.
    myContributionRupees: viewer?.userId ? toRupees(myTotal._sum.amountMinor ?? 0) : null,
    recentGifts: c.donations.map((d) => {
      const hideName = d.isAnonymous && viewer?.userId !== d.alumniUserId;
      return {
        id: d.id,
        donor: hideName ? 'Anonymous' : d.alumniUser.fullName,
        batch: hideName ? null : d.alumniUser.alumniProfile?.graduationYear ?? null,
        amountRupees: toRupees(d.amountMinor),
        fund: d.fund,
        fundLabel: fundMeta(d.fund).label,
        receivedAt: d.receivedAt,
        isMine: viewer?.userId === d.alumniUserId,
      };
    }),
    viewerContext: {
      isOffice,
      canGive: isOpen(c),
      canEdit: isOffice,
      canCreate: isOffice,
    },
  };
}

/** Office-only. Requires an explicit target — there is no demo default. */
export async function createCampaign(
  viewer: Viewer,
  body: {
    name: string;
    description?: string;
    category?: string;
    beneficiary?: string;
    imageUrl?: string;
    targetRupees: number;
    deadline?: string;
  },
) {
  if (!viewer.isOffice) throw unprocessable('Only the Alumni Relations Office can create a campaign');
  if (!body.name?.trim()) throw unprocessable('A campaign needs a name');
  if (body.targetRupees === undefined) throw unprocessable('A target amount is required');

  const targetMinor = toMinor(body.targetRupees);
  let deadline: Date | null = null;
  if (body.deadline) {
    deadline = new Date(body.deadline);
    if (Number.isNaN(deadline.getTime())) throw unprocessable('Invalid deadline');
    // A campaign that closes the moment it opens cannot receive anything, and
    // the error would otherwise only surface when a donor tried to give.
    if (deadline.getTime() <= Date.now()) throw unprocessable('The deadline must be in the future');
  }

  const created = await prisma.fundraisingCampaign.create({
    data: {
      institutionId: viewer.institutionId,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      category: body.category ?? 'GENERAL',
      beneficiary: body.beneficiary?.trim() || null,
      imageUrl: body.imageUrl ?? null,
      targetMinor,
      deadline,
      status: 'ACTIVE',
    },
  });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'campaign.create',
    entityType: 'FundraisingCampaign',
    entityId: created.id,
    after: { name: created.name, targetMinor },
  });

  return { id: created.id, name: created.name, targetRupees: toRupees(created.targetMinor), status: created.status };
}

export async function updateCampaign(
  viewer: Viewer,
  campaignId: string,
  body: {
    name?: string;
    description?: string;
    category?: string;
    beneficiary?: string;
    imageUrl?: string;
    targetRupees?: number;
    deadline?: string | null;
    status?: string;
  },
) {
  if (!viewer.isOffice) throw unprocessable('Only the Alumni Relations Office can edit a campaign');
  const existing = await prisma.fundraisingCampaign.findFirst({
    where: { id: campaignId, institutionId: viewer.institutionId },
    select: { id: true, targetMinor: true, status: true },
  });
  if (!existing) throw notFound('Campaign not found');

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (!body.name.trim()) throw unprocessable('A campaign needs a name');
    data.name = body.name.trim();
  }
  if (body.description !== undefined) data.description = body.description.trim() || null;
  if (body.category !== undefined) data.category = body.category;
  if (body.beneficiary !== undefined) data.beneficiary = body.beneficiary.trim() || null;
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl || null;
  if (body.targetRupees !== undefined) data.targetMinor = toMinor(body.targetRupees);
  if (body.deadline !== undefined) {
    if (body.deadline === null) data.deadline = null;
    else {
      const d = new Date(body.deadline);
      if (Number.isNaN(d.getTime())) throw unprocessable('Invalid deadline');
      data.deadline = d;
    }
  }
  if (body.status !== undefined) data.status = body.status;
  if (Object.keys(data).length === 0) return { id: existing.id, unchanged: true };

  const updated = await prisma.fundraisingCampaign.update({ where: { id: existing.id }, data });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'campaign.update',
    entityType: 'FundraisingCampaign',
    entityId: updated.id,
    before: { targetMinor: existing.targetMinor, status: existing.status },
    after: data,
  });

  return {
    id: updated.id,
    name: updated.name,
    status: updated.status,
    targetRupees: toRupees(updated.targetMinor),
  };
}
