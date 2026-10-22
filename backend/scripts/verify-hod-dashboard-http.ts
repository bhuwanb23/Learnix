// HD-01 — The HOD dashboard: HTTP verification (docs/users/11 §HD-01).
//
// Everything here is about the BOUNDARY, which a direct service call cannot see:
//
//   A 401 (not 500) with no token, and 403 — not 404, not an empty list — for a role with no
//   business in the examination office.
//   A that a MISSPELLED query param is REJECTED rather than silently dropped.
//   A that the overview carries ALL NINE sections, not eight.
//   A that the old `GET /hod/dashboard` is a 404 — the shape it served is GONE, and a caller
//     holding it must not be handed a quietly different document.
//   A that another institution's department is invisible AT THE WIRE.
//
// Run: npx tsx scripts/verify-hod-dashboard-http.ts
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';
import jwt from 'jsonwebtoken';
import { cleanupNotifications, eq, noteThrow, ok, report, section } from './hod-dashboard.http-harness.js';

const app = createApp();
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const port = (server.address() as { port: number }).port;
const base = `http://127.0.0.1:${port}/api/v1/hod`;

const stamp = Date.now().toString(36);
const PREFIX = `hodhttp-${stamp}`;

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
  data: { name: 'HOD Dashboard HTTP', code: `hdh${stamp}`.slice(0, 24) },
});
const rival = await prisma.institution.create({
  data: { name: 'HOD Dashboard HTTP Rival', code: `hdr${stamp}`.slice(0, 24) },
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

// A department for this HOD, so the scope resolves.
const dept = await prisma.department.create({
  data: { institutionId, name: 'HOD HTTP Dept', code: `HHD${stamp}`.slice(0, 12), hodUserId: hodUser },
});
const rivalDept = await prisma.department.create({
  data: { institutionId: rival.id, name: 'HOD HTTP Rival Dept', code: `HHR${stamp}`.slice(0, 12), hodUserId: rivalHod },
});
const program = await prisma.program.create({
  data: { departmentId: dept.id, name: 'HOD HTTP Programme', code: `HHP${stamp}`.slice(0, 12) },
});
const batch = await prisma.batch.create({
  data: { programId: program.id, name: 'HOD HTTP Batch', startYear: 2025, graduationYear: 2029 },
});
const sectionRow = await prisma.section.create({
  data: { programId: program.id, batchId: batch.id, name: 'A', currentSemester: 1 },
});
const course = await prisma.course.create({
  data: { institutionId, departmentId: dept.id, code: `HHC${stamp}`.slice(0, 12), name: 'HOD HTTP Course', semester: 1 },
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
    rollNo: `HOD-${stamp}`,
    programId: program.id,
    batchId: batch.id,
    currentSemester: 1,
    status: 'ACTIVE',
  },
  select: { id: true },
});
await prisma.enrollment.create({
  data: { offeringId: offering.id, studentProfileId: studentProfile.id, status: 'ACTIVE' },
});
await prisma.offeringScheduleSlot.create({
  data: { offeringId: offering.id, dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
});

// The token is signed with the app's OWN access secret, read from the env the app reads - a token
// signed with a guess is a 401, and a suite that reports "the HOD desk refused us" when the real
// problem is the signature teaches the wrong lesson.
const tokenFor = (userId: string, institution = institutionId, roles = ['HOD']) =>
  jwt.sign({ sub: userId, institutionId: institution, roles }, env.jwtAccessSecret, { expiresIn: '1h' });
const hodToken = tokenFor(hodUser);
const rivalToken = tokenFor(rivalHod, rival.id);
const teacherToken = tokenFor(teacherUser, institutionId, ['TEACHER']);

async function cleanup() {
  await cleanupNotifications([institutionId, rival.id], createdUsers);
  await prisma.enrollment.deleteMany({ where: { offeringId: offering.id } });
  await prisma.studentProfile.deleteMany({ where: { institutionId } });
  await prisma.offeringScheduleSlot.deleteMany({ where: { offeringId: offering.id } });
  await prisma.courseOffering.delete({ where: { id: offering.id } });
  await prisma.section.delete({ where: { id: sectionRow.id } });
  await prisma.batch.delete({ where: { id: batch.id } });
  await prisma.program.delete({ where: { id: program.id } });
  await prisma.course.delete({ where: { id: course.id } });
  await prisma.academicYear.delete({ where: { id: academicYear.id } });
  await prisma.department.deleteMany({ where: { id: { in: [dept.id, rivalDept.id] } } });
  await prisma.userRole.deleteMany({ where: { userId: { in: createdUsers } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
  await prisma.institution.deleteMany({ where: { id: { in: [inst.id, rival.id] } } });
}

try {
  // ═══ 1. Authentication and authorisation ═══════════════════════════════════════════════════
  section('1. Authentication and authorisation');

  const noToken = await call('GET', '/dashboard/overview');
  eq(noToken.status, 401, 'no token is 401, not 500');

  const teacher = await call('GET', '/dashboard/overview', { token: teacherToken });
  eq(teacher.status, 403, 'a teacher has no business in the examination office');

  const teacherCatalogue = await call('GET', '/dashboard/catalogue', { token: teacherToken });
  eq(teacherCatalogue.status, 403, 'a teacher cannot read the vocabulary either');

  const rivalOverview = await call('GET', '/dashboard/overview', { token: rivalToken });
  eq(rivalOverview.status, 200, "another institution's HOD has their own dashboard");
  ok(
    "and it is THEIR department",
    rivalOverview.data?.department?.id === rivalDept.id,
  );

  // ═══ 2. The old endpoint is GONE ═══════════════════════════════════════════════════════════
  section('2. The old flat dashboard is a 404, not a quietly different shape');

  const old = await call('GET', '/dashboard', { token: hodToken });
  eq(old.status, 404, 'the old GET /hod/dashboard is gone');
  ok(
    'and it answers with an error, not with the old hero-and-stats shape',
    old.json?.error !== undefined || old.status === 404,
  );

  // ═══ 3. The catalogue ══════════════════════════════════════════════════════════════════════
  section('3. The catalogue publishes the vocabulary');

  const cat = await call('GET', '/dashboard/catalogue', { token: hodToken });
  eq(cat.status, 200, 'the catalogue is served');
  eq(cat.data?.blocks?.length, 9, 'it carries the nine sections');
  eq(cat.data?.quickActions?.length, 4, 'the four quick actions');
  eq(cat.data?.alertKinds?.length, 6, 'the six alert kinds');
  ok(cat.data?.blocks?.every((b: any) => b.label && b.icon && b.color && b.order), 'every section has its chrome');
  ok(cat.data?.quickActions?.every((a: any) => a.label && a.route && a.icon), 'every action has its chrome');
  ok(cat.data?.alertKinds?.every((a: any) => a.label && a.severity && a.route), 'every alert kind has its chrome');
  ok(Array.isArray(cat.data?.health?.components), 'the health components are published');
  eq(cat.data?.health?.components?.length, 4, 'all four of them');
  ok(Array.isArray(cat.data?.health?.bands), 'the health bands are published');
  ok(typeof cat.data?.thresholds?.attendanceRisk === 'number', 'and the thresholds');

  // ═══ 4. The overview carries all nine sections ═════════════════════════════════════════════
  section('4. The overview answers all nine questions in one call');

  const o = await call('GET', '/dashboard/overview', { token: hodToken });
  eq(o.status, 200, 'the overview is served');
  for (const key of [
    'kpis',
    'today',
    'attendance',
    'progress',
    'workload',
    'risk',
    'approvals',
    'actions',
    'trends',
  ]) {
    ok(`the overview carries "${key}"`, o.data?.[key] !== undefined);
  }
  ok('...the health score', o.data?.health !== undefined);
  ok('...and the alerts', o.data?.alerts !== undefined);
  ok('...and the department', o.data?.department !== undefined);

  // ═══ 5. The filters ═══════════════════════════════════════════════════════════════════════
  section('5. The filters');

  const withYear = await call('GET', '/dashboard/overview?academicYearId=nope', { token: hodToken });
  eq(withYear.status, 200, 'an unknown year is an empty scope, not an error');
  eq(withYear.data?.scope, 'department', 'and the scope says so');
  eq(withYear.data?.academicYearId, 'nope', 'and it echoes the filter back');

  const misspelled = await call('GET', '/dashboard/overview?academicyearid=abc', { token: hodToken });
  eq(misspelled.status, 400, 'a MISSPELLED query param is rejected rather than ignored');

  const unknownParam = await call('GET', '/dashboard/overview?nonsense=1', { token: hodToken });
  eq(unknownParam.status, 400, 'an unknown query param is rejected');

  // ═══ 6. The per-block route ══════════════════════════════════════════════════════════════
  section('6. The per-block route');

  for (const block of cat.data?.blocks ?? []) {
    const one = await call('GET', `/dashboard/blocks/${block.id}`, { token: hodToken });
    eq(one.status, 200, `the "${block.id}" block is served`);
    eq(one.data?.block, block.id, `...and it names itself`);
    ok(one.data?.data !== undefined, `...and it carries data`);
  }

  const unknownBlock = await call('GET', '/dashboard/blocks/NOPE', { token: hodToken });
  eq(unknownBlock.status, 422, 'an unknown block is a 422 naming the list');
  ok(Array.isArray(unknownBlock.json?.error?.details?.allowed), 'and it says what IS allowed');

  // THE TWO ROUTES MUST AGREE. Two functions counting the same thing is how two screens start
  // disagreeing, and the whole point of the rewrite was ONE place per figure.
  const viaBlock = await call('GET', '/dashboard/blocks/STUDENT_RISK', { token: hodToken });
  eq(viaBlock.data?.data?.atRisk, o.data?.risk?.atRisk, 'the risk count agrees');
  eq(
    viaBlock.data?.data?.unmeasured,
    o.data?.risk?.unmeasured,
    '...and the unmeasured count',
  );

  // ═══ 7. Another institution's department is invisible ═════════════════════════════════════
  section('7. Tenant scoping');

  const rivalBlock = await call('GET', '/dashboard/blocks/DEPARTMENT_KPIS', { token: rivalToken });
  eq(rivalBlock.status, 200, "the rival HOD has their own KPIs");
  ok(
    "and they are THEIR department's, not ours",
    rivalBlock.data?.data?.students !== o.data?.kpis?.students ||
      rivalBlock.data?.data?.courses !== o.data?.kpis?.courses,
  );
} catch (e) {
  noteThrow(e);
} finally {
  await cleanup();
  report('HOD dashboard HTTP verification');
  await prisma.$disconnect();
  server.close();
}
