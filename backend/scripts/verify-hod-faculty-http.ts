// HD-02 — The HOD's Faculty desk: HTTP verification (docs/users/11 §3.2).
//
// Everything here is about the BOUNDARY, which a direct service call cannot see:
//
//   A 401 (not 500) with no token, and 403 — not 404, not an empty list — for a role with no
//     business in the department's faculty.
//   A that a MISSPELLED query param is REJECTED rather than silently dropped.
//   A that the OLD `GET /hod/faculty` still answers, unchanged.
//   A that another institution's teacher is invisible AT THE WIRE.
//
// Run: node node_modules/tsx/dist/cli.mjs scripts/verify-hod-faculty-http.ts
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';
import jwt from 'jsonwebtoken';
import { eq, noteThrow, ok, report, section } from './hod-faculty.http-harness.js';

const app = createApp();
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const port = (server.address() as { port: number }).port;
const base = `http://127.0.0.1:${port}/api/v1/hod`;

const stamp = Date.now().toString(36);
const PREFIX = `hodfhttp-${stamp}`;

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
  data: { name: 'HOD Faculty HTTP', code: `hfh${stamp}`.slice(0, 24) },
});
const rival = await prisma.institution.create({
  data: { name: 'HOD Faculty HTTP Rival', code: `hfr${stamp}`.slice(0, 24) },
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
  data: { institutionId, name: 'HOD Faculty HTTP Dept', code: `HFH${stamp}`.slice(0, 12), hodUserId: hodUser },
});
const rivalDept = await prisma.department.create({
  data: { institutionId: rival.id, name: 'Rival Dept', code: `HFR${stamp}`.slice(0, 12), hodUserId: rivalHod },
});
const program = await prisma.program.create({
  data: { departmentId: dept.id, name: 'Faculty HTTP Programme', code: `HFP${stamp}`.slice(0, 12) },
});
const batch = await prisma.batch.create({
  data: { programId: program.id, name: `Batch ${stamp}`, startYear: 2025, graduationYear: 2029 },
});
const sectionRow = await prisma.section.create({
  data: { programId: program.id, batchId: batch.id, name: `Section ${stamp}`, currentSemester: 1 },
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
  data: { institutionId, departmentId: dept.id, code: `CFA${stamp}`.slice(0, 12), name: 'Faculty Course', credits: 4, semester: 1, type: 'CORE' },
});
await prisma.staffProfile.create({
  data: { userId: teacherUser, institutionId, departmentId: dept.id, employeeNo: `EMP-${stamp}`, designation: 'Lecturer', maxWorkloadHours: 6 },
});
await prisma.staffProfile.create({
  data: { userId: hodUser, institutionId, departmentId: dept.id, employeeNo: `EMPH-${stamp}`, designation: 'Professor & Head', maxWorkloadHours: 12 },
});
const offering = await prisma.courseOffering.create({
  data: { courseId: course.id, sectionId: sectionRow.id, teacherUserId: teacherUser, semester: 1, academicYearId: academicYear.id },
});
await prisma.offeringScheduleSlot.create({
  data: { offeringId: offering.id, dayOfWeek: 1, startTime: '09:00', endTime: '11:30', room: 'R1' },
});

const tokenFor = (userId: string, institution = institutionId, roles = ['HOD']) =>
  jwt.sign({ sub: userId, institutionId: institution, roles }, env.jwtAccessSecret, { expiresIn: '1h' });
const hodToken = tokenFor(hodUser);
const rivalToken = tokenFor(rivalHod, rival.id);
const teacherToken = tokenFor(teacherUser, institutionId, ['TEACHER']);
const studentToken = tokenFor(studentUser, institutionId, ['STUDENT']);

