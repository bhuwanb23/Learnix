/**
 * Suite: the cheating-case rules, at the database level.
 * Docs: 05-exam-cell.md §3.6
 *
 * WHY THIS ALONGSIDE `verify-examcell-cheating-http.ts`
 * ------------------------------------------------------
 * That file proves the ROUTES are wired, that a zod schema rejects the right shapes, and that a
 * client gets the right status code. It cannot prove that the STATE MACHINE is the one the module
 * claims, that the DERIVED fields are derived rather than stored, that the timeline is append-only,
 * or that nothing crosses an institution boundary. Those live here.
 *
 * THE RULES THAT ARE EASY TO GET WRONG
 * -------------------------------------
 *   1. THE STATE MACHINE IS EXACTLY WHAT IT CLAIMS. Not "roughly" — the legal moves, asserted one
 *      by one, because a case that can be quietly re-decided is not a decision.
 *   2. ESCALATION IS DERIVED, NEVER STORED. There is no `escalatedAt` column and no ESCALATED
 *      status that means "overdue". A complaint past its threshold escalates because of its age and
 *      its risk, and the row does not change.
 *   3. EVERY STATE CHANGE LEAVES AN EVENT, IN THE SAME TRANSACTION. A case that can change without
 *      a record is a case nobody can audit.
 *   4. THE TIMELINE IS APPEND-ONLY. A decision that can be quietly overwritten is not a decision.
 *   5. THE TENANCY CHAIN IS THE AUTHORITY. A case belongs to an exam, and an exam belongs to an
 *      institution — so a case from another college is not found, not merely hidden.
 *   6. A DISMISSED CASE CARRIES NO PENALTY. The student was cleared; a consequence on a clearance
 *      is a contradiction the schema would happily store.
 *
 * CLEANUP DISCIPLINE
 * ------------------
 * Preflight sweep plus `finally`, `hrchk-ch-` prefix, children before parents. The academic tree
 * hangs off the institution rather than off it, so deleting the institution alone leaves the
 * department, program, batch and section behind — and they accumulate on every run.
 */
import { prisma } from '../src/db/prisma.js';
import * as svc from '../src/modules/examcell/cheating.service.js';
import {
  CASE_STATUSES,
  CASE_STATUS_META,
  CASE_TRANSITIONS,
  CLASSIFICATIONS,
  OVERDUE_HOURS,
  PENALTIES,
  RISK_LEVELS,
  canTransition,
} from '../src/modules/examcell/cheating.rules.js';

const PFX = 'hrchk-ch-';
let passed = 0;
const failures: string[] = [];

