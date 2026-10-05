// F-10 Notifications — the rules that need no database (docs/users/06 §3.9).
//
// The inbox this replaces listed every message the platform had ever sent the
// officer in one flat row with one blue bell for all of them. Sixteen distinct
// `Notification.type` values exist across the codebase — `FEE_DUE`, `PAYMENT`,
// `SCHOLARSHIP`, `SYSTEM`, `BROADCAST`, but also `DELAY`, `VENUE` and `HOSTEL`
// from other modules. A finance officer opening "Notifications" and finding a
// bus delay above their fee reminder has been told nothing about their money.
//
// So two things live here, and both are pure:
//
//   1. CATEGORIES — the seven kinds of message this desk is answerable for.
//   2. TYPE_META — every `type` string the platform writes, mapped to a category
//      and given a label, an icon and a colour.
//
// The mapping is the whole design. Adding a `Notification.type` elsewhere in the
// codebase without saying which category it belongs to is exactly how an inbox
// goes back to being a flat list, so `verify-notifications.ts` asserts that no
// type the database actually contains is unmapped.
import { badRequest, unprocessable } from '../../lib/errors.js';

// ── Categories ────────────────────────────────────────────────────────────
// The seven kinds of message the finance desk owns. Order is the order they are
// drawn in, and it is deliberate: the ones a family acts on come before the ones
// an officer acts on.
export type CategoryId =
  | 'FEE_DUE'
  | 'PAYMENT'
  | 'RECEIPT'
  | 'SCHOLARSHIP'
  | 'PAYROLL'
  | 'ANNOUNCEMENT'
  | 'SYSTEM';

