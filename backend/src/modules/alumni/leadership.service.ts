// Chapter leadership (officers) and initiatives.
// Docs: 12-alumni-relations.md §3.6 (chapter leadership, activities &
// initiatives).
//
// Split from chapters.service.ts so the chapter READ path stays readable. The
// invariant that matters most here:
//
//   `AlumniChapter.presidentAlumniUserId` is a denormalised pointer to the
//   current PRESIDENT row in AlumniChapterOfficer. It is written in exactly two
//   places — assignOfficer() and resignOfficer() — and nowhere else. Two writers
//   would be three if a controller or seed also wrote it, and a pointer that can
//   drift from its table is worse than no pointer at all.

import { prisma } from '../../db/prisma.js';
import { notFound, conflict, unprocessable, forbidden } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import type { Viewer } from './directory.service.js';

const DAY = 24 * 60 * 60 * 1000;

const OFFICER_ROLES = ['PRESIDENT', 'VICE_PRESIDENT', 'SECRETARY', 'TREASURER', 'COORDINATOR'] as const;
export type OfficerRole = (typeof OFFICER_ROLES)[number];

const toRupees = (paise: number) => Math.round(paise / 100);

// ─────────────────────────────────────────────────────────────
// Leadership — read
// ─────────────────────────────────────────────────────────────

