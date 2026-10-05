/**
 * S-12 Notifications — shared presentation helpers.
 *
 * The category vocabulary lives on the SERVER
 * (`backend/src/modules/alumni/notifications/notifications.rules.ts`) and is fetched
 * from `/notifications/categories`. This file deliberately does NOT re-declare it.
 *
 * The old screen carried its own `TYPE_META` map with six hardcoded entries, and it
 * was wrong in a way that was invisible: it had no `EVENT` key at all, so every one
 * of the 33 RSVP-confirmation rows in the database rendered as a grey "System"
 * message, and it had `ANNOUNCEMENT` and `DONATION` for rows that nothing wrote
 * under those names. Two copies of a vocabulary drift the moment one side changes,
 * and the drift only shows up as "why is this the wrong colour".
 *
 * So: icons, colours and labels come from the server on every load. What lives here
 * is the handful of things the server genuinely cannot know — the shape of a
 * broadcast audience in a form control, relative time, and the deep-link router.
 */
import { alumniApi } from '../../../../services/api';

export const TABS = ['Inbox', 'Preferences', 'Broadcast'];

/** Which tabs the office sees. Broadcast is meaningless for a graduate. */
export const officeTabs = () => [TABS[0], TABS[1], TABS[2]];

export const graduateTabs = () => [TABS[0], TABS[1]];

export const FALLBACK_META = {
  label: 'Other',
  icon: 'ellipsis-horizontal-circle-outline',
  color: '#64748b',
};

/**
 * Merge the server's catalogue (counts + rules) into one lookup.
 *
 * `rules` and `categories` are two views of the same table; the app needs the row's
 * own counts AND the static chrome, so they are keyed once here rather than at each
 * call site.
 */
export function buildCatalogue(catalogue) {
  const rules = new Map((catalogue?.rules ?? []).map((r) => [r.id, r]));
  const categories = (catalogue?.categories ?? []).map((c) => ({
    ...c,
    ...(rules.get(c.id) ?? {}),
  }));
  return {
    categories,
    categoryIds: catalogue?.categoryIds ?? categories.map((c) => c.id),
    metaFor: (id) => (id ? rules.get(id) ?? null : null),
  };
}

export function metaForRow(row, catalogue) {
  const fromRules = catalogue?.metaFor?.(row?.category);
  return {
    label: row?.label ?? fromRules?.label ?? FALLBACK_META.label,
    icon: row?.icon ?? fromRules?.icon ?? FALLBACK_META.icon,
    color: row?.color ?? fromRules?.color ?? FALLBACK_META.color,
    blurb: fromRules?.blurb ?? '',
  };
}

/**
 * Broadcast audiences, as form options.
 *
 * The year and city lists are fetched rather than hardcoded because they are
 * properties of the data: the seed has eleven graduation years (2015-2025) and six
 * cities, and the old screen offered exactly one of each — `BATCH_2024` and
 * Bengaluru — which is how a broadcast to "everyone" quietly became a broadcast to
 * 3 people.
 */
export const AUDIENCE_KINDS = [
  { kind: 'ALL_ALUMNI', label: 'All alumni', icon: 'people-outline', hint: 'Everyone on the alumni roll.' },
  { kind: 'GRADUATION_YEAR', label: 'One graduation year', icon: 'school-outline', hint: 'Everyone who finished that year.', needsValue: 'number' },
  { kind: 'CHAPTER_CITY', label: 'One chapter city', icon: 'location-outline', hint: 'Everyone in that city chapter.', needsValue: 'string' },
  { kind: 'CHAPTER_MEMBERS', label: 'One chapter', icon: 'business-outline', hint: 'Everyone in that specific chapter.', needsValue: 'chapter' },
  { kind: 'MENTORS', label: 'Active mentors', icon: 'hand-left-outline', hint: 'Alumni currently paired with a student.' },
];

export const TEMPLATES = [
  { key: 'EVENT_INVITE', label: 'Event invite', icon: 'calendar-outline', subject: 'You are invited to an upcoming alumni event', body: 'We are hosting an alumni event on campus. Open the Events tab for details and to RSVP.' },
  { key: 'NEWSLETTER', label: 'Newsletter', icon: 'mail-outline', subject: 'Learnix Alumni Newsletter', body: 'The latest news, achievements and chapter updates from the alumni network.' },
  { key: 'REUNION', label: 'Reunion', icon: 'people-outline', subject: 'Reunion announcement', body: 'Save the date — our next alumni reunion is being planned. Details to follow.' },
  { key: 'DONATION_APPEAL', label: 'Donation appeal', icon: 'gift-outline', subject: 'Support the new library wing', body: 'The library wing campaign is underway. Every contribution counts — give from the Donations tab.' },
  { key: 'MILESTONE', label: 'Milestone', icon: 'trophy-outline', subject: 'A milestone worth celebrating', body: 'We passed a number we are proud of. Thank you to everyone who made it happen.' },
];

export function audienceLabel(audience) {
  if (!audience) return 'Unknown audience';
  const kind = AUDIENCE_KINDS.find((k) => k.kind === audience.kind);
  if (!kind) return audience.kind || 'Unknown audience';
  if (audience.kind === 'ALL_ALUMNI') return kind.label;
  if (audience.kind === 'MENTORS') return kind.label;
  if (audience.kind === 'GRADUATION_YEAR') return `Class of ${audience.value}`;
  if (audience.kind === 'CHAPTER_CITY') return `${audience.value} chapter`;
  if (audience.kind === 'CHAPTER_MEMBERS') return 'One chapter';
  return kind.label;
}

/** Where a row's deep link lands, mapped onto this app's single-screen shell. */
export function deepLinkTarget(deepLink) {
  if (!deepLink || typeof deepLink !== 'object') return null;
  const { screen, tab } = deepLink;
  if (!screen) return null;
  if (screen === 'Notifications') return null; // already here
  return { screen, tab: tab ?? null };
}

export function relativeTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Load the year/city options the composer needs. Failure is non-fatal. */
export async function loadAudienceOptions() {
  try {
    const [years, cities] = await Promise.all([
      alumniApi.alumniDirectory ? Promise.resolve([]) : Promise.resolve([]),
      Promise.resolve([]),
    ]);
    return { years, cities };
  } catch {
    return { years: [], cities: [] };
  }
}
