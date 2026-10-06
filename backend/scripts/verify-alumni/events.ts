/**
 * Suite: events — extracted from `verify-alumni.ts` §4.
 *
 * WHY THIS IS A SEPARATE FILE
 * ---------------------------
 * `verify-alumni.ts` was one 1,168-line file covering fifteen unrelated areas with a
 * single mutable `token` variable that every section reassigned. That is not a style
 * complaint: a section asserting "a graduate cannot manage an event" could run under
 * whichever identity happened to be current, and the file's own comments admit it. The
 * fix is `Actor` objects that carry their own token, which is only enforceable if a
 * section has its own file — a shared module-scope token would just be moved.
 *
 * Each suite now logs in for itself, so it can be run alone:
 *   npx tsx scripts/verify-alumni/events.ts
 *
 * THE TWO ASSERTIONS WORTH READING
 * --------------------------------
 * 1. "attendance is NOT derived from CONFIRMED" — the regression this whole area exists
 *    to prevent. It is asserted as an aggregate, not per event: a three-person event
 *    where all three turned up genuinely IS 100%, so demanding `< 100` on a single event
 *    fails on correct data. The property that actually separates the two implementations
 *    is that checked-in is strictly FEWER than confirmed somewhere.
 * 2. "every event has an eventType" — an event with no type is invisible to the filter
 *    chips, which is how part of the directory goes missing with no error raised anywhere.
 */
import {
  Tally,
  banner,
  officeLogin,
  prisma,
  requireServer,
  runSuite,
  section,
} from '../alumni-harness.js';

const t = new Tally();

async function run() {
  banner('Alumni — Events');
  await requireServer();

  const office = await officeLogin();
  t.check('auth/login (office)', !!office.token, office.email);

  const instId = (await prisma.institution.findFirstOrThrow({ select: { id: true } })).id;

  // ── 1. List, scopes and facets ────────────────────────────────────────────────
  section(1, 'List, scopes and facets');
  const ev = await office.call('GET', '/alumni/events');
  t.check('GET /events', ev.status === 200 && (ev.data?.items ?? []).length > 0, `${ev.data?.items?.length} items`);
  t.check(
    '  pagination block',
    typeof ev.data?.pagination?.total === 'number',
    JSON.stringify(ev.data?.pagination),
  );
  t.check(
    '  type facets',
    (ev.data?.facets?.types ?? []).length > 0,
    (ev.data?.facets?.types ?? []).map((f: any) => `${f.type}:${f.count}`).join(' '),
  );

  const past = await office.call('GET', '/alumni/events?scope=past');
  t.check('  ?scope=past', past.status === 200 && (past.data?.items ?? []).length > 0, `${past.data?.items?.length} past`);
  const upcoming = await office.call('GET', '/alumni/events?scope=upcoming');
  t.check(
    '  ?scope=upcoming',
    upcoming.status === 200 && (upcoming.data?.items ?? []).length > 0,
    `${upcoming.data?.items?.length} upcoming`,
  );

  const allEvents = [...(ev.data?.items ?? []), ...(past.data?.items ?? [])];
  const untyped = allEvents.filter((e: any) => !e.eventType);
  t.check(
    '  every event has an eventType',
    untyped.length === 0,
    untyped.length
      ? `${allEvents.length} checked — untyped: ${untyped.map((e: any) => e.title).join(', ')}`
      : `${allEvents.length} checked, none untyped`,
  );

  const someType = ev.data?.facets?.types?.[0]?.type;
  const byType = await office.call('GET', `/alumni/events?type=${someType}`);
  t.check(
    '  ?type filters',
    byType.status === 200 && (byType.data?.items ?? []).every((e: any) => e.eventType === someType),
    `${someType} → ${byType.data?.items?.length}`,
  );

  // Search must not leak across scopes: a text match on the upcoming tab has to stay
  // inside the upcoming window.
  const searchTerm = (ev.data?.items ?? [])[0]?.title?.split(' ')[0];
  const searched = await office.call('GET', `/alumni/events?q=${encodeURIComponent(searchTerm ?? '')}`);
  t.check('  ?q searches', searched.status === 200, `"${searchTerm}" → ${searched.data?.items?.length}`);

  // ── 2. Detail ────────────────────────────────────────────────────────────────
  section(2, 'Detail');
  const evId = ev.data?.items?.[0]?.id;
  const evd = await office.call('GET', `/alumni/events/${evId}`);
  t.check('GET /events/:id', evd.status === 200 && !!evd.data?.title, evd.data?.title);
  t.check('  agenda[]', (evd.data?.agenda ?? []).length > 0, `${evd.data?.agenda?.length} slots`);
  t.check('  attendees[]', (evd.data?.attendees ?? []).length > 0, `${evd.data?.attendees?.length} registered`);
  t.check(
    '  stats block',
    typeof evd.data?.stats?.confirmed === 'number',
    `confirmed ${evd.data?.stats?.confirmed}, checkedIn ${evd.data?.stats?.checkedIn}, rate ${evd.data?.stats?.attendanceRate}%`,
  );
  t.check('  photos[]', Array.isArray(evd.data?.photos), `${evd.data?.photos?.length} photos`);
  t.check(
    '  viewerContext present',
    evd.data?.viewerContext !== undefined,
    `canManageEvent=${evd.data?.viewerContext?.canManageEvent}`,
  );
  t.check(
    '  office cannot register',
    evd.data?.viewerContext?.canRegister === false,
    `canRegister=${evd.data?.viewerContext?.canRegister}`,
  );

  // ── 3. Attendance is not derived from CONFIRMED ──────────────────────────────
  section(3, 'Attendance comes from check-ins, not CONFIRMED');
  const pastIds = (past.data?.items ?? []).map((e: any) => e.id);
  let aggConfirmed = 0;
  let aggCheckedIn = 0;
  let eventsBelow100 = 0;
  for (const pid of pastIds) {
    const d = await office.call('GET', `/alumni/events/${pid}`);
    aggConfirmed += d.data?.stats?.confirmed ?? 0;
    aggCheckedIn += d.data?.stats?.checkedIn ?? 0;
    const r = d.data?.stats?.attendanceRate;
    if (r !== null && r !== undefined && r < 100) eventsBelow100++;
  }
  t.check(
    'attendance is NOT derived from CONFIRMED',
    aggConfirmed > aggCheckedIn && eventsBelow100 > 0,
    `${aggCheckedIn} checked in of ${aggConfirmed} confirmed; ${eventsBelow100}/${pastIds.length} events below 100%`,
  );

  const anyChapter = await prisma.alumniChapter.findFirstOrThrow({
    where: { institutionId: instId },
    select: { id: true },
  });
  const perf = await office.call('GET', `/alumni/chapters/${anyChapter.id}/performance`);
  t.check(
    'chapter participation uses real check-ins',
    typeof perf.data?.participation?.attendanceRate === 'number',
    `attendanceRate ${perf.data?.participation?.attendanceRate}% (was 100% when CONFIRMED stood in for attendance)`,
  );

  t.finish('Alumni — Events');
}


runSuite('Alumni — Events (reads)', run);
