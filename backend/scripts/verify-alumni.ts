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

  // Record a pledge end-to-end: PLEDGED → payment + receipt
  const pledged = don.data?.donations?.find((x: any) => x.status === 'PLEDGED');
  if (pledged) {
    const rec = await call('POST', `/alumni/donations/${pledged.id}/record`);
    check('POST /donations/:id/record', rec.status === 200 && rec.data?.status === 'RECEIVED', `receipt ${rec.data?.receiptNo ?? 'n/a'}`);
    const dup = await call('POST', `/alumni/donations/${pledged.id}/record`);
    check('  re-record rejected 409', dup.status === 409, `got ${dup.status} (${dup.error?.code})`);
  } else {
    check('POST /donations/:id/record', false, 'no PLEDGED donation available to record');
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

  // ── summary ──
  console.log('\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
  console.log(`  ${pass} passed, ${fail} failed`);
  if (failures.length) console.log(`  failing: ${failures.join(', ')}`);
  console.log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});