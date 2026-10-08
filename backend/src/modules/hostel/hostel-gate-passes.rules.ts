/**
 * Gate-pass lifecycle rules. Docs: 08-hostel.md §3.5 · 05-state-machines.md §6.2
 *
 * WHY THIS FILE EXISTS SEPARATELY FROM THE SERVICE
 * -----------------------------------------------
 * "Is this student in tonight?" is answered in three places: the warden's gate-pass inbox, the
 * student's own pass list, and the resident profile's Leave & absence section. They MUST agree,
 * and before this file they did not — the absence section computed
 *
 *     isOut = status === 'APPROVED' && actualInAt === null && expectedInAt > now
 *
 * which marked a student "out" from the moment of APPROVAL, ignoring `outAt` entirely. A pass
 * approved for a trip next month read as `isOut: true` today. It also collapsed two unrelated
 * overruns — "didn't leave on time" and "didn't come back" — into one boolean.
 *
 * So the derivation lives here, once, and all three callers use it. A pure function with no
 * database access is what makes that guarantee testable: every state can be constructed in the
 * unit test without a fixture, an institution, or a clock that has to be wound forward.
 *
 * WHY SO MANY STATES
 * ------------------
 * They collapse to the four questions a warden actually asks: is it approved, has the student
 * gone, has the student come back, and is anything late. Each of those is separately
 * actionable, and the old boolean pair could not distinguish "approved for next week" from
 * "overdue since Tuesday" — which are not remotely the same work item.
 */

/** The persisted decision. `CANCELLED` means the student withdrew a pending request. */
export const GATE_PASS_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;
export type GatePassStatus = (typeof GATE_PASS_STATUSES)[number];

/**
 * The derived travel state. Deliberately separate from `status`: a pass is APPROVED and may
 * simultaneously be overdue, and collapsing those into one field is how a screen ends up
 * showing "Approved" in green to a warden who has a student three days overdue.
 */
export const GATE_PASS_LIFECYCLES = [
  'awaiting_approval',
  'rejected',
  'cancelled',
  'approved',
  'departure_overdue',
  'out',
  'return_overdue',
  'returned',
] as const;
export type GatePassLifecycle = (typeof GATE_PASS_LIFECYCLES)[number];

/** The minimum a `GatePass` row needs for the derivation. Keeps this testable with plain objects. */
export type LifecycleInput = {
  status: string;
  outAt: Date;
  expectedInAt: Date;
  actualOutAt: Date | null;
  actualInAt: Date | null;
  isEmergency?: boolean;
};

/**
 * Orders the inbox by urgency, not by id.
 *
 * This IS the work order for a warden sitting at a gate, and getting it wrong is worse than
 * having no sort at all:
 *
 *   0. emergency & awaiting a decision  — a phone call is waiting
 *   1. return overdue                   — someone is missing
 *   2. awaiting a decision              — the queue
 *   3. departure overdue                — should have left and did not
 *   4. out, on time                     — fine
 *   5. approved, not yet due to leave   — fine, later
 *   6. returned                         — history
 *   7. rejected / cancelled             — history
 */
export function lifecycleRank(l: GatePassLifecycle, isEmergency: boolean): number {
  switch (l) {
    case 'awaiting_approval':
      return isEmergency ? 0 : 2;
    case 'return_overdue':
      return 1;
    case 'departure_overdue':
      return 3;
    case 'out':
      return 4;
    case 'approved':
      return 5;
    case 'returned':
      return 6;
    case 'rejected':
    case 'cancelled':
    default:
      return 7;
  }
}

/**
 * Derive the travel state of a pass.
 *
 * @param now injected so tests can pin the clock. Defaults to wall time.
 */
export function deriveLifecycle(p: LifecycleInput, now: Date = new Date()): GatePassLifecycle {
  switch (p.status) {
    case 'REJECTED':
      return 'rejected';
    case 'CANCELLED':
      return 'cancelled';
    // A PENDING pass has no travel state at all — the student has not left and may never be
    // allowed to. Returning 'approved' here would show an unapproved pass as cleared.
    case 'PENDING':
      return 'awaiting_approval';
    case 'APPROVED':
      break;
    default:
      // An unrecognised status must not silently read as "fine". Treating it as
      // awaiting_approval means it stays visible in the warden's queue rather than vanishing.
      return 'awaiting_approval';
  }

  // Returned. Checked first because it is terminal and unambiguous.
  if (p.actualInAt) return 'returned';

  const ms = now.getTime();

  // Gone. `actualOutAt` is what makes this correct: without it an approved-but-not-yet-departed
  // pass would read as "out", which is the bug this function replaces.
  if (p.actualOutAt) {
    return ms > p.expectedInAt.getTime() ? 'return_overdue' : 'out';
  }

  // Approved but never stamped as having left. Two very different situations, so two states:
  // the departure time has passed and they did not leave, versus the departure is still ahead.
  return ms > p.outAt.getTime() ? 'departure_overdue' : 'approved';
}

/** True when the pass needs a warden's attention right now. */
export function needsAction(l: GatePassLifecycle): boolean {
  return l === 'awaiting_approval' || l === 'return_overdue' || l === 'departure_overdue';
}

/**
 * Minutes past the planned return, or 0 when not overdue.
 *
 * Reported as a POSITIVE number of minutes late. Negative would be a strange number to put on
 * a screen ("-1440 minutes late"), and callers only display this when overdue anyway.
 */
export function minutesLate(
  p: Pick<LifecycleInput, 'expectedInAt' | 'actualInAt' | 'status'>,
  now: Date = new Date(),
): number {
  if (p.actualInAt) return 0;
  if (p.status !== 'APPROVED') return 0;
  const ms = now.getTime() - p.expectedInAt.getTime();
  return ms > 0 ? Math.floor(ms / 60000) : 0;
}

/**
 * Whether a student may request another pass.
 *
 * ONE OPEN PASS AT A TIME, and this is the rule that enforces it. It is not a bureaucratic
 * tidiness rule: the warder's whole job here is answering "who is in tonight?", and that
 * question is unanswerable if a student can hold three overlapping passes. A PENDING request
 * blocks, because it has not been answered yet. An APPROVED pass blocks until they return,
 * because they are out. A REJECTED or CANCELLED pass never blocks.
 *
 * Read as "this pass already occupies the slot", so the caller passes the candidate's own
 * existing passes.
 */
export function blocksNewRequest(existing: { status: string; actualInAt: Date | null }[]): boolean {
  return existing.some((p) => {
    if (p.status === 'PENDING') return true;
    if (p.status === 'APPROVED' && p.actualInAt === null) return true;
    return false;
  });
}

/** Why a new request was refused, in the student's own words. Used for the notification body. */
export function requestBlockedReason(
  existing: { status: string; actualInAt: Date | null }[],
): string | null {
  const pending = existing.find((p) => p.status === 'PENDING');
  if (pending) return 'You already have a gate pass awaiting approval.';
  const out = existing.find((p) => p.status === 'APPROVED' && p.actualInAt === null);
  if (out) return 'You are already out on an approved gate pass. Cancel or complete it first.';
  return null;
}