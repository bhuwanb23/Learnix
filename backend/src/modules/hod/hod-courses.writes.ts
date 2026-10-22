/**
 * HD-02 — The HOD's Courses desk: the writes.
 * Docs: 11-hod.md §3.3
 *
 * WHO MAY WRITE WHAT
 * ------------------
 *   · The HOD may EDIT a course and set its STATUS (including archiving it).
 *   · The HOD may MAP a course to a programme, and UNMAP it.
 *   · The HOD may add and remove PREREQUISITES.
 *   · The HOD may NOT create a course. A course is created by the Admin, and the HOD's power is
 *     over the department's curriculum, not over the institution's course catalogue.
 *
 * So there is no `createCourse` here, and the catalogue screen says so. A "New Course" button
 * that opens an alert is worse than no button: it teaches the reader that the screen's controls
 * are decorative.
 *
 * EVERY WRITE LEAVES A TRAIL
 * --------------------------
 * Each write calls `writeAudit` with the before and after. The course's HISTORY panel reads that
 * table, so the trail is the feature, not a side effect.
 */
import { prisma } from '../../db/prisma.js';
import { writeAudit } from '../../lib/audit.js';
import { notFound, unprocessable } from '../../lib/errors.js';
import {
  assertCourseStatus,
  assertCourseType,
  assertPrerequisiteType,
} from './hod-courses.rules.js';
import { requireCourse, resolveCourseScope } from './hod-courses.scope.js';

// ═══ 1. Edit a course ═════════════════════════════════════════════════════

export type UpdateCourseInput = {
  name?: string;
  credits?: number;
  semester?: number;
  type?: string;
  status?: string;
};

/**
 * EDIT A COURSE.
 *
 * Only the fields the HOD owns are editable, and each is validated in the service — a semester of
 * zero or a negative credit count is a 422 rather than a row that renders as "Semester 0".
 *
 * THE STATUS MOVE IS VALIDATED AGAINST ITSELF: a course cannot be its own prerequisite, and
 * archiving a course that still has live offerings is allowed (the HOD is the one who knows) but
 * is REPORTED, so the response can say what the HOD should look at next.
 */
export async function updateCourse(
  hodUserId: string,
  institutionId: string,
  courseId: string,
  input: UpdateCourseInput,
) {
  const scope = await resolveCourseScope(hodUserId, institutionId);
  const before = await requireCourse(scope, courseId);

  const data: Record<string, unknown> = {};

  if (input.name !== undefined) {
    const name = String(input.name).trim();
    if (name.length < 2 || name.length > 160) {
      throw unprocessable('Course name must be between 2 and 160 characters');
    }
    data.name = name;
  }
  if (input.credits !== undefined) {
    const credits = Number(input.credits);
    if (!Number.isInteger(credits) || credits < 0 || credits > 30) {
      throw unprocessable('Credits must be a whole number between 0 and 30');
    }
    data.credits = credits;
  }
  if (input.semester !== undefined) {
    const semester = Number(input.semester);
    if (!Number.isInteger(semester) || semester < 1 || semester > 12) {
      throw unprocessable('Semester must be a whole number between 1 and 12');
    }
    data.semester = semester;
  }
  if (input.type !== undefined) {
    data.type = assertCourseType(input.type);
  }
  if (input.status !== undefined) {
    data.status = assertCourseStatus(input.status);
  }

  if (Object.keys(data).length === 0) {
    throw unprocessable('Nothing to update');
  }

  const after = await prisma.course.update({
    where: { id: courseId },
    data,
    select: {
      id: true,
      code: true,
      name: true,
      credits: true,
      semester: true,
      type: true,
      status: true,
      updatedAt: true,
    },
  });

  await writeAudit({
    actorUserId: hodUserId,
    institutionId,
    action: 'COURSE_UPDATED',
    entityType: 'Course',
    entityId: courseId,
    before: { name: before.name, credits: before.credits, semester: before.semester, type: before.type, status: before.status },
    after: { name: after.name, credits: after.credits, semester: after.semester, type: after.type, status: after.status },
  });

  const liveOfferings = scope.offerings.filter((o) => o.courseId === courseId).length;

  return {
    course: after,
    // THE WARNING, NOT A BLOCK. The HOD is the one who knows whether archiving a course that is
    // still being taught is right — but they should not have to find out from a later report.
    notice:
      after.status === 'ARCHIVED' && liveOfferings > 0
        ? `Archived. This course still has ${liveOfferings} live offering${liveOfferings === 1 ? '' : 's'}.`
        : null,
  };
}

