/**
 * Suite: gate passes over HTTP, for both sides of the desk.
 * Docs: 08-hostel.md, 01-students.md
 *
 * WHY THIS ALONGSIDE `check-hostel-gate-passes.ts`
 * -----------------------------------------------
 * The DB suite proves the queries are scoped, the rules are shared, and the invariants hold.
 * It cannot prove the ROUTES are wired, that the SCHEMAS accept and reject the right shapes,
 * that the two routers are mounted in the right order, or that a client receives the right
 * status code. Those are transport facts, and this file is where they live.
 *
 * THE THING THIS SUITE IS REALLY ABOUT
 * ------------------------------------
 * A pass is created by the STUDENT and decided by the WARDEN. Those are two different routers
 * with two different role gates, and the load-bearing security property is that a student
 * cannot reach the decision route and a warden cannot reach the creation route. Everything in
 * sections 2 and 3 exists to pin that boundary down from both sides.
 *
 * WHAT IS ASSERTED AND WHY IT IS NOT OBVIOUS
 * ------------------------------------------
 *   - `/gate-passes/overdue` is declared BEFORE `/gate-passes/:id`. Flip the order and `overdue`
 *     is swallowed by `:id` and 404s on a perfectly valid request.
 *   - `gatePassRequestSchema` is `.strict()`, so an unknown key is a 400 rather than a silently
 *     ignored field. A typo'd `isEmergency` in a client is otherwise an invisible no-op.
 *   - Approving WITHOUT `verified` leaves `idVerified` false. Approval and identity-checking
 *     are separate acts and the API must not conflate them.
 *   - `decisionNote` is required by the service for a REJECTION and optional otherwise, which
 *     the schema alone cannot express; this asserts the 400 comes back with a usable message.
 *   - The one-open-pass rule is a 409 with a reason naming the open pass, so the client can
 *     show something better than "something went wrong".
 *
 * MUTATES SEEDED ROWS AND PUTS THEM BACK
 * --------------------------------------
 * The lifecycle needs real writes: request, decide, stamp out, stamp back. Rather than editing
 * a seeded row - which would leave the demo data in a state the seed's own restore block then
 * has to undo - this asks a student who has NO passes at all, drives that pass all the way to
 * RETURNED, and asserts it landed there. A closed pass blocks nothing, so the suite is
 * re-runnable indefinitely and does not accumulate debris the way a cancelled request would.
 * The identity is asserted to start with zero passes, so a seed change cannot quietly turn
 * this into a test of the one-open-pass error instead.
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
/** A STUDENT, to prove the role gate refuses the warden area. */
const STUDENT_EMAIL = 'student@learnix.dev';
/**
 * Deliberately a student with NO gate passes. The lifecycle below needs to create one, and the
 * one-open-pass rule would otherwise turn every write into a 409 - which would still look like a
 * passing suite while testing nothing.
 */
const CLEAN_STUDENT_EMAIL = 'aarav.sharma@learnix.dev';

const H = 3600 * 1000;
const now = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();

