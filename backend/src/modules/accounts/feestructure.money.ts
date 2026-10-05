// Fee structure rules — the arithmetic of pricing a course.
// Docs: 06-accounts-finance.md §3.5
//
// Deliberately prisma-free and pure, for the same reason `dues.money.ts` is:
// this file decides what a student is told they owe, and the dues desk, the
// concession calculator, the structure editor and the version history must
// never disagree about it. `verify-fee-structure.ts` calls these functions
// directly with no database at all, so a rounding bug is caught by arithmetic
// rather than by a family disputing a bill.
//
// Money is integer paise everywhere in here (ADR-04). Rupees appear only where
// a label is produced for a human.
import type { FeeComponent, FeeConcession, FeeStructureVersion } from '@prisma/client';

export const toRupees = (paise: number) => Math.round(paise / 100);

/** Paise from rupees typed on a numeric pad. The single conversion point. */
export const toMinor = (rupees: number) => Math.round(rupees * 100);

/**
 * A LOCAL calendar day as `YYYY-MM-DD`.
 *
 * Every effective date, instalment due date and version boundary in this module
 * is a DAY, not an instant. Serialising one with `toISOString()` is off by one
 * in any timezone east of UTC: `new Date('2026-07-01')` at local midnight in IST
 * is 30 June 18:30 UTC, so a fee in force "from 1 July" is reported to the UI as
 * starting 30 June — and a version ending 30 November looks like it ended 29
 * November. The dues desk would then show a family a bill whose effective
 * window never contained the day it was raised.
 *
 * Local-date construction goes through this one function so that is the only
 * place the conversion can get wrong.
 */
