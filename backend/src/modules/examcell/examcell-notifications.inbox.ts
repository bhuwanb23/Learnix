/**
 * X-09 — Exam cell notifications: the officer's inbox, the catalogue, and the composer.
 * Docs: 05-exam-cell.md §3.7
 *
 * WHAT THIS IS
 * ------------
 * The officer's side of the notification feature. The rules (nine categories, the type → category
 * map) live in `examcell-notifications.rules.ts`; the emitters live in
 * `examcell-notifications.service.ts`. This file is the READ side plus the one thing an officer
 * is allowed to WRITE: a notice.
 *
 * THE INBOX IS OFFICER-ONLY
 * -------------------------
 * A student's exam notice does not appear in the desk's queue, and the desk's evaluation deadline
 * does not appear in a student's. That is not a filtering convenience — it is the difference
 * between a work queue and a personal inbox. The student reads the SHARED student inbox, which
 * merges the finance, hostel and exam-cell vocabularies.
 *
 * The selection is on the TYPE, not on `sourceModule`, because `sourceModule: 'examcell'` is also
 * set on a row the student owns (a cheating-case decision, a result publication). Selecting by
 * source module would pull a student's result into the controller's work queue.
 *
 * MUTES ARE SUPPRESSION, AND "IMPORTANT" IS THE EXCEPTION
 * -------------------------------------------------------
 * A reader who muted a category gets NO ROW for it, rather than a row they cannot see — because the
 * unread badge counts rows the reader cannot see, and a badge that only goes up and never clears is
 * worse than no badge. The exception is a type that declares `bypassesMute`: an IMPORTANT notice
 * reaches the reader whatever they muted, because a mute is a preference about noise and not about
 * safety.
 */
import { prisma } from '../../db/prisma.js';
import { forbidden, notFound, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import {
  COMPOSABLE_CATEGORIES,
  EXAM_CELL_BROADCAST_AUDIENCES,
  EXAM_CELL_CATEGORIES,
  EXAM_CELL_CATEGORY_IDS,
  EXAM_CELL_TYPE_META,
  OFFICER_CATEGORY_IDS,
  broadcastAudienceLabel,
  examCellCategory,
  examCellTypeMeta,
  type ExamCellCategoryId,
} from './examcell-notifications.rules.js';
import { raise } from './examcell-notifications.service.js';

// ── Catalogue ─────────────────────────────────────────────────────────────

/**
 * The nine categories, with the vocabulary the screen renders from.
 *
 * The rules live on the SERVER so the officer's screen does not hardcode a second copy of the
 * labels, icons and colours — a second copy is a second thing to forget to update, and the symptom
 * is a chip that says "Results" in one place and "Result publication" in another.
 */
export async function examCellNotificationCatalogue() {
  return {
    categories: EXAM_CELL_CATEGORIES,
    // Which of the nine a controller may COMPOSE, as opposed to receive.
    composable: COMPOSABLE_CATEGORIES,
    // The categories the OFFICER's inbox shows. The student-facing ones are in the same table but
    // belong to the student's inbox, and offering them as chips here would be a chip that can only
    // ever show nothing.
    officerCategories: OFFICER_CATEGORY_IDS,
    // The audiences a notice may target, for the composer.
    audiences: EXAM_CELL_BROADCAST_AUDIENCES,
  };
}

// ── The officer's inbox ───────────────────────────────────────────────────

export interface ExamCellInboxFilters {
  category?: string;
  unreadOnly?: boolean;
  importantOnly?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * The exam office's inbox.
 *
 * Selects by the exam cell's own types, so a row another desk wrote is not in here — and a row the
 * exam cell DID write is, even if its `type` is a legacy `EXAM_CELL_BROADCAST` or an unregistered
 * `EXAM_`-prefixed type.
 */
export async function listExamCellNotifications(
  userId: string,
  institutionId: string,
  filters: ExamCellInboxFilters = {},
) {
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
  const skip = (page - 1) * pageSize;

  const all = await prisma.notification.findMany({
    where: { recipientUserId: userId, institutionId },
    orderBy: { createdAt: 'desc' },
  });

  const shape = (n: (typeof all)[number]) => {
    const cat = examCellCategory(n.type);
    const meta = examCellTypeMeta(n.type);
    return {
      id: n.id,
      type: n.type,
      typeLabel: meta.label,
      icon: meta.icon,
      color: meta.color,
      category: cat,
      categoryLabel: cat
        ? EXAM_CELL_CATEGORIES.find((c) => c.id === cat)?.label ?? cat
        : null,
      title: n.title,
      body: n.body,
      read: n.readAt !== null,
      readAt: n.readAt,
      important: n.isImportant,
      createdAt: n.createdAt,
      data: parseData(n.dataJson),
    };
  };

  // The exam cell's own rows. The `EXAM_` prefix catches a type this rules file has not caught up
  // with, so a new emitter shipping first is labelled rather than vanished.
  const scoped = all.filter((n) => n.type in EXAM_CELL_TYPE_META || n.type.startsWith('EXAM_')).map(shape);

  const filtered = scoped.filter((n) => {
    if (filters.category && n.category !== filters.category) return false;
    if (filters.unreadOnly && n.read) return false;
    if (filters.importantOnly && !n.important) return false;
    return true;
  });

  return {
    notifications: filtered.slice(skip, skip + pageSize),
    unread: scoped.filter((n) => !n.read).length,
    importantUnread: scoped.filter((n) => n.important && !n.read).length,
    // Counts over the WHOLE inbox, not the current page, so the badge never changes because the
    // officer scrolled.
    counts: EXAM_CELL_CATEGORY_IDS.map((id) => ({
      category: id,
      count: scoped.filter((n) => n.category === id && !n.read).length,
    })),
    pagination: { page, pageSize, total: filtered.length, hasMore: skip + pageSize < filtered.length },
    // Reported rather than hidden: an officer who remembers a message can tell it was filtered by
    // category, not lost.
    outOfScope: all.length - scoped.length,
  };
}

function parseData(json: string | null): Record<string, unknown> | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    // A malformed payload must not take the whole inbox down with it.
    return null;
  }
}

