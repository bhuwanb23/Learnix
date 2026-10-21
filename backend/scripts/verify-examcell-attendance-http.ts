// X-11 — The exam mark-roll: HTTP verification (docs/users/05 §3.1).
//
// Everything here is about the BOUNDARY, which a direct service call cannot see:
//
//   A 401 (not 500) with no token, and 403 — not 404, not an empty list — for a role with no
//   business in the examination office.
//   A that a MISSPELLED field in the mark-roll is REJECTED rather than silently dropped.
//   A that a student who is not on the roll is REFUSED over the wire, with a 422 that NAMES them.
//   A that marking is idempotent over the wire: the same roll submitted twice CORRECTS.
//   A that another institution's slot is a 404, at the wire and not just in the service.
//
// Run: npx tsx scripts/verify-examcell-attendance-http.ts
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';
import jwt from 'jsonwebtoken';
import { cleanupExamcell, eq, noteThrow, ok, report, section } from './examcell-dashboard.http-harness.js';

const app = createApp();
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const port = (server.address() as { port: number }).port;
const base = `http://127.0.0.1:${port}/api/v1/examcell`;

const stamp = Date.now().toString(36);
const PREFIX = `exatt-http-${stamp}`;

async function call(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown } = {},
) {
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
  data: { name: 'Exam Attendance HTTP', code: `exa${stamp}`.slice(0, 24) },
});
const rival = await prisma.institution.create({
  data: { name: 'Exam Attendance HTTP Rival', code: `exb${stamp}`.slice(0, 24) },
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
const teacherUser = await mkUser(institutionId, 'teacher', 'TEACHER');

const tokenFor = (userId: string, institution = institutionId, roles = ['EXAMCELL']) =>
  jwt.sign({ sub: userId, institutionId: institution, roles }, env.jwtAccessSecret, { expiresIn: '1h' });
const officerToken = tokenFor(officer);
const rivalToken = tokenFor(rivalOfficer, rival.id);
const teacherToken = tokenFor(teacherUser, institutionId, ['TEACHER']);

// A paper with three students on its roll.
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
  data: { institutionId, name: 'EX Att Dept', code: `EXA${stamp}`.slice(0, 12) },
});
const program = await prisma.program.create({
  data: { departmentId: dept.id, name: 'EX Att Programme', code: `EXAP${stamp}`.slice(0, 12) },
});
const batch = await prisma.batch.create({
  data: { programId: program.id, name: 'Batch 2025', startYear: 2025, graduationYear: 2029 },
});
const sectionRow = await prisma.section.create({
  data: { programId: program.id, batchId: batch.id, name: 'A', currentSemester: 1 },
});
const course = await prisma.course.create({
  data: { institutionId, departmentId: dept.id, code: `EXAC${stamp}`.slice(0, 12), name: 'Attendance Course', semester: 4 },
});
const offering = await prisma.courseOffering.create({
  data: {
    courseId: course.id,
    sectionId: sectionRow.id,
    teacherUserId: teacherUser,
    semester: 4,
    academicYearId: academicYear.id,
  },
});
const exam = await prisma.exam.create({
  data: {
    institutionId,
    academicYearId: academicYear.id,
    semester: 4,
    type: 'FINAL',
    name: `Attendance exam ${stamp}`,
    createdByUserId: officer,
    status: 'SCHEDULED',
  },
});
const slot = await prisma.examSlot.create({
  data: {
    examId: exam.id,
    offeringId: offering.id,
    date: new Date(Date.now() + 86400000),
    startTime: '09:00',
    endTime: '12:00',
    seats: 30,
    status: 'SCHEDULED',
  },
});

const students = [];
for (let i = 0; i < 3; i += 1) {
  const sp = await prisma.studentProfile.create({
    data: {
      userId: (
        await prisma.user.create({
          data: {
            institutionId,
            email: `roll${i}@${PREFIX}.dev`,
            fullName: `Roll student ${i}`,
            passwordHash: 'x',
            roles: { create: { role: 'STUDENT' } },
          },
          select: { id: true },
        })
      ).id,
      institutionId,
      rollNo: `EXA-${i}`,
      currentSemester: 4,
      status: 'ACTIVE',
    },
    select: { id: true, userId: true },
  });
  students.push(sp);
  await prisma.enrollment.create({
    data: { offeringId: offering.id, studentProfileId: sp.id, status: 'ACTIVE' },
  });
}
// A fourth student who is NOT on the roll.
const outsiderUser = await prisma.user.create({
  data: {
    institutionId,
    email: `outsider@${PREFIX}.dev`,
    fullName: 'Outsider',
    passwordHash: 'x',
    roles: { create: { role: 'STUDENT' } },
  },
  select: { id: true },
});
const outsider = await prisma.studentProfile.create({
  data: {
    userId: outsiderUser.id,
    institutionId,
    rollNo: 'EXA-OUT',
    currentSemester: 4,
    status: 'ACTIVE',
  },
  select: { id: true },
});

