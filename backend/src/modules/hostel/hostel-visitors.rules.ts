/**
 * Visitor rules: the lifecycle derivation and the alert classification.
 *
 * WHY A SHARED MODULE
 * -------------------
 * The same facts appear in three places - the warden's inbox, the resident's "who's coming" list,
 * and the resident detail screen's visitor history. When each derived its own label they drifted,
 * and the drift is invisible: a visitor reads as "on campus" to the warden and "still expected"
 * to the resident at the same moment. This mirrors `hostel-gate-passes.rules.ts` for the same
 * reason, and the resident detail screen imports this rather than reimplementing it.
 *
 * DERIVED, NEVER STORED
 * ---------------------
 * `status` is the stored fact. Everything below is a pure function of the row, `now` and the
 * policy. Nothing here is written back, so a label cannot go stale: a visitor becomes
 * `visit_overdue` the moment the clock passes `expectedOutAt`, with no job to run.
 *
 * ALERTS ARE A LIST, NOT A FLAG
 * -----------------------------
 * "Restricted" is three different rules that happen to share a word: a barred person, a window
 * outside visiting hours, and someone who visits suspiciously often. A visitor can trip two of
 * them at once, and a single boolean would hide which - so the warden would either chase the wrong
 * problem or miss the real one. `classifyAlerts` returns every reason with enough detail to act
 * on, and the UI shows them all.
 */

import {
  VisitorPolicy,
  phoneDigits,
  normalisedName,
  visitingHoursReason,
} from './hostel-visitors.policy.js';

/** The stored statuses. A value outside this set is surfaced, not treated as fine. */
export type StoredStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'IN'
  | 'OUT'
  | 'REJECTED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | (string & {});

export type VisitorLifecycle =
  | 'awaiting_approval'
  | 'approved'
  | 'in_campus'
  | 'visit_overdue'
  | 'departure_overdue'
  | 'left'
  | 'no_show'
  | 'rejected'
  | 'cancelled'
  | 'unknown';

/** The minimum a row needs for the rules to reason about it. */
export interface VisitorForRules {
  status: StoredStatus;
  expectedInAt?: Date | null;
  expectedOutAt?: Date | null;
  checkInAt?: Date | null;
  checkOutAt?: Date | null;
}

/**
 * The single derived label.
 *
 * The ordering of the checks is the whole design. `status` decides the CLOSED cases first,
 * because a rejected visit that happens to be past its window is still rejected - letting the
 * clock override a terminal status would make closed records drift. Within an open status, the
 * actual stamps decide before the planned ones, because what happened beats what was intended.
 */
export function deriveLifecycle(v: VisitorForRules, now: Date): VisitorLifecycle {
  const status = String(v.status ?? '').toUpperCase();

  // Closed first. Nothing below can change these.
  if (status === 'REJECTED') return 'rejected';
  if (status === 'CANCELLED') return 'cancelled';
  if (status === 'NO_SHOW') return 'no_show';
  if (status === 'OUT') return 'left';

  // Actually here. Overstaying is judged against expectedOutAt, NOT against a configured
  // closing time - the institution already said when they should leave.
  if (status === 'IN') {
    if (v.checkOutAt) return 'left'; // IN with a checkout stamp is a legacy row; trust the stamp
    if (v.expectedOutAt && v.expectedOutAt.getTime() < now.getTime()) return 'visit_overdue';
    return 'in_campus';
  }

  // Cleared, not yet on campus.
  if (status === 'APPROVED') {
    // Nobody recorded an arrival and the moment has passed. Distinct from `visit_overdue`: here
    // the person never entered, there they entered and stayed too long.
    if (v.expectedInAt && v.expectedInAt.getTime() < now.getTime() && !v.checkInAt) {
      return 'departure_overdue';
    }
    return 'approved';
  }

  if (status === 'PENDING') return 'awaiting_approval';

  // An unrecognised status is a DATA problem, not a fine one. Surfacing it keeps a bad write
  // visible in the queue instead of silently reading as "nothing to do".
  return 'unknown';
}

