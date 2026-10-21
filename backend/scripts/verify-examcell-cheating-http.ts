// X-08 — Cheating cases: HTTP verification (docs/users/05 §3.6).
//
// Everything here is about the BOUNDARY, which a direct service call cannot see:
//
//   A 401 (not 500) with no token, and 403 — not 404, not an empty list — for a role
//   with no business seeing the cases.
//   A that a MISSPELLED field is REJECTED rather than silently dropped. A body the server
//   ignores returns everything and looks like it worked.
//   A that `.strict()` really is strict: a typo'd field must be a 400 and must not half-
//   create a case.
//   A that the STATE MACHINE is enforced over the wire. A case that has been confirmed
//   cannot be quietly re-decided, and a dismissed case carries no penalty.
//   A that another institution's ids are invisible AT THE WIRE, not just in the service.
//   A that the student is actually TOLD when their case is decided, and that the fact of
//   telling them is recorded.
//
// Run: npx tsx scripts/verify-examcell-cheating-http.ts
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';
import jwt from 'jsonwebtoken';

let pass = 0;
let fail = 0;
const failures: string[] = [];

function ok(cond: unknown, label: string, detail = '') {
  if (cond) {
    pass += 1;
    console.log(`  ok  ${label}${detail ? ` (${detail})` : ''}`);
  } else {
    fail += 1;
    failures.push(label);
    console.log(`  FAIL ${label}${detail ? ` (${detail})` : ''}`);
  }
}
function eq(a: unknown, b: unknown, label: string, detail = '') {
  ok(
    a === b,
    label,
    a === b ? '' : `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}${detail ? ` — ${detail}` : ''}`,
  );
}
const section = (n: string) => console.log(`\n── ${n}`);

const app = createApp();
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const port = (server.address() as { port: number }).port;
// The router is mounted at `/api/v1/examcell`, so every path below is written as it
// appears INSIDE that router (`/cheating-cases/...`).
const base = `http://127.0.0.1:${port}/api/v1/examcell`;

const stamp = Date.now().toString(36);
const PREFIX = `ch-http-${stamp}`;

async function call(method: string, path: string, opts: { token?: string; body?: unknown } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json, data: json?.data };
}

const inst = await prisma.institution.create({
  data: { name: 'Cheating HTTP', code: `chh${stamp}`.slice(0, 24) },
});
const rival = await prisma.institution.create({
  data: { name: 'Cheating HTTP Rival', code: `chr${stamp}`.slice(0, 24) },
});
const institutionId = inst.id;

const createdUsers: string[] = [];
async function mkUser(institution: string, tag: string, role: string) {
  const u = await prisma.user.create({
    data: {
      institutionId: institution,
      email: `${tag}@${PREFIX}.dev`,
      fullName: `${tag} person`,
      passwordHash: 'x',
      roles: { create: { role: role as any } },
    },
    select: { id: true },
  });
  createdUsers.push(u.id);
  return u.id;
}

const officer = await mkUser(institutionId, 'officer', 'EXAMCELL');
const rivalOfficer = await mkUser(rival.id, 'rival', 'EXAMCELL');
const teacher = await mkUser(institutionId, 'teacher', 'TEACHER');
const other = await mkUser(institutionId, 'other', 'STUDENT');

// The token is signed with the app's OWN access secret, read from the env the app reads — a token
// signed with a guess is a 401, and a suite that reports "the exam cell refused us" when the real
// problem is the signature teaches the wrong lesson.
const tokenFor = (userId: string, institution = institutionId, roles = ['EXAMCELL']) =>
  jwt.sign({ sub: userId, institutionId: institution, roles }, env.jwtAccessSecret, { expiresIn: '1h' });
const officerToken = tokenFor(officer);
const rivalToken = tokenFor(rivalOfficer, rival.id);

// A student to report against. The `other` user was created with the STUDENT role, so it can
// carry a profile directly.
const student = await prisma.studentProfile.create({
  data: { userId: other, institutionId, rollNo: 'CH-001', currentSemester: 4, status: 'ACTIVE' },
  select: { id: true, userId: true },
});

