/**
 * Suite: the hostel notification stack over HTTP.
 * Docs: 08-hostel.md §3.8
 *
 * WHY THIS ALONGSIDE `check-hostel-notifications.ts`
 * --------------------------------------------------
 * That file proves the rules: the catalogue is complete, every type is registered, a mute suppresses
 * and an emergency ignores it, late return is derived from the right facts. It cannot prove that a
 * ROUTE is mounted, that a zod schema rejects the right shapes, that route declaration ORDER is
 * right, or what status code a client actually receives. Those are transport facts and this is
 * where they live.
 *
 * THE FOUR THINGS THIS FILE IS REALLY ABOUT
 * ------------------------------------------
 *   1. THE THREE-SIDED BOUNDARY. The warden reads the HOSTEL inbox; the RESIDENT reads the shared
 *      student inbox, which merges finance and hostel; the accounts desk reads the finance inbox
 *      and must NOT grow hostel chips. Asserted from every direction.
 *   2. THE ENVELOPE. Every response in the platform is `{ data: … }` and the client unwraps
 *      unconditionally. An unwrapped response hands the screen `undefined` — which is exactly what
 *      happened to the alumni notifications router.
 *   3. ROUTE ORDER. `/notifications/catalogue` and `/notifications/late-returns/sweep` are literal
 *      paths under a router that also has `/notifications/:id/read`. Declared in the wrong order, a
 *      perfectly valid request 404s. Each is asserted by name.
 *   4. THE 400 / 422 DISTINCTION. 400 means the body contradicts ITSELF (an unknown key, a category
 *      that is not composable); 422 means it is well formed and a RULE refuses it. A client can show
 *      the first as a form error; the second has to go to a human.
 *
 * CREATES ITS OWN NOTIFICATIONS AND DELETES THEM
 * ------------------------------------------------
 * Everything is filed under a per-run marker and removed in a `finally`, including the Broadcast
 * rows, which are the record of what was sent.
 */
import {
  Tally,
  banner,
  loginAs,
  prisma,
  requireServer,
  runSuite,
  section,
  stamp,
} from '../alumni-harness.js';

const t = new Tally();

const WARDEN_EMAIL = 'hostel@learnix.dev';
const STUDENT_EMAIL = 'student@learnix.dev';
const ACCOUNTS_EMAIL = 'accounts@learnix.dev';

