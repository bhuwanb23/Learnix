// HD-02 — The HOD's Courses desk: HTTP verification (docs/users/11 §3.3).
//
// Everything here is about the BOUNDARY, which a direct service call cannot see:
//
//   A 401 (not 500) with no token, and 403 — not 404, not an empty list — for a role with no
//     business in the department's courses.
//   A that a MISSPELLED query param is REJECTED rather than silently dropped.
//   A that the directory carries the health on every row.
//   A that the OLD `GET /hod/courses` still answers, unchanged — the new desk did not quietly
//     replace it with a different document.
//   A that another institution's course is invisible AT THE WIRE.
//   A that the writes are audited.
//
// Run: node node_modules/tsx/dist/cli.mjs scripts/verify-hod-courses-http.ts
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';
import jwt from 'jsonwebtoken';
import { eq, noteThrow, ok, report, section } from './hod-courses.http-harness.js';

const app = createApp();
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const port = (server.address() as { port: number }).port;
const base = `http://127.0.0.1:${port}/api/v1/hod`;

const stamp = Date.now().toString(36);
const PREFIX = `hodchttp-${stamp}`;

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
  data: { name: 'HOD Courses HTTP', code: `hch${stamp}`.slice(0, 24) },
});
const rival = await prisma.institution.create({
  data: { name: 'HOD Courses HTTP Rival', code: `hcr${stamp}`.slice(0, 24) },
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
  data: { institutionId, name: 'HOD Courses HTTP Dept', code: `HCH${stamp}`.slice(0, 12), hodUserId: hodUser },
});
const rivalDept = await prisma.department.create({
  data: { institutionId: rival.id, name: 'Rival Dept', code: `HCR${stamp}`.slice(0, 12), hodUserId: rivalHod },
});
const program = await prisma.program.create({
  data: { departmentId: dept.id, name: 'Courses HTTP Programme', code: `HCP${stamp}`.slice(0, 12) },
});
const rivalProgram = await prisma.program.create({
  data: { departmentId: rivalDept.id, name: 'Rival Programme', code: `HCRP${stamp}`.slice(0, 12) },
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
  data: {
    institutionId,
    departmentId: dept.id,
    code: `CSA${stamp}`.slice(0, 12),
    name: 'Course Alpha',
    credits: 4,
    semester: 1,
    type: 'CORE',
    status: 'ACTIVE',
  },
});
const courseB = await prisma.course.create({
  data: {
    institutionId,
    departmentId: dept.id,
    code: `CSB${stamp}`.slice(0, 12),
    name: 'Course Beta',
    credits: 3,
    semester: 1,
    type: 'ELECTIVE',
    status: 'DRAFT',
  },
});
const rivalCourse = await prisma.course.create({
  data: {
    institutionId: rival.id,
    departmentId: rivalDept.id,
    code: `CSR${stamp}`.slice(0, 12),
    name: 'Rival Course',
    credits: 3,
    semester: 1,
    type: 'CORE',
  },
});

await prisma.staffProfile.create({
  data: {
    userId: teacherUser,
    institutionId,
    departmentId: dept.id,
    employeeNo: `EMP-${stamp}`,
    designation: 'Lecturer',
  },
});
const offering = await prisma.courseOffering.create({
  data: {
    courseId: course.id,
    sectionId: sectionRow.id,
    teacherUserId: teacherUser,
    semester: 1,
    academicYearId: academicYear.id,
  },
});
const studentProfile = await prisma.studentProfile.create({
  data: {
    userId: studentUser,
    institutionId,
    rollNo: `R-${stamp}`,
    programId: program.id,
    batchId: batch.id,
    section: `Section ${stamp}`,
  },
});
await prisma.enrollment.create({
  data: { studentProfileId: studentProfile.id, offeringId: offering.id, status: 'ACTIVE' },
});

// A token signed with the real secret, so a refusal is the desk's refusal and not a bad
// signature. A suite that reports "the HOD desk refused us" when the real problem is the
// signature teaches the wrong lesson.
const tokenFor = (userId: string, institution = institutionId, roles = ['HOD']) =>
  jwt.sign({ sub: userId, institutionId: institution, roles }, env.jwtAccessSecret, { expiresIn: '1h' });
const hodToken = tokenFor(hodUser);
const rivalToken = tokenFor(rivalHod, rival.id);
const teacherToken = tokenFor(teacherUser, institutionId, ['TEACHER']);
const studentToken = tokenFor(studentUser, institutionId, ['STUDENT']);

