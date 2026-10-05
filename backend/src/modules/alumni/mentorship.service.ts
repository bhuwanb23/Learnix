// Mentorship: requests, pairs, and the office's view of the programme.
// Docs: 12-alumni-relations.md §3.5 · §4
//
// ─────────────────────────────────────────────────────────────
// The flow this file implements
// ─────────────────────────────────────────────────────────────
//   mentee requests  →  mentor accepts  →  pair becomes ACTIVE
//                          ↓
//                     declined (with a reason)
// A request is a separate table from a pair, because a pair should not exist
// until somebody has accepted. Previously the ONLY way to create a pair was an
// office-only endpoint that paired the mentor with "the first active student
// profile in the institution" — a demo stub, so the Requests tab could only ever
// be filled by an accident of database ordering.
//
// ─────────────────────────────────────────────────────────────
// Why `viewerContext` again
// ─────────────────────────────────────────────────────────────
// The mentee may be an alumnus (this app) or a student (no UI). The office may
// act on either. So the screen cannot decide "am I the mentor?" from the data it
// happens to have — the server states it, exactly as chapters and events do.

import { prisma } from '../../db/prisma.js';
import { conflict, forbidden, notFound, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { officeUserIds } from './directory.service.js';
import { notify, notifyMany } from './notifications/notifications.delivery.js';
import type { Viewer } from './directory.service.js';

export const PAIR_STATUSES = ['PENDING', 'ACTIVE', 'DECLINED', 'COMPLETED'] as const;
export const REQUEST_STATUSES = ['PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN'] as const;

/** Everything a pair needs for a card, resolved for either mentee type. */
const pairInclude = {
  mentorAlumniUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
      alumniProfile: {
        select: {
          id: true,
          graduationYear: true,
          currentRole: true,
          headline: true,
          location: true,
          skills: { select: { skill: true, level: true }, take: 8 },
        },
      },
    },
  },
menteeStudentProfile: {
    select: {
      id: true,
      rollNo: true,
      // Without these the mentee card had nothing but a name and a roll number:
      // "Sem 5 · 21CS042" is how a student actually recognises themselves.
      section: true,
      currentSemester: true,
      user: { select: { id: true, fullName: true, email: true } },
    },
  },

  menteeAlumniProfile: {
    select: {
      id: true,
      graduationYear: true,
      currentRole: true,
      headline: true,
      location: true,
      company: { select: { name: true } },
      user: { select: { id: true, fullName: true, email: true } },
      skills: { select: { skill: true, level: true }, take: 8 },
    },
  },
  sessions: { orderBy: { sessionDate: 'desc' as const } },
  goals: { orderBy: { createdAt: 'asc' as const } },
  feedback: { select: { id: true, authorUserId: true, mentorRating: true, menteeRating: true, comment: true, createdAt: true } },
} as const;

type PairRow = {
  id: string;
  field: string;
  status: string;
  requestedAt: Date;
  approvedAt: Date | null;
  completedAt: Date | null;
  declinedReason: string | null;
  nextSessionAt: Date | null;
  matchScore: number | null;
  matchReasons: string | null;
  mentorAlumniUserId: string;
  menteeStudentProfileId: string | null;
  menteeAlumniProfileId: string | null;
  mentorAlumniUser: NonNullable<(typeof pairInclude)['mentorAlumniUser']['select']> extends never
    ? never
    : any;
  menteeStudentProfile: any;
  menteeAlumniProfile: any;
  sessions: any[];
  goals: any[];
  feedback: any[];
};

