/**
 * X-08 — Cheating cases: the vocabulary.
 * Docs: 05-exam-cell.md §3.6
 *
 * WHAT THIS FILE IS
 * -----------------
 * Every list the desk and the app agree on: the blocks that make up the module, the case statuses and
 * the moves between them, the classifications, the penalties, and the evidence kinds. It is the
 * SINGLE SOURCE, and the app's mirror (`cheating_casesMeta.js`) exists only so a screen can colour a
 * row before the catalogue has loaded — `audit-cheating-ui.ts` asserts the two never drift, because a
 * mirror that disagrees with its source is worse than no mirror at all: it looks like the truth.
 *
 * WHY A CASE HAS A STATE MACHINE AND NOT JUST A STATUS
 * ---------------------------------------------------
 * A cheating case is the one thing in this platform where being wrong is expensive: it can end a
 * student's degree, and a student who was cleared must be able to see that they were cleared, when,
 * and on what grounds. A single `status` column cannot say that. So a case has a status, and every
 * change of it leaves an EVENT — who did it, when, and what the case looked like before.
 *
 * THE STATES
 * ----------
 *   REPORTED          — raised, and nobody has looked at it yet
 *   UNDER_REVIEW      — a member of the desk is on it
 *   COMMITTEE_REVIEW  — referred to a committee for a second opinion
 *   ESCALATED         — referred out of the exam cell entirely
 *   CONFIRMED         — malpractice found
 *   DISMISSED         — no malpractice found
 *
 * `ESCALATED` is a peer of the decisions, not a stage before them: an escalated case may still come
 * back and be confirmed or dismissed, so it is reachable from `UNDER_REVIEW` and from
 * `COMMITTEE_REVIEW` alike.
 *
 * WHY RISK AND CLASSIFICATION ARE SEPARATE
 * ----------------------------------------
 * `riskLevel` is how SEVERE the allegation looks — it is a triage signal, and it is what the AI and
 * the invigilator assert. `classification` is what the misconduct ACTUALLY IS, and it is what a
 * penalty attaches to. A HIGH-risk case can be DISMISSED (the student was copying the person next
 * to them), and a LOW-risk case can be CONFIRMED (a phone in a bag, quietly). Collapsing them into
 * one field is why "confirmed" and "high risk" get used interchangeably on a screen and why a
 * penalty has nothing sound to attach to.
 */
import { badRequest } from '../../lib/errors.js';

// ── Blocks ─────────────────────────────────────────────────────────────────
//
// `route` is the FEATURE_MODULES key on the app, never invented by the app. Registering a block
// there is load-bearing and its failure is SILENT: `renderContent` looks the key up, finds nothing,
// and puts the controller back on the hub with no error anywhere. `audit-cheating-ui.ts` asserts every
// block has a registry entry and points at its own component.

export type Block = {
  id: string;
  label: string;
  blurb: string;
  icon: string;
  color: string;
  route: string;
  isTab: boolean;
  order: number;
  /** True = the block cannot render without a `caseId`, and says so with 422. */
  requiresCase: boolean;
};

export const BLOCKS: Block[] = [
  {
    id: 'QUEUE',
    label: 'Case queue',
    blurb: 'Every case, what it is waiting for, and which are overdue.',
    icon: 'albums-outline',
    color: '#2563eb',
    route: 'CheatingCasesQueue',
    isTab: false,
    order: 1,
    requiresCase: false,
  },
  {
    id: 'REPORT',
    label: 'Report malpractice',
    blurb: 'Raise a case: who, which exam, what was seen, and the evidence.',
    icon: 'create-outline',
    color: '#dc2626',
    route: 'CheatingCasesReport',
    isTab: false,
    order: 2,
    requiresCase: false,
  },
  {
    id: 'COMMITTEE',
    label: 'Committee review',
    blurb: 'Cases referred for a second opinion, and the findings.',
    icon: 'people-outline',
    color: '#7c3aed',
    route: 'CheatingCasesCommittee',
    isTab: false,
    order: 3,
    requiresCase: false,
  },
  {
    id: 'HISTORY',
    label: 'Historical records',
    blurb: 'Every decided case, filterable by student, exam and outcome.',
    icon: 'time-outline',
    color: '#0891b2',
    route: 'CheatingCasesHistory',
    isTab: false,
    order: 4,
    requiresCase: false,
  },
  {
    id: 'CASE',
    label: 'Case file',
    blurb: 'One case: evidence, the statement, the review, the decision, the timeline.',
    icon: 'document-text-outline',
    color: '#d97706',
    route: 'CheatingCasesDetail',
    isTab: false,
    order: 5,
    requiresCase: true,
  },
];

