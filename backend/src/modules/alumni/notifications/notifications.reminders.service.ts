/**
 * S-12 Notifications — the reminder sweep (docs/users/12-alumni-relations.md §3.7).
 *
 * WHY A SWEEP AND NOT A SCHEDULER
 * -------------------------------
 * There is no cron, no `setInterval`, and no worker in this backend — nothing has
 * ever run on a timer. Adding the first one for eight categories of mail would buy
 * automation and pay for it with a new failure mode: double-firing on restart, a
 * timer that silently stops when the process is redeployed, and no way to see what
 * it did last night. The repo already has a precedent for the opposite choice —
 * recurring donation instalments are charged by an office button press, not by a
 * scheduler, and accounts' four financial alerts are computed on read rather than
 * written to a table.
 *
 * So the office presses a button. In exchange, the sweep is synchronous, returns
 * a report of exactly what it did, and cannot fire twice in the background.
 *
 * WHAT THE SWEEP OWNS
 * -------------------
 * Only the mail that cannot be sent at the moment of the event that caused it:
 *
 *   1. Event reminders — "starts in 24h" and "starts in 2h", for people with a
 *      CONFIRMED seat. Deduped per event per offset, so pressing the button
 *      eleven times writes two rows, not eleven.
 *   2. A stale mentorship queue — one row per office summarising requests that have
 *      been waiting over a day.
 *
 * What it deliberately does NOT own:
 *
 *   - Chapter announcements. Those are posted by a person at a moment in time and
 *     already fan out immediately (chapters.service.ts). Nothing about "your
 *     chapter posted something" needs waiting.
 *   - The arrival alert for a new mentorship request. Also immediate, and
 *     per-request, emitted by mentorship.service.ts on create. This sweep only
 *     covers the stale tail — see the digest key below for why the two cannot
 *     double-notify.
 *   - Registration confirmations and waitlist promotions. Both happen inside a
 *     transaction that knows the outcome; there is nothing to poll for.
 */
import { prisma } from '../../../db/prisma.js';
import type { Viewer } from '../directory.service.js';
import { officeUserIds } from '../directory.service.js';
import { notifyMany, type NotifyResult } from './notifications.delivery.js';
import { REMINDER_OFFSETS_H, REMINDER_SLACK_MIN } from './notifications.rules.js';

const HOUR_MS = 60 * 60 * 1000;

/** A request older than this is "stuck" rather than "being worked on right now". */
const STALE_REQUEST_H = 24;

type Counted = NotifyResult & { type: string; eventIds: string[]; dryRun: boolean };

export type SweepReport = {
  ranAt: string;
  /** True when the report describes what WOULD be written. Nothing was. */
  dryRun: boolean;
  eventReminders: {
    /** (offset, events matched) pairs, so the office can see why nothing happened. */
    windows: { offsetHours: number; events: number; deliveries: Counted }[];
    delivered: number;
    muted: number;
    duplicates: number;
  };
  mentorshipDigest: Counted & { pending: number; stale: number };
  totals: { delivered: number; muted: number; duplicates: number; suppressed: number };
};

const zero = (type: string, dryRun: boolean, eventIds: string[] = []): Counted => ({
  type,
  eventIds,
  dryRun,
  delivered: 0,
  muted: 0,
  duplicates: 0,
  recipientUserIds: [],
});

/**
 * Events whose start falls inside the slack window around one reminder offset.
 *
 * Returns the window bounds alongside the rows so the report can show "your next
 * event is 25h out, the 24h reminder fires in an hour" instead of a silent zero —
 * a sweep that reports nothing and a sweep that has nothing to do look identical
 * otherwise.
 */
function windowFor(now: Date, offsetHours: number): { from: Date; to: Date } {
  const centre = now.getTime() + offsetHours * HOUR_MS;
  const slack = REMINDER_SLACK_MIN * 60 * 1000;
  return { from: new Date(centre - slack), to: new Date(centre + slack) };
}

