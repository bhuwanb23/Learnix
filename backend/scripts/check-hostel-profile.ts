/**
 * Suite: the hostel profile at the database level.
 * Docs: 08-hostel.md §3.10
 *
 * WHY THIS ALONGSIDE `verify-hostel/profile.ts`
 * ------------------------------------------------
 * That file proves the ROUTES are wired and a client gets the right status code. It cannot prove
 * that the assigned blocks are DERIVED from the warden's own assignments rather than counted, that
 * the permission list comes from the RBAC map rather than restated, or that the mute is keyed the
 * way the delivery path keys it. Those live here.
 *
 * THE RULES THAT ARE EASY TO GET WRONG
 * -------------------------------------
 *   1. THE BLOCKS ARE DERIVED. A profile that says "3 blocks" must mean the three blocks THIS warden
 *      is responsible for, not the three that exist. A chief warden who holds no block is responsible
 *      for the WHOLE hostel, not for none of it — and the scope says so, because "0 of 3" would be a
 *      lie about a person who runs the desk.
 *   2. THE PERMISSIONS COME FROM THE RBAC MAP. A second list in the profile service would drift the
 *      moment somebody was promoted, and would tell a warden they can do something they cannot.
 *   3. A MUTE IS KEYED BY CATEGORY, NOT BY TYPE. The delivery path suppresses on the category, so a
 *      mute stored against a type would silence one message and not the rest.
 *   4. THE EMERGENCY CANNOT BE MUTED. The delivery path ignores its mute, so a stored mute for it
 *      would be a preference that appears to work and does not.
 *   5. ACTIVITY IS THE WARDEN'S OWN. The audit log is read by actor, not by institution — a list of
 *      "recent actions" that included somebody else's would be a list of nothing.
 *
 * CLEANUP DISCIPLINE
 * ------------------
 * Preflight sweep plus `finally`, `hrchk-hp-` prefix.
 */
import { prisma } from '../src/db/prisma.js';
import * as profile from '../src/modules/hostel/hostel-profile.service.js';
import { HOSTEL_CATEGORY_IDS } from '../src/modules/hostel/hostel-notifications.rules.js';

const PFX = 'hrchk-hp-';
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

async function sweep() {
  // Children before parents. `user_roles` points at `users` and does not cascade, so deleting a
  // user with a role while the role row is still there is refused by the foreign key — and the
  // suite's own fixtures have exactly that.
  const testUsers = await prisma.user.findMany({
    where: { email: { startsWith: PFX } },
    select: { id: true },
  });
  const ids = testUsers.map((u) => u.id);
  if (ids.length) {
    await prisma.userRole.deleteMany({ where: { userId: { in: ids } } });
    await prisma.staffProfile.deleteMany({ where: { userId: { in: ids } } });
  }
  await prisma.notificationPreference.deleteMany({ where: { category: { startsWith: PFX } } });
  await prisma.notificationPreference.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  const insts = await prisma.institution.findMany({ where: { code: { startsWith: PFX } }, select: { id: true } });
  if (insts.length) await prisma.institution.deleteMany({ where: { id: { in: insts.map((i) => i.id) } } });
}

