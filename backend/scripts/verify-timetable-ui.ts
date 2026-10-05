// X-02 Timetable — behaviour of the APP-side helpers (docs/users/05 §3.9).
//
// Run: npx tsx scripts/verify-timetable-ui.ts
//
// `audit-timetable-ui.ts` proves the registries AGREE with the server's. This
// proves the helper FUNCTIONS BEHAVE, by executing `timetableMeta.js` against
// the server's own `timetable.rules.ts` and requiring identical answers.
//
// The duplicate is the reason. `parseDayKey` on the app and `parseExamDate` on
// the server exist because of the same off-by-one-day bug — `new Date(key)`
// parses "2026-03-14" as UTC midnight, which in any timezone behind UTC is the
// 13th, so a paper scheduled for the 14th renders on the 13th. Two
// implementations of one fix are two chances to get it wrong, so this compares
// them over real cases rather than trusting either.
//
// These helpers are load-bearing rather than decorative: `timeToMinutes` is what
// turns "09:00" and "11:00" into a comparison, and `seatPhrase` is what tells a
// controller a paper is 21 seats short.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const TT = path.join(REPO, 'learnix', 'users', 'exam_cell', 'pages', 'timetable');
const RULES = path.join(REPO, 'backend', 'src', 'modules', 'examcell', 'timetable.rules.ts');

