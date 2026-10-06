/**
 * DB-free checks for the Alumni Profile feature
 * (docs/users/12-alumni-relations.md §3.8).
 *
 * No server, no database. These are the pure contracts: Zod schemas, the visibility
 * truth table, the month helpers, and the cross-module agreement that only breaks
 * silently.
 *
 * WHY THE VISIBILITY TABLE IS HERE AND NOT IN THE DB SUITE
 * -------------------------------------------------------
 * `visibilityFor` is a pure function of (viewer, target) — it never touches the
 * database. That makes it the single most valuable thing to test here: it is the one
 * place that decides whether a graduate's email, phone, location, career, skills,
 * links and achievements are visible, and getting it wrong leaks PII. A DB-backed test
 * would need three seeded profiles and a dozen HTTP calls to assert what a truth table
 * states in forty rows.
 *
 * The property that matters most: SELF and OFFICE always see everything. If that ever
 * regressed, a graduate could not edit what they are not allowed to see — which is the
 * comment the function has carried since it was written.
 *
 * THE THING THAT ROTTED BEFORE
 * -----------------------------
 * The two desks disagreed about the same fields. The alumni screen had its own
 * `TYPE_META`/visibility guesses, and `getProfileDetail` and `listDirectory` shaped
 * rows separately, so it was entirely possible to add `showLinks` to the privacy table
 * and have the directory ignore it. `check-notifications.ts` asserts the equivalent
 * thing for notification types; the last section here does it for these fields.
 */
import {
  SKILL_LEVELS,
  ACHIEVEMENT_KINDS,
  achievementSchema,
  achievementUpdateSchema,
  achievementVerifySchema,
  careerEntrySchema,
  careerUpdateSchema,
  idParamSchema,
  linksSchema,
  privacySchema,
  updateProfileSchema,
} from '../src/modules/alumni/profile/profile.schemas.js';
import { monthStart, monthLabel } from '../src/modules/alumni/profile/career.service.js';
import { visibilityFor } from '../src/modules/alumni/directory.service.js';
import { readFileSync } from 'node:fs';

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

// ── Link validation ────────────────────────────────────────────────────────────
section('professional links');
ok(linksSchema.safeParse({}).success, 'an empty links object is valid');
ok(linksSchema.safeParse({ linkedinUrl: 'https://linkedin.com/in/x' }).success, 'a https LinkedIn URL is accepted');
ok(linksSchema.safeParse({ websiteUrl: 'http://example.com' }).success, 'http is accepted');
ok(
  linksSchema.safeParse({ linkedinUrl: 'https://linkedin.com/in/x', githubUrl: null, websiteUrl: undefined }).success,
  'null and undefined both clear a field',
);

// The reason validation is by scheme and not by host.
ok(
  linksSchema.safeParse({ websiteUrl: 'https://any-domain.example/page' }).success,
  'a website may be on any host — no allowlist, or half the alumni are excluded',
);
ok(
  linksSchema.safeParse({ linkedinUrl: 'https://www.linkedin.com/in/x' }).success,
  'www. variants are accepted',
);

// The reason it exists at all.
for (const bad of [
  'javascript:alert(1)',
  'data:text/html,<script>x</script>',
  'file:///etc/passwd',
  'ftp://example.com',
  '/relative/path',
  'example.com',
  'https://',
  '   ',
]) {
  ok(!linksSchema.safeParse({ websiteUrl: bad }).success, `rejected: ${JSON.stringify(bad)}`);
}
ok(!linksSchema.safeParse({ websiteUrl: `https://example.com/${'x'.repeat(400)}` }).success, 'an over-long URL is rejected');
ok(!linksSchema.safeParse({ unknownField: 'https://x.com' }).success, 'an unknown link key is rejected (strict)');

