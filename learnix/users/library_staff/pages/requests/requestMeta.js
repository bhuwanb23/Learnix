// Shared presentation helpers for the library requests + procurement screens.

export const THEME = '#b45309';

export const REQUEST_STATUS_META = {
  PENDING: { color: '#d97706', bg: '#fffbeb', icon: 'hourglass-outline', label: 'Pending' },
  APPROVED: { color: '#059669', bg: '#f0fdf4', icon: 'checkmark-done-outline', label: 'Approved' },
  REJECTED: { color: '#dc2626', bg: '#fef2f2', icon: 'close-circle-outline', label: 'Declined' },
  PROCURED: { color: '#2563eb', bg: '#eff6ff', icon: 'library-outline', label: 'On shelf' },
};

export const PROCUREMENT_STATUS_META = {
  REQUESTED: { color: '#d97706', bg: '#fffbeb', icon: 'cart-outline', label: 'To order' },
  ORDERED: { color: '#2563eb', bg: '#eff6ff', icon: 'cube-outline', label: 'Ordered' },
  RECEIVED: { color: '#059669', bg: '#f0fdf4', icon: 'checkmark-done-outline', label: 'Received' },
  CANCELLED: { color: '#64748b', bg: '#f1f5f9', icon: 'ban-outline', label: 'Cancelled' },
};

export const DEFAULT_STATUS_META = {
  color: '#64748b', bg: '#f1f5f9', icon: 'ellipse-outline', label: 'Unknown',
};

export const statusMeta = (status) => REQUEST_STATUS_META[status] ?? DEFAULT_STATUS_META;
export const procurementMeta = (status) => PROCUREMENT_STATUS_META[status] ?? DEFAULT_STATUS_META;

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
    : '—';

export const relativeTime = (d) => {
  if (!d) return '—';
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

export const waitingLabel = (days) => {
  if (!days) return null;
  if (days === 0) return 'today';
  if (days === 1) return '1 day waiting';
  return `${days} days waiting`;
};

/** Human sentence for "N students asked, we own M copies". */
export const demandLabel = (sameTitleRequests, inCatalog) => {
  const who = sameTitleRequests === 1 ? '1 request' : `${sameTitleRequests} students`;
  if (inCatalog) return `${who} · already stocked`;
  return `${who} · not in catalog`;
};