async function sweepEventReminders(
  institutionId: string,
  now: Date,
  dryRun: boolean,
): Promise<SweepReport['eventReminders']> {
  const windows: SweepReport['eventReminders']['windows'] = [];
  let delivered = 0;
  let muted = 0;
  let duplicates = 0;

  for (const offsetHours of REMINDER_OFFSETS_H) {
    const { from, to } = windowFor(now, offsetHours);

    const events = await prisma.event.findMany({
      where: { institutionId, startDate: { gte: from, lte: to } },
      select: { id: true, title: true, startDate: true, isOnline: true, meetingUrl: true },
      orderBy: { startDate: 'asc' },
    });

    const matched = zero(`EVENT_REMINDER:${offsetHours}h`, dryRun, events.map((e) => e.id));

    for (const event of events) {
      const registrations = await prisma.eventRegistration.findMany({
        where: { eventId: event.id, status: 'CONFIRMED' },
        select: { registrantUserId: true },
      });
      if (registrations.length === 0) continue;

      const hours = offsetHours;
      const lead =
        hours >= 24
          ? `tomorrow at ${event.startDate.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
          : `in about ${hours} hours`;

      const res = await notifyMany({
        institutionId,
        recipientUserIds: registrations.map((r) => r.registrantUserId),
        category: 'EVENT_REMINDER',
        title: `${event.title} starts ${lead}`,
        body: event.isOnline
          ? `You have a confirmed seat. Join here: ${event.meetingUrl ?? 'the link is in the event details'}`
          : 'You have a confirmed seat. Venue and directions are in the event details.',
        // Per event per offset. This is the whole reason `dedupeKey` exists: the
        // button is idempotent for the current cycle, and an event nudged at 24h
        // still gets its own row at 2h because the offset is part of the key.
        dedupeKey: `event-reminder:${event.id}:${offsetHours}`,
        data: { eventId: event.id, offsetHours },
        dryRun,
      });

      matched.delivered += res.delivered;
      matched.muted += res.muted;
      matched.duplicates += res.duplicates;
      matched.recipientUserIds.push(...res.recipientUserIds);
    }

    delivered += matched.delivered;
    muted += matched.muted;
    duplicates += matched.duplicates;
    windows.push({ offsetHours, events: events.length, deliveries: matched });
  }

  return { windows, delivered, muted, duplicates };
}

/**
 * One row per office summarising the requests that have been waiting over a day.
 *
 * Sent with `respectMutes: false`. This is the office's work queue, not news: an
 * officer who muted "mentorship" must still be able to see requests awaiting
 * approval, or the mute becomes a way to lose them. Every other category the office
 * receives respects its toggles.
 *
 * The dedupe key is `count + oldest request id`, so it fires once per distinct
 * state of the queue: a new request arriving, or one being approved, changes the
 * key and produces a fresh digest. Pressing the button again with nothing changed
 * produces nothing. That is also why this cannot double-notify the arrival alert —
 * the arrival rows are per-request with `mentorship-request:*` keys and are written
 * by a different code path at a different time.
 */
async function sweepMentorshipDigest(
  institutionId: string,
  now: Date,
  dryRun: boolean,
): Promise<SweepReport['mentorshipDigest']> {
  const staleBefore = new Date(now.getTime() - STALE_REQUEST_H * HOUR_MS);

  const pending = await prisma.mentorshipRequest.findMany({
    where: { institutionId, status: 'PENDING' },
    select: { id: true, createdAt: true, field: true, menteeUserId: true },
    orderBy: { createdAt: 'asc' },
  });

  const stale = pending.filter((r) => r.createdAt <= staleBefore);
  const empty = zero('mentorship-digest', dryRun);
  if (pending.length === 0) return { ...empty, pending: 0, stale: 0 };

  const offices = await officeUserIds(institutionId);
  if (offices.length === 0) return { ...empty, pending: pending.length, stale: stale.length };

  if (stale.length === 0) {
    // Nothing has aged. Still report the queue depth so the office can see the
    // sweep ran and what it found — an empty report is indistinguishable from a
    // sweep that crashed.
    return { ...empty, pending: pending.length, stale: 0 };
  }

  const oldest = stale[0];
  const res = await notifyMany({
    institutionId,
    recipientUserIds: offices,
    category: 'MENTORSHIP',
    title: `${stale.length} mentorship ${stale.length === 1 ? 'request has' : 'requests have'} been waiting over a day`,
    body:
      `${pending.length} pending in total. Oldest: ${oldest.field ?? 'unspecified field'}, ` +
      `raised ${Math.floor((now.getTime() - oldest.createdAt.getTime()) / HOUR_MS)}h ago. ` +
      'Open Mentorship → Requests to approve or decline.',
    dedupeKey: `mentorship-digest:${pending.length}:${oldest.id}`,
    respectMutes: false,
    data: { pending: pending.length, stale: stale.length, requestId: oldest.id },
    dryRun,
  });

  return {
    ...res,
    type: 'mentorship-digest',
    eventIds: [],
    dryRun,
    pending: pending.length,
    stale: stale.length,
  };
}

export async function runReminderSweep(
  viewer: Viewer,
  opts: { now?: Date; dryRun?: boolean } = {},
): Promise<SweepReport> {
  const now = opts.now ?? new Date();
  const dryRun = opts.dryRun ?? false;

  const [events, digest] = await Promise.all([
    sweepEventReminders(viewer.institutionId, now, dryRun),
    sweepMentorshipDigest(viewer.institutionId, now, dryRun),
  ]);

  const delivered = events.delivered + digest.delivered;
  const muted = events.muted + digest.muted;
  const duplicates = events.duplicates + digest.duplicates;

  // Rows the sweep declined to write: people who muted the category, plus keys it
  // had already used. Reported separately from `delivered` so the office can tell
  // "everyone had reminders muted" from "there was nothing to remind anybody about".
  const suppressed = muted + duplicates;

  return {
    ranAt: now.toISOString(),
    dryRun,
    eventReminders: events,
    mentorshipDigest: digest,
    totals: { delivered, muted, duplicates, suppressed },
  };
}
