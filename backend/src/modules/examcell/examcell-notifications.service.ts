/**
 * X-09 — Exam cell notifications: the emitters.
 * Docs: 05-exam-cell.md §3.7
 *
 * ONE PLACE A NOTIFICATION IS WRITTEN FROM
 * -----------------------------------------
 * Every writer open-coded its own `prisma.notification.create`, and the result was that most of the
 * exam cell's messages did not exist: the evaluation deadline service stamped a deadline and sent
 * nothing, the hall-ticket desk published tickets in silence, and a result was published without
 * the student being told. None of that failed loudly — the message was simply never sent, which is
 * the failure nobody notices until a student says they were never told.
 *
 * So every notification in this module goes through `raise`, and the type is checked against the
 * registry on the way out. A type that is not registered is REFUSED, here, at the writer — because
 * an unregistered type is a row that will be labelled with a fallback and filed nowhere, and the
 * moment to catch that is when it is written.
 *
 * TWO AUDIENCES, TWO INBOXES
 * --------------------------
 * A message for a STUDENT goes to the student's own inbox, which is the one they already open. A
 * message for the EXAM OFFICER goes to the officer's. The exam cell's inbox is officer-only, so a
 * student's exam notice never appears in the desk's queue and the desk's deadline never appears in a
 * student's.
 *
 * MUTES ARE SUPPRESSION, AND "IMPORTANT" IS THE EXCEPTION
 * -------------------------------------------------------
 * A reader who muted a category gets NO ROW for it, rather than a row they cannot see — because the
 * unread badge counts rows the reader cannot see, and a badge that only goes up and never clears is
 * worse than no badge. The exception is a type that declares `bypassesMute`: an IMPORTANT notice, and
 * an emergency, reach the reader whatever they muted, because a mute is a preference about noise and
 * not about safety.
 */
import { prisma } from '../../db/prisma.js';
import { badRequest } from '../../lib/errors.js';
import {
  EXAM_CELL_TYPE_META,
  bypassesMute,
  examCellCategory,
} from './examcell-notifications.rules.js';

// ── The one writer ─────────────────────────────────────────────────────────

export interface RaiseOptions {
  institutionId: string;
  recipientUserIds: readonly string[];
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  /** Overrides the type's own category. Used for a message that is important whatever it is about. */
  important?: boolean;
  /**
   * A key identifying the LOGICAL event, so the same event raised twice writes one row.
   *
   * Not unique — the same logical event legitimately repeats across institutions and across cycles.
   * The uniqueness is per (recipient, key), which is what the readers rely on.
   */
  dedupeKey?: string;
  actorUserId?: string | null;
}

export interface RaiseResult {
  delivered: number;
  muted: number;
  duplicates: number;
}

/**
 * Write a notification to a set of recipients, honouring their mutes.
 *
 * The mute is applied by CATEGORY, because that is what a reader mutes — "stop telling me about
 * evaluation deadlines" — and not by type, because a reader has no idea which types exist.
 */
