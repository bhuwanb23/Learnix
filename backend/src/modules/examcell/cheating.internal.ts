/**
 * X-08 — Cheating cases: the shared internals.
 * Docs: 05-exam-cell.md §3.6
 *
 * WHY THIS IS ITS OWN FILE
 * -----------------------
 * The loader and the shaper are used by every other cheating module — the catalogue, the reads, the
 * writes — and they are the two pieces that must agree with each other. If the shape lived in the
 * read module and the write module imported it, then a change to the shape would be a change to two
 * files, and the write module would have to know that the shape existed. Keeping them together means
 * the contract a client sees is written once.
 *
 * THE SHAPE IS THE CONTRACT
 * -------------------------
 * Everything a client can see about a case is decided here, and the DERIVED parts are derived here
 * too — the risk label, the overdue flag, the legal next moves. A derived field computed in two
 * places is two answers.
 */
import { prisma } from '../../db/prisma.js';
import {
  CASE_STATUS_META,
  CASE_TRANSITIONS,
  CLASSIFICATION_META,
  EVIDENCE_KIND_META,
  OVERDUE_HOURS,
  PENALTY_META,
  RISK_META,
  SOURCE_META,
  priorityScore,
  type CaseStatus,
} from './cheating.rules.js';

/** The relations a case needs to be shown: the student, the exam, the timeline and the evidence. */
export const CHEATING_CASE_INCLUDE = {
  studentProfile: {
    include: {
      user: { select: { id: true, fullName: true, email: true, avatarFileId: true } },
    },
  },
  examSlot: {
    include: {
      exam: { select: { id: true, name: true, type: true, semester: true, institutionId: true } },
      offering: { include: { course: { select: { id: true, name: true, code: true } } } },
    },
  },
  events: { orderBy: { createdAt: 'asc' } },
  evidence: {
    include: {
      file: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true, storageKey: true } },
    },
  },
} as const;

export type CheatingCaseRow = NonNullable<Awaited<ReturnType<typeof loadCheatingCase>>>;

/**
 * Load one case INSIDE an institution. `null` when it is not this institution's.
 *
 * The tenant check runs through `examSlot.exam.institutionId` — the case belongs to an exam, and an
 * exam belongs to an institution, so that chain is the authority. Reading a case by id alone would
 * let one college decide another's case.
 */
export async function loadCheatingCase(institutionId: string, id: string) {
  return prisma.cheatingCase.findFirst({
    where: { id, examSlot: { exam: { institutionId } } },
    include: CHEATING_CASE_INCLUDE,
  });
}

/** Parse a JSON column, falling back rather than throwing. */
export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch {
    // A malformed payload must not take the whole queue down. It is reported as absent rather than
    // crashing, because a row nobody can read is still a row somebody has to see.
    return fallback;
  }
}

