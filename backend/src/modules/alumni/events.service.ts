// Event listing, detail, agenda, attendance and office administration.
// Docs: 12-alumni-relations.md §3.3 (events) · §4
//
// ─────────────────────────────────────────────────────────────
// Why attendance is its own field and not a registration status
// ─────────────────────────────────────────────────────────────
// A registration status answers "what did this person SAY" — CONFIRMED means they
// said yes. Attendance answers "did they SHOW UP". Collapsing the two let a
// chapter report 100% participation for an event that nobody attended, because
// the office had approved a pile of RSVPs. `EventRegistration.checkedInAt` is
// therefore written ONLY by markAttendance() / undoAttendance(), never by an
// RSVP decision or an auto-confirmation, and every participation metric in this
// module counts it rather than `status === 'CONFIRMED'`.
//
// ─────────────────────────────────────────────────────────────
// Why the type filter is `eventType`, not `category`
// ─────────────────────────────────────────────────────────────
// `Event.category` is shared with the student and sports apps, and BOTH render
// filter chips from it. Adding REUNION/NETWORKING/WORKSHOP/WEBINAR there would
// surface alumni-only types in two other products, so the alumni taxonomy lives
// in its own nullable column instead and every existing filter is untouched.
import { prisma } from '../../db/prisma.js';
import type { Prisma } from '@prisma/client';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { notify } from './notifications/notifications.delivery.js';
import type { Viewer } from './directory.service.js';

