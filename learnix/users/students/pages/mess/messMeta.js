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
 * NO DATE ARITHMETIC AT ALL
 * ----------------------------
 * The screen sends `dayOffset` (an integer, "how many days back") and the server derives the day.
 * There is no `dateFor`/`daysAgo` helper here, and no `new Date()`: a client that builds a date has
 * to get local midnight and DST right on its own, and every way of getting that wrong asks about a
 * day the resident did not mean. `fmtDayLabel` below is the only date-shaped code and it is a pure
 * string transform on a value the server sent.
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

// There is deliberately no `dateFor` here. This screen used to carry one, and it was wrong by
// construction: `toISOString().slice(0, 10)` converts to UTC first, so a request made at 00:30 local
// asked the server about the PREVIOUS day - and a student complaining about tonight's dinner was
// silently rating yesterday. Building the offset by hand was only a smaller version of the same
// mistake. The screen now sends `dayOffset` (an integer) and the server derives the day.