/**
 * Presentation helpers for the STUDENT mess screen.
 *
 * WHY THIS EXISTS ALONGSIDE `users/hostel/pages/mess/messMeta.js` RATHER THAN IMPORTING IT
 * ------------------------------------------------------------------------------------------
 * Nothing in this repo imports across `users/<app>/` boundaries - each app is a separate app with
 * its own navigation, its own tokens and its own build. A student screen reaching into
 * `users/hostel/pages/` to borrow a colour would couple two apps that can be shipped apart, so the
 * handful of shared-looking helpers are restated here instead.
 *
 * The duplication is deliberately small - meal labels, icons, colours and a date formatter - and
 * this file says so rather than pretending the two screens are unrelated.
 *
 * NO DATE ARITHMETIC BEYOND STRING FORMATTING
 * -------------------------------------------
 * The day of the week comes from `GET /student/mess` (`dayOfWeek`), not from the client. The one
 * date function here splits a `YYYY-MM-DD` string into readable parts, which is a pure transform:
 * it cannot be off by a day the way `new Date('2026-10-08')` can, since that parses as UTC midnight
 * and renders as the 7th in a negative offset.
 */

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const MEALS = ['BREAKFAST', 'LUNCH', 'DINNER'];

export const MEAL_META = {
  BREAKFAST: { label: 'Breakfast', icon: 'sunny-outline', color: '#d97706' },
  LUNCH: { label: 'Lunch', icon: 'restaurant-outline', color: '#2563eb' },
  DINNER: { label: 'Dinner', icon: 'moon-outline', color: '#0891b2' },
};

export const mealLabel = (meal) => MEAL_META[meal]?.label ?? meal ?? '—';
export const mealIcon = (meal) => MEAL_META[meal]?.icon ?? 'restaurant-outline';
export const mealColor = (meal) => MEAL_META[meal]?.color ?? '#64748b';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** `YYYY-MM-DD` → "8 Oct". Splits the string; derives nothing. */
export const fmtDayLabel = (dayKey) => {
  if (!dayKey || typeof dayKey !== 'string') return '—';
  const [y, m, d] = dayKey.split('-');
  const mi = Number(m) - 1;
  if (!y || !d || Number.isNaN(mi) || mi < 0 || mi > 11) return dayKey;
  return `${Number(d)} ${MONTHS[mi]}`;
};

/**
 * `YYYY-MM-DD` for `n` days back, from local calendar parts.
 *
 * Built from `getFullYear/getMonth/getDate` and string-padded, NOT from
 * `toISOString().slice(0, 10)`. That is a real trap rather than a style preference: `toISOString`
 * converts to UTC first, so a request made at 00:30 local in IST asks the server about the
 * PREVIOUS day, and a student complaining about tonight's dinner is silently rating yesterday.
 */
export function dateFor(n = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}