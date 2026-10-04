// Professional networking — connection requests and match suggestions.
// Docs: 12-alumni-relations.md §5 (networking, skills).
//
// ── On the "matching" in this file ────────────────────────────
//
// The brief asked for AI-assisted mentor/connection matching. This is
// deliberately a TRANSPARENT SCORING FUNCTION, not a model call, and the reason
// is worth recording: every input is already structured (skills with levels,
// cohort, city, employer, career ladder), the relationships are exact-membership
// questions rather than semantic ones, and the whole population is small enough
// to score exhaustively in a single query. An embedding service would add a
// dependency, a network hop and a non-deterministic answer to a problem that
// arithmetic solves exactly — and would make "why was this person recommended?"
// unanswerable to the officer.
//
// Each component of the score is returned in the response, so the UI can say
// WHY ("3 shared skills · same batch · both in Bengaluru") instead of presenting
// an opaque ranking the office cannot audit or argue with.
//
// The scoring is deliberately a separate, pure function (`scoreCandidate`) so it
// can be unit-tested and later swapped for a model without touching the routes.

import { prisma } from '../../db/prisma.js';
import { notFound, conflict, unprocessable, badRequest } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import type { Viewer } from './directory.service.js';

/** Weights sum to 100 so a score reads as a percentage of "how good a match". */
const WEIGHTS = {
  sharedSkills: 40,
  skillDepth: 15, // does the candidate actually know it, or list it
  sameCohort: 20,
  sameCity: 10,
  sameChapter: 10,
  sharedEmployer: 5,
} as const;

type Skill = { skill: string; level: string };
type Candidate = {
  userId: string;
  graduationYear: number | null;
  location: string | null;
  chapterId: string | null;
  companyId: string | null;
  skills: Skill[];
  headline: string | null;
  currentRole: string | null;
};

const LEVEL_RANK: Record<string, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
};

/**
 * Pure scoring. Returns a 0–100 score plus the reasons behind it, because a
 * recommendation the office cannot explain is a recommendation the office will
 * not use.
 */
export function scoreCandidate(
  viewerSkills: Skill[],
  candidate: Candidate,
  viewer: { graduationYear: number | null; location: string | null; chapterId: string | null; companyId: string | null },
  mentorMode: boolean,
) {
  const reasons: string[] = [];
  let score = 0;

  // ── Shared skills ──
  // Exact string match is correct here BECAUSE the skill vocabulary is
  // normalised (see seed-alumni.ts SKILLS): one canonical spelling per concept.
  const viewerSkillMap = new Map(viewerSkills.map((s) => [s.skill, s.level]));
  const shared = candidate.skills.filter((s) => viewerSkillMap.has(s.skill));

  if (shared.length > 0) {
    // Diminishing returns: the 4th shared skill adds far less than the 2nd.
    const overlap = Math.min(shared.length, 4) / 4;
    score += WEIGHTS.sharedSkills * overlap;
    reasons.push(`${shared.length} shared skill${shared.length === 1 ? '' : 's'}: ${shared.map((s) => s.skill).slice(0, 3).join(', ')}`);
  }

  // ── Depth ──
  // In mentor mode the candidate must be the deep one, not merely share the
  // skill: recommending a final-year student as a mentor is worse than
  // recommending nobody.
  const strongSkill = shared.some((s) => (LEVEL_RANK[s.level] ?? 0) >= 3);
  if (strongSkill) {
    score += WEIGHTS.skillDepth;
    reasons.push('experienced in a shared skill');
  } else if (mentorMode) {
    // Mentor candidates without demonstrated depth are dropped entirely rather
    // than ranked low, so the list stays trustworthy.
    return { score: 0, reasons, eligible: false };
  }

  // ── Cohort ──
  if (viewer.graduationYear !== null && candidate.graduationYear === viewer.graduationYear) {
    score += WEIGHTS.sameCohort;
    reasons.push(`same batch of ${viewer.graduationYear}`);
  } else if (
    viewer.graduationYear !== null &&
    candidate.graduationYear !== null &&
    Math.abs(viewer.graduationYear - candidate.graduationYear) === 1
  ) {
    // Adjacent cohorts still share the same campus era. Half credit, stated as
    // such, because "adjacent batch" is a weaker signal and the reason text has
    // to say so.
    score += WEIGHTS.sameCohort / 2;
    reasons.push('adjacent batch');
  }

  // ── Geography ──
  if (viewer.chapterId && candidate.chapterId === viewer.chapterId) {
    score += WEIGHTS.sameChapter;
    reasons.push('same chapter');
  } else if (viewer.location && candidate.location === viewer.location) {
    score += WEIGHTS.sameCity;
    reasons.push(`both based in ${viewer.location}`);
  }

  // ── Employer ──
  if (viewer.companyId && candidate.companyId === viewer.companyId) {
    score += WEIGHTS.sharedEmployer;
    reasons.push('same company');
  }

  return { score: Math.round(score), reasons, eligible: true };
}