try {
  // ═══ 1. The boundary ═══════════════════════════════════════════════════
  section('1. The boundary');

  let r = await call('GET', '/faculty/directory');
  eq('no token is a 401', r.status, 401, 'the directory');

  r = await call('GET', '/faculty/directory', { token: teacherToken });
  eq('a teacher is a 403', r.status, 403, 'the directory');

  r = await call('GET', '/faculty/directory', { token: studentToken });
  eq('a student is a 403', r.status, 403, 'the directory');

  r = await call('GET', '/faculty/catalogue', { token: hodToken });
  eq('the HOD reaches the catalogue', r.status, 200, 'the catalogue');
  eq('and it carries five workload bands', r.data?.workloadBands?.length, 5, 'the catalogue');
  eq('and four insight legs', r.data?.insightLegs?.length, 4, 'the catalogue');
  eq('and six availability days', r.data?.availabilityDays?.length, 6, 'the catalogue');

  r = await call('GET', `/faculty/${teacherUser}/detail`, { token: teacherToken });
  eq('a teacher cannot read a faculty detail', r.status, 403, 'the detail');

  // ═══ 2. The directory ═══════════════════════════════════════════════════
  section('2. The directory');

  r = await call('GET', '/faculty/directory', { token: hodToken });
  eq('the HOD reaches the directory', r.status, 200, 'the directory');
  eq('it lists the department\'s faculty', r.data?.totals?.faculty, 2, 'the directory');
  const row = r.data?.faculty?.find((f: any) => f.userId === teacherUser);
  ok('the teacher is in the list', !!row, 'the directory');
  eq('and the load is in HOURS', row?.workload?.assignedWeeklyHours, 2.5, 'the directory');
  eq('against their own cap', row?.workload?.maxWorkloadHours, 6, 'the directory');
  ok('and the balancer is present', !!r.data?.balancer, 'the directory');
  ok('and the availability matrix is present', !!r.data?.availability, 'the directory');
  ok('and the progress monitor is present', !!r.data?.progress, 'the directory');

  r = await call('GET', '/faculty/directory?search=teacher', { token: hodToken });
  eq('the search narrows the list', r.data?.faculty?.length, 1, 'the search');

  r = await call('GET', '/faculty/directory?sort=workload', { token: hodToken });
  eq('the sort is applied', r.status, 200, 'the sort');

  r = await call('GET', '/faculty/directory?nope=1', { token: hodToken });
  eq('a misspelled query param is a 400', r.status, 400, 'the typo');

  r = await call('GET', '/faculty/directory?sort=nope', { token: hodToken });
  eq('an unknown sort is a 422', r.status, 422, 'the bad sort');

  r = await call('GET', '/faculty/directory?status=nope', { token: hodToken });
  eq('an unknown status is a 422', r.status, 422, 'the bad status');

  // ═══ 3. The old route ══════════════════════════════════════════════════
  section('3. The old route still answers');

  r = await call('GET', '/faculty', { token: hodToken });
  eq('the old faculty route still answers', r.status, 200, 'the old route');
  ok('and it is still the flat list', Array.isArray(r.data), 'the old route');
  eq('with the same number of teachers', r.data?.length, 2, 'the old route');

  // ═══ 4. The detail ═════════════════════════════════════════════════════
  section('4. The detail — the chain');

  r = await call('GET', `/faculty/${teacherUser}/detail`, { token: hodToken });
  eq('the HOD reaches the detail', r.status, 200, 'the detail');
  eq('it names the teacher', r.data?.faculty?.name, 'teacher person', 'the detail');
  ok('it lists the subjects', Array.isArray(r.data?.subjects), 'the detail');
  ok('it lists the classes', Array.isArray(r.data?.classes), 'the detail');
  ok('it carries the workload', !!r.data?.workload, 'the detail');
  ok('it carries the attendance', !!r.data?.attendance, 'the detail');
  ok('it carries the syllabus', !!r.data?.syllabus, 'the detail');
  ok('it carries the performance', !!r.data?.performance, 'the detail');
  ok('it carries the activity', !!r.data?.activity, 'the detail');
  ok('it carries the insight', !!r.data?.insight, 'the detail');
  ok('it carries the availability', !!r.data?.availability, 'the detail');

  r = await call('GET', `/faculty/${rivalHod}/detail`, { token: hodToken });
  eq('another institution\'s teacher is a 404', r.status, 404, 'the boundary');

  r = await call('GET', `/faculty/${teacherUser}/detail`, { token: rivalToken });
  eq('the rival cannot see this department\'s teacher', r.status, 404, 'the boundary');

  r = await call('GET', '/faculty/does-not-exist/detail', { token: hodToken });
  eq('an unknown teacher is a 404', r.status, 404, 'the boundary');

  // ═══ 5. The reassign guard ═════════════════════════════════════════════
  section('5. The reassign guard measures the same unit the screen shows');

  // The teacher carries 2.5h against a 6h cap. The target has a 2-HOUR cap, so the 2.5-hour class
  // would break it — and the guard measures HOURS. It used to count SLOTS, and one 2.5-hour
  // lecture counted as one, so this move was wrongly allowed.
  const hodUser2 = await mkUser(institutionId, 'hod2', 'HOD');
  await prisma.staffProfile.create({
    data: { userId: hodUser2, institutionId, departmentId: dept.id, employeeNo: `EMP2-${stamp}`, designation: 'Lecturer', maxWorkloadHours: 2 },
  });
  r = await call('POST', `/offerings/${offering.id}/reassign`, {
    token: hodToken,
    body: { toUserId: hodUser2 },
  });
  eq('a move that would break the cap in HOURS is a 422', r.status, 422, 'the guard');

  // And a target with room takes it.
  await prisma.staffProfile.updateMany({
    where: { userId: hodUser2 },
    data: { maxWorkloadHours: 6 },
  });
  r = await call('POST', `/offerings/${offering.id}/reassign`, {
    token: hodToken,
    body: { toUserId: hodUser2 },
  });
  eq('a move that fits is allowed', r.status, 200, 'the guard');
} catch (e) {
  noteThrow(e);
} finally {
  await prisma.auditLog.deleteMany({ where: { institutionId: { in: [institutionId, rival.id] } } });
  await prisma.leaveRequest.deleteMany({ where: { institutionId: { in: [institutionId, rival.id] } } });
  await prisma.offeringScheduleSlot.deleteMany({ where: { offeringId: offering.id } });
  await prisma.courseOffering.deleteMany({ where: { id: offering.id } });
  await prisma.course.deleteMany({ where: { id: course.id } });
  await prisma.staffProfile.deleteMany({ where: { institutionId: { in: [institutionId, rival.id] } } });
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

report('verify-hod-faculty-http');