export function isoDay(d: Date | null | undefined): string | null {
  if (!d) return null;
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return null;
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── Component kinds ─────────────────────────────────────────
/**
 * Every charge a fee structure can carry, with the hint that makes the pick
 * meaningful.
 *
 * The kind is NOT a label: it is what the arithmetic keys off (only TUITION
 * counts toward `FeeStructure.tuitionMinor`, a concession scoped to HOSTEL may
 * not touch tuition) and what a scholarship rule is written against. The
 * `defaultOptional` flag is the honest part — hostel and transport are charges
 * a student can decline, and a "total fee" that silently includes a bed
 * nobody is taking is a number the desk cannot defend.
 */
export const COMPONENT_KINDS = [
  { id: 'TUITION', label: 'Tuition', color: '#2563eb', icon: 'school-outline', hint: 'Core teaching fee for the semester', defaultOptional: false },
  { id: 'EXAMINATION', label: 'Examination', color: '#7c3aed', icon: 'ribbon-outline', hint: 'Exam registration, papers, marksheets', defaultOptional: false },
  { id: 'HOSTEL', label: 'Hostel', color: '#059669', icon: 'bed-outline', hint: 'Residence — only students in hostel pay', defaultOptional: true },
  { id: 'LIBRARY', label: 'Library', color: '#0891b2', icon: 'book-outline', hint: 'Library subscription and reading room', defaultOptional: false },
  { id: 'ADMISSION', label: 'Admission', color: '#d97706', icon: 'enter-outline', hint: 'One-off, new admissions only', defaultOptional: false },
  { id: 'TRANSPORT', label: 'Transport', color: '#b45309', icon: 'bus-outline', hint: 'Bus route charge — only opt-in students', defaultOptional: true },
  { id: 'OTHER', label: 'Other charges', color: '#64748b', icon: 'ellipsis-horizontal-outline', hint: 'Lab, welfare, sports — always say what', defaultOptional: false },
] as const;

export type ComponentKind = (typeof COMPONENT_KINDS)[number]['id'];
export const KIND_IDS = COMPONENT_KINDS.map((k) => k.id) as unknown as string[];

export const kindMeta = (id: string | null | undefined) =>
  COMPONENT_KINDS.find((k) => k.id === id) ?? {
    id: id ?? 'UNKNOWN',
    label: id || 'Uncategorised',
    color: '#94a3b8',
    icon: 'help-outline',
    hint: '',
    defaultOptional: false,
  };

/** Only TUITION rolls up into `FeeStructure.tuitionMinor`. */
export const isTuitionKind = (kind: string) => kind === 'TUITION';

/**
 * Semester 0 means "every semester of the year". The label has to say so,
 * because a row showing "Sem 0" on a fee document looks like a data error even
 * though it is the normal case.
 */
export function semesterLabel(semester: number): string {
  if (!semester || semester <= 0) return 'All semesters';
  return `Semester ${semester}`;
}

export function semesterShort(semester: number): string {
  if (!semester || semester <= 0) return 'All';
  return `S${semester}`;
}

// ── Concession kinds & bases ────────────────────────────────
export const CONCESSION_KINDS = [
  { id: 'MERIT', label: 'Merit', icon: 'trophy-outline', hint: 'Top of the batch on merit' },
  { id: 'NEED_BASED', label: 'Need-based', icon: 'heart-outline', hint: 'Family circumstances, means-tested' },
  { id: 'SIBLING', label: 'Sibling discount', icon: 'people-outline', hint: 'Second and subsequent child' },
  { id: 'STAFF_WARD', label: 'Staff ward', icon: 'briefcase-outline', hint: 'Children of employees' },
  { id: 'SCHOLARSHIP', label: 'Scholarship', icon: 'ribbon-outline', hint: 'Funded scholarship scheme' },
  { id: 'OTHER', label: 'Other', icon: 'pricetag-outline', hint: 'Anything else — say what in the note' },
] as const;

export const concessionKindMeta = (id: string | null | undefined) =>
  CONCESSION_KINDS.find((k) => k.id === id) ?? {
    id: id ?? 'OTHER', label: id || 'Other', icon: 'pricetag-outline', hint: '',
  };

export const CONCESSION_BASES = [
  { id: 'PERCENT', label: 'Percentage off', hint: 'Off the eligible charges, in basis points' },
  { id: 'FLAT', label: 'Flat amount off', hint: 'A fixed rupee amount off the eligible charges' },
] as const;

/** Scopes a concession may be written against. Mirrors the component kinds. */
export const CONCESSION_SCOPES = [
  { id: 'ALL', label: 'Everything' },
  ...COMPONENT_KINDS.map((k) => ({ id: k.id, label: k.label })),
];

// ── Instalment frequencies ──────────────────────────────────
export const INSTALLMENT_FREQUENCIES = [
  { id: 'ONE_TIME', label: 'One payment', days: 0, hint: 'The whole fee in a single bill' },
  { id: 'MONTHLY', label: 'Monthly', days: 30, hint: 'One bill a month' },
  { id: 'QUARTERLY', label: 'Quarterly', days: 91, hint: 'Four bills a year' },
  { id: 'TRIMESTER', label: 'Trimester', days: 60, hint: 'Three bills a year' },
  { id: 'SEMESTERLY', label: 'Per semester', days: 182, hint: 'One bill a semester' },
] as const;

export const frequencyDays = (id: string) =>
  INSTALLMENT_FREQUENCIES.find((f) => f.id === id)?.days ?? 0;

export const frequencyMeta = (id: string | null | undefined) =>
  INSTALLMENT_FREQUENCIES.find((f) => f.id === id) ?? INSTALLMENT_FREQUENCIES[0];

// ── Component maths ─────────────────────────────────────────

export type ComponentInput = Pick<
  FeeComponent,
  'kind' | 'label' | 'amountMinor' | 'semester' | 'optional' | 'firstYearOnly'
>;

export type ComponentTotals = {
  tuitionMinor: number;
  otherMinor: number;
  totalMinor: number;
  byKind: Record<string, number>;
  componentCount: number;
  optionalMinor: number;
  mandatoryMinor: number;
};

/**
 * Roll a component list up into the totals the rest of the system reads.
 *
 * `optionalMinor` is reported separately rather than folded into the total: the
 * headline total on the desk is the MANDATORY bill, and hostel/transport appear
 * as "if you take these, add ₹X". Adding them silently is how a college ends up
 * demanding hostel fees from a student who lives at home.
 */
export function totalsOf(components: ComponentInput[]): ComponentTotals {
  const byKind: Record<string, number> = {};
  let tuitionMinor = 0;
  let otherMinor = 0;
  let optionalMinor = 0;

  for (const c of components) {
    const amount = Math.max(0, c.amountMinor);
    byKind[c.kind] = (byKind[c.kind] ?? 0) + amount;
    if (isTuitionKind(c.kind)) tuitionMinor += amount;
    else otherMinor += amount;
    if (c.optional) optionalMinor += amount;
  }

  const mandatoryMinor = tuitionMinor + otherMinor - optionalMinor;
  return {
    tuitionMinor,
    otherMinor,
    totalMinor: tuitionMinor + otherMinor,
    byKind,
    componentCount: components.length,
    optionalMinor,
    mandatoryMinor,
  };
}

/**
 * Total for ONE semester, including the annual charges prorated across it.
 *
 * This is the number a per-semester bill is raised against, and it must include
 * the year-wide charges (library, exam board) or semester 1 quietly costs less
 * than semester 2 for reasons no family can see.
 *
 * The proration works in WHOLE RUPEES, not paise. That is deliberate and it is
 * the only way the grid the UI prints foots:
 *
 *   floor-ing to paise and carrying the remainder onto the last semester DOES add
 *   up internally — but every cell is then rendered through `toRupees`, which
 *   rounds. Eight cells each rounding up by half a rupee come to ₹4 more than
 *   the annual total shown directly above them, and a fee grid whose rows do not
 *   add up to their own total is exactly the bug this module exists to prevent.
 *
 * So each semester's share is floored to a whole rupee and the leftover rupees
 * ride on the LAST semester. Every cell is then an exact number of rupees and
 * the grid foots to the rupee.
 */
export function semesterTotal(
  components: ComponentInput[],
  semester: number,
  totalSemesters: number,
): number {
  const count = Math.max(1, totalSemesters);
  let direct = 0;
  const annual: number[] = [];

  for (const c of components) {
    if (c.semester === semester) direct += floorToRupee(c.amountMinor);
    else if (!c.semester || c.semester <= 0) annual.push(Math.max(0, c.amountMinor));
  }

  let sum = direct;
  for (const amount of annual) {
    // Whole-rupee share, floored.
    const per = floorToRupee(Math.floor(amount / count));
    sum += per;
    // The leftover rupees ride on the last semester, so the year foots exactly.
    if (semester === count) sum += amount - per * count;
  }

  return sum;
}

/** Paise → paise, rounded DOWN to a whole rupee. */
const floorToRupee = (paise: number) => Math.floor(Math.max(0, paise) / 100) * 100;

/** Every semester's bill for a program, 1..totalSemesters. */
export function semesterSchedule(
  components: ComponentInput[],
  totalSemesters: number,
): Array<{ semester: number; label: string; amountMinor: number }> {
  const count = Math.max(1, Math.min(12, totalSemesters));
  return Array.from({ length: count }, (_, i) => {
    const semester = i + 1;
    return {
      semester,
      label: semesterLabel(semester),
      amountMinor: semesterTotal(components, semester, count),
    };
  });
}

/** Per-semester split of a single kind — what a semester-wise tuition table needs. */
export function kindBySemester(
  components: ComponentInput[],
  kind: string,
  totalSemesters: number,
): Array<{ semester: number; label: string; amountMinor: number }> {
  const mine = components.filter((c) => c.kind === kind);
  return semesterSchedule(mine, totalSemesters);
}

// ── Instalment schedule ─────────────────────────────────────

/**
 * The default instalment plan for a fee structure, as N real amounts.
 *
 * `splitAmount`-style: every rupee is placed, the remainder pennies ride on the
 * EARLIEST instalments, so the parts sum to the whole exactly. A schedule that
 * sums to ₹1 less than the bill is a collections bug that surfaces as a
 * "customer paid the full amount but still owes ₹1" ticket months later.
 *
 * ONE_TIME is a single bill, not a plan — that is the honest answer for a
 * structure whose default is "pay it in one go".
 */
export function defaultInstallments(
  totalMinor: number,
  count: number,
  frequency: string,
): Array<{ sequence: number; amountMinor: number }> {
  const total = Math.max(0, Math.round(totalMinor));
  // A frequency of ONE_TIME with count > 1 is a contradiction, and the dues
  // desk rejects it — so the schedule builder does too, rather than handing back
  // N bills with every one of them 30 days apart.
  const n = frequency === 'ONE_TIME' ? 1 : Math.max(1, Math.min(12, Math.floor(count || 1)));
  if (n === 1) return [{ sequence: 1, amountMinor: total }];

  const base = Math.floor(total / n);
  const remainder = total - base * n;
  return Array.from({ length: n }, (_, i) => ({
    sequence: i + 1,
    amountMinor: base + (i < remainder ? 1 : 0),
  }));
}

/** Due dates for a default plan, measured from the academic year's start. */
export function installmentDates(
  startDate: Date,
  count: number,
  frequency: string,
  firstDueDays: number,
): Array<{ sequence: number; dueDate: Date }> {
  const step = frequencyDays(frequency);
  const n = Math.max(1, Math.min(12, Math.floor(count || 1)));
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const first = new Date(start);
  first.setDate(first.getDate() + Math.max(0, firstDueDays));

  if (n === 1 || step === 0) return [{ sequence: 1, dueDate: first }];
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(first);
    d.setDate(d.getDate() + step * i);
    return { sequence: i + 1, dueDate: d };
  });
}

