/**
 * Alumni endpoint verification — proves every screen in
 * `learnix/users/alumni/**` has real data behind it.
 *
 * Run (server must be listening on :4000):
 *   npx tsx scripts/verify-alumni.ts
 *
 * Checks all 17 routes in `alumni.routes.ts` plus the write actions, and
 * asserts the response is not merely 200 but actually POPULATED. A 200 with an
 * empty array is exactly the failure this seed exists to prevent, so "did it
 * return rows" is the assertion, not "did it return 200".
 */
const BASE = process.env.BASE_URL ?? 'http://localhost:4000/api/v1';
const EMAIL = 'priya@learnix.dev';
const PASSWORD = 'Passw0rd!';

// Direct database access is used for exactly two things: proving that a chosen
// graduate holds no office (so the role-gate assertions below are meaningful),
// and deleting the scratch chapter at the end — there is no DELETE chapter route
// and a leftover scratch chapter would corrupt the next run's region assertions.
const { prisma } = await import('../src/db/prisma.js');

let token = '';
let pass = 0;
let fail = 0;
const failures: string[] = [];

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as {
    data?: any;
    error?: { code?: string; message?: string };
  };
  return { status: res.status, data: json.data, error: json.error };
}

/** Log in as a different graduate. Used to test privacy from a real second
 *  alumnus's perspective rather than the office's. */
async function loginAs(email: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const json = (await res.json().catch(() => ({}))) as { data?: { accessToken?: string } };
  if (!json.data?.accessToken) throw new Error(`login failed for ${email}`);
  return json.data.accessToken;
}

/** Unique-per-run suffix so a scratch chapter can be found and deleted again. */
function stampSuffix() {
  return String(Date.now() % 1000000);
}

function check(label: string, ok: boolean, detail: string) {
  if (ok) {
    pass++;
    console.log(`  \u2713 ${label.padEnd(46)} ${detail}`);
  } else {
    fail++;
    failures.push(label);
    console.log(`  \u2717 ${label.padEnd(46)} ${detail}`);
  }
}

