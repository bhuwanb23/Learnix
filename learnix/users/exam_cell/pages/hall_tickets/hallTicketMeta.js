// X-04 Hall tickets — the pieces every hall-ticket screen shares
// (docs/users/05 §3.5).
//
// This is a MIRROR of `hallticket.rules.ts`, and it exists so the screen can
// colour and label a row without a second round trip. It is not the authority:
// the catalogue publishes the same lists, and a screen that has fetched it
// prefers those. The mirror is the FALLBACK — for the moment before the
// catalogue lands, and for the error state — and `audit-hallticket-ui.ts`
// asserts that the two never drift, because a mirror that disagrees with its
// source is worse than no mirror at all: it looks like the truth.
//
// THE POLICY, repeated here because a screen can contradict it without any
// code refusing to: ELIGIBILITY WARNINGS NEVER BLOCK. Nothing in
// `ELIGIBILITY_REASONS` stops a generation, and no screen may present one as
// though it did.

export const THEME = '#2563eb';
export const RED = '#dc2626';
export const AMBER = '#d97706';
export const GREEN = '#059669';
export const VIOLET = '#7c3aed';
export const INDIGO = '#4f46e5';
export const CYAN = '#0284c7';
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
    id: 'ELIGIBILITY',
    label: 'Student eligibility',
    blurb: 'Who can sit this exam, and what is worth a second look.',
    icon: 'checkbox-outline',
    color: GREEN,
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
    color: THEME,
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
    color: VIOLET,
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
    color: AMBER,
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
    color: CYAN,
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
    color: BROWN,
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
    color: INDIGO,
    route: 'HallTicketsPublication',
    isTab: false,
    order: 7,
    requiresExam: false,
  },
];

export const BLOCK_IDS = BLOCKS.map((b) => b.id);
export const blockMeta = (id) => BLOCKS.find((b) => b.id === id) ?? null;

// ═══ Request kinds ════════════════════════════════════════════════════════

export const REQUEST_KINDS = ['CORRECTION', 'REISSUE'];

export const REQUEST_KIND_META = {
  CORRECTION: {
    label: 'Correction',
    blurb: 'A printed detail is wrong — name, roll number or seat.',
    needsField: true,
    icon: 'create-outline',
    color: BROWN,
  },
  REISSUE: {
    label: 'Reissue',
    blurb: 'Lost, damaged or invalidated. A new seat and QR are generated.',
    needsField: false,
    icon: 'refresh-outline',
    color: VIOLET,
  },
};

export const requestKindMeta = (id) => REQUEST_KIND_META[id] ?? null;

// ═══ Request statuses ═════════════════════════════════════════════════════

export const REQUEST_STATUSES = ['REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED'];

export const REQUEST_STATUS_META = {
  REQUESTED: { label: 'Requested', tone: 'info', color: THEME },
  APPROVED: { label: 'Approved', tone: 'good', color: GREEN },
  REJECTED: { label: 'Rejected', tone: 'bad', color: RED },
  COMPLETED: { label: 'Completed', tone: 'done', color: VIOLET },
};

export const requestStatusMeta = (id) => REQUEST_STATUS_META[id] ?? null;

/** What a decision may move a request to — never COMPLETED, which is its own step. */
export const DECISIONS = ['APPROVED', 'REJECTED'];

// ═══ Correctable fields ═══════════════════════════════════════════════════

export const CORRECTABLE_FIELDS = ['seatNo', 'rollNo', 'fullName'];

export const CORRECTABLE_FIELD_META = {
  seatNo: {
    label: 'Seat number',
    blurb: 'Rewrites the seat on this ticket and regenerates its QR.',
    placeholder: 'A-42',
  },
  rollNo: {
    label: 'Roll number',
    blurb: 'Rewrites the roll number on the student record.',
    placeholder: 'CS21-0142',
  },
  fullName: {
    label: 'Full name',
    blurb: 'Rewrites the name on the user record, which every screen reads.',
    placeholder: 'Full name as it should print',
  },
};

export const correctableFieldMeta = (id) => CORRECTABLE_FIELD_META[id] ?? null;

// ═══ Publication ══════════════════════════════════════════════════════════

export const PUBLICATION_STATUSES = ['DRAFT', 'PUBLISHED', 'RECALLED'];

export const PUBLICATION_STATUS_META = {
  DRAFT: {
    label: 'Not published',
    blurb: 'Tickets exist but students cannot see them.',
    color: SLATE,
    visible: false,
  },
  PUBLISHED: {
    label: 'Published',
    blurb: 'Students can see and download their tickets.',
    color: GREEN,
    visible: true,
  },
  RECALLED: {
    label: 'Recalled',
    blurb: 'Taken back — students see nothing until it is published again.',
    color: RED,
    visible: false,
  },
};

export const publicationStatusMeta = (id) => PUBLICATION_STATUS_META[id] ?? null;

export const PUBLICATION_ACTIONS = ['publish', 'recall'];

// ═══ Ticket statuses ══════════════════════════════════════════════════════

