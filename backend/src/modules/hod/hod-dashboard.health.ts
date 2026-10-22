/**
 * HD-01 — The HOD dashboard: the Department Health Score.
 * Docs: 11-hod.md §HD-01
 *
 * WHY THE FORMULA IS IN ITS OWN FILE
 * ---------------------------------
 * Because the formula is the part that gets ARGUED ABOUT, and an argument about a weight should
 * not require reading a file that also lists the section names. It is here on its own so the
 * weights, the bands and the scoring rule can be read, reviewed and changed as one thing.
 *
 * THE RULE THAT MAKES IT HONEST
 * ------------------------------
 * A component with NO DATA IS EXCLUDED, never scored as zero.
 *
 * A department in week three of term has no attendance records yet, and its syllabus has barely
 * started. Scoring those as zero would report a brand-new department as an unhealthy one, and a
 * HOD who trusted the number would go and investigate a problem that does not exist. Worse, the
 * number would be CONFIDENTLY wrong: it would look like a measurement rather than an absence of
 * one.
 *
 * So the score is a WEIGHTED MEAN OVER THE COMPONENTS THAT HAVE DATA, and the response says how
 * many components were included and names the ones that were not. The same rule the exam cell's
 * dashboard learned the hard way, when it reported "0 eligible" in a college of forty-two
 * students because it had subtracted three different grains of count from each other.
 *
 * THE WEAKEST COMPONENT IS NAMED
 * ------------------------------
 * Because a single number a HOD cannot act on is a decoration. The first thing they should read
 * is what to fix.
 *
 * THE WEIGHTS ARE PUBLISHED
 * -------------------------
 * A composite index a HOD cannot explain is a decoration, and a HOD asked "why is my score 62?"
 * deserves an answer that is in the data rather than in the head of whoever wrote the formula.
 */



export type HealthComponentId =
  | 'ATTENDANCE'
  | 'SYLLABUS'
  | 'FACULTY_BALANCE'
  | 'STUDENT_PERFORMANCE';

export type HealthComponent = {
  id: HealthComponentId;
  label: string;
  blurb: string;
  icon: string;
  color: string;
  /**
   * The component's share of the score.
   *
   * THE WEIGHTS ARE PUBLISHED, not hidden. A composite index a HOD cannot explain is a
   * decoration, and a HOD asked "why is my score 62?" deserves an answer that is in the data
   * rather than in the head of whoever wrote the formula.
   */
  weight: number;
};

export const HEALTH_COMPONENTS: readonly HealthComponent[] = [
  {
    id: 'ATTENDANCE',
    label: 'Attendance',
    blurb: 'The share of students present across the department.',
    icon: 'checkbox-outline',
    color: '#059669',
    weight: 0.35,
  },
  {
    id: 'SYLLABUS',
    label: 'Syllabus progress',
    blurb: 'How much of the department\'s syllabus is complete.',
    icon: 'book-outline',
    color: '#7c3aed',
    weight: 0.25,
  },
  {
    id: 'FACULTY_BALANCE',
    label: 'Faculty balance',
    blurb: 'How evenly the teaching load is shared.',
    icon: 'people-outline',
    color: '#d97706',
    weight: 0.2,
  },
  {
    id: 'STUDENT_PERFORMANCE',
    label: 'Student performance',
    blurb: 'The share of results that passed.',
    icon: 'trophy-outline',
    color: '#2563eb',
    weight: 0.2,
  },
];

export const HEALTH_COMPONENT_IDS = HEALTH_COMPONENTS.map((c) => c.id);

/**
 * The bands.
 *
 * The NUMBER is for tracking over time; the BAND is for what to do on Monday. A HOD does not
 * act on "68.4" — they act on "WATCH".
 */
export type HealthBand = 'HEALTHY' | 'WATCH' | 'AT_RISK';

export const HEALTH_BANDS: readonly {
  id: HealthBand;
  label: string;
  blurb: string;
  color: string;
  min: number;
}[] = [
  {
    id: 'HEALTHY',
    label: 'Healthy',
    blurb: 'Every measured part of the department is in good order.',
    color: '#059669',
    min: 80,
  },
  {
    id: 'WATCH',
    label: 'Watch',
    blurb: 'One part of the department is slipping and needs attention.',
    color: '#d97706',
    min: 60,
  },
  {
    id: 'AT_RISK',
    label: 'At risk',
    blurb: 'The department needs intervention this term.',
    color: '#dc2626',
    min: 0,
  },
];

/** The band a score falls in. */
export function healthBand(score: number): HealthBand {
  const s = Number(score) || 0;
  if (s >= 80) return 'HEALTHY';
  if (s >= 60) return 'WATCH';
  return 'AT_RISK';
}

export const healthBandMeta = (id: string) =>
  HEALTH_BANDS.find((b) => b.id === id) ?? null;

/**
 * THE SCORE, and the rule that makes it honest.
 *
 * A component with NO DATA IS EXCLUDED, NOT SCORED AS ZERO.
 *
 * A department in week three of term has no attendance records yet, and its syllabus has barely
 * started. Scoring those as zero would report a brand-new department as an unhealthy one, and a
 * HOD who trusted the number would go and investigate a problem that does not exist. Worse, the
 * number would be *confidently* wrong: it would look like a measurement rather than an absence of
 * one.
 *
 * So the score is a WEIGHTED MEAN OVER THE COMPONENTS THAT HAVE DATA, and the response says how
 * many components were included and names the ones that were not. The same rule the exam cell's
 * dashboard learned the hard way, when it reported "0 eligible" in a college of forty-two
 * students because it had subtracted three different grains of count from each other.
 *
 * The WEAKEST component is named too, because a single number a HOD cannot act on is a
 * decoration — the first thing they should read is what to fix.
 */
export function healthScore(components: {
  id: HealthComponentId;
  value: number | null;
}[]): {
  score: number | null;
  band: HealthBand;
  included: number;
  excluded: HealthComponentId[];
  weakest: HealthComponentId | null;
  components: { id: HealthComponentId; value: number | null; weight: number; included: boolean }[];
} {
  const meta = new Map(HEALTH_COMPONENTS.map((c) => [c.id, c]));
  const scored = components.filter((c) => c.value !== null && c.value !== undefined);
  const excluded = components
    .filter((c) => c.value === null || c.value === undefined)
    .map((c) => c.id);

  if (scored.length === 0) {
    return {
      score: null,
      band: 'AT_RISK',
      included: 0,
      excluded,
      weakest: null,
      components: components.map((c) => ({
        id: c.id,
        value: c.value ?? null,
        weight: meta.get(c.id)?.weight ?? 0,
        included: false,
      })),
    };
  }

  // The weights of the INCLUDED components are re-normalised, so a department measured on two
  // components is scored on those two and not penalised for the two it has no data for.
  const totalWeight = scored.reduce((s, c) => s + (meta.get(c.id)?.weight ?? 0), 0);
  const raw = scored.reduce(
    (s, c) => s + (c.value as number) * (meta.get(c.id)?.weight ?? 0),
    0,
  );
  const score = totalWeight === 0 ? 0 : Math.round((raw / totalWeight) * 10) / 10;

  const weakest = scored.reduce((min, c) =>
    (c.value as number) < (min?.value as number) ? c : min,
  scored[0]!).id;

  return {
    score,
    band: healthBand(score),
    included: scored.length,
    excluded,
    weakest,
    components: components.map((c) => ({
      id: c.id,
      value: c.value ?? null,
      weight: meta.get(c.id)?.weight ?? 0,
      included: scored.some((s) => s.id === c.id),
    })),
  };
}
