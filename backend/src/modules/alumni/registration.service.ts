// Self-service event registration for alumni.
// Docs: 12-alumni-relations.md §3.3 · §4
//
// ─────────────────────────────────────────────────────────────
// The rule this file exists to enforce
// ─────────────────────────────────────────────────────────────
// An alumnus registers for an event. That did not used to be possible at all —
// only the office could decide registrations, so the "RSVP" buttons on the event
// screen were the office's, not the graduate's, and "Registered events" had
// nothing behind it.
//
// Registering CONFIRMS IMMEDIATELY while seats remain, and lands in PENDING
// (the waitlist) once the event is full. Both are live registrations; the
// difference is whether a seat is held.
//
// Cancelling promotes the oldest waiting registration into the freed seat.
// Without that, cancelling does nothing useful: the seat stays empty while
// someone who asked to attend is told to wait. Promotion is ordered by
// `createdAt` so the queue is first-come, first-served rather than arbitrary.

import { prisma } from '../../db/prisma.js';
import { badRequest, conflict, forbidden, notFound, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { notify } from './notifications/notifications.delivery.js';
import type { Viewer } from './directory.service.js';
import { isOpenForRegistration, isPast } from './events.service.js';

/**
 * A stable, unguessable code the office can use for QR check-in.
 *
 * ⚠️ The scanner is YET TO BUILD. This token is really issued, stored on the
 * registration and verified by `mockQrCheckIn`, so the QR path is exercised end
 * to end rather than left as the dead `qrPayload` column it used to be.
 */
function makeQrPayload(eventId: string, userId: string) {
  const entropy = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `EVT:${eventId.slice(-6)}:${userId.slice(-6)}:${entropy}`.toUpperCase();
}

export async function registerForEvent(viewer: Viewer, eventId: string) {
  // The office administers events; it does not attend them. An office account in
  // the attendee list would inflate confirmed counts and attendance rates.
  if (viewer.isOffice) {
    throw unprocessable(
      'The Alumni Relations Office cannot register for events — add attendees on their behalf instead',
    );
  }

  const event = await prisma.event.findFirst({
    where: { id: eventId, institutionId: viewer.institutionId },
    select: {
      id: true,
      title: true,
      status: true,
      startDate: true,
      capacity: true,
      category: true,
    },
  });
  if (!event) throw notFound('Event not found');
  if (isPast(event.startDate)) throw unprocessable('That event has already started');
  if (!isOpenForRegistration(event.status, event.startDate)) {
    throw unprocessable(`That event is not open for registration (status ${event.status})`);
  }

  const existing = await prisma.eventRegistration.findFirst({
    where: { eventId, registrantUserId: viewer.userId },
  });
  if (existing && existing.status !== 'CANCELLED' && existing.status !== 'DECLINED') {
    throw conflict(
      existing.status === 'PENDING'
        ? `You are already on the waitlist for ${event.title}`
        : `You are already registered for ${event.title}`,
    );
  }

  // Count inside the transaction and re-check, because two people registering
  // for the last seat at the same moment would otherwise both read
  // confirmed = capacity - 1 and both be CONFIRMED — overbooking the room.
  const result = await prisma.$transaction(async (tx) => {
    const confirmed = await tx.eventRegistration.count({
      where: { eventId, status: 'CONFIRMED' },
    });
    const status = confirmed < event.capacity ? 'CONFIRMED' : 'PENDING';

    const row = existing
      ? await tx.eventRegistration.update({
          where: { id: existing.id },
          data: {
            status,
            // A re-registration after cancelling gets a fresh code and clears
            // any stale attendance from the previous stint.
            checkedInAt: null,
            checkInMethod: null,
            qrPayload: makeQrPayload(eventId, viewer.userId),
            createdAt: new Date(),
          },
        })
      : await tx.eventRegistration.create({
          data: {
            eventId,
            registrantUserId: viewer.userId,
            status,
            qrPayload: makeQrPayload(eventId, viewer.userId),
          },
        });

    return { row, status };
  });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'event.register',
    entityType: 'EventRegistration',
    entityId: result.row.id,
    after: { event: event.title, status: result.status },
  });

  // Seat confirmed or waitlisted. This notification did not exist: registration was
  // a silent transaction, so the only confirmation anybody got was the API response
  // the screen happened to be showing. If they registered from a push or a
  // deep-link and then closed the app, there was no record that they had a seat.
  //
  // Reuses the `EVENT_REG` type that already exists in the accounts registry for the
  // transport module — one type, one meaning, rather than a second `REGISTRATION`
  // that would need registering in two places.
  await notify({
    institutionId: viewer.institutionId,
    recipientUserId: viewer.userId,
    category: 'EVENT_REG',
    title:
      result.status === 'CONFIRMED'
        ? `You are going to ${event.title}`
        : `You are on the waitlist for ${event.title}`,
    body:
      result.status === 'CONFIRMED'
        ? `Starts ${event.startDate.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}. Your QR pass is in Events → Registered.`
        : `${event.title} is full. You will be confirmed automatically if a seat frees up.`,
    // Per registration per outcome. Re-registering after cancelling is a NEW
    // registration row (the old one is CANCELLED, not updated), so it gets its own
    // notification — which is correct, it is news again.
    dedupeKey: `event-registration:${result.row.id}:${result.status}`,
    data: { eventId, registrationId: result.row.id },
  });

  return {
    registrationId: result.row.id,
    eventId,
    status: result.status,
    waitlisted: result.status === 'PENDING',
    // Surfaced so the UI can say "you are waitlisted" instead of a bare toast.
    message:
      result.status === 'CONFIRMED'
        ? `You are going to ${event.title}`
        : `${event.title} is full — you are on the waitlist and will be confirmed automatically if a seat frees up`,
  };
}

