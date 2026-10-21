/**
 * X-11 — Exam attendance: taking the roll.
 * Docs: 05-exam-cell.md §3.1
 *
 * THE ONE PLACE A ROLL IS READ
 * ----------------------------
 * `listAttendance` builds the roll and reads what has been marked against it. The dashboard reads
 * the SUMMARY, not the roll, because the dashboard wants counts and the roll wants names.
 *
 * THE ROLL IS A UNION, AND THE UNION IS THE POINT
 * ------------------------------------------------
 * The students on a paper's roll are the union of the students ENROLLED on its offering and the
 * students ISSUED a hall ticket for it, minus anybody whose enrolment is dropped. See
 * `attendance.rules.ts` for why both halves are needed — and note that the reminder sweep uses the
 * same union, so the roll and the reminder list cannot disagree about who is sitting a paper.
 *
 * MARKING IS IDEMPOTENT AND BULK
 * ------------------------------
 * An invigilator takes the roll on a phone, in a room, with a queue of students at the door. They
 * do not submit one request per student — they submit the roll. And they may submit it twice,
 * because somebody walks in late. So the write is a bulk upsert: marking the same student twice
 * UPDATES their row rather than creating a second one, and the second submission is the correction
 * of the first.
 *
 * A STUDENT WHO IS NOT ON THE ROLL IS REFUSED
 * --------------------------------------------
 * Marking somebody who is not on the roll is refused with a 422 naming them. It is not ignored,
 * because a roll that silently accepts a name from nowhere is a roll that can be padded — and the
 * absence count is the number a college is reported on.
 */
