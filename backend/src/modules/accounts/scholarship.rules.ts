// Pure rules for F-08 Scholarships (docs/users/06 §3.7).
//
// Deliberately free of any Prisma import, for the same reason payroll.tax.ts and
// payroll.components.ts are: `prisma/seed.ts` raises historic awards with these
// exact functions, and a seed that reached through a service would open a second
// PrismaClient against the same SQLite file and lock it against itself. If the
// seed and the API disagreed about who was eligible, every seeded award would be
// a lie.
//
// Money: integer paise throughout (ADR-04). Percentages are whole numbers.
import { badRequest, conflict, unprocessable } from '../../lib/errors.js';

// ── Scheme types ───────────────────────────────────────────────────────────
export const SCHOLARSHIP_TYPES = ['MERIT', 'NEED_BASED', 'EXCELLENCE', 'SPECIAL'] as const;
export type ScholarshipType = (typeof SCHOLARSHIP_TYPES)[number];

export const SCHOLARSHIP_TYPE_META: Record<
  ScholarshipType,
  { label: string; color: string; bg: string; icon: string; hint: string }
> = {
  MERIT: {
    label: 'Merit',
    color: '#2563eb',
    bg: '#eff6ff',
    icon: 'ribbon-outline',
    hint: 'Awarded on academic performance alone.',
  },
  NEED_BASED: {
    label: 'Need-based',
    color: '#d97706',
    bg: '#fffbeb',
    icon: 'heart-outline',
    hint: 'Awarded on family circumstances. Income is declared by the student and verified against documents.',
  },
  EXCELLENCE: {
    label: 'Excellence',
    color: '#7c3aed',
    bg: '#f5f3ff',
    icon: 'star-outline',
    hint: 'Awarded for achievement outside the syllabus — sport, arts, research.',
  },
  SPECIAL: {
    label: 'Special',
    color: '#059669',
    bg: '#ecfdf5',
    icon: 'sparkles-outline',
    hint: 'A one-off or trust-funded award with its own terms.',
  },
};

// ── Amount modes ───────────────────────────────────────────────────────────
//
// How much the scheme gives is a RULE, never a number typed per student:
// "50% of the tuition due" has to keep working after a fee revision, or the
// award silently pays last year's figure against this year's bill.
export const AMOUNT_MODES = ['PERCENT_OF_DUE', 'FIXED'] as const;
export type AmountMode = (typeof AMOUNT_MODES)[number];

export const AMOUNT_MODE_META: Record<
  AmountMode,
  { label: string; hint: string }
> = {
  PERCENT_OF_DUE: {
    label: '% of outstanding dues',
    hint: 'Computed from the student’s live fee balance, so a fee revision moves the award with it.',
  },
  FIXED: {
    label: 'Fixed amount',
    hint: 'The same rupee figure for everyone in the scheme.',
  },
};

export const GENDER_RESTRICTIONS = ['ANY', 'FEMALE', 'MALE'] as const;
export type GenderRestriction = (typeof GENDER_RESTRICTIONS)[number];

// ── Required documents ─────────────────────────────────────────────────────
//
// A scheme declares which documents a student must attach. This is a CATALOGUE
// of what can be asked for, not free text, so "has every required document" is
// a question with an answer rather than a judgement call.
export const DOCUMENT_CATALOG: Record<
  string,
  { code: string; label: string; icon: string; hint: string; appliesTo: ScholarshipType[] }
