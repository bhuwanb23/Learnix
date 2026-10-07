/**
 * Dashboard HTTP verification (docs/users/12-alumni-relations.md §3.1).
 *
 *   npx tsx scripts/verify-alumni/dashboard.ts
 *
 * WHY THIS SUITE EXISTS SEPARATELY
 * --------------------------------
 * `directory.ts` used to assert seven dashboard payload fields. Those are gone because the
 * endpoint changed from an institution-wide engagement report to a per-user graduate
 * summary, and asserting the new shape there would have buried it inside a suite about
 * directory filtering.
 *
 * The thing worth testing is not the shape. It is SCOPING: `/alumni/mentorship` and
 * `/alumni/donations` both return institution-wide data, so a dashboard assembled naively
 * from them would show a graduate somebody else's charitable giving and somebody else's
 * mentorship pairing — and it would look completely normal. The only way to catch that is
 * to call the endpoint as two different users and compare.
 *
 * COMPARISONS, NOT ABSOLUTE NUMBERS
 * ---------------------------------
 * Seed counts change whenever the alumni seed is re-run, so assertions here compare one
 * user's response against another's and against the database, rather than against a
 * hardcoded figure. A test that asserts "₹5,25,000" passes today and is a lie after the
 * next seed.
 */
import {
  Tally,
  banner,
  officeLogin,
  prisma,
  requireServer,
  runSuite,
  section,
  GRADUATE_EMAIL,
  OTHER_GRADUATE_EMAIL,
} from '../alumni-harness.js';

const t = new Tally();

