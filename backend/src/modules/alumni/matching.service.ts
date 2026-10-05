// Mentor/mentee matching.
// Docs: 12-alumni-relations.md §3.5 · §4
//
// ─────────────────────────────────────────────────────────────
// This service does NOT have its own scorer
// ─────────────────────────────────────────────────────────────
// `scoreCandidate()` already exists in connections.service.ts and is a pure,
// explainable function with a mentor mode that refuses to recommend someone
// without demonstrated depth. That is exactly the right behaviour for matching a
// mentor, so it is REUSED rather than reimplemented — two ranking engines in one
// module would drift, and the office would be shown two different "best match"
// answers to the same question depending on which screen they opened.
//
// What is added here is the CAREER dimension. The existing scorer measures shared
// skills, cohort, geography and employer, which answers "can this person help me
// with X?" It does not answer "is this person a plausible guide for my career?",
// because a mentee who wants design advice should not be handed a mentor purely
// because they share a skill and live in the same city.
//
// Both halves return reasons. A recommendation the office or the mentee cannot
// explain is one they will not use.

import { prisma } from '../../db/prisma.js';
import { unprocessable } from '../../lib/errors.js';
import { scoreCandidate } from './connections.service.js';

/** Career weights, kept separate from connections' WEIGHTS so neither can drift
 *  into the other. Both sets sum to 100 on their own. */
const CAREER_WEIGHTS = {
  seniorityGap: 30, // mentor meaningfully more senior
  sameSector: 25,
  adjacentRole: 20,
  fieldAlignment: 15,
} as const;

/**
 * Split a free-text skill list into the normalised vocabulary.
 *
 * Requested skills arrive as a comma string typed by a person ("React, node js"),
 * while `AlumniSkill.skill` holds the canonical spelling from the seed. Matching
 * is exact-string by design (see connections.service.ts), so "Node.js" would never
 * match "Node" without this normalisation — which would silently shrink the
 * candidate pool rather than produce a visible error.
 */
export function parseSkillList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(',')
        .map((s) => s.trim().toLowerCase().replace(/[.\s_]+/g, ''))
        .filter(Boolean),
    ),
  ];
}

/**
 * Normalise a candidate's stored skills the same way, so both sides of the
 * comparison go through identical folding.
 */
function norm(skill: string): string {
  return skill.trim().toLowerCase().replace(/[.\s_]+/g, '');
}

const STOP_ROLE_WORDS = new Set([
  'senior', 'junior', 'lead', 'head', 'chief', 'principal', 'staff', 'associate',
  'manager', 'director', 'engineer', 'developer', 'consultant', 'specialist',
  'the', 'and', 'of', 'at', 'a', 'an',
]);

/** Content words from a role/headline, for adjacency comparison. */
function roleWords(text: string | null | undefined): Set<string> {
  return new Set(
    (text ?? '')
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_ROLE_WORDS.has(w)),
  );
}

/**
 * Career signal between a mentor and a mentee.
 *
 * Returns the score plus its own reasons so the final list can say
 * "12 yrs more senior · both in IT" rather than a bare number.
 */
function careerScore(
  mentor: {
    graduationYear: number | null;
    sector: string | null;
    currentRole: string | null;
    headline: string | null;
  },
  mentee: {
    graduationYear: number | null;
    sector: string | null;
    currentRole: string | null;
    targetField: string | null;
  },
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // ── Seniority gap ──
  // Graduation year is the only seniority signal available for a student mentee,
  // and it is a good one: someone who finished in 2014 has had a decade more of
  // the career than someone who finished this year. For an ALUMNI mentee it still
  // works, and it is the difference between "peer" and "mentor".
  if (mentor.graduationYear !== null && mentee.graduationYear !== null) {
    const gap = mentee.graduationYear - mentor.graduationYear;
    if (gap >= 5) {
      // Diminishing returns: 8 years of gap is excellent, 30 is not better.
      score += CAREER_WEIGHTS.seniorityGap * Math.min(1, gap / 8);
      reasons.push(`${gap} yrs more senior`);
    } else if (gap >= 2) {
      score += CAREER_WEIGHTS.seniorityGap * 0.4;
      reasons.push(`${gap} yrs more senior`);
    } else if (gap <= 0) {
      // Not penalised — a peer mentor is legitimate. Just not credited.
      reasons.push('roughly peer level');
    }
  }

  // ── Sector ──
  if (mentor.sector && mentee.sector && mentor.sector === mentee.sector) {
    score += CAREER_WEIGHTS.sameSector;
    reasons.push(`both in ${mentor.sector}`);
  }

  // ── Role adjacency ──
  const mWords = roleWords(mentor.currentRole);
  const eWords = roleWords(mentee.currentRole);
  const shared = [...mWords].filter((w) => eWords.has(w));
  if (shared.length > 0) {
    score += CAREER_WEIGHTS.adjacentRole;
    reasons.push(`shares ${shared.slice(0, 2).join(', ')} in their day job`);
  }

  // ── Stated field of interest ──
  if (mentee.targetField) {
    const f = norm(mentee.targetField);
    const inRole = norm(mentor.currentRole ?? '').includes(f) || norm(mentor.headline ?? '').includes(f);
    if (inRole) {
      score += CAREER_WEIGHTS.fieldAlignment;
      reasons.push(`works in ${mentee.targetField}`);
    }
  }

  return { score, reasons };
}

export type MatchSubject = {
  /** Skills the mentee wants help with — stated on the request, plus their real
   *  skills when the mentee is an alumnus. */
  skills: string[];
  graduationYear: number | null;
  sector: string | null;
  currentRole: string | null;
  targetField: string | null;
  /** userIds already in a live pair with this mentee, excluded from results. */
  excludeMentorUserIds: string[];
};

