/**
 * X-09 — Exam cell notifications: the emitters.
 * Docs: 05-exam-cell.md §3.7
 *
 * WHAT AN EMITTER IS
 * ------------------
 * An emitter is the one function that answers "what happens when this thing happens?" for a
 * notification. It knows three things: WHO to tell, WHAT to say, and under WHICH type. Everything
 * else — the mute, the dedupe, the chunking — belongs to `raise` in
 * `examcell-notifications.service.ts`, so it is decided once rather than eleven times.
 *
 * THE AUDIENCE IS PART OF THE EMITTER
 * -----------------------------------
 * Some of these nine categories are for the EXAM OFFICER and some for STUDENTS, and the split is
 * the difference between a message that tells a desk something it must act on and a message that
 * tells a student something they must act on:
 *
 *   to the OFFICER — the work the desk is on: evaluation deadlines.
 *   to STUDENTS  — the work the student is on: the schedule, the ticket, the result, the revaluation.
 *
 * So the exam cell's own inbox is OFFICER-ONLY, and a student's exam notice lands in the student's
 * inbox — the one they already open every day — rather than in the officer's.
 *
 * AN EMITTER NEVER THROWS BECAUSE A RECIPIENT IS MISSING
 * ------------------------------------------------------
 * If nobody is in the audience, the emitter returns zero and writes nothing. It does NOT fall back
 * to "everybody" — the old broadcast composer did exactly that, so a notice meant for the final
 * year went to every student in the college when there happened to be no final-year student that
 * term. A notice that reaches the wrong people is worse than a notice that reaches nobody.
 */
import { writeAudit } from '../../lib/audit.js';
import { prisma } from '../../db/prisma.js';
import {
  officersOf,
  raise,
  studentsForSlot,
  type RaiseResult,
} from './examcell-notifications.service.js';
import { REMINDER_LEAD_HOURS } from './examcell-notifications.rules.js';

const EMPTY: RaiseResult = { delivered: 0, muted: 0, duplicates: 0 };

/**
 * An exam has been scheduled. The students who sit it are told what it is and when.
 */
export async function announceExamScheduled(
  institutionId: string,
  actorUserId: string | null,
  exam: { id: string; name: string; type: string; semester: number },
  slotIds: string[],
) {
  const recipients = new Set<string>();
  for (const slotId of slotIds) {
    for (const userId of await studentsForSlot(institutionId, slotId)) recipients.add(userId);
  }
  if (recipients.size === 0) return EMPTY;

  const res = await raise({
    institutionId,
    recipientUserIds: [...recipients],
    type: 'EXAM_SCHEDULED',
    title: `Exam scheduled — ${exam.name}`,
    body: `${exam.name} (Semester ${exam.semester}) has been scheduled. Check your timetable for the date, time and venue, and collect your hall ticket once it is released.`,
    data: { module: 'examcell', screen: 'Timetable', examId: exam.id },
    actorUserId,
  });

  await writeAudit({
    institutionId,
    actorUserId,
    action: 'EXAM_ANNOUNCED',
    entityType: 'Exam',
    entityId: exam.id,
    after: { recipients: res.delivered },
  });
  return res;
}

/**
 * The timetable has gone out. The students who sit it are told, this time that it is OFFICIAL.
 *
 * Distinct from `announceExamScheduled` because they are two different facts: an exam being
 * drafted on the controller's desk is not news, and an exam being published is. Sending the
 * scheduled notice at publish time instead would tell students about a schedule that might still
 * move — and then tell them again when it moved.
 */
