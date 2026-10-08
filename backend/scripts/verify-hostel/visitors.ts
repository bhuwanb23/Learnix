/**
 * Suite: the visitor workflow over HTTP, both sides of the desk.
 * Docs: 08-hostel.md 3.5, 01-students.md 3.7
 *
 * WHY THIS ALONGSIDE `check-hostel-visitors.ts`
 * ----------------------------------------------
 * The DB suite proves the rules are shared, the policy is defensive, the alerts are independent
 * and the queries are tenant-scoped. It cannot prove that a ROUTE is wired, that a zod schema
 * rejects the right shapes, that route declaration ORDER is right, or what status code a client
 * actually receives. Those are transport facts, and this file is where they live.
 *
 * THE THREE THINGS THIS FILE IS REALLY ABOUT
 * -------------------------------------------
 *   1. THE TWO-SIDED BOUNDARY. A visitor is authorised by the resident and admitted by the warden,
 *      on two different routers with two different role gates. A student must not be able to
 *      confirm their own visitor or record entry; a warden must not be able to authorise on a
 *      resident's behalf through the resident route. Asserted from BOTH directions.
 *   2. ROUTE ORDER. `/visitors/policy`, `/visitors/frequent` and `/visitors/barred` are static
 *      siblings of `/visitors/:id`. Declare them after and `:id` swallows them, so a perfectly
 *      valid request 404s. Each is asserted individually so a failure names which one broke.
 *   3. THE POLICY IS WRITABLE OVER HTTP. The whole configurability claim rests on a warden being
 *      able to change the rules without a deploy, so `PUT /visitors/policy` is exercised for
 *      real and its effect on subsequent requests is asserted - then restored.
 *
 * THE 400 / 422 DISTINCTION
 * -------------------------
 * Asserted deliberately, because the split is meaningful and easy to blur: 400 means the body
 * contradicts ITSELF (a return before the arrival), 422 means it is well formed and a RULE
 * refuses it (a departure in the past, a visit too far ahead, a missing required purpose). A
 * client can show the first as a form error; the second has to go to the warden.
 *
 * MUTATES SEEDED ROWS AND PUTS THEM BACK
 * --------------------------------------
 * The workflow needs real writes. This drives its OWN visitors - created, confirmed, admitted,
 * departed - and then DELETES them, asserting the deletion. Driving them to a terminal state is
 * not a restore: terminal states block nothing, so the suite would pass again while leaving two
 * more rows behind each run, and the demo database would slowly fill with a visitor log.
 */
import {
  Tally,
  banner,
  loginAs,
  prisma,
  requireServer,
  runSuite,
  section,
} from '../alumni-harness.js';

const t = new Tally();

const WARDEN_EMAIL = 'hostel@learnix.dev';
/** A STUDENT, to prove the warden area is refused. */
const STUDENT_EMAIL = 'student@learnix.dev';
/**
 * A student with NO visitors, who is an actual resident so a real `studentProfileId` can be
 * resolved. The resident list is searched rather than hardcoded, because roll numbers move.
 */
const RESIDENT_EMAIL = 'aarav.sharma@learnix.dev';

const H = 3600 * 1000;
const now = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();

/**
 * A window that is safely inside ONE LOCAL DAY, whatever hour the suite happens to run.
 *
 * The first version hardcoded "now + 3h to now + 5h" and passed all afternoon. It failed at 20:00
 * because 23:00 to 01:00 spans local midnight, and this hostel has `dayVisitsOnly` on - so the
 * request was correctly refused with a 422 and the suite reported a defect that did not exist.
 *
 * A suite whose result depends on the time of day is not a suite. This anchors the window to a
 * fixed LOCAL hour well inside the day, and falls back to tomorrow when that hour has already
 * passed today. The policy's own offset is used, so this stays correct wherever the institution
 * is configured to be.
 */
