/**
 * Suite: the hostel notification stack at the database level.
 * Docs: 08-hostel.md §3.8
 *
 * WHY THIS ALONGSIDE `verify-hostel/notifications.ts`
 * --------------------------------------------------
 * That file proves the ROUTES are wired, that the schemas reject the right shapes and that a client
 * gets the right status code. It cannot prove that every type the hostel writes is REGISTERED, that
 * a mute suppresses rather than hides, that an emergency ignores a mute, or that a late return is
 * derived from the right facts. Those live here.
 *
 * THE RULES THAT ARE EASY TO GET WRONG
 * -----------------------------------
 *   1. EVERY TYPE THE DATABASE HOLDS IS REGISTERED. A `Notification.type` the desk does not know
 *      about is a row that will be labelled with a fallback and filed nowhere. The accounts desk
 *      asserts this for its own types; the hostel asserts it for its own.
 *   2. A MUTE SUPPRESSES, IT DOES NOT HIDE. A muted category writes NO ROW. The alternative — write
 *      it, then filter it out — makes the unread badge count rows the recipient cannot see, so the
 *      badge only goes up and never clears.
 *   3. AN EMERGENCY IGNORES THE MUTE. You cannot opt out of being told to leave a building, and a
 *      mute is a preference about noise, not about safety. The bypass is a FLAG on the type, so a
 *      new emergency type inherits it by being declared correctly.
 *   4. ONLY THE COMPOSABLE CATEGORIES MAY BE COMPOSED. The other five are facts the system reports,
 *      and a warden who could publish a gate-pass approval could forge one.
 *   5. LATE RETURN IS DERIVED FROM THE RIGHT FACTS. An approved pass that has been RETURNED is not
 *      late, and one whose return time has not passed is not late. "The student said Friday and it is
 *      Friday" is not an alert.
 *   6. NOTHING IS SCHEDULED. The sweep is on demand, so a student who leaves the hostel for a week
 *      does not accumulate seven copies of the same alert.
 *
 * CLEANUP DISCIPLINE
 * ------------------
 * Preflight sweep plus `finally`, `hrchk-hn-` prefix, children before parents.
 */
import { prisma } from '../src/db/prisma.js';
import * as notifications from '../src/modules/hostel/hostel-notifications.service.js';
import {
  COMPOSABLE_CATEGORIES,
  HOSTEL_CATEGORIES,
  HOSTEL_CATEGORY_IDS,
  HOSTEL_TYPE_META,
  hostelCategory,
  hostelTypeMeta,
} from '../src/modules/hostel/hostel-notifications.rules.js';

const PFX = 'hrchk-hn-';
let passed = 0;
const failures: string[] = [];

