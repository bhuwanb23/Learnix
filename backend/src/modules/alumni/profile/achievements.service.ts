/**
 * Alumni Profile — achievements (docs/users/12-alumni-relations.md §3.8).
 *
 * Self-declared, office-verified. A graduate writes their own entries; the Alumni
 * Relations Office verifies them. The split exists because the alternative is a
 * directory of unverifiable badges: if anyone can write "ACM Fellow" and it renders
 * identically to an office-verified one, the whole section becomes noise and the
 * verified entries lose their meaning.
 *
 * UNVERIFIED IS SHOWN, NOT HIDDEN
 * -------------------------------
 * An unverified entry is still true as a *claim* — plenty of alumni will never have
 * their certificate checked by the office, and hiding those entries would make the
 * section look empty for most of the alumni body. So they are returned and rendered
 * differently (`isVerified: false`, no badge). What the office provides is
 * endorsement, not permission to exist.
 *
 * VERIFICATION IS OFFICE-ONLY AND REVERSIBLE
 * ------------------------------------------
 * `verify` requires `viewer.isOffice` and stamps `verifiedByUserId` +
 * `verifiedAt`. Un-verifying clears both, so the stamp always describes the CURRENT
 * state rather than accumulating history nobody can read.
 *
 * The stamp is a scalar, not a relation, matching every other actor stamp in this
 * schema — so verifying an achievement does not touch the shared `User` model.
 */
import { prisma } from '../../../db/prisma.js';
import { badRequest, forbidden, notFound } from '../../../lib/errors.js';
import { writeAudit } from '../../../lib/audit.js';
import type { Viewer } from '../directory.service.js';
import type { AchievementInput } from './profile.schemas.js';

/**
 * The unique key is `(alumniProfileId, title, year)`.
 *
 * `year` is nullable, and in SQLite a NULL in a unique index does not collide with
 * another NULL — so two achievements with the same title and no year would both
 * insert and defeat the constraint. Hence the explicit pre-check below rather than
 * trusting the database to enforce it.
 */
function achievementKey(title: string, year: number | null | undefined) {
  return { title, year: year ?? null };
}

async function ownProfileId(viewer: Viewer) {
  const profile = await prisma.alumniProfile.findFirst({
    where: { userId: viewer.userId, institutionId: viewer.institutionId },
    select: { id: true },
  });
  if (!profile) throw notFound('No alumni profile for this account');
  return profile.id;
}

async function ownedAchievement(viewer: Viewer, achievementId: string) {
  const row = await prisma.alumniAchievement.findFirst({
    where: {
      id: achievementId,
      profile: { userId: viewer.userId, institutionId: viewer.institutionId },
    },
    select: { id: true, title: true, year: true, isVerified: true },
  });
  if (!row) throw notFound('That achievement is not yours');
  return row;
}

/** Ordered verified-first, then most recent. */
const ORDER = [{ isVerified: 'desc' }, { year: 'desc' }, { createdAt: 'desc' }] as const;

export async function listAchievements(viewer: Viewer) {
  const profileId = await ownProfileId(viewer);
  const rows = await prisma.alumniAchievement.findMany({
    where: { alumniProfileId: profileId },
    orderBy: [...ORDER],
  });

  return {
    achievements: rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      kind: r.kind,
      issuer: r.issuer,
      year: r.year,
      url: r.url,
      isVerified: r.isVerified,
      verifiedAt: r.verifiedAt,
    })),
    verifiedCount: rows.filter((r) => r.isVerified).length,
  };
}

export async function addAchievement(viewer: Viewer, input: AchievementInput) {
  const profileId = await ownProfileId(viewer);
  const key = achievementKey(input.title, input.year);

  const clash = await prisma.alumniAchievement.findFirst({
    where: { alumniProfileId: profileId, ...key },
    select: { id: true },
  });
  if (clash) throw badRequest('You have already added that achievement');

  // A new entry is always unverified, whatever the payload says. `addAchievement`
  // does not accept `isVerified` at all, so there is no path by which a graduate can
  // write themselves a verified badge.
  const created = await prisma.alumniAchievement.create({
    data: {
      alumniProfileId: profileId,
      title: input.title,
      description: input.description ?? null,
      kind: input.kind,
      issuer: input.issuer ?? null,
      year: input.year ?? null,
      url: input.url ?? null,
    },
  });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'profile.achievement.add',
    entityType: 'AlumniAchievement',
    entityId: created.id,
    after: { title: created.title, kind: created.kind },
  });

  return { id: created.id, title: created.title, kind: created.kind, year: created.year, isVerified: false };
}