function parseReasons(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * Shape a pair for the UI. One function for both mentee types, so a screen never
 * has to branch on which side is set — the response always has a `mentee` object
 * with a `kind`.
 */
export function mapPair(p: PairRow) {
  const student = p.menteeStudentProfile;
  const alum = p.menteeAlumniProfile;
  const sessionsHeld = p.sessions.filter((s) => !s.planned && !s.cancelledAt);
  const upcoming = p.sessions.find((s) => s.planned && !s.cancelledAt) ?? null;

  const goalsAchieved = p.goals.filter((g) => g.status === 'ACHIEVED').length;
  const goalsLive = p.goals.filter((g) => g.status !== 'DROPPED').length;

  const mentorRatings = p.feedback.map((f) => f.mentorRating).filter((x): x is number => x != null);
  const menteeRatings = p.feedback.map((f) => f.menteeRating).filter((x): x is number => x != null);

  return {
    id: p.id,
    field: p.field,
    status: p.status,
    requestedAt: p.requestedAt,
    approvedAt: p.approvedAt,
    completedAt: p.completedAt,
    declinedReason: p.declinedReason,
    // The real next session, falling back to the column the office sets by hand.
    nextSessionAt: upcoming?.sessionDate ?? p.nextSessionAt,
    nextSessionId: upcoming?.id ?? null,
    matchScore: p.matchScore,
    matchReasons: parseReasons(p.matchReasons),
    mentor: {
      userId: p.mentorAlumniUser.id,
      profileId: p.mentorAlumniUser.alumniProfile?.id ?? null,
      name: p.mentorAlumniUser.fullName,
      batch: p.mentorAlumniUser.alumniProfile?.graduationYear ?? null,
      role: p.mentorAlumniUser.alumniProfile?.currentRole ?? null,
      headline: p.mentorAlumniUser.alumniProfile?.headline ?? null,
      location: p.mentorAlumniUser.alumniProfile?.location ?? null,
      skills: p.mentorAlumniUser.alumniProfile?.skills ?? [],
    },
    mentee: {
      kind: alum ? 'ALUMNI' : 'STUDENT',
      userId: alum?.user.id ?? student?.user.id ?? null,
      profileId: alum?.id ?? student?.id ?? null,
      name: alum?.user.fullName ?? student?.user.fullName ?? 'Unknown',
      email: alum?.user.email ?? student?.user.email ?? null,
      batch: alum?.graduationYear ?? null,
      role: alum?.currentRole ?? null,
      headline: alum?.headline ?? null,
      company: alum?.company?.name ?? null,
      // Students are identified by batch + roll, which is what they actually
      // recognise themselves by.
year: student?.currentSemester ?? null,
      rollNo: student?.rollNo ?? null,
      section: student?.section ?? null,

      skills: alum?.skills ?? [],
    },
    sessions: {
      held: sessionsHeld.length,
      totalMinutes: sessionsHeld.reduce((s: number, x: any) => s + (x.durationMinutes ?? 0), 0),
      lastAt: sessionsHeld[0]?.sessionDate ?? null,
    },
    goals: {
      total: goalsLive,
      achieved: goalsAchieved,
      percent: goalsLive === 0 ? null : Math.round((goalsAchieved / goalsLive) * 100),
    },
    feedback: {
      // Each side's view of the OTHER, so the two numbers can never be confused
      // on screen: `ofMentor` is what mentees said about this mentor.
      ofMentor: mentorRatings.length
        ? Math.round((mentorRatings.reduce((a, b) => a + b, 0) / mentorRatings.length) * 10) / 10
        : null,
      ofMentee: menteeRatings.length
        ? Math.round((menteeRatings.reduce((a, b) => a + b, 0) / menteeRatings.length) * 10) / 10
        : null,
      count: p.feedback.length,
    },
  };
}

/**
 * The programme list.
 *
 * `scope=history` exists because the previous version filtered to ACTIVE and
 * PENDING only — so a declined pair VANISHED the moment you declined it, with no
 * record and no way to reverse the decision. History is not a luxury when the
 * office has to explain to a mentee why nobody ever replied.
 */
export async function listMentorship(
  institutionId: string,
  query: { scope?: 'active' | 'pending' | 'history' | 'all'; viewer?: Viewer } = {},
) {
  const scope = query.scope ?? 'active';

  const statusFilter =
    scope === 'active'
      ? { in: ['PENDING', 'ACTIVE'] }
      : scope === 'pending'
        ? { in: ['PENDING'] }
        : scope === 'history'
          ? { in: ['DECLINED', 'COMPLETED'] }
          : undefined;

  const pairs = await prisma.mentorshipPair.findMany({
    where: {
      // Institution scope is reached through EITHER mentee side. A pair created
      // before the mentee became polymorphic has a student mentee and a
      // null-scoped student relation, so scoping on the alumni side alone would
      // hide every existing pair.
      OR: [
        { menteeStudentProfile: { user: { institutionId } } },
        { menteeAlumniProfile: { institutionId } },
      ],
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: pairInclude,
    orderBy: [{ status: 'asc' }, { requestedAt: 'desc' }],
  });

  const all = pairs.map((p) => mapPair(p as PairRow));

// `pairId: { in }` rather than a relation filter: it is one flat indexed lookup
  // instead of a join, and it cannot drift as the pair's mentee relations change.
  const pairIds = pairs.map((p) => p.id);
  const goalsAgg =
    pairIds.length === 0
      ? []
      : await prisma.mentorshipGoal.groupBy({
          by: ['status'],
          where: { pairId: { in: pairIds } },
          _count: { _all: true },
        });

  return {
    scope,
    active: all.filter((p) => p.status === 'ACTIVE'),
    pending: all.filter((p) => p.status === 'PENDING'),
    history: all.filter((p) => p.status === 'DECLINED' || p.status === 'COMPLETED'),
    // Scoped to ACTIVE pairs only. The previous version flattened sessions across
    // every pair and the client rendered that inside the "Active Pairs" tab, so a
    // declined pair's session appeared under active ones.
    recentSessions: pairs
      .filter((p) => p.status === 'ACTIVE')
      .flatMap((p) =>
        (p as PairRow).sessions
          .filter((s: any) => !s.planned && !s.cancelledAt)
          .slice(0, 2)
          .map((s: any) => ({
            id: s.id,
            pairId: p.id,
            mentor: p.mentorAlumniUser.fullName,
            mentee:
              p.menteeAlumniProfile?.user.fullName ?? p.menteeStudentProfile?.user.fullName ?? 'Unknown',
            field: p.field,
            sessionDate: s.sessionDate,
            durationMinutes: s.durationMinutes,
            mode: s.mode,
            notes: s.notes,
          })),
      )
      .sort((a: any, b: any) => b.sessionDate.getTime() - a.sessionDate.getTime())
      .slice(0, 8),
    stats: {
      active: all.filter((p) => p.status === 'ACTIVE').length,
      pending: all.filter((p) => p.status === 'PENDING').length,
      // NEW: how many are alumni↔alumni. Both kinds are now supported, so a total
      // with no breakdown hides which programme shape is growing.
      alumniToAlumni: all.filter((p) => p.status === 'ACTIVE' && p.mentee.kind === 'ALUMNI').length,
      alumniToStudent: all.filter((p) => p.status === 'ACTIVE' && p.mentee.kind === 'STUDENT').length,
      sessionsHeld: all.reduce((s, p) => s + p.sessions.held, 0),
      goalsAchieved: goalsAgg.find((g) => g.status === 'ACHIEVED')?._count?._all ?? 0,
      avgRatingOfMentors: (() => {
        const ratings = all.map((p) => p.feedback.ofMentor).filter((x): x is number => x != null);
        return ratings.length
          ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
          : null;
      })(),
    },
  };
}

/**
 * Lightweight institution check for a pair, for the read paths that only need
 * "may this caller see this pair at all" and should not pay for the full
 * `getPair` include graph.
 *
 * `/mentorship/:id/progress` previously took a bare pairId with no scoping
 * whatsoever, so any authenticated caller in any module could read another
 * institution's goal progress by guessing an id.
 */
export async function assertPairInInstitution(institutionId: string, pairId: string) {
  const pair = await prisma.mentorshipPair.findFirst({
    where: {
      id: pairId,
      OR: [
        { menteeStudentProfile: { user: { institutionId } } },
        { menteeAlumniProfile: { institutionId } },
      ],
    },
    select: { id: true },
  });
  if (!pair) throw notFound('Mentorship pair not found');
}

/**
 * The stricter version, for reads that describe the relationship itself — the
 * goal counts and the time two people have spent together.
 *
 * `assertPairInInstitution` is deliberately only an institution check, which is
 * the right bar for the pair card in the office's own list. But `/progress`
 * would otherwise let any alumnus in the institution read how many meetings
 * somebody else's mentorship has had, which is not their business.
 */
export async function assertPairReadable(viewer: Viewer, pairId: string) {
  const pair = await prisma.mentorshipPair.findFirst({
    where: {
      id: pairId,
      OR: [
        { menteeStudentProfile: { user: { institutionId: viewer.institutionId } } },
        { menteeAlumniProfile: { institutionId: viewer.institutionId } },
      ],
    },
    select: {
      id: true,
      mentorAlumniUserId: true,
      menteeAlumniProfile: { select: { userId: true } },
      menteeStudentProfile: { select: { user: { select: { id: true } } } },
    },
  });
  if (!pair) throw notFound('Mentorship pair not found');

  const participant =
    viewer.userId === pair.mentorAlumniUserId ||
    viewer.userId === pair.menteeAlumniProfile?.userId ||
    viewer.userId === pair.menteeStudentProfile?.user.id;
  if (!(participant || viewer.isOffice)) {
    throw forbidden('Only a participant or the Alumni Relations Office can read this mentorship');
  }
  return pair;
}

/** One pair, with the caller's permissions resolved server-side. */

export async function getPair(institutionId: string, pairId: string, viewer?: Viewer) {
  const pair = await prisma.mentorshipPair.findFirst({
    where: {
      id: pairId,
      OR: [
        { menteeStudentProfile: { user: { institutionId } } },
        { menteeAlumniProfile: { institutionId } },
      ],
    },
    include: pairInclude,
  });
  if (!pair) throw notFound('Mentorship pair not found');

  const shaped = mapPair(pair as PairRow);
  const uid = viewer?.userId;

  return {
    ...shaped,
    sessions: {
      ...shaped.sessions,
      // Full log, not just the summary. Planned sessions first so an upcoming one
      // is the first thing read.
      log: (pair as PairRow).sessions
        .map((s: any) => ({
          id: s.id,
          sessionDate: s.sessionDate,
          notes: s.notes,
          durationMinutes: s.durationMinutes,
          mode: s.mode,
          agenda: s.agenda,
          outcome: s.outcome,
          planned: s.planned,
          cancelledAt: s.cancelledAt,
          loggedByUserId: s.loggedByUserId,
        }))
        .sort((a: any, b: any) => {
          if (a.planned !== b.planned) return a.planned ? -1 : 1;
          return b.sessionDate.getTime() - a.sessionDate.getTime();
        }),
    },
    goals: (pair as PairRow).goals.map((g: any) => ({
      id: g.id,
      title: g.title,
      detail: g.detail,
      status: g.status,
      progressPct: g.progressPct,
      targetDate: g.targetDate,
      achievedAt: g.achievedAt,
      createdByUserId: g.createdByUserId,
      updatedByUserId: g.updatedByUserId,
      createdAt: g.createdAt,
    })),
    feedback: (pair as PairRow).feedback.map((f: any) => ({
      id: f.id,
      authorUserId: f.authorUserId,
      mentorRating: f.mentorRating,
      menteeRating: f.menteeRating,
      comment: f.comment,
      createdAt: f.createdAt,
      isMine: uid ? f.authorUserId === uid : false,
    })),
    viewerContext: pairContext(viewer, shaped),
  };
}

/**
 * Who may do what on this pair.
 *
 * The office can always administer. Otherwise exactly one side can: the mentor, or
 * the mentee. A MENTEE WHO IS A STUDENT has no UI in this app, so every flag for
 * them is false and the office is the actor — which is honest about a real
 * limitation rather than pretending a button works.
 */
function pairContext(viewer: Viewer | undefined, p: ReturnType<typeof mapPair>) {
  const office = viewer?.isOffice ?? false;
  const uid = viewer?.userId ?? null;
  const isMentor = !!uid && uid === p.mentor.userId;
  const isMentee = !!uid && uid === p.mentee.userId;
  const participant = isMentor || isMentee;
  const active = p.status === 'ACTIVE';
  return {
    isOffice: office,
    isMentor,
    isMentee,
    isParticipant: participant,
    // Sessions can be scheduled once the pair exists and is not finished.
    canLogSession: (participant || office) && active,
    canScheduleSession: (participant || office) && active,
    canManageGoals: (participant || office) && active,
    canLeaveFeedback: participant && active,
    canRemind: office || isMentor,
    // Only the office may end a pair, or either party may withdraw from it.
    canComplete: office || participant,
    canEndPair: office,
  };
}

// ─────────────────────────────────────────────────────────────
// Requests
// ─────────────────────────────────────────────────────────────

/** Resolve the caller's mentee identity — an alumnus here, or a student. */
async function resolveMentee(viewer: Viewer, body: { alumniProfileId?: string; studentProfileId?: string }) {
  if (viewer.isOffice) {
    // The office enroles on someone's behalf; it has no mentee identity of its own.
    if (body.alumniProfileId) {
      const p = await prisma.alumniProfile.findFirst({
        where: { id: body.alumniProfileId, institutionId: viewer.institutionId },
        select: { id: true, userId: true },
      });
      if (!p) throw notFound('Alumni profile not found');
      return { userId: p.userId, alumniProfileId: p.id, studentProfileId: null as string | null };
    }
    if (body.studentProfileId) {
      const p = await prisma.studentProfile.findFirst({
        where: { id: body.studentProfileId, user: { institutionId: viewer.institutionId } },
        select: { id: true, userId: true },
      });
      if (!p) throw notFound('Student profile not found');
      return { userId: p.userId, alumniProfileId: null as string | null, studentProfileId: p.id };
    }
    throw unprocessable('Specify alumniProfileId or studentProfileId when enrolling on behalf of someone');
  }

// Not the office, so they are requesting for themselves. An alumnus has an
  // AlumniProfile; a student has a StudentProfile. Both are legitimate mentees —
  // the student path is what the `/student/mentorship` routes depend on, and
  // before this it threw "Only an alumnus can request a mentor", which is how the
  // student mentee side stayed permanently unreachable.
  const profile = await prisma.alumniProfile.findFirst({
    where: { userId: viewer.userId, institutionId: viewer.institutionId },
    select: { id: true, userId: true },
  });
  if (profile) return { userId: viewer.userId, alumniProfileId: profile.id, studentProfileId: null };

  const student = await prisma.studentProfile.findFirst({
    where: { userId: viewer.userId, institutionId: viewer.institutionId },
    select: { id: true, userId: true },
  });
  if (student) return { userId: viewer.userId, alumniProfileId: null, studentProfileId: student.id };

  throw unprocessable('Only an alumnus or a student can request a mentor from this app');
}


export async function createRequest(
  viewer: Viewer,
  body: {
    alumniProfileId?: string;
    studentProfileId?: string;
    requestedSkills?: string;
    message?: string;
    field?: string;
    mentorUserId?: string;
  },
) {
  const mentee = await resolveMentee(viewer, body);

  // One live request at a time. Enforced here rather than by a partial unique
  // index because the mentee side is polymorphic — "either column" is not
  // expressible in SQLite, and silently allowing five open requests from one
  // person would make the mentor's inbox unusable.
  const open = await prisma.mentorshipRequest.findFirst({
    where: { menteeUserId: mentee.userId, status: 'PENDING' },
    select: { id: true, status: true },
  });
  if (open) throw conflict('You already have a mentorship request awaiting a response');

  // Chosen up front? Then honour it. Otherwise the office/matching picks later.
  let mentorUserId = body.mentorUserId ?? null;
  let matchScore: number | null = null;
  let matchReasons: string | null = null;
  if (mentorUserId) {
    const mentor = await prisma.alumniProfile.findFirst({
      where: { userId: mentorUserId, institutionId: viewer.institutionId, engagementStatus: 'ACTIVE' },
      select: { userId: true },
    });
    if (!mentor) throw notFound('That mentor is not available');
    // Requesting yourself is a real possibility when the office fills the form.
    if (mentorUserId === mentee.userId) throw unprocessable('You cannot request yourself as a mentor');
  }

  const request = await prisma.mentorshipRequest.create({
    data: {
      institutionId: viewer.institutionId,
      menteeUserId: mentee.userId,
      menteeAlumniProfileId: mentee.alumniProfileId,
      menteeStudentProfileId: mentee.studentProfileId,
      requestedSkills: body.requestedSkills?.trim() || null,
      message: body.message?.trim() || null,
      field: body.field?.trim() || null,
      mentorAlumniUserId: mentorUserId,
      matchScore,
      matchReasons,
    },
  });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'mentorship.request.create',
    entityType: 'MentorshipRequest',
    entityId: request.id,
    after: { skills: request.requestedSkills, field: request.field },
  });

  // The office is told a request arrived. This notification did not exist before:
  // the only three writes in this file all pointed OUTWARD (decision → mentee,
  // reminder → mentor), so the queue the office actually works from was silent. A
  // mentee could have asked for help and nothing would have happened until somebody
  // happened to open the Mentorship tab.
  //
  // `respectMutes: false` — this is work, not news. See notifications.delivery.ts.
  const office = await officeUserIds(viewer.institutionId);
  if (office.length > 0) {
    // The name is read from `users`, not from the profile: a mentee is either an
    // alumnus or a student, so there is no single profile table to join, and the
    // office approving a queue needs to know who is asking.
    const menteeUser = await prisma.user.findFirst({
      where: { id: mentee.userId, institutionId: viewer.institutionId },
      select: { fullName: true },
    });

    await notifyMany({
      institutionId: viewer.institutionId,
      recipientUserIds: office,
      category: 'MENTORSHIP',
      title: `New mentorship request${request.field ? ` for ${request.field}` : ''}`,
      body:
        `${menteeUser?.fullName ?? 'A mentee'} is asking for help` +
        `${matchScore !== null ? ` (best match ${matchScore}%)` : ''}. ` +
        'Open Mentorship → Requests to approve or decline.',
      // Per request. If the same request is somehow re-notified, it does not double.
      dedupeKey: `mentorship-request:${request.id}`,
      data: { requestId: request.id, field: request.field, matchScore },
      respectMutes: false,
    });
  }

  return {
    id: request.id,
    status: request.status,
    requestedSkills: request.requestedSkills,
    field: request.field,
    mentorUserId: request.mentorAlumniUserId,
  };
}