> = {
  INCOME_PROOF: {
    code: 'INCOME_PROOF',
    label: 'Income proof',
    icon: 'document-text-outline',
    hint: 'Salary slip, ITR, or a bank statement — supports a need-based award.',
    appliesTo: ['NEED_BASED', 'SPECIAL'],
  },
  CGPA_CERTIFICATE: {
    code: 'CGPA_CERTIFICATE',
    label: 'Marks statement',
    icon: 'school-outline',
    hint: 'Consolidated marks sheet supporting a merit award.',
    appliesTo: ['MERIT', 'EXCELLENCE'],
  },
  CATEGORY_CERTIFICATE: {
    code: 'CATEGORY_CERTIFICATE',
    label: 'Category certificate',
    icon: 'ribbon-outline',
    hint: 'Government-issued category certificate, where the scheme reserves seats.',
    appliesTo: ['MERIT', 'NEED_BASED', 'EXCELLENCE', 'SPECIAL'],
  },
  SPORTS_CERTIFICATE: {
    code: 'SPORTS_CERTIFICATE',
    label: 'Achievement certificate',
    icon: 'trophy-outline',
    hint: 'State or national level certificate for an excellence award.',
    appliesTo: ['EXCELLENCE', 'SPECIAL'],
  },
  BANK_PASSBOOK: {
    code: 'BANK_PASSBOOK',
    label: 'Bank passbook',
    icon: 'card-outline',
    hint: 'Passbook in the student’s own name, for a direct transfer.',
    appliesTo: ['NEED_BASED', 'MERIT', 'EXCELLENCE', 'SPECIAL'],
  },
  ID_PROOF: {
    code: 'ID_PROOF',
    label: 'Student ID',
    icon: 'id-card-outline',
    hint: 'Institutional identity card.',
    appliesTo: ['MERIT', 'NEED_BASED', 'EXCELLENCE', 'SPECIAL'],
  },
  NO_DUES_CERTIFICATE: {
    code: 'NO_DUES_CERTIFICATE',
    label: 'No-dues certificate',
    icon: 'checkmark-done-outline',
    hint: 'Confirms the student has cleared earlier dues. Required when dues are reduced by the award.',
    appliesTo: ['MERIT', 'NEED_BASED', 'EXCELLENCE', 'SPECIAL'],
  },
};

export const DOCUMENT_CODES = Object.keys(DOCUMENT_CATALOG);

export const documentMeta = (code: string) =>
  DOCUMENT_CATALOG[code] ?? {
    code,
    label: code,
    icon: 'help-circle-outline',
    hint: '',
    appliesTo: [] as ScholarshipType[],
  };

/** Documents a scheme of this type would reasonably ask for. */
export function suggestedDocuments(type: ScholarshipType): string[] {
  return DOCUMENT_CODES.filter((c) => DOCUMENT_CATALOG[c].appliesTo.includes(type));
}

// ── Eligibility rules ──────────────────────────────────────────────────────
//
// A scheme's rules are stored as a JSON list so an institution can add one
// without a migration, but each entry is one of a fixed set of OPERATORS. A
// free-form expression would make "why was this student eligible" unanswerable
// after the fact, which is the whole question an audit asks.
//
// Only rules over data the server actually owns are auto-evaluated:
//   MIN_PERCENT     — from published Result rows (marksObtained / maxMarks)
//   MAX_FAMILY_INCOME — DECLARED by the student on the application
//   MIN_SEMESTER / MAX_SEMESTER — StudentProfile.currentSemester
//   GENDER          — DECLARED by the student on the application
//   ACTIVE_STUDENT  — StudentProfile.status
//
// The two DECLARED rules are marked `declared: true` in the result so the desk
// can see that a human verified them against documents rather than that the
// system proved them. Presenting a declared income as a verified fact is the
// one thing this desk must never do.
export const ELIGIBILITY_OPERATORS = [
  'MIN_PERCENT',
  'MAX_FAMILY_INCOME',
  'MIN_SEMESTER',
  'MAX_SEMESTER',
  'GENDER',
  'ACTIVE_STUDENT',
] as const;
export type EligibilityOperator = (typeof ELIGIBILITY_OPERATORS)[number];

export const OPERATOR_META: Record<
  EligibilityOperator,
  { label: string; unit: string; declared: boolean; hint: string }
> = {
  MIN_PERCENT: {
    label: 'Minimum aggregate %',
    unit: '%',
    declared: false,
    hint: 'From published results. A student with no published results fails this rule rather than passing it vacuously.',
  },
  MAX_FAMILY_INCOME: {
    label: 'Maximum annual family income',
    unit: '₹',
    declared: true,
    hint: 'Declared by the student on the application and verified by the officer against the income proof.',
  },
  MIN_SEMESTER: { label: 'From semester', unit: '', declared: false, hint: 'Minimum current semester.' },
  MAX_SEMESTER: { label: 'Up to semester', unit: '', declared: false, hint: 'Maximum current semester — caps a scheme to, say, first- and second-years.' },
  GENDER: {
    label: 'Gender',
    unit: '',
    declared: true,
    hint: 'Declared by the student and checked against the ID document.',
  },
  ACTIVE_STUDENT: {
    label: 'Must be an active student',
    unit: '',
    declared: false,
    hint: 'A dropped or alumnus profile cannot hold an award.',
  },
};

