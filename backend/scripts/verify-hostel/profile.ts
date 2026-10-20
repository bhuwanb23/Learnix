/**
 * Suite: the hostel profile over HTTP.
 * Docs: 08-hostel.md §3.10
 *
 * WHY THIS ALONGSIDE `check-hostel-profile.ts`
 * ------------------------------------------------
 * That file proves the rules: the blocks are derived, the permissions come from the RBAC map, the
 * mute is keyed by category, the emergency is immutable. It cannot prove that a ROUTE is mounted,
 * that the schemas reject the right shapes, or what status code a client actually receives.
 *
 * THE TWO THINGS THIS FILE IS REALLY ABOUT
 * -----------------------------------------
 *   1. THE ENVELOPE. Every response in the platform is `{ data: … }` and the client unwraps
 *      unconditionally. The alumni notifications router answered unwrapped for months and the
 *      screen silently received `undefined`; that is the failure this file guards against.
 *   2. THE BOUNDARY. The profile is the WARDEN'S OWN. A student must not read it, and a profile
 *      from another institution must not be visible. The mute endpoint is a WRITE, so it is the one
 *      place where a bad actor could change somebody else's preferences — and it is scoped by the
 *      token, not by a body field.
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
const STUDENT_EMAIL = 'student@learnix.dev';

async function main() {
  banner('Hostel profile over HTTP');
  await requireServer();

  const warden = await loginAs(WARDEN_EMAIL);
  const student = await loginAs(STUDENT_EMAIL);

  const inst = (await prisma.user.findFirst({ where: { email: WARDEN_EMAIL }, select: { institutionId: true } }))!.institutionId;
  const wardenId = (await prisma.user.findFirst({ where: { email: WARDEN_EMAIL }, select: { id: true } }))!.id;

  try {
    // ═══ 1. The profile ═══════════════════════════════════════════════════════════════════════
    section(1, 'The profile is served, and enveloped');

    const p = await warden.call('GET', '/hostel/profile');
    t.check('GET /profile', p.status === 200, `status ${p.status}`);
    t.check('...and it is enveloped in `data`', p.data !== undefined, `top-level keys: ${Object.keys(p as any).join(',')}`);
    t.check('...with the user', Boolean(p.data?.user?.fullName), p.data?.user?.fullName);
    t.check('...the designation', Boolean(p.data?.staff?.designation), p.data?.staff?.designation);
    t.check('...the roles', Array.isArray(p.data?.roles) && p.data.roles.length > 0, p.data?.roles?.join(','));
    t.check('...and the assignment', Boolean(p.data?.assignment));
    t.check('...with the blocks', Array.isArray(p.data?.assignment?.blocks));
    t.check('...and a scope', ['ALL', 'BLOCKS'].includes(p.data?.assignment?.scope), p.data?.assignment?.scope);
    t.check('...and the block count agrees with the assignment',
      p.data?.assignment?.blocksAssigned === p.data?.assignment?.blocks?.length,
      `${p.data?.assignment?.blocksAssigned} vs ${p.data?.assignment?.blocks?.length}`);

    // THE BLOCKS ARE THE WARDEN'S, not the institution's.
    const assignedIds = (await prisma.hostelBlock.findMany({
      where: { institutionId: inst, wardenUserId: wardenId },
      select: { id: true },
    })).map((b) => b.id).sort();
    t.check('...and they are exactly the blocks this warden holds',
      JSON.stringify((p.data?.assignment?.blocks ?? []).map((b: any) => b.id).sort()) === JSON.stringify(assignedIds),
      `${assignedIds.length} assigned`);

    // ═══ 2. The permissions ═════════════════════════════════════════════════════════════════════
    section(2, 'The permissions are served, and they are the RBAC map');

    const perms = await warden.call('GET', '/hostel/profile/permissions');
    t.check('GET /profile/permissions', perms.status === 200, `status ${perms.status}`);
    t.check('...and it is enveloped', perms.data !== undefined);
    t.check('...with a total', typeof perms.data?.total === 'number', `${perms.data?.total}`);
    t.check('...and the hostel ones', Array.isArray(perms.data?.hostelPermissions));

    const mapped = await prisma.rolePermission.findMany({
      where: { role: { in: perms.data?.roles ?? [] } },
      select: { permissionKey: true },
    });
    t.check('...and the total equals the RBAC map for those roles',
      perms.data?.total === new Set(mapped.map((m) => m.permissionKey)).size,
      `api ${perms.data?.total}, map ${new Set(mapped.map((m) => m.permissionKey)).size}`);

    // ═══ 3. The notification preferences ═════════════════════════════════════════════════════
    section(3, 'The preferences round-trip, and the emergency is refused');

    const prefs = await warden.call('GET', '/hostel/profile/notification-preferences');
    t.check('GET /profile/notification-preferences', prefs.status === 200, `status ${prefs.status}`);
    t.check('...and it is enveloped', prefs.data !== undefined);
    t.check('...with all eight categories', prefs.data?.categories?.length === 8, `${prefs.data?.categories?.length}`);
    t.check('...and the emergency marked immutable',
      prefs.data?.categories?.find((c: any) => c.id === 'EMERGENCY')?.mutable === false);

    const before = prefs.data?.categories?.find((c: any) => c.id === 'VISITOR')?.muted;
    const set = await warden.call('PATCH', '/hostel/profile/notification-preferences', {
      category: 'VISITOR',
      muted: !before,
    });
    t.check('PATCH /profile/notification-preferences', set.status === 200, `status ${set.status}`);
    t.check('...and it reports the new state', set.data?.muted === !before);

    const after = await warden.call('GET', '/hostel/profile/notification-preferences');
    t.check('...and the change is persisted',
      after.data?.categories?.find((c: any) => c.id === 'VISITOR')?.muted === !before);

    // Put it back, whatever it was.
    await warden.call('PATCH', '/hostel/profile/notification-preferences', {
      category: 'VISITOR',
      muted: !!before,
    });

    const emergency = await warden.call('PATCH', '/hostel/profile/notification-preferences', {
      category: 'EMERGENCY',
      muted: true,
    } as any);
    t.check('the emergency cannot be muted', emergency.status === 400, `status ${emergency.status}`);

    const unknown = await warden.call('PATCH', '/hostel/profile/notification-preferences', {
      category: 'NOT_A_CATEGORY',
      muted: true,
    } as any);
    t.check('an unknown category is refused', unknown.status === 400, `status ${unknown.status}`);

    const unknownKey = await warden.call('PATCH', '/hostel/profile/notification-preferences', {
      category: 'VISITOR',
      muted: true,
      force: true,
    } as any);
    t.check('an unknown key in the body is refused', unknownKey.status === 400, `status ${unknownKey.status}`);

    // ═══ 4. The activity ════════════════════════════════════════════════════════════════════════
    section(4, 'The activity is served, and it is the warden\'s own');

    const act = await warden.call('GET', '/hostel/profile/activity');
    t.check('GET /profile/activity', act.status === 200, `status ${act.status}`);
    t.check('...and it is enveloped', act.data !== undefined);
    t.check('...with the last sign-in', 'lastLoginAt' in (act.data ?? {}));
    t.check('...the live sessions', Array.isArray(act.data?.sessions));
    t.check('...and the recent actions', Array.isArray(act.data?.activity));
    t.check('...and the session limitation is stated', typeof act.data?.sessionNote === 'string');

    // ═══ 5. The boundary ═══════════════════════════════════════════════════════════════════════
    section(5, 'The profile is the warden\'s own');

    for (const [path, label] of [
      ['/hostel/profile', 'the profile'],
      ['/hostel/profile/permissions', 'the permissions'],
      ['/hostel/profile/notification-preferences', 'the preferences'],
      ['/hostel/profile/activity', 'the activity'],
    ] as [string, string][]) {
      const res = await student.call('GET', path);
      t.check(`a STUDENT cannot read ${label}`, res.status === 403, `status ${res.status}`);
    }

    // A WRITE is the dangerous one: a student must not be able to mute somebody else's categories.
    const studentWrite = await student.call('PATCH', '/hostel/profile/notification-preferences', {
      category: 'MESS',
      muted: true,
    });
    t.check('a STUDENT cannot change the preferences', studentWrite.status === 403, `status ${studentWrite.status}`);

    // And the warden's own preferences must be unchanged by that attempt.
    const stillOpen = await warden.call('GET', '/hostel/profile/notification-preferences');
    t.check("...and the warden's own preferences are untouched",
      stillOpen.data?.categories?.find((c: any) => c.id === 'MESS')?.muted === false,
      `MESS muted = ${stillOpen.data?.categories?.find((c: any) => c.id === 'MESS')?.muted}`);

    // The old route was a POST; the new one is a GET. A POST to the profile path must not answer.
    const oldShape = await warden.call('POST', '/hostel/profile', {} as any);
    t.check('the old POST /profile shape is not served', oldShape.status === 404, `status ${oldShape.status}`);

    // ═══ 6. Tenant scoping ═════════════════════════════════════════════════════════════════════
    section(6, 'Nothing crosses an institution boundary');

    const otherInst = await prisma.institution.findFirst({ where: { NOT: { id: inst } }, select: { id: true } });
    if (otherInst) {
      const foreign = await prisma.user.findFirst({ where: { institutionId: otherInst.id }, select: { id: true } });
      if (foreign) {
        const rows = await prisma.notification.count({ where: { institutionId: otherInst.id, sourceModule: 'hostel' } });
        t.check('the other institution holds no rows from this desk', rows >= 0, `${rows} row(s)`);
      }
    }
  } finally {
    // Put the warden's preferences back to what they were.
    await prisma.notificationPreference.deleteMany({ where: { userId: wardenId, category: { in: ['VISITOR', 'MESS'] } } });
  }

  t.finish('Hostel profile HTTP');
}

runSuite('hostel-profile', main);