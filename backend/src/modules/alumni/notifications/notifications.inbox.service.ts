/**
 * S-12 Notifications — the inbox (docs/users/12-alumni-relations.md §3.7).
 *
 * What the old reader got wrong
 * -----------------------------
 * `listNotifications` in alumni.service.ts was twelve lines and could not answer
 * any question a person actually has:
 *
 *   - `take: 50`, no filter, no page. Past 50 messages the inbox was a lie — the
 *     only way to reach older mail was mark-all-read and hope.
 *   - No category filter. Chapter news, a donation receipt, an RSVP confirmation
 *     and an office broadcast were four rows in one undifferentiated list, each
 *     wearing whatever icon `TYPE_META[type] ?? SYSTEM` resolved to — which is how
 *     all 33 live `EVENT` rows rendered as "System".
 *   - No single-row read. Tapping a row could only be wired to read-all, so
 *     opening your inbox on the train marked your pending mentorship approval as
 *     read without you having seen it.
 *   - `orderBy createdAt` with no unread weighting, and no way to see "just the
 *     unread" at all.
 *
 * The accounts desk solved this shape already (categories, filters, pagination,
 * per-row read). This adopts it without touching accounts' files — the shared
 * surface between the two is `Notification.type`, which is why every type this
 * desk owns is also registered there with `category: null`.
 *
 * Ordering, and the one place this could have been clever
 * -------------------------------------------------------
 * Order is `createdAt desc`. An office broadcast flagged important is promoted to
 * the top of page 1 — but only while it is UNREAD.
 *
 * The obvious alternative, `orderBy: [{ readAt: 'asc' }, { createdAt: 'desc' }]`
 * (SQLite sorts NULL first, so unread floats up), was rejected: it reorders the
 * entire inbox so that every unread message of any age sits above a message read
 * one second ago, and it makes the ordering unexplainable to the person looking
 * at it. A pin that never unpins is worse than no pin, and an "important" flag
 * that must be cleared by reading it is exactly the behaviour a graduate wants
 * from an urgent notice.
 */
import { prisma } from '../../../db/prisma.js';
import {
  CATEGORIES,
  CATEGORY_IDS,
  INBOX_MAX_LIMIT,
  UNKNOWN_TYPE_META,
  categoryForType,
  categoryMeta,
  isCategoryId,
  typesForCategory,
  type CategoryId,
} from './notifications.rules.js';
import { deepLinkFor } from './notifications.delivery.js';

type Row = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: Date | null;
  isImportant: boolean;
  createdAt: Date;
  dataJson: string | null;
};

export type InboxOptions = {
  category?: CategoryId;
  unreadOnly?: boolean;
  /** Restrict to rows flagged important and still unread. */
  importantOnly?: boolean;
  page?: number;
  pageSize?: number;
};

/** How many promoted important rows may jump the queue on page 1. */
const PIN_LIMIT = 5;

function parseData(dataJson: string | null): Record<string, unknown> | null {
  if (!dataJson) return null;
  try {
    const parsed = JSON.parse(dataJson);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    // dataJson is written by us, but a hand-edited or legacy row must not break
    // the screen. A null payload renders the message without a deep link.
    return null;
  }
}

function shape(row: Row) {
  const data = parseData(row.dataJson);
  const categoryId = categoryForType(row.type);
  const meta = categoryId ? categoryMeta(categoryId) : null;
  return {
    id: row.id,
    // Fall back to the raw type so an unregistered type still shows as itself
    // rather than silently reading as one of ours.
    category: categoryId,
    type: row.type,
    label: meta?.label ?? UNKNOWN_TYPE_META.label,
    icon: meta?.icon ?? UNKNOWN_TYPE_META.icon,
    color: meta?.color ?? UNKNOWN_TYPE_META.color,
    title: row.title,
    body: row.body,
    read: row.readAt !== null,
    readAt: row.readAt,
    createdAt: row.createdAt,
    // A real column, not a flag dug out of dataJson: the pin and the important-only
    // filter both ask this as a predicate, so it has to be queryable. Defaults to
    // false on every pre-existing row, which is correct — none was ever flagged.
    important: row.isImportant,
    data,
    deepLink: deepLinkFor(row.type, data),
  };
}

/** Unread tally per category, plus the total, in one grouped query. */
async function countsFor(
  institutionId: string,
  recipientUserId: string,
): Promise<{
  total: number;
  unread: number;
  byCategory: Record<string, { total: number; unread: number }>;
}> {
  const grouped = await prisma.notification.groupBy({
    by: ['type', 'readAt'],
    where: { institutionId, recipientUserId },
    _count: { _all: true },
  });

  const byCategory: Record<string, { total: number; unread: number }> = {};
  let total = 0;
  let unread = 0;

  for (const c of CATEGORIES) byCategory[c.id] = { total: 0, unread: 0 };

  for (const g of grouped) {
    const n = g._count._all;
    total += n;
    const isUnread = g.readAt === null;
    if (isUnread) unread += n;

    // A type this desk does not own (PAYROLL reaching an alumni inbox) still has
    // to appear in the totals, or the header disagrees with the list.
    const id = categoryForType(g.type);
    const bucket = (id ? byCategory[id] : undefined) ?? { total: 0, unread: 0 };
    bucket.total += n;
    if (isUnread) bucket.unread += n;
    if (id) byCategory[id] = bucket;
  }

  return { total, unread, byCategory };
}