export type EligibilityRule = {
  operator: EligibilityOperator;
  /** Whole number for percents and semesters; paise for MAX_FAMILY_INCOME. */
  value: number | null;
  /** For GENDER — 'FEMALE' | 'MALE' | 'ANY'. */
  gender?: string | null;
  enabled?: boolean;
  note?: string | null;
};

export type EligibilityFacts = {
  /** Aggregate percentage from published results, 0–100. null when unknown. */
  percent: number | null;
  /** Paise, declared on the application. null when not declared. */
  declaredAnnualIncomeMinor: number | null;
  currentSemester: number | null;
  /** 'FEMALE' | 'MALE' | anything else / null. */
  declaredGender: string | null;
  studentStatus: string;
  /** How many published results back the percentage. 0 = none. */
  resultCount: number;
};

export type EligibilityLine = {
  operator: EligibilityOperator;
  label: string;
  /** What the rule demands. */
  required: string;
  /** What the student actually has, or a reason it is unknown. */
  actual: string;
  passed: boolean;
  /** True when the failure is "we don't know", not "we know it's wrong". */
  unknown: boolean;
  declared: boolean;
  note: string | null;
};

export type EligibilityResult = {
  eligible: boolean;
  /** Every rule's outcome, so the desk can show the whole checklist. */
  lines: EligibilityLine[];
  /** Rules that failed on a known value. */
  failed: EligibilityLine[];
  /** Rules that could not be evaluated because the data was missing. */
  unknown: EligibilityLine[];
  /**
   * A result is only an ELIGIBLE answer when nothing is unknown. An unknown is
   * not a pass: awarding on "we couldn't check" is how money reaches the wrong
   * family, so the server refuses to approve while any rule is unknown.
   */
  canApprove: boolean;
  summary: string;
};

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function evaluateRule(rule: EligibilityRule, f: EligibilityFacts): EligibilityLine {
  const meta = OPERATOR_META[rule.operator];
  const base = { operator: rule.operator, declared: meta.declared, note: rule.note ?? null };

  switch (rule.operator) {
    case 'MIN_PERCENT': {
      const need = Number(rule.value ?? 0);
      const required = `${need}%`;
      // No published results is UNKNOWN, not a pass. Defaulting to 0 would fail
      // the student for a missing record, and defaulting to 100 would hand them
      // the award for the same missing record.
      if (f.percent === null) {
        return {
          ...base,
          label: meta.label,
          required,
          actual: 'No published results',
          passed: false,
          unknown: true,
        };
      }
      const actual = `${f.percent}%`;
      return {
        ...base,
        label: meta.label,
        required,
        actual: `${actual} across ${f.resultCount} result${f.resultCount === 1 ? '' : 's'}`,
        passed: f.percent >= need,
        unknown: false,
      };
    }

    case 'MAX_FAMILY_INCOME': {
      const cap = Number(rule.value ?? 0);
      const required = `at most ${rupees(cap)}`;
      if (f.declaredAnnualIncomeMinor === null) {
        return {
          ...base,
          label: meta.label,
          required,
          actual: 'Not declared on the application',
          passed: false,
          unknown: true,
        };
      }
      return {
        ...base,
        label: meta.label,
        required,
        actual: rupees(f.declaredAnnualIncomeMinor),
        passed: f.declaredAnnualIncomeMinor <= cap,
        unknown: false,
      };
    }

    case 'MIN_SEMESTER': {
      const need = Number(rule.value ?? 1);
      if (f.currentSemester === null) {
        return { ...base, label: meta.label, required: `semester ${need} or later`, actual: 'Not on a semester', passed: false, unknown: true };
      }
      return {
        ...base,
        label: meta.label,
        required: `semester ${need} or later`,
        actual: `semester ${f.currentSemester}`,
        passed: f.currentSemester >= need,
        unknown: false,
      };
    }

    case 'MAX_SEMESTER': {
      const cap = Number(rule.value ?? 99);
      if (f.currentSemester === null) {
        return { ...base, label: meta.label, required: `up to semester ${cap}`, actual: 'Not on a semester', passed: false, unknown: true };
      }
      return {
        ...base,
        label: meta.label,
        required: `up to semester ${cap}`,
        actual: `semester ${f.currentSemester}`,
        passed: f.currentSemester <= cap,
        unknown: false,
      };
    }

    case 'GENDER': {
      const want = String(rule.gender ?? 'ANY').toUpperCase();
      if (want === 'ANY') {
        return { ...base, label: meta.label, required: 'any', actual: f.declaredGender ?? 'not declared', passed: true, unknown: false };
      }
      if (!f.declaredGender) {
        return { ...base, label: meta.label, required: want.toLowerCase(), actual: 'Not declared on the application', passed: false, unknown: true };
      }
      const got = f.declaredGender.toUpperCase();
      return {
        ...base,
        label: meta.label,
        required: want.toLowerCase(),
        actual: got.toLowerCase(),
        passed: got === want,
        unknown: false,
      };
    }

    case 'ACTIVE_STUDENT': {
      const ok = String(f.studentStatus || '').toUpperCase() === 'ACTIVE';
      return {
        ...base,
        label: meta.label,
        required: 'active',
        actual: String(f.studentStatus || 'unknown').toLowerCase(),
        passed: ok,
        unknown: !f.studentStatus,
      };
    }

    default:
      return {
        ...base,
        label: String(rule.operator),
        required: '—',
        actual: 'unsupported rule',
        passed: false,
        unknown: true,
      };
  }
}