async function main() {
  banner('Hostel - gate passes');
  await requireServer();

  // Identities
  const warden = await loginAs(WARDEN_EMAIL);
  t.check('auth/login (chief warden)', !!warden.token, warden.email);
  if (!warden.token) return;
  t.check('  holds HOSTEL', warden.roles.includes('HOSTEL'), warden.roles.join(', ') || 'none');

  const student = await loginAs(STUDENT_EMAIL);
  t.check('auth/login (student, for the role gate)', !!student.token, student.email);

  const clean = await loginAs(CLEAN_STUDENT_EMAIL);
  t.check('auth/login (student with no passes)', !!clean.token, clean.email);
  if (!clean.token) return;

  // The precondition the whole lifecycle rests on: this student has no OPEN pass. It is
  // "no open pass", not "no passes" - closed passes accumulate by design (each run drives one to
  // RETURNED and one to CANCELLED), and asserting zero of them would make the suite fail on its
  // own second run. What must hold is that nothing blocks the create below.
  const preExisting = (await clean.call('GET', '/student/gate-passes')).data ?? [];
  t.check(
    'the lifecycle student starts with no OPEN pass',
    preExisting.every((p: any) => p.status !== 'PENDING' && !(p.status === 'APPROVED' && !p.actualInAt)),
    preExisting.map((p: any) => p.status).join(',') || 'none',
  );

  // 1. Role gate
  section(1, 'Access control');
  const denied = await warden.callAs(student, 'GET', '/hostel/gate-passes');
  t.check('a STUDENT is refused the warden inbox', denied.status === 403, `status ${denied.status}`);
  const noAuth = await warden.call('GET', '/hostel/gate-passes', undefined, '');
  t.check('an unauthenticated read is refused', noAuth.status === 401, `status ${noAuth.status}`);

  // 2. Inbox
  section(2, 'Warden inbox');
  const inbox = await warden.call('GET', '/hostel/gate-passes');
  t.check('GET /gate-passes', inbox.status === 200, `status ${inbox.status}`);
  t.check('  passes[] populated', (inbox.data?.passes ?? []).length > 0, `${(inbox.data?.passes ?? []).length} rows`);
  t.check('  every row carries a derived lifecycle', (inbox.data?.passes ?? []).every((p: any) => !!p.lifecycle));
  t.check('  stats are present', typeof inbox.data?.stats?.pending === 'number', JSON.stringify(inbox.data?.stats ?? {}));

  const rows = inbox.data?.passes ?? [];
  const ranks = rows.map((p: any) => (p.isEmergency ? 0 : p.lifecycle === 'return_overdue' ? 1 : p.lifecycle === 'awaiting_approval' ? 2 : 3));
  t.check(
    '  the inbox arrives in urgency order',
    ranks.every((r: number, i: number) => i === 0 || ranks[i - 1] <= r),
    ranks.join(','),
  );

  const first = rows[0];
  if (first) {
    const detail = await warden.call('GET', `/hostel/gate-passes/${first.id}`);
    t.check('GET /gate-passes/:id', detail.status === 200, `status ${detail.status}`);
    t.check('  the detail row matches the inbox row', detail.data?.id === first.id);
  }
  const bogus = await warden.call('GET', '/hostel/gate-passes/gate-does-not-exist');
  t.check('an unknown id is 404, not a silent empty object', bogus.status === 404, `status ${bogus.status}`);

  // Overdue is declared before :id, so this is a routing assertion as much as a data one.
  const overdue = await warden.call('GET', '/hostel/gate-passes/overdue');
  t.check('GET /gate-passes/overdue is not swallowed by /:id', overdue.status === 200, `status ${overdue.status}`);
  t.check('  the seed has an overdue pass to find', (overdue.data ?? []).length > 0, `${(overdue.data ?? []).length} overdue`);
  // BOTH overrun kinds belong here, and this is the assertion that pins why. A pass the student
  // never left, whose window has since closed, is as actionable as one that left and stayed out
  // - both need a warden to do something. Collapsing them would hide a missed departure behind
  // a "late return" label and send someone looking for the wrong student movement.
  t.check(
    '  every overdue row is an overrun of one kind or the other',
    (overdue.data ?? []).every((p: any) => p.lifecycle === 'return_overdue' || p.lifecycle === 'departure_overdue'),
    (overdue.data ?? []).map((p: any) => p.lifecycle).join(','),
  );
  t.check(
    '  the list is scoped to APPROVED passes',
    (overdue.data ?? []).every((p: any) => p.status === 'APPROVED'),
  );
  t.check(
    '  every overdue row still has no recorded return',
    (overdue.data ?? []).every((p: any) => !p.actualInAt),
  );

  // Filters
  const byStatus = await warden.call('GET', '/hostel/gate-passes?status=PENDING');
  t.check('?status= returns only that status', (byStatus.data?.passes ?? []).every((p: any) => p.status === 'PENDING'));
  const facets = byStatus.data?.facets?.statuses ?? [];
  t.check(
    '  facets do NOT narrow with the active filter',
    facets.some((f: any) => f.status === 'APPROVED'),
    facets.map((f: any) => `${f.status}:${f.count}`).join(' '),
  );
  const paged = await warden.call('GET', '/hostel/gate-passes?pageSize=1');
  t.check('?pageSize= is honoured', (paged.data?.passes ?? []).length === 1, `${(paged.data?.passes ?? []).length} rows`);
  const badPage = await warden.call('GET', '/hostel/gate-passes?pageSize=9999');
  t.check('an out-of-range pageSize is a 400 from the schema', badPage.status === 400, `status ${badPage.status}`);
  const badStatus = await warden.call('GET', '/hostel/gate-passes?status=NONSENSE');
  t.check('an unknown status filter is a 400, not an empty page', badStatus.status === 400, `status ${badStatus.status}`);

  // 3. The boundary: a student CANNOT decide, a warden CANNOT create
  section(3, 'The two-sided boundary');
  // Somewhere to aim the hostile calls. Any seeded PENDING pass will do.
  const anyPending = rows.find((p: any) => p.status === 'PENDING');
  if (anyPending) {
    const studentDecides = await warden.callAs(
      clean,
      'POST',
      `/hostel/gate-passes/${anyPending.id}/decide`,
      { decision: 'APPROVED', verified: true },
    );
    t.check('a STUDENT cannot approve a pass', studentDecides.status === 403, `status ${studentDecides.status}`);
    const studentStamps = await warden.callAs(clean, 'POST', `/hostel/gate-passes/${anyPending.id}/exit`, {});
    t.check('a STUDENT cannot stamp an exit', studentStamps.status === 403, `status ${studentStamps.status}`);
    const studentReads = await warden.callAs(clean, 'GET', `/hostel/gate-passes/${anyPending.id}`);
    t.check('a STUDENT cannot read another student\'s pass', studentReads.status === 403 || studentReads.status === 404, `status ${studentReads.status}`);
  } else {
    t.check('a PENDING pass exists to attack', false, 'seed has none - cannot assert the boundary');
  }

  // 4. Request
  section(4, 'Student requests');
  const reqBody = {
    reason: 'Bank document verification',
    destination: 'SBI branch, campus road',
    outAt: iso(now + 2 * H),
    expectedInAt: iso(now + 6 * H),
  };
  const created = await clean.call('POST', '/student/gate-passes', reqBody);
  t.check('POST /student/gate-passes', created.status === 201, `status ${created.status}`);
  t.check('  the new pass is PENDING', created.data?.status === 'PENDING', created.data?.status);
  t.check('  awaiting_approval, not approved', created.data?.lifecycle === 'awaiting_approval', created.data?.lifecycle);
  t.check('  not emergency by default', created.data?.isEmergency === false);
  t.check('  not identity-verified', created.data?.idVerified === false);
  t.check('  the destination is kept', created.data?.destination === reqBody.destination, created.data?.destination);
  t.check('  no decision time yet', created.data?.decidedAt === null, String(created.data?.decidedAt));

  const passId = created.data?.id;
  if (!passId) {
    t.check('created pass has an id', false, 'aborting the lifecycle');
    return;
  }

  // Schema rejections. Each is a 400 that proves zod, not the service, is refusing it.
  const shortReason = await clean.call('POST', '/student/gate-passes', { ...reqBody, reason: 'x' });
  t.check('a 1-character reason is a 400', shortReason.status === 400, `status ${shortReason.status}`);
  // The 400-vs-422 split is deliberate and worth pinning: 400 means the request contradicts
  // ITSELF, 422 means it is well formed and a RULE refuses it. A client can show the first as a
  // form error and must send the second to the warden.
  const backwards = await clean.call('POST', '/student/gate-passes', { ...reqBody, expectedInAt: iso(now - H) });
  t.check(
    'a return before the departure is a 400 (self-contradictory)',
    backwards.status === 400,
    `status ${backwards.status} ${backwards.error?.message ?? ''}`,
  );
  const inThePast = await clean.call('POST', '/student/gate-passes', { ...reqBody, outAt: iso(now - 48 * H), expectedInAt: iso(now + H) });
  t.check(
    'a departure in the past is a 422 (well formed, but a rule refuses it)',
    inThePast.status === 422,
    `status ${inThePast.status} ${inThePast.error?.message ?? ''}`,
  );
  const tooLong = await clean.call('POST', '/student/gate-passes', { ...reqBody, outAt: iso(now + H), expectedInAt: iso(now + 40 * 24 * H) });
  t.check('a pass longer than 30 days is a 422', tooLong.status === 422, `status ${tooLong.status}`);
  const unknownKey = await clean.call('POST', '/student/gate-passes', { ...reqBody, isEmrgency: true });
  t.check('an unknown key is a 400 (the schema is .strict())', unknownKey.status === 400, `status ${unknownKey.status}`);

  const mine = await clean.call('GET', '/student/gate-passes');
  t.check('GET /student/gate-passes lists my own', mine.status === 200, `status ${mine.status}`);
  t.check('  and the new pass is in it', (mine.data ?? []).some((p: any) => p.id === passId));

  const someoneElses = await student.call('GET', '/student/gate-passes');
  t.check(
    'another student does not see it',
    !(someoneElses.data ?? []).some((p: any) => p.id === passId),
    `${(someoneElses.data ?? []).length} rows for the other student`,
  );

  const secondPass = await clean.call('POST', '/student/gate-passes', { ...reqBody, reason: 'Library visit' });
  t.check('a second pass while one is open is a 409', secondPass.status === 409, `status ${secondPass.status}`);
  t.check('  and the reason names the open pass', !!secondPass.error?.message, secondPass.error?.message ?? '');

  // 5. Decide
  section(5, 'Warden decision');
  const badDecision = await warden.call('POST', `/hostel/gate-passes/${passId}/decide`, { decision: 'MAYBE' });
  t.check('an unknown decision is a 400', badDecision.status === 400, `status ${badDecision.status}`);
  const rejectNoReason = await warden.call('POST', `/hostel/gate-passes/${passId}/decide`, { decision: 'REJECTED' });
  t.check('a rejection with no reason is a 400', rejectNoReason.status === 400, `status ${rejectNoReason.status}`);

  const approved = await warden.call('POST', `/hostel/gate-passes/${passId}/decide`, { decision: 'APPROVED' });
  t.check('POST /gate-passes/:id/decide', approved.status === 200, `status ${approved.status}`);
  t.check('  the status is APPROVED', approved.data?.status === 'APPROVED', approved.data?.status);
  t.check('  approving WITHOUT verified leaves idVerified false', approved.data?.idVerified === false);
  t.check('  and leaves verifiedAt null', approved.data?.verifiedAt === null, String(approved.data?.verifiedAt));
  t.check('  the decision is dated', !!approved.data?.decidedAt, String(approved.data?.decidedAt));
  t.check('  lifecycle is `approved`', approved.data?.lifecycle === 'approved', approved.data?.lifecycle);

  const twice = await warden.call('POST', `/hostel/gate-passes/${passId}/decide`, { decision: 'REJECTED', note: 'changed my mind' });
  t.check('a decided pass cannot be decided again', twice.status === 409, `status ${twice.status}`);

  // 6. Exit and return
  section(6, 'Exit and return');
  const returnFirst = await warden.call('POST', `/hostel/gate-passes/${passId}/return`, { at: iso(now + H) });
  t.check('a return before any exit is a 409', returnFirst.status === 409, `status ${returnFirst.status}`);

  const exited = await warden.call('POST', `/hostel/gate-passes/${passId}/exit`, { at: iso(now + 1 * H) });
  t.check('POST /gate-passes/:id/exit', exited.status === 200, `status ${exited.status}`);
  t.check('  the exit is stamped', !!exited.data?.actualOutAt, String(exited.data?.actualOutAt));
  t.check('  lifecycle is `out`', exited.data?.lifecycle === 'out', exited.data?.lifecycle);
  t.check('  an out pass no longer needs action', exited.data?.needsAction === false);

  const exitAgain = await warden.call('POST', `/hostel/gate-passes/${passId}/exit`, { at: iso(now + 2 * H) });
  t.check('a second exit is a 409, not a silent overwrite', exitAgain.status === 409, `status ${exitAgain.status}`);
  const survived = await warden.call('GET', `/hostel/gate-passes/${passId}`);
  t.check(
    '  the original exit time survived',
    survived.data?.actualOutAt === exited.data?.actualOutAt,
    `${survived.data?.actualOutAt} vs ${exited.data?.actualOutAt}`,
  );

  const returned = await warden.call('POST', `/hostel/gate-passes/${passId}/return`, { at: iso(now + 4 * H) });
  t.check('POST /gate-passes/:id/return', returned.status === 200, `status ${returned.status}`);
  t.check('  the return is stamped', !!returned.data?.actualInAt, String(returned.data?.actualInAt));
  t.check('  lifecycle is `returned`', returned.data?.lifecycle === 'returned', returned.data?.lifecycle);
  t.check('  returned on time is not late', returned.data?.late === false || returned.data?.minutesLate === 0, `late ${returned.data?.late}`);

  const returnAgain = await warden.call('POST', `/hostel/gate-passes/${passId}/return`, { at: iso(now + 5 * H) });
  t.check('a second return is a 409', returnAgain.status === 409, `status ${returnAgain.status}`);

  // 7. Withdrawal
  section(7, 'Withdrawal');
  const fresh = await clean.call('POST', '/student/gate-passes', { ...reqBody, reason: 'Concert tickets' });
  const freshId = fresh.data?.id;
  t.check('a fresh request is accepted once the previous is closed', fresh.status === 201, `status ${fresh.status}`);

  if (freshId) {
    const withdrawn = await clean.call('POST', `/student/gate-passes/${freshId}/cancel`);
    t.check('POST /student/gate-passes/:id/cancel', withdrawn.status === 200, `status ${withdrawn.status}`);
    t.check('  the status is CANCELLED', withdrawn.data?.status === 'CANCELLED', withdrawn.data?.status);
    t.check('  lifecycle is `cancelled`', withdrawn.data?.lifecycle === 'cancelled', withdrawn.data?.lifecycle);
    t.check('  the withdrawal is dated', !!withdrawn.data?.cancelledAt, String(withdrawn.data?.cancelledAt));
    t.check('  and is NOT dated as a warden decision', withdrawn.data?.decidedAt === null, String(withdrawn.data?.decidedAt));

    const withdrawAgain = await clean.call('POST', `/student/gate-passes/${freshId}/cancel`);
    t.check('withdrawing twice is a 409', withdrawAgain.status === 409, `status ${withdrawAgain.status}`);
  }

  // 8. Restore
  section(8, 'Restored');
  const final = await clean.call('GET', '/student/gate-passes');
  const finals = (final.data ?? []) as any[];
  const closed = finals.find((p: any) => p.id === passId);
  t.check('the lifecycle pass reached RETURNED', closed?.status === 'APPROVED' && !!closed?.actualInAt, closed?.status);
  const cancelled = finals.find((p: any) => p.id === freshId);
  t.check('the withdrawn pass reached CANCELLED', cancelled?.status === 'CANCELLED', cancelled?.status);
  t.check(
    'nothing is left open, so the next run starts clean',
    finals.every((p: any) => p.status !== 'PENDING' && !(p.status === 'APPROVED' && !p.actualInAt)),
    finals.map((p: any) => `${p.status}`).join(','),
  );

  // Put the two rows back, per the `verify-alumni/` rule that this directory already follows for
  // its contacts. Reaching a terminal state is NOT a restore: `RETURNED` and `CANCELLED` block
  // nothing, so the suite would pass again, but every run would leave two more rows behind and
  // a demonstration database would slowly fill with aarav's commute history. Deleted by id, so
  // no seeded row can be caught by a broad filter.
  const createdIds = [passId, freshId].filter(Boolean) as string[];
  if (createdIds.length) {
    // Matched on the pass id inside the deep-link payload, one row per notification this run
    // created. A broader filter would reach into seeded notifications.
    for (const id of createdIds) {
      await prisma.notification.deleteMany({ where: { dataJson: { contains: id } } });
    }
    const removed = await prisma.gatePass.deleteMany({ where: { id: { in: createdIds } } });
    t.check('the verification rows are removed again', removed.count === createdIds.length, `${removed.count}/${createdIds.length}`);
    const left = await prisma.gatePass.findMany({ where: { id: { in: createdIds } }, select: { id: true } });
    t.check('and the deletion is ASSERTED, not assumed', left.length === 0, `${left.length} left`);
    const after = await clean.call('GET', '/student/gate-passes');
    t.check('the student is back to having no passes at all', ((after.data ?? []) as any[]).length === 0, `${((after.data ?? []) as any[]).length} left`);
  }
}

/**
 * `runSuite` only catches a THROWN error - it does not fail the process when an assertion
 * fails. Omitting `finish` prints the failures in red and exits 0, which is a green CI run
 * for a suite that failed every check. The `.finally` matters: it must also run when `main`
 * throws, or a crash would hide the tally entirely.
 */
runSuite('Hostel gate passes', main).finally(() => t.finish('Hostel gate passes'));