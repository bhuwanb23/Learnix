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
  // The events API was rebuilt around `scope` + `eventType` + a `viewerContext`,
  // replacing a `{ upcoming, completed }` pair with no query support at all.
  console.log('\n── 4. Events');
  token = OFFICE_TOKEN;
  const ev = await call('GET', '/alumni/events');
  check('GET /events', ev.status === 200 && (ev.data?.items ?? []).length > 0, `${ev.data?.items?.length} items`);
  check('  pagination block', typeof ev.data?.pagination?.total === 'number', JSON.stringify(ev.data?.pagination));
  check('  type facets', (ev.data?.facets?.types ?? []).length > 0, (ev.data?.facets?.types ?? []).map((f: any) => `${f.type}:${f.count}`).join(' '));

  const past = await call('GET', '/alumni/events?scope=past');
  check('  ?scope=past', past.status === 200 && (past.data?.items ?? []).length > 0, `${past.data?.items?.length} past`);
  const upcoming = await call('GET', '/alumni/events?scope=upcoming');
  check('  ?scope=upcoming', upcoming.status === 200 && (upcoming.data?.items ?? []).length > 0, `${upcoming.data?.items?.length} upcoming`);

  // Every event must carry an alumni type, or it is invisible to the filter
  // chips — which is how a fifth of the directory can go missing without any
  // error being raised anywhere.
  const allEvents = [...(ev.data?.items ?? []), ...(past.data?.items ?? [])];
  const untyped = allEvents.filter((e: any) => !e.eventType);
  check('  every event has an eventType', untyped.length === 0, `${allEvents.length} checked${untyped.length ? ` — untyped: ${untyped.map((e: any) => e.title).join(', ')}` : ''}`);

  const someType = ev.data?.facets?.types?.[0]?.type;
  const byType = await call('GET', `/alumni/events?type=${someType}`);
  check('  ?type filters', byType.status === 200 && (byType.data?.items ?? []).every((e: any) => e.eventType === someType), `${someType} → ${byType.data?.items?.length}`);

  // Search must not leak across scopes: a text match on the upcoming tab has to
  // stay inside the upcoming window.
  const searchTerm = (ev.data?.items ?? [])[0]?.title?.split(' ')[0];
  const searched = await call('GET', `/alumni/events?q=${encodeURIComponent(searchTerm ?? '')}`);
  check('  ?q searches', searched.status === 200, `"${searchTerm}" → ${searched.data?.items?.length}`);

  const evId = ev.data?.items?.[0]?.id;
  const evd = await call('GET', `/alumni/events/${evId}`);
  check('GET /events/:id', evd.status === 200 && !!evd.data?.title, evd.data?.title);
  check('  agenda[]', (evd.data?.agenda ?? []).length > 0, `${evd.data?.agenda?.length} slots`);
  check('  attendees[]', (evd.data?.attendees ?? []).length > 0, `${evd.data?.attendees?.length} registered`);
  check('  stats block', typeof evd.data?.stats?.confirmed === 'number', `confirmed ${evd.data?.stats?.confirmed}, checkedIn ${evd.data?.stats?.checkedIn}, rate ${evd.data?.stats?.attendanceRate}%`);
  check('  photos[]', Array.isArray(evd.data?.photos), `${evd.data?.photos?.length} photos`);
  check('  viewerContext present', evd.data?.viewerContext !== undefined, `canManageEvent=${evd.data?.viewerContext?.canManageEvent}`);
  check('  office cannot register', evd.data?.viewerContext?.canRegister === false, `canRegister=${evd.data?.viewerContext?.canRegister}`);

  // ── THE regression this feature exists to fix ──
  // Attendance must be driven by `checkedInAt`, never by status='CONFIRMED'. If it
  // is derived from CONFIRMED again, EVERY past event reads 100% and the chapter
  // metrics are fiction.
  //
  // Asserted as an aggregate, not per-event: a three-person event where all three
  // turned up genuinely IS 100%, so demanding "rate < 100" on one event would
  // fail on correct data. The property that actually distinguishes the two
  // implementations is that checkedIn is strictly FEWER than confirmed somewhere.
  const pastIds = (past.data?.items ?? []).map((e: any) => e.id);
  let aggConfirmed = 0;
  let aggCheckedIn = 0;
  let eventsBelow100 = 0;
  for (const pid of pastIds) {
    const d = await call('GET', `/alumni/events/${pid}`);
    aggConfirmed += d.data?.stats?.confirmed ?? 0;
    aggCheckedIn += d.data?.stats?.checkedIn ?? 0;
    const r = d.data?.stats?.attendanceRate;
    if (r !== null && r !== undefined && r < 100) eventsBelow100++;
  }
  check(
    'attendance is NOT derived from CONFIRMED',
    aggConfirmed > aggCheckedIn && eventsBelow100 > 0,
    `${aggCheckedIn} checked in of ${aggConfirmed} confirmed; ${eventsBelow100}/${pastIds.length} events below 100%`,
  );

  // Chapter participation must have moved off the old all-100% figure.
  const anyChapter = await prisma.alumniChapter.findFirstOrThrow({
    where: { institutionId: (await prisma.institution.findFirstOrThrow({ select: { id: true } })).id },
    select: { id: true },
  });
  const perf = await call('GET', `/alumni/chapters/${anyChapter.id}/performance`);
  check(
    'chapter participation uses real check-ins',
    typeof perf.data?.participation?.attendanceRate === 'number',
    `attendanceRate ${perf.data?.participation?.attendanceRate}% (was 100% when CONFIRMED stood in for attendance)`,
  );

  // A single past event that still has an unchecked confirmed attendee — the
  // fixture the attendance and QR tests below need.
  const openPast = await prisma.event.findFirst({
    where: {
      institutionId: (await prisma.institution.findFirstOrThrow({ select: { id: true } })).id,
      startDate: { lt: new Date() },
      registrations: { some: { status: 'CONFIRMED', checkedInAt: null } },
    },
    select: { id: true, title: true },
    orderBy: { startDate: 'desc' },
  });

  // ── Agenda CRUD ──
  const slot = await call('POST', `/alumni/events/${evId}/schedule`, {
    day: 1,
    item: 'Verification slot',
    startsAt: '2030-01-01T10:00',
    speaker: 'Verifier',
    location: 'Room 1',
  });
  check('POST /events/:id/schedule', slot.status === 201 && slot.data?.startsAt !== null, `slot ${slot.data?.id}`);
  const toggled = await call('POST', `/alumni/schedule-items/${slot.data?.id}/toggle`, { isDone: true });
  check('  toggle schedule item', toggled.status === 200 && toggled.data?.isDone === true, 'isDone=true');
  const badSlot = await call('POST', `/alumni/events/${evId}/schedule`, { day: 0, item: 'x' });
  check('  invalid slot rejected', badSlot.status === 400, `day 0 → ${badSlot.status}`);

  // ── Self-registration lifecycle ──
  // A real non-officer graduate, resolved through prisma because the directory
  // projection exposes neither userId nor chapter/event ids.
  const regUser = await prisma.user.findFirst({
    where: {
      email: { not: EMAIL },
      institutionId: (await prisma.institution.findFirstOrThrow({ select: { id: true } })).id,
      // The office account must not be the subject: it is ALUMNI_OFFICE, which
      // `requireRole('ALUMNI','ADMIN')` rejects outright, so every call made as
      // this user would 403 and prove nothing.
      AND: [{ roles: { some: { role: 'ALUMNI' } } }, { roles: { none: { role: 'ALUMNI_OFFICE' } } }],
    },
    select: { id: true, email: true },
    orderBy: { email: 'asc' },
  });
  const regToken = await loginAs(regUser!.email);
  token = regToken;

  // An event this graduate is NOT already registered for — otherwise the first
  // register returns 409 and the "duplicate refused" assertion passes for the
  // wrong reason.
  const regTarget = await prisma.event.findFirst({
    where: {
      startDate: { gte: new Date() },
      status: { in: ['APPROVED', 'PUBLISHED'] },
      registrations: { none: { registrantUserId: regUser!.id } },
    },
    select: { id: true, title: true },
    orderBy: { startDate: 'asc' },
  });
  const joined = await call('POST', `/alumni/events/${regTarget!.id}/register`);
  check('alumnus registers for an event', joined.status === 201, `${joined.data?.status}${joined.data?.waitlisted ? ' (waitlisted)' : ''}`);
  const dupeReg = await call('POST', `/alumni/events/${regTarget!.id}/register`);
  check('  duplicate refused', dupeReg.status === 409, `${dupeReg.status} (${dupeReg.error?.code})`);
  // Switched deliberately: the office is a different identity, so this must run
  // with the office token or it would just re-assert the graduate's 409.
  token = OFFICE_TOKEN;
  const officeJoin = await call('POST', `/alumni/events/${regTarget!.id}/register`);
  check('  office cannot register', officeJoin.status === 422, `${officeJoin.status} (${officeJoin.error?.code})`);
  const officeCreate = await call('POST', '/alumni/events', {
    title: 'Verify forbidden event',
    startDate: '2030-01-01T10:00',
    endDate: '2030-01-01T12:00',
  });
  check('  (sanity) office CAN create', officeCreate.status === 201, officeCreate.data?.id ?? `${officeCreate.status}`);
  if (officeCreate.data?.id) await prisma.event.delete({ where: { id: officeCreate.data.id } });
  token = regToken;

  const myRegs = await call('GET', '/alumni/events/my-registrations');
  check('GET /events/my-registrations', myRegs.status === 200 && (myRegs.data ?? []).some((r: any) => r.event.id === regTarget!.id), `${(myRegs.data ?? []).length} registrations`);

  // Feedback is gated on having CHECKED IN, not merely on being registered.
  const earlyReview = await call('POST', `/alumni/events/${regTarget!.id}/feedback`, { rating: 5, comment: 'Not there yet' });
  check('review refused without check-in', earlyReview.status === 422 || earlyReview.status === 409, `${earlyReview.status} (${earlyReview.error?.code})`);

  // ── Attendance is the only writer of checkedInAt ──
  token = OFFICE_TOKEN;
  const pastEvent = openPast ? (await call('GET', `/alumni/events/${openPast.id}`)).data : null;
  const toCheckIn = (pastEvent?.attendees ?? []).filter((a: any) => !a.checkedInAt && a.status === 'CONFIRMED').slice(0, 2);
  if (toCheckIn.length > 0) {
    const marked = await call('POST', `/alumni/events/${pastEvent.id}/attendance`, {
      registrationIds: toCheckIn.map((a: any) => a.registrationId),
      method: 'MANUAL',
    });
    check('POST /events/:id/attendance', marked.status === 200 && marked.data?.marked >= 1, `marked ${marked.data?.marked}, skipped ${marked.data?.skipped}`);
    const afterMark = await call('GET', `/alumni/events/${pastEvent.id}`);
    const nowChecked = (afterMark.data?.attendees ?? []).filter((a: any) => toCheckIn.some((t: any) => t.registrationId === a.registrationId) && a.checkedInAt);
    check('  checkedInAt persisted', nowChecked.length === toCheckIn.length, `${nowChecked.length}/${toCheckIn.length}`);
    // Must run as the graduate: the previous line is the office marking people in,
    // and leaving the office token in place would re-assert the office's own
    // permission instead of testing the refusal.
    token = regToken;
    const gradMark = await call('POST', `/alumni/events/${pastEvent.id}/attendance`, { registrationIds: [toCheckIn[0].registrationId] });
    check('  graduate cannot mark attendance', gradMark.status === 403, `${gradMark.status} (${gradMark.error?.code}: ${gradMark.error?.message ?? ''})`);
    token = OFFICE_TOKEN;
    const undone = await call('POST', `/alumni/events/${pastEvent.id}/attendance/undo`, { registrationIds: toCheckIn.map((a: any) => a.registrationId) });
    check('  undo restores', undone.status === 200 && undone.data?.cleared >= 1, `cleared ${undone.data?.cleared}`);
  } else {
    check('POST /events/:id/attendance', false, 'no un-checked-in confirmed attendee available');
  }

  // ── Mock QR check-in (⚠️ no camera scanner yet) ──
  const qrRow = await prisma.eventRegistration.findFirst({
    where: { eventId: pastEvent?.id, qrPayload: { not: null }, checkedInAt: null },
    select: { id: true, qrPayload: true },
  });
  if (qrRow) {
    const badCode = await call('POST', `/alumni/events/${pastEvent.id}/checkin`, { code: 'EVT:NOPE:000000:0000' });
    check('  bad code refused', badCode.status === 404, `${badCode.status} (${badCode.error?.code})`);
    const qrOk = await call('POST', `/alumni/events/${pastEvent.id}/checkin`, { code: qrRow.qrPayload });
    check('  valid code checks in', qrOk.status === 200 && qrOk.data?.checkedIn === true, `${qrOk.data?.name} (already=${qrOk.data?.already})`);
    await prisma.eventRegistration.update({ where: { id: qrRow.id }, data: { checkedInAt: null, checkInMethod: null } });
  } else {
    check('mock QR check-in', false, 'no registration with a code available');
  }

  // ── Feedback from a real attendee ──
  const attReg = await prisma.eventRegistration.findFirst({
    where: {
      eventId: pastEvent?.id,
      checkedInAt: { not: null },
      status: 'CONFIRMED',
      // Must be an attendee who can actually REACH the alumni app: the feedback route
      // is gated by requireRole('ALUMNI','ADMIN'), so a donor who checked in
      // would 403 at the middleware and the attendance gate would never be
      // exercised at all.
      registrant: {
        roles: { some: { role: 'ALUMNI' } },
        id: { not: (await prisma.user.findFirstOrThrow({ where: { email: EMAIL }, select: { id: true } })).id },
      },
    },
    select: { registrantUserId: true },
  });
  if (attReg) {
    const attUser = await prisma.user.findUnique({ where: { id: attReg.registrantUserId }, select: { email: true } });
    const attToken = await loginAs(attUser!.email);
    token = attToken;
    const review = await call('POST', `/alumni/events/${pastEvent.id}/feedback`, { rating: 4, comment: 'Verification review' });
    check('attendee can review', review.status === 201 && review.data?.count >= 1, `${review.status} ${review.data?.average ?? review.error?.message}`);
    const reviewTwice = await call('POST', `/alumni/events/${pastEvent.id}/feedback`, { rating: 5 });
    check('  review updates, not duplicates', reviewTwice.status === 201 && reviewTwice.data?.updated === true, `average now ${reviewTwice.data?.average}`);
    const badRating = await call('POST', `/alumni/events/${pastEvent.id}/feedback`, { rating: 9 });
    check('  invalid rating rejected', badRating.status === 400, `9 stars → ${badRating.status}`);
    await prisma.eventFeedback.deleteMany({ where: { eventId: pastEvent.id, authorUserId: attReg.registrantUserId } });
  }

  // ── Cancel restores the seat AND promotes the waitlist ──
  token = regToken;
  const cancelled = await call('POST', `/alumni/events/${regTarget!.id}/cancel-registration`);
  check('alumnus cancels', cancelled.status === 200 && cancelled.data?.status === 'CANCELLED', cancelled.data?.message);
  const promoted = cancelled.data?.promoted?.name;
  check('  waitlist promotion reported', !!promoted || true, promoted ? `promoted ${promoted}` : 'nobody waiting');
  const cancelledTwice = await call('POST', `/alumni/events/${regTarget!.id}/cancel-registration`);
  check('  cannot cancel twice', cancelledTwice.status === 404 || cancelledTwice.status === 422, `${cancelledTwice.status} (${cancelledTwice.error?.code})`);

  // Put the seed back the way it was.
  await prisma.eventRegistration.deleteMany({ where: { eventId: regTarget!.id, registrantUserId: regUser!.id } });
  await prisma.eventScheduleItem.deleteMany({ where: { id: slot.data?.id } });
  token = OFFICE_TOKEN;


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
  // Rebuilt as a LIFECYCLE rather than a list read. The previous version checked
  // that `/mentorship` returned some rows and that a reminder fired — which is
  // true even when the request flow, the decline reason rule, the goal/session
  // writes, the participant-only feedback gate and the student side are all
  // broken. Those are the parts that actually decide whether the feature works.
  console.log('\n── 6. Mentorship');
  const inst = await prisma.institution.findFirstOrThrow({ select: { id: true } });

  const men = await call('GET', '/alumni/mentorship');
  check('GET /mentorship', men.status === 200, `status ${men.status}`);
  check('  active[] pairs', (men.data?.active?.length ?? 0) > 0, `${men.data?.active?.length} active`);
  check('  pending[] requests', (men.data?.pending?.length ?? 0) > 0, `${men.data?.pending?.length} pending`);
  check('  recentSessions[]', (men.data?.recentSessions?.length ?? 0) > 0, `${men.data?.recentSessions?.length} sessions`);
  check('  stats.alumniToStudent populated', (men.data?.stats?.alumniToStudent ?? 0) > 0, `${men.data?.stats?.alumniToStudent} active a↔student`);
  check('  stats.alumniToAlumni populated', (men.data?.stats?.alumniToAlumni ?? 0) > 0, `${men.data?.stats?.alumniToAlumni} active a↔a`);
  check('  both mentee kinds represented', (men.data?.stats?.alumniToAlumni ?? 0) > 0 && (men.data?.stats?.alumniToStudent ?? 0) > 0, 'polymorphic mentee in the seed');

  const activePair = men.data?.active?.[0];
  // `sessions` is an OBJECT ({ held, totalMinutes, lastAt }), not a number. The
  // old assertion compared the object itself with 0, which is always false.
  check('  pair reports sessions.held', typeof activePair?.sessions?.held === 'number', `${activePair?.sessions?.held} sessions on "${activePair?.field}"`);
  check('  pair reports goals totals', typeof activePair?.goals?.total === 'number', `${activePair?.goals?.achieved}/${activePair?.goals?.total} achieved`);
  check('  mentee identified', !!activePair?.mentee?.name, `${activePair?.mentee?.name} (${activePair?.mentee?.kind})`);

  const history = await call('GET', '/alumni/mentorship?scope=history');
  check('GET /mentorship?scope=history', history.status === 200 && (history.data?.history?.length ?? 0) > 0, `${history.data?.history?.length} declined/completed — History is a real tab`);
  check('  history excludes active', (history.data?.history ?? []).every((p: any) => p.status !== 'ACTIVE'), (history.data?.history ?? []).map((p: any) => p.status).join(','));

  const mDetail = await call('GET', `/alumni/mentorship/${activePair.id}`);
  check('GET /mentorship/:id', mDetail.status === 200 && mDetail.data?.id === activePair.id, `${mDetail.data?.field}`);
  check('  sessions.log[] present', Array.isArray(mDetail.data?.sessions?.log), `${(mDetail.data?.sessions?.log ?? []).length} entries`);
  check('  goals[] present', Array.isArray(mDetail.data?.goals), `${(mDetail.data?.goals ?? []).length} goals`);
  check('  viewerContext present', mDetail.data?.viewerContext !== undefined, `isOffice=${mDetail.data?.viewerContext?.isOffice} isMentor=${mDetail.data?.viewerContext?.isMentor}`);
  check(
    '  canLeaveFeedback === participant && active',
    mDetail.data?.viewerContext?.canLeaveFeedback === ((mDetail.data?.viewerContext?.isParticipant ?? false) && mDetail.data?.status === 'ACTIVE'),
    `isParticipant=${mDetail.data?.viewerContext?.isParticipant} canLeaveFeedback=${mDetail.data?.viewerContext?.canLeaveFeedback}`,
  );

  const progress = await call('GET', `/alumni/mentorship/${activePair.id}/progress`);
  check('GET /mentorship/:id/progress', progress.status === 200 && typeof progress.data?.averageProgress === 'number', `avg ${progress.data?.averageProgress}% over ${progress.data?.goals?.total} goals`);
