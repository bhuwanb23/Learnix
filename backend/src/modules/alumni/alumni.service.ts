// Alumni Relations service (docs/users/12 §3 data contracts, rupee fields at API edge).
// Money: stored paise → API rupees (divide by 100). Tenant-scoped by institutionId.
import { prisma } from '../../db/prisma.js';
import { notFound, conflict } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

const toRupees = (paise: number) => Math.round(paise / 100);

// AL-01 Dashboard has MOVED to dashboard.service.ts as getGraduateDashboard.
//
// getDashboard(institutionId, userId) is deleted. It returned an OFFICE engagement view:
// total alumni, an engagement percentage, donations RECEIVED BY THE SCHOOL, and the count
// of mentorship pairs awaiting the office's decision. Every figure was an institution-wide
// aggregate, on the screen a graduate opens expecting their own batch and their own giving.
//
// The replacement takes a Viewer rather than a raw (institutionId, userId) pair, so it is
// per-user by construction and another institution-wide query cannot be added to it by
// accident.

// AL-02 actions: invite (notification) + add-mentor (creates PENDING pair)
export async function inviteAlumni(institutionId: string, profileId: string, actorUserId: string) {
  const profile = await prisma.alumniProfile.findFirst({
    where: { id: profileId, user: { institutionId } },
    include: { user: { select: { id: true, fullName: true } } },
  });
  if (!profile) throw notFound('Alumni not found');
  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: profile.userId,
      type: 'EVENT',
      title: 'You are invited!',
      body: 'The Alumni Relations Office has invited you to our upcoming alumni events. Check the events section for details.',
      sourceModule: 'alumni',
    },
  });
  await writeAudit({
    actorUserId,
    institutionId,
    action: 'alumni.invite',
    entityType: 'AlumniProfile',
    entityId: profile.id,
    after: { invited: profile.user.fullName },
  });
  return { id: profile.id, invited: profile.user.fullName };
}

// ── AL-04 Donations ─────────────────────────────────────────
/**
 * Page/pageSize bounds for the donation ledger. The ledger grows without limit
 * (every gift is a row), so it cannot be returned whole.
 */
const DONATION_PAGE_SIZE = 25;
const DONATION_MAX_PAGE_SIZE = 100;