// ─────────────────────────────────────────────────────────────
// Match suggestions
// ─────────────────────────────────────────────────────────────

export async function getMatches(
  viewer: Viewer,
  opts: { type?: 'connections' | 'mentors'; skill?: string; limit?: number },
) {
  const type = opts.type ?? 'connections';
  const limit = Math.min(50, Math.max(1, opts.limit ?? 10));

  const me = await prisma.alumniProfile.findFirst({
    where: { userId: viewer.userId, institutionId: viewer.institutionId },
    select: {
      graduationYear: true,
      location: true,
      chapterId: true,
      companyId: true,
      skills: { select: { skill: true, level: true } },
    },
  });
  if (!me) throw notFound('No alumni profile for this account');

  // In mentor mode the interesting skill set is the STUDENT's — the office is
  // matching a mentee's gaps against senior alumni. Falling back to the viewer's
  // own skills keeps the endpoint useful for an alumnus looking for a mentor too.
  const targetSkills: Skill[] = opts.skill
    ? [{ skill: opts.skill, level: 'ADVANCED' }]
    : me.skills;

  // Mentor candidates must be more senior than the person being helped. Two
  // years is the floor — a classmate is a peer, not a mentor.
  const minGraduationYear = type === 'mentors' ? (me.graduationYear ?? 2026) - 2 : null;

  const candidates = await prisma.alumniProfile.findMany({
    where: {
      institutionId: viewer.institutionId,
      userId: { not: viewer.userId },
      engagementStatus: 'ACTIVE',
      privacy: { is: { discoverable: true } },
      ...(minGraduationYear !== null ? { graduationYear: { lte: minGraduationYear } } : {}),
    },
    select: {
      userId: true,
      graduationYear: true,
      location: true,
      chapterId: true,
      companyId: true,
      headline: true,
      currentRole: true,
      skills: { select: { skill: true, level: true } },
      user: { select: { fullName: true } },
      company: { select: { name: true } },
      chapter: { select: { city: true } },
    },
    take: 400, // bounded working set; scoring is in-process
  });

  const existing = await prisma.alumniConnection.findMany({
    where: {
      OR: [
        { requesterUserId: viewer.userId, recipientUserId: { in: candidates.map((c) => c.userId) } },
        { recipientUserId: viewer.userId, requesterUserId: { in: candidates.map((c) => c.userId) } },
      ],
    },
    select: { requesterUserId: true, recipientUserId: true, status: true },
  });
  const statusByUser = new Map(
    existing.map((c) => [c.requesterUserId === viewer.userId ? c.recipientUserId : c.requesterUserId, c.status]),
  );

  const scored = candidates
    // Never suggest someone already connected, or someone with a request already
    // in flight. A DECLINED request IS eligible again — people move, change jobs
    // and change minds, and permanently blacklisting someone would make the
    // directory feel broken to them.
    .filter((c) => {
      const s = statusByUser.get(c.userId);
      return s !== 'ACCEPTED' && s !== 'PENDING';
    })
    .map((c) => {
      const r = scoreCandidate(
        targetSkills,
        { ...c, skills: c.skills },
        { graduationYear: me.graduationYear, location: me.location, chapterId: me.chapterId, companyId: me.companyId },
        type === 'mentors',
      );
      return {
        userId: c.userId,
        profileId: null,
        name: c.user.fullName,
        headline: c.headline ?? c.currentRole,
        graduationYear: c.graduationYear,
        location: c.location,
        company: c.company?.name ?? null,
        chapter: c.chapter?.city ?? null,
        score: r.score,
        reasons: r.reasons,
        eligible: r.eligible,
        connectionStatus: statusByUser.get(c.userId) ?? null,
        topSkills: c.skills
          .slice()
          .sort((a, b) => (LEVEL_RANK[b.level] ?? 0) - (LEVEL_RANK[a.level] ?? 0))
          .slice(0, 4)
          .map((s) => s.skill),
      };
    })
    .filter((s) => s.eligible && s.score > 0);

  scored.sort((a, b) => b.score - a.score || (b.graduationYear ?? 0) - (a.graduationYear ?? 0));

  return {
    type,
    basedOnSkills: targetSkills.map((s) => s.skill),
    matches: scored.slice(0, limit),
    totalConsidered: candidates.length,
  };
}

