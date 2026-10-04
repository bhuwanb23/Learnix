// Alumni Relations service (docs/users/12 §3 data contracts, rupee fields at API edge).
// Money: stored paise → API rupees (divide by 100). Tenant-scoped by institutionId.
import { prisma } from '../../db/prisma.js';
import { notFound, conflict, unprocessable } from '../../lib/errors.js';
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

export async function addMentor(institutionId: string, profileId: string, actorUserId: string) {
  const profile = await prisma.alumniProfile.findFirst({
    where: { id: profileId, user: { institutionId } },
    include: { user: { select: { id: true, fullName: true } } },
  });
  if (!profile) throw notFound('Alumni not found');

  // Demo mentee: the first active student profile in the institution
  const mentee = await prisma.studentProfile.findFirst({
    where: { user: { institutionId, deletedAt: null } },
    include: { user: { select: { id: true, fullName: true } } },
  });
  if (!mentee) throw unprocessable('No student available to pair as mentee');

  const existing = await prisma.mentorshipPair.findFirst({
    where: { mentorAlumniUserId: profile.userId, menteeStudentProfileId: mentee.id, status: { in: ['PENDING', 'ACTIVE'] } },
  });
  if (existing) throw conflict('Already a mentor for an active/pending pair');

  const pair = await prisma.mentorshipPair.create({
    data: {
      mentorAlumniUserId: profile.userId,
      menteeStudentProfileId: mentee.id,
      field: profile.currentRole ? 'Career Guidance' : 'Career',
      status: 'PENDING',
    },
  });
  await writeAudit({
    actorUserId,
    institutionId,
    action: 'mentorship.request',
    entityType: 'MentorshipPair',
    entityId: pair.id,
    after: { mentor: profile.user.fullName, mentee: mentee.user.fullName },
  });
  return { id: pair.id, mentor: profile.user.fullName, mentee: mentee.user.fullName, status: 'PENDING' };
}

// ── AL-03 Events + RSVP ─────────────────────────────────────
export async function listEvents(institutionId: string) {
  const events = await prisma.event.findMany({
    where: { institutionId, category: 'ALUMNI' },
    orderBy: { startDate: 'asc' },
    include: {
      venue: { select: { name: true } },
      _count: { select: { registrations: true } },
    },
  });

  const now = new Date();
  return {
    upcoming: events
      .filter((e) => e.startDate >= now && e.status !== 'CANCELLED' && e.status !== 'COMPLETED')
      .map(mapEvent),
    completed: events.filter((e) => e.status === 'COMPLETED' || e.startDate < now).map(mapEvent),
  };
}

function mapEvent(e: {
  id: string;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  venue: { name: string } | null;
  capacity: number;
  status: string;
  _count: { registrations: number };
}) {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    startDate: e.startDate,
    endDate: e.endDate,
    venue: e.venue?.name ?? null,
    capacity: e.capacity,
    rsvps: e._count.registrations,
    status: e.status,
  };
}

export async function getEventDetail(institutionId: string, eventId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, institutionId },
    include: {
      venue: { select: { name: true } },
      registrations: {
        include: { registrant: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
      },
      scheduleItems: { orderBy: [{ day: 'asc' }, { order: 'asc' }] },
    },
  });
  if (!event) throw notFound('Event not found');

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    venue: event.venue?.name ?? null,
    capacity: event.capacity,
    rsvps: event.registrations.length,
    status: event.status,
    schedule: event.scheduleItems.map((s) => ({
      day: s.day,
      order: s.order,
      item: s.item,
      isDone: s.isDone,
    })),
    rsvpList: event.registrations.map((r) => ({
      id: r.id,
      registrantId: r.registrantUserId,
      name: r.registrant.fullName,
      status: r.status,
      createdAt: r.createdAt,
    })),
  };
}

