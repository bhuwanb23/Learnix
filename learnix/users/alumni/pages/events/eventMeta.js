/**
 * Shared vocabulary for the Alumni events feature.
 *
 * Kept in one place because the type taxonomy is decided by the SERVER
 * (`Event.eventType`) and every screen here has to agree with it. An earlier
 * version hard-coded the colours and labels inline in each screen, so the list
 * called a WEBINAR "Technical" while the detail screen called it a webinar.
 */

export const EVENT_TYPES = [
  {
    value: 'REUNION',
    label: 'Reunion',
    short: 'Reunion',
    icon: 'people-outline',
    color: '#7c3aed',
    blurb: 'Batch get-togethers and homecoming',
  },
  {
    value: 'NETWORKING',
    label: 'Networking',
    short: 'Networking',
    icon: 'git-network-outline',
    color: '#0891b2',
    blurb: 'Mentor mixers and career connects',
  },
  {
    value: 'WORKSHOP',
    label: 'Workshop',
    short: 'Workshop',
    icon: 'construct-outline',
    color: '#2563eb',
    blurb: 'Hands-on skill sessions',
  },
  {
    value: 'WEBINAR',
    label: 'Webinar',
    short: 'Webinar',
    icon: 'videocam-outline',
    color: '#d97706',
    blurb: 'Online talks and panels',
  },
  {
    value: 'MEETUP',
    label: 'Meetup',
    short: 'Meetup',
    icon: 'location-outline',
    color: '#059669',
    blurb: 'Regional chapter meetups',
  },
];

export const TYPE_MAP = EVENT_TYPES.reduce((acc, t) => ({ ...acc, [t.value]: t }), {});

/** An event with no `eventType` (a student or sports event) still needs a chip. */
export function typeMeta(eventType) {
  return (
    TYPE_MAP[eventType] ?? {
      value: null,
      label: 'Event',
      short: 'Event',
      icon: 'calendar-outline',
      color: '#64748b',
      blurb: '',
    }
  );
}

export const REG_STATUS = {
  PENDING: { label: 'Waitlisted', color: '#d97706', icon: 'hourglass-outline' },
  CONFIRMED: { label: 'Going', color: '#059669', icon: 'checkmark-circle-outline' },
  DECLINED: { label: 'Declined', color: '#dc2626', icon: 'close-circle-outline' },
  CANCELLED: { label: 'Cancelled', color: '#94a3b8', icon: 'ban-outline' },
  APPROVED: { label: 'Going', color: '#059669', icon: 'checkmark-circle-outline' },
  REJECTED: { label: 'Declined', color: '#dc2626', icon: 'close-circle-outline' },
};

export function regStatusMeta(status) {
  return REG_STATUS[status] ?? { label: status ?? '—', color: '#64748b', icon: 'ellipse-outline' };
}

export const EVENT_STATUS = {
  DRAFT: { label: 'Draft', color: '#64748b' },
  PENDING_ADMIN: { label: 'Awaiting approval', color: '#d97706' },
  APPROVED: { label: 'Open', color: '#2563eb' },
  PUBLISHED: { label: 'Open', color: '#059669' },
  COMPLETED: { label: 'Completed', color: '#7c3aed' },
  CANCELLED: { label: 'Cancelled', color: '#dc2626' },
};

export function eventStatusMeta(status) {
  return EVENT_STATUS[status] ?? { label: status ?? '—', color: '#64748b' };
}

// ── Formatters ──
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtDate(d) {
  if (!d) return '—';
  const x = new Date(d);
  return `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
}

export function fmtTime(d) {
  if (!d) return '';
  const x = new Date(d);
  let h = x.getHours();
  const m = String(x.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

export function fmtDateTime(d) {
  if (!d) return '—';
  return `${fmtDate(d)} · ${fmtTime(d)}`;
}

/** "in 3 days" / "2 months ago" — friendlier than a raw date on a card. */
export function relativeDay(d) {
  if (!d) return '';
  const diff = new Date(d).getTime() - Date.now();
  const days = Math.round(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 1 && days < 30) return `in ${days} days`;
  if (days === -1) return 'Yesterday';
  if (days < -1 && days > -30) return `${Math.abs(days)} days ago`;
  if (days < 0) {
    const months = Math.round(Math.abs(days) / 30);
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }
  const months = Math.round(days / 30);
  return months <= 1 ? 'this month' : `in ${months} months`;
}

/** Day block for a card: { day: '14', month: 'MAR', weekday: 'Sat' }. */
export function dateBadge(d) {
  if (!d) return { day: '--', month: '', weekday: '' };
  const x = new Date(d);
  return {
    day: String(x.getDate()),
    month: MONTHS[x.getMonth()].toUpperCase(),
    weekday: x.toLocaleDateString('en-IN', { weekday: 'short' }),
  };
}

export function isFull(e) {
  return e.seatsLeft === 0;
}

/** 0-100, clamped — a capacity of 0 must not produce Infinity or NaN. */
export function fillPercent(confirmed, capacity) {
  if (!capacity || capacity <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((confirmed / capacity) * 100)));
}

export function initials(name) {
  return (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Star row for ratings. `size` keeps it usable inside a dense list row. */
export function stars(rating, size = 11) {
  return [1, 2, 3, 4, 5].map((n) => ({
    n,
    filled: rating != null && n <= Math.round(rating),
    icon: rating != null && n <= Math.round(rating) ? 'star' : 'star-outline',
    size,
  }));
}