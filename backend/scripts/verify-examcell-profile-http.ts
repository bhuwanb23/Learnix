// X-10 — Exam cell profile: HTTP verification (docs/users/05 §3.8).
//
// Everything here is about the BOUNDARY, which a direct service call cannot see:
//
//   A 401 (not 500) with no token, and 403 — not 404, not an empty list — for a role
//   with no business in the examination office.
//   A that a MISSPELLED field is REJECTED rather than silently dropped. A body the server
//   ignores returns everything and looks like it worked.
//   A that the profile's figures are the OFFICER's and not the institution's, over the wire.
//   A that a mute is written through and read back, and that IMPORTANT_NOTICE cannot be muted.
//   A that the activity endpoint SAYS the session limitation rather than the client guessing.
//
// Run: npx tsx scripts/verify-examcell-profile-http.ts
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';
import jwt from 'jsonwebtoken';
import { cleanupNotifications, eq, noteThrow, ok, report, section } from './examcell-profile.http-harness.js';

const app = createApp();
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const port = (server.address() as { port: number }).port;
const base = `http://127.0.0.1:${port}/api/v1/examcell`;

const stamp = Date.now().toString(36);
const PREFIX = `exprof-http-${stamp}`;

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
  data: { name: 'Exam Profile HTTP', code: `exp${stamp}`.slice(0, 24) },
});
const rival = await prisma.institution.create({
  data: { name: 'Exam Profile HTTP Rival', code: `exq${stamp}`.slice(0, 24) },
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

// The token is signed with the app's OWN access secret, read from the env the app reads - a token
// signed with a guess is a 401, and a suite that reports "the exam cell refused us" when the real
// problem is the signature teaches the wrong lesson.
const tokenFor = (userId: string, institution = institutionId, roles = ['EXAMCELL']) =>
  jwt.sign({ sub: userId, institutionId: institution, roles }, env.jwtAccessSecret, { expiresIn: '1h' });
const officerToken = tokenFor(officer);
const rivalToken = tokenFor(rivalOfficer, rival.id);
const teacherToken = tokenFor(teacherUser, institutionId, ['TEACHER']);

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
  data: { institutionId, name: 'EX Prof Dept', code: `EXPD${stamp}`.slice(0, 12) },
});
await prisma.staffProfile.create({
  data: {
    userId: officer,
    institutionId,
    employeeNo: `EXP-${stamp}`.slice(0, 24),
    designation: 'Controller of Examinations',
    departmentId: dept.id,
  },
});

// An exam the OFFICER created, and one they did not. The profile must count only the first.
const examByOfficer = await prisma.exam.create({
  data: {
    institutionId,
    academicYearId: academicYear.id,
    semester: 4,
    type: 'FINAL',
    name: `Officer exam ${stamp}`,
    createdByUserId: officer,
    status: 'SCHEDULED',
  },
});
const examByOther = await prisma.exam.create({
  data: {
    institutionId,
    academicYearId: academicYear.id,
    semester: 6,
    type: 'MID_TERM',
    name: `Other exam ${stamp}`,
    createdByUserId: teacherUser,
    status: 'SCHEDULED',
  },
});