// ═══ 2. Set the status ════════════════════════════════════════════════════

/**
 * SET THE COURSE'S STATUS.
 *
 * A separate route from the edit because it is a DIFFERENT ACT: archiving a course is a decision
 * with a consequence, and a reader looking at the history wants to see "COURSE_ARCHIVED" rather
 * than a generic update.
 */
export async function setCourseStatus(
  hodUserId: string,
  institutionId: string,
  courseId: string,
  status: string,
) {
  const scope = await resolveCourseScope(hodUserId, institutionId);
  const before = await requireCourse(scope, courseId);
  const next = assertCourseStatus(status);

  const after = await prisma.course.update({
    where: { id: courseId },
    data: { status: next },
    select: { id: true, code: true, name: true, status: true, updatedAt: true },
  });

  await writeAudit({
    actorUserId: hodUserId,
    institutionId,
    action: `COURSE_${next}`,
    entityType: 'Course',
    entityId: courseId,
    before: { status: before.status },
    after: { status: next },
  });

  return { course: after };
}

// ═══ 3. The curriculum mapping ═════════════════════════════════════════════

/**
 * MAP A COURSE TO A PROGRAMME.
 *
 * The DECLARATION. The offering is the evidence; this is the intent, and it can exist before any
 * offering does — which is the point, because a curriculum is decided before it is taught.
 */
export async function attachProgramCourse(
  hodUserId: string,
  institutionId: string,
  courseId: string,
  programId: string,
  semester: number,
  type: string,
  isElective: boolean,
) {
  const scope = await resolveCourseScope(hodUserId, institutionId);
  await requireCourse(scope, courseId);

  // THE PROGRAMME MUST BE THE DEPARTMENT'S. A course cannot be mapped into another department's
  // programme, or the mapping screen would leak and corrupt.
  const program = scope.programs.find((p) => p.id === programId);
  if (!program) throw notFound('Program not found in your department');

  const sem = Number(semester);
  if (!Number.isInteger(sem) || sem < 1 || sem > 12) {
    throw unprocessable('Semester must be a whole number between 1 and 12');
  }
  const mappedType = assertCourseType(type);

  const existing = await prisma.programCourse.findUnique({
    where: { programId_courseId: { programId, courseId } },
    select: { id: true },
  });
  if (existing) {
    // Re-mapping UPDATES the row rather than failing — the HOD is correcting a semester, and a
    // second press of the same button is not an error.
    const row = await prisma.programCourse.update({
      where: { id: existing.id },
      data: { semester: sem, type: mappedType, isElective: Boolean(isElective) },
      select: { id: true, programId: true, courseId: true, semester: true, type: true, isElective: true },
    });
    await writeAudit({
      actorUserId: hodUserId,
      institutionId,
      action: 'COURSE_CURRICULUM_UPDATED',
      entityType: 'Course',
      entityId: courseId,
      before: { programId, courseId },
      after: row,
    });
    return { mapping: row, created: false };
  }

  const row = await prisma.programCourse.create({
    data: {
      programId,
      courseId,
      semester: sem,
      type: mappedType,
      isElective: Boolean(isElective),
    },
    select: { id: true, programId: true, courseId: true, semester: true, type: true, isElective: true },
  });

  await writeAudit({
    actorUserId: hodUserId,
    institutionId,
    action: 'COURSE_CURRICULUM_MAPPED',
    entityType: 'Course',
    entityId: courseId,
    before: null,
    after: row,
  });

  return { mapping: row, created: true };
}

/**
 * UNMAP A COURSE FROM A PROGRAMME.
 *
 * The reverse of the declaration. The course's history keeps the record that it WAS mapped.
 */
export async function detachProgramCourse(
  hodUserId: string,
  institutionId: string,
  courseId: string,
  programId: string,
) {
  const scope = await resolveCourseScope(hodUserId, institutionId);
  await requireCourse(scope, courseId);

  const existing = await prisma.programCourse.findUnique({
    where: { programId_courseId: { programId, courseId } },
    select: { id: true, programId: true, courseId: true, semester: true, type: true, isElective: true },
  });
  if (!existing) throw notFound('That course is not mapped to that program');

  await prisma.programCourse.delete({ where: { id: existing.id } });

  await writeAudit({
    actorUserId: hodUserId,
    institutionId,
    action: 'COURSE_CURRICULUM_UNMAPPED',
    entityType: 'Course',
    entityId: courseId,
    before: existing,
    after: null,
  });

  return { removed: existing };
}

