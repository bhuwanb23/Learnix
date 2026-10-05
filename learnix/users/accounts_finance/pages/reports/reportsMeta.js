// F-09 Reports — the constants the reporting screens share (docs/users/06 §3.8).
//
// These MIRROR the server's `reports.rules.ts`. That duplication is deliberate:
// the server speaks ids and machine shapes, this file speaks labels, colours
// and phrasing, and a screen that asked the server to word a warning would be
// trusting a network round trip to decide whether a number is alarming.
// `audit-reports-ui.ts` asserts the two lists still agree, so a period or a
// report added on one side alone fails the build instead of shipping a filter
// chip the server rejects.

export const THEME = '#2563eb';
export const GREEN = '#059669';
export const RED = '#dc2626';
export const AMBER = '#d97706';
export const VIOLET = '#7c3aed';
export const SLATE = '#64748b';

// ── Periods ────────────────────────────────────────────────────────────────
// Mirrors `PERIODS` / `PERIOD_META`. The hint is not decoration: SEMESTER is
// only meaningful when an academic year exists to halve, and a user who picks it
// on an institution with no academic year needs to know that before the number
// comes back.
export const PERIODS = ['MONTH', 'QUARTER', 'SEMESTER', 'YEAR', 'ALL'];

export const PERIOD_META = {
  MONTH: { label: 'This month', short: 'Month', hint: 'From the 1st to the last day of this month.' },
  QUARTER: { label: 'This quarter', short: 'Quarter', hint: 'Three calendar months, ending today\u2019s quarter.' },
  SEMESTER: { label: 'This semester', short: 'Semester', hint: 'The first or second half of the academic year, split on its real dates.' },
  YEAR: { label: 'This year', short: 'Year', hint: 'January to December.' },
  ALL: { label: 'All time', short: 'All time', hint: 'Everything the institution has ever recorded.' },
};

export const periodMeta = (id) => PERIOD_META[id] ?? PERIOD_META.MONTH;

// ── Export formats ────────────────────────────────────────────────────────
// Mirrors the server's format allow-list. Offering a fourth format here would
// put a button on screen that returns 400.
export const EXPORT_FORMATS = [
  { id: 'xlsx', label: 'Excel', icon: 'grid-outline', ext: 'xlsx', hint: 'Real .xlsx — money cells are numbers and sum.' },
  { id: 'csv', label: 'CSV', icon: 'document-text-outline', ext: 'csv', hint: 'One CSV with every sheet stacked, UTF-8 with a BOM.' },
  { id: 'pdf', label: 'PDF', icon: 'document-outline', ext: 'pdf', hint: 'A4 landscape, one page per sheet. Rupee is written INR.' },
];

export const formatMeta = (id) => EXPORT_FORMATS.find((f) => f.id === id) ?? EXPORT_FORMATS[0];

// ── Granularity (comparison report only) ──────────────────────────────────
// Mirrors the server: the comparison window is always the last twelve months,
// and the granularity chooses how each BAR is grouped — how many bars there
// are is not a filter, and a control that implied it was would be a lie.
export const GRANULARITIES = [
  { id: 'MONTH', label: 'By month' },
  { id: 'QUARTER', label: 'By quarter' },
  { id: 'YEAR', label: 'By year' },
];

// ── Report ids ────────────────────────────────────────────────────────────
// The server's `REPORTS`. `screen` is the key this feature registers in
// FEATURE_MODULES; keeping the pair together stops the hub and the registry
// drifting into a card that opens a blank screen.
export const REPORT_IDS = [
  'collections',
  'dues',
  'expenses',
  'payroll',
  'scholarships',
  'departments',
  'comparison',
];

export const reportScreen = (id) => `Report${id.charAt(0).toUpperCase()}${id.slice(1)}`;

export const REPORT_SCREENS = REPORT_IDS.reduce((acc, id) => {
  acc[reportScreen(id)] = id;
  return acc;
}, {});

// ── Formatting ────────────────────────────────────────────────────────────
export const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