export async function listOfficers(institutionId: string, chapterId: string, includePast = false) {
  const chapter = await prisma.alumniChapter.findFirst({
    where: { id: chapterId, institutionId },
    select: { id: true, city: true, presidentAlumniUserId: true },
  });
  if (!chapter) throw notFound('Chapter not found');

  const rows = await prisma.alumniChapterOfficer.findMany({
    where: { chapterId, ...(includePast ? {} : { isCurrent: true }) },
    include: {
      alumniUser: {
        select: {
          id: true,
          fullName: true,
          alumniProfile: {
            select: {
              graduationYear: true,
              currentRole: true,
              headline: true,
              company: { select: { name: true } },
            },
          },
        },
      },
    },
    // PRESIDENT first, then the rest of the committee, then longest-serving.
    orderBy: [{ since: 'asc' }],
  });

  const rank = (r: string) => {
    const i = OFFICER_ROLES.indexOf(r as OfficerRole);
    return i === -1 ? OFFICER_ROLES.length : i;
  };
  const ordered = [...rows].sort((a, b) => rank(a.role) - rank(b.role) || a.since.getTime() - b.since.getTime());

  const current = ordered.filter((o) => o.isCurrent);
  const now = Date.now();

  return {
    chapterId: chapter.id,
    city: chapter.city,
    officers: ordered.map((o) => ({
      id: o.id,
      role: o.role,
      since: o.since,
      until: o.until,
      isCurrent: o.isCurrent,
      // Tenure in whole days, so the UI can say "2 yrs" without doing date maths.
      tenureDays: o.isCurrent
        ? Math.max(0, Math.floor((now - o.since.getTime()) / DAY))
        : Math.max(0, Math.floor(((o.until?.getTime() ?? now) - o.since.getTime()) / DAY)),
      notes: o.notes,
      person: {
        userId: o.alumniUser.id,
        name: o.alumniUser.fullName,
        graduationYear: o.alumniUser.alumniProfile?.graduationYear ?? null,
        role: o.alumniUser.alumniProfile?.currentRole ?? null,
        company: o.alumniUser.alumniProfile?.company?.name ?? null,
      },
    })),
    // Which committee seats are vacant. A chapter missing a treasurer is a fact
    // the office should be able to see at a glance.
    vacantRoles: OFFICER_ROLES.filter((r) => !current.some((o) => o.role === r)),
    counts: {
      current: current.length,
      past: ordered.length - current.length,
      // Surfaces pointer/table divergence instead of hiding it.
      presidentPointerMatches: (() => {
        const president = current.find((o) => o.role === 'PRESIDENT');
        return president ? president.alumniUser.id === chapter.presidentAlumniUserId : false;
      })(),
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Leadership — write
// ─────────────────────────────────────────────────────────────

export async function assignOfficer(
  viewer: Viewer,
  chapterId: string,
  body: { profileId: string; role: OfficerRole; since?: string; notes?: string },
) {
  if (!viewer.isOffice) throw forbidden('Only the Alumni Relations Office can appoint chapter officers');

  const chapter = await prisma.alumniChapter.findFirst({
    where: { id: chapterId, institutionId: viewer.institutionId },
    select: { id: true, city: true },
  });
  if (!chapter) throw notFound('Chapter not found');

  const person = await prisma.alumniProfile.findFirst({
    where: { id: body.profileId, institutionId: viewer.institutionId },
    select: { id: true, userId: true, chapterId: true, user: { select: { fullName: true } } },
  });
  if (!person) throw notFound('Alumni profile not found');

  // An officer must be a member. Otherwise the chapter president is someone who
  // cannot see the chapter's announcements or member list.
  if (person.chapterId !== chapterId) {
    throw conflict(`${person.user.fullName} must join the ${chapter.city} chapter before holding office`);
  }

  // Exactly one current holder per role. Handing over a presidency is
  // resign-then-appoint, done in one transaction so the chapter is never left
  // with two presidents or none.
  const incumbent = await prisma.alumniChapterOfficer.findFirst({
    where: { chapterId, role: body.role, isCurrent: true },
    select: { id: true, alumniUserId: true, alumniUser: { select: { fullName: true } } },
  });

  const since = body.since ? new Date(body.since) : new Date();

  const result = await prisma.$transaction(async (tx) => {
    let replaced: { name: string; officerId: string } | null = null;

    if (incumbent) {
      await tx.alumniChapterOfficer.update({
        where: { id: incumbent.id },
        data: { isCurrent: false, until: since },
      });
      replaced = { name: incumbent.alumniUser.fullName, officerId: incumbent.id };
    }

    const officer = await tx.alumniChapterOfficer.create({
      data: {
        chapterId,
        alumniUserId: person.userId,
        role: body.role,
        since,
        until: null,
        isCurrent: true,
        notes: body.notes ?? null,
        createdByUserId: viewer.userId,
      },
    });

    // The pointer moves with the PRESIDENT row, and only here.
    if (body.role === 'PRESIDENT') {
      await tx.alumniChapter.update({
        where: { id: chapterId },
        data: { presidentAlumniUserId: person.userId },
      });
    }

    return { officer, replaced };
  });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'chapter.officer.assign',
    entityType: 'AlumniChapterOfficer',
    entityId: result.officer.id,
    before: result.replaced ? { role: body.role, holder: result.replaced.name } : undefined,
    after: { role: body.role, holder: person.user.fullName, chapter: chapter.city },
  });

  return {
    id: result.officer.id,
    role: result.officer.role,
    officer: person.user.fullName,
    replaced: result.replaced?.name ?? null,
    since: result.officer.since,
  };
}

export async function resignOfficer(viewer: Viewer, chapterId: string, officerId: string, reason?: string) {
  if (!viewer.isOffice) throw forbidden('Only the Alumni Relations Office can change the committee');

  const officer = await prisma.alumniChapterOfficer.findFirst({
    // AlumniChapterOfficer has no institutionId of its own; tenancy is reached
    // through its chapter. Scoping by `chapterId` alone would let a caller who
    // guessed another college's officer id read it.
    where: { id: officerId, chapterId, chapter: { institutionId: viewer.institutionId } },
    include: { alumniUser: { select: { fullName: true } } },
  });
  if (!officer) throw notFound('Officer record not found');
  if (!officer.isCurrent) throw unprocessable(`${officer.alumniUser.fullName} no longer holds this role`);

  // Resigning the president leaves the seat vacant and the pointer stale, so it
  // is refused: appoint a successor instead. A chapter without a president
  // cannot authorise announcements or events.
  if (officer.role === 'PRESIDENT') {
    throw unprocessable('A chapter must have a president — appoint a successor instead of resigning the role');
  }

  const until = new Date();
  await prisma.alumniChapterOfficer.update({
    where: { id: officer.id },
    data: { isCurrent: false, until, notes: reason ? `${officer.notes ?? ''} | resigned: ${reason}`.trim() : officer.notes },
  });

  await Promise.all([
    writeAudit({
      actorUserId: viewer.userId,
      institutionId: viewer.institutionId,
      action: 'chapter.officer.resign',
      entityType: 'AlumniChapterOfficer',
      entityId: officer.id,
      before: { role: officer.role, holder: officer.alumniUser.fullName },
      after: { until: until.toISOString(), reason: reason ?? null },
    }),
    prisma.notification.create({
      data: {
        institutionId: viewer.institutionId,
        recipientUserId: officer.alumniUserId,
        type: 'SYSTEM',
        title: `Stepped down as ${officer.role.replace(/_/g, ' ').toLowerCase()}`,
        body: reason ?? 'Your chapter committee term has ended. Thank you.',
        sourceModule: 'alumni-chapter',
      },
    }),
  ]);

  return { id: officer.id, resigned: officer.alumniUser.fullName, role: officer.role, until };
}

// ─────────────────────────────────────────────────────────────
// Initiatives
// ─────────────────────────────────────────────────────────────

export async function listInitiatives(institutionId: string, chapterId: string, status?: string) {
  const chapter = await prisma.alumniChapter.findFirst({
    where: { id: chapterId, institutionId },
    select: { id: true, city: true },
  });
  if (!chapter) throw notFound('Chapter not found');

  const rows = await prisma.alumniChapterInitiative.findMany({
    where: { chapterId, ...(status ? { status } : {}) },
    include: {
      campaign: { select: { id: true, name: true, targetMinor: true, raisedMinor: true, status: true } },
      owner: { select: { id: true, fullName: true } },
    },
    orderBy: [{ status: 'asc' }, { targetDate: 'asc' }],
  });

  const now = Date.now();
  const map = (i: (typeof rows)[number]) => ({
    id: i.id,
    title: i.title,
    description: i.description,
    category: i.category,
    status: i.status,
    targetCount: i.targetCount,
    achievedCount: i.achievedCount,
    // Null when open-ended, so the UI does not render a progress bar for
    // "run a mentoring hour each month".
    percent:
      i.targetCount && i.targetCount > 0
        ? Math.min(100, Math.round((i.achievedCount / i.targetCount) * 100))
        : null,
    startDate: i.startDate,
    targetDate: i.targetDate,
    completedAt: i.completedAt,
    // Overdue is computed, not stored — an initiative does not "become overdue",
    // it simply is one as of today.
    isOverdue: i.status === 'ACTIVE' && !!i.targetDate && i.targetDate.getTime() < now,
    daysRemaining:
      i.targetDate && i.targetDate.getTime() > now
        ? Math.ceil((i.targetDate.getTime() - now) / DAY)
        : null,
    owner: i.owner ? { id: i.owner.id, name: i.owner.fullName } : null,
    // Money is DERIVED from the linked campaign, never stored here — a second
    // money column would immediately disagree with the campaign.
    campaign: i.campaign
      ? {
          id: i.campaign.id,
          name: i.campaign.name,
          targetRupees: toRupees(i.campaign.targetMinor),
          raisedRupees: toRupees(i.campaign.raisedMinor),
          percent:
            i.campaign.targetMinor > 0
              ? Math.round((i.campaign.raisedMinor / i.campaign.targetMinor) * 100)
              : 0,
          status: i.campaign.status,
        }
      : null,
  });

  const items = rows.map(map);
  return {
    chapterId: chapter.id,
    city: chapter.city,
    stats: {
      total: items.length,
      active: items.filter((i) => i.status === 'ACTIVE').length,
      completed: items.filter((i) => i.status === 'COMPLETED').length,
      planned: items.filter((i) => i.status === 'PLANNED').length,
      overdue: items.filter((i) => i.isOverdue).length,
      // Mean completion across initiatives that have a countable goal. Open-ended
      // ones are excluded rather than counted as 0%, which would drag the number
      // down for the wrong reason.
      avgCompletion: (() => {
        const withGoal = items.filter((i) => i.percent !== null);
        return withGoal.length === 0
          ? null
          : Math.round(withGoal.reduce((s, i) => s + (i.percent ?? 0), 0) / withGoal.length);
      })(),
    },
    initiatives: items,
  };
}

export async function createInitiative(
  viewer: Viewer,
  chapterId: string,
  body: {
    title: string;
    description?: string;
    category?: string;
    targetCount?: number;
    startDate?: string;
    targetDate?: string;
    campaignId?: string;
    ownerProfileId?: string;
  },
) {
  const chapter = await prisma.alumniChapter.findFirst({
    where: { id: chapterId, institutionId: viewer.institutionId },
    select: { id: true, city: true, presidentAlumniUserId: true },
  });
  if (!chapter) throw notFound('Chapter not found');

  // Officers and the office own a chapter's initiatives; any member proposing
  // one is a different feature (proposals) and would need its own workflow.
  //
  // `await` is load-bearing here. isOfficer() is async, and `!promise` is always
  // false — so without it this whole condition collapsed to `false` and the
  // check silently permitted ANY graduate to create an initiative in ANY chapter.
  if (!viewer.isOffice && !(await isOfficer(viewer, chapterId))) {
    throw forbidden('Only chapter officers can create an initiative');
  }

  const ownerUserId = await resolveMemberUserId(viewer.institutionId, body.ownerProfileId);

  if (body.campaignId) {
    const campaign = await prisma.fundraisingCampaign.findFirst({
      where: { id: body.campaignId, institutionId: viewer.institutionId },
      select: { id: true },
    });
    if (!campaign) throw notFound('Campaign not found');
  }

  const initiative = await prisma.alumniChapterInitiative.create({
    data: {
      chapterId,
      title: body.title,
      description: body.description ?? null,
      category: body.category ?? 'SOCIAL',
      status: 'PLANNED',
      targetCount: body.targetCount ?? null,
      achievedCount: 0,
      startDate: body.startDate ? new Date(body.startDate) : null,
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
      campaignId: body.campaignId ?? null,
      ownerAlumniUserId: ownerUserId,
      createdByUserId: viewer.userId,
    },
  });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'chapter.initiative.create',
    entityType: 'AlumniChapterInitiative',
    entityId: initiative.id,
    after: { title: initiative.title, chapter: chapter.city },
  });

  return { id: initiative.id, title: initiative.title, status: initiative.status, chapter: chapter.city };
}