export async function listRequests(
  institutionId: string,
  query: { status?: string; forMentor?: boolean; viewer?: Viewer } = {},
) {
  const viewer = query.viewer;
  const where: Record<string, unknown> = { institutionId };
  if (query.status) where.status = query.status;

  // "For mentor" = requests addressed to me. A request with no chosen mentor is
  // the open pool anyone can pick up.
  if (query.forMentor && viewer) {
    where.OR = [{ mentorAlumniUserId: viewer.userId }, { mentorAlumniUserId: null }];
  } else if (!viewer?.isOffice) {
    where.menteeUserId = viewer!.userId;
  }

  const rows = await prisma.mentorshipRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      menteeUser: { select: { id: true, fullName: true, email: true } },
      mentorAlumniUser: { select: { id: true, fullName: true } },
      menteeAlumniProfile: { select: { graduationYear: true, currentRole: true, company: { select: { name: true } } } },
      menteeStudentProfile: { select: { rollNo: true, section: true, currentSemester: true } },
    },
  });

  return {
    count: rows.length,
    requests: rows.map((r) => ({
      id: r.id,
      status: r.status,
      requestedSkills: r.requestedSkills,
      message: r.message,
      field: r.field,
      matchScore: r.matchScore,
      matchReasons: parseReasons(r.matchReasons),
      createdAt: r.createdAt,
      respondedAt: r.respondedAt,
      declineReason: r.declineReason,
      mentor: r.mentorAlumniUser ? { userId: r.mentorAlumniUser.id, name: r.mentorAlumniUser.fullName } : null,
      mentorUserId: r.mentorAlumniUserId,
      pairId: r.pairId,
      mentee: {
        userId: r.menteeUser.id,
        name: r.menteeUser.fullName,
        kind: r.menteeAlumniProfileId ? 'ALUMNI' : 'STUDENT',
        batch: r.menteeAlumniProfile?.graduationYear ?? null,
        role: r.menteeAlumniProfile?.currentRole ?? null,
        company: r.menteeAlumniProfile?.company?.name ?? null,
        year: r.menteeStudentProfile?.currentSemester ?? null,
        rollNo: r.menteeStudentProfile?.rollNo ?? null,
      },
    })),
  };
}