export const EVENT_TYPES = ['REUNION', 'NETWORKING', 'WORKSHOP', 'WEBINAR', 'MEETUP'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Statuses an alumnus may see. DRAFT is the office's business. */
const PUBLIC_STATUSES = ['APPROVED', 'PUBLISHED', 'COMPLETED', 'CANCELLED'];

const PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const now = () => new Date();

/** An event is over once it has started — you cannot register for last Tuesday. */
export function isPast(startDate: Date) {
  return startDate.getTime() < now().getTime();
}

export function isOpenForRegistration(status: string, startDate: Date) {
  return (status === 'APPROVED' || status === 'PUBLISHED') && !isPast(startDate);
}

// ─────────────────────────────────────────────────────────────
// Listing
// ─────────────────────────────────────────────────────────────

export type EventListQuery = {
  scope?: 'upcoming' | 'past' | 'mine';
  type?: string;
  q?: string;
  sort?: 'date' | 'recent' | 'popularity' | 'title';
  page?: number;
  pageSize?: number;
  viewer?: Viewer;
};

/**
 * Event directory.
 *
 * `scope=mine` is the "Registered events" tab and is resolved through the
 * viewer's OWN registration rows rather than a status filter, because "mine"
 * must include events they registered for and then cancelled if we ever keep
 * those rows — a status filter would silently hide them.
 */
export async function listEvents(institutionId: string, query: EventListQuery = {}) {
  const { viewer } = query;
  const scope = query.scope ?? 'upcoming';
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? PAGE_SIZE));

  // Constraints are composed into an AND list rather than assigned onto one
  // object. Assigning `where.OR` twice — once for the date window and once for
  // the search text — silently throws the first away, which would make a search
  // return past events in the upcoming tab.
  const and: Prisma.EventWhereInput[] = [];
  // `category: 'ALUMNI'` is load-bearing. Events is ONE table shared with the
  // student and sports apps, so without this the alumni directory served them
  // "Sports Day 2026" and "TechFest" — events that are not alumni events and
  // have no alumni taxonomy. The old service filtered on it; the rebuild has to
  // as well.
  const base: Prisma.EventWhereInput = { institutionId, category: 'ALUMNI' };

  if (scope === 'upcoming') {
    and.push({ startDate: { gte: now() } });
    and.push({ status: viewer?.isOffice ? { notIn: ['CANCELLED'] } : { in: ['APPROVED', 'PUBLISHED'] } });
  } else if (scope === 'past') {
    and.push({ OR: [{ startDate: { lt: now() } }, { status: { in: ['COMPLETED', 'CANCELLED'] } }] });
  } else if (scope === 'mine') {
    if (!viewer) throw badRequest('scope=mine requires an authenticated viewer');
    and.push({ registrations: { some: { registrantUserId: viewer.userId, status: { not: 'CANCELLED' } } } });
  }

  // A draft is invisible to graduates in every scope, including `mine`.
  if (!viewer?.isOffice) and.push({ status: { in: PUBLIC_STATUSES } });

  if (query.q) {
    and.push({
      OR: [
        { title: { contains: query.q } },
        { description: { contains: query.q } },
        { venue: { name: { contains: query.q } } },
      ],
    });
  }

  const orderBy: Prisma.EventOrderByWithRelationInput =
    query.sort === 'title'
      ? { title: 'asc' }
      : query.sort === 'recent'
        ? { createdAt: 'desc' }
        : scope === 'past'
          ? { startDate: 'desc' }
          : { startDate: 'asc' };

  const whereFor = (extra: Prisma.EventWhereInput = {}): Prisma.EventWhereInput => ({
    ...base,
    AND: and,
    ...extra,
  });

  const [total, rows, typeRows] = await Promise.all([
    prisma.event.count({ where: whereFor(query.type ? { eventType: query.type } : {}) }),
    prisma.event.findMany({
      where: whereFor(query.type ? { eventType: query.type } : {}),
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        venue: { select: { name: true } },
        chapter: { select: { id: true, city: true } },
        registrations: {
          // Only what the list needs: a fill count and whether THIS viewer is in.
          select: { registrantUserId: true, status: true, checkedInAt: true },
        },
      },
    }),
    // Facets are computed over the scope WITHOUT the type filter, so the filter
    // chips keep showing every type with its count instead of collapsing to the
    // one type you just selected.
    prisma.event.groupBy({
      by: ['eventType'],
      where: whereFor(),
      _count: { _all: true },
    }),
  ]);

  const myId = viewer?.userId;
  const items = rows.map((e) => {
    const confirmed = e.registrations.filter((r) => r.status === 'CONFIRMED').length;
    const checkedIn = e.registrations.filter((r) => r.checkedInAt !== null).length;
    const mine = myId ? e.registrations.find((r) => r.registrantUserId === myId) : undefined;
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      eventType: e.eventType,
      category: e.category,
      startDate: e.startDate,
      endDate: e.endDate,
      venue: e.venue?.name ?? null,
      isOnline: e.isOnline,
      meetingUrl: e.meetingUrl,
      capacity: e.capacity,
      status: e.status,
      // The card swaps its fill bar for an attendance figure on past events, so
      // it needs to know which it is looking at without re-deriving the date.
      isPast: isPast(e.startDate),
      chapter: e.chapter ? { id: e.chapter.id, city: e.chapter.city } : null,
      registered: e.registrations.filter((r) => r.status !== 'CANCELLED').length,
      confirmed,
      checkedIn,
      seatsLeft: Math.max(0, e.capacity - confirmed),
      // The list shows "Registered"/"Waitlisted" so a graduate never has to open
      // an event to find out whether they are going.
      myStatus: mine ? mine.status : null,
      myCheckedIn: mine ? mine.checkedInAt !== null : false,
    };
  });

  return {
    scope,
    items,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    facets: {
      types: typeRows
        .filter((t) => t.eventType !== null)
        .map((t) => ({ type: t.eventType as string, count: t._count._all }))
        .sort((a, b) => b.count - a.count),
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Detail
// ─────────────────────────────────────────────────────────────

export async function getEventDetail(
  institutionId: string,
  eventId: string,
  viewer?: Viewer,
) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, institutionId },
    include: {
      venue: { select: { id: true, name: true, capacity: true } },
      chapter: { select: { id: true, city: true, region: true } },
      scheduleItems: { orderBy: [{ day: 'asc' }, { order: 'asc' }] },
      registrations: {
        include: {
          registrant: {
            select: {
              id: true,
              fullName: true,
              alumniProfile: {
                select: { graduationYear: true, currentRole: true, company: { select: { name: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      photos: {
        orderBy: { createdAt: 'asc' },
        include: { file: { select: { mimeType: true, sizeBytes: true, storageKey: true } } },
      },
      feedback: { select: { rating: true } },
    },
  });
  if (!event) throw notFound('Event not found');
  if (!viewer?.isOffice && event.status === 'DRAFT') throw notFound('Event not found');

  const confirmed = event.registrations.filter((r) => r.status === 'CONFIRMED').length;
  const pending = event.registrations.filter((r) => r.status === 'PENDING').length;
  const checkedIn = event.registrations.filter((r) => r.checkedInAt !== null).length;
  const myId = viewer?.userId;
  const mine = myId ? event.registrations.find((r) => r.registrantUserId === myId) : undefined;

  const avgRating =
    event.feedback.length > 0
      ? Math.round((event.feedback.reduce((s, f) => s + f.rating, 0) / event.feedback.length) * 10) / 10
      : null;

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    eventType: event.eventType,
    category: event.category,
    startDate: event.startDate,
    endDate: event.endDate,
    venue: event.venue,
    isOnline: event.isOnline,
    meetingUrl: event.meetingUrl,
    capacity: event.capacity,
    status: event.status,
    chapter: event.chapter,
    isPast: isPast(event.startDate),
    agenda: event.scheduleItems.map((s) => ({
      id: s.id,
      day: s.day,
      order: s.order,
      item: s.item,
      isDone: s.isDone,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      speaker: s.speaker,
      location: s.location,
      track: s.track,
    })),
    attendees: event.registrations.map((r) => ({
      registrationId: r.id,
      userId: r.registrantUserId,
      name: r.registrant.fullName,
      graduationYear: r.registrant.alumniProfile?.graduationYear ?? null,
      role: r.registrant.alumniProfile?.currentRole ?? null,
      company: r.registrant.alumniProfile?.company?.name ?? null,
      status: r.status,
      checkedInAt: r.checkedInAt,
      createdAt: r.createdAt,
    })),
    photos: event.photos.map((p) => ({
      id: p.id,
      caption: p.caption,
      url: `/uploads/${p.file.storageKey}`,
      mimeType: p.file.mimeType,
      createdAt: p.createdAt,
    })),
    stats: {
      registered: event.registrations.filter((r) => r.status !== 'CANCELLED').length,
      confirmed,
      pending,
      declined: event.registrations.filter((r) => r.status === 'DECLINED').length,
      checkedIn,
      // Attendance rate is over CONFIRMED registrations: of the people who said
      // they would come, how many did. Using `registered` as the denominator
      // would flatter every event, since most people never confirm.
      attendanceRate: confirmed > 0 ? Math.round((checkedIn / confirmed) * 100) : null,
      // Reported as its own number rather than folded into attendance: "of
      // everyone who registered, how many held a seat" and "of those, how many
      // turned up" are different questions and conflating them is what caused the
      // original bug.
      confirmationRate:
        event.registrations.filter((r) => r.status !== 'CANCELLED').length > 0
          ? Math.round((confirmed / event.registrations.filter((r) => r.status !== 'CANCELLED').length) * 100)
          : null,
      seatsLeft: Math.max(0, event.capacity - confirmed),
      photoCount: event.photos.length,
      feedbackCount: event.feedback.length,
      avgRating,
    },
    viewerContext: buildViewerContext(viewer, event, mine, { confirmed, pending }),
  };
}

/**
 * Every permission on the event screen, derived once on the server.
 *
 * The UI renders Register / Cancel / Mark attendance / Upload from these flags
 * and never from a client-side role guess — otherwise the app offers a button
 * the API then refuses, which reads as a broken product rather than a locked one.
 */
function buildViewerContext(
  viewer: Viewer | undefined,
  event: { id: string; status: string; startDate: Date; chapterId: string | null; capacity: number },
  mine: { id: string; status: string; checkedInAt: Date | null } | undefined,
  seats: { confirmed: number; pending: number },
) {
  const office = viewer?.isOffice ?? false;
  const past = isPast(event.startDate);
  // A live registration is one that has not been withdrawn or declined. PENDING
  // counts as live: the person asked to come and is waiting for a seat.
  const active = !!mine && mine.status !== 'CANCELLED' && mine.status !== 'DECLINED';
  const seatsLeft = Math.max(0, event.capacity - seats.confirmed);
  return {
    isOffice: office,
    isPast: past,
    isRegistered: active,
    isWaitlisted: mine?.status === 'PENDING',
    hasCheckedIn: mine?.checkedInAt != null,
    myRegistrationId: mine?.id ?? null,
    seatsLeft,
    // Full means waitlisted, not blocked: the request is still recorded and the
    // office can promote it when a seat frees up.
    canRegister: !!viewer && !office && !past && isOpenForRegistration(event.status, event.startDate) && !active,
    // Cancelling stays possible after the fact (plans change) but not once you
    // are checked in — that would erase real attendance.
    canCancel: !!viewer && !office && active && mine?.checkedInAt == null,
    // Only someone who was actually in the room may review it.
    canPostFeedback: !!viewer && !office && mine?.checkedInAt != null,
    canManageEvent: office,
    canManageAgenda: office,
    canMarkAttendance: office,
    canUploadPhotos: office,
    canDeletePhotos: office,
    canDecideRsvp: office,
    registrationCount: seats.confirmed,
    waitlistCount: seats.pending,
  };
}

// ─────────────────────────────────────────────────────────────
// Office administration
// ─────────────────────────────────────────────────────────────

export async function createEvent(
  viewer: Viewer,
  body: {
    title: string;
    description?: string;
    eventType?: string;
    startDate: string;
    endDate: string;
    venueId?: string;
    isOnline?: boolean;
    meetingUrl?: string;
    capacity?: number;
    chapterId?: string;
    status?: string;
  },
) {
  if (!viewer.isOffice) throw forbidden('Only the Alumni Relations Office can create an event');
  if (body.eventType && !EVENT_TYPES.includes(body.eventType as EventType)) {
    throw badRequest(`eventType must be one of ${EVENT_TYPES.join(', ')}`);
  }
  const start = new Date(body.startDate);
  const end = new Date(body.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw badRequest('Invalid start or end date');
  if (end.getTime() < start.getTime()) throw badRequest('An event cannot end before it starts');
  if (body.isOnline && !body.meetingUrl) throw badRequest('An online event needs a meeting link');

  if (body.venueId) {
    const venue = await prisma.venue.findFirst({ where: { id: body.venueId, institutionId: viewer.institutionId } });
    if (!venue) throw notFound('Venue not found');
  }

  const event = await prisma.event.create({
    data: {
      institutionId: viewer.institutionId,
      title: body.title.trim(),
      description: body.description?.trim() ?? null,
      category: 'ALUMNI',
      eventType: body.eventType ?? null,
      startDate: start,
      endDate: end,
      venueId: body.venueId ?? null,
      isOnline: body.isOnline ?? false,
      meetingUrl: body.isOnline ? (body.meetingUrl ?? null) : null,
      capacity: body.capacity ?? 100,
      chapterId: body.chapterId ?? null,
      status: body.status ?? 'PUBLISHED',
      organizerUserId: viewer.userId,
    },
  });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'event.create',
    entityType: 'Event',
    entityId: event.id,
    after: { title: event.title, eventType: event.eventType, status: event.status },
  });
  return { id: event.id, title: event.title, status: event.status, eventType: event.eventType };
}

export async function updateEvent(
  viewer: Viewer,
  eventId: string,
  body: {
    title?: string;
    description?: string;
    eventType?: string;
    startDate?: string;
    endDate?: string;
    capacity?: number;
    isOnline?: boolean;
    meetingUrl?: string;
    status?: string;
  },
) {
  if (!viewer.isOffice) throw forbidden('Only the Alumni Relations Office can edit an event');
  const event = await or404(viewer.institutionId, eventId);
  if (body.eventType && !EVENT_TYPES.includes(body.eventType as EventType)) {
    throw badRequest(`eventType must be one of ${EVENT_TYPES.join(', ')}`);
  }

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title.trim();
  if (body.description !== undefined) data.description = body.description.trim() || null;
  if (body.eventType !== undefined) data.eventType = body.eventType || null;
  if (body.startDate) data.startDate = new Date(body.startDate);
  if (body.endDate) data.endDate = new Date(body.endDate);
  if (body.capacity !== undefined) data.capacity = body.capacity;
  if (body.isOnline !== undefined) data.isOnline = body.isOnline;
  // A meeting link is meaningless for an in-person event, so it is cleared rather
  // than left behind where someone might join a conference room that never was.
  if (body.meetingUrl !== undefined) data.meetingUrl = body.meetingUrl || null;
  if (body.status !== undefined) data.status = body.status;
  if (Object.keys(data).length === 0) return { id: event.id, unchanged: true };

  const updated = await prisma.event.update({ where: { id: event.id }, data });
  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'event.update',
    entityType: 'Event',
    entityId: event.id,
    before: { title: event.title, status: event.status, capacity: event.capacity },
    after: data,
  });
  return { id: updated.id, title: updated.title, status: updated.status, capacity: updated.capacity };
}

// ─────────────────────────────────────────────────────────────
// Agenda
// ─────────────────────────────────────────────────────────────

export async function addScheduleItem(
  viewer: Viewer,
  eventId: string,
  body: {
    day: number;
    item: string;
    order?: number;
    startsAt?: string;
    endsAt?: string;
    speaker?: string;
    location?: string;
    track?: string;
  },
) {
  if (!viewer.isOffice) throw forbidden('Only the Alumni Relations Office can edit the agenda');
  const event = await or404(viewer.institutionId, eventId);

  const last = await prisma.eventScheduleItem.findFirst({
    where: { eventId, day: body.day },
    orderBy: { order: 'desc' },
    select: { order: true },
  });
  const order = body.order ?? (last ? last.order + 1 : 1);

  const created = await prisma.eventScheduleItem.create({
    data: {
      eventId,
      day: body.day,
      item: body.item.trim(),
      order,
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      speaker: body.speaker?.trim() || null,
      location: body.location?.trim() || null,
      track: body.track?.trim() || null,
    },
  });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'event.agenda.add',
    entityType: 'Event',
    entityId: event.id,
    after: { day: created.day, item: created.item },
  });
  return {
    id: created.id,
    day: created.day,
    order: created.order,
    item: created.item,
    startsAt: created.startsAt,
    endsAt: created.endsAt,
    speaker: created.speaker,
    location: created.location,
    track: created.track,
    isDone: created.isDone,
  };
}

