/**
 * Visitor policy: the rules a college can change without a code change.
 *
 * WHY THIS EXISTS AS A SEPARATE MODULE
 * ------------------------------------
 * Every hostel in the world has a different opinion about visitors. One has a 7am-8pm window and
 * a two-week advance booking. Another never closes and does not care who comes. A third lets a
 * resident wave a friend in with no approval at all, and keeps a denylist for a specific person.
 * If any of that is a constant in the service, this feature is wrong everywhere except one campus.
 *
 * So the policy is DATA. It lives in `SystemConfig` under one key, is read on every request, and
 * every rule in the visitor workflow consults it rather than a literal. A warden edits it from
 * the app; nothing needs redeploying.
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
 * That means an absent key, a null, a string where a number belongs, or `{"visitingHours": "yes"}`
 * all resolve to something usable. A missing config and a broken config behave identically: the
 * defaults apply. That is the property that makes "works in any condition" true rather than
 * aspirational.
 *
 * TIME, EXPLICITLY
 * ----------------
 * "Visiting hours end at 19:00" is a statement about LOCAL time, but the columns are UTC. So the
 * policy carries `utcOffsetMinutes` and every comparison converts through it. Default 330 (IST),
 * which is what this deployment runs on. A campus in another zone sets one number. The offset is
 * applied to compute a local wall-clock time; it is deliberately NOT a full timezone database,
 * because a fixed offset is honest about what it does and the alternative (a tz library per
 * request for a two-hour window) is a lot of machinery for a rule a warden sets by hand.
 */

export interface VisitingHours {
  /** "HH:MM" local. Minutes from local midnight, clamped 0..1439. */
  startMinutes: number;
  /** "HH:MM" local. Clamped 0..1439. A value <= start means the window wraps past midnight. */
  endMinutes: number;
  /** When false, no after-hours alert is ever raised, whatever the times say. */
  enabled: boolean;
}

export interface VisitorPolicy {
  /**
   * When a resident authorises a visitor, does a warden have to confirm it?
   * true  - resident authorises -> PENDING -> warden approves -> APPROVED
   * false - resident authorisation alone clears it; the warden only records entry
   */
  requireWardenApproval: boolean;
  /**
   * Must the RESIDENT authorise at all? When false a warden may register a walk-in directly
   * (still subject to the barred list). Some hostels run purely at the gate.
   */
  requireResidentAuthorisation: boolean;
  /** Expected departure must fall on the same LOCAL calendar day as arrival. */
  dayVisitsOnly: boolean;
  /** Refuse an authorisation whose arrival is further out than this. 0 disables the check. */
  maxAdvanceDays: number;
  /** Require a free-text purpose. */
  requirePurpose: boolean;
  /** Require an ID type + number. */
  requireIdProof: boolean;
  /** Raise an alert for a barred person. Disabling it does not un-bar them from the list. */
  barredCheck: boolean;
  visitingHours: VisitingHours;
  repeatAlert: {
    enabled: boolean;
    /** Visit count at or above which the visitor is flagged. */
    count: number;
    /** Window the count is taken over, in days. */
    withinDays: number;
  };
  /** Minutes to ADD to UTC to get local time. 330 = IST. */
  utcOffsetMinutes: number;
}

export const DEFAULT_POLICY: VisitorPolicy = {
  requireWardenApproval: true,
  requireResidentAuthorisation: true,
  dayVisitsOnly: true,
  maxAdvanceDays: 14,
  requirePurpose: false,
  requireIdProof: false,
  barredCheck: true,
  visitingHours: { startMinutes: 8 * 60, endMinutes: 19 * 60, enabled: true },
  repeatAlert: { enabled: true, count: 4, withinDays: 30 },
  utcOffsetMinutes: 330,
};

export const VISITOR_POLICY_KEY = 'hostel.visitorPolicy';