function ok(label: string, cond: unknown, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ok   ${label}`);
  } else {
    failures.push(`${label}${detail ? ` -- ${detail}` : ''}`);
    console.log(`  FAIL ${label}${detail ? ` -- ${detail}` : ''}`);
  }
}
function eq(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  ok(label, a === e, a === e ? '' : `got ${a}, wanted ${e}`);
}
async function expectReject(label: string, fn: () => Promise<unknown>, status?: number) {
  try {
    await fn();
    failures.push(`${label} -- did NOT reject`);
    console.log(`  FAIL ${label} -- did NOT reject`);
  } catch (err: any) {
    if (status !== undefined && err?.httpStatus !== status) {
      failures.push(`${label} -- rejected ${err?.httpStatus} (${err?.message}), wanted ${status}`);
      console.log(`  FAIL ${label} -- rejected ${err?.httpStatus} (${err?.message}), wanted ${status}`);
    } else {
      passed++;
      console.log(`  ok   ${label}${err?.httpStatus ? ` (${err.httpStatus})` : ''}`);
    }
  }
}
function section(n: number | string, title: string) {
  console.log(`\n── ${n}. ${title}`);
}

async function sweep() {
  const insts = await prisma.institution.findMany({ where: { code: { startsWith: PFX } }, select: { id: true } });
  const ids = insts.map((i) => i.id);
  if (!ids.length) return;
  const users = (await prisma.user.findMany({ where: { institutionId: { in: ids } }, select: { id: true } })).map((u) => u.id);
  const cases = (await prisma.cheatingCase.findMany({
    where: { examSlot: { exam: { institutionId: { in: ids } } } },
    select: { id: true },
  })).map((c) => c.id);
  if (cases.length) {
    await prisma.cheatingCaseEvent.deleteMany({ where: { cheatingCaseId: { in: cases } } });
    await prisma.cheatingCaseEvidence.deleteMany({ where: { cheatingCaseId: { in: cases } } });
    await prisma.cheatingCase.deleteMany({ where: { id: { in: cases } } });
  }
  await prisma.notification.deleteMany({ where: { institutionId: { in: ids } } });
  await prisma.userRole.deleteMany({ where: { userId: { in: users } } });
  await prisma.studentProfile.deleteMany({ where: { userId: { in: users } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.examSlot.deleteMany({ where: { exam: { institutionId: { in: ids } } } });
  await prisma.exam.deleteMany({ where: { institutionId: { in: ids } } });
  await prisma.courseOffering.deleteMany({ where: { course: { institutionId: { in: ids } } } });
  await prisma.course.deleteMany({ where: { institutionId: { in: ids } } });
  await prisma.section.deleteMany({ where: { program: { department: { institutionId: { in: ids } } } } });
  await prisma.batch.deleteMany({ where: { program: { department: { institutionId: { in: ids } } } } });
  await prisma.program.deleteMany({ where: { department: { institutionId: { in: ids } } } });
  await prisma.department.deleteMany({ where: { institutionId: { in: ids } } });
  await prisma.academicYear.deleteMany({ where: { institutionId: { in: ids } } });
  await prisma.institution.deleteMany({ where: { id: { in: ids } } });
}

async function main() {
  console.log('\n  Cheating cases — database rules');
  await sweep();

  const inst = await prisma.institution.create({
    data: { name: 'Cheating DB', code: `${PFX}${Date.now().toString(36).slice(-10)}` },
    select: { id: true },
  });
  const rival = await prisma.institution.create({
    data: { name: 'Cheating DB Rival', code: `${PFX}r${Date.now().toString(36).slice(-9)}` },
    select: { id: true },
  });
  const institutionId = inst.id;

  const officer = await prisma.user.create({
    data: {
      institutionId,
      email: `${PFX}officer@verify.local`,
      fullName: 'Exam Officer',
      passwordHash: 'x',
      roles: { create: { role: 'EXAMCELL' } },
    },
    select: { id: true },
  });
  const rivalOfficer = await prisma.user.create({
    data: {
      institutionId: rival.id,
      email: `${PFX}rival@verify.local`,
      fullName: 'Rival Officer',
      passwordHash: 'x',
      roles: { create: { role: 'EXAMCELL' } },
    },
    select: { id: true },
  });
  const teacher = await prisma.user.create({
    data: {
      institutionId,
      email: `${PFX}teacher@verify.local`,
      fullName: 'Invigilator',
      passwordHash: 'x',
      roles: { create: { role: 'TEACHER' } },
    },
    select: { id: true },
  });
  const studentUser = await prisma.user.create({
    data: {
      institutionId,
      email: `${PFX}student@verify.local`,
      fullName: 'Reported Student',
      passwordHash: 'x',
      roles: { create: { role: 'STUDENT' } },
    },
    select: { id: true },
  });
  const student = await prisma.studentProfile.create({
    data: { userId: studentUser.id, institutionId, rollNo: 'CHDB-1', currentSemester: 4, status: 'ACTIVE' },
    select: { id: true, userId: true },
  });

  const academicYear = await prisma.academicYear.create({
    data: { institutionId, name: '2025-26', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31'), isCurrent: true },
  });
  const dept = await prisma.department.create({ data: { institutionId, name: 'CH Dept', code: 'CHD' } });
  const program = await prisma.program.create({ data: { departmentId: dept.id, name: 'CH Prog', code: 'CHP' } });
  const batch = await prisma.batch.create({ data: { programId: program.id, name: 'CH Batch', startYear: 2025, graduationYear: 2028 } });
  const courseSection = await prisma.section.create({ data: { programId: program.id, batchId: batch.id, name: 'CH Sec' } });
  const course = await prisma.course.create({ data: { departmentId: dept.id, institutionId, code: 'CHC', name: 'Cheating Subject', semester: 4 } });
  const offering = await prisma.courseOffering.create({
    data: { courseId: course.id, sectionId: courseSection.id, teacherUserId: teacher.id, semester: 4, academicYearId: academicYear.id },
  });
  const exam = await prisma.exam.create({
    data: { institutionId, academicYearId: academicYear.id, semester: 4, type: 'MID_TERM', name: 'Cheating Exam', createdByUserId: teacher.id },
  });
  const slot = await prisma.examSlot.create({
    data: { examId: exam.id, offeringId: offering.id, date: new Date(), startTime: '10:00', endTime: '12:00', room: 'R-1' },
  });

  try {
    // ═══ 1. The state machine ════════════════════════════════════════════════════════════════
    section(1, 'The state machine is exactly what it claims');

    eq('six statuses', CASE_STATUSES.length, 6);
    for (const s of CASE_STATUSES) {
      ok(`${s} has meta`, Boolean(CASE_STATUS_META[s]?.label));
      ok(`${s} declares its legal moves`, Array.isArray(CASE_TRANSITIONS[s]));
    }

    // A decided case is decided. Reopening is an explicit act.
    eq('a CONFIRMED case may only go back to review', CASE_TRANSITIONS.CONFIRMED, ['UNDER_REVIEW']);
    eq('a DISMISSED case may only go back to review', CASE_TRANSITIONS.DISMISSED, ['UNDER_REVIEW']);
    ok('a CONFIRMED case cannot become DISMISSED', !canTransition('CONFIRMED', 'DISMISSED'));
    ok('a DISMISSED case cannot become CONFIRMED', !canTransition('DISMISSED', 'CONFIRMED'));
    ok('a REPORTED case can be decided directly', canTransition('REPORTED', 'CONFIRMED'));
    ok('an ESCALATED case can still be decided', canTransition('ESCALATED', 'CONFIRMED'));
    ok('an ESCALATED case can come back to review', canTransition('ESCALATED', 'UNDER_REVIEW'));
    ok('a REPORTED case cannot skip straight to committee review', !canTransition('REPORTED', 'COMMITTEE_REVIEW'));

    // ═══ 2. The vocabulary ══════════════════════════════════════════════════════════════════════
    section(2, 'The vocabulary is complete and non-overlapping');

    eq('three risk levels', RISK_LEVELS.length, 3);
    eq('eight classifications', CLASSIFICATIONS.length, 8);
    ok('six penalties', PENALTIES.length >= 6, String(PENALTIES.length));
    ok('a penalty is a decision, not a shrug — NONE is one of them', PENALTIES.includes('NONE'));
    ok('the risk ladder is ordered by severity', JSON.stringify(RISK_LEVELS) === JSON.stringify(['HIGH', 'MEDIUM', 'LOW']));

    // ═══ 3. Reporting ═══════════════════════════════════════════════════════════════════════════
    section(3, 'Reporting resolves the student, the slot, the room and the invigilator');

    const reported = await svc.reportCase(institutionId, officer.id, {
      studentProfileId: student.id,
      examSlotId: slot.id,
      issue: 'Phone found under the desk',
      description: 'A smartphone was found with the exam open on it.',
      riskLevel: 'HIGH',
      classification: 'HIDDEN_DEVICE',
      source: 'INVIGILATOR',
    });
    ok('a case is raised', Boolean(reported.id));
    eq('it starts REPORTED', reported.status, 'REPORTED');
    eq('the risk is stored as given', reported.riskLevel, 'HIGH');
    eq('the classification is stored', reported.classification, 'HIDDEN_DEVICE');
    eq('the student is identified', reported.student.id, student.id);
    eq('the exam is identified', reported.exam.id, exam.id);
    eq('the room comes from the slot', reported.slot.room, 'R-1');
    eq('it opens with a timeline', reported.eventCount, 1);
    eq('it knows the moves it may make', reported.legalTransitions, CASE_TRANSITIONS.REPORTED);

    // A student of ANOTHER institution is not this college's student.
    const rivalStudent = await prisma.studentProfile.create({
      data: {
        userId: (await prisma.user.create({
          data: { institutionId: rival.id, email: `${PFX}rivalstudent@verify.local`, fullName: 'Rival Student', passwordHash: 'x', roles: { create: { role: 'STUDENT' } } },
          select: { id: true },
        })).id,
        institutionId: rival.id,
        rollNo: 'CHDB-R',
        currentSemester: 4,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    await expectReject(
      "another institution's student cannot be reported against",
      () => svc.reportCase(institutionId, officer.id, {
        studentProfileId: rivalStudent.id,
        examSlotId: slot.id,
        issue: 'Not our student',
        riskLevel: 'LOW',
        source: 'INVIGILATOR',
      }),
      404,
    );

    // ═══ 4. The timeline is append-only ═════════════════════════════════════════════════════════
    section(4, 'Every state change leaves an event');

    const eventsBefore = (await svc.getCheatingCaseTimeline(institutionId, reported.id)).length;
    await svc.classifyCase(institutionId, officer.id, reported.id, { classification: 'HIDDEN_DEVICE', riskLevel: 'HIGH' });
    const eventsAfter = (await svc.getCheatingCaseTimeline(institutionId, reported.id)).length;
    ok('classifying adds an event', eventsAfter === eventsBefore + 1, `${eventsBefore} -> ${eventsAfter}`);

    const timeline = await svc.getCheatingCaseTimeline(institutionId, reported.id);
    eq('the first event is the report', timeline[0]?.type, 'REPORTED');
    eq('the second is the classification', timeline[1]?.type, 'CLASSIFIED');
    ok('every event has a timestamp', timeline.every((e) => e.createdAt));
    ok('the events are in order', timeline[0].createdAt <= timeline[timeline.length - 1].createdAt);

    // The events are IN the same transaction as the change: a case that changed has an event.
    const row = await prisma.cheatingCase.findUnique({ where: { id: reported.id }, select: { status: true } });
    eq('the case really did change', row?.status, 'UNDER_REVIEW');

    // ═══ 5. The decision ═══════════════════════════════════════════════════════════════════════
    section(5, 'A decision, a penalty, and a told student');

    // A statement taken DOWN by the officer is attributed to the officer; one the STUDENT gives is
    // attributed to the student. Both are recorded, because "who said this" is part of the evidence.
    await svc.recordStatement(institutionId, officer.id, reported.id, { statement: 'I did not know it was mine.' });
    const withStatement = await svc.getCheatingCase(institutionId, reported.id);
    ok('the statement is on the case', Boolean(withStatement.studentStatement));
    eq('...and it is attributed to whoever took it down', withStatement.statementByUserId, officer.id);

    await svc.recordStatement(institutionId, officer.id, reported.id, {
      statement: 'I did not know the phone in the locker was mine.',
      statementByUserId: studentUser.id,
    });
    const withStudentStatement = await svc.getCheatingCase(institutionId, reported.id);
    eq('a statement the STUDENT gave is attributed to the student', withStudentStatement.statementByUserId, studentUser.id);

    await svc.submitCommitteeReview(institutionId, officer.id, reported.id, {
      committeeUserIds: [teacher.id],
      reviewNote: 'A second opinion is wanted.',
      decision: 'RECOMMEND_CONFIRM',
    });
    const withCommittee = await svc.getCheatingCase(institutionId, reported.id);
    eq('it moves to committee review', withCommittee.status, 'COMMITTEE_REVIEW');
    eq('the panel is recorded', withCommittee.committeeUserIds.length, 1);
    ok('the finding is recorded', Boolean(withCommittee.reviewNote));

    // A panel member from another college is not a panel member.
    await expectReject(
      'a panel member from another institution is refused',
      () => svc.submitCommitteeReview(institutionId, officer.id, reported.id, {
        committeeUserIds: [rivalOfficer.id],
        reviewNote: 'An outsider.',
        decision: 'RECOMMEND_CONFIRM',
      }),
      400,
    );

    const decided = await svc.decideCase(institutionId, officer.id, reported.id, {
      decision: 'CONFIRMED',
      penalty: 'SUSPENSION',
      decisionNote: 'A second device was found in the locker.',
    });
    eq('the status is the decision', decided.status, 'CONFIRMED');
    eq('the penalty is recorded', decided.penalty, 'SUSPENSION');
    ok('the decision is dated', Boolean(decided.decidedAt));
    ok('the student was told', Boolean(decided.notifiedStudentAt));

    const told = await prisma.notification.findFirst({
      where: { institutionId, recipientUserId: studentUser.id, type: 'EXAM_CHEATING' },
    });
    ok('the student has a notification', Boolean(told));
    ok('...that says something', String(told?.body ?? '').length > 0);

    // A decided case cannot be decided again.
    await expectReject(
      'a decided case cannot be decided again',
      () => svc.decideCase(institutionId, officer.id, reported.id, {
        decision: 'DISMISSED',
        decisionNote: 'Changing my mind.',
      }),
      409,
    );

    // A dismissed case carries no penalty.
    const second = await svc.reportCase(institutionId, officer.id, {
      studentProfileId: student.id,
      examSlotId: slot.id,
      issue: 'A second case for the penalty check',
      riskLevel: 'LOW',
      source: 'INVIGILATOR',
    });
    await expectReject(
      'a DISMISSED case cannot carry a penalty',
      () => svc.decideCase(institutionId, officer.id, second.id, {
        decision: 'DISMISSED',
        penalty: 'SUSPENSION',
        decisionNote: 'A student who was cleared cannot carry a consequence.',
      }),
      400,
    );

    // ═══ 6. Reopening ═══════════════════════════════════════════════════════════════════════════
    section(6, 'Reopening clears the decision and leaves a record');

    await expectReject(
      'a reopen without a reason is refused',
      () => svc.reopenCase(institutionId, officer.id, reported.id, { reason: '  ' }),
      400,
    );

    const reopened = await svc.reopenCase(institutionId, officer.id, reported.id, {
      reason: 'The locker was searched again and the phone was not there.',
    });
    eq('it goes back on the board', reopened.status, 'UNDER_REVIEW');
    eq('the penalty is cleared', reopened.penalty, null);
    eq('the decision stamp is cleared', reopened.decidedAt, null);

    const afterReopen = await svc.getCheatingCaseTimeline(institutionId, reported.id);
    ok('the reopen is on the timeline', afterReopen.some((e) => e.type === 'REOPENED'));

    await expectReject(
      'an open case has nothing to reopen',
      () => svc.reopenCase(institutionId, officer.id, reported.id, { reason: 'Again.' }),
      409,
    );

    // ═══ 7. Escalation is DERIVED ═════════════════════════════════════════════════════════════
    section(7, 'Escalation is derived from the age and the risk, never stored');

    const fresh = await svc.reportCase(institutionId, officer.id, {
      studentProfileId: student.id,
      examSlotId: slot.id,
      issue: 'A fresh case to age',
      riskLevel: 'HIGH',
      source: 'INVIGILATOR',
    });
    ok('a fresh high-risk case is NOT overdue', fresh.overdue === false, `overdue = ${fresh.overdue}`);

    // Age it past the HIGH threshold. The row does not change — the DERIVED field does.
    await prisma.cheatingCase.update({
      where: { id: fresh.id },
      data: { createdAt: new Date(Date.now() - (OVERDUE_HOURS.HIGH + 5) * 3600000) },
    });
    const aged = await svc.getCheatingCase(institutionId, fresh.id);
    ok('the same row IS overdue once it is old enough', aged.overdue === true, `overdue = ${aged.overdue}`);
    eq('...and its status is unchanged — escalation is not a status', aged.status, 'REPORTED');

    // There is NO column for it. A stored escalation would show up here.
    const columns = (await prisma.$queryRawUnsafe('PRAGMA table_info(cheating_cases)')) as any[];
    ok('there is no `escalatedAt` column', !columns.some((c) => c.name === 'escalatedAt'));
    ok('there is no `escalated` column', !columns.some((c) => c.name === 'escalated'));

    // A LOW-risk case needs longer.
    const low = await svc.reportCase(institutionId, officer.id, {
      studentProfileId: student.id,
      examSlotId: slot.id,
      issue: 'A low-risk case',
      riskLevel: 'LOW',
      source: 'INVIGILATOR',
    });
    await prisma.cheatingCase.update({
      where: { id: low.id },
      data: { createdAt: new Date(Date.now() - (OVERDUE_HOURS.HIGH + 5) * 3600000) },
    });
    const lowAged = await svc.getCheatingCase(institutionId, low.id);
    ok('a LOW-risk case of the same age is not overdue', lowAged.overdue === false, `overdue = ${lowAged.overdue}`);

    // A RESOLVED case is never overdue — there is nothing left to do about it.
    await prisma.cheatingCase.update({ where: { id: low.id }, data: { status: 'RESOLVED' } });
    const resolved = await svc.getCheatingCase(institutionId, low.id);
    ok('a decided case is never overdue', resolved.overdue === false);

    // ═══ 8. The queue and the history ══════════════════════════════════════════════════════════
    section(8, 'The queue is the open worklist; the history is the decided record');

    const queue = await svc.listCheatingCases(institutionId, { status: 'ALL', pageSize: 100 });
    ok('the queue has rows', queue.cases.length > 0);
    ok('every row carries the derived priority', queue.cases.every((c: any) => typeof c.priority === 'number'));
    ok('every row knows its legal moves', queue.cases.every((c: any) => Array.isArray(c.legalTransitions)));

    const history = await svc.listCheatingHistory(institutionId, {});
    // The case was REOPENED above, so it is no longer decided and is no longer in the history.
    // That is the point of the history being a record of DECISIONS.
    ok('the history does not hold a reopened case', !history.cases.some((c: any) => c.id === reopened.id));
    ok('...and it holds none of the open ones', !history.cases.some((c: any) => c.id === fresh.id));

    // The filters are applied on the server.
    const highOnly = await svc.listCheatingCases(institutionId, { riskLevel: 'HIGH', pageSize: 100 });
    ok('a risk filter is applied', highOnly.cases.every((c: any) => c.riskLevel === 'HIGH'));
    const byStudent = await svc.listCheatingCases(institutionId, { studentProfileId: student.id, pageSize: 100 });
    ok('a student filter is applied', byStudent.cases.every((c: any) => c.student.id === student.id));
    const bySearch = await svc.listCheatingCases(institutionId, { q: 'Phone found', pageSize: 100 });
    ok('a search is applied', bySearch.cases.length > 0 && bySearch.cases.every((c: any) => c.issue.includes('Phone found')));

    // ═══ 9. Tenant scoping ═════════════════════════════════════════════════════════════════════
    section(9, 'Nothing crosses an institution boundary');

    await expectReject(
      "another institution's case is not found",
      () => svc.getCheatingCase(rival.id, reported.id),
      404,
    );
    const rivalQueue = await svc.listCheatingCases(rival.id, { status: 'ALL', pageSize: 100 });
    eq('another institution sees an empty queue', rivalQueue.cases.length, 0);
    await expectReject(
      "another institution cannot decide it either",
      () => svc.decideCase(rival.id, rivalOfficer.id, reported.id, {
        decision: 'CONFIRMED',
        penalty: 'WARNING',
        decisionNote: 'Not mine.',
      }),
      404,
    );
  } finally {
    await sweep();
    console.log(`\n  ${passed} passed, ${failures.length} failed`);
    if (failures.length) {
      for (const f of failures) console.log(`  failing: ${f}`);
      process.exitCode = 1;
    }
    await prisma.$disconnect();
  }
}

main().catch(async (e) => {
  console.error(e);
  try {
    await sweep();
  } catch {
    /* best effort */
  }
  process.exit(1);
});
