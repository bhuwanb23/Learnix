/**
 * S-12 Notifications — institutional announcement fan-out.
 *
 * `Announcement` rows existed, an approval queue existed, and `decideAnnouncement`
 * flipped a status string — but nothing ever wrote a `Notification`. An admin could
 * publish "Library extended hours during exams", the row would say PUBLISHED, and
 * not one student would find out. The only mail reaching people was
 * `createBroadcast`, which is a different feature with its own audience set and no
 * approval step.
 *
 * THE AUDIENCE IS NOT WHAT THE SCHEMA SUGGESTS
 * -------------------------------------------
 * `Announcement.audienceJson` is documented as `{ role?, departmentId?, batchId?,
 * sectionId? }` and the seed writes exactly that. But `createAnnouncementSchema`
 * types `audience` as a bare `z.string()` and the service stores it verbatim, so in
 * practice the column holds two different shapes:
 *
 *   { role: 'STUDENT' }                       - seed
 *   'ALL_STUDENTS'                            - createAnnouncement, verbatim
 *
 * Both are in the database today. So this resolver accepts either, and — the
 * important part — REFUSES to guess when it cannot tell. A malformed audience
 * delivers to nobody and says so in the audit trail. Mailing the whole college
 * because an audience string failed to parse is the failure direction to avoid:
 * a missing notice is recoverable, an accidental one to six thousand people is not.
 *
 * PUBLISHING IS IDEMPOTENT
 * -----------------------
 * `publishedAt` was never written by the approval path (only the seed set it), so
 * there was no way to tell "not yet published" from "published long ago". It is set
 * here, and the dedupe key is built from it — so re-running an approval re-notifies
 * nobody, but genuinely re-publishing after a REJECTED cycle does, because the new
 * `publishedAt` makes a new key.
 */
import { prisma } from '../../../db/prisma.js';
import { writeAudit } from '../../../lib/audit.js';
import { notifyMany } from './notifications.delivery.js';
import { ROLES } from '../../../lib/enums.js';

type ParsedAudience = Record<string, unknown>;

export type AudienceResolution = {
  userIds: string[];
  /** What we understood, for the audit trail and the response body. */
  kind: string;
  /** True when the stored audience could not be interpreted; nobody was mailed. */
  unresolved: boolean;
  reason?: string;
};

/**
 * Roles that mean "everybody".
 *
 * `ALUMNI` is NOT here. An announcement addressed to every student has no business
 * going to graduates, and an announcement for graduates has no business going to
 * students — they are different audiences with different apps, and conflating them
 * is how a fee notice ends up in a graduate's inbox.
 */
const ALL_ROLES = new Set(['ALL', 'ALL_USERS', 'EVERYONE']);

function parseAudience(raw: string): { audience: ParsedAudience | string | null; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { audience: null, error: 'audience is empty' };

  // A bare token such as `ALL_STUDENTS` is not valid JSON — `JSON.parse` throws.
  if (!trimmed.startsWith('{') && !trimmed.startsWith('"')) {
    return { audience: trimmed.toUpperCase() };
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { audience: parsed as ParsedAudience };
    }
    if (typeof parsed === 'string') return { audience: parsed.toUpperCase() };
    return { audience: null, error: 'audience is an array or a number' };
  } catch {
    return { audience: null, error: 'audience is not parseable JSON' };
  }
}