export async function listInbox(
  institutionId: string,
  recipientUserId: string,
  isOffice: boolean,
  opts: InboxOptions = {},
) {
  const page = Math.max(1, Math.trunc(opts.page ?? 1));
  const pageSize = Math.min(INBOX_MAX_LIMIT, Math.max(1, Math.trunc(opts.pageSize ?? INBOX_MAX_LIMIT)));

  // A category filter arrives as an id; the table stores a type. Resolve it here so
  // a caller cannot smuggle a raw type through and read another desk's mail.
  //
  // A category can own more than one type — `BROADCAST` owns both the current
  // `ALUMNI_BROADCAST` and the legacy `BROADCAST` — so the filter is an `in` list.
  const typeFilter = opts.category ? typesForCategory(opts.category) : undefined;
  if (opts.category && (!typeFilter || typeFilter.length === 0)) {
    // Unreachable via the zod contract, which validates the enum. Kept so a future
    // internal caller cannot bypass the check by calling the service directly.
    throw new Error(`Cannot filter by unknown category "${opts.category}"`);
  }

  const where = {
    institutionId,
    recipientUserId,
    ...(typeFilter ? { type: { in: typeFilter } } : {}),
    ...(opts.unreadOnly ? { readAt: null } : {}),
    // `isImportant`, not `type`. Filtering on the type would pin every office
    // broadcast ever sent whether or not the office flagged it — the flag is the
    // whole point, and it lives in its own indexed column.
    ...(opts.importantOnly ? { readAt: null, isImportant: true } : {}),
  };

  const [rows, total, counts] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
    countsFor(institutionId, recipientUserId),
  ]);

  let notifications = rows.map(shape);

  // Promote unread important broadcasts on page 1 only. Skipped when the caller has
  // filtered down to one category, because a pin that ignores the filter is the
  // thing the filter exists to prevent — EXCEPT for the important-only view, where
  // the promotion is the whole point and every row already qualifies.
  const canPin = page === 1 && !opts.category && !opts.unreadOnly && !opts.importantOnly;
  if (canPin) {
    const pinned = await prisma.notification.findMany({
      where: { institutionId, recipientUserId, isImportant: true, readAt: null },
      orderBy: { createdAt: 'desc' },
      take: PIN_LIMIT,
    });
    const onPage = new Set(notifications.map((n) => n.id));
    const leading = pinned.filter((p) => !onPage.has(p.id)).map(shape);
    if (leading.length > 0) notifications = [...leading, ...notifications].slice(0, pageSize);
  }

  const importantUnread = await prisma.notification.count({
    where: { institutionId, recipientUserId, isImportant: true, readAt: null },
  });

  return {
    notifications,
    unread: counts.unread,
    importantUnread,
    counts: counts.byCategory,
    totals: { total: counts.total },
    pagination: { page, pageSize, total, hasMore: page * pageSize < total },
    // The office needs to know it is the office to render the sweep and composer
    // tabs. Inbox rows themselves are identical either way — there is no office-only
    // notification.
    viewerContext: { isOffice },
  };
}

export async function getNotification(institutionId: string, recipientUserId: string, id: string) {
  const row = await prisma.notification.findFirst({
    where: { id, institutionId, recipientUserId },
  });
  if (!row) return null;
  return shape(row);
}

/**
 * Mark one row read/unread.
 *
 * `updateMany` scoped to the recipient rather than `update({ where: { id } })`: an
 * unguarded update would let a graduate flip the read state of somebody else's
 * notification by guessing a cuid, and — worse — confirm it exists by observing the
 * success. Returns the shaped row, or null when the row is not theirs, which the
 * route turns into a 404 rather than a 403: the existence of another person's
 * message is itself not this caller's business.
 */
export async function setRead(
  institutionId: string,
  recipientUserId: string,
  id: string,
  read: boolean,
) {
  const res = await prisma.notification.updateMany({
    where: { id, institutionId, recipientUserId },
    data: { readAt: read ? new Date() : null },
  });
  if (res.count === 0) return null;
  return getNotification(institutionId, recipientUserId, id);
}

export async function markAllRead(institutionId: string, recipientUserId: string) {
  const res = await prisma.notification.updateMany({
    where: { institutionId, recipientUserId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: res.count };
}

/**
 * Category list for the filter bar, with live unread counts.
 *
 * Built from the rules rather than from the data, so a category nobody has received
 * anything for still appears — otherwise the mute list and the filter bar would
 * each show a different set of categories depending on your inbox contents.
 */
export async function inboxCatalogue(
  institutionId: string,
  recipientUserId: string,
) {
  const counts = await countsFor(institutionId, recipientUserId);
  return {
    categories: CATEGORIES.map((c) => ({
      id: c.id,
      label: c.label,
      icon: c.icon,
      color: c.color,
      blurb: c.blurb,
      total: counts.byCategory[c.id]?.total ?? 0,
      unread: counts.byCategory[c.id]?.unread ?? 0,
    })),
    categoryIds: CATEGORY_IDS,
  };
}

export { isCategoryId };
