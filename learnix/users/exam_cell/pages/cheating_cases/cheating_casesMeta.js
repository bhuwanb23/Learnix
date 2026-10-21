/**
 * X-08 — Cheating cases: the pieces every cheating screen shares.
 * (docs/users/05 §3.6)
 *
 * This is a MIRROR of `cheating.rules.ts`, and it exists so a screen can colour and label a row
 * without a second round trip. It is not the authority: the catalogue publishes the same lists, and a
 * screen that has fetched it prefers those. The mirror is the FALLBACK — for the frame before the
 * catalogue lands, and for the error state.
 *
 * `audit-cheating-ui.ts` asserts that the two never drift, because a mirror that disagrees with its
 * source is worse than no mirror at all: it looks like the truth.
 *
 * WHY THE COLOURS ARE HERE AND NOT ONLY ON THE SERVER
 * --------------------------------------------------
 * A risk colour is a decision about how alarming something is, and it has to be the same decision
 * everywhere it is drawn. These values are the SAME hex codes the server publishes in `RISK_META`, and
 * the audit script checks them.
 */
import { Ionicons } from '@expo/vector-icons';

export const THEME = '#2563eb';
export const RED = '#dc2626';
export const AMBER = '#d97706';
export const GREEN = '#059669';
export const VIOLET = '#7c3aed';
export const INDIGO = '#4f46e5';
export const CYAN = '#0891b2';
export const SLATE = '#64748b';
export const MUTED = '#94a3b8';

// ── Blocks ─────────────────────────────────────────────────────────────────
//
// Every `route` here is a FEATURE_MODULES key on the app, never invented by the app. Registering
// them there is load-bearing and its failure is SILENT: `renderContent` looks the key up, finds
// nothing, and puts the controller back on the hub with no error anywhere.
//
// The order is the order they are drawn in. The CASE block is last because it needs a case id, and
// a block that cannot render without one says so rather than opening onto nothing.

export const BLOCKS = [
  {
    id: 'QUEUE',
    label: 'Case queue',
    blurb: 'Every case, what it is waiting for, and which are overdue.',
    icon: 'albums-outline',
    color: THEME,
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
    color: RED,
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
    color: VIOLET,
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
    color: CYAN,
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
    color: AMBER,
    route: 'CheatingCasesDetail',
    isTab: false,
    order: 5,
    requiresCase: true,
  },
];

export const BLOCK_IDS = BLOCKS.map((b) => b.id);

// ── Case status ───────────────────────────────────────────────────────────

export const STATUS_META = {
  REPORTED: { label: 'Reported', color: CYAN, icon: 'flag-outline', terminal: false },
  UNDER_REVIEW: { label: 'Under review', color: AMBER, icon: 'search-outline', terminal: false },
  COMMITTEE_REVIEW: { label: 'Committee review', color: VIOLET, icon: 'people-outline', terminal: false },
  ESCALATED: { label: 'Escalated', color: INDIGO, icon: 'trending-up-outline', terminal: false },
  CONFIRMED: { label: 'Confirmed', color: RED, icon: 'alert-circle-outline', terminal: true },
  DISMISSED: { label: 'Dismissed', color: GREEN, icon: 'checkmark-circle-outline', terminal: true },
};

export const STATUS_ORDER = [
  'REPORTED',
  'UNDER_REVIEW',
  'COMMITTEE_REVIEW',
  'ESCALATED',
  'CONFIRMED',
  'DISMISSED',
];

export const statusMeta = (status) => STATUS_META[status] ?? STATUS_META.UNDER_REVIEW;

// ── Risk ──────────────────────────────────────────────────────────────────

export const RISK_META = {
  HIGH: { label: 'High risk', color: RED, bg: '#fef2f2' },
  MEDIUM: { label: 'Medium risk', color: AMBER, bg: '#fffbeb' },
  LOW: { label: 'Low risk', color: '#ca8a04', bg: '#fefce8' },
};

export const riskMeta = (risk) => RISK_META[risk] ?? RISK_META.LOW;

export const RISK_ORDER = ['HIGH', 'MEDIUM', 'LOW'];

// ── Classification ────────────────────────────────────────────────────────
//
// WHAT the misconduct is, as distinct from how risky it looked. A HIGH-risk case can be DISMISSED
// and a LOW-risk case can be CONFIRMED, so the two are shown separately wherever a case is shown.

export const CLASSIFICATION_META = {
  IMPERSONATION: { label: 'Impersonation', blurb: 'Someone else sat the exam for the student.' },
  HIDDEN_DEVICE: { label: 'Hidden device', blurb: 'A phone, smartwatch or other device found on the person.' },
  COPY_PASTE: { label: 'Copy-paste', blurb: 'Answers match an external source rather than the student\'s own.' },
  ANSWER_SIMILARITY: { label: 'Answer similarity', blurb: 'Answers overlap heavily with another script.' },
  TIMING_PATTERN: { label: 'Timing pattern', blurb: 'Response times do not match someone reading and thinking.' },
  LOOKING_AROUND: { label: 'Looking around', blurb: 'Repeated movement towards another seat or the invigilator.' },
  POSSESSION: { label: 'Possession of material', blurb: 'Notes, a textbook or a formula sheet that was not permitted.' },
  OTHER: { label: 'Other', blurb: 'Anything the classification list does not cover.' },
};

