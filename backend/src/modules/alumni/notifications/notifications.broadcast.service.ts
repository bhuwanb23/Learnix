/**
 * S-12 Notifications — office broadcast (docs/users/12-alumni-relations.md §3.7).
 *
 * Moves `createBroadcast` out of alumni.service.ts, where it was a 50-line if/else
 * chain with two defects that both had already been fixed by hand in a sibling
 * module:
 *
 * 1. THE AUDIENCE WAS HARDCODED TO ONE YEAR AND ONE CITY.
 *    `broadcastSchema` accepted the literal `'BATCH_2024'`, and the resolver
 *    matched `graduationYear: 2024`. A graduate who finished in 2019 could not be
 *    reached by any broadcast, ever — the audience list was a UI affordance that
 *    silently did nothing for 90% of the alumni body. Same for
 *    `CITY_BENGALURU`: the chapter name was a union member, not data.
 *    Now `audience` is `{ kind, value }` and the year/city is a number and a
 *    string respectively, so the set of reachable people is the set of people who
 *    exist.
 *
 * 2. IT WAS NOT TENANT-SAFE, AND NOT DELETE-SAFE.
 *    Three of the four branches filtered `{ user: { institutionId } }` with no
 *    `deletedAt: null`, so a soft-deleted account — one whose data retention
 *    window closed but whose row remains — still received mail. accounts'
 *    `createBroadcast` has a comment explaining exactly this class of bug and
 *    filters `deletedAt` in all three of its branches. Every branch here does too.
 *
 * Also new: `isImportant`, which pins an unread broadcast to the top of the
 * recipient's inbox (see notifications.inbox.service.ts for why the pin requires
 * `readAt: null`), and an audience PREVIEW so the composer can show "this reaches
 * 412 people" before anyone presses send.
 *
 * Preferences apply. A graduate who muted "office broadcasts" does not get the row
 * — which means the send report's `muted` count is the honest number of people who
 * did not receive it, and the office can see that at send time rather than
 * discovering it from the silence afterwards.
 */
import { prisma } from '../../../db/prisma.js';
import { writeAudit } from '../../../lib/audit.js';
import type { Viewer } from '../directory.service.js';
import { notifyMany } from './notifications.delivery.js';

export const AUDIENCE_KINDS = ['ALL_ALUMNI', 'GRADUATION_YEAR', 'CHAPTER_CITY', 'MENTORS', 'CHAPTER_MEMBERS'] as const;
export type AudienceKind = (typeof AUDIENCE_KINDS)[number];

export type Audience = {
  kind: AudienceKind;
  /** Required for GRADUATION_YEAR (number) and CHAPTER_CITY (string). */
  value?: number | string;
  /** Required for CHAPTER_MEMBERS. */
  chapterId?: string;
};

export const TEMPLATE_KEYS = ['EVENT_INVITE', 'NEWSLETTER', 'REUNION', 'DONATION_APPEAL', 'MILESTONE'] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

/**
 * Resolve an audience to recipient userIds.
 *
 * Exported because the composer's preview calls it too, and a preview that counted
 * a different set of people than the send would be worse than no preview.
 */
export async function resolveAudience(institutionId: string, audience: Audience): Promise<string[]> {
  const alive = { institutionId, deletedAt: null };

  switch (audience.kind) {
    case 'ALL_ALUMNI': {
      const rows = await prisma.alumniProfile.findMany({
        where: { user: alive },
        select: { userId: true },
      });
      return rows.map((r) => r.userId);
    }

    case 'GRADUATION_YEAR': {
      const year = Number(audience.value);
      if (!Number.isInteger(year) || year < 1950 || year > 2100) return [];
      const rows = await prisma.alumniProfile.findMany({
        where: { user: alive, graduationYear: year },
        select: { userId: true },
      });
      return rows.map((r) => r.userId);
    }

    case 'CHAPTER_CITY': {
      const city = String(audience.value ?? '').trim();
      if (!city) return [];
      // Case-insensitive, but NOT with Prisma's `mode: 'insensitive'` — that option
      // does not exist on SQLite, so it is silently unavailable here rather than
      // working. Instead the institution's chapters are compared in JS. There are a
      // handful of chapters and they are not a growing table, so this is cheap, and
      // it means "bengaluru" reaches the same members as "Bengaluru" instead of
      // quietly matching nobody.
      const chapters = await prisma.alumniChapter.findMany({
        where: { institutionId },
        select: { id: true, city: true },
      });
      const wanted = city.toLocaleLowerCase('en');
      const chapterIds = chapters
        .filter((c) => c.city.trim().toLocaleLowerCase('en') === wanted)
        .map((c) => c.id);
      if (chapterIds.length === 0) return [];

      const rows = await prisma.alumniProfile.findMany({
        where: { user: alive, chapterId: { in: chapterIds } },
        select: { userId: true },
      });
      return rows.map((r) => r.userId);
    }

    case 'CHAPTER_MEMBERS': {
      if (!audience.chapterId) return [];
      const rows = await prisma.alumniProfile.findMany({
        where: { user: alive, chapterId: audience.chapterId },
        select: { userId: true },
      });
      return rows.map((r) => r.userId);
    }

    case 'MENTORS': {
      // A mentor is somebody currently paired with a mentee — NOT anybody with
      // `isMentor = true` on their profile. Offering that flag was the original
      // bug: it is set once and never expires, so the audience grew monotonically
      // and included people who had not spoken to a student in two years.
      // The ACTIVE pair is the honest definition of "somebody the programme is
      // currently relying on".
      const rows = await prisma.mentorshipPair.findMany({
        where: { status: 'ACTIVE', menteeStudentProfile: { user: alive } },
        select: { mentorAlumniUserId: true },
      });
      return [...new Set(rows.map((r) => r.mentorAlumniUserId).filter((id): id is string => !!id))];
    }

    default:
      return [];
  }
}