/**
 * Evaluate a scheme's rules against a student's facts.
 *
 * Three properties this must hold:
 *
 *  1. A disabled rule is skipped entirely — not reported as a pass. A switched
 *     off rule shown as a green tick is a lie about what was checked.
 *  2. `eligible` is true only when every enabled rule passed with a KNOWN
 *     value. An unknown rule fails `canApprove` without failing `eligible`,
 *     so the desk can show "not yet verifiable" separately from "not eligible".
 *  3. With no enabled rules at all the scheme is unconstrained and everyone
 *     passes — stated explicitly rather than implied by an empty checklist.
 */
export function evaluateEligibility(rules: EligibilityRule[], facts: EligibilityFacts): EligibilityResult {
  const enabled = (rules ?? []).filter((r) => r.enabled !== false);
  const lines = enabled.map((r) => evaluateRule(r, facts));
  const failed = lines.filter((l) => !l.passed && !l.unknown);
  const unknown = lines.filter((l) => !l.passed && l.unknown);
  const eligible = lines.length > 0 ? failed.length === 0 && unknown.length === 0 : true;

  const summary = !enabled.length
    ? 'This scheme has no eligibility rules — every eligible student qualifies.'
    : eligible
      ? `All ${lines.length} rule${lines.length === 1 ? '' : 's'} passed.`
      : unknown.length
        ? `${unknown.length} rule${unknown.length === 1 ? '' : 's'} could not be checked — approve once the data is in.`
        : `${failed.length} rule${failed.length === 1 ? '' : 's'} not met.`;

  return { eligible, lines, failed, unknown, canApprove: eligible, summary };
}

// ── Document checklist ─────────────────────────────────────────────────────

export type DocumentRow = { code: string; status: string };
export type RequiredDocument = {
  code: string;
  label: string;
  icon: string;
  hint: string;
  status: string;
  fileId: string | null;
  uploadedAt: string | null;
  verifiedAt: string | null;
  rejectionNote: string | null;
  satisfied: boolean;
};

/**
 * Score a required-document list against what has been supplied.
 *
 * `REQUIRED` is not satisfied by an upload alone — it has to be VERIFIED by the
 * officer. An unverified scan is evidence, not a decision, and an award released
 * against unverified documents is the fraud case this whole sub-feature exists
 * to prevent.
 */
export function scoreDocuments(required: string[], rows: DocumentRow[]): RequiredDocument[] {
  const byCode = new Map<string, DocumentRow>();
  for (const r of rows ?? []) if (!byCode.has(r.code)) byCode.set(r.code, r);

  return (required ?? []).map((code) => {
    const meta = documentMeta(code);
    const row = byCode.get(code);
    const status = row?.status ?? 'PENDING';
    return {
      code,
      label: meta.label,
      icon: meta.icon,
      hint: meta.hint,
      status,
      fileId: row && status !== 'PENDING' ? (row as unknown as { fileId?: string | null }).fileId ?? null : null,
      uploadedAt: null,
      verifiedAt: null,
      rejectionNote: null,
      satisfied: status === 'VERIFIED',
    };
  });
}