async function cleanup() {
  await cleanupExamcell([institutionId, rival.id], createdUsers);
  await prisma.enrollment.deleteMany({ where: { offeringId: offering.id } });
  await prisma.hallTicket.deleteMany({ where: { examSlotId: slot.id } });
  await prisma.examSlot.delete({ where: { id: slot.id } });
  await prisma.exam.delete({ where: { id: exam.id } });
  await prisma.courseOffering.delete({ where: { id: offering.id } });
  await prisma.section.delete({ where: { id: sectionRow.id } });
  await prisma.batch.delete({ where: { id: batch.id } });
  await prisma.program.delete({ where: { id: program.id } });
  await prisma.course.delete({ where: { id: course.id } });
  await prisma.studentProfile.deleteMany({ where: { institutionId } });
  await prisma.department.delete({ where: { id: dept.id } });
  await prisma.academicYear.delete({ where: { id: academicYear.id } });
  // The STUDENT users were created inline, so they are swept by their email — every user this
  // suite made carries the prefix. Their roles go first: a role row references the user and does
  // not cascade.
  const suiteUsers = await prisma.user.findMany({
    where: { email: { endsWith: `@${PREFIX}.dev` } },
    select: { id: true },
  });
  const suiteUserIds = [...new Set([...createdUsers, ...suiteUsers.map((u) => u.id)])];
  await prisma.userRole.deleteMany({ where: { userId: { in: suiteUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: suiteUserIds } } });
  await prisma.institution.deleteMany({ where: { id: { in: [inst.id, rival.id] } } });
}