/**
 * Plain-English schedule line. An accounts officer needs to check "3 bills of
 * ₹40,000 from 15 July" at a glance; a frequency id says nothing.
 */
export function installmentSummary(
  totalMinor: number,
  count: number,
  frequency: string,
): string {
  const n = Math.max(1, Math.min(12, Math.floor(count || 1)));
  if (n === 1 || frequency === 'ONE_TIME') {
    return `One payment of ₹${toRupees(totalMinor).toLocaleString('en-IN')}`;
  }
  const per = Math.floor(totalMinor / n);
  return `${n} × ₹${toRupees(per).toLocaleString('en-IN')} ${frequencyMeta(frequency).label.toLowerCase()}`;
}

// ── Concessions ─────────────────────────────────────────────

export type ConcessionInput = Pick<
  FeeConcession,
  'name' | 'basis' | 'valueBp' | 'amountMinor' | 'appliesTo' | 'semester' | 'enabled'
>;

/** Which component rows a concession is allowed to reduce. */
export function eligibleFor(
  components: ComponentInput[],
  concession: Pick<ConcessionInput, 'appliesTo' | 'semester' | 'enabled'>,
): ComponentInput[] {
  if (!concession.enabled) return [];
  return components.filter((c) => {
    if (concession.appliesTo !== 'ALL' && c.kind !== concession.appliesTo) return false;
    if (concession.semester > 0 && c.semester !== concession.semester) return false;
    return true;
  });
}

