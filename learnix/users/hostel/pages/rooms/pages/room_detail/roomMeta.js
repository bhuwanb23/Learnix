/**
 * Shared formatters and the card primitive for the room screen.
 *
 * `SectionCard` exists so the sections do not each re-declare the same rounded card and title
 * row. Where a section needs a right-hand action it passes `action`; the title row lays itself
 * out around whatever is supplied rather than each section hand-placing an icon.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../../constants/theme';

export const rupees = (minor) => `₹${Math.round((minor ?? 0) / 100).toLocaleString('en-IN')}`;

export const fmtDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** "3 days", never "1 days". */
export const nights = (n) => (n === null || n === undefined ? null : `${n} day${n === 1 ? '' : 's'}`);

export const initials = (name) =>
  String(name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/**
 * A stable colour per block name, hashed rather than looked up.
 *
 * The previous version indexed an array by the block's POSITION in the tab row, so the colour
 * changed when you tapped a different tab and a fourth block had no colour at all.
 */
export function blockColor(name) {
  let h = 0;
  const s = String(name ?? '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return ['#2563eb', '#0891b2', '#059669', '#d97706', '#7c3aed', '#be123c'][h % 6];
}

/** Per-rollup badge styling. `Maintenance` is a real state, not a variant of Full. */
export const STATUS_STYLE = {
  Vacant: { bg: '#dcfce7', color: '#059669', label: 'Vacant' },
  Partial: { bg: '#fef3c7', color: '#d97706', label: 'Partial' },
  Full: { bg: '#fee2e2', color: '#dc2626', label: 'Full' },
  Maintenance: { bg: '#ede9fe', color: '#6d28d9', label: 'In repair' },
};

export const statusStyle = (status) => STATUS_STYLE[status] ?? STATUS_STYLE.Vacant;

/** Why the Allocate button is disabled, in the warden's words rather than a grey control. */
export function allocationBlocker(room) {
  if (room.allocatableCapacity > 0) return null;
  if (room.maintenanceBeds > 0 && room.vacant === 0) {
    return `${room.maintenanceBeds} bed${room.maintenanceBeds === 1 ? '' : 's'} under repair — no bed available`;
  }
  if (room.occupied >= room.capacity) return 'Every bed in this room is occupied';
  return 'No bed available in this room';
}

export function SectionCard({ title, subtitle, action, onAction, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
        {action ? (
          <TouchableOpacity style={styles.sectionAction} onPress={onAction}>
            <Ionicons name={action.icon} size={13} color={theme.colors.primary} />
            <Text style={styles.sectionActionText}>{action.label}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export function Empty({ children }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{children}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    letterSpacing: 0.2,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  sectionAction: { flexDirection: 'row', alignItems: 'center' },
  sectionActionText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.primary,
    marginLeft: 4,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 10 },
  empty: { paddingVertical: 12, alignItems: 'center' },
  emptyText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
});