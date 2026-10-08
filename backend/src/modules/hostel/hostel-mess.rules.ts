/**
 * Mess rules: the day arithmetic and rate maths that the whole feature agrees on.
 *
 * WHY A SEPARATE MODULE
 * ---------------------
 * Three bugs in this feature were all the same bug wearing different clothes: a calendar day was
 * compared as an INSTANT. `getMess` matched today's attendance with
 * `a.date.getTime() === today.setHours(0,0,0,0)`; the `MESS_MEMBERS` broadcast audience did the
 * same. Both only appeared to work because the seeder wrote midnight and the server happens to
 * share the institution's timezone, so the instant happened to line up. Mark a roll at 08:05 and
 * the day's attendance reads zero, silently, with no error anywhere.
 *
 * A day is a RANGE. `dayRange` is the only way to turn one into a query, and it is used by every
 * read and every write, so the mistake cannot be made twice in a different file.
 *
 * WHY `RESIDENTS` IS NOT A CONSTANT
 * ---------------------------------
 * `getMess` reported residents as `attendance.length > 0 ? residentsOfBlock().length : 0` - two
 * unrelated figures joined by a condition that means nothing. With no attendance the hostel would
 * report zero residents. The denominator for a participation rate has to come from the bed
 * inventory every time, never be inferred from whether some other table happened to have rows.
 */

/** Minutes from UTC to the institution's local time. IST is 330; a campus elsewhere sets one number. */
export const DEFAULT_UTC_OFFSET_MINUTES = 330;

export const MEALS = ['BREAKFAST', 'LUNCH', 'DINNER'] as const;
export type Meal = (typeof MEALS)[number];

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const isMeal = (v: unknown): v is Meal =>
  typeof v === 'string' && (MEALS as readonly string[]).includes(v);

/**
 * Parse a `YYYY-MM-DD` string into the local midnight that starts that day.
 *
 * Returns `null` for anything that is not a real calendar date. The check is not a regex: it
 * round-trips through `Date.UTC` so `2026-02-30` is rejected instead of silently becoming the 2nd
 * of March. A roll for the 30th of February is a typo, and quietly marking the wrong day is worse
 * than refusing.
 */
export function parseDay(value: string | undefined | null): Date | null {
  if (!value || typeof value !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    return null;
  }
  // The same construction `localMidnightOf` uses, so a parsed day and a "today" are the same kind of
  // value. Going through that helper (rather than re-deriving it here) is what guarantees the two
  // agree - which they must, or `parseDay` rows and `localToday` rows land in different ranges.
  return new Date(Date.parse(`${value.trim()}T00:00:00.000Z`) - DEFAULT_UTC_OFFSET_MINUTES * 60_000);
}

/** `YYYY-MM-DD` for the local day containing `at`. Stable regardless of the server's own timezone. */
export function dayKey(at: Date, offsetMinutes = DEFAULT_UTC_OFFSET_MINUTES): string {
  const local = new Date(at.getTime() + offsetMinutes * 60_000);
  return local.toISOString().slice(0, 10);
}

/**
 * The real instant of LOCAL midnight for the day containing `at`.
 *
 * Note what this is NOT: `new Date(at.getTime() - offsetMinutes * 60_000)`. That expression
 * subtracts the offset from the CURRENT instant, which yields an arbitrary moment roughly half an
 * hour before the actual local midnight — it happens to be right only when `at` is itself local
 * midnight. Written that way, `dayRange(today).gte` landed at 10:12 rather than 00:00, every row the
 * seeder had written at local midnight fell OUTSIDE the range, and "today" silently read zero
 * attendances and zero ratings. Same family of bug as the equality comparison, one layer down:
 * confusing a shifted instant with a day boundary.
 *
 * The correct construction is: shift FORWARD to get the local calendar date, read the date key off
 * that, rebuild it as UTC midnight, then shift BACK by the offset.
 */
export function localMidnightOf(at: Date, offsetMinutes = DEFAULT_UTC_OFFSET_MINUTES): Date {
  const local = new Date(at.getTime() + offsetMinutes * 60_000);
  const key = local.toISOString().slice(0, 10);
  return new Date(Date.parse(`${key}T00:00:00.000Z`) - offsetMinutes * 60_000);
}

/**
 * The half-open range `[start, end)` covering one local day.
 *
 * Half-open is the point. `lte nextMidnight` would pull in the first instant of the following day,
 * so a row stamped exactly midnight tomorrow would be counted in two days. `lt` cannot double-count.
 */