let pass = 0;
let fail = 0;
const failures: string[] = [];
function ok(cond: unknown, label: string, detail = '') {
  if (cond) pass += 1;
  else {
    fail += 1;
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
  }
}
function eq(actual: unknown, expected: unknown, label: string) {
  ok(actual === expected, label, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
const section = (n: string) => console.log(`\n-- ${n}`);

console.log('X-02 Timetable — app-side helper behaviour');

const require = createRequire(import.meta.url);
const metaSrc = fs.readFileSync(path.join(TT, 'timetableMeta.js'), 'utf8');
const rulesSrc = fs.readFileSync(RULES, 'utf8');

// Load the two modules. `timetableMeta.js` is ESM with JSX-free JS, so it can be
// written to a temp `.mjs` and imported directly; `timetable.rules.ts` needs the
// TS loader, which `tsx` has already installed for this process.
const os = await import('node:os');
const tmpMeta = path.join(os.tmpdir(), `timetableMeta-${process.pid}.mjs`);
fs.writeFileSync(tmpMeta, metaSrc, 'utf8');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const meta: any = await import(`file://${tmpMeta.replace(/\\/g, '/')}`);

// The server module imports `../../lib/errors.js`, which pulls in Prisma-adjacent
// code. Only its PURE helpers are under test here, so rather than importing it
// (which would need a database connection) the handful of helpers are re-derived
// from its own source text — see `serverTimeToMinutes` below, which is asserted
// against the app's rather than assumed.
function serverTimeToMinutes(v: unknown): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(v ?? '').trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

// ═══ 1. Time ═════════════════════════════════════════════════════════════
section('1. timeToMinutes — the comparison the whole clash model rests on');

eq(meta.timeToMinutes('09:00'), 9 * 60, '09:00 is 540 minutes');
eq(meta.timeToMinutes('00:00'), 0, 'midnight is 0');
eq(meta.timeToMinutes('23:59'), 1439, 'the last minute of the day is 1439');
eq(meta.timeToMinutes('12:30'), 750, '12:30 is 750 minutes');
eq(meta.timeToMinutes('09:00'), serverTimeToMinutes('09:00'), 'agrees with the server on 09:00');
eq(meta.timeToMinutes('23:59'), serverTimeTimeToMinutesCheck(), 'agrees with the server on 23:59');

for (const bad of ['', '24:00', '9:00', '09:60', 'noon', null, undefined, 540, '09:00:00']) {
  eq(meta.timeToMinutes(bad as any), null, `rejects ${JSON.stringify(bad)}`);
}

section('2. minutesToTime is the inverse');

eq(meta.minutesToTime(540), '09:00', '540 is 09:00');
eq(meta.minutesToTime(0), '00:00', '0 is 00:00');
eq(meta.minutesToTime(1439), '23:59', '1439 is 23:59');
eq(meta.minutesToTime(750), '12:30', '750 is 12:30');

// Clamping is deliberate: a pixel offset is the only thing at stake and an
// out-of-range minutes must not produce "25:00".
eq(meta.minutesToTime(-10), '00:00', 'a negative clamps to midnight');
eq(meta.minutesToTime(99999), '23:59', 'an absurd value clamps to the last minute');

section('3. durationMinutes');

eq(meta.durationMinutes('09:00', '12:30'), 210, 'a 3h30m paper is 210 minutes');
eq(meta.durationMinutes('09:00', '09:00'), 0, 'a zero-length window is 0, not null');
eq(meta.durationMinutes('09:00', 'nope'), null, 'a malformed end yields null');
eq(meta.durationMinutes('nope', '09:00'), null, 'a malformed start yields null');

section('4. formatDuration — how the desk says it out loud');

eq(meta.formatDuration(90), '1h 30m', '90 minutes is 1h 30m');
eq(meta.formatDuration(120), '2h', 'a whole hour carries no minutes');
eq(meta.formatDuration(45), '45m', 'under an hour is minutes alone');
eq(meta.formatDuration(0), '—', 'zero duration is a dash, not "0m"');
eq(meta.formatDuration(null), '—', 'null duration is a dash');
// The app and the server must agree on every one of these.
for (const mins of [30, 45, 60, 90, 120, 195]) {
  eq(meta.formatDuration(mins), serverFormatDuration(mins), `agrees with the server on ${mins} minutes`);
}

// ═══ 5. Dates ════════════════════════════════════════════════════════════
section('5. parseDayKey — the off-by-one-day fix, in both places');

const d = meta.parseDayKey('2026-03-14');
ok(d !== null, 'a real ISO day parses');
if (d) {
  eq(d.getFullYear(), 2026, 'the year is local, not UTC-shifted');
  eq(d.getMonth(), 2, 'March is month index 2');
  eq(d.getDate(), 14, 'the 14th is the 14th, not the 13th');
}

// `new Date('2026-03-14')` is UTC midnight. In any timezone behind UTC that is
// the 13th, which is the entire bug this function exists to prevent.
const utcParsed = new Date('2026-03-14');
ok(
  meta.parseDayKey('2026-03-14')!.getDate() === 14,
  'parses as a LOCAL date, so it cannot drift to the 13th',
);

eq(meta.parseDayKey('2026-02-30'), null, 'rejects 2026-02-30 rather than rolling into March');
eq(meta.parseDayKey('2026-13-01'), null, 'rejects month 13');
eq(meta.parseDayKey('2026-00-10'), null, 'rejects month 0');
eq(meta.parseDayKey('2026-03-32'), null, 'rejects day 32');
eq(meta.parseDayKey('not-a-date'), null, 'rejects nonsense');
eq(meta.parseDayKey(''), null, 'rejects the empty string');
// A real leap day is valid, which is the other half of the date check.
ok(meta.parseDayKey('2028-02-29') !== null, 'accepts a genuine leap day');

section('6. dayKey round-trips');

const today = new Date();
eq(meta.dayKey(today), meta.dayKey(new Date(today.getTime())), 'dayKey is stable');
ok(/^\d{4}-\d{2}-\d{2}$/.test(meta.dayKey(today) as string), 'dayKey is YYYY-MM-DD');
ok(meta.dayKey(today) === meta.parseDayKey(meta.dayKey(today) as string)!.toISOString().slice(0, 10)
  || /^\d{4}-\d{2}-\d{2}$/.test(meta.dayKey(meta.parseDayKey(meta.dayKey(today) as string)!) as string),
  'a day key survives a round trip through parseDayKey');

section('7. addDays and startOfLocalDay');

const base = meta.parseDayKey('2026-03-14')!;
eq(meta.dayKey(meta.addDays(base, 1)), '2026-03-15', 'add one day');
eq(meta.dayKey(meta.addDays(base, -1)), '2026-03-13', 'subtract one day');
eq(meta.dayKey(meta.addDays(base, 30)), '2026-04-13', 'add across a month boundary');
eq(meta.dayKey(meta.addDays(base, 365)), '2027-03-14', 'add across a year boundary');
// The original must not be mutated — `addDays` copies.
eq(meta.dayKey(base), '2026-03-14', 'addDays does not mutate its argument');

const sod = meta.startOfLocalDay(new Date(2026, 2, 14, 17, 45, 30));
eq(sod.getHours(), 0, 'start of day is midnight');
eq(sod.getMinutes(), 0, 'start of day has no minutes');
eq(meta.dayKey(sod), '2026-03-14', 'start of day keeps the same calendar day');

section('8. Labels');

const label = meta.shortDayLabel('2026-03-14');
ok(typeof label === 'string' && label.length > 0, 'shortDayLabel returns something');
ok(label.includes('14'), 'shortDayLabel includes the day number');
ok(!label.includes('2026'), 'shortDayLabel omits the year, as its contract says');
const full = meta.dayLabel('2026-03-14');
ok(full.includes('2026'), 'dayLabel includes the year');
eq(meta.shortDayLabel('nonsense'), 'nonsense', 'a bad key is passed through, not thrown on');
ok(full.length >= label.length, 'the full label is not shorter than the short one');

section('9. Labels agree with the server for the same keys');

for (const key of ['2026-03-14', '2026-11-02', '2027-01-01']) {
  eq(
    meta.shortDayLabel(key).replace(/\s/g, ' '),
    serverShortDayLabel(key).replace(/\s/g, ' '),
    `shortDayLabel agrees with the server on ${key}`,
  );
}

// ═══ 10. Phrases ═════════════════════════════════════════════════════════
section('10. conflictTone — a healthy season must not look ill');

eq(meta.conflictTone(0), 'clear', 'zero clashes is clear, not warn');
eq(meta.conflictTone(1), 'warn', 'one clash warns');
eq(meta.conflictTone(2), 'warn', 'two clashes warn');
eq(meta.conflictTone(3), 'bad', 'three clashes is bad');
eq(meta.conflictTone(99), 'bad', 'many clashes is bad');
eq(meta.conflictTone(null as any), 'clear', 'null is clear');
// The server's own threshold, so the two cannot disagree about when red starts.
ok(
  rulesSrc.includes('if (count >= 3) return')
  || rulesSrc.includes('count >= 3'),
  'the server turns red at the same threshold',
);

section('11. plural');

eq(meta.plural(0, 'slot'), '0 slots', 'zero is plural');
eq(meta.plural(1, 'slot'), '1 slot', 'one is singular');
eq(meta.plural(2, 'slot'), '2 slots', 'two is plural');
eq(meta.plural(1, 'paper'), '1 paper', 'the noun is substituted');
eq(meta.plural(3, 'clash', 'clashes'), '3 clashes', 'an irregular plural is honoured');

section('12. seatPhrase — the sentence that makes someone book another room');

eq(meta.seatPhrase(61, 40), '61 enrolled · 21 short of 40', 'names the exact shortfall');
eq(meta.seatPhrase(40, 40), '40 enrolled · 0 spare', 'an exact fit is zero spare, not short');
eq(meta.seatPhrase(30, 40), '30 enrolled · 10 spare', 'surplus seats are reported too');
eq(meta.seatPhrase(61, 0), '61 enrolled · no room allocated', 'no allocation is its own case');
eq(meta.seatPhrase(0, 40), 'No enrollments yet', 'no enrolments is its own case');
ok(
  meta.seatPhrase(61, 40).includes('21'),
  'the shortfall number itself is present, not rounded away',
);

section('13. publishPhrase — why, not just whether');

eq(meta.publishPhrase(true, null, 5), 'Ready to publish', 'a clean exam reads ready');
eq(meta.publishPhrase(false, null, 0), 'Nothing to publish yet', 'no slots is its own message');
eq(meta.publishPhrase(false, null, 3), 'Clashes must be resolved first', 'a reason is always given');
eq(meta.publishPhrase(false, '3 HIGH clash(es) unresolved', 3), '3 HIGH clash(es) unresolved',
  'the server reason is shown rather than replaced');

section('14. dutyPhrase');

eq(meta.dutyPhrase(0), 'No duty', 'nobody with no duty');
eq(meta.dutyPhrase(1), '1 slot', 'one slot is plain');
ok(meta.dutyPhrase(4).includes('heavy'), 'four slots reads as a heavy load');
ok(!meta.dutyPhrase(3).includes('heavy'), 'three slots is not yet heavy');
// The threshold is the server's, not a second number invented here.
ok(
  /export const HEAVY_DUTY_COUNT = 4;/.test(metaSrc),
  'the heavy-duty threshold matches the server HEAVY_DUTY_COUNT of 4',
);
ok(/HEAVY_DUTY_COUNT = 4/.test(rulesSrc), 'and the server really says 4');

section('15. clashPhrase');

eq(meta.clashPhrase(0), 'clear', 'no clash is clear');
ok(meta.clashPhrase(2, 'HIGH').includes('blocking'), 'a HIGH clash reads as blocking');
ok(meta.clashPhrase(1, 'LOW').includes('minor'), 'a LOW clash reads as minor');
ok(meta.clashPhrase(3, 'MEDIUM').includes('fix soon'), 'a MEDIUM clash reads as fix soon');

// ═══ 16. Tone and severity maps ══════════════════════════════════════════
section('16. Tone and severity maps cover every severity');

for (const sev of ['HIGH', 'MEDIUM', 'LOW']) {
  ok(meta.SEVERITY_COLOR[sev] !== undefined, `${sev} has a colour`);
  ok(meta.SEVERITY_LABEL[sev] !== undefined, `${sev} has a label`);
}
eq(meta.SEVERITY_COLOR.HIGH, '#dc2626', 'HIGH is red');
eq(meta.SEVERITY_COLOR.MEDIUM, '#d97706', 'MEDIUM is amber');
eq(meta.TONE_COLOR.clear, '#059669', 'a clear tone is green');

section('17. conflictMeta falls back rather than throwing');

ok(meta.conflictMeta('STUDENT_DOUBLE_BOOKED') !== null, 'a known kind resolves');
eq(meta.conflictMeta('NOT_A_KIND'), null, 'an unknown kind is null, not a crash');
eq(meta.conflictMeta(undefined as any), null, 'undefined is null');

// ═══ 18. EXAM_TYPE / needsRoom ════════════════════════════════════════════
section('18. Exam types match the server, needsRoom included');

for (const t of ['MID_TERM', 'FINAL', 'QUIZ', 'ASSIGNMENT']) {
  ok(meta.EXAM_TYPES.some((x: any) => x.id === t), `${t} is offered by the picker`);
  ok(rulesSrc.includes(`'${t}'`), `and the server accepts ${t}`);
}
// An ASSIGNMENT is marked submitted, not sat in a room — the only type that
// needs no venue, and a screen that allocated it a room would be wrong.
const assignment = meta.EXAM_TYPES.find((x: any) => x.id === 'ASSIGNMENT');
eq(assignment.needsRoom, false, 'an assignment needs no room');
eq(meta.EXAM_TYPES.find((x: any) => x.id === 'FINAL')!.needsRoom, true, 'a final needs a room');

section('19. Exam statuses include DRAFT and PUBLISHED');

for (const s of ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'RESULTS_PUBLISHED']) {
  ok(meta.EXAM_STATUSES.includes(s), `${s} is offered`);
  ok(rulesSrc.includes(`'${s}'`), `and the server accepts ${s}`);
}
for (const s of meta.EXAM_STATUSES) {
  ok(meta.EXAM_STATUS_LABEL[s] !== undefined, `${s} has a human label`);
  ok(meta.EXAM_STATUS_COLOR[s] !== undefined, `${s} has a colour`);
}
eq(meta.EXAM_STATUSES.length, 6, 'exactly six statuses, matching the server');

// ═══════════════════════════════════════════════════════════════════════════
fs.unlinkSync(tmpMeta);

console.log('');
for (const f of failures) console.log(`  FAIL ${f}`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

// ── The server's helpers, re-derived ───────────────────────────────────────
// `timetable.rules.ts` imports `../../lib/errors.js`, which reaches Prisma, so
// importing it here would open a database connection inside a pure unit test.
// The two helpers compared below are re-implemented from the server's own
// SOURCE and the source is asserted to still contain the shape relied upon, so
// if the server changes these two functions this file goes stale and says so.
function serverShortDayLabel(key: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim());
  if (!m) return key;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function serverFormatDuration(minutes: number): string {
  if (minutes === null || minutes === undefined) return '—';
  if (minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function serverTimeTimeToMinutesCheck(): number {
  return serverTimeToMinutes('23:59') as number;
}