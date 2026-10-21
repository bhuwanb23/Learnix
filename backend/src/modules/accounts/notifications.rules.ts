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
  // A SPEND CLAIM awaiting approval - raised by a department (today: the hostel mess) rather than by
  // accounts itself. Filed under `RECEIPT` because that is the existing money-desk category and the
  // recipient is the accounts approver; adding a ninth category for one emitter would be more churn
  // than the taxonomy can justify.
  EXPENSE_APPROVAL: { label: 'Expense awaiting approval', category: 'RECEIPT', icon: 'wallet-outline', color: '#d97706' },

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

  // ── The hostel's eight types ──
  //
  // THIS IS THE PLATFORM REGISTRY, and it is where a type's CHROME lives — the label, the icon and
  // the colour a screen draws. The hostel's own module owns its CATEGORIES (which of the eight a type
  // belongs to), and the two are kept apart on purpose: the chrome must be identical wherever the row
  // is rendered, and the category is what makes a row filterable, which only the owning desk decides.
  //
  // `category: null` here, so the FINANCE inbox leaves them out — an accounts officer's chip list is
  // not the hostel's. The hostel registry (which the student route MERGES with this one) maps them to
  // their real categories, so a resident sees "Complaint update" rather than a raw type string, and the
  // finance desk sees nothing.
  //
  // A type missing from here is not a row that vanishes — it falls back to the SYSTEM chrome. But it
  // IS a row labelled wrongly, and `verify-notifications.ts` asserts that every type the database
  // actually holds is registered here, because that is the only way to notice.
  HOSTEL_ANNOUNCEMENT: { label: 'Hostel announcement', category: null, icon: 'megaphone-outline', color: '#0284c7' },
  HOSTEL_MAINTENANCE: { label: 'Maintenance alert', category: null, icon: 'construct-outline', color: '#d97706' },
  HOSTEL_EMERGENCY: { label: 'Emergency notice', category: null, icon: 'warning-outline', color: '#dc2626' },
  HOSTEL_GATE_PASS: { label: 'Gate pass update', category: null, icon: 'exit-outline', color: '#2563eb' },
  HOSTEL_LATE_RETURN: { label: 'Late return', category: null, icon: 'time-outline', color: '#ea580c' },
  HOSTEL_VISITOR: { label: 'Visitor update', category: null, icon: 'people-outline', color: '#0891b2' },
  HOSTEL_COMPLAINT: { label: 'Complaint update', category: null, icon: 'chatbubble-ellipses-outline', color: '#7c3aed' },
  HOSTEL_MESS: { label: 'Mess update', category: null, icon: 'restaurant-outline', color: '#db2777' },
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

  // -- Exam cell desk (src/modules/examcell/examcell-notifications.rules.ts) --
  //
  // APPEND-ONLY, and the same reasoning as the hostel block above: these are NOT finance
  // messages, so they stay `category: null` and the accounts inbox leaves them out. The exam
  // cell's own registry maps them to their real categories, and the STUDENT route merges that
  // registry with this one — so a student sees "Hall ticket available" rather than a raw type
  // string, and an accounts officer sees nothing.
  //
  // The chrome lives HERE because a row's label, icon and colour must be identical wherever it
  // is rendered — the exam officer's inbox, the student's merged inbox, and any future one. What
  // the exam cell owns is the CATEGORY, and that is in its own rules file.
  EXAM_SCHEDULED: { label: 'Exam scheduled', category: null, icon: 'calendar-outline', color: '#2563eb' },
  EXAM_PUBLISHED: { label: 'Exam published', category: null, icon: 'calendar-outline', color: '#2563eb' },
  TIMETABLE_CHANGED: { label: 'Timetable changed', category: null, icon: 'time-outline', color: '#0891b2' },
  HALL_TICKET_READY: { label: 'Hall ticket available', category: null, icon: 'ticket-outline', color: '#0284c7' },
  EXAM_REMINDER: { label: 'Exam reminder', category: null, icon: 'alarm-outline', color: '#d97706' },
  RESULT_PUBLISHED: { label: 'Result published', category: null, icon: 'trophy-outline', color: '#059669' },
  REVALUATION_DECIDED: { label: 'Revaluation decided', category: null, icon: 'refresh-circle-outline', color: '#7c3aed' },
  EVALUATION_DEADLINE: { label: 'Evaluation deadline', category: null, icon: 'clipboard-outline', color: '#dc2626' },
  EXAM_IMPORTANT: { label: 'Important notice', category: null, icon: 'megaphone-outline', color: '#ea580c' },
  EXAM_CHEATING: { label: 'Cheating case update', category: null, icon: 'warning-outline', color: '#b91c1c' },
  // The legacy broad-cast type the exam office used before the nine categories existed. It is
  // mapped to null here so the finance inbox ignores it; the exam cell's own registry maps it to
  // IMPORTANT_NOTICE so the officer's inbox still shows the old rows rather than losing them.
  EXAM_CELL_BROADCAST: { label: 'Exam office notice', category: null, icon: 'megaphone-outline', color: '#ea580c' },
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

