/**
 * X-08 — Cheating cases: writing.
 * Docs: 05-exam-cell.md §3.6
 *
 * EVERY STATE CHANGE LEAVES AN EVENT, IN THE SAME TRANSACTION
 * ---------------------------------------------------------
 * A cheating case can end a student's degree. A student who was cleared must be able to see that
 * they were cleared, when, by whom, and on what grounds — and a committee that cannot reconstruct
 * what it did is not reviewable. So the change and the record of it are written together, and there
 * is no path that changes a case without one.
 *
 * THE MOVES ARE CHECKED AGAINST THE STATE MACHINE
 * ----------------------------------------------
 * A case that has been CONFIRMED cannot quietly become DISMISSED, and a DISMISSED case cannot be
 * re-decided without being REOPENED first — because a decision a person can overwrite by accident is
 * not a decision. The rules live in `cheating.rules.ts` and are asserted there.
 */
import { prisma } from '../../db/prisma.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import {
  CASE_STATUS_META,
  PENALTY_META,
  assertCaseStatus,
  assertClassification,
  assertEvidenceKind,
  assertPenalty,
  assertRiskLevel,
  assertTransition,
  type CaseStatus,
} from './cheating.rules.js';
import {
  appendCheatingEvent,
  loadCheatingCase,
  shapeCheatingCase,
} from './cheating.internal.js';
// X-09 — the one writer for a notification. The cheating desk used to open-code its own
// `prisma.notification.create`, which is how a type ends up unregistered and a row ends up
// labelled with a fallback.
import { raise } from './examcell-notifications.service.js';

/** Load a case or refuse. The 404 is the tenant guard doing its job. */
async function requireCase(institutionId: string, id: string) {
  const c = await loadCheatingCase(institutionId, id);
  if (!c) throw notFound('Cheating case not found');
  return c;
}

/** A case that has been decided cannot be worked on. */
function assertOpen(c: { status: string }) {
  if (CASE_STATUS_META[c.status as CaseStatus].terminal) {
    throw conflict(`This case is ${c.status} and cannot be worked on`);
  }
}

// ── Classify ──────────────────────────────────────────────────────────────

/**
 * Classify a case — say WHAT the misconduct is, as distinct from how risky it looked.
 *
 * Re-classifying also moves a REPORTED case into review, because a case nobody has classified is a
 * case nobody is working on. The two happen together and both leave a record.
 */
export async function classifyCase(
  institutionId: string,
  actorUserId: string,
  id: string,
  body: { classification: string; riskLevel?: string; note?: string },
) {
  const c = await requireCase(institutionId, id);
  assertOpen(c);

  const classification = assertClassification(body.classification);
  const risk = body.riskLevel ? assertRiskLevel(body.riskLevel) : c.riskLevel;
  // `c.status` is a plain string in the database, so it is narrowed through the same assertion the
  // rest of the module uses. An unrecognised status would otherwise be treated as a valid one and
  // silently allowed to move.
  const current = assertCaseStatus(c.status);
  const nextStatus: CaseStatus = current === 'REPORTED' ? 'UNDER_REVIEW' : current;
  assertTransition(current, nextStatus);

  await prisma.$transaction(async (tx) => {
    await tx.cheatingCase.update({
      where: { id },
      data: { classification, riskLevel: risk, status: nextStatus },
    });
    await appendCheatingEvent(tx, id, 'CLASSIFIED', actorUserId, body.note?.trim() || null, {
      classification,
      riskLevel: risk,
      from: c.status,
      to: nextStatus,
    });
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'CHEATING_CLASSIFIED',
    entityType: 'CheatingCase',
    entityId: id,
    before: { classification: c.classification, riskLevel: c.riskLevel, status: c.status },
    after: { classification, riskLevel: risk, status: nextStatus },
  });

  return shapeCheatingCase(await requireCase(institutionId, id));
}

// ── Student statement ──────────────────────────────────────────────────────

/**
 * Record the STUDENT'S OWN ACCOUNT.
 *
 * It is kept separate from the incident description because they are two different accounts of the
 * same event, and a committee that cannot see both cannot judge. A student statement is evidence in
 * the case, not a comment on it.
 */
export async function recordStatement(
  institutionId: string,
  actorUserId: string,
  id: string,
  body: { statement: string; statementByUserId?: string },
) {
  const c = await requireCase(institutionId, id);
  assertOpen(c);
  const statement = body.statement?.trim();
  if (!statement) throw badRequest('The statement cannot be empty');
  const byUserId = body.statementByUserId ?? actorUserId;

  await prisma.$transaction(async (tx) => {
    await tx.cheatingCase.update({
      where: { id },
      data: { studentStatement: statement, statementAt: new Date(), statementByUserId: byUserId },
    });
    await appendCheatingEvent(tx, id, 'STATEMENT_TAKEN', byUserId, statement.slice(0, 200), {
      length: statement.length,
    });
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'CHEATING_STATEMENT',
    entityType: 'CheatingCase',
    entityId: id,
  });

  return shapeCheatingCase(await requireCase(institutionId, id));
}