/**
 * Withdraw, then promote the longest-waiting person if a seat is free.
 *
 * Promotion only happens from PENDING, and only into a genuinely free seat. A
 * DECLINED row is not promoted: declining is an answer, not a queue position.
 */
export async function cancelRegistration(viewer: Viewer, eventId: string) {
  if (viewer.isOffice) throw unprocessable('The office removes attendees with a reason instead');

  const event = await prisma.event.findFirst({
    where: { id: eventId, institutionId: viewer.institutionId },
    select: { id: true, title: true, capacity: true },
  });
  if (!event) throw notFound('Event not found');

  const existing = await prisma.eventRegistration.findFirst({
    where: { eventId, registrantUserId: viewer.userId },
  });
  if (!existing) throw notFound('You are not registered for this event');
  if (existing.status === 'CANCELLED') throw unprocessable('You have already cancelled');
  // Withdrawing after check-in would delete a real attendance record, which is
  // exactly the fact the chapter metrics are built on.
  if (existing.checkedInAt) {
    throw unprocessable('You checked in to this event, so the registration cannot be withdrawn');
  }

  const outcome = await prisma.$transaction(async (tx) => {
    await tx.eventRegistration.update({
      where: { id: existing.id },
      data: { status: 'CANCELLED' },
    });

    // A seat only frees up if the person leaving was actually holding one.
    let promoted: { id: string; name: string } | null = null;
    if (existing.status === 'CONFIRMED') {
      const confirmed = await tx.eventRegistration.count({
        where: { eventId, status: 'CONFIRMED' },
      });
      if (confirmed < event.capacity) {
        const next = await tx.eventRegistration.findFirst({
          where: { eventId, status: 'PENDING' },
          orderBy: { createdAt: 'asc' },
          select: { id: true, registrant: { select: { fullName: true } } },
        });
        if (next) {
          await tx.eventRegistration.update({
            where: { id: next.id },
            data: { status: 'CONFIRMED' },
          });
          promoted = { id: next.id, name: next.registrant.fullName };
        }
      }
    }
    return { promoted };
  });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'event.registration.cancel',
    entityType: 'EventRegistration',
    entityId: existing.id,
    before: { status: existing.status, event: event.title },
    after: { promoted: outcome.promoted?.name ?? null },
  });

  // The promoted person has to be told.
  //
  // This is the third registration outcome and the only one that fires without
  // them doing anything — they queued, somebody else left, and a seat appeared. They
  // were PENDING with a QR payload already minted, so they had no way of knowing
  // they now hold a seat, and the attendance report would count them without them
  // ever having arrived.
  //
  // Deliberately sent AFTER the transaction: if the write fails the promotion does
  // not happen, and a notification claiming a seat that does not exist is worse than
  // silence.
  if (outcome.promoted) {
    const promotedRegistration = await prisma.eventRegistration.findUnique({
      where: { id: outcome.promoted.id },
      select: { registrantUserId: true },
    });
    if (promotedRegistration) {
      await notify({
        institutionId: viewer.institutionId,
        recipientUserId: promotedRegistration.registrantUserId,
        category: 'EVENT_REG',
        title: `A seat opened up — you are going to ${event.title}`,
        body: 'You have been moved off the waitlist and your seat is confirmed.',
        dedupeKey: `event-registration:${outcome.promoted.id}:CONFIRMED`,
        data: { eventId, registrationId: outcome.promoted.id },
      });
    }
  }

  return {
    eventId,
    status: 'CANCELLED',
    promoted: outcome.promoted,
    message: outcome.promoted
      ? `Cancelled. ${outcome.promoted.name} moved off the waitlist into the free seat.`
      : `Cancelled. ${event.title}`,
  };
}

