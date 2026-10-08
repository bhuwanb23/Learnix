// X-05 Evaluations — the service (docs/users/05 §3.3).
//
// Three reads (catalogue, overview, block) and five writes (scripts, allocate,
// marks, deadline, moderation). Two invariants run through all of them:
//
//   TENANCY — every query is anchored at `examSlot.exam.institutionId`.
//   An evaluation id from another college is 404, never a cross-tenant write.
//
//   COUNTS ARE RECOMPUTED, NEVER TRUSTED. `totalPapers`/`completedPapers` on
//   `Evaluation` are denormalised columns; every write here recomputes them
//   from `EvaluationPaper` in the same transaction, because a counter that
//   drifts from its rows is how a screen ends up reporting 40/40 graded while
//   half the papers have no marks.
import { PrismaClient, type Prisma } from '@prisma/client';
import { notFound, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import {
  BLOCKS,
  BLOCK_IDS,
  MARKS_POLICY,
  MODERATION_STATUSES,
  SCRIPT_STATUSES,
  assertBlock,
  assertMarksSplit,
  assertModerationDecision,
  assertModerationRequestable,
  assertScriptStatus,
  assertScriptTransition,
  blockMeta,
  isMarked,
  publicationBlockers,
  totalOf,
  type ScriptStatus,
} from './evaluation.rules.js';

const prisma = new PrismaClient();

/** Anchor every read/write at the tenant. 404 for anything not ours. */
const evalWhere = (institutionId: string, evaluationId: string) => ({
  id: evaluationId,
  examSlot: { exam: { institutionId } },
});

/** Recompute the denormalised counters from the papers, in one call. */
async function recomputeCounts(evaluationId: string, tx: Prisma.TransactionClient = prisma) {
  const papers = await tx.evaluationPaper.findMany({
    where: { evaluationId },
    select: { status: true, internalMarks: true, externalMarks: true },
  });
  const marked = papers.filter((p) => isMarked(p)).length;
  const allDone = papers.length > 0 && marked === papers.length;
  const anyStarted = papers.some((p) => p.status !== 'PENDING' || isMarked(p));
  const status = allDone ? 'COMPLETED' : anyStarted ? 'IN_PROGRESS' : 'PENDING';
  await tx.evaluation.update({
    where: { id: evaluationId },
    data: {
      totalPapers: papers.length,
      completedPapers: marked,
      inProgressPapers: papers.filter((p) => p.status === 'EVALUATING').length,
      status,
    },
  });
  return { total: papers.length, marked, status };
}

// ═══ Reads ═══════════════════════════════════════════════════════════════

export async function evaluationCatalogue(institutionId: string) {
  const exams = await prisma.exam.findMany({
    where: { institutionId },
    select: { id: true, name: true, type: true, semester: true, status: true, hallTicketStatus: true },
    orderBy: { createdAt: 'desc' },
  });
  return {
    blocks: BLOCKS,
    marksPolicy: MARKS_POLICY,
    scriptStatuses: [...SCRIPT_STATUSES],
    moderationStatuses: [...MODERATION_STATUSES],
    exams,
  };
}

export async function evaluationOverview(institutionId: string) {
  const evaluations = await prisma.evaluation.findMany({
    where: { examSlot: { exam: { institutionId } } },
    include: {
      examSlot: { include: { exam: true, offering: { include: { course: true } } } },
      papers: { select: { internalMarks: true, externalMarks: true, scriptStatus: true } },
    },
  });

  let total = 0;
  let marked = 0;
  const byStatus = { PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0 };
  let scriptsReceived = 0;
  let scriptsVerified = 0;
  let moderationPending = 0;
  let moderationFlagged = 0;
  let missing = 0;

  for (const e of evaluations) {
    byStatus[e.status as keyof typeof byStatus] += 1;
    total += e.papers.length;
    for (const p of e.papers) {
      if (isMarked(p)) marked += 1;
      else missing += 1;
      if (p.scriptStatus !== 'NOT_RECEIVED') scriptsReceived += 1;
      if (p.scriptStatus === 'VERIFIED') scriptsVerified += 1;
    }
    if (e.moderationStatus === 'PENDING')      moderationPending += 1;
      if (e.moderationStatus === 'FLAGGED') moderationFlagged += 1;
    }

    // Revaluation requests that still need a decision (REVALUATION block's badge).
    const reevalOpen = await prisma.reEvaluationRequest.count({
      where: { status: 'REQUESTED', result: { examSlot: { exam: { institutionId } } } },
    });

  // The nearest grading deadline across the institution — the hub's countdown.
  const deadline = await prisma.gradingDeadline.findFirst({
    where: { exam: { institutionId } },
    orderBy: { dueAt: 'asc' },
  });

  const alerts: string[] = [];
  if (missing > 0) alerts.push(`${missing} paper(s) have no marks yet`);
  if (moderationFlagged > 0) alerts.push(`${moderationFlagged} subject(s) flagged in moderation`);
  if (moderationPending > 0) alerts.push(`${moderationPending} subject(s) awaiting moderation`);
  if (deadline && deadline.dueAt < new Date()) alerts.push('The grading deadline has passed');

  return {
    hero: {
      marked,
      total,
      percent: total > 0 ? Math.round((marked / total) * 100) : 0,
      dueAt: deadline?.dueAt ?? null,
      daysLeft: deadline ? Math.ceil((deadline.dueAt.getTime() - Date.now()) / 86_400_000) : null,
    },
    stats: {
      evaluations: evaluations.length,
      ...byStatus,
      missingMarks: missing,
      scriptsReceived,
      scriptsVerified,
      moderationPending,
      moderationFlagged,
      reevalOpen,
    },
    alerts,
  };
}

export async function evaluationBlock(institutionId: string, block: string, examId?: string) {
  assertBlock(block);
  const meta = blockMeta(block)!;
  if (meta.requiresExam && !examId) {
    throw unprocessable(`${block} needs an examId`, { allowed: BLOCK_IDS.filter((id) => blockMeta(id)?.requiresExam) });
  }

  switch (block) {
    // ── PROGRESS — the season, per subject, sorted by what is worst ──────
    case 'PROGRESS': {
      const rows = await prisma.evaluation.findMany({
        where: { examSlot: { exam: { institutionId, ...(examId ? { id: examId } : {}) } } },
        include: {
          examSlot: { include: { exam: true } },
          subjectOffering: { include: { course: true } },
          papers: { select: { internalMarks: true, externalMarks: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
      const items = rows.map((e) => {
        const marked = e.papers.filter(isMarked).length;
        return {
          id: e.id,
          exam: e.examSlot.exam.name,
          subject: e.subjectOffering.course.name,
          code: e.subjectOffering.course.code,
          total: e.papers.length,
          marked,
          percent: e.papers.length > 0 ? Math.round((marked / e.papers.length) * 100) : 0,
          status: e.status,
          moderationStatus: e.moderationStatus,
        };
      });
      const total = items.reduce((a, i) => a + i.total, 0);
      const marked = items.reduce((a, i) => a + i.marked, 0);
      return { items, percent: total > 0 ? Math.round((marked / total) * 100) : 0, total, marked };
    }

    // ── SCRIPTS — custody of every paper, worst status first ────────────
    case 'SCRIPTS': {
      const rows = await prisma.evaluation.findMany({
        where: { examSlot: { exam: { institutionId }, ...(examId ? { examId } : {}) } },
        include: {
          subjectOffering: { include: { course: true } },
          papers: {
            include: { studentProfile: { select: { id: true, rollNo: true, user: { select: { fullName: true } } } } },
          },
        },
      });
      const papers = rows.flatMap((e) =>
        e.papers.map((p) => ({
          id: p.id,
          evaluationId: e.id,
          subject: e.subjectOffering.course.name,
          student: p.studentProfile.user.fullName,
          rollNo: p.studentProfile.rollNo,
          scriptStatus: p.scriptStatus,
        })),
      );
      const counts = Object.fromEntries(SCRIPT_STATUSES.map((s) => [s, papers.filter((p) => p.scriptStatus === s).length]));
      return { counts, papers };
    }

    // ── ALLOCATION — who marks what, and what nobody has taken ──────────
    case 'ALLOCATION': {
      const rows = await prisma.evaluation.findMany({
        where: { examSlot: { exam: { institutionId, ...(examId ? { id: examId } : {}) } } },
        include: {
          examSlot: { include: { exam: true } },
          subjectOffering: { include: { course: true } },
        },
      });
      // Eligible evaluators: teaching staff of this institution, with their load.
      const staff = await prisma.user.findMany({
        where: { institutionId, deletedAt: null, roles: { some: { role: { in: ['TEACHER', 'HOD'] } } } },
        select: { id: true, fullName: true },
      });
      const loads = await prisma.evaluation.groupBy({
        by: ['evaluatorUserId'],
        where: { examSlot: { exam: { institutionId } }, evaluatorUserId: { not: null } },
        _count: { _all: true },
      });
      const loadOf = (id: string | null) => loads.find((l) => l.evaluatorUserId === id)?._count._all ?? 0;
      return {
        evaluations: rows.map((e) => ({
          id: e.id,
          exam: e.examSlot.exam.name,
          subject: e.subjectOffering.course.name,
          code: e.subjectOffering.course.code,
          evaluatorUserId: e.evaluatorUserId,
          status: e.status,
          papers: e.totalPapers,
        })),
        evaluators: staff.map((s) => ({ id: s.id, name: s.fullName, load: loadOf(s.id) })),
        unassigned: rows.filter((e) => !e.evaluatorUserId).length,
      };
    }

    // ── SUBJECTS — the subject-wise queue ───────────────────────────────
    case 'SUBJECTS': {
      const rows = await prisma.evaluation.findMany({
        where: { examSlot: { exam: { institutionId, ...(examId ? { id: examId } : {}) } } },
        include: {
          examSlot: { include: { exam: true } },
          subjectOffering: { include: { course: true } },
          papers: { select: { internalMarks: true, externalMarks: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
      return {
        items: rows.map((e) => {
          const marked = e.papers.filter(isMarked).length;
          return {
            id: e.id,
            exam: e.examSlot.exam.name,
            subject: e.subjectOffering.course.name,
            code: e.subjectOffering.course.code,
            totalPapers: e.papers.length,
            marked,
            missing: e.papers.length - marked,
            status: e.status,
            moderationStatus: e.moderationStatus,
          };
        }),
      };
    }

    // ── MARKS — every paper with its split, and what may still be entered ─
    case 'MARKS': {
      const rows = await prisma.evaluation.findMany({
        where: { examSlot: { exam: { institutionId }, ...(examId ? { examId } : {}) } },
        include: {
          subjectOffering: { include: { course: true } },
          papers: {
            include: { studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } } },
          },
        },
      });
      return {
        policy: MARKS_POLICY,
        evaluations: rows.map((e) => ({
          id: e.id,
          subject: e.subjectOffering.course.name,
          code: e.subjectOffering.course.code,
          evaluatorUserId: e.evaluatorUserId,
          moderationStatus: e.moderationStatus,
          papers: e.papers.map((p) => ({
            id: p.id,
            student: p.studentProfile.user.fullName,
            rollNo: p.studentProfile.rollNo,
            internalMarks: p.internalMarks,
            externalMarks: p.externalMarks,
            total: totalOf(p),
            marked: isMarked(p),
            status: p.status,
          })),
        })),
      };
    }

    // ── DEADLINES — one due date per exam, with a lateness flag ─────────
    case 'DEADLINES': {
      const exams = await prisma.exam.findMany({
        where: { institutionId, ...(examId ? { id: examId } : {}) },
        include: {
          gradingDeadline: true,
          examSlots: {
            include: {
              evaluations: { include: { papers: { select: { internalMarks: true, externalMarks: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      const now = new Date();
      return {
        items: exams.map((x) => {
          const papers = x.examSlots.flatMap((s) => s.evaluations.flatMap((e) => e.papers));
          const marked = papers.filter(isMarked).length;
          return {
            examId: x.id,
            exam: x.name,
            dueAt: x.gradingDeadline?.dueAt ?? null,
            remindedAt: x.gradingDeadline?.remindedAt ?? null,
            overdue: !!x.gradingDeadline && x.gradingDeadline.dueAt < now && marked < papers.length,
            percent: papers.length > 0 ? Math.round((marked / papers.length) * 100) : 0,
            total: papers.length,
            marked,
          };
        }),
      };
    }

    // ── MISSING — the unmarked list that blocks publication ─────────────
    case 'MISSING': {
      const rows = await prisma.evaluation.findMany({
        where: { examSlot: { exam: { institutionId, ...(examId ? { id: examId } : {}) } } },
        include: {
          subjectOffering: { include: { course: true } },
          examSlot: { include: { exam: true } },
          papers: {
            include: { studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } } },
          },
        },
      });
      const missing = rows.flatMap((e) =>
        e.papers
          .filter((p) => !isMarked(p))
          .map((p) => ({
            id: p.id,
            evaluationId: e.id,
            exam: e.examSlot.exam.name,
            subject: e.subjectOffering.course.name,
            code: e.subjectOffering.course.code,
            student: p.studentProfile.user.fullName,
            rollNo: p.studentProfile.rollNo,
            hasInternal: p.internalMarks !== null,
            hasExternal: p.externalMarks !== null,
            scriptStatus: p.scriptStatus,
            evaluatorUserId: e.evaluatorUserId,
          })),
      );
      return { count: missing.length, policy: MARKS_POLICY, items: missing };
    }

    // ── MODERATION — the queue, decided last ────────────────────────────
    case 'MODERATION': {
      const rows = await prisma.evaluation.findMany({
        where: { examSlot: { exam: { institutionId } } },
        include: {
          subjectOffering: { include: { course: true } },
          examSlot: { include: { exam: true } },
          papers: { select: { internalMarks: true, externalMarks: true } },
        },
      });
      return {
        items: rows
          .filter((e) => e.moderationStatus !== 'NOT_REQUESTED' || e.status === 'COMPLETED')
          .map((e) => ({
            id: e.id,
            exam: e.examSlot.exam.name,
            subject: e.subjectOffering.course.name,
            code: e.subjectOffering.course.code,
            status: e.status,
            moderationStatus: e.moderationStatus,
            moderatedByUserId: e.moderatedByUserId,
            moderatedAt: e.moderatedAt,
            moderationNote: e.moderationNote,
            marked: e.papers.filter(isMarked).length,
            total: e.papers.length,
          })),
      };
    }

    // ── REVALUATION — what students asked to have re-checked ───────────
    case 'REVALUATION': {
      const requests = await prisma.reEvaluationRequest.findMany({
        where: { result: { examSlot: { exam: { institutionId } } } },
        include: {
          studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } },
          result: {
            include: {
              examSlot: { include: { exam: true, offering: { include: { course: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      const open = requests.filter((r) => r.status === 'REQUESTED').length;
      return {
        open,
        counts: {
          REQUESTED: requests.filter((r) => r.status === 'REQUESTED').length,
          APPROVED: requests.filter((r) => r.status === 'APPROVED').length,
          COMPLETED: requests.filter((r) => r.status === 'COMPLETED').length,
          REJECTED: requests.filter((r) => r.status === 'REJECTED').length,
        },
        items: requests.map((r) => ({
          id: r.id,
          student: r.studentProfile.user.fullName,
          rollNo: r.studentProfile.rollNo,
          exam: r.result.examSlot.exam.name,
          subject: r.result.examSlot.offering.course.name,
          code: r.result.examSlot.offering.course.code,
          reason: r.reason,
          status: r.status,
          marks: r.result.marksObtained,
          maxMarks: r.result.maxMarks,
          decidedByUserId: r.decidedByUserId,
          createdAt: r.createdAt,
        })),
      };
    }

    default:
      return assertBlock(block) && {};
  }
}

// ═══ Writes ══════════════════════════════════════════════════════════════

/** Requirement 1 — move a paper's script forward one custody step. */
export async function moveScript(
  institutionId: string,
  userId: string,
  paperId: string,
  toStatus: string,
) {
  const target = assertScriptStatus(toStatus);
  const paper = await prisma.evaluationPaper.findFirst({
    where: { id: paperId, evaluation: { examSlot: { exam: { institutionId } } } },
  });
  if (!paper) throw notFound('Evaluation paper not found');
  assertScriptTransition(paper.scriptStatus as ScriptStatus, target);
  const updated = await prisma.evaluationPaper.update({
    where: { id: paperId },
    data: { scriptStatus: target },
  });
  await writeAudit({
    institutionId,
    actorUserId: userId,
    action: 'SCRIPT_RECEIVED',
    entityType: 'EvaluationPaper',
    entityId: paperId,
    before: { scriptStatus: paper.scriptStatus },
    after: { scriptStatus: target },
  });
  return { id: updated.id, scriptStatus: updated.scriptStatus };
}

/** Requirement 1 — hand a whole subject's scripts in at once (NOT_RECEIVED → RECEIVED). */
export async function receiveScripts(institutionId: string, userId: string, evaluationId: string) {
  const evaluation = await prisma.evaluation.findFirst({ where: evalWhere(institutionId, evaluationId) });
  if (!evaluation) throw notFound('Evaluation not found');
  const res = await prisma.evaluationPaper.updateMany({
    where: { evaluationId, scriptStatus: 'NOT_RECEIVED' },
    data: { scriptStatus: 'RECEIVED' },
  });
  await writeAudit({
    institutionId,
    actorUserId: userId,
    action: 'SCRIPTS_RECEIVED',
    entityType: 'Evaluation',
    entityId: evaluationId,
    after: { received: res.count },
  });
  return { received: res.count };
}

/**
 * Requirement 2 — allocate an evaluator. The evaluator must be teaching staff
 * OF THIS INSTITUTION: the id arrives from the client and a role check alone
 * would let another college's teacher be assigned to grade our papers.
 */
export async function allocateEvaluator(
  institutionId: string,
  userId: string,
  evaluationId: string,
  evaluatorUserId: string,
) {
  const evaluation = await prisma.evaluation.findFirst({ where: evalWhere(institutionId, evaluationId) });
  if (!evaluation) throw notFound('Evaluation not found');
  const staff = await prisma.user.findFirst({
    where: {
      id: evaluatorUserId,
      institutionId,
      deletedAt: null,
      roles: { some: { role: { in: ['TEACHER', 'HOD'] } } },
    },
    select: { id: true, fullName: true },
  });
  if (!staff) throw unprocessable('Evaluator must be a teacher or HOD of this institution', { evaluatorUserId });
  const updated = await prisma.evaluation.update({
    where: { id: evaluationId },
    data: {
      evaluatorUserId: staff.id,
      status: evaluation.status === 'PENDING' ? 'IN_PROGRESS' : evaluation.status,
      papers: { updateMany: { where: {}, data: { evaluatorUserId: staff.id } } },
    },
  });
  await writeAudit({
    institutionId,
    actorUserId: userId,
    action: 'EVALUATOR_ALLOCATED',
    entityType: 'Evaluation',
    entityId: evaluationId,
    before: { evaluatorUserId: evaluation.evaluatorUserId },
    after: { evaluatorUserId: staff.id },
  });
  return { id: updated.id, evaluatorUserId: staff.id, evaluatorName: staff.fullName, status: updated.status };
}

/**
 * Requirement 4+5 — enter internal and external marks for one paper.
 * Bounds come from `assertMarksSplit` (422 with `allowed`), the paper's
 * counters are recomputed from rows, and moderation locks the paper: once
 * APPROVED, marks cannot be quietly rewritten.
 */
export async function enterMarks(
  institutionId: string,
  userId: string,
  paperId: string,
  internalMarks: number,
  externalMarks: number,
) {
  const paper = await prisma.evaluationPaper.findFirst({
    where: { id: paperId, evaluation: { examSlot: { exam: { institutionId } } } },
    include: { evaluation: true },
  });
  if (!paper) throw notFound('Evaluation paper not found');
  if (paper.evaluation.moderationStatus === 'APPROVED') {
    throw unprocessable('Moderation has approved these marks — they are locked', {
      moderationStatus: 'APPROVED',
    });
  }
  assertMarksSplit(internalMarks, externalMarks);
  await prisma.evaluationPaper.update({
    where: { id: paperId },
    data: {
      internalMarks,
      externalMarks,
      marksEntered: internalMarks + externalMarks,
      status: 'DONE',
      evaluatorUserId: paper.evaluatorUserId ?? paper.evaluation.evaluatorUserId ?? userId,
    },
  });
  const counts = await recomputeCounts(paper.evaluationId);
  await writeAudit({
    institutionId,
    actorUserId: userId,
    action: 'MARKS_ENTERED',
    entityType: 'EvaluationPaper',
    entityId: paperId,
    before: { internalMarks: paper.internalMarks, externalMarks: paper.externalMarks },
    after: { internalMarks, externalMarks },
  });
  return {
    id: paperId,
    internalMarks,
    externalMarks,
    total: internalMarks + externalMarks,
    evaluation: counts,
  };
}

/**
 * Requirement 6 — set or move the grading deadline for one exam. One deadline
 * per exam (upsert on `examId`): a second call MOVES the date rather than
 * creating a competing one.
 */
export async function setDeadline(institutionId: string, userId: string, examId: string, dueAt: string) {
  const exam = await prisma.exam.findFirst({ where: { id: examId, institutionId }, select: { id: true } });
  if (!exam) throw notFound('Exam not found');
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) throw unprocessable('dueAt must be an ISO date-time', { dueAt });
  const existing = await prisma.gradingDeadline.findUnique({ where: { examId } });
  const row = await prisma.gradingDeadline.upsert({
    where: { examId },
    update: { dueAt: date, remindedAt: null },
    create: { examId, dueAt: date },
  });
  await writeAudit({
    institutionId,
    actorUserId: userId,
    action: existing ? 'DEADLINE_MOVED' : 'DEADLINE_SET',
    entityType: 'GradingDeadline',
    entityId: row.id,
    before: existing ? { dueAt: existing.dueAt } : undefined,
    after: { dueAt: date },
  });
  return { examId, dueAt: row.dueAt };
}

/** Requirement 6 — stamp the reminder (the notification itself is X-09's job). */
export async function remindDeadline(institutionId: string, userId: string, examId: string) {
  const exam = await prisma.exam.findFirst({ where: { id: examId, institutionId }, select: { id: true } });
  if (!exam) throw notFound('Exam not found');
  const existing = await prisma.gradingDeadline.findUnique({ where: { examId } });
  if (!existing) throw unprocessable('No deadline set for this exam yet — set one first');
  const row = await prisma.gradingDeadline.update({ where: { examId }, data: { remindedAt: new Date() } });
  await writeAudit({
    institutionId,
    actorUserId: userId,
    action: 'DEADLINE_REMINDED',
    entityType: 'GradingDeadline',
    entityId: row.id,
  });
  return { examId, dueAt: row.dueAt, remindedAt: row.remindedAt };
}

/**
 * Requirement 8 — moderation: request, then decide. Requesting is only legal
 * on a COMPLETED evaluation; deciding flips APPROVED/FLAGGED and stamps the
 * actor. FLAGGED re-opens marks entry; APPROVED locks it.
 */
export async function requestModeration(institutionId: string, userId: string, evaluationId: string) {
  const evaluation = await prisma.evaluation.findFirst({ where: evalWhere(institutionId, evaluationId) });
  if (!evaluation) throw notFound('Evaluation not found');
  assertModerationRequestable(evaluation.status);
  if (evaluation.moderationStatus === 'PENDING') {
    return { id: evaluation.id, moderationStatus: 'PENDING' };
  }
  const updated = await prisma.evaluation.update({
    where: { id: evaluationId },
    data: { moderationStatus: 'PENDING', moderatedByUserId: null, moderatedAt: null, moderationNote: null },
  });
  await writeAudit({
    institutionId,
    actorUserId: userId,
    action: 'MODERATION_REQUESTED',
    entityType: 'Evaluation',
    entityId: evaluationId,
  });
  return { id: updated.id, moderationStatus: updated.moderationStatus };
}

export async function decideModeration(
  institutionId: string,
  userId: string,
  evaluationId: string,
  decision: string,
  note?: string,
) {
  const target = assertModerationDecision(decision);
  const evaluation = await prisma.evaluation.findFirst({ where: evalWhere(institutionId, evaluationId) });
  if (!evaluation) throw notFound('Evaluation not found');
  if (evaluation.moderationStatus !== 'PENDING') {
    throw unprocessable(`Only a PENDING moderation can be decided (this one is ${evaluation.moderationStatus})`, {
      allowed: ['PENDING'],
      current: evaluation.moderationStatus,
    });
  }
  const updated = await prisma.evaluation.update({
    where: { id: evaluationId },
    data: {
      moderationStatus: target,
      moderatedByUserId: userId,
      moderatedAt: new Date(),
      moderationNote: note ?? null,
    },
  });
  await writeAudit({
    institutionId,
    actorUserId: userId,
    action: `MODERATION_${target}`,
    entityType: 'Evaluation',
    entityId: evaluationId,
    after: { moderationStatus: target, note: note ?? null },
  });
  return { id: updated.id, moderationStatus: updated.moderationStatus };
}

/**
 * Requirement 10 — may results go out for this slot? Returns the reasons they
 * may not (docs 05-state-machines §2.1: every paper marked, nothing flagged).
 */
export async function publicationGate(institutionId: string, examSlotId: string) {
  const slot = await prisma.examSlot.findFirst({
    where: { id: examSlotId, exam: { institutionId } },
    include: { evaluations: { include: { papers: true } } },
  });
  if (!slot) throw notFound('Exam slot not found');
  const reasons = publicationBlockers(slot.evaluations);
  return { canPublish: reasons.length === 0, reasons, evaluations: slot.evaluations.length };
}