// ── Committee review ───────────────────────────────────────────────────────

/**
 * The committee's finding.
 *
 * The committee is a list of user ids on the case. `committeeUserIds` is JSON rather than a join
 * table because a committee is a small, ad-hoc group attached to ONE case, and nothing in the platform
 * queries "every case this person sat on" — so a table would be a relationship nothing ever traverses.
 */
export async function submitCommitteeReview(
  institutionId: string,
  actorUserId: string,
  id: string,
  body: {
    committeeUserIds: string[];
    reviewNote: string;
    decision: 'RECOMMEND_CONFIRM' | 'RECOMMEND_DISMISS' | 'NEEDS_MORE_INFO';
  },
) {
  const c = await requireCase(institutionId, id);
  assertOpen(c);
  if (!Array.isArray(body.committeeUserIds) || body.committeeUserIds.length === 0) {
    throw badRequest('Name at least one committee member');
  }
  const note = body.reviewNote?.trim();
  if (!note) throw badRequest('The committee must record what it found');

  // The committee must be people of THIS institution. A case cannot have an outsider on its panel.
  const members = await prisma.user.findMany({
    where: { id: { in: body.committeeUserIds }, institutionId, deletedAt: null },
    select: { id: true },
  });
  if (members.length !== body.committeeUserIds.length) {
    throw badRequest('Every committee member must be a user of this institution');
  }

  const nextStatus: CaseStatus = body.decision === 'NEEDS_MORE_INFO' ? 'UNDER_REVIEW' : 'COMMITTEE_REVIEW';
  assertTransition(c.status, nextStatus);

  await prisma.$transaction(async (tx) => {
    await tx.cheatingCase.update({
      where: { id },
      data: {
        committeeUserIds: JSON.stringify(body.committeeUserIds),
        reviewNote: note,
        reviewedAt: new Date(),
        reviewedByUserId: actorUserId,
        status: nextStatus,
      },
    });
    await appendCheatingEvent(tx, id, 'COMMITTEE_REVIEW', actorUserId, note, {
      committeeUserIds: body.committeeUserIds,
      recommendation: body.decision,
      to: nextStatus,
    });
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'CHEATING_COMMITTEE_REVIEW',
    entityType: 'CheatingCase',
    entityId: id,
    after: { recommendation: body.decision, committee: body.committeeUserIds.length },
  });

  return shapeCheatingCase(await requireCase(institutionId, id));
}

// ── Evidence ───────────────────────────────────────────────────────────────

/**
 * Attach evidence — a document, a screenshot, a photograph of a device.
 *
 * The FILE lives in the platform's `File` table, where every uploaded document in this app already
 * lives; this records what the file IS in the context of a case. The file must belong to THIS
 * institution, or a case could be given a document from another college's file table.
 */
export async function addEvidence(
  institutionId: string,
  actorUserId: string,
  id: string,
  body: { fileId: string; kind: string; note?: string },
) {
  const c = await requireCase(institutionId, id);
  assertOpen(c);
  const kind = assertEvidenceKind(body.kind);

  const file = await prisma.file.findFirst({
    where: { id: body.fileId, institutionId },
    select: { id: true },
  });
  if (!file) throw notFound('File not found in this institution');

  await prisma.$transaction(async (tx) => {
    await tx.cheatingCaseEvidence.create({
      data: {
        cheatingCaseId: id,
        fileId: file.id,
        kind,
        note: body.note?.trim() || null,
        uploadedByUserId: actorUserId,
      },
    });
    await appendCheatingEvent(tx, id, 'EVIDENCE_ADDED', actorUserId, body.note?.trim() || null, {
      kind,
      fileId: file.id,
    });
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'CHEATING_EVIDENCE_ADDED',
    entityType: 'CheatingCase',
    entityId: id,
    after: { kind, fileId: file.id },
  });

  return shapeCheatingCase(await requireCase(institutionId, id));
}

// ── Decision ───────────────────────────────────────────────────────────────

/**
 * Decide a case, with a penalty, and tell the student.
 *
 * THE STUDENT IS NOTIFIED, and the fact is recorded. A case that was decided and never communicated
 * is a case the student cannot appeal, and a student who learns of a penalty from a third party is
 * not a process — so the notification is part of the decision, not a courtesy afterwards.
 */