// ── Skills ─────────────────────────────────────────────────────────────────────
section('skills');
for (const level of SKILL_LEVELS) {
  ok(
    updateProfileSchema.safeParse({ skills: [{ skill: 'Rust', level }] }).success,
    `level ${level} is accepted`,
  );
}
ok(
  !updateProfileSchema.safeParse({ skills: [{ skill: 'Rust', level: 'GODLIKE' }] }).success,
  'an invented level is rejected',
);
ok(
  updateProfileSchema.safeParse({ skills: [{ skill: 'Rust', yearsExperience: 12 }] }).success,
  'yearsExperience is accepted',
);
ok(
  !updateProfileSchema.safeParse({ skills: [{ skill: 'Rust', yearsExperience: -1 }] }).success,
  'negative yearsExperience is rejected',
);
ok(
  !updateProfileSchema.safeParse({ skills: [{ skill: 'Rust', yearsExperience: 900 }] }).success,
  'absurd yearsExperience is rejected',
);
ok(!updateProfileSchema.safeParse({ skills: [{ skill: '' }] }).success, 'an empty skill name is rejected');
ok(
  !updateProfileSchema.safeParse({ skills: Array.from({ length: 31 }, () => ({ skill: 'x' })) }).success,
  'more than 30 skills is rejected',
);

// ── The profile patch ──────────────────────────────────────────────────────────
section('profile patch');
ok(updateProfileSchema.safeParse({}).success, 'an empty patch is valid — a PATCH must allow "change nothing"');
ok(updateProfileSchema.safeParse({ headline: 'Staff Engineer' }).success, 'headline accepted');
ok(!updateProfileSchema.safeParse({ headline: 'x'.repeat(200) }).success, 'an over-long headline is rejected');
ok(updateProfileSchema.safeParse({ bio: null }).success, 'null clears the bio');
ok(updateProfileSchema.safeParse({ companyId: null }).success, 'null clears the company');
ok(!updateProfileSchema.safeParse({ companyId: '' }).success, 'an empty-string companyId is rejected, not treated as "clear"');

// The decision that must not drift.
ok(
  !updateProfileSchema.safeParse({ batchId: 'abc' }).success,
  'batchId is NOT writable — the registrar owns it',
);
ok(
  Object.keys((updateProfileSchema as any).shape ?? {}).every((k) => k !== 'batchId'),
  'batchId is absent from the schema shape entirely',
);

// Graduation year IS writable, and bounded.
for (const y of [1950, 2019, 2100]) {
  ok(updateProfileSchema.safeParse({ graduationYear: y }).success, `graduationYear ${y} accepted`);
}
for (const y of [1949, 2101, 0, -5]) {
  ok(!updateProfileSchema.safeParse({ graduationYear: y }).success, `graduationYear ${y} rejected`);
}
ok(
  updateProfileSchema.safeParse({ graduationYear: '2019' }).success,
  'a numeric string coerces (query/form encoding)',
);
ok(updateProfileSchema.safeParse({ graduationYear: 2019.5 }).success === false, 'a fractional year is rejected');

section('privacy');
for (const key of ['showEmail', 'showPhone', 'showLocation', 'showCareer', 'showSkills', 'showLinks', 'discoverable'] as const) {
  ok(privacySchema.safeParse({ [key]: true }).success, `${key} accepted`);
  ok(!privacySchema.safeParse({ [key]: 'yes' }).success, `${key} must be a boolean`);
}
for (const v of ['ANYONE', 'CONNECTIONS', 'OFFICE']) {
  ok(privacySchema.safeParse({ visibleTo: v }).success, `visibleTo ${v} accepted`);
}
ok(!privacySchema.safeParse({ visibleTo: 'EVERYBODY' }).success, 'an invented visibleTo is rejected');

