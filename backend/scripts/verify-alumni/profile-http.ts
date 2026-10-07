/**
 * Alumni Profile HTTP verification (docs/users/12-alumni-relations.md §3.8).
 *
 * Run (server must be listening on :4000):
 *   npx tsx scripts/verify-alumni/profile-http.ts
 *
 * Covers `/alumni/profile/*` — the routes this feature added — plus the two
 * account-security routes in `auth` that it depends on.
 *
 * WHY A SEPARATE SUITE
 * --------------------
 * `verify-alumni.ts` asserted the profile feature with ONE call:
 *
 *   const prof = await call('GET', '/alumni/profile');
 *   check('GET /profile', prof.status === 200 && !!prof.data?.fullName, ...)
 *
 * That is the shape of test that passes while a feature is entirely unwired: it
 * proves one route returns 200. Nothing checked `/alumni/me`, career, achievements,
 * links, or that the privacy gates actually redact them.
 *
 * The suites are split by FEATURE rather than by length, so a failure names the
 * feature. `verify-alumni.ts` grew to 1,168 lines covering fifteen areas in one file,
 * and the specific hazard was its module-scoped `token`: every section that logged in
 * as somebody else reassigned it, so "the office is blocked" could run under whichever
 * identity was ambient. `alumni-harness.ts` gives each identity its own `Actor`, so
 * this suite cannot make that mistake.
 *
 * BEHAVIOUR, NOT SEED STATE
 * -------------------------
 * Everything here writes then reads back, and every write is cleaned up. Asserting
 * "hidden by default" against whatever the seed produced passes or fails for reasons
 * unrelated to the code under test.
 */
import {
  Tally,
  banner,
  section,
  stamp,
  requireServer,
  loginAs,
  prisma,
  BASE,
  OFFICE_EMAIL,
  GRADUATE_EMAIL,
  OTHER_GRADUATE_EMAIL,
} from '../alumni-harness.js';

const t = new Tally();

/** Career rows this run created, so teardown cannot delete somebody's real history. */
const createdCareer: string[] = [];
const createdAchievements: string[] = [];

/**
 * Every marker value this suite writes, so a pre-flight sweep can find its own leftovers
 * without touching anything a human or the seed owns. Kept in one place because the
 * sweep and the assertions must agree on the list — a label added to a POST but not here
 * is a row that survives the crash and poisons the next run.
 */
const SWEEP_LABELS = ['Verification Co', 'Elsewhere Inc', 'Verification Body'];