export async function decideCase(
  institutionId: string,
  actorUserId: string,
  id: string,
  body: {
    decision: string;
    penalty?: string;
    penaltyDetail?: string;
    decisionNote: string;
    notifyStudent?: boolean;
  },
) {
  const c = await requireCase(institutionId, id);
  const decision = assertCaseStatus(body.decision);
  if (decision !== 'CONFIRMED' && decision !== 'DISMISSED') {
    throw badRequest('A decision must be CONFIRMED or DISMISSED');
  }
  assertOpen(c);
  const note = body.decisionNote?.trim();
  if (!note) throw badRequest('Record what was decided and why');

  // A penalty attaches to a CONFIRMED case. A DISMISSED case carries no penalty — the student was
  // cleared, and attaching a consequence to a clearance is a contradiction the schema would happily
  // store.
  let penalty: string | null = null;
  if (decision === 'CONFIRMED') {
    penalty = assertPenalty(body.penalty ?? 'WARNING');
  } else if (body.penalty) {
    throw badRequest('A dismissed case cannot carry a penalty');
  }

  assertTransition(c.status, decision);
  const notifyStudent = body.notifyStudent !== false;

  await prisma.$transaction(async (tx) => {
    await tx.cheatingCase.update({
      where: { id },
      data: {
        status: decision,
        penalty,
        penaltyDetail: body.penaltyDetail?.trim() || null,
        decisionNote: note,
        decidedAt: new Date(),
        decidedByUserId: actorUserId,
        notifiedStudentAt: notifyStudent ? new Date() : null,
      },
    });
    await appendCheatingEvent(tx, id, 'DECIDED', actorUserId, note, { decision, penalty, from: c.status });
  });

  // The student is told, in their own inbox. A confirmed case with a penalty is the single most
  // consequential notification in the platform, and it goes to the person it concerns.
  if (notifyStudent) {
    const studentUserId = c.studentProfile.user.id;
    await raise({
      institutionId,
      recipientUserIds: [studentUserId],
      type: 'EXAM_CHEATING',
      title: decision === 'CONFIRMED' ? 'Examination misconduct — decision' : 'Examination complaint dismissed',
      body:
        decision === 'CONFIRMED'
          ? `A case concerning your examination has been confirmed. ${penalty ? `Outcome: ${(PENALTY_META as any)[penalty]?.label ?? penalty}.` : ''} ${note}`.slice(0, 500)
          : `The case concerning your examination has been dismissed. ${note}`.slice(0, 500),
      data: { module: 'examcell', screen: 'CheatingCases', id },
      actorUserId,
    });
    await appendCheatingEvent(prisma, id, 'NOTIFIED', actorUserId, 'The student was notified.', {
      recipientUserId: studentUserId,
    });
  }

  await writeAudit({
    actorUserId,
    institutionId,
    action: `CHEATING_${decision}`,
    entityType: 'CheatingCase',
    entityId: id,
    before: { status: c.status, penalty: c.penalty },
    after: { status: decision, penalty, notified: notifyStudent },
  });

  return shapeCheatingCase(await requireCase(institutionId, id));
}

// ── Reopen and note ────────────────────────────────────────────────────────

/**
 * Reopen a decided case.
 *
 * Reopening is an explicit act with a reason, and it leaves a REOPENED event — because a decision
 * that can be quietly overwritten is not a decision, and a student must be able to see that their
 * case was reopened and why.
 */
export async function reopenCase(
  institutionId: string,
  actorUserId: string,
  id: string,
  body: { reason: string },
) {
  const c = await requireCase(institutionId, id);
  if (!CASE_STATUS_META[c.status as CaseStatus].terminal) {
    throw conflict('This case is still open — there is nothing to reopen');
  }
  const reason = body.reason?.trim();
  if (!reason) throw badRequest('Say why the case is being reopened');
  assertTransition(c.status, 'UNDER_REVIEW');

  await prisma.$transaction(async (tx) => {
    await tx.cheatingCase.update({
      where: { id },
      data: {
        status: 'UNDER_REVIEW',
        penalty: null,
        penaltyDetail: null,
        decidedAt: null,
        decidedByUserId: null,
        notifiedStudentAt: null,
      },
    });
    await appendCheatingEvent(tx, id, 'REOPENED', actorUserId, reason, {
      from: c.status,
      to: 'UNDER_REVIEW',
    });
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'CHEATING_REOPENED',
    entityType: 'CheatingCase',
    entityId: id,
    before: { status: c.status, penalty: c.penalty },
    after: { status: 'UNDER_REVIEW' },
  });

  return shapeCheatingCase(await requireCase(institutionId, id));
}

/** Add a note to the case file. */
export async function addCaseNote(
  institutionId: string,
  actorUserId: string,
  id: string,
  body: { note: string },
) {
  await requireCase(institutionId, id);
  const note = body.note?.trim();
  if (!note) throw badRequest('The note cannot be empty');

  await appendCheatingEvent(prisma, id, 'NOTE_ADDED', actorUserId, note, null);

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'CHEATING_NOTE',
    entityType: 'CheatingCase',
    entityId: id,
  });

  return shapeCheatingCase(await requireCase(institutionId, id));
}
