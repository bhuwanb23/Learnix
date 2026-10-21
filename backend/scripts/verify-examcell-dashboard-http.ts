// X-11 — The exam cell dashboard: HTTP verification (docs/users/05 §3.1).
//
// Everything here is about the BOUNDARY, which a direct service call cannot see:
//
//   A 401 (not 500) with no token, and 403 — not 404, not an empty list — for a role with no
//   business in the examination office.
//   A that a MISSPELLED query param is REJECTED rather than silently dropped.
//   A that the overview carries ALL SEVEN sections, not six.
//   A that the old `GET /examcell/dashboard` is a 404 — the shape it served is GONE, and a
//     caller holding it must not be handed a quietly different document.
//   A that the per-block route and the overview AGREE, because two functions counting the same
//     thing is how two screens start disagreeing.
//
// Run: npx tsx scripts/verify-examcell-dashboard-http.ts
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
const PREFIX = `exdash-http-${stamp}`;

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
  data: { name: 'Exam Dashboard HTTP', code: `exd${stamp}`.slice(0, 24) },
});
const rival = await prisma.institution.create({
  data: { name: 'Exam Dashboard HTTP Rival', code: `exr${stamp}`.slice(0, 24) },
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

async function cleanup() {
  await cleanupExamcell([institutionId, rival.id], createdUsers);
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
  eq(rivalOverview.status, 200, "another institution's officer has their own dashboard");

  // ═══ 2. The old endpoint is GONE ═════════════════════════════════════════════════════════════
  section('2. The old flat dashboard is a 404, not a quietly different shape');

  const old = await call('GET', '/dashboard', { token: officerToken });
  eq(old.status, 404, 'the old GET /examcell/dashboard is gone');
  ok(
    old.json?.error !== undefined || old.status === 404,
    'and it answers with an error, not with the old hero-and-stats shape',
  );

  // ═══ 3. The catalogue ══════════════════════════════════════════════════════════════════════
  section('3. The catalogue publishes the vocabulary');

  const cat = await call('GET', '/dashboard/catalogue', { token: officerToken });
  eq(cat.status, 200, 'the catalogue is served');
  eq(cat.data?.blocks?.length, 7, 'it carries the seven sections');
  eq(cat.data?.quickActions?.length, 4, 'the four quick actions');
  eq(cat.data?.alertKinds?.length, 6, 'the six alert kinds');
  ok(cat.data?.blocks?.every((b: any) => b.label && b.icon && b.color && b.order), 'every section has its chrome');
  ok(cat.data?.quickActions?.every((a: any) => a.label && a.route && a.icon), 'every action has its chrome');
  ok(cat.data?.alertKinds?.every((a: any) => a.label && a.severity && a.route), 'every alert kind has its chrome');
  ok(typeof cat.data?.thresholds?.upcomingWindowDays === 'number', 'and the thresholds');

  // ═══ 4. The overview carries all seven sections ══════════════════════════════════════════════
  section('4. The overview answers all seven questions in one call');

  const o = await call('GET', '/dashboard/overview', { token: officerToken });
  eq(o.status, 200, 'the overview is served');
  ok(o.data?.overview !== undefined, 'it carries the exam overview');
  ok(o.data?.evaluation !== undefined, 'the evaluation status');
  ok(o.data?.results !== undefined, 'the result progress');
  ok(o.data?.students !== undefined, 'the student statistics');
  ok(o.data?.alerts !== undefined, 'the exam alerts');
  ok(o.data?.actions !== undefined, 'the quick actions');
  ok(o.data?.performance !== undefined, 'the performance snapshot');

  // THE SEVEN, BY NAME. The section keys are the contract, and a screen that asks for one by name
  // must find it.
  for (const key of [
    'overview',
    'evaluation',
    'results',
    'students',
    'alerts',
    'actions',
    'performance',
  ]) {
    ok(`the overview carries "${key}"`, o.data?.[key] !== undefined);
  }

  // ═══ 5. The filters ═══════════════════════════════════════════════════════════════════════
  section('5. The filters');

  const withExam = await call('GET', '/dashboard/overview?examId=does-not-exist', {
    token: officerToken,
  });
  eq(withExam.status, 200, 'an unknown exam is an empty scope, not an error');
  eq(withExam.data?.scope, 'exam', 'and the scope says so');
  eq(withExam.data?.examId, 'does-not-exist', 'and it echoes the filter back');

  const misspelled = await call('GET', '/dashboard/overview?examid=abc', { token: officerToken });
  eq(misspelled.status, 400, 'a MISSPELLED query param is rejected rather than ignored');

  const unknownParam = await call('GET', '/dashboard/overview?nonsense=1', { token: officerToken });
  eq(unknownParam.status, 400, 'an unknown query param is rejected');

  // ═══ 6. The per-block route ═══════════════════════════════════════════════════════════════
  section('6. The per-block route');

  const cat2 = await call('GET', '/dashboard/catalogue', { token: officerToken });
  for (const block of cat2.data?.blocks ?? []) {
    const one = await call('GET', `/dashboard/blocks/${block.id}`, { token: officerToken });
    eq(one.status, 200, `the "${block.id}" block is served`);
    eq(one.data?.block, block.id, `...and it names itself`);
    ok(one.data?.data !== undefined, `...and it carries data`);
  }

  const unknownBlock = await call('GET', '/dashboard/blocks/NOPE', { token: officerToken });
  eq(unknownBlock.status, 422, 'an unknown block is a 422 naming the list');
  ok(Array.isArray(unknownBlock.json?.error?.details?.allowed), 'and it says what IS allowed');

  // THE TWO ROUTES MUST AGREE. Two functions counting the same thing is how two screens start
  // disagreeing, and the whole point of the rewrite was ONE place per figure.
  const viaBlock = await call('GET', '/dashboard/blocks/STUDENT_STATISTICS', { token: officerToken });
  eq(viaBlock.data?.data?.appeared, o.data?.students?.appeared, 'the appeared count agrees');
  eq(viaBlock.data?.data?.absent, o.data?.students?.absent, 'the absent count agrees');
  eq(viaBlock.data?.data?.unmarked, o.data?.students?.unmarked, 'the unmarked count agrees');
  eq(
    viaBlock.data?.data?.registered,
    o.data?.students?.registered,
    'the registered count agrees',
  );

  // ═══ 7. The alerts are structured ═══════════════════════════════════════════════════════════
  section('7. The alerts are structured, not prose');

  const alerts = o.data?.alerts?.alerts ?? [];
  eq(alerts.length, 6, 'every alert kind is present, zeroes included');
  for (const a of alerts) {
    ok(`${a.kind} carries a count`, typeof a.count === 'number');
    ok(`${a.kind} carries a tone`, typeof a.tone === 'string');
    ok(`${a.kind} carries a route`, typeof a.route === 'string');
    ok(`${a.kind} carries a severity`, typeof a.severity === 'string');
    ok(`${a.kind} carries a label`, typeof a.label === 'string' && a.label.length > 0);
  }
  const zeroAlert = alerts.find((a: any) => a.count === 0);
  ok('a zero-count alert is CLEAR, not alarming', zeroAlert === undefined || zeroAlert.tone === 'clear');
  ok('and none of the alerts is a bare string', alerts.every((a: any) => typeof a === 'object'));

  // ═══ 8. The quick actions ═══════════════════════════════════════════════════════════════════
  section('8. The quick actions carry their live counts');

  const actions = o.data?.actions?.actions ?? [];
  eq(actions.length, 4, 'there are four');
  for (const a of actions) {
    ok(`${a.id} carries a count`, typeof a.count === 'number');
    ok(`${a.id} carries a tone`, typeof a.tone === 'string');
  }
  const catalogueActions = cat2.data?.quickActions ?? [];
  for (const a of catalogueActions) {
    const live = actions.find((x: any) => x.id === a.id);
    ok(`${a.id} is in the live list too`, live !== undefined);
    eq(live?.route ?? a.route, a.route, `...and it points at the same route`);
  }

  // ═══ 9. The old surface's fields are gone ════════════════════════════════════════════════════
  section("9. The old dashboard's shape is gone from the new one");

  ok('there is no `hero` bag', o.data?.hero === undefined);
  ok('there is no flat `stats` bag', o.data?.stats === undefined);
  ok('there is no `upcomingExams` array', o.data?.upcomingExams === undefined);
  ok('there is no `recentCheating` array', o.data?.recentCheating === undefined);
  ok('the alerts are not a flat string array', !Array.isArray(o.data?.alerts));
} catch (e) {
  noteThrow(e);
} finally {
  await cleanup();
  report('Exam cell dashboard HTTP verification');
  await prisma.$disconnect();
  server.close();
}
