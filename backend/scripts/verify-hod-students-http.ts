// HD-05 — The HOD's Students desk: HTTP verification (docs/users/11 §3.4).
//
// Everything here is about the BOUNDARY, which a direct service call cannot see:
//
//   A 401 (not 500) with no token, and 403 — not 404, not an empty list — for a role with no
//     business in the department's students.
//   A that a MISSPELLED query param is REJECTED rather than silently dropped.
//   A that the OLD `GET /hod/students` still answers, unchanged.
//   A that another institution's student is invisible AT THE WIRE.
//   A that the intervention write is real: it persists, it audits, and it refuses a colleague's
//     student.
//
// Run: node node_modules/tsx/dist/cli.mjs scripts/verify-hod-students-http.ts
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';
import jwt from 'jsonwebtoken';
import { eq, noteThrow, ok, report, section } from './hod-students.http-harness.js';

const app = createApp();
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const port = (server.address() as { port: number }).port;
const base = `http://127.0.0.1:${port}/api/v1/hod`;

const stamp = Date.now().toString(36);
const PREFIX = `hodshhttp-${stamp}`;

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
  data: { name: 'HOD Students HTTP', code: `hdsh${stamp}`.slice(0, 24) },
});
const rival = await prisma.institution.create({
  data: { name: 'HOD Students HTTP Rival', code: `hdshr${stamp}`.slice(0, 24) },
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

const hodUser = await mkUser(institutionId, 'hod', 'HOD');
const rivalHod = await mkUser(rival.id, 'rivalhod', 'HOD');
const teacherUser = await mkUser(institutionId, 'teacher', 'TEACHER');
const studentUser = await mkUser(institutionId, 'student', 'STUDENT');

const dept = await prisma.department.create({
  data: { institutionId, name: 'HOD Students HTTP Dept', code: `HDSH${stamp}`.slice(0, 12), hodUserId: hodUser },
});
const rivalDept = await prisma.department.create({
  data: { institutionId: rival.id, name: 'Rival Dept', code: `HDSHR${stamp}`.slice(0, 12), hodUserId: rivalHod },
});
const program = await prisma.program.create({
  data: { departmentId: dept.id, name: 'Students HTTP Programme', code: `HDSHP${stamp}`.slice(0, 12) },
});
const batch = await prisma.batch.create({
  data: { programId: program.id, name: `Batch ${stamp}`, startYear: 2024, graduationYear: 2028 },
});
const sectionRow = await prisma.section.create({
  data: { programId: program.id, batchId: batch.id, name: `Section ${stamp}`, currentSemester: 3 },
});
const academicYear = await prisma.academicYear.create({
  data: {
    institutionId,
    name: `AY ${stamp}`,
    startDate: new Date('2025-07-01'),
    endDate: new Date('2026-05-31'),
    isCurrent: true,
    semesterCount: 8,
  },
});
const course = await prisma.course.create({
  data: { institutionId, departmentId: dept.id, code: `CSA${stamp}`.slice(0, 12), name: 'Course Alpha', credits: 4, semester: 3, type: 'CORE' },
});
const offering = await prisma.courseOffering.create({
  data: { courseId: course.id, sectionId: sectionRow.id, teacherUserId: teacherUser, semester: 3, academicYearId: academicYear.id },
});
const studentProfile = await prisma.studentProfile.create({
  data: {
    userId: studentUser,
    institutionId,
    rollNo: `R-${stamp}`,
    programId: program.id,
    batchId: batch.id,
    section: 'A',
    currentSemester: 3,
  },
});
await prisma.enrollment.create({
  data: { studentProfileId: studentProfile.id, offeringId: offering.id, status: 'ACTIVE' },
});

const tokenFor = (userId: string, institution = institutionId, roles = ['HOD']) =>
  jwt.sign({ sub: userId, institutionId: institution, roles }, env.jwtAccessSecret, { expiresIn: '1h' });
const hodToken = tokenFor(hodUser);
const rivalToken = tokenFor(rivalHod, rival.id);
const teacherToken = tokenFor(teacherUser, institutionId, ['TEACHER']);

try {
  // ═══ 1. The boundary ═══════════════════════════════════════════════════
  section('1. The boundary');

  let r = await call('GET', '/students/directory');
  eq('no token is a 401', r.status, 401, 'the directory');

  r = await call('GET', '/students/directory', { token: teacherToken });
  eq('a teacher is a 403', r.status, 403, 'the directory');

  r = await call('GET', '/students/catalogue', { token: hodToken });
  eq('the HOD reaches the catalogue', r.status, 200, 'the catalogue');
  eq('and it carries five signals', r.data?.riskSignals?.length, 5, 'the catalogue');
  eq('and four risk states', r.data?.riskStates?.length, 4, 'the catalogue');
  eq('and four intervention kinds', r.data?.interventionTypes?.length, 4, 'the catalogue');

  // ═══ 2. The directory ═══════════════════════════════════════════════════
  section('2. The directory');

  r = await call('GET', '/students/directory', { token: hodToken });
  eq('the HOD reaches the directory', r.status, 200, 'the directory');
  eq('it lists the department\'s students', r.data?.totals?.students, 1, 'the directory');
  const row = r.data?.students?.[0];
  ok('the student is in the list', !!row, 'the directory');
  eq('and the risk verdict is there', row?.risk?.state, 'UNMEASURED', 'the directory');
  eq('and the signals are there', Array.isArray(row?.risk?.signals), true, 'the directory');
  ok('and the at-risk list is there', Array.isArray(r.data?.atRisk), 'the directory');

  r = await call('GET', '/students/directory?semester=3', { token: hodToken });
  eq('the semester filter answers', r.status, 200, 'the filter');

  r = await call('GET', '/students/directory?nope=1', { token: hodToken });
  eq('a misspelled query param is a 400', r.status, 400, 'the typo');

  r = await call('GET', '/students/directory?sort=nope', { token: hodToken });
  eq('an unknown sort is a 422', r.status, 422, 'the bad sort');

  r = await call('GET', '/students/directory?risk=AT_RISK', { token: hodToken });
  eq('the risk filter answers', r.status, 200, 'the filter');

  // ═══ 3. The old route ══════════════════════════════════════════════════
  section('3. The old route still answers');

  r = await call('GET', '/students', { token: hodToken });
  eq('the old students route still answers', r.status, 200, 'the old route');
  ok('and it is still the flat list', Array.isArray(r.data?.students), 'the old route');

  // ═══ 4. The detail ═════════════════════════════════════════════════════
  section('4. The detail — the chain');

  r = await call('GET', `/students/${studentProfile.id}/detail`, { token: hodToken });
  eq('the HOD reaches the detail', r.status, 200, 'the detail');
  eq('it names the student', r.data?.student?.rollNo, `R-${stamp}`, 'the detail');
  ok('it carries the attendance', !!r.data?.attendance, 'the detail');
  ok('it carries the results', !!r.data?.results, 'the detail');
  ok('it carries the assignments', !!r.data?.assignments, 'the detail');
  ok('it carries the risk', !!r.data?.risk, 'the detail');
  ok('it carries the performance', !!r.data?.performance, 'the detail');
  ok('it carries the placement readiness', !!r.data?.placement, 'the detail');
  ok('it carries the weak topics', !!r.data?.weakTopics, 'the detail');
  ok('it carries the interventions', Array.isArray(r.data?.interventions), 'the detail');
  ok('it carries the suggestions', Array.isArray(r.data?.suggestions), 'the detail');

  r = await call('GET', `/students/${studentProfile.id}/detail`, { token: rivalToken });
  eq('another institution\'s student is a 404', r.status, 404, 'the boundary');

  r = await call('GET', '/students/does-not-exist/detail', { token: hodToken });
  eq('an unknown student is a 404', r.status, 404, 'the boundary');

  // ═══ 5. The intervention writes ═════════════════════════════════════════
  section('5. The intervention write');

  r = await call('POST', `/students/${studentProfile.id}/interventions`, {
    token: hodToken,
    body: { type: 'FACULTY_MENTORING', title: 'Mentoring for the student' },
  });
  eq('an intervention can be recorded', r.status, 200, 'the write');
  eq('and it starts as PROPOSED', r.data?.intervention?.status, 'PROPOSED', 'the write');
  const interventionId = r.data?.intervention?.id;
  ok('and it has an id', !!interventionId, 'the write');

  r = await call('GET', `/students/${studentProfile.id}/detail`, { token: hodToken });
  eq('and it appears in the history', r.data?.interventions?.length, 1, 'the history');

  const auditRows = await prisma.auditLog.findMany({
    where: { entityType: 'StudentIntervention', entityId: interventionId },
  });
  ok('and it is audited', auditRows.length >= 1, 'the audit');

  r = await call('PATCH', `/students/interventions/${interventionId}`, {
    token: hodToken,
    body: { status: 'IN_PROGRESS' },
  });
  eq('it can be started', r.status, 200, 'the write');
  eq('and it is IN_PROGRESS', r.data?.intervention?.status, 'IN_PROGRESS', 'the write');

  r = await call('PATCH', `/students/interventions/${interventionId}`, {
    token: hodToken,
    body: { status: 'NOPE' },
  });
  eq('an unknown status is a 422', r.status, 422, 'the bad status');

  r = await call('POST', `/students/${studentProfile.id}/interventions`, {
    token: hodToken,
    body: { type: 'NOPE', title: 'Something' },
  });
  eq('an unknown type is a 422', r.status, 422, 'the bad type');

  r = await call('POST', `/students/${studentProfile.id}/interventions`, {
    token: hodToken,
    body: { type: 'RESOURCES', title: 'x' },
  });
  // A 400, not a 422: the REQUEST SCHEMA is the first gate, and a one-character title is a
  // malformed request rather than a well-formed one the desk refuses.
  eq('a title of one character is a 400', r.status, 400, 'the bad title');

  r = await call('POST', `/students/${studentProfile.id}/interventions`, {
    token: rivalToken,
    body: { type: 'RESOURCES', title: 'Not my student' },
  });
  eq('another institution cannot record one', r.status, 404, 'the boundary');
} catch (e) {
  noteThrow(e);
} finally {
  await prisma.auditLog.deleteMany({ where: { institutionId: { in: [institutionId, rival.id] } } });
  await prisma.studentIntervention.deleteMany({ where: { studentProfileId: studentProfile.id } });
  await prisma.enrollment.deleteMany({ where: { studentProfileId: studentProfile.id } });
  await prisma.courseOffering.deleteMany({ where: { id: offering.id } });
  await prisma.course.deleteMany({ where: { id: course.id } });
  await prisma.studentProfile.deleteMany({ where: { id: studentProfile.id } });
  await prisma.section.deleteMany({ where: { id: sectionRow.id } });
  await prisma.batch.deleteMany({ where: { id: batch.id } });
  await prisma.academicYear.deleteMany({ where: { id: academicYear.id } });
  await prisma.program.deleteMany({ where: { id: program.id } });
  await prisma.department.deleteMany({ where: { id: { in: [dept.id, rivalDept.id] } } });
  await prisma.userRole.deleteMany({ where: { userId: { in: createdUsers } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
  await prisma.institution.deleteMany({ where: { id: { in: [inst.id, rival.id] } } });
  server.close();
}

report('verify-hod-students-http');