/**
 * Accept or decline a request.
 *
 * Accepting CREATES THE PAIR — the pair does not exist before this moment, which
 * is the whole reason requests are their own table.
 */
export async function decideRequest(
  viewer: Viewer,
  requestId: string,
  action: 'accept' | 'decline',
  body: { mentorUserId?: string; reason?: string } = {},
) {
  const request = await prisma.mentorshipRequest.findFirst({
    where: { id: requestId, institutionId: viewer.institutionId },
    include: {
      menteeAlumniProfile: { select: { id: true } },
      menteeStudentProfile: { select: { id: true } },
      mentorAlumniUser: { select: { id: true, fullName: true } },
    },
  });
  if (!request) throw notFound('Mentorship request not found');
  if (request.status !== 'PENDING') {
    throw unprocessable(`That request was already ${request.status.toLowerCase()}`);
  }

// A mentee may withdraw their own request; they may not accept it.
  const isAddressedMentor = request.mentorAlumniUserId === viewer.userId;
  if (action === 'accept' && !(viewer.isOffice || isAddressedMentor)) {
    throw forbidden('Only the mentor or the Alumni Relations Office can accept this request');
  }

  if (action === 'decline') {
    // A reason is required. "Declined" with no explanation is the single most
    // common way a mentee concludes the programme does not work.
    if (!body.reason || body.reason.trim().length < 5) {
      throw unprocessable('Give the mentee a reason (at least 5 characters)');
    }
    const updated = await prisma.mentorshipRequest.update({
      where: { id: request.id },
      data: { status: 'DECLINED', respondedAt: new Date(), declineReason: body.reason.trim() },
    });
    await Promise.all([
      writeAudit({
        actorUserId: viewer.userId,
        institutionId: viewer.institutionId,
        action: 'mentorship.request.decline',
        entityType: 'MentorshipRequest',
        entityId: request.id,
        after: { reason: body.reason.trim() },
      }),
      // Routed through delivery rather than written directly, so the mentee's
      // "mentorship" mute applies. A decline is arguably not optional news — but it
      // is still the mentee's own mail, and they asked for the setting.
      notify({
        institutionId: viewer.institutionId,
        recipientUserId: request.menteeUserId,
        category: 'MENTORSHIP',
        title: 'Mentorship request declined',
        body: body.reason.trim(),
        dedupeKey: `mentorship-decline:${request.id}`,
        data: { requestId: request.id },
      }),
    ]);
    return { id: updated.id, status: updated.status, declineReason: updated.declineReason };
  }

  // ── accept ──
  const mentorUserId = body.mentorUserId ?? request.mentorAlumniUserId ?? viewer.userId;
  const mentor = await prisma.alumniProfile.findFirst({
    where: { userId: mentorUserId, institutionId: viewer.institutionId, engagementStatus: 'ACTIVE' },
    select: { userId: true, currentRole: true },
  });
  if (!mentor) throw notFound('That mentor is not available');
  if (mentorUserId === request.menteeUserId) {
    throw unprocessable('A person cannot mentor themselves');
  }

  // Service-level duplicate guard. The `@@unique([mentorAlumniUserId,
  // menteeAlumniProfileId])` index enforces the alumni case, but the STUDENT case
  // has no usable index any more: `menteeStudentProfileId` is nullable, and
  // Prisma/SQLite treat NULLs as distinct, so the old unique would admit
  // duplicates. Checked explicitly instead of trusting a constraint that no
  // longer exists.
  const existingPair = await prisma.mentorshipPair.findFirst({
    where: {
      mentorAlumniUserId: mentorUserId,
      status: { in: ['PENDING', 'ACTIVE'] },
      OR: [
        ...(request.menteeAlumniProfileId
          ? [{ menteeAlumniProfileId: request.menteeAlumniProfileId }]
          : []),
        ...(request.menteeStudentProfileId
          ? [{ menteeStudentProfileId: request.menteeStudentProfileId }]
          : []),
      ],
    },
    select: { id: true, status: true },
  });
  if (existingPair) {
    throw conflict(`That mentor already has a ${existingPair.status.toLowerCase()} pair with this mentee`);
  }

  const field = request.field ?? (mentor.currentRole ? 'Career Guidance' : 'Career');

  // Pair + request updated together: a created pair whose request still says
  // PENDING would leave the mentee waiting for an answer they already have.
  const pair = await prisma.$transaction(async (tx) => {
    const created = await tx.mentorshipPair.create({
      data: {
        mentorAlumniUserId: mentorUserId,
        menteeAlumniProfileId: request.menteeAlumniProfileId,
        menteeStudentProfileId: request.menteeStudentProfileId,
        field,
        status: 'ACTIVE',
        approvedAt: new Date(),
        matchScore: request.matchScore,
        matchReasons: request.matchReasons,
        sourceRequest: { connect: { id: request.id } },
      },
    });
    await tx.mentorshipRequest.update({
      where: { id: request.id },
      data: {
        status: 'ACCEPTED',
        respondedAt: new Date(),
        mentorAlumniUserId: mentorUserId,
        pairId: created.id,
      },
    });
    return created;
  });

  await Promise.all([
    writeAudit({
      actorUserId: viewer.userId,
      institutionId: viewer.institutionId,
      action: 'mentorship.request.accept',
      entityType: 'MentorshipPair',
      entityId: pair.id,
      after: { mentorUserId, field },
    }),
    notify({
      institutionId: viewer.institutionId,
      recipientUserId: request.menteeUserId,
      category: 'MENTORSHIP',
      title: 'Mentorship request accepted',
      body: `Your request for a mentor in ${field} has been accepted.`,
      // Keyed on the PAIR, not the request: a request produces at most one pair, but
      // the deep link has to land on the pair — that is where the sessions live.
      dedupeKey: `mentorship-accept:${pair.id}`,
      data: { requestId: request.id, pairId: pair.id, field },
    }),
  ]);

  return { id: request.id, status: 'ACCEPTED', pairId: pair.id, field, mentorUserId };
}