export async function announceExamPublished(
  institutionId: string,
  actorUserId: string | null,
  exam: { id: string; name: string; semester: number },
  slotIds: string[],
) {
  const recipients = new Set<string>();
  for (const slotId of slotIds) {
    for (const userId of await studentsForSlot(institutionId, slotId)) recipients.add(userId);
  }
  if (recipients.size === 0) return EMPTY;

  const res = await raise({
    institutionId,
    recipientUserIds: [...recipients],
    type: 'EXAM_PUBLISHED',
    title: `Exam timetable published — ${exam.name}`,
    body: `The timetable for ${exam.name} (Semester ${exam.semester}) has been published. Your date, time and venue are now final. Check your timetable and collect your hall ticket once it is released.`,
    data: { module: 'examcell', screen: 'Timetable', examId: exam.id },
    actorUserId,
  });

  await writeAudit({
    institutionId,
    actorUserId,
    action: 'EXAM_PUBLISHED_ANNOUNCED',
    entityType: 'Exam',
    entityId: exam.id,
    after: { recipients: res.delivered },
  });
  return res;
}

/**
 * A slot has moved, or a room has changed.
 *
 * The same students as before — a moved slot is the same people sitting a different exam at a
 * different time, and the ones who were NOT there are not told.
 */
export async function announceTimetableChange(
  institutionId: string,
  actorUserId: string | null,
  slot: {
    id: string;
    date: Date;
    startTime: string;
    endTime: string;
    room: string | null;
    examName: string;
    courseName: string;
  },
) {
  const recipients = await studentsForSlot(institutionId, slot.id);
  if (recipients.length === 0) return EMPTY;

  const res = await raise({
    institutionId,
    recipientUserIds: recipients,
    type: 'TIMETABLE_CHANGED',
    title: `Timetable changed — ${slot.examName}`,
    body: `${slot.courseName} (${slot.examName}) has moved to ${slot.date.toLocaleDateString()}, ${slot.startTime}–${slot.endTime}${slot.room ? `, room ${slot.room}` : ''}.`,
    data: { module: 'examcell', screen: 'Timetable', slotId: slot.id },
    actorUserId,
  });

  await writeAudit({
    institutionId,
    actorUserId,
    action: 'TIMETABLE_CHANGE_ANNOUNCED',
    entityType: 'ExamSlot',
    entityId: slot.id,
    after: { recipients: res.delivered },
  });
  return res;
}

/**
 * A hall ticket is available.
 *
 * The students are the ones who were ISSUED a ticket, which is the same set as the ones who sat
 * the slot — so a ticket that cannot be collected is never announced to somebody who cannot collect
 * it.
 */
export async function announceHallTickets(
  institutionId: string,
  actorUserId: string | null,
  exam: { id: string; name: string },
  slotIds: string[],
) {
  const recipients = new Set<string>();
  for (const slotId of slotIds) {
    for (const userId of await studentsForSlot(institutionId, slotId)) recipients.add(userId);
  }
  if (recipients.size === 0) return EMPTY;

  const res = await raise({
    institutionId,
    recipientUserIds: [...recipients],
    type: 'HALL_TICKET_READY',
    title: `Hall ticket available — ${exam.name}`,
    body: `Your hall ticket for ${exam.name} has been released. Collect it from the examination office, or download it from the app.`,
    data: { module: 'examcell', screen: 'HallTickets', examId: exam.id },
    actorUserId,
  });

  await writeAudit({
    institutionId,
    actorUserId,
    action: 'HALL_TICKET_ANNOUNCED',
    entityType: 'Exam',
    entityId: exam.id,
    after: { recipients: res.delivered },
  });
  return res;
}

/**
 * A result has been published.
 *
 * The students are the ones with a RESULT for the slot — not the ones who sat it. Somebody who sat
 * the exam and was not entered is not going to be told their result.
 */
export async function announceResultPublished(
  institutionId: string,
  actorUserId: string | null,
  slot: { id: string; examName: string; courseName: string },
  studentUserIds: readonly string[],
) {
  if (studentUserIds.length === 0) return EMPTY;

  const res = await raise({
    institutionId,
    recipientUserIds: studentUserIds,
    type: 'RESULT_PUBLISHED',
    title: `Result published — ${slot.courseName}`,
    body: `Your result for ${slot.courseName} (${slot.examName}) has been published. You can see the marks, the grade and your SGPA in the app.`,
    data: { module: 'examcell', screen: 'Results', slotId: slot.id },
    actorUserId,
  });

  await writeAudit({
    institutionId,
    actorUserId,
    action: 'RESULT_PUBLICATION_ANNOUNCED',
    entityType: 'ExamSlot',
    entityId: slot.id,
    after: { recipients: res.delivered },
  });
  return res;
}