export const TICKET_STATUSES = ['GENERATED', 'DOWNLOADED', 'NOT_GENERATED'];

export const TICKET_STATUS_META = {
  GENERATED: { label: 'Generated', color: THEME, tone: 'info' },
  DOWNLOADED: { label: 'Downloaded', color: GREEN, tone: 'good' },
  NOT_GENERATED: { label: 'Not generated', color: SLATE, tone: 'muted' },
};

export const ticketStatusMeta = (id) => TICKET_STATUS_META[id] ?? null;

// ═══ Eligibility reasons ══════════════════════════════════════════════════

export const ELIGIBILITY_REASONS = [
  {
    id: 'PROFILE_NOT_ACTIVE',
    label: 'Profile is not active',
    blurb: 'The student record is dropped or otherwise inactive.',
    severity: 'HIGH',
    icon: 'person-remove-outline',
    color: RED,
  },
  {
    id: 'ENROLLMENT_DROPPED',
    label: 'Enrolment dropped',
    blurb: 'They are not enrolled in this paper any more.',
    severity: 'HIGH',
    icon: 'close-circle-outline',
    color: RED,
  },
  {
    id: 'NO_SCHEDULED_PAPER',
    label: 'No scheduled paper',
    blurb: 'Enrolled, but nothing in this exam has a slot for them yet.',
    severity: 'MEDIUM',
    icon: 'calendar-outline',
    color: AMBER,
  },
  {
    id: 'FEES_OUTSTANDING',
    label: 'Fees outstanding',
    blurb: 'Something is unpaid or partly paid. Shown, never enforced.',
    severity: 'MEDIUM',
    icon: 'card-outline',
    color: AMBER,
  },
  {
    id: 'NO_PHOTO',
    label: 'No photograph on file',
    blurb: 'The ticket will print with initials instead of a photo.',
    severity: 'LOW',
    icon: 'image-outline',
    color: SLATE,
  },
  {
    id: 'TICKET_ALREADY_ISSUED',
    label: 'Ticket already issued',
    blurb: 'Informational — they already have one for this paper.',
    severity: 'LOW',
    icon: 'checkmark-circle-outline',
    color: GREEN,
  },
];

export const ELIGIBILITY_REASON_IDS = ELIGIBILITY_REASONS.map((r) => r.id);
export const eligibilityReasonMeta = (id) => ELIGIBILITY_REASONS.find((r) => r.id === id) ?? null;

export const SEVERITY_COLOR = { HIGH: RED, MEDIUM: AMBER, LOW: CYAN };
export const SEVERITY_LABEL = { HIGH: 'Check first', MEDIUM: 'Worth a look', LOW: 'Note' };

/**
 * Warnings never block. The server publishes the same sentence; this is the
 * fallback for the moment before the catalogue lands, so the strip that says
 * so is never missing just because the request was.
 */
export const ELIGIBILITY_POLICY =
  'Warnings never stop a generation: every active enrolment gets a ticket, and the warnings are shown alongside.';

export const PUBLISH_POLICY =
  'An exam with no generated ticket cannot be published — there would be nothing to publish.';

// ═══ Display helpers ══════════════════════════════════════════════════════

/**
 * The initials shown when a student has no photograph on file.
 *
 * There is no file-serving route in the app yet, so a ticket cannot render
 * `avatarFileId` as an image — the id is published so the screen can say
 * "no photo on file" honestly instead of pointing at a URL that 404s.
 */
export function initialsOf(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const timeToMinutes = (value) => {
  const [h, m] = String(value ?? '').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export function durationMinutes(start, end) {
  return Math.max(0, timeToMinutes(end) - timeToMinutes(start));
}

export function formatDuration(minutes) {
  const mins = Math.max(0, Math.round(minutes || 0));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Dates are formatted from LOCAL parts. `toISOString().slice(0,10)` renders
 * every paper one day early in Asia/Calcutta, and a hall ticket printed with
 * the wrong date is a student who does not turn up.
 */
export function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDayKey(key) {
  const [y, m, d] = String(key ?? '').split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** `Tue 11 Oct` — built from local parts, never from a parsed UTC string. */
export function dayLabel(key) {
  const d = parseDayKey(key);
  if (!d) return String(key ?? '');
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function shortDayLabel(key) {
  const d = parseDayKey(key);
  if (!d) return String(key ?? '');
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export const plural = (n, one, many = `${one}s`) => (n === 1 ? one : many);

export const countPhrase = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "2 seats short" / "seats to spare" — the same shape the server reports. */
export function seatPhrase(short) {
  if (short === null || short === undefined) return 'capacity unknown';
  if (short > 0) return `${short} seat${short === 1 ? '' : 's'} short`;
  if (short === 0) return 'exactly full';
  return `${Math.abs(short)} seat${Math.abs(short) === 1 ? '' : 's'} spare`;
}

export const TICKET_STATUS_TONE = { GENERATED: 'info', DOWNLOADED: 'good', NOT_GENERATED: 'muted' };