/** Compact form for headline cards — ₹18.9L / ₹45.6K / ₹820. */
export function compactRupees(n) {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  if (abs >= 10000000) return `₹${(v / 10000000).toFixed(abs % 10000000 === 0 ? 0 : 1)}Cr`;
  if (abs >= 100000) return `₹${(v / 100000).toFixed(abs % 100000 === 0 ? 0 : 1)}L`;
  if (abs >= 1000) return `₹${(v / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}K`;
  return `₹${v.toLocaleString('en-IN')}`;
}

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** "1.2 MB" / "8 KB" / "933 B" — the export panel shows the real byte count. */
export function humanFileSize(bytes) {
  const b = Number(bytes ?? 0);
  if (!b) return '—';
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  if (b >= 1024) return `${Math.round(b / 1024)} KB`;
  return `${b} B`;
}

/** A signed percentage, or the words that say there is nothing to compare to. */
export function changePhrase(percent, unit = 'last period') {
  if (percent === null || percent === undefined) return `No ${unit} to compare`;
  if (percent === 0) return `Level with ${unit}`;
  return percent > 0 ? `${percent}% up on ${unit}` : `${Math.abs(percent)}% down on ${unit}`;
}

export const changeColor = (percent) => {
  if (percent === null || percent === undefined) return SLATE;
  if (percent === 0) return SLATE;
  return percent > 0 ? GREEN : RED;
};

// ── Bar geometry ──────────────────────────────────────────────────────────
/**
 * Width for a bar, as a percentage string, never wider than the track.
 *
 * Values in these reports are sometimes negative (an over-refund, a reversed
 * month), so the scale is taken from the LARGER absolute value. Clamping the
 * other way round would let a single small-magnitude bar with a negative sign
 * overflow the track and paint over its neighbours.
 */
export function barWidth(value, max) {
  const v = Math.abs(Number(value) || 0);
  const m = Math.abs(Number(max) || 0);
  if (m <= 0) return '0%';
  return `${Math.min(100, (v / m) * 100)}%`;
}

// ── Dues ageing ───────────────────────────────────────────────────────────
// The buckets come from the server (`AGING_BUCKETS`, owned by the dues desk) so
// a report cannot disagree with the screen the user just looked at. This is only
// the colour the server did not send.
export function agingColor(bucket) {
  if (bucket === 'D0') return RED;
  if (bucket === 'D30') return '#c2410c';
  if (bucket === 'D60') return AMBER;
  return GREEN;
}

// ── Payroll integrity ─────────────────────────────────────────────────────
/**
 * The words for a run whose header disagrees with its entries.
 *
 * The report refuses to print a run's headline total as though it were true
 * when the entries say otherwise, so the screen has to say why. Anything that
 * swallows this would have the user acting on a number the ledger contradicts.
 */
export function integrityNote(integrity) {
  if (!integrity) return null;
  if (integrity.footsToEntries) return null;
  const months = integrity.unfootedMonths ?? [];
  if (!months.length) return 'Some payroll runs do not foot to their entries.';
  if (months.length === 1) return `${months[0]} does not foot to its entries.`;
  return `${months.slice(0, 3).join(', ')}${months.length > 3 ? ` and ${months.length - 3} more` : ''} do not foot to their entries.`;
}

// ── Scholarships: promised vs released ────────────────────────────────────
/**
 * Whether a scheme's money has actually reached a student.
 *
 * "Awarded" is a decision; "released" is money that moved. The desk keeps the
 * two strictly apart and this helper says so in one line, because the failure
 * mode is a committee believing ₹75,000 was handed out when it was not.
 */
export function releasePhrase(scheme) {
  const awarded = Number(scheme?.awardedRupees ?? 0);
  const released = Number(scheme?.disbursedRupees ?? 0);
  if (awarded <= 0) return 'Nothing awarded yet';
  if (released <= 0) return `${rupees(awarded)} promised, none released`;
  if (released < awarded) return `${rupees(awarded - released)} approved but not released`;
  return 'Fully released';
}

export const releaseTone = (scheme) => {
  const awarded = Number(scheme?.awardedRupees ?? 0);
  const released = Number(scheme?.disbursedRupees ?? 0);
  if (awarded <= 0) return SLATE;
  if (released <= 0) return AMBER;
  if (released < awarded) return VIOLET;
  return GREEN;
};

// ── Money direction ───────────────────────────────────────────────────────
/**
 * Green for money in, red for money out, and the surplus itself coloured by
 * its own sign. A negative surplus is not a formatting problem.
 */
export const inflowColor = (n) => (Number(n) > 0 ? GREEN : Number(n) < 0 ? RED : SLATE);