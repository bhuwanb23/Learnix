/**
 * Shared vocabulary for the Alumni donations feature.
 *
 * Lives in one place because the status words are decided by the SERVER and every
 * screen has to agree with them. The previous single-file screen rendered raw
 * enum values — a donor reading "PLEDGED" learns nothing about whether their
 * money arrived.
 */

export const DONATION_STATUS = {
  PLEDGED: {
    label: 'Awaiting confirmation',
    short: 'Pledged',
    color: '#d97706',
    icon: 'hourglass-outline',
    hint: 'You have committed this. The office confirms once the money reaches the college.',
  },
  RECEIVED: {
    label: 'Received',
    short: 'Received',
    color: '#059669',
    icon: 'checkmark-circle-outline',
    hint: 'Recorded, with a receipt.',
  },
};

export function donationStatusMeta(status) {
  return (
    DONATION_STATUS[status] ?? {
      label: status ?? 'Unknown',
      short: '—',
      color: '#64748b',
      icon: 'help-circle-outline',
      hint: '',
    }
  );
}

export const CAMPAIGN_STATUS = {
  OPEN: { label: 'Open', color: '#059669', icon: 'radio-button-on-outline' },
  CLOSED: { label: 'Closed', color: '#64748b', icon: 'radio-button-off-outline' },
  MET: { label: 'Target met', color: '#7c3aed', icon: 'trophy-outline' },
};

export function campaignStatusMeta(campaign) {
  if (!campaign) return CAMPAIGN_STATUS.CLOSED;
  // Derived, in priority order: a campaign that raised its target has met it even
  // while still open, and a past-deadline campaign is closed even while its stored
  // status says ACTIVE.
  if (campaign.met) return CAMPAIGN_STATUS.MET;
  return campaign.isOpen ? CAMPAIGN_STATUS.OPEN : CAMPAIGN_STATUS.CLOSED;
}

export const MANDATE_STATUS = {
  ACTIVE: { label: 'Active', color: '#059669', icon: 'play-circle-outline' },
  PAUSED: { label: 'Paused', color: '#d97706', icon: 'pause-circle-outline' },
  CANCELLED: { label: 'Cancelled', color: '#64748b', icon: 'close-circle-outline' },
  COMPLETED: { label: 'Completed', color: '#7c3aed', icon: 'flag-outline' },
};

export function mandateStatusMeta(status) {
  return (
    MANDATE_STATUS[status] ?? {
      label: status ?? 'Unknown',
      color: '#64748b',
      icon: 'help-circle-outline',
    }
  );
}

export const CADENCES = [
  { id: 'MONTHLY', label: 'Monthly', hint: 'every month' },
  { id: 'QUARTERLY', label: 'Quarterly', hint: 'every 3 months' },
  { id: 'SEMI_ANNUAL', label: 'Half-yearly', hint: 'twice a year' },
  { id: 'ANNUAL', label: 'Annual', hint: 'once a year' },
];

export const FUNDS = [
  { id: 'GENERAL', label: 'General fund', icon: 'wallet-outline', color: '#2563eb' },
  { id: 'LIBRARY', label: 'Library', icon: 'library-outline', color: '#7c3aed' },
  { id: 'SCHOLARSHIP', label: 'Scholarships', icon: 'school-outline', color: '#059669' },
  { id: 'INFRASTRUCTURE', label: 'Infrastructure', icon: 'build-outline', color: '#d97706' },
];

/** Cycle length in months, keyed by cadence — used to annualise a standing gift. */
export const CADENCE_MONTHS = { MONTHLY: 1, QUARTERLY: 3, SEMI_ANNUAL: 6, ANNUAL: 12 };

export const CAMPAIGN_CATEGORIES = [
  { id: 'SCHOLARSHIP', label: 'Scholarships', icon: 'school-outline', color: '#059669' },
  { id: 'INFRASTRUCTURE', label: 'Infrastructure', icon: 'build-outline', color: '#d97706' },
  { id: 'LIBRARY', label: 'Library', icon: 'library-outline', color: '#7c3aed' },
  { id: 'RESEARCH', label: 'Research', icon: 'flask-outline', color: '#0891b2' },
  { id: 'SPORTS', label: 'Sports', icon: 'trophy-outline', color: '#dc2626' },
  { id: 'GENERAL', label: 'General', icon: 'heart-outline', color: '#2563eb' },
];

export const METHODS = [
  { id: 'UPI', label: 'UPI', icon: 'phone-portrait-outline' },
  { id: 'NET_BANKING', label: 'Net banking', icon: 'business-outline' },
  { id: 'CARD', label: 'Card', icon: 'card-outline' },
  { id: 'CASH', label: 'Cash / cheque', icon: 'cash-outline' },
];