export const CATEGORIES: {
  id: CategoryId;
  label: string;
  blurb: string;
  icon: string;
  color: string;
}[] = [
  {
    id: 'FEE_DUE',
    label: 'Fee due reminders',
    blurb: 'A bill is unpaid, part-paid, or has been chased.',
    icon: 'alert-circle-outline',
    color: '#dc2626',
  },
  {
    id: 'PAYMENT',
    label: 'Payment confirmations',
    blurb: 'Money received, or a payment taken back.',
    icon: 'checkmark-circle-outline',
    color: '#059669',
  },
  {
    id: 'RECEIPT',
    label: 'Receipts',
    blurb: 'A numbered receipt has been issued.',
    icon: 'receipt-outline',
    color: '#0891b2',
  },
  {
    id: 'SCHOLARSHIP',
    label: 'Scholarship status',
    blurb: 'An application approved, declined, or released.',
    icon: 'ribbon-outline',
    color: '#7c3aed',
  },
  {
    id: 'PAYROLL',
    label: 'Payroll',
    blurb: 'A salary run approved, paid, or slipped past you.',
    icon: 'card-outline',
    color: '#2563eb',
  },
  {
    id: 'ANNOUNCEMENT',
    label: 'Announcements',
    blurb: 'What the accounts office has broadcast to a group.',
    icon: 'megaphone-outline',
    color: '#0284c7',
  },
  {
    id: 'SYSTEM',
    label: 'Financial alerts',
    blurb: 'Budget, payroll and reconciliation problems found by the system.',
    icon: 'warning-outline',
    color: '#d97706',
  },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export const categoryMeta = (id: string) =>
  CATEGORIES.find((c) => c.id === id) ?? null;

export function assertCategory(v: unknown): CategoryId {
  const s = String(v ?? '').toUpperCase();
  if (!CATEGORY_IDS.includes(s as CategoryId)) {
    throw unprocessable(`Unknown notification category "${v}"`, [
      { code: 'BAD_CATEGORY', message: `Supported: ${CATEGORY_IDS.join(', ')}` },
    ]);
  }
  return s as CategoryId;
}

// ── The type registry ─────────────────────────────────────────────────────
// `category: null` means "another module owns this" — a transport DELAY is not a
// finance message and must not appear in the finance inbox.
export type TypeMeta = {
  label: string;
  category: CategoryId | null;
  icon: string;
  color: string;
};

export const TYPE_META: Record<string, TypeMeta> = {
  // ── Fee due ──
  FEE_DUE: { label: 'Fee reminder', category: 'FEE_DUE', icon: 'alert-circle-outline', color: '#dc2626' },
  FEE: { label: 'Fee notice', category: 'FEE_DUE', icon: 'pricetag-outline', color: '#d97706' },

  // ── Money in ──
  PAYMENT: { label: 'Payment confirmed', category: 'PAYMENT', icon: 'checkmark-circle-outline', color: '#059669' },
  PAYMENT_REVERSED: { label: 'Payment reversed', category: 'PAYMENT', icon: 'arrow-undo-outline', color: '#dc2626' },
  RECEIPT: { label: 'Receipt issued', category: 'RECEIPT', icon: 'receipt-outline', color: '#0891b2' },

  // ── Scholarships ──
  SCHOLARSHIP: { label: 'Scholarship update', category: 'SCHOLARSHIP', icon: 'ribbon-outline', color: '#7c3aed' },

  // ── Payroll ──
  PAYROLL: { label: 'Payroll update', category: 'PAYROLL', icon: 'card-outline', color: '#2563eb' },
  PAYSLIP: { label: 'Payslip ready', category: 'PAYROLL', icon: 'document-text-outline', color: '#2563eb' },

  // ── Announcements ──
  BROADCAST: { label: 'Announcement', category: 'ANNOUNCEMENT', icon: 'megaphone-outline', color: '#0284c7' },

  // ── System ──
  SYSTEM: { label: 'System alert', category: 'SYSTEM', icon: 'warning-outline', color: '#d97706' },

  // ── Another module's business. Present so the label is never a raw id, and
  //    `category: null` so the finance inbox leaves them out.
  GRADE: { label: 'Grade', category: null, icon: 'school-outline', color: '#64748b' },
  EVENT: { label: 'Event', category: null, icon: 'calendar-outline', color: '#64748b' },
  EVENT_REG: { label: 'Event registration', category: null, icon: 'ticket-outline', color: '#64748b' },
  HOSTEL: { label: 'Hostel', category: null, icon: 'bed-outline', color: '#64748b' },
  DELAY: { label: 'Transport delay', category: null, icon: 'bus-outline', color: '#64748b' },
  VENUE: { label: 'Venue booking', category: null, icon: 'business-outline', color: '#64748b' },
  EQUIPMENT: { label: 'Equipment', category: null, icon: 'construct-outline', color: '#64748b' },
  MAINTENANCE: { label: 'Maintenance', category: null, icon: 'build-outline', color: '#64748b' },
  MENTORSHIP: { label: 'Mentorship', category: null, icon: 'people-outline', color: '#64748b' },
  SOCIAL: { label: 'Social', category: null, icon: 'happy-outline', color: '#64748b' },
  DONATION: { label: 'Donation', category: null, icon: 'gift-outline', color: '#64748b' },

  // -- Alumni desk (src/modules/alumni/notifications/notifications.rules.ts) ----
  //
  // APPEND-ONLY. Four new keys, all `category: null` for the reason stated above:
  // these are not finance messages and must stay out of the finance inbox. They are
  // declared so an alumni row that reaches a finance inbox is LABELLED correctly
  // rather than falling through to the SYSTEM default.
  //
  // `EVENT` and `EVENT_REG` above are deliberately NOT redefined. The alumni desk
  // reuses both rather than inventing `EVENT_REMINDER`-style duplicates:
  //
  //   EVENT      - an RSVP decision on an event (33 live rows)
  //   EVENT_REG  - seat confirmed / waitlisted / promoted (1 live row, from the
  //                transport desk; alumni now shares the key)
  //
  // So only the genuinely new keys are added here. `check-notifications.ts` asserts
  // that every type the alumni rules file owns appears in this registry, which is
  // how the two copies are kept from drifting.
  //
  // `ALUMNI_BROADCAST` exists because the alumni desk had been writing plain
  // `BROADCAST`, which this file maps to the FINANCE announcement category. The
  // alumni desk now writes its own type and keeps plain `BROADCAST` only as a
  // legacy value for rows already on disk. Do not "simplify" it back.
  EVENT_REMINDER: { label: 'Event reminder', category: null, icon: 'alarm-outline', color: '#64748b' },
  CHAPTER: { label: 'Chapter news', category: null, icon: 'location-outline', color: '#64748b' },
  // The KEY is `ANNOUNCEMENT` because that is the literal value the alumni desk
  // writes to `Notification.type` - a registry key that does not match the emitted
  // string is worse than no entry, because the row then falls through to the
  // unknown-type default and lands in the FINANCE inbox as a "System alert".
  //
  // `category: null` despite the name colliding with the `ANNOUNCEMENT` CATEGORY id
  // above: `TYPE_META` is keyed by type and `CATEGORIES` by category, and they are
  // separate maps. `BROADCAST` claims the ANNOUNCEMENT category; this key does not.
  ANNOUNCEMENT: { label: 'Institutional', category: null, icon: 'newspaper-outline', color: '#64748b' },
  ALUMNI_BROADCAST: { label: 'Alumni office broadcast', category: null, icon: 'megaphone-outline', color: '#64748b' },
};

/**
 * The category a type belongs to, or null when it is not a finance message.
 *
 * An UNKNOWN type resolves to `SYSTEM` rather than throwing or vanishing. A
 * module that ships a new financial notification without registering it here
 * would otherwise disappear from the inbox entirely — the failure mode nobody
 * notices until a family says they were never told.
 */
export function financeCategory(type: string): CategoryId | null {
  const meta = TYPE_META[type];
  if (meta) return meta.category;
  return 'SYSTEM';
}

export function typeMeta(type: string): TypeMeta {
  return (
    TYPE_META[type] ?? {
      label: type.replace(/_/g, ' ').toLowerCase(),
      category: 'SYSTEM',
      icon: 'notifications-outline',
      color: '#d97706',
    }
  );
}

export const isFinanceType = (type: string) => financeCategory(type) !== null;

/** The `Notification.type` values a category filter matches. */
export function typesForCategory(category: CategoryId): string[] {
  return Object.keys(TYPE_META).filter((t) => TYPE_META[t].category === category);
}

// ── Audiences ─────────────────────────────────────────────────────────────
// `needsBalance` marks the audiences that cannot be resolved without reading
// the dues table, which is why sending to one costs more than sending to all.
export const AUDIENCES: {
  id: string;
  label: string;
  hint: string;
  icon: string;
  needsBalance: boolean;
}[] = [
  {
    id: 'ALL_STUDENTS',
    label: 'All students',
    hint: 'Every student on the roll, cleared or not.',
    icon: 'school-outline',
    needsBalance: false,
  },
  {
    id: 'DEFAULTERS',
    label: 'Defaulters',
    hint: 'Students with a bill at least 7 days past its due date.',
    icon: 'alert-circle-outline',
    needsBalance: true,
  },
  {
    id: 'ALL_STAFF',
    label: 'All staff',
    hint: 'Everyone on the staff roll — payroll and academic notices.',
    icon: 'people-outline',
    needsBalance: false,
  },
];

/** The overdue threshold `DEFAULTERS` uses. Published so the app can say it. */
export const DEFAULTER_MIN_DAYS = 7;

export function assertAudience(v: unknown): string {
  const s = String(v ?? '').toUpperCase();
  if (!AUDIENCES.some((a) => a.id === s)) {
    throw badRequest(
      `Unknown audience "${v}" — supported: ${AUDIENCES.map((a) => a.id).join(', ')}`,
    );
  }
  return s;
}

// ── System-generated financial alerts ─────────────────────────────────────
// These are COMPUTED, not stored: each is a question the database can answer
// right now. Nothing writes a row when one starts firing, so an alert cannot go
// stale, cannot be read twice, and cannot be left behind after the problem is
// fixed. The trade is that they cost a query each — four of them, on one screen.
export type AlertKind = 'BUDGET_OVERRUN' | 'PAYROLL_UNFOOTED' | 'SCHOLARSHIP_UNRELEASED' | 'UNALLOCATED_RECEIPTS';

export const ALERT_KINDS: {
  id: AlertKind;
  label: string;
  blurb: string;
  icon: string;
  color: string;
  route: string;
}[] = [
  {
    id: 'BUDGET_OVERRUN',
    label: 'Budget overrun',
    blurb: 'An approved claim has pushed a budget line past what was planned.',
    icon: 'pie-chart-outline',
    color: '#dc2626',
    route: 'Budgets',
  },
  {
    id: 'PAYROLL_UNFOOTED',
    label: 'Payroll does not foot',
    blurb: 'A run header disagrees with the payslips underneath it.',
    icon: 'warning-outline',
    color: '#d97706',
    route: 'PayrollRunDetail',
  },
  {
    id: 'SCHOLARSHIP_UNRELEASED',
    label: 'Awards not yet released',
    blurb: 'Money has been promised to a student and not yet paid out.',
    icon: 'ribbon-outline',
    color: '#7c3aed',
    route: 'ScholarshipTracking',
  },
  {
    id: 'UNALLOCATED_RECEIPTS',
    label: 'Unallocated receipts',
    blurb: 'Money received that no bill has been matched against.',
    icon: 'cash-outline',
    color: '#0891b2',
    route: 'Collections',
  },
];

export const ALERT_KIND_IDS = ALERT_KINDS.map((a) => a.id);

export const alertMeta = (kind: string) =>
  ALERT_KINDS.find((a) => a.id === kind) ?? null;

/**
 * The severity a count should paint in.
 *
 * `count: 0` is green — an alert kind that is clear is a good result, and
 * painting "0 overruns" red would train the officer to ignore the red.
 */
export function alertTone(count: number): 'none' | 'warn' | 'bad' {
  if (count <= 0) return 'none';
  return count > 1 ? 'bad' : 'warn';
}