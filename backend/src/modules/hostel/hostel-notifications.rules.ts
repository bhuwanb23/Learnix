/**
 * The hostel desk's notification vocabulary.
 * Docs: 08-hostel.md §3.8
 *
 * WHY A DESK OWNS ITS OWN CATEGORIES
 * ---------------------------------
 * The `Notification` table is shared — the accounts desk, the alumni relations office, the library,
 * the hostel all write into it and a student reads one inbox. But the CATEGORIES are not shared, and
 * they must not be. "A fee is due" and "the water is off in Block B" are different facts about the
 * world, and a filter chip that could show either is a filter chip that means nothing.
 *
 * So each desk declares its own vocabulary and its inbox selects by its own types. This file is the
 * hostel's. It mirrors the shape of the accounts and alumni catalogues deliberately — same fields,
 * same `type` → category mapping, same idea of an unrecognised type falling back rather than
 * vanishing — so a reader who has understood one desk's rules can read another's.
 *
 * THE EIGHT CATEGORIES
 * --------------------
 * Two of them (ANNOUNCEMENT, MAINTENANCE, EMERGENCY) are things a WARDEN COMPOSES and sends to a
 * group. The other five are things the system notices and reports. The split matters, because it
 * decides who may write the row:
 *
 *   · ANNOUNCEMENT  — general hostel news. Composed, to everybody.
 *   · MAINTENANCE   — work notices ("water off 10am–1pm"). Composed, usually to ONE BLOCK.
 *   · EMERGENCY     — evacuation, curfew change, gas leak. Composed, and it BYPASSES a resident's
 *                     mutes, because you cannot opt out of being told to leave a building.
 *   · GATE_PASS     — a pass approved, refused, or a student now outside.
 *   · LATE_RETURN   — a student has not come back by the time they said they would.
 *   · VISITOR       — their visitor arrived, or left.
 *   · COMPLAINT     — their complaint was assigned, updated, resolved, or reopened.
 *   · MESS          — menu changes, a meal to rate, a mess expense awaiting approval.
 *
 * WHY `type` IS THE FINE-GRAINED KEY
 * ----------------------------------
 * `Notification.type` is the discriminator, and it is what the inbox filters on. A single
 * catch-all `HOSTEL` type would make every one of these eight categories indistinguishable in the
 * database, and the category could only be recovered by matching on the title text — which is a
 * string the user can see and the schema cannot constrain. So each emitter writes a specific type,
 * and this file says which category each one belongs to.
 *
 * THE LEGACY `HOSTEL` TYPE
 * ------------------------
 * Earlier rows were written with a single `type: 'HOSTEL'`. They are mapped to ANNOUNCEMENT here so
 * they still appear in a sensible place rather than being invisible, and so the migration is not
 * destructive. New rows never use it.
 */
import type { NotificationRegistry } from '../accounts/notifications.rules.js';

export type HostelCategoryId =
  | 'ANNOUNCEMENT'
  | 'MAINTENANCE'
  | 'EMERGENCY'
  | 'GATE_PASS'
  | 'LATE_RETURN'
  | 'VISITOR'
  | 'COMPLAINT'
  | 'MESS';

export const HOSTEL_CATEGORY_IDS: readonly HostelCategoryId[] = [
  'ANNOUNCEMENT',
  'MAINTENANCE',
  'EMERGENCY',
  'GATE_PASS',
  'LATE_RETURN',
  'VISITOR',
  'COMPLAINT',
  'MESS',
];

export interface HostelCategory {
  id: HostelCategoryId;
  label: string;
  blurb: string;
  icon: string;
  color: string;
  /** Whether a WARDEN composes these, as opposed to the system noticing them. */
  composed: boolean;
}