export async function updateInitiative(
  viewer: Viewer,
  chapterId: string,
  initiativeId: string,
  body: { status?: string; achievedCount?: number; targetCount?: number; targetDate?: string; description?: string },
) {
  const chapter = await prisma.alumniChapter.findFirst({
    where: { id: chapterId, institutionId: viewer.institutionId },
    select: { id: true, city: true },
  });
  if (!chapter) throw notFound('Chapter not found');

  if (!viewer.isOffice && !(await isOfficer(viewer, chapterId))) {
    throw forbidden('Only chapter officers can update an initiative');
  }

  const existing = await prisma.alumniChapterInitiative.findFirst({
    where: { id: initiativeId, chapterId },
    select: { id: true, status: true, achievedCount: true, targetCount: true },
  });
  if (!existing) throw notFound('Initiative not found');

  if (existing.status === 'COMPLETED' && body.status && body.status !== 'COMPLETED') {
    throw unprocessable('A completed initiative cannot be reopened — create a new one');
  }

  const data: Record<string, unknown> = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.achievedCount !== undefined) data.achievedCount = Math.max(0, body.achievedCount);
  if (body.targetCount !== undefined) data.targetCount = body.targetCount;
  if (body.targetDate !== undefined) data.targetDate = body.targetDate ? new Date(body.targetDate) : null;
  if (body.description !== undefined) data.description = body.description;
  // completedAt is set automatically so it can never disagree with status.
  if (body.status === 'COMPLETED' && existing.status !== 'COMPLETED') data.completedAt = new Date();
  if (body.status && body.status !== 'COMPLETED') data.completedAt = null;

  const updated = await prisma.alumniChapterInitiative.update({ where: { id: existing.id }, data });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'chapter.initiative.update',
    entityType: 'AlumniChapterInitiative',
    entityId: updated.id,
    before: { status: existing.status, achievedCount: existing.achievedCount },
    after: { status: updated.status, achievedCount: updated.achievedCount },
  });

  // Returns the same computed fields the list endpoint returns for an item, so
  // a client can render the updated card from the PATCH response alone. Returning
  // a narrower shape here meant the UI had to re-fetch just to draw a progress
  // bar it had already changed.
  return {
    id: updated.id,
    title: updated.title,
    category: updated.category,
    status: updated.status,
    description: updated.description,
    achievedCount: updated.achievedCount,
    targetCount: updated.targetCount,
    percent:
      updated.targetCount && updated.targetCount > 0
        ? Math.min(100, Math.round((updated.achievedCount / updated.targetCount) * 100))
        : null,
    startDate: updated.startDate,
    targetDate: updated.targetDate,
    completedAt: updated.completedAt,
  };
}