export async function withdrawRequest(viewer: Viewer, requestId: string) {
  const request = await prisma.mentorshipRequest.findFirst({
    where: { id: requestId, institutionId: viewer.institutionId },
    select: { id: true, status: true, menteeUserId: true },
  });
  if (!request) throw notFound('Mentorship request not found');
  if (!(viewer.isOffice || request.menteeUserId === viewer.userId)) {
    throw forbidden('Only the mentee can withdraw this request');
  }
  if (request.status !== 'PENDING') {
    throw unprocessable(`That request was already ${request.status.toLowerCase()}`);
  }
  await prisma.mentorshipRequest.update({
    where: { id: request.id },
    data: { status: 'WITHDRAWN', respondedAt: new Date() },
  });
  return { id: request.id, status: 'WITHDRAWN' };
}

/**
 * Office-created pair, with no request behind it.
 *
 * Kept because the office sometimes needs to pair two people who have not
 * exchanged anything (a reunion introduction, say). Requires an explicit field —
 * there is no demo fallback any more.
 */
export async function createPair(
  viewer: Viewer,
  body: { mentorUserId: string; alumniProfileId?: string; studentProfileId?: string; field: string },
) {
  if (!viewer.isOffice) throw forbidden('Only the Alumni Relations Office can create a pair directly');
  if (!body.field?.trim()) throw unprocessable('A field is required');

  const mentor = await prisma.alumniProfile.findFirst({
    where: { userId: body.mentorUserId, institutionId: viewer.institutionId, engagementStatus: 'ACTIVE' },
    select: { userId: true },
  });
  if (!mentor) throw notFound('Mentor not found or not available');

  const result = await resolveMentee(viewer, body);
  if (result.userId === mentor.userId) throw unprocessable('A person cannot mentor themselves');

  const existing = await prisma.mentorshipPair.findFirst({
    where: {
      mentorAlumniUserId: mentor.userId,
      status: { in: ['PENDING', 'ACTIVE'] },
      OR: [
        ...(result.alumniProfileId ? [{ menteeAlumniProfileId: result.alumniProfileId }] : []),
        ...(result.studentProfileId ? [{ menteeStudentProfileId: result.studentProfileId }] : []),
      ],
    },
    select: { id: true },
  });
  if (existing) throw conflict('That mentor already has a live pair with this mentee');

  const pair = await prisma.mentorshipPair.create({
    data: {
      mentorAlumniUserId: mentor.userId,
      menteeAlumniProfileId: result.alumniProfileId,
      menteeStudentProfileId: result.studentProfileId,
      field: body.field.trim(),
      status: 'ACTIVE',
      approvedAt: new Date(),
    },
  });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'mentorship.pair.create',
    entityType: 'MentorshipPair',
    entityId: pair.id,
    after: { mentorUserId: mentor.userId, field: pair.field },
  });
  return { id: pair.id, status: pair.status, field: pair.field };
}