export const HOSTEL_CATEGORIES: readonly HostelCategory[] = [
  {
    id: 'ANNOUNCEMENT',
    label: 'Hostel announcements',
    blurb: 'General news from the hostel office — timings, rules, events.',
    icon: 'megaphone-outline',
    color: '#0284c7',
    composed: true,
  },
  {
    id: 'MAINTENANCE',
    label: 'Maintenance alerts',
    blurb: 'Work affecting a block or a service: water, power, lifts, painting.',
    icon: 'construct-outline',
    color: '#d97706',
    composed: true,
  },
  {
    id: 'EMERGENCY',
    label: 'Emergency notifications',
    blurb: 'Evacuations, curfew changes, anything urgent. These ignore mutes.',
    icon: 'warning-outline',
    color: '#dc2626',
    composed: true,
  },
  {
    id: 'GATE_PASS',
    label: 'Gate-pass approvals',
    blurb: 'A pass approved or refused, and a student now outside the hostel.',
    icon: 'exit-outline',
    color: '#2563eb',
    composed: false,
  },
  {
    id: 'LATE_RETURN',
    label: 'Late-return alerts',
    blurb: 'A student is past the time they said they would be back.',
    icon: 'time-outline',
    color: '#ea580c',
    composed: false,
  },
  {
    id: 'VISITOR',
    label: 'Visitor alerts',
    blurb: 'Their visitor arrived, or has left.',
    icon: 'people-outline',
    color: '#0891b2',
    composed: false,
  },
  {
    id: 'COMPLAINT',
    label: 'Complaint updates',
    blurb: 'A complaint assigned, updated, resolved, or reopened.',
    icon: 'chatbubble-ellipses-outline',
    color: '#7c3aed',
    composed: false,
  },
  {
    id: 'MESS',
    label: 'Mess announcements',
    blurb: 'Menu changes, a meal to rate, and mess expenses awaiting approval.',
    icon: 'restaurant-outline',
    color: '#db2777',
    composed: false,
  },
];

export interface HostelTypeMeta {
  label: string;
  category: HostelCategoryId;
  icon: string;
  color: string;
  /**
   * True for a type that must reach the recipient even if they muted the category.
   *
   * An evacuation notice that respects a mute setting is not a notice. This flag is the ONLY way a
   * row bypasses `NotificationPreference.muted`, and the delivery path asserts that it is set for
   * exactly the types that are entitled to it — a mute is a preference about noise, not about safety.
   */
  bypassesMute?: boolean;
}

/**
 * The type → category map.
 *
 * Every type the hostel writes is registered here. A type that is NOT here is a bug, and the
 * fallback below turns it into a visible row with generic chrome rather than a silent drop — the
 * failure mode nobody notices until a resident says they were never told.
 */
export const HOSTEL_TYPE_META: Record<string, HostelTypeMeta> = {
  // ── Composed by the warden ──
  HOSTEL_ANNOUNCEMENT: {
    label: 'Hostel announcement',
    category: 'ANNOUNCEMENT',
    icon: 'megaphone-outline',
    color: '#0284c7',
  },
  HOSTEL_MAINTENANCE: {
    label: 'Maintenance alert',
    category: 'MAINTENANCE',
    icon: 'construct-outline',
    color: '#d97706',
  },
  HOSTEL_EMERGENCY: {
    label: 'Emergency notice',
    category: 'EMERGENCY',
    icon: 'warning-outline',
    color: '#dc2626',
    bypassesMute: true,
  },

  // ── Noticed by the system ──
  HOSTEL_GATE_PASS: {
    label: 'Gate pass update',
    category: 'GATE_PASS',
    icon: 'exit-outline',
    color: '#2563eb',
  },
  HOSTEL_LATE_RETURN: {
    label: 'Late return',
    category: 'LATE_RETURN',
    icon: 'time-outline',
    color: '#ea580c',
  },
  HOSTEL_VISITOR: {
    label: 'Visitor update',
    category: 'VISITOR',
    icon: 'people-outline',
    color: '#0891b2',
  },
  HOSTEL_COMPLAINT: {
    label: 'Complaint update',
    category: 'COMPLAINT',
    icon: 'chatbubble-ellipses-outline',
    color: '#7c3aed',
  },
  HOSTEL_MESS: {
    label: 'Mess update',
    category: 'MESS',
    icon: 'restaurant-outline',
    color: '#db2777',
  },

  // ── Legacy ──
  // Rows written before the eight categories existed. Mapped to ANNOUNCEMENT so they land
  // somewhere a reader can make sense of, rather than being invisible.
  HOSTEL: {
    label: 'Hostel update',
    category: 'ANNOUNCEMENT',
    icon: 'bed-outline',
    color: '#0284c7',
  },
};