// ─────────────────────────────────────────────────────────────
// Performance / participation
// ─────────────────────────────────────────────────────────────

/**
 * Chapter performance. Everything here is DERIVED at read time — nothing is
 * denormalised, so a metric can never be stale and there is no reconciliation
 * job to forget.
 *
 * The headline number is PARTICIPATION RATE: the share of members who actually
 * turned up to something. Member COUNT and event COUNT are easy to inflate and
 * say nothing; a chapter of 40 who never meet and a chapter of 12 who meet
 * monthly are not equally healthy, and only this metric tells them apart.
 */
export async function getChapterPerformance(institutionId: string, chapterId: string) {
  const chapter = await prisma.alumniChapter.findFirst({
    where: { id: chapterId, institutionId },
    select: { id: true, city: true, createdAt: true },
  });
  if (!chapter) throw notFound('Chapter not found');

  const now = new Date();
  const yearAgo = new Date(now.getTime() - 365 * DAY);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * DAY);

  const [members, memberRows, chapterEvents, officerCount, initiatives, alumniIds] = await Promise.all([
    prisma.alumniProfile.count({ where: { institutionId, chapterId, engagementStatus: 'ACTIVE' } }),
    prisma.alumniProfile.findMany({
      where: { institutionId, chapterId, engagementStatus: 'ACTIVE' },
      select: { userId: true, createdAt: true },
    }),
    prisma.event.findMany({
      where: { institutionId, chapterId },
      select: {
        id: true,
        title: true,
        startDate: true,
        capacity: true,
        status: true,
        registrations: { select: { registrantUserId: true, status: true } },
      },
    }),
    prisma.alumniChapterOfficer.count({ where: { chapterId, isCurrent: true } }),
    prisma.alumniChapterInitiative.findMany({
      where: { chapterId },
      select: { status: true, targetCount: true, achievedCount: true, targetDate: true },
    }),
    prisma.alumniProfile.findMany({
      where: { institutionId, chapterId },
      select: { userId: true },
    }),
  ]);

  const memberUserIds = new Set(memberRows.map((m) => m.userId));

  // ── Event participation ──
  const pastEvents = chapterEvents.filter((e) => e.startDate < now);
  const upcomingEvents = chapterEvents.filter((e) => e.startDate >= now && e.status !== 'CANCELLED');

  // Only CONFIRMED registrations count as attendance. A PENDING RSVP is an
  // intention, and counting it would let a chapter show 90% participation on
  // the strength of registrations nobody honoured.
  const confirmedByEvent = chapterEvents.map((e) => ({
    eventId: e.id,
    title: e.title,
    startDate: e.startDate,
    capacity: e.capacity,
    isPast: e.startDate < now,
    confirmed: e.registrations.filter((r) => r.status === 'CONFIRMED').length,
    registered: e.registrations.length,
  }));

  const past12mo = confirmedByEvent.filter((e) => e.isPast && e.startDate >= yearAgo);

  // Unique attendees need their own query: a person who came to four events
  // must count once, and counting registration rows would inflate the headcount
  // by exactly the number of events a keen member attended.
  const uniqueAttendees = new Set<string>();
  const attendanceRows = await prisma.eventRegistration.findMany({
    where: {
      status: 'CONFIRMED',
      event: { institutionId, chapterId, startDate: { gte: yearAgo, lt: now } },
    },
    select: { registrantUserId: true, eventId: true },
  });
  for (const r of attendanceRows) uniqueAttendees.add(r.registrantUserId);

  const attendeesInChapter = [...uniqueAttendees].filter((id) => memberUserIds.has(id));
  const participantsLast90 = new Set(
    (
      await prisma.eventRegistration.findMany({
        where: {
          status: 'CONFIRMED',
          event: { institutionId, chapterId, startDate: { gte: ninetyDaysAgo, lt: now } },
        },
        select: { registrantUserId: true },
      })
    ).map((r) => r.registrantUserId),
  );

  const memberCount = members;
  const participationRate = memberCount === 0 ? null : Math.round((attendeesInChapter.length / memberCount) * 100);

  // ── Giving ──
  // Both aggregates run unconditionally with an empty `in` list when the chapter
  // has no members — Prisma treats `in: []` as "match nothing" and returns a
  // zero aggregate. Branching on `alumniIds.length` and substituting a
  // hand-rolled object was the earlier approach and it silently produced a
  // differently-typed result the compiler then had to be appeased about.
  const chapterUserIds = alumniIds.map((a) => a.userId);
  const [donationAgg, pledgeAgg] = await Promise.all([
    prisma.donation.aggregate({
      where: { institutionId, alumniUserId: { in: chapterUserIds }, status: 'RECEIVED' },
      _sum: { amountMinor: true },
      _count: true,
    }),
    prisma.donation.aggregate({
      where: { institutionId, alumniUserId: { in: chapterUserIds }, status: 'PLEDGED' },
      _sum: { amountMinor: true },
    }),
  ]);

  // ── Mentoring ──
  const mentorRows = await prisma.mentorshipPair.groupBy({
    by: ['status'],
    where: { mentorAlumniUserId: { in: chapterUserIds } },
    _count: { _all: true },
  });
  const mentorCounts = Object.fromEntries(mentorRows.map((r) => [r.status, r._count._all]));

  // ── Growth ──
  const newMembers12mo = memberRows.filter((m) => m.createdAt >= yearAgo).length;

  const initiativeStats = {
    total: initiatives.length,
    active: initiatives.filter((i) => i.status === 'ACTIVE').length,
    completed: initiatives.filter((i) => i.status === 'COMPLETED').length,
    overdue: initiatives.filter((i) => i.status === 'ACTIVE' && !!i.targetDate && i.targetDate < now).length,
    avgCompletion: (() => {
      const withGoal = initiatives.filter((i) => i.targetCount && i.targetCount > 0);
      if (withGoal.length === 0) return null;
      return Math.round(
        withGoal.reduce((s, i) => s + Math.min(100, Math.round((i.achievedCount / (i.targetCount as number)) * 100)), 0) /
          withGoal.length,
      );
    })(),
  };

  // ── Composite engagement score ──
  // Deliberately simple and fully explained: five equally-weighted signals,
  // each already normalised to 0–100. A weighted composite would imply
  // precision the inputs do not support; the breakdown is returned so the office
  // can see which signal is dragging a chapter down instead of trusting one
  // number.
  const signals = {
    participation: participationRate ?? 0,
    eventFill: avgFill(past12mo),
    growth: memberCount === 0 ? 0 : Math.min(100, Math.round((newMembers12mo / Math.max(1, memberCount)) * 200)),
    initiatives: initiativeStats.avgCompletion ?? 0,
    leadership: Math.min(100, officerCount * 25),
  };
  const engagementScore = Math.round(
    (signals.participation + signals.eventFill + signals.growth + signals.initiatives + signals.leadership) / 5,
  );

  return {
    chapterId: chapter.id,
    city: chapter.city,
    members: {
      total: memberCount,
      newIn12Months: newMembers12mo,
      // Members per officer: a chapter with 40 members and one officer is a
      // chapter nobody can organise.
      perOfficer: officerCount === 0 ? null : Math.round((memberCount / officerCount) * 10) / 10,
    },
    participation: {
      rate: participationRate,
      uniqueAttendees12mo: attendeesInChapter.length,
      participants90d: [...participantsLast90].filter((id) => memberUserIds.has(id)).length,
      // Attendance vs sign-ups: the gap between these is the no-show problem.
      attendanceRate: (() => {
        const registered = past12mo.reduce((s, e) => s + e.registered, 0);
        const confirmed = past12mo.reduce((s, e) => s + e.confirmed, 0);
        return registered === 0 ? null : Math.round((confirmed / registered) * 100);
      })(),
      events12mo: past12mo.length,
      avgFillRate: avgFill(past12mo),
    },
    events: {
      total: chapterEvents.length,
      past: pastEvents.length,
      upcoming: upcomingEvents.length,
      avgCapacity:
        chapterEvents.length === 0
          ? 0
          : Math.round(chapterEvents.reduce((s, e) => s + e.capacity, 0) / chapterEvents.length),
    },
    giving: {
      receivedRupees: toRupees(donationAgg._sum.amountMinor ?? 0),
      pledgedRupees: toRupees(pledgeAgg._sum.amountMinor ?? 0),
      donations: donationAgg._count,
      // Average per member: the fair way to compare a large chapter with a small
      // one, since raw totals just measure membership.
      perMemberRupees: memberCount === 0 ? 0 : toRupees(Math.round((donationAgg._sum.amountMinor ?? 0) / memberCount)),
    },
    mentoring: {
      activePairs: mentorCounts.ACTIVE ?? 0,
      pendingPairs: mentorCounts.PENDING ?? 0,
      completedPairs: mentorCounts.COMPLETED ?? 0,
      // Awaited: without it this serialises as an empty object, so the UI shows
      // `mentors: {}` instead of a number.
      mentors: await activeMentorCount(chapterUserIds),
    },
    initiatives: initiativeStats,
    leadership: {
      officers: officerCount,
      vacantRoles: OFFICER_ROLES.length - officerCount,
    },
    engagement: {
      score: engagementScore,
      signals,
      // Explicitly not a grade. Anything that looks like a letter grade invites
      // chapter-vs-chapter competition over a synthetic number.
      note: 'Composite of participation, event fill, growth, initiative progress and committee coverage. A guide, not a ranking.',
    },
    // The per-event breakdown, so the office can see WHICH event failed to fill.
    eventBreakdown: confirmedByEvent
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
      .slice(0, 12)
      .map((e) => ({
        ...e,
        fillRate: e.capacity > 0 ? Math.min(100, Math.round((e.confirmed / e.capacity) * 100)) : 0,
      })),
  };
}

