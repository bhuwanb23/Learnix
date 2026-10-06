// X-04 Hall tickets — the rules the server and the app must BOTH agree on
// (docs/users/05 §3.5).
//
// This module is deliberately PRISMA-FREE. Everything here is a published
// choice — which blocks exist, what a request kind means, which statuses are
// legal, what counts as an eligibility warning — and every one of those is
// something a client would otherwise re-decide for itself. A client that
// invents its own notion of "eligible" will eventually disagree with the
// server about who may sit an exam, and it will disagree silently.
//
// THE POLICY THAT SHAPES THIS FILE: eligibility WARNINGS NEVER BLOCK. The
// agreed rule is that every student with an ACTIVE enrolment gets a ticket,
// whatever the fee, photo or profile warnings say. So nothing in
// `ELIGIBILITY_REASONS` carries a `blocking` flag at all — there is nothing
// for it to be true or false about, and leaving the field out is a smaller lie
// than leaving it in and setting it false. Generation refuses only for things
// that are not eligibility: a missing exam, an unknown id, a malformed body.
import { unprocessable } from '../../lib/errors.js';

// ═══ Blocks ══════════════════════════════════════════════════════════════
//
// `route` is the FEATURE_MODULES key on the app, never invented by the app.
// `isTab` is false for all seven: the hall-ticket hub is itself a feature
// module opened from the dashboard, so every block is reached through
// `openModule`, not through the bottom nav.
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
    id: 'ELIGIBILITY',
    label: 'Student eligibility',
    blurb: 'Who can sit this exam, and what is worth a second look.',
    icon: 'checkbox-outline',
    color: '#059669',
    route: 'HallTicketsEligibility',
    isTab: false,
    order: 1,
    requiresExam: true,
  },
  {
    id: 'GENERATION',
    label: 'Generate tickets',
    blurb: 'Issue one ticket, or the whole exam in one pass.',
    icon: 'flash-outline',
    color: '#2563eb',
    route: 'HallTicketsGeneration',
    isTab: false,
    order: 2,
    requiresExam: true,
  },
  {
    id: 'TICKETS',
    label: 'Tickets & printing',
    blurb: 'Every issued ticket, with the student, photo and seat — ready to print.',
    icon: 'print-outline',
    color: '#7c3aed',
    route: 'HallTicketsList',
    isTab: false,
    order: 3,
    requiresExam: true,
  },
  {
    id: 'SCHEDULE',
    label: 'Subjects & schedule',
    blurb: 'What each student is sitting, and when.',
    icon: 'time-outline',
    color: '#d97706',
    route: 'HallTicketsSchedule',
    isTab: false,
    order: 4,
    requiresExam: false,
  },
  {
    id: 'VENUE',
    label: 'Examination centre',
    blurb: 'Where each paper is held, who invigilates, and how many seats are left.',
    icon: 'business-outline',
    color: '#0284c7',
    route: 'HallTicketsCentre',
    isTab: false,
    order: 5,
    requiresExam: false,
  },
  {
    id: 'REQUESTS',
    label: 'Corrections & reissues',
    blurb: 'What students have asked to fix, and what has been decided.',
    icon: 'swap-horizontal-outline',
    color: '#b45309',
    route: 'HallTicketsRequests',
    isTab: false,
    order: 6,
    requiresExam: false,
  },
  {
    id: 'PUBLICATION',
    label: 'Publication status',
    blurb: 'Whether students can see their tickets yet — and take them back down.',
    icon: 'megaphone-outline',
    color: '#4f46e5',
    route: 'HallTicketsPublication',
    isTab: false,
    order: 7,
    requiresExam: false,
  },
];

export const BLOCK_IDS = BLOCKS.map((b) => b.id);
export const blockMeta = (id: string): Block | null => BLOCKS.find((b) => b.id === id) ?? null;

/**
 * A block is a CHOICE FROM A PUBLISHED LIST, not a record that might exist, so
 * "there is no block called that" is a statement about the REQUEST — 422.
 */
