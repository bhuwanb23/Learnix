/**
 * S-12 Notifications — preference surface (docs/users/12-alumni-relations.md §3.7).
 *
 * Replaces the three switches on the alumni profile screen
 * (`learnix/users/alumni/pages/profile/profile.js`) which were seeded from a
 * `useState` object of `default: true` and never left the device. Tapping them
 * changed nothing anywhere: not the profile, not the database, not a single
 * notification. The docs listed them under §3.8 as a shipped feature, so this is
 * the fix — the toggles now read and write rows.
 *
 * Defaults come from `notifications.rules.ts`, not from here, so that adding a
 * ninth category is one edit and every existing person is delivered it.
 */
import { prisma } from '../../../db/prisma.js';
import { CATEGORIES, type CategoryId } from './notifications.rules.js';
import { setMuted } from './notifications.delivery.js';

export type PreferenceRow = {
  category: CategoryId;
  muted: boolean;
  /** True when a row exists — i.e. the person has actually touched this switch. */
  explicit: boolean;
};

/**
 * All eight categories with their current state.
 *
 * Always returns the full list rather than only stored rows: a client that renders
 * "no preferences saved" as an empty screen is how we got here. `explicit` lets the
 * UI say "Default (on)" versus "On — you changed this" without a second call.
 */
export async function listPreferences(
  institutionId: string,
  userId: string,
): Promise<{ preferences: PreferenceRow[]; mutedCount: number }> {
  const stored = await prisma.notificationPreference.findMany({
    where: { institutionId, userId },
    select: { category: true, muted: true },
  });
  const byCategory = new Map(stored.map((r) => [r.category, r.muted]));

  const preferences: PreferenceRow[] = CATEGORIES.map((c) => {
    const muted = byCategory.get(c.id);
    return {
      category: c.id,
      muted: muted ?? c.defaultMuted,
      explicit: muted !== undefined,
    };
  });

  return { preferences, mutedCount: preferences.filter((p) => p.muted).length };
}

/**
 * Apply a partial patch.
 *
 * Scoped to the caller's own institution on both read and write. The read is what
 * prevents the cross-tenant mistake: without it, a PATCH would upsert on
 * `[userId, category]` and silently rewrite a mute belonging to the same person at
 * their other college — the unique key is not tenant-scoped, so the guard has to
 * be explicit.
 */
export async function updatePreferences(
  institutionId: string,
  userId: string,
  patch: Partial<Record<CategoryId, boolean>>,
): Promise<{ preferences: PreferenceRow[]; mutedCount: number; changed: number }> {
  const entries = Object.entries(patch) as [CategoryId, boolean][];

  const owned = await prisma.notificationPreference.findMany({
    where: { institutionId, userId, category: { in: entries.map(([c]) => c) } },
    select: { category: true },
  });
  const ownedCategories = new Set(owned.map((r) => r.category));

  let changed = 0;
  for (const [category, muted] of entries) {
    if (typeof muted !== 'boolean') continue;

    const exists = ownedCategories.has(category);
    if (exists) {
      const current = await prisma.notificationPreference.findUnique({
        where: { userId_category: { userId, category } },
        select: { muted: true },
      });
      if (current?.muted === muted) continue;
    }
    await setMuted(institutionId, userId, category, muted);
    changed += 1;
  }

  const after = await listPreferences(institutionId, userId);
  return { ...after, changed };
}

/**
 * The mute list as a plain array, for callers that only need the set.
 * Thin wrapper so nothing outside this folder touches the preference table.
 */
export async function mutedCategoryIds(institutionId: string, userId: string): Promise<CategoryId[]> {
  const rows = await prisma.notificationPreference.findMany({
    where: { institutionId, userId, muted: true },
    select: { category: true },
  });
  return rows.map((r) => r.category).filter((c): c is CategoryId => CATEGORIES.some((x) => x.id === c));
}
