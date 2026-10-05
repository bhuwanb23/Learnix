// Mentorship goals & progress.
// Docs: 12-alumni-relations.md §3.5 · §4
//
// One flat row per objective with a 0–100 percentage. A milestone is a goal that
// has a target date — there is no nested tree, because a mentorship goal is "get
// my CV reviewed", not a project plan, and a hierarchy here would add state
// transitions without adding a decision anyone makes.

import { prisma } from '../../db/prisma.js';
import { notFound, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { pairForAction } from './sessions.service.js';
import type { Viewer } from './directory.service.js';

export const GOAL_STATUSES = ['PENDING', 'IN_PROGRESS', 'ACHIEVED', 'DROPPED'] as const;

export async function createGoal(
  viewer: Viewer,
  pairId: string,
  body: { title: string; detail?: string; targetDate?: string; status?: string; progressPct?: number },
) {
  const pair = await pairForAction(viewer, pairId);
  if (!body.title?.trim()) throw unprocessable('Give the goal a title');
  if (body.status && !GOAL_STATUSES.includes(body.status as never)) {
    throw unprocessable(`status must be one of ${GOAL_STATUSES.join(', ')}`);
  }
  const pct = body.progressPct ?? 0;
  assertPct(pct);

  const target = body.targetDate ? new Date(body.targetDate) : null;
  if (target && Number.isNaN(target.getTime())) throw unprocessable('Invalid target date');

  // Status and percentage are kept consistent at the source rather than letting a
  // caller set status=ACHIEVED with progressPct=20. That contradiction is exactly
  // what makes a progress bar untrustworthy.
  const status = body.status ?? (pct >= 100 ? 'ACHIEVED' : pct > 0 ? 'IN_PROGRESS' : 'PENDING');

  const goal = await prisma.mentorshipGoal.create({
    data: {
      pairId: pair.id,
      title: body.title.trim(),
      detail: body.detail?.trim() || null,
      status,
      progressPct: status === 'ACHIEVED' ? 100 : pct,
      targetDate: target,
      achievedAt: status === 'ACHIEVED' ? new Date() : null,
      createdByUserId: viewer.userId,
      updatedByUserId: viewer.userId,
    },
  });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'mentorship.goal.create',
    entityType: 'MentorshipGoal',
    entityId: goal.id,
    after: { pairId: pair.id, title: goal.title },
  });
  return shape(goal);
}

export async function updateGoal(
  viewer: Viewer,
  goalId: string,
  body: { title?: string; detail?: string; status?: string; progressPct?: number; targetDate?: string },
) {
  const existing = await prisma.mentorshipGoal.findFirst({
    where: { id: goalId },
    select: { id: true, pairId: true, status: true, progressPct: true },
  });
  if (!existing) throw notFound('Goal not found');
  await pairForAction(viewer, existing.pairId);

  if (body.status && !GOAL_STATUSES.includes(body.status as never)) {
    throw unprocessable(`status must be one of ${GOAL_STATUSES.join(', ')}`);
  }
  if (body.progressPct !== undefined) assertPct(body.progressPct);

const data: Record<string, unknown> = { updatedByUserId: viewer.userId };
  if (body.title !== undefined) {
    if (!body.title.trim()) throw unprocessable('A goal needs a title');
    data.title = body.title.trim();
  }
  if (body.detail !== undefined) data.detail = body.detail.trim() || null;
  if (body.targetDate !== undefined) {
    const t = body.targetDate ? new Date(body.targetDate) : null;
    if (t && Number.isNaN(t.getTime())) throw unprocessable('Invalid target date');
    data.targetDate = t;
  }
  if (body.status !== undefined) {
    data.status = body.status;
    // Reaching 100% stamps the achievement date; moving away from ACHIEVED clears
    // it, so "achieved on" never describes a goal that is no longer achieved.
    data.achievedAt = body.status === 'ACHIEVED' ? new Date() : null;
  }
  if (body.progressPct !== undefined) data.progressPct = body.progressPct;

  // Status and percentage are reconciled here rather than trusting the caller,
  // because the two can arrive together and disagree — `{ status: 'ACHIEVED',
  // progressPct: 20 }` is accepted by the schema, and writing it verbatim would
  // produce an "achieved" goal showing a 20% bar.
  const nextStatus = (data.status ?? existing.status) as string;
  const nextPct = (data.progressPct ?? existing.progressPct) as number;

  if (nextStatus === 'ACHIEVED') {
    data.progressPct = 100;
    data.achievedAt = data.achievedAt ?? new Date();
  } else if (nextPct === 100 && body.status === undefined) {
    // Reaching 100% without naming a status still means achieved, exactly as on
    // create — otherwise the bar says "done" and the chip says "in progress".
    data.status = 'ACHIEVED';
    data.achievedAt = new Date();
  } else {
    data.progressPct = nextPct;
  }


  const updated = await prisma.mentorshipGoal.update({ where: { id: existing.id }, data });
  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'mentorship.goal.update',
    entityType: 'MentorshipGoal',
    entityId: updated.id,
    before: { status: existing.status, progressPct: existing.progressPct },
    after: { status: updated.status, progressPct: updated.progressPct },
  });
  return shape(updated);
}

