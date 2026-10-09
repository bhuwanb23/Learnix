/**
 * Complaint policy: the rules a college can change without a code change.
 *
 * WHY THIS IS DATA
 * ----------------
 * How long a dripping tap may stay open before somebody senior is told is not a property of the
 * software - it is a property of that college. One campus fixes a leaking tap in a day and escalates
 * at 24 hours. The next has one technician, three blocks, and escalates at a week, because anything
 * faster just produces noise everybody learns to ignore.
 *
 * So the thresholds live in `SystemConfig` under one key, are read on every request, and every
 * consumer consults them rather than a literal. A warden edits them from the app.
 *
 * WHY IT IS NOT SIMPLY `JSON.parse`
 * ---------------------------------
 * A config that is missing, half-written, or hand-edited into nonsense must never take the hostel
 * down. So this module does three things in order:
 *
 *   1. start from `DEFAULT_POLICY`, which is a complete, working configuration
 *   2. overlay whatever the stored JSON provides, ONE KEY AT A TIME
 *   3. clamp every value back into a range that cannot break the caller
 *
 * An absent key, a null, a string where a number belongs, or `{"escalationHours": "soon"}` all
 * resolve to something usable. A missing config and a broken config behave identically: the defaults
 * apply.
 *
 * WHY ESCALATION IS DERIVED, NOT STORED
 * -------------------------------------
 * There is no `escalatedAt` column and nothing writes "ESCALATED". A complaint is escalated when it
 * is older than its severity allows and is still open - a fact about `createdAt`, `severity` and
 * `status`, all of which are already there.
 *
 * A stored flag would need either a scheduler to set it or a manual action to set it, and both are
 * worse: a scheduler can be missed, and a manual flag can silently disagree with reality (nobody
 * escalated the one that has been open for a month). Deriving it means the answer is true the instant
 * it becomes true and cannot drift. This matches how gate passes derive `departure_overdue` and how
 * visitors derive `overstayed`.
 *
 * CATEGORY GROUPS
 * ---------------
 * The six categories are not peers. Five are "something in the building is wrong"; `SECURITY` is
 * "somebody did something". So each category maps to a GROUP, the group decides which staff
 * designations may be assigned, and `SECURITY` additionally cannot be filed below MEDIUM - a
 * security complaint recorded as LOW severity is a category error, not a judgement call.
 */

export type ComplaintSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type ComplaintStatus = 'OPEN' | 'ASSIGNED' | 'RESOLVED';
export type CategoryGroup = 'MAINTENANCE' | 'MESS' | 'SECURITY';

export const SEVERITIES: readonly ComplaintSeverity[] = ['LOW', 'MEDIUM', 'HIGH'];
export const STATUSES: readonly ComplaintStatus[] = ['OPEN', 'ASSIGNED', 'RESOLVED'];

/**
 * Which group owns which category.
 *
 * The category→group mapping is written out in full rather than derived from a prefix, because
 * `MAINTENANCE` is both a CATEGORY and a GROUP name, and a rule of the form "strip the prefix" would
 * put `MAINTENANCE` in the maintenance group by accident while leaving the reader to work out why
 * `ELECTRICAL` and `NETWORK` are there too.
 */
export const CATEGORY_GROUP: Record<string, CategoryGroup> = {
  PLUMBING: 'MAINTENANCE',
  ELECTRICAL: 'MAINTENANCE',
  NETWORK: 'MAINTENANCE',
  MAINTENANCE: 'MAINTENANCE',
  FOOD: 'MESS',
  SECURITY: 'SECURITY',
};

/** The floor and ceiling on how long a complaint may sit before it escalates, per severity. */
export interface EscalationHours {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
}

export interface ComplaintPolicy {
  /** Minutes from UTC to the institution's local time. Default 330 (IST). */
  utcOffsetMinutes: number;

  /**
   * Hours a complaint may be open at each severity before it counts as escalated.
   *
   * Ordered LOW > MEDIUM > HIGH on purpose: a severe complaint is one that needs attention SOONER.
   * `resolvePolicy` re-sorts these if a hand-edited config inverts them, because an inverted
   * threshold is not a stricter policy, it is a nonsense one.
   */
  escalationHours: EscalationHours;

  /**
   * A post-resolution rating at or below this REOPENS the complaint rather than sitting quietly on a
   * resolved one. 3 of 5: at 4 the resident is broadly satisfied and reopening would be noise, at 2
   * they are telling us the job was not done.
   */
  reopenRatingThreshold: number;

  /** Oldest-first bound on the analytics window, mirroring the mess clamp. */
  maxWindowDays: number;

