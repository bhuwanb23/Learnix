// Chapter membership — create a chapter, join, leave, office removal.
// Docs: 12-alumni-relations.md §3.6 (join / leave chapter).
//
// Split out of chapters.service.ts because membership is the one part of the
// chapter domain with real invariants, and they are all about NOT corrupting
// the chapter:
//
//   · `AlumniChapter.memberCount` is denormalised. Every path that changes
//     membership recomputes it, through recomputeMemberCount() below, rather
//     than incrementing. An incrementing counter drifts the first time two
//     people join at once, and there is no way to notice.
//   · `AlumniChapter.presidentAlumniUserId` is a denormalised pointer to the
//     current PRESIDENT officer row. Leaving or being removed from a chapter
//     while holding office would leave the pointer naming someone who is no
//     longer a member, so that is refused rather than silently repaired.
//   · A graduate belongs to AT MOST ONE chapter (`AlumniProfile.chapterId` is a
//     scalar). Joining a second is refused with the current chapter named, so
//     the UI can offer a move instead of a dead end.

import { prisma } from '../../db/prisma.js';
import { notFound, conflict, unprocessable, forbidden } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import type { Viewer } from './directory.service.js';

/**
 * Recompute a chapter's denormalised memberCount from the truth.
 * Callers must invoke this after ANY membership change.
 */
export async function recomputeMemberCount(chapterId: string, institutionId: string) {
  const members = await prisma.alumniProfile.count({
    where: { institutionId, chapterId, engagementStatus: 'ACTIVE' },
  });
  await prisma.alumniChapter.update({ where: { id: chapterId }, data: { memberCount: members } });
  return members;
}

async function chapterOr404(institutionId: string, chapterId: string) {
  const chapter = await prisma.alumniChapter.findFirst({
    where: { id: chapterId, institutionId },
    select: {
      id: true,
      city: true,
      region: true,
      presidentAlumniUserId: true,
      memberCount: true,
    },
  });
  if (!chapter) throw notFound('Chapter not found');
  return chapter;
}

/** Officers currently in office, used to block leaving/being removed. */
async function currentOfficerUserIds(chapterId: string) {
  const rows = await prisma.alumniChapterOfficer.findMany({
    where: { chapterId, isCurrent: true },
    select: { alumniUserId: true, role: true },
  });
  return rows;
}

// ─────────────────────────────────────────────────────────────
// Create a chapter (office only)
// ─────────────────────────────────────────────────────────────

export async function createChapter(
  viewer: Viewer,
  body: {
    city: string;
    region?: string;
    tier?: 'LOCAL' | 'REGIONAL';
    description?: string;
    foundedOn?: string;
    meetingFrequency?: string;
    presidentProfileId?: string;
  },
) {
  if (!viewer.isOffice) throw forbidden('Only the Alumni Relations Office can create a chapter');

  const existing = await prisma.alumniChapter.findFirst({
    where: { institutionId: viewer.institutionId, city: body.city },
    select: { id: true },
  });
  if (existing) throw conflict(`A chapter for ${body.city} already exists`);

  // A president is required at creation: a chapter with nobody accountable is
  // exactly the thing this feature exists to prevent, and back-filling it later
  // leaves a window where announcements cannot be authorised.
  let presidentUserId: string | null = null;
  if (body.presidentProfileId) {
    const p = await prisma.alumniProfile.findFirst({
      where: { id: body.presidentProfileId, user: { institutionId: viewer.institutionId } },
      select: { userId: true },
    });
    if (!p) throw notFound('President alumni profile not found');
    presidentUserId = p.userId;
  }

  const chapter = await prisma.$transaction(async (tx) => {
    const created = await tx.alumniChapter.create({
      data: {
        institutionId: viewer.institutionId,
        city: body.city,
        region: body.region ?? null,
        tier: body.tier ?? 'LOCAL',
        description: body.description ?? null,
        foundedOn: body.foundedOn ? new Date(body.foundedOn) : null,
        meetingFrequency: body.meetingFrequency ?? null,
        // A chapter may be created before its president is known; the pointer is
        // nullable-in-practice even though the column is required.
        presidentAlumniUserId: presidentUserId ?? 'UNASSIGNED',
        memberCount: 0,
      },
    });

    if (presidentUserId) {
      await tx.alumniChapterOfficer.create({
        data: {
          chapterId: created.id,
          alumniUserId: presidentUserId,
          role: 'PRESIDENT',
          isCurrent: true,
          createdByUserId: viewer.userId,
        },
      });
    }
    return created;
  });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'chapter.create',
    entityType: 'AlumniChapter',
    entityId: chapter.id,
    after: { city: chapter.city, region: chapter.region, tier: chapter.tier },
  });

  return {
    id: chapter.id,
    city: chapter.city,
    region: chapter.region,
    tier: chapter.tier,
    memberCount: 0,
    hasPresident: presidentUserId !== null,
  };
}