export async function completePair(viewer: Viewer, pairId: string, body: { outcome?: string } = {}) {
  const pair = await prisma.mentorshipPair.findFirst({
    where: {
      id: pairId,
      OR: [
        { menteeStudentProfile: { user: { institutionId: viewer.institutionId } } },
        { menteeAlumniProfile: { institutionId: viewer.institutionId } },
      ],
    },
    select: { id: true, status: true, mentorAlumniUserId: true, menteeAlumniProfile: { select: { userId: true } }, menteeStudentProfile: { select: { user: { select: { id: true } } } } },
  });
  if (!pair) throw notFound('Mentorship pair not found');
  if (pair.status !== 'ACTIVE') throw unprocessable(`Only an active pair can be completed (this one is ${pair.status})`);

  const isParticipant =
    viewer.userId === pair.mentorAlumniUserId ||
    viewer.userId === pair.menteeAlumniProfile?.userId ||
    viewer.userId === pair.menteeStudentProfile?.user.id;
  if (!(viewer.isOffice || isParticipant)) throw forbidden('Only a participant or the office can end a pair');

  const updated = await prisma.mentorshipPair.update({
    where: { id: pair.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });

  // Goals still open at the end are DROPPED rather than left looking achievable
  // on a pair that no longer exists. They are kept, not deleted, so the history
  // of what was attempted survives.
  await prisma.mentorshipGoal.updateMany({
    where: { pairId: pair.id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
    data: { status: 'DROPPED' },
  });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'mentorship.pair.complete',
    entityType: 'MentorshipPair',
    entityId: pair.id,
    before: { status: 'ACTIVE' },
    after: { status: 'COMPLETED', outcome: body.outcome ?? null },
  });
  return { id: updated.id, status: updated.status, completedAt: updated.completedAt };
}