  /**
   * Which staff DESIGNATIONS may be assigned each group.
   *
   * Matched case-insensitively and as a substring, because designations in the wild are "Maintenance
   * Technician", "Maintenance Technician (Electrical)" and "Sr. Maintenance Technician", and listing
   * three near-identical strings would be a rule that breaks the first time a college renames a post.
   * Wardens and admins are eligible for every group and are handled by the SERVICE, not listed here -
   * a config that removed them would be read as an oversight rather than a decision.
   */
  eligibleDesignations: Record<CategoryGroup, string[]>;

  /** Groups whose complaints may never be filed below this severity. */
  minSeverity: Record<CategoryGroup, ComplaintSeverity>;
}

export const DEFAULT_POLICY: ComplaintPolicy = {
  utcOffsetMinutes: 330,
  escalationHours: { LOW: 168, MEDIUM: 72, HIGH: 24 },
  reopenRatingThreshold: 3,
  maxWindowDays: 365,
  eligibleDesignations: {
    MAINTENANCE: ['maintenance', 'electrician', 'plumber', 'carpenter', 'technical'],
    MESS: ['mess', 'kitchen', 'caterer', 'steward'],
    SECURITY: ['security', 'guard'],
  },
  minSeverity: { MAINTENANCE: 'LOW', MESS: 'LOW', SECURITY: 'MEDIUM' },
};

export const COMPLAINT_POLICY_KEY = 'hostel.complaintPolicy';

const clampInt = (value: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
};

const clampSeverity = (value: unknown, fallback: ComplaintSeverity): ComplaintSeverity => {
  const s = typeof value === 'string' ? value.toUpperCase() : '';
  return (SEVERITIES as readonly string[]).includes(s) ? (s as ComplaintSeverity) : fallback;
};

const asStringArray = (value: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  return cleaned.length > 0 ? cleaned.map((v) => v.trim()) : fallback;
};

/**
 * Build the effective policy: defaults, then the stored JSON overlaid one key at a time, then every
 * value clamped into a range that cannot break a caller.
 *
 * A hand-edited config that inverts the escalation order is RE-SORTED rather than rejected. Rejecting
 * would mean one bad key takes the whole complaints screen down; sorting means the college's intent -
 * "a high-severity complaint should not wait longer than a low one" - survives even if they typed
 * the numbers the wrong way round.
 */
export function resolvePolicy(raw?: unknown): ComplaintPolicy {
  const base = DEFAULT_POLICY;
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const rawHours = (src.escalationHours && typeof src.escalationHours === 'object'
    ? src.escalationHours
    : {}) as Record<string, unknown>;

  // Clamp each, then sort ascending so LOW waits longest and HIGH waits least.
  const hours: EscalationHours = {
    LOW: clampInt(rawHours.LOW, 1, 24 * 90, base.escalationHours.LOW),
    MEDIUM: clampInt(rawHours.MEDIUM, 1, 24 * 90, base.escalationHours.MEDIUM),
    HIGH: clampInt(rawHours.HIGH, 1, 24 * 90, base.escalationHours.HIGH),
  };
  if (hours.LOW < hours.MEDIUM) [hours.LOW, hours.MEDIUM] = [hours.MEDIUM, hours.LOW];
  if (hours.MEDIUM < hours.HIGH) [hours.MEDIUM, hours.HIGH] = [hours.HIGH, hours.MEDIUM];

  const rawGroups = (src.eligibleDesignations && typeof src.eligibleDesignations === 'object'
    ? src.eligibleDesignations
    : {}) as Record<string, unknown>;
  const rawMin = (src.minSeverity && typeof src.minSeverity === 'object' ? src.minSeverity : {}) as Record<
    string,
    unknown
  >;

  const minSeverity = {
    MAINTENANCE: clampSeverity(rawMin.MAINTENANCE, base.minSeverity.MAINTENANCE),
    MESS: clampSeverity(rawMin.MESS, base.minSeverity.MESS),
    SECURITY: clampSeverity(rawMin.SECURITY, base.minSeverity.SECURITY),
  } as Record<CategoryGroup, ComplaintSeverity>;

  return {
    utcOffsetMinutes: clampInt(src.utcOffsetMinutes, -840, 840, base.utcOffsetMinutes),
    escalationHours: hours,
    reopenRatingThreshold: clampInt(src.reopenRatingThreshold, 1, 5, base.reopenRatingThreshold),
    maxWindowDays: clampInt(src.maxWindowDays, 7, 3650, base.maxWindowDays),
    eligibleDesignations: {
      MAINTENANCE: asStringArray(rawGroups.MAINTENANCE, base.eligibleDesignations.MAINTENANCE),
      MESS: asStringArray(rawGroups.MESS, base.eligibleDesignations.MESS),
      SECURITY: asStringArray(rawGroups.SECURITY, base.eligibleDesignations.SECURITY),
    },
    minSeverity,
  };
}