export const BLOCK_IDS = BLOCKS.map((b) => b.id);
export const blockMeta = (id: string): Block | null => BLOCKS.find((b) => b.id === id) ?? null;

export function assertBlock(v: unknown): string {
  if (typeof v !== 'string' || !BLOCK_IDS.includes(v as never)) {
    throw badRequest(`Unknown block: ${String(v)}`);
  }
  return v;
}

// ── Case status ───────────────────────────────────────────────────────────

export const CASE_STATUSES = [
  'REPORTED',
  'UNDER_REVIEW',
  'COMMITTEE_REVIEW',
  'ESCALATED',
  'CONFIRMED',
  'DISMISSED',
] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const CASE_STATUS_META: Record<
  CaseStatus,
  { label: string; color: string; icon: string; terminal: boolean; blurb: string }
> = {
  REPORTED: {
    label: 'Reported',
    color: '#0891b2',
    icon: 'flag-outline',
    terminal: false,
    blurb: 'Raised. Nobody has looked at it yet.',
  },
  UNDER_REVIEW: {
    label: 'Under review',
    color: '#d97706',
    icon: 'search-outline',
    terminal: false,
    blurb: 'A member of the desk is on it.',
  },
  COMMITTEE_REVIEW: {
    label: 'Committee review',
    color: '#7c3aed',
    icon: 'people-outline',
    terminal: false,
    blurb: 'Referred for a second opinion.',
  },
  ESCALATED: {
    label: 'Escalated',
    color: '#4f46e5',
    icon: 'trending-up-outline',
    terminal: false,
    blurb: 'Referred out of the exam cell. May still come back and be decided.',
  },
  CONFIRMED: {
    label: 'Confirmed',
    color: '#dc2626',
    icon: 'alert-circle-outline',
    terminal: true,
    blurb: 'Malpractice found.',
  },
  DISMISSED: {
    label: 'Dismissed',
    color: '#059669',
    icon: 'checkmark-circle-outline',
    terminal: true,
    blurb: 'No malpractice found.',
  },
};

export function assertCaseStatus(v: unknown): CaseStatus {
  if (typeof v !== 'string' || !CASE_STATUSES.includes(v as never)) {
    throw badRequest(`Unknown case status: ${String(v)}`);
  }
  return v as CaseStatus;
}

// ── The moves ──────────────────────────────────────────────────────────────
//
// The legal transitions. A case that has been CONFIRMED cannot quietly become DISMISSED, and a
// DISMISSED case cannot be re-decided without being REOPENED first — because a decision that a person
// can overwrite by accident is not a decision.
//
// `ESCALATED` is reachable from either open state, and an ESCALATED case can still be decided: it is
// a place a case can go, not a dead end.

export const CASE_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  REPORTED: ['UNDER_REVIEW', 'ESCALATED', 'CONFIRMED', 'DISMISSED'],
  UNDER_REVIEW: ['COMMITTEE_REVIEW', 'ESCALATED', 'CONFIRMED', 'DISMISSED'],
  COMMITTEE_REVIEW: ['UNDER_REVIEW', 'ESCALATED', 'CONFIRMED', 'DISMISSED'],
  ESCALATED: ['UNDER_REVIEW', 'COMMITTEE_REVIEW', 'CONFIRMED', 'DISMISSED'],
  // A decided case is decided. Reopening is an explicit act, and it leaves a REOPENED event.
  CONFIRMED: ['UNDER_REVIEW'],
  DISMISSED: ['UNDER_REVIEW'],
};

export function canTransition(from: string, to: string): boolean {
  const allowed = CASE_TRANSITIONS[from as CaseStatus];
  return Array.isArray(allowed) && allowed.includes(to as CaseStatus);
}

export function assertTransition(from: string, to: string) {
  if (!canTransition(from, to)) {
    const legal = (CASE_TRANSITIONS[from as CaseStatus] ?? []).join(', ') || 'nothing';
    throw badRequest(`A ${from} case cannot become ${to}. Legal moves: ${legal}`);
  }
}

// ── Risk ───────────────────────────────────────────────────────────────────

