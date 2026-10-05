/**
 * S-12 Notifications — delivery (docs/users/12-alumni-relations.md §3.7).
 *
 * One function writes alumni mail. Every emitter in this module calls `notify` or
 * `notifyMany` and nothing else, because the two things that must never be missed
 * — a graduate's mute list and the reminder sweep's idempotency — are enforced
 * here rather than remembered at each call site.
 *
 * The bug this replaces
 * ---------------------
 * Five places wrote `prisma.notification.create` directly:
 *
 *   mentorship.service.ts    3 sites  — accept/decline to the mentee, reminder to
 *                                        the mentor. Nobody was ever told a
 *                                        request had ARRIVED, which is the one
 *                                        alert the approval queue actually needs.
 *   events.service.ts        1 site   — RSVP decision.
 *   chapters.service.ts      1 site   — chapter announcement, typed BROADCAST.
 *   giving.service.ts        1 site   — donation recorded.
 *   admin.service.ts         1 site   — `createBroadcast`, typed ADMIN_BROADCAST.
 *
 * None of them consulted a preference, because no preference existed; the profile
 * screen showed three switches that saved nothing. None of them deduped, so the
 * mentorship session reminder re-fired on every call. Two of them typed the same
 * news differently (BROADCAST vs ADMIN_BROADCAST), so no filter could group them.
 *
 * Why suppression, not filtering
 * -----------------------------
 * A muted category writes NO ROW. The alternative — write it, then hide it — was
 * rejected for a specific reason: the unread badge counts rows the recipient
 * cannot see, so a graduate who mutes four categories watches a badge number that
 * only goes up and never clears. Suppressing at delivery keeps the inbox and the
 * badge honest, at the cost of not retaining an audit copy of suppressed mail.
 * That trade is worth stating out loud because it is a real one: the office cannot
 * prove afterwards that it sent a message a graduate had muted. The Broadcast row
 * itself is the record, not the notification.
 *
 * Dedupe
 * ------
 * `dedupeKey` is scoped per recipient and checked inside the same call as the
 * insert. There is no unique index backing it (a broadcast legitimately repeats
 * its key across institutions and across cycles), so this is a read-then-write,
 * which is safe here only because SQLite serialises writers. On Postgres this
 * would need a partial unique index; the wrapper is already shaped so only the
 * check moves.
 */
import { prisma } from '../../../db/prisma.js';
import {
  CATEGORIES,
  categoryMeta,
  isCategoryId,
  FANOUT_CHUNK,
  type CategoryId,
  type DeepLink,
} from './notifications.rules.js';

export type NotifyInput = {
  institutionId: string;
  recipientUserId: string;
  category: CategoryId;
  title: string;
  body: string;
  /**
   * Stable identity of the *message*, not of the moment. e.g.
   * `event-reminder:24:evt_1` — the same event nudges at 24h once, and again at
   * 2h under a different key. Leave undefined for mail that fires once by nature.
   */
  dedupeKey?: string | null;
  /** Deep-link payload; merged over `{ module, category }`. */
  data?: Record<string, unknown>;
  sourceModule?: string | null;
  /**
   * Pins the row to the top of the recipient's inbox while it is unread. Only the
   * office broadcast uses it, and it is a COLUMN rather than a `dataJson` flag
   * because the inbox asks "unread important" as a query.
   */
  isImportant?: boolean;
};

export type NotifyManyInput = Omit<NotifyInput, 'recipientUserId'> & {
  recipientUserIds: readonly string[];
  /**
   * Set false for WORK, not news. The mentorship-request digest is the office's
   * work queue; muting "mentorship" must not silently stop an officer seeing
   * requests waiting for approval. Everything else respects the mute list.
   */
  respectMutes?: boolean;
  /**
   * Compute the counts and write nothing. Used by the sweep preview so a stray
   * button press can be tested before it 900 people. The mute and dedupe filters
   * still apply, so the dry run reports what a real send would actually do.
   */
  dryRun?: boolean;
};

export type DeliveryOutcome = 'delivered' | 'muted' | 'duplicate';

export type NotifyResult = {
  delivered: number;
  muted: number;
  duplicates: number;
  /** Recipients we wrote a row for. */
  recipientUserIds: string[];
};

/** Thrown when an emitter names a category that does not exist. */
export class UnknownCategoryError extends Error {
  constructor(readonly category: string) {
    super(`Unknown notification category "${category}"`);
    this.name = 'UnknownCategoryError';
  }
}

/**
 * The mute list for a set of people, as a Set of category ids.
 *
 * One query per fan-out rather than one per recipient: a broadcast to every
 * graduate would otherwise issue 900 preference lookups. Absent rows mean not
 * muted, which is why an empty result is the common case and the fast one.
 */
export async function mutedCategoriesFor(
  institutionId: string,
  userIds: readonly string[],
): Promise<Map<string, Set<CategoryId>>> {
  const out = new Map<string, Set<CategoryId>>();
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return out;

  const rows = await prisma.notificationPreference.findMany({
    where: { institutionId, userId: { in: unique }, muted: true },
    select: { userId: true, category: true },
  });

  for (const row of rows) {
    // A stored row for a category we no longer define is ignored rather than
    // trusted: honouring it would mute a category the app cannot render, and
    // dropping the concept later would leave a mute nobody can undo.
    if (!isCategoryId(row.category)) continue;
    const set = out.get(row.userId) ?? new Set<CategoryId>();
    set.add(row.category);
    out.set(row.userId, set);
  }
  return out;
}

