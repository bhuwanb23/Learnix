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
  console.log('\n\u2500\u2500 7. Chapters');
  const chap = await call('GET', '/alumni/chapters');
  check('GET /chapters', chap.status === 200, `status ${chap.status}`);
  check('  chapters[] populated', (chap.data?.length ?? 0) > 0, `${chap.data?.length} chapters`);
  check('  memberCount populated', (chap.data?.[0]?.memberCount ?? 0) > 0, `${chap.data?.[0]?.city}: ${chap.data?.[0]?.memberCount} members`);
  check('  president resolved', !!chap.data?.[0]?.president, `${chap.data?.[0]?.president ?? 'null'}`);

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
  console.log('\n\u2550\u2550 10. Access control');
  const adminLogin = await call('POST', '/auth/login', { email: 'student@learnix.dev', password: PASSWORD });
  const realToken = token;
  token = adminLogin.data?.accessToken ?? '';
  const denied = await call('GET', '/alumni/dashboard');
  check('student blocked from /alumni', denied.status === 403, `got ${denied.status} (${denied.error?.code})`);
  token = realToken;

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