export const RISK_LEVELS = ['HIGH', 'MEDIUM', 'LOW'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const RISK_META: Record<RiskLevel, { label: string; color: string; bg: string; blurb: string }> = {
  HIGH: {
    label: 'High risk',
    color: '#dc2626',
    bg: '#fef2f2',
    blurb: 'Unauthorised material, an impersonated student, or a second person in the room.',
  },
  MEDIUM: {
    label: 'Medium risk',
    color: '#d97706',
    bg: '#fffbeb',
    blurb: 'Answer similarity, an unusual timing pattern, or a device found switched off.',
  },
  LOW: {
    label: 'Low risk',
    color: '#ca8a04',
    bg: '#fefce8',
    blurb: 'Looking around, or a pattern worth noting but not acting on alone.',
  },
};

export function assertRiskLevel(v: unknown): RiskLevel {
  if (typeof v !== 'string' || !RISK_LEVELS.includes(v as never)) {
    throw badRequest(`Unknown risk level: ${String(v)}`);
  }
  return v as RiskLevel;
}

// ── Classification ─────────────────────────────────────────────────────────
//
// WHAT the misconduct is, as opposed to how risky it looks. A penalty attaches to a classification,
// not to a risk level, because "this student was found with a phone" and "this student was copying
// the answers" are different findings and attract different consequences.

export const CLASSIFICATIONS = [
  'IMPERSONATION',
  'HIDDEN_DEVICE',
  'COPY_PASTE',
  'ANSWER_SIMILARITY',
  'TIMING_PATTERN',
  'LOOKING_AROUND',
  'POSSESSION',
  'OTHER',
] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];

export const CLASSIFICATION_META: Record<
  Classification,
  { label: string; blurb: string; defaultRisk: RiskLevel }
> = {
  IMPERSONATION: {
    label: 'Impersonation',
    blurb: 'Someone else sat the exam for the student.',
    defaultRisk: 'HIGH',
  },
  HIDDEN_DEVICE: {
    label: 'Hidden device',
    blurb: 'A phone, smartwatch or other device found on the person.',
    defaultRisk: 'HIGH',
  },
  COPY_PASTE: {
    label: 'Copy-paste',
    blurb: 'Answers match an external source rather than the student\'s own.',
    defaultRisk: 'HIGH',
  },
  ANSWER_SIMILARITY: {
    label: 'Answer similarity',
    blurb: 'Answers overlap heavily with another script.',
    defaultRisk: 'MEDIUM',
  },
  TIMING_PATTERN: {
    label: 'Timing pattern',
    blurb: 'Response times are not consistent with someone reading and thinking.',
    defaultRisk: 'MEDIUM',
  },
  LOOKING_AROUND: {
    label: 'Looking around',
    blurb: 'Repeated movement towards another seat or the invigilator.',
    defaultRisk: 'LOW',
  },
  POSSESSION: {
    label: 'Possession of material',
    blurb: 'Notes, a textbook or a formula sheet that was not permitted.',
    defaultRisk: 'MEDIUM',
  },
  OTHER: {
    label: 'Other',
    blurb: 'Anything the classification list does not cover.',
    defaultRisk: 'LOW',
  },
};

export function assertClassification(v: unknown): Classification {
  if (typeof v !== 'string' || !CLASSIFICATIONS.includes(v as never)) {
    throw badRequest(`Unknown classification: ${String(v)}`);
  }
  return v as Classification;
}

// ── Sources ───────────────────────────────────────────────────────────────
//
// `AI` and `INVIGILATOR` are REPORTING SOURCES, not verdicts. A case raised by the AI is a signal
// that something looked wrong, and it is reviewed exactly like one an invigilator raised — the
// source says who noticed, not what happened.

export const CASE_SOURCES = ['AI', 'INVIGILATOR', 'STUDENT_REPORT', 'EXTERNAL'] as const;
export type CaseSource = (typeof CASE_SOURCES)[number];

export const SOURCE_META: Record<CaseSource, { label: string; blurb: string }> = {
  AI: {
    label: 'Pattern detection',
    blurb: 'Raised by the platform from timing or similarity analysis.',
  },
  INVIGILATOR: {
    label: 'Invigilator',
    blurb: 'Raised by the person on duty in the room.',
  },
  STUDENT_REPORT: {
    label: 'Student report',
    blurb: 'Raised by a student.',
  },
  EXTERNAL: {
    label: 'External',
    blurb: 'Raised from outside the exam cell — an external examiner, or a result audit.',
  },
};

export function assertCaseSource(v: unknown): CaseSource {
  if (typeof v !== 'string' || !CASE_SOURCES.includes(v as never)) {
    throw badRequest(`Unknown case source: ${String(v)}`);
  }
  return v as CaseSource;
}

// ── Penalties ──────────────────────────────────────────────────────────────
//
// The consequence of a CONFIRMED case. `NONE` is a real option and not a shrug: a finding of
// malpractice with no penalty is a decision, and it is recorded as one.

export const PENALTIES = [
  'WARNING',
  'REPEAT_OFFENDER',
  'SUSPENSION',
  'CANCEL_EXAM',
  'EXCLUSION',
  'NONE',
] as const;
export type Penalty = (typeof PENALTIES)[number];