export async function toggleScheduleItem(viewer: Viewer, itemId: string, isDone: boolean) {
  if (!viewer.isOffice) throw forbidden('Only the Alumni Relations Office can edit the agenda');
  const item = await prisma.eventScheduleItem.findFirst({
    where: { id: itemId, event: { institutionId: viewer.institutionId } },
    select: { id: true, item: true, isDone: true },
  });
  if (!item) throw notFound('Schedule item not found');
  const updated = await prisma.eventScheduleItem.update({ where: { id: item.id }, data: { isDone } });
  return { id: updated.id, item: updated.item, isDone: updated.isDone };
}

// ─────────────────────────────────────────────────────────────
// Attendance — the only writer of `checkedInAt`
// ─────────────────────────────────────────────────────────────

/**
 * Mark attendees present. `method` records HOW they were checked in so a future
 * QR scanner and today's manual list stay distinguishable in the data.
 */
export async function markAttendance(
  viewer: Viewer,
  eventId: string,
  body: { registrationIds: string[]; method?: 'MANUAL' | 'QR' },
) {
  if (!viewer.isOffice) throw forbidden('Only the Alumni Relations Office can mark attendance');
  const event = await or404(viewer.institutionId, eventId);
  if (body.registrationIds.length === 0) throw badRequest('Select at least one attendee');

  const rows = await prisma.eventRegistration.findMany({
    where: { id: { in: body.registrationIds }, eventId },
    select: { id: true, checkedInAt: true, registrant: { select: { fullName: true } } },
  });
  if (rows.length === 0) throw notFound('No matching registrations on this event');

  // Already-checked-in rows are skipped rather than re-stamped, so the original
  // check-in time (the real fact about when they arrived) survives a re-run.
  const fresh = rows.filter((r) => r.checkedInAt === null);
  const at = now();
  if (fresh.length > 0) {
    await prisma.eventRegistration.updateMany({
      where: { id: { in: fresh.map((r) => r.id) } },
      data: { checkedInAt: at, checkInMethod: body.method ?? 'MANUAL' },
    });
  }

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'event.attendance.mark',
    entityType: 'Event',
    entityId: event.id,
    after: { marked: fresh.length, method: body.method ?? 'MANUAL' },
  });

  const checkedIn = await prisma.eventRegistration.count({ where: { eventId, checkedInAt: { not: null } } });
  return {
    eventId,
    event: event.title,
    marked: fresh.length,
    skipped: rows.length - fresh.length,
    checkedIn,
  };
}