export const documentChecklist = (required: string[], rows: DocumentRow[]) => {
  const scored = scoreDocuments(required, rows);
  const verified = scored.filter((d) => d.status === 'VERIFIED').length;
  const rejected = scored.filter((d) => d.status === 'REJECTED').length;
  return {
    documents: scored,
    requiredCount: scored.length,
    verifiedCount: verified,
    rejectedCount: rejected,
    pendingCount: scored.filter((d) => d.status === 'PENDING' || d.status === 'UPLOADED').length,
    complete: scored.length > 0 && verified === scored.length,
    hasRejection: rejected > 0,
  };
};

// ── Award amount ───────────────────────────────────────────────────────────

export type AmountInput = {
  mode: string;
  /** The scheme's fixed rupee figure, in paise, for FIXED mode. */
  fixedAmountMinor?: number | null;
  /** The scheme's percentage, for PERCENT_OF_DUE mode. */
  percent?: number | null;
  /** The student's live outstanding balance, in paise. */
  outstandingMinor: number;
  /** What the scheme has already committed this year, in paise. */
  budgetMinor?: number | null;
  /** What is already disbursed against the scheme, in paise. */
  disbursedMinor?: number | null;
  /** What is committed but not yet disbursed, in paise. */
  committedMinor?: number | null;
};

export type AmountResult = {
  requestedMinor: number;
  /** What the scheme can still afford. */
  affordableMinor: number;
  grantedMinor: number;
  /** Why the granted figure is what it is. */
  basis: string;
  cappedBy: 'BUDGET' | 'OUTSTANDING' | null;
  warnings: string[];
};

/**
 * Work out what a scheme actually grants.
 *
 * The cap is applied HERE and reported, not left to the caller. A scheme with a
 * ₹5,00,000 budget that has already committed ₹4,80,000 must grant at most
 * ₹20,000 — an uncapped desk hands out the full figure, overdraws the fund, and
 * the ledger is wrong from that row onward.
 *
 * The award is also never more than the student's own outstanding balance.
 * Granting more than is owed credits money nobody can use and leaves the award
 * permanently "partially unspent", which is exactly the sort of thing that has
 * to be reconciled by hand every year.
 */
export function computeAwardAmount(input: AmountInput): AmountResult {
  const outstanding = Math.max(0, Math.trunc(input.outstandingMinor || 0));
  const warnings: string[] = [];

  let requested: number;
  let basis: string;

  if (String(input.mode).toUpperCase() === 'FIXED') {
    const fixed = Math.max(0, Math.trunc(input.fixedAmountMinor ?? 0));
    requested = fixed;
    basis = fixed
      ? `Fixed award of ${rupees(fixed)}`
      : 'This scheme has no fixed amount configured';
    if (!fixed) warnings.push('The scheme awards a percentage of dues, or has no amount configured.');
  } else {
    const pct = Math.max(0, Math.min(100, Math.trunc(input.percent ?? 0)));
    requested = Math.round((outstanding * pct) / 100);
    basis = outstanding
      ? `${pct}% of ${rupees(outstanding)} outstanding`
      : `${pct}% of dues — but this student owes nothing, so the award is nil`;
    if (pct > 100) warnings.push('A percentage above 100% cannot be honoured.');
    if (!outstanding) {
      warnings.push(
        'This student has no outstanding dues. A percentage-of-dues scheme gives nothing — use a fixed amount if the award is meant to be a cash benefit.',
      );
    }
  }

  requested = Math.max(0, requested);

  // Budget headroom: cap less what is already committed AND disbursed.
  const cap = input.budgetMinor ?? null;
  let affordable = requested;
  let cappedBy: AmountResult['cappedBy'] = null;

  if (cap !== null) {
    const used = Math.max(0, Math.trunc(input.disbursedMinor ?? 0)) + Math.max(0, Math.trunc(input.committedMinor ?? 0));
    const headroom = Math.max(0, cap - used);
    affordable = Math.min(affordable, headroom);
    if (headroom < requested) {
      cappedBy = 'BUDGET';
      warnings.push(
        `Capped by the scheme budget: ${rupees(used)} of ${rupees(cap)} is already committed, leaving ${rupees(headroom)}.`,
      );
    }
  }

  // Never more than the balance it is meant to clear.
  if (outstanding > 0 && affordable > outstanding) {
    affordable = outstanding;
    cappedBy = cappedBy ?? 'OUTSTANDING';
    warnings.push(`Capped at the outstanding balance of ${rupees(outstanding)}.`);
  }

  const granted = Math.max(0, affordable);
  return { requestedMinor: requested, affordableMinor: granted, grantedMinor: granted, basis, cappedBy, warnings };
}

