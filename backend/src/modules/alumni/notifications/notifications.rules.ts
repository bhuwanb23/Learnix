/**
 * S-12 Notifications — the vocabulary (docs/users/12-alumni-relations.md §3.7).
 *
 * WHAT THIS FILE IS FOR
 * ---------------------
 * `Notification.type` is a free-text `String`, shared by five desks. Nothing
 * enforces that a category exists before someone writes a row with it, and until
 * now each desk kept its own private list. That produced three concrete failures,
 * all visible in the live database right now:
 *
 *   1. `EVENT` was used by events.service.ts for RSVP decisions while the alumni
 *      app's own TYPE_META had no `EVENT` key at all — so an RSVP confirmation
 *      rendered as a "System" row. 33 rows.
 *   2. Chapter announcements were written as `BROADCAST` (chapters.service.ts), so
 *      news from your own chapter was indistinguishable in the inbox from an
 *      office-wide blast, and muting "chapter news" would have muted both.
 *   3. `EVENT_REG` already existed in accounts' registry for the transport module.
 *      Rather than invent `REGISTRATION`, we reuse the key — one type, one meaning
 *      everywhere — which is why every type below is registered there too.
 *
 * So this file is the single place that answers "what categories exist for alumni,
 * what does each one look like, and where does tapping one land?". Emitters never
 * name a type; they name a category and `delivery.ts` resolves it here. That is
 * what makes a mute list enforceable: you cannot suppress a category the emitters
 * invented behind the rules file's back.
 *
 * EIGHT CATEGORIES, ALL MUTABLE, ALL DEFAULT-ON
 * ----------------------------------------------
 * "Notification preferences" is not a ninth category — it is the surface over
 * these eight. A mute is a fact about a person and a category, so it needs a
 * category to hang off. Adding a ninth message type is a one-line change here
 * plus a row in the accounts registry, and it is opt-out by default: absence of a
 * `NotificationPreference` row means "not muted", so a new category starts
 * delivering to everyone rather than silently to nobody.
 *
 * The counts in the comments are live row counts in dev.db at the time of writing.
 * They are the reason `EVENT` and `EVENT_REG` are separate entries and not one
 * "Event" bucket: an RSVP decision and a waitlist promotion are different news.
 */

