// X-06 Results — the pieces every result screen shares (docs/users/05 §3.4).
//
// This is a MIRROR of `result.rules.ts`: same eleven blocks, same four
// workflow statuses, same grade scale. It exists so a screen can colour and
// label a row without a second round trip. It is not the authority — the
// catalogue publishes the same lists and a screen that has fetched it prefers
// those. The mirror is the FALLBACK for the frame before the catalogue lands,
// and `audit-results-ui.ts` asserts the two never drift, because a mirror
// that disagrees with its source is worse than no mirror at all: it looks
// like the truth.
//
// THE POLICY, repeated here because a screen can contradict it without any
// code refusing to: A RESULT IS GRADED FROM MARKS, never from a field a
// client typed. percentage = marks / max * 100, banded by the scale below, F
// is the ONLY failing grade (pass = 40%+), and SGPA/CGPA are credit-weighted
// averages of those grade points. The server derives the same three numbers
// from the same table — if this mirror and the server ever disagree, the
// server wins and the drift counter on the Grade calculation screen says so.

export const THEME = '#2563eb';
export const RED = '#dc2626';
export const AMBER = '#d97706';
export const GREEN = '#059669';
export const VIOLET = '#7c3aed';
export const INDIGO = '#4f46e5';
export const CYAN = '#0891b2';
export const TEAL = '#0f766e';
export const BROWN = '#b45309';
export const SLATE = '#64748b';
export const MUTED = '#94a3b8';

// ═══ Blocks ══════════════════════════════════════════════════════════════
//
// Every `route` here is a FEATURE_MODULES key in `exam_cell.js`. Registering
// them there is load-bearing and its failure is SILENT: `renderContent` looks
// the key up, finds nothing, and puts the controller back on the hub with no
// error anywhere.

export const BLOCKS = [
  {
    id: 'CONSOLIDATE',
    label: 'Marks consolidation',
    blurb: 'Pull marked papers into result rows — grade and pass/fail derived, never typed.',
    icon: 'git-merge-outline',
    color: THEME,
    route: 'ResultsConsolidate',
    isTab: false,
    order: 1,
    requiresExam: true,
  },
  {
    id: 'GRADES',
    label: 'Grade calculation',
    blurb: 'The published scale, and every result with its percentage and band.',
    icon: 'ribbon-outline',
    color: VIOLET,
    route: 'ResultsGrades',
    isTab: false,
    order: 2,
    requiresExam: true,
  },
  {
    id: 'CGPA',
    label: 'SGPA / CGPA',
    blurb: 'Credit-weighted SGPA per exam, and the running CGPA per student.',
    icon: 'calculator-outline',
    color: CYAN,
    route: 'ResultsCgpa',
    isTab: false,
    order: 3,
    requiresExam: true,
  },
  {
    id: 'PASSFAIL',
    label: 'Pass / fail processing',
    blurb: 'Who cleared, who failed, and the backlog list per subject.',
    icon: 'account-check-outline',
    color: GREEN,
    route: 'ResultsPassFail',
    isTab: false,
    order: 4,
    requiresExam: true,
  },
  {
    id: 'VERIFY',
    label: 'Result verification',
    blurb: 'Check consolidated rows against papers — DRAFT to VERIFIED.',
    icon: 'checkmark-done-outline',
    color: CYAN,
    route: 'ResultsVerify',
    isTab: false,
    order: 5,
    requiresExam: true,
  },
  {
    id: 'APPROVAL',
    label: 'Result approval',
    blurb: 'Sign off verified rows before anything can be published.',
    icon: 'checkbox-outline',
    color: INDIGO,
    route: 'ResultsApproval',
    isTab: false,
    order: 6,
    requiresExam: true,
  },
  {
    id: 'PUBLISH',
    label: 'Result publication',
    blurb: 'Approved rows only, gated on every paper being marked.',
    icon: 'megaphone-outline',
    color: AMBER,
    route: 'ResultsPublish',
    isTab: false,
    order: 7,
    requiresExam: true,
  },
  {
    id: 'MARKSHEET',
    label: 'Marksheet',
    blurb: 'One student, one exam: rows, totals, grade, SGPA and CGPA.',
    icon: 'document-text-outline',
    color: TEAL,
    route: 'ResultsMarksheet',
    isTab: false,
    order: 8,
    requiresExam: true,
  },
  {
    id: 'REVALUATION',
    label: 'Revaluation updates',
    blurb: 'Decide requests and apply revised marks to the result row.',
    icon: 'refresh-circle-outline',
    color: RED,
    route: 'ResultsRevaluation',
    isTab: false,
    order: 9,
    requiresExam: false,
  },
  {
    id: 'ANALYTICS',
    label: 'Result analytics',
    blurb: 'Pass rate, grade distribution, toppers and subject spread.',
    icon: 'stats-chart-outline',
    color: BROWN,
    route: 'ResultsAnalytics',
    isTab: false,
    order: 10,
    requiresExam: false,
  },
  {
    id: 'EXPORT',
    label: 'Export results',
    blurb: "CSV of any exam's results, ready to download or share.",
    icon: 'download-outline',
    color: '#334155',
    route: 'ResultsExport',
    isTab: false,
    order: 11,
    requiresExam: true,
  },
];

