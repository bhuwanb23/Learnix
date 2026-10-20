/**
 * The hostel's notification service: the warden's inbox, the broadcast composer, and the emitters.
 * Docs: 08-hostel.md §3.8
 *
 * WHAT THIS IS, AND WHY IT IS NOT THE ACCOUNTS INBOX
 * --------------------------------------------------
 * The `Notification` table is shared, but a CATEGORY is not. A fee being due and the water being
 * off in Block B are different facts about the world, and a chip that could show either means
 * nothing. So the hostel owns its own eight categories (see `hostel-notifications.rules.ts`) and its
 * own inbox, which selects by the hostel's types.
 *
 * A RESIDENT reads a different inbox — the shared student one — which merges the finance and hostel
 * vocabularies so a student sees their bills AND their block's water notice. That composition is
 * done by the student route, not here.
 *
 * THE COMPOSED / NOTICED SPLIT
 * ----------------------------
 * Three categories are COMPOSED by a warden: ANNOUNCEMENT, MAINTENANCE and EMERGENCY. The other five
 * are NOTICED by the system when it notices something. The distinction is a privilege, not a
 * description — a warden who could publish a GATE_PASS approval could forge one, so they cannot.
 *
 * MUTES ARE SUPPRESSION, NOT FILTERING
 * ------------------------------------
 * A muted category writes NO ROW, rather than writing a row and hiding it. The reason is the
 * unread badge: it counts rows the recipient cannot see, so a resident who mutes four categories
 * watches a badge that only goes up and never clears. The Broadcast row is the record of what was
 * sent, not the notification.
 *
 * EXCEPT FOR EMERGENCIES
 * ----------------------
 * An emergency notification BYPASSES the mute. You cannot opt out of being told to leave a building,
 * and a mute is a preference about noise, not about safety. The bypass is not a special case
 * sprinkled through the code — it is a FLAG on the type, and the delivery path asks the flag rather
 * than the category, so a new emergency type inherits the behaviour by being declared correctly.
 */