export const CATEGORY_IDS = [
  'EVENT_REMINDER',
  'EVENT_REG',
  'EVENT',
  'MENTORSHIP',
  'CHAPTER',
  'DONATION',
  'ANNOUNCEMENT',
  'BROADCAST',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

/**
 * Where tapping a row should land. This is a descriptor, not a URL.
 *
 * The alumni app is not a react-navigation stack: `alumni.js` holds one
 * `currentScreen` in state and renders a module component (donations.js does the
 * same again for its own sub-screens). Emitting a route string would invent a
 * navigation system that does not exist and would rot. So the backend publishes
 * what it knows — "this is about a campaign, here is its id" — and the app maps it.
 */
export type DeepLink =
  | { readonly screen: 'Events'; readonly tab?: 'All' | 'Registered' | 'Attendance'; readonly eventId?: string }
  | { readonly screen: 'Mentorship'; readonly tab?: 'Requests' | 'MyMentorship' | 'Sessions' | 'Reviews'; readonly requestId?: string; readonly pairId?: string }
  | { readonly screen: 'Chapters'; readonly chapterId?: string }
  | { readonly screen: 'Donations'; readonly tab?: 'Give' | 'History' | 'Receipt' | 'Recurring'; readonly donationId?: string; readonly campaignId?: string }
  | { readonly screen: 'Notifications' }
  | null;

export type CategoryMeta = {
  readonly id: CategoryId;
  /** Inbox chip text and the preferences grid heading. */
  readonly label: string;
  /** The value written to `Notification.type`. Registered in accounts too. */
  readonly type: string;
  /**
   * Types this category USED to be written as, kept so the 1,651 rows already in
   * the table group correctly. Read-only in the inbox; never written.
   */
  readonly legacyTypes: readonly string[];
  readonly icon: string;
  readonly color: string;
  /** One line shown under the preference toggle — a person should be able to tell what they are muting. */
  readonly blurb: string;
  readonly defaultMuted: false;
  /** `module` written into dataJson; the app uses it to route. */
  readonly module: string;
  readonly deepLink: (data: Record<string, unknown>) => DeepLink;
};

const str = (data: Record<string, unknown>, key: string): string | undefined => {
  const v = data[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
};

export const CATEGORIES: readonly CategoryMeta[] = [
  {
    id: 'EVENT_REMINDER',
    label: 'Event reminders',
    type: 'EVENT_REMINDER',
    legacyTypes: [],
    icon: 'alarm-outline',
    color: '#2563eb',
    blurb: 'A nudge before something you registered for starts.',
    defaultMuted: false,
    module: 'alumni-events',
    deepLink: (d) => ({ screen: 'Events', tab: 'All', eventId: str(d, 'eventId') }),
  },
  {
    id: 'EVENT_REG',
    label: 'Registrations',
    type: 'EVENT_REG',
    legacyTypes: [],
    icon: 'ticket-outline',
    color: '#0ea5e9',
    blurb: 'Seat confirmed, waitlisted, or promoted off a waitlist.',
    defaultMuted: false,
    module: 'alumni-events',
    deepLink: (d) => ({ screen: 'Events', tab: 'Registered', eventId: str(d, 'eventId') }),
  },
  {
    id: 'EVENT',
    label: 'RSVP decisions',
    type: 'EVENT',
    legacyTypes: [],
    icon: 'checkmark-done-outline',
    color: '#0891b2',
    blurb: 'Your answer on an event the office asked you about.',
    defaultMuted: false,
    module: 'alumni-events',
    deepLink: (d) => ({ screen: 'Events', tab: 'All', eventId: str(d, 'eventId') }),
  },
  {
    id: 'MENTORSHIP',
    label: 'Mentorship',
    type: 'MENTORSHIP',
    legacyTypes: [],
    icon: 'people-outline',
    color: '#7c3aed',
    blurb: 'Requests to review, decisions made, and session reminders.',
    defaultMuted: false,
    module: 'alumni-mentorship',
    deepLink: (d) => ({ screen: 'Mentorship', requestId: str(d, 'requestId'), pairId: str(d, 'pairId') }),
  },
  {
    id: 'CHAPTER',
    label: 'Chapter news',
    type: 'CHAPTER',
    legacyTypes: [],
    icon: 'location-outline',
    color: '#ea580c',
    blurb: 'Announcements and meetups from a chapter you belong to.',
    defaultMuted: false,
    module: 'alumni-chapters',
    deepLink: (d) => ({ screen: 'Chapters', chapterId: str(d, 'chapterId') }),
  },
  {
    id: 'DONATION',
    label: 'Giving',
    type: 'DONATION',
    legacyTypes: [],
    icon: 'gift-outline',
    color: '#059669',
    blurb: 'A gift recorded, and its receipt.',
    defaultMuted: false,
    module: 'alumni-donations',
    deepLink: (d) => ({ screen: 'Donations', tab: 'Receipt', donationId: str(d, 'donationId') }),
  },
  {
    id: 'ANNOUNCEMENT',
    label: 'Institutional',
    type: 'ANNOUNCEMENT',
    legacyTypes: [],
    icon: 'newspaper-outline',
    color: '#b91c1c',
    blurb: 'Notices published by the college for everyone.',
    defaultMuted: false,
    module: 'alumni',
    deepLink: () => ({ screen: 'Notifications' }),
  },
  {
    id: 'BROADCAST',
    label: 'Office broadcasts',
    // NOT `BROADCAST`. accounts' registry maps that type to its own ANNOUNCEMENT
    // category — it is the accounts desk's fee-notice blast. Two different messages
    // sharing one type string means an alumni broadcast reaching a finance inbox is
    // labelled as a finance announcement and counted as in-scope, and there is no
    // way to tell the two apart after the fact.
    //
    // So alumni writes its own type. `legacyTypes` below keeps the 863 existing
    // BROADCAST rows (almost all of them this desk's) grouped in the alumni inbox.
    type: 'ALUMNI_BROADCAST',
    legacyTypes: ['BROADCAST'],
    icon: 'megaphone-outline',
    color: '#4f46e5',
    blurb: 'What the Alumni Relations Office has sent your way.',
    defaultMuted: false,
    module: 'alumni',
    deepLink: () => ({ screen: 'Notifications' }),
  },
];

const BY_ID = new Map<string, CategoryMeta>(CATEGORIES.map((c) => [c.id, c]));

/**
 * Reverse index: `Notification.type` → category.
 *
 * Needed because 1,651 rows already exist and cannot be backfilled to a category
 * column. Types are the durable thing on disk; categories are the app's
 * vocabulary. So an inbox read resolves the category from the stored type rather
 * than trusting the caller, which means old rows group correctly the moment this
 * ships.
 *
 * Includes each category's `legacyTypes`, so the 863 rows written as plain
 * `BROADCAST` before the alumni desk took a distinct type still land in "Office
 * broadcasts" instead of falling through to "Other".
 *
 * `EVENT` and `EVENT_REG` are both claimed by events; `DONATION` by giving.
 */
export const CATEGORY_BY_TYPE: ReadonlyMap<string, CategoryId> = new Map(
  CATEGORIES.flatMap((c) => [[c.type, c.id] as const, ...c.legacyTypes.map((t) => [t, c.id] as const)]),
);

/** Every type that should read as this category — the live one plus any legacy. */
export function typesForCategory(id: CategoryId): string[] {
  const meta = BY_ID.get(id);
  if (!meta) return [];
  return [meta.type, ...meta.legacyTypes];
}

export function categoryMeta(id: string): CategoryMeta | null {
  return BY_ID.get(id) ?? null;
}

export function categoryForType(type: string): CategoryId | null {
  return CATEGORY_BY_TYPE.get(type) ?? null;
}

export function isCategoryId(v: unknown): v is CategoryId {
  return typeof v === 'string' && BY_ID.has(v);
}

/**
 * Fallback chrome for a type this desk does not own — a `PAYROLL` or `FEE_DUE` row
 * that reached an alumni inbox, or a type a sibling module adds tomorrow.
 *
 * It is deliberately not `SYSTEM`-labelled. Saying "System" to a graduate about
 * somebody's payslip is worse than admitting the app does not recognise it; the
 * honest label is "Other".
 */
export const UNKNOWN_TYPE_META = {
  label: 'Other',
  icon: 'ellipsis-horizontal-circle-outline',
  color: '#64748b',
} as const;

/**
 * Reminder windows, in hours before an event starts.
 *
 * Two nudges, not one: a person who mutes nothing still gets a day of notice and
 * a nudge on the morning. The wide `EVENT_REMINDER_WINDOW_H` is what the sweep
 * scans; the specific offsets are what it dedupes on, so pressing the button
 * twice inside the same window writes nothing the second time.
 */
export const REMINDER_OFFSETS_H = [24, 2] as const;

/**
 * Slack on each side of an offset.
 *
 * Without it, `startsAt` is compared with `now` at sweep time, so a reminder fires
 * only during the instant where `now` is exactly 24h before the event — a window
 * of zero width, which in practice means it fires only if somebody presses the
 * button at exactly the right minute. 30 minutes either side makes a daily sweep
 * reliable without letting a 2-hour reminder fire 26 hours early.
 *
 * Note the two windows overlap deliberately: an event 25 hours out matches the
 * 24h offset's lower edge and the 2h offset's upper edge only at 23.5h and 2.5h
 * respectively, so in practice they never both match the same event at once.
 */
export const REMINDER_SLACK_MIN = 30;

/**
 * How many rows one `createMany` may carry.
 *
 * SQLite caps a statement at 999 bound variables. A `notifications` row binds NINE
 * of them (id is client-generated, but the other columns are not), so the ceiling is
 * 999 / 9 = 111. This is set to 100 with margin.
 *
 * It was 250 while this was being written, which binds 2,250 variables and fails at
 * the database on any broadcast wider than 111 people — in dev that is `ALL_ALUMNI`
 * (863 recipients), so it would have passed every narrow test and failed the first
 * real one. `check-notifications.ts` asserts the arithmetic so it cannot drift back.
 */
export const FANOUT_CHUNK = 100;

/** Columns a `createMany` on `notifications` binds per row. See FANOUT_CHUNK. */
export const NOTIFICATION_BOUND_COLUMNS = 9;

/** Inbox page size ceiling, matching the other desks. */
export const INBOX_MAX_LIMIT = 50;