// ── Career ─────────────────────────────────────────────────────────────────────
section('career entries');
ok(
  careerEntrySchema.safeParse({ title: 'Engineer', employerLabel: 'Acme', fromMonth: '2024-01' }).success,
  'a minimal entry is accepted',
);
ok(
  careerEntrySchema.safeParse({ title: 'Engineer', employerLabel: 'Acme', fromMonth: '2024-01', toMonth: null }).success,
  'an explicit null toMonth means "current"',
);
for (const bad of ['2024-13', '2024-00', '2024-1', '24-01', '2024', 'January 2024', '']) {
  ok(!careerEntrySchema.safeParse({ title: 'E', employerLabel: 'A', fromMonth: bad }).success, `fromMonth rejected: ${JSON.stringify(bad)}`);
}
ok(
  careerEntrySchema.safeParse({ title: 'E', employerLabel: 'A', fromMonth: '2024-01', toMonth: '2025-01' }).success,
  'a well-ordered range is accepted',
);
ok(!careerEntrySchema.safeParse({}).success, 'an empty entry is rejected');
ok(careerUpdateSchema.safeParse({}).success, 'an empty UPDATE is valid — a PATCH must allow "change nothing"');
ok(careerUpdateSchema.safeParse({ title: 'New title' }).success, 'a partial update is accepted');

section('month helpers are inverse');
for (const m of ['2024-01', '2024-06', '2024-12', '1999-09']) {
  const d = monthStart(m);
  ok(d.getUTCDate() === 1, `${m} lands on the 1st`);
  ok(d.getUTCMonth() === Number(m.slice(5)) - 1, `${m} has the right month`);
  ok(monthLabel(d) === m, `${m} round-trips (got ${monthLabel(d)})`);
}
ok(monthLabel(null) === null, 'null in, null out');
ok(monthLabel(undefined) === null, 'undefined in, null out');

// ── Achievements ───────────────────────────────────────────────────────────────
section('achievements');
for (const kind of ACHIEVEMENT_KINDS) {
  ok(achievementSchema.safeParse({ title: 'ACM Fellow', kind }).success, `kind ${kind} accepted`);
}
ok(!achievementSchema.safeParse({ title: 'X', kind: 'Trophy' }).success, 'an invented kind is rejected');
ok(achievementSchema.safeParse({ title: 'Award', kind: 'AWARD', year: null }).success, 'a null year is accepted');
ok(!achievementSchema.safeParse({ title: 'Award', kind: 'AWARD', year: 3000 }).success, 'an out-of-range year is rejected');
ok(achievementSchema.safeParse({ title: 'Award', kind: 'AWARD', url: 'https://x.com/p' }).success, 'a url is accepted');
ok(!achievementSchema.safeParse({ title: 'Award', kind: 'AWARD', url: 'javascript:1' }).success, 'a javascript: url is rejected');

// The most important structural assertion here.
ok(
  !('isVerified' in (achievementSchema as any).shape),
  'a graduate cannot SET isVerified through the create schema',
);
ok(
  !('verifiedByUserId' in (achievementSchema as any).shape),
  'a graduate cannot set the verifier stamp',
);
ok(
  !('verifiedAt' in (achievementSchema as any).shape),
  'a graduate cannot set the verification time',
);
ok(achievementUpdateSchema.safeParse({}).success, 'an empty achievement update is valid');
ok(!achievementVerifySchema.safeParse({}).success, 'verify requires an explicit boolean');
ok(!achievementVerifySchema.safeParse({ verified: 'true' }).success, 'verify rejects a string');
ok(idParamSchema.safeParse({ id: 'abc' }).success, 'a cuid-shaped id is accepted');
ok(!idParamSchema.safeParse({}).success, 'a missing id is rejected');

// ── The visibility truth table ─────────────────────────────────────────────────
section('visibility truth table');

const full = {
  showEmail: true,
  showPhone: true,
  showLocation: true,
  showCareer: true,
  showSkills: true,
  showLinks: true,
  discoverable: true,
  visibleTo: 'ANYONE',
};
const closed = { ...full, showEmail: false, showPhone: false, showLinks: false, showSkills: false, visibleTo: 'CONNECTIONS' };

const office = { userId: 'office', institutionId: 'i1', isOffice: true, connectedUserIds: [] as string[] };
const stranger = { userId: 'stranger', institutionId: 'i1', isOffice: false, connectedUserIds: [] as string[] };
const friend = { userId: 'friend', institutionId: 'i1', isOffice: false, connectedUserIds: ['target'] };