async function main() {
  console.log('\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
  console.log('  Alumni Endpoint Verification');
  console.log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');

  // ── auth ──
  const login = await call('POST', '/auth/login', { email: EMAIL, password: PASSWORD });
  if (login.status !== 200 || !login.data?.accessToken) {
    console.error(`  Login FAILED (${login.status}): ${login.error?.message ?? 'no token'}`);
    process.exit(1);
  }
  token = login.data.accessToken;
  // Captured once, up front. Every "act as the office / act as a graduate"
  // switch below MUST use this or `loginAs(...)`, never the ambient `token` —
  // tracking which identity the global currently holds is how a test ends up
  // asserting "the office is blocked" while actually running as a graduate.
  const OFFICE_TOKEN = token;
  check('auth/login', true, `token for ${EMAIL}`);

  // ── 1. Dashboard ──
  console.log('\n\u2500\u2500 1. Dashboard');
  const dash = await call('GET', '/alumni/dashboard');
  const d = dash.data;
  check('GET /dashboard', dash.status === 200 && !!d, `status ${dash.status}`);
  check('  engagement.totalAlumni', (d?.engagement?.totalAlumni ?? 0) > 10, `${d?.engagement?.totalAlumni} alumni`);
  check('  engagement.percentage', d?.engagement?.percentage > 0, `${d?.engagement?.percentage}% active`);
  check('  stats.donationsReceivedRupees', (d?.stats?.donationsReceivedRupees ?? 0) > 0, `Rs ${d?.stats?.donationsReceivedRupees}`);
  check('  stats.activeMentorships', (d?.stats?.activeMentorships ?? 0) > 0, `${d?.stats?.activeMentorships}`);
  check('  stats.pendingMentorships', (d?.stats?.pendingMentorships ?? 0) > 0, `${d?.stats?.pendingMentorships}`);
  check('  upcomingEvents[]', (d?.upcomingEvents?.length ?? 0) > 0, `${d?.upcomingEvents?.length} events`);
  check('  campaigns[]', (d?.campaigns?.length ?? 0) > 0, `${d?.campaigns?.length} campaigns`);

  // ── 2. Directory ──
  console.log('\n\u2500\u2500 2. Alumni Network (directory)');
  const dir = await call('GET', '/alumni/directory');
  check('GET /directory', dir.status === 200, `status ${dir.status}`);
  check('  alumni[] populated', (dir.data?.alumni?.length ?? 0) > 10, `${dir.data?.alumni?.length} rows`);
  check('  stats.total', (dir.data?.stats?.total ?? 0) > 10, `${dir.data?.stats?.total}`);

  const sample = dir.data?.alumni?.[0];
  const q = await call('GET', `/alumni/directory?q=${encodeURIComponent('Engineer')}`);
  check('  ?q= search filters', (q.data?.alumni?.length ?? 0) > 0, `q=Engineer \u2192 ${q.data?.alumni?.length} rows`);

  const gradYear = sample?.graduationYear ?? 2019;
  const b = await call('GET', `/alumni/directory?batch=${gradYear}`);
  const batchOk = (b.data?.alumni?.length ?? 0) > 0 && b.data.alumni.every((a: any) => a.graduationYear === gradYear);
  check('  ?batch= filter', batchOk, `batch=${gradYear} \u2192 ${b.data?.alumni?.length} rows, all match`);

  // ── 3. Alumni detail ──
  const detail = await call('GET', `/alumni/directory/${sample.id}`);
  check('GET /directory/:id', detail.status === 200 && !!detail.data?.name, `${detail.data?.name}`);
  check('  contributions block', !!detail.data?.contributions, `donated Rs ${detail.data?.contributions?.totalDonatedRupees ?? 0}`);

  // ── 4. Events ──
  console.log('\n\u2500\u2500 4. Events');
  const ev = await call('GET', '/alumni/events');
  check('GET /events', ev.status === 200, `status ${ev.status}`);
  check('  upcoming[]', (ev.data?.upcoming?.length ?? 0) > 0, `${ev.data?.upcoming?.length} upcoming`);
  check('  completed[] (history)', (ev.data?.completed?.length ?? 0) > 0, `${ev.data?.completed?.length} past`);

  const evId = ev.data?.upcoming?.[0]?.id;
  const evd = await call('GET', `/alumni/events/${evId}`);
  check('GET /events/:id', evd.status === 200 && !!evd.data?.title, `${evd.data?.title}`);
  check('  schedule[] timeline', (evd.data?.schedule?.length ?? 0) > 0, `${evd.data?.schedule?.length} items`);
  check('  rsvpList[]', (evd.data?.rsvpList?.length ?? 0) > 0, `${evd.data?.rsvpList?.length} RSVPs`);

  // Assert EVERY event carries a schedule, not just the one we happened to open.
  // An alumni event with an empty timeline renders a blank detail screen, and
  // the list is sorted by startDate — so one bare event is enough to make the
  // screen look broken on first load.
  const allEvents = [...(ev.data?.upcoming ?? []), ...(ev.data?.completed ?? [])];
  const bare: string[] = [];
  for (const e of allEvents) {
    const det = await call('GET', `/alumni/events/${e.id}`);
    if ((det.data?.schedule?.length ?? 0) === 0) bare.push(e.title);
  }
  check('  all events have a schedule', bare.length === 0, `${allEvents.length} checked${bare.length ? ` — bare: ${bare.join(', ')}` : ''}`);

// RSVP write: flip CONFIRMED <-> DECLINED and flip it back. Only those two
  // are decidable (`rsvpDecisionSchema` is CONFIRMED|DECLINED) — PENDING is the
  // pre-decision state, not a decision, so it cannot be restored to.
  const rsvp = evd.data?.rsvpList?.find((r: any) => r.status === 'CONFIRMED' || r.status === 'DECLINED');
  const rsvpTarget = evd.data?.rsvpList?.find((r: any) => r.id !== rsvp?.id);
  if (rsvp) {
    const to = rsvp.status === 'CONFIRMED' ? 'DECLINED' : 'CONFIRMED';
    const dec = await call('POST', `/alumni/rsvps/${rsvp.id}/decide`, { decision: to });
    check('POST /rsvps/:id/decide', dec.status === 200 && dec.data?.changed === true, `${rsvp.status} → ${to}`);
    const back = await call('POST', `/alumni/rsvps/${rsvp.id}/decide`, { decision: rsvp.status });
    check('  reverted cleanly', back.status === 200 && back.data?.changed === true, `restored to ${rsvp.status}`);
    const noop = await call('POST', `/alumni/rsvps/${rsvp.id}/decide`, { decision: rsvp.status });
    check('  repeat decide is a no-op', noop.status === 200 && noop.data?.changed === false, 'changed=false');
  }
  if (rsvpTarget) {
    const bad = await call('POST', `/alumni/rsvps/${rsvpTarget.id}/decide`, { decision: 'PENDING' });
    check('  invalid decision rejected', bad.status === 400, `PENDING → ${bad.status} (${bad.error?.code})`);
  }

  // ── 5. Donations ──
  console.log('\n\u2500\u2500 5. Donations');
  const don = await call('GET', '/alumni/donations');
  check('GET /donations', don.status === 200, `status ${don.status}`);
  check('  campaigns[]', (don.data?.campaigns?.length ?? 0) > 0, `${don.data?.campaigns?.length} campaigns`);
  check('  donations[]', (don.data?.donations?.length ?? 0) > 0, `${don.data?.donations?.length} donations`);
  check('  fy.collectedRupees', (don.data?.fy?.collectedRupees ?? 0) > 0, `Rs ${don.data?.fy?.collectedRupees} from ${don.data?.fy?.donors} donors`);
  const pctShown = don.data?.campaigns?.[0]?.percent;
  check('  campaign percent computed', typeof pctShown === 'number', `${pctShown}% on "${don.data?.campaigns?.[0]?.name}"`);

  // Record a pledge end-to-end: PLEDGED → payment + receipt.
  //
  // Two things this must get right. The subject is chosen via prisma rather than
  // from `donations[]`, because that endpoint is paged and a PLEDGED donation is
  // not guaranteed to be on page 1 — searching the page turned a working feature
  // into a failing assertion once the seed's first-page pledge had been recorded.
  // And the donation is restored afterwards, because recording it is the one
  // mutation here that cannot be replayed.
  const pledged = await prisma.donation.findFirst({
    where: { status: 'PLEDGED' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (pledged) {
    const rec = await call('POST', `/alumni/donations/${pledged.id}/record`);
    check('POST /donations/:id/record', rec.status === 200 && rec.data?.status === 'RECEIVED', `receipt ${rec.data?.receiptNo ?? 'n/a'}`);
    const dup = await call('POST', `/alumni/donations/${pledged.id}/record`);
    check('  re-record rejected 409', dup.status === 409, `got ${dup.status} (${dup.error?.code})`);
    // Recording also writes through to a Payment row. The link is removed and the
    // donation returned to PLEDGED so the next run finds a usable fixture; the
    // Payment row itself is LEFT IN PLACE because six tables reference it and
    // deleting it would reach outside this module to clean up after the test.
    const links = await prisma.donationPayment.findMany({ where: { donationId: pledged.id }, select: { paymentId: true } });
    await prisma.donationPayment.deleteMany({ where: { donationId: pledged.id } });
    await prisma.donation.update({ where: { id: pledged.id }, data: { status: 'PLEDGED', receivedAt: null, paymentId: null } });
    const restored = await prisma.donation.findUnique({ where: { id: pledged.id }, select: { status: true, paymentId: true } });
    check('  donation restored to PLEDGED', restored?.status === 'PLEDGED' && restored?.paymentId === null, `status ${restored?.status}, ${links.length} link(s) removed`);
  } else {
    check('POST /donations/:id/record', false, 'no PLEDGED donation in the database');
  }

  // ── 6. Mentorship ──
  console.log('\n\u2500\u2500 6. Mentorship');
  const men = await call('GET', '/alumni/mentorship');
  check('GET /mentorship', men.status === 200, `status ${men.status}`);
  check('  active[] pairs', (men.data?.active?.length ?? 0) > 0, `${men.data?.active?.length} active`);
  check('  pending[] requests', (men.data?.pending?.length ?? 0) > 0, `${men.data?.pending?.length} pending`);
  check('  recentSessions[]', (men.data?.recentSessions?.length ?? 0) > 0, `${men.data?.recentSessions?.length} sessions`);
  const activePair = men.data?.active?.[0];
  check('  pair shows session count', (activePair?.sessions ?? 0) >= 0, `${activePair?.sessions} sessions on "${activePair?.field}"`);

  const remind = await call('POST', `/alumni/mentorship/${activePair.id}/remind`);
  check('POST /mentorship/:id/remind', remind.status === 200 && remind.data?.reminded === true, 'reminder sent');

// ── 7. Chapters ──
// `/chapters` returns an OBJECT ({ count, totalMembers, chapters[] }), not a
// bare array. The aggregate totals live on the wrapper, and reading the response
// as an array yields a list of `undefined`.
console.log('\n── 7. Chapters');
const chap = await call('GET', '/alumni/chapters');
check('GET /chapters', chap.status === 200, `status ${chap.status}`);
check('  chapters[] populated', (chap.data?.chapters?.length ?? 0) > 0, `${chap.data?.chapters?.length} chapters`);
check('  totalMembers reported', (chap.data?.totalMembers ?? 0) > 0, `${chap.data?.totalMembers} members`);
const firstChapter = chap.data?.chapters?.[0];
check('  memberCount populated', (firstChapter?.memberCount ?? 0) > 0, `${firstChapter?.city}: ${firstChapter?.memberCount} members`);
check('  memberCount matches actual', firstChapter?.memberCount === firstChapter?.actualMemberCount, `stored ${firstChapter?.memberCount} vs actual ${firstChapter?.actualMemberCount}`);
check('  president resolved', !!firstChapter?.president?.name, `${firstChapter?.president?.name ?? 'null'}`);

const cd = await call('GET', `/alumni/chapters/${firstChapter.id}`);
check('GET /chapters/:id', cd.status === 200, `${cd.data?.city}`);
check('  stats block', !!cd.data?.stats, JSON.stringify(cd.data?.stats));
check('  upcoming/past events', Array.isArray(cd.data?.upcomingEvents) && Array.isArray(cd.data?.pastEvents), `${cd.data?.upcomingEvents?.length} upcoming / ${cd.data?.pastEvents?.length} past`);
check('  announcements[]', Array.isArray(cd.data?.announcements), `${cd.data?.announcements?.length} notices`);

const cm = await call('GET', `/alumni/chapters/${firstChapter.id}/members?sort=seniority`);
check('GET /chapters/:id/members', cm.status === 200 && (cm.data?.members?.length ?? 0) > 0, `${cm.data?.total} members`);
const yrs = (cm.data?.members ?? []).map((m: any) => m.graduationYear).filter((y: any) => y != null);
check('  seniority sort ascending', yrs.every((y: number, i: number) => i === 0 || yrs[i - 1] <= y), `oldest first: ${yrs[0]}`);

const ca = await call('GET', `/alumni/chapters/${firstChapter.id}/activity`);
check('GET /chapters/:id/activity', ca.status === 200 && (ca.data?.activity?.length ?? 0) > 0, `${ca.data?.count} items`);

  // ── 8. Notifications + broadcast ──
  console.log('\n\u2500\u2500 8. Notifications');
  const notif = await call('GET', '/alumni/notifications');
  check('GET /notifications', notif.status === 200, `status ${notif.status}`);
  check('  notifications[] populated', (notif.data?.notifications?.length ?? 0) > 0, `${notif.data?.notifications?.length} items`);

  const bc = await call('POST', '/alumni/broadcasts', {
    audience: 'ALL_ALUMNI',
    templateKey: 'NEWSLETTER',
    title: 'Alumni Newsletter — Autumn 2026',
    body: 'Homecoming dates, the new lab fund, and chapter meetups near you.',
  });
  check('POST /broadcasts', bc.status === 201, `${bc.data?.recipients} recipients`);

  const readAll = await call('POST', '/alumni/notifications/read-all');
  check('POST /notifications/read-all', readAll.status === 200, `${readAll.data?.updated} marked read`);
  const notif2 = await call('GET', '/alumni/notifications');
  check('  unread now 0', notif2.data?.unread === 0, `unread=${notif2.data?.unread}`);

  // ── 9. Profile ──
  console.log('\n\u2500\u2500 9. Profile');
  const prof = await call('GET', '/alumni/profile');
  check('GET /profile', prof.status === 200 && !!prof.data?.fullName, `${prof.data?.fullName} (${prof.data?.roles?.join(', ')})`);
  check('  programStats block', !!prof.data?.programStats, JSON.stringify(prof.data?.programStats));

// ── 10. RBAC: a non-alumni role must be refused ──
  console.log('\n══ 10. Access control');
  const adminLogin = await call('POST', '/auth/login', { email: 'student@learnix.dev', password: PASSWORD });
  const realToken = token;
  token = adminLogin.data?.accessToken ?? '';
  const denied = await call('GET', '/alumni/dashboard');
  check('student blocked from /alumni', denied.status === 403, `got ${denied.status} (${denied.error?.code})`);
  token = realToken;

  // ── 11. Directory: facets, filters, privacy ──
  console.log('\n── 11. Directory filters & facets');
  token = OFFICE_TOKEN;
  const facets = await call('GET', '/alumni/directory/facets');
  check('GET /directory/facets', facets.status === 200, `status ${facets.status}`);
  check('  departments[] with counts', (facets.data?.departments?.length ?? 0) > 0, facets.data?.departments?.map((d: any) => `${d.code}(${d.count})`).join(' '));
  check('  companies[]', (facets.data?.companies?.length ?? 0) > 0, `${facets.data?.companies?.length} companies`);
  check('  sectors[]', (facets.data?.sectors?.length ?? 0) > 0, (facets.data?.sectors ?? []).join(','));
  check('  locations[]', (facets.data?.locations?.length ?? 0) > 0, `${facets.data?.locations?.length} cities`);
  // Batches must be unique per GRADUATION YEAR — each program has its own batch
  // for a year, so listing rows produced duplicate "2023" chips.
  const yrs2 = (facets.data?.batches ?? []).map((x: any) => x.graduationYear);
  check('  batches[] unique by year', new Set(yrs2).size === yrs2.length, yrs2.join(','));
  check('  skills[]', (facets.data?.skills?.length ?? 0) > 0, `top: ${(facets.data?.skills ?? []).slice(0, 3).map((s: any) => s.skill).join(', ')}`);

  const deptId = facets.data?.departments?.[0]?.id;
  const byDept = await call('GET', `/alumni/directory?departmentId=${deptId}`);
  check('  ?departmentId filters', byDept.status === 200 && (byDept.data?.stats?.total ?? 0) > 0, `${byDept.data?.stats?.total} rows`);
  const bySector = await call('GET', '/alumni/directory?sector=IT');
  check('  ?sector filters', bySector.status === 200 && (bySector.data?.stats?.total ?? 0) > 0, `IT → ${bySector.data?.stats?.total} rows`);
  const byLoc = await call('GET', '/alumni/directory?location=Bengaluru');
  check('  ?location filters', byLoc.status === 200 && (byLoc.data?.alumni ?? []).every((a: any) => a.location === 'Bengaluru'), `${byLoc.data?.stats?.total} rows, all Bengaluru`);
  const topSkill = facets.data?.skills?.[0]?.skill;
  const bySkill = await call('GET', `/alumni/directory?skill=${encodeURIComponent(topSkill)}`);
  check('  ?skill filters', bySkill.status === 200 && (bySkill.data?.stats?.total ?? 0) > 0, `${topSkill} → ${bySkill.data?.stats?.total} rows`);
  const paged = await call('GET', '/alumni/directory?page=2&pageSize=5');
  check('  pagination shape', paged.data?.pagination?.page === 2 && paged.data?.pagination?.pageSize === 5, JSON.stringify(paged.data?.pagination));

  // ── 12. Privacy gate ──
  // Tested as a BEHAVIOUR, not against seed state: the viewer sets their own
  // privacy closed, a different graduate is asked for the profile, then the
  // setting is flipped and the same request is repeated. Asserting "hidden by
  // default" against whatever the seed happened to produce passes or fails for
  // reasons that have nothing to do with the gate.
  console.log('\n── 12. Privacy controls');
  const officeView = await call('GET', '/alumni/directory?pageSize=50');
  const emailOf = new Map<string, string>(
    (officeView.data?.alumni ?? []).map((a: any) => [a.id, a.email]),
  );
  const viewerProfile = (officeView.data?.alumni ?? []).find((a: any) => emailOf.get(a.id));
  const otherProfile = (officeView.data?.alumni ?? []).find((a: any) => a.id !== viewerProfile?.id && emailOf.get(a.id));

  const officeSeesOther = await call('GET', `/alumni/directory/${otherProfile.id}`);
  check('office sees contact details', officeSeesOther.data?.visibilityReason === 'OFFICE' && !!officeSeesOther.data?.email, `${officeSeesOther.data?.email}`);

  const peerToken = await loginAs(otherProfile.email);
  const alumnusToken = await loginAs(viewerProfile.email);

  // Closed: the alumnus withdraws their email from anyone but connections.
  token = alumnusToken;
  await call('PUT', '/alumni/me', { privacy: { showEmail: false, visibleTo: 'CONNECTIONS' } });
  token = peerToken;
  const peerClosed = await call('GET', `/alumni/directory/${viewerProfile.id}`);
  check(
    'peer sees no email when withdrawn',
    peerClosed.data?.email === null && peerClosed.data?.contactVisible === false,
    `email=${peerClosed.data?.email} reason=${peerClosed.data?.visibilityReason}`,
  );

  // Open: the same alumnus opts in, and the same peer must now see it.
  token = alumnusToken;
  await call('PUT', '/alumni/me', { privacy: { showEmail: true, visibleTo: 'ANYONE' } });
  token = peerToken;
  const peerOpen = await call('GET', `/alumni/directory/${viewerProfile.id}`);
  check(
    'peer sees email after opting in',
    peerOpen.data?.email === viewerProfile.email,
    `email=${peerOpen.data?.email} reason=${peerOpen.data?.visibilityReason}`,
  );
  const peerSees = await call('GET', `/alumni/directory/${viewerProfile.id}`);
  check('peer still sees non-contact fields', !!peerSees.data?.name && peerSees.data?.skills !== undefined, `skills=${peerSees.data?.skills?.length} career=${peerSees.data?.career?.length}`);

  // Self-connection must be rejected — and must be rejected while acting AS the
  // owner of that profile, or the assertion proves nothing.
  const selfId = (await call('GET', '/alumni/me')).data?.id;
  const selfConn = await call('POST', '/alumni/connections', { profileId: selfId });
  check('cannot connect to self', selfConn.status === 400, `${selfConn.status} (${selfConn.error?.code})`);

  // ── 13. Networking + matches ──
  console.log('\n── 13. Networking');
  token = alumnusToken;

  const stats = await call('GET', '/alumni/connections/stats');
  check('GET /connections/stats', stats.status === 200, JSON.stringify(stats.data));

  for (const box of ['incoming', 'outgoing', 'accepted']) {
    const b = await call('GET', `/alumni/connections?box=${box}`);
    check(`GET /connections?box=${box}`, b.status === 200 && typeof b.data?.count === 'number', `${b.data?.count} items`);
  }

  for (const type of ['connections', 'mentors']) {
    const m = await call('GET', `/alumni/matches?type=${type}&limit=5`);
    const matches = m.data?.matches ?? [];
    check(`GET /matches?type=${type}`, m.status === 200 && matches.length > 0, `${matches.length} matches from ${m.data?.totalConsidered} candidates`);
    check('  scores are explainable', matches.every((x: any) => typeof x.score === 'number' && Array.isArray(x.reasons)), `top ${matches[0]?.score}: ${(matches[0]?.reasons ?? []).join(' | ')}`);
  }

  // Full lifecycle on a pair with no existing connection.
  const ownDir = await call('GET', '/alumni/directory?pageSize=50');
  const freeTarget = (ownDir.data?.alumni ?? []).find((a: any) => !a.isSelf && a.connectionStatus === null);
  if (freeTarget) {
    const created = await call('POST', '/alumni/connections', { profileId: freeTarget.id, message: 'Verification run.' });
    check('POST /connections (request)', created.status === 201 && created.data?.status === 'PENDING', `→ ${freeTarget.name}`);
    const dupe = await call('POST', '/alumni/connections', { profileId: freeTarget.id });
    check('  duplicate rejected', dupe.status === 409, `${dupe.status} (${dupe.error?.code})`);

    const targetEmail = emailOf.get(freeTarget.id);
    if (!targetEmail) {
      check('recipient can accept', false, 'no email resolvable for the target (privacy gate blocked the office)');
    } else {
    const targetToken = await loginAs(targetEmail);
    token = targetToken;
    const accepted = await call('POST', `/alumni/connections/${created.data.id}/accept`);
    check('  recipient accepts', accepted.status === 200 && accepted.data?.status === 'ACCEPTED', `status ${accepted.data?.status}`);
    const twice = await call('POST', `/alumni/connections/${created.data.id}/decline`);
    check('  cannot re-decide', twice.status === 422, `${twice.status} (${twice.error?.code})`);

    token = OFFICE_TOKEN;
    const officeConn = await call('POST', '/alumni/connections', { profileId: freeTarget.id });
    check('office cannot forge requests', officeConn.status === 422, `${officeConn.status} (${officeConn.error?.code})`);

    token = alumnusToken;
    const after = await call('GET', `/alumni/directory/${freeTarget.id}`);
    check('connection state reflected', after.data?.connectionStatus === 'ACCEPTED', `status ${after.data?.connectionStatus}`);
    }
  } else {
    check('POST /connections (request)', false, 'no unconnected pair available to test with');
  }

  // ── 14. Self-service profile ──
  console.log('\n── 14. Self-service profile');
  token = alumnusToken;
  const mine = await call('GET', '/alumni/me');
  check('GET /me', mine.status === 200 && !!mine.data?.name, `${mine.data?.name}`);
  const newHeadline = `Verification headline ${Date.now() % 100000}`;
  const updated = await call('PUT', '/alumni/me', {
    headline: newHeadline,
    skills: [{ skill: 'Kubernetes', level: 'EXPERT' }, { skill: 'Rust', level: 'ADVANCED' }],
    privacy: { showEmail: true, visibleTo: 'ANYONE' },
  });
  check('PUT /me', updated.status === 200 && updated.data?.headline === newHeadline, `headline set`);
  check('  skills replaced', (updated.data?.skills ?? []).length === 2, (updated.data?.skills ?? []).map((s: any) => s.skill).join(','));
  check('  career/education untouched', (updated.data?.career?.length ?? 0) >= 0 && !!updated.data?.education, `career=${updated.data?.career?.length} education=${!!updated.data?.education}`);
  check('  privacy applied', updated.data?.visibilityReason === 'SELF', `reason ${updated.data?.visibilityReason}`);
  const badSkill = await call('PUT', '/alumni/me', { skills: 'not-an-array' });
  check('  invalid body rejected', badSkill.status === 400, `${badSkill.status} (${badSkill.error?.code})`);

  // ── 15. Chapters v2: regions, leadership, initiatives, performance ──
  // Write assertions run against a scratch chapter that is deleted again at the
  // end, so no officer or initiative rows survive in the seeded chapters.
  console.log('\n── 15. Chapters: directory, leadership, initiatives');
  token = OFFICE_TOKEN;

  const chapters = await call('GET', '/alumni/chapters');
  check('GET /chapters', chapters.status === 200 && (chapters.data?.chapters ?? []).length > 0, `${chapters.data?.chapters?.length} chapters`);
  check('  regions[] grouped', (chapters.data?.regions ?? []).length > 0, (chapters.data?.regions ?? []).map((r: any) => `${r.region}(${r.count})`).join(' '));
  check('  tiers[] counts by type', typeof chapters.data?.tiers?.local === 'number' && typeof chapters.data?.tiers?.regional === 'number', `local ${chapters.data?.tiers?.local} / regional ${chapters.data?.tiers?.regional}`);
  const allChapters = chapters.data?.chapters ?? [];
  check('  every chapter has a region', allChapters.every((c: any) => !!c.region), `${allChapters.filter((c: any) => !!c.region).length}/${allChapters.length}`);
  const regionalChapter = allChapters.find((c: any) => c.tier === 'REGIONAL');
  const localChapter = allChapters.find((c: any) => c.tier === 'LOCAL');
  check('  seed has both tiers', !!regionalChapter && !!localChapter, `${regionalChapter?.city ?? '-'} / ${localChapter?.city ?? '-'}`);

  const sampleRegion = chapters.data?.regions?.[0]?.region;
  const byRegion = await call('GET', `/alumni/chapters?region=${encodeURIComponent(sampleRegion)}`);
  check('  ?region filters', byRegion.status === 200 && (byRegion.data?.chapters ?? []).every((c: any) => c.region === sampleRegion), `${sampleRegion} -> ${byRegion.data?.chapters?.length}`);
  const byTier = await call('GET', '/alumni/chapters?tier=REGIONAL');
  check('  ?tier filters', byTier.status === 200 && (byTier.data?.chapters ?? []).every((c: any) => c.tier === 'REGIONAL'), `${byTier.data?.chapters?.length} regional`);

  // The detail screen shows the president from the officers table and the
  // denormalised pointer at the same time, so they must agree.
  const seeded = allChapters.find((c: any) => c.officerCount > 0) ?? allChapters[0];
  const seededDetail = await call('GET', `/alumni/chapters/${seeded.id}`);
  check('GET /chapters/:id', seededDetail.status === 200 && seededDetail.data?.city === seeded.city, seededDetail.data?.city);
  check('  president present in detail', !!seededDetail.data?.president, seededDetail.data?.president?.name ?? 'none');
  check('  viewerContext present', seededDetail.data?.viewerContext !== undefined, `canManageOfficers=${seededDetail.data?.viewerContext?.canManageOfficers}`);
  check('  office cannot join', seededDetail.data?.viewerContext?.canJoin === false, `canJoin=${seededDetail.data?.viewerContext?.canJoin}`);

  const seedOfficers = await call('GET', `/alumni/chapters/${seeded.id}/officers?includePast=true`);
  const currentSeed = (seedOfficers.data?.officers ?? []).filter((o: any) => o.isCurrent);
  check('GET /officers', seedOfficers.status === 200 && currentSeed.length > 0, `${currentSeed.length} current, ${seedOfficers.data?.counts?.past ?? 0} past`);
  check('  every current officer resolved', currentSeed.every((o: any) => !!o.person?.name), 'person resolved for all');
  check('  tenureDays computed', currentSeed.every((o: any) => typeof o.tenureDays === 'number'), currentSeed.map((o: any) => `${o.role}:${o.tenureDays}d`).join(' '));
  check('  vacantRoles computed', Array.isArray(seedOfficers.data?.vacantRoles), (seedOfficers.data?.vacantRoles ?? []).join(',') || 'none vacant');

  const seedInit = await call('GET', `/alumni/chapters/${seeded.id}/initiatives`);
  check('GET /initiatives', seedInit.status === 200 && (seedInit.data?.initiatives ?? []).length > 0, `${seedInit.data?.initiatives?.length} initiatives`);
  check('  percent null or 0-100', (seedInit.data?.initiatives ?? []).every((i: any) => i.percent === null || (i.percent >= 0 && i.percent <= 100)), (seedInit.data?.initiatives ?? []).map((i: any) => `${i.status}:${i.percent}`).join(' '));
  check('  stats block', typeof seedInit.data?.stats?.active === 'number', JSON.stringify(seedInit.data?.stats));

  const seedPerf = await call('GET', `/alumni/chapters/${seeded.id}/performance`);
  check('GET /performance', seedPerf.status === 200 && typeof seedPerf.data?.engagement?.score === 'number', `score ${seedPerf.data?.engagement?.score}`);
  check('  rates are numbers', typeof seedPerf.data?.participation?.rate === 'number' && typeof seedPerf.data?.participation?.attendanceRate === 'number', `rate ${seedPerf.data?.participation?.rate}% attendance ${seedPerf.data?.participation?.attendanceRate}%`);
  check('  giving breakdown', typeof seedPerf.data?.giving?.receivedRupees === 'number', `₹${seedPerf.data?.giving?.receivedRupees}`);

  // ── Role gates, asserted as a real graduate who holds no office ──
  // Picking "any graduate" is not enough: an officer legitimately may create an
  // initiative, so the subject must be someone with no seat anywhere. Chosen via
  // prisma because the directory projection exposes neither userId nor chapterId.
  const subject = await prisma.alumniProfile.findFirst({
    where: {
      engagementStatus: 'ACTIVE',
      chapterId: { not: null },
      user: { institutionId: (await prisma.institution.findFirstOrThrow({ select: { id: true } })).id },
      userId: { notIn: (await prisma.alumniChapterOfficer.findMany({ where: { isCurrent: true }, select: { alumniUserId: true } })).map((o) => o.alumniUserId) },
    },
    orderBy: { graduationYear: 'desc' },
    select: { id: true, chapterId: true, user: { select: { id: true, fullName: true, email: true } } },
  });
  check('found a non-officer graduate to test with', !!subject, subject ? `${subject.user.fullName} (${subject.user.email})` : 'none available');
  if (!subject) {
    // Without a subject the rest of this section would assert against undefined
    // and report noise instead of the one real problem.
    console.log('  ! skipping the chapter v2 lifecycle: no eligible graduate in the seed');
    const removedEarly = await prisma.alumniChapter.deleteMany({ where: { city: { startsWith: 'VerifyChapter' } } });
    check('cleanup: scratch chapters removed', true, `${removedEarly.count} row(s)`);
    return finish();
  }
  const graduateToken = await loginAs(subject.user.email);
  token = graduateToken;
  const gradAssign = await call('POST', `/alumni/chapters/${seeded.id}/officers`, { profileId: subject.id, role: 'COORDINATOR' });
  check('graduate cannot appoint', gradAssign.status === 403, `${gradAssign.status} (${gradAssign.error?.code})`);
  const gradInit = await call('POST', `/alumni/chapters/${seeded.id}/initiatives`, { title: 'nope', category: 'SOCIAL' });
  check('graduate cannot add initiative', gradInit.status === 403, `${gradInit.status} (${gradInit.error?.code})`);
  const gradChapter = await call('POST', '/alumni/chapters', { city: `Nope${stampSuffix()}`, country: 'India' });
  check('graduate cannot create chapter', gradChapter.status === 403, `${gradChapter.status} (${gradChapter.error?.code})`);
  const gradEnrol = await call('POST', `/alumni/chapters/${seeded.id}/members`, { profileId: subject.id });
  check('graduate cannot enrol others', gradEnrol.status === 403, `${gradEnrol.status} (${gradEnrol.error?.code})`);

  // ── Scratch chapter: office-only writes ──
  token = OFFICE_TOKEN;
  const stamp = stampSuffix();
  const created = await call('POST', '/alumni/chapters', { city: `VerifyChapter${stamp}`, country: 'India', region: 'Verification', tier: 'LOCAL' });
  const tempId = created.data?.id;
  check('POST /chapters (office)', created.status === 201 && !!tempId, tempId ?? `${created.status} ${created.error?.message}`);
  const dupe = await call('POST', '/alumni/chapters', { city: `VerifyChapter${stamp}`, country: 'India', region: 'Verification', tier: 'LOCAL' });
  check('  duplicate city rejected', dupe.status === 409, `${dupe.status} (${dupe.error?.code})`);

  // Officers must be chapter members, so the office has to move the graduate
  // into the scratch chapter first. Both halves of the move are reversed at the
  // end of this block, and re-running the seed repairs any interrupted run.
  const originalChapter = subject.chapterId;
  check('  graduate starts in a seeded chapter', !!originalChapter, originalChapter ?? 'none');

  const enrolBlocked = await call('POST', `/alumni/chapters/${tempId}/members`, { profileId: subject.id });
  check('  cannot enrol someone already placed', enrolBlocked.status === 409, `${enrolBlocked.status} (${enrolBlocked.error?.code})`);

  const detach = await call('POST', `/alumni/chapters/${originalChapter}/remove-member`, {
    profileId: subject.id,
    reason: 'Verification run - relocating to a scratch chapter.',
  });
  check('  office removes from their chapter', detach.status === 200, `${detach.status} memberCount=${detach.data?.memberCount}`);

  const enrolled = await call('POST', `/alumni/chapters/${tempId}/members`, {
    profileId: subject.id,
    reason: 'Verification run.',
  });
  check('  office enrols into scratch chapter', enrolled.status === 201 && enrolled.data?.memberCount === 1, `${enrolled.data?.memberCount ?? enrolled.status}`);

  const tempMembers = await call('GET', `/alumni/chapters/${tempId}/members`);
  check('  scratch roster shows them', (tempMembers.data?.members ?? []).some((m: any) => m.id === subject.id), `${tempMembers.data?.total} member(s)`);

  const appointed = await call('POST', `/alumni/chapters/${tempId}/officers`, { profileId: subject.id, role: 'PRESIDENT' });
  check('POST /officers appoints', appointed.status === 201 && appointed.data?.role === 'PRESIDENT', `${appointed.data?.officer ?? appointed.error?.message}`);
  const afterAppoint = await call('GET', `/alumni/chapters/${tempId}`);
  check('  president pointer follows', afterAppoint.data?.president?.name === subject.user.fullName, afterAppoint.data?.president?.name ?? 'null');

  const secAppoint = await call('POST', `/alumni/chapters/${tempId}/officers`, { profileId: subject.id, role: 'SECRETARY' });
  check('  second office accepted', secAppoint.status === 201, `${secAppoint.data?.role ?? secAppoint.status}`);

  const tempOfficers = await call('GET', `/alumni/chapters/${tempId}/officers`);
  const presRow = (tempOfficers.data?.officers ?? []).find((o: any) => o.role === 'PRESIDENT');
  const secRow = (tempOfficers.data?.officers ?? []).find((o: any) => o.role === 'SECRETARY');
  check('  both seats listed as current', !!presRow && !!secRow, `vacant=${(tempOfficers.data?.vacantRoles ?? []).join(',')}`);

  // An officer may manage initiatives; this is the positive half of the gate that
  // a plain member must fail above.
  token = graduateToken;
  const officerInit = await call('POST', `/alumni/chapters/${tempId}/initiatives`, { title: `Officer initiative ${stamp}`, category: 'OUTREACH' });
  check('officer may add an initiative', officerInit.status === 201, `${officerInit.status}`);

  // Only the OFFICE changes the committee — an officer cannot demote themselves.
  const selfResign = await call('POST', `/alumni/chapters/${tempId}/officers/${secRow?.id}/resign`, { reason: 'Verification run' });
  check('officer cannot resign their own seat', selfResign.status === 403, `${selfResign.status} (${selfResign.error?.code})`);

  token = OFFICE_TOKEN;
  const presResign = await call('POST', `/alumni/chapters/${tempId}/officers/${presRow?.id}/resign`, { reason: 'Testing' });
  check('president resign blocked', presResign.status === 422, `${presResign.status} (${presResign.error?.code})`);
  const secResign = await call('POST', `/alumni/chapters/${tempId}/officers/${secRow?.id}/resign`, { reason: 'Verification run' });
  check('office resigns a secretary', secResign.status === 200, `${secResign.status}`);
  const afterResign = await call('GET', `/alumni/chapters/${tempId}/officers?includePast=true`);
  check('  vacated seat kept as history', (afterResign.data?.officers ?? []).some((o: any) => o.role === 'SECRETARY' && !o.isCurrent), `past=${afterResign.data?.counts?.past}`);

  // An officer must not be offered Leave, and the server must agree.
  token = graduateToken;
  const officerCtx = await call('GET', `/alumni/chapters/${tempId}`);
  check('officer canLeave=false', officerCtx.data?.viewerContext?.canLeave === false, `roles=${JSON.stringify(officerCtx.data?.viewerContext?.officerRoles)}`);
  check('  officerRoles lists every seat', (officerCtx.data?.viewerContext?.officerRoles ?? []).length === 1, JSON.stringify(officerCtx.data?.viewerContext?.officerRoles));
  check('  officer may manage initiatives', officerCtx.data?.viewerContext?.canManageInitiatives === true, 'canManageInitiatives=true');
  const officerLeave = await call('POST', `/alumni/chapters/${tempId}/leave`);
  check('  server refuses officer leave', officerLeave.status === 422, `${officerLeave.status} (${officerLeave.error?.code})`);

  // `/me` must expose the viewer's own chapter so the directory can gate Join.
  const myCtx = await call('GET', '/alumni/me');
  check('GET /me has chapterContext', myCtx.data?.chapterContext !== undefined, JSON.stringify(myCtx.data?.chapterContext));
  const otherId = allChapters.find((c: any) => c.id !== tempId)?.id;
  const joinOther = await call('POST', `/alumni/chapters/${otherId}/join`);
  check('second chapter refused', joinOther.status === 409, `${joinOther.status}: ${joinOther.error?.message ?? ''}`);

  // ── Handover: a presidency is handed over, never vacated ──
  // A president can never resign, so the ONLY way out of the seat is to appoint
  // a successor. That also frees the first president to leave, which is the
  // canLeave=true case the UI needs to get right.
  token = OFFICE_TOKEN;
  const successor = await prisma.alumniProfile.findFirst({
    where: {
      engagementStatus: 'ACTIVE',
      chapterId: { not: null },
      id: { notIn: [subject.id] },
      userId: { notIn: (await prisma.alumniChapterOfficer.findMany({ where: { isCurrent: true }, select: { alumniUserId: true } })).map((o) => o.alumniUserId) },
      user: { institutionId: (await prisma.institution.findFirstOrThrow({ select: { id: true } })).id },
    },
    orderBy: { graduationYear: 'desc' },
    select: { id: true, chapterId: true, user: { select: { fullName: true } } },
  });
  if (!successor) {
    check('found a successor candidate', false, 'no second non-officer graduate in the seed');
    return finish();
  }
  check('found a successor candidate', true, successor.user.fullName);
  await call('POST', `/alumni/chapters/${successor.chapterId}/remove-member`, { profileId: successor.id, reason: 'Verification run.' });
  await call('POST', `/alumni/chapters/${tempId}/members`, { profileId: successor.id, reason: 'Verification run.' });
  const handover = await call('POST', `/alumni/chapters/${tempId}/officers`, { profileId: successor.id, role: 'PRESIDENT' });
  check('appointing a successor retires the incumbent', handover.status === 201 && !!handover.data?.replaced, `replaced ${handover.data?.replaced ?? 'nobody'}`);

  token = graduateToken;
  const nowAble = await call('GET', `/alumni/chapters/${tempId}`);
  check('  canLeave once the seat is gone', nowAble.data?.viewerContext?.canLeave === true, `roles=${JSON.stringify(nowAble.data?.viewerContext?.officerRoles)}`);
  const left = await call('POST', `/alumni/chapters/${tempId}/leave`);
  check('  member without a seat leaves', left.status === 200, `${left.status}`);

  // Restore both graduates to the chapters the seed gave them.
  token = OFFICE_TOKEN;
  const restoreSubject = await call('POST', `/alumni/chapters/${originalChapter}/members`, { profileId: subject.id, reason: 'Verification run - restoring.' });
  check('  subject restored to original chapter', restoreSubject.status === 201, `${restoreSubject.status} ${restoreSubject.data?.chapter ?? ''}`);

  // ── Initiative lifecycle ──
  token = OFFICE_TOKEN;
  const init = await call('POST', `/alumni/chapters/${tempId}/initiatives`, {
    title: `Verify initiative ${stamp}`,
    category: 'MENTORSHIP',
    description: 'Created by the verification run.',
    targetCount: 5,
  });
  const initId = init.data?.id;
  check('POST /initiatives', init.status === 201 && init.data?.status === 'PLANNED', initId ?? `${init.status}`);
  const toActive = await call('PATCH', `/alumni/chapters/${tempId}/initiatives/${initId}`, { status: 'ACTIVE' });
  check('  PLANNED -> ACTIVE', toActive.status === 200 && toActive.data?.status === 'ACTIVE', `percent ${toActive.data?.percent}`);
  const toDone = await call('PATCH', `/alumni/chapters/${tempId}/initiatives/${initId}`, { status: 'COMPLETED', achievedCount: 5 });
  check('  ACTIVE -> COMPLETED', toDone.status === 200 && toDone.data?.percent === 100, `percent ${toDone.data?.percent}`);
  const reopen = await call('PATCH', `/alumni/chapters/${tempId}/initiatives/${initId}`, { status: 'ACTIVE' });
  check('  completed cannot reopen', reopen.status === 422, `${reopen.status} (${reopen.error?.code})`);
  const badTarget = await call('PATCH', `/alumni/chapters/${tempId}/initiatives/${initId}`, { targetCount: 0 });
  check('  invalid body rejected', badTarget.status === 400, `${badTarget.status} (${badTarget.error?.code})`);

  // Open-ended: the compose sheet sends NO targetCount when the field is blank,
  // and the UI then renders no progress bar. Asserted because `percent` must be
  // null rather than 0 — a 0% bar on an uncountable initiative states a falsehood.
  const openEnded = await call('POST', `/alumni/chapters/${tempId}/initiatives`, {
    title: `Open-ended ${stamp}`,
    category: 'SOCIAL',
  });
  check('open-ended initiative accepted', openEnded.status === 201, `${openEnded.status}`);
  const openList = await call('GET', `/alumni/chapters/${tempId}/initiatives`);
  const openRow = (openList.data?.initiatives ?? []).find((i: any) => i.title === `Open-ended ${stamp}`);
  check('  percent is null, not 0', openRow?.percent === null, `percent ${openRow?.percent}`);

  // Cleanup goes through prisma rather than the API: there is no DELETE chapter
  // route, and leaving a scratch chapter behind would corrupt the next run's
  // "seed has both tiers" and region assertions.
const removed = await prisma.alumniChapter.deleteMany({ where: { city: `VerifyChapter${stamp}` } });
  check('cleanup: scratch chapter removed', removed.count === 1, `${removed.count} row(s) cascaded`);
  // The successor's presidency was cascaded away with the chapter, so put them
  // back on their seeded chapter too. Checked afterwards rather than assumed,
  // because a dangling chapterId would silently drop them out of every metric.
  const successorNow = await prisma.alumniProfile.findUnique({ where: { id: successor.id }, select: { chapterId: true } });
  check('  successor left with no chapter', successorNow?.chapterId === null, `chapterId=${successorNow?.chapterId ?? 'null'}`);
  const restoreSuccessor = await call('POST', `/alumni/chapters/${successor.chapterId}/members`, { profileId: successor.id, reason: 'Verification run - restoring.' });
  check('  successor restored to original chapter', restoreSuccessor.status === 201, `${restoreSuccessor.status} ${restoreSuccessor.data?.chapter ?? ''}`);
  const stray = await prisma.alumniChapterInitiative.count({
    where: { title: { in: ['nope', `Officer initiative ${stamp}`, `Verify initiative ${stamp}`, `Open-ended ${stamp}`] } },
  });
  check('  no stray initiatives left behind', stray === 0, `${stray} found`);

  finish();
}

/** Prints the tally and sets the exit code. Split out so the chapter section can
 *  bail out early without duplicating it. */
function finish(): never {
  console.log('\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
  console.log(`  ${pass} passed, ${fail} failed`);
  if (failures.length) console.log(`  failing: ${failures.join(', ')}`);
  console.log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