try {
  // ═══ 1. The boundary ═══════════════════════════════════════════════════
  section('1. The boundary');

  let r = await call('GET', '/courses/directory');
  eq('no token is a 401', r.status, 401, 'the directory');

  r = await call('GET', '/courses/directory', { token: teacherToken });
  eq('a teacher is a 403', r.status, 403, 'the directory');

  r = await call('GET', '/courses/directory', { token: studentToken });
  eq('a student is a 403', r.status, 403, 'the directory');

  r = await call('GET', '/courses/catalogue', { token: hodToken });
  eq('the HOD reaches the catalogue', r.status, 200, 'the catalogue');
  eq('and it carries three statuses', r.data?.statuses?.length, 3, 'the catalogue');
  eq('and three health components', r.data?.health?.components?.length, 3, 'the catalogue');
  eq('and three health bands', r.data?.health?.bands?.length, 3, 'the catalogue');
  eq('and the attendance threshold', r.data?.thresholds?.attendance, 75, 'the catalogue');

  r = await call('GET', `/courses/${course.id}/detail`, { token: teacherToken });
  eq('a teacher cannot read a course detail', r.status, 403, 'the detail');

  // ═══ 2. The directory ═══════════════════════════════════════════════════
  section('2. The directory');

  r = await call('GET', '/courses/directory', { token: hodToken });
  eq('the HOD reaches the directory', r.status, 200, 'the directory');
  eq('it lists both department courses', r.data?.totals?.courses, 2, 'the directory');
  eq('it counts the DRAFT one', r.data?.totals?.draft, 1, 'the directory');
  eq('it counts the ACTIVE one', r.data?.totals?.active, 1, 'the directory');
  eq('it reports one programme', r.data?.totals?.programs, 1, 'the directory');
  const row = r.data?.courses?.find((c: any) => c.id === course.id);
  ok('the course is in the list', !!row, 'the directory');
  eq('the row carries its status', row?.status, 'ACTIVE', 'the directory');
  ok('the row carries a health object', !!row?.health, 'the directory');
  ok(
    'the health object carries the score, even when it is null',
    'score' in (row?.health ?? {}),
    'the directory',
  );
  ok(
    'the health object carries the three leg values',
    !!row?.health?.legs && 'attendance' in row.health.legs,
    'the directory',
  );

  // THE FILTERS.
  r = await call('GET', '/courses/directory?status=DRAFT', { token: hodToken });
  eq('the status filter narrows the list', r.data?.courses?.length, 1, 'the filter');
  eq('to the draft course', r.data?.courses?.[0]?.id, courseB.id, 'the filter');

  r = await call('GET', '/courses/directory?type=ELECTIVE', { token: hodToken });
  eq('the type filter narrows the list', r.data?.courses?.length, 1, 'the filter');

  r = await call('GET', '/courses/directory?search=beta', { token: hodToken });
  eq('the search finds by name', r.data?.courses?.length, 1, 'the search');

  r = await call('GET', '/courses/directory?sort=credits', { token: hodToken });
  eq('the sort is applied', r.data?.courses?.[0]?.credits, 4, 'the sort');

  // A MISSPELLED QUERY PARAM IS REJECTED. A query the server ignores looks exactly like a query
  // it honoured, and the caller has no way to tell which happened.
  r = await call('GET', '/courses/directory?nope=1', { token: hodToken });
  eq('a misspelled query param is a 400', r.status, 400, 'the typo');

  r = await call('GET', '/courses/directory?status=RETIRED', { token: hodToken });
  eq('an unknown status filter is a 422', r.status, 422, 'the bad filter');
  ok('and it names the allowed values', JSON.stringify(r.json).includes('ACTIVE'), 'the bad filter');

  r = await call('GET', '/courses/directory?sort=nope', { token: hodToken });
  eq('an unknown sort is a 422', r.status, 422, 'the bad sort');

  // ═══ 3. The old route ══════════════════════════════════════════════════
  section('3. The old route still answers');

  // The old `GET /hod/courses` pair is NOT replaced. A caller holding it gets the old document,
  // not a quietly different one.
  r = await call('GET', '/courses', { token: hodToken });
  eq('the old courses route still answers', r.status, 200, 'the old route');
  ok('and it still carries its stats', !!r.data?.stats, 'the old route');
  ok('and it still carries its courses', Array.isArray(r.data?.courses), 'the old route');

  r = await call('GET', `/courses/${course.id}`, { token: hodToken });
  eq('the old course detail still answers', r.status, 200, 'the old route');

  // ═══ 4. The detail ═════════════════════════════════════════════════════
  section('4. The detail — the chain');

  r = await call('GET', `/courses/${course.id}/detail`, { token: hodToken });
  eq('the HOD reaches the detail', r.status, 200, 'the detail');
  eq('it names the course', r.data?.course?.code, `CSA${stamp}`.slice(0, 12), 'the detail');
  ok('it carries the health', !!r.data?.health, 'the detail');
  eq('the health carries three legs', r.data?.health?.components?.length, 3, 'the detail');
  ok('it lists the subjects', Array.isArray(r.data?.subjects), 'the detail');
  eq('with one subject', r.data?.subjects?.length, 1, 'the detail');
  ok('it lists the faculty', Array.isArray(r.data?.faculty), 'the detail');
  ok('it counts the students', r.data?.students?.total === 1, 'the detail');
  ok('it carries the timetable', !!r.data?.timetable, 'the detail');
  ok('it carries the syllabus', !!r.data?.syllabus, 'the detail');
  ok('it carries the attendance', !!r.data?.attendance, 'the detail');
  ok('it carries the performance', !!r.data?.performance, 'the detail');
  ok('it carries the curriculum', !!r.data?.curriculum, 'the detail');
  ok('it carries the prerequisites', Array.isArray(r.data?.prerequisites), 'the detail');
  ok('it carries the history', !!r.data?.history, 'the detail');

  // A COURSE IN ANOTHER INSTITUTION IS INVISIBLE AT THE WIRE.
  r = await call('GET', `/courses/${rivalCourse.id}/detail`, { token: hodToken });
  eq('another institution\'s course is a 404', r.status, 404, 'the boundary');

  r = await call('GET', `/courses/${rivalCourse.id}/detail`, { token: rivalToken });
  eq('and the rival sees their own', r.status, 200, 'the boundary');

  r = await call('GET', `/courses/${course.id}/detail`, { token: rivalToken });
  eq('the rival cannot see this department\'s course', r.status, 404, 'the boundary');

  // A COURSE THAT DOES NOT EXIST IS A 404, NOT A 500.
  r = await call('GET', '/courses/does-not-exist/detail', { token: hodToken });
  eq('an unknown course is a 404', r.status, 404, 'the boundary');

  // ═══ 5. The writes ═════════════════════════════════════════════════════
  section('5. The writes');

  r = await call('PATCH', `/courses/${course.id}`, {
    token: hodToken,
    body: { name: 'Course Alpha Renamed', credits: 5 },
  });
  eq('the course can be edited', r.status, 200, 'the edit');
  eq('and the name changed', r.data?.course?.name, 'Course Alpha Renamed', 'the edit');
  eq('and the credits changed', r.data?.course?.credits, 5, 'the edit');

  r = await call('PATCH', `/courses/${course.id}`, {
    token: hodToken,
    body: { credits: -4 },
  });
  // A 400, not a 422: the REQUEST SCHEMA is the first gate, and a credit count outside 0–30 is a
  // malformed request rather than a well-formed one the desk refuses. The service refuses it too
  // (422) when it is called directly, and the DB suite proves that.
  eq('a negative credit count is a 400', r.status, 400, 'the bad edit');

  r = await call('PATCH', `/courses/${course.id}`, { token: hodToken, body: {} });
  eq('an empty edit is a 422', r.status, 422, 'the empty edit');

  r = await call('PUT', `/courses/${course.id}/status`, {
    token: hodToken,
    body: { status: 'ARCHIVED' },
  });
  eq('the course can be archived', r.status, 200, 'the status');
  eq('and the status changed', r.data?.course?.status, 'ARCHIVED', 'the status');

  r = await call('PUT', `/courses/${course.id}/status`, {
    token: hodToken,
    body: { status: 'RETIRED' },
  });
  eq('an unknown status is a 422', r.status, 422, 'the bad status');

  r = await call('PUT', `/courses/${course.id}/status`, {
    token: rivalToken,
    body: { status: 'ACTIVE' },
  });
  eq('another department cannot set the status', r.status, 404, 'the boundary');

  // THE AUDIT TRAIL.
  const auditRows = await prisma.auditLog.findMany({
    where: { entityType: 'Course', entityId: course.id },
  });
  ok('the edit was audited', auditRows.some((a) => a.action === 'COURSE_UPDATED'), 'the audit');
  ok('the archive was audited', auditRows.some((a) => a.action === 'COURSE_ARCHIVED'), 'the audit');

  r = await call('GET', `/courses/${course.id}/detail`, { token: hodToken });
  ok('the history shows the archive', (r.data?.history?.entries ?? []).some((e: any) => e.action === 'COURSE_ARCHIVED'), 'the history');

  // THE CURRICULUM.
  r = await call('POST', `/courses/${course.id}/curriculum`, {
    token: hodToken,
    body: { programId: program.id, semester: 2, type: 'CORE' },
  });
  eq('the course can be mapped', r.status, 200, 'the curriculum');
  eq('and the mapping was created', r.data?.created, true, 'the curriculum');

  r = await call('POST', `/courses/${course.id}/curriculum`, {
    token: hodToken,
    body: { programId: rivalProgram.id, semester: 2, type: 'CORE' },
  });
  eq('another department\'s programme is a 404', r.status, 404, 'the curriculum');

  r = await call('DELETE', `/courses/${course.id}/curriculum/${program.id}`, {
    token: hodToken,
  });
  eq('the mapping can be removed', r.status, 200, 'the curriculum');

  r = await call('DELETE', `/courses/${course.id}/curriculum/${program.id}`, {
    token: hodToken,
  });
  eq('removing it twice is a 404', r.status, 404, 'the curriculum');

  // THE PREREQUISITES.
  r = await call('POST', `/courses/${courseB.id}/prerequisites`, {
    token: hodToken,
    body: { prerequisiteCourseId: course.id, type: 'REQUIRED' },
  });
  eq('a prerequisite can be added', r.status, 200, 'the prerequisite');

  r = await call('POST', `/courses/${courseB.id}/prerequisites`, {
    token: hodToken,
    body: { prerequisiteCourseId: course.id, type: 'REQUIRED' },
  });
  eq('a duplicate is a 422', r.status, 422, 'the duplicate');

  r = await call('POST', `/courses/${courseB.id}/prerequisites`, {
    token: hodToken,
    body: { prerequisiteCourseId: courseB.id, type: 'REQUIRED' },
  });
  eq('a course cannot be its own prerequisite', r.status, 422, 'the loop');

  r = await call('POST', `/courses/${courseB.id}/prerequisites`, {
    token: hodToken,
    body: { prerequisiteCourseId: rivalCourse.id, type: 'REQUIRED' },
  });
  eq('another department\'s course cannot be a prerequisite', r.status, 404, 'the boundary');

  r = await call('DELETE', `/courses/${courseB.id}/prerequisites/${course.id}`, {
    token: hodToken,
  });
  eq('the prerequisite can be removed', r.status, 200, 'the prerequisite');
} catch (e) {
  noteThrow(e);
} finally {
  await prisma.auditLog.deleteMany({ where: { institutionId: { in: [institutionId, rival.id] } } });
  await prisma.enrollment.deleteMany({ where: { offeringId: offering.id } });
  await prisma.studentProfile.deleteMany({ where: { id: studentProfile.id } });
  await prisma.offeringScheduleSlot.deleteMany({ where: { offeringId: offering.id } });
  await prisma.courseOffering.deleteMany({ where: { id: offering.id } });
  await prisma.programCourse.deleteMany({
    where: { courseId: { in: [course.id, courseB.id] } },
  });
  await prisma.coursePrerequisite.deleteMany({
    where: { courseId: { in: [course.id, courseB.id] } },
  });
  await prisma.coursePrerequisite.deleteMany({
    where: { prerequisiteCourseId: { in: [course.id, courseB.id] } },
  });
  await prisma.course.deleteMany({ where: { id: { in: [course.id, courseB.id, rivalCourse.id] } } });
  await prisma.staffProfile.deleteMany({ where: { userId: teacherUser } });
  await prisma.section.deleteMany({ where: { id: sectionRow.id } });
  await prisma.batch.deleteMany({ where: { id: batch.id } });
  await prisma.academicYear.deleteMany({ where: { id: academicYear.id } });
  await prisma.program.deleteMany({ where: { id: { in: [program.id, rivalProgram.id] } } });
  await prisma.department.deleteMany({ where: { id: { in: [dept.id, rivalDept.id] } } });
  await prisma.userRole.deleteMany({ where: { userId: { in: createdUsers } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
  await prisma.institution.deleteMany({ where: { id: { in: [inst.id, rival.id] } } });
  server.close();
}

report('verify-hod-courses-http');