/** Create or amend chapter metadata (office only). */
export async function updateChapter(
  viewer: Viewer,
  chapterId: string,
  body: {
    region?: string | null;
    tier?: 'LOCAL' | 'REGIONAL';
    description?: string | null;
    meetingFrequency?: string | null;
  },
) {
  if (!viewer.isOffice) throw forbidden('Only the Alumni Relations Office can edit a chapter');
  const chapter = await chapterOr404(viewer.institutionId, chapterId);
  // Only apply keys the caller actually sent — an absent key means "leave it".
  const data: Record<string, unknown> = {};
  if (body.region !== undefined) data.region = body.region;
  if (body.tier !== undefined) data.tier = body.tier;
  if (body.description !== undefined) data.description = body.description;
  if (body.meetingFrequency !== undefined) data.meetingFrequency = body.meetingFrequency;
  if (Object.keys(data).length === 0) return { id: chapter.id, unchanged: true };

  const updated = await prisma.alumniChapter.update({ where: { id: chapter.id }, data });
  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'chapter.update',
    entityType: 'AlumniChapter',
    entityId: chapter.id,
    after: data,
  });
  return { id: updated.id, region: updated.region, tier: updated.tier, description: updated.description };
}

// ─────────────────────────────────────────────────────────────
// Join / leave
// ─────────────────────────────────────────────────────────────

export async function joinChapter(viewer: Viewer, chapterId: string) {
  if (viewer.isOffice) {
    // The office administers; it does not belong to a chapter. Allowing this
    // would put the officer in a member list and corrupt participation metrics.
    throw unprocessable('The Alumni Relations Office cannot join a chapter — add members on their behalf instead');
  }

  const chapter = await chapterOr404(viewer.institutionId, chapterId);
  const me = await prisma.alumniProfile.findFirst({
    where: { userId: viewer.userId, institutionId: viewer.institutionId },
    select: { id: true, chapterId: true, engagementStatus: true },
  });
  if (!me) throw notFound('No alumni profile for this account');
  if (me.engagementStatus !== 'ACTIVE') {
    throw unprocessable('Only active alumni can join a chapter');
  }
  if (me.chapterId === chapterId) throw conflict(`You are already a member of the ${chapter.city} chapter`);

  if (me.chapterId) {
    // Name the current chapter so the UI can offer "leave X, then join this"
    // instead of a bare refusal.
    const current = await prisma.alumniChapter.findFirst({
      where: { id: me.chapterId, institutionId: viewer.institutionId },
      select: { city: true },
    });
    throw conflict(
      `You are already a member of the ${current?.city ?? 'another'} chapter — leave it before joining ${chapter.city}`,
    );
  }

  await prisma.alumniProfile.update({ where: { id: me.id }, data: { chapterId } });
  const memberCount = await recomputeMemberCount(chapterId, viewer.institutionId);

  await Promise.all([
    writeAudit({
      actorUserId: viewer.userId,
      institutionId: viewer.institutionId,
      action: 'chapter.member.join',
      entityType: 'AlumniChapter',
      entityId: chapterId,
      after: { chapter: chapter.city },
    }),
    // Every current officer is told, because a new member is something a
    // chapter president needs to know to follow up with.
    prisma.notification.createMany({
      data: (await currentOfficerUserIds(chapterId)).map((o) => ({
        institutionId: viewer.institutionId,
        recipientUserId: o.alumniUserId,
        type: 'SYSTEM',
        title: `New member — ${chapter.city} chapter`,
        body: 'An alumnus just joined your chapter.',
        sourceModule: 'alumni-chapter',
      })),
    }),
  ]);

  return { id: chapterId, city: chapter.city, joined: true, memberCount };
}