/** Keys already delivered to each of these people, so a second sweep is a no-op. */
async function existingDedupeKeys(
  recipientUserIds: readonly string[],
  dedupeKey: string,
): Promise<Set<string>> {
  const rows = await prisma.notification.findMany({
    where: { recipientUserId: { in: [...new Set(recipientUserIds)] }, dedupeKey },
    select: { recipientUserId: true },
  });
  return new Set(rows.map((r) => r.recipientUserId));
}

/** `dataJson` carries the module, the category, and whatever the deep link needs. */
export function buildDataJson(category: CategoryId, data?: Record<string, unknown>): string | null {
  const meta = categoryMeta(category);
  if (!meta) throw new UnknownCategoryError(category);
  return JSON.stringify({ module: meta.module, category, ...(data ?? {}) });
}

/**
 * The deep link for an already-stored row, resolved at READ time rather than
 * frozen at write time. A category's route can therefore be fixed without
 * backfilling 1,651 rows.
 */
export function deepLinkFor(type: string, data: Record<string, unknown> | null): DeepLink {
  const fromType = CATEGORIES.find((c) => c.type === type);
  if (!fromType) return null;
  try {
    return fromType.deepLink(data ?? {});
  } catch {
    // A malformed payload must not take the whole inbox down; an unlinkable row
    // is strictly better than a screen that fails to render.
    return { screen: 'Notifications' };
  }
}

export async function notify(input: NotifyInput): Promise<DeliveryOutcome> {
  const res = await notifyMany({ ...input, recipientUserIds: [input.recipientUserId] });
  if (res.delivered > 0) return 'delivered';
  if (res.muted > 0) return 'muted';
  return 'duplicate';
}

/**
 * Fan out one message to many people.
 *
 * Returns counts rather than the rows, because every caller wants to log "how many
 * of the 900 actually got this" and none of them wants 900 objects.
 */
export async function notifyMany(input: NotifyManyInput): Promise<NotifyResult> {
  const { recipientUserIds, respectMutes = true, dryRun = false, ...rest } = input;

  if (!isCategoryId(rest.category)) throw new UnknownCategoryError(rest.category);
  const meta = categoryMeta(rest.category);
  if (!meta) throw new UnknownCategoryError(rest.category);

  const targets = [...new Set(recipientUserIds.filter((id) => typeof id === 'string' && id.length > 0))];
  if (targets.length === 0) {
    return { delivered: 0, muted: 0, duplicates: 0, recipientUserIds: [] };
  }

  let mutedByUser = new Map<string, Set<CategoryId>>();
  if (respectMutes) {
    mutedByUser = await mutedCategoriesFor(rest.institutionId, targets);
  }

  let survivors = targets.filter((id) => !(mutedByUser.get(id)?.has(rest.category) ?? false));
  const muted = targets.length - survivors.length;

  if (survivors.length === 0) {
    return { delivered: 0, muted, duplicates: 0, recipientUserIds: [] };
  }

  let duplicates = 0;
  if (rest.dedupeKey) {
    const seen = await existingDedupeKeys(survivors, rest.dedupeKey);
    survivors = survivors.filter((id) => {
      if (!seen.has(id)) return true;
      duplicates += 1;
      return false;
    });
  }

  if (survivors.length === 0) {
    return { delivered: 0, muted, duplicates, recipientUserIds: [] };
  }

  // Chunked. SQLite binds at most 999 variables per statement and each row carries
  // eight of them, so an un-chunked `createMany` to a large alumni body (ALL_ALUMNI
  // is ~900 in dev.db) fails at the database rather than at a bound we chose.
  const payload = survivors.map((recipientUserId) => ({
    institutionId: rest.institutionId,
    recipientUserId,
    type: meta.type,
    title: rest.title,
    body: rest.body,
    sourceModule: rest.sourceModule ?? meta.module,
    dedupeKey: rest.dedupeKey ?? null,
    isImportant: rest.isImportant === true,
    dataJson: buildDataJson(rest.category, rest.data),
  }));

  if (!dryRun) {
    for (let i = 0; i < payload.length; i += FANOUT_CHUNK) {
      await prisma.notification.createMany({ data: payload.slice(i, i + FANOUT_CHUNK) });
    }
  }

  return { delivered: survivors.length, muted, duplicates, recipientUserIds: survivors };
}
/**
 * Change a recipient's mute for one category.
 *
 * Upsert rather than delete-when-unmuted: keeping an explicit `muted: false` row
 * means "we know about this category and they chose to hear it", which is what
 * lets a future ninth category distinguish "default on" from "deliberately on".
 * Absent row still means not-muted, so the behaviour is identical either way.
 */
export async function setMuted(
  institutionId: string,
  userId: string,
  category: CategoryId,
  muted: boolean,
): Promise<{ category: CategoryId; muted: boolean }> {
  await prisma.notificationPreference.upsert({
    where: { userId_category: { userId, category } },
    create: { institutionId, userId, category, muted },
    update: { muted },
  });
  return { category, muted };
}