export async function updateAchievement(
  viewer: Viewer,
  achievementId: string,
  input: Partial<AchievementInput>,
) {
  const existing = await ownedAchievement(viewer, achievementId);

  // Editing a VERIFIED entry silently strips its verification, because the office
  // endorsed what was there before, not what is there now. The alternative — keeping
  // the badge through arbitrary edits — makes verification meaningless: you could
  // verify "ACM Fellow" and then rewrite it to "Definitely a Fellow".
  const demoted = existing.isVerified && input.title !== undefined && input.title !== existing.title;

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.kind !== undefined) data.kind = input.kind;
  if (input.issuer !== undefined) data.issuer = input.issuer;
  if (input.year !== undefined) data.year = input.year;
  if (input.url !== undefined) data.url = input.url;
  if (demoted) {
    data.isVerified = false;
    data.verifiedByUserId = null;
    data.verifiedAt = null;
  }

  const updated = await prisma.alumniAchievement.update({ where: { id: existing.id }, data });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: demoted ? 'profile.achievement.demoted' : 'profile.achievement.update',
    entityType: 'AlumniAchievement',
    entityId: updated.id,
    after: { title: updated.title, isVerified: updated.isVerified },
  });

  return {
    id: updated.id,
    title: updated.title,
    kind: updated.kind,
    year: updated.year,
    isVerified: updated.isVerified,
    // Surfaced so the UI can explain the badge disappearing rather than looking broken.
    demoted,
  };
}

export async function removeAchievement(viewer: Viewer, achievementId: string) {
  const existing = await ownedAchievement(viewer, achievementId);
  await prisma.alumniAchievement.delete({ where: { id: existing.id } });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'profile.achievement.remove',
    entityType: 'AlumniAchievement',
    entityId: existing.id,
    before: { title: existing.title, isVerified: existing.isVerified },
  });

  return { id: existing.id, removed: true };
}

/**
 * Verify or un-verify somebody else's achievement. Office only.
 *
 * Scoped to this institution: a verified flag set from another college's office would
 * be an endorsement this college has no authority to give.
 */
export async function setVerified(viewer: Viewer, achievementId: string, verified: boolean) {
  if (!viewer.isOffice) throw forbidden('Only the Alumni Relations Office can verify an achievement');

  const target = await prisma.alumniAchievement.findFirst({
    where: { id: achievementId, profile: { institutionId: viewer.institutionId } },
    select: { id: true, title: true, isVerified: true, alumniProfileId: true },
  });
  if (!target) throw notFound('That achievement does not exist at this institution');
  if (target.isVerified === verified) {
    return { id: target.id, isVerified: target.isVerified, changed: false };
  }

  const updated = await prisma.alumniAchievement.update({
    where: { id: target.id },
    data: verified
      ? { isVerified: true, verifiedByUserId: viewer.userId, verifiedAt: new Date() }
      : // Cleared rather than left behind, so the stamp always describes the current
        // state. A retained `verifiedByUserId` on an unverified row would be a claim
        // about the present that is simply false.
        { isVerified: false, verifiedByUserId: null, verifiedAt: null },
  });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: verified ? 'profile.achievement.verify' : 'profile.achievement.unverify',
    entityType: 'AlumniAchievement',
    entityId: target.id,
    before: { isVerified: target.isVerified },
    after: { isVerified: updated.isVerified, by: viewer.userId },
  });

  return { id: updated.id, isVerified: updated.isVerified, verifiedAt: updated.verifiedAt, changed: true };
}

/** Office queue: unverified entries, oldest first — the ones somebody should check. */
export async function verificationQueue(viewer: Viewer, limit = 50) {
  if (!viewer.isOffice) throw forbidden('Only the Alumni Relations Office can review achievements');

  const rows = await prisma.alumniAchievement.findMany({
    where: { isVerified: false, profile: { institutionId: viewer.institutionId } },
    orderBy: { createdAt: 'asc' },
    take: Math.min(100, Math.max(1, limit)),
    include: {
      profile: {
        select: { id: true, user: { select: { fullName: true, email: true } } },
      },
    },
  });

  return {
    queue: rows.map((r) => ({
      id: r.id,
      title: r.title,
      kind: r.kind,
      issuer: r.issuer,
      year: r.year,
      url: r.url,
      graduateName: r.profile.user.fullName,
      graduateEmail: r.profile.user.email,
      submittedAt: r.createdAt,
    })),
    pending: rows.length,
  };
}