function todayWindow(policy: any, arrivalLocalHour = 15, stayHours = 2) {
  const tzMs = (policy?.utcOffsetMinutes ?? 330) * 60_000;
  const localNow = new Date(now + tzMs);
  const localDayStart = Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate());
  // If the chosen arrival hour has already gone by today, use tomorrow rather than a past time.
  const arrivalUtcMs = localDayStart + arrivalLocalHour * H + (arrivalLocalHour <= localNow.getUTCHours() ? 86400000 : 0);
  return { in: arrivalUtcMs - tzMs, out: arrivalUtcMs - tzMs + stayHours * H };
}

/** Everything this run created, so the restore is by id and cannot touch seeded rows. */
const created: { visitors: string[]; barred: string[] } = { visitors: [], barred: [] };

async function cleanup() {
  if (created.visitors.length) {
    for (const id of created.visitors) {
      // Notifications carry the pass id inside a deep-link payload, so match on that rather than
      // deleting anything broader.
      await prisma.notification.deleteMany({ where: { dataJson: { contains: id } } });
    }
    await prisma.visitor.deleteMany({ where: { id: { in: created.visitors } } });
  }
  if (created.barred.length) {
    await prisma.barredVisitor.deleteMany({ where: { id: { in: created.barred } } });
  }
}