export function lookup(list, id, fallbackLabel = 'Unspecified') {
  return list.find((x) => x.id === id) ?? { id, label: fallbackLabel, icon: 'help-circle-outline', color: '#64748b' };
}

/** Compact Indian display: ₹1.20 Cr / ₹4.50 L / ₹12.5K / ₹900. */
export function inr(rupees, opts = {}) {
  const n = Math.abs(rupees ?? 0);
  const sign = rupees < 0 ? '-' : '';
  if (!opts.plain) {
    if (n >= 10_000_000) return `${sign}₹${(n / 10_000_000).toFixed(2)} Cr`;
    if (n >= 100_000) return `${sign}₹${(n / 100_000).toFixed(2)} L`;
    if (n >= 10_000) return `${sign}₹${(n / 1_000).toFixed(1)}K`;
  }
  return `${sign}₹${n.toLocaleString('en-IN')}`;
}

/** Full precision with grouping — for a receipt, where the exact figure matters. */
export function inrExact(rupees) {
  return `₹${(rupees ?? 0).toLocaleString('en-IN')}`;
}

/**
 * Parses what a person actually types into a rupee amount.
 * Returns null rather than 0 for nonsense, so the form can refuse instead of
 * silently pledging ₹1.
 */
export function parseAmount(text) {
  if (typeof text === 'number') return Number.isInteger(text) && text > 0 ? text : null;
  const cleaned = String(text ?? '').replace(/[^0-9]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isInteger(n) && n > 0 ? n : null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtDate(d) {
  if (!d) return '—';
  const x = new Date(d);
  return `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
}

export function fmtDateTime(d) {
  if (!d) return '—';
  const x = new Date(d);
  let h = x.getHours();
  const m = String(x.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${fmtDate(d)} · ${h}:${m} ${ap}`;
}

export function relativeDay(d) {
  if (!d) return '';
  const days = Math.round((new Date(d).getTime() - Date.now()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 1 && days < 30) return `in ${days} days`;
  if (days < -1 && days > -30) return `${Math.abs(days)} days ago`;
  const months = Math.round(Math.abs(days) / 30);
  if (days < 0) return `${months} month${months === 1 ? '' : 's'} ago`;
  return months <= 1 ? 'this month' : `in ${months} months`;
}

/** Deadline wording that distinguishes "closing" from "closed". */
export function deadlineLabel(campaign) {
  if (!campaign?.deadline) return 'No deadline';
  const days = campaign.daysLeft;
  if (days === null || days === undefined) return fmtDate(campaign.deadline);
  if (days < 0) return `Closed ${fmtDate(campaign.deadline)}`;
  if (days === 0) return 'Closes today';
  if (days === 1) return 'Closes tomorrow';
  return `${days} days left`;
}

/** Progress bar width, clamped for the BAR only — never for the number shown. */
export function barPercent(percent) {
  return Math.max(0, Math.min(100, percent ?? 0));
}

/** Initials for a donor avatar, stable for anonymous gifts. */
export function donorInitials(name) {
  if (!name || name === 'Anonymous') return 'A';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Avatar colour derived from the name so it is stable across reorders. */
const AVATAR_COLORS = ['#2563eb', '#059669', '#d97706', '#0891b2', '#dc2626', '#7c3aed'];
export function donorColor(seed) {
  const s = String(seed ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/** The shareable text for a campaign. Real `Share` is used on it — the old
 *  screen fired an alert that said "link copied" and copied nothing. */
export function campaignShareText(campaign) {
  const line = `${campaign.name} — ${inr(campaign.raisedRupees)} of ${inr(campaign.targetRupees)} raised (${campaign.percent}%)`;
  return campaign.beneficiary
    ? `${line}\n${campaign.beneficiary}`
    : `${line}\nSupport this cause through the Learnix alumni portal.`;
}

/** The shareable text for a receipt. */
export function receiptShareText(receipt) {
  return [
    `Receipt ${receipt.receiptNo}`,
    `${receipt.donation.fundLabel} — ${inrExact(receipt.donation.amountRupees)}`,
    receipt.donation.campaign ? `Towards: ${receipt.donation.campaign}` : null,
    `Payment ${receipt.payment.referenceNo} via ${receipt.payment.methodLabel}`,
    `Issued ${fmtDate(receipt.issuedAt)}`,
  ]
    .filter(Boolean)
    .join('\n');
}