/**
 * How much ONE concession removes, in paise.
 *
 * Capped at the eligible base, always. A 100% concession on a component that
 * costs ₹4,000 gives back ₹4,000 — never less (which would be a surcharge) and
 * never more (which would be a refund the desk has no mechanism for). A FLAT
 * concession larger than the eligible charges is a data-entry error the UI must
 * not be able to commit.
 */
export function concessionAmount(
  components: ComponentInput[],
  concession: ConcessionInput,
): number {
  const base = eligibleFor(components, concession).reduce((s, c) => s + Math.max(0, c.amountMinor), 0);
  if (base <= 0) return 0;
  if (concession.basis === 'FLAT') return Math.min(Math.max(0, concession.amountMinor), base);
  const bp = Math.min(10000, Math.max(0, concession.valueBp));
  return Math.min(Math.round((base * bp) / 10000), base);
}

export type ConcessionLine = {
  id?: string;
  name: string;
  kind: string;
  basis: string;
  valueBp: number;
  amountMinor: number;
  appliesTo: string;
  semester: number;
  enabled: boolean;
  /** Base this concession was applied to. */
  eligibleMinor: number;
  /** What it actually gives back, after the cap. */
  waiverMinor: number;
  /** Eligible base minus waiver — what the student actually pays on this rule. */
  netMinor: number;
  /** A rule that gives back less than it asks for, or nothing at all. */
  shortfallMinor: number;
};

export type ConcessionTotals = {
  lines: ConcessionLine[];
  /** Sum of every enabled rule's waiver, capped so it can never exceed the bill. */
  totalWaiverMinor: number;
  netAfterConcessionMinor: number;
  /** Concessions that would give back more than the bill is worth. */
  overCapCount: number;
};

/**
 * Apply every enabled concession to a component list.
 *
 * Each rule is computed against the FULL eligible base, not against what is
 * left after the previous rule. That is a deliberate reading of the policy: a
 * 50% merit concession and a 100% sibling waiver are independent entitlements,
 * and applying them sequentially would make the second one silently smaller
 * depending on the order the desk typed them. The SUM is capped at the bill —
 * a student pays nothing, never less than nothing.
 */