// ═══ 4. The prerequisites ══════════════════════════════════════════════════

/**
 * ADD A PREREQUISITE.
 *
 * A COURSE CANNOT PREREQUISITE ITSELF, and the pair must not already exist. Both are checked
 * before the write rather than caught by a unique index, because a constraint violation is a 500
 * to the caller and a 422 is a sentence they can act on.
 */
export async function addPrerequisite(
  hodUserId: string,
  institutionId: string,
  courseId: string,
  prerequisiteCourseId: string,
  type: string,
) {
  const scope = await resolveCourseScope(hodUserId, institutionId);
  await requireCourse(scope, courseId);

  if (prerequisiteCourseId === courseId) {
    throw unprocessable('A course cannot be its own prerequisite');
  }
  // THE PREREQUISITE MUST ALSO BE THE DEPARTMENT'S. A course cannot demand one from another
  // department's catalogue.
  const prereq = await requireCourse(scope, prerequisiteCourseId);
  const kind = assertPrerequisiteType(type);

  const existing = await prisma.coursePrerequisite.findUnique({
    where: {
      courseId_prerequisiteCourseId: { courseId, prerequisiteCourseId },
    },
    select: { id: true },
  });
  if (existing) {
    throw unprocessable('That course is already a prerequisite of this one');
  }

  // A CYCLE CHECK. The graph must be a DAG, or "what must come first" becomes unanswerable.
  await assertNoPrerequisiteCycle(scope, courseId, prerequisiteCourseId);

  const row = await prisma.coursePrerequisite.create({
    data: { courseId, prerequisiteCourseId, type: kind },
    select: { id: true, courseId: true, prerequisiteCourseId: true, type: true },
  });

  await writeAudit({
    actorUserId: hodUserId,
    institutionId,
    action: 'COURSE_PREREQUISITE_ADDED',
    entityType: 'Course',
    entityId: courseId,
    before: null,
    after: { ...row, prerequisiteName: prereq.name },
  });

  return { prerequisite: row };
}

/**
 * REMOVE A PREREQUISITE.
 */
export async function removePrerequisite(
  hodUserId: string,
  institutionId: string,
  courseId: string,
  prerequisiteCourseId: string,
) {
  const scope = await resolveCourseScope(hodUserId, institutionId);
  await requireCourse(scope, courseId);

  const existing = await prisma.coursePrerequisite.findUnique({
    where: {
      courseId_prerequisiteCourseId: { courseId, prerequisiteCourseId },
    },
    select: { id: true, courseId: true, prerequisiteCourseId: true, type: true },
  });
  if (!existing) throw notFound('That course is not a prerequisite of this one');

  await prisma.coursePrerequisite.delete({ where: { id: existing.id } });

  await writeAudit({
    actorUserId: hodUserId,
    institutionId,
    action: 'COURSE_PREREQUISITE_REMOVED',
    entityType: 'Course',
    entityId: courseId,
    before: existing,
    after: null,
  });

  return { removed: existing };
}

/**
 * THE CYCLE CHECK.
 *
 * If `prerequisiteCourseId` already depends on `courseId` — directly or through a chain — then
 * adding this edge would close a loop, and a loop makes "what must come before this" a question
 * with no answer. The walk follows the existing edges from the proposed prerequisite; if it reaches
 * the course being edited, the edge is refused.
 */
async function assertNoPrerequisiteCycle(
  scope: { prerequisites: { courseId: string; prerequisiteCourseId: string }[] },
  courseId: string,
  prerequisiteCourseId: string,
) {
  const edges = new Map<string, string[]>();
  for (const p of scope.prerequisites) {
    const list = edges.get(p.courseId) ?? [];
    list.push(p.prerequisiteCourseId);
    edges.set(p.courseId, list);
  }

  const seen = new Set<string>();
  const stack = [prerequisiteCourseId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === courseId) {
      throw unprocessable(
        'That prerequisite would create a loop: the course would end up requiring itself, directly or through a chain',
      );
    }
    if (seen.has(current)) continue;
    seen.add(current);
    for (const next of edges.get(current) ?? []) stack.push(next);
  }
}