/**
 * The mentor directory: everyone currently available to mentor.
 *
 * A flat, filterable list rather than only ranked matches. Matching needs a mentee
 * to score against; the office also needs to answer "who in this chapter could
 * help with product design?", which is a browse question.
 */
export async function listMentorDirectory(
  institutionId: string,
  query: { field?: string; skill?: string; viewer?: Viewer } = {},
) {
  const profiles = await prisma.alumniProfile.findMany({
    where: {
      institutionId,
      engagementStatus: 'ACTIVE',
      user: { deletedAt: null },
      ...(query.skill
        ? { skills: { some: { skill: { contains: query.skill } } } }
        : {}),
    },
    select: {
      id: true,
      userId: true,
      graduationYear: true,
      currentRole: true,
      headline: true,
location: true,
      // `mentorshipsAsMentor` hangs off User, not AlumniProfile — the pair points
      // at users.id. Reaching it through the nested `user` select is what makes
      // "how many mentees does this person already carry" answerable.
      user: {
        select: {
          fullName: true,
          mentorshipsAsMentor: { where: { status: 'ACTIVE' }, select: { field: true } },
        },
      },
      company: { select: { name: true, sector: true } },
      chapter: { select: { id: true, city: true } },
      skills: { select: { skill: true, level: true } },
    },
    orderBy: { graduationYear: 'asc' }, // most senior first: that is who can mentor
    take: 100,
  });

const rows = profiles.map((p) => {
    // Which fields this person is actually listed for, so the directory shows
    // "Career · Higher Studies" instead of an empty row the office has to infer.
    const livePairs = p.user.mentorshipsAsMentor;
    return {
      profileId: p.id,
      userId: p.userId,
      name: p.user.fullName,
      batch: p.graduationYear,
      role: p.currentRole,
      headline: p.headline,
      location: p.location,
      company: p.company?.name ?? null,
      sector: p.company?.sector ?? null,
      chapter: p.chapter ? { id: p.chapter.id, city: p.chapter.city } : null,
      skills: p.skills,
      fields: [...new Set(livePairs.map((x) => x.field))],
      // Shown so the office can see who is already carrying somebody. A mentor
      // with five mentees should not be the first suggestion for a sixth.
      activeMentees: livePairs.length,
    };
  });

  const filtered = query.field
    ? rows.filter((r) => r.fields.some((f) => f.toLowerCase().includes(query.field!.toLowerCase())))
    : rows;

  return { count: filtered.length, mentors: filtered };
}