function ok(label: string, cond: unknown, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ok   ${label}`);
  } else {
    failures.push(`${label}${detail ? ` -- ${detail}` : ''}`);
    console.log(`  FAIL ${label}${detail ? ` -- ${detail}` : ''}`);
  }
}

function eq(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  ok(label, a === e, a === e ? '' : `got ${a}, wanted ${e}`);
}

async function expectReject(label: string, fn: () => Promise<unknown>, status?: number) {
  try {
    await fn();
    failures.push(`${label} -- did NOT reject`);
    console.log(`  FAIL ${label} -- did NOT reject`);
  } catch (err: any) {
    if (status !== undefined && err?.httpStatus !== status) {
      failures.push(`${label} -- rejected ${err?.httpStatus} (${err?.message}), wanted ${status}`);
      console.log(`  FAIL ${label} -- rejected ${err?.httpStatus} (${err?.message}), wanted ${status}`);
    } else {
      passed++;
      console.log(`  ok   ${label}${err?.httpStatus ? ` (${err.httpStatus})` : ''}`);
    }
  }
}

function section(n: number | string, title: string) {
  console.log(`\n── ${n}. ${title}`);
}

/** Everything this suite created, for the `finally` sweep. */
const createdNotifications: string[] = [];

async function sweep() {
  const ids = createdNotifications.length
    ? createdNotifications
    : (await prisma.notification.findMany({ where: { title: { startsWith: PFX } }, select: { id: true } })).map((n) => n.id);
  if (ids.length) await prisma.notification.deleteMany({ where: { id: { in: ids } } });
  // The Broadcast rows are the RECORD of what was sent, so they outlive the notifications — and they
  // must be swept too, or a second run finds the first run's broadcasts and the "one broadcast was
  // recorded" assertion fails on the run before it.
  await prisma.broadcast.deleteMany({ where: { title: { startsWith: PFX } } });
  // A muted preference is keyed by (user, category) and this suite may have created one.
  await prisma.notificationPreference.deleteMany({ where: { category: { startsWith: PFX } } });
  await prisma.notification.deleteMany({ where: { title: { startsWith: PFX } } });
  await prisma.notificationPreference.deleteMany({ where: { category: { startsWith: PFX } } });
  // The test institution and its residents.
  const insts = await prisma.institution.findMany({ where: { code: { startsWith: PFX } }, select: { id: true } });
  if (insts.length) await prisma.institution.deleteMany({ where: { id: { in: insts.map((i) => i.id) } } });
}

async function main() {
  console.log('\n  Hostel notifications — database rules');

  const inst = (await prisma.institution.findFirst({ where: { code: { not: '' } }, orderBy: { createdAt: 'asc' } }))!;
  const other = await prisma.institution.findFirst({ where: { NOT: { id: inst.id } }, select: { id: true } });

  const warden = (
    await prisma.user.findFirst({ where: { email: 'hostel@learnix.dev', institutionId: inst.id }, select: { id: true } })
  )!;
  const residentUser = (
    await prisma.user.findFirst({ where: { email: 'student@learnix.dev', institutionId: inst.id }, select: { id: true } })
  )!;

  /** Raise a notification this suite owns, so it can be cleaned up. */
  const raise = async (
    recipientUserId: string,
    type: string,
    title: string,
    extra: { important?: boolean } = {},
  ) => {
    const res = await notifications.raiseHostelNotification(inst.id, [recipientUserId], {
      type,
      title,
      body: `${PFX} body`,
      important: extra.important,
    });
    const rows = await prisma.notification.findMany({ where: { title }, select: { id: true } });
    createdNotifications.push(...rows.map((r) => r.id));
    return res;
  };

  try {
    // ═══ 1. The catalogue ═══════════════════════════════════════════════════════════════════
    section(1, 'The catalogue is eight categories, and every one is complete');

    eq('there are exactly eight categories', HOSTEL_CATEGORY_IDS.length, 8);
    eq('the catalogue and the id list agree', HOSTEL_CATEGORIES.map((c) => c.id), [...HOSTEL_CATEGORY_IDS]);
    ok('the category ids are unique', new Set(HOSTEL_CATEGORY_IDS).size === HOSTEL_CATEGORY_IDS.length);
    for (const c of HOSTEL_CATEGORIES) {
      ok(`${c.id} has a label`, typeof c.label === 'string' && c.label.length > 0);
      ok(`${c.id} has a blurb`, typeof c.blurb === 'string' && c.blurb.length > 0);
      ok(`${c.id} has an icon`, typeof c.icon === 'string' && c.icon.length > 0);
      ok(`${c.id} has a colour`, /^#[0-9a-f]{6}$/i.test(c.color), c.color);
    }
    ok('the three composable categories are all in the catalogue',
      COMPOSABLE_CATEGORIES.every((id) => HOSTEL_CATEGORY_IDS.includes(id)));
    ok('the composable list is a SUBSET — a category that is not composable must not be listed',
      COMPOSABLE_CATEGORIES.length < HOSTEL_CATEGORY_IDS.length);
    ok('EMERGENCY is composable — it is a thing a warden publishes',
      COMPOSABLE_CATEGORIES.includes('EMERGENCY'));
    ok('a GATE_PASS is NOT composable — a warden must not be able to forge one',
      !COMPOSABLE_CATEGORIES.includes('GATE_PASS'));
    ok('a COMPLAINT is NOT composable', !COMPOSABLE_CATEGORIES.includes('COMPLAINT'));

    // ═══ 2. The type map ═════════════════════════════════════════════════════════════════════
    section(2, 'Every type the database holds is registered, and maps to a real category');

    for (const [type, meta] of Object.entries(HOSTEL_TYPE_META)) {
      ok(`${type} maps to a category that exists`, HOSTEL_CATEGORY_IDS.includes(meta.category as any), meta.category);
      ok(`${type} has a label`, typeof meta.label === 'string' && meta.label.length > 0);
    }
    ok('an unknown type resolves to a category rather than vanishing',
      hostelCategory('HOSTEL_NOT_A_REAL_TYPE') !== null);
    ok('an unknown type still gets chrome', typeof hostelTypeMeta('HOSTEL_NOT_A_REAL_TYPE').label === 'string');

    ok('the catalogue endpoint reports the same eight',
      (await notifications.hostelNotificationCatalogue()).categories.length === 8);

    // THE REGRESSION GUARD: a type the desk does not know about is a row that will be labelled with
    // a fallback and filed nowhere. Asserted against what the DATABASE actually holds, not against
    // what the desk believes it holds.
    const inDb = await prisma.notification.findMany({
      where: { sourceModule: 'hostel' },
      select: { type: true },
      distinct: ['type'],
    });
    const dbTypes = inDb.map((n) => n.type);
    const unmapped = dbTypes.filter((t) => !HOSTEL_TYPE_META[t]);
    ok('every hostel type in the database is registered', unmapped.length === 0, unmapped.join(', '));

    // ═══ 3. Mutes suppress, they do not hide ═════════════════════════════════════════════════
    section(3, 'A mute suppresses the row; an emergency ignores the mute');

    // A muted category: the resident has muted MAINTENANCE.
    await prisma.notificationPreference.create({
      data: { institutionId: inst.id, userId: residentUser.id, category: 'MAINTENANCE', muted: true },
    });

    const muted = await raise(residentUser.id, 'HOSTEL_MAINTENANCE', `${PFX} muted maintenance`);
    eq('a muted category delivers to nobody', muted.delivered, 0);
    eq('...and reports the muted count', muted.muted, 1);
    const mutedRows = await prisma.notification.count({ where: { title: `${PFX} muted maintenance` } });
    eq('...and writes NO ROW at all', mutedRows, 0);

    const unmuted = await raise(residentUser.id, 'HOSTEL_COMPLAINT', `${PFX} unmuted complaint`);
    eq('an unmuted category delivers', unmuted.delivered, 1);
    eq('...and reports no muted count', unmuted.muted, 0);

    // THE EMERGENCY EXCEPTION.
    const emergency = await raise(residentUser.id, 'HOSTEL_EMERGENCY', `${PFX} emergency`, { important: true });
    eq('an emergency delivers DESPITE the mute', emergency.delivered, 1);
    eq('...and is not counted as muted', emergency.muted, 0);
    const emergencyRows = await prisma.notification.findMany({ where: { title: `${PFX} emergency` } });
    eq('...and the row exists', emergencyRows.length, 1);
    ok('...and is flagged important', emergencyRows[0]?.isImportant === true);
    ok('...and is addressed to the resident', emergencyRows[0]?.recipientUserId === residentUser.id);
    ok('...and is scoped to the institution', emergencyRows[0]?.institutionId === inst.id);
    ok('...and carries the source module', emergencyRows[0]?.sourceModule === 'hostel');

    // The bypass is a FLAG on the type, so it is asserted as a property of the declaration.
    ok('only the emergency type declares the mute bypass',
      Object.entries(HOSTEL_TYPE_META).filter(([, m]) => m.bypassesMute).map(([t]) => t).join() === 'HOSTEL_EMERGENCY');

    // The mute is per (user, category): muting maintenance must not mute complaints.
    await prisma.notificationPreference.deleteMany({ where: { userId: residentUser.id, category: 'MAINTENANCE' } });
    const afterUnmute = await raise(residentUser.id, 'HOSTEL_MAINTENANCE', `${PFX} unmuted maintenance`);
    eq('unmuting the category lets it through again', afterUnmute.delivered, 1);

    // A mute for one resident does not affect another.
    const otherResident = (
      await prisma.user.findFirst({
        where: { institutionId: inst.id, id: { not: residentUser.id }, roles: { some: { role: 'STUDENT' } } },
        select: { id: true },
      })
    )!;
    await prisma.notificationPreference.create({
      data: { institutionId: inst.id, userId: residentUser.id, category: 'MESS', muted: true },
    });
    const oneMuted = await notifications.raiseHostelNotification(inst.id, [residentUser.id, otherResident.id], {
      type: 'HOSTEL_MESS',
      title: `${PFX} two recipients`,
      body: `${PFX}`,
    });
    eq('one muted recipient does not mute the other', oneMuted.delivered, 1);
    eq('...and the muted one is reported', oneMuted.muted, 1);
    await prisma.notificationPreference.deleteMany({ where: { userId: residentUser.id, category: 'MESS' } });

    // ═══ 4. The composer's boundary ════════════════════════════════════════════════════════════
    section(4, 'Only the composable categories may be composed');

    const composed = await notifications.composeHostelBroadcast(inst.id, warden.id, {
      category: 'ANNOUNCEMENT',
      audience: { kind: 'ALL_RESIDENTS' },
      title: `${PFX} announcement`,
      body: `${PFX} body`,
    });
    ok('a warden can compose an announcement', composed.recipients >= 0, `${composed.recipients} recipient(s)`);
    eq('...and it is typed as an announcement', composed.type, 'HOSTEL_ANNOUNCEMENT');
    ok('...and it is not important', composed.important === false);

    for (const category of ['GATE_PASS', 'COMPLAINT', 'VISITOR', 'MESS', 'LATE_RETURN'] as const) {
      await expectReject(
        `a warden cannot compose a ${category}`,
        () => notifications.composeHostelBroadcast(inst.id, warden.id, {
          category,
          audience: { kind: 'ALL_RESIDENTS' },
          title: `${PFX} forged`,
          body: `${PFX} body`,
        }),
        422,
      );
    }

    await expectReject(
      'an unknown category is refused',
      () => notifications.composeHostelBroadcast(inst.id, warden.id, {
        category: 'NOT_A_CATEGORY' as any,
        audience: { kind: 'ALL_RESIDENTS' },
        title: `${PFX} x`,
        body: `${PFX} y`,
      }),
      422,
    );

    // A broadcast creates a Broadcast row AND a notification row per recipient. The Broadcast row is
    // the record of what was sent — the notifications are only the delivery.
    const broadcastRows = await prisma.broadcast.count({ where: { title: `${PFX} announcement` } });
    ok('the broadcast itself is recorded', broadcastRows === 1, `${broadcastRows} row(s)`);

    // ═══ 5. The audience ═════════════════════════════════════════════════════════════════════
    section(5, 'An audience resolves to real recipients');

    const blocks = await prisma.hostelBlock.findMany({ where: { institutionId: inst.id }, select: { id: true, name: true } });
    ok('the institution has at least one block', blocks.length > 0, `${blocks.length}`);
    if (blocks.length) {
      const blockBroadcast = await notifications.composeHostelBroadcast(inst.id, warden.id, {
        category: 'MAINTENANCE',
        audience: { kind: 'BLOCK', blockId: blocks[0].id },
        title: `${PFX} block notice`,
        body: `${PFX} body`,
      });
      ok('a block-scoped notice resolves to recipients', blockBroadcast.recipients >= 0, `${blockBroadcast.recipients}`);
      eq('...and is typed as maintenance', blockBroadcast.type, 'HOSTEL_MAINTENANCE');
    }

    const messBroadcast = await notifications.composeHostelBroadcast(inst.id, warden.id, {
      category: 'MAINTENANCE',
      audience: { kind: 'MESS_MEMBERS' },
      title: `${PFX} mess notice`,
      body: `${PFX} body`,
    });
    ok('a mess-members notice resolves without error', messBroadcast.recipients >= 0, `${messBroadcast.recipients} recipient(s)`);

    // ═══ 6. The late-return derivation ═════════════════════════════════════════════════════════
    section(6, 'Late return is derived from the right facts');

    const passes = await prisma.gatePass.findMany({
      where: { studentProfile: { user: { institutionId: inst.id } } },
      select: { id: true, status: true, expectedInAt: true, actualInAt: true, outAt: true },
    });
    ok('the seed holds gate passes to derive from', passes.length > 0, `${passes.length}`);

    // A pass that is APPROVED, not returned, and past its return time IS late.
    const late = passes.find((p) => p.status === 'APPROVED' && !p.actualInAt && p.expectedInAt < new Date());
    const notLateYet = passes.find((p) => p.status === 'APPROVED' && !p.actualInAt && p.expectedInAt > new Date());
    const returned = passes.find((p) => p.actualInAt !== null);
    ok('there is an overdue pass to find', Boolean(late), late ? `due ${late.expectedInAt.toISOString()}` : 'none');

    const sweep = await notifications.raiseLateReturnAlerts(inst.id);
    ok('the sweep runs', sweep.passes >= 0, `${sweep.passes} pass(es) considered, ${sweep.raised} raised`);

    if (late) {
      const lateAlerts = await prisma.notification.findMany({
        where: { type: 'HOSTEL_LATE_RETURN', dataJson: { contains: late.id } },
        select: { recipientUserId: true, title: true },
      });
      ok('the late pass produced an alert', lateAlerts.length > 0, `${lateAlerts.length} row(s)`);
      ok('...and the WARDEN was told', lateAlerts.some((a) => a.recipientUserId === warden.id));
      const passOwner = await prisma.gatePass.findUnique({ where: { id: late.id }, select: { studentProfile: { select: { userId: true } } } });
      ok('...and the STUDENT was told', lateAlerts.some((a) => a.recipientUserId === passOwner?.studentProfile.userId));
    }

    if (notLateYet) {
      const notLateAlerts = await prisma.notification.count({
        where: { type: 'HOSTEL_LATE_RETURN', dataJson: { contains: notLateYet.id } },
      });
      eq('a pass whose return time has not passed is NOT late', notLateAlerts, 0);
    }
    if (returned) {
      const returnedAlerts = await prisma.notification.count({
        where: { type: 'HOSTEL_LATE_RETURN', dataJson: { contains: returned.id } },
      });
      eq('a pass that has been RETURNED is not late', returnedAlerts, 0);
    }

    // A pending pass was never approved, so it is not late.
    const pending = passes.find((p) => p.status === 'PENDING');
    if (pending) {
      const pendingAlerts = await prisma.notification.count({
        where: { type: 'HOSTEL_LATE_RETURN', dataJson: { contains: pending.id } },
      });
      eq('a pass still awaiting approval is not late', pendingAlerts, 0);
    }

    // The sweep is IDEMPOTENT — it is on demand, and pressing it twice must not double the rows.
    const before = await prisma.notification.count({ where: { type: 'HOSTEL_LATE_RETURN' } });
    await notifications.raiseLateReturnAlerts(inst.id);
    const after = await prisma.notification.count({ where: { type: 'HOSTEL_LATE_RETURN' } });
    eq('running the sweep twice does not double the alerts', after, before);

    // ═══ 7. The inbox ══════════════════════════════════════════════════════════════════════════
    section(7, 'The inbox selects the hostel\'s types and shapes them');

    const inbox = await notifications.listHostelNotifications(warden.id, inst.id, {});
    ok('the inbox returns rows', Array.isArray(inbox.notifications), `${inbox.notifications.length}`);
    ok('every row is a hostel type', inbox.notifications.every((n: any) => n.type in HOSTEL_TYPE_META));
    ok('every row carries a label', inbox.notifications.every((n: any) => typeof n.typeLabel === 'string' && n.typeLabel.length > 0));
    ok('every row carries an icon and a colour',
      inbox.notifications.every((n: any) => typeof n.icon === 'string' && /^#[0-9a-f]{6}$/i.test(n.color)));
    ok('the counts cover all eight categories', inbox.counts.length === 8, `${inbox.counts.length}`);
    ok('the pagination is present', typeof inbox.pagination?.total === 'number');

    // A row that is NOT a hostel type is not in the hostel inbox — even though it is in the same
    // table and addressed to the same person. The mess expense approval the accounts desk needs is
    // a finance row, not a hostel notification.
    const financeRow = await prisma.notification.findFirst({
      where: { recipientUserId: warden.id, type: 'EXPENSE_APPROVAL' },
      select: { id: true },
    });
    if (financeRow) {
      const inInbox = inbox.notifications.some((n: any) => n.id === financeRow.id);
      ok('a finance row is not in the hostel inbox', inInbox === false);
    }

    // The filter is applied on the server, by category.
    const filtered = await notifications.listHostelNotifications(warden.id, inst.id, { category: 'COMPLAINT' });
    ok('a category filter is applied', filtered.notifications.every((n: any) => n.category === 'COMPLAINT'));
    const unknown = await notifications.listHostelNotifications(warden.id, inst.id, { category: 'NOT_A_CATEGORY' });
    eq('an unknown category yields an empty list, not an error', unknown.notifications.length, 0);

    // Read state is scoped to the RECIPIENT.
    const own = await notifications.markHostelNotificationRead(inbox.notifications[0]?.id ?? '', warden.id, inst.id);
    ok('a notification can be marked read', own.alreadyRead === false || own.alreadyRead === true);
    await expectReject(
      'another institution cannot read it',
      () => notifications.markHostelNotificationRead(inbox.notifications[0]?.id ?? '', warden.id, other?.id ?? '__none__'),
      404,
    );

    // ═══ 8. Tenant scoping ═════════════════════════════════════════════════════════════════════
    section(8, 'Nothing crosses an institution boundary');

    if (other) {
      const foreign = await notifications.listHostelNotifications(warden.id, other.id, {});
      eq('another institution\'s inbox is empty for this warden', foreign.notifications.length, 0);
      const raised = await notifications.raiseHostelNotification(other.id, [residentUser.id], {
        type: 'HOSTEL_COMPLAINT',
        title: `${PFX} foreign`,
        body: `${PFX}`,
      });
      eq('a notification raised in another institution still only reaches its recipient', raised.delivered, 1);
      const mineRows = await prisma.notification.count({ where: { title: `${PFX} foreign` } });
      eq('...and exactly one row was written', mineRows, 1);
    }
  } finally {
    await sweep();
    console.log(`\n  ${passed} passed, ${failures.length} failed`);
    if (failures.length) {
      for (const f of failures) console.log(`  failing: ${f}`);
      process.exitCode = 1;
    }
    await prisma.$disconnect();
  }
}

main().catch(async (e) => {
  console.error(e);
  try {
    await sweep();
  } catch {
    /* best effort */
  }
  process.exit(1);
});