const academicYear = await prisma.academicYear.create({
  data: {
    institutionId,
    name: '2025-26',
    startDate: new Date('2025-06-01'),
    endDate: new Date('2026-05-31'),
    isCurrent: true,
  },
});
const dept = await prisma.department.create({
  data: { institutionId, name: 'CH Dept', code: `CHD${stamp}`.slice(0, 12) },
});
const program = await prisma.program.create({
  data: { departmentId: dept.id, name: 'CH Prog', code: `CHP${stamp}`.slice(0, 12) },
});
const batch = await prisma.batch.create({
  data: { programId: program.id, name: 'CH Batch', startYear: 2025, graduationYear: 2028 },
});
const courseSection = await prisma.section.create({
  data: { programId: program.id, batchId: batch.id, name: 'CH Sec' },
});
const course = await prisma.course.create({
  data: {
    departmentId: dept.id,
    institutionId,
    code: `CHC${stamp}`.slice(0, 12),
    name: 'Cheating Subject',
    semester: 4,
  },
});
const offering = await prisma.courseOffering.create({
  data: {
    courseId: course.id,
    sectionId: courseSection.id,
    teacherUserId: teacher,
    semester: 4,
    academicYearId: academicYear.id,
  },
});
const exam = await prisma.exam.create({
  data: {
    institutionId,
    academicYearId: academicYear.id,
    semester: 4,
    type: 'MID_TERM',
    name: 'Cheating Exam',
    createdByUserId: teacher,
  },
});
const slot = await prisma.examSlot.create({
  data: {
    examId: exam.id,
    offeringId: offering.id,
    date: new Date(),
    startTime: '10:00',
    endTime: '12:00',
    room: 'R-1',
  },
});
const rivalAcademicYear = await prisma.academicYear.create({
  data: {
    institutionId: rival.id,
    name: '2025-26',
    startDate: new Date('2025-06-01'),
    endDate: new Date('2026-05-31'),
    isCurrent: true,
  },
});
const rivalExam = await prisma.exam.create({
  data: {
    institutionId: rival.id,
    academicYearId: rivalAcademicYear.id,
    semester: 4,
    type: 'MID_TERM',
    name: 'Rival Exam',
    createdByUserId: rivalOfficer,
  },
});
const rivalSlot = await prisma.examSlot.create({
  data: {
    examId: rivalExam.id,
    offeringId: offering.id,
    date: new Date(),
    startTime: '10:00',
    endTime: '12:00',
  },
});


async function cleanup() {
  const ids = createdUsers;
  await prisma.cheatingCaseEvent.deleteMany({ where: { cheatingCase: { studentProfileId: student.id } } });
  await prisma.cheatingCaseEvidence.deleteMany({ where: { cheatingCase: { studentProfileId: student.id } } });
  await prisma.cheatingCase.deleteMany({ where: { studentProfileId: student.id } });
  await prisma.examSlot.deleteMany({ where: { id: { in: [slot.id, rivalSlot.id] } } });
  await prisma.exam.deleteMany({ where: { id: { in: [exam.id, rivalExam.id] } } });
  await prisma.notification.deleteMany({ where: { institutionId } });
  await prisma.userRole.deleteMany({ where: { userId: { in: ids } } });
  await prisma.studentProfile.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.courseOffering.deleteMany({ where: { id: offering.id } });
  // The academic tree hangs off the institution, not off it: deleting the institution leaves the
  // department, program, batch and section behind, and they accumulate on every run.
  //
  // The order matters and the FKs are the reason. `courses` points at `departments`, so the course
  // must go BEFORE the department — and a delete that is refused leaves the debris in place, which is
  // worse than not trying, because the next run adds another one.
  await prisma.course.deleteMany({ where: { id: course.id } });
  await prisma.section.deleteMany({ where: { id: courseSection.id } });
  await prisma.batch.deleteMany({ where: { id: batch.id } });
  await prisma.program.deleteMany({ where: { id: program.id } });
  await prisma.department.deleteMany({ where: { id: dept.id } });
  await prisma.academicYear.deleteMany({ where: { id: { in: [academicYear.id, rivalAcademicYear.id] } } });
  // The institution goes LAST: the academic tree hangs off it, and a delete refused halfway leaves
  // every one of those rows behind for the next run to trip over.
  await prisma.institution.deleteMany({ where: { id: { in: [institutionId, rival.id] } } });
}