// ── Read state ────────────────────────────────────────────────────────────

/** Mark one message read. Scoped to the recipient, so nobody can mark another's. */
export async function markExamCellNotificationRead(
  id: string,
  userId: string,
  institutionId: string,
) {
  const existing = await prisma.notification.findFirst({
    where: { id, recipientUserId: userId, institutionId },
    select: { id: true, readAt: true },
  });
  if (!existing) throw notFound('Notification not found');
  if (existing.readAt) return { id, alreadyRead: true };
  await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  return { id, alreadyRead: false };
}

/** Read or un-read, so "mark unread" is possible from the row menu. */
export async function setExamCellNotificationRead(
  id: string,
  userId: string,
  institutionId: string,
  read: boolean,
) {
  const existing = await prisma.notification.findFirst({
    where: { id, recipientUserId: userId, institutionId },
    select: { id: true },
  });
  if (!existing) throw notFound('Notification not found');
  await prisma.notification.update({
    where: { id },
    data: { readAt: read ? new Date() : null },
  });
  return { id, read };
}

/**
 * Mark every exam-cell notification read.
 *
 * Scoped to the exam cell's types, deliberately. The shared `markAllRead` would also mark the
 * officer's finance mail read, and "I read the exam notices" is not a claim about their bills.
 */
export async function markAllExamCellNotificationsRead(userId: string, institutionId: string) {
  const res = await prisma.notification.updateMany({
    where: {
      recipientUserId: userId,
      institutionId,
      readAt: null,
      type: { in: Object.keys(EXAM_CELL_TYPE_META) },
    },
    data: { readAt: new Date() },
  });
  return { updated: res.count };
}

// ── The composer ──────────────────────────────────────────────────────────

export interface ExamCellBroadcastBody {
  audience: string;
  title: string;
  body: string;
  /** Mark the notice IMPORTANT, so it bypasses the recipients' mutes. */
  important?: boolean;
}

/**
 * Compose a notice to a group.
 *
 * The audience decides the TYPE, and the type decides the chrome, the chip it lands under, and —
 * for an IMPORTANT notice — whether it ignores the recipient's mutes.
 *
 * Only IMPORTANT_NOTICE is composable. The other eight are facts the system reports, and letting a
 * controller publish a RESULT_PUBLISHED would let them forge a result.
 */