export async function undoAttendance(viewer: Viewer, eventId: string, body: { registrationIds: string[] }) {
  if (!viewer.isOffice) throw forbidden('Only the Alumni Relations Office can change attendance');
  const event = await or404(viewer.institutionId, eventId);
  const result = await prisma.eventRegistration.updateMany({
    where: { id: { in: body.registrationIds }, eventId },
    data: { checkedInAt: null, checkInMethod: null },
  });
  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'event.attendance.undo',
    entityType: 'Event',
    entityId: event.id,
    after: { cleared: result.count },
  });
  const checkedIn = await prisma.eventRegistration.count({ where: { eventId, checkedInAt: { not: null } } });
  return { eventId, cleared: result.count, checkedIn };
}

/**
 * Mock QR check-in.
 *
 * ⚠️ YET TO BUILD — there is no camera scanner. This exists so the QR path is
 * exercised end to end (the token really is issued, stored and verified) rather
 * than left as a dead column: `qrPayload` was on EventRegistration from the start
 * and was never written by anything. The office picks a code and the server
 * checks it, which is exactly the work a scanner would do minus the camera.
 * Swap `body.code` for a scanned token and nothing else changes.
 */
export async function mockQrCheckIn(viewer: Viewer, eventId: string, body: { code: string }) {
  if (!viewer.isOffice) throw forbidden('Only the Alumni Relations Office can run check-in');
  await or404(viewer.institutionId, eventId);
  const match = await prisma.eventRegistration.findFirst({
    where: { eventId, qrPayload: body.code.trim() },
    select: { id: true, checkedInAt: true, registrant: { select: { fullName: true } } },
  });
  if (!match) throw notFound('That code does not match any registration on this event');
  if (match.checkedInAt) {
    return { checkedIn: true, already: true, name: match.registrant.fullName, at: match.checkedInAt };
  }
  const at = now();
  await prisma.eventRegistration.update({
    where: { id: match.id },
    data: { checkedInAt: at, checkInMethod: 'QR' },
  });
  return { checkedIn: true, already: false, name: match.registrant.fullName, at };
}