/**
 * The category a hostel type belongs to, or null when the type is not ours.
 *
 * A type that starts with `HOSTEL_` but is NOT in the map is a NEW hostel type that the rules file
 * has not caught up with. It resolves to ANNOUNCEMENT rather than to null, because null means "not
 * ours" and the inbox would leave the row out — a new emitter shipping before the vocabulary is
 * updated would then vanish, which is the failure nobody notices until a resident says they were
 * never told.
 *
 * A type with no `HOSTEL_` prefix is another desk's row (the mess expense approval the accounts
 * office needs is raised by the hostel but is a finance message), and that is left out on purpose.
 */
export function hostelCategory(type: string): HostelCategoryId | null {
  const meta = HOSTEL_TYPE_META[type];
  if (meta) return meta.category;
  if (type.startsWith('HOSTEL_')) return 'ANNOUNCEMENT';
  return null;
}

/** Is this row ours? Known type, or an unregistered one that carries our prefix. */
export function isHostelType(type: string): boolean {
  return type in HOSTEL_TYPE_META || type.startsWith('HOSTEL_');
}

/** The chrome for a hostel type. An unknown type still gets SOMETHING, never nothing. */
export function hostelTypeMeta(type: string): HostelTypeMeta {
  return (
    HOSTEL_TYPE_META[type] ?? {
      label: type.replace(/_/g, ' ').toLowerCase(),
      category: 'ANNOUNCEMENT',
      icon: 'notifications-outline',
      color: '#0284c7',
    }
  );
}

/** The `Notification.type` values that belong to a category. */
export function hostelTypesForCategory(category: HostelCategoryId): string[] {
  return Object.keys(HOSTEL_TYPE_META).filter((t) => HOSTEL_TYPE_META[t].category === category);
}

/** Every type the hostel owns. The inbox selects by this list. */
export const HOSTEL_TYPES: readonly string[] = Object.keys(HOSTEL_TYPE_META);

/**
 * The categories a WARDEN may compose into a broadcast.
 *
 * A separate list from `HOSTEL_CATEGORIES` because composing is a privilege, not a description.
 * A warden may publish an ANNOUNCEMENT, a MAINTENANCE notice or an EMERGENCY. They may not
 * publish a COMPLAINT update or a GATE_PASS approval — those are facts the system reports, and a
 * warden who could write one could forge it.
 */
export const COMPOSABLE_CATEGORIES: readonly HostelCategoryId[] = ['ANNOUNCEMENT', 'MAINTENANCE', 'EMERGENCY'];

/**
 * The audiences a composed message can target.
 *
 * `ALL_RESIDENTS`, one BLOCK, or MESS_MEMBERS. Deliberately NOT a "staff" audience: the broadcast
 * composer is for residents, and staff hear about the same thing through the shared inbox.
 */
export type HostelAudience =
  | { kind: 'ALL_RESIDENTS' }
  | { kind: 'BLOCK'; blockId: string }
  | { kind: 'MESS_MEMBERS' };

export const HOSTEL_AUDIENCE_KINDS = ['ALL_RESIDENTS', 'BLOCK', 'MESS_MEMBERS'] as const;

// ── The registry, in the form the shared inbox consumes ───────────────────
//
// The shared inbox is handed a registry rather than importing this module, so the dependency runs
// one way: the hostel knows about the shared kernel, never the reverse. The student route merges
// this with the finance registry so a resident sees their bills and their block's water notice in
// one list, while the accounts desk's own chip list is untouched.
export const HOSTEL_NOTIFICATION_REGISTRY: NotificationRegistry = {
  categories: HOSTEL_CATEGORIES,
  types: Object.fromEntries(
    Object.entries(HOSTEL_TYPE_META).map(([type, meta]) => [
      type,
      { label: meta.label, category: meta.category, icon: meta.icon, color: meta.color },
    ]),
  ),
};