export function applyConcessions(
  components: ComponentInput[],
  concessions: ConcessionInput[],
): ConcessionTotals {
  const bill = totalsOf(components).totalMinor;
  const lines: ConcessionLine[] = concessions.map((c) => {
    const eligibleMinor = eligibleFor(components, c).reduce((s, x) => s + Math.max(0, x.amountMinor), 0);
    const asked = c.basis === 'FLAT'
      ? Math.max(0, c.amountMinor)
      : Math.round((eligibleMinor * Math.min(10000, Math.max(0, c.valueBp))) / 10000);
    const waiverMinor = Math.min(asked, eligibleMinor);
    return {
      name: c.name,
      kind: (c as any).kind ?? 'SCHOLARSHIP',
      basis: c.basis,
      valueBp: c.valueBp,
      amountMinor: c.amountMinor,
      appliesTo: c.appliesTo,
      semester: c.semester,
      enabled: c.enabled,
      eligibleMinor,
      waiverMinor,
      netMinor: eligibleMinor - waiverMinor,
      // What the rule asked for beyond what it can actually take off.
      shortfallMinor: asked - waiverMinor,
    };
  });

  const rawWaiver = lines
    .filter((l) => l.enabled)
    .reduce((s, l) => s + l.waiverMinor, 0);
  const totalWaiverMinor = Math.min(rawWaiver, bill);

  return {
    lines,
    totalWaiverMinor,
    netAfterConcessionMinor: bill - totalWaiverMinor,
    // A rule that asked for more than its base is worth is flagged rather than
    // silently clamped — otherwise the officer never learns the rule is wrong.
    overCapCount: lines.filter((l) => l.shortfallMinor > 0).length,
  };
}

// ── Effective dates & versions ──────────────────────────────

export const VERSION_STATUSES = ['DRAFT', 'PUBLISHED', 'SUPERSEDED', 'DRAFT_DISCARDED'] as const;
export type VersionStatus = (typeof VERSION_STATUSES)[number];

export const VERSION_STATUS_META: Record<
  VersionStatus,
  { label: string; color: string; bg: string; icon: string }
> = {
  DRAFT: { label: 'Draft', color: '#d97706', bg: '#fffbeb', icon: 'create-outline' },
  PUBLISHED: { label: 'In force', color: '#059669', bg: '#f0fdf4', icon: 'checkmark-circle-outline' },
  SUPERSEDED: { label: 'Replaced', color: '#64748b', bg: '#f1f5f9', icon: 'archive-outline' },
  DRAFT_DISCARDED: { label: 'Discarded', color: '#dc2626', bg: '#fef2f2', icon: 'trash-outline' },
};

export const versionStatusMeta = (s: string | null | undefined) =>
  VERSION_STATUS_META[(s ?? 'DRAFT') as VersionStatus] ?? VERSION_STATUS_META.DRAFT;

/**
 * Was this version in force on `onDate`?
 *
 * A SUPERSEDED version counts. That status means "this version WAS in force,
 * for the window it records, and has now been replaced" — which is exactly the
 * version a bill raised last July must be priced against. Restricting this to
 * PUBLISHED would make every historical bill unresolvable the moment a revision
 * is published, which is the whole failure mode effective dates exist to
 * prevent. Only DRAFT and DRAFT_DISCARDED were never in force.
 *
 * The comparison is on whole days at local midnight, because `effectiveTo` is
 * written as a DATE the last day the version applies and a bill raised that
 * evening must still bill the old rate. A pure `date < effectiveTo` on raw
 * timestamps retires a version at 00:00 on its final day.
 */
export function isInForceOn(
  version: Pick<FeeStructureVersion, 'status' | 'effectiveFrom' | 'effectiveTo'>,
  onDate: Date,
): boolean {
  if (version.status !== 'PUBLISHED' && version.status !== 'SUPERSEDED') return false;
  const day = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  };
  const on = day(onDate);
  const from = day(version.effectiveFrom);
  const to = version.effectiveTo ? day(version.effectiveTo) : null;
  if (on < from) return false;
  // `effectiveTo` is INCLUSIVE: a version effective 1 Apr → 30 Jun applies on
  // the 30th. The successor starts the next day.
  if (to !== null && on > to) return false;
  return true;
}

/**
 * The version that was in force on a given date.
 *
 * This is what makes effective-date management real rather than decorative: a
 * due raised in July must price from the July version, and after the November
 * revision the July bill must still read the July rate. Returns null when the
 * date falls outside every window — the caller reports it rather than silently
 * billing the current rate.
 */
export function versionInForceOn<T extends Pick<FeeStructureVersion, 'status' | 'effectiveFrom' | 'effectiveTo'>>(
  versions: T[],
  onDate: Date,
): T | null {
  return versions.find((v) => isInForceOn(v, onDate)) ?? null;
}