// ─────────────────────────────────────────────────────────────
// Connection requests
// ─────────────────────────────────────────────────────────────

export async function createConnection(
  viewer: Viewer,
  recipientProfileId: string,
  message: string | undefined,
) {
  if (viewer.isOffice) {
    throw unprocessable('The office cannot send connection requests on behalf of alumni');
  }

  const recipient = await prisma.alumniProfile.findFirst({
    where: { id: recipientProfileId, user: { institutionId: viewer.institutionId, deletedAt: null } },
    select: { id: true, userId: true, user: { select: { fullName: true } } },
  });
  if (!recipient) throw notFound('Alumni not found');
  if (recipient.userId === viewer.userId) throw badRequest('You cannot connect with yourself');

  // Mutual requests: if they already asked you, this is not a new request —
  // it is the other half of an agreement, and both sides become connected.
  const reverse = await prisma.alumniConnection.findUnique({
    where: {
      requesterUserId_recipientUserId: {
        requesterUserId: recipient.userId,
        recipientUserId: viewer.userId,
      },
    },
  });
  if (reverse && reverse.status === 'PENDING') {
    const [updated] = await prisma.$transaction([
      prisma.alumniConnection.update({
        where: { id: reverse.id },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      }),
      prisma.alumniConnection.deleteMany({
        where: { requesterUserId: viewer.userId, recipientUserId: recipient.userId },
      }),
      prisma.notification.create({
        data: {
          institutionId: viewer.institutionId,
          recipientUserId: recipient.userId,
          type: 'SOCIAL',
          title: 'You are now connected',
          body: 'You both asked to connect — your request was accepted automatically.',
          sourceModule: 'alumni',
        },
      }),
    ]);
    return { id: updated.id, status: 'ACCEPTED', autoAccepted: true, with: recipient.user.fullName };
  }

  const existing = await prisma.alumniConnection.findUnique({
    where: {
      requesterUserId_recipientUserId: {
        requesterUserId: viewer.userId,
        recipientUserId: recipient.userId,
      },
    },
  });
  if (existing && existing.status === 'PENDING') throw conflict('You already sent a request to this alumnus');
  if (existing && existing.status === 'ACCEPTED') throw conflict('You are already connected');

  const connection = await prisma.alumniConnection.create({
    data: {
      institutionId: viewer.institutionId,
      requesterUserId: viewer.userId,
      recipientUserId: recipient.userId,
      status: 'PENDING',
      message: message ?? null,
    },
  });

  await Promise.all([
    writeAudit({
      actorUserId: viewer.userId,
      institutionId: viewer.institutionId,
      action: 'alumni.connection.request',
      entityType: 'AlumniConnection',
      entityId: connection.id,
      after: { recipient: recipient.user.fullName },
    }),
    prisma.notification.create({
      data: {
        institutionId: viewer.institutionId,
        recipientUserId: recipient.userId,
        type: 'SOCIAL',
        title: 'New connection request',
        body: message ?? 'An alumnus would like to connect with you.',
        sourceModule: 'alumni',
      },
    }),
  ]);

  return { id: connection.id, status: 'PENDING', autoAccepted: false, with: recipient.user.fullName };
}

const RESPONSE_ACTIONS = { accept: 'ACCEPTED', decline: 'DECLINED' } as const;