// ═══ Statuses ════════════════════════════════════════════════════════════

/** Result lifecycle (docs 05-state-machines §2.1) — one direction only. */
export const RESULT_STATUS_META = {
  DRAFT: { color: SLATE, label: 'Draft' },
  VERIFIED: { color: CYAN, label: 'Verified' },
  APPROVED: { color: INDIGO, label: 'Approved' },
  PUBLISHED: { color: GREEN, label: 'Published' },
};

/** Re-evaluation lifecycle (docs 05-state-machines §2.4). */
export const REVAL_STATUS_META = {
  REQUESTED: { color: THEME, label: 'Requested' },
  APPROVED: { color: AMBER, label: 'Approved' },
  COMPLETED: { color: GREEN, label: 'Completed' },
  REJECTED: { color: RED, label: 'Rejected' },
};

// ═══ Grade scale ═════════════════════════════════════════════════════════
//
// Percentage bands — the exact table in `result.rules.ts`. F is the only
// failing grade, so `isPass` follows from the band and cannot drift.

export const PASS_PERCENT = 40;

export const GRADE_SCALE = [
  { min: 90, grade: 'O', points: 10 },
  { min: 80, grade: 'A+', points: 9 },
  { min: 70, grade: 'A', points: 8 },
  { min: 60, grade: 'B+', points: 7 },
  { min: 50, grade: 'B', points: 6 },
  { min: 40, grade: 'C', points: 5 },
  { min: 0, grade: 'F', points: 0 },
];

/** The ONE grade calculation — mirrors `gradeFor()` exactly. */
export function gradeFor(marksObtained, maxMarks) {
  if (!Number.isFinite(marksObtained) || !Number.isFinite(maxMarks) || maxMarks <= 0) {
    return { percent: 0, grade: 'F', gradePoint: 0, isPass: false };
  }
  const percent = (marksObtained / maxMarks) * 100;
  const band = GRADE_SCALE.find((b) => percent >= b.min) || GRADE_SCALE[GRADE_SCALE.length - 1];
  return {
    percent: Math.round(percent * 100) / 100,
    grade: band.grade,
    gradePoint: band.points,
    isPass: band.grade !== 'F',
  };
}

/** Credit-weighted average, 2 dp — mirrors `weightedGpa()`. */
export const weightedGpa = (rows) => {
  const credits = rows.reduce((a, r) => a + (r.credits > 0 ? r.credits : 0), 0);
  if (credits === 0) return null;
  const points = rows.reduce((a, r) => a + r.gradePoint * Math.max(r.credits, 0), 0);
  return Math.round((points / credits) * 100) / 100;
};

/** The colour a grade band is drawn in — pass bands green, F red. */
export const gradeColor = (grade) => (grade === 'F' ? RED : grade === 'O' || grade === 'A+' ? GREEN : CYAN);

// ═══ Small helpers ═══════════════════════════════════════════════════════

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many || `${one}s`}`;

export const initialsOf = (name) =>
  String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