export function assertBlock(v: unknown): string {
  const s = String(v ?? '').trim().toUpperCase();
  if (!BLOCK_IDS.includes(s)) {
    throw unprocessable(`Unknown block "${v}"`, { allowed: BLOCK_IDS, received: v ?? null });
  }
  return s;
}

// ═══ Request kinds ════════════════════════════════════════════════════════
//
// ONE queue for both kinds, because approving and rejecting is one workflow.
// `needsField` is what makes them different: a correction says WHICH printed
// detail is wrong and what it should say, a reissue just means "print me a new
// one" and regenerates seat + QR on completion.

export const REQUEST_KINDS = ['CORRECTION', 'REISSUE'] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

export const REQUEST_KIND_META: Record<
  RequestKind,
  { label: string; blurb: string; needsField: boolean; icon: string; color: string }
> = {
  CORRECTION: {
    label: 'Correction',
    blurb: 'A printed detail is wrong — name, roll number or seat.',
    needsField: true,
    icon: 'create-outline',
    color: '#b45309',
  },
  REISSUE: {
    label: 'Reissue',
    blurb: 'Lost, damaged or invalidated. A new seat and QR are generated.',
    needsField: false,
    icon: 'refresh-outline',
    color: '#7c3aed',
  },
};

export function assertRequestKind(v: unknown): RequestKind {
  const s = String(v ?? '').trim().toUpperCase();
  if (!(REQUEST_KINDS as readonly string[]).includes(s)) {
    throw unprocessable(`Unknown request kind "${v}"`, { allowed: REQUEST_KINDS, received: v ?? null });
  }
  return s as RequestKind;
}

// ═══ Request statuses ═════════════════════════════════════════════════════
//
// REQUESTED → APPROVED|REJECTED → COMPLETED. Only an APPROVED request may be
// completed, and completing one is what actually rewrites the data — the
// decision and the effect are separate steps on purpose, so an approver never
// changes a student's record by accident.