async function cleanup() {
  await cleanupNotifications([institutionId, rival.id], createdUsers);
  await prisma.exam.deleteMany({ where: { id: { in: [examByOfficer.id, examByOther.id] } } });
  await prisma.staffProfile.deleteMany({ where: { institutionId } });
  await prisma.department.delete({ where: { id: dept.id } });
  await prisma.academicYear.delete({ where: { id: academicYear.id } });
  await prisma.userRole.deleteMany({ where: { userId: { in: createdUsers } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
  await prisma.institution.deleteMany({ where: { id: { in: [inst.id, rival.id] } } });
}

try {
  // ═══ 1. Authentication and authorisation ═══════════════════════════════════════════════════
  section('1. Authentication and authorisation');

  const noToken = await call('GET', '/profile');
  eq(noToken.status, 401, 'no token is 401, not 500');

  const teacherProfile = await call('GET', '/profile', { token: teacherToken });
  eq(teacherProfile.status, 403, 'a teacher has no business in the examination profile');

  const teacherPrefs = await call('GET', '/profile/notification-preferences', { token: teacherToken });
  eq(teacherPrefs.status, 403, 'a teacher has no business in the notification preferences either');

  // ═══ 2. The profile ══════════════════════════════════════════════════════════════════════════
  section('2. The profile');

  const prof = await call('GET', '/profile', { token: officerToken });
  eq(prof.status, 200, 'the profile is served');
  ok(prof.data?.user?.fullName, 'it names the officer');
  ok(prof.data?.user?.email, 'and their email');
  ok(prof.data?.institution?.name, 'it names the institution');
  eq(prof.data?.institution?.id, institutionId, 'and it is THEIR institution');
  ok(prof.data?.department?.name, 'it names the department');
  ok(prof.data?.staff?.designation, 'it carries the designation');
  ok(prof.data?.staff?.employeeNo, 'and the employee number');
  ok(prof.data?.roles?.length, 'and their roles');

  // THE DERIVED FIGURES. The officer created ONE of the institution's two exams, and the profile
  // must say one — not two, and not "the exam count" of the college.
  eq(prof.data?.responsibilities?.examsCreated, 1, "the exam count is this officer's, not the institution's");
  eq(prof.data?.responsibilities?.examsTotal, 2, 'the institution total is reported separately');
  eq(prof.data?.responsibilities?.authored?.length, 1, 'and the exams they created are named');
  eq(prof.data?.responsibilities?.authored?.[0]?.id, examByOfficer.id, 'and it is the right one');
  ok(typeof prof.data?.responsibilities?.invigilatorDuties === 'number', 'the duty count is reported');
  ok(typeof prof.data?.responsibilities?.evaluationsOwned === 'number', 'the evaluation count is reported');

  const rivalProfile = await call('GET', '/profile', { token: rivalToken });
  eq(rivalProfile.status, 200, "another institution's officer has their own profile");
  eq(rivalProfile.data?.institution?.id, rival.id, 'and it is THEIR institution');
  eq(rivalProfile.data?.responsibilities?.examsCreated, 0, 'and none of this institution\'s exams');

  // ═══ 3. The permissions ═════════════════════════════════════════════════════════════════════
  section('3. The permissions');

  const perms = await call('GET', '/profile/permissions', { token: officerToken });
  eq(perms.status, 200, 'the permissions are served');
  ok(typeof perms.data?.total === 'number', 'the total is reported');
  ok(Array.isArray(perms.data?.examCellPermissions), 'the exam permissions are listed');
  ok(Array.isArray(perms.data?.groups), 'the groups are listed');
  ok(perms.data?.roles?.length, 'and the roles are named');

  // ═══ 4. The notification preferences ════════════════════════════════════════════════════════
  section('4. The notification preferences');

  const prefs = await call('GET', '/profile/notification-preferences', { token: officerToken });
  eq(prefs.status, 200, 'the preferences are served');
  eq(prefs.data?.categories?.length, 9, 'all nine categories are offered');
  ok(
    prefs.data?.categories?.find((c: any) => c.id === 'IMPORTANT_NOTICE')?.mutable === false,
    'and the important notice is not mutable',
  );
  ok(
    prefs.data?.categories?.filter((c: any) => c.id !== 'IMPORTANT_NOTICE').every((c: any) => c.mutable === true),
    'and the other eight are',
  );
  ok(
    prefs.data?.categories?.every((c: any) => c.label && c.blurb && c.icon && c.color),
    'and every one carries its chrome',
  );

  const mutePref = await call('PATCH', '/profile/notification-preferences', {
    token: officerToken,
    body: { category: 'EVALUATION_DEADLINE', muted: true },
  });
  eq(mutePref.status, 200, 'a category can be muted over the wire');
  eq(mutePref.data?.muted, true, 'and it says so');
  const prefRow = await prisma.notificationPreference.findFirst({
    where: { userId: officer, category: 'EVALUATION_DEADLINE' },
  });
  ok(prefRow?.muted === true, 'and the row really is written');

  const readBack = await call('GET', '/profile/notification-preferences', { token: officerToken });
  eq(
    readBack.data?.categories?.find((c: any) => c.id === 'EVALUATION_DEADLINE')?.muted,
    true,
    'and it is read back as muted',
  );

  const muteImportant = await call('PATCH', '/profile/notification-preferences', {
    token: officerToken,
    body: { category: 'IMPORTANT_NOTICE', muted: true },
  });
  eq(muteImportant.status, 404, 'the important notice cannot be muted');

  const muteUnknown = await call('PATCH', '/profile/notification-preferences', {
    token: officerToken,
    body: { category: 'NOPE', muted: true },
  });
  eq(muteUnknown.status, 404, 'an unknown category cannot be muted');

  const prefTypo = await call('PATCH', '/profile/notification-preferences', {
    token: officerToken,
    body: { category: 'EVALUATION_DEADLINE', muted: true, mutes: true },
  });
  eq(prefTypo.status, 400, 'a MISSPELLED field is rejected');

  const prefNoBody = await call('PATCH', '/profile/notification-preferences', {
    token: officerToken,
    body: { category: 'EVALUATION_DEADLINE' },
  });
  eq(prefNoBody.status, 400, 'a mute with no flag is rejected');

  await call('PATCH', '/profile/notification-preferences', {
    token: officerToken,
    body: { category: 'EVALUATION_DEADLINE', muted: false },
  });

  // ═══ 5. The activity ════════════════════════════════════════════════════════════════════════
  section('5. The activity');

  const activity = await call('GET', '/profile/activity', { token: officerToken });
  eq(activity.status, 200, 'the activity is served');
  ok(typeof activity.data?.sessionCount === 'number', 'the session count is reported');
  ok(Array.isArray(activity.data?.sessions), 'the sessions are listed');
  ok(Array.isArray(activity.data?.activity), 'the recent actions are listed');
  ok(activity.data?.sessionNote, 'and the session limitation is stated');
  ok('lastLoginAt' in (activity.data ?? {}), 'and the last sign-in is reported');
} catch (e) {
  noteThrow(e);
} finally {
  await cleanup();
  report('Exam cell profile HTTP verification');
  await prisma.$disconnect();
  server.close();
}