/** One case as the client receives it. */
export function shapeCheatingCase(c: CheatingCaseRow, now = new Date()) {  const status = (CASE_STATUS_META as any)[c.status] ? (c.status as CaseStatus) : 'UNDER_REVIEW';
  const risk = (RISK_META as any)[c.riskLevel] ? c.riskLevel : 'LOW';
  const statusMeta = CASE_STATUS_META[status];
  const riskMeta = RISK_META[risk as keyof typeof RISK_META];

  const overdueHours = OVERDUE_HOURS[risk as keyof typeof OVERDUE_HOURS];
  const ageHours = (now.getTime() - new Date(c.createdAt).getTime()) / 3600000;

  // OVERDUE is derived, and it is derived against the RISK, because a high-risk case that sits
  // unreviewed for a fortnight is a failure of the desk and not of the student. A DECIDED case is
  // never overdue: there is nothing left to do about it.
  const overdue = !statusMeta.terminal && ageHours > overdueHours;

  return {
    id: c.id,
    status,
    statusLabel: statusMeta.label,
    statusColor: statusMeta.color,
    statusBlurb: statusMeta.blurb,
    isTerminal: statusMeta.terminal,
    riskLevel: risk,
    riskLabel: riskMeta.label,
    riskColor: riskMeta.color,
    riskBg: riskMeta.bg,
    classification: c.classification,
    classificationLabel: c.classification
      ? (CLASSIFICATION_META as any)[c.classification]?.label ?? c.classification
      : null,
    source: c.source,
    sourceLabel: (SOURCE_META as any)[c.source]?.label ?? c.source,
    issue: c.issue,
    description: c.description,
    evidence: parseJson(c.evidenceJson, null),

    // ── Student identification ──
    student: {
      id: c.studentProfileId,
      name: c.studentProfile.user.fullName,
      email: c.studentProfile.user.email,
      rollNo: c.studentProfile.rollNo,
      section: c.studentProfile.section,
      hasPhoto: Boolean(c.studentProfile.user.avatarFileId),
    },

    // ── Exam / room / invigilator ──
    exam: {
      id: c.examSlot.exam.id,
      name: c.examSlot.exam.name,
      type: c.examSlot.exam.type,
      semester: c.examSlot.exam.semester,
    },
    course: {
      id: c.examSlot.offering.course.id,
      name: c.examSlot.offering.course.name,
      code: c.examSlot.offering.course.code,
    },
    slot: {
      id: c.examSlot.id,
      date: c.examSlot.date,
      startTime: c.examSlot.startTime,
      endTime: c.examSlot.endTime,
      room: c.examSlot.room,
    },
    roomId: c.roomId,
    invigilatorUserId: c.invigilatorUserId,

    // ── The findings ──
    studentStatement: c.studentStatement,
    statementAt: c.statementAt,
    statementByUserId: c.statementByUserId,
    committeeUserIds: parseJson<string[]>(c.committeeUserIds, []),
    reviewNote: c.reviewNote,
    reviewedAt: c.reviewedAt,
    reviewedByUserId: c.reviewedByUserId,
    decisionNote: c.decisionNote,
    penalty: c.penalty,
    penaltyLabel: c.penalty ? (PENALTY_META as any)[c.penalty]?.label ?? c.penalty : null,
    penaltyDetail: c.penaltyDetail,
    decidedAt: c.decidedAt,
    decidedByUserId: c.decidedByUserId,
    notifiedStudentAt: c.notifiedStudentAt,
    reportedByUserId: c.reportedByUserId,

    // ── Status tracking ──
    //
    // The LEGAL MOVES, from the state machine. They are published so the screen can draw exactly
    // the buttons the server will accept — a screen that offers a move the server refuses is a
    // screen that lies, and a screen that hides one the server allows is a screen that cannot do
    // its job. A decided case offers exactly one thing: reopen it, with a reason.
    legalTransitions: CASE_TRANSITIONS[status] ?? [],
    // The queue's order. The SERVER computes it, so the badge on a row and the order of the list
    // cannot disagree — and a client that re-derived it would have to re-implement the thresholds.
    priority: priorityScore(new Date(c.createdAt), risk, status, now),
    ageHours: Math.round(ageHours),
    overdue,
    overdueByHours: overdue ? Math.round(ageHours - overdueHours) : 0,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,

    // ── History ──
    eventCount: c.events?.length ?? 0,
    evidenceCount: c.evidence?.length ?? 0,
    events: (c.events ?? []).map((e) => ({
      id: e.id,
      type: e.type,
      actorUserId: e.actorUserId,
      note: e.note,
      detail: parseJson(e.detailJson, null),
      createdAt: e.createdAt,
    })),
    evidenceFiles: (c.evidence ?? []).map((e) => ({
      id: e.id,
      kind: e.kind,
      kindLabel: (EVIDENCE_KIND_META as any)[e.kind]?.label ?? e.kind,
      note: e.note,
      uploadedByUserId: e.uploadedByUserId,
      createdAt: e.createdAt,
      file: e.file
        ? {
            id: e.file.id,
            originalName: e.file.originalName,
            mimeType: e.file.mimeType,
            sizeBytes: e.file.sizeBytes,
            // The `/uploads` static mount already serves these, so a file row is enough for a document
            // to be openable. No file-serving route is invented here.
            url: `/uploads/${e.file.storageKey}`,
          }
        : null,
    })),
  };
}

export type ShapedCheatingCase = ReturnType<typeof shapeCheatingCase>;

/**
 * Append a timeline event.
 *
 * ALWAYS called inside the same transaction as the change it records, so a case can never change
 * without a record of who changed it.
 */
export async function appendCheatingEvent(
  tx: any,
  caseId: string,
  type: string,
  actorUserId: string | null,
  note: string | null,
  detail?: unknown,
) {
  await tx.cheatingCaseEvent.create({
    data: {
      cheatingCaseId: caseId,
      type,
      actorUserId,
      note,
      detailJson: detail ? JSON.stringify(detail) : null,
    },
  });
}
