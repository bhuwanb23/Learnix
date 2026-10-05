// Mentorship sessions — scheduling and logging.
// Docs: 12-alumni-relations.md §3.5 · §4
//
// Before this, a session could only be created by the SEED. There was no route,
// no UI, and no way for a mentor to record that they had met — so "sessions" on
// screen was a number with nothing behind it.
//
// Two kinds, distinguished by `planned`:
//   planned = true   → booked, not yet held (cancellable, shown as "upcoming")
//   planned = false  → it happened; `outcome` is the point of the row

import { prisma } from '../../db/prisma.js';
import { forbidden, notFound, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import type { Viewer } from './directory.service.js';

const SESSION_MODES = ['IN_PERSON', 'VIDEO', 'PHONE'] as const;

/** Load a pair the viewer is allowed to act on. Institution-scoped either way. */
export async function pairForAction(viewer: Viewer, pairId: string) {
  const pair = await prisma.mentorshipPair.findFirst({
    where: {
      id: pairId,
      OR: [
        { menteeStudentProfile: { user: { institutionId: viewer.institutionId } } },
        { menteeAlumniProfile: { institutionId: viewer.institutionId } },
      ],
    },
    select: {
      id: true,
      field: true,
      status: true,
      mentorAlumniUserId: true,
      menteeAlumniProfile: { select: { userId: true } },
      menteeStudentProfile: { select: { user: { select: { id: true } } } },
    },
  });
  if (!pair) throw notFound('Mentorship pair not found');

  const isParticipant =
    viewer.userId === pair.mentorAlumniUserId ||
    viewer.userId === pair.menteeAlumniProfile?.userId ||
    viewer.userId === pair.menteeStudentProfile?.user.id;
  if (!(viewer.isOffice || isParticipant)) {
    throw forbidden('Only a participant or the Alumni Relations Office can change sessions');
  }
  if (pair.status !== 'ACTIVE') {
    throw unprocessable(`Sessions can only be changed on an active pair (this one is ${pair.status})`);
  }
  return pair;
}

/**
 * Log a session that happened, or book one that has not.
 *
 * Booking also stamps `nextSessionAt` on the pair, because that column is what the
 * pair card reads to say "next: Thursday". Keeping the two in step here is why the
 * card cannot show a next-session date that no session row backs up.
 */
export async function logSession(
  viewer: Viewer,
  pairId: string,
  body: {
    sessionDate: string;
    notes?: string;
    durationMinutes?: number;
    mode?: string;
    agenda?: string;
    outcome?: string;
    planned?: boolean;
  },
) {
  const pair = await pairForAction(viewer, pairId);
  const when = new Date(body.sessionDate);
  if (Number.isNaN(when.getTime())) throw unprocessable('Invalid session date');

  const planned = body.planned ?? false;
  if (body.mode && !SESSION_MODES.includes(body.mode as never)) {
    throw unprocessable(`mode must be one of ${SESSION_MODES.join(', ')}`);
  }

  // A session that has already happened cannot be "planned" — that would put an
  // event in the past on the upcoming list and make it permanently undismissable.
  if (planned && when.getTime() < Date.now()) {
    throw unprocessable('A planned session must be in the future — log it as held instead');
  }
  if (!planned && body.durationMinutes !== undefined && body.durationMinutes <= 0) {
    throw unprocessable('durationMinutes must be greater than zero');
  }

  const session = await prisma.mentorshipSession.create({
    data: {
      pairId: pair.id,
      sessionDate: when,
      notes: body.notes?.trim() || null,
      durationMinutes: body.durationMinutes ?? null,
      mode: body.mode ?? null,
      agenda: body.agenda?.trim() || null,
      outcome: body.outcome?.trim() || null,
      planned,
      loggedByUserId: viewer.userId,
    },
  });

  // Keep the pair's denormalised "next session" honest. A held session pushes the
  // pointer forward; a booking replaces whichever was next.
  await prisma.mentorshipPair.update({
    where: { id: pair.id },
    data: planned ? { nextSessionAt: when } : { nextSessionAt: null },
  });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: planned ? 'mentorship.session.schedule' : 'mentorship.session.log',
    entityType: 'MentorshipSession',
    entityId: session.id,
    after: { pairId: pair.id, planned, durationMinutes: session.durationMinutes },
  });

  return {
    id: session.id,
    pairId: pair.id,
    sessionDate: session.sessionDate,
    planned: session.planned,
    durationMinutes: session.durationMinutes,
    mode: session.mode,
    outcome: session.outcome,
  };
}