function avgFill(events: { capacity: number; confirmed: number }[]) {
  if (events.length === 0) return 0;
  return Math.round(
    events.reduce(
      (s, e) => s + (e.capacity > 0 ? Math.min(100, (e.confirmed / e.capacity) * 100) : 0),
      0,
    ) / events.length,
  );
}

async function activeMentorCount(userIds: string[]) {
  if (userIds.length === 0) return 0;
  const rows = await prisma.mentorshipPair.groupBy({
    by: ['mentorAlumniUserId'],
    where: { mentorAlumniUserId: { in: userIds }, status: 'ACTIVE' },
    _count: { _all: true },
  });
  return rows.length;
}

async function isOfficer(viewer: Viewer, chapterId: string) {
  const row = await prisma.alumniChapterOfficer.findFirst({
    where: { chapterId, alumniUserId: viewer.userId, isCurrent: true },
    select: { id: true },
  });
  return row !== null;
}

async function resolveMemberUserId(institutionId: string, profileId?: string) {
  if (!profileId) return null;
  const p = await prisma.alumniProfile.findFirst({
    where: { id: profileId, institutionId },
    select: { userId: true },
  });
  if (!p) throw notFound('Owner alumni profile not found');
  return p.userId;
}

/** Officer userIds for a chapter — used by announce/create-event authorisation. */
export async function officerUserIds(chapterId: string) {
  const rows = await prisma.alumniChapterOfficer.findMany({
    where: { chapterId, isCurrent: true },
    select: { alumniUserId: true },
  });
  return rows.map((r) => r.alumniUserId);
}

export { OFFICER_ROLES };