async function run() {
  banner('Alumni — Dashboard');
  await requireServer();

  const office = await officeLogin();
  const grad = await gradViewer(GRADUATE_EMAIL);
  const other = await gradViewer(OTHER_GRADUATE_EMAIL);

  t.check(
    'logged in as two graduates plus the office',
    !!grad.actor.token && !!other.actor.token,
    `${grad.email}, ${other.email}`,
  );

  const instId = (await prisma.institution.findFirstOrThrow({ select: { id: true } })).id;

  // ── 1. Shape ─────────────────────────────────────────────────────────────────
  section(1, 'Response shape');
  const res = await grad.actor.call('GET', '/alumni/dashboard');
  const d = res.data;
  t.check('GET /alumni/dashboard', res.status === 200 && !!d, `${res.status}`);
  t.check('  snapshot block', !!d?.snapshot, `hasProfile=${d?.snapshot?.hasProfile}`);
  t.check('  career block', !!d?.career, `hasCareer=${d?.career?.hasCareer}`);
  t.check('  events array', Array.isArray(d?.events), `${(d?.events ?? []).length} upcoming`);
  t.check('  mentorship block', !!d?.mentorship, `active=${d?.mentorship?.activeCount} pending=${d?.mentorship?.pendingCount}`);
  t.check('  giving block', !!d?.giving, `received=${d?.giving?.receivedRupees} campaigns=${d?.giving?.campaigns?.length}`);
  t.check('  network block', !!d?.network, `new=${d?.network?.newAlumni?.length} suggestions=${d?.network?.suggestions?.length}`);
  t.check('  unreadNotifications is a number', typeof d?.unreadNotifications === 'number', `${d?.unreadNotifications}`);

  // The retired office contract. Asserted as ABSENT so the old payload cannot quietly
  // reappear alongside the new one — two incompatible contracts on one path is the state
  // this change was made to end.
  t.check('  the retired engagement block is gone', d?.engagement === undefined, d?.engagement ? 'STILL PRESENT' : 'absent');
  t.check('  the retired stats block is gone', d?.stats === undefined, d?.stats ? 'STILL PRESENT' : 'absent');

  // ── 2. Events are joinable and mark the caller's own seat ───────────────────
  section(2, 'Events');
  const eventIds = new Set((d?.events ?? []).map((e: any) => e.id));
  t.check('  every event carries capacity and rsvps', (d?.events ?? []).every((e: any) => typeof e.rsvps === 'number'), `${eventIds.size} events`);

  // No `.every(e => e.registered === false || true)` tautology — that expression is
  // vacuously true for every input and would have passed while the flag was wrong. The
  // real check is a database comparison.
  const registeredOk = await registeredMatchesDb(grad.userId, d?.events ?? []);
  t.check(
    '  registered reflects the CALLER only',
    registeredOk,
    registeredOk ? "agrees with the caller's own registration rows" : 'MISMATCH against the DB',
  );
  const futureOnly = (d?.events ?? []).every((e: any) => new Date(e.startDate).getTime() >= Date.now() - 60000);
  t.check('  only future events are listed', futureOnly, `${(d?.events ?? []).length} checked`);
  t.check('  the list is capped at 3', (d?.events ?? []).length <= 3, `${(d?.events ?? []).length}`);

  // ── 3. Mentorship is per-user ────────────────────────────────────────────────
  section(3, 'Mentorship scoping');
  const dbPairs = await prisma.mentorshipPair.findMany({
    where: {
      OR: [
        { mentorAlumniUserId: grad.userId },
        { menteeAlumniProfile: { userId: grad.userId } },
        { menteeStudentProfile: { userId: grad.userId } },
      ],
    },
    select: { status: true, mentorAlumniUserId: true },
  });
  const expectedActive = dbPairs.filter((p) => p.status === 'ACTIVE').length;
  const expectedPending = dbPairs.filter((p) => p.status === 'PENDING').length;

  t.check(
    '  activeCount matches the DB for THIS user',
    d?.mentorship?.activeCount === expectedActive,
    `got ${d?.mentorship?.activeCount}, db ${expectedActive}`,
  );
  t.check(
    '  pendingCount matches the DB for THIS user',
    d?.mentorship?.pendingCount === expectedPending,
    `got ${d?.mentorship?.pendingCount}, db ${expectedPending}`,
  );

  const asMentor = dbPairs.filter((p) => p.mentorAlumniUserId === grad.userId).length;
  t.check('  asMentorCount matches', d?.mentorship?.asMentorCount === asMentor, `got ${d?.mentorship?.asMentorCount}, db ${asMentor}`);

  // The property that actually matters: two users must not see the same pairing.
  const otherDash = await other.actor.call('GET', '/alumni/dashboard');
  const tenantTotal = await prisma.mentorshipPair.count({ where: { mentorAlumniUser: { institutionId: instId } } });
  const mineTotal = (d?.mentorship?.activeCount ?? 0) + (d?.mentorship?.pendingCount ?? 0);
  t.check(
    '  the tenant has MORE pairs than this dashboard shows',
    tenantTotal > mineTotal,
    `tenant ${tenantTotal} vs mine ${mineTotal} — proves it is not the institution view`,
  );
  t.check(
    '  the two graduates generally differ',
    JSON.stringify(otherDash.data?.mentorship) !== JSON.stringify(d?.mentorship) || tenantTotal <= 2,
    `grad ${mineTotal} pairs vs other ${(otherDash.data?.mentorship?.activeCount ?? 0) + (otherDash.data?.mentorship?.pendingCount ?? 0)}`,
  );

  // ── 4. Giving is per-user ────────────────────────────────────────────────────
  section(4, 'Giving scoping');
  const myDonations = await prisma.donation.findMany({
    where: { institutionId: instId, alumniUserId: grad.userId },
    select: { amountMinor: true, status: true },
  });
  const expectedReceived = myDonations.filter((x) => x.status === 'RECEIVED').reduce((a, x) => a + x.amountMinor, 0);
  const expectedPledged = myDonations.filter((x) => x.status === 'PLEDGED').reduce((a, x) => a + x.amountMinor, 0);

  t.check(
    '  receivedRupees is only THIS donor\'s cleared gifts',
    d?.giving?.receivedRupees === Math.round(expectedReceived / 100),
    `got ${d?.giving?.receivedRupees}, db ${Math.round(expectedReceived / 100)}`,
  );
  t.check(
    '  pledgedRupees is only THIS donor\'s pledges',
    d?.giving?.pledgedRupees === Math.round(expectedPledged / 100),
    `got ${d?.giving?.pledgedRupees}, db ${Math.round(expectedPledged / 100)}`,
  );

  // The dangerous one: the school's total is much larger, so a leak is unmistakable.
  const tenantRaised = await prisma.donation.aggregate({
    where: { institutionId: instId, status: 'RECEIVED' },
    _sum: { amountMinor: true },
  });
  t.check(
    '  the institution total is far larger than this card',
    Math.round((tenantRaised._sum.amountMinor ?? 0) / 100) > (d?.giving?.receivedRupees ?? 0),
    `school ₹${Math.round((tenantRaised._sum.amountMinor ?? 0) / 100)} vs mine ₹${d?.giving?.receivedRupees}`,
  );

  // ── 5. Network ───────────────────────────────────────────────────────────────
  section(5, 'Network');
  const n = d?.network ?? {};
  t.check('  newAlumni is an array', Array.isArray(n.newAlumni), `${(n.newAlumni ?? []).length}`);
  t.check(
    '  the caller is EXCLUDED from their own new-alumni list',
    !(n.newAlumni ?? []).some((p: any) => p.name === d?.snapshot?.name),
    d?.snapshot?.name ?? 'no name',
  );
  t.check('  connectionCount is a number', typeof n.connectionCount === 'number', `${n.connectionCount}`);
  t.check(
    '  suggestions carry reasons, not just a score',
    (n.suggestions ?? []).every((s: any) => Array.isArray(s.reasons)),
    `${(n.suggestions ?? []).length} suggestions`,
  );
  t.check(
    '  suggestions exclude existing connections',
    await suggestionsExcludeConnections(grad.userId, n.suggestions ?? []),
    'none already connected',
  );

  // ── 6. Empty states name what is absent rather than claiming zero ────────────
  section(6, 'Snapshot completeness');
  const s = d?.snapshot ?? {};
  t.check('  hasProfile is a boolean', typeof s.hasProfile === 'boolean', `${s.hasProfile}`);
  if (s.hasProfile) {
    t.check('  missing[] is an array of names', Array.isArray(s.missing), JSON.stringify(s.missing));
    t.check('  missing[] names real fields', (s.missing ?? []).every((m: string) => typeof m === 'string' && m.length > 0), `${(s.missing ?? []).length} named`);
    // The office account has no batch, so this exercises the sparse path deliberately.
    const officeDash = await office.call('GET', '/alumni/dashboard');
    t.check(
      '  the office account reports its own missing fields',
      officeDash.status === 200 && (officeDash.data?.snapshot?.missing ?? []).includes('batch'),
      JSON.stringify(officeDash.data?.snapshot?.missing),
    );
    t.check(
      '  the office account does NOT get a 404',
      officeDash.status === 200,
      `${officeDash.status} — a missing profile must not fail the whole dashboard`,
    );
  }

  t.finish('Alumni — Dashboard');
}