/**
 * Ranked mentor candidates with an explanation for each.
 *
 * `minScore` is a floor, not a sort: a candidate below it is dropped entirely so
 * "Recommended" never contains a 3% match. The office can still ask for the full
 * list via the directory.
 */
export async function matchMentors(
  institutionId: string,
  subject: MatchSubject,
  opts: { limit?: number; minScore?: number } = {},
) {
  const { limit = 12, minScore = 15 } = opts;

  const candidates = await prisma.alumniProfile.findMany({
    where: {
      institutionId,
      engagementStatus: 'ACTIVE',
      userId: { notIn: subject.excludeMentorUserIds },
      // A DRAFT/LOST alumnus is not available to mentor.
      user: { deletedAt: null },
    },
    select: {
      user: { select: { id: true, fullName: true } },
      id: true,
      userId: true,
      graduationYear: true,
      location: true,
      chapterId: true,
      companyId: true,
      currentRole: true,
      headline: true,
      bio: true,
      company: { select: { name: true, sector: true } },
      chapter: { select: { id: true, city: true } },
      skills: { select: { skill: true, level: true } },
    },
  });

  const wanted = new Set(subject.skills.map(norm));

  // Mentor mode REQUIRES demonstrated depth in a shared skill. With no skills
  // stated there is nothing to be deep in, so the skill half is switched off and
  // matching falls back to career signals — otherwise a mentee who wrote "I want
  // career advice" would be shown an empty list with no explanation.
  const useSkills = wanted.size > 0;
  const viewerSkills = [...wanted].map((skill) => ({ skill, level: 'ADVANCED' }));

  const scored = candidates.map((c) => {
    const normSkills = c.skills.map((s) => ({ ...s, skill: norm(s.skill) }));
    const shared = normSkills.filter((s) => wanted.has(s.skill));

    // With skills stated, a candidate sharing NONE of them is a poor match
    // regardless of how senior they are — they cannot help with what was asked.
    // Dropped rather than ranked last, matching the existing mentor-mode rule.
    if (useSkills && shared.length === 0) return null;

    const skillHalf = useSkills
      ? scoreCandidate(viewerSkills, { ...c, skills: normSkills }, {
          graduationYear: subject.graduationYear,
          location: null,
          chapterId: null,
          companyId: null,
        }, true)
      : { score: 0, reasons: [] as string[], eligible: true };

    if (!skillHalf.eligible) return null;

    const career = careerScore(
      {
        graduationYear: c.graduationYear,
        sector: c.company?.sector ?? null,
        currentRole: c.currentRole,
        headline: c.headline,
      },
      {
        graduationYear: subject.graduationYear,
        sector: subject.sector,
        currentRole: subject.currentRole,
        targetField: subject.targetField,
      },
    );

    return {
      mentorProfileId: c.id,
      userId: c.userId,
      name: c.user.fullName,
      graduationYear: c.graduationYear,
      currentRole: c.currentRole,
      headline: c.headline,
      location: c.location,
      company: c.company?.name ?? null,
      sector: c.company?.sector ?? null,
      chapter: c.chapter ? { id: c.chapter.id, city: c.chapter.city } : null,
      skills: c.skills.map((s) => ({ skill: s.skill, level: s.level })),
      sharedSkills: shared.map((s) => s.skill),
      // Skills are the request's explicit ask, so they lead the explanation.
      score: Math.min(100, Math.round(skillHalf.score + career.score)),
      reasons: [...shared.map((s) => `knows ${s.skill}`), ...career.reasons],
    };
  });

  const ranked = scored
    .filter((x): x is NonNullable<typeof x> => x !== null && x.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    // Explicit, because an empty list with no explanation is indistinguishable
    // from a broken screen.
    matchedOnSkills: useSkills,
    candidates: ranked,
  };
}

/** Load the matching subject for a request, from the request plus the mentee. */
export async function subjectForRequest(requestId: string, institutionId: string) {
  const request = await prisma.mentorshipRequest.findFirst({
    where: { id: requestId, institutionId },
    include: {
      menteeAlumniProfile: {
        select: {
          id: true,
          graduationYear: true,
          currentRole: true,
          company: { select: { sector: true } },
          skills: { select: { skill: true } },
          user: { select: { id: true } },
        },
      },
      menteeStudentProfile: {
        select: {
          id: true,
          user: { select: { id: true, fullName: true } },
        },
      },
    },
  });
  if (!request) throw unprocessable('Mentorship request not found');

  // The request states what help is wanted. For an alumni mentee we ALSO union
  // their real skills: someone who did not fill the field in but has "React" on
  // their profile is a perfectly good mentee to match.
  const stated = parseSkillList(request.requestedSkills);
  const actual = (request.menteeAlumniProfile?.skills ?? []).map((s) => s.skill);
  const skills = [...new Set([...stated, ...actual])];

  const livePairs = await prisma.mentorshipPair.findMany({
    where: {
      status: { in: ['PENDING', 'ACTIVE'] },
      OR: [
        { menteeAlumniProfileId: request.menteeAlumniProfileId ?? '__none__' },
        { menteeStudentProfileId: request.menteeStudentProfileId ?? '__none__' },
      ],
    },
    select: { mentorAlumniUserId: true },
  });

  return {
    request,
    subject: {
      skills,
      // A student has no graduation year. Passing null makes the seniority term
      // contribute nothing rather than comparing against a bogus value.
      graduationYear: request.menteeAlumniProfile?.graduationYear ?? null,
      sector: request.menteeAlumniProfile?.company?.sector ?? null,
      currentRole: request.menteeAlumniProfile?.currentRole ?? null,
      targetField: request.field ?? null,
      excludeMentorUserIds: livePairs.map((p) => p.mentorAlumniUserId),
    } satisfies MatchSubject,
  };
}