async function main() {
  banner('Hostel notifications over HTTP');
  await requireServer();

  const warden = await loginAs(WARDEN_EMAIL);
  const student = await loginAs(STUDENT_EMAIL);
  const accounts = await loginAs(ACCOUNTS_EMAIL);

  const inst = (await prisma.user.findFirst({ where: { email: WARDEN_EMAIL }, select: { institutionId: true } }))!.institutionId;
  const mark = `VERIFY-HN-${stamp()}`;
  const broadcasts: string[] = [];

  try {
    // ═══ 1. The catalogue ═════════════════════════════════════════════════════════════════════
    section(1, 'The catalogue is served, and it is the eight categories');

    const cat = await warden.call('GET', '/hostel/notifications/catalogue');
    t.check('GET /notifications/catalogue', cat.status === 200, `status ${cat.status}`);
    t.check('...and the envelope is right', cat.data !== undefined, `top-level keys: ${Object.keys(cat as any).join(',')}`);
    t.check('...there are eight categories', cat.data?.categories?.length === 8, `${cat.data?.categories?.length}`);
    t.check('...each with a label, blurb, icon and colour',
      (cat.data?.categories ?? []).every((c: any) => c.label && c.blurb && c.icon && /^#[0-9a-f]{6}$/i.test(c.color)));
    t.check('...and EMERGENCY is among them',
      (cat.data?.categories ?? []).some((c: any) => c.id === 'EMERGENCY'));
    t.check('...and exactly three are composable',
      cat.data?.composable?.length === 3, JSON.stringify(cat.data?.composable));

    // The id list is unique — a duplicate id would make two chips share a filter.
    const ids = (cat.data?.categories ?? []).map((c: any) => c.id);
    t.check('...the category ids are unique', new Set(ids).size === ids.length);

    // ═══ 2. The three-sided boundary ═══════════════════════════════════════════════════════════
    section(2, 'The warden, the resident and the accounts officer each see their own');

    const wardenInbox = await warden.call('GET', '/hostel/notifications');
    t.check('the WARDEN reads the hostel inbox', wardenInbox.status === 200, `status ${wardenInbox.status}`);
    t.check('...and it is enveloped', wardenInbox.data !== undefined, `top-level keys: ${Object.keys(wardenInbox as any).join(',')}`);
    t.check('...with rows, counts and pagination',
      Array.isArray(wardenInbox.data?.notifications) && Array.isArray(wardenInbox.data?.counts) && Boolean(wardenInbox.data?.pagination));
    t.check('...every row carries a label, icon and colour',
      (wardenInbox.data?.notifications ?? []).every((n: any) => n.typeLabel && n.icon && /^#[0-9a-f]{6}$/i.test(n.color)));
    t.check('...and every row is a HOSTEL type',
      (wardenInbox.data?.notifications ?? []).every((n: any) => String(n.type).startsWith('HOSTEL')));

    const studentInbox = await student.call('GET', '/student/notifications');
    t.check('the RESIDENT reads the shared student inbox', studentInbox.status === 200, `status ${studentInbox.status}`);
    t.check('...and it is enveloped', studentInbox.data !== undefined);
    t.check('...with the same row shape',
      (studentInbox.data?.notifications ?? []).every((n: any) => n.typeLabel && n.icon && n.color));
    t.check('...and a HOSTEL row is visible to the resident it was written for',
      (studentInbox.data?.notifications ?? []).some((n: any) => String(n.type).startsWith('HOSTEL')));

    // The accounts desk must NOT grow the hostel's chips. The registry is what the chip list comes
    // from, so a finance inbox that merged the hostel's would show eight extra filters.
    // The accounts notifications router is mounted at `/api/v1/accounts/notifications`.
    const accountsCatalogue = await accounts.call('GET', '/accounts/notifications/catalogue');
    t.check('the ACCOUNTS desk still has its own catalogue', accountsCatalogue.status === 200, `status ${accountsCatalogue.status}`);
    t.check('...and it has NOT gained the hostels eight categories',
      (accountsCatalogue.data?.categories ?? []).every((c: any) => !String(c.id).startsWith('HOSTEL')),
      `${(accountsCatalogue.data?.categories ?? []).length} categories`);

    // The hostel inbox is not reachable by a student or by the accounts desk.
    const studentOnHostel = await student.call('GET', '/hostel/notifications');
    t.check('a STUDENT cannot read the warden inbox', studentOnHostel.status === 403, `status ${studentOnHostel.status}`);
    const accountsOnHostel = await accounts.call('GET', '/hostel/notifications');
    t.check('an ACCOUNTS officer cannot read the warden inbox', accountsOnHostel.status === 403, `status ${accountsOnHostel.status}`);

    // ═══ 3. Route order ═════════════════════════════════════════════════════════════════════════
    section(3, 'The literal paths are reachable');

    // `/notifications/catalogue` sits beside `/notifications/:id/read`, so a wrong declaration order
    // would capture "catalogue" as an id and answer 404 about a missing notification.
    const catalogueAgain = await warden.call('GET', '/hostel/notifications/catalogue');
    t.check('GET /notifications/catalogue is not captured by /:id', catalogueAgain.status === 200, `status ${catalogueAgain.status}`);

    const sweep = await warden.call('POST', '/hostel/notifications/late-returns/sweep');
    t.check('POST /notifications/late-returns/sweep', sweep.status === 200, `status ${sweep.status}`);
    t.check('...and it reports what it considered', typeof sweep.data?.passes === 'number', `${sweep.data?.passes} pass(es)`);

    // ═══ 4. Filtering ═══════════════════════════════════════════════════════════════════════════
    section(4, 'The filters are applied on the server');

    const filtered = await warden.call('GET', '/hostel/notifications?category=COMPLAINT');
    t.check('a category filter is applied', filtered.status === 200, `status ${filtered.status}`);
    t.check('...and every row is in that category',
      (filtered.data?.notifications ?? []).every((n: any) => n.category === 'COMPLAINT'),
      `${filtered.data?.notifications?.length} rows`);

    const unknown = await warden.call('GET', '/hostel/notifications?category=NOT_A_CATEGORY');
    t.check('an unknown category is an empty list, not an error', unknown.status === 200, `status ${unknown.status}`);
    t.check('...and it is empty', (unknown.data?.notifications ?? []).length === 0);

    const paged = await warden.call('GET', '/hostel/notifications?pageSize=1');
    t.check('pageSize is honoured', (paged.data?.notifications ?? []).length <= 1, `${paged.data?.notifications?.length} rows`);

    // ═══ 5. Composing ═══════════════════════════════════════════════════════════════════════════
    section(5, 'Composing, and what may not be composed');

    const composed = await warden.call('POST', '/hostel/notifications/broadcasts', {
      category: 'ANNOUNCEMENT',
      audience: { kind: 'ALL_RESIDENTS' },
      title: `${mark} notice`,
      body: `${mark} body text`,
    });
    t.check('the WARDEN can compose an announcement', composed.status === 201, `status ${composed.status}`);
    t.check('...and it reports the recipient count', typeof composed.data?.recipients === 'number', `${composed.data?.recipients} recipient(s)`);
    t.check('...and the type it was written as', composed.data?.type === 'HOSTEL_ANNOUNCEMENT', composed.data?.type);
    if (composed.data?.id) broadcasts.push(composed.data.id);

    // A category the system reports, not the warden.
    const forged = await warden.call('POST', '/hostel/notifications/broadcasts', {
      category: 'GATE_PASS',
      audience: { kind: 'ALL_RESIDENTS' },
      title: `${mark} forged`,
      body: `${mark} body text`,
    });
    t.check('a GATE_PASS cannot be composed', forged.status === 400, `status ${forged.status}`);
    // The zod enum's allowed values ride in the DETAILS, not the message — the message is the
    // generic "Validation failed" so a client can show one thing for every schema rejection.
    t.check('...and the error names the allowed values',
      JSON.stringify(forged.error?.details ?? '').includes('ANNOUNCEMENT'),
      JSON.stringify(forged.error?.details ?? '').slice(0, 110));

    // The old shape: a bare audience string. The schema is strict, so it is refused.
    const legacyShape = await warden.call('POST', '/hostel/notifications/broadcasts', {
      category: 'ANNOUNCEMENT',
      audience: 'ALL_RESIDENTS',
      title: `${mark} legacy`,
      body: `${mark} body text`,
    } as any);
    t.check('a bare audience STRING is refused', legacyShape.status === 400, `status ${legacyShape.status}`);

    const unknownKey = await warden.call('POST', '/hostel/notifications/broadcasts', {
      category: 'ANNOUNCEMENT',
      audience: { kind: 'ALL_RESIDENTS' },
      title: `${mark} junk`,
      body: `${mark} body text`,
      force: true,
    } as any);
    t.check('an unknown key in the body is refused', unknownKey.status === 400, `status ${unknownKey.status}`);

    const tooShort = await warden.call('POST', '/hostel/notifications/broadcasts', {
      category: 'ANNOUNCEMENT',
      audience: { kind: 'ALL_RESIDENTS' },
      title: 'x',
      body: 'y',
    } as any);
    t.check('a one-character title is refused', tooShort.status === 400, `status ${tooShort.status}`);

    // The composition itself is refused for anyone who is not the hostel office.
    const studentCompose = await student.call('POST', '/hostel/notifications/broadcasts', {
      category: 'ANNOUNCEMENT',
      audience: { kind: 'ALL_RESIDENTS' },
      title: `${mark} from a student`,
      body: `${mark} body text`,
    });
    t.check('a STUDENT cannot compose a notice', studentCompose.status === 403, `status ${studentCompose.status}`);

    // An emergency is typed and flagged differently.
    const emergency = await warden.call('POST', '/hostel/notifications/broadcasts', {
      category: 'EMERGENCY',
      audience: { kind: 'ALL_RESIDENTS' },
      title: `${mark} emergency`,
      body: `${mark} body text`,
    });
    t.check('the WARDEN can compose an emergency', emergency.status === 201, `status ${emergency.status}`);
    t.check('...and it is typed as one', emergency.data?.type === 'HOSTEL_EMERGENCY', emergency.data?.type);
    t.check('...and it is flagged important', emergency.data?.important === true);
    if (emergency.data?.id) broadcasts.push(emergency.data.id);

    // ═══ 6. The resident sees it ═══════════════════════════════════════════════════════════════
    section(6, 'A resident sees what was composed for them');

    const residentAfter = await student.call('GET', '/student/notifications?pageSize=100');
    const composedRow = (residentAfter.data?.notifications ?? []).find((n: any) => n.title === `${mark} notice`);
    t.check('the composed notice reached the resident', Boolean(composedRow), composedRow ? 'found' : 'not found');
    t.check('...labelled as a hostel announcement', composedRow?.category === 'ANNOUNCEMENT', composedRow?.categoryLabel);
    t.check('...with the right chrome', composedRow?.icon === 'megaphone-outline', composedRow?.icon);

    const emergencyRow = (residentAfter.data?.notifications ?? []).find((n: any) => n.title === `${mark} emergency`);
    t.check('the emergency reached the resident too', Boolean(emergencyRow), emergencyRow ? 'found' : 'not found');
    t.check('...and it is flagged important', emergencyRow?.important === true);

    // The resident can filter to the hostel categories.
    const residentComplaints = await student.call('GET', '/student/notifications?category=COMPLAINT');
    t.check('the resident can filter by category', residentComplaints.status === 200, `status ${residentComplaints.status}`);
    t.check('...and every row is a complaint',
      (residentComplaints.data?.notifications ?? []).every((n: any) => n.category === 'COMPLAINT'));

    // ═══ 7. Read state ═════════════════════════════════════════════════════════════════════════
    section(7, 'Read state is scoped to the recipient');

    const firstRow = (wardenInbox.data?.notifications ?? [])[0];
    if (firstRow) {
      const read = await warden.call('PATCH', `/hostel/notifications/${firstRow.id}/read`, { read: true });
      t.check('a notification can be marked read', read.status === 200, `status ${read.status}`);

      const studentReads = await student.call('PATCH', `/hostel/notifications/${firstRow.id}/read`, { read: true });
      t.check("a STUDENT cannot mark the WARDEN's notification read", studentReads.status === 403 || studentReads.status === 404, `status ${studentReads.status}`);

      const readAll = await warden.call('POST', '/hostel/notifications/read-all');
      t.check('POST /notifications/read-all', readAll.status === 200, `status ${readAll.status}`);
      t.check('...and it reports how many', typeof readAll.data?.updated === 'number', `${readAll.data?.updated} marked`);

      const afterAll = await warden.call('GET', '/hostel/notifications');
      t.check('...and the unread count is now zero', afterAll.data?.unread === 0, `unread=${afterAll.data?.unread}`);
    }

    // ═══ 8. Tenant scoping ═════════════════════════════════════════════════════════════════════
    section(8, 'Nothing crosses an institution boundary');

    const otherInst = await prisma.institution.findFirst({ where: { NOT: { id: inst } }, select: { id: true } });
    if (otherInst) {
      const foreignRows = await prisma.notification.count({
        where: { institutionId: otherInst.id, sourceModule: 'hostel', type: { startsWith: 'HOSTEL' } },
      });
      t.check('the other institution holds no rows from this suite', foreignRows === 0, `${foreignRows} row(s)`);
    }

    // ═══ 9. The late-return sweep ══════════════════════════════════════════════════════════════
    section(9, 'The late-return sweep is on demand and does not double the alerts');

    const beforeSweep = await prisma.notification.count({ where: { type: 'HOSTEL_LATE_RETURN' } });
    await warden.call('POST', '/hostel/notifications/late-returns/sweep');
    const afterSweep = await prisma.notification.count({ where: { type: 'HOSTEL_LATE_RETURN' } });
    t.check('running it twice does not double the alerts', afterSweep === beforeSweep, `${beforeSweep} -> ${afterSweep}`);

    const studentSweep = await student.call('POST', '/hostel/notifications/late-returns/sweep');
    t.check('a STUDENT cannot run the sweep', studentSweep.status === 403, `status ${studentSweep.status}`);
  } finally {
    // Children before parents: notifications then broadcasts.
    await prisma.notification.deleteMany({ where: { title: { startsWith: mark } } });
    if (broadcasts.length) await prisma.broadcast.deleteMany({ where: { id: { in: broadcasts } } });
    const left = await prisma.notification.count({ where: { title: { startsWith: mark } } });
    t.check('the suite left nothing behind', left === 0, `${left} rows remain`);
  }

  t.finish('Hostel notifications HTTP');
}

runSuite('hostel-notifications', main);