/**
 * A revaluation request has been decided.
 *
 * The student who asked is told — not the whole offering. A revaluation is one student's business,
 * and telling the cohort would publish somebody's grade dispute to the people sitting next to them.
 */
export async function announceRevaluationDecided(
  institutionId: string,
  actorUserId: string | null,
  request: { id: string; courseName: string; examName: string; decision: string; newMarks: number | null },
  studentUserId: string,
) {
  const res = await raise({
    institutionId,
    recipientUserIds: [studentUserId],
    type: 'REVALUATION_DECIDED',
    title: `Revaluation decided — ${request.courseName}`,
    body:
      request.decision === 'COMPLETED'
        ? `Your revaluation for ${request.courseName} (${request.examName}) was accepted. The revised mark is ${request.newMarks ?? '—'}.`
        : `Your revaluation for ${request.courseName} (${request.examName}) was not accepted. The original mark stands.`,
    data: { module: 'examcell', screen: 'Results', requestId: request.id },
    actorUserId,
  });

  await writeAudit({
    institutionId,
    actorUserId,
    action: 'REVALUATION_DECIDED_ANNOUNCED',
    entityType: 'ReEvaluationRequest',
    entityId: request.id,
    after: { recipients: res.delivered, decision: request.decision },
  });
  return res;
}

/**
 * An evaluation deadline is close, and the papers are waiting to be marked.
 *
 * This is the message the `remindDeadline` service was NEVER sending. It stamped the deadline and
 * wrote an audit entry, and its own comment said the notification was somebody else's job. This is
 * that job.
 */
export async function announceEvaluationDeadline(
  institutionId: string,
  actorUserId: string | null,
  exam: { id: string; name: string; courseName: string },
  dueAt: Date,
  papersPending: number,
) {
  const recipients = await officersOf(institutionId);
  if (recipients.length === 0) return EMPTY;

  const res = await raise({
    institutionId,
    recipientUserIds: recipients,
    type: 'EVALUATION_DEADLINE',
    title: `Evaluation deadline — ${exam.courseName}`,
    body: `${papersPending} paper${papersPending === 1 ? '' : 's'} for ${exam.courseName} (${exam.name}) are still waiting to be marked. The deadline is ${dueAt.toLocaleString()}.`,
    data: { module: 'examcell', screen: 'Evaluations', examId: exam.id },
    actorUserId,
  });

  await writeAudit({
    institutionId,
    actorUserId,
    action: 'EVALUATION_DEADLINE_ANNOUNCED',
    entityType: 'Exam',
    entityId: exam.id,
    after: { recipients: res.delivered, dueAt: dueAt.toISOString() },
  });
  return res;
}

/**
 * An important notice, to students or to the office.
 *
 * It BYPASSES the mutes, because the exam office marked it important and a reader must not be able
 * to silence it. That is the same reasoning as an emergency notice in the hostel.
 */
export async function announceImportant(
  institutionId: string,
  actorUserId: string | null,
  audience: 'STUDENTS' | 'OFFICERS' | 'BOTH',
  title: string,
  body: string,
  dedupeKey?: string,
) {
  const recipients = new Set<string>();
  if (audience === 'STUDENTS' || audience === 'BOTH') {
    const students = await prisma.studentProfile.findMany({
      where: { user: { institutionId, deletedAt: null } },
      select: { userId: true },
    });
    for (const s of students) recipients.add(s.userId);
  }
  if (audience === 'OFFICERS' || audience === 'BOTH') {
    for (const id of await officersOf(institutionId)) recipients.add(id);
  }
  if (recipients.size === 0) return EMPTY;

  const res = await raise({
    institutionId,
    recipientUserIds: [...recipients],
    type: 'EXAM_IMPORTANT',
    title,
    body,
    data: { module: 'examcell', screen: 'Notifications' },
    important: true,
    dedupeKey,
    actorUserId,
  });

  await writeAudit({
    institutionId,
    actorUserId,
    action: 'EXAM_IMPORTANT_ANNOUNCED',
    entityType: 'Notification',
    entityId: null,
    after: { recipients: res.delivered, audience },
  });
  return res;
}

