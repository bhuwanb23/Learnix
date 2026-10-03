// L-08 Library settings service — the desk's circulation policy and timings.
// Docs: 07-library-staff.md §3.8 · §4 L-08
//
// This module owns the only copy of the library's borrowing policy. Circulation
// and fines READ it (see `loadPolicy` in circulation.service.ts) instead of
// hardcoded constants, so the Circulation Rules screen is load-bearing: editing
// the fine rate here really does change what a return raises.
//
// Money stays integer paise end to end (ADR-04); rupees appear only at the edge.
import { prisma } from '../../db/prisma.js';
import { unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

export type LibraryPolicy = {
  loanPeriodDays: number;
  maxActiveLoans: number;
  maxRenewalsPerLoan: number;
  finePerDayPaise: number;
  maxOutstandingFinePaise: number;
  dueRemindersEnabled: boolean;
  autoFineEnabled: boolean;
  announceNewArrivals: boolean;
  openTime: string;
  closeTime: string;
  closedDays: string[];
};

/** The policy a fresh institution runs on — mirrors the old hardcoded constants. */
export const DEFAULT_POLICY: LibraryPolicy = {
  loanPeriodDays: 14,
  maxActiveLoans: 4,
  maxRenewalsPerLoan: 2,
  finePerDayPaise: 500,
  maxOutstandingFinePaise: 20000,
  dueRemindersEnabled: true,
  autoFineEnabled: true,
  announceNewArrivals: false,
  openTime: '08:00',
  closeTime: '19:00',
  closedDays: ['SUNDAY'],
};

const DAY_NAMES = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY',
  'FRIDAY', 'SATURDAY', 'SUNDAY',
];

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const isValidTime = (t: string) => HHMM.test(t);

const parseClosedDays = (raw: string): string[] =>
  raw
    .split(',')
    .map((d) => d.trim().toUpperCase())
    .filter(Boolean);

const toRupees = (paise: number) => Math.round(paise / 100);

const shape = (row: {
  loanPeriodDays: number;
  maxActiveLoans: number;
  maxRenewalsPerLoan: number;
  finePerDayPaise: number;
  maxOutstandingFinePaise: number;
  dueRemindersEnabled: boolean;
  autoFineEnabled: boolean;
  announceNewArrivals: boolean;
  openTime: string;
  closeTime: string;
  closedDays: string;
  updatedAt: Date;
  updatedByUserId: string | null;
}): LibraryPolicy & { updatedAt: Date; updatedByUserId: string | null } => ({
  loanPeriodDays: row.loanPeriodDays,
  maxActiveLoans: row.maxActiveLoans,
  maxRenewalsPerLoan: row.maxRenewalsPerLoan,
  finePerDayPaise: row.finePerDayPaise,
  maxOutstandingFinePaise: row.maxOutstandingFinePaise,
  dueRemindersEnabled: row.dueRemindersEnabled,
  autoFineEnabled: row.autoFineEnabled,
  announceNewArrivals: row.announceNewArrivals,
  openTime: row.openTime,
  closeTime: row.closeTime,
  closedDays: parseClosedDays(row.closedDays),
  updatedAt: row.updatedAt,
  updatedByUserId: row.updatedByUserId,
});

// ── Cache ────────────────────────────────────────────────────
// Policy is read on every issue/renew/return, but edited almost never. A short
// TTL keeps the hot path at one query per request without a cache-invalidation
// protocol across processes. updateSettings() also resets it in-process.
let cache: { institutionId: string; value: ReturnType<typeof shape> } | null = null;
let cachedAt = 0;
const TTL_MS = 30_000;

export function invalidateSettingsCache() {
  cache = null;
  cachedAt = 0;
}

/**
 * Read the policy, creating the row with defaults on first access.
 * Never throws for a missing row — a new institution must still be able to
 * issue and return books before anyone visits Settings.
 */
export async function loadPolicy(institutionId: string) {
  const now = Date.now();
  if (cache && cache.institutionId === institutionId && now - cachedAt < TTL_MS) {
    return cache.value;
  }

  const existing = await prisma.librarySettings.findUnique({ where: { institutionId } });
  const row =
    existing ??
    (await prisma.librarySettings.create({ data: { institutionId } }));

  const value = shape(row);
  cache = { institutionId, value };
  cachedAt = now;
  return value;
}

