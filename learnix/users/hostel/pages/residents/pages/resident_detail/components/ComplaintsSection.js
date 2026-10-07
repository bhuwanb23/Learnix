/**
 * Complaints raised by this resident.
 *
 * Read-only here on purpose. Assigning and resolving complaints belongs to the complaints
 * screen, which already has the workflow and the staff actions; a second editable copy in
 * the resident profile would be two places to keep in step. This section answers "has this
 * student been having problems in the hostel", which is a question about the resident rather
 * than about the queue.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../../../constants/theme';
import { SectionCard, Empty, fmtDate } from '../residentMeta';

const SEVERITY_COLOR = { LOW: '#6b7280', MEDIUM: '#d97706', HIGH: '#dc2626' };

export default function ComplaintsSection({ complaints }) {
  const list = complaints ?? [];

  return (
    <SectionCard title="Complaints">
      {list.length === 0 && <Empty>No complaints on file.</Empty>}

      {list.map((c) => {
        const resolved = c.status === 'RESOLVED';
        const color = SEVERITY_COLOR[c.severity] ?? theme.colors.textMuted;
        return (
          <View key={c.id} style={styles.item}>
            <Ionicons
              name={resolved ? 'checkmark-circle-outline' : 'time-outline'}
              size={16}
              color={resolved ? '#059669' : color}
            />
            <View style={styles.body}>
              <Text style={styles.text} numberOfLines={2}>
                {c.description}
              </Text>
              <Text style={styles.meta}>
                {c.category} · {c.severity} · {c.status} · {fmtDate(c.createdAt)}
              </Text>
            </View>
          </View>
        );
      })}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  body: { flex: 1, marginLeft: 10 },
  text: { fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.text },
  meta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 3,
  },
});