/** Versions whose effective window overlaps — used to reject a bad publish. */
export function overlaps(
  a: { effectiveFrom: Date; effectiveTo: Date | null },
  b: { effectiveFrom: Date; effectiveTo: Date | null },
): boolean {
  const start = (w: { effectiveFrom: Date; effectiveTo: Date | null }) =>
    new Date(new Date(w.effectiveFrom).setHours(0, 0, 0, 0)).getTime();
  const end = (w: { effectiveFrom: Date; effectiveTo: Date | null }) =>
    w.effectiveTo
      ? new Date(new Date(w.effectiveTo).setHours(23, 59, 59, 999)).getTime()
      : Number.POSITIVE_INFINITY;
  return start(a) <= end(b) && start(b) <= end(a);
}

/**
 * Year-on-year movement on a line, in rupees.
 *
 * Reported against the version in force a year earlier when there is one, so
 * "tuition up 12%" is a comparison and not a guess. Null when there is no
 * comparable prior version — the UI says "no prior version" rather than
 * rendering a fabricated 0%.
 */
export function yoyPercent(
  currentMinor: number,
  priorMinor: number | null | undefined,
): number | null {
  if (priorMinor === null || priorMinor === undefined) return null;
  if (priorMinor === 0) return currentMinor === 0 ? 0 : null;
  return Math.round(((currentMinor - priorMinor) / priorMinor) * 100);
}

// ── Version snapshots ───────────────────────────────────────

export type ComponentSnapshot = {
  kind: string;
  label: string;
  amountMinor: number;
  semester: number;
  optional: boolean;
  firstYearOnly: boolean;
  sortOrder?: number;
  note?: string | null;
};

/**
 * Freeze components into a version's `componentsJson`.
 *
 * Order is normalised (sortOrder, then kind, then semester) so two versions
 * with the same rates in a different typing order produce byte-identical
 * snapshots — otherwise "nothing changed" is impossible to assert.
 */
export function snapshotComponents(components: ComponentInput[]): ComponentSnapshot[] {
  return components
    .map((c) => ({
      kind: c.kind,
      label: String(c.label ?? '').trim(),
      amountMinor: Math.max(0, Math.round(c.amountMinor)),
      semester: Math.max(0, Math.round(c.semester ?? 0)),
      optional: Boolean(c.optional),
      firstYearOnly: Boolean(c.firstYearOnly),
      sortOrder: (c as any).sortOrder ?? 0,
      note: (c as any).note ?? null,
    }))
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.kind.localeCompare(b.kind) ||
        a.semester - b.semester ||
        a.label.localeCompare(b.label),
    );
}

/** Parse a version's snapshot back into component rows. Never throws. */
export function parseSnapshot(json: string | null | undefined): ComponentSnapshot[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as ComponentSnapshot[]) : [];
  } catch {
    // A corrupt snapshot must not 500 the whole version history; it is reported
    // as an empty one and the version still shows its stored totals.
    return [];
  }
}

/**
 * Line-by-line difference between two snapshots.
 *
 * `unchanged` is included deliberately: "we revised the fee structure" and
 * "we revised four lines of it" are different conversations, and a diff that
 * only showed changes could not answer which.
 */
export function diffSnapshots(
  before: ComponentSnapshot[],
  after: ComponentSnapshot[],
): Array<{
  key: string;
  label: string;
  kind: string;
  semester: number;
  beforeMinor: number;
  afterMinor: number;
  deltaMinor: number;
  status: 'ADDED' | 'REMOVED' | 'CHANGED' | 'UNCHANGED';
}> {
  const key = (c: ComponentSnapshot) => `${c.kind}|${c.semester}|${c.label.toLowerCase()}`;
  const beforeMap = new Map(before.map((c) => [key(c), c]));
  const afterMap = new Map(after.map((c) => [key(c), c]));
  const keys = [...new Set([...beforeMap.keys(), ...afterMap.keys()])];

  return keys
    .map((k) => {
      const b = beforeMap.get(k);
      const a = afterMap.get(k);
      const beforeMinor = b?.amountMinor ?? 0;
      const afterMinor = a?.amountMinor ?? 0;
      const status: 'ADDED' | 'REMOVED' | 'CHANGED' | 'UNCHANGED' = !b
        ? 'ADDED'
        : !a
          ? 'REMOVED'
          : b.amountMinor !== a.amountMinor
            ? 'CHANGED'
            : 'UNCHANGED';
      return {
        key: k,
        label: a?.label ?? b?.label ?? k,
        kind: a?.kind ?? b?.kind ?? 'OTHER',
        semester: a?.semester ?? b?.semester ?? 0,
        beforeMinor,
        afterMinor,
        deltaMinor: afterMinor - beforeMinor,
        status,
      };
    })
    .sort((x, y) => x.status.localeCompare(y.status) || Math.abs(y.deltaMinor) - Math.abs(x.deltaMinor));
}

