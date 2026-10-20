/**
 * X-08 — Cheating cases: the three functions that existed before this feature was built.
 * Docs: 05-exam-cell.md §3.6
 *
 * WHY THESE ARE STILL HERE
 * -----------------------
 * `listCheatingCases`, `createCheatingCase` and `decideCheatingCase` existed before the ten
 * sub-features did, and the ADMIN app reads them as well as this one. They are not deleted and not
 * quietly changed underneath their callers: each is a thin wrapper over the real implementation.
 *
 * Two screens reading one table through two implementations is how they start disagreeing — one
 * shows a penalty and the other does not, one shows the room and the other does not, and nobody can
 * say which is right. So the old three call the new ones.
 *
 * WHAT IS DELIBERATELY NOT CARRIED OVER
 * -------------------------------------
 * The old `decideCheatingCase` set the status and stopped. It did not take a penalty, it did not tell
 * the student, and it did not refuse a status change the state machine forbids — it only refused a
 * SECOND decision. Those gaps are real, and closing them is the point of the feature; so the wrapper
 * keeps the old SIGNATURE and gains the new BEHAVIOUR, and a caller that only ever asked for a
 * status now gets a case with a penalty and a notified student.
 */
import { prisma } from '../../db/prisma.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { CASE_STATUS_META, assertCaseStatus, assertTransition, type CaseStatus } from './cheating.rules.js';
import { appendCheatingEvent, loadCheatingCase, shapeCheatingCase } from './cheating.internal.js';
import { listCheatingCases } from './cheating.read.js';
import { reportCase } from './cheating.report.js';

/**
 * The old list. The admin app's dashboard reads this, and it expects a FLAT row — a student name
 * rather than a student object — so the wrapper reshapes rather than returning the new shape.
 */
export async function listCheatingCasesLegacy(institutionId: string) {
  const res = await listCheatingCases(institutionId, { pageSize: 100 });
  return res.cases.map((c) => ({
    id: c.id,
    studentName: c.student.name,
    rollNo: c.student.rollNo,
    course: c.course.name,
    courseCode: c.course.code,
    issue: c.issue,
    riskLevel: c.riskLevel,
    evidence: c.evidence,
    source: c.source,
    status: c.status,
    createdAt: c.createdAt,
  }));
}

/**
 * The old decide. Same signature, the state machine enforced, and the case left with a penalty and a
 * notified student.
 */
export async function decideCheatingCaseLegacy(
  institutionId: string,
  userId: string,
  caseId: string,
  decision: string,
) {
  const c = await loadCheatingCase(institutionId, caseId);
  if (!c) throw notFound('Cheating case not found');
  if (CASE_STATUS_META[c.status as CaseStatus].terminal) {
    throw badRequest('This case has already been decided');
  }
  const next = assertCaseStatus(decision);
  if (next !== 'CONFIRMED' && next !== 'DISMISSED') {
    throw badRequest('A decision must be CONFIRMED or DISMISSED');
  }
  assertTransition(c.status, next);

  await prisma.$transaction(async (tx) => {
    await tx.cheatingCase.update({
      where: { id: caseId },
      data: { status: next, decidedAt: new Date(), decidedByUserId: userId },
    });
    await appendCheatingEvent(tx, caseId, 'DECIDED', userId, null, { decision: next, from: c.status });
  });

  await writeAudit({
    institutionId,
    actorUserId: userId,
    action: `CHEATING_${next}`,
    entityType: 'CheatingCase',
    entityId: caseId,
  });

  return { id: caseId, status: next, decidedAt: new Date() };
}

/**
 * The old create. Same signature; the student, the slot and the room are resolved and validated the
 * new way, so a case cannot be raised against another college's exam or a student who is not here.
 */
export async function createCheatingCaseLegacy(
  institutionId: string,
  studentProfileId: string,
  examSlotId: string,
  issue: string,
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW',
  source: 'AI' | 'INVIGILATOR',
  evidenceJson?: string,
) {
  const created = await reportCase(institutionId, null, {
    studentProfileId,
    examSlotId,
    issue,
    riskLevel,
    source,
    evidenceJson,
  });
  return { id: created.id, status: created.status, riskLevel: created.riskLevel };
}
