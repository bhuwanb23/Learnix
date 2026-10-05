// The donation ledger — listing, filtering, aggregation, and anonymity.
// Docs: 12-alumni-relations.md §3.4
//
// Moved out of `alumni.service.ts` (which was 408 lines and mixed the ledger with
// notifications, broadcasts and profiles).
//
// ─────────────────────────────────────────────────────────────
// Anonymity is decided HERE, on the server, not in the client
// ─────────────────────────────────────────────────────────────
// An anonymous donation still names a donor in the database, because 80G receipts
// and bank reconciliation need the real person. So the rule is asymmetric:
//   • office            → sees the name
//   • the donor         → sees their own name
//   • everyone else     → sees "Anonymous"
// If this lived in the client the name would still be on the wire, which means a
// proxy log or a screenshot would leak exactly what the donor asked to hide.

import { prisma } from '../../../db/prisma.js';
import { toRupees, fundMeta } from './money.js';
// `isOpen` lives with the campaign rules so "closed" is defined once. Imported as
// a value, not a type, and only here to evaluate a campaign's effective state.
import { isOpen } from './campaigns.service.js';
import type { Viewer } from '../directory.service.js';

const DONATION_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * One row for the ledger.
 *
 * `isMine` and `viewerContext` are computed rather than inferred on screen: a
 * graduate who is also a chapter officer is both, and a screen that guesses from
 * the data it happens to hold is how the office ends up being offered its own
 * buttons.
 */
function shapeDonation(
  d: {
    id: string;
    fund: string;
    amountMinor: number;
    status: string;
    receivedAt: Date | null;
    createdAt: Date;
    method: string | null;
    note: string | null;
    isAnonymous: boolean;
    recurringId: string | null;
    paymentId: string | null;
    alumniUserId: string;
    campaignId: string | null;
    alumniUser: { fullName: string; alumniProfile: { graduationYear: number | null } | null };
    campaign?: { id: string; name: string; category: string | null } | null;
  },
  viewer: Viewer | undefined,
) {
  const anonymous = d.isAnonymous && !(viewer?.isOffice || viewer?.userId === d.alumniUserId);
  return {
    id: d.id,
    donor: anonymous ? 'Anonymous' : d.alumniUser.fullName,
    batch: anonymous ? null : d.alumniUser.alumniProfile?.graduationYear ?? null,
    isAnonymous: d.isAnonymous,
    fund: d.fund,
    fundLabel: fundMeta(d.fund).label,
    amountRupees: toRupees(d.amountMinor),
    status: d.status,
    // `receivedAt` is the money date; a pledge has none, so it falls back to when
    // the pledge was made. Both are returned so the UI can label them correctly.
    date: d.receivedAt ?? d.createdAt,
    pledgedAt: d.createdAt,
    receivedAt: d.receivedAt,
    method: d.method,
    note: d.note,
    campaign: d.campaign ? { id: d.campaign.id, name: d.campaign.name, category: d.campaign.category } : null,
    isRecurring: !!d.recurringId,
    recurringId: d.recurringId,
    // A receipt only exists once the money is recorded — a pledge must not look
    // like it can produce one.
    hasReceipt: d.status === 'RECEIVED' && !!d.paymentId,
    paymentId: d.paymentId,
    isMine: viewer?.userId === d.alumniUserId,
  };
}

const donationInclude = {
  alumniUser: { select: { fullName: true, alumniProfile: { select: { graduationYear: true } } } },
  campaign: { select: { id: true, name: true, category: true } },
} as const;

export type DonationFilters = {
  page?: number;
  pageSize?: number;
  campaignId?: string;
  fund?: string;
  status?: string;
  /** Year of `createdAt`, for the financial-year filter. */
  year?: number;
  /** Restrict to one donor (the "my giving" view). */
  mine?: boolean;
};

/**
 * The ledger, plus the aggregate totals every donations screen shows.
 *
 * Totals are AGGREGATED over every matching row, never summed from the page being
 * returned. Summing the page once reported ₹23.0L while the dashboard reported
 * ₹2.07 Cr for the same money — the same app contradicting itself by 11×, hidden
 * for as long as the ledger held fewer rows than the old hard-coded `take: 50`.
 */
export async function listDonations(
  institutionId: string,
  viewer: Viewer | undefined,
  query: DonationFilters = {},
) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? DONATION_PAGE_SIZE));

  const where: Record<string, unknown> = { institutionId };
  if (query.campaignId) where.campaignId = query.campaignId;
  if (query.fund) where.fund = query.fund;
  if (query.status) where.status = query.status;
  if (query.year) {
    where.createdAt = {
      gte: new Date(query.year, 0, 1),
      lt: new Date(query.year + 1, 0, 1),
    };
  }
  // `mine` is resolved against the session, never a client-supplied userId —
  // otherwise "my giving" would be "anybody's giving" with a query parameter.
  if (query.mine && viewer?.userId) where.alumniUserId = viewer.userId;

  const [rows, total, receivedAgg, pledgedAgg, receivedDonors] = await Promise.all([
    prisma.donation.findMany({
      where,
      include: donationInclude,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.donation.count({ where }),
    prisma.donation.aggregate({ where: { ...where, status: 'RECEIVED' }, _sum: { amountMinor: true } }),
    prisma.donation.aggregate({ where: { ...where, status: 'PLEDGED' }, _sum: { amountMinor: true } }),
    // Distinct donors, counted in the database. A Set() over one page of rows
    // reports the page's donor count, not the programme's.
    prisma.donation.findMany({
      where: { ...where, status: 'RECEIVED' },
      distinct: ['alumniUserId'],
      select: { alumniUserId: true },
    }),
  ]);

  return {
    fy: {
      collectedRupees: toRupees(receivedAgg._sum.amountMinor ?? 0),
      pledgedRupees: toRupees(pledgedAgg._sum.amountMinor ?? 0),
      donors: receivedDonors.length,
    },
    donations: rows.map((d) => shapeDonation(d as never, viewer)),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

/**
 * Contribution impact for ONE donor: what they gave, and how far it went.
 *
 * Every number is derived from that donor's own rows. Nothing is estimated and
 * nothing is claimed on the college's behalf — in particular there is no
 * "beneficiaries reached" figure, because the schema records no link between a
 * gift and an individual student, and a made-up impact number is worse than none.
 */
export async function getMyImpact(institutionId: string, viewer: Viewer) {
  const mine = await prisma.donation.findMany({
    where: { institutionId, alumniUserId: viewer.userId },
    orderBy: { createdAt: 'desc' },
    include: {
      campaign: {
        select: { id: true, name: true, targetMinor: true, raisedMinor: true, status: true, deadline: true },
      },
    },
  });

  const received = mine.filter((d) => d.status === 'RECEIVED');
  const pending = mine.filter((d) => d.status === 'PLEDGED');
  const lifetimeMinor = received.reduce((s, d) => s + d.amountMinor, 0);

  // By fund, so a donor can see the shape of their own giving rather than one
  // total number. Aggregated in JS over the donor's own rows, which is bounded by
  // how often one person gives — unlike the programme-wide aggregates, which must
  // be done in SQL.
  const byFundMap = new Map<string, { fund: string; amountMinor: number; count: number }>();
  for (const d of received) {
    const row = byFundMap.get(d.fund) ?? { fund: d.fund, amountMinor: 0, count: 0 };
    row.amountMinor += d.amountMinor;
    row.count += 1;
    byFundMap.set(d.fund, row);
  }

  // One row per campaign, with THIS donor's contribution alongside the campaign's
  // own progress — the pair is the point: "I gave ₹5,000 and the project is 62%
  // funded" is information that neither number gives alone.
  const campaignMap = new Map<
    string,
    { id: string; name: string; targetMinor: number; raisedMinor: number; status: string; deadline: Date | null; mineMinor: number }
  >();
  for (const d of received) {
    if (!d.campaign) continue;
    const row =
      campaignMap.get(d.campaign.id) ??
      {
        id: d.campaign.id,
        name: d.campaign.name,
        targetMinor: d.campaign.targetMinor,
        raisedMinor: d.campaign.raisedMinor,
        status: d.campaign.status,
        deadline: d.campaign.deadline,
        mineMinor: 0,
      };
    row.mineMinor += d.amountMinor;
    // Re-read the campaign total rather than adding to a stored copy: the campaign
    // row may have moved since this gift, and a stale figure here would be a lie.
    row.raisedMinor = d.campaign.raisedMinor;
    campaignMap.set(d.campaign.id, row);
  }

  const mandates = await prisma.recurringContribution.findMany({
    where: { institutionId, donorUserId: viewer.userId, status: { in: ['ACTIVE', 'PAUSED'] } },
    select: { id: true },
  });

  const first = received[received.length - 1] ?? null;

  return {
    lifetimeRupees: toRupees(lifetimeMinor),
    pendingRupees: toRupees(pending.reduce((s, d) => s + d.amountMinor, 0)),
    giftCount: received.length,
    pledgeCount: pending.length,
    anonymousCount: received.filter((d) => d.isAnonymous).length,
    campaignCount: campaignMap.size,
    standingCount: mandates.length,
    firstGiftAt: first?.receivedAt ?? null,
    firstGiftYear: first?.receivedAt ? new Date(first.receivedAt).getFullYear() : null,
    byFund: [...byFundMap.values()]
      .map((f) => ({ fund: f.fund, amountRupees: toRupees(f.amountMinor), count: f.count }))
      .sort((a, b) => b.amountRupees - a.amountRupees),
    campaigns: [...campaignMap.values()].map((c) => ({
      id: c.id,
      name: c.name,
      myRupees: toRupees(c.mineMinor),
      targetRupees: toRupees(c.targetMinor),
      raisedRupees: toRupees(c.raisedMinor),
      percent: c.targetMinor === 0 ? 0 : Math.round((c.raisedMinor / c.targetMinor) * 100),
      status: c.status,
      isOpen: isOpen(c),
    })),
  };
}

/** One donation, with the caller's rights resolved server-side. */
export async function getDonation(institutionId: string, donationId: string, viewer: Viewer | undefined) {
  const d = await prisma.donation.findFirst({
    where: { id: donationId, institutionId },
    include: donationInclude,
  });
  if (!d) return null;

  const isOwner = viewer?.userId === d.alumniUserId;
  if (!isOwner && !viewer?.isOffice) return null;

  return {
    ...shapeDonation(d as never, viewer),
    viewerContext: {
      isOffice: !!viewer?.isOffice,
      isMine: !!isOwner,
      canRecord: !!viewer?.isOffice && d.status === 'PLEDGED',
      canViewReceipt: d.status === 'RECEIVED',
    },
  };
}