/**
 * Office approve/decline of an EXISTING pair, behind the legacy action route.
 *
 * Separate from `decideRequest` because a pair can exist without a request (the
 * office created it directly), and the old console approves pairs, not requests.
 */
export async function decidePair(
  viewer: Viewer,
  pairId: string,
  action: 'approve' | 'decline',
  reason?: string,
) {
  const pair = await prisma.mentorshipPair.findFirst({
    where: {
      id: pairId,
      OR: [
        { menteeStudentProfile: { user: { institutionId: viewer.institutionId } } },
        { menteeAlumniProfile: { institutionId: viewer.institutionId } },
      ],
    },
    select: { id: true, status: true, mentorAlumniUserId: true, field: true },
  });
  if (!pair) throw notFound('Mentorship pair not found');
  if (!viewer.isOffice) throw forbidden('Only the Alumni Relations Office can decide a pair');
  if (pair.status !== 'PENDING') {
    throw unprocessable(`Cannot ${action} a pair that is ${pair.status}`);
  }

  if (action === 'approve') {
    const updated = await prisma.mentorshipPair.update({
      where: { id: pair.id },
      data: { status: 'ACTIVE', approvedAt: new Date() },
    });
    await writeAudit({
      actorUserId: viewer.userId,
      institutionId: viewer.institutionId,
      action: 'mentorship.approve',
      entityType: 'MentorshipPair',
      entityId: pair.id,
      before: { status: 'PENDING' },
      after: { status: 'ACTIVE' },
    });
    return { id: updated.id, status: updated.status };
  }

  const updated = await prisma.mentorshipPair.update({
    where: { id: pair.id },
    data: { status: 'DECLINED', declinedReason: reason?.trim() || null },
  });
  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'mentorship.decline',
    entityType: 'MentorshipPair',
    entityId: pair.id,
    before: { status: 'PENDING' },
    after: { status: 'DECLINED', reason: reason ?? null },
  });
  return { id: updated.id, status: updated.status };
}

/** Nudge the mentor. Rate-limited because each tap writes a notification row. */
export async function remindMentor(viewer: Viewer, pairId: string) {
  const pair = await prisma.mentorshipPair.findFirst({
    where: {
      id: pairId,
      OR: [
        { menteeStudentProfile: { user: { institutionId: viewer.institutionId } } },
        { menteeAlumniProfile: { institutionId: viewer.institutionId } },
      ],
    },
    select: {
      id: true,
      status: true,
      field: true,
      nextSessionAt: true,
      mentorAlumniUserId: true,
      menteeAlumniProfile: { select: { user: { select: { fullName: true } } } },
      menteeStudentProfile: { select: { user: { select: { fullName: true } } } },
    },
  });
  if (!pair) throw notFound('Mentorship pair not found');
  if (!(viewer.isOffice || viewer.userId === pair.mentorAlumniUserId)) {
    throw forbidden('Only the office or the mentor can send this reminder');
  }

  const menteeName = pair.menteeAlumniProfile?.user.fullName ?? pair.menteeStudentProfile?.user.fullName ?? 'your mentee';
  // Recipient is the MENTOR, and the authoriser is "the office or the mentor". That
  // reads oddly — a mentor reminding themselves — but it is the pre-existing
  // contract on this endpoint and changing the recipient is a behaviour change
  // somebody has to decide, not a refactor. Flagged for the office; the send path
  // itself is fixed either way.
  await notify({
    institutionId: viewer.institutionId,
    recipientUserId: pair.mentorAlumniUserId,
    category: 'MENTORSHIP',
    title: 'Mentorship session reminder',
    body: pair.nextSessionAt
      ? `Your next session with ${menteeName} (${pair.field}) is ${new Date(pair.nextSessionAt).toDateString()}.`
      : `Please schedule your next session with ${menteeName} (${pair.field}).`,
    // Keyed on pair AND session date. Before this, pressing the button five times
    // produced five identical rows in the mentor's inbox — this endpoint wrote
    // directly, so nothing deduplicated it. Re-nudging is allowed once the session
    // date itself moves, which is the case where a second row is actually wanted.
    dedupeKey: `mentorship-session-reminder:${pair.id}:${pair.nextSessionAt ? new Date(pair.nextSessionAt).toISOString() : 'unscheduled'}`,
    data: { pairId: pair.id },
  });
  return { id: pair.id, reminded: true };
}