// SELF and OFFICE must see everything — the invariant that makes editing possible.
const asSelf = visibilityFor({ userId: 'target', institutionId: 'i1', isOffice: false, connectedUserIds: [] }, { userId: 'target', privacy: closed });
for (const k of ['email', 'phone', 'location', 'career', 'skills', 'links', 'achievements'] as const) {
  ok(asSelf[k] === true, `SELF sees ${k} even with the switch off`);
}
ok(asSelf.reason === 'SELF', 'SELF reason');

const asOffice = visibilityFor(office, { userId: 'target', privacy: closed });
for (const k of ['email', 'phone', 'location', 'career', 'skills', 'links', 'achievements'] as const) {
  ok(asOffice[k] === true, `OFFICE sees ${k}`);
}
ok(asOffice.reason === 'OFFICE', 'OFFICE reason');

// No privacy row at all means nothing is consented to.
const noSettings = visibilityFor(stranger, { userId: 'target', privacy: null });
for (const k of ['email', 'phone', 'location', 'career', 'skills', 'links', 'achievements'] as const) {
  ok(noSettings[k] === false, `NO_SETTINGS hides ${k} — a profile created before the settings row must not leak`);
}
ok(noSettings.reason === 'NO_SETTINGS', 'NO_SETTINGS reason');

// The contact-details default: off unless explicitly turned on.
const contactOff = visibilityFor(stranger, { userId: 'target', privacy: { ...full, showEmail: false, showPhone: false } });
ok(contactOff.email === false, 'email stays hidden when showEmail is false');
ok(contactOff.phone === false, 'phone stays hidden when showPhone is false');
ok(contactOff.skills === true, 'skills stay visible — they are not contact details');

// visibleTo=CONNECTIONS gates the CONTACT fields only.
const conn = visibilityFor(friend, { userId: 'target', privacy: closed });
ok(conn.email === false, 'a connected viewer still respects showEmail=false');
const connOpen = visibilityFor(friend, { userId: 'target', privacy: { ...full, visibleTo: 'CONNECTIONS' } });
ok(connOpen.email === true, 'a connected viewer sees email when showEmail is on');
const notConnected = visibilityFor(stranger, { userId: 'target', privacy: { ...full, visibleTo: 'CONNECTIONS' } });
ok(notConnected.email === false, 'an unconnected viewer cannot see email under CONNECTIONS');
ok(notConnected.location === true, '  but location is not a contact field and stays visible');
ok(notConnected.reason === 'CONNECTIONS', '  reason names the scope that blocked it');

// The two deliberate asymmetries, asserted so they cannot be "tidied" away.
const linksHidden = visibilityFor(stranger, { userId: 'target', privacy: { ...full, showLinks: false } });
ok(linksHidden.links === false, 'showLinks=false hides links from a stranger');
const linksConnectionsOnly = visibilityFor(stranger, { userId: 'target', privacy: { ...full, visibleTo: 'CONNECTIONS' } });
ok(
  linksConnectionsOnly.links === true,
  'links are NOT gated by visibleTo — a professional URL is public by nature, not contact data',
);
ok(
  visibilityFor(friend, { userId: 'target', privacy: { ...full, visibleTo: 'CONNECTIONS', showLinks: false } }).links === false,
  '  and showLinks still governs them for a connected viewer',
);

const skillsOff = visibilityFor(stranger, { userId: 'target', privacy: { ...full, showSkills: false } });
ok(skillsOff.achievements === false, 'achievements follow showSkills, not their own switch');
ok(skillsOff.skills === false, 'showSkills=false hides skills');

// A row written before showLinks existed must default to VISIBLE, not hidden.
const legacyRow = { ...full, visibleTo: 'ANYONE' } as Record<string, unknown>;
delete legacyRow.showLinks;
ok(
  visibilityFor(stranger, { userId: 'target', privacy: legacyRow as any }).links === true,
  'an absent showLinks defaults to visible — undefined must not read as false',
);