/** Lower sorts first. Anything needing a human now sorts above anything that can wait. */
export function lifecycleRank(lifecycle: VisitorLifecycle, hasAlerts: boolean): number {
  // CLOSED HISTORY NEVER SORTS ABOVE LIVE WORK, however many flags it carries.
  //
  // This was wrong at first and the seeded inbox made it obvious: six closed "Suresh Kumar" rows
  // carry FREQUENT_VISITOR, so an `hasAlerts ? 0 : ...` rule put a week of finished visits at the
  // top of the warden's screen and pushed the visitor who was on campus past their departure —
  // the one thing that actually needed a human — below them. A visit that has already ended
  // cannot be acted on, and its frequency badge is a statement about the NEXT one.
  if (isClosed(lifecycle)) return 9;

  // An unrecognised stored status is a data fault. Nobody is waiting, but it has to be looked at,
  // so it sits with the live problems rather than below them.
  if (lifecycle === 'unknown') return 0;

  // An OPEN visit carrying an alert needs a judgement before the gate acts on it, so it outranks
  // an open visit in the same state without one.
  if (hasAlerts) return 0;

  switch (lifecycle) {
    case 'visit_overdue':
      return 1; // somebody is here and should not be
    case 'awaiting_approval':
      return 2; // somebody is at the door
    case 'departure_overdue':
      return 3; // nobody arrived; the row needs closing off
    case 'approved':
      return 4;
    case 'in_campus':
      return 5;
    default:
      return 6;
  }
}

/** Does this row need a warden to act right now? */
export function needsAction(lifecycle: VisitorLifecycle): boolean {
  return (
    lifecycle === 'awaiting_approval' ||
    lifecycle === 'visit_overdue' ||
    lifecycle === 'departure_overdue' ||
    lifecycle === 'unknown'
  );
}

/** Is the visit over, one way or the other? Used to decide whether it still belongs on a screen. */
export function isClosed(lifecycle: VisitorLifecycle): boolean {
  return (
    lifecycle === 'left' ||
    lifecycle === 'no_show' ||
    lifecycle === 'rejected' ||
    lifecycle === 'cancelled'
  );
}

export type AlertCode = 'BARRED' | 'OUTSIDE_VISITING_HOURS' | 'FREQUENT_VISITOR';

export interface VisitorAlert {
  code: AlertCode;
  /** Human, and specific enough to act on. Not "restricted". */
  message: string;
}

/** Context the rules cannot derive from a single row. */
export interface AlertContext {
  policy: VisitorPolicy;
  /** This institution's barred list, pre-loaded. Empty array means "none barred". */
  barred: Array<{ phoneDigits: string | null; normalisedName: string }>;
  /**
   * Visit count for this identity over the policy window, INCLUDING the visit being examined.
   * Supplied by the caller from a grouped count, because counting per row would be a query per
   * card in a list.
   */
  priorVisitCount?: number;
}

/**
 * Every reason this visitor is restricted, most serious first.
 *
 * BARRED is evaluated before hours on purpose: a barred person arriving at 4pm is a different
 * conversation from a regular visitor arriving at 4pm, and the warden should not have to read
 * past the hours warning to find it.
 */
export function classifyAlerts(
  v: VisitorForRules & { name?: string | null; phone?: string | null },
  ctx: AlertContext,
): VisitorAlert[] {
  const { policy } = ctx;
  const alerts: VisitorAlert[] = [];

  if (policy.barredCheck) {
    const digits = phoneDigits(v.phone);
    const name = normalisedName(v.name ?? '');
    // Phone is the identity. Only when the institution recorded no phone at all do we fall back
    // to the name, because a name match alone would bar the wrong person often enough to be
    // worse than useless.
    const match = ctx.barred.find((b) =>
      digits ? b.phoneDigits === digits : Boolean(name) && b.normalisedName === name,
    );
    if (match) {
      alerts.push({
        code: 'BARRED',
        message: digits
          ? 'This phone number is on the barred list'
          : 'This name is on the barred list (no phone was recorded)',
      });
    }
  }

  const hours = visitingHoursReason(v.expectedInAt ?? null, v.expectedOutAt ?? null, policy);
  if (hours) {
    alerts.push({ code: 'OUTSIDE_VISITING_HOURS', message: hours });
  }

  const { repeatAlert } = policy;
  if (repeatAlert.enabled && ctx.priorVisitCount !== undefined) {
    // `>=`, not `>`: a threshold of 4 means "the fourth visit or later", which is the reading
    // a warden setting "flag after 4 visits" expects. With `>`, the 5th would trip and 4 would
    // not, which reads as off-by-one to anyone looking at the setting.
    if (ctx.priorVisitCount >= repeatAlert.count) {
      alerts.push({
        code: 'FREQUENT_VISITOR',
        message: `${ctx.priorVisitCount} visits in the last ${repeatAlert.withinDays} days`,
      });
    }
  }

  return alerts;
}