export async function composeExamCellBroadcast(
  institutionId: string,
  senderUserId: string,
  body: ExamCellBroadcastBody,
) {
  const category: ExamCellCategoryId = 'IMPORTANT_NOTICE';
  if (!COMPOSABLE_CATEGORIES.includes(category)) {
    throw unprocessable(`${category} cannot be composed`);
  }
  const audience = String(body.audience ?? '').toUpperCase();
  if (!EXAM_CELL_BROADCAST_AUDIENCES.some((a) => a.id === audience)) {
    throw unprocessable('Unknown audience', {
      allowed: EXAM_CELL_BROADCAST_AUDIENCES.map((a) => a.id),
    });
  }

  const recipientIds = await resolveAudience(institutionId, audience);
  const important = body.important === true;

  const broadcast = await prisma.broadcast.create({
    data: {
      institutionId,
      senderUserId,
      audienceJson: JSON.stringify({ audience }),
      templateKey: 'EXAM_NOTICE',
      title: body.title,
      body: body.body,
      channels: 'IN_APP',
      isImportant: important,
      sentAt: new Date(),
    },
  });

  const raised = await raise({
    institutionId,
    recipientUserIds: recipientIds,
    type: 'EXAM_IMPORTANT',
    title: body.title,
    body: body.body,
    data: { module: 'examcell', screen: 'Notifications', broadcastId: broadcast.id },
    important,
    actorUserId: senderUserId,
  });

  await writeAudit({
    actorUserId: senderUserId,
    institutionId,
    action: 'EXAM_BROADCAST',
    entityType: 'Broadcast',
    entityId: broadcast.id,
    after: {
      category,
      audience,
      recipients: raised.delivered,
      muted: raised.muted,
      important,
    },
  });

  return {
    id: broadcast.id,
    category,
    type: 'EXAM_IMPORTANT',
    audience,
    audienceLabel: broadcastAudienceLabel(audience),
    recipients: raised.delivered,
    // Muted recipients are REPORTED, not hidden: an officer who sends an important notice to 400
    // students and hears "0 sent" needs to know that 400 people muted it.
    muted: raised.muted,
    important,
  };
}

/**
 * Who an audience resolves to.
 *
 * EVERY branch is tenant-scoped. The old composer resolved `ALL_STUDENTS` with no institution
 * filter, so one college's exam notice was delivered to every college's students.
 */
async function resolveAudience(institutionId: string, audience: string): Promise<string[]> {
  const students = async () =>
    (await prisma.studentProfile.findMany({
      where: { user: { institutionId, deletedAt: null } },
      select: { userId: true, currentSemester: true },
    })).map((s) => s.userId);

  const officers = async () =>
    (await prisma.user.findMany({
      where: { institutionId, deletedAt: null, roles: { some: { role: { in: ['EXAMCELL', 'ADMIN'] } } } },
      select: { id: true },
    })).map((u) => u.id);

  if (audience === 'ALL_STUDENTS') return students();
  if (audience === 'ALL_OFFICERS') return officers();
  if (audience === 'EVERYONE') {
    return [...new Set([...(await students()), ...(await officers())])];
  }
  if (audience === 'SEM_STUDENTS') {
    const rows = await prisma.studentProfile.findMany({
      where: { user: { institutionId, deletedAt: null }, currentSemester: { gte: 3 } },
      select: { userId: true },
    });
    return rows.map((s) => s.userId);
  }
  if (audience === 'FINAL_YEAR') {
    const rows = await prisma.studentProfile.findMany({
      where: { user: { institutionId, deletedAt: null }, currentSemester: { gte: 7 } },
      select: { userId: true },
    });
    return rows.map((s) => s.userId);
  }
  return [];
}

// ── The broadcast history ─────────────────────────────────────────────────

/** What has been sent, and to how many people. The old desk could send blind. */
export async function listExamCellBroadcasts(institutionId: string, limit = 20) {
  const rows = await prisma.broadcast.findMany({
    where: { institutionId, templateKey: 'EXAM_NOTICE' },
    orderBy: { sentAt: 'desc' },
    take: Math.min(100, Math.max(1, limit)),
  });
  const senders = [...new Set(rows.map((r) => r.senderUserId))];
  const names = await prisma.user.findMany({
    where: { id: { in: senders } },
    select: { id: true, fullName: true },
  });
  const byId = new Map(names.map((n) => [n.id, n.fullName]));

  return {
    broadcasts: rows.map((r) => {
      let audience = 'ALL_STUDENTS';
      try {
        audience = (JSON.parse(r.audienceJson) as { audience?: string }).audience ?? audience;
      } catch {
        // A malformed audience string must not lose the row from the history.
      }
      return {
        id: r.id,
        title: r.title,
        body: r.body,
        audience,
        audienceLabel: broadcastAudienceLabel(audience),
        sentBy: byId.get(r.senderUserId) ?? 'Unknown',
        important: r.isImportant,
        sentAt: r.sentAt ?? r.createdAt,
      };
    }),
  };
}

/** Forbid a caller who is not entitled to compose. */
export function assertCanComposeExamNotice(role: string) {
  if (role !== 'EXAMCELL' && role !== 'ADMIN') {
    throw forbidden('Only the exam office can publish an examination notice');
  }
}
