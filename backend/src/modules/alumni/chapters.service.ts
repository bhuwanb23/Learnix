// City chapters — directory, detail, members, events, announcements, activity.
// Docs: 12-alumni-relations.md §3.6 (chapters) · §5.
//
// Split from alumni.service.ts alongside directory.service.ts. The list
// endpoint (listChapters) stays in alumni.service.ts because the existing
// dashboard and mobile client depend on its shape; everything NEW here is
// additive.
//
// Two design decisions worth recording:
//
// · A chapter event is an `Event` with `chapterId` set, not a separate table. It
//   therefore inherits RSVP decisions, schedule items, QR payloads, attendance
//   and notifications for free, and a chapter event shows up in the Events tab
//   without any synchronisation.
//
// · The activity feed is DERIVED, not stored. An activity row would be a second
//   copy of the same fact (an event that is also an Event row, an announcement
//   that is also a Notification row) and the two would drift. Deriving it means
//   the feed cannot be wrong.

import { prisma } from '../../db/prisma.js';
import { notFound, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import type { Viewer } from './directory.service.js';
import { officerUserIds } from './leadership.service.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtMonth = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

export async function listChapterDirectory(
  institutionId: string,
  query: { q?: string; sort?: 'city' | 'members' | 'activity'; region?: string; tier?: 'LOCAL' | 'REGIONAL' },
) {
  const chapters = await prisma.alumniChapter.findMany({
    where: {
      institutionId,
      ...(query.q ? { city: { contains: query.q } } : {}),
      ...(query.region ? { region: { contains: query.region } } : {}),
      ...(query.tier ? { tier: query.tier } : {}),
    },
    select: {
      id: true,
      city: true,
      region: true,
      tier: true,
      description: true,
      meetingFrequency: true,
      memberCount: true,
      nextEventAt: true,
      presidentAlumniUserId: true,
      _count: { select: { members: true, events: true, officers: true, initiatives: true } },
    },
  });

  const presidentIds = [...new Set(chapters.map((c) => c.presidentAlumniUserId))];
  const presidents = await prisma.user.findMany({
    where: { id: { in: presidentIds } },
    select: {
      id: true,
      fullName: true,
      alumniProfile: { select: { graduationYear: true, currentRole: true, company: { select: { name: true } } } },
    },
  });
  const presidentMap = new Map(presidents.map((u) => [u.id, u]));

  // Upcoming-event counts come from the linked events, so a chapter that has
  // events but a stale denormalised nextEventAt still reports correctly.
  const now = new Date();
  const upcomingByChapter = await prisma.event.groupBy({
    by: ['chapterId'],
    where: { institutionId, chapterId: { not: null }, startDate: { gte: now }, status: { in: ['APPROVED', 'PUBLISHED'] } },
    _count: { _all: true },
  });
  const upcomingMap = new Map(upcomingByChapter.map((e) => [e.chapterId ?? '', e._count._all]));

  let items = chapters.map((c) => {
    const president = presidentMap.get(c.presidentAlumniUserId);
    return {
      id: c.id,
      city: c.city,
      region: c.region,
      tier: c.tier,
      description: c.description,
      meetingFrequency: c.meetingFrequency,
      // `memberCount` is denormalized, but `_count.members` is the truth. Both
      // are returned so the UI can show the denormalised one and a verification
      // script can compare them.
      memberCount: c.memberCount,
      actualMemberCount: c._count.members,
      eventCount: c._count.events,
      upcomingEventCount: upcomingMap.get(c.id) ?? 0,
      officerCount: c._count.officers,
      initiativeCount: c._count.initiatives,
      nextEventAt: c.nextEventAt,
      president: president
        ? {
            name: president.fullName,
            graduationYear: president.alumniProfile?.graduationYear ?? null,
            role: president.alumniProfile?.currentRole ?? null,
            company: president.alumniProfile?.company?.name ?? null,
          }
        : null,
    };
  });

  if (query.sort === 'members') items = items.sort((a, b) => b.memberCount - a.memberCount);
  else if (query.sort === 'activity') {
    items = items.sort(
      (a, b) => b.upcomingEventCount - a.upcomingEventCount || b.memberCount - a.memberCount,
    );
  } else items = items.sort((a, b) => a.city.localeCompare(b.city));

  // Regions, for the directory's group headers. Derived from whatever survived
  // the filters rather than a separate query, so the group count always equals
  // the number of chapters on screen.
  const regionMap = new Map<string, typeof items>();
  for (const c of items) {
    const key = c.region ?? 'Other';
    if (!regionMap.has(key)) regionMap.set(key, []);
    regionMap.get(key)!.push(c);
  }

  return {
    count: items.length,
    totalMembers: items.reduce((s, c) => s + c.memberCount, 0),
    regions: [...regionMap.entries()]
      .map(([region, chaptersIn]) => ({
        region,
        count: chaptersIn.length,
        members: chaptersIn.reduce((s, c) => s + c.memberCount, 0),
      }))
      .sort((a, b) => a.region.localeCompare(b.region)),
    tiers: {
      local: items.filter((c) => c.tier === 'LOCAL').length,
      regional: items.filter((c) => c.tier === 'REGIONAL').length,
    },
    chapters: items,
  };
}

/**
 * Chapter detail.
 *
 * Takes a VIEWER, not just an institutionId, because it must report what the
 * caller is allowed to do — `viewerContext` drives the join / leave / announce
 * buttons. Deriving those permissions in the client would let the UI offer an
 * action the backend then rejects with a 403.
 */
export async function getChapterDetail(institutionId: string, chapterId: string, viewer?: Viewer) {
  const chapter = await prisma.alumniChapter.findFirst({
    where: { id: chapterId, institutionId },
    include: { members: { select: { id: true } } },
  });
  if (!chapter) throw notFound('Chapter not found');

  const now = new Date();

  const [events, announcements, president, announcementCount] = await Promise.all([
    prisma.event.findMany({
      where: { institutionId, chapterId },
      include: { venue: { select: { name: true } }, _count: { select: { registrations: true } } },
      orderBy: { startDate: 'desc' },
      take: 30,
    }),
    prisma.broadcast.findMany({
      where: { institutionId, templateKey: 'CHAPTER_ANNOUNCEMENT' },
      orderBy: { sentAt: 'desc' },
      take: 30,
    }),
    prisma.user.findUnique({
      where: { id: chapter.presidentAlumniUserId },
      select: {
        id: true,
        fullName: true,
        email: true,
        alumniProfile: { select: { graduationYear: true, currentRole: true, company: { select: { name: true } } } },
      },
    }),
    prisma.broadcast.count({ where: { institutionId, templateKey: 'CHAPTER_ANNOUNCEMENT' } }),
  ]);

  // Announcements are broadcasts scoped to a chapter; filter to THIS chapter by
  // reading the audience JSON. Done in JS because the audience shape varies
  // (ALL_ALUMNI vs CHAPTER) and a JSON string match in SQL is not portable to
  // Postgres later.
  const chapterAnnouncements = announcements.filter((b) => {
    try {
      const parsed = JSON.parse(b.audienceJson ?? '{}') as { chapterId?: string; city?: string };
      return parsed.chapterId === chapterId || parsed.city === chapter.city;
    } catch {
      return false;
    }
  });

  const mapEvent = (e: (typeof events)[number]) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    startDate: e.startDate,
    endDate: e.endDate,
    venue: e.venue?.name ?? null,
    capacity: e.capacity,
    rsvps: e._count.registrations,
    status: e.status,
    isPast: e.startDate < now,
  });

  const upcoming = events.filter((e) => e.startDate >= now && e.status !== 'CANCELLED' && e.status !== 'COMPLETED').map(mapEvent);
  const past = events.filter((e) => e.startDate < now || e.status === 'COMPLETED').map(mapEvent);

  // Leadership + initiative counts come from the officers/initiatives tables,
  // not the denormalised president pointer, so the two can be compared.
  const [officers, initiativeCount] = await Promise.all([
    prisma.alumniChapterOfficer.findMany({
      where: { chapterId, isCurrent: true },
      include: {
        alumniUser: {
          select: {
            fullName: true,
            alumniProfile: {
              select: { graduationYear: true, currentRole: true, company: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { since: 'asc' },
    }),
    prisma.alumniChapterInitiative.count({ where: { chapterId } }),
  ]);

  // What the CALLER may do. Returned even when viewer is undefined (an internal
  // call), in which case everything privileged is false.
  const myOfficerRow = viewer
    ? officers.find((o) => o.alumniUserId === viewer.userId)
    : undefined;
  const myProfile = viewer
    ? await prisma.alumniProfile.findFirst({
        where: { userId: viewer.userId, institutionId },
        select: { chapterId: true, engagementStatus: true },
      })
    : null;

  const viewerContext = {
    isOffice: viewer?.isOffice ?? false,
    isMember: myProfile?.chapterId === chapter.id,
    isOfficer: !!myOfficerRow,
    isPresident: myOfficerRow?.role === 'PRESIDENT',
    officerRoles: myOfficerRow ? [myOfficerRow.role] : [],
    // The office cannot join a chapter, so it must never be offered the button.
    canJoin:
      !!viewer && !viewer.isOffice && myProfile?.engagementStatus === 'ACTIVE' && myProfile?.chapterId !== chapter.id,
    // A president cannot leave: that would vacate the seat.
    canLeave:
      !!viewer &&
      !viewer.isOffice &&
      myProfile?.chapterId === chapter.id &&
      myOfficerRow?.role !== 'PRESIDENT',
    canPost:
      !!viewer && (viewer.isOffice || officers.some((o) => o.alumniUserId === viewer.userId)),
    canManageOfficers: viewer?.isOffice ?? false,
    canManageInitiatives: !!viewer && (viewer.isOffice || !!myOfficerRow),
  };

  return {
    id: chapter.id,
    city: chapter.city,
    region: chapter.region,
    tier: chapter.tier,
    description: chapter.description,
    meetingFrequency: chapter.meetingFrequency,
    memberCount: chapter.memberCount,
    actualMemberCount: chapter.members.length,
    nextEventAt: chapter.nextEventAt,
    president: president
      ? {
          userId: president.id,
          name: president.fullName,
          email: president.email,
          graduationYear: president.alumniProfile?.graduationYear ?? null,
          role: president.alumniProfile?.currentRole ?? null,
          company: president.alumniProfile?.company?.name ?? null,
        }
      : null,
    // Committee summary. The full list lives at /chapters/:id/officers so this
    // stays cheap for the overview tab.
    leadership: {
      count: officers.length,
      roles: officers.map((o) => o.role),
      members: officers.map((o) => ({
        role: o.role,
        name: o.alumniUser.fullName,
        graduationYear: o.alumniUser.alumniProfile?.graduationYear ?? null,
        company: o.alumniUser.alumniProfile?.company?.name ?? null,
        since: o.since,
      })),
    },
    initiativeCount,
    viewerContext,
    stats: {
      upcomingEvents: upcoming.length,
      pastEvents: past.length,
      announcements: chapterAnnouncements.length,
      totalAnnouncements: announcementCount,
      // Fill rate across this chapter's events — the number a chapter president
      // actually cares about.
      avgFillRate:
        events.length === 0
          ? 0
          : Math.round(
              events.reduce((s, e) => s + (e.capacity > 0 ? Math.min(100, (e._count.registrations / e.capacity) * 100) : 0), 0) /
                events.length,
            ),
    },
    upcomingEvents: upcoming,
    pastEvents: past,
    announcements: chapterAnnouncements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      sentAt: a.sentAt,
      senderUserId: a.senderUserId,
    })),
  };
}

export async function listChapterMembers(
  institutionId: string,
  chapterId: string,
  query: { q?: string; sort?: 'name' | 'seniority' | 'recent'; limit?: number },
) {
  const chapter = await prisma.alumniChapter.findFirst({
    where: { id: chapterId, institutionId },
    select: { id: true, city: true },
  });
  if (!chapter) throw notFound('Chapter not found');

  const limit = Math.min(200, Math.max(1, query.limit ?? 100));
  const where = {
    institutionId,
    chapterId,
    ...(query.q
      ? {
          OR: [
            { user: { fullName: { contains: query.q } } },
            { currentRole: { contains: query.q } },
            { company: { name: { contains: query.q } } },
          ],
        }
      : {}),
  };

  const [members, total] = await Promise.all([
    prisma.alumniProfile.findMany({
      where,
      select: {
        id: true,
        graduationYear: true,
        currentRole: true,
        headline: true,
        engagementStatus: true,
        company: { select: { name: true, sector: true } },
        user: { select: { fullName: true } },
        skills: { select: { skill: true, level: true }, take: 4 },
      },
      orderBy:
        query.sort === 'seniority'
          ? { graduationYear: 'asc' }
          : query.sort === 'recent'
            ? { updatedAt: 'desc' }
            : { user: { fullName: 'asc' } },
      take: limit,
    }),
    prisma.alumniProfile.count({ where }),
  ]);

  return {
    chapterId: chapter.id,
    city: chapter.city,
    total,
    members: members.map((m) => ({
      id: m.id,
      name: m.user.fullName,
      headline: m.headline ?? m.currentRole,
      graduationYear: m.graduationYear,
      company: m.company,
      engagementStatus: m.engagementStatus,
      skills: m.skills,
    })),
  };
}

/**
 * Chapter activity feed.
 *
 * Derived from events, announcements, initiatives, committee changes and member
 * registrations — newest first, with a discriminator so the client can pick an
 * icon and colour per type. Nothing is stored: an activity row would be a
 * second copy of a fact that already lives in the events / broadcasts /
 * officers / initiatives tables, and the two would drift.
 */
export async function getChapterActivity(institutionId: string, chapterId: string, limit = 40) {
  const chapter = await prisma.alumniChapter.findFirst({
    where: { id: chapterId, institutionId },
    select: { id: true, city: true },
  });
  if (!chapter) throw notFound('Chapter not found');

  const [events, announcements, recentMembers, initiatives, officerChanges] = await Promise.all([
    prisma.event.findMany({
      where: { institutionId, chapterId },
      select: { id: true, title: true, startDate: true, status: true, _count: { select: { registrations: true } } },
      orderBy: { startDate: 'desc' },
      take: 20,
    }),
    prisma.broadcast.findMany({
      where: { institutionId, templateKey: 'CHAPTER_ANNOUNCEMENT' },
      select: { id: true, title: true, body: true, sentAt: true, createdAt: true, audienceJson: true },
      orderBy: { sentAt: 'desc' },
      take: 20,
    }),
    prisma.alumniProfile.findMany({
      where: { institutionId, chapterId },
      select: { id: true, createdAt: true, user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.alumniChapterInitiative.findMany({
      where: { chapterId },
      select: { id: true, title: true, status: true, createdAt: true, updatedAt: true, targetCount: true, achievedCount: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    // Committee history, newest first. Appointments AND resignations are both
    // worth surfacing: a chapter's leadership turning over is exactly the kind of
    // thing an office should notice.
    prisma.alumniChapterOfficer.findMany({
      where: { chapterId },
      select: {
        id: true,
        role: true,
        since: true,
        until: true,
        isCurrent: true,
        alumniUser: { select: { fullName: true } },
      },
      orderBy: { since: 'desc' },
      take: 20,
    }),
  ]);

  type Activity = {
    id: string;
    type: 'EVENT' | 'ANNOUNCEMENT' | 'MEMBER' | 'INITIATIVE' | 'LEADERSHIP';
    title: string;
    detail: string | null;
    at: Date;
    refId: string | null;
  };

  const items: Activity[] = [
    ...events.map((e) => ({
      id: `evt-${e.id}`,
      type: 'EVENT' as const,
      title: e.title,
      detail: `${e._count.registrations} registered`,
      at: e.startDate,
      refId: e.id,
    })),
    ...announcements
      .filter((a) => {
        try {
          const parsed = JSON.parse(a.audienceJson ?? '{}') as { chapterId?: string; city?: string };
          return parsed.chapterId === chapterId || parsed.city === chapter.city;
        } catch {
          return false;
        }
      })
      .map((a) => ({
        id: `ann-${a.id}`,
        type: 'ANNOUNCEMENT' as const,
        title: a.title,
        detail: a.body,
        // sentAt is nullable (a broadcast can exist before dispatch); createdAt is
        // the honest fallback, and both are Dates so the feed can be sorted.
        at: a.sentAt ?? a.createdAt,
        refId: a.id,
      })),
    ...recentMembers.map((m) => ({
      id: `mem-${m.id}`,
      type: 'MEMBER' as const,
      title: `${m.user.fullName} joined the chapter`,
      detail: null,
      at: m.createdAt,
      refId: m.id,
    })),
    ...initiatives.map((i) => ({
      id: `init-${i.id}`,
      type: 'INITIATIVE' as const,
      title: i.title,
      detail:
        i.targetCount && i.targetCount > 0
          ? `${i.achievedCount}/${i.targetCount} · ${i.status.toLowerCase()}`
          : i.status.toLowerCase(),
      // updatedAt, not createdAt: an initiative whose status moved to COMPLETED
      // is news, and dating it from creation would bury it.
      at: i.updatedAt,
      refId: i.id,
    })),
    ...officerChanges.map((o) => ({
      id: `off-${o.id}`,
      type: 'LEADERSHIP' as const,
      title: o.isCurrent
        ? `${o.alumniUser.fullName} took office as ${o.role.replace(/_/g, ' ').toLowerCase()}`
        : `${o.alumniUser.fullName} stepped down as ${o.role.replace(/_/g, ' ').toLowerCase()}`,
      detail: null,
      at: o.isCurrent ? o.since : (o.until ?? o.since),
      refId: o.id,
    })),
  ];

  items.sort((a, b) => b.at.getTime() - a.at.getTime());

  return {
    chapterId: chapter.id,
    city: chapter.city,
    count: Math.min(items.length, limit),
    activity: items.slice(0, limit),
    // Counts per type, so the UI can label each section without walking the
    // (already truncated) feed to work out what it is missing.
    breakdown: {
      events: events.length,
      announcements: items.filter((i) => i.type === 'ANNOUNCEMENT').length,
      initiatives: initiatives.length,
      leadership: officerChanges.length,
    },
  };
}

/** Post an announcement to a chapter: a Broadcast row + one notification per member. */
export async function announceToChapter(
  viewer: Viewer,
  chapterId: string,
  body: { title: string; body: string },
) {
  const chapter = await prisma.alumniChapter.findFirst({
    where: { id: chapterId, institutionId: viewer.institutionId },
    select: { id: true, city: true, presidentAlumniUserId: true },
  });
  if (!chapter) throw notFound('Chapter not found');

  // The OFFICE or any current chapter OFFICER may announce. The rule was
  // "president only" when leadership was a single column; with a committee in
  // place, requiring the president would mean the secretary cannot post the
  // meeting notice. An arbitrary alumnus still cannot — that would make the
  // feed meaningless.
  const officers = await officerUserIds(chapter.id);
  if (!viewer.isOffice && !officers.includes(viewer.userId)) {
    throw unprocessable('Only the Alumni Relations Office or a chapter officer can post an announcement');
  }

  const memberIds = (
    await prisma.alumniProfile.findMany({
      where: { institutionId: viewer.institutionId, chapterId, engagementStatus: 'ACTIVE' },
      select: { userId: true },
    })
  ).map((m) => m.userId);

  const broadcast = await prisma.broadcast.create({
    data: {
      institutionId: viewer.institutionId,
      senderUserId: viewer.userId,
      audienceJson: JSON.stringify({ audience: 'CHAPTER', chapterId: chapter.id, city: chapter.city }),
      templateKey: 'CHAPTER_ANNOUNCEMENT',
      title: body.title,
      body: body.body,
      channels: 'IN_APP',
      sentAt: new Date(),
    },
  });

  // Skip the sender — they wrote it, they have read it.
  const recipients = memberIds.filter((id) => id !== viewer.userId);
  if (recipients.length > 0) {
    await prisma.notification.createMany({
      data: recipients.map((rid) => ({
        institutionId: viewer.institutionId,
        recipientUserId: rid,
        type: 'BROADCAST',
        title: body.title,
        body: body.body,
        sourceModule: 'alumni-chapter',
      })),
    });
  }

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'chapter.announce',
    entityType: 'Broadcast',
    entityId: broadcast.id,
    after: { chapter: chapter.city, recipients: recipients.length },
  });

  return { id: broadcast.id, city: chapter.city, recipients: recipients.length, sentAt: broadcast.sentAt };
}

/** Create a chapter event. Reuses the shared Event table. */
export async function createChapterEvent(
  viewer: Viewer,
  chapterId: string,
  body: {
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    capacity?: number;
    venueId?: string;
  },
) {
  const chapter = await prisma.alumniChapter.findFirst({
    where: { id: chapterId, institutionId: viewer.institutionId },
    select: { id: true, city: true, presidentAlumniUserId: true },
  });
  if (!chapter) throw notFound('Chapter not found');

  const officers = await officerUserIds(chapter.id);
  if (!viewer.isOffice && !officers.includes(viewer.userId)) {
    throw unprocessable('Only the Alumni Relations Office or a chapter officer can create an event');
  }

  const start = new Date(body.startDate);
  const end = body.endDate ? new Date(body.endDate) : new Date(start.getTime() + 86400000);
  if (end < start) throw unprocessable('Event cannot end before it starts');

  const event = await prisma.event.create({
    data: {
      institutionId: viewer.institutionId,
      title: body.title,
      description: body.description ?? `${chapter.city} Chapter event`,
      category: 'ALUMNI',
      chapterId: chapter.id,
      startDate: start,
      endDate: end,
      capacity: body.capacity ?? 100,
      venueId: body.venueId ?? null,
      // The chapter president is the organiser, not the signed-in office user:
      // attributing the event to whoever pressed the button would put the wrong
      // name on it for every member who reads it.
      organizerUserId: viewer.isOffice ? viewer.userId : chapter.presidentAlumniUserId,
      status: viewer.isOffice ? 'PUBLISHED' : 'APPROVED',
    },
  });

  // Keep the denormalised nextEventAt honest.
  const nextUpcoming = await prisma.event.findFirst({
    where: {
      institutionId: viewer.institutionId,
      chapterId: chapter.id,
      startDate: { gte: new Date() },
      status: { in: ['APPROVED', 'PUBLISHED'] },
    },
    orderBy: { startDate: 'asc' },
    select: { startDate: true },
  });
  if (nextUpcoming) {
    await prisma.alumniChapter.update({
      where: { id: chapter.id },
      data: { nextEventAt: nextUpcoming.startDate },
    });
  }

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'chapter.event.create',
    entityType: 'Event',
    entityId: event.id,
    after: { chapter: chapter.city, title: event.title, at: event.startDate.toISOString() },
  });

  return {
    id: event.id,
    title: event.title,
    startDate: event.startDate,
    endDate: event.endDate,
    status: event.status,
    city: chapter.city,
  };
}

export { fmtMonth };