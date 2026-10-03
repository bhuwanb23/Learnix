// Shared presentation helpers for the library notifications / broadcasts screens.

export const THEME = '#b45309';

export const ACTIVITY_META = {
  ISSUE: { color: '#2563eb', bg: '#eff6ff', icon: 'arrow-forward-circle', label: 'Issued' },
  RETURN: { color: '#059669', bg: '#f0fdf4', icon: 'arrow-undo-circle', label: 'Returned' },
  RENEWAL: { color: '#7c3aed', bg: '#f5f3ff', icon: 'refresh-circle', label: 'Renewed' },
  FINE: { color: '#dc2626', bg: '#fef2f2', icon: 'cash', label: 'Fine' },
  REQUEST: { color: '#d97706', bg: '#fffbeb', icon: 'cart', label: 'Request' },
  DIGITAL: { color: '#0891b2', bg: '#ecfeff', icon: 'cloud-download', label: 'Digital' },
};

export const DEFAULT_ACTIVITY_META = {
  color: '#64748b', bg: '#f1f5f9', icon: 'ellipse', label: 'Event',
};

export const activityMeta = (kind) => ACTIVITY_META[kind] ?? DEFAULT_ACTIVITY_META;

export const AUDIENCE_META = {
  ALL_STUDENTS: {
    color: '#2563eb', bg: '#eff6ff', icon: 'school-outline',
    label: 'All Students', description: 'Every active student profile',
  },
  BORROWERS: {
    color: '#0891b2', bg: '#ecfeff', icon: 'people-outline',
    label: 'Borrowers', description: 'Students holding at least one book',
  },
  OVERDUE_MEMBERS: {
    color: '#dc2626', bg: '#fef2f2', icon: 'alarm-outline',
    label: 'Overdue Members', description: 'Students with an overdue loan',
  },
};

export const DEFAULT_AUDIENCE_META = {
  color: '#64748b', bg: '#f1f5f9', icon: 'megaphone-outline',
  label: 'Unknown', description: 'Audience not owned by the library module',
};

export const audienceMeta = (id) => AUDIENCE_META[id] ?? DEFAULT_AUDIENCE_META;

export const TITLE_LIMIT = 120;
export const BODY_LIMIT = 2000;

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
    : '—';

export const relativeTime = (d) => {
  if (!d) return 'never';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(d);
};

/** Broadcast templates the librarian can start from. */
export const BROADCAST_TEMPLATES = [
  {
    id: 'HOLIDAY_HOURS',
    title: 'Library closed for maintenance',
    body: 'The library will be closed on [date] for scheduled maintenance. Please return or renew any borrowed books before then to avoid overdue fines.',
  },
  {
    id: 'EXAM_HOURS',
    title: 'Extended hours during exams',
    body: 'The library will remain open until 11:00 PM through the end of the exam period. Extended hours apply to all floors.',
  },
  {
    id: 'NEW_ARRIVALS',
    title: 'New arrivals in the catalog',
    body: 'Fresh titles have just been added to the catalog. Browse the Catalog tab to see what is currently available.',
  },
  {
    id: 'FINE_REMINDER',
    title: 'Reminder: outstanding library fines',
    body: 'You have outstanding library fines. Please settle them at the circulation desk or through the student app to restore your borrowing privileges.',
  },
];