// ── Registries ──────────────────────────────────────────────────────────────
//
// A DESK'S TAXONOMY, IN A FORM THE SHARED INBOX CAN CONSUME.
//
// The `Notification` table is shared by every desk, but a CATEGORY is not. "A fee is due" and "the
// water is off in Block B" are different facts about the world, and a filter chip that could show
// either is a filter chip that means nothing. So each desk declares its own categories and its own
// type → category map, and the shared inbox is handed the ones it should render.
//
// A registry is that pair — the categories, and the types that map into them. The finance one is
// below; the hostel one lives in the hostel module, because the HOSTEL owns its vocabulary. The
// hostel depends on this module (it already imports the money helpers and the id schemas), so the
// dependency runs one way and the shared inbox never has to know what a hostel is.
//
// A type with `category: null` is "another module's business" — it is labelled rather than dropped,
// and the inbox leaves it out of the visible set. That is how a finance type that the hostel raised
// (a mess expense awaiting approval, say) stays in the accounts desk's inbox without the hostel
// owning a category for it.

export interface CategoryDescriptor {
  id: string;
  label: string;
  blurb: string;
  icon: string;
  color: string;
}

export interface TypeDescriptor {
  label: string;
  /** null = not this registry's business; the row is labelled but left out of the visible set. */
  category: string | null;
  icon: string;
  color: string;
}

export interface NotificationRegistry {
  categories: readonly CategoryDescriptor[];
  types: Record<string, TypeDescriptor>;
}

/** The finance desk's own registry. The default for every shared-inbox caller. */
export const FINANCE_REGISTRY: NotificationRegistry = {
  categories: CATEGORIES,
  types: TYPE_META as unknown as Record<string, TypeDescriptor>,
};

/**
 * Combine registries.
 *
 * LATER REGISTRIES WIN for a type they both own. That is what makes the composition order
 * meaningful: the hostel's map is authoritative for `HOSTEL*` types, so merging finance-then-hostel
 * gives the hostel the last word on its own vocabulary while the finance desk keeps every type it
 * declared.
 */
export function mergeRegistries(...registries: NotificationRegistry[]): NotificationRegistry {
  const categories: CategoryDescriptor[] = [];
  const types: Record<string, TypeDescriptor> = {};
  for (const registry of registries) {
    for (const category of registry.categories) {
      const at = categories.findIndex((c) => c.id === category.id);
      if (at >= 0) categories[at] = category;
      else categories.push(category);
    }
    Object.assign(types, registry.types);
  }
  return { categories, types };
}

/** The category a type belongs to within a registry, or null when it is out of scope. */
export function categoryFor(registry: NotificationRegistry, type: string): string | null {
  const meta = registry.types[type];
  if (!meta) return null;
  return meta.category;
}

/**
 * The chrome for a type within a registry.
 *
 * An UNKNOWN type resolves to the `SYSTEM` chrome rather than vanishing — the failure mode nobody
 * notices until a resident says they were never told. A type that is known but out of scope (one
 * belonging to another desk) still gets its own label, because "this is a hostel message" is a
 * fact about the row even when the finance inbox does not show it.
 */
export function metaFor(registry: NotificationRegistry, type: string): TypeDescriptor {
  const meta = registry.types[type];
  if (meta) return meta;
  return {
    label: type.replace(/_/g, ' ').toLowerCase(),
    category: 'SYSTEM',
    icon: 'notifications-outline',
    color: '#d97706',
  };
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