export const REQUEST_STATUSES = ['REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_STATUS_META: Record<
  RequestStatus,
  { label: string; tone: 'info' | 'good' | 'bad' | 'done'; color: string }
> = {
  REQUESTED: { label: 'Requested', tone: 'info', color: '#2563eb' },
  APPROVED: { label: 'Approved', tone: 'good', color: '#059669' },
  REJECTED: { label: 'Rejected', tone: 'bad', color: '#dc2626' },
  COMPLETED: { label: 'Completed', tone: 'done', color: '#7c3aed' },
};

export function assertRequestStatus(v: unknown): RequestStatus {
  const s = String(v ?? '').trim().toUpperCase();
  if (!(REQUEST_STATUSES as readonly string[]).includes(s)) {
    throw unprocessable(`Unknown request status "${v}"`, { allowed: REQUEST_STATUSES, received: v ?? null });
  }
  return s as RequestStatus;
}

/** What a decision may move a request to. Not COMPLETED — that is a separate call. */
export const DECISIONS = ['APPROVED', 'REJECTED'] as const;
export type Decision = (typeof DECISIONS)[number];

export function assertDecision(v: unknown): Decision {
  const s = String(v ?? '').trim().toUpperCase();
  if (!(DECISIONS as readonly string[]).includes(s)) {
    throw unprocessable(`Unknown decision "${v}"`, { allowed: DECISIONS, received: v ?? null });
  }
  return s as Decision;
}

// ═══ Correctable fields ═══════════════════════════════════════════════════
//
// Only fields that CAN be applied are offered. A photo correction, for example,
// is not offered: an exam cell cannot upload a student's photograph, so a form
// that accepted one would collect a promise nobody could keep. `target` says
// which row a completion actually writes, because "correct the roll number"
// means the student profile, not the ticket.

export const CORRECTABLE_FIELDS = ['seatNo', 'rollNo', 'fullName'] as const;
export type CorrectableField = (typeof CORRECTABLE_FIELDS)[number];

export const CORRECTABLE_FIELD_META: Record<
  CorrectableField,
  { label: string; blurb: string; target: 'hallTicket' | 'studentProfile' | 'user' }
> = {
  seatNo: {
    label: 'Seat number',
    blurb: 'Rewrites the seat on this ticket and regenerates its QR.',
    target: 'hallTicket',
  },
  rollNo: {
    label: 'Roll number',
    blurb: 'Rewrites the roll number on the student record.',
    target: 'studentProfile',
  },
  fullName: {
    label: 'Full name',
    blurb: 'Rewrites the name on the user record, which every screen reads.',
    target: 'user',
  },
};

export function assertCorrectableField(v: unknown): CorrectableField {
  const s = String(v ?? '').trim();
  if (!(CORRECTABLE_FIELDS as readonly string[]).includes(s)) {
    throw unprocessable(`Unknown field "${v}"`, { allowed: CORRECTABLE_FIELDS, received: v ?? null });
  }
  return s as CorrectableField;
}

// ═══ Publication ══════════════════════════════════════════════════════════
//
// Its OWN gate on Exam, deliberately not the exam's `status`: the timetable
// going out and the hall tickets going out are two decisions taken on
// different days, and `status` is already spoken for by the results workflow.
// A RECALLED exam hides its tickets again — that is the whole point of a
// third state rather than a boolean.

export const PUBLICATION_STATUSES = ['DRAFT', 'PUBLISHED', 'RECALLED'] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export const PUBLICATION_STATUS_META: Record<
  PublicationStatus,
  { label: string; blurb: string; color: string; visible: boolean }
> = {
  DRAFT: {
    label: 'Not published',
    blurb: 'Tickets exist but students cannot see them.',
    color: '#64748b',
    visible: false,
  },
  PUBLISHED: {
    label: 'Published',
    blurb: 'Students can see and download their tickets.',
    color: '#059669',
    visible: true,
  },
  RECALLED: {
    label: 'Recalled',
    blurb: 'Taken back — students see nothing until it is published again.',
    color: '#dc2626',
    visible: false,
  },
};

export function assertPublicationStatus(v: unknown): PublicationStatus {
  const s = String(v ?? '').trim().toUpperCase();
  if (!(PUBLICATION_STATUSES as readonly string[]).includes(s)) {
    throw unprocessable(`Unknown publication status "${v}"`, {
      allowed: PUBLICATION_STATUSES,
      received: v ?? null,
    });
  }
  return s as PublicationStatus;
}

/** The only transitions `setPublication` accepts from the app. */
export const PUBLICATION_ACTIONS = ['publish', 'recall'] as const;
export type PublicationAction = (typeof PUBLICATION_ACTIONS)[number];

export function assertPublicationAction(v: unknown): PublicationAction {
  const s = String(v ?? '').trim().toLowerCase();
  if (!(PUBLICATION_ACTIONS as readonly string[]).includes(s)) {
    throw unprocessable(`Unknown publication action "${v}"`, {
      allowed: PUBLICATION_ACTIONS,
      received: v ?? null,
    });
  }
  return s as PublicationAction;
}

// ═══ Ticket statuses ══════════════════════════════════════════════════════

export const TICKET_STATUSES = ['GENERATED', 'DOWNLOADED', 'NOT_GENERATED'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_STATUS_META: Record<
  TicketStatus,
  { label: string; color: string; tone: 'info' | 'good' | 'muted' }
> = {
  GENERATED: { label: 'Generated', color: '#2563eb', tone: 'info' },
  DOWNLOADED: { label: 'Downloaded', color: '#059669', tone: 'good' },
  NOT_GENERATED: { label: 'Not generated', color: '#64748b', tone: 'muted' },
};

// ═══ Eligibility reasons ══════════════════════════════════════════════════
//
// WARNINGS, in the agreed sense: none of them stops generation. `severity`
// exists so the controller can see which warning matters, and because a list
// where every row is red is a list nobody reads.
//
// `NO_SCHEDULED_PAPER` is the one worth reading twice: a student who is
// enrolled but whose paper has no slot will never be issued a ticket by a
// bulk run, because there is no slot to attach it to. It is reported here as a
// warning rather than an error, because adding the slot is the fix.

export const ELIGIBILITY_REASONS = [
  {
    id: 'PROFILE_NOT_ACTIVE',
    label: 'Profile is not active',
    blurb: 'The student record is dropped or otherwise inactive.',
    severity: 'HIGH',
    icon: 'person-remove-outline',
    color: '#dc2626',
  },
  {
    id: 'ENROLLMENT_DROPPED',
    label: 'Enrolment dropped',
    blurb: 'They are not enrolled in this paper any more.',
    severity: 'HIGH',
    icon: 'close-circle-outline',
    color: '#dc2626',
  },
  {
    id: 'NO_SCHEDULED_PAPER',
    label: 'No scheduled paper',
    blurb: 'Enrolled, but nothing in this exam has a slot for them yet.',
    severity: 'MEDIUM',
    icon: 'calendar-outline',
    color: '#d97706',
  },
  {
    id: 'FEES_OUTSTANDING',
    label: 'Fees outstanding',
    blurb: 'Something is unpaid or partly paid. Shown, never enforced.',
    severity: 'MEDIUM',
    icon: 'card-outline',
    color: '#d97706',
  },
  {
    id: 'NO_PHOTO',
    label: 'No photograph on file',
    blurb: 'The ticket will print with initials instead of a photo.',
    severity: 'LOW',
    icon: 'image-outline',
    color: '#64748b',
  },
  {
    id: 'TICKET_ALREADY_ISSUED',
    label: 'Ticket already issued',
    blurb: 'Informational — they already have one for this paper.',
    severity: 'LOW',
    icon: 'checkmark-circle-outline',
    color: '#059669',
  },
] as const;

export type EligibilityReasonId = (typeof ELIGIBILITY_REASONS)[number]['id'];

export const ELIGIBILITY_REASON_IDS = ELIGIBILITY_REASONS.map((r) => r.id);

export const eligibilityReasonMeta = (id: string) =>
  ELIGIBILITY_REASONS.find((r) => r.id === id) ?? null;

// ═══ Seats ════════════════════════════════════════════════════════════════

export const SEAT_PREFIX = 'A-';

/**
 * The next free seat on a slot, given the ones already taken.
 *
 * Counting existing tickets is not enough: seats are unique PER SLOT, and a
 * gap left by a deleted ticket must not be reissued while an older ticket
 * still points at it. So the number is the smallest one above 0 that nobody
 * holds, rather than `taken.length + 1`.
 */
export function nextSeatNo(taken: readonly string[]): string {
  const used = new Set(taken);
  let n = 1;
  while (used.has(`${SEAT_PREFIX}${n}`)) n += 1;
  return `${SEAT_PREFIX}${n}`;
}

/** The QR payload. Includes the roll number, because a scan at the door has to identify the student, not just the seat. */
export function qrPayloadFor(slotId: string, rollNo: string, seatNo: string): string {
  return JSON.stringify({ slotId, rollNo, seat: seatNo });
}

// ═══ Policies ═════════════════════════════════════════════════════════════
//
// Published to the client as sentences, because a policy the client only has
// as code is a policy it can silently contradict.

export const THRESHOLDS = {
  /** Generation is never refused for an eligibility reason. See the header. */
  eligibilityPolicy: {
    blocksGeneration: false,
    sentence:
      'Warnings never stop a generation: every active enrolment gets a ticket, and the warnings are shown alongside.',
  },
  publishPolicy: {
    sentence: 'An exam with no generated ticket cannot be published — there would be nothing to publish.',
  },
  /** Bulk runs above this many tickets report what they did rather than doing it silently. */
  bulkReportLimit: 200,
} as const;
