/**
 * Suite: the resident directory and the resident profile, over HTTP.
 * Docs: 08-hostel.md §3.3
 *
 * Split from one 700-line file into `verify-hostel/rooms.ts` and this one, mirroring
 * `verify-alumni/`. The original reason was size, but the real reason is that the two halves
 * want different kinds of fixture: this suite writes CONTACTS and puts them back, while the
 * rooms suite allocates, transfers, withdraws beds and restores occupancy. Interleaving them
 * in one file meant a failure halfway through could leave the hostel in a state the next
 * section's assertions could not interpret.
 *
 * Requires the server on :4000. It exits with a "cannot reach" message rather than a
 * `fetch failed` stack trace if the server is not up.
 *
 * WHY THIS ALONGSIDE `check-hostel-residents.ts`
 * ---------------------------------------------
 * The DB suite proves the queries are scoped and the invariants hold. It cannot prove the
 * ROUTES are wired, that the SCHEMAS accept and reject the right shapes, or that the status
 * codes are what a client receives. Those are transport facts, and this file is where they live.
 *
 * WHAT IS ASSERTED AND WHY IT IS NOT OBVIOUS
 * ------------------------------------------
 *   - `/residents/facets` is declared BEFORE `/residents/:id`. If the order is ever flipped,
 *     `facets` is swallowed by the `:id` route and returns a 404 on a valid request.
 *   - `?feeStatus=CLEAR` and `?feeStatus=DUE` partition the directory: their totals sum to the
 *     unfiltered total. Stronger than asserting either one, because it fails if a filter
 *     silently matches nothing.
 *   - `?q=` matching a roll number is the regression this feature fixed. The old list query did
 *     not select the column, so no search term could match it.
 *   - A 400 on a contact with no `relation`, and on an unknown `kind`, proves the zod schema
 *     and the service agree rather than the service catching its own typo.
 *   - An unknown contact id on a valid resident is 404, NOT a silent create.
 *
 * MUTATES SEEDED ROWS AND PUTS THEM BACK
 * --------------------------------------
 * Contact create/update/delete cannot be exercised over HTTP without writing. This creates its
 * OWN contacts on a seeded resident and deletes exactly those, then ASSERTS the deletion — the
 * alumni suites' rule, and the reason this file can be re-run without drifting the seed.
 */
import {
  Tally,
  banner,
  loginAs,
  requireServer,
  runSuite,
  section,
} from '../alumni-harness.js';

const t = new Tally();

const WARDEN_EMAIL = 'hostel@learnix.dev';
/** A STUDENT, to prove the role gate refuses the resident area. */
const STUDENT_EMAIL = 'student@learnix.dev';