export async function updateSession(
  viewer: Viewer,
  sessionId: string,
  body: {
    sessionDate?: string;
    notes?: string;
    durationMinutes?: number;
    mode?: string;
    agenda?: string;
    outcome?: string;
  },
) {
  const existing = await prisma.mentorshipSession.findFirst({
    where: { id: sessionId, pair: { id: { not: '' } } },
    select: { id: true, pairId: true, planned: true, sessionDate: true, cancelledAt: true },
  });
  if (!existing) throw notFound('Session not found');
  if (existing.cancelledAt) throw unprocessable('That session was cancelled');

  await pairForAction(viewer, existing.pairId);

  const data: Record<string, unknown> = {};
  if (body.sessionDate) {
    const when = new Date(body.sessionDate);
    if (Number.isNaN(when.getTime())) throw unprocessable('Invalid session date');
    if (existing.planned && when.getTime() < Date.now()) {
      throw unprocessable('A planned session must stay in the future');
    }
    data.sessionDate = when;
  }
  if (body.notes !== undefined) data.notes = body.notes.trim() || null;
  if (body.outcome !== undefined) data.outcome = body.outcome.trim() || null;
  if (body.agenda !== undefined) data.agenda = body.agenda.trim() || null;
  if (body.durationMinutes !== undefined) data.durationMinutes = body.durationMinutes;
  if (body.mode !== undefined) {
    if (body.mode && !SESSION_MODES.includes(body.mode as never)) {
      throw unprocessable(`mode must be one of ${SESSION_MODES.join(', ')}`);
    }
    data.mode = body.mode || null;
  }
  if (Object.keys(data).length === 0) return { id: existing.id, unchanged: true };

  const updated = await prisma.mentorshipSession.update({ where: { id: existing.id }, data });

  // Rescheduling the pending session moves the pair pointer with it.
  if (existing.planned && data.sessionDate) {
    await prisma.mentorshipPair.update({ where: { id: existing.pairId }, data: { nextSessionAt: data.sessionDate } });
  }

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'mentorship.session.update',
    entityType: 'MentorshipSession',
    entityId: updated.id,
    before: { sessionDate: existing.sessionDate },
    after: data,
  });

  return {
    id: updated.id,
    pairId: updated.pairId,
    sessionDate: updated.sessionDate,
    notes: updated.notes,
    outcome: updated.outcome,
    durationMinutes: updated.durationMinutes,
    mode: updated.mode,
    planned: updated.planned,
  };
}

/**
 * Cancel a PLANNED session.
 *
 * Only a booking can be cancelled. Cancelling a session that already happened
 * would delete history; `undoAttendance`-style honesty applies here too — the row
 * is marked cancelled rather than removed, so the pair's log keeps the fact.
 */
export async function cancelSession(viewer: Viewer, sessionId: string, reason?: string) {
  const existing = await prisma.mentorshipSession.findFirst({
    where: { id: sessionId },
    select: { id: true, pairId: true, planned: true, cancelledAt: true, sessionDate: true, notes: true },
  });
  if (!existing) throw notFound('Session not found');
  if (existing.cancelledAt) throw unprocessable('That session is already cancelled');
  if (!existing.planned) {
    throw unprocessable('Only a booked session can be cancelled — a session that happened is part of the record');
  }
  await pairForAction(viewer, existing.pairId);

  const updated = await prisma.mentorshipSession.update({
    where: { id: existing.id },
    data: { cancelledAt: new Date(), notes: reason?.trim() || existing.notes },
  });

  // Clear the pointer if the cancelled session was the one it pointed at.
  await prisma.mentorshipPair.updateMany({
    where: { id: existing.pairId, nextSessionAt: existing.sessionDate },
    data: { nextSessionAt: null },
  });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'mentorship.session.cancel',
    entityType: 'MentorshipSession',
    entityId: updated.id,
    after: { reason: reason ?? null },
  });
  return { id: updated.id, cancelled: true };
}
