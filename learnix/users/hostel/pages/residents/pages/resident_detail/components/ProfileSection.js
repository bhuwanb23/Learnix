/**
 * Resident identity and current stay.
 *
 * `rollNo` leads because it is the field a warden scans for — it is the identifier the
 * allocation flow asks them to type, so it is the one string they are guaranteed to have.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../../../../../constants/theme';
import { SectionCard, Divider, Empty } from '../residentMeta';

export default function ProfileSection({ resident }) {
  const rows = [
    { label: 'Roll number', value: resident.rollNo || '—' },
    { label: 'Phone', value: resident.phone || 'No phone on file' },
    { label: 'Email', value: resident.email || '—' },
    { label: 'Section', value: resident.section || '—' },
    {
      label: 'Semester',
      value: resident.currentSemester ? `Semester ${resident.currentSemester}` : '—',
    },
  ];

  return (
    <SectionCard title="Resident details">
      {rows.map((row, idx) => (
        <View key={row.label}>
          <View style={styles.row}>
            <Text style={styles.label}>{row.label}</Text>
            <Text style={styles.value} numberOfLines={1}>
              {row.value}
            </Text>
          </View>
          {idx < rows.length - 1 && <Divider />}
        </View>
      ))}

      <Divider />

      <Text style={styles.note}>
        Current stay: {resident.room} · bed {resident.bedLabel} · {resident.block}
      </Text>
      {resident.admissionDate ? (
        <Text style={styles.note}>Admitted {resident.admissionDate}</Text>
      ) : null}
    </SectionCard>
  );
}

/** Exported for the shell's empty/error states so they read the same. */
export function ProfilePlaceholder() {
  return (
    <SectionCard title="Resident details">
      <Empty>No identity on file.</Empty>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  value: {
    fontSize: 13,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
    flexShrink: 1,
    marginLeft: 12,
    textAlign: 'right',
  },
  note: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 6,
  },
});