/**
 * Send one broadcast to an audience.
 *
 * The sender is excluded. They wrote it, they have read it, and a self-addressed
 * row is the kind of thing that makes people stop trusting the unread badge.
 */
export async function createBroadcast(
  viewer: Viewer,
  body: {
    audience: Audience;
    templateKey?: TemplateKey | null;
    title: string;
    body: string;
    isImportant?: boolean;
    channels?: string[];
  },
  ip?: string | null,
) {
  const recipients = await resolveAudience(viewer.institutionId, body.audience);
  const targets = [...new Set(recipients)].filter((id) => id !== viewer.userId);

  const broadcast = await prisma.broadcast.create({
    data: {
      institutionId: viewer.institutionId,
      senderUserId: viewer.userId,
      audienceJson: JSON.stringify(body.audience),
      templateKey: body.templateKey ?? null,
      title: body.title,
      body: body.body,
      channels: (body.channels?.length ? body.channels : ['IN_APP']).join(','),
      isImportant: body.isImportant ?? false,
      sentAt: new Date(),
    },
  });

  const report = await deliverBroadcast(viewer, broadcast, targets);

  // Audit carried over verbatim from the inline `createBroadcast` this file
  // replaces, including the `ip` argument — an office broadcast is the one action in
  // this module that talks to the whole alumni body, so it is the one that has to be
  // attributable afterwards. `recipients` stays the pre-exclusion count because that
  // is what the audience query returned; `delivered` is what actually landed.
  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'broadcast.send',
    entityType: 'Broadcast',
    entityId: broadcast.id,
    after: {
      audience: body.audience,
      recipients: recipients.length,
      delivered: report.delivered,
      muted: report.muted,
      isImportant: body.isImportant === true,
    },
    ip,
  });

  return { broadcast, ...report, audienceSize: recipients.length };
}

async function deliverBroadcast(
  viewer: Viewer,
  broadcast: { id: string; title: string; body: string; isImportant: boolean },
  targets: string[],
): Promise<{ delivered: number; muted: number; duplicates: number }> {
  if (targets.length === 0) {
    // The broadcast row is still recorded. "We sent this and it reached nobody" is a
    // fact the office needs later; silently dropping it would make a mis-targeted
    // audience invisible and unrepeatable to diagnose.
    return { delivered: 0, muted: 0, duplicates: 0 };
  }

  const result = await notifyMany({
    institutionId: viewer.institutionId,
    recipientUserIds: targets,
    category: 'BROADCAST',
    title: broadcast.title,
    body: broadcast.body,
    isImportant: broadcast.isImportant,
    // `broadcastId` is what the app can use to show "part of a broadcast"; the pin
    // itself is the `isImportant` column, not a flag in here.
    data: { broadcastId: broadcast.id },
    dedupeKey: `broadcast:${broadcast.id}`,
    sourceModule: 'alumni',
  });

  return { delivered: result.delivered, muted: result.muted, duplicates: result.duplicates };
}

/**
 * How many people an audience reaches, without sending.
 *
 * `audienceSize` includes the sender (they match the query); the number that
 * matters for the composer is `reachable`, which does not.
 */
export async function previewAudience(institutionId: string, audience: Audience, senderUserId: string) {
  const ids = await resolveAudience(institutionId, audience);
  const unique = [...new Set(ids)];
  return {
    audienceSize: unique.length,
    reachable: unique.filter((id) => id !== senderUserId).length,
  };
}

/**
 * The year and city lists the composer offers.
 *
 * Fetched rather than hardcoded because they are properties of the DATA. The seed
 * has eleven graduation years and six chapter cities; the old composer offered
 * exactly one of each as a literal, which is how "notify every graduate" quietly
 * became "notify three people in 2024".
 *
 * Years come back descending (newest first, because that is what somebody composing
 * a reunion broadcast wants) and cities alphabetically.
 */
export async function audienceOptions(institutionId: string) {
  const [yearGroups, chapters] = await Promise.all([
    prisma.alumniProfile.groupBy({
      by: ['graduationYear'],
      where: { user: { institutionId, deletedAt: null }, graduationYear: { not: null } },
      _count: { _all: true },
    }),
    prisma.alumniChapter.findMany({
      where: { institutionId },
      select: { id: true, city: true },
      orderBy: { city: 'asc' },
    }),
  ]);

  const years = yearGroups
    .filter((g): g is typeof g & { graduationYear: number } => g.graduationYear !== null)
    .map((g) => ({ year: g.graduationYear, count: g._count._all }))
    .sort((a, b) => b.year - a.year);

  return {
    years,
    cities: chapters.map((c) => ({ id: c.id, city: c.city })),
  };
}

/**
 * Send history, newest first.
 *
 * The composer shows it so the office can see what it has already told people —
 * without it, re-sending an announcement is the only way to find out whether one
 * went out.
 */
export async function listBroadcasts(institutionId: string, limit = 20) {
  const rows = await prisma.broadcast.findMany({
    where: { institutionId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(50, Math.max(1, limit)),
    select: {
      id: true,
      templateKey: true,
      title: true,
      body: true,
      audienceJson: true,
      channels: true,
      isImportant: true,
      sentAt: true,
      createdAt: true,
      senderUserId: true,
    },
  });

  return rows.map((r) => {
    let audience: Audience | null = null;
    try {
      audience = JSON.parse(r.audienceJson) as Audience;
    } catch {
      // Pre-existing rows written by the old resolver stored `{ audience: 'BATCH_2024' }`,
      // which is not this shape. Shown verbatim rather than dropped, so the office
      // can still see what it sent.
      audience = null;
    }
    return { ...r, audience };
  });
}
