/**
 * Shared formatters and the one card primitive for the resident detail screen.
 *
 * The screen is composed of six sections (identity, rent, contacts, residence history,
 * absence, complaints) and used to be one 515-line file. Splitting it means each section owns
 * its own empty state and its own write path, and the shell is left holding only the hero and
 * the vacate action.
 *
 * `SectionCard` exists so the six sections do not each re-declare the same rounded card,
 * title row and divider. Where a section needs a right-hand action ("Add contact") it passes
 * `action`; the title row lays itself out around whatever is supplied rather than each
 * section hand-placing an icon.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../../constants/theme';

/** Rent months are stored as 'YYYY-MM', which is not a date `new Date()` parses reliably. */
export const fmtMonth = (month) => {
  const [y, m] = String(month).split('-').map(Number);
  if (!y || !m) return String(month);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

export const fmtDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * Paise to rupees, because every money value in this schema is `amountMinor`.
 * Centralised so a future change to the minor-unit factor is one edit.
 */
export const rupees = (minor) => `₹${Math.round((minor ?? 0) / 100).toLocaleString('en-IN')}`;

/** "3 days", "1 day" — never "1 days". */
export const nights = (n) => (n === null || n === undefined ? null : `${n} day${n === 1 ? '' : 's'}`);

export const PAY_METHODS = ['CASH', 'UPI', 'CARD', 'NET_BANKING'];

export const CONTACT_KINDS = [
  { key: 'GUARDIAN', label: 'Guardian' },
  { key: 'EMERGENCY', label: 'Emergency' },
];

export const initials = (name) =>
  String(name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

export function SectionCard({ title, action, onAction, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
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

/** The shared "nothing here yet" line. Every section needs one; none should invent its own. */
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
  emptyText: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
});