/**
 * The "Registered events" tab, resolved through the viewer's OWN rows.
 */
export async function listMyEvents(viewer: Viewer, opts: { includePast?: boolean } = {}) {
  const registrations = await prisma.eventRegistration.findMany({
    where: {
      registrantUserId: viewer.userId,
      ...(opts.includePast ? {} : { status: { not: 'CANCELLED' } }),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      event: {
        include: {
          venue: { select: { name: true } },
          chapter: { select: { id: true, city: true } },
          registrations: { select: { status: true, checkedInAt: true } },
        },
      },
    },
  });

  return registrations
    .map((r) => {
      const confirmed = r.event.registrations.filter((x) => x.status === 'CONFIRMED').length;
      return {
        registrationId: r.id,
        status: r.status,
        checkedInAt: r.checkedInAt,
        registeredAt: r.createdAt,
        event: {
          id: r.event.id,
          title: r.event.title,
          eventType: r.event.eventType,
          startDate: r.event.startDate,
          endDate: r.event.endDate,
          venue: r.event.venue?.name ?? null,
          isOnline: r.event.isOnline,
          meetingUrl: r.event.meetingUrl,
          status: r.event.status,
          chapter: r.event.chapter,
          capacity: r.event.capacity,
          confirmed,
          checkedIn: r.event.registrations.filter((x) => x.checkedInAt !== null).length,
          seatsLeft: Math.max(0, r.event.capacity - confirmed),
          isPast: isPast(r.event.startDate),
        },
      };
    })
    .sort((a, b) => {
      // Upcoming first, soonest first; then most recent history.
      if (a.event.isPast !== b.event.isPast) return a.event.isPast ? 1 : -1;
      return a.event.isPast
        ? b.event.startDate.getTime() - a.event.startDate.getTime()
        : a.event.startDate.getTime() - b.event.startDate.getTime();
    });
}

/**
 * Attendance history for the viewer: every event they actually turned up at.
 * Driven by `checkedInAt`, so it is a record of presence rather than intent.
 */
export async function getMyAttendance(viewer: Viewer) {
  const rows = await prisma.eventRegistration.findMany({
    where: { registrantUserId: viewer.userId, checkedInAt: { not: null } },
    orderBy: { checkedInAt: 'desc' },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          eventType: true,
          startDate: true,
          endDate: true,
          venue: { select: { name: true } },
          chapter: { select: { id: true, city: true } },
        },
      },
    },
  });

  const byYear = new Map<string, number>();
  for (const r of rows) {
    const year = String(r.event.startDate.getFullYear());
    byYear.set(year, (byYear.get(year) ?? 0) + 1);
  }

  return {
    total: rows.length,
    byYear: [...byYear.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([year, count]) => ({ year, count })),
    events: rows.map((r) => ({
      eventId: r.event.id,
      title: r.event.title,
      eventType: r.event.eventType,
      startDate: r.event.startDate,
      venue: r.event.venue?.name ?? null,
      chapter: r.event.chapter,
      checkedInAt: r.checkedInAt,
      method: r.checkInMethod,
    })),
  };
}

