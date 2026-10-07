/**
 * Vocabulary for the graduate dashboard (docs/users/12-alumni-relations.md §3.1).
 *
 * WHY A META MODULE AT ALL
 * -----------------------
 * Every card needs the same four things: a title, an icon, a colour, and a formatter. Left
 * inline, that is eight cards independently inventing "₹12.5 L" and six shades of blue,
 * and they drift within a single release. The old dashboard already had this problem — its
 * local `fmt` did not match the donations screen's, so the same figure could render two
 * ways depending on which tab you were on.
 *
 * THE EMPTY-STATE RULE
 * --------------------
 * `MISSING` is what a field renders as when it has not been filled in. It is NOT "None",
 * and it is NOT "0". Those read as facts about the world — a graduate with no batch is not
 * a graduate with an empty batch, and a person who has given nothing has given zero, which
 * is a different statement from "we don't know yet".
 *
 * This matters most because the demo identity is the Alumni Relations Office, whose own
 * `AlumniProfile` has no batch and no employer. A dashboard that printed "0 classmates" or
 * "No organisation" for her would be asserting something false; one that says "Not added
 * yet" is asking a question.
 */

/** Rendered wherever the server returned `null` for a field the graduate may fill in. */
export const MISSING = 'Not added yet';

/**
 * Rupee formatting, Indian numbering.
 *
 * Lakh and crore are used because this is an Indian institution's alumni office; the
 * previous dashboard's `fmt` and the donations screen's differed by a factor in the
 * crores branch, so the two screens disagreed about the same number.
 */
export function fmtRupees(n) {
  const v = Number(n) || 0;
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(v % 10000000 === 0 ? 0 : 1)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(v % 100000 === 0 ? 0 : 1)} L`;
  return `₹${v.toLocaleString('en-IN')}`;
}

/** A count with its noun, pluralised. Used for every "N active" style label. */
export function countLabel(n, singular, plural) {
  const v = Number(n) || 0;
  return `${v} ${v === 1 ? singular : plural ?? `${singular}s`}`;
}

/**
 * "3 days ago" / "in 2 months".
 *
 * Relative time, not absolute, because the dashboard's job is "is this soon". An event
 * date printed as "12 Nov 2026" makes the reader do the subtraction; a card that says
 * "in 12 days" does not.
 */
export function relativeDay(value) {
  if (!value) return null;
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return null;
  const diffDays = Math.round((then - Date.now()) / 86400000);

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays === -1) return 'yesterday';
  if (diffDays > 0) {
    if (diffDays < 31) return `in ${diffDays} days`;
    const months = Math.round(diffDays / 30);
    if (months < 12) return `in ${countLabel(months, 'month')}`;
    return `in ${countLabel(Math.round(months / 12), 'year')}`;
  }
  const past = Math.abs(diffDays);
  if (past < 31) return `${past} days ago`;
  return `${Math.round(past / 30)} months ago`;
}

export function fmtDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** "10 years" / "1 year" — the wording the career card uses next to the number. */
export function yearsLabel(n) {
  if (n === null || n === undefined) return MISSING;
  return countLabel(n, 'year');
}

/**
 * One palette, used by every card.
 *
 * `tint` is the card's 10%-alpha background, derived from the hex rather than hand-written
 * per card — hand-written tints were how the old dashboard ended up with two blues that
 * were meant to be the same blue.
 */
export const ACCENT = {
  identity: '#2563eb',
  career: '#0891b2',
  events: '#059669',
  mentorship: '#7c3aed',
  giving: '#d97706',
  network: '#db2777',
  neutral: '#64748b',
};

export function tint(hex) {
  return `${hex}1a`;
}

/**
 * Section registry: the hub maps over this rather than hard-coding an order.
 *
 * Each entry names its component so a section can be reordered, or dropped for a role,
 * by editing one list instead of re-writing the JSX tree.
 */
export const SECTIONS = [
  { key: 'snapshot', title: 'Alumni Snapshot', icon: 'school-outline', accent: ACCENT.identity },
  { key: 'career', title: 'Career Overview', icon: 'briefcase-outline', accent: ACCENT.career },
  { key: 'events', title: 'Upcoming Events', icon: 'calendar-outline', accent: ACCENT.events },
  { key: 'mentorship', title: 'Mentorship Activity', icon: 'people-outline', accent: ACCENT.mentorship },
  { key: 'giving', title: 'Donation Summary', icon: 'gift-outline', accent: ACCENT.giving },
  { key: 'network', title: 'Network Highlights', icon: 'sparkles-outline', accent: ACCENT.network },
];

/**
 * Quick actions.
 *
 * `kind` decides how the hub navigates, because the app's router is shallow: `tab`
 * switches a bottom-nav tab, `module` pushes a feature module. `Connect` and `Donate` are
 * deliberately `tab` rather than something more precise — the Connections inbox and the
 * Give screen are local state inside their parents, so nothing can link to them directly
 * yet. Deep-linking them needs a routing change, not a dashboard change.
 */
export const QUICK_ACTIONS = [
  {
    key: 'join',
    label: 'Join Event',
    caption: 'Reunions & talks',
    icon: 'calendar-outline',
    accent: ACCENT.events,
    kind: 'tab',
    target: 'Events',
  },
  {
    key: 'mentor',
    label: 'Find Mentor',
    caption: 'Get guidance',
    icon: 'people-outline',
    accent: ACCENT.mentorship,
    kind: 'module',
    target: 'Mentorship',
  },
  {
    key: 'connect',
    label: 'Connect',
    caption: 'Grow your network',
    icon: 'person-add-outline',
    accent: ACCENT.network,
    kind: 'tab',
    target: 'Alumni',
  },
  {
    key: 'donate',
    label: 'Donate',
    caption: 'Support a cause',
    icon: 'gift-outline',
    accent: ACCENT.giving,
    kind: 'tab',
    target: 'Donations',
  },
];

/**
 * What to say when a section genuinely has nothing, per section.
 *
 * Each is a real, distinct state. "No events scheduled" is the institution's problem and
 * worth saying; "You have not given yet" is the graduate's own and reads as an accusation
 * if phrased as a failure.
 */
export const EMPTY_COPY = {
  events: {
    icon: 'calendar-outline',
    title: 'Nothing scheduled yet',
    body: 'There are no upcoming alumni events to join right now.',
  },
  mentorship: {
    icon: 'people-outline',
    title: 'No mentorship yet',
    body: 'Ask for a mentor, or offer to be one — both are useful.',
  },
  giving: {
    icon: 'gift-outline',
    title: 'You have not given yet',
    body: 'Every contribution helps, in any amount.',
  },
  network: {
    icon: 'sparkles-outline',
    title: 'No connections yet',
    body: 'Browse the directory to find people in your field.',
  },
};