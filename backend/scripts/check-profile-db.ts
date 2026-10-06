/**
 * DB-backed checks for the Alumni Profile feature
 * (docs/users/12-alumni-relations.md §3.8).
 *
 * Creates its own fixtures, asserts behaviour, deletes them. Requires no seed data —
 * which matters because the project's seed is being deferred to project end, and a
 * suite that needs a seeded profile is a suite that cannot run today.
 *
 * WHAT IS PROVEN HERE THAT CANNOT BE PROVEN WITHOUT A DATABASE
 * -----------------------------------------------------------
 *   - IDOR: a second graduate cannot read, write or delete the first one's career or
 *     achievements. The DB-free suite asserts the route shape; only this can prove the
 *     ownership scope is in the QUERY rather than in a post-fetch comparison.
 *   - The unique constraint on (profile, title, year) for achievements, which SQLite
 *     does not enforce against NULLs — hence the explicit pre-check in the service.
 *   - Exactly-one-current-role, which is a transactional invariant.
 *   - `changePassword` actually revoking refresh tokens. This is the one the HTTP suite
 *     can check too, but only from the outside; here it is a direct assertion that the
 *     row is revoked, which is what actually matters.
 *
 * CLEANUP DISCIPLINE
 * ------------------
 * A pre-flight sweep removes anything left by a previous crashed run, and `finally`
 * blocks remove what this run created. Both are necessary: the sweep because the
 * reminder-style time-window logic would otherwise be perturbed by orphans, and the
 * `finally` because a mid-suite throw must not leave a graduate with somebody else's
 * career history.
 *
 * Everything it writes is namespaced with a `pfx-` marker so cleanup can find its own
 * rows without touching real data.
 */
import { prisma } from '../src/db/prisma.js';
import { notify } from '../src/modules/alumni/notifications/notifications.delivery.js';
import {
  addCareerEntry,
  listCareer,
  removeCareerEntry,
  setCareerHighlight,
  updateCareerEntry,
  officeUpdateCareerEntry,
} from '../src/modules/alumni/profile/career.service.js';
import {
  addAchievement,
  listAchievements,
  removeAchievement,
  setVerified,
  verificationQueue,
  updateAchievement,
} from '../src/modules/alumni/profile/achievements.service.js';
import { getProfileSelf, updateProfile } from '../src/modules/alumni/profile/profile.service.js';
import * as auth from '../src/modules/auth/auth.service.js';
import type { Viewer } from '../src/modules/alumni/directory.service.js';

let pass = 0;
let fail = 0;
const ok = (cond: boolean, msg: string) => {
  if (cond) pass++;
  else {
    fail++;
    console.log(`  FAIL: ${msg}`);
  }
};
const section = (name: string) => console.log(`\n[${name}]`);

const PFX = 'pfx-';

/** Everything the suite creates, so teardown can be exact. */
type Fixtures = {
  institutionId: string;
  departmentId: string;
  programId: string;
  batchId: string;
  officeUserId: string;
  aUserId: string;
  bUserId: string;
  profileA: string;
  profileB: string;
  otherInstitutionId: string;
  foreignUserId: string;
  foreignProfileId: string;
  tokenRows: string[];
};