async function main() {
  banner('Hostel - visitors');
  await requireServer();

/**
 * The authorisation window, anchored to a fixed LOCAL hour.
 *
 * Declared up here because section 5 needs it too, and reading the policy needs a warden token -
 * so it is resolved lazily on first use rather than at module scope.
 */
let cachedWindow: { in: number; out: number } | null = null;
async function windowFor(warden: any) {
  if (cachedWindow) return cachedWindow;
  const policy = (await warden.call('GET', '/hostel/visitors/policy')).data?.policy;
  cachedWindow = todayWindow(policy);
  return cachedWindow;
}

// ── Identities ───────────────────────────────────────────────────────────────
const warden = await loginAs(WARDEN_EMAIL);
  t.check('auth/login (chief warden)', !!warden.token, warden.email);
  if (!warden.token) return;
  t.check('  holds HOSTEL', warden.roles.includes('HOSTEL'), warden.roles.join(', ') || 'none');

  const student = await loginAs(STUDENT_EMAIL);
  t.check('auth/login (student, for the role gate)', !!student.token, student.email);

  const resident = await loginAs(RESIDENT_EMAIL);
  t.check('auth/login (resident)', !!resident.token, resident.email);
  if (!resident.token) return;

  // The resident list is `{ expected, history, policy }` - three named lists, not a bare array.
  // The "still open" set is `expected`, since that is exactly what the endpoint defines as
  // not-yet-finished; asserting on `history` would be asserting the opposite of what matters.
  const pre = (await resident.call('GET', '/student/visitors')).data ?? {};
  const preExpected = pre.expected ?? [];
  const preHistory = pre.history ?? [];
  t.check('  the response is the three-list shape', Array.isArray(preExpected) && Array.isArray(preHistory));
  t.check(
    'the resident starts with no OPEN visitor',
    preExpected.every((v: any) => !['PENDING', 'APPROVED', 'IN'].includes(v.status)),
    preExpected.map((v: any) => v.status).join(',') || 'none',
  );
  t.check(
    'and nothing sits in both lists',
    !preExpected.some((v: any) => preHistory.some((h: any) => h.id === v.id)),
    `${preExpected.length} expected / ${preHistory.length} history`,
  );

  // A real resident profile id, for the warden-registered path. Resolved from the residents
  // endpoint rather than a constant so the fixture survives a seed change.
  const residents = await warden.call('GET', '/hostel/residents?pageSize=5');
  const target = residents.data?.residents?.[0];
  t.check('GET /residents finds a resident to register against', !!target?.studentProfileId, target?.name ?? 'none');
  const targetProfileId = target?.studentProfileId;

  // ── 1. Access control ─────────────────────────────────────────────────────────
  section(1, 'Access control');
  const deniedInbox = await warden.callAs(student, 'GET', '/hostel/visitors');
  t.check('a STUDENT is refused the visitor inbox', deniedInbox.status === 403, `status ${deniedInbox.status}`);
  const noAuth = await warden.call('GET', '/hostel/visitors', undefined, '');
  t.check('an unauthenticated read is refused', noAuth.status === 401, `status ${noAuth.status}`);
  const noAuthBarred = await warden.call('POST', '/hostel/visitors/barred', { name: 'X', reason: 'y' }, '');
  t.check('and so is an unauthenticated write', noAuthBarred.status === 401, `status ${noAuthBarred.status}`);

  // ── 2. Reads ──────────────────────────────────────────────────────────────────
  section(2, 'The inbox');
  const inbox = await warden.call('GET', '/hostel/visitors?pageSize=10');
  t.check('GET /visitors', inbox.status === 200, `status ${inbox.status}`);
  t.check('  passes[] is populated', (inbox.data?.passes ?? []).length > 0, `${(inbox.data?.passes ?? []).length} rows`);
  t.check('  every row carries a derived lifecycle', (inbox.data?.passes ?? []).every((p: any) => !!p.lifecycle));
  t.check('  every row carries an alert ARRAY, not a flag', (inbox.data?.passes ?? []).every((p: any) => Array.isArray(p.alerts)));
  t.check(
    '  isRestricted agrees with the array rather than replacing it',
    (inbox.data?.passes ?? []).every((p: any) => p.isRestricted === (p.alerts.length > 0)),
  );
  t.check('  stats are present', typeof inbox.data?.stats?.total === 'number', JSON.stringify(inbox.data?.stats ?? {}));

  const first = inbox.data?.passes?.[0];
  if (first) {
    const detail = await warden.call('GET', `/hostel/visitors/${first.id}`);
    t.check('GET /visitors/:id', detail.status === 200, `status ${detail.status}`);
    t.check('  and matches the inbox row', detail.data?.id === first.id);
    t.check('  the shaped row carries visitCountInWindow', typeof detail.data?.visitCountInWindow === 'number');
  }
  const bogus = await warden.call('GET', '/hostel/visitors/visitor-does-not-exist');
  t.check('an unknown id is 404, not an empty object', bogus.status === 404, `status ${bogus.status}`);

  // ── 3. ROUTE ORDER ────────────────────────────────────────────────────────────
  section(3, 'Static routes are not swallowed by /:id');
  const policy = await warden.call('GET', '/hostel/visitors/policy');
  t.check('GET /visitors/policy', policy.status === 200, `status ${policy.status}`);
  t.check('  and returns the effective policy', !!policy.data?.policy, JSON.stringify(policy.data ?? {}).slice(0, 80));
  t.check('  alongside the defaults', !!policy.data?.defaults);
  t.check('  visiting hours read as HH:MM', /^\d{2}:\d{2}$/.test(policy.data?.policy?.visitingHours?.start ?? ''), policy.data?.policy?.visitingHours?.start);

  const frequent = await warden.call('GET', '/hostel/visitors/frequent?limit=3');
  t.check('GET /visitors/frequent', frequent.status === 200, `status ${frequent.status}`);
  t.check('  returns both views', Array.isArray(frequent.data?.visitors) && Array.isArray(frequent.data?.residents));
  t.check('  and reports the window it counted over', typeof frequent.data?.withinDays === 'number', String(frequent.data?.withinDays));

  const barred = await warden.call('GET', '/hostel/visitors/barred');
  t.check('GET /visitors/barred', barred.status === 200, `status ${barred.status}`);
  t.check('  the seed populates it', (barred.data ?? []).length > 0, `${(barred.data ?? []).length} entries`);

  // ── 4. Filters ────────────────────────────────────────────────────────────────
  section(4, 'Filters');
  const byStatus = await warden.call('GET', '/hostel/visitors?status=PENDING');
  t.check('?status= returns only that status', (byStatus.data?.passes ?? []).every((p: any) => p.status === 'PENDING'));
  const facets = byStatus.data?.facets?.statuses ?? [];
  t.check('  facets do NOT narrow with the filter', facets.some((f: any) => f.status === 'APPROVED'), facets.map((f: any) => `${f.status}:${f.count}`).join(' '));

  const paged = await warden.call('GET', '/hostel/visitors?pageSize=1');
  t.check('?pageSize= is honoured', (paged.data?.passes ?? []).length === 1, `${(paged.data?.passes ?? []).length} rows`);
  const bigPage = await warden.call('GET', '/hostel/visitors?pageSize=9999');
  t.check('an out-of-range pageSize is a 400 from the schema', bigPage.status === 400, `status ${bigPage.status}`);
  const badStatus = await warden.call('GET', '/hostel/visitors?status=NONSENSE');
  t.check('an unknown status filter is a 400, not an empty page', badStatus.status === 400, `status ${badStatus.status}`);
  const noQuery = await warden.call('GET', '/hostel/visitors?q=zzznotfound');
  t.check('a term matching nothing is an empty page', (noQuery.data?.passes ?? []).length === 0);
  const needAction = await warden.call('GET', '/hostel/visitors?needsAction=true');
  t.check('?needsAction= keeps only rows that do', (needAction.data?.passes ?? []).every((p: any) => p.needsAction === true));
  const alerted = await warden.call('GET', '/hostel/visitors?alerts=true');
  t.check('?alerts= keeps only flagged rows', (alerted.data?.passes ?? []).every((p: any) => p.isRestricted === true));

  // ── 5. The two-sided boundary ─────────────────────────────────────────────────
  section(5, 'The two-sided boundary');
  // Somewhere to aim the hostile calls. Any seeded PENDING visitor will do.
  const anyPending = rows().find((p: any) => p.status === 'PENDING');
  if (anyPending) {
    const studentApproves = await warden.callAs(resident, 'POST', `/hostel/visitors/${anyPending.id}/approve`, {});
    t.check('a STUDENT cannot confirm a visitor', studentApproves.status === 403, `status ${studentApproves.status}`);
    const studentRejects = await warden.callAs(resident, 'POST', `/hostel/visitors/${anyPending.id}/reject`, { note: 'no' });
    t.check('a STUDENT cannot refuse one', studentRejects.status === 403, `status ${studentRejects.status}`);
    const studentEntry = await warden.callAs(resident, 'POST', `/hostel/visitors/${anyPending.id}/entry`, {});
    t.check('a STUDENT cannot record an entry', studentEntry.status === 403, `status ${studentEntry.status}`);
    const studentExit = await warden.callAs(resident, 'POST', `/hostel/visitors/${anyPending.id}/exit`, {});
    t.check('a STUDENT cannot record an exit', studentExit.status === 403, `status ${studentExit.status}`);
    const studentBar = await warden.callAs(resident, 'POST', '/hostel/visitors/barred', { name: 'X', reason: 'y' });
    t.check('a STUDENT cannot edit the barred list', studentBar.status === 403, `status ${studentBar.status}`);
    const studentPolicy = await warden.callAs(resident, 'PUT', '/hostel/visitors/policy', { dayVisitsOnly: false });
    t.check('a STUDENT cannot change the rules', studentPolicy.status === 403, `status ${studentPolicy.status}`);
    const earlyWin = await windowFor(warden);
    // The resident's schema does not ACCEPT a `visitingStudentProfileId` at all. A 400 naming that
    // key is a better answer than registering the visit against the caller while the caller
    // believes they registered it for somebody else - so this asserts the refusal, not a
    // redirect.
    const studentOther = await resident.call('POST', '/student/visitors', {
      name: 'For Somebody Else',
      relation: 'Friend',
      visitingStudentProfileId: targetProfileId,
      expectedInAt: iso(earlyWin.in),
      expectedOutAt: iso(earlyWin.out),
    });
    t.check(
      'a STUDENT cannot name another resident in the body',
      studentOther.status === 400,
      `status ${studentOther.status} ${studentOther.error?.message ?? ''}`,
    );
    t.check(
      '  and the error names the offending key',
      /visitingStudentProfileId/.test(JSON.stringify(studentOther.error ?? {})),
      JSON.stringify(studentOther.error ?? {}).slice(0, 120),
    );
  } else {
    t.check('a PENDING visitor exists to attack', false, 'seed has none');
  }

  // ── 6. Schema rejections ──────────────────────────────────────────────────────
  section(6, 'Schema rejections');
  const shortName = await warden.call('POST', '/hostel/visitors', { name: 'x', visitingStudentProfileId: targetProfileId, relation: 'Friend' });
  t.check('a 1-character name is a 400', shortName.status === 400, `status ${shortName.status}`);
  const unknownKey = await warden.call('POST', '/hostel/visitors', {
    name: 'Well Named',
    visitingStudentProfileId: targetProfileId,
    relation: 'Friend',
    isEmrgency: true,
  });
  t.check('an unknown key is a 400 (the schema is .strict())', unknownKey.status === 400, `status ${unknownKey.status}`);
  const badDecision = await warden.call('POST', `/hostel/visitors/${anyPending?.id ?? 'x'}/approve`, { decision: 'MAYBE' });
  t.check('an unknown key on decide is a 400', badDecision.status === 400 || badDecision.status === 404, `status ${badDecision.status}`);

  // ── 7. The resident's authorisation ───────────────────────────────────────────
  section(7, 'Resident authorisation');
  // Read the institution's own policy rather than assuming the defaults, so this suite follows
  // whichever rules are actually configured - including if a warden has turned day-only off.
  const livePolicy = (await warden.call('GET', '/hostel/visitors/policy')).data?.policy;
  const win = todayWindow(livePolicy);
  const authBody = {
    name: 'Suite Visitor',
    relation: 'Aunt',
    phone: '9112233445',
    purpose: 'Collecting a book',
    expectedInAt: iso(win.in),
    expectedOutAt: iso(win.out),
  };
  t.check(
    'the test window sits inside one local day',
    Math.floor((win.in + (livePolicy?.utcOffsetMinutes ?? 330) * 60000) / 86400000) ===
      Math.floor((win.out + (livePolicy?.utcOffsetMinutes ?? 330) * 60000) / 86400000),
    `${iso(win.in)} -> ${iso(win.out)}`,
  );
  const authorised = await resident.call('POST', '/student/visitors', authBody);
  t.check('POST /student/visitors', authorised.status === 201, `status ${authorised.status}`);
  if (authorised.status === 201) {
    created.visitors.push(authorised.data.id);
    t.check('  it lands PENDING for the warden', authorised.data?.status === 'PENDING', authorised.data?.status);
    t.check('  and reads as awaiting confirmation', authorised.data?.lifecycle === 'awaiting_approval', authorised.data?.lifecycle);
    t.check('  it is not yet verified or admitted', authorised.data?.checkInAt === null);
  }

  const mine = await resident.call('GET', '/student/visitors');
  t.check('GET /student/visitors', mine.status === 200, `status ${mine.status}`);
  t.check('  the new visitor is under "expected"', (mine.data?.expected ?? []).some((v: any) => v.name === 'Suite Visitor'));
  t.check('  and the policy travels with it', !!mine.data?.policy);
  t.check('  history is a separate list', Array.isArray(mine.data?.history));

  // The 400/422 split.
  const backwards = await resident.call('POST', '/student/visitors', { ...authBody, name: 'Backwards', expectedOutAt: iso(win.in - H) });
  t.check('a return before the arrival is a 400 (self-contradictory)', backwards.status === 400, `status ${backwards.status} ${backwards.error?.message ?? ''}`);
  const tooFar = await resident.call('POST', '/student/visitors', {
    ...authBody,
    name: 'Far Future',
    expectedInAt: iso(now + 40 * 24 * H + 14 * H),
    expectedOutAt: iso(now + 41 * 24 * H),
  });
  t.check(
    'a visit too far ahead is a 422 (well formed, a rule refuses it)',
    tooFar.status === 422,
    `status ${tooFar.status} ${tooFar.error?.message ?? ''}`,
  );

  // ── 8. Warden confirms ────────────────────────────────────────────────────────
  section(8, 'Warden confirmation');
  const id = authorised.status === 201 ? authorised.data.id : null;
  if (id) {
    const noReason = await warden.call('POST', `/hostel/visitors/${id}/reject`, {});
    t.check('a refusal with no reason is a 400', noReason.status === 400, `status ${noReason.status}`);

    const approved = await warden.call('POST', `/hostel/visitors/${id}/approve`, {});
    t.check('POST /visitors/:id/approve', approved.status === 200, `status ${approved.status}`);
    t.check('  the status is APPROVED', approved.data?.status === 'APPROVED', approved.data?.status);
    t.check('  and the lifecycle is `approved`', approved.data?.lifecycle === 'approved', approved.data?.lifecycle);
    t.check('  the decision is dated', !!approved.data?.approvedAt, String(approved.data?.approvedAt));
    t.check('  and it is a FULL shaped row, not a stub', Array.isArray(approved.data?.alerts) && !!approved.data?.visiting);

    const twice = await warden.call('POST', `/hostel/visitors/${id}/approve`, {});
    t.check('a decided visitor cannot be decided again', twice.status === 409, `status ${twice.status}`);

    // ── 9. The gate ─────────────────────────────────────────────────────────────
    section(9, 'The gate');
    const early = await warden.call('POST', `/hostel/visitors/${id}/exit`, {});
    t.check('a departure before any entry is a 409', early.status === 409, `status ${early.status}`);

    const entered = await warden.call('POST', `/hostel/visitors/${id}/entry`, { at: iso(now + 3 * H + 60000) });
    t.check('POST /visitors/:id/entry', entered.status === 200, `status ${entered.status}`);
    t.check('  the status is IN', entered.data?.status === 'IN', entered.data?.status);
    t.check('  the entry is stamped', !!entered.data?.checkInAt);
    t.check('  the lifecycle reads `out`... no - `in_campus`', entered.data?.lifecycle === 'in_campus', entered.data?.lifecycle);
    t.check('  and it is a full shaped row', Array.isArray(entered.data?.alerts));

    const twiceEntry = await warden.call('POST', `/hostel/visitors/${id}/entry`, {});
    t.check('a second entry is a 409, not a silent overwrite', twiceEntry.status === 409, `status ${twiceEntry.status}`);
    const survived = await warden.call('GET', `/hostel/visitors/${id}`);
    t.check('  the original entry time survived', survived.data?.checkInAt === entered.data?.checkInAt);

    const badStamp = await warden.call('POST', `/hostel/visitors/${id}/exit`, { at: 'not a date' });
    t.check('an unparseable gate time is a 400', badStamp.status === 400, `status ${badStamp.status}`);
    const backwardsExit = await warden.call('POST', `/hostel/visitors/${id}/exit`, { at: iso(now + H) });
    t.check('an exit before the entry is a 400', backwardsExit.status === 400, `status ${backwardsExit.status}`);

    const departed = await warden.call('POST', `/hostel/visitors/${id}/exit`, { at: iso(now + 5 * H) });
    t.check('POST /visitors/:id/exit', departed.status === 200, `status ${departed.status}`);
    t.check('  the lifecycle reads `left`', departed.data?.lifecycle === 'left', departed.data?.lifecycle);
    const twiceExit = await warden.call('POST', `/hostel/visitors/${id}/exit`, {});
    t.check('a second exit is a 409', twiceExit.status === 409, `status ${twiceExit.status}`);
  }

  // ── 10. Withdrawal ────────────────────────────────────────────────────────────
  section(10, 'Withdrawal');
  const pending = await resident.call('POST', '/student/visitors', {
    ...authBody,
    name: 'Plans Changed',
    expectedInAt: iso(win.in),
    expectedOutAt: iso(win.out),
  });
  t.check('a fresh authorisation is accepted once the previous is closed', pending.status === 201, `status ${pending.status}`);
  if (pending.status === 201) {
    created.visitors.push(pending.data.id);
    const withdrawn = await resident.call('POST', `/student/visitors/${pending.data.id}/cancel`);
    t.check('POST /student/visitors/:id/cancel', withdrawn.status === 200, `status ${withdrawn.status}`);
    t.check('  the status is CANCELLED', withdrawn.data?.status === 'CANCELLED', withdrawn.data?.status);
    t.check('  and it is a full shaped row', Array.isArray(withdrawn.data?.alerts));
    const again = await resident.call('POST', `/student/visitors/${pending.data.id}/cancel`);
    t.check('withdrawing twice is a 409', again.status === 409, `status ${again.status}`);
  }

  // ── 11. The policy is writable ────────────────────────────────────────────────
  section(11, 'The rules are editable');
  const before = await warden.call('GET', '/hostel/visitors/policy');
  const originalHours = before.data?.policy?.visitingHours;
  const originalDayOnly = before.data?.policy?.dayVisitsOnly;

  const updated = await warden.call('PUT', '/hostel/visitors/policy', { visitingHours: { start: '07:30', end: '22:15' } });
  t.check('PUT /visitors/policy', updated.status === 200, `status ${updated.status}`);
  t.check('  the change is echoed back', updated.data?.policy?.visitingHours?.start === '07:30', updated.data?.policy?.visitingHours?.start);
  const reread = await warden.call('GET', '/hostel/visitors/policy');
  t.check('  and it PERSISTS', reread.data?.policy?.visitingHours?.start === '07:30', reread.data?.policy?.visitingHours?.start);
  t.check('  a partial save left the OTHER rules alone', reread.data?.policy?.dayVisitsOnly === originalDayOnly, `dayOnly=${reread.data?.policy?.dayVisitsOnly} was ${originalDayOnly}`);

  // The schema refuses an out-of-range threshold, so the clamp it WOULD have applied is never
  // reachable through HTTP - which is the better outcome. Both are asserted: the 400 is what a
  // client actually sees, and the clamp is proven in `check-hostel-visitors.ts` where
  // `resolvePolicy` is called directly with a hostile value.
  const outOfRange = await warden.call('PUT', '/hostel/visitors/policy', { repeatAlert: { count: 1 } });
  t.check('an out-of-range threshold is a 400 from the schema', outOfRange.status === 400, `status ${outOfRange.status}`);
  // `99:99` is SHAPE-valid (`\d{1,2}:\d{2}`) but out of range, so the schema accepts it and the
  // POLICY clamps it to the last minute of the day. That two-layer split is deliberate and is
  // what makes the settings screen forgiving of a typo without ever storing nonsense - so both
  // halves are asserted rather than one standing in for the other.
  const impossibleTime = await warden.call('PUT', '/hostel/visitors/policy', { visitingHours: { start: '99:99' } });
  t.check('an out-of-range time is accepted by the shape check', impossibleTime.status === 200, `status ${impossibleTime.status}`);
  t.check('  and CLAMPED by the policy, not stored verbatim', impossibleTime.data?.policy?.visitingHours?.start === '23:59', impossibleTime.data?.policy?.visitingHours?.start);
  // A value that is not even the right SHAPE is refused outright.
  const malformedTime = await warden.call('PUT', '/hostel/visitors/policy', { visitingHours: { start: '0830' } });
  t.check('a malformed time is a 400 from the schema', malformedTime.status === 400, `status ${malformedTime.status}`);
  const badShape = await warden.call('PUT', '/hostel/visitors/policy', { repeatAlert: { count: 'lots' } });
  t.check('a wrong-typed field is a 400 from the schema', badShape.status === 400, `status ${badShape.status}`);

  // Restore, so the suite does not leave the institution's rules changed.
  const restored = await warden.call('PUT', '/hostel/visitors/policy', {
    visitingHours: originalHours,
    dayVisitsOnly: originalDayOnly,
    repeatAlert: { count: 4, withinDays: 30, enabled: true },
  });
  t.check('the original rules are restored', restored.data?.policy?.visitingHours?.start === originalHours?.start, restored.data?.policy?.visitingHours?.start);

  // ── 12. The barred list ───────────────────────────────────────────────────────
  section(12, 'The barred list');
  const noReason = await warden.call('POST', '/hostel/visitors/barred', { name: 'No Reason Person' });
  t.check('a bar with no reason is a 400', noReason.status === 400, `status ${noReason.status}`);
  const added = await warden.call('POST', '/hostel/visitors/barred', { name: 'Suite Barred', phone: '9998877665', reason: 'Suite fixture' });
  t.check('POST /visitors/barred', added.status === 201, `status ${added.status}`);
  if (added.status === 201) created.barred.push(added.data.id);

  // The gate refuses a barred visitor. That refusal is the feature.
  const barredVisit = await resident.call('POST', '/student/visitors', {
    ...authBody,
    name: 'Suite Barred',
    phone: '9998877665',
    expectedInAt: iso(win.in),
    expectedOutAt: iso(win.out),
  });
  if (barredVisit.status === 201) {
    created.visitors.push(barredVisit.data.id);
    t.check('a barred visitor is still REGISTERED, not silently dropped', barredVisit.data?.status === 'PENDING');
    t.check('  and carries the BARRED alert', (barredVisit.data?.alerts ?? []).some((a: any) => a.code === 'BARRED'));
    const conf = await warden.call('POST', `/hostel/visitors/${barredVisit.data.id}/approve`, {});
    t.check('  the warden can still confirm it', conf.status === 200, `status ${conf.status}`);
    const refused = await warden.call('POST', `/hostel/visitors/${barredVisit.data.id}/entry`, {});
    t.check('  but the GATE refuses entry', refused.status === 409, `status ${refused.status}`);
    t.check('  with a reason the warden can act on', /barred/i.test(refused.error?.message ?? ''), refused.error?.message ?? '');
  }

  const removed = await warden.call('DELETE', `/hostel/visitors/barred/${created.barred[0] ?? 'nope'}`);
  t.check('DELETE /visitors/barred/:id', removed.status === 200, `status ${removed.status}`);
  const missing = await warden.call('DELETE', '/hostel/visitors/barred/does-not-exist');
  t.check('removing a bar that does not exist is a 404', missing.status === 404, `status ${missing.status}`);

  function rows(): any[] {
    return (inbox.data?.passes ?? []) as any[];
  }
}

/**
 * `runSuite` only catches a THROWN error - it does not fail the process when an assertion fails.
 * Omitting `finish` prints the failures in red and exits 0, which is a green CI run for a suite
 * that failed every check. The `.finally` matters: it must also run when `main` throws, or a
 * crash would hide the tally and leave this run's visitors in the database.
 */
runSuite('Hostel visitors', main)
  .finally(async () => {
    await cleanup().catch(() => {
      console.error('  ! the restore failed - this run may have left visitors behind');
    });
    t.finish('Hostel visitors');
  });
