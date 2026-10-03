// Shared presentation helpers for the digital library screens.
// Keeps type colours and grant-scope styling consistent across hub/detail/form.

export const THEME = '#b45309';

export const TYPE_META = {
  PDF: { color: '#b45309', icon: 'document-text', label: 'PDF' },
  EBOOK: { color: '#2563eb', icon: 'book', label: 'E-book' },
  JOURNAL: { color: '#059669', icon: 'newspaper', label: 'Journal' },
};

export const DEFAULT_TYPE_META = { color: '#64748b', icon: 'document-outline', label: 'Resource' };

export const typeMeta = (type) => TYPE_META[type] ?? DEFAULT_TYPE_META;

export const SCOPE_META = {
  PROGRAM: { color: '#2563eb', bg: '#eff6ff', icon: 'school-outline', label: 'Program' },
  BATCH: { color: '#7c3aed', bg: '#f5f3ff', icon: 'people-outline', label: 'Batch' },
  UNKNOWN: { color: '#dc2626', bg: '#fef2f2', icon: 'warning-outline', label: 'Orphaned' },
};

export const scopeMeta = (scope) => SCOPE_META[scope] ?? SCOPE_META.UNKNOWN;

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const formatRelative = (d) => {
  if (!d) return 'never';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d);
};