/** How old a complaint is, in hours, ignoring anything about its severity. */
export function ageHours(from: Date, now = new Date()): number {
  return Math.max(0, (now.getTime() - from.getTime()) / 3_600_000);
}

/** The order severities are ranked for display: HIGH first. */
const SEVERITY_RANK: Record<ComplaintSeverity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export function severityRank(severity: string): number {
  return SEVERITY_RANK[severity as ComplaintSeverity] ?? 99;
}

/**
 * THE ESCALATION RULE.
 *
 * Open past its severity's threshold ⇒ escalated. A RESOLVED complaint is never escalated: it is
 * finished, and telling the warden a complaint from March has been escalated because nobody archived
 * it would be noise that trains people to ignore the badge.
 */
export function isEscalated(
  createdAt: Date,
  severity: string,
  status: string,
  policy: ComplaintPolicy,
  now = new Date(),
): boolean {
  if (status === 'RESOLVED') return false;
  const hours = policy.escalationHours[(severity as ComplaintSeverity) ?? 'LOW'] ?? policy.escalationHours.LOW;
  return ageHours(createdAt, now) > hours;
}

/**
 * Hours until escalation, or null when already past it or resolved.
 *
 * Used for "escalates in 6h" against "escalated 3 days ago" - the first is a warning a warden can act
 * on, the second is a failure they have to answer for. A single boolean cannot carry both.
 */
export function hoursToEscalation(
  createdAt: Date,
  severity: string,
  status: string,
  policy: ComplaintPolicy,
  now = new Date(),
): number | null {
  if (status === 'RESOLVED') return null;
  const hours = policy.escalationHours[(severity as ComplaintSeverity) ?? 'LOW'] ?? policy.escalationHours.LOW;
  const left = hours - ageHours(createdAt, now);
  return left > 0 ? Math.round(left * 10) / 10 : null;
}

/**
 * PRIORITY - the sort key, and the reason it is not `severity`.
 *
 * A two-week-old LOW is more urgent than yesterday's LOW: it has had fourteen chances and is still
 * open. A resident cannot influence this, which is the point - it is why the request's "priority" is
 * satisfied by a derived field rather than by letting the reporter pick one.
 *
 * Higher number = more urgent, so a caller can sort descending without knowing the sign convention.
 */
export function priorityScore(
  createdAt: Date,
  severity: string,
  status: string,
  policy: ComplaintPolicy,
  now = new Date(),
): number {
  if (status === 'RESOLVED') return 0;
  const sev = severityRank(severity);
  const sevWeight = sev === 0 ? 100 : sev === 1 ? 60 : 30;
  // 0..40, growing with age relative to its own threshold, capped so an ancient complaint does not
  // swamp the queue and push everything else off the screen.
  const hours = policy.escalationHours[(severity as ComplaintSeverity) ?? 'LOW'] ?? policy.escalationHours.LOW;
  const ageRatio = Math.min(1, ageHours(createdAt, now) / Math.max(1, hours));
  return sevWeight + Math.round(ageRatio * 40);
}

export function groupOf(category: string): CategoryGroup {
  return CATEGORY_GROUP[category] ?? 'MAINTENANCE';
}

/**
 * Whether a member of staff may be assigned this category.
 *
 * `designation` is matched as a lowercased SUBSTRING of the configured patterns, so one pattern
 * covers "Maintenance Technician" and "Sr. Maintenance Technician (Electrical)" together. Null
 * designation (a user with a staff profile who never filled one in) matches nothing: an unknown post
 * is not evidence of a relevant one, and defaulting to eligible would hand every unlabelled account
 * every complaint.
 */
export function isEligibleFor(
  designation: string | null | undefined,
  category: string,
  policy: ComplaintPolicy,
): boolean {
  if (!designation) return false;
  const needle = designation.toLowerCase();
  const patterns = policy.eligibleDesignations[groupOf(category)];
  return patterns.some((p) => needle.includes(p.toLowerCase()));
}

/** The lowest severity this category may be filed at. */
export function minSeverityFor(category: string, policy: ComplaintPolicy): ComplaintSeverity {
  return policy.minSeverity[groupOf(category)];
}

/**
 * Raise a severity to its category's floor.
 *
 * A SECURITY complaint filed as LOW is a category error rather than a judgement: security reports at
 * LOW get triaged last, which is precisely backwards. Raising it is kinder than rejecting the form
 * and refusing to let the resident describe what happened.
 */
export function applySeverityFloor(
  severity: string,
  category: string,
  policy: ComplaintPolicy,
): ComplaintSeverity {
  const wanted = clampSeverity(severity, 'LOW');
  const floor = minSeverityFor(category, policy);
  return severityRank(wanted) <= severityRank(floor) ? wanted : floor;
}