export const classificationMeta = (id) =>
  (id && CLASSIFICATION_META[id]) || { label: 'Not classified', blurb: 'What this is has not been decided yet.' };

// ── Penalties ─────────────────────────────────────────────────────────────

export const PENALTY_META = {
  WARNING: { label: 'Formal warning', severity: 'LOW' },
  REPEAT_OFFENDER: { label: 'Repeat offender', severity: 'HIGH' },
  SUSPENSION: { label: 'Suspension', severity: 'MEDIUM' },
  CANCEL_EXAM: { label: 'Exam cancelled', severity: 'HIGH' },
  EXCLUSION: { label: 'Exclusion from the programme', severity: 'HIGH' },
  NONE: { label: 'No penalty', severity: 'LOW' },
};

export const penaltyMeta = (id) =>
  (id && PENALTY_META[id]) || { label: '—', severity: 'LOW' };

// ── Sources ───────────────────────────────────────────────────────────────
//
// `AI` and `INVIGILATOR` are REPORTING SOURCES, not verdicts. A case raised by pattern detection is
// a signal that something looked wrong, and it is reviewed exactly like one an invigilator raised.

export const SOURCE_META = {
  AI: { label: 'Pattern detection', icon: 'sparkles-outline' },
  INVIGILATOR: { label: 'Invigilator', icon: 'eye-outline' },
  STUDENT_REPORT: { label: 'Student report', icon: 'megaphone-outline' },
  EXTERNAL: { label: 'External', icon: 'globe-outline' },
};

export const sourceMeta = (id) => SOURCE_META[id] ?? { label: id ?? '—', icon: 'help-circle-outline' };

// ── Evidence kinds ────────────────────────────────────────────────────────

export const EVIDENCE_META = {
  SCREENSHOT: { label: 'Screenshot', icon: 'image-outline' },
  SCRIPT: { label: 'Answer script', icon: 'document-text-outline' },
  DEVICE_PHOTO: { label: 'Device photo', icon: 'camera-outline' },
  REPORT: { label: 'Report', icon: 'clipboard-outline' },
  STATEMENT_DOCUMENT: { label: 'Statement', icon: 'chatbox-ellipses-outline' },
  OTHER: { label: 'Other', icon: 'attach-outline' },
};

export const evidenceMeta = (id) => EVIDENCE_META[id] ?? EVIDENCE_META.OTHER;

// ── Timeline event types ───────────────────────────────────────────────────

export const EVENT_META = {
  REPORTED: { label: 'Reported', icon: 'flag-outline', color: CYAN },
  CLASSIFIED: { label: 'Classified', icon: 'pricetag-outline', color: AMBER },
  STATEMENT_TAKEN: { label: 'Statement taken', icon: 'chatbox-ellipses-outline', color: VIOLET },
  COMMITTEE_REVIEW: { label: 'Committee review', icon: 'people-outline', color: VIOLET },
  DECIDED: { label: 'Decision', icon: 'gavel-outline', color: RED },
  ESCALATED: { label: 'Escalated', icon: 'trending-up-outline', color: INDIGO },
  REOPENED: { label: 'Reopened', icon: 'refresh-outline', color: AMBER },
  NOTIFIED: { label: 'Student notified', icon: 'notifications-outline', color: GREEN },
  EVIDENCE_ADDED: { label: 'Evidence added', icon: 'attach-outline', color: THEME },
  NOTE_ADDED: { label: 'Note', icon: 'chatbubble-outline', color: SLATE },
};

export const eventMeta = (type) => EVENT_META[type] ?? { label: type, icon: 'ellipse-outline', color: SLATE };

// ── Small helpers shared by the screens ───────────────────────────────────

/** "3 cases" / "1 case" — the plural that reads right. */
export function plural(n, word, suffix = 's') {
  return `${n} ${word}${n === 1 ? '' : suffix}`;
}

/** "2 hours ago" / "3 days ago" / "just now". */
export function timeAgo(iso) {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
}

/** A date, in the form a warden reads on a case file. */
export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

/** A date and a time, for a decision stamp. */
export function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${fmtDate(iso)}, ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}

/** The initials a case row shows instead of a photo. */
export function initials(name) {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

/** An icon for the risk level, so the row is readable without colour. */
export const riskIcon = (risk) =>
  risk === 'HIGH' ? 'alert-circle' : risk === 'MEDIUM' ? 'alert-circle-outline' : 'information-circle-outline';

/** An icon for the status, so the row is readable without colour. */
export const statusIcon = (status) => Ionicons ? statusMeta(status).icon : 'ellipse-outline';
