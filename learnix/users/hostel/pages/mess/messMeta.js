/**
 * Presentation-only helpers for the mess screens.
 *
 * WHY THE DAY ARITHMETIC IS NOT HERE
 * ---------------------------------
 * There is deliberately no date maths in this file. "Which day of the week is 8 Oct?" is a
 * question the server already answered - `GET /hostel/mess` returns `today` AND `todayDayOfWeek`,
 * and `GET /student/mess` returns `dayOfWeek` for the day it rendered.
 *
 * The previous version of the warden screen held a `days = ['Mon', ...]` array and a selected
 * string, and the client decided which row to show. The bug that class of logic invites is
 * exactly the bug this feature already had three times on the server: treating a calendar day as an
 * instant, then wondering why today's number was zero. If the client cannot compute "today", it
 * cannot get that wrong either.
 *
 * Everything below formats what the server sent. Nothing here infers a fact.
 */

/** `dayOfWeek` is 0 = Sunday on the server too, so this table must stay in that order. */
export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MEALS = ['BREAKFAST', 'LUNCH', 'DINNER'];

export const MEAL_META = {
  BREAKFAST: { label: 'Breakfast', icon: 'sunny-outline', color: '#d97706' },
  LUNCH: { label: 'Lunch', icon: 'restaurant-outline', color: '#2563eb' },
  DINNER: { label: 'Dinner', icon: 'moon-outline', color: '#0891b2' },
};

export const mealLabel = (meal) => MEAL_META[meal]?.label ?? meal ?? '—';
export const mealIcon = (meal) => MEAL_META[meal]?.icon ?? 'restaurant-outline';
export const mealColor = (meal) => MEAL_META[meal]?.color ?? '#64748b';

/**
 * A percentage that is allowed to be unknown.
 *
 * `ratePct` is `null` when the hostel has no residents, because 0/0 is not 0%. Rendering that as
 * "0%" states that nobody ate in a kitchen that does not exist, so this returns an em dash and the
 * screen shows a dash instead of a confident wrong number.
 */
export const fmtPct = (pct) => (pct === null || pct === undefined ? '—' : `${pct}%`);

/**
 * A star rating that is allowed to be unknown, always with its sample size.
 *
 * `4.1★` on its own is unfalsifiable. A rating with no count beside it cannot be argued with, and
 * the server sends `responses` precisely so it can be. "4.1 from 31 ratings" is a claim a warden
 * can act on; "4.1" is decoration.
 */
export const fmtRating = (avg, responses) => {
  if (avg === null || avg === undefined) return 'Not rated';
  if (!responses) return `${avg}★`;
  return `${avg}★ (${responses})`;
};

/** Paise → rupees. The server already converts; this only formats for display. */
export const fmtRupees = (rupees) =>
  rupees === null || rupees === undefined
    ? '—'
    : `₹${Number(rupees).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

/** Compact money for a stat tile: ₹1.5L rather than ₹150,000. */
export const fmtRupeesCompact = (rupees) => {
  if (rupees === null || rupees === undefined) return '—';
  const n = Number(rupees);
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
};

/**
 * `YYYY-MM-DD` → something readable, WITHOUT asking the client what day of the week it is.
 *
 * The date is split on the hyphens and the month is looked up by name, so this is a pure string
 * transform: it cannot be off by a day the way `new Date('2026-10-08')` can (that string parses as
 * UTC midnight and renders as the 7th in a negative offset).
 */
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const fmtDayLabel = (dayKey) => {
  if (!dayKey || typeof dayKey !== 'string') return '—';
  const [y, m, d] = dayKey.split('-');
  const mi = Number(m) - 1;
  if (!y || !d || Number.isNaN(mi) || mi < 0 || mi > 11) return dayKey;
  return `${Number(d)} ${MONTHS[mi]}`;
};

/** Just the day part, for "rated 8 Oct" captions. */
export const fmtShortDay = (dayKey) => fmtDayLabel(dayKey);

/**
 * Colour for a participation rate. Thresholds live here, once, so the roll screen, the log and the
 * analytics cannot each invent their own idea of what "busy" means.
 */
export const rateTone = (pct) => {
  if (pct === null || pct === undefined) return { color: '#64748b', label: 'No data' };
  if (pct >= 85) return { color: '#059669', label: 'Well fed' };
  if (pct >= 65) return { color: '#2563eb', label: 'Steady' };
  if (pct >= 40) return { color: '#d97706', label: 'Thin' };
  return { color: '#dc2626', label: 'Very low' };
};

/** Star rating as a number, for rendering five stars. */
export const ratingStars = (avg) => {
  if (avg === null || avg === undefined) return 0;
  return Math.max(0, Math.min(5, Math.round(avg)));
};

export const STATUS_TONE = {
  PENDING: { color: '#d97706', bg: '#fffbeb' },
  APPROVED: { color: '#059669', bg: '#f0fdf4' },
  REJECTED: { color: '#dc2626', bg: '#fef2f2' },
};