/** Office-side enrolment: add an attendee directly, bypassing the waitlist. */
export async function addAttendee(
  viewer: Viewer,
  eventId: string,
  body: { userId: string; status?: 'CONFIRMED' | 'PENDING' },
) {
  if (!viewer.isOffice) throw forbidden('Only the Alumni Relations Office can add attendees');
  const event = await prisma.event.findFirst({
    where: { id: eventId, institutionId: viewer.institutionId },
    select: { id: true, title: true },
  });
  if (!event) throw notFound('Event not found');

  const person = await prisma.user.findFirst({
    where: { id: body.userId, institutionId: viewer.institutionId },
    select: { id: true, fullName: true },
  });
  if (!person) throw notFound('User not found');

  const existing = await prisma.eventRegistration.findFirst({
    where: { eventId, registrantUserId: body.userId },
  });
  if (existing && existing.status !== 'CANCELLED') {
    throw conflict(`${person.fullName} is already on this event's list`);
  }

  const status = body.status ?? 'CONFIRMED';
  const row = existing
    ? await prisma.eventRegistration.update({
        where: { id: existing.id },
        data: { status, checkedInAt: null, checkInMethod: null, qrPayload: makeQrPayload(eventId, body.userId) },
      })
    : await prisma.eventRegistration.create({
        data: {
          eventId,
          registrantUserId: body.userId,
          status,
          qrPayload: makeQrPayload(eventId, body.userId),
        },
      });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'event.attendee.add',
    entityType: 'EventRegistration',
    entityId: row.id,
    after: { attendee: person.fullName, status, event: event.title },
  });

  // The office adding somebody by hand is the one registration path that is
  // DEFINITELY not self-service, so it is the one where the attendee least expects
  // to hear about it — they did not tap anything. Without this, being added to an
  // event by the office produced no row in their inbox at all.
  await notify({
    institutionId: viewer.institutionId,
    recipientUserId: body.userId,
    category: 'EVENT_REG',
    title: `You have been added to ${event.title}`,
    body:
      status === 'CONFIRMED'
        ? 'The Alumni Relations Office registered you. Your QR pass is in Events → Registered.'
        : `The Alumni Relations Office put you on the waitlist for this event.`,
    dedupeKey: `event-registration:${row.id}:${status}:by-office`,
    data: { eventId, registrationId: row.id },
  });

  return { registrationId: row.id, attendee: person.fullName, status };
}

/** Office-side removal, mirroring removeMember for chapters: a reason is required. */
export async function removeAttendee(
  viewer: Viewer,
  eventId: string,
  registrationId: string,
  reason: string,
) {
  if (!viewer.isOffice) throw forbidden('Only the Alumni Relations Office can remove an attendee');
  if (!reason || reason.trim().length < 5) throw badRequest('A reason of at least 5 characters is required');

  const reg = await prisma.eventRegistration.findFirst({
    where: { id: registrationId, eventId, event: { institutionId: viewer.institutionId } },
    include: { registrant: { select: { fullName: true } }, event: { select: { title: true } } },
  });
  if (!reg) throw notFound('Registration not found');

  await prisma.eventRegistration.update({
    where: { id: reg.id },
    data: { status: 'CANCELLED' },
  });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'event.attendee.remove',
    entityType: 'EventRegistration',
    entityId: reg.id,
    before: { attendee: reg.registrant.fullName, status: reg.status, event: reg.event.title },
    after: { reason: reason.trim() },
  });
  return { registrationId: reg.id, attendee: reg.registrant.fullName, status: 'CANCELLED', reason: reason.trim() };
}