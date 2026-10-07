// Docs: 12-alumni-relations.md §3.3 · §4
//
// WHY THIS IS A SEPARATE FILE AGAIN
// ---------------------------------
// This module used to BE `feedback.service.ts`. Commit 7d39113 ("add mentorship session
// management for students") rewrote that file for MENTORSHIP feedback — `pairId`,
// `mentorRating`/`menteeRating` — and in doing so overwrote the event implementation. The
// three `/events/:id/feedback` routes were left calling the same module, so
// `POST /alumni/events/{id}/feedback` looked up a MENTORSHIP PAIR by event id and answered
// `404 Mentorship pair not found` for every caller.
//
// The regression is silent in the worst way: the refusal path is still a clean 404, so a
// test asserting "you must check in first" passes, and only an actual attendee trying to
// leave a review discovers the feature is gone. It stayed broken until an HTTP suite
// exercised the happy path.
//
// The two are genuinely different features with different tables (`EventFeedback` vs the
// mentorship feedback rows), different schemas, and different authorisation rules, so they
// are separate modules rather than one file with two entry points. `feedback.service.ts`
// is the MENTORSHIP one and stays as it is.
import { prisma } from '../../db/prisma.js';
import { badRequest, conflict, notFound, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import type { Viewer } from './directory.service.js';

/**
 * Only someone whose registration carries `checkedInAt` may review. Letting every
 * registered alumnus rate an event would pad the average with opinions from people who
 * never attended, and the rating is only useful as a proxy for "was it worth turning up
 * for".
 *
 * One review per person per event, but EDITABLE: someone who rates an event 2 because the
 * Wi-Fi failed should be able to fix it once it is sorted, and a second POST updates rather
 * than colliding on `@@unique([eventId, authorUserId])`.
 */
export async function submitFeedback(
  viewer: Viewer,
  eventId: string,
  body: { rating: number; comment?: string },
) {
  if (viewer.isOffice) {
    throw unprocessable('The Alumni Relations Office cannot review its own events');
  }

  const event = await prisma.event.findFirst({
    where: { id: eventId, institutionId: viewer.institutionId },
    select: { id: true, title: true, startDate: true },
  });
  if (!event) throw notFound('Event not found');

  const registration = await prisma.eventRegistration.findFirst({
    where: { eventId, registrantUserId: viewer.userId },
    select: { id: true, status: true, checkedInAt: true },
  });
  if (!registration) throw conflict(`Register for ${event.title} before reviewing it`);
  if (registration.checkedInAt === null) {
    throw unprocessable('Only attendees who checked in can leave a review');
  }

  const existing = await prisma.eventFeedback.findFirst({
    where: { eventId, authorUserId: viewer.userId },
  });

  const row = existing
    ? await prisma.eventFeedback.update({
        where: { id: existing.id },
        data: { rating: body.rating, comment: body.comment?.trim() || null },
      })
    : await prisma.eventFeedback.create({
        data: {
          eventId,
          authorUserId: viewer.userId,
          rating: body.rating,
          comment: body.comment?.trim() || null,
        },
      });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: existing ? 'event.feedback.update' : 'event.feedback.create',
    entityType: 'EventFeedback',
    entityId: row.id,
    before: existing ? { rating: existing.rating } : undefined,
    after: { rating: row.rating, event: event.title },
  });

  return {
    id: row.id,
    eventId,
    rating: row.rating,
    comment: row.comment,
    updated: !!existing,
    ...(await summarise(eventId)),
  };
}

export async function deleteMyFeedback(viewer: Viewer, eventId: string) {
  const existing = await prisma.eventFeedback.findFirst({
    where: { eventId, authorUserId: viewer.userId, event: { institutionId: viewer.institutionId } },
  });
  if (!existing) throw notFound('You have not reviewed this event');
  await prisma.eventFeedback.delete({ where: { id: existing.id } });
  return { eventId, deleted: true, ...(await summarise(eventId)) };
}

/**
 * Aggregate + the visible list. Reviews are shown with the reviewer's name: an event rating
 * nobody can attribute is not actionable, and alumni networks are small enough that this is
 * not a privacy problem.
 *
 * `institutionId` is optional and falls back to the viewer's own. The route passes only a
 * viewer, so requiring the third argument would have made every call read `undefined` and
 * silently match nothing.
 */
export async function listFeedback(
  viewer: Viewer | undefined,
  eventId: string,
  institutionId?: string,
) {
  const institution = institutionId ?? viewer?.institutionId;
  const event = await prisma.event.findFirst({
    where: institution ? { id: eventId, institutionId: institution } : { id: eventId },
    select: { id: true },
  });
  if (!event) throw notFound('Event not found');

  const rows = await prisma.eventFeedback.findMany({
    where: { eventId },
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { id: true, fullName: true } } },
  });

  return {
    ...(await summarise(eventId)),
    distribution: [1, 2, 3, 4, 5].map((star) => ({
      star,
      count: rows.filter((r) => r.rating === star).length,
    })),
    reviews: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      authorName: r.author.fullName,
      isMine: viewer?.userId === r.authorUserId,
    })),
  };
}

async function summarise(eventId: string) {
  const agg = await prisma.eventFeedback.aggregate({
    where: { eventId },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const count = agg._count._all;
  return {
    count,
    // Null rather than 0: "no reviews yet" and "everyone rated it 1 star" are completely
    // different facts and must not render the same.
    average: agg._avg.rating === null ? null : Math.round(agg._avg.rating * 10) / 10,
  };
}

/** Guard shared by any caller that validates a rating outside the route. */
export function assertRating(rating: unknown): asserts rating is number {
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw badRequest('rating must be a whole number of stars between 1 and 5');
  }
}