async function main() {
  console.log('\n  Hostel profile — database rules');

  const inst = (await prisma.institution.findFirst({ where: { code: { not: '' } }, orderBy: { createdAt: 'asc' } }))!;
  const other = await prisma.institution.findFirst({ where: { NOT: { id: inst.id } }, select: { id: true } });

  const warden = (
    await prisma.user.findFirst({ where: { email: 'hostel@learnix.dev', institutionId: inst.id }, select: { id: true } })
  )!;

  // PREFLIGHT. A run that crashed leaves its fixtures behind, and the next run's `create` then
  // collides on the unique (institutionId, email). Sweeping first means a crashed run cannot poison
  // the next one — which is the whole reason the prefix exists.
  await sweep();

  try {
    // ═══ 1. The profile ═══════════════════════════════════════════════════════════════════════
    section(1, 'The profile is derived, not restated');

    const p = await profile.getHostelProfile(warden.id, inst.id);
    ok('the profile returns the user', p.user?.id === warden.id);
    ok('...with a name and an email', Boolean(p.user?.fullName) && Boolean(p.user?.email));
    ok('...and the roles they hold', Array.isArray(p.roles) && p.roles.length > 0, p.roles.join(','));
    ok('...and a designation', Boolean(p.staff?.designation), p.staff?.designation);
    ok('...and an employee number', Boolean(p.staff?.employeeNo), p.staff?.employeeNo ?? 'none');
    ok('...and when they joined', p.user?.joinedAt instanceof Date);
    ok('...and when they last signed in', 'lastLoginAt' in (p.user ?? {}));

    // THE BLOCKS ARE DERIVED FROM THE ASSIGNMENT, not from the institution's block count.
    const assignedBlocks = await prisma.hostelBlock.findMany({
      where: { institutionId: inst.id, wardenUserId: warden.id },
      select: { id: true },
    });
    eq('the assigned blocks are exactly the ones this warden holds', p.assignment.blocksAssigned, assignedBlocks.length);
    ok('the block ids match',
      p.assignment.blocks.map((b: any) => b.id).sort().join() === assignedBlocks.map((b) => b.id).sort().join());
    eq('the institution block count is reported separately', p.assignment.blocksTotal,
      await prisma.hostelBlock.count({ where: { institutionId: inst.id } }));

    // A warden with no block is responsible for the WHOLE hostel. Reporting "0 of 3" would be a lie
    // about a person who runs the desk.
    const blockless = await prisma.user.create({
      data: {
        institutionId: inst.id,
        email: `${PFX}blockless@learnix.dev`,
        fullName: 'Blockless Warden',
        passwordHash: 'x',
        roles: { create: { role: 'HOSTEL' } },
      },
      select: { id: true },
    });
    const p2 = await profile.getHostelProfile(blockless.id, inst.id);
    eq('a warden holding no block has scope ALL', p2.assignment.scope, 'ALL');
    eq('...and is assigned none', p2.assignment.blocksAssigned, 0);
    ok('...and the blocks list is empty', p2.assignment.blocks.length === 0);

    // The occupancy on a block is counted from BED STATUS, not from a denormalised counter — the
    // same lesson the rooms screen learned.
    const anyBlock = p.assignment.blocks[0];
    if (anyBlock) {
      const beds = await prisma.bed.findMany({
        where: { room: { blockId: anyBlock.id } },
        select: { status: true },
      });
      const occupied = beds.filter((b) => b.status === 'ALLOCATED').length;
      eq('the occupancy is counted from bed status', anyBlock.occupied, occupied);
      eq('...and the percentage agrees', anyBlock.occupancyPct,
        beds.length === 0 ? 0 : Math.round((occupied / beds.length) * 100));
    }

    // ═══ 2. The permissions ═════════════════════════════════════════════════════════════════════
    section(2, 'The permissions are read from the RBAC map');

    const perms = await profile.getHostelPermissions(warden.id, inst.id);
    ok('the roles are reported', perms.roles.length > 0, perms.roles.join(','));
    ok('a total is reported', typeof perms.total === 'number', `${perms.total}`);
    ok('the groups are reported', Array.isArray(perms.groups));

    // THE MAP IS THE SOURCE. The count must equal what the RBAC map says for these roles.
    const mapped = await prisma.rolePermission.findMany({
      where: { role: { in: perms.roles } },
      select: { permissionKey: true },
    });
    eq('the total equals the RBAC map for those roles', perms.total, new Set(mapped.map((m) => m.permissionKey)).size);

    // And the hostel ones must be a subset of what the map grants, not a restatement.
    const hostelFromMap = await prisma.rolePermission.findMany({
      where: { role: { in: perms.roles }, permissionGroup: { category: 'HOSTEL' } },
      select: { permissionKey: true },
    });
    const hostelKeys = new Set(hostelFromMap.map((m) => m.permissionKey));
    eq("the hostel permissions are exactly the map's HOSTEL ones",
      (perms.hostelPermissions ?? []).map((p: any) => p.key).sort(),
      [...hostelKeys].sort());

    // A user with no role gets an empty, EXPLAINED answer rather than an error.
    const roleless = await prisma.user.create({
      data: {
        institutionId: inst.id,
        email: `${PFX}roleless@learnix.dev`,
        fullName: 'Roleless',
        passwordHash: 'x',
      },
      select: { id: true },
    });
    const p3 = await profile.getHostelPermissions(roleless.id, inst.id);
    eq('a user with no role gets an empty permission list', p3.total, 0);
    ok('...and it is not an error', Array.isArray(p3.groups));

    // ═══ 3. The notification preferences ═════════════════════════════════════════════════════
    section(3, 'A mute is keyed by CATEGORY, and the emergency cannot be muted');

    const prefs = await profile.getHostelNotificationPreferences(warden.id, inst.id);
    eq('all eight categories are offered', prefs.categories.length, 8);
    ok('every category is one of the eight',
      prefs.categories.every((c: any) => HOSTEL_CATEGORY_IDS.includes(c.id)));
    ok('the emergency is marked IMMUTABLE', prefs.categories.find((c: any) => c.id === 'EMERGENCY')?.mutable === false);
    ok('...and every other category is mutable',
      prefs.categories.filter((c: any) => c.id !== 'EMERGENCY').every((c: any) => c.mutable === true));

    // Round trip.
    const set = await profile.updateHostelNotificationPreferences(warden.id, inst.id, { category: 'VISITOR', muted: true });
    eq('a mute is stored', set.muted, true);
    const prefs2 = await profile.getHostelNotificationPreferences(warden.id, inst.id);
    ok('...and is reported back', prefs2.categories.find((c: any) => c.id === 'VISITOR')?.muted === true);
    eq('...and the muted count agrees', prefs2.mutedCount, 1);

    // The KEY is the category — which is what the delivery path suppresses on.
    const stored = await prisma.notificationPreference.findFirst({
      where: { userId: warden.id, category: 'VISITOR' },
      select: { category: true, muted: true },
    });
    ok('the stored row is keyed by CATEGORY, not by type', stored?.category === 'VISITOR');
    eq('...and it is muted', stored?.muted, true);

    // Un-mute.
    await profile.updateHostelNotificationPreferences(warden.id, inst.id, { category: 'VISITOR', muted: false });
    const prefs3 = await profile.getHostelNotificationPreferences(warden.id, inst.id);
    ok('un-muting is stored', prefs3.categories.find((c: any) => c.id === 'VISITOR')?.muted === false);

    await expectReject(
      'the emergency cannot be muted',
      () => profile.updateHostelNotificationPreferences(warden.id, inst.id, { category: 'EMERGENCY', muted: true }),
      404,
    );
    await expectReject(
      'an unknown category cannot be muted',
      () => profile.updateHostelNotificationPreferences(warden.id, inst.id, { category: 'NOPE', muted: true }),
      404,
    );

    // ═══ 4. The activity ═══════════════════════════════════════════════════════════════════════
    section(4, 'The activity is the warden\'s own');

    const act = await profile.getHostelActivity(warden.id, inst.id);
    ok('the last sign-in is reported', 'lastLoginAt' in act);
    ok('the live sessions are reported', Array.isArray(act.sessions));
    ok('...and counted', typeof act.sessionCount === 'number', `${act.sessionCount}`);
    ok('the session limitation is stated, not hidden', typeof act.sessionNote === 'string' && act.sessionNote.length > 0);
    ok('the recent actions are reported', Array.isArray(act.activity));

    // THE ACTIVITY IS BY ACTOR. Somebody else's action must not appear.
    const someoneElse = await prisma.auditLog.findFirst({
      where: { institutionId: inst.id, actorUserId: { not: warden.id } },
      select: { id: true, actorUserId: true },
    });
    if (someoneElse) {
      ok("somebody else's action does not appear in this warden's history",
        !act.activity.some((a: any) => a.id === someoneElse.id));
    }

    // ═══ 5. Tenant scoping ══════════════════════════════════════════════════════════════════════
    section(5, 'Nothing crosses an institution boundary');

    if (other) {
      await expectReject("another institution's warden is not found",
        () => profile.getHostelProfile(warden.id, other.id), 404);
      await expectReject("another institution's permissions are not found",
        () => profile.getHostelPermissions(warden.id, other.id), 404);
      await expectReject("another institution's activity is not found",
        () => profile.getHostelActivity(warden.id, other.id), 404);
    }

    // A user of THIS institution cannot be read through another institution's id.
    const foreign = await prisma.user.findFirst({ where: { institutionId: other?.id ?? '__none__' }, select: { id: true } });
    if (foreign) {
      await expectReject('a user of another institution is not found',
        () => profile.getHostelProfile(foreign.id, inst.id), 404);
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