try {
  // ═══ 1. The gate ═══════════════════════════════════════════════════════════════════════════
  section('1. The gate');

  const noToken = await call('GET', '/cheating-cases');
  eq(noToken.status, 401, 'no token is 401, not 500');

  const noRole = await call('GET', '/cheating-cases', { token: tokenFor(teacher, institutionId, ['TEACHER']) });
  eq(noRole.status, 403, 'a teacher is 403, not 404 and not an empty list');

  const officerList = await call('GET', '/cheating-cases', { token: officerToken });
  eq(officerList.status, 200, 'an EXAMCELL officer reads the queue');
  ok(Array.isArray(officerList.data?.cases), 'the queue is a list');
  ok(typeof officerList.data?.pagination?.total === 'number', 'the queue is paged');
  ok(Boolean(officerList.data?.stats), 'the queue carries its counts');

  // ═══ 2. The catalogue ═══════════════════════════════════════════════════════════════════════
  section('2. The catalogue');

  const cat = await call('GET', '/cheating-cases/catalogue', { token: officerToken });
  eq(cat.status, 200, 'the catalogue is served');
  eq(cat.data?.blocks?.length, 5, 'it publishes five blocks');
  ok(cat.data?.statuses?.length === 6, 'six case statuses');
  ok(cat.data?.riskLevels?.length === 3, 'three risk levels');
  ok(cat.data?.classifications?.length === 8, 'eight classifications');
  ok(cat.data?.penalties?.length === 6, 'six penalties');
  ok(typeof cat.data?.stats?.total === 'number', 'the catalogue counts the cases');

  // ═══ 3. Reporting ═══════════════════════════════════════════════════════════════════════════
  section('3. Reporting');

  const badStudent = await call('POST', '/cheating-cases', {
    token: officerToken,
    body: { studentProfileId: 'not-a-real-student', examSlotId: slot.id, issue: 'Nothing here', riskLevel: 'LOW', source: 'INVIGILATOR' },
  });
  eq(badStudent.status, 404, 'a student who is not here is 404');

  const badSlot = await call('POST', '/cheating-cases', {
    token: officerToken,
    body: { studentProfileId: student.id, examSlotId: rivalSlot.id, issue: 'Wrong college', riskLevel: 'LOW', source: 'INVIGILATOR' },
  });
  eq(badSlot.status, 404, "another institution's exam slot is 404");

  const badRisk = await call('POST', '/cheating-cases', {
    token: officerToken,
    body: { studentProfileId: student.id, examSlotId: slot.id, issue: 'Bad risk', riskLevel: 'EXTREME', source: 'INVIGILATOR' },
  });
  eq(badRisk.status, 400, 'an invented risk level is 400');

  const badSource = await call('POST', '/cheating-cases', {
    token: officerToken,
    body: { studentProfileId: student.id, examSlotId: slot.id, issue: 'Bad source', riskLevel: 'LOW', source: 'GOSSIP' },
  });
  eq(badSource.status, 400, 'an invented source is 400');

  const typo = await call('POST', '/cheating-cases', {
    token: officerToken,
    body: { studentProfileId: student.id, examSlotId: slot.id, issue: 'Typo field', riskLevel: 'LOW', source: 'INVIGILATOR', riskLevelTypo: 'HIGH' },
  });
  eq(typo.status, 400, 'a typo\'d field is 400, not silently dropped');
  const afterTypo = await prisma.cheatingCase.count({ where: { studentProfileId: student.id } });
  eq(afterTypo, 0, 'and it half-created nothing');

  const reported = await call('POST', '/cheating-cases', {
    token: officerToken,
    body: {
      studentProfileId: student.id,
      examSlotId: slot.id,
      issue: 'Phone found under the desk',
      description: 'A smartphone was found with the exam open on it.',
      riskLevel: 'HIGH',
      classification: 'HIDDEN_DEVICE',
      source: 'INVIGILATOR',
    },
  });
  eq(reported.status, 201, 'a case is raised');
  const caseId = reported.data?.id;
  ok(Boolean(caseId), 'the new case has an id');
  eq(reported.data?.status, 'REPORTED', 'a new case starts REPORTED');
  eq(reported.data?.riskLevel, 'HIGH', 'the risk is stored as given');
  eq(reported.data?.classification, 'HIDDEN_DEVICE', 'the classification is stored');
  eq(reported.data?.student?.rollNo, 'CH-001', 'the student is identified');
  eq(reported.data?.exam?.name, 'Cheating Exam', 'the exam is identified');
  eq(reported.data?.slot?.room, 'R-1', 'the room is identified');
  eq(reported.data?.eventCount, 1, 'the case opens with a timeline');
  ok(reported.data?.legalTransitions?.includes('UNDER_REVIEW'), 'it knows the moves it may make');

  // ═══ 4. The state machine ═════════════════════════════════════════════════════════════════════
  section('4. The state machine over the wire');

  const classified = await call('POST', `/cheating-cases/${caseId}/classify`, {
    token: officerToken,
    body: { classification: 'HIDDEN_DEVICE', riskLevel: 'HIGH' },
  });
  eq(classified.status, 200, 'a case is classified');
  eq(classified.data?.status, 'UNDER_REVIEW', 'classifying a REPORTED case moves it into review');

  const badClass = await call('POST', `/cheating-cases/${caseId}/classify`, {
    token: officerToken,
    body: { classification: 'NOT_A_CLASSIFICATION' },
  });
  eq(badClass.status, 400, 'an invented classification is 400');

  const statement = await call('POST', `/cheating-cases/${caseId}/statement`, {
    token: officerToken,
    body: { statement: 'I did not know the phone was mine.' },
  });
  eq(statement.status, 200, 'a student statement is recorded');
  ok(Boolean(statement.data?.studentStatement), 'the statement is on the case');

  const emptyStatement = await call('POST', `/cheating-cases/${caseId}/statement`, {
    token: officerToken,
    body: { statement: '   ' },
  });
  eq(emptyStatement.status, 400, 'an empty statement is refused');

  const committee = await call('POST', `/cheating-cases/${caseId}/committee-review`, {
    token: officerToken,
    body: { committeeUserIds: [teacher], reviewNote: 'A second opinion is wanted.', decision: 'RECOMMEND_CONFIRM' },
  });
  eq(committee.status, 200, 'a case goes to a committee');
  eq(committee.data?.status, 'COMMITTEE_REVIEW', 'it moves to committee review');
  ok(committee.data?.committeeUserIds?.length === 1, 'the panel is recorded');

  const foreignCommittee = await call('POST', `/cheating-cases/${caseId}/committee-review`, {
    token: officerToken,
    body: { committeeUserIds: [rivalOfficer], reviewNote: 'An outsider on the panel.', decision: 'RECOMMEND_CONFIRM' },
  });
  eq(foreignCommittee.status, 400, "a panel member from another institution is refused");

  // The decision.
  const decided = await call('POST', `/cheating-cases/${caseId}/decide`, {
    token: officerToken,
    body: { decision: 'CONFIRMED', penalty: 'SUSPENSION', decisionNote: 'A second device was found in the locker.' },
  });
  eq(decided.status, 200, 'a case is decided');
  eq(decided.data?.status, 'CONFIRMED', 'the status is the decision');
  eq(decided.data?.penalty, 'SUSPENSION', 'the penalty is recorded');
  ok(Boolean(decided.data?.decidedAt), 'the decision is dated');
  ok(Boolean(decided.data?.notifiedStudentAt), 'the student was told');
  ok(decided.data?.legalTransitions?.length === 1, 'a decided case offers only one move');
  eq(decided.data?.legalTransitions?.[0], 'UNDER_REVIEW', 'and that move is to reopen it');

  // A penalty on a DISMISSED case is a contradiction the server refuses.
  const second = await call('POST', '/cheating-cases', {
    token: officerToken,
    body: { studentProfileId: student.id, examSlotId: slot.id, issue: 'A second case for the penalty check', riskLevel: 'LOW', source: 'INVIGILATOR' },
  });
  const secondId = second.data?.id;
  const penalisedDismissal = await call('POST', `/cheating-cases/${secondId}/decide`, {
    token: officerToken,
    body: { decision: 'DISMISSED', penalty: 'SUSPENSION', decisionNote: 'A student who was cleared cannot carry a consequence.' },
  });
  eq(penalisedDismissal.status, 400, 'a DISMISSED case cannot carry a penalty');

  const reDecided = await call('POST', `/cheating-cases/${caseId}/decide`, {
    token: officerToken,
    body: { decision: 'DISMISSED', decisionNote: 'Changing my mind.' },
  });
  eq(reDecided.status, 409, 'a decided case cannot be decided again');

  const noNote = await call('POST', `/cheating-cases/${secondId}/decide`, {
    token: officerToken,
    body: { decision: 'DISMISSED' },
  });
  eq(noNote.status, 400, 'a decision without a reason is refused');

  // The student was told, in their own inbox.
  const told = await prisma.notification.findFirst({
    where: { institutionId, recipientUserId: student.userId, type: 'EXAM_CHEATING' },
  });
  ok(Boolean(told), 'the student has a notification about the decision');
  ok(String(told?.body ?? '').length > 0, 'and it says something');

  // ═══ 5. Reopening ═════════════════════════════════════════════════════════════════════════════
  section('5. Reopening');

  const noReason = await call('POST', `/cheating-cases/${caseId}/reopen`, {
    token: officerToken,
    body: { reason: '   ' },
  });
  eq(noReason.status, 400, 'a reopen without a reason is refused');

  const reopened = await call('POST', `/cheating-cases/${caseId}/reopen`, {
    token: officerToken,
    body: { reason: 'The locker was searched again and the phone was not there.' },
  });
  eq(reopened.status, 200, 'a decided case can be reopened');
  eq(reopened.data?.status, 'UNDER_REVIEW', 'it goes back on the board');
  eq(reopened.data?.penalty, null, 'the penalty is cleared');
  ok(reopened.data?.decidedAt === null, 'the decision stamp is cleared');

  const reopenedTwice = await call('POST', `/cheating-cases/${caseId}/reopen`, {
    token: officerToken,
    body: { reason: 'Again.' },
  });
  eq(reopenedTwice.status, 409, 'an open case has nothing to reopen');

  // ═══ 6. Tenant scoping at the wire ═══════════════════════════════════════════════════════════
  section('6. Tenant scoping');

  const rivalRead = await call('GET', `/cheating-cases/${caseId}`, { token: rivalToken });
  eq(rivalRead.status, 404, "another institution's case is 404, not 403");

  const rivalDecide = await call('POST', `/cheating-cases/${caseId}/decide`, {
    token: rivalToken,
    body: { decision: 'CONFIRMED', penalty: 'WARNING', decisionNote: 'Not mine to decide.' },
  });
  eq(rivalDecide.status, 404, "another institution cannot decide it either");

  const rivalList = await call('GET', '/cheating-cases', { token: rivalToken });
  eq(rivalList.status, 200, "the rival's own queue answers");
  eq(rivalList.data?.pagination?.total, 0, 'and it is empty');

  // ═══ 7. The history ═══════════════════════════════════════════════════════════════════════════
  section('7. The history');

  const history = await call('GET', '/cheating-cases/history', { token: officerToken });
  eq(history.status, 200, 'the history is served');
  eq(history.data?.cases?.length, 0, 'an open case is not in the history');
  ok(typeof history.data?.pagination?.total === 'number', 'the history is paged');

  const secondId2 = secondId;
  await call('POST', `/cheating-cases/${secondId2}/decide`, {
    token: officerToken,
    body: { decision: 'DISMISSED', decisionNote: 'No misconduct found.' },
  });
  const history2 = await call('GET', '/cheating-cases/history', { token: officerToken });
  eq(history2.data?.cases?.length, 1, 'a decided case IS in the history');
  eq(history2.data?.cases?.[0]?.status, 'DISMISSED', 'and it carries its decision');

  // ═══ 8. The report context ═══════════════════════════════════════════════════════════════════
  section('8. The report context');

  const ctx = await call('GET', `/cheating-cases/report-context/${slot.id}`, { token: officerToken });
  eq(ctx.status, 200, 'the report context is served');
  ok(Boolean(ctx.data?.slot?.id), 'it carries the slot');
  ok(Array.isArray(ctx.data?.students), 'it carries the roster');

  const foreignCtx = await call('GET', `/cheating-cases/report-context/${rivalSlot.id}`, { token: officerToken });
  eq(foreignCtx.status, 404, "another institution's slot is 404");

  const slots = await call('GET', '/cheating-cases/reportable-slots', { token: officerToken });
  eq(slots.status, 200, 'the reportable slots are served');
  ok(Array.isArray(slots.data), 'and they are a list');
} catch (e) {
  fail += 1;
  failures.push(`threw: ${(e as Error).message}`);
  console.error(e);
} finally {
  await cleanup();
  console.log(`\n${pass} passed, ${fail} failed`);
  if (failures.length) {
    for (const f of failures) console.log(`  ! ${f}`);
    process.exit(1);
  }
  console.log('Cheating cases HTTP verification OK');
  await prisma.$disconnect();
  server.close();
}
