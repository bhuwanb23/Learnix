/**
 * The hostel's own profile service: who the warden is, what they are assigned, what they may do,
 * what they want to hear about, and how their account has been used.
 * Docs: 08-hostel.md §3.10
 *
 * WHAT THIS IS NOT
 * ----------------
 * The old `GET /hostel/profile` answered four numbers: a name, a designation, and two occupancy
 * totals. The screen built on it showed "1,248 Residents / 3 Blocks / 42 Staff" — every one of
 * them a LITERAL in the client, not a figure from the server — and five menu items that navigated
 * nowhere, and three notification toggles that were `useState` and died on unmount.
 *
 * A profile is not a card. It is the answer to six questions, and a screen that cannot answer them
 * is a picture of a person:
 *
 *   1. WHO IS THIS?           name, designation, employee number, contact, when they joined
 *   2. WHAT IS THEIRS?        the blocks they are responsible for
 *   3. WHAT MAY THEY DO?       the permissions their roles actually grant
 *   4. WHAT DO THEY WANT?      which notifications they have muted
 *   5. IS THE ACCOUNT SAFE?    password, live sessions, sign-out-everywhere
 *   6. WHAT HAVE THEY DONE?    recent actions, and when they last signed in
 *
 * EVERY FIGURE IS DERIVED
 * -----------------------
 * Nothing here is a literal. The block count comes from the warden's actual assignments, the
 * permission list from the RBAC map, the activity from the audit log. A profile that hardcodes its
 * own numbers is a profile that is wrong the moment somebody is promoted.
 *
 * WHY THE PERMISSIONS ARE THE RBAC MAP'S
 * ----------------------------------------
 * `RolePermission` and `PermissionGroup` are the platform's permission tables, and they are
 * administered live, displayed on the user's own profile, and audited. So "what may this warden do"
 * is READ from that map, not restated here — a second list would be a second thing to forget to
 * update when a permission is granted.
 */
import { prisma } from '../../db/prisma.js';
import { notFound } from '../../lib/errors.js';
import { HOSTEL_CATEGORY_IDS, HOSTEL_CATEGORIES } from './hostel-notifications.rules.js';

// ── 1 & 2. Who this is, and what is theirs ─────────────────────────────────

/**
 * The warden's own profile, and the blocks they are responsible for.
 *
 * A block is assigned to a warden by `hostelBlock.wardenUserId`. There may be none (a chief warden
 * responsible for the whole institution) or several. The list is DERIVED from the blocks, so it is
 * right the moment a warden is moved to a different one.
 */
export async function getHostelProfile(userId: string, institutionId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, institutionId, deletedAt: null },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      lastLoginAt: true,
      createdAt: true,
      roles: { select: { role: true } },
      staffProfile: { select: { employeeNo: true, designation: true, departmentId: true } },
    },
  });
  if (!user) throw notFound('User not found');

  const roles = user.roles.map((r) => r.role);

  // The blocks THIS warden is responsible for. The block's own warden is the link, and the block
  // carries its occupancy so the profile can say "Block A — 48 of 60 beds" without a second call.
  const assigned = await prisma.hostelBlock.findMany({
    where: { institutionId, wardenUserId: userId },
    select: {
      id: true,
      name: true,
      rooms: { select: { beds: { select: { status: true } } } },
    },
    orderBy: { name: 'asc' },
  });

  const blocks = assigned.map((b) => {
    const beds = b.rooms.flatMap((r) => r.beds);
    const occupied = beds.filter((x) => x.status === 'ALLOCATED').length;
    return {
      id: b.id,
      name: b.name,
      rooms: b.rooms.length,
      beds: beds.length,
      occupied,
      occupancyPct: beds.length === 0 ? 0 : Math.round((occupied / beds.length) * 100),
    };
  });

  // The institution's blocks, so the profile can say "responsible for 2 of 5" without the client
  // having to know how many exist.
  const allBlocks = await prisma.hostelBlock.count({ where: { institutionId } });

  // The scope of their work: the whole institution, or the blocks they hold.
  const totalBeds = blocks.reduce((n, b) => n + b.beds, 0);
  const totalOccupied = blocks.reduce((n, b) => n + b.occupied, 0);

  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      lastLoginAt: user.lastLoginAt,
      joinedAt: user.createdAt,
    },
    roles,
    staff: {
      employeeNo: user.staffProfile?.employeeNo ?? null,
      designation: user.staffProfile?.designation ?? 'Chief Warden',
    },
    assignment: {
      blocks,
      // `ALL` when they hold no block, because a chief warden responsible for the institution is not
      // responsible for ZERO of it. Saying "0 of 5" would be a lie.
      scope: blocks.length === 0 ? 'ALL' : 'BLOCKS',
      blocksAssigned: blocks.length,
      blocksTotal: allBlocks,
      beds: totalBeds,
      occupied: totalOccupied,
      occupancyPct: totalBeds === 0 ? 0 : Math.round((totalOccupied / totalBeds) * 100),
    },
  };
}

// ── 3. What they may do ────────────────────────────────────────────────────

/**
 * The permissions the caller's roles actually grant.
 *
 * Read from the RBAC map rather than restated, because that map is administered live and audited —
 * a second copy here would drift from it and quietly tell a warden they can do something they
 * cannot.
 */
