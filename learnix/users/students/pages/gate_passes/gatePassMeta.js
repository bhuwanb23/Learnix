/**
 * Shared lifecycle labels for the gate-pass screens.
 *
 * Duplicated rather than imported from the hostel module's `gatePassMeta.js` on purpose: the
 * student app and the warden app are separate bundles, and a cross-app import for one lookup
 * table would couple two apps that share no code today.
 *
 * The LABELS are duplicated. The DERIVATION is not — `lifecycle` arrives from the server,
 * computed by `hostel-gate-passes.rules.ts`, which both screens consume. A second
 * implementation of the derivation on the client is how the student's "Approved" and the
 * warden's "overdue since Tuesday" drift apart, so there isn't one.
 */
export const LIFECYCLE_META = {
  awaiting_approval: { label: 'Awaiting decision', short: 'Pending', bg: '#fef3c7', color: '#d97706', icon: 'time-outline' },
  departure_overdue: { label: 'Did not leave on time', short: 'Not left', bg: '#ffedd5', color: '#c2410c', icon: 'alert-circle-outline' },
  return_overdue: { label: 'Overdue back', short: 'Overdue', bg: '#fee2e2', color: '#dc2626', icon: 'warning-outline' },
  out: { label: 'Out', short: 'Out', bg: '#dbeafe', color: '#2563eb', icon: 'walk-outline' },
  approved: { label: 'Approved', short: 'Approved', bg: '#dcfce7', color: '#059669', icon: 'checkmark-circle-outline' },
  returned: { label: 'Returned', short: 'Back', bg: '#f1f5f9', color: '#475569', icon: 'home-outline' },
  rejected: { label: 'Rejected', short: 'Rejected', bg: '#fee2e2', color: '#dc2626', icon: 'close-circle-outline' },
  cancelled: { label: 'Withdrawn', short: 'Withdrawn', bg: '#f1f5f9', color: '#64748b', icon: 'remove-circle-outline' },
};

export const lifecycleMeta = (key) =>
  LIFECYCLE_META[key] ?? { label: key, short: key, bg: '#f1f5f9', color: '#64748b', icon: 'ellipse-outline' };

export const fmtDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
};

/** "2d 4h late" — readable at a glance; raw minutes are not, at three days. */
export function lateBy(minutes) {
  if (!minutes || minutes <= 0) return null;
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  if (d > 0) return `${d}d ${h}h late`;
  if (h > 0) return `${h}h ${m}m late`;
  return `${m}m late`;
}

export const initials = (name) =>
  String(name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();