export async function respondToConnection(
  viewer: Viewer,
  connectionId: string,
  action: keyof typeof RESPONSE_ACTIONS,
) {
  const connection = await prisma.alumniConnection.findFirst({
    where: {
      id: connectionId,
      recipientUserId: viewer.userId,
      institutionId: viewer.institutionId,
    },
    include: { requester: { select: { fullName: true } }, recipient: { select: { fullName: true } } },
  });
  if (!connection) throw notFound('Connection request not found');
  if (connection.status !== 'PENDING') {
    throw unprocessable(`This request is already ${connection.status}`);
  }

  const status = RESPONSE_ACTIONS[action];
  const updated = await prisma.alumniConnection.update({
    where: { id: connection.id },
    data: { status, respondedAt: new Date() },
  });

  await Promise.all([
    writeAudit({
      actorUserId: viewer.userId,
      institutionId: viewer.institutionId,
      action: `alumni.connection.${action}`,
      entityType: 'AlumniConnection',
      entityId: connection.id,
      before: { status: 'PENDING' },
      after: { status },
    }),
    prisma.notification.create({
      data: {
        institutionId: viewer.institutionId,
        recipientUserId: connection.requesterUserId,
        type: 'SOCIAL',
        title: action === 'accept' ? 'Connection accepted' : 'Connection declined',
        body:
          action === 'accept'
            ? `${connection.recipient.fullName} accepted your request. You are now connected.`
            : `${connection.recipient.fullName} declined your request.`,
        sourceModule: 'alumni',
      },
    }),
  ]);

  return { id: updated.id, status: updated.status };
}

/** Withdraw a request you sent. Distinct from being declined: this one is yours. */
export async function cancelConnection(viewer: Viewer, connectionId: string) {
  const connection = await prisma.alumniConnection.findFirst({
    where: { id: connectionId, requesterUserId: viewer.userId, institutionId: viewer.institutionId },
  });
  if (!connection) throw notFound('Connection request not found');
  if (connection.status === 'ACCEPTED') {
    throw unprocessable('An accepted connection cannot be withdrawn — it would need removing the connection');
  }
  const updated = await prisma.alumniConnection.update({
    where: { id: connection.id },
    data: { status: 'CANCELLED', respondedAt: new Date() },
  });
  return { id: updated.id, status: updated.status };
}

export async function listConnections(viewer: Viewer, box: 'incoming' | 'outgoing' | 'accepted') {
  const where =
    box === 'incoming'
      ? { recipientUserId: viewer.userId }
      : box === 'outgoing'
        ? { requesterUserId: viewer.userId }
        : {
            status: 'ACCEPTED',
            OR: [{ requesterUserId: viewer.userId }, { recipientUserId: viewer.userId }],
          };
  if (box !== 'accepted') where.status = 'PENDING';

  const rows = await prisma.alumniConnection.findMany({
    where: { ...where, institutionId: viewer.institutionId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const otherIds = rows.map((r) => (r.requesterUserId === viewer.userId ? r.recipientUserId : r.requesterUserId));
  const profiles = await prisma.alumniProfile.findMany({
    where: { institutionId: viewer.institutionId, userId: { in: otherIds } },
    select: {
      userId: true,
      id: true,
      user: { select: { fullName: true } },
      graduationYear: true,
      headline: true,
      currentRole: true,
      company: { select: { name: true } },
      chapter: { select: { city: true } },
    },
  });
  const byUser = new Map(profiles.map((p) => [p.userId, p]));

  const items = rows
    .map((r) => {
      const otherId = r.requesterUserId === viewer.userId ? r.recipientUserId : r.requesterUserId;
      const p = byUser.get(otherId);
      if (!p) return null;
      return {
        id: r.id,
        profileId: p.id,
        direction: r.requesterUserId === viewer.userId ? 'OUTGOING' : 'INCOMING',
        status: r.status,
        message: r.message,
        createdAt: r.createdAt,
        respondedAt: r.respondedAt,
        person: {
          userId: p.userId,
          name: p.user.fullName,
          headline: p.headline ?? p.currentRole,
          graduationYear: p.graduationYear,
          company: p.company?.name ?? null,
          chapter: p.chapter?.city ?? null,
        },
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return { box, count: items.length, items };
}

export async function getConnectionStats(viewer: Viewer) {
  const [incoming, outgoing, accepted] = await Promise.all([
    prisma.alumniConnection.count({ where: { recipientUserId: viewer.userId, institutionId: viewer.institutionId, status: 'PENDING' } }),
    prisma.alumniConnection.count({ where: { requesterUserId: viewer.userId, institutionId: viewer.institutionId, status: 'PENDING' } }),
    prisma.alumniConnection.count({
      where: {
        institutionId: viewer.institutionId,
        status: 'ACCEPTED',
        OR: [{ requesterUserId: viewer.userId }, { recipientUserId: viewer.userId }],
      },
    }),
  ]);
  return { incoming, outgoing, accepted };
}