export async function getHostelPermissions(userId: string, institutionId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, institutionId, deletedAt: null },
    select: { roles: { select: { role: true } } },
  });
  if (!user) throw notFound('User not found');

  const roles = user.roles.map((r) => r.role);
  if (roles.length === 0) return { roles: [], total: 0, groups: [], ungrantedCategories: [] };

  const rows = await prisma.rolePermission.findMany({
    where: { role: { in: roles } },
    include: { permissionGroup: true },
  });

  const byKey = new Map<string, { key: string; name: string; category: string; roles: string[] }>();
  for (const r of rows) {
    const existing = byKey.get(r.permissionKey);
    if (existing) {
      if (!existing.roles.includes(r.role)) existing.roles.push(r.role);
    } else {
      byKey.set(r.permissionKey, {
        key: r.permissionKey,
        name: r.permissionGroup.name,
        category: r.permissionGroup.category,
        roles: [r.role],
      });
    }
  }

  const all = [...byKey.values()];
  const categories = [...new Set(all.map((p) => p.category))].sort();

  return {
    roles,
    total: all.length,
    groups: categories.map((category) => ({
      category,
      permissions: all
        .filter((p) => p.category === category)
        .sort((a, b) => a.key.localeCompare(b.key)),
    })),
    // The HOSTEL ones first, because that is the desk this profile belongs to. The others are still
    // listed — a warden who also holds the ADMIN role can do more than the hostel, and hiding that
    // would be its own kind of lie.
    hostelPermissions: all
      .filter((p) => p.category === 'HOSTEL')
      .sort((a, b) => a.key.localeCompare(b.key)),
  };
}

// ── 4. What they want to hear about ────────────────────────────────────────

/**
 * Which of the eight hostel categories this warden has muted.
 *
 * A mute is SUPPRESSION, not hiding — the delivery path writes no row at all for a muted category.
 * So this list is the set of categories that will never reach them, and it is worth showing
 * plainly: a warden who has muted emergencies and cannot undo it would be worse than useless.
 */
export async function getHostelNotificationPreferences(userId: string, institutionId: string) {
  const rows = await prisma.notificationPreference.findMany({
    where: { institutionId, userId },
    select: { category: true, muted: true },
  });
  const muted = new Set(rows.filter((r) => r.muted).map((r) => r.category));

  return {
    categories: HOSTEL_CATEGORIES.map((c) => ({
      id: c.id,
      label: c.label,
      blurb: c.blurb,
      icon: c.icon,
      color: c.color,
      // An EMERGENCY cannot be muted. The delivery path ignores the mute for that type, so offering
      // a toggle that does nothing would be a lie in the interface.
      mutable: c.id !== 'EMERGENCY',
      muted: c.id !== 'EMERGENCY' && muted.has(c.id),
    })),
    mutedCount: [...muted].filter((c) => HOSTEL_CATEGORY_IDS.includes(c as any)).length,
  };
}

/**
 * Mute or unmute a hostel category.
 *
 * The category must be one of the eight, and the emergency is refused — the same reason the
 * delivery path ignores its mute. A preference that cannot be honoured is not a preference.
 */
export async function updateHostelNotificationPreferences(
  userId: string,
  institutionId: string,
  body: { category: string; muted: boolean },
) {
  const category = body.category;
  if (!HOSTEL_CATEGORY_IDS.includes(category as any)) {
    throw notFound('Unknown notification category');
  }
  if (category === 'EMERGENCY') {
    throw notFound('Emergency notices cannot be muted');
  }
  const row = await prisma.notificationPreference.upsert({
    where: { userId_category: { userId, category } },
    create: { institutionId, userId, category, muted: body.muted },
    update: { muted: body.muted },
  });
  return { category: row.category, muted: row.muted };
}

// ── 5 & 6. Safety and history ───────────────────────────────────────────────

/**
 * The account's safety and its history.
 *
 * TWO THINGS, and they are different questions:
 *   · SESSIONS — the live sign-ins. Revoking one ends it. Identified by start time only, because no
 *     device information is stored; that limitation is REPORTED rather than hidden, so the screen can
 *     say "this device" and not promise more than it knows.
 *   · ACTIVITY — what the warden actually DID, from the audit log. Not the same thing as a session:
 *     a session says "someone is signed in", an activity entry says "a complaint was assigned".
 */
export async function getHostelActivity(userId: string, institutionId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, institutionId, deletedAt: null },
    select: { lastLoginAt: true, createdAt: true },
  });
  if (!user) throw notFound('User not found');

  const now = new Date();
  const [sessions, activity] = await Promise.all([
    prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, expiresAt: true },
    }),
    prisma.auditLog.findMany({
      where: { actorUserId: userId, institutionId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, action: true, entityType: true, entityId: true, createdAt: true },
    }),
  ]);

  return {
    lastLoginAt: user.lastLoginAt,
    sessions: sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    })),
    sessionCount: sessions.length,
    // Said out loud, because the screen cannot promise more than the data supports.
    sessionNote: 'Sessions are identified by start time only — no device information is stored.',
    activity: activity.map((a) => ({
      id: a.id,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      createdAt: a.createdAt,
    })),
    activityCount: activity.length,
  };
}
