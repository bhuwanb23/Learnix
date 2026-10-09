// X-06 Results — the rules the server and the app must BOTH agree on
// (docs/users/05 §3.4).
//
// Prisma-free on purpose: everything here is a PUBLISHED CHOICE — which
// blocks exist, what the workflow statuses are, when a transition is legal,
// and above all THE GRADE SCALE and the pass threshold. Grade calculation is
// the one place a client would otherwise re-decide for itself: a screen that
// invents its own pass mark will eventually disagree with the server, and it
// will disagree at exactly the moment a marksheet is printed.
//
// THE POLICY that shapes this file: a result is CONSOLIDATED from evaluated
// papers (marks 0..100 against the 40/60 split), graded by percentage through
// the scale below, carried DRAFT → VERIFIED → APPROVED → PUBLISHED, and a
// re-evaluation may revise the marks (bumping `revision`) but never skips a
// step of the chain. Nothing in this pipeline accepts a grade from a client.
import { unprocessable } from '../../lib/errors.js';

// ═══ Blocks ══════════════════════════════════════════════════════════════
//
// `route` is the FEATURE_MODULES key on the app, never invented by the app.
// All ten are sub-screens of the Results tab (`isTab: false`), so every
// block is reached through `openModule`, not through the bottom nav.
export type Block = {
  id: string;
  label: string;
  blurb: string;
  icon: string;
  color: string;
  route: string;
  isTab: boolean;
  order: number;
  /** True = the block cannot render without an `examId`, and says so with 422. */
  requiresExam: boolean;
};

export const BLOCKS: Block[] = [
  {
    id: 'CONSOLIDATE',
    label: 'Marks consolidation',
    blurb: 'Pull marked papers into result rows — grade and pass/fail derived, never typed.',
    icon: 'git-merge-outline',
    color: '#2563eb',
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
    color: '#7c3aed',
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
    color: '#0891b2',
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
    color: '#059669',
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
    color: '#0284c7',
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
    color: '#4f46e5',
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
    color: '#d97706',
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
    color: '#0f766e',
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
    color: '#dc2626',
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
    color: '#b45309',
    route: 'ResultsAnalytics',
    isTab: false,
    order: 10,
    requiresExam: false,
  },
  {
    id: 'EXPORT',
    label: 'Export results',
    blurb: 'CSV of any exam’s results, ready to download or share.',
    icon: 'download-outline',
    color: '#334155',
    route: 'ResultsExport',
    isTab: false,
    order: 11,
    requiresExam: true,
  },
];

export const BLOCK_IDS = BLOCKS.map((b) => b.id);
export const blockMeta = (id: string): Block | null => BLOCKS.find((b) => b.id === id) ?? null;

// ═══ Statuses ════════════════════════════════════════════════════════════

/**
 * Result lifecycle (docs 05-state-machines §2.1). DRAFT is where
 * consolidation lands; PUBLISHED is terminal — a later correction goes
 * through re-evaluation, which bumps `revision` rather than rewinding.
 */
export const RESULT_STATUSES = ['DRAFT', 'VERIFIED', 'APPROVED', 'PUBLISHED'] as const;
export type ResultStatus = (typeof RESULT_STATUSES)[number];

/** Re-evaluation lifecycle (docs 05-state-machines §2.4). */
export const REVALUATION_STATUSES = ['REQUESTED', 'APPROVED', 'COMPLETED', 'REJECTED'] as const;
export type RevaluationStatus = (typeof REVALUATION_STATUSES)[number];

/** What a controller may decide on a re-evaluation request. */
export const REVALUATION_DECISIONS = ['APPROVED', 'REJECTED', 'COMPLETED'] as const;

// ═══ Grade scale ═════════════════════════════════════════════════════════
//
// Percentage bands, applied to `marksObtained / maxMarks * 100`. The pass
// threshold is 40% — F is the ONLY failing grade, so `isPass` is derived
// from the band and can never drift from it. Grade points feed SGPA/CGPA.
export const PASS_PERCENT = 40;

export const GRADE_SCALE: Array<{ min: number; grade: string; points: number }> = [
  { min: 90, grade: 'O', points: 10 },
  { min: 80, grade: 'A+', points: 9 },
  { min: 70, grade: 'A', points: 8 },
  { min: 60, grade: 'B+', points: 7 },
  { min: 50, grade: 'B', points: 6 },
  { min: 40, grade: 'C', points: 5 },
  { min: 0, grade: 'F', points: 0 },
];