// ── Cross-desk agreement ───────────────────────────────────────────────────────
section('directory exposes what the privacy gate hides');
{
  // Static read of the shaping code. The failure this catches: adding `showLinks` to
  // the schema and the privacy table while `getProfileDetail` keeps returning the row
  // unredacted — which is invisible in every behavioural test until somebody's GitHub
  // URL leaks.
  const src = readFileSync(
    new URL('../src/modules/alumni/directory.service.ts', import.meta.url),
    'utf8',
  );
  for (const field of ['links', 'achievements', 'achievementCount', 'verifiedAchievementCount']) {
    ok(src.includes(field), `getProfileDetail/listDirectory shape mentions ${field}`);
  }
  ok(/links:\s*vis\.links/.test(src), 'links are gated on vis.links');
  ok(/achievements:\s*vis\.achievements/.test(src), 'achievements are gated on vis.achievements');
  ok(/achievementCount:\s*vis\.achievements\s*\?/.test(src), 'achievementCount is zeroed rather than leaked when hidden');
  // Every vis.* read must exist as a returned key.
  for (const key of ['email', 'phone', 'location', 'career', 'skills', 'links', 'achievements']) {
    ok(new RegExp(`${key}: (true|false|p\\.show)`).test(src), `visibilityFor returns ${key}`);
  }
}

section('route declaration order');
{
  const src = readFileSync(new URL('../src/modules/alumni/profile/profile.routes.ts', import.meta.url), 'utf8');
  const declared = [...src.matchAll(/router\.(get|post|put|patch|delete)\(\s*'([^']*)'/g)].map((m) => ({
    method: m[1].toUpperCase(),
    path: m[2],
  }));
  ok(declared.length >= 13, `found the route declarations (${declared.length})`);

  // The sub-router is mounted at `/alumni/profile` from `alumni.routes.ts`, and a LITERAL
  // `GET /profile` route in the parent declared after that mount is unreachable — the
  // mount consumes the rest of the path first. There was exactly such a route: it
  // returned a `{ fullName, roles, programStats }` summary card and made the whole
  // self-service feature unreachable over HTTP while every DB-free check below still
  // passed, because those tests call the service directly.
  //
  // This is a source-level guard because that is the only place the ordering is visible.
  // A request-level test would have caught it too, and does — `verify-alumni/profile-http.ts`
  // calls `GET /alumni/profile` — but that suite needs a running server, whereas this one
  // runs in CI with no server at all.
  const parent = readFileSync(new URL('../src/modules/alumni/alumni.routes.ts', import.meta.url), 'utf8');
  const mountAt = parent.indexOf("router.use('/profile'");
  ok(mountAt >= 0, 'the profile sub-router is mounted');
  const literalAfterMount = [...parent.matchAll(/router\.(get|post|put|patch|delete)\(\s*'\/profile'/g)]
    .map((m) => m.index ?? -1)
    .filter((i) => i > mountAt);
  ok(
    literalAfterMount.length === 0,
    'no literal /profile route below the mount (one would shadow the whole feature)',
  );
  const serviceBody = readFileSync(new URL('../src/modules/alumni/alumni.service.ts', import.meta.url), 'utf8');
  ok(
    !/export async function getProfile\(/.test(serviceBody),
    'the institution-wide getProfile summary helper is gone from alumni.service.ts',
  );

  const careersList = declared.findIndex((r) => r.path === '/career');
  const careersItem = declared.findIndex((r) => r.path === '/career/:id');
  ok(careersList >= 0 && careersList < careersItem, 'GET /career is declared before /career/:id');

  const queue = declared.findIndex((r) => r.path === '/achievements/queue');
  const verify = declared.findIndex((r) => r.path === '/achievements/:id/verify');
  ok(queue >= 0 && queue < verify, '/achievements/queue is declared before /achievements/:id/verify');

  // No bare /:id, which is the IDOR-shaped route.
  ok(!declared.some((r) => r.path === '/:id'), 'there is no bare /:id route');

  // The one route that acts on someone else's row must be office-gated in the router.
  const verifyBlock = src.slice(src.indexOf("'/achievements/:id/verify'"), src.indexOf("'/achievements/:id/verify'") + 400);
  ok(verifyBlock.includes('requireOffice()'), 'the verify route is office-gated at the router, not only in the service');
}

// ────────────────────────────────────────────────────────────────────────────────
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail > 0 ? 1 : 0);