try {
  // ═══ 1. Authentication and authorisation ═══════════════════════════════════════════════════
  section('1. Authentication and authorisation');

  const noToken = await call('GET', `/attendance/slots/${slot.id}`);
  eq(noToken.status, 401, 'no token is 401, not 500');

  const teacher = await call('GET', `/attendance/slots/${slot.id}`, { token: teacherToken });
  eq(teacher.status, 403, 'a teacher has no business taking an exam roll');

  const rivalRoll = await call('GET', `/attendance/slots/${slot.id}`, { token: rivalToken });
  eq(rivalRoll.status, 404, "another institution's officer cannot read the roll");

  // ═══ 2. The roll ═══════════════════════════════════════════════════════════════════════════
  section('2. The roll');

  const roll = await call('GET', `/attendance/slots/${slot.id}`, { token: officerToken });
  eq(roll.status, 200, 'the roll is served');
  eq(roll.data?.total, 3, 'it has the three enrolled students');
  ok(roll.data?.rows?.every((r: any) => r.state === 'UNMARKED'), 'and every one starts UNMARKED');
  eq(roll.data?.counts?.UNMARKED, 3, 'the unmarked count agrees');
  eq(roll.data?.counts?.ABSENT, 0, 'and nobody is counted ABSENT');
  eq(roll.data?.counts?.PRESENT, 0, 'and nobody is counted PRESENT');
  eq(roll.data?.marked, false, 'and it says the roll has NOT been taken');
  ok(roll.data?.slot?.courseName, 'it carries the paper');
  ok(roll.data?.rows?.every((r: any) => r.rollNo && r.name), 'every row carries a name and a roll number');

  // ═══ 3. Marking the roll ═════════════════════════════════════════════════════════════════════
  section('3. Marking the roll');

  const marked = await call('POST', `/attendance/slots/${slot.id}`, {
    token: officerToken,
    body: {
      marks: [
        { studentProfileId: students[0]!.id, state: 'PRESENT' },
        { studentProfileId: students[1]!.id, state: 'ABSENT' },
      ],
    },
  });
  eq(marked.status, 200, 'the roll is saved');
  eq(marked.data?.marked, 2, 'it reports the marks it took');
  eq(marked.data?.present, 1, 'the present count');
  eq(marked.data?.absent, 1, 'the absent count');

  const afterMark = await call('GET', `/attendance/slots/${slot.id}`, { token: officerToken });
  eq(afterMark.data?.counts?.PRESENT, 1, 'the roll now shows one present');
  eq(afterMark.data?.counts?.ABSENT, 1, 'and one absent');
  eq(afterMark.data?.counts?.UNMARKED, 1, 'and one still unmarked');
  eq(afterMark.data?.marked, true, 'and the roll is marked');

  // THE REFUSALS.
  const offRoll = await call('POST', `/attendance/slots/${slot.id}`, {
    token: officerToken,
    body: { marks: [{ studentProfileId: outsider.id, state: 'PRESENT' }] },
  });
  eq(offRoll.status, 422, 'a student who is not on the roll is refused');
  ok(Array.isArray(offRoll.json?.error?.details?.offRoll), 'and the error NAMES them');
  eq(offRoll.json?.error?.details?.offRoll?.[0]?.studentProfileId, outsider.id, 'by id');
  ok(offRoll.json?.error?.details?.offRoll?.[0]?.rollNo, 'and by roll number');

  const empty = await call('POST', `/attendance/slots/${slot.id}`, {
    token: officerToken,
    body: { marks: [] },
  });
  eq(empty.status, 400, 'an empty mark-roll is rejected by the schema');

  const badState = await call('POST', `/attendance/slots/${slot.id}`, {
    token: officerToken,
    body: { marks: [{ studentProfileId: students[2]!.id, state: 'LATE' }] },
  });
  eq(badState.status, 422, 'a bad state is refused');
  ok(Array.isArray(badState.json?.error?.details?.allowed), 'and it says what IS allowed');

  const typo = await call('POST', `/attendance/slots/${slot.id}`, {
    token: officerToken,
    body: { marks: [{ studentProfileId: students[2]!.id, state: 'PRESENT' }], markss: [] },
  });
  eq(typo.status, 400, 'a MISSPELLED field is rejected rather than ignored');

  const teacherMark = await call('POST', `/attendance/slots/${slot.id}`, {
    token: teacherToken,
    body: { marks: [{ studentProfileId: students[2]!.id, state: 'PRESENT' }] },
  });
  eq(teacherMark.status, 403, 'a teacher cannot take the roll');

  // ═══ 4. Idempotency over the wire ══════════════════════════════════════════════════════════
  section('4. Marking twice CORRECTS rather than duplicates');

  const corrected = await call('POST', `/attendance/slots/${slot.id}`, {
    token: officerToken,
    body: { marks: [{ studentProfileId: students[1]!.id, state: 'PRESENT' }] },
  });
  eq(corrected.status, 200, 'the correction is accepted');
  const rows = await prisma.examAttendance.findMany({ where: { examSlotId: slot.id } });
  eq(rows.length, 2, 'and it did NOT duplicate the row');
  eq(rows.find((r) => r.studentProfileId === students[1]!.id)?.state, 'PRESENT', '...and the state was corrected');

  // ═══ 5. The summary ═══════════════════════════════════════════════════════════════════════════
  section('5. The summary');

  const summary = await call('GET', '/attendance/summary', { token: officerToken });
  eq(summary.status, 200, 'the summary is served');
  ok(Array.isArray(summary.data?.slots), 'it lists the papers');
  ok(typeof summary.data?.totals?.PRESENT === 'number', 'it counts the present');
  ok(typeof summary.data?.totals?.ABSENT === 'number', 'it counts the absent');
  ok(typeof summary.data?.totals?.UNMARKED === 'number', 'it counts the unmarked');
  eq(summary.data?.marked, true, 'and it says a roll has been taken');

  const paper = summary.data?.slots?.find((s: any) => s.slotId === slot.id);
  ok('the paper is in the summary', paper !== undefined);
  eq(paper?.present, 2, '...with its present count');
  eq(paper?.absent, 0, '...its absent count');
  eq(paper?.unmarked, 1, '...its unmarked count');
  ok('...and it is NOT complete, because one student is unmarked', paper?.complete === false);
} catch (e) {
  noteThrow(e);
} finally {
  await cleanup();
  report('Exam mark-roll HTTP verification');
  await prisma.$disconnect();
  server.close();
}