// ── Approval workflow ──────────────────────────────────────────────────────
//
// APPLIED → UNDER_REVIEW → APPROVED → DISBURSED, with REJECTED reachable from
// the two review states and WITHDRAWN from everything before disbursement.
// Nothing skips a state, and DISBURSED is terminal: an award that has moved
// money cannot quietly go back to "approved", because the money is already
// against the student's dues.
export const APPLICATION_STATUSES = [
  'APPLIED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN',
  'DISBURSED',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_META: Record<
  ApplicationStatus,
  { label: string; color: string; bg: string; icon: string; tone: 'good' | 'bad' | 'warn' | 'neutral' }
> = {
  APPLIED: { label: 'Applied', color: '#0284c7', bg: '#f0f9ff', icon: 'document-text-outline', tone: 'neutral' },
  UNDER_REVIEW: { label: 'Under review', color: '#d97706', bg: '#fffbeb', icon: 'time-outline', tone: 'warn' },
  APPROVED: { label: 'Approved', color: '#059669', bg: '#ecfdf5', icon: 'checkmark-circle-outline', tone: 'good' },
  REJECTED: { label: 'Rejected', color: '#dc2626', bg: '#fef2f2', icon: 'close-circle-outline', tone: 'bad' },
  WITHDRAWN: { label: 'Withdrawn', color: '#6b7280', bg: '#f9fafb', icon: 'arrow-undo-outline', tone: 'neutral' },
  DISBURSED: { label: 'Disbursed', color: '#2563eb', bg: '#eff6ff', icon: 'wallet-outline', tone: 'good' },
};

export const TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  APPLIED: ['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'WITHDRAWN'],
  APPROVED: ['DISBURSED', 'WITHDRAWN'],
  // Terminal. A rejected application cannot be revived by editing it — the
  // student applies again, which leaves the rejection in the history.
  REJECTED: [],
  WITHDRAWN: [],
  DISBURSED: [],
};

export const canTransition = (from: string, to: string): boolean =>
  (TRANSITIONS[from as ApplicationStatus] ?? []).includes(to as ApplicationStatus);

export function assertTransition(from: string, to: string): void {
  if (from === to) throw conflictStatus(from, to);
  if (!canTransition(from, to)) {
    const allowed = TRANSITIONS[from as ApplicationStatus] ?? [];
    throw conflictStatus(
      from,
      to,
      allowed.length ? ` from ${STATUS_META[from as ApplicationStatus]?.label ?? from}` : ' — that state is final',
    );
  }
}

function conflictStatus(from: string, to: string, suffix = ''): Error {
  const label = STATUS_META[to as ApplicationStatus]?.label ?? to;
  const current = STATUS_META[from as ApplicationStatus]?.label ?? from;
  return conflict(`Cannot mark "${current}" as "${label}"${suffix}`);
}

/** The actions a screen may offer, given what the server has established. */
export function availableActions(
  status: string,
  gates: { eligible: boolean; canApprove: boolean; documentsComplete: boolean; outstandingMinor: number; grantedMinor: number },
): string[] {
  const out: string[] = [];
  if (!TRANSITIONS[status as ApplicationStatus]) return out;

  if (status === 'APPLIED') out.push('START_REVIEW');
  if (canTransition(status, 'APPROVED')) {
    // Approve is offered only when the server would actually accept it, with
    // the reason attached. A greyed-out button with no explanation is the
    // single most common way a desk gets talked into a wrong approval.
    const blockers: string[] = [];
    if (!gates.canApprove) blockers.push('eligibility is not yet satisfied');
    if (!gates.documentsComplete) blockers.push('required documents are not all verified');
    if (gates.outstandingMinor <= 0) blockers.push('the student owes nothing to reduce');
    if (gates.grantedMinor <= 0) blockers.push('the computed award is nil');
    if (!blockers.length) out.push('APPROVE');
    else out.push(`BLOCKED:${blockers.join('; ')}`);
  }
  if (canTransition(status, 'REJECTED')) out.push('REJECT');
  if (canTransition(status, 'WITHDRAWN')) out.push('WITHDRAW');
  if (status === 'APPROVED') {
    if (gates.grantedMinor > 0) out.push('DISBURSE');
    else out.push('BLOCKED:there is nothing to disburse');
  }
  return out;
}

// ── Amount tracking / ageing ───────────────────────────────────────────────

export const DISBURSEMENT_BANDS = ['NOT_STARTED', 'PENDING', 'PARTIAL', 'SETTLED'] as const;
export type DisbursementBand = (typeof DISBURSEMENT_BANDS)[number];

export const DISBURSEMENT_META: Record<
  DisbursementBand,
  { label: string; color: string; bg: string; icon: string }
> = {
  NOT_STARTED: { label: 'Not approved', color: '#6b7280', bg: '#f9fafb', icon: 'ellipse-outline' },
  PENDING: { label: 'Approved, unpaid', color: '#d97706', bg: '#fffbeb', icon: 'time-outline' },
  PARTIAL: { label: 'Partially disbursed', color: '#c2410c', bg: '#fff7ed', icon: 'pie-chart-outline' },
  SETTLED: { label: 'Fully disbursed', color: '#059669', bg: '#ecfdf5', icon: 'checkmark-circle-outline' },
};

/** Classify an award's disbursement state from its two money figures. */
export function disbursementBand(grantedMinor: number, disbursedMinor: number): DisbursementBand {
  const granted = Math.max(0, Math.trunc(grantedMinor || 0));
  const paid = Math.max(0, Math.trunc(disbursedMinor || 0));
  if (granted <= 0) return 'NOT_STARTED';
  if (paid <= 0) return 'PENDING';
  if (paid >= granted) return 'SETTLED';
  return 'PARTIAL';
}

// ── Scheme-level rules ─────────────────────────────────────────────────────

export const SCHEME_STATUSES = ['OPEN', 'CLOSED', 'DRAFT'] as const;
export type SchemeStatus = (typeof SCHEME_STATUSES)[number];

/**
 * Normalise a stored rule list, rejecting an operator the server does not
 * implement. A rule the desk cannot evaluate must fail at save time rather than
 * quietly never firing on a real application.
 */
export function normaliseRules(rules: unknown): EligibilityRule[] {
  if (!Array.isArray(rules)) return [];
  return rules.map((raw) => {
    const r = raw as Record<string, unknown>;
    const operator = String(r.operator ?? '') as EligibilityOperator;
    if (!ELIGIBILITY_OPERATORS.includes(operator)) {
      throw unprocessable(`Unknown eligibility rule "${r.operator}"`, [
        { code: 'BAD_OPERATOR', message: `Supported: ${ELIGIBILITY_OPERATORS.join(', ')}` },
      ]);
    }
    const value = r.value === null || r.value === undefined ? null : Number(r.value);
    if (value !== null && !Number.isFinite(value)) {
      throw unprocessable(`Rule ${operator} needs a numeric value`);
    }
    if (operator === 'MAX_FAMILY_INCOME' && value !== null && value < 0) {
      throw unprocessable('A family-income cap cannot be negative');
    }
    if (operator === 'MIN_PERCENT' && value !== null && (value < 0 || value > 100)) {
      throw unprocessable('A minimum-percentage rule must be between 0 and 100');
    }
    return {
      operator,
      value,
      gender: r.gender ? String(r.gender).toUpperCase() : null,
      enabled: r.enabled !== false,
      note: r.note ? String(r.note) : null,
    };
  });
}

export function normaliseDocuments(codes: unknown): string[] {
  if (!Array.isArray(codes)) return [];
  const out: string[] = [];
  for (const c of codes) {
    const code = String(c);
    if (!DOCUMENT_CODES.includes(code)) {
      throw unprocessable(`Unknown document type "${code}"`, [
        { code: 'BAD_DOCUMENT', message: `Supported: ${DOCUMENT_CODES.join(', ')}` },
      ]);
    }
    if (!out.includes(code)) out.push(code);
  }
  return out;
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
export function assertMonth(month: string): string {
  if (!MONTH_RE.test(month)) throw badRequest('month must look like YYYY-MM');
  return month;
}

export { rupees };