export const PENALTY_META: Record<
  Penalty,
  { label: string; blurb: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' }
> = {
  WARNING: {
    label: 'Formal warning',
    blurb: 'Recorded on the student\'s file, no further consequence this sitting.',
    severity: 'LOW',
  },
  REPEAT_OFFENDER: {
    label: 'Repeat offender',
    blurb: 'Referred to the disciplinary board with the case history attached.',
    severity: 'HIGH',
  },
  SUSPENSION: {
    label: 'Suspension',
    blurb: 'The student is suspended from the next examination sitting.',
    severity: 'MEDIUM',
  },
  CANCEL_EXAM: {
    label: 'Exam cancelled',
    blurb: 'This sitting does not count towards the student\'s result.',
    severity: 'HIGH',
  },
  EXCLUSION: {
    label: 'Exclusion from the programme',
    blurb: 'The student is excluded from the programme pending the board\'s outcome.',
    severity: 'HIGH',
  },
  NONE: {
    label: 'No penalty',
    blurb: 'Malpractice found, but no further consequence. A decision, and recorded as one.',
    severity: 'LOW',
  },
};

export function assertPenalty(v: unknown): Penalty {
  if (typeof v !== 'string' || !PENALTIES.includes(v as never)) {
    throw badRequest(`Unknown penalty: ${String(v)}`);
  }
  return v as Penalty;
}

// ── Evidence kinds ─────────────────────────────────────────────────────────

export const EVIDENCE_KINDS = [
  'SCREENSHOT',
  'SCRIPT',
  'DEVICE_PHOTO',
  'REPORT',
  'STATEMENT_DOCUMENT',
  'OTHER',
] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const EVIDENCE_KIND_META: Record<EvidenceKind, { label: string; blurb: string }> = {
  SCREENSHOT: { label: 'Screenshot', blurb: 'A captured screen or image.' },
  SCRIPT: { label: 'Answer script', blurb: 'The answer script itself.' },
  DEVICE_PHOTO: { label: 'Device photo', blurb: 'A photograph of a device or material found.' },
  REPORT: { label: 'Report', blurb: 'A written report from the invigilator or examiner.' },
  STATEMENT_DOCUMENT: { label: 'Statement', blurb: "The student's written account, signed." },
  OTHER: { label: 'Other', blurb: 'Anything the list does not cover.' },
};

export function assertEvidenceKind(v: unknown): EvidenceKind {
  if (typeof v !== 'string' || !EVIDENCE_KINDS.includes(v as never)) {
    throw badRequest(`Unknown evidence kind: ${String(v)}`);
  }
  return v as EvidenceKind;
}

// ── Timeline event types ───────────────────────────────────────────────────

export const CASE_EVENT_TYPES = [
  'REPORTED',
  'CLASSIFIED',
  'STATEMENT_TAKEN',
  'COMMITTEE_REVIEW',
  'DECIDED',
  'ESCALATED',
  'REOPENED',
  'NOTIFIED',
  'EVIDENCE_ADDED',
  'NOTE_ADDED',
] as const;
export type CaseEventType = (typeof CASE_EVENT_TYPES)[number];

export const EVENT_META: Record<CaseEventType, { label: string; icon: string; color: string }> = {
  REPORTED: { label: 'Reported', icon: 'flag-outline', color: '#0891b2' },
  CLASSIFIED: { label: 'Classified', icon: 'pricetag-outline', color: '#d97706' },
  STATEMENT_TAKEN: { label: 'Statement taken', icon: 'chatbox-ellipses-outline', color: '#7c3aed' },
  COMMITTEE_REVIEW: { label: 'Committee review', icon: 'people-outline', color: '#7c3aed' },
  DECIDED: { label: 'Decision', icon: 'gavel-outline', color: '#dc2626' },
  ESCALATED: { label: 'Escalated', icon: 'trending-up-outline', color: '#4f46e5' },
  REOPENED: { label: 'Reopened', icon: 'refresh-outline', color: '#d97706' },
  NOTIFIED: { label: 'Student notified', icon: 'notifications-outline', color: '#059669' },
  EVIDENCE_ADDED: { label: 'Evidence added', icon: 'attach-outline', color: '#2563eb' },
  NOTE_ADDED: { label: 'Note', icon: 'chatbubble-outline', color: '#64748b' },
};

export function assertEventType(v: unknown): CaseEventType {
  if (typeof v !== 'string' || !CASE_EVENT_TYPES.includes(v as never)) {
    throw badRequest(`Unknown event type: ${String(v)}`);
  }
  return v as CaseEventType;
}

/**
 * How long a case may sit before the desk should look at it, per risk.
 *
 * A HIGH-risk case that sits unreviewed for a fortnight is a failure of the desk, not of the
 * student, and the queue needs to say so. These are the numbers the "overdue" badge counts against.
 */
export const OVERDUE_HOURS: Record<RiskLevel, number> = {
  HIGH: 24,
  MEDIUM: 72,
  LOW: 168,
};