async function preflight() {
  const events = await prisma.event.findMany({ where: { title: { startsWith: PFX } }, select: { id: true } });
  await prisma.eventRegistration.deleteMany({ where: { eventId: { in: events.map((e) => e.id) } } });
  await prisma.event.deleteMany({ where: { id: { in: events.map((e) => e.id) } } });
  await prisma.mentorshipRequest.deleteMany({ where: { field: { startsWith: PFX } } });
  const users = await prisma.user.findMany({
    where: { email: { startsWith: PFX } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);

  // Order matters, and it is not the obvious order. Every one of these tables holds a
  // FK to `users`, and most have NO cascade — so deleting a user while its audit rows,
  // refresh tokens or mentor requests still point at it is rejected by SQLite.
  //
  // Deleting the *profiles* is not enough either: a crashed run can leave a
  // `RefreshToken` or `AuditLog` behind with no profile to point at.
  // `user_roles` is the one that bites first: `UserRole.userId` has no cascade, so
  // deleting a user before its role rows is rejected outright.
  await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
  await prisma.mentorshipRequest.deleteMany({ where: { field: { startsWith: PFX } } });
  await prisma.notification.deleteMany({ where: { recipientUserId: { in: userIds } } });

  // Profiles cascade to skills / career / achievements / privacy.
  const profiles = await prisma.alumniProfile.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  await prisma.alumniProfile.deleteMany({ where: { id: { in: profiles.map((p) => p.id) } } });

  // A crashed run may have left academic structure behind even if the profiles are
  // gone, so clear those before the users and the institution.
  const fixtureInstitutions = await prisma.institution.findMany({
    where: { code: { startsWith: PFX } },
    select: { id: true },
  });
  const instIds = fixtureInstitutions.map((i) => i.id);
  const depts = await prisma.department.findMany({
    where: { institutionId: { in: instIds } },
    select: { id: true },
  });
  const deptIds = depts.map((d) => d.id);
  if (deptIds.length) {
    const progs = await prisma.program.findMany({ where: { departmentId: { in: deptIds } }, select: { id: true } });
    const progIds = progs.map((p) => p.id);
    if (progIds.length) {
      await prisma.batch.deleteMany({ where: { programId: { in: progIds } } });
      await prisma.program.deleteMany({ where: { id: { in: progIds } } });
    }
    await prisma.department.deleteMany({ where: { id: { in: deptIds } } });
  }

  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.institution.deleteMany({ where: { code: { startsWith: PFX } } });
  return { profiles: profiles.length, events: events.length };
}

async function build(): Promise<Fixtures> {
  const tag = `${PFX}${Date.now().toString(36)}`;

  const institution = await prisma.institution.create({
    data: { name: 'Profile Fixture College', code: tag, address: '1 Test Road' },
  });
  const department = await prisma.department.create({
    data: { institutionId: institution.id, name: 'Test Dept', code: `${tag}-dept` },
  });
  const program = await prisma.program.create({
    data: { departmentId: department.id, name: 'BSc Test', code: `${tag}-prog`, level: 'UG', durationYears: 4, totalSemesters: 8 },
  });
  const batch = await prisma.batch.create({
    data: { programId: program.id, name: 'Test 2019', startYear: 2015, graduationYear: 2019 },
  });

  const mkUser = async (suffix: string, roles: string[]) => {
    const u = await prisma.user.create({
      data: {
        institutionId: institution.id,
        email: `${tag}-${suffix}@fixture.test`,
        fullName: `Fixture ${suffix}`,
        passwordHash: 'x',
        roles: { create: roles.map((role) => ({ role })) },
      },
    });
    return u;
  };

  const office = await mkUser('office', ['ALUMNI', 'ALUMNI_OFFICE']);
  const a = await mkUser('a', ['ALUMNI']);
  const b = await mkUser('b', ['ALUMNI']);

  const profileA = await prisma.alumniProfile.create({
    data: {
      userId: a.id,
      institutionId: institution.id,
      batchId: batch.id,
      graduationYear: 2019,
      currentRole: 'Engineer',
      headline: 'Original headline',
      privacy: {
        create: { showEmail: true, showLinks: true, showSkills: true, visibleTo: 'ANYONE' },
      },
    },
  });
  const profileB = await prisma.alumniProfile.create({
    data: {
      userId: b.id,
      institutionId: institution.id,
      batchId: batch.id,
      graduationYear: 2019,
      privacy: { create: { visibleTo: 'ANYONE' } },
    },
  });

  // A second institution, to prove nothing leaks across the boundary.
  const otherInst = await prisma.institution.create({
    data: { name: 'Foreign College', code: `${tag}-foreign`, address: '2 Other Road' },
  });
  const foreignDept = await prisma.department.create({
    data: { institutionId: otherInst.id, name: 'Foreign Dept', code: `${tag}-fdept` },
  });
  const foreignProg = await prisma.program.create({
    data: { departmentId: foreignDept.id, name: 'Foreign Prog', code: `${tag}-fprog`, level: 'PG', durationYears: 2, totalSemesters: 4 },
  });
  const foreign = await prisma.user.create({
    data: {
      institutionId: otherInst.id,
      email: `${tag}-foreign@fixture.test`,
      fullName: 'Foreign Fixture',
      passwordHash: 'x',
      roles: { create: [{ role: 'ALUMNI' }] },
    },
  });
  const foreignProfile = await prisma.alumniProfile.create({
    data: { userId: foreign.id, institutionId: otherInst.id, graduationYear: 2020 },
  });

  return {
    institutionId: institution.id,
    departmentId: department.id,
    programId: program.id,
    batchId: batch.id,
    officeUserId: office.id,
    aUserId: a.id,
    bUserId: b.id,
    profileA: profileA.id,
    profileB: profileB.id,
    otherInstitutionId: otherInst.id,
    foreignUserId: foreign.id,
    foreignProfileId: foreignProfile.id,
    tokenRows: [],
  };
}

function viewerFor(f: Fixtures, who: 'a' | 'b' | 'office' | 'foreign', connected: string[] = []): Viewer {
  const map = { a: f.aUserId, b: f.bUserId, office: f.officeUserId, foreign: f.foreignUserId };
  const inst = who === 'foreign' ? f.otherInstitutionId : f.institutionId;
  return {
    userId: map[who],
    institutionId: inst,
    isOffice: who === 'office',
    connectedUserIds: connected,
  };
}

async function teardown(f: Fixtures | null) {
  if (!f) return;
  const userIds = [f.aUserId, f.bUserId, f.officeUserId, f.foreignUserId];
  try {
    // Order is not negotiable: `user_roles` has no cascade, and profiles cascade to
    // skills/career/achievements/privacy. Programs and batches must go before the
    // institution.
    await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
    await prisma.notification.deleteMany({ where: { recipientUserId: { in: userIds } } });

    await prisma.alumniProfile.deleteMany({
      where: { id: { in: [f.profileA, f.profileB, f.foreignProfileId] } },
    });

    await prisma.batch.deleteMany({ where: { id: f.batchId } });
    await prisma.program.deleteMany({ where: { departmentId: { in: [f.departmentId] } } });
    await prisma.department.deleteMany({ where: { id: f.departmentId } });

    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.institution.deleteMany({ where: { id: { in: [f.institutionId, f.otherInstitutionId] } } });
  } catch (e) {
    // Best-effort: a cleanup failure must never mask a test failure. The pre-flight
    // sweep on the next run is the real safety net.
    console.log(`  (cleanup warning: ${(e as Error).message.split('\n')[0]})`);
  }
}

async function main() {
  const swept = await preflight();
  if (swept.profiles || swept.events) {
    console.log(`  (swept ${swept.profiles} profile(s) and ${swept.events} event(s) from a previous run)`);
  }

  let f: Fixtures | null = null;
  const made: { career: string[]; achievements: string[] } = { career: [], achievements: [] };

  try {
    f = await build();
    const a = viewerFor(f, 'a');
    const b = viewerFor(f, 'b');
    const office = viewerFor(f, 'office');
    const foreign = viewerFor(f, 'foreign');

    // ── Self view ─────────────────────────────────────────────────────────────
    section('self view');
    const self = await getProfileSelf(a);
    ok(self.id === f.profileA, 'returns the caller profile');
    ok(self.academic.batchId === f.batchId, 'academic carries the batch');
    ok(self.academic.graduationYear === 2019, 'graduation year present');
    ok(self.academic.batchGraduationYear === 2019, 'batch graduation year present');
    ok(self.academic.yearMismatch === false, 'no mismatch when they agree');
    ok(self.academic.authoritativeYear === 2019, 'authoritative year named');
    ok(self.privacy !== null, 'privacy row is returned unredacted to self');

    // ── Mismatch detection ─────────────────────────────────────────────────────
    section('graduation year vs batch');
    await updateProfile(a, { graduationYear: 2020 });
    const mismatched = await getProfileSelf(a);
    ok(mismatched.academic.graduationYear === 2020, 'the profile year is editable');
    ok(mismatched.academic.batchGraduationYear === 2019, 'the batch year is unchanged');
    ok(mismatched.academic.yearMismatch === true, 'the disagreement is flagged');
    ok(mismatched.academic.authoritativeYear === 2019, 'the batch wins for filtering');
    await updateProfile(a, { graduationYear: 2019 });
    ok((await getProfileSelf(a)).academic.yearMismatch === false, 'flag clears when they agree again');

    // ── Partial privacy updates ──────────────────────────────────────────────
    // Regression: the upsert's `create` branch supplies `?? default` for every
    // switch, so it is easy to assume the same defaults leak into the `update`
    // branch. If they did, `PUT { privacy: { showLinks: false } }` would silently
    // re-publish a hidden email and phone — the exact opposite of what the user
    // asked for, and invisible because the response echoes the new state.
    section('partial privacy updates');
    await updateProfile(a, {
      privacy: {
        showEmail: false,
        showPhone: false,
        showLocation: false,
        showCareer: false,
        showSkills: false,
        showLinks: true,
        discoverable: true,
        visibleTo: 'CONNECTIONS',
      },
    });
    // The point of the section: these must NOT be silently reset to a default.
    const oneSwitch = (await updateProfile(a, { privacy: { showLinks: false } })).privacy;
    ok(oneSwitch !== null, 'the privacy row is returned');
    if (!oneSwitch) throw new Error('privacy row vanished');
    ok(oneSwitch.showLinks === false, 'the sent switch is applied');
    ok(oneSwitch.showEmail === false, 'showEmail survives a showLinks-only patch');
    ok(oneSwitch.showPhone === false, 'showPhone survives a showLinks-only patch');
    ok(oneSwitch.showLocation === false, 'showLocation survives');
    ok(oneSwitch.showCareer === false, 'showCareer survives');
    ok(oneSwitch.showSkills === false, 'showSkills survives');
    ok(oneSwitch.visibleTo === 'CONNECTIONS', 'visibleTo survives a single-switch patch');

    // And the inverse: the row is created with defaults only when it does not exist,
    // so a first-ever privacy write must not inherit contact details.
    const noPrivacy = await prisma.alumniProfile.findFirst({
      where: { id: f.profileA },
      select: { id: true },
    });
    ok(noPrivacy !== null, 'profile A still exists for the fresh-row case');
    await prisma.alumniPrivacySettings.deleteMany({ where: { alumniProfileId: f.profileA } });
    const freshRow = (await updateProfile(a, { privacy: { showLinks: true } })).privacy;
    ok(freshRow !== null, 'a first privacy write creates the row');
    if (!freshRow) throw new Error('privacy row was not created');
    ok(freshRow.showLinks === true, 'a first privacy write applies what was sent');
    ok(freshRow.showEmail === false, 'a first privacy write defaults contact details OFF');
    ok(freshRow.showPhone === false, 'a first privacy write defaults phone OFF');

    // Restore the shape the visibility assertions below rely on.
    await updateProfile(a, {
      privacy: {
        showEmail: true,
        showPhone: true,
        showLocation: true,
        showCareer: true,
        showSkills: true,
        showLinks: true,
        discoverable: true,
        visibleTo: 'ANYONE',
      },
    });

    // ── Links ─────────────────────────────────────────────────────────────────
    section('links');
    const linked = await updateProfile(a, {
      links: {
        linkedinUrl: 'https://linkedin.com/in/fixture',
        githubUrl: '  https://github.com/fixture  ',
        websiteUrl: null,
      },
    });
    ok(linked.links.linkedinUrl === 'https://linkedin.com/in/fixture', 'linkedin stored');
    ok(linked.links.githubUrl === 'https://github.com/fixture', 'github trimmed');
    ok(linked.links.websiteUrl === null, 'a null link stays null');
    const blanked = await updateProfile(a, { links: { linkedinUrl: '   ' as any } });
    ok(blanked.links.linkedinUrl === null, 'a whitespace link becomes null, not an empty string');

    // ── Skills ────────────────────────────────────────────────────────────────
    section('skills');
    const skilled = await updateProfile(a, {
      skills: [
        { skill: 'Rust', level: 'EXPERT', yearsExperience: 8 },
        { skill: 'react', level: 'ADVANCED' },
      ],
    });
    ok(skilled.skills.length === 2, 'two skills stored');
    ok(skilled.skills.every((s) => s.level), 'every skill has a level');

    // yearsExperience must SURVIVE a re-save that omits it, or a client that does not
    // resend the field silently wipes the value the graduate typed.
    const resaved = await updateProfile(a, { skills: [{ skill: 'Rust', level: 'EXPERT' }] });
    ok(resaved.skills.length === 1, 'replacing the list works');
    ok(
      resaved.skills[0].yearsExperience === 8,
      `yearsExperience survives a re-save (got ${resaved.skills[0].yearsExperience})`,
    );

    const dupes = await updateProfile(a, { skills: [{ skill: 'Go' }, { skill: 'go' }, { skill: ' GO ' }] });
    ok(dupes.skills.length === 1, 'case-differing duplicate skills collapse to one');

    // ── Career ────────────────────────────────────────────────────────────────
    section('career');
    const c1 = await addCareerEntry(a, { title: 'Engineer', employerLabel: 'Acme', fromMonth: '2019-07' });
    made.career.push(c1.id);
    ok(c1.fromMonth === '2019-07', 'fromMonth round-trips as YYYY-MM');
    ok(c1.toMonth === null, 'an omitted toMonth is current');

    const c2 = await addCareerEntry(a, { title: 'Senior Engineer', employerLabel: 'Acme', fromMonth: '2022-01' });
    made.career.push(c2.id);
    const listed = await listCareer(a);
    const currents = listed.entries.filter((e) => e.isCurrent);
    ok(currents.length === 1, `exactly one current role (got ${currents.length})`);
    ok(currents[0].id === c2.id, 'the newest role is the current one');
    ok(
      listed.entries.find((e) => e.id === c1.id)?.toMonth === '2022-01',
      'the previous role was closed at the new start month',
    );

    // Promote c1 back to current: c2 must close.
    await updateCareerEntry(a, c1.id, { toMonth: null });
    const afterPromote = await listCareer(a);
    ok(
      afterPromote.entries.filter((e) => e.isCurrent).length === 1 &&
        afterPromote.entries.find((e) => e.isCurrent)?.id === c1.id,
      'promoting an older role demotes the current one',
    );

    // A current role cannot be back-dated to start after "now" — it would be a role that
    // begins in the future and never ends. `assertOrdering` cannot catch it because
    // `toMonth` is null, so the rule exists only in the demote path.
    let threw = '';
    try {
      await updateCareerEntry(a, c1.id, { fromMonth: '2099-01' });
    } catch (e) {
      threw = (e as Error).message;
    }
    ok(threw.length > 0, `a current role cannot start in the future (${threw.slice(0, 50)})`);

    let threw2 = '';
    try {
      await updateCareerEntry(a, c2.id, { fromMonth: '2023-01', toMonth: '2022-01' });
    } catch (e) {
      threw2 = (e as Error).message;
    }
    ok(threw2.length > 0, 'a backwards patch is rejected');

    // Adding a role that predates the current one must be refused rather than closing
    // the current role at a date before it started.
    let threw3 = '';
    try {
      await addCareerEntry(a, { title: 'Ancient', employerLabel: 'Old Co', fromMonth: '2001-01' });
    } catch (e) {
      threw3 = (e as Error).message;
    }
    ok(threw3.length > 0, `adding a role older than the current one is rejected (${threw3.slice(0, 40)})`);

    await setCareerHighlight(a, c1.id, true);
    ok((await listCareer(a)).entries.find((e) => e.id === c1.id)?.isHighlight === true, 'highlight can be set');

    // ── Career IDOR ───────────────────────────────────────────────────────────
    section('career IDOR');
    let idor = '';
    try {
      await updateCareerEntry(b, c1.id, { title: 'Hijacked' });
    } catch (e) {
      idor = (e as Error).message;
    }
    ok(idor.includes('not yours'), `a stranger cannot update another entry (${idor.slice(0, 40)})`);

    let idorDel = '';
    try {
      await removeCareerEntry(b, c1.id);
    } catch (e) {
      idorDel = (e as Error).message;
    }
    ok(idorDel.includes('not yours'), 'a stranger cannot delete another entry');
    ok((await listCareer(a)).entries.some((e) => e.id === c1.id), 'the entry survived both attempts');

    // Cross-tenant: same person id shape, different institution.
    let xTenant = '';
    try {
      await updateCareerEntry(foreign, c1.id, { title: 'Cross tenant' });
    } catch (e) {
      xTenant = (e as Error).message;
    }
    ok(xTenant.includes('not yours') || xTenant.includes('No alumni profile'), 'a foreign institution cannot reach the entry');

    // Office MAY correct somebody else's timeline — the one intentional exception.
    const fixed = await officeUpdateCareerEntry(office, c1.id, { toMonth: '2021-12' });
    ok(fixed.id === c1.id, 'the office can correct another profile career entry');
    let officeAsGrad = '';
    try {
      await officeUpdateCareerEntry(a, c1.id, { title: 'nope' });
    } catch (e) {
      officeAsGrad = (e as Error).message;
    }
    ok(officeAsGrad.toLowerCase().includes('office'), 'the office branch is refused for a graduate');

    // Regression: the office edit path did not enforce the exactly-one-current-role
    // invariant, so `{ toMonth: null }` from the office would re-open a closed role while
    // the graduate's genuinely current role stayed open — two rows both labelled
    // "Current". An office correcting a typo must not be able to invent a second job.
    section('office edit preserves one current role');
    const officeTimeline = await addCareerEntry(a, {
      title: 'Office Path Role',
      employerLabel: 'Fixture Employer',
      fromMonth: '2022-03',
    });
    let openNow = (await listCareer(a)).entries.filter((e) => e.isCurrent).length;
    ok(openNow === 1, 'exactly one current role before the office edit');

    await officeUpdateCareerEntry(office, officeTimeline.id, { toMonth: null as unknown as string });
    openNow = (await listCareer(a)).entries.filter((e) => e.isCurrent).length;
    ok(openNow === 1, 're-opening a closed role via the office demotes the outgoing one');

    // And closing through the office must not leave a stale open role behind.
    await officeUpdateCareerEntry(office, officeTimeline.id, { toMonth: '2023-08' });
    const afterOfficeClose = await listCareer(a);
    ok(afterOfficeClose.entries.filter((e) => e.isCurrent).length <= 1, 'office close does not create a second current role');

    // The self-service path made the same guarantee; assert both directions together so
    // a future refactor of either branch is caught by one invariant check.
    await updateCareerEntry(a, officeTimeline.id, { toMonth: null });
    ok((await listCareer(a)).entries.filter((e) => e.isCurrent).length === 1, 'owner re-open also demotes the outgoing role');
    await removeCareerEntry(a, officeTimeline.id);

    // ── Achievements ──────────────────────────────────────────────────────────
    section('achievements');
    const ach = await addAchievement(a, {
      title: 'Distinguished Speaker',
      kind: 'TALK',
      issuer: 'ACM',
      year: 2023,
      url: 'https://example.com/talk',
    });
    made.achievements.push(ach.id);
    ok(ach.isVerified === false, 'a new achievement starts unverified');

    let dupErr = '';
    try {
      await addAchievement(a, { title: 'Distinguished Speaker', kind: 'AWARD', year: 2023 });
    } catch (e) {
      dupErr = (e as Error).message;
    }
    ok(dupErr.length > 0, 'a duplicate (title, year) is refused');

    // Same title, different year is fine — the same talk repeats.
    const sameTalkLater = await addAchievement(a, { title: 'Distinguished Speaker', kind: 'TALK', year: 2024 });
    made.achievements.push(sameTalkLater.id);
    ok(!!sameTalkLater.id, 'the same title in a different year is allowed');

    // A NULL year does NOT collide in SQLite's unique index — two rows with the same
    // title and NULL year both insert — so the service's explicit pre-check is the only
    // thing preventing a duplicate. This is the assertion that proves it is there.
    await addAchievement(a, { title: 'No Year Award', kind: 'AWARD' });
    let nullYearDup = '';
    try {
      await addAchievement(a, { title: 'No Year Award', kind: 'AWARD' });
    } catch (e) {
      nullYearDup = (e as Error).message;
    }
    ok(
      nullYearDup.length > 0,
      'a duplicate title with a NULL year is refused by the explicit check, not just by the index',
    );

    // ── Verification ──────────────────────────────────────────────────────────
    section('achievement verification');
    let gradVerify = '';
    try {
      await setVerified(a, ach.id, true);
    } catch (e) {
      gradVerify = (e as Error).message;
    }
    ok(gradVerify.length > 0, `a graduate cannot verify their own achievement (${gradVerify.slice(0, 40)})`);

    const verified = await setVerified(office, ach.id, true);
    made.achievements.push(verified.id);
    ok(verified.isVerified === true, 'the office can verify');
    ok(verified.changed === true, 'the change is reported');

    const again = await setVerified(office, ach.id, true);
    ok(again.changed === false, 'verifying twice is a no-op');

    const unverified = await setVerified(office, ach.id, false);
    ok(unverified.isVerified === false, 'the office can un-verify');

    const queue = await verificationQueue(office);
    ok(queue.pending >= 1, `the queue lists unverified entries (${queue.pending})`);
    let gradQueue = '';
    try {
      await verificationQueue(a);
    } catch (e) {
      gradQueue = (e as Error).message;
    }
    ok(gradQueue.length > 0, 'a graduate cannot read the office queue');

    // Renaming strips verification — otherwise you could verify a title and then
    // rewrite it.
    await setVerified(office, ach.id, true);
    const renamed = await updateAchievement(a, ach.id, { title: 'Distinguished Speaker (2023)' });
    ok(renamed.demoted === true, 'renaming a verified entry demotes it');
    ok(renamed.isVerified === false, 'and it is no longer verified');

    // A non-title edit must NOT demote.
    await setVerified(office, ach.id, true);
    const descEdit = await updateAchievement(a, ach.id, { description: 'A talk about distributed systems' });
    ok(descEdit.demoted === false, 'editing the description keeps verification');
    ok(descEdit.isVerified === true, 'and it stays verified');

    // ── Achievement IDOR ──────────────────────────────────────────────────────
    section('achievement IDOR');
    let aIdor = '';
    try {
      await updateAchievement(b, ach.id, { title: 'Hijacked' });
    } catch (e) {
      aIdor = (e as Error).message;
    }
    ok(aIdor.includes('not yours'), 'a stranger cannot edit another achievement');

    let aDel = '';
    try {
      await removeAchievement(b, ach.id);
    } catch (e) {
      aDel = (e as Error).message;
    }
    ok(aDel.includes('not yours'), 'a stranger cannot delete another achievement');

    let verifyIdor = '';
    try {
      await setVerified(office, 'nonexistent-id', true);
    } catch (e) {
      verifyIdor = (e as Error).message;
    }
    ok(verifyIdor.length > 0, 'verifying a nonexistent achievement 404s');

    // ── Session revocation ────────────────────────────────────────────────────
    section('account security: session revocation');
    // Tokens are created directly rather than through `auth.login`: the fixture
    // password is a placeholder hash, and what is under test is the revocation logic,
    // which is entirely row-driven. The real bcrypt path is covered by
    // verify-profile-http.ts, which logs in as a seeded account.
    const future = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    const mkToken = async (userId: string) => {
      const raw = `fixture-${Math.random().toString(36).slice(2)}`;
      const row = await prisma.refreshToken.create({
        data: { userId, tokenHash: auth.sha256(raw), expiresAt: future },
      });
      f!.tokenRows.push(row.id);
      return row;
    };
    const s1 = await mkToken(f.aUserId);
    const s2 = await mkToken(f.aUserId);
    const s3 = await mkToken(f.aUserId);
    ok((await prisma.refreshToken.count({ where: { userId: f.aUserId, revokedAt: null } })) === 3, 'three live sessions');

    // Wrong password must not revoke anything.
    let wrongErr = '';
    try {
      await auth.changePassword(f.aUserId, 'not-the-password', 'NewPassw0rd!');
    } catch (e) {
      wrongErr = (e as Error).message;
    }
    ok(wrongErr.toLowerCase().includes('incorrect'), 'a wrong current password is rejected');
    ok(
      (await prisma.refreshToken.count({ where: { userId: f.aUserId, revokedAt: null } })) === 3,
      'a failed change revokes nothing',
    );

    // Hash a real password so the success path can run — `bcrypt.compare` is what rejects
    // the wrong one, and the fixture's placeholder hash would reject the right one too.
    // `bcryptjs` rather than `bcrypt`, matching auth.service.ts.
    const bcrypt = (await import('bcryptjs')).default;
    await prisma.user.update({
      where: { id: f.aUserId },
      data: { passwordHash: await bcrypt.hash('OriginalPass1!', 10) },
    });

    const result = await auth.changePassword(f.aUserId, 'OriginalPass1!', 'BrandNewPass1!', s3.id);
    ok(result.ok === true, 'the password change succeeds with the right current password');
    ok(result.revokedSessions === 2, `the other two sessions were revoked (got ${result.revokedSessions})`);
    ok(result.keptCurrentSession === true, 'the caller session was kept');

    const live = await prisma.refreshToken.findMany({
      where: { userId: f.aUserId, revokedAt: null },
      select: { id: true },
    });
    ok(live.length === 1 && live[0].id === s3.id, 'exactly one session survives, and it is the caller\'s');

    // Without keepTokenId, everything goes.
    const s4 = await mkToken(f.aUserId);
    void s4;
    const all = await auth.changePassword(f.aUserId, 'BrandNewPass1!', 'YetAnother1!', null);
    ok(all.revokedSessions >= 2, 'with no keepTokenId every session is revoked');
    ok(
      (await prisma.refreshToken.count({ where: { userId: f.aUserId, revokedAt: null } })) === 0,
      'and none survive',
    );

    section('account security: listing and revoke-all');
    const t1 = await mkToken(f.aUserId);
    const t2 = await mkToken(f.aUserId);
    const sessions = await auth.listSessions(f.aUserId, t2.id);
    ok(sessions.total === 2, `two live sessions listed (got ${sessions.total})`);
    ok(sessions.sessions.find((s) => s.id === t2.id)?.isCurrent === true, 'the current session is flagged');
    ok(sessions.sessions.find((s) => s.id === t1.id)?.isCurrent === false, 'the other is not');
    ok(typeof sessions.note === 'string', 'the no-device-info limitation is stated in the response');

    // An expired-but-unrevoked row is NOT a session.
    await prisma.refreshToken.update({
      where: { id: t1.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const afterExpiry = await auth.listSessions(f.aUserId, t2.id);
    ok(afterExpiry.total === 1, 'an expired token is not counted as a session');

    const revoked = await auth.revokeAllSessions(f.aUserId, t2.id);
    ok(revoked.revoked >= 1, 'revoke-all revokes the others');
    ok((await prisma.refreshToken.count({ where: { userId: f.aUserId, revokedAt: null } })) === 1, 'the caller survives');

    const resolveHit = await auth.resolveTokenId(f.aUserId, 'garbage');
    ok(resolveHit === null, 'an unknown token resolves to null');
    ok((await auth.resolveTokenId(f.aUserId, null)) === null, 'a missing token resolves to null');

    // ── Notification integration ──────────────────────────────────────────────
    section('notification category integrity');
    const { CATEGORIES } = await import('../src/modules/alumni/notifications/notifications.rules.js');
    ok(CATEGORIES.length === 8, 'the notification vocabulary is intact');
    ok(typeof notify === 'function', 'the delivery helper is importable');
  } finally {
    // Remove exactly what was created here, plus the fixtures.
    if (made.career.length) await prisma.alumniCareerEntry.deleteMany({ where: { id: { in: made.career } } });
    if (made.achievements.length) await prisma.alumniAchievement.deleteMany({ where: { id: { in: made.achievements } } });
    await teardown(f);
  }

  console.log(`\n==== ${pass} passed, ${fail} failed ====`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});

export type { Fixtures };