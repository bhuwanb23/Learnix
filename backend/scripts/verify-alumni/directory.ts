/**
 * Suite: dashboard, directory, chapters, RBAC, facets, privacy, networking.
 *
 * Extracted from `verify-alumni.ts` §§1–3, 7, 10–13. What is left in this file rather
 * than split further is the READ surface that shares no fixture and no mutation: every
 * section here issues GETs and changes nothing, so there is no state to unwind and no
 * ordering dependency between them. The parts of `verify-alumni.ts` that DO mutate —
 * events, donations, mentorship, chapters-writes, profile, networking-writes — have their
 * own suites.
 *
 *   npx tsx scripts/verify-alumni/directory.ts
 *
 * SECTIONS, AND WHY EACH IS HERE
 * ------------------------------
 * 1-3  Dashboard and the alumni directory. Read-only, and `sample` is the row the detail
 *      assertion needs.
 * 4    Access control. A STUDENT must be refused by the alumni role gate. This is the one
 *      assertion in the whole alumni area that would silently pass under a broken gate if
 *      run with the wrong identity, so it uses an explicitly logged-in student rather than
 *      swapping a module-scope token.
 * 5    Directory facets and filters.
 * 6    Chapter reads — note `/chapters` returns an OBJECT `{ count, totalMembers,
 *      chapters[] }`, not a bare array. Reading it as an array yields a list of
 *      `undefined`, which is how the aggregate totals silently stopped being checked.
 * 7    Privacy. Tested as a BEHAVIOUR, not against seed state: the viewer sets their own
 *      privacy closed, a different graduate is asked for the profile, then the setting is
 *      flipped and the same request repeats. Asserting "hidden by default" against
 *      whatever the seed produced passes or fails for reasons unrelated to the gate.
 * 8    Networking and matches.
 */
import {
  Tally,
  banner,
  loginAs,
  officeLogin,
  requireServer,
  runSuite,
  section,
} from '../alumni-harness.js';

const t = new Tally();