/** Public read for the Settings screen — rupees for display, paise kept intact. */
export async function getSettings(institutionId: string) {
  const policy = await loadPolicy(institutionId);

  // Who last edited it? updatedByUserId is a bare scalar (no relation).
  const editor = policy.updatedByUserId
    ? await prisma.user.findUnique({
      where: { id: policy.updatedByUserId },
      select: { fullName: true },
    })
    : null;

  const openMinutes = toMinutes(policy.openTime);
  const closeMinutes = toMinutes(policy.closeTime);

  return {
    ...policy,
    finePerDayRupees: toRupees(policy.finePerDayPaise),
    maxOutstandingFineRupees: toRupees(policy.maxOutstandingFinePaise),
    updatedByName: editor?.fullName ?? null,
    display: {
      finePerDay: `₹${toRupees(policy.finePerDayPaise)}/day`,
      maxOutstandingFine: `₹${toRupees(policy.maxOutstandingFinePaise)}`,
      timings: `${policy.openTime} – ${policy.closeTime}`,
      closedDaysLabel: policy.closedDays.length
        ? policy.closedDays.map((d) => titleCase(d)).join(', ')
        : 'None',
    },
    // Surfaced so the screen can warn before a change breaks live circulation.
    sanity: {
      openBeforeClose: openMinutes !== null && closeMinutes !== null && openMinutes < closeMinutes,
      openMinutes,
      closeMinutes,
    },
  };
}

const toMinutes = (hhmm: string): number | null => {
  const m = HHMM.exec(hhmm);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};

const titleCase = (s: string) =>
  s.charAt(0) + s.slice(1).toLowerCase();

export type SettingsPatch = Partial<
  Pick<
    LibraryPolicy,
    | 'loanPeriodDays' | 'maxActiveLoans' | 'maxRenewalsPerLoan'
    | 'finePerDayPaise' | 'maxOutstandingFinePaise'
    | 'dueRemindersEnabled' | 'autoFineEnabled' | 'announceNewArrivals'
    | 'openTime' | 'closeTime' | 'closedDays'
  >
>;

export async function updateSettings(
  institutionId: string,
  actorUserId: string,
  patch: SettingsPatch,
) {
  const before = await loadPolicy(institutionId);

  const data: Record<string, unknown> = { updatedByUserId: actorUserId };

  if (patch.loanPeriodDays !== undefined) data.loanPeriodDays = patch.loanPeriodDays;
  if (patch.maxActiveLoans !== undefined) data.maxActiveLoans = patch.maxActiveLoans;
  if (patch.maxRenewalsPerLoan !== undefined) data.maxRenewalsPerLoan = patch.maxRenewalsPerLoan;
  if (patch.finePerDayPaise !== undefined) data.finePerDayPaise = patch.finePerDayPaise;
  if (patch.maxOutstandingFinePaise !== undefined) {
    data.maxOutstandingFinePaise = patch.maxOutstandingFinePaise;
  }
  if (patch.dueRemindersEnabled !== undefined) data.dueRemindersEnabled = patch.dueRemindersEnabled;
  if (patch.autoFineEnabled !== undefined) data.autoFineEnabled = patch.autoFineEnabled;
  if (patch.announceNewArrivals !== undefined) data.announceNewArrivals = patch.announceNewArrivals;

  if (patch.openTime !== undefined) {
    if (!isValidTime(patch.openTime)) throw unprocessable('Opening time must be HH:MM in 24-hour form');
    data.openTime = patch.openTime;
  }
  if (patch.closeTime !== undefined) {
    if (!isValidTime(patch.closeTime)) throw unprocessable('Closing time must be HH:MM in 24-hour form');
    data.closeTime = patch.closeTime;
  }
  if (patch.closedDays !== undefined) {
    const days = patch.closedDays.map((d) => String(d).trim().toUpperCase());
    const unknown = days.filter((d) => !DAY_NAMES.includes(d));
    if (unknown.length) {
      throw unprocessable(`Unknown day(s): ${unknown.join(', ')}`);
    }
    data.closedDays = days.join(',');
  }

  const nextOpen = (patch.openTime ?? before.openTime);
  const nextClose = (patch.closeTime ?? before.closeTime);
  const openM = toMinutes(nextOpen);
  const closeM = toMinutes(nextClose);
  if (openM !== null && closeM !== null && openM >= closeM) {
    throw unprocessable('Opening time must be earlier than closing time');
  }

  // Cross-field sanity: a renewal cap of 0 means no renewals at all, which is a
  // legitimate policy — but a renewal cap above 50 is almost certainly a typo,
  // and would let a loan run for years.
  const nextRenewals = patch.maxRenewalsPerLoan ?? before.maxRenewalsPerLoan;
  if (nextRenewals > 50) {
    throw unprocessable('Renewal cap above 50 is not a realistic loan policy');
  }

  await prisma.librarySettings.update({ where: { institutionId }, data });
  invalidateSettingsCache();

  const after = await loadPolicy(institutionId);

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'library.settings.update',
    entityType: 'LibrarySettings',
    entityId: institutionId,
    before: { ...before, updatedAt: undefined },
    after: { ...after, updatedAt: undefined },
  });

  return getSettings(institutionId);
}
