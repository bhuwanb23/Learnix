/**
 * HD-05 — The HOD's Students desk: the writes.
 * Docs: 11-hod.md §3.4
 *
 * THE INTERVENTION
 * ----------------
 * The suggestions DERIVE what should be done; the intervention RECORDS what the department did.
 * Without the record, "what have we already tried with this student?" has no answer, and a
 * student who has had three remedial classes looks exactly like a student who has had nothing.
 *
 * So the HOD records it: the kind, a title, notes, who is carrying it, and when it is due. And
 * the history is that list.
 *
 * EVERY WRITE LEAVES A TRAIL
 * --------------------------
 * The intervention is a state-changing mutation, so it writes an audit row — the same trail the
 * course desk and the faculty desk write.
 */
import { prisma } from '../../db/prisma.js';
import { writeAudit } from '../../lib/audit.js';
import { notFound, unprocessable } from '../../lib/errors.js';
import {
  assertInterventionStatus,
  assertInterventionType,
} from './hod-students.rules.js';
import { resolveStudentScope } from './hod-students.scope.js';

export type RecordInterventionInput = {
  type: string;
  title: string;
  notes?: string | null;
  ownerUserId?: string | null;
  dueAt?: string | null;
};

/**
 * RECORD AN INTERVENTION.
 *
 * The student must be in the HOD's own department — a colleague's student is a 404, not a
 * permission problem, because the HOD's screen must not answer "who is this student" for a
 * student that is not theirs.
 */
export async function recordIntervention(
  hodUserId: string,
  institutionId: string,
  studentProfileId: string,
  input: RecordInterventionInput,
) {
  const scope = await resolveStudentScope(hodUserId, institutionId);
  const student = scope.students.find((s) => s.id === studentProfileId);
  if (!student) throw notFound('Student not found in your department');

  const type = assertInterventionType(input.type);
  const title = String(input.title ?? '').trim();
  if (title.length < 3 || title.length > 160) {
    throw unprocessable('The intervention needs a title of 3 to 160 characters');
  }

  const notes = input.notes ? String(input.notes).trim().slice(0, 2000) : null;

  // THE OWNER, IF NAMED, MUST BE SOMEONE. A teacher who is not in the platform cannot carry
  // an intervention, and an intervention with a silent owner is one nobody follows up.
  let ownerUserId: string | null = null;
  if (input.ownerUserId) {
    const owner = await prisma.user.findFirst({
      where: { id: input.ownerUserId, institutionId, deletedAt: null },
      select: { id: true },
    });
    if (!owner) throw unprocessable('That person is not in this institution');
    ownerUserId = owner.id;
  }

  const dueAt = input.dueAt ? new Date(input.dueAt) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) {
    throw unprocessable('The due date is not a date');
  }

  const row = await prisma.studentIntervention.create({
    data: {
      studentProfileId,
      type,
      status: 'PROPOSED',
      title,
      notes,
      raisedByUserId: hodUserId,
      ownerUserId,
      dueAt,
    },
    select: {
      id: true,
      studentProfileId: true,
      type: true,
      status: true,
      title: true,
      notes: true,
      raisedByUserId: true,
      ownerUserId: true,
      dueAt: true,
      resolvedAt: true,
      createdAt: true,
    },
  });

  await writeAudit({
    actorUserId: hodUserId,
    institutionId,
    action: 'STUDENT_INTERVENTION_RECORDED',
    entityType: 'StudentIntervention',
    entityId: row.id,
    before: null,
    after: { ...row, studentName: student.name, studentRollNo: student.rollNo },
  });

  return { intervention: row };
}

/**
 * MOVE AN INTERVENTION ON — proposed → in progress → resolved, or cancelled.
 *
 * RESOLVING STAMPS THE TIME, because "when was this dealt with" is the whole point of closing
 * one, and a resolved intervention with no resolution date is a claim rather than a record.
 */
export async function updateIntervention(
  hodUserId: string,
  institutionId: string,
  interventionId: string,
  status: string,
  notes?: string | null,
) {
  const scope = await resolveStudentScope(hodUserId, institutionId);
  const existing = scope.interventions.find((i) => i.id === interventionId);
  if (!existing) throw notFound('Intervention not found in your department');

  const next = assertInterventionStatus(status);
  if (next === existing.status) {
    throw unprocessable(`That intervention is already ${next}`);
  }

  const row = await prisma.studentIntervention.update({
    where: { id: interventionId },
    data: {
      status: next,
      ...(notes !== undefined && notes !== null ? { notes: String(notes).trim().slice(0, 2000) } : {}),
      ...(next === 'RESOLVED' && !existing.resolvedAt ? { resolvedAt: new Date() } : {}),
    },
    select: {
      id: true,
      studentProfileId: true,
      type: true,
      status: true,
      title: true,
      notes: true,
      raisedByUserId: true,
      ownerUserId: true,
      dueAt: true,
      resolvedAt: true,
      createdAt: true,
    },
  });

  await writeAudit({
    actorUserId: hodUserId,
    institutionId,
    action: `STUDENT_INTERVENTION_${next}`,
    entityType: 'StudentIntervention',
    entityId: interventionId,
    before: { status: existing.status, resolvedAt: existing.resolvedAt },
    after: { status: row.status, resolvedAt: row.resolvedAt },
  });

  return { intervention: row };
}