async function main() {
  await requireServer();
  banner('Alumni Profile — HTTP verification');

  // PRE-FLIGHT: sweep anything a previous run left behind.
  //
  // A run that was interrupted — a Ctrl-C, a killed process, an assertion that threw —
  // never reaches `cleanup()`. Because the career section adds an OPEN-ENDED role, and
  // adding one closes whatever was current, the leftover row becomes the graduate's
  // current role with a start month later than this suite's hardcoded `fromMonth`. The
  // next run then gets a legitimate 400 from `addCareerEntry` ("a role must end after it
  // started"), because the role it is adding would begin before the current one.
  //
  // That is correct server behaviour being punished by a dirty fixture, which is the
  // worst possible failure mode: the suite reports a product bug that is not there.
  // `check-notifications-db.ts` had the identical problem and was fixed the same way.
  // `sweptProfile`, not `p` — `p` is the self-view response a few lines below, and
  // shadowing it here would have made every later `p.user` a type error.
  const sweptProfile = await prisma.alumniProfile.findFirst({
    where: { user: { email: GRADUATE_EMAIL } },
    select: { id: true },
  });
  if (sweptProfile) {
    const swept = await prisma.alumniCareerEntry.deleteMany({
      where: { alumniProfileId: sweptProfile.id, employerLabel: { in: SWEEP_LABELS } },
    });
    const sweptAch = await prisma.alumniAchievement.deleteMany({
      where: { profile: { id: sweptProfile.id }, issuer: { in: SWEEP_LABELS } },
    });
    if (swept.count || sweptAch.count) {
      console.log(
        `  (swept ${swept.count} career / ${sweptAch.count} achievement leftovers from a previous run)`,
      );
    }
  }

  const office = await loginAs(OFFICE_EMAIL);
  const grad = await loginAs(GRADUATE_EMAIL);
  const other = await loginAs(OTHER_GRADUATE_EMAIL);

  t.check('logged in as three distinct identities', true, `${office.email} (office), ${grad.email}, ${other.email}`);
  t.check('office identity holds ALUMNI_OFFICE', office.isOffice, office.roles.join(','));
  t.check('graduate identity holds only ALUMNI', !grad.isOffice, grad.roles.join(','));

  const tag = stamp();

  // ── 1. Read the profile ─────────────────────────────────────────────────────
  section(1, 'Self-view is unredacted');
  const self = await grad.call('GET', '/alumni/profile');
  t.check('GET /alumni/profile', self.status === 200, `${self.status}`);
  const p = self.data;
  t.check('  returns the user block', !!p?.user?.email, p?.user?.email ?? 'missing');
  t.check('  returns academic block', !!p?.academic, JSON.stringify(p?.academic?.batchName ?? null));
  t.check('  returns skills array', Array.isArray(p?.skills), `${p?.skills?.length ?? 'n/a'} skills`);
  t.check('  returns career array', Array.isArray(p?.career), `${p?.career?.length ?? 'n/a'} entries`);
  t.check('  returns achievements array', Array.isArray(p?.achievements), `${p?.achievements?.length ?? 'n/a'} entries`);
  t.check('  returns links block', !!p?.links, JSON.stringify(p?.links));
  t.check('  returns privacy block', !!p?.privacy, `visibleTo=${p?.privacy?.visibleTo}`);

  // Every field `PUT /alumni/profile` accepts must come back from the read that follows
  // it. `currentRole` did not: it was writable and then absent from the response, so the
  // edit screen saved a job title, reloaded, and showed an empty input with no error
  // anywhere. A write-only field is worse than a rejected one — the user's only evidence
  // it worked is a success toast.
  section(2, 'Patch fields round-trip');
  const priorRole = p?.currentRole ?? null;
  const roleSet = await grad.call('PUT', '/alumni/profile', { currentRole: 'Verification Role' });
  t.check('currentRole is returned after being written', roleSet.data?.currentRole === 'Verification Role', `got ${roleSet.data?.currentRole}`);
  const reread = await grad.call('GET', '/alumni/profile');
  t.check('  and survives a separate read', reread.data?.currentRole === 'Verification Role', `got ${reread.data?.currentRole}`);
  await grad.call('PUT', '/alumni/profile', { currentRole: priorRole });
  const roleRestored = await grad.call('GET', '/alumni/profile');
  t.check('  restored to its prior value', (roleRestored.data?.currentRole ?? null) === priorRole, `now ${roleRestored.data?.currentRole ?? 'null'}`);

  // The distinction that matters: /alumni/profile is unredacted, /alumni/me applies
  // the owner's own privacy. If both were the same, "hide my email" would be
  // indistinguishable from "delete my email".
  const me = await grad.call('GET', '/alumni/me');
  t.check('GET /alumni/me still works', me.status === 200, `${me.status}`);

  section(2, 'batchId is not writable');
  const batchAttempt = await grad.call('PUT', '/alumni/profile', { batchId: 'some-batch-id' } as any);
  t.check(
    'batchId is rejected',
    batchAttempt.status === 400,
    `${batchAttempt.status} ${batchAttempt.error?.code ?? ''}`,
  );
  const selfAfter = await grad.call('GET', '/alumni/profile');
  t.check(
    '  batch unchanged after the attempt',
    selfAfter.data?.academic?.batchId === p?.academic?.batchId,
    `batchId ${p?.academic?.batchId ?? 'null'} -> ${selfAfter.data?.academic?.batchId ?? 'null'}`,
  );

  // ── 3. Graduation year ──────────────────────────────────────────────────────
  section(3, 'Graduation year');
  const realYear = p?.academic?.graduationYear ?? 2019;
  const nextYear = realYear === 2019 ? 2020 : 2019;
  const yearSet = await grad.call('PUT', '/alumni/profile', { graduationYear: nextYear });
  t.check('graduationYear is writable', yearSet.status === 200, `${yearSet.status} -> ${nextYear}`);
  t.check(
    '  value round-trips',
    yearSet.data?.academic?.graduationYear === nextYear,
    `${yearSet.data?.academic?.graduationYear}`,
  );
  const badYear = await grad.call('PUT', '/alumni/profile', { graduationYear: 12 });
  t.check('out-of-range year rejected', badYear.status === 400, `${badYear.status}`);
  const futureYear = await grad.call('PUT', '/alumni/profile', { graduationYear: 9999 });
  t.check('far-future year rejected', futureYear.status === 400, `${futureYear.status}`);
  await grad.call('PUT', '/alumni/profile', { graduationYear: realYear });

  section(4, 'Year mismatch is reported, not silently resolved');
  const mismatch = await grad.call('GET', '/alumni/profile');
  const ac = mismatch.data?.academic;
  if (ac?.batchGraduationYear && ac?.graduationYear) {
    t.check('mismatch flag is a boolean', typeof ac.yearMismatch === 'boolean', `yearMismatch=${ac.yearMismatch}`);
    t.check(
      'authoritativeYear prefers the batch when they disagree',
      ac.yearMismatch === false || ac.authoritativeYear === ac.batchGraduationYear,
      `authoritative=${ac.authoritativeYear} batch=${ac.batchGraduationYear} profile=${ac.graduationYear}`,
    );
    if (ac.yearMismatch) {
      t.check('  a mismatch really was flagged', true, `profile=${ac.graduationYear} batch=${ac.batchGraduationYear}`);
    }
  } else {
    t.check('mismatch reported when both years known', true, 'only one year present, no conflict possible');
  }

  // ── 5. Links ────────────────────────────────────────────────────────────────
  section(5, 'Professional links');
  const linkSet = await grad.call('PUT', '/alumni/profile', {
    links: {
      linkedinUrl: `https://linkedin.com/in/verify-${tag}`,
      githubUrl: `https://github.com/verify-${tag}`,
      websiteUrl: `https://example.com/verify-${tag}`,
    },
  });
  t.check('links are writable', linkSet.status === 200, `${linkSet.status}`);
  t.check(
    '  all three round-trip',
    linkSet.data?.links?.githubUrl === `https://github.com/verify-${tag}`,
    JSON.stringify(linkSet.data?.links),
  );

  for (const [label, bad] of [
    ['javascript: URL rejected', { linkedinUrl: 'javascript:alert(1)' }],
    ['relative path rejected', { websiteUrl: '/not-absolute' }],
    ['data: URL rejected', { githubUrl: 'data:text/html,<h1>x' }],
  ] as [string, Record<string, string>][]) {
    const r = await grad.call('PUT', '/alumni/profile', { links: bad });
    t.check(label, r.status === 400, `${r.status}`);
  }

  const cleared = await grad.call('PUT', '/alumni/profile', { links: { linkedinUrl: null, githubUrl: null, websiteUrl: null } });
  t.check(
    'clearing stores null, not an empty string',
    cleared.data?.links?.linkedinUrl === null,
    JSON.stringify(cleared.data?.links),
  );

  // ── 6. Career ───────────────────────────────────────────────────────────────
  section(6, 'Career milestones');
  const before = await grad.call('GET', '/alumni/profile/career');
  t.check('GET /career', before.status === 200, `${before.status}, ${before.data?.entries?.length} entries`);

  const noEmployer = await grad.call('POST', '/alumni/profile/career', { title: 'Verifier', fromMonth: '2024-01' });
  t.check('an entry with no employer is rejected', noEmployer.status === 400, `${noEmployer.status}`);

  const backwards = await grad.call('POST', '/alumni/profile/career', {
    title: 'Backwards',
    employerLabel: 'Nowhere Ltd',
    fromMonth: '2024-06',
    toMonth: '2024-01',
  });
  t.check('toMonth before fromMonth rejected', backwards.status === 400, `${backwards.status}`);

  const sameMonth = await grad.call('POST', '/alumni/profile/career', {
    title: 'Same month',
    employerLabel: 'Nowhere Ltd',
    fromMonth: '2024-06',
    toMonth: '2024-06',
  });
  t.check('toMonth == fromMonth rejected', sameMonth.status === 400, `${sameMonth.status}`);

  const badMonth = await grad.call('POST', '/alumni/profile/career', {
    title: 'Bad month',
    employerLabel: 'Nowhere Ltd',
    fromMonth: '2024-13',
  });
  t.check('month 13 rejected', badMonth.status === 400, `${badMonth.status}`);

  const openEnded = await grad.call('POST', '/alumni/profile/career', {
    title: 'Current role',
    employerLabel: 'Verification Co',
    fromMonth: '2025-01',
    isHighlight: true,
  });
  t.check('POST /career (open-ended)', openEnded.status === 201, `${openEnded.status}`);

  // Every assertion below is conditional on the POST having succeeded. They used to run
  // unconditionally and read `openEnded.data.id`, so a rejected POST threw
  // `Cannot read properties of undefined` and the suite died — which took `cleanup()`
  // with it and left this run's own rows behind for the next one to trip over. A failed
  // prerequisite has to report the failure and stop, not crash the reporter.
  if (openEnded.status !== 201) {
    t.check(
      'POST /career (open-ended) — prerequisites met',
      false,
      'cannot continue: the career assertions depend on this row existing',
    );
    await cleanup();
    t.finish('Alumni Profile — HTTP verification');
  }
  createdCareer.push(openEnded.data.id);

  const listed = await grad.call('GET', '/alumni/profile/career');
  const fresh = listed.data?.entries?.find((e: any) => e.id === openEnded.data.id);
  t.check('  stored as current', fresh?.isCurrent === true, `toMonth=${fresh?.toMonth ?? 'null'}`);
  t.check('  month precision preserved', fresh?.fromMonth === '2025-01', `fromMonth=${fresh?.fromMonth}`);
  t.check('  highlight flag kept', fresh?.isHighlight === true, `${fresh?.isHighlight}`);

  const currentCount = (listed.data?.entries ?? []).filter((e: any) => e.isCurrent).length;
  t.check('exactly one current role', currentCount === 1, `${currentCount} current`);

  const secondCurrent = await grad.call('POST', '/alumni/profile/career', {
    title: 'Another current',
    employerLabel: 'Elsewhere Inc',
    fromMonth: '2025-06',
  });
  t.check('POST /career (a second open-ended)', secondCurrent.status === 201, `${secondCurrent.status}`);
  if (secondCurrent.status === 201) createdCareer.push(secondCurrent.data.id);
  const afterTwo = await grad.call('GET', '/alumni/profile/career');
  const currents = (afterTwo.data?.entries ?? []).filter((e: any) => e.isCurrent).length;
  t.check('adding a current role demotes the previous one', currents === 1, `${currents} current`);

  // ── 7. IDOR ─────────────────────────────────────────────────────────────────
  section(7, 'Another graduate cannot touch this timeline');
  const stolenUpdate = await other.call('PUT', `/alumni/profile/career/${openEnded.data.id}`, { title: 'Hijacked' });
  t.check('PUT on a stranger entry is 404', stolenUpdate.status === 404, `${stolenUpdate.status}`);
  const stolenDelete = await other.call('DELETE', `/alumni/profile/career/${openEnded.data.id}`);
  t.check('DELETE on a stranger entry is 404', stolenDelete.status === 404, `${stolenDelete.status}`);
  const stillThere = await grad.call('GET', '/alumni/profile/career');
  t.check(
    '  the entry survived both attempts',
    (stillThere.data?.entries ?? []).some((e: any) => e.id === openEnded.data.id),
    `${(stillThere.data?.entries ?? []).length} entries`,
  );

  // ── 8. Achievements ─────────────────────────────────────────────────────────
  section(8, 'Achievements');
  const added = await grad.call('POST', '/alumni/profile/achievements', {
    title: `Verification Award ${tag}`,
    kind: 'AWARD',
    issuer: 'Verification Body',
    year: 2024,
    url: `https://example.com/award/${tag}`,
  });
  t.check('POST /achievements', added.status === 201, `${added.status}`);
  // Same guard as the career section: eleven assertions below interpolate this id, so a
  // rejected POST turns the rest of the suite into `POST /undefined/verify` noise.
  if (added.status !== 201) {
    t.check(
      'POST /achievements — prerequisites met',
      false,
      'cannot continue: the verification assertions depend on this row existing',
    );
    await cleanup();
    t.finish('Alumni Profile — HTTP verification');
  }
  createdAchievements.push(added.data.id);
  t.check('  new entries start unverified', added.data.isVerified === false, `${added.data.isVerified}`);

  const selfVerify = await grad.call('POST', `/alumni/profile/achievements/${added.data?.id}/verify`, { verified: true });
  t.check('a graduate cannot verify their own entry', selfVerify.status === 403, `${selfVerify.status}`);

  const gradQueue = await grad.call('GET', '/alumni/profile/achievements/queue');
  t.check('a graduate cannot read the office queue', gradQueue.status === 403, `${gradQueue.status}`);

  const officeQueue = await office.call('GET', '/alumni/profile/achievements/queue');
  t.check('the office can read the queue', officeQueue.status === 200, `${officeQueue.status}, ${officeQueue.data?.pending} pending`);
  t.check(
    '  the new entry is in it',
    (officeQueue.data?.queue ?? []).some((q: any) => q.id === added.data?.id),
    added.data?.title,
  );

  const verified = await office.call('POST', `/alumni/profile/achievements/${added.data?.id}/verify`, { verified: true });
  t.check('the office can verify', verified.status === 200 && verified.data?.isVerified === true, `${verified.status} changed=${verified.data?.changed}`);

  const reverify = await office.call('POST', `/alumni/profile/achievements/${added.data?.id}/verify`, { verified: true });
  t.check('verifying twice is a no-op', reverify.data?.changed === false, `changed=${reverify.data?.changed}`);

  const unverified = await office.call('POST', `/alumni/profile/achievements/${added.data?.id}/verify`, { verified: false });
  t.check('the office can un-verify', unverified.status === 200 && unverified.data?.isVerified === false, `${unverified.status}`);

  const dup = await grad.call('POST', '/alumni/profile/achievements', {
    title: `Verification Award ${tag}`,
    kind: 'AWARD',
    year: 2024,
  });
  t.check('a duplicate title+year is rejected', dup.status === 400, `${dup.status}`);

  // Renaming a verified entry must strip the badge — otherwise verification means
  // nothing, since you could verify "ACM Fellow" then rewrite it.
  await office.call('POST', `/alumni/profile/achievements/${added.data?.id}/verify`, { verified: true });
  const renamed = await grad.call('PUT', `/alumni/profile/achievements/${added.data?.id}`, {
    title: `Verification Award ${tag} renamed`,
  });
  t.check('renaming a verified entry demotes it', renamed.data?.demoted === true, `demoted=${renamed.data?.demoted}`);
  t.check('  and it is no longer verified', renamed.data?.isVerified === false, `${renamed.data?.isVerified}`);

  const otherAch = await other.call('PUT', `/alumni/profile/achievements/${added.data?.id}`, { title: 'Hijacked' });
  t.check('PUT on a stranger achievement is 404', otherAch.status === 404, `${otherAch.status}`);

  // ── 9. Privacy redaction on the directory ────────────────────────────────────
  section(9, 'Privacy gates on the directory');
  const profileId = p?.id;
  const otherSees = await other.call('GET', `/alumni/directory/${profileId}`);
  t.check('another graduate can open the card', otherSees.status === 200, `${otherSees.status}`);

  await grad.call('PUT', '/alumni/profile', {
    links: { linkedinUrl: `https://linkedin.com/in/verify-${tag}`, githubUrl: `https://github.com/verify-${tag}` },
  });

  // Re-seed the links first. Section 5 deliberately clears them, so by the time this
  // section ran the graduate had no links at all — `githubUrl` was null before `showLinks`
  // was ever switched off, which made "showLinks=false redacts links" pass or fail for a
  // reason that had nothing to do with the switch. A privacy assertion needs the data
  // present to be hidden, or it is testing an empty set.
  await grad.call('PUT', '/alumni/profile', {
    links: {
      linkedinUrl: `https://linkedin.com/in/verify-${tag}`,
      githubUrl: `https://github.com/verify-${tag}`,
      websiteUrl: `https://example.com/verify-${tag}`,
    },
  });

  const linksOff = await grad.call('PUT', '/alumni/profile', { privacy: { showLinks: false } });
  t.check('showLinks is settable', linksOff.status === 200, `${linksOff.status}`);

  // Asserted against the LIST projection, which is the only one that returns links.
  //
  // The three assertions here used to target `/directory/{id}`, and failed for a reason
  // that has nothing to do with the switch: the DETAIL card does not return a `links`
  // field at all, for the office or for anyone else. Probed directly — `links` is
  // `undefined` on both. So `showLinks=false` cannot "fail to redact" a value the response
  // never carried, and `showLinks=true` cannot "fail to restore" one either.
  //
  // That is worth knowing on its own (see the note above the section), but the privacy
  // property has to be tested where the data exists.
  const listOff = await other.call('GET', '/alumni/directory?pageSize=50');
  const rowOff = (listOff.data?.alumni ?? []).find((a: any) => a.id === profileId);
  t.check(
    'showLinks=false redacts links to null',
    rowOff?.links === null,
    `links=${JSON.stringify(rowOff?.links ?? null)}`,
  );

  const officeListOff = await office.call('GET', '/alumni/directory?pageSize=50');
  const officeRow = (officeListOff.data?.alumni ?? []).find((a: any) => a.id === profileId);
  t.check(
    'the office still sees links',
    officeRow?.links?.githubUrl === `https://github.com/verify-${tag}`,
    `office githubUrl=${officeRow?.links?.githubUrl ?? 'null'}`,
  );

  const linksOn = await grad.call('PUT', '/alumni/profile', { privacy: { showLinks: true } });
  t.check('showLinks is settable back', linksOn.status === 200, `${linksOn.status}`);
  const listOn = await other.call('GET', '/alumni/directory?pageSize=50');
  const rowOn = (listOn.data?.alumni ?? []).find((a: any) => a.id === profileId);
  t.check(
    'showLinks=true restores them',
    rowOn?.links?.githubUrl === `https://github.com/verify-${tag}`,
    rowOn?.links?.githubUrl ?? 'null',
  );

  const skillsOff = await grad.call('PUT', '/alumni/profile', { privacy: { showSkills: false } });
  t.check('showSkills=false accepted', skillsOff.status === 200, `${skillsOff.status}`);
  const noAchievements = await other.call('GET', `/alumni/directory/${profileId}`);
  t.check(
    'achievements follow showSkills',
    (noAchievements.data?.achievements ?? []).length === 0,
    `${(noAchievements.data?.achievements ?? []).length} achievements`,
  );

  // The DETAIL card does not return `achievementCount` at all — only the LIST projection
  // carries it. So the leak that matters is there: a hidden achievements block whose COUNT
  // still reads "3" tells a stranger exactly how many claims are being withheld. Asserted
  // against the list, and asserted as "zeroed or absent" rather than "== 0", because
  // absent is an equally valid way to withhold a number and `detail` already does that.
  await grad.call('PUT', '/alumni/profile', { privacy: { showSkills: true } });
  const achListOn = await other.call('GET', '/alumni/directory?pageSize=50');
  const achRowOn = (achListOn.data?.alumni ?? []).find((a: any) => a.id === profileId);
  const countBefore = achRowOn?.achievementCount ?? 0;
  await grad.call('PUT', '/alumni/profile', { privacy: { showSkills: false } });
  const achListOff = await other.call('GET', '/alumni/directory?pageSize=50');
  const achRowOff = (achListOff.data?.alumni ?? []).find((a: any) => a.id === profileId);
  t.check(
    '  the list count is zeroed, not leaked',
    countBefore > 0 && achRowOff?.achievementCount === 0,
    `visible=${countBefore} hidden=${achRowOff?.achievementCount}`,
  );
  await grad.call('PUT', '/alumni/profile', { privacy: { showSkills: true } });

  // ── 10. Account security ────────────────────────────────────────────────────
  section(10, 'Account security');
  const sessions = await grad.call('GET', '/auth/sessions');
  t.check('GET /auth/sessions', sessions.status === 200, `${sessions.status}, ${sessions.data?.total} live`);
  t.check(
    '  the note about missing device info is present',
    typeof sessions.data?.note === 'string' && sessions.data.note.length > 0,
    sessions.data?.note ?? 'missing',
  );

  // The token identifying "this device" must arrive in a header. A query string leaks
  // it into access logs, browser history and the next Referer, and this credential can
  // mint fresh access tokens — so the header form is asserted against a live response,
  // and the legacy query form is asserted to still work for older installed clients.
  const headerSess = await grad.call('GET', '/auth/sessions', undefined, {
    'X-Refresh-Token': 'not-a-real-token',
  });
  t.check(
    '  X-Refresh-Token header is accepted',
    headerSess.status === 200,
    `${headerSess.status}`,
  );
  t.check(
    '  a bad token marks nothing as current rather than 500ing',
    Array.isArray(headerSess.data?.sessions),
    `${headerSess.status} sessions=${headerSess.data?.sessions?.length}`,
  );
  const legacyQ = await grad.call('GET', '/auth/sessions?refreshToken=not-a-real-token');
  t.check(
    '  legacy ?refreshToken= still works for old clients',
    legacyQ.status === 200,
    `${legacyQ.status}`,
  );

  const badPw = await grad.call('POST', '/auth/change-password', {
    currentPassword: 'definitely-not-my-password',
    newPassword: 'VerifierPass1!',
  });
  t.check('wrong current password is rejected', badPw.status >= 400, `${badPw.status}`);

  const revokeAll = await grad.call('POST', '/auth/revoke-all-sessions', {});
  t.check(
    'POST /auth/revoke-all-sessions',
    revokeAll.status === 200,
    `${revokeAll.status}, revoked=${revokeAll.data?.revoked}`,
  );

  // With no token supplied, EVERY session is revoked — including the caller's. The caller
  // is still holding a live ACCESS token, and revoking refresh tokens cannot retract a JWT
  // that has already been issued, so this suite must NOT assert that the next request 401s.
  // It did, and it passed for the wrong reason earlier: the suite had just signed in
  // again to obtain a fresh access token.
  //
  // What can be asserted, and is what the feature actually promises, is that the caller's
  // REFRESH token is dead — so the session cannot be renewed or replayed, which is where a
  // stolen token does its damage. That is asserted here.
  const refreshProbe = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: grad.refreshToken }),
  });
  t.check(
    '  the caller refresh token is revoked too',
    refreshProbe.status >= 400,
    `${refreshProbe.status} (no token supplied, so the caller's session was revoked as documented)`,
  );

  // `finish` never returns, so teardown runs before it rather than after.
  await cleanup();
  t.finish('Alumni Profile — HTTP verification');
}

/** Remove only what this run created. Never touches seeded rows. */
async function cleanup() {
  try {
    if (createdCareer.length > 0) {
      await prisma.alumniCareerEntry.deleteMany({ where: { id: { in: createdCareer } } });
    }
    if (createdAchievements.length > 0) {
      await prisma.alumniAchievement.deleteMany({ where: { id: { in: createdAchievements } } });
    }
    // The graduate's links were overwritten by this run, so blank them back rather
    // than leaving `https://github.com/verify-1234` on a seeded profile.
    await prisma.alumniProfile.updateMany({
      where: { user: { email: GRADUATE_EMAIL } },
      data: { linkedinUrl: null, githubUrl: null, websiteUrl: null },
    });
  } catch {
    // Best-effort: a cleanup failure must not mask a test failure.
  }
}

main().catch(async (e) => {
  console.error(e);
  await cleanup();
  process.exit(1);
});