export async function deleteGoal(viewer: Viewer, goalId: string) {
  const existing = await prisma.mentorshipGoal.findFirst({
    where: { id: goalId },
    select: { id: true, pairId: true, title: true },
  });
  if (!existing) throw notFound('Goal not found');
  await pairForAction(viewer, existing.pairId);
  await prisma.mentorshipGoal.delete({ where: { id: existing.id } });
  return { id: existing.id, deleted: true };
}

/**
 * Programme progress for a pair.
 *
 * Progress is DERIVED from the goals, never stored on the pair, so it cannot go
 * stale: there is no "pair progress" column to forget to update when a goal moves.
 */
export async function progressForPair(pairId: string) {
  const goals = await prisma.mentorshipGoal.findMany({ where: { pairId } });
  const live = goals.filter((g) => g.status !== 'DROPPED');
  const achieved = live.filter((g) => g.status === 'ACHIEVED');
  const inProgress = live.filter((g) => g.status === 'IN_PROGRESS');

  const sessionsHeld = await prisma.mentorshipSession.count({
    where: { pairId, planned: false, cancelledAt: null },
  });
  const minutes = await prisma.mentorshipSession.aggregate({
    where: { pairId, planned: false, cancelledAt: null },
    _sum: { durationMinutes: true },
  });

  return {
    // Null, not 0: "no goals set yet" and "every goal is at 0%" are different
    // states and must not render identically.
    goalCompletion: live.length === 0 ? null : Math.round((achieved.length / live.length) * 100),
    // Mean progress across live goals — the bar a participant watches move.
    averageProgress:
      live.length === 0 ? null : Math.round(live.reduce((s, g) => s + g.progressPct, 0) / live.length),
    goals: {
      total: live.length,
      achieved: achieved.length,
      inProgress: inProgress.length,
      pending: live.filter((g) => g.status === 'PENDING').length,
      dropped: goals.length - live.length,
      overdue: live.filter((g) => g.targetDate !== null && g.targetDate.getTime() < Date.now() && g.status !== 'ACHIEVED').length,
    },
    sessions: { held: sessionsHeld, minutes: minutes._sum.durationMinutes ?? 0 },
  };
}

function assertPct(pct: number) {
  if (!Number.isInteger(pct) || pct < 0 || pct > 100) {
    throw unprocessable('progressPct must be a whole number between 0 and 100');
  }
}

function shape(g: {
  id: string;
  pairId: string;
  title: string;
  detail: string | null;
  status: string;
  progressPct: number;
  targetDate: Date | null;
  achievedAt: Date | null;
  createdByUserId: string;
  updatedByUserId: string | null;
  createdAt: Date;
}) {
  return {
    id: g.id,
    pairId: g.pairId,
    title: g.title,
    detail: g.detail,
    status: g.status,
    progressPct: g.progressPct,
    targetDate: g.targetDate,
    achievedAt: g.achievedAt,
    isOverdue: g.targetDate !== null && g.targetDate.getTime() < Date.now() && g.status !== 'ACHIEVED',
    createdByUserId: g.createdByUserId,
    updatedByUserId: g.updatedByUserId,
    createdAt: g.createdAt,
  };
}
