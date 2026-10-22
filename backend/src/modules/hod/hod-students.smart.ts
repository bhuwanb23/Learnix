/**
 * HD-05 — The HOD's Students desk: the two smart features.
 * Docs: 11-hod.md §3.4
 *
 *   · AT-RISK DETECTION        — the five signals, and the verdict
 *   · EARLY INTERVENTION SUGGESTIONS — what to do about each signal
 *
 * THE SUGGESTION IS DERIVED FROM THE SIGNAL THAT FIRED
 * ---------------------------------------------------
 * A student with a failed course gets a REMEDIAL suggestion, and a student with a run of
 * absences gets a MENTORING one. A generic "get help" card for every student is not advice, it is
 * a form letter, and a HOD who reads one learns to skip the rest.
 *
 * AND A SUGGESTION IS NOT AN INTERVENTION
 * ---------------------------------------
 * A suggestion is what the desk BELIEVES. An intervention is what the department DID. The
 * suggestion pre-fills the form; the HOD records it; the history is the list of what was done.
 * Conflating the two would mean the history was full of things nobody did.
 */
import {
  INTERVENTION_TYPES,
  type InterventionType,
  type RiskSignalId,
} from './hod-students.rules.js';

/**
 * THE SUGGESTIONS FOR ONE STUDENT.
 *
 * One suggestion per intervention kind, and only the kinds the student's own signals justify —
 * so a student with one signal gets one suggestion, not four.
 */
export function buildSuggestions(
  signals: RiskSignalId[],
  context: {
    weakestCourse?: { code: string; name: string; gap: number | null } | null;
    failedCourses?: { code: string; name: string }[];
    absenceStreak?: number;
    cgpa?: number | null;
  } = {},
) {
  const wanted = new Set<InterventionType>();
  for (const type of INTERVENTION_TYPES) {
    if (type.forSignals.some((s) => signals.includes(s))) wanted.add(type.id);
  }

  const suggestions: {
    type: InterventionType;
    label: string;
    blurb: string;
    icon: string;
    color: string;
    title: string;
    notes: string;
  }[] = [];

  for (const type of INTERVENTION_TYPES) {
    if (!wanted.has(type.id)) continue;
    const because = type.forSignals.filter((s) => signals.includes(s));
    suggestions.push({
      type: type.id,
      label: type.label,
      blurb: type.blurb,
      icon: type.icon,
      color: type.color,
      title: titleFor(type.id, context),
      notes: notesFor(type.id, because, context),
    });
  }

  return suggestions;
}

function titleFor(
  type: InterventionType,
  context: {
    weakestCourse?: { code: string; name: string; gap: number | null } | null;
    failedCourses?: { code: string; name: string }[];
    absenceStreak?: number;
    cgpa?: number | null;
  },
): string {
  const weak = context.weakestCourse;
  const failed = context.failedCourses?.[0];
  switch (type) {
    case 'REMEDIAL_CLASS':
      return failed
        ? `Remedial class for ${failed.code}`
        : weak
          ? `Remedial class for ${weak.code}`
          : 'Remedial class';
    case 'FACULTY_MENTORING':
      return `Mentoring for ${failed?.code ?? weak?.code ?? 'this student'}`;
    case 'RESOURCES':
      return `Extra resources for ${failed?.code ?? weak?.code ?? 'this student'}`;
    case 'PEER_LEARNING':
      return `Peer study group for ${failed?.code ?? weak?.code ?? 'this student'}`;
    default:
      return 'Intervention';
  }
}

function notesFor(
  type: InterventionType,
  because: RiskSignalId[],
  context: {
    weakestCourse?: { code: string; name: string; gap: number | null } | null;
    failedCourses?: { code: string; name: string }[];
    absenceStreak?: number;
    cgpa?: number | null;
  },
): string {
  const weak = context.weakestCourse;
  const failed = context.failedCourses ?? [];
  const streak = context.absenceStreak ?? 0;
  switch (type) {
    case 'REMEDIAL_CLASS':
      return failed.length
        ? `Has not cleared ${failed.map((f) => f.code).join(', ')}.`
        : weak?.gap
          ? `Trails the cohort by ${Math.round(weak.gap)}% in ${weak.code}.`
          : 'Needs extra teaching time.';
    case 'FACULTY_MENTORING':
      return streak
        ? `${streak} absences in a row.`
        : 'Needs someone to check in with them regularly.';
    case 'RESOURCES':
      return failed.length
        ? `Practice material and a recorded session for ${failed.map((f) => f.code).join(', ')}.`
        : 'Extra reading and a practice set for the topics they are weakest in.';
    case 'PEER_LEARNING':
      return 'Pair them with a classmate who has the subject.';
    default:
      return because.join(', ');
  }
}

/**
 * THE AT-RISK LIST.
 *
 * Sorted by how many signals are firing, and then by the lowest attendance — so the HOD reads the
 * students with the most going wrong first, not the ones with the alphabetically nicest names.
 */
export function buildAtRiskList<
  T extends {
    risk: { state: string; signals: RiskSignalId[] };
    attendance: { attendancePct: number | null };
  },
>(rows: T[]) {
  return rows
    .filter((r) => r.risk.state === 'AT_RISK')
    .sort(
      (a, b) =>
        b.risk.signals.length - a.risk.signals.length ||
        (a.attendance.attendancePct ?? 101) - (b.attendance.attendancePct ?? 101),
    );
}