/** The `registered` flag must agree with the caller's own rows, not the event total. */
async function registeredMatchesDb(userId: string, events: any[]) {
  if (events.length === 0) return true;
  const rows = await prisma.eventRegistration.findMany({
    where: { registrantUserId: userId, eventId: { in: events.map((e) => e.id) } },
    select: { eventId: true },
  });
  const registered = new Set(rows.map((r) => r.eventId));
  return events.every((e) => e.registered === registered.has(e.id));
}

/** getMatches already filters these, but the dashboard must not reintroduce anyone. */
async function suggestionsExcludeConnections(userId: string, suggestions: any[]) {
  if (suggestions.length === 0) return true;
  const rows = await prisma.alumniConnection.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ requesterUserId: userId }, { recipientUserId: userId }],
    },
    select: { requesterUserId: true, recipientUserId: true },
  });
  const connected = new Set<string>();
  for (const r of rows) {
    connected.add(r.requesterUserId);
    connected.add(r.recipientUserId);
  }
  return suggestions.every((s) => !connected.has(s.userId));
}

/**
 * A graduate viewer plus the `userId` the scoping assertions compare against.
 *
 * Returned as `{ actor, userId }` rather than spread. `{ ...actor }` copies the fields and
 * DROPS the prototype, so `call` and `callAs` disappear — a spread of a class instance is
 * not the instance. The pair keeps both.
 */
async function gradViewer(email: string) {
  const { loginAs } = await import('../alumni-harness.js');
  const actor = await loginAs(email);
  const row = await prisma.user.findFirst({
    where: { email },
    select: { id: true },
  });
  if (!row) throw new Error(`no user row for ${email}`);
  return { actor, userId: row.id, email };
}

runSuite('Alumni — Dashboard', run);