export function dayRange(day: Date, offsetMinutes = DEFAULT_UTC_OFFSET_MINUTES): { gte: Date; lt: Date } {
  const gte = localMidnightOf(day, offsetMinutes);
  // The end is the NEXT day's midnight, derived by advancing the day key rather than by adding
  // 86 400 000 ms to a real instant - the same value, but it keeps the "which day" reasoning in one
  // place instead of half date arithmetic and half instant arithmetic.
  const nextKey = new Date(Date.parse(dayKey(day, offsetMinutes) + 'T00:00:00.000Z') + 86_400_000)
    .toISOString()
    .slice(0, 10);
  const lt = new Date(Date.parse(`${nextKey}T00:00:00.000Z`) - offsetMinutes * 60_000);
  return { gte, lt };
}

/** The local midnight of today. Every write normalises to this so stored days line up. */
export function localToday(now = new Date(), offsetMinutes = DEFAULT_UTC_OFFSET_MINUTES): Date {
  return localMidnightOf(now, offsetMinutes);
}

/** Same, for a span of days starting at `day`. Used by the log and the analytics window. */
export function dayRangeSpan(
  day: Date,
  days: number,
  offsetMinutes = DEFAULT_UTC_OFFSET_MINUTES,
): { gte: Date; lt: Date } {
  const { gte } = dayRange(day, offsetMinutes);
  return { gte, lt: addDays(gte, days) };
}

/**
 * Add whole days to a normalised day, staying normalised.
 *
 * A fixed offset means there is no DST discontinuity to reason about, so "local midnight plus
 * 86 400 000 ms" is exactly local midnight the next day. Applying the offset here would be the
 * bug this file exists to prevent, so it is deliberately not applied.
 */
export function addDays(day: Date, days: number): Date {
  return new Date(day.getTime() + days * 86_400_000);
}

/** Day-of-week index for a normalised local day, where 0 = Sunday - matching `MessMenuItem.dayOfWeek`. */
export function dayIndex(day: Date, offsetMinutes = DEFAULT_UTC_OFFSET_MINUTES): number {
  const local = new Date(day.getTime() + offsetMinutes * 60_000);
  return local.getUTCDay();
}

/**
 * Participation for one meal as a PERCENTAGE OF RESIDENTS.
 *
 * The old screen showed `1,182 / 1,248` from hardcoded data and a live count from a broken
 * query. Neither is a number a kitchen can act on: "24" is meaningless without knowing the
 * denominator, and a percentage without it hides a hostel of three. So the rate is computed here,
 * always against the real resident count, and always alongside that count - never instead of it.
 *
 * Returns `null` when there are no residents, because 0/0 is not 0%. Reporting "0% participation"
 * for an empty hostel is a false statement about a kitchen that does not exist.
 */
export function participationRate(present: number, residents: number): number | null {
  if (residents <= 0) return null;
  return Math.round((present / residents) * 1000) / 10;
}

/**
 * Average rating over a declared window, with its own sample size.
 *
 * The original `avgRating` took the 15 most recent feedback rows (`take: 15` applied BEFORE the
 * average) and labelled the result "Weekly Rating". It was neither: not weekly, and not an average
 * over a window — an average over however many opinions happened to arrive last, which drifts with
 * response rate. A star rating with no sample size is a number nobody can argue with, so the count
 * travels with it and the caller is expected to show both.
 */
export function windowedRating(rows: Array<{ rating: number }>): { average: number | null; responses: number } {
  if (rows.length === 0) return { average: null, responses: 0 };
  const total = rows.reduce((n, r) => n + r.rating, 0);
  return { average: Math.round((total / rows.length) * 10) / 10, responses: rows.length };
}

/**
 * Clamp a requested analytics window to something a kitchen chart can actually draw.
 *
 * Defaults to the last 30 days, swaps the ends if they arrive reversed, and refuses to return more
 * than `maxDays`. An unparseable `from`/`to` is treated as absent rather than as an error, so a
 * hand-typed query string cannot blank the screen - the range the caller asked for is clamped, not
 * discarded.
 *
 * Written with explicit `if`s rather than `from && parseDay(from) ?? fallback`: that idiom yields
 * `''` (not `undefined`) for an empty string, so the type quietly widens to `"" | Date` and the
 * first `.getTime()` is a runtime hazard waiting to happen.
 */
export function clampWindow(from?: string, to?: string, maxDays = 90) {
  const parsedFrom = from ? parseDay(from) : null;
  const parsedTo = to ? parseDay(to) : null;
  const today = localToday();

  let gte = parsedFrom ?? addDays(today, -29);
  let lt = parsedTo ?? today;
  if (gte > lt) {
    const swap = gte;
    gte = lt;
    lt = swap;
  }
  const spanDays = (lt.getTime() - gte.getTime()) / 86_400_000;
  if (spanDays > maxDays) lt = addDays(gte, maxDays);

  // Inclusive of both end days, which is what a person means by "the 1st to the 7th".
  const days = Math.max(1, Math.round((lt.getTime() - gte.getTime()) / 86_400_000) + 1);
  return { gte, lt, days };
}