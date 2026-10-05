// Alumni Relations service (docs/users/12 §3 data contracts, rupee fields at API edge).
// Money: stored paise → API rupees (divide by 100). Tenant-scoped by institutionId.
import { prisma } from '../../db/prisma.js';
import { notFound, conflict } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

const toRupees = (paise: number) => Math.round(paise / 100);

// ── AL-01 Dashboard ──────────────────────────────────────────
export async function getDashboard(institutionId: string, userId: string) {
  const [totalAlumni, activeAlumni, upcomingEvents, receivedDonations, pledgedDonations, activePairs, pendingPairs, notifications] =
    await Promise.all([
      prisma.alumniProfile.count({ where: { institutionId } }),
      prisma.alumniProfile.count({ where: { institutionId, engagementStatus: 'ACTIVE' } }),
      prisma.event.findMany({
        where: { institutionId, category: 'ALUMNI', status: { in: ['APPROVED', 'PUBLISHED'] }, startDate: { gte: new Date() } },
        orderBy: { startDate: 'asc' },
        take: 5,
        include: { venue: { select: { name: true } }, _count: { select: { registrations: true } } },
      }),
      prisma.payment.aggregate({
        where: { institutionId, category: 'DONATION', status: 'CLEARED' },
        _sum: { amountMinor: true },
      }),
      prisma.donation.aggregate({
        where: { institutionId, status: 'PLEDGED' },
        _sum: { amountMinor: true },
      }),
      prisma.mentorshipPair.count({ where: { menteeStudentProfile: { user: { institutionId } }, status: 'ACTIVE' } }),
      prisma.mentorshipPair.count({ where: { menteeStudentProfile: { user: { institutionId } }, status: 'PENDING' } }),
      // Scoped to the REQUESTING USER, not the whole institution. Counting every
      // unread notification for the tenant put a badge reading "349 unread" on
      // an officer whose own inbox was empty — the number counted other people's
      // mail. It read as plausible only because the demo had one user.
      prisma.notification.count({ where: { institutionId, recipientUserId: userId, readAt: null } }),
    ]);

  const campaigns = await prisma.fundraisingCampaign.findMany({
    where: { institutionId, status: 'ACTIVE' },
    select: { name: true, targetMinor: true, raisedMinor: true },
    take: 5,
  });

  const engagementPct = totalAlumni === 0 ? 0 : Math.round((activeAlumni / totalAlumni) * 100);

  return {
    engagement: { totalAlumni, activeAlumni, percentage: engagementPct },
    stats: {
      alumni: totalAlumni,
      upcomingEvents: upcomingEvents.length,
      donationsReceivedRupees: toRupees(receivedDonations._sum.amountMinor ?? 0),
      donationsPledgedRupees: toRupees(pledgedDonations._sum.amountMinor ?? 0),
      activeMentorships: activePairs,
      pendingMentorships: pendingPairs,
    },
    alerts: [
      ...(pendingPairs > 0
        ? [{ type: 'MENTORSHIP', message: `${pendingPairs} mentorship request(s) awaiting decision` }]
        : []),
      ...(upcomingEvents.length === 0
        ? [{ type: 'EVENTS', message: 'No upcoming alumni events scheduled' }]
        : []),
    ],
    upcomingEvents: upcomingEvents.map((e) => ({
      id: e.id,
      title: e.title,
      startDate: e.startDate,
      venue: e.venue?.name ?? null,
      rsvps: e._count.registrations,
      capacity: e.capacity,
    })),
    campaigns: campaigns.map((c) => ({
      name: c.name,
      targetRupees: toRupees(c.targetMinor),
      raisedRupees: toRupees(c.raisedMinor),
      percent: c.targetMinor === 0 ? 0 : Math.round((c.raisedMinor / c.targetMinor) * 100),
    })),
    unreadNotifications: notifications,
  };
}



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


// ── AL-07 Notifications + broadcast ─────────────────────────
export async function listNotifications(userId: string, institutionId: string) {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientUserId: userId, institutionId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({ where: { recipientUserId: userId, institutionId, readAt: null } }),
  ]);
  return {
    unread,
    notifications: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      read: n.readAt !== null,
      createdAt: n.createdAt,
      data: n.dataJson ? JSON.parse(n.dataJson) : null,
    })),
  };
}

export async function markAllRead(userId: string, institutionId: string) {
  const res = await prisma.notification.updateMany({
    where: { recipientUserId: userId, institutionId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: res.count };
}

export async function createBroadcast(
  institutionId: string,
  senderUserId: string,
  body: { audience: string; templateKey: string; title: string; body: string },
) {
  // Resolve audience → recipient userIds
  let recipientIds: string[] = [];
  if (body.audience === 'ALL_ALUMNI') {
    const users = await prisma.alumniProfile.findMany({
      where: { user: { institutionId, deletedAt: null } },
      select: { userId: true },
    });
    recipientIds = users.map((u) => u.userId);
  } else if (body.audience === 'CITY_BENGALURU') {
    const users = await prisma.alumniProfile.findMany({
      where: { user: { institutionId }, chapter: { city: 'Bengaluru' } },
      select: { userId: true },
    });
    recipientIds = users.map((u) => u.userId);
  } else if (body.audience === 'MENTORS') {
    const users = await prisma.mentorshipPair.findMany({
      where: { menteeStudentProfile: { user: { institutionId } }, status: 'ACTIVE' },
      select: { mentorAlumniUserId: true },
    });
    recipientIds = [...new Set(users.map((u) => u.mentorAlumniUserId))];
  } else if (body.audience === 'BATCH_2024') {
    const users = await prisma.alumniProfile.findMany({
      where: { user: { institutionId }, graduationYear: 2024 },
      select: { userId: true },
    });
    recipientIds = users.map((u) => u.userId);
  }

  const broadcast = await prisma.broadcast.create({
    data: {
      institutionId,
      senderUserId,
      audienceJson: JSON.stringify({ audience: body.audience }),
      templateKey: body.templateKey,
      title: body.title,
      body: body.body,
      channels: 'IN_APP',
      sentAt: new Date(),
    },
  });

  if (recipientIds.length > 0) {
    await prisma.notification.createMany({
      data: recipientIds.map((rid) => ({
        institutionId,
        recipientUserId: rid,
        type: 'BROADCAST',
        title: body.title,
        body: body.body,
        sourceModule: 'alumni',
      })),
    });
  }

  await writeAudit({
    actorUserId: senderUserId,
    institutionId,
    action: 'broadcast.send',
    entityType: 'Broadcast',
    entityId: broadcast.id,
    after: { audience: body.audience, recipients: recipientIds.length },
  });

  return { id: broadcast.id, recipients: recipientIds.length };
}

// ── AL-08 Profile ───────────────────────────────────────────
export async function getProfile(userId: string, institutionId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, institutionId },
    include: { roles: true },
  });
  if (!user) throw notFound('User not found');

  const [activePairs, sessions, campaigns] = await Promise.all([
    prisma.mentorshipPair.count({ where: { menteeStudentProfile: { user: { institutionId } }, status: 'ACTIVE' } }),
    prisma.mentorshipSession.count({ where: { pair: { menteeStudentProfile: { user: { institutionId } } } } }),
    prisma.fundraisingCampaign.count({ where: { institutionId, status: 'ACTIVE' } }),
  ]);

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    roles: user.roles.map((r) => r.role),
    programStats: { activeMentorships: activePairs, sessionsLogged: sessions, activeCampaigns: campaigns },
  };
}