// ── Validation ──────────────────────────────────────────────

/**
 * Structural checks on a component list, collected rather than thrown.
 *
 * The editor needs to know EVERYTHING that is wrong at once — a version with
 * three duplicate lines and a negative amount should report three problems in
 * one pass, not surface them one at a time as the officer fixes them.
 */
export function validateComponents(
  components: ComponentInput[],
  opts: { totalSemesters?: number } = {},
): Array<{ code: string; message: string; kind?: string; label?: string }> {
  const issues: Array<{ code: string; message: string; kind?: string; label?: string }> = [];
  if (components.length === 0) {
    issues.push({ code: 'EMPTY', message: 'A fee structure needs at least one charge line' });
    return issues;
  }

  const seen = new Set<string>();
  for (const c of components) {
    const name = String(c.label ?? '').trim() || c.kind;
    if (!KIND_IDS.includes(c.kind)) {
      issues.push({ code: 'BAD_KIND', message: `"${name}" is not a recognised charge type`, kind: c.kind, label: c.label });
    }
    if (!String(c.label ?? '').trim()) {
      issues.push({ code: 'NO_LABEL', message: `A ${c.kind} charge needs a name the student will recognise`, kind: c.kind });
    }
    if (!Number.isFinite(c.amountMinor) || c.amountMinor < 0) {
      issues.push({ code: 'NEGATIVE', message: `${name} cannot be negative`, kind: c.kind, label: c.label });
    }
    if (c.amountMinor === 0) {
      issues.push({ code: 'ZERO', message: `${name} is zero — remove the line or price it`, kind: c.kind, label: c.label });
    }
    const sem = Math.max(0, Math.round(c.semester ?? 0));
    const max = opts.totalSemesters ?? 0;
    if (sem < 0 || (max > 0 && sem > max)) {
      issues.push({ code: 'BAD_SEMESTER', message: `${name} is booked to semester ${sem}, which this program does not have`, kind: c.kind, label: c.label });
    }
    const k = `${c.kind}|${sem}|${String(c.label ?? '').trim().toLowerCase()}`;
    if (seen.has(k)) {
      issues.push({ code: 'DUPLICATE', message: `${name} is listed twice for ${semesterLabel(sem)}`, kind: c.kind, label: c.label });
    }
    seen.add(k);
  }

  if (!components.some((c) => isTuitionKind(c.kind))) {
    issues.push({ code: 'NO_TUITION', message: 'There is no tuition line — the headline tuition figure would be zero' });
  }
  return issues;
}

export function validateConcession(c: {
  basis: string;
  valueBp?: number;
  amountMinor?: number;
  appliesTo?: string;
  semester?: number;
}): Array<{ code: string; message: string }> {
  const issues: Array<{ code: string; message: string }> = [];
  if (c.basis === 'PERCENT') {
    const bp = c.valueBp ?? 0;
    if (!Number.isFinite(bp) || bp <= 0) issues.push({ code: 'NO_VALUE', message: 'A percentage concession needs a rate above zero' });
    if (bp > 10000) issues.push({ code: 'TOO_BIG', message: 'A concession cannot exceed 100% of the eligible charges' });
  } else if (c.basis === 'FLAT') {
    const amt = c.amountMinor ?? 0;
    if (!Number.isFinite(amt) || amt <= 0) issues.push({ code: 'NO_VALUE', message: 'A flat concession needs an amount above zero' });
  } else {
    issues.push({ code: 'BAD_BASIS', message: 'A concession is either a percentage or a flat amount' });
  }
  const scope = c.appliesTo ?? 'TUITION';
  if (scope !== 'ALL' && !KIND_IDS.includes(scope)) {
    issues.push({ code: 'BAD_SCOPE', message: `"${scope}" is not a charge a concession can be applied to` });
  }
  return issues;
}