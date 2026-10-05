// Shared presentation helpers for the Fee Structure screens (docs/users/06 §3.5).
//
// Every label here has a twin in `feestructure.money.ts` on the server. That is
// deliberate duplication, not an oversight: the server needs ids and machine
// shapes, this file needs labels and colours, and a screen that asked the
// server to render "Examination" in violet would be trusting a network round
// trip to draw a list row.
//
// The IDs are duplicated verbatim, and `audit-fee-structure-ui.ts` asserts they
// match the server's. If one side is edited alone the fee editor produces a
// charge type the API rejects — loudly, which is the good failure — rather than
// silently storing nothing.

export const THEME = '#2563eb';

export const rupees = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;

/** Compact form for headline cards — ₹18.9L / ₹45.6K / ₹820. */
export function compactRupees(n) {
  const v = Number(n ?? 0);
  const abs = Math.abs(v);
  if (abs >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toLocaleString('en-IN')}`;
}

/** The single rupees → paise conversion. Everything that POSTs money uses this. */
export const toMinor = (rupeesValue) => Math.round(Number(rupeesValue || 0) * 100);

/**
 * A `YYYY-MM-DD` string from a Date, read in LOCAL time.
 *
 * The server sends `*Day` strings for exactly this reason (`isoDay` there,
 * matching this). Doing `date.toISOString().slice(0, 10)` on a local midnight
 * date shifts it a day backwards in IST, which would put a fee version's "in
 * force from" on the wrong side of the boundary it was chosen for.
 */
export function isoDay(input) {
  if (!input) return null;
  if (typeof input === 'string') return input.slice(0, 10);
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const todayIso = () => isoDay(new Date());

export function addDaysIso(iso, days) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return isoDay(d);
}

/**
 * Render a `YYYY-MM-DD` day as something a person reads.
 *
 * The string is parsed as LOCAL midnight first. `new Date('2026-07-01')` parses
 * as UTC midnight, which in IST is still 1 July but in any negative-offset zone
 * is 30 June — so a version boundary would render a day early for half the
 * world.
 */
export function formatDay(day) {
  if (!day) return '—';
  const d = new Date(`${String(day).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(day);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function relativeTime(d) {
  if (!d) return 'never';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDay(isoDay(d));
}

// ── Charge types ───────────────────────────────────────────
// Mirrors COMPONENT_KINDS in feestructure.money.ts. The `hint` is what makes the
// picker a decision rather than a guess: "this doesn't obviously fit anywhere"
// should land on Other AND make the person write a note.
export const COMPONENT_KINDS = [
  { id: 'TUITION', label: 'Tuition', color: '#2563eb', icon: 'school-outline', hint: 'Core teaching fee for the semester' },
  { id: 'EXAMINATION', label: 'Examination', color: '#7c3aed', icon: 'ribbon-outline', hint: 'Exam registration, papers, marksheets' },
  { id: 'HOSTEL', label: 'Hostel', color: '#059669', icon: 'bed-outline', hint: 'Residence — only students in hostel pay' },
  { id: 'LIBRARY', label: 'Library', color: '#0891b2', icon: 'book-outline', hint: 'Library subscription and reading room' },
  { id: 'ADMISSION', label: 'Admission', color: '#d97706', icon: 'enter-outline', hint: 'One-off, new admissions only' },
  { id: 'TRANSPORT', label: 'Transport', color: '#b45309', icon: 'bus-outline', hint: 'Bus route charge — only opt-in students' },
  { id: 'OTHER', label: 'Other charges', color: '#64748b', icon: 'ellipsis-horizontal-outline', hint: 'Lab, welfare, sports — always say what' },
];

export const KIND_IDS = COMPONENT_KINDS.map((k) => k.id);

export const kindMeta = (id) =>
  COMPONENT_KINDS.find((k) => k.id === id) ?? {
    id: id ?? 'UNKNOWN', label: id || 'Uncategorised', color: '#94a3b8', icon: 'help-outline', hint: '',
  };

/** Semester 0 means "every semester of the year" — the normal case for a charge. */
export function semesterLabel(semester) {
  const s = Number(semester || 0);
  return s > 0 ? `Semester ${s}` : 'All semesters';
}

export function semesterShort(semester) {
  const s = Number(semester || 0);
  return s > 0 ? `S${s}` : 'All';
}

/** The semester options for a picker, 0 first because most charges are annual. */
export const semesterOptions = (totalSemesters) => {
  const n = Math.max(1, Math.min(12, Number(totalSemesters || 8)));
  return [{ value: 0, label: 'All semesters' }, ...Array.from({ length: n }, (_, i) => ({ value: i + 1, label: `Semester ${i + 1}` }))];
};

// ── Concessions ────────────────────────────────────────────
// Mirrors CONCESSION_KINDS.
export const CONCESSION_KINDS = [
  { id: 'MERIT', label: 'Merit', icon: 'trophy-outline', hint: 'Top of the batch on merit' },
  { id: 'NEED_BASED', label: 'Need-based', icon: 'heart-outline', hint: 'Family circumstances, means-tested' },
  { id: 'SIBLING', label: 'Sibling discount', icon: 'people-outline', hint: 'Second and subsequent child' },
  { id: 'STAFF_WARD', label: 'Staff ward', icon: 'briefcase-outline', hint: 'Children of employees' },
  { id: 'SCHOLARSHIP', label: 'Scholarship', icon: 'ribbon-outline', hint: 'Funded scholarship scheme' },
  { id: 'OTHER', label: 'Other', icon: 'pricetag-outline', hint: 'Anything else — say what in the note' },
];

export const concessionKindMeta = (id) =>
  CONCESSION_KINDS.find((k) => k.id === id) ?? { id: id ?? 'OTHER', label: id || 'Other', icon: 'pricetag-outline', hint: '' };

export const CONCESSION_BASES = [
  { id: 'PERCENT', label: 'Percentage off', hint: 'Off the eligible charges' },
  { id: 'FLAT', label: 'Flat amount off', hint: 'A fixed rupee amount' },
];

/** What a concession may be written against. Scoping is the point — see the docs. */
export const CONCESSION_SCOPES = [
  { id: 'ALL', label: 'Everything' },
  ...COMPONENT_KINDS.map((k) => ({ id: k.id, label: k.label })),
];

// ── Instalments ────────────────────────────────────────────
// Mirrors INSTALLMENT_FREQUENCIES. The server enforces 1..12 and refuses a count
// above 1 with no frequency, so the picker offers only pairs that are valid.
export const INSTALLMENT_FREQUENCIES = [
  { id: 'ONE_TIME', label: 'One payment', hint: 'The whole fee in a single bill', max: 1 },
  { id: 'SEMESTERLY', label: 'Per semester', hint: 'One bill a semester', max: 12 },
  { id: 'TRIMESTER', label: 'Trimester', hint: 'Three bills a year', max: 12 },
  { id: 'QUARTERLY', label: 'Quarterly', hint: 'Four bills a year', max: 12 },
  { id: 'MONTHLY', label: 'Monthly', hint: 'One bill a month', max: 12 },
];

export const frequencyMeta = (id) =>
  INSTALLMENT_FREQUENCIES.find((f) => f.id === id) ?? INSTALLMENT_FREQUENCIES[0];

export const INSTALLMENT_COUNTS = [1, 2, 3, 4, 5, 6].map((n) => ({
  value: n,
  label: n === 1 ? '1 payment' : `${n} payments`,
}));

/** A count this frequency can actually honour — the server would refuse otherwise. */
export function validCountsFor(frequencyId) {
  const max = frequencyMeta(frequencyId).max ?? 12;
  return INSTALLMENT_COUNTS.filter((c) => c.value <= max);
}

// ── Versions ───────────────────────────────────────────────
// Mirrors VERSION_STATUS_META.
export const VERSION_STATUS_META = {
  DRAFT: { label: 'Draft', short: 'Draft', color: '#d97706', bg: '#fffbeb', icon: 'create-outline' },
  PUBLISHED: { label: 'In force', short: 'In force', color: '#059669', bg: '#f0fdf4', icon: 'checkmark-circle-outline' },
  SUPERSEDED: { label: 'Replaced', short: 'Replaced', color: '#64748b', bg: '#f1f5f9', icon: 'archive-outline' },
  DRAFT_DISCARDED: { label: 'Discarded', short: 'Discarded', color: '#dc2626', bg: '#fef2f2', icon: 'trash-outline' },
};

export const versionStatusMeta = (s) =>
  VERSION_STATUS_META[s] ?? { label: s ?? 'Unknown', short: s ?? '—', color: '#64748b', bg: '#f1f5f9', icon: 'help-outline' };

/** The diff row verbs, in the order a reviewer reads them. */
export const DIFF_STATUS = {
  ADDED: { label: 'Added', color: '#059669', bg: '#f0fdf4', icon: 'add-circle-outline' },
  REMOVED: { label: 'Removed', color: '#dc2626', bg: '#fef2f2', icon: 'remove-circle-outline' },
  CHANGED: { label: 'Changed', color: '#d97706', bg: '#fffbeb', icon: 'swap-horizontal-outline' },
  UNCHANGED: { label: 'Unchanged', color: '#64748b', bg: '#f1f5f9', icon: 'remove-outline' },
};

export const diffStatusMeta = (s) => DIFF_STATUS[s] ?? DIFF_STATUS.UNCHANGED;

// ── Change phrases ─────────────────────────────────────────

/**
 * Year-on-year movement, in words.
 *
 * The server sends `null` when there is no comparable prior version, and that
 * null is a FACT — "no prior year to compare" — not a zero. Rendering "+0%"
 * would read as "the fee did not change" when the truth is "there was nothing
 * to compare against", and those two conversations have very different
 * consequences at a board meeting.
 */
export function changePhrase(percent) {
  if (percent === null || percent === undefined) return 'No earlier version to compare';
  if (percent === 0) return 'Unchanged from the last version';
  return percent > 0 ? `Up ${percent}% from the last version` : `Down ${Math.abs(percent)}% from the last version`;
}

export function changeColor(percent) {
  if (percent === null || percent === undefined) return '#64748b';
  if (percent === 0) return '#64748b';
  // A fee CUT is not an error, so it is shown green, not red. Red here would
  // read as "something is wrong" when the board may well have voted for it.
  return percent > 0 ? '#dc2626' : '#059669';
}

/** Signed money delta — the sign is the message, so it is always printed. */
export function deltaPhrase(rupeesValue) {
  if (rupeesValue === null || rupeesValue === undefined) return '—';
  const v = Number(rupeesValue);
  if (v === 0) return 'No change';
  return `${v > 0 ? '+' : '−'}${rupees(Math.abs(v))}`;
}

/**
 * What a version's window says, in one line.
 *
 * `effectiveTo` is INCLUSIVE: a version ending 30 November applies ON the 30th,
 * which is why the next one starts the 1st. Written out rather than rendered as
 * a date pair so the inclusive end is not something the reader has to deduce.
 */
export function windowPhrase(version) {
  if (!version) return '—';
  const from = formatDay(version.effectiveFromDay);
  if (!version.effectiveToDay) return `In force from ${from} — no end date set`;
  return `${formatDay(version.effectiveFromDay)} to ${formatDay(version.effectiveToDay)}, inclusive`;
}

// ── Optional & first-year charges ──────────────────────────

/**
 * The headline total is the MANDATORY bill. Hostel and transport are shown as
 * "if you take these, add ₹X" — a "total fee" that silently includes a bed
 * nobody is taking is a number the office cannot defend to a day-scholar.
 */
export function optionalHint(structure) {
  if (!structure?.optionalRupees) return null;
  return `Excludes ${rupees(structure.optionalRupees)} of optional charges`;
}

export function firstYearHint(component) {
  if (!component?.firstYearOnly) return null;
  return 'Charged in the joining year only';
}

/** Why an optional charge is optional — shown on the line itself. */
export function optionalLineHint(component) {
  if (!component?.optional) return null;
  return component.note || 'Only students who take this are charged';
}