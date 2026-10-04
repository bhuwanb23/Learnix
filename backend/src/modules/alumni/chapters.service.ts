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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtMonth = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

export async function listChapterDirectory(
  institutionId: string,
  query: { q?: string; sort?: 'city' | 'members' | 'activity' },
) {
  const chapters = await prisma.alumniChapter.findMany({
    where: {
      institutionId,
      ...(query.q ? { city: { contains: query.q } } : {}),
    },
    select: {
      id: true,
      city: true,
      memberCount: true,
      nextEventAt: true,
      presidentAlumniUserId: true,
      _count: { select: { members: true, events: true } },
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
      // `memberCount` is denormalized, but `_count.members` is the truth. Both
      // are returned so the UI can show the denormalised one and a verification
      // script can compare them.
      memberCount: c.memberCount,
      actualMemberCount: c._count.members,
      eventCount: c._count.events,
      upcomingEventCount: upcomingMap.get(c.id) ?? 0,
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

  return {
    count: items.length,
    totalMembers: items.reduce((s, c) => s + c.memberCount, 0),
    chapters: items,
  };
}

export async function getChapterDetail(institutionId: string, chapterId: string) {
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

  return {
    id: chapter.id,
    city: chapter.city,
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
 * Chapter activity feed. Derived from events, announcements and member
 * registrations — newest first, with a discriminator so the client can pick an
 * icon and a colour per type.
 */
export async function getChapterActivity(institutionId: string, chapterId: string, limit = 40) {
  const chapter = await prisma.alumniChapter.findFirst({
    where: { id: chapterId, institutionId },
    select: { id: true, city: true },
  });
  if (!chapter) throw notFound('Chapter not found');

  const [events, announcements, recentMembers] = await Promise.all([
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
  ]);

  type Activity = {
    id: string;
    type: 'EVENT' | 'ANNOUNCEMENT' | 'MEMBER';
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
  ];

  items.sort((a, b) => b.at.getTime() - a.at.getTime());

  return {
    chapterId: chapter.id,
    city: chapter.city,
    count: Math.min(items.length, limit),
    activity: items.slice(0, limit),
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

  // The OFFICE or the chapter PRESIDENT may announce. An arbitrary alumnus
  // posting official chapter announcements would make the feed meaningless.
  const isPresident = viewer.userId === chapter.presidentAlumniUserId;
  if (!viewer.isOffice && !isPresident) {
    throw unprocessable('Only the Alumni Relations Office or the chapter president can post an announcement');
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

  const isPresident = viewer.userId === chapter.presidentAlumniUserId;
  if (!viewer.isOffice && !isPresident) {
    throw unprocessable('Only the Alumni Relations Office or the chapter president can create an event');
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