export async function leaveChapter(viewer: Viewer, chapterId: string) {
  if (viewer.isOffice) throw unprocessable('The Alumni Relations Office is not a chapter member');

  const chapter = await chapterOr404(viewer.institutionId, chapterId);
  const me = await prisma.alumniProfile.findFirst({
    where: { userId: viewer.userId, institutionId: viewer.institutionId },
    select: { id: true, chapterId: true },
  });
  if (!me) throw notFound('No alumni profile for this account');
  if (me.chapterId !== chapterId) throw conflict(`You are not a member of the ${chapter.city} chapter`);

  const officers = (await currentOfficerUserIds(chapterId)).filter((o) => o.alumniUserId === viewer.userId);
  if (officers.length > 0) {
    // Refuse rather than auto-resign: a chapter silently losing its president is
    // the failure mode this whole model exists to prevent.
    throw unprocessable(
      `You hold ${officers.map((o) => o.role).join(', ')} in this chapter — resign before leaving`,
    );
  }

  await prisma.alumniProfile.update({ where: { id: me.id }, data: { chapterId: null } });
  const memberCount = await recomputeMemberCount(chapterId, viewer.institutionId);

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'chapter.member.leave',
    entityType: 'AlumniChapter',
    entityId: chapterId,
    before: { chapter: chapter.city },
  });

  return { id: chapterId, city: chapter.city, left: true, memberCount };
}

/**
 * Office removal of a member. Requires a reason: silently dropping someone from
 * a roster is indistinguishable from a data error three months later, and
 * chapters are self-policed communities where that matters more than usual.
 */
export async function removeMember(
  viewer: Viewer,
  chapterId: string,
  profileId: string,
  reason: string,
) {
  if (!viewer.isOffice) throw forbidden('Only the Alumni Relations Office can remove a chapter member');

  const chapter = await chapterOr404(viewer.institutionId, chapterId);
  const member = await prisma.alumniProfile.findFirst({
    where: { id: profileId, institutionId: viewer.institutionId },
    select: { id: true, userId: true, chapterId: true, user: { select: { fullName: true } } },
  });
  if (!member) throw notFound('Alumni profile not found');
  if (member.chapterId !== chapterId) {
    throw conflict(`${member.user.fullName} is not a member of the ${chapter.city} chapter`);
  }

  const officers = (await currentOfficerUserIds(chapterId)).filter((o) => o.alumniUserId === member.userId);
  if (officers.length > 0) {
    throw unprocessable(
      `${member.user.fullName} holds ${officers.map((o) => o.role).join(', ')} — resign the officer first`,
    );
  }

  await prisma.alumniProfile.update({ where: { id: member.id }, data: { chapterId: null } });
  const memberCount = await recomputeMemberCount(chapterId, viewer.institutionId);

  await Promise.all([
    writeAudit({
      actorUserId: viewer.userId,
      institutionId: viewer.institutionId,
      action: 'chapter.member.remove',
      entityType: 'AlumniChapter',
      entityId: chapterId,
      before: { member: member.user.fullName, chapter: chapter.city },
      after: { reason },
    }),
    prisma.notification.create({
      data: {
        institutionId: viewer.institutionId,
        recipientUserId: member.userId,
        type: 'SYSTEM',
        title: `Removed from the ${chapter.city} chapter`,
        body: `The Alumni Relations Office removed you: ${reason}`,
        sourceModule: 'alumni-chapter',
      },
    }),
  ]);

  return { id: chapterId, removed: member.user.fullName, reason, memberCount };
}

/** Chapter membership state for the current viewer — drives join/leave buttons. */
export async function getMyChapterContext(viewer: Viewer) {
  const me = await prisma.alumniProfile.findFirst({
    where: { userId: viewer.userId, institutionId: viewer.institutionId },
    select: { id: true, chapterId: true, engagementStatus: true },
  });
  if (!me) return { hasProfile: false, isOffice: viewer.isOffice, chapter: null };

  const chapter = me.chapterId
    ? await prisma.alumniChapter.findFirst({
        where: { id: me.chapterId, institutionId: viewer.institutionId },
        select: {
          id: true,
          city: true,
          region: true,
          officers: { where: { isCurrent: true }, select: { role: true } },
        },
      })
    : null;

  const myOfficerRoles = (chapter?.officers ?? []).map((o) => o.role);

  return {
    hasProfile: true,
    isOffice: viewer.isOffice,
    chapter: chapter ? { id: chapter.id, city: chapter.city, region: chapter.region } : null,
    isMember: chapter !== null,
    isOfficer: myOfficerRoles.length > 0,
    isPresident: myOfficerRoles.includes('PRESIDENT'),
    officerRoles: myOfficerRoles,
    // The office cannot join, so the UI must not offer it.
    canJoin: !viewer.isOffice && me.engagementStatus === 'ACTIVE' && chapter === null,
    canLeave: !viewer.isOffice && chapter !== null && !myOfficerRoles.includes('PRESIDENT'),
  };
}