export async function resolveAnnouncementAudience(
  institutionId: string,
  audienceJson: string,
): Promise<AudienceResolution> {
  const { audience, error } = parseAudience(audienceJson);
  if (!audience) {
    return { userIds: [], kind: 'UNRESOLVED', unresolved: true, reason: error };
  }

  const alive = { institutionId, deletedAt: null };

  // --- Shape 1: a bare role token -------------------------------------------
  if (typeof audience === 'string') {
    if (ALL_ROLES.has(audience)) {
      const rows = await prisma.user.findMany({ where: alive, select: { id: true } });
      return { userIds: rows.map((r) => r.id), kind: 'ALL_USERS', unresolved: false };
    }

    // `ALL_STUDENTS` / `ALL_STAFF` are the vocabulary `adminBroadcastSchema` uses.
    //
    // These are resolved through the PROFILE tables, not through `UserRole`, and the
    // two genuinely differ: at this institution 276 people have a StudentProfile but
    // only 32 carry the STUDENT role. "All students" as a broadcast audience means
    // everyone on the student roll; "everyone holding the STUDENT role" is an RBAC
    // question and answers something else. So these are NOT aliases of `role:
    // 'STUDENT'` and must not be refactored into it.
    if (audience === 'ALL_STUDENTS') {
      const rows = await prisma.studentProfile.findMany({
        where: { user: alive },
        select: { userId: true },
      });
      return { userIds: rows.map((r) => r.userId), kind: 'ALL_STUDENTS', unresolved: false };
    }
    if (audience === 'ALL_STAFF') {
      const rows = await prisma.staffProfile.findMany({
        where: { user: alive },
        select: { userId: true },
      });
      return { userIds: rows.map((r) => r.userId), kind: 'ALL_STAFF', unresolved: false };
    }

    const known = (ROLES as readonly string[]).includes(audience);
    if (!known) {
      return {
        userIds: [],
        kind: 'UNRESOLVED',
        unresolved: true,
        reason: `unknown audience "${audience}" - expected ALL_USERS, ALL_STUDENTS, ALL_STAFF or a role name`,
      };
    }
    const rows = await prisma.user.findMany({
      where: { ...alive, roles: { some: { role: audience } } },
      select: { id: true },
    });
    return { userIds: rows.map((r) => r.id), kind: `ROLE:${audience}`, unresolved: false };
  }

  // --- Shape 2: a structured object -----------------------------------------
  const role = typeof audience.role === 'string' ? audience.role.toUpperCase() : null;
  const sectionId = typeof audience.sectionId === 'string' ? audience.sectionId : null;
  const departmentId = typeof audience.departmentId === 'string' ? audience.departmentId : null;
  const batchId = typeof audience.batchId === 'string' ? audience.batchId : null;
  const userId = typeof audience.userId === 'string' ? audience.userId : null;

  if (userId) {
    const rows = await prisma.user.findMany({ where: { ...alive, id: userId }, select: { id: true } });
    return { userIds: rows.map((r) => r.id), kind: 'USER', unresolved: false };
  }

  if (role) {
    // Delegated to the bare-token path so the two shapes cannot drift: `{ role:
    // 'STUDENT' }` and the literal `STUDENT` must reach identical users.
    return resolveAnnouncementAudience(institutionId, JSON.stringify(role));
  }

  if (sectionId) {
    // `StudentProfile` has NO `sectionId`. It carries `batchId` plus a free-text
    // `section` NAME, while the audience stores a `Section` ROW id — and two batches
    // can both have a "Section A" (`Section` is unique on [batchId, name], not on
    // name). Filtering on the name alone would therefore mail every "Section A" in
    // the college whenever one batch's section was targeted.
    //
    // So: resolve the section row, then narrow by batch AND name. A section id that
    // does not resolve yields nobody, and says so, rather than falling back to the
    // whole batch or the whole college.
    const section = await prisma.section.findFirst({
      where: { id: sectionId },
      select: { id: true, batchId: true, name: true },
    });
    if (!section) {
      return { userIds: [], kind: 'SECTION', unresolved: true, reason: `section "${sectionId}" does not exist` };
    }
    const rows = await prisma.studentProfile.findMany({
      where: { user: alive, batchId: section.batchId, section: section.name },
      select: { userId: true },
    });
    return { userIds: rows.map((r) => r.userId), kind: 'SECTION', unresolved: false };
  }

  if (batchId) {
    const rows = await prisma.studentProfile.findMany({
      where: { user: alive, batchId },
      select: { userId: true },
    });
    return { userIds: rows.map((r) => r.userId), kind: 'BATCH', unresolved: false };
  }

  if (departmentId) {
    const rows = await prisma.staffProfile.findMany({
      where: { user: alive, departmentId },
      select: { userId: true },
    });
    return { userIds: rows.map((r) => r.userId), kind: 'DEPARTMENT', unresolved: false };
  }

  return {
    userIds: [],
    kind: 'UNRESOLVED',
    unresolved: true,
    reason: 'audience object has no role, sectionId, departmentId, batchId or userId',
  };
}

/**
 * Notify one announcement's audience. Called only on the PUBLISHED transition.
 *
 * Goes through `notifyMany` under the `ANNOUNCEMENT` category, so an alumnus who
 * muted institutional notices does not get it — and, because delivery is suppressed
 * rather than hidden, the counts below are honest about who actually received it.
 */
export async function fanOutAnnouncement(
  institutionId: string,
  announcement: { id: string; title: string; content: string; audienceJson: string; publishedAt: Date | null },
) {
  const resolution = await resolveAnnouncementAudience(institutionId, announcement.audienceJson);

  if (resolution.unresolved) {
    await writeAudit({
      institutionId,
      action: 'ANNOUNCEMENT_FANOUT_SKIPPED',
      entityType: 'Announcement',
      entityId: announcement.id,
      after: { reason: resolution.reason, audienceJson: announcement.audienceJson },
    });
    return { delivered: 0, muted: 0, duplicates: 0, ...resolution };
  }

  const publishedAt = announcement.publishedAt ?? new Date();

  const result = await notifyMany({
    institutionId,
    recipientUserIds: resolution.userIds,
    category: 'ANNOUNCEMENT',
    title: announcement.title,
    body: announcement.content,
    // Contains publishedAt, so a second approval of the same publication is a no-op
    // while a genuine re-publish after a rejection cycle is not.
    dedupeKey: `announcement:${announcement.id}:${publishedAt.toISOString()}`,
    // `sourceModule: 'admin'` — this one is raised by the college, not by the
    // alumni desk, and the app shows that in the row.
    sourceModule: 'admin',
    data: { announcementId: announcement.id },
  });

  return { delivered: result.delivered, muted: result.muted, duplicates: result.duplicates, ...resolution };
}
