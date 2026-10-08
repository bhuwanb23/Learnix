// X-05 Evaluations — the rules the server and the app must BOTH agree on
// (docs/users/05 §3.3).
//
// Prisma-free on purpose: everything here is a PUBLISHED CHOICE — which
// blocks exist, what a script status means, when moderation may start, what a
// legal marks split is — and every one of those is something a client would
// otherwise re-decide for itself. A screen that invents its own "what counts
// as missing" will eventually disagree with the server, and it will disagree
// silently.
//
// THE POLICY THAT SHAPES THIS FILE: marks are internal + external, and the
// split is bounded (0..40 internal, 0..60 external — a 100-mark paper). The
// bounds are published here rather than left to the client because a marks
// entry that only the server will reject is an entry the controller discovers
// is wrong AFTER submitting it.
import { unprocessable } from '../../lib/errors.js';

// ═══ Blocks ══════════════════════════════════════════════════════════════
//
// `route` is the FEATURE_MODULES key on the app, never invented by the app.
// All eight are sub-screens of the Evaluations tab (`isTab: false`), so every
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
    id: 'PROGRESS',
    label: 'Evaluation progress',
    blurb: 'How much of the season is marked, at a glance.',
    icon: 'pie-chart-outline',
    color: '#2563eb',
    route: 'EvaluationsProgress',
    isTab: false,
    order: 1,
    requiresExam: false,
  },
  {
    id: 'SCRIPTS',
    label: 'Answer scripts',
    blurb: 'Which papers arrived, which are verified, which are still missing.',
    icon: 'document-text-outline',
    color: '#0284c7',
    route: 'EvaluationsScripts',
    isTab: false,
    order: 2,
    requiresExam: true,
  },
  {
    id: 'ALLOCATION',
    label: 'Evaluator allocation',
    blurb: 'Who is marking which subject, and what nobody has taken yet.',
    icon: 'people-outline',
    color: '#7c3aed',
    route: 'EvaluationsAllocation',
    isTab: false,
    order: 3,
    requiresExam: true,
  },
  {
    id: 'SUBJECTS',
    label: 'Subject-wise evaluation',
    blurb: 'Every subject with its paper counts and status.',
    icon: 'library-outline',
    color: '#059669',
    route: 'EvaluationsSubjects',
    isTab: false,
    order: 4,
    requiresExam: true,
  },
  {
    id: 'MARKS',
    label: 'Marks entry',
    blurb: 'Internal and external marks, per paper, against every bound.',
    icon: 'create-outline',
    color: '#d97706',
    route: 'EvaluationsMarks',
    isTab: false,
    order: 5,
    requiresExam: true,
  },
  {
    id: 'DEADLINES',
    label: 'Deadlines',
    blurb: 'When grading is due, and what is already past it.',
    icon: 'alarm-outline',
    color: '#b45309',
    route: 'EvaluationsDeadlines',
    isTab: false,
    order: 6,
    requiresExam: false,
  },
  {
    id: 'MISSING',
    label: 'Missing marks',
    blurb: 'Papers with no marks yet — the list that blocks publication.',
    icon: 'alert-circle-outline',
    color: '#dc2626',
    route: 'EvaluationsMissing',
    isTab: false,
    order: 7,
    requiresExam: false,
  },
  {
    id: 'MODERATION',
    label: 'Moderation',
    blurb: 'Second look at entered marks before results go out.',
    icon: 'checkmark-done-outline',
    color: '#4f46e5',
    route: 'EvaluationsModeration',
    isTab: false,
    order: 8,
    requiresExam: false,
  },
  {
    id: 'REVALUATION',
    label: 'Revaluation requests',
    blurb: 'What students asked to have re-checked, and what was decided.',
    icon: 'refresh-circle-outline',
    color: '#0891b2',
    route: 'EvaluationsRevaluation',
    isTab: false,
    order: 9,
    requiresExam: false,
  },
];

export const BLOCK_IDS = BLOCKS.map((b) => b.id);
export const blockMeta = (id: string): Block | null => BLOCKS.find((b) => b.id === id) ?? null;

// ═══ Statuses ════════════════════════════════════════════════════════════

/** Evaluation-level status (docs 05-state-machines §2.2). */
export const EVALUATION_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const;
/** Paper-level status. */
export const PAPER_STATUSES = ['PENDING', 'EVALUATING', 'DONE'] as const;
/** Answer-script custody. NOT_RECEIVED → RECEIVED → VERIFIED. */
export const SCRIPT_STATUSES = ['NOT_RECEIVED', 'RECEIVED', 'VERIFIED'] as const;
/** Moderation state. A completed evaluation starts NOT_REQUESTED. */
export const MODERATION_STATUSES = ['NOT_REQUESTED', 'PENDING', 'APPROVED', 'FLAGGED'] as const;
/** What a moderator may decide. */
export const MODERATION_DECISIONS = ['APPROVED', 'FLAGGED'] as const;

export type EvaluationStatus = (typeof EVALUATION_STATUSES)[number];
export type PaperStatus = (typeof PAPER_STATUSES)[number];
export type ScriptStatus = (typeof SCRIPT_STATUSES)[number];
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