// ─────────────────────────────────────────────────────────────
// Office RSVP decisions — the waitlist queue
// ─────────────────────────────────────────────────────────────

/**
 * Confirm or decline a registration on the office's behalf.
 *
 * This is the ONLY way a PENDING (waitlisted) registration becomes CONFIRMED
 * other than a cancellation promoting it. Deliberately it does NOT touch
 * `checkedInAt`: approving an RSVP says someone intends to come, not that they
 * did. Keeping those two writes in different functions is what stops the old
 * conflation from creeping back in.
 */
export async function decideRsvp(
  institutionId: string,
  registrationId: string,
  decision: 'CONFIRMED' | 'DECLINED',
  actorUserId: string,
) {
  const reg = await prisma.eventRegistration.findFirst({
    where: { id: registrationId, event: { institutionId } },
    include: { event: { select: { id: true, title: true } } },
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
    notify({
      institutionId,
      recipientUserId: reg.registrantUserId,
      // `EVENT` is the RSVP-decision category, distinct from `EVENT_REG` (seat
      // confirmed / waitlisted) and `EVENT_REMINDER` (the sweep's nudge). It is its
      // own entry in notifications.rules.ts because the alumni app's TYPE_META had
      // no `EVENT` key at all, so all 33 of these rendered as "System".
      category: 'EVENT',
      title: `RSVP ${decision === 'CONFIRMED' ? 'confirmed' : 'declined'}`,
      body: `Your RSVP for "${reg.event.title}" was ${decision.toLowerCase()}.`,
      // Per registration per decision. Flipping to CONFIRMED and back to PENDING is
      // two real events worth two rows; the same decision twice is not.
      dedupeKey: `rsvp:${reg.id}:${decision}`,
      data: { eventId: reg.event.id, registrationId: reg.id },
    }),
  ]);

  return { id: updated.id, status: updated.status, changed: true };
}

// ─────────────────────────────────────────────────────────────
// shared helpers
// ─────────────────────────────────────────────────────────────

export async function or404(institutionId: string, eventId: string) {
  const event = await prisma.event.findFirst({ where: { id: eventId, institutionId } });
  if (!event) throw notFound('Event not found');
  return event;
}

/** Seat accounting used by both registration and the detail view. */
export async function seatState(eventId: string) {
  const [confirmed, pending] = await Promise.all([
    prisma.eventRegistration.count({ where: { eventId, status: 'CONFIRMED' } }),
    prisma.eventRegistration.count({ where: { eventId, status: 'PENDING' } }),
  ]);
  return { confirmed, pending };
}