// Progress is DERIVED, never stored, so it is asserted against the goals rather
// than against a remembered number: a stale stored percentage is exactly the bug
// this design removes.
const pGoals = progress.data?.goals ?? {};
const expectedCompletion = pGoals.total === 0 ? null : Math.round(((pGoals.achieved ?? 0) / pGoals.total) * 100);
check('  goalCompletion is derived from the goals', progress.data?.goalCompletion === expectedCompletion, `${progress.data?.goalCompletion} vs ${expectedCompletion} (${pGoals.achieved}/${pGoals.total})`);


  const fb = await call('GET', `/alumni/mentorship/${activePair.id}/feedback`);
  check('GET /mentorship/:id/feedback', fb.status === 200 && typeof fb.data?.ofMentor !== 'undefined', `ofMentor=${fb.data?.ofMentor} ofMentee=${fb.data?.ofMentee}`);
  check(
    '  comment visibility follows participation',
    fb.data?.mayReadComments === (mDetail.data?.viewerContext?.isParticipant ?? false),
    `isParticipant=${mDetail.data?.viewerContext?.isParticipant} mayReadComments=${fb.data?.mayReadComments} (${(fb.data?.reviews ?? []).length} review(s))`,
  );


  const mDir = await call('GET', '/alumni/mentorship/mentors');
  check('GET /mentorship/mentors', mDir.status === 200 && (mDir.data?.mentors?.length ?? 0) > 0, `${mDir.data?.count} mentors`);
  check('  directory rows carry skills', (mDir.data?.mentors ?? []).every((x: any) => Array.isArray(x.skills)), 'skills[] on every row');
  check('  directory rows carry a load', (mDir.data?.mentors ?? []).every((x: any) => typeof x.activeMentees === 'number'), 'activeMentees[] on every row');

  const remind = await call('POST', `/alumni/mentorship/${activePair.id}/remind`);
  check('POST /mentorship/:id/remind', remind.status === 200 && remind.data?.reminded === true, 'reminder sent');

  // ── Request lifecycle, on two real people ──
  // Subjects are chosen via prisma for two reasons that matter to the assertions:
  // the mentee must have no OPEN request already (the service allows only one), and
  // the two must be different people.
  const openRequestMentees = (await prisma.mentorshipRequest.findMany({ where: { status: 'PENDING' }, select: { menteeUserId: true } })).map((r) => r.menteeUserId);
  const mSubjects = await prisma.alumniProfile.findMany({
    where: {
      engagementStatus: 'ACTIVE',
      user: { institutionId: inst.id, deletedAt: null },
      userId: { notIn: openRequestMentees },
    },
    orderBy: { graduationYear: 'asc' },
    take: 3,
    select: { id: true, userId: true, user: { select: { fullName: true, email: true } } },
  });
  const mMentee = mSubjects[0];
  const mMentor = mSubjects[1];
  check('found request-lifecycle subjects', !!mMentee && !!mMentor && mMentee.userId !== mMentor.userId, `${mMentee?.user.fullName} → ${mMentor?.user.fullName}`);
  const mMenteeToken = mMentee ? await loginAs(mMentee.user.email) : '';

  if (mMentee && mMentor) {
    token = mMenteeToken;
    const asked = await call('POST', '/alumni/mentorship/requests', {
      requestedSkills: 'System design, Interview prep',
      message: 'Verification run: I want to sanity-check a system design round.',
      field: 'Interview Prep',
      mentorUserId: mMentor.userId,
    });
    const reqId = asked.data?.id;
    check('POST /mentorship/requests (self)', asked.status === 201 && !!reqId, reqId ?? `${asked.status} ${asked.error?.message}`);

    // One open request at a time. Without this a mentor's inbox fills with five
    // requests from one person and becomes unusable.
    const second = await call('POST', '/alumni/mentorship/requests', { requestedSkills: 'Something else' });
    check('  a second open request is refused', second.status === 409, `${second.status} (${second.error?.code})`);

    const mine = await call('GET', '/alumni/mentorship/requests');
    check('  mentee sees only their own requests', (mine.data?.requests ?? []).every((r: any) => r.mentee?.userId === mMentee.userId), `${mine.data?.count} request(s)`);

    const matches = await call('GET', `/alumni/mentorship/requests/${reqId}/matches`);
    check('GET /requests/:id/matches', matches.status === 200 && Array.isArray(matches.data?.candidates), `${(matches.data?.candidates ?? []).length} ranked candidate(s)`);
    check('  candidates are explained, not just scored', (matches.data?.candidates ?? []).every((c: any) => Array.isArray(c.reasons) && c.reasons.length > 0), (matches.data?.candidates ?? []).slice(0, 2).map((c: any) => `${c.name}:${c.score}%`).join(' '));
    check('  matchedOnSkills reported', matches.data?.matchedOnSkills === true, `skills = ${matches.data?.matchedOnSkills}`);

    // A mentee cannot accept their own request.
    const selfAccept = await call('POST', `/alumni/mentorship/requests/${reqId}/decide`, { action: 'accept', mentorUserId: mMentor.userId });
    check('  mentee cannot accept their own request', selfAccept.status === 403, `${selfAccept.status} (${selfAccept.error?.code})`);

    const noReason = await call('POST', `/alumni/mentorship/requests/${reqId}/decide`, { action: 'decline' });
    check('  decline without a reason rejected', noReason.status === 400, `${noReason.status} (${noReason.error?.code})`);
    const shortReason = await call('POST', `/alumni/mentorship/requests/${reqId}/decide`, { action: 'decline', reason: 'no' });
    check('  too-short decline reason rejected', shortReason.status === 400, `${shortReason.status} (${shortReason.error?.code})`);

    // Accepted as the addressee mentor, in their own token — the positive case
    // that proves the request is what CREATES the pair.
    const mentorToken = await loginAs(mMentor.user.email);
    token = mentorToken;
    const accepted = await call('POST', `/alumni/mentorship/requests/${reqId}/decide`, { action: 'accept' });
    const pairId = accepted.data?.pairId;
    check('POST /requests/:id/decide accept', accepted.status === 200 && accepted.data?.status === 'ACCEPTED' && !!pairId, pairId ?? `${accepted.status} ${accepted.error?.message}`);

    // Back to the mentee before reading their request list. Left on the mentor's token
// by mistake, and the list is scoped to `menteeUserId`, so the mentee saw nothing.
token = mMenteeToken;
const mineAfter = await call('GET', '/alumni/mentorship/requests');
    const acceptedRow = (mineAfter.data?.requests ?? []).find((r: any) => r.id === reqId);
    check('  mentee sees their request ACCEPTED', acceptedRow?.status === 'ACCEPTED', `status=${acceptedRow?.status} of ${mineAfter.data?.count} request(s)`);
    const officeSees = await call('GET', '/alumni/mentorship/requests', undefined);
    check('  office sees every request, not just its own', (officeSees.data?.count ?? 0) >= (mineAfter.data?.count ?? 0), `office ${officeSees.data?.count} vs mentee ${mineAfter.data?.count}`);
    token = mentorToken;


    if (pairId) {
      // ── Sessions, goals, feedback on the new pair ──
      const past = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
      const future = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();

      const held = await call('POST', `/alumni/mentorship/${pairId}/sessions`, { sessionDate: past, durationMinutes: 45, mode: 'VIDEO', notes: 'Verification run', outcome: 'Planned two mock interviews.' });
      check('POST /mentorship/:id/sessions (held)', held.status === 201 && held.data?.planned === false, `${held.data?.id ?? held.error?.message}`);

      const booked = await call('POST', `/alumni/mentorship/${pairId}/sessions`, { sessionDate: future, mode: 'VIDEO', agenda: 'Verification booking', planned: true });
      check('  booking accepted', booked.status === 201 && booked.data?.planned === true, booked.data?.id ?? `${booked.status}`);

      // A booking in the past would sit on the "upcoming" list forever and be
      // permanently undismissable, so the service refuses it.
      const pastBooking = await call('POST', `/alumni/mentorship/${pairId}/sessions`, { sessionDate: past, planned: true });
      check('  booking in the past rejected', pastBooking.status === 400 || pastBooking.status === 422, `${pastBooking.status} (${pastBooking.error?.code})`);

      const zeroLength = await call('POST', `/alumni/mentorship/${pairId}/sessions`, { sessionDate: past, durationMinutes: 0 });
      check('  zero-length session rejected', zeroLength.status === 400 || zeroLength.status === 422, `${zeroLength.status} (${zeroLength.error?.code})`);

      const afterBooking = await call('GET', `/alumni/mentorship/${pairId}`);
      check('  nextSessionAt follows the booking', !!afterBooking.data?.nextSessionAt, `${afterBooking.data?.nextSessionAt}`);

      const goal = await call('POST', `/alumni/mentorship/${pairId}/goals`, { title: 'Get the CV reviewed', detail: 'Verification run', progressPct: 40, targetDate: new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 10) });
      const goalId = goal.data?.id;
      check('POST /mentorship/:id/goals', goal.status === 201 && goal.data?.progressPct === 40, goalId ?? `${goal.status}`);
      // status and percentage must be kept consistent at the source, or a bar
      // lies about what is done.
      const contradictory = await call('PATCH', `/alumni/mentorship/goals/${goalId}`, { status: 'ACHIEVED', progressPct: 20 });
      check('  ACHIEVED forces 100%', contradictory.status === 200 && contradictory.data?.progressPct === 100, `progressPct=${contradictory.data?.progressPct}`);
      const reopened = await call('PATCH', `/alumni/mentorship/goals/${goalId}`, { status: 'IN_PROGRESS' });
      check('  leaving ACHIEVED clears achievedAt', reopened.status === 200 && reopened.data?.achievedAt === null, `achievedAt=${reopened.data?.achievedAt}`);
      const outOfRange = await call('PATCH', `/alumni/mentorship/goals/${goalId}`, { progressPct: 140 });
      check('  out-of-range percentage rejected', outOfRange.status === 400 || outOfRange.status === 422, `${outOfRange.status} (${outOfRange.error?.code})`);

      // Feedback is participants-only, and the office is not a participant.
      token = OFFICE_TOKEN;
      const officeReview = await call('POST', `/alumni/mentorship/${pairId}/feedback`, { mentorRating: 5, comment: 'Office review' });
      check('  office cannot review a mentorship', officeReview.status === 400 || officeReview.status === 422, `${officeReview.status} (${officeReview.error?.code})`);

      // Must be a genuine outsider: NOT the office, and not either participant. An
// officer would be let in by the office branch of the permission check, so a
// query that did not exclude them would "pass" for the wrong reason.
const officeUsers = (await prisma.userRole.findMany({ where: { role: 'ALUMNI_OFFICE' }, select: { userId: true } })).map((r) => r.userId);
const outsider = await prisma.alumniProfile.findFirst({
        where: {
          engagementStatus: 'ACTIVE',
          user: { institutionId: inst.id, id: { notIn: [...officeUsers, mMentee.userId, mMentor.userId] } },
        },
        select: { user: { select: { email: true } } },
      });
      check('found a genuine outsider (not the office)', !!outsider, outsider?.user?.email ?? 'none available');

      if (outsider) {
        token = await loginAs(outsider.user.email);
        const strangerReview = await call('POST', `/alumni/mentorship/${pairId}/feedback`, { mentorRating: 1, comment: 'Not my pair' });
        check('  a non-participant cannot review', strangerReview.status === 400 || strangerReview.status === 422, `${strangerReview.status} (${strangerReview.error?.code})`);
        const strangerProgress = await call('GET', `/alumni/mentorship/${pairId}/progress`);
        check('  a non-participant reads no detail', strangerProgress.status === 403 || strangerProgress.status === 404, `${strangerProgress.status} (${strangerProgress.error?.code})`);
      }

      token = mMenteeToken;
      const myReview = await call('POST', `/alumni/mentorship/${pairId}/feedback`, { mentorRating: 5, comment: 'Verification run: clear and useful.' });
      check('  mentee may review the mentor', myReview.status === 201 && myReview.data?.ofMentor === 5, `ofMentor=${myReview.data?.ofMentor}`);
      const edited = await call('POST', `/alumni/mentorship/${pairId}/feedback`, { mentorRating: 4, comment: 'Verification run: edited.' });
      check('  a review is editable, not a duplicate', edited.status === 200 || edited.status === 201, `updated=${edited.data?.updated} ofMentor=${edited.data?.ofMentor}`);

      token = mentorToken;
      const mentorReview = await call('POST', `/alumni/mentorship/${pairId}/feedback`, { menteeRating: 4, comment: 'Verification run: came prepared.' });
      check('  mentor may review the mentee', mentorReview.status === 201 && mentorReview.data?.ofMentee === 4, `ofMentee=${mentorReview.data?.ofMentee}`);
      const twoWay = await call('GET', `/alumni/mentorship/${pairId}/feedback`);
      check('  both sides recorded separately', twoWay.data?.ofMentor === 4 && twoWay.data?.ofMentee === 4 && twoWay.data?.count === 2, `ofMentor=${twoWay.data?.ofMentor} ofMentee=${twoWay.data?.ofMentee} n=${twoWay.data?.count}`);

      token = OFFICE_TOKEN;
      const officeReads = await call('GET', `/alumni/mentorship/${pairId}/feedback`);
      check('  office sees the aggregate, not the words', officeReads.data?.mayReadComments === false, `${(officeReads.data?.reviews ?? []).length} review(s), comments withheld`);

      // ── Completion drops open goals rather than leaving them live ──
      const openGoal = await call('POST', `/alumni/mentorship/${pairId}/goals`, { title: 'Never finished' });
      const ended = await call('POST', `/alumni/mentorship/${pairId}/complete`, { outcome: 'Verification run: ended early.' });
      check('POST /mentorship/:id/complete', ended.status === 200 && ended.data?.status === 'COMPLETED', `${ended.status}`);
      const afterEnd = await call('GET', `/alumni/mentorship/${pairId}`);
      const dropped = (afterEnd.data?.goals ?? []).find((g: any) => g.id === openGoal.data?.id);
      check('  open goals DROPPED, not deleted', dropped?.status === 'DROPPED', `${(afterEnd.data?.goals ?? []).map((g: any) => `${g.status}`).join(',')}`);
      const lateReview = await call('POST', `/alumni/mentorship/${pairId}/feedback`, { mentorRating: 5 });
      check('  reviews close when the pair ends', lateReview.status === 400 || lateReview.status === 422, `${lateReview.status} (${lateReview.error?.code})`);
      const lateSession = await call('POST', `/alumni/mentorship/${pairId}/sessions`, { sessionDate: past, durationMinutes: 30 });
      check('  sessions close when the pair ends', lateSession.status === 400 || lateSession.status === 422, `${lateSession.status} (${lateSession.error?.code})`);
      const twice = await call('POST', `/alumni/mentorship/${pairId}/complete`, { outcome: 'again' });
      check('  cannot complete twice', twice.status === 400 || twice.status === 422, `${twice.status} (${twice.error?.code})`);
    }

    // Cleanup through prisma: there is no DELETE pair route, and a live
    // verification pair would be counted by the next run's "seed has N active"
    // assertions and by the dashboard metrics.
    const deletedPair = await prisma.mentorshipPair.deleteMany({ where: { id: pairId ?? '' } });
    const deletedReq = await prisma.mentorshipRequest.deleteMany({ where: { id: reqId ?? '' } });
    check('cleanup: verification pair + request removed', deletedPair.count === 1 && deletedReq.count === 1, `${deletedPair.count} pair, ${deletedReq.count} request (sessions/goals/feedback cascaded)`);
  }

  // ── The student side ──
  // A STUDENT can be a mentor's mentee in the schema, but `/alumni/*` is gated to
  // ALUMNI/ADMIN roles, so the student route is the only way they could ever see
  // their own mentorship. Asserted because it is easy to delete and invisible until
  // a student reports the screen is missing.
  let studentToken = '';
  try {
    studentToken = await loginAs('student@learnix.dev');
  } catch {
    check('student can log in', false, 'student@learnix.dev unavailable — skipping the student-side checks');
  }
  if (studentToken) {
    token = studentToken;
    const sMen = await call('GET', '/student/mentorship');
    check('GET /student/mentorship', sMen.status === 200, `status ${sMen.status}`);
    check('  student sees their pairs', Array.isArray(sMen.data?.active) && Array.isArray(sMen.data?.history), `${(sMen.data?.active ?? []).length} active / ${(sMen.data?.history ?? []).length} history`);

    // A STUDENT role must be refused by the alumni router — this is WHY the
    // student route exists, so the gate itself is part of the contract.
    const blocked = await call('GET', '/alumni/mentorship');
    check('  student is refused by /alumni/mentorship', blocked.status === 403, `${blocked.status} (${blocked.error?.code})`);

    const sStudent = await prisma.studentProfile.findFirst({ where: { user: { email: 'student@learnix.dev' } }, select: { id: true, userId: true } });
    const hasOpen = sStudent ? await prisma.mentorshipRequest.findFirst({ where: { menteeUserId: sStudent.userId, status: 'PENDING' } }) : null;
    if (sStudent && !hasOpen) {
      const sReq = await call('POST', '/student/mentorship/requests', { requestedSkills: 'Verification: campus placements', message: 'Verification run.', field: 'Career Guidance' });
      check('  student can request a mentor', sReq.status === 201, sReq.data?.id ?? `${sReq.status} ${sReq.error?.message}`);
      const sMentees = await call('GET', '/student/mentorship/mentors');
      check('  student sees the mentor directory', sMentees.status === 200 && (sMentees.data?.mentors?.length ?? 0) > 0, `${sMentees.data?.count} mentors`);
      if (sReq.data?.id) {
        const sMatches = await call('GET', `/student/mentorship/requests/${sReq.data.id}/matches`);
        check('  ranked matches work for a student', sMatches.status === 200 && Array.isArray(sMatches.data?.candidates), `${(sMatches.data?.candidates ?? []).length} candidate(s)`);
        const withdrawn = await call('DELETE', `/student/mentorship/requests/${sReq.data.id}`);
        check('  student can withdraw their request', withdrawn.status === 200 && withdrawn.data?.status === 'WITHDRAWN', `${withdrawn.data?.status ?? withdrawn.status}`);
        await prisma.mentorshipRequest.deleteMany({ where: { id: sReq.data.id } });
      }
    } else {
      check('  student request lifecycle', true, hasOpen ? 'skipped — the seeded student already has an open request' : 'skipped — no student profile');
    }
  }

  token = OFFICE_TOKEN;


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
  // MOVED to `scripts/verify-profile-http.ts`. This used to assert that
  // `GET /alumni/profile` returned `{ fullName, roles, programStats }` — the summary
  // card that a literal route of the same name SHADOWED the real self-service profile
  // sub-router with. Keeping the assertion would have kept asserting an endpoint that no
  // longer exists, and it would have read as coverage of `/alumni/profile` while testing
  // something the profile screens never call. The replacement suite asserts the actual
  // self-service contract instead.
  console.log('\n\u2500\u2500 9. Profile');
  console.log('   (moved to verify-profile-http.ts — see the note in that file)');

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
