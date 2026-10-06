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
 * message, and it had `ANNOUNCEMENT` and `DONATION` entries for rows nothing wrote
 * under those names. Two copies of a vocabulary drift the moment one side changes,
 * and the drift only shows up as "why is this the wrong colour".
 *
 * So icons, colours and labels come from the server on every load. What lives here is
 * the handful of things the server genuinely cannot know — the shape of a broadcast
 * audience as a form control, relative time, and the deep-link router.
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

/**
 * Merge fresh per-category counts into an existing catalogue.
 *
 * The inbox response carries `counts` (totals and unread per category) but NOT the
 * static rule metadata, and the catalogue response carries both. These are two views
 * of one table, so an inbox refetch must patch the counts onto the catalogue rather
 * than rebuild it — rebuilding from the merged category rows would feed the counts
 * back in as if they were rules, and the rule metadata (icon, colour, blurb) would be
 * lost on the first refetch.
 */
export function applyCounts(catalogue, counts) {
  if (!counts || !catalogue?.categories) return catalogue;
  return {
    ...catalogue,
    categories: catalogue.categories.map((c) => ({
      ...c,
      total: counts[c.id]?.total ?? 0,
      unread: counts[c.id]?.unread ?? 0,
    })),
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
 * cities, and the old screen offered exactly one of each as a literal — `BATCH_2024`
 * and Bengaluru — which is how a broadcast intended for everyone quietly became a
 * broadcast to three people.
 */
export const AUDIENCE_KINDS = [
  {
    kind: 'ALL_ALUMNI',
    label: 'All alumni',
    icon: 'people-outline',
    hint: 'Everyone on the alumni roll.',
  },
  {
    kind: 'GRADUATION_YEAR',
    label: 'One graduation year',
    icon: 'school-outline',
    hint: 'Everyone who finished that year.',
    needsValue: 'number',
  },
  {
    kind: 'CHAPTER_CITY',
    label: 'One chapter city',
    icon: 'location-outline',
    hint: 'Everyone in that city chapter.',
    needsValue: 'string',
  },
  {
    kind: 'CHAPTER_MEMBERS',
    label: 'One chapter',
    icon: 'business-outline',
    hint: 'Everyone in that specific chapter.',
    needsValue: 'chapter',
  },
  {
    kind: 'MENTORS',
    label: 'Active mentors',
    icon: 'hand-left-outline',
    hint: 'Alumni currently paired with a student.',
  },
];

export const TEMPLATES = [
  {
    key: 'EVENT_INVITE',
    label: 'Event invite',
    icon: 'calendar-outline',
    subject: 'You are invited to an upcoming alumni event',
    body: 'We are hosting an alumni event on campus. Open the Events tab for details and to RSVP.',
  },
  {
    key: 'NEWSLETTER',
    label: 'Newsletter',
    icon: 'mail-outline',
    subject: 'Learnix Alumni Newsletter',
    body: 'The latest news, achievements and chapter updates from the alumni network.',
  },
  {
    key: 'REUNION',
    label: 'Reunion',
    icon: 'people-outline',
    subject: 'Reunion announcement',
    body: 'Save the date — our next alumni reunion is being planned. Details to follow.',
  },
  {
    key: 'DONATION_APPEAL',
    label: 'Donation appeal',
    icon: 'gift-outline',
    subject: 'Support the new library wing',
    body: 'The library wing campaign is underway. Every contribution counts — give from the Donations tab.',
  },
  {
    key: 'MILESTONE',
    label: 'Milestone',
    icon: 'trophy-outline',
    subject: 'A milestone worth celebrating',
    body: 'We passed a number we are proud of. Thank you to everyone who made it happen.',
  },
];

export function audienceLabel(audience) {
  if (!audience) return 'Unknown audience';
  const kind = AUDIENCE_KINDS.find((k) => k.kind === audience.kind);
  if (!kind) return audience.kind || 'Unknown audience';
  if (audience.kind === 'GRADUATION_YEAR') return `Class of ${audience.value}`;
  if (audience.kind === 'CHAPTER_CITY') return `${audience.value} chapter`;
  if (audience.kind === 'CHAPTER_MEMBERS') return 'One chapter';
  return kind.label;
}

/**
 * Where a row's deep link lands.
 *
 * Returns the MODULE to open, never a sub-tab. The alumni shell
 * (`learnix/users/alumni/alumni.js`) exposes only
 * `{ navigate(screen), goBack(), openModule(key), switchTab(tabId) }` — there is no
 * params channel, so "open Events, tab Registered, event evt_123" cannot currently be
 * expressed without changing the shell and every module that would then have to read
 * the param. Opening the right module is a real improvement over the old behaviour of
 * ignoring `deepLink` entirely; pretending to a sub-tab we cannot deliver would be
 * worse, so the `tab` stays in the descriptor and unused until the shell grows a
 * params channel.
 */
export function deepLinkTarget(deepLink) {
  if (!deepLink || typeof deepLink !== 'object') return null;
  const { screen } = deepLink;
  if (!screen || screen === 'Notifications') return null;
  return { screen };
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

/**
 * Load the year/city/chapter lists the composer offers.
 *
 * Fails soft: an empty option list leaves the composer usable for ALL_ALUMNI and
 * MENTORS, which need no value, and disables the three audiences that do. Blocking
 * the whole Broadcast tab because an options request failed would be worse than a
 * narrower picker.
 */
export async function loadAudienceOptions() {
  try {
    const data = await alumniApi.broadcastOptions();
    return {
      years: Array.isArray(data?.years) ? data.years : [],
      cities: Array.isArray(data?.cities) ? data.cities : [],
    };
  } catch {
    return { years: [], cities: [] };
  }
}