export type GradeResult = { percent: number; grade: string; gradePoint: number; isPass: boolean };

/**
 * The ONE grade calculation. Percentage first, then the highest band whose
 * `min` is still ≤ it; `isPass` follows from the band being F or not, so the
 * two can never disagree.
 */
export function gradeFor(marksObtained: number, maxMarks: number): GradeResult {
  if (!Number.isFinite(marksObtained) || !Number.isFinite(maxMarks) || maxMarks <= 0) {
    throw unprocessable('maxMarks must be a positive number to grade against', { maxMarks });
  }
  const percent = (marksObtained / maxMarks) * 100;
  const band = GRADE_SCALE.find((b) => percent >= b.min) ?? GRADE_SCALE[GRADE_SCALE.length - 1]!;
  return {
    percent: Math.round(percent * 100) / 100,
    grade: band.grade,
    gradePoint: band.points,
    isPass: band.grade !== 'F',
  };
}

/** Grade points for SGPA/CGPA — an unknown grade contributes nothing. */
export const gradePointOf = (grade: string): number =>
  GRADE_SCALE.find((b) => b.grade === grade)?.points ?? 0;

/**
 * Credit-weighted average, rounded to 2 dp — the SGPA/CGPA definition both
 * sides print. Rows without credits (or with a failing grade) contribute 0 to
 * the numerator but still count their credits, which is what makes a backlog
 * pull the average down instead of vanishing from it.
 */
export function weightedGpa(
  rows: Array<{ gradePoint: number; credits: number }>,
): number | null {
  const credits = rows.reduce((a, r) => a + (r.credits > 0 ? r.credits : 0), 0);
  if (credits === 0) return null;
  const points = rows.reduce((a, r) => a + r.gradePoint * Math.max(r.credits, 0), 0);
  return Math.round((points / credits) * 100) / 100;
}

// ═══ Transitions ═════════════════════════════════════════════════════════

/** Legal result moves. One direction only; PUBLISHED is terminal. */
export const RESULT_TRANSITIONS: Record<ResultStatus, ResultStatus[]> = {
  DRAFT: ['VERIFIED'],
  VERIFIED: ['APPROVED'],
  APPROVED: ['PUBLISHED'],
  PUBLISHED: [],
};

/** Legal re-evaluation decisions from each status. */
export const REVALUATION_TRANSITIONS: Record<RevaluationStatus, RevaluationStatus[]> = {
  REQUESTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['COMPLETED', 'REJECTED'],
  COMPLETED: [],
  REJECTED: [],
};

// ═══ Assert helpers — every unknown choice answers 422 with `allowed` ═════

export function assertBlock(id: string): string {
  const key = id.toUpperCase();
  if (!BLOCK_IDS.includes(key)) {
    throw unprocessable(`Unknown result block "${id}"`, { allowed: BLOCK_IDS });
  }
  return key;
}

export function assertResultTransition(from: ResultStatus, to: ResultStatus): ResultStatus {
  if (!RESULT_TRANSITIONS[from]?.includes(to)) {
    throw unprocessable(`A result cannot go from ${from} to ${to}`, {
      from,
      allowed: RESULT_TRANSITIONS[from] ?? [],
    });
  }
  return to;
}

export function assertRevaluationDecision(status: string, decision: string): RevaluationStatus {
  const key = decision.toUpperCase();
  if (!(REVALUATION_DECISIONS as readonly string[]).includes(key)) {
    throw unprocessable(`Unknown revaluation decision "${decision}"`, {
      allowed: [...REVALUATION_DECISIONS],
    });
  }
  const allowed = REVALUATION_TRANSITIONS[status as RevaluationStatus] ?? [];
  if (!allowed.includes(key as RevaluationStatus)) {
    throw unprocessable(`A ${status} revaluation cannot be decided ${key}`, {
      from: status,
      allowed,
    });
  }
  return key as RevaluationStatus;
}

/** Revised marks must be in bounds of the result they rewrite. */
export function assertRevisedMarks(revisedMarks: number, maxMarks: number): void {
  if (!Number.isInteger(revisedMarks) || revisedMarks < 0 || revisedMarks > maxMarks) {
    throw unprocessable(`revisedMarks must be an integer 0..${maxMarks}`, {
      allowed: `0..${maxMarks}`,
    });
  }
}