/**
 * A cheating case concerning a student has moved.
 *
 * The student is told when the case is DECIDED, because a case that was decided and never
 * communicated is a case the student cannot appeal. This emitter is the "it has moved" half — the
 * report, the classification, the escalation — so a student is not left wondering whether the
 * complaint they were named in is still open.
 */
export async function announceCheatingCaseUpdate(
  institutionId: string,
  actorUserId: string | null,
  studentUserId: string,
  caseId: string,
  headline: string,
  body: string,
) {
  const res = await raise({
    institutionId,
    recipientUserIds: [studentUserId],
    type: 'EXAM_CHEATING',
    title: headline,
    body,
    data: { module: 'examcell', screen: 'CheatingCases', id: caseId },
    actorUserId,
  });
  return res;
}

// ── The reminder sweep ──────────────────────────────────────────────────────

/**
 * Remind the students whose exam starts soon.
 *
 * ON DEMAND, like every other sweep in this platform — the alumni reminder sweep and the hostel
 * late-return sweep are both asked for rather than scheduled, because a scheduler is a thing that
 * fails silently and a sweep is a thing somebody can run twice and watch.
 *
 * IDEMPOTENT. The alert is keyed on the exam and the day, so asking twice does not leave a student
 * with two reminders. That is the whole reason the `dedupeKey` column exists.
 */
export async function sweepExamReminders(
  institutionId: string,
  actorUserId: string | null,
  now: Date = new Date(),
) {
  const until = new Date(now.getTime() + REMINDER_LEAD_HOURS * 3600000);
  const from = new Date(now.getTime() - 12 * 3600000);

  // The exams starting inside the window. A slot that ALREADY STARTED is not reminded about — the
  // exam is under way, and a reminder then is noise.
  const slots = await prisma.examSlot.findMany({
    where: {
      exam: { institutionId },
      date: { gte: from, lte: until },
      status: 'SCHEDULED',
    },
    include: {
      exam: { select: { id: true, name: true, type: true } },
      offering: { include: { course: { select: { name: true, code: true } } } },
    },
    orderBy: { date: 'asc' },
  });

  let raised = 0;
  let exams = 0;
  for (const slot of slots) {
    const recipients = await studentsForSlot(institutionId, slot.id);
    if (recipients.length === 0) continue;

    // The key is the exam and the DAY, so a reminder for Monday's exam is one row per student, and
    // the sweep on Monday morning finds it already there.
    const day = slot.date.toISOString().slice(0, 10);
    const res = await raise({
      institutionId,
      recipientUserIds: recipients,
      type: 'EXAM_REMINDER',
      title: `Exam reminder — ${slot.offering.course.code}`,
      body: `${slot.offering.course.name} (${slot.exam.name}) is on ${slot.date.toLocaleDateString()}, ${slot.startTime}–${slot.endTime}${slot.room ? `, room ${slot.room}` : ''}. Bring your hall ticket and your ID.`,
      data: { module: 'examcell', screen: 'Timetable', slotId: slot.id, examId: slot.exam.id },
      dedupeKey: `exam.reminder:${slot.exam.id}:${day}`,
      actorUserId,
    });
    if (res.delivered > 0) {
      raised += res.delivered;
      exams += 1;
    }
  }

  await writeAudit({
    institutionId,
    actorUserId,
    action: 'EXAM_REMINDERS_SWEEPED',
    entityType: 'ExamSlot',
    entityId: null,
    after: { slots: slots.length, exams, raised },
  });

  return { slots: slots.length, exams, raised };
}