// ═══ Marks policy ════════════════════════════════════════════════════════
//
// One 100-mark paper, split 40/60. Published so the marks screen can pre-validate
// before the round trip, and so `MISSING` and the publication gate agree on
// what "has marks" means: BOTH components present and within bounds.
export const MARKS_POLICY = {
  internalMax: 40,
  externalMax: 60,
  totalMax: 100,
} as const;

/** A paper counts as marked iff both components are in and within bounds. */
export function isMarked(paper: { internalMarks: number | null; externalMarks: number | null }): boolean {
  return (
    paper.internalMarks !== null &&
    paper.externalMarks !== null &&
    paper.internalMarks >= 0 &&
    paper.internalMarks <= MARKS_POLICY.internalMax &&
    paper.externalMarks >= 0 &&
    paper.externalMarks <= MARKS_POLICY.externalMax
  );
}

/** Total for display — null when the paper is not fully marked. */
export function totalOf(paper: { internalMarks: number | null; externalMarks: number | null }): number | null {
  return isMarked(paper) ? (paper.internalMarks as number) + (paper.externalMarks as number) : null;
}

// ═══ Transitions ═════════════════════════════════════════════════════════

/** Legal script custody moves. A paper can only be verified once received. */
export const SCRIPT_TRANSITIONS: Record<ScriptStatus, ScriptStatus[]> = {
  NOT_RECEIVED: ['RECEIVED'],
  RECEIVED: ['VERIFIED'],
  VERIFIED: [],
};

/** Moderation may only be REQUESTED once the evaluation is COMPLETED. */
export const MODERATION_REQUESTABLE_FROM: EvaluationStatus[] = ['COMPLETED'];

/** Legal moderation decisions, and where each lands. */
export const MODERATION_DECISION_TARGET: Record<(typeof MODERATION_DECISIONS)[number], ModerationStatus> = {
  APPROVED: 'APPROVED',
  FLAGGED: 'FLAGGED',
};

// ═══ Assert helpers — every unknown choice answers 422 with `allowed` ═════

export function assertBlock(id: string): string {
  if (!BLOCK_IDS.includes(id)) {
    throw unprocessable(`Unknown evaluation block "${id}"`, { allowed: BLOCK_IDS });
  }
  return id;
}

export function assertScriptStatus(status: string): ScriptStatus {
  if (!(SCRIPT_STATUSES as readonly string[]).includes(status)) {
    throw unprocessable(`Unknown script status "${status}"`, { allowed: [...SCRIPT_STATUSES] });
  }
  return status as ScriptStatus;
}

export function assertScriptTransition(from: ScriptStatus, to: ScriptStatus): ScriptStatus {
  if (!SCRIPT_TRANSITIONS[from].includes(to)) {
    throw unprocessable(`A script cannot go from ${from} to ${to}`, {
      from,
      allowed: SCRIPT_TRANSITIONS[from],
    });
  }
  return to;
}

export function assertModerationDecision(decision: string): 'APPROVED' | 'FLAGGED' {
  if (!(MODERATION_DECISIONS as readonly string[]).includes(decision)) {
    throw unprocessable(`Unknown moderation decision "${decision}"`, { allowed: [...MODERATION_DECISIONS] });
  }
  return decision as 'APPROVED' | 'FLAGGED';
}

export function assertMarksSplit(internalMarks: number, externalMarks: number): void {
  if (!Number.isInteger(internalMarks) || internalMarks < 0 || internalMarks > MARKS_POLICY.internalMax) {
    throw unprocessable(`internalMarks must be an integer 0..${MARKS_POLICY.internalMax}`, {
      allowed: `0..${MARKS_POLICY.internalMax}`,
    });
  }
  if (!Number.isInteger(externalMarks) || externalMarks < 0 || externalMarks > MARKS_POLICY.externalMax) {
    throw unprocessable(`externalMarks must be an integer 0..${MARKS_POLICY.externalMax}`, {
      allowed: `0..${MARKS_POLICY.externalMax}`,
    });
  }
}

/**
 * Moderation may only start on a COMPLETED evaluation. Asking earlier is not
 * an error of typing — it is a workflow mistake, so it answers 422 naming the
 * statuses that would work.
 */
export function assertModerationRequestable(evaluationStatus: string): void {
  if (!MODERATION_REQUESTABLE_FROM.includes(evaluationStatus as EvaluationStatus)) {
    throw unprocessable(
      `Moderation can only be requested on a COMPLETED evaluation (this one is ${evaluationStatus})`,
      { allowed: [...MODERATION_REQUESTABLE_FROM], current: evaluationStatus },
    );
  }
}

/**
 * Results publication gate (docs 05-state-machines §2.1): every paper of every
 * evaluation on the slot must be marked, and moderation must not be FLAGGED.
 * Returns the reasons publication must wait — empty means it may go ahead.
 */
export function publicationBlockers(evaluations: Array<{
  status: string;
  moderationStatus: string;
  papers: Array<{ internalMarks: number | null; externalMarks: number | null }>;
}>): string[] {
  const reasons: string[] = [];
  for (const e of evaluations) {
    const unmarked = e.papers.filter((p) => !isMarked(p)).length;
    if (unmarked > 0) {
      reasons.push(`${unmarked} paper(s) still unmarked`);
    }
    if (e.moderationStatus === 'FLAGGED') {
      reasons.push('moderation flagged this subject — resolve it first');
    }
  }
  return reasons;
}
