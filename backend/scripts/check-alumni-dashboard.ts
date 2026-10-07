/**
 * DB-free contract checks for the ALUMNI dashboard (docs/users/12-alumni-relations.md §3.1).
 *
 *   npx tsx scripts/check-alumni-dashboard.ts
 *
 * WHY SOURCE-LEVEL ASSERTIONS AND NOT A DB QUERY
 * ----------------------------------------------
 * The scoping itself is tested over HTTP in `verify-alumni/dashboard.ts`, where two
 * graduates' responses are compared against each other and against the database. That is
 * the real test and this file does not pretend otherwise.
 *
 * What this catches is the class of defect that a happy-path test cannot see: the retired
 * office payload creeping back, the per-user predicate quietly losing one of its three
 * branches, the route being handed a raw `(institutionId, userId)` pair again and inviting
 * another institution-wide aggregate. Those are all *presence* facts about code that no
 * amount of HTTP testing will notice as long as the numbers happen to be non-zero.
 *
 * The three-predicate assertion is the sharpest one. `listMentorship` already documents
 * that filtering on the alumni-mentee side alone hides every pair created before the mentee
 * side was made polymorphic — dropping one `OR` branch here would reproduce that bug in a
 * place nothing else covers.
 */
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
const section = (t: string) => console.log(`\n[${t}]`);

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

// ── The retired office contract ────────────────────────────────────────────────────

section('the retired office dashboard is gone');

const alumniService = read('../src/modules/alumni/alumni.service.ts');
ok(
  !/export async function getDashboard\(/.test(alumniService),
  'alumni.service.ts no longer declares getDashboard',
);
// A second assertion on the same fact used to grep for the literal string
// `getDashboard(institutionId, userId)` — and matched the COMMENT explaining the removal.
// A guard that fails when its own documentation is accurate is worse than no guard, so the
// declaration check above stands alone.

const routes = read('../src/modules/alumni/alumni.routes.ts');
ok(
  /service\.getDashboard\(/.test(routes) === false,
  'no route still calls service.getDashboard',
);
ok(
  /getGraduateDashboard\(/.test(routes),
  'the /dashboard route calls getGraduateDashboard',
);

// ── The replacement is per-user by construction ────────────────────────────────────

section('the service takes a Viewer');

const svc = read('../src/modules/alumni/dashboard.service.ts');
ok(
  /export async function getGraduateDashboard\(viewer: Viewer\)/.test(svc),
  'getGraduateDashboard takes a Viewer, not (institutionId, userId)',
);
ok(
  /viewerFor\(req\)/.test(routes),
  'the route resolves a viewer before calling it',
);

// ── Mentorship: all three predicates ───────────────────────────────────────────────

section('mentorship scoping keeps all three predicates');

const mentorQuery = svc.slice(svc.indexOf('async function loadMentorship'));
ok(
  /mentorAlumniUserId: userId/.test(mentorQuery),
  'the mentor side is matched',
);
ok(
  /menteeAlumniProfile: \{ userId \}/.test(mentorQuery),
  'the ALUMNI mentee side is matched',
);
ok(
  /menteeStudentProfile: \{ userId \}/.test(mentorQuery),
  'the STUDENT mentee side is matched',
);
ok(
  /mentorAlumniUser: \{ institutionId/.test(mentorQuery),
  'the mentor side is also institution-scoped, so a stray user id cannot leak across tenants',
);

// ── Giving: scoped to the donor, not the ledger ────────────────────────────────────

section('giving is scoped to the donor');

const givingQuery = svc.slice(svc.indexOf('async function loadGiving'));
ok(
  /alumniUserId: userId/.test(givingQuery),
  'the donation query filters on the caller',
);
// The dangerous shape: an institution-wide aggregate in a block that is otherwise
// per-user. Caught by requiring every aggregate in this function to carry alumniUserId.
const aggregates = [...givingQuery.matchAll(/donation\.aggregate\(\{\s*where: \{([^}]*)\}/g)];
ok(aggregates.length >= 2, `found the received and pledged aggregates (${aggregates.length})`);
ok(
  aggregates.every((m) => /alumniUserId: userId/.test(m[1])),
  'every donation aggregate in loadGiving is filtered by alumniUserId',
);

// ── A missing profile is not an error ───────────────────────────────────────────────

section('a missing profile does not fail the dashboard');
ok(
  /hasProfile/.test(svc),
  'the snapshot reports hasProfile',
);
ok(
  /throw notFound/.test(svc.slice(svc.indexOf('async function loadProfile'), svc.indexOf('function buildSnapshot'))) === false,
  'loadProfile returns null rather than throwing 404',
);

// ── The dashboard is ONE request ───────────────────────────────────────────────────

section('one endpoint, seven sections');
ok(
  /alumniApi\.dashboard\(\)/.test(read('../../learnix/users/alumni/pages/dashboard/dashboard.js')),
  'the hub makes a single dashboard call rather than fanning out per card',
);

// ── Frontend: every section exists and is rendered ─────────────────────────────────

section('frontend sections');

const meta = read('../../learnix/users/alumni/pages/dashboard/dashboardMeta.js');
const hub = read('../../learnix/users/alumni/pages/dashboard/dashboard.js');
const cards = [
  'SnapshotCard',
  'CareerCard',
  'EventsCard',
  'MentorshipCard',
  'GivingCard',
  'NetworkCard',
  'QuickActions',
];
for (const c of cards) {
  ok(new RegExp(`import ${c} from`).test(hub), `the hub imports ${c}`);
  ok(new RegExp(`<${c}[\\s/>]`).test(hub), `the hub renders <${c}>`);
}

for (const key of ['snapshot', 'career', 'events', 'mentorship', 'giving', 'network']) {
  ok(
    new RegExp(`key: '${key}'`).test(meta),
    `the section registry declares "${key}"`,
  );
}

// ── Empty states name the absence, they do not assert a zero ───────────────────────

section('empty states are honest');
ok(
  /export const MISSING = 'Not added yet'/.test(meta),
  'MISSING is a single named placeholder',
);
// A card printing "None" or "0" for an unfilled field asserts a fact about the world that
// is not true, and is the failure mode this whole card set was written to avoid.
const cardSources = cards
  .map((c) => read(`../../learnix/users/alumni/pages/dashboard/components/${c}.js`))
  .join('\n');
ok(
  />None</.test(cardSources) === false,
  'no card renders the literal "None"',
);
ok(
  /placeholder=\{MISSING\}/.test(read('../../learnix/users/alumni/pages/dashboard/components/SnapshotCard.js')),
  'SnapshotCard routes absent fields through MISSING',
);

// ── The header no longer claims to be the office ───────────────────────────────────

section('the tab title matches the screen');
const alumniApp = read('../../learnix/users/alumni/alumni.js');
ok(
  /Dashboard: 'Overview'/.test(alumniApp),
  "the Dashboard tab is titled 'Overview', not 'Alumni Relations Office'",
);

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail > 0 ? 1 : 0);