export async function decideRsvp(
  institutionId: string,
  registrationId: string,
  decision: 'CONFIRMED' | 'DECLINED',
  actorUserId: string,
) {
  const reg = await prisma.eventRegistration.findFirst({
    where: { id: registrationId, event: { institutionId } },
    include: { event: { select: { title: true } } },
  });
  if (!reg) throw notFound('RSVP not found');
  if (reg.status === decision) return { id: reg.id, status: reg.status, changed: false };

  const updated = await prisma.eventRegistration.update({
    where: { id: reg.id },
    data: { status: decision },
  });

  await Promise.all([
    writeAudit({
      actorUserId,
      institutionId,
      action: `rsvp.${decision.toLowerCase()}`,
      entityType: 'EventRegistration',
      entityId: reg.id,
      before: { status: reg.status },
      after: { status: decision },
    }),
    prisma.notification.create({
      data: {
        institutionId,
        recipientUserId: reg.registrantUserId,
        type: 'EVENT',
        title: `RSVP ${decision === 'CONFIRMED' ? 'confirmed' : 'declined'}`,
        body: `Your RSVP for "${reg.event.title}" was ${decision.toLowerCase()}.`,
        sourceModule: 'alumni',
      },
    }),
  ]);

  return { id: updated.id, status: updated.status, changed: true };
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

// ── AL-05 Mentorship ────────────────────────────────────────
export async function listMentorship(institutionId: string) {
  const pairs = await prisma.mentorshipPair.findMany({
    where: { menteeStudentProfile: { user: { institutionId } } },
    include: {
      mentorAlumniUser: { select: { id: true, fullName: true, alumniProfile: { select: { graduationYear: true, currentRole: true } } } },
      menteeStudentProfile: { include: { user: { select: { fullName: true } } } },
      sessions: { orderBy: { sessionDate: 'desc' } },
    },
    orderBy: { requestedAt: 'desc' },
  });

  const recentSessions = pairs.flatMap((p) =>
    p.sessions.slice(0, 1).map((s) => ({
      id: s.id,
      pairId: p.id,
      mentor: p.mentorAlumniUser.fullName,
      mentee: p.menteeStudentProfile.user.fullName,
      field: p.field,
      sessionDate: s.sessionDate,
      notes: s.notes,
    })),
  );

  return {
    active: pairs
      .filter((p) => p.status === 'ACTIVE')
      .map((p) => mapPair(p, p.sessions.length)),
    pending: pairs
      .filter((p) => p.status === 'PENDING')
      .map((p) => mapPair(p, p.sessions.length)),
    recentSessions,
  };
}

function mapPair(
  p: {
    id: string;
    field: string;
    status: string;
    requestedAt: Date;
    mentorAlumniUser: { id: string; fullName: string; alumniProfile: { graduationYear: number | null; currentRole: string | null } | null };
    menteeStudentProfile: { user: { fullName: string } };
  },
  sessionCount: number,
) {
  return {
    id: p.id,
    mentor: {
      id: p.mentorAlumniUser.id,
      name: p.mentorAlumniUser.fullName,
      batch: p.mentorAlumniUser.alumniProfile?.graduationYear ?? null,
      role: p.mentorAlumniUser.alumniProfile?.currentRole ?? null,
    },
    mentee: p.menteeStudentProfile.user.fullName,
    field: p.field,
    status: p.status,
    sessions: sessionCount,
    requestedAt: p.requestedAt,
  };
}

export async function mentorshipAction(
  institutionId: string,
  pairId: string,
  action: 'approve' | 'decline' | 'remind',
  actorUserId: string,
) {
  const pair = await prisma.mentorshipPair.findFirst({
    where: { id: pairId, menteeStudentProfile: { user: { institutionId } } },
    include: {
      mentorAlumniUser: { select: { id: true, fullName: true } },
      menteeStudentProfile: { include: { user: { select: { id: true, fullName: true } } } },
    },
  });
  if (!pair) throw notFound('Mentorship pair not found');

  if (action === 'remind') {
    await prisma.notification.create({
      data: {
        institutionId,
        recipientUserId: pair.mentorAlumniUserId,
        type: 'MENTORSHIP',
        title: 'Mentorship session reminder',
        body: `Please schedule your next session with ${pair.menteeStudentProfile.user.fullName} (${pair.field}).`,
        sourceModule: 'alumni',
      },
    });
    return { id: pair.id, action, reminded: true };
  }

  if (pair.status !== 'PENDING') {
    throw unprocessable(`Cannot ${action} a pair that is ${pair.status}`);
  }
  if (action === 'approve') {
    const updated = await prisma.mentorshipPair.update({
      where: { id: pair.id },
      data: { status: 'ACTIVE', approvedAt: new Date() },
    });
    await Promise.all([
      writeAudit({
        actorUserId,
        institutionId,
        action: 'mentorship.approve',
        entityType: 'MentorshipPair',
        entityId: pair.id,
        before: { status: 'PENDING' },
        after: { status: 'ACTIVE' },
      }),
      prisma.notification.create({
        data: {
          institutionId,
          recipientUserId: pair.mentorAlumniUserId,
          type: 'MENTORSHIP',
          title: 'Mentorship request approved',
          body: `You are now mentoring ${pair.menteeStudentProfile.user.fullName} (${pair.field}).`,
          sourceModule: 'alumni',
        },
      }),
    ]);
    return { id: updated.id, status: updated.status };
  }

  // decline
  await prisma.mentorshipPair.update({ where: { id: pair.id }, data: { status: 'DECLINED' } });
  await writeAudit({
    actorUserId,
    institutionId,
    action: 'mentorship.decline',
    entityType: 'MentorshipPair',
    entityId: pair.id,
    before: { status: 'PENDING' },
    after: { status: 'DECLINED' },
  });
  return { id: pair.id, status: 'DECLINED' };
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