import { prisma } from '../../db/prisma.js';
import { notFound, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import {
  ROLL_ROW_STATE_META,
  assertAttendanceState,
  attendanceTone,
  type AttendanceState,
  type RollRowState,
} from './attendance.rules.js';

/** Anchor every read and write at the tenant. A rival's slot id is 404, not 403. */
const slotScope = (institutionId: string, slotId: string) => ({
  id: slotId,
  exam: { institutionId },
});

/**
 * The roll for one paper: who should be in the room, and what has been marked against them.
 *
 * Every student on the roll comes back with a `state` — PRESENT, ABSENT, or UNMARKED — so a caller
 * never has to infer "not marked" from a missing row. The distinction is the whole point of the
 * feature: "not marked" is the invigilator's paperwork, "absent" is a fact about a room.
 */
export async function listAttendance(institutionId: string, slotId: string) {
  const slot = await prisma.examSlot.findFirst({
    where: slotScope(institutionId, slotId),
    include: {
      exam: { select: { id: true, name: true, type: true, semester: true } },
      offering: { include: { course: { select: { id: true, name: true, code: true } } } },
      hallTickets: {
        select: { studentProfileId: true, seatNo: true, status: true },
      },
    },
  });
  if (!slot) throw notFound('Exam slot not found');

  // THE ENROLMENT HALF. The students who are MEANT to sit the paper.
  const enrolments = await prisma.enrollment.findMany({
    where: {
      offeringId: slot.offeringId,
      status: 'ACTIVE',
      offering: { course: { institutionId } },
    },
    select: {
      studentProfileId: true,
      studentProfile: {
        select: { id: true, rollNo: true, user: { select: { fullName: true } } },
      },
    },
  });

  // THE TICKET HALF. The students who were actually given a seat.
  const ticketHolders = await prisma.studentProfile.findMany({
    where: { id: { in: slot.hallTickets.map((t) => t.studentProfileId) } },
    select: { id: true, rollNo: true, user: { select: { fullName: true } } },
  });

  // THE UNION, keyed by student so a student in both halves appears ONCE.
  const byStudent = new Map<
    string,
    { id: string; rollNo: string; name: string; seatNo: string | null; hasTicket: boolean; enrolled: boolean }
  >();

  for (const e of enrolments) {
    byStudent.set(e.studentProfileId, {
      id: e.studentProfileId,
      rollNo: e.studentProfile.rollNo,
      name: e.studentProfile.user.fullName,
      seatNo: null,
      hasTicket: false,
      enrolled: true,
    });
  }

  for (const t of slot.hallTickets) {
    const profile = ticketHolders.find((p) => p.id === t.studentProfileId);
    if (!profile) continue;
    const existing = byStudent.get(t.studentProfileId);
    byStudent.set(t.studentProfileId, {
      id: t.studentProfileId,
      rollNo: profile.rollNo,
      name: profile.user.fullName,
      seatNo: t.seatNo,
      hasTicket: true,
      enrolled: existing?.enrolled ?? false,
    });
  }

  // WHAT HAS BEEN MARKED. One query for the whole roll, not one per student.
  const marked = await prisma.examAttendance.findMany({
    where: { examSlotId: slot.id, studentProfileId: { in: [...byStudent.keys()] } },
    select: { studentProfileId: true, state: true, markedAt: true, markedByUserId: true },
  });
  const markedBy = new Map(marked.map((m) => [m.studentProfileId, m]));

  const rows = [...byStudent.values()]
    .sort((a, b) => a.rollNo.localeCompare(b.rollNo))
    .map((student) => {
      const mark = markedBy.get(student.id);
      const state: RollRowState = (mark?.state as AttendanceState) ?? 'UNMARKED';
      return {
        studentProfileId: student.id,
        rollNo: student.rollNo,
        name: student.name,
        seatNo: student.seatNo,
        enrolled: student.enrolled,
        hasTicket: student.hasTicket,
        state,
        stateLabel: ROLL_ROW_STATE_META[state].label,
        markedAt: mark?.markedAt ?? null,
      };
    });

  const counts = {
    PRESENT: rows.filter((r) => r.state === 'PRESENT').length,
    ABSENT: rows.filter((r) => r.state === 'ABSENT').length,
    UNMARKED: rows.filter((r) => r.state === 'UNMARKED').length,
  };

  return {
    slot: {
      id: slot.id,
      examId: slot.exam.id,
      examName: slot.exam.name,
      examType: slot.exam.type,
      semester: slot.exam.semester,
      courseName: slot.offering.course.name,
      courseCode: slot.offering.course.code,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: slot.room,
    },
    rows,
    counts,
    total: rows.length,
    // Whether anybody has taken the roll at all. The dashboard shows "not marked yet" when this is
    // false, rather than "0 appeared" — which would be a different and false claim.
    marked: counts.PRESENT + counts.ABSENT > 0,
  };
}

/**
 * Mark the roll.
 *
 * A BULK write: `{ marks: [{ studentProfileId, state }] }`. Every student must be on the roll, and
 * every state must be one of the two. The write is an upsert, so marking twice corrects rather
 * than duplicates.
 */
export async function markAttendance(
  institutionId: string,
  actorUserId: string,
  slotId: string,
  body: { marks: { studentProfileId: string; state: string }[] },
) {
  const slot = await prisma.examSlot.findFirst({
    where: slotScope(institutionId, slotId),
    include: {
      exam: { select: { id: true, name: true } },
      offering: { include: { course: { select: { name: true } } } },
      hallTickets: { select: { studentProfileId: true } },
    },
  });
  if (!slot) throw notFound('Exam slot not found');

  if (!Array.isArray(body.marks) || body.marks.length === 0) {
    throw unprocessable('A mark-roll needs at least one entry', { marks: 0 });
  }

  // THE ROLL, so a name from nowhere is refused rather than accepted.
  const enrolments = await prisma.enrollment.findMany({
    where: {
      offeringId: slot.offeringId,
      status: 'ACTIVE',
      offering: { course: { institutionId } },
    },
    select: { studentProfileId: true },
  });
  const onRoll = new Set<string>([
    ...enrolments.map((e) => e.studentProfileId),
    ...slot.hallTickets.map((t) => t.studentProfileId),
  ]);

  const offRoll = body.marks
    .map((m) => m.studentProfileId)
    .filter((id) => !onRoll.has(id));
  if (offRoll.length > 0) {
    const profiles = await prisma.studentProfile.findMany({
      where: { id: { in: offRoll } },
      select: { id: true, rollNo: true },
    });
    const known = new Set(profiles.map((p) => p.id));
    throw unprocessable(
      'Some students are not on this paper\'s roll',
      {
        offRoll: offRoll.map((id) => ({
          studentProfileId: id,
          rollNo: known.has(id) ? (profiles.find((p) => p.id === id)?.rollNo ?? id) : 'unknown student',
        })),
        reason: 'A student is on the roll if they are enrolled on the offering or hold a hall ticket for it.',
      },
    );
  }

  // EVERY STATE IS VALIDATED BEFORE ANYTHING IS WRITTEN. A half-written roll is worse than a
  // rejected one: the invigilator would have to take it again.
  const states = body.marks.map((m) => assertAttendanceState(m.state));

  const now = new Date();
  let present = 0;
  let absent = 0;
  for (let i = 0; i < body.marks.length; i += 1) {
    const m = body.marks[i]!;
    const state = states[i]!;
    if (state === 'PRESENT') present += 1;
    else absent += 1;
    await prisma.examAttendance.upsert({
      where: { examSlotId_studentProfileId: { examSlotId: slot.id, studentProfileId: m.studentProfileId } },
      create: {
        examSlotId: slot.id,
        studentProfileId: m.studentProfileId,
        state,
        markedByUserId: actorUserId,
        markedAt: now,
      },
      update: { state, markedByUserId: actorUserId, markedAt: now },
    });
  }

  await writeAudit({
    institutionId,
    actorUserId,
    action: 'EXAM_ATTENDANCE_MARKED',
    entityType: 'ExamSlot',
    entityId: slot.id,
    after: { marked: body.marks.length, present, absent, exam: slot.exam.name },
  });

  const roll = await listAttendance(institutionId, slot.id);
  return {
    slotId: slot.id,
    marked: body.marks.length,
    present,
    absent,
    counts: roll.counts,
    total: roll.total,
  };
}

/**
 * The attendance summary — what the dashboard reads.
 *
 * PER SLOT, because an aggregate across a whole institution hides the fact that one paper was
 * taken and four were not. And it separates UNMARKED from ABSENT, because they are different
 * facts and a dashboard that reports "0 absent" for a paper nobody has marked is lying by
 * omission.
 */
export async function attendanceSummary(institutionId: string, examId?: string) {
  const slots = await prisma.examSlot.findMany({
    where: { exam: { institutionId, ...(examId ? { id: examId } : {}) } },
    select: {
      id: true,
      offeringId: true,
      date: true,
      status: true,
      exam: { select: { id: true, name: true } },
      offering: { select: { course: { select: { name: true, code: true } } } },
      hallTickets: { select: { studentProfileId: true } },
    },
    orderBy: { date: 'asc' },
  });

  if (slots.length === 0) {
    return {
      slots: [],
      totals: { PRESENT: 0, ABSENT: 0, UNMARKED: 0, slots: 0, markedSlots: 0 },
      marked: false,
    };
  }

  // THE ENROLMENT COUNTS, per slot, in ONE query for the whole set rather than one per slot. The
  // offering id is on the slot, so the mapping is by offering.
  const offeringIds = [...new Set(slots.map((s) => s.offeringId))];
  const enrolments = await prisma.enrollment.findMany({
    where: {
      offeringId: { in: offeringIds },
      status: 'ACTIVE',
      offering: { course: { institutionId } },
    },
    select: { offeringId: true, studentProfileId: true },
  });
  const enrolledByOffering = new Map<string, Set<string>>();
  for (const o of offeringIds) enrolledByOffering.set(o, new Set());
  for (const e of enrolments) {
    enrolledByOffering.get(e.offeringId)?.add(e.studentProfileId);
  }

  // WHAT HAS BEEN MARKED, for every slot at once.
  const marks = await prisma.examAttendance.findMany({
    where: { examSlotId: { in: slots.map((s) => s.id) } },
    select: { examSlotId: true, studentProfileId: true, state: true },
  });
  const marksBySlot = new Map<string, Map<string, string>>();
  for (const m of marks) {
    if (!marksBySlot.has(m.examSlotId)) marksBySlot.set(m.examSlotId, new Map());
    marksBySlot.get(m.examSlotId)!.set(m.studentProfileId, m.state);
  }

  const rows = slots.map((slot) => {
    // THE ROLL, the same union the mark-roll screen uses.
    const roll = new Set<string>([
      ...(enrolledByOffering.get(slot.offeringId) ?? []),
      ...slot.hallTickets.map((t) => t.studentProfileId),
    ]);
    const slotMarks = marksBySlot.get(slot.id) ?? new Map<string, string>();

    let present = 0;
    let absent = 0;
    let unmarked = 0;
    for (const studentId of roll) {
      const state = slotMarks.get(studentId);
      if (state === 'PRESENT') present += 1;
      else if (state === 'ABSENT') absent += 1;
      else unmarked += 1;
    }

    return {
      slotId: slot.id,
      examId: slot.exam.id,
      examName: slot.exam.name,
      courseName: slot.offering.course.name,
      courseCode: slot.offering.course.code,
      date: slot.date,
      status: slot.status,
      roll: roll.size,
      present,
      absent,
      unmarked,
      // A slot is MARKED when somebody took the roll — not when every student on it was marked.
      // "The invigilator has been through" and "everybody was accounted for" are different facts.
      marked: present + absent > 0,
      complete: roll.size > 0 && unmarked === 0,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      PRESENT: acc.PRESENT + r.present,
      ABSENT: acc.ABSENT + r.absent,
      UNMARKED: acc.UNMARKED + r.unmarked,
      slots: acc.slots + 1,
      markedSlots: acc.markedSlots + (r.marked ? 1 : 0),
    }),
    { PRESENT: 0, ABSENT: 0, UNMARKED: 0, slots: 0, markedSlots: 0 },
  );

  return {
    slots: rows,
    totals,
    // Whether ANY paper has been marked. The dashboard says "not marked yet" when this is false,
    // rather than "0 appeared" — which is a different and false claim.
    marked: totals.markedSlots > 0,
    tone: {
      absent: attendanceTone(totals.ABSENT),
      unmarked: attendanceTone(totals.UNMARKED),
    },
  };
}