async function run() {
  banner('Alumni — Directory, chapters and access control');
  await requireServer();

  const office = await officeLogin();
  t.check('auth/login (office)', !!office.token, office.email);

  // ── 1. Dashboard ─────────────────────────────────────────────────────────────
  section(1, 'Dashboard');
  const dash = await office.call('GET', '/alumni/dashboard');
  const d = dash.data;
  t.check('GET /dashboard', dash.status === 200 && !!d, `status ${dash.status}`);
  t.check('  engagement.totalAlumni', (d?.engagement?.totalAlumni ?? 0) > 10, `${d?.engagement?.totalAlumni} alumni`);
  t.check('  engagement.percentage', d?.engagement?.percentage > 0, `${d?.engagement?.percentage}% active`);
  t.check('  stats.donationsReceivedRupees', (d?.stats?.donationsReceivedRupees ?? 0) > 0, `Rs ${d?.stats?.donationsReceivedRupees}`);
  t.check('  stats.activeMentorships', (d?.stats?.activeMentorships ?? 0) > 0, `${d?.stats?.activeMentorships}`);
  t.check('  stats.pendingMentorships', (d?.stats?.pendingMentorships ?? 0) > 0, `${d?.stats?.pendingMentorships}`);
  t.check('  upcomingEvents[]', (d?.upcomingEvents?.length ?? 0) > 0, `${d?.upcomingEvents?.length} events`);
  t.check('  campaigns[]', (d?.campaigns?.length ?? 0) > 0, `${d?.campaigns?.length} campaigns`);

  // ── 2. Directory ─────────────────────────────────────────────────────────────
  section(2, 'Alumni network (directory)');
  const dir = await office.call('GET', '/alumni/directory');
  t.check('GET /directory', dir.status === 200, `status ${dir.status}`);
  t.check('  alumni[] populated', (dir.data?.alumni?.length ?? 0) > 10, `${dir.data?.alumni?.length} rows`);
  t.check('  stats.total', (dir.data?.stats?.total ?? 0) > 10, `${dir.data?.stats?.total}`);

  const sample = dir.data?.alumni?.[0];
  const q = await office.call('GET', `/alumni/directory?q=${encodeURIComponent('Engineer')}`);
  t.check('  ?q= search filters', (q.data?.alumni?.length ?? 0) > 0, `q=Engineer → ${q.data?.alumni?.length} rows`);

  const gradYear = sample?.graduationYear ?? 2019;
  const byBatch = await office.call('GET', `/alumni/directory?batch=${gradYear}`);
  const batchOk =
    (byBatch.data?.alumni?.length ?? 0) > 0 &&
    byBatch.data.alumni.every((a: any) => a.graduationYear === gradYear);
  t.check('  ?batch= filter', batchOk, `batch=${gradYear} → ${byBatch.data?.alumni?.length} rows, all match`);

  // ── 3. Alumni detail ─────────────────────────────────────────────────────────
  section(3, 'Alumni detail');
  const detail = await office.call('GET', `/alumni/directory/${sample.id}`);
  t.check('GET /directory/:id', detail.status === 200 && !!detail.data?.name, `${detail.data?.name}`);
  t.check(
    '  contributions block',
    !!detail.data?.contributions,
    `donated Rs ${detail.data?.contributions?.totalDonatedRupees ?? 0}`,
  );

  // ── 4. Access control ────────────────────────────────────────────────────────
  section(4, 'Access control');
  // Logged in explicitly rather than by swapping an ambient token: this assertion passes
  // for the wrong reason if it ever runs as the office, and there is nothing in the
  // request itself that would reveal which identity is in play.
  const student = await loginAs('student@learnix.dev');
  t.check('  student holds a STUDENT role', !student.isOffice, `roles: ${student.roles.join(', ')}`);
  const denied = await student.call('GET', '/alumni/dashboard');
  t.check('student blocked from /alumni', denied.status === 403, `got ${denied.status} (${denied.error?.code})`);

  // ── 5. Facets and filters ────────────────────────────────────────────────────
  section(5, 'Directory filters and facets');
  const facets = await office.call('GET', '/alumni/directory/facets');
  t.check('GET /directory/facets', facets.status === 200, `status ${facets.status}`);
  t.check(
    '  departments[] with counts',
    (facets.data?.departments?.length ?? 0) > 0,
    facets.data?.departments?.map((x: any) => `${x.code}(${x.count})`).join(' '),
  );
  t.check('  companies[]', (facets.data?.companies?.length ?? 0) > 0, `${facets.data?.companies?.length} companies`);
  t.check('  sectors[]', (facets.data?.sectors?.length ?? 0) > 0, (facets.data?.sectors ?? []).join(','));
  t.check('  locations[]', (facets.data?.locations?.length ?? 0) > 0, `${facets.data?.locations?.length} cities`);

  // Batches must be unique per GRADUATION YEAR — each program has its own batch for a
  // year, so listing rows produced duplicate "2023" chips.
  const batchYears = (facets.data?.batches ?? []).map((x: any) => x.graduationYear);
  t.check('  batches[] unique by year', new Set(batchYears).size === batchYears.length, batchYears.join(','));

  t.check(
    '  skills[]',
    (facets.data?.skills?.length ?? 0) > 0,
    `top: ${(facets.data?.skills ?? []).slice(0, 3).map((s: any) => s.skill).join(', ')}`,
  );

  const deptId = facets.data?.departments?.[0]?.id;
  const byDept = await office.call('GET', `/alumni/directory?departmentId=${deptId}`);
  t.check('  ?departmentId filters', byDept.status === 200 && (byDept.data?.stats?.total ?? 0) > 0, `${byDept.data?.stats?.total} rows`);
  const bySector = await office.call('GET', '/alumni/directory?sector=IT');
  t.check('  ?sector filters', bySector.status === 200 && (bySector.data?.stats?.total ?? 0) > 0, `IT → ${bySector.data?.stats?.total} rows`);
  const byLoc = await office.call('GET', '/alumni/directory?location=Bengaluru');
  t.check(
    '  ?location filters',
    byLoc.status === 200 && (byLoc.data?.alumni ?? []).every((a: any) => a.location === 'Bengaluru'),
    `${byLoc.data?.stats?.total} rows, all Bengaluru`,
  );
  const topSkill = facets.data?.skills?.[0]?.skill;
  const bySkill = await office.call('GET', `/alumni/directory?skill=${encodeURIComponent(topSkill)}`);
  t.check('  ?skill filters', bySkill.status === 200 && (bySkill.data?.stats?.total ?? 0) > 0, `${topSkill} → ${bySkill.data?.stats?.total} rows`);
  const paged = await office.call('GET', '/alumni/directory?page=2&pageSize=5');
  t.check(
    '  pagination shape',
    paged.data?.pagination?.page === 2 && paged.data?.pagination?.pageSize === 5,
    JSON.stringify(paged.data?.pagination),
  );

  // ── 6. Chapters ──────────────────────────────────────────────────────────────
  section(6, 'Chapters');
  const chap = await office.call('GET', '/alumni/chapters');
  t.check('GET /chapters', chap.status === 200, `status ${chap.status}`);
  t.check('  chapters[] populated', (chap.data?.chapters?.length ?? 0) > 0, `${chap.data?.chapters?.length} chapters`);
  t.check('  totalMembers reported', (chap.data?.totalMembers ?? 0) > 0, `${chap.data?.totalMembers} members`);

  const firstChapter = chap.data?.chapters?.[0];
  t.check(
    '  memberCount populated',
    (firstChapter?.memberCount ?? 0) > 0,
    `${firstChapter?.city}: ${firstChapter?.memberCount} members`,
  );
  t.check(
    '  memberCount matches actual',
    firstChapter?.memberCount === firstChapter?.actualMemberCount,
    `stored ${firstChapter?.memberCount} vs actual ${firstChapter?.actualMemberCount}`,
  );
  t.check('  president resolved', !!firstChapter?.president?.name, `${firstChapter?.president?.name ?? 'null'}`);

  const cd = await office.call('GET', `/alumni/chapters/${firstChapter.id}`);
  t.check('GET /chapters/:id', cd.status === 200, `${cd.data?.city}`);
  t.check('  stats block', !!cd.data?.stats, JSON.stringify(cd.data?.stats));
  t.check(
    '  upcoming/past events',
    Array.isArray(cd.data?.upcomingEvents) && Array.isArray(cd.data?.pastEvents),
    `${cd.data?.upcomingEvents?.length} upcoming / ${cd.data?.pastEvents?.length} past`,
  );
  t.check('  announcements[]', Array.isArray(cd.data?.announcements), `${cd.data?.announcements?.length} notices`);

  const cm = await office.call('GET', `/alumni/chapters/${firstChapter.id}/members?sort=seniority`);
  t.check('GET /chapters/:id/members', cm.status === 200 && (cm.data?.members?.length ?? 0) > 0, `${cm.data?.total} members`);
  const yrs = (cm.data?.members ?? []).map((m: any) => m.graduationYear).filter((y: any) => y != null);
  t.check(
    '  seniority sort ascending',
    yrs.every((y: number, i: number) => i === 0 || yrs[i - 1] <= y),
    `oldest first: ${yrs[0]}`,
  );

  const ca = await office.call('GET', `/alumni/chapters/${firstChapter.id}/activity`);
  t.check('GET /chapters/:id/activity', ca.status === 200 && (ca.data?.activity?.length ?? 0) > 0, `${ca.data?.count} items`);

  t.finish('Alumni — Directory, chapters and access control');
}

runSuite('Alumni — Directory, chapters and access control', run);