export async function raise(options: RaiseOptions): Promise<RaiseResult> {
  const meta = EXAM_CELL_TYPE_META[options.type];
  if (!meta) {
    // REFUSED, loudly. An unregistered type is a row that will be filed nowhere.
    throw badRequest(
      `Notification type "${options.type}" is not registered. Add it to examcell-notifications.rules.ts first.`,
    );
  }

  const category = examCellCategory(options.type);
  if (!category) throw badRequest(`Notification type "${options.type}" has no category.`);

  const targets = [...new Set(options.recipientUserIds.filter((id) => typeof id === 'string' && id.length > 0))];
  if (targets.length === 0) return { delivered: 0, muted: 0, duplicates: 0 };

  // THE DEDUPE. A recipient who already has a row with this key is not written another. The reminder
  // sweep asks "what is due?" and is asked more than once; without this, a student gets a reminder
  // every time somebody opens the screen.
  let candidates = targets;
  let duplicates = 0;
  if (options.dedupeKey) {
    const seen = await prisma.notification.findMany({
      where: { recipientUserId: { in: candidates }, dedupeKey: options.dedupeKey },
      select: { recipientUserId: true },
    });
    const already = new Set(seen.map((r) => r.recipientUserId));
    duplicates = candidates.filter((id) => already.has(id)).length;
    candidates = candidates.filter((id) => !already.has(id));
  }

  // THE MUTE, unless the type says it ignores it.
  const ignoresMute = options.important === true || bypassesMute(options.type);
  let survivors = candidates;
  let muted = 0;
  if (!ignoresMute) {
    const mutes = await prisma.notificationPreference.findMany({
      where: { institutionId: options.institutionId, userId: { in: candidates }, category, muted: true },
      select: { userId: true },
    });
    const mutedIds = new Set(mutes.map((m) => m.userId));
    survivors = candidates.filter((id) => !mutedIds.has(id));
    muted = candidates.length - survivors.length;
  }

  if (survivors.length > 0) {
    // Chunked: SQLite has a bound-variable ceiling, and "every student in the institution" is a
    // legitimate recipient set.
    const CHUNK = 400;
    for (let i = 0; i < survivors.length; i += CHUNK) {
      await prisma.notification.createMany({
        data: survivors.slice(i, i + CHUNK).map((recipientUserId) => ({
          institutionId: options.institutionId,
          recipientUserId,
          type: options.type,
          title: options.title,
          body: options.body,
          dataJson: options.data ? JSON.stringify(options.data) : null,
          sourceModule: 'examcell',
          dedupeKey: options.dedupeKey ?? null,
          isImportant: options.important === true || meta.bypassesMute === true,
        })),
      });
    }
  }

  return { delivered: survivors.length, muted, duplicates };
}

// ── Who to tell ────────────────────────────────────────────────────────────

/**
 * The students sitting a slot.
 *
 * THE UNION OF TWO ROSTERS, and both halves are needed:
 *
 *   · the ENROLMENTS on the slot's offering — the students who are meant to sit the paper. This is
 *     the half that matters BEFORE the hall tickets are printed, which is when a timetable change
 *     and a timetable publication happen. An announcement keyed only on tickets would reach
 *     nobody at exactly the moment the news is new.
 *   · the HALL TICKETS issued for the slot — the students who were actually given a seat. This is
 *     the half that matters AFTER, when somebody was added, dropped or issued a ticket by hand.
 *
 * A student in only one of the two is still sitting the paper, so they are still told.
 */
export async function studentsForSlot(institutionId: string, slotId: string): Promise<string[]> {
  const slot = await prisma.examSlot.findFirst({
    where: { id: slotId, exam: { institutionId } },
    select: {
      offeringId: true,
      hallTickets: { select: { studentProfile: { select: { userId: true } } } },
    },
  });
  if (!slot) return [];

  const enrollments = await prisma.enrollment.findMany({
    where: { offeringId: slot.offeringId, status: 'ACTIVE', offering: { course: { institutionId } } },
    select: { studentProfile: { select: { userId: true } } },
  });

  return [
    ...new Set([
      ...enrollments.map((e) => e.studentProfile.userId),
      ...slot.hallTickets.map((t) => t.studentProfile.userId),
    ]),
  ];
}

/**
 * The students enrolled on an offering — the roster for a message about the whole offering rather
 * than one slot, such as a revaluation request.
 */
export async function studentsForOffering(institutionId: string, offeringId: string): Promise<string[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { offeringId, status: 'ACTIVE', offering: { course: { institutionId } } },
    select: { studentProfile: { select: { userId: true } } },
  });
  return [...new Set(enrollments.map((e) => e.studentProfile.userId))];
}

/** The exam officers of an institution — the people a desk message goes to. */
export async function officersOf(institutionId: string): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { institutionId, deletedAt: null, roles: { some: { role: { in: ['EXAMCELL', 'ADMIN'] } } } },
    select: { id: true },
  });
  return users.map((u) => u.id);
}
