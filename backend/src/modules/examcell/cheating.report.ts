/**
 * X-08 — Cheating cases: reporting.
 * Docs: 05-exam-cell.md §3.6
 *
 * REPORTING A CASE, AND WHAT THE SCREEN NEEDS TO RAISE ONE
 * --------------------------------------------------------
 * A report is about a student IN a room, so the screen needs the roster of that room — not a free
 * text box in which to type a name that resolves to nothing. That is what `getReportContext`
 * provides: the slot, the room, the invigilator, and the students who actually sat it.
 *
 * WHY THE ROOM AND THE INVIGILATOR ARE SNAPSHOTTED
 * -------------------------------------------------
 * They come from `ExamRoomAllocation` — the one place they are recorded together — but they are
 * COPIED onto the case. A case is a historical document: the room roster for an exam in March is not
 * the roster today, and a case decided in June must still say which room it happened in and who was
 * on duty. Reading them live would rewrite the past every time a roster changed.
 */
import { prisma } from '../../db/prisma.js';
import { notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { assertCaseSource, assertClassification, assertRiskLevel } from './cheating.rules.js';
import { appendCheatingEvent, loadCheatingCase, shapeCheatingCase } from './cheating.internal.js';

/**
 * Report a case.
 *
 * The exam slot, the student, the room and the invigilator are all resolved HERE, and the room and
 * invigilator are SNAPSHOTTED onto the case.
 */
export async function reportCase(
  institutionId: string,
  actorUserId: string | null,
  body: {
    studentProfileId: string;
    examSlotId: string;
    issue: string;
    description?: string;
    riskLevel: string;
    classification?: string;
    source: string;
    evidenceJson?: string;
  },
) {
  const risk = assertRiskLevel(body.riskLevel);
  const source = assertCaseSource(body.source);
  const classification = body.classification ? assertClassification(body.classification) : null;

  // The slot must be THIS institution's, or a case could be raised against another college's exam.
  const slot = await prisma.examSlot.findFirst({
    where: { id: body.examSlotId, exam: { institutionId } },
    select: { id: true, exam: { select: { id: true, name: true } } },
  });
  if (!slot) throw notFound('Exam slot not found in this institution');

  // The student must be THIS institution's, for the same reason.
  const student = await prisma.studentProfile.findFirst({
    where: { id: body.studentProfileId, user: { institutionId } },
    select: { id: true, user: { select: { id: true, fullName: true } } },
  });
  if (!student) throw notFound('Student not found in this institution');

  // The room and the invigilator come from the ALLOCATION for this slot — the one place they are
  // recorded together. If the slot has no allocation there is no room to name, and the case says so
  // rather than inventing one.
  const allocation = await prisma.examRoomAllocation.findFirst({
    where: { examSlotId: slot.id },
    select: { roomId: true, invigilatorUserId: true },
  });

  const created = await prisma.$transaction(async (tx) => {
    const c = await tx.cheatingCase.create({
      data: {
        institutionId,
        examSlotId: slot.id,
        studentProfileId: student.id,
        issue: body.issue.trim(),
        description: body.description?.trim() || null,
        riskLevel: risk,
        classification,
        source,
        evidenceJson: body.evidenceJson ?? null,
        roomId: allocation?.roomId ?? null,
        invigilatorUserId: allocation?.invigilatorUserId ?? null,
        reportedByUserId: actorUserId,
        status: 'REPORTED',
      },
    });

    await appendCheatingEvent(tx, c.id, 'REPORTED', actorUserId, body.issue.trim(), {
      riskLevel: risk,
      source,
      roomId: allocation?.roomId ?? null,
      invigilatorUserId: allocation?.invigilatorUserId ?? null,
    });

    return c;
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'CHEATING_REPORTED',
    entityType: 'CheatingCase',
    entityId: created.id,
    after: { riskLevel: risk, source, classification },
  });

  const full = await loadCheatingCase(institutionId, created.id);
  return shapeCheatingCase(full!);
}

/**
 * The context a report is raised in: the slot, the room, the invigilator, and the students who sat
 * it.
 */
export async function getReportContext(institutionId: string, examSlotId: string) {
  const slot = await prisma.examSlot.findFirst({
    where: { id: examSlotId, exam: { institutionId } },
    include: {
      exam: { select: { id: true, name: true, type: true, semester: true } },
      offering: { include: { course: { select: { id: true, name: true, code: true } } } },
      roomAllocations: {
        select: {
          roomId: true,
          invigilatorUserId: true,
          invigilator: { select: { id: true, fullName: true } },
        },
      },
    },
  });
  if (!slot) throw notFound('Exam slot not found in this institution');

  // The students who sat this slot, from the hall tickets issued for it.
  const tickets = await prisma.hallTicket.findMany({
    where: { examSlotId: slot.id },
    select: {
      seatNo: true,
      studentProfile: { select: { id: true, rollNo: true, user: { select: { fullName: true, email: true } } } },
    },
    orderBy: { seatNo: 'asc' },
  });

  return {
    slot: {
      id: slot.id,
      examId: slot.exam.id,
      examName: slot.exam.name,
      examType: slot.exam.type,
      semester: slot.exam.semester,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: slot.room,
      course: slot.offering.course,
    },
    room: slot.roomAllocations[0]?.roomId ?? null,
    invigilator: slot.roomAllocations[0]?.invigilator
      ? { id: slot.roomAllocations[0]!.invigilator!.id, name: slot.roomAllocations[0]!.invigilator!.fullName }
      : null,
    students: tickets.map((t) => ({
      studentProfileId: t.studentProfile.id,
      rollNo: t.studentProfile.rollNo,
      name: t.studentProfile.user.fullName,
      email: t.studentProfile.user.email,
      seatNo: t.seatNo,
    })),
  };
}

/** The slots a report can be raised against. */
export async function listReportableSlots(institutionId: string) {
  const slots = await prisma.examSlot.findMany({
    where: { exam: { institutionId } },
    include: {
      exam: { select: { id: true, name: true, type: true } },
      offering: { include: { course: { select: { name: true, code: true } } } },
    },
    orderBy: { date: 'desc' },
    take: 50,
  });
  return slots.map((s) => ({
    id: s.id,
    examId: s.exam.id,
    examName: s.exam.name,
    examType: s.exam.type,
    course: s.offering.course,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    room: s.room,
  }));
}