/** Clamp, tolerating a value of entirely the wrong type. */
function clampNumber(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

/**
 * "HH:MM" -> minutes from midnight. Also accepts a bare number of minutes, because a settings
 * screen sending `480` is a reasonable thing to do and rejecting it would be pedantry.
 */
export function parseHhMm(v: unknown, fallback: number): number {
  if (typeof v === 'number') return clampNumber(v, fallback, 0, 1439);
  if (typeof v !== 'string') return fallback;
  const m = v.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return fallback;
  return clampNumber(Number(m[1]) * 60 + Number(m[2]), fallback, 0, 1439);
}

export function minutesToHhMm(minutes: number): string {
  const m = clampNumber(minutes, 0, 0, 1439);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/**
 * Overlay arbitrary stored JSON onto the defaults, clamping as it goes.
 *
 * Exported and pure so the test suite can assert the fallback behaviour without a database, and
 * so a malformed value is a testable input rather than an accident.
 */
export function resolvePolicy(raw: unknown): VisitorPolicy {
  // Anything that is not a plain object is treated as "no config at all" rather than as an error.
  // A malformed config must not be able to fail a request.
  const src: Record<string, any> =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, any>) : {};

  const hoursSrc =
    src.visitingHours && typeof src.visitingHours === 'object' ? src.visitingHours : {};
  const repeatSrc =
    src.repeatAlert && typeof src.repeatAlert === 'object' ? src.repeatAlert : {};

  const d = DEFAULT_POLICY;

  return {
    requireWardenApproval: asBool(src.requireWardenApproval, d.requireWardenApproval),
    requireResidentAuthorisation: asBool(src.requireResidentAuthorisation, d.requireResidentAuthorisation),
    dayVisitsOnly: asBool(src.dayVisitsOnly, d.dayVisitsOnly),
    // 0 is a meaningful value here (disabled), so clamp to 0 rather than to `min: 1`.
    maxAdvanceDays: clampNumber(src.maxAdvanceDays, d.maxAdvanceDays, 0, 365),
    requirePurpose: asBool(src.requirePurpose, d.requirePurpose),
    requireIdProof: asBool(src.requireIdProof, d.requireIdProof),
    barredCheck: asBool(src.barredCheck, d.barredCheck),
    visitingHours: {
      startMinutes: parseHhMm(hoursSrc.start ?? hoursSrc.startMinutes, d.visitingHours.startMinutes),
      endMinutes: parseHhMm(hoursSrc.end ?? hoursSrc.endMinutes, d.visitingHours.endMinutes),
      enabled: asBool(hoursSrc.enabled, d.visitingHours.enabled),
    },
    repeatAlert: {
      enabled: asBool(repeatSrc.enabled, d.repeatAlert.enabled),
      // Minimum 2: at 1 the alert fires on every first visit and is pure noise.
      count: clampNumber(repeatSrc.count, d.repeatAlert.count, 2, 500),
      withinDays: clampNumber(repeatSrc.withinDays, d.repeatAlert.withinDays, 1, 3650),
    },
    utcOffsetMinutes: clampNumber(src.utcOffsetMinutes, d.utcOffsetMinutes, -720, 840),
  };
}

/** Present a policy in the shape the settings UI and the docs use ("08:00", not 480). */
export function policyToJson(p: VisitorPolicy) {
  return {
    requireWardenApproval: p.requireWardenApproval,
    requireResidentAuthorisation: p.requireResidentAuthorisation,
    dayVisitsOnly: p.dayVisitsOnly,
    maxAdvanceDays: p.maxAdvanceDays,
    requirePurpose: p.requirePurpose,
    requireIdProof: p.requireIdProof,
    barredCheck: p.barredCheck,
    visitingHours: {
      start: minutesToHhMm(p.visitingHours.startMinutes),
      end: minutesToHhMm(p.visitingHours.endMinutes),
      enabled: p.visitingHours.enabled,
    },
    repeatAlert: {
      enabled: p.repeatAlert.enabled,
      count: p.repeatAlert.count,
      withinDays: p.repeatAlert.withinDays,
    },
    utcOffsetMinutes: p.utcOffsetMinutes,
  };
}

/** The inverse, so a settings form round-trips without the service caring about either shape. */
export function policyFromJson(body: any): VisitorPolicy {
  const hours = body?.visitingHours ?? {};
  const repeat = body?.repeatAlert ?? {};
  return resolvePolicy({
    requireWardenApproval: body?.requireWardenApproval,
    requireResidentAuthorisation: body?.requireResidentAuthorisation,
    dayVisitsOnly: body?.dayVisitsOnly,
    maxAdvanceDays: body?.maxAdvanceDays,
    requirePurpose: body?.requirePurpose,
    requireIdProof: body?.requireIdProof,
    barredCheck: body?.barredCheck,
    visitingHours: {
      start: hours.start ?? hours.startMinutes,
      end: hours.end ?? hours.endMinutes,
      enabled: hours.enabled,
    },
    repeatAlert: {
      enabled: repeat.enabled,
      count: repeat.count,
      withinDays: repeat.withinDays,
    },
    utcOffsetMinutes: body?.utcOffsetMinutes,
  });
}

// ── Time helpers ────────────────────────────────────────────────────────────────

const MIN_PER_DAY = 1440;

/** Local minutes-from-midnight for an instant, under the policy's offset. */
export function localMinutes(date: Date, policy: VisitorPolicy): number {
  const shifted = date.getTime() + policy.utcOffsetMinutes * 60_000;
  return Math.floor(shifted / 60_000) % MIN_PER_DAY;
}

/** Local calendar-day index, used for the same-calendar-day rule. */
export function localDayIndex(date: Date, policy: VisitorPolicy): number {
  return Math.floor((date.getTime() + policy.utcOffsetMinutes * 60_000) / 86_400_000);
}

/**
 * Is a local time inside the visiting window? Handles a window that wraps midnight
 * (22:00 -> 05:00 is legitimate for a campus with a night gate).
 */
export function withinVisitingHours(minutes: number, hours: VisitingHours): boolean {
  const { startMinutes: s, endMinutes: e } = hours;
  if (s === e) return true; // a zero-width window means "always open"; refuse nobody
  if (s < e) return minutes >= s && minutes < e;
  return minutes >= s || minutes < e; // wraps midnight
}

/** A human reason for the hours alert, or null. Kept beside the predicate so they cannot drift. */
export function visitingHoursReason(
  start: Date | null,
  end: Date | null,
  policy: VisitorPolicy,
): string | null {
  if (!policy.visitingHours.enabled) return null;
  if (!start) return null; // no window recorded -> nothing to be outside of
  const { startMinutes: s, endMinutes: e } = policy.visitingHours;
  const open = minutesToHhMm(s);
  const close = minutesToHhMm(e);
  if (!withinVisitingHours(localMinutes(start, policy), policy.visitingHours)) {
    return `Expected arrival ${open}\u2013${close} is outside visiting hours`;
  }
  // A window that wraps midnight cannot be checked end-to-end; checking arrival is enough.
  if (!end || s >= e) return null;
  if (!withinVisitingHours(localMinutes(end, policy), policy.visitingHours)) {
    return `Expected departure ${open}\u2013${close} is outside visiting hours`;
  }
  return null;
}

// ── Identity ─────────────────────────────────────────────────────────────────────

/** Digits only. "(98450) 12345" and "98450-12345" and "9845012345" must all match. */
export function phoneDigits(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  // Indian numbers are 10 digits with an optional 91. Anything else is stored as-is.
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits.length ? digits : null;
}

/**
 * Fallback identity when no phone was recorded: lowercase, punctuation collapsed, whitespace
 * collapsed. Deliberately conservative - it must not turn "Suresh  Kumar" and "Suresh Kumar"
 * into different people, but it must not turn "Ann" into "Anne" either.
 */
export function normalisedName(name: string): string {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Digits are the identity key; the name is only a fallback for a record with no phone. */
export function identityKey(input: { phone?: string | null; name?: string | null }): string {
  const d = phoneDigits(input.phone);
  if (d) return `p:${d}`;
  const n = normalisedName(input.name ?? '');
  return n ? `n:${n}` : '';
}