import { prisma } from '../../db/prisma.js';
import { notFound, forbidden, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { dayRange, localToday } from './hostel-mess.rules.js';
import {
  COMPOSABLE_CATEGORIES,
  HOSTEL_CATEGORIES,
  HOSTEL_CATEGORY_IDS,
  HOSTEL_TYPE_META,
  hostelCategory,
  hostelTypeMeta,
  type HostelCategoryId,
} from './hostel-notifications.rules.js';

// ── Catalogue ────────────────────────────────────────────────────────────

/**
 * The eight categories, with the vocabulary the screen renders from.
 *
 * The rules live on the SERVER so the warden's screen does not hardcode a second copy of the
 * labels, icons and colours — a second copy is a second thing to forget to update, and the symptom
 * is a chip that says "Food" in one place and "Mess" in another.
 */
export async function hostelNotificationCatalogue() {
  return {
    categories: HOSTEL_CATEGORIES,
    // Which of the eight a warden may COMPOSE, as opposed to receive. The screen uses this to
    // decide which tab opens the composer.
    composable: COMPOSABLE_CATEGORIES,
  };
}

// ── The warden's inbox ────────────────────────────────────────────────────

export interface HostelInboxFilters {
  category?: string;
  unreadOnly?: boolean;
  importantOnly?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * The hostel inbox.
 *
 * Selects by the HOSTEL's types, so a row the hostel did not write is not in here — and a row the
 * hostel DID write is, even if its `type` is a legacy `HOSTEL`. The selection is on the TYPE, not
 * the source module, because `sourceModule: 'hostel'` is also set by the mess expense approval the
 * accounts desk needs to see, and that row is not a hostel notification.
 */
export async function listHostelNotifications(
  userId: string,
  institutionId: string,
  filters: HostelInboxFilters = {},
) {
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
  const skip = (page - 1) * pageSize;

  const all = await prisma.notification.findMany({
    where: { recipientUserId: userId, institutionId },
    orderBy: { createdAt: 'desc' },
  });

  // The hostel's own types, plus the legacy `HOSTEL`, plus any `HOSTEL_`-prefixed type the rules
  // file has not caught up with. A row that is neither is another desk's row sitting in the same
  // table and is not this screen's business — the mess expense approval the accounts office needs
  // is raised by the hostel but is a FINANCE message, and it has `sourceModule: 'hostel'`, so
  // selecting by source module would wrongly pull it in.
  const hostelTypes = new Set(Object.keys(HOSTEL_TYPE_META));

  const shape = (n: (typeof all)[number]) => {
    const cat = hostelCategory(n.type);
    const meta = hostelTypeMeta(n.type);
    return {
      id: n.id,
      type: n.type,
      typeLabel: meta.label,
      icon: meta.icon,
      color: meta.color,
      category: cat,
      categoryLabel: cat ? HOSTEL_CATEGORIES.find((c) => c.id === cat)?.label ?? cat : null,
      title: n.title,
      body: n.body,
      read: n.readAt !== null,
      readAt: n.readAt,
      important: n.isImportant,
      createdAt: n.createdAt,
      data: parseData(n.dataJson),
    };
  };

  const shaped = all
    .filter((n) => hostelTypes.has(n.type) || n.type.startsWith('HOSTEL_'))
    .map(shape);

  const filtered = shaped.filter((n) => {
    if (filters.category && n.category !== filters.category) return false;
    if (filters.unreadOnly && n.read) return false;
    if (filters.importantOnly && !n.important) return false;
    return true;
  });

  return {
    notifications: filtered.slice(skip, skip + pageSize),
    unread: shaped.filter((n) => !n.read).length,
    importantUnread: shaped.filter((n) => n.important && !n.read).length,
    counts: HOSTEL_CATEGORY_IDS.map((id) => ({
      category: id,
      count: shaped.filter((n) => n.category === id && !n.read).length,
    })),
    pagination: { page, pageSize, total: filtered.length, hasMore: skip + pageSize < filtered.length },
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

export async function markHostelNotificationRead(id: string, userId: string, institutionId: string) {
  const existing = await prisma.notification.findFirst({
    where: { id, recipientUserId: userId, institutionId },
    select: { id: true, readAt: true },
  });
  if (!existing) throw notFound('Notification not found');
  if (existing.readAt) return { id, alreadyRead: true };
  await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  return { id, alreadyRead: false };
}

export async function setHostelNotificationRead(
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
  await prisma.notification.update({ where: { id }, data: { readAt: read ? new Date() : null } });
  return { id, read };
}

/**
 * Mark every hostel notification read.
 *
 * Scoped to the HOSTEL's types, deliberately. The shared `markAllRead` would also mark the
 * warden's finance mail read, and "I read the hostel notices" is not a claim about their bills.
 */
export async function markAllHostelNotificationsRead(userId: string, institutionId: string) {
  const res = await prisma.notification.updateMany({
    where: {
      recipientUserId: userId,
      institutionId,
      readAt: null,
      type: { in: Object.keys(HOSTEL_TYPE_META) },
    },
    data: { readAt: new Date() },
  });
  return { updated: res.count };
}

// ── Raising a notification ────────────────────────────────────────────────

/**
 * Write a notification to a set of recipients, honouring their mutes.
 *
 * `category` is the CATEGORY, not the type, because that is what a recipient mutes. The type
 * carries the finer distinction — a maintenance notice and an emergency notice are both in the
 * hostel's world but only one is worth a separate chip.
 *
 * The mute is suppression, not filtering (see the header). The EXCEPTION is a type that declares
 * `bypassesMute`, which is how an emergency reaches a resident who muted everything else.
 */
export async function raiseHostelNotification(
  institutionId: string,
  recipientUserIds: readonly string[],
  options: {
    type: string;
    title: string;
    body: string;
    dataJson?: string | null;
    important?: boolean;
    /**
     * A key identifying the LOGICAL event, so the same event raised twice writes one row.
     *
     * The sweep is on demand, and the "someone is late" fact does not change between two presses of
     * the button — so without this, pressing it twice leaves two identical alerts in a warden's
     * inbox. The key is per (recipient, key): the notification table is NOT unique on it, because
     * the same logical event legitimately repeats across institutions and across cycles.
     */
    dedupeKey?: string;
  },
) {
  const category = hostelCategory(options.type);
  const meta = HOSTEL_TYPE_META[options.type];
  let targets = [...new Set(recipientUserIds.filter((id) => typeof id === 'string' && id.length > 0))];

  // THE DEDUPE. A recipient who already has a row with this key is not written another.
  if (options.dedupeKey && targets.length > 0) {
    const seen = await prisma.notification.findMany({
      where: { recipientUserId: { in: targets }, dedupeKey: options.dedupeKey },
      select: { recipientUserId: true },
    });
    const already = new Set(seen.map((r) => r.recipientUserId));
    targets = targets.filter((id) => !already.has(id));
  }

  if (targets.length === 0) return { delivered: 0, muted: 0, recipientUserIds: [] as string[] };

  // The flag lives on the TYPE, so a new emergency type inherits the behaviour by being declared
  // correctly rather than by remembering to special-case it at every call site.
  const bypassesMute = meta?.bypassesMute === true;

  let survivors = targets;
  let muted = 0;
  if (category && !bypassesMute) {
    const mutes = await prisma.notificationPreference.findMany({
      where: { institutionId, userId: { in: targets }, category, muted: true },
      select: { userId: true },
    });
    const mutedIds = new Set(mutes.map((m) => m.userId));
    survivors = targets.filter((id) => !mutedIds.has(id));
    muted = targets.length - survivors.length;
  }

  if (survivors.length > 0) {
    // Chunked: SQLite has a bound-variable ceiling, and "every resident in the institution" is a
    // legitimate recipient set. One un-chunked createMany to a large body fails at the database.
    const CHUNK = 400;
    for (let i = 0; i < survivors.length; i += CHUNK) {
      await prisma.notification.createMany({
        data: survivors.slice(i, i + CHUNK).map((recipientUserId) => ({
          institutionId,
          recipientUserId,
          type: options.type,
          title: options.title,
          body: options.body,
          dataJson: options.dataJson ?? null,
          sourceModule: 'hostel',
          isImportant: options.important === true,
          dedupeKey: options.dedupeKey ?? null,
        })),
      });
    }
  }

  return { delivered: survivors.length, muted, recipientUserIds: survivors };
}

// ── The composer ──────────────────────────────────────────────────────────

export interface HostelBroadcastBody {
  category: string;
  audience:
    | { kind: 'ALL_RESIDENTS' }
    | { kind: 'BLOCK'; blockId: string }
    | { kind: 'MESS_MEMBERS' };
  title: string;
  body: string;
}

/**
 * Compose a message to a group of residents.
 *
 * `category` decides the TYPE, and the type decides the chrome, the chip it lands under, and —
 * for an emergency — whether it ignores the recipient's mutes.
 *
 * Only COMPOSABLE categories are accepted. The other five are facts the system reports, and
 * letting a warden publish a GATE_PASS approval would let them forge one.
 */
export async function composeHostelBroadcast(
  institutionId: string,
  senderUserId: string,
  body: HostelBroadcastBody,
) {
  const category = body.category as HostelCategoryId;
  if (!HOSTEL_CATEGORY_IDS.includes(category)) throw unprocessable('Unknown notification category');
  if (!COMPOSABLE_CATEGORIES.includes(category)) {
    throw unprocessable(`${category} is reported by the system and cannot be composed`);
  }

  const type =
    category === 'MAINTENANCE'
      ? 'HOSTEL_MAINTENANCE'
      : category === 'EMERGENCY'
        ? 'HOSTEL_EMERGENCY'
        : 'HOSTEL_ANNOUNCEMENT';

  const recipientIds = await resolveAudience(institutionId, body.audience);

  const broadcast = await prisma.broadcast.create({
    data: {
      institutionId,
      senderUserId,
      audienceJson: JSON.stringify(body.audience),
      templateKey: category,
      title: body.title,
      body: body.body,
      channels: 'IN_APP',
      sentAt: new Date(),
    },
  });

  const raised = await raiseHostelNotification(institutionId, recipientIds, {
    type,
    title: body.title,
    body: body.body,
    dataJson: JSON.stringify({ module: 'hostel', screen: 'Notifications', broadcastId: broadcast.id }),
    important: category === 'EMERGENCY',
  });

  await writeAudit({
    actorUserId: senderUserId,
    institutionId,
    action: 'hostel.broadcast',
    entityType: 'Broadcast',
    entityId: broadcast.id,
    after: { category, audience: body.audience, recipients: raised.delivered, muted: raised.muted },
  });

  return {
    id: broadcast.id,
    category,
    type,
    recipients: raised.delivered,
    // Muted recipients are REPORTED, not hidden: a warden who sends an emergency to 200 residents
    // and hears "0 sent" needs to know that 200 people muted it.
    muted: raised.muted,
    important: category === 'EMERGENCY',
  };
}

/**
 * Who an audience resolves to.
 *
 * MESS_MEMBERS uses a RANGE, not `date: today` equality — the same lesson the mess roll learned
 * three times over: a calendar day compared as an instant matches only rows written at exactly
 * midnight, so a broadcast to mess members resolved to ZERO recipients, silently, with a 201 and a
 * recipient count of 0.
 */
async function resolveAudience(institutionId: string, audience: HostelBroadcastBody['audience']) {
  const residents = await prisma.hostelAllocation.findMany({
    where: { status: 'ACTIVE', bed: { room: { block: { institutionId } } } },
    select: { bed: { select: { room: { select: { block: { select: { id: true, name: true } } } } } }, studentProfile: { select: { userId: true } } },
  });

  if (audience.kind === 'ALL_RESIDENTS') {
    return residents.map((r) => r.studentProfile.userId);
  }
  if (audience.kind === 'BLOCK') {
    return residents
      .filter((r) => r.bed.room.block.id === audience.blockId)
      .map((r) => r.studentProfile.userId);
  }

  const range = dayRange(localToday());
  const attendance = await prisma.mealAttendance.findMany({
    where: { institutionId, date: { gte: range.gte, lt: range.lt } },
    select: { studentProfile: { select: { userId: true } } },
  });
  return [...new Set(attendance.map((a) => a.studentProfile.userId))];
}

// ── The late-return emitter ───────────────────────────────────────────────

/**
 * Raise a late-return alert for every student who is past the time they said they would be back.
 *
 * Two people are told, for two different reasons:
 *   · the WARDEN, because somebody is missing from the hostel and that is a safety question;
 *   · the STUDENT, because a person who does not know they are overdue cannot do anything about it.
 *
 * A pass that has been RETURNED is not late, and a pass whose `expectedInAt` has not passed is not
 * late. "The student said they would be back Friday and it is Friday" is not an alert.
 *
 * Idempotent: the alert is keyed on the pass, so running this twice does not double the rows. The
 * `dedupeKey` is on the `Notification` row, which is what makes that true.
 */
export async function raiseLateReturnAlerts(institutionId: string, now: Date = new Date()) {
  const passes = await prisma.gatePass.findMany({
    // Scoped through the STUDENT, because `GatePass` has no `institutionId` of its own — its
    // tenancy is the resident's. Filtering on a column that does not exist is the kind of thing
    // Prisma refuses at compile time, which is the right outcome.
    where: {
      status: 'APPROVED',
      actualInAt: null,
      expectedInAt: { lt: now },
      studentProfile: { user: { institutionId } },
    },
    select: {
      id: true,
      expectedInAt: true,
      outAt: true,
      studentProfile: { select: { id: true, userId: true, user: { select: { fullName: true } } } },
    },
  });

  if (passes.length === 0) return { raised: 0, passes: 0 };

  // The wardens who need to know. An institution may have several, and they all get it.
  const wardens = await prisma.user.findMany({
    where: { institutionId, deletedAt: null, roles: { some: { role: { in: ['HOSTEL', 'ADMIN'] } } } },
    select: { id: true },
  });

  let raised = 0;
  for (const pass of passes) {
    const overdueBy = Math.round((now.getTime() - pass.expectedInAt.getTime()) / 3600000);
    const label = pass.studentProfile.user.fullName;

    // THE DEDUPE KEY. One per pass, so the sweep can be run again tomorrow and the warden does not
    // get a second copy of the same alert. It is per (recipient, key), so two wardens each get
    // their own row and the same warden does not get two.
    const dedupeKey = `hostel.late-return:${pass.id}`;

    await raiseHostelNotification(institutionId, wardens.map((w) => w.id), {
      type: 'HOSTEL_LATE_RETURN',
      title: 'Late return',
      body: `${label} was due back at ${pass.expectedInAt.toLocaleString()} and has not returned (${overdueBy}h overdue).`,
      dataJson: JSON.stringify({ module: 'hostel', screen: 'GatePasses', passId: pass.id }),
      important: overdueBy >= 12,
      dedupeKey,
    });

    await raiseHostelNotification(institutionId, [pass.studentProfile.userId], {
      type: 'HOSTEL_LATE_RETURN',
      title: 'You are overdue',
      body: `You said you would be back by ${pass.expectedInAt.toLocaleString()}. Please return or update your pass.`,
      dataJson: JSON.stringify({ module: 'hostel', screen: 'GatePasses', passId: pass.id }),
      important: overdueBy >= 12,
      dedupeKey,
    });

    raised += 1;
  }

  return { raised, passes: passes.length };
}

// ── Helpers for the other hostel modules ──────────────────────────────────

/** The HOSTEL type a given complaint/gate-pass/visitor/mess event should be written as. */
export const HOSTEL_TYPE = {
  gatePass: 'HOSTEL_GATE_PASS',
  visitor: 'HOSTEL_VISITOR',
  complaint: 'HOSTEL_COMPLAINT',
  mess: 'HOSTEL_MESS',
} as const;

/** Forbid a caller who is not entitled to compose. */
export function assertCanCompose(role: string) {
  if (role !== 'HOSTEL' && role !== 'ADMIN') {
    throw forbidden('Only the hostel office can publish a hostel notice');
  }
}
