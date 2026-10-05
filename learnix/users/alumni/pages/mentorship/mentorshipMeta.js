/**
 * Shared vocabulary for the Alumni mentorship feature.
 *
 * Lives in one place because the status vocabulary is decided by the SERVER and
 * every screen has to agree with it. The previous single-file screen rendered no
 * status labels at all and inferred status from which array a pair arrived in —
 * which is why `DECLINED` and `COMPLETED` pairs were invisible, and why a user
 * elsewhere was shown a raw "(PENDING)" in an alert.
 */

export const PAIR_STATUS = {
  PENDING: { label: 'Awaiting approval', short: 'Pending', color: '#d97706', icon: 'hourglass-outline' },
  ACTIVE: { label: 'Active', short: 'Active', color: '#059669', icon: 'checkmark-circle-outline' },
  DECLINED: { label: 'Declined', short: 'Declined', color: '#dc2626', icon: 'close-circle-outline' },
  COMPLETED: { label: 'Completed', short: 'Completed', color: '#7c3aed', icon: 'flag-outline' },
};

export function pairStatusMeta(status) {
  return PAIR_STATUS[status] ?? { label: status ?? 'Unknown', short: '—', color: '#64748b', icon: 'help-circle-outline' };
}

export const REQUEST_STATUS = {
  PENDING: { label: 'Awaiting a mentor', short: 'Open', color: '#d97706', icon: 'hourglass-outline' },
  ACCEPTED: { label: 'Accepted', short: 'Accepted', color: '#059669', icon: 'checkmark-circle-outline' },
  DECLINED: { label: 'Declined', short: 'Declined', color: '#dc2626', icon: 'close-circle-outline' },
  WITHDRAWN: { label: 'Withdrawn', short: 'Withdrawn', color: '#94a3b8', icon: 'ban-outline' },
};

export function requestStatusMeta(status) {
  return REQUEST_STATUS[status] ?? { label: status ?? 'Unknown', short: '—', color: '#64748b', icon: 'help-circle-outline' };
}

export const GOAL_STATUS = {
  PENDING: { label: 'Not started', color: '#64748b', icon: 'ellipse-outline' },
  IN_PROGRESS: { label: 'In progress', color: '#2563eb', icon: 'play-circle-outline' },
  ACHIEVED: { label: 'Achieved', color: '#059669', icon: 'checkmark-circle-outline' },
  DROPPED: { label: 'Dropped', color: '#94a3b8', icon: 'close-circle-outline' },
};

export function goalStatusMeta(status) {
  return GOAL_STATUS[status] ?? { label: status ?? '—', color: '#64748b', icon: 'ellipse-outline' };
}

export const SESSION_MODE = {
  IN_PERSON: { label: 'In person', icon: 'location-outline' },
  VIDEO: { label: 'Video call', icon: 'videocam-outline' },
  PHONE: { label: 'Phone', icon: 'call-outline' },
};

export function sessionModeMeta(mode) {
  return SESSION_MODE[mode] ?? { label: mode ?? 'Not specified', icon: 'help-circle-outline' };
}

/** The same three modes, as selectable chips. Derived from SESSION_MODE so the
 *  picker and the formatter cannot disagree about what a mode is called. */
export const SESSION_MODES = Object.entries(SESSION_MODE).map(([id, m]) => ({ id, ...m }));

/** The fields a pair can be formed around. Free text on the server, so this is a
 *  suggestion set for the UI rather than an enum. */
export const MENTORSHIP_FIELDS = [
  'Career Guidance',
  'Higher Studies',
  'Entrepreneurship',
  'Engineering',
  'Product & Design',
  'Finance',
  'Leadership',
];

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

export function relativeDay(d) {
  if (!d) return '';
  const days = Math.round((new Date(d).getTime() - Date.now()) / 86400000);
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

/** Duration from minutes, as "1h 30m" / "45m". */
export function fmtDuration(minutes) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function initials(name) {
  return (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Colour for a person avatar, derived from the name so it is STABLE — the old
 *  screen indexed a palette by list position, so a reorder changed everyone's
 *  colour and nothing meant anything. */
const AVATAR_COLORS = ['#0891b2', '#7c3aed', '#2563eb', '#059669', '#d97706', '#db2777'];
export function avatarColor(seed) {
  const s = String(seed ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function stars(rating, size = 12) {
  return [1, 2, 3, 4, 5].map((n) => ({
    n,
    filled: rating != null && n <= Math.round(rating),
    icon: rating != null && n <= Math.round(rating) ? 'star' : 'star-outline',
    size,
  }));
}

/** How a mentee is identified on screen. A student has no batch and no company. */
export function menteeLabel(mentee) {
  if (!mentee) return 'Unknown';
  if (mentee.kind === 'ALUMNI') {
    return [mentee.batch ? `Batch ${mentee.batch}` : null, mentee.role ?? mentee.headline]
      .filter(Boolean)
      .join(' · ');
  }
  return [mentee.rollNo, mentee.year ? `Sem ${mentee.year}` : null].filter(Boolean).join(' · ');
}