async function main() {
  banner('Hostel — residents');
  await requireServer();

  // ── Identities ───────────────────────────────────────────────────────────────
  const warden = await loginAs(WARDEN_EMAIL);
  t.check('auth/login (chief warden)', !!warden.token, warden.email);
  if (!warden.token) return;
  t.check('  holds HOSTEL', warden.roles.includes('HOSTEL'), warden.roles.join(', ') || 'none');

  const student = await loginAs(STUDENT_EMAIL);
  t.check('auth/login (student, for the role gate)', !!student.token, student.email);

  // ── 1. Role gate ─────────────────────────────────────────────────────────────
  // One assertion, but the one most likely to be asserted under the wrong identity. The
  // harness takes a token per Actor so this cannot run under the warden's by accident.
  section(1, 'Access control');
  const denied = await warden.callAs(student, 'GET', '/hostel/residents');
  t.check('a STUDENT is refused the resident directory', denied.status === 403, `status ${denied.status}`);
  const noAuth = await warden.call('GET', '/hostel/residents', undefined, '');
  t.check('an unauthenticated read is refused', noAuth.status === 401, `status ${noAuth.status}`);

  // ── 2. Directory ─────────────────────────────────────────────────────────────
  section(2, 'Resident directory');
  const all = await warden.call('GET', '/hostel/residents');
  t.check('GET /residents', all.status === 200, `status ${all.status}`);
  const rows = all.data?.residents ?? [];
  t.check('  residents[] populated', rows.length > 0, `${rows.length} rows`);
  t.check('  pagination object present', !!all.data?.pagination?.total, `total ${all.data?.pagination?.total}`);
  t.check(
    '  pagination uses `totalPages`, matching alumniApi.directory',
    typeof all.data?.pagination?.totalPages === 'number',
    `totalPages ${all.data?.pagination?.totalPages}`,
  );
  t.check('  every row carries a roll number', rows.every((r: any) => !!r.rollNo));

  const total = all.data?.pagination?.total ?? 0;

  // ── 3. Search ────────────────────────────────────────────────────────────────
  // Roll number is the field `POST /allocations` asks a warden to type. The pre-fix query
  // did not select it, so this assertion is the regression test for the actual defect.
  section(3, 'Search');
  const sample = rows[0];
  const byRoll = await warden.call(
    'GET',
    `/hostel/residents?q=${encodeURIComponent(sample.rollNo)}`,
  );
  t.check('  ?q= matches on roll number', (byRoll.data?.pagination?.total ?? 0) >= 1, `q=${sample.rollNo}`);
  t.check(
    '  the matched row is the one asked for',
    (byRoll.data?.residents ?? []).some((r: any) => r.rollNo === sample.rollNo),
  );

  const byName = await warden.call('GET', `/hostel/residents?q=${encodeURIComponent(sample.name.split(' ')[0])}`);
  t.check('  ?q= matches on name', (byName.data?.pagination?.total ?? 0) >= 1, `q=${sample.name.split(' ')[0]}`);

  const byRoom = await warden.call('GET', `/hostel/residents?q=${encodeURIComponent(sample.room)}`);
  t.check('  ?q= matches on room number', (byRoom.data?.pagination?.total ?? 0) >= 1, `q=${sample.room}`);

  const nonsense = await warden.call('GET', '/hostel/residents?q=zzzznotaresident');
  t.check('  a term matching nothing returns an empty page, not an error', nonsense.status === 200 && (nonsense.data?.residents ?? []).length === 0);

  // ── 4. Filters ───────────────────────────────────────────────────────────────
  section(4, 'Filters');
  const facets = await warden.call('GET', '/hostel/residents/facets');
  // Route ORDER matters: with `/residents/:id` declared first this is a 404.
  t.check('GET /residents/facets resolves as a static route', facets.status === 200, `status ${facets.status}`);
  t.check('  blocks[] present', Array.isArray(facets.data?.blocks), `${facets.data?.blocks?.length} blocks`);
  t.check(
    '  every block carries a count',
    (facets.data?.blocks ?? []).every((b: any) => typeof b.count === 'number'),
  );
  t.check(
    '  block counts sum to the directory total',
    (facets.data?.blocks ?? []).reduce((n: number, b: any) => n + b.count, 0) === total,
    `${(facets.data?.blocks ?? []).reduce((n: number, b: any) => n + b.count, 0)} vs ${total}`,
  );

  const due = await warden.call('GET', '/hostel/residents?feeStatus=DUE');
  const clear = await warden.call('GET', '/hostel/residents?feeStatus=CLEAR');
  const dueTotal = due.data?.pagination?.total ?? 0;
  const clearTotal = clear.data?.pagination?.total ?? 0;
  t.check('  ?feeStatus=DUE accepted', due.status === 200, `status ${due.status}`);
  t.check('  ?feeStatus=CLEAR accepted', clear.status === 200, `status ${clear.status}`);
  t.check('  every DUE row has an outstanding amount', (due.data?.residents ?? []).every((r: any) => r.outstandingMinor > 0));
  t.check('  every CLEAR row has nothing outstanding', (clear.data?.residents ?? []).every((r: any) => r.outstandingMinor === 0));
  // Stronger than checking either filter alone: a filter that silently matched nothing
  // would still pass a one-sided assertion.
  t.check('  DUE + CLEAR partition the directory', dueTotal + clearTotal === total, `${dueTotal} + ${clearTotal} vs ${total}`);

  const firstBlock = facets.data?.blocks?.[0]?.name;
  if (firstBlock) {
    const byBlock = await warden.call('GET', `/hostel/residents?block=${encodeURIComponent(firstBlock)}`);
    t.check('  ?block= filters', byBlock.status === 200 && (byBlock.data?.pagination?.total ?? 0) > 0, `block=${firstBlock}`);
  }
  const ghostBlock = await warden.call('GET', '/hostel/residents?block=NoSuchBlock');
  t.check('  an unknown block yields an empty page, not an error', ghostBlock.status === 200 && (ghostBlock.data?.pagination?.total ?? 0) === 0);

  const badFilter = await warden.call('GET', '/hostel/residents?feeStatus=MAYBE');
  t.check('  an unrecognised ?feeStatus is a 400', badFilter.status === 400, `status ${badFilter.status}`);

  // ── 5. Paging ────────────────────────────────────────────────────────────────
  section(5, 'Paging');
  const p1 = await warden.call('GET', '/hostel/residents?page=1&pageSize=1');
  t.check('  ?pageSize is honoured', (p1.data?.residents ?? []).length === 1, `${(p1.data?.residents ?? []).length} row`);
  const p2 = await warden.call('GET', '/hostel/residents?page=2&pageSize=1');
  t.check(
    '  page 2 returns a different row',
    p1.data?.residents?.[0]?.allocationId !== p2.data?.residents?.[0]?.allocationId,
  );
  // An out-of-range `pageSize` is REJECTED by the zod schema, not clamped. The service also has
  // a `Math.min(MAX_PAGE_SIZE, …)` clamp, but that only applies to values the schema already
  // accepted — defence in depth for any caller that reaches the service without the route. This
  // assertion is on the STATUS, not on a row count: an earlier version of it checked
  // `rows <= 100`, which passed vacuously with 0 rows because a 400 also has no rows.
  const huge = await warden.call('GET', '/hostel/residents?pageSize=100000');
  t.check('  an out-of-range ?pageSize is a 400', huge.status === 400, `status ${huge.status}`);
  const atMax = await warden.call('GET', '/hostel/residents?pageSize=100');
  t.check('  ?pageSize=100 is accepted', atMax.status === 200, `status ${atMax.status}`);
  t.check('  and returns the whole directory', (atMax.data?.residents ?? []).length === (all.data?.pagination?.total ?? 0), `${(atMax.data?.residents ?? []).length} vs ${all.data?.pagination?.total}`);

  // ── 6. Detail ────────────────────────────────────────────────────────────────
  section(6, 'Resident detail');
  const pid = sample.studentProfileId;
  const detail = await warden.call('GET', `/hostel/residents/${pid}`);
  t.check('GET /residents/:id', detail.status === 200, `status ${detail.status}`);
  t.check('  rollNo present', detail.data?.rollNo === sample.rollNo);
  t.check('  dues[] present', Array.isArray(detail.data?.dues));
  t.check('  complaints[] present', Array.isArray(detail.data?.complaints));
  t.check('  contacts[] present', Array.isArray(detail.data?.contacts));
  t.check('  history[] present', Array.isArray(detail.data?.history));
  t.check('  absence[] present', Array.isArray(detail.data?.absence));
  t.check(
    '  one fetch carries all six sections — no second round trip needed',
    ['dues', 'complaints', 'contacts', 'history', 'absence'].every((k) => k in (detail.data ?? {})),
  );

  const ghost = await warden.call('GET', '/hostel/residents/does-not-exist');
  t.check('  an unknown id is 404', ghost.status === 404, `status ${ghost.status}`);

  // ── 7. Sub-resources ─────────────────────────────────────────────────────────
  section(7, 'Sub-resources');
  const history = await warden.call('GET', `/hostel/residents/${pid}/history`);
  t.check('GET /residents/:id/history', history.status === 200, `status ${history.status}`);
  t.check('  at least the current stay', (history.data ?? []).length >= 1, `${(history.data ?? []).length} stays`);
  t.check('  current stay is first and flagged', history.data?.[0]?.isCurrent === true);
  t.check('  an open-ended stay reports no duration', history.data?.[0]?.nights === null);

  const absence = await warden.call('GET', `/hostel/residents/${pid}/absence`);
  t.check('GET /residents/:id/absence', absence.status === 200, `status ${absence.status}`);
  t.check(
    '  every record carries a computed state',
    (absence.data ?? []).every((a: any) => typeof a.isOut === 'boolean' && typeof a.isOverdue === 'boolean'),
  );

  const contacts = await warden.call('GET', `/hostel/residents/${pid}/contacts`);
  t.check('GET /residents/:id/contacts', contacts.status === 200, `status ${contacts.status}`);
  t.check('  contacts[] present', Array.isArray(contacts.data));
  const beforeCount = (contacts.data ?? []).length;

  // ── 8. Contact writes ────────────────────────────────────────────────────────
  section(8, 'Contact writes');
  const tag = `Htt${Date.now().toString().slice(-6)}`;
  const created = await warden.call('POST', `/hostel/residents/${pid}/contacts`, {
    kind: 'GUARDIAN',
    name: `${tag} Father`,
    relation: 'Father',
    phone: '+919000000021',
    alternatePhone: '+919000000022',
    email: `${tag.toLowerCase()}@test.local`,
    isPrimary: false,
  });
  t.check('POST /contacts creates', created.status === 201, `status ${created.status}`);
  t.check('  echoes the kind', created.data?.kind === 'GUARDIAN');
  t.check('  echoes the relation', created.data?.relation === 'Father');
  const cid = created.data?.id;
  t.check('  returns an id', !!cid);

  const updated = await warden.call('PUT', `/hostel/residents/${pid}/contacts/${cid}`, {
    kind: 'GUARDIAN',
    name: `${tag} Father Renamed`,
    relation: 'Father',
    phone: '+919000000023',
  });
  t.check('PUT /contacts/:contactId updates', updated.status === 200, `status ${updated.status}`);
  t.check('  the new name is persisted', updated.data?.name === `${tag} Father Renamed`);
  t.check('  omitted optionals clear rather than persist stale data', updated.data?.email === null);

  // ── 9. Validation ────────────────────────────────────────────────────────────
  section(9, 'Validation');
  const noRelation = await warden.call('POST', `/hostel/residents/${pid}/contacts`, {
    kind: 'GUARDIAN',
    name: `${tag} Nameless`,
    phone: '+919000000024',
  });
  t.check('  a contact with no relation is 400', noRelation.status === 400, `status ${noRelation.status}`);

  const badKind = await warden.call('POST', `/hostel/residents/${pid}/contacts`, {
    kind: 'SIBLING',
    name: `${tag} Odd`,
    relation: 'Sibling',
    phone: '+919000000024',
  });
  t.check('  an unknown kind is 400', badKind.status === 400, `status ${badKind.status}`);

  const unknownField = await warden.call('POST', `/hostel/residents/${pid}/contacts`, {
    kind: 'GUARDIAN',
    name: `${tag} Extra`,
    relation: 'Father',
    phone: '+919000000024',
    isVerified: true,
  });
  t.check('  an undeclared field is 400 (strict schema)', unknownField.status === 400, `status ${unknownField.status}`);

  // A stale id from another resident must 404, not silently re-parent that contact onto
  // this one. `POST` chooses create-vs-update on the presence of `id`, so this is the
  // branch that would otherwise turn into a silent duplicate.
  const ghostUpdate = await warden.call('PUT', `/hostel/residents/${pid}/contacts/not-a-real-id`, {
    kind: 'GUARDIAN',
    name: `${tag} Ghost`,
    relation: 'Father',
    phone: '+919000000025',
  });
  t.check('  an unknown contact id is 404, not a create', ghostUpdate.status === 404, `status ${ghostUpdate.status}`);

  // ── 10. Primary demotion ─────────────────────────────────────────────────────
  section(10, 'Primary contact');
  const primaries = (contacts.data ?? []).filter((c: any) => c.kind === 'GUARDIAN' && c.isPrimary);
  if (primaries.length === 1) {
    const promoted = await warden.call('PUT', `/hostel/residents/${pid}/contacts/${cid}`, {
      kind: 'GUARDIAN',
      name: `${tag} Father Renamed`,
      relation: 'Father',
      phone: '+919000000023',
      isPrimary: true,
    });
    t.check('  promoting a contact succeeds', promoted.status === 200, `status ${promoted.status}`);
    const after = await warden.call('GET', `/hostel/residents/${pid}/contacts`);
    const g = (after.data ?? []).filter((c: any) => c.kind === 'GUARDIAN');
    t.check('  the promoted contact is primary', g.find((c: any) => c.id === cid)?.isPrimary === true);
    t.check('  its sibling was demoted', g.find((c: any) => c.id === primaries[0].id)?.isPrimary === false);
    t.check('  exactly one guardian is primary', g.filter((c: any) => c.isPrimary).length === 1);
    t.check(
      '  guardian promotion left the emergency primary alone',
      (after.data ?? []).filter((c: any) => c.kind === 'EMERGENCY' && c.isPrimary).length <= 1,
    );

    // Put the original primary back, so the seed is left as it was found.
    const restored = await warden.call('PUT', `/hostel/residents/${pid}/contacts/${primaries[0].id}`, {
      kind: 'GUARDIAN',
      name: primaries[0].name,
      relation: primaries[0].relation,
      phone: primaries[0].phone,
      alternatePhone: primaries[0].alternatePhone ?? null,
      email: primaries[0].email ?? null,
      isPrimary: true,
    });
    t.check('  the original primary is restored', restored.status === 200, `status ${restored.status}`);
    const final = await warden.call('GET', `/hostel/residents/${pid}/contacts`);
    t.check(
      '  exactly one guardian is primary again',
      (final.data ?? []).filter((c: any) => c.kind === 'GUARDIAN' && c.isPrimary).length === 1,
    );
  } else {
    t.check('  seeded resident has exactly one guardian primary to test against', false, `found ${primaries.length}`);
  }

  // ── 11. Teardown, asserted ───────────────────────────────────────────────────
  // The alumni suites' rule: restore, then CHECK the restore. A suite that leaves seeded
  // rows changed cannot be re-run without drifting them a little further each time.
  section(11, 'Cleanup');
  if (cid) {
    const removed = await warden.call('DELETE', `/hostel/residents/${pid}/contacts/${cid}`);
    t.check('DELETE /contacts/:contactId', removed.status === 200, `status ${removed.status}`);
    const afterDelete = await warden.call('GET', `/hostel/residents/${pid}/contacts`);
    t.check(
      '  the contact is gone and the count is back to where it started',
      (afterDelete.data ?? []).length === beforeCount,
      `${(afterDelete.data ?? []).length} vs ${beforeCount}`,
    );
    t.check(
      '  it is gone by id, not merely off the end of the list',
      !(afterDelete.data ?? []).some((c: any) => c.id === cid),
    );
  }

  const doubleDelete = await warden.call('DELETE', `/hostel/residents/${pid}/contacts/${cid ?? 'x'}`);
  t.check('deleting it twice is 404, not a crash', doubleDelete.status === 404, `status ${doubleDelete.status}`);
}

/**
 * `t.finish` is what prints the tally AND sets the exit code.
 *
 * `runSuite` only catches a thrown error — it does not fail the process when an assertion
 * fails. A suite that forgets `finish` therefore prints its failures in red and then exits 0,
 * which means CI reports green for a suite that failed every check it made. The alumni suites
 * all call `finish`; these two did not, which is exactly the bug that would have let a broken
 * route pass unnoticed in an automated run.
 */
runSuite('Hostel residents', main).finally(() => t.finish('Hostel residents'));