export async function listDonations(
  institutionId: string,
  query: { page?: number; pageSize?: number } = {},
) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(
    DONATION_MAX_PAGE_SIZE,
    Math.max(1, query.pageSize ?? DONATION_PAGE_SIZE),
  );

  const [campaigns, donations, total, receivedAgg, pledgedAgg, receivedDonors] =
    await Promise.all([
      prisma.fundraisingCampaign.findMany({
        where: { institutionId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.donation.findMany({
        where: { institutionId },
        include: { alumniUser: { select: { fullName: true, alumniProfile: { select: { graduationYear: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.donation.count({ where: { institutionId } }),
      // Totals are AGGREGATED over every donation, never summed from the page
      // of rows being returned. Summing the page reported ₹23.0L while the
      // dashboard — which aggregates properly — reported ₹2.07 Cr for the same
      // money: the same app contradicting itself by 11×. It only stayed hidden
      // while the ledger held 2 rows, well under the old `take: 50`.
      prisma.donation.aggregate({
        where: { institutionId, status: 'RECEIVED' },
        _sum: { amountMinor: true },
      }),
      prisma.donation.aggregate({
        where: { institutionId, status: 'PLEDGED' },
        _sum: { amountMinor: true },
      }),
      // Distinct donors, for real this time — counting DISTINCT alumniUserId in
      // the database rather than Set() over one page of rows.
      prisma.donation.findMany({
        where: { institutionId, status: 'RECEIVED' },
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
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      targetRupees: toRupees(c.targetMinor),
      raisedRupees: toRupees(c.raisedMinor),
      // NOT clamped: a campaign CAN overshoot (a reunion fund that raised 128%
      // of target is the common real case). The UI is responsible for rendering
      // the bar at 100% while still showing the true percentage as text.
      percent: c.targetMinor === 0 ? 0 : Math.round((c.raisedMinor / c.targetMinor) * 100),
      daysLeft: c.deadline ? Math.max(0, Math.ceil((c.deadline.getTime() - Date.now()) / 86400000)) : null,
      status: c.status,
    })),
    donations: donations.map((d) => ({
      id: d.id,
      donor: d.alumniUser.fullName,
      batch: d.alumniUser.alumniProfile?.graduationYear ?? null,
      fund: d.fund,
      amountRupees: toRupees(d.amountMinor),
      status: d.status,
      date: d.receivedAt ?? d.createdAt,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function recordDonation(institutionId: string, donationId: string, actorUserId: string, ip: string | null) {
  const donation = await prisma.donation.findFirst({
    where: { id: donationId, institutionId },
    include: { alumniUser: { select: { fullName: true } } },
  });
  if (!donation) throw notFound('Donation not found');
  if (donation.status === 'RECEIVED') throw conflict('Donation already recorded');

  // Write-through: Payment(DONATION) + Receipt + DonationPayment link (Phase-4 pattern)
  const result = await prisma.$transaction(async (tx) => {
    const count = await tx.payment.count({ where: { institutionId } });
    const payment = await tx.payment.create({
      data: {
        institutionId,
        payerUserId: donation.alumniUserId,
        studentProfileId: null,
        category: 'DONATION',
        referenceNo: `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`,
        amountMinor: donation.amountMinor,
        method: 'NET_BANKING',
        status: 'CLEARED',
        paidAt: new Date(),
        recordedByUserId: actorUserId,
      },
    });
    const receipt = await tx.receipt.create({
      data: {
        paymentId: payment.id,
        receiptNo: `RCP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`,
      },
    });
    await tx.donationPayment.create({
      data: { paymentId: payment.id, donationId: donation.id },
    });
    await tx.donation.update({
      where: { id: donation.id },
      data: { status: 'RECEIVED', receivedAt: new Date(), paymentId: payment.id },
    });
    if (donation.campaignId) {
      await tx.fundraisingCampaign.update({
        where: { id: donation.campaignId },
        data: { raisedMinor: { increment: donation.amountMinor } },
      });
    }
    return { payment, receipt };
  });

  await Promise.all([
    writeAudit({
      actorUserId,
      institutionId,
      action: 'donation.record',
      entityType: 'Donation',
      entityId: donation.id,
      before: { status: 'PLEDGED' },
      after: { status: 'RECEIVED', paymentRef: result.payment.referenceNo, receiptNo: result.receipt.receiptNo },
      ip,
    }),
    prisma.notification.create({
      data: {
        institutionId,
        recipientUserId: donation.alumniUserId,
        type: 'DONATION',
        title: 'Donation received — thank you!',
        body: `Your gift of ₹${toRupees(donation.amountMinor).toLocaleString('en-IN')} was recorded. Receipt ${result.receipt.receiptNo} has been forwarded to Accounts & Finance.`,
        sourceModule: 'alumni',
      },
    }),
  ]);

  return {
    id: donation.id,
    status: 'RECEIVED',
    donor: donation.alumniUser.fullName,
    paymentReference: result.payment.referenceNo,
    receiptNo: result.receipt.receiptNo,
    amountRupees: toRupees(donation.amountMinor),
  };
}

// AL-07 Notifications + broadcast
//
// `listNotifications`, `markAllRead` and `createBroadcast` were deleted from this file
// and now live in `./notifications/`, reached through the `notifications` sub-router.
// They could not stay: the inbox needed a category filter, a page, a single-row read and
// a mute list; the broadcast needed a real audience instead of two hardcoded values,
// plus a `deletedAt` filter on every branch. A half-migrated pair - a route here and
// a service there - is how two inboxes end up reading one table differently.

// -- AL-08 Profile --------------------------------------------------------------------
//
// `getProfile(userId, institutionId)` is deleted, along with the literal
// `GET /alumni/profile` route that called it. It returned identity plus three
// `programStats` counters and no editable profile data, it had no caller outside its own
// route, and its counters filtered on `institutionId` alone — so they were school-wide
// totals sitting under the key `programStats`. Worse, being a literal route it shadowed
// the `profile` sub-router mounted in `alumni.routes.ts`, which meant the real
// self-service profile was unreachable over HTTP.
//
// Self-service profile reads and writes now live in `./profile/` and are mounted at
// `/alumni/profile`. The directory-facing view of someone else's profile is
// `directory.getProfileDetail`, which is a different function with a different
// contract.
