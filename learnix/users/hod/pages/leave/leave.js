import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';

const initialLeaves = [
  { id: 'LV1', teacher: 'Prof. Anand Krishnan', type: 'Medical Leave', from: 'Oct 12, 2026', to: 'Oct 14, 2026', days: 3, reason: 'Scheduled surgery and recovery', status: 'Pending', color: '#dc2626' },
  { id: 'LV2', teacher: 'Dr. Priya Venkatesh', type: 'Casual Leave', from: 'Oct 20, 2026', to: 'Oct 21, 2026', days: 2, reason: 'Family function', status: 'Pending', color: '#0891b2' },
  { id: 'LV3', teacher: 'Dr. Sunita Rao', type: 'Earned Leave', from: 'Nov 2, 2026', to: 'Nov 6, 2026', days: 5, reason: 'Annual vacation', status: 'Pending', color: '#d97706' },
  { id: 'LV4', teacher: 'Dr. Meera Iyer', type: 'Casual Leave', from: 'Sep 18, 2026', to: 'Sep 19, 2026', days: 2, reason: 'Conference travel', status: 'Approved', color: '#2563eb' },
];

const typeStyle = (t) => {
  if (t === 'Medical Leave') return { bg: '#fee2e2', color: '#dc2626' };
  if (t === 'Casual Leave') return { bg: '#dbeafe', color: '#2563eb' };
  return { bg: '#fef3c7', color: '#d97706' };
};

export default function LeaveModule({ navigation }) {
  const [leaves, setLeaves] = useState(initialLeaves);
  const [tab, setTab] = useState('Pending');

  const visible = tab === 'Pending' ? leaves.filter((l) => l.status === 'Pending') : leaves.filter((l) => l.status !== 'Pending');

  const handleApprove = (id) => {
    const l = leaves.find((x) => x.id === id);
    setLeaves(leaves.map((x) => (x.id === id ? { ...x, status: 'Approved' } : x)));
    Alert.alert('Approved', `${l.teacher}'s ${l.type.toLowerCase()} approved. Substitute arrangement requested.`);
  };

  const handleReject = (id) => {
    const l = leaves.find((x) => x.id === id);
    setLeaves(leaves.map((x) => (x.id === id ? { ...x, status: 'Rejected' } : x)));
    Alert.alert('Rejected', `${l.teacher}'s leave request rejected. They were notified.`);
  };

  const handleSubstitute = (id) => {
    const l = leaves.find((x) => x.id === id);
    Alert.alert('Substitute', `Assign a substitute for ${l.teacher}'s classes (${l.days} days).`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabsRow}>
        {['Pending', 'Processed'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {visible.map((l) => {
          const st = typeStyle(l.type);
          return (
            <View key={l.id} style={styles.card}>
              <View style={[styles.avatar, { backgroundColor: l.color + '1a' }]}>
                <Text style={[styles.avatarText, { color: l.color }]}>{l.teacher.charAt(0)}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.teacher}>{l.teacher}</Text>
                <View style={styles.typeRow}>
                  <View style={[styles.typeChip, { backgroundColor: st.bg }]}>
                    <Text style={[styles.typeText, { color: st.color }]}>{l.type}</Text>
                  </View>
                  <Text style={styles.daysText}>{l.days} days</Text>
                </View>
                <Text style={styles.meta}>
                  {l.from} → {l.to}
                </Text>
                <Text style={styles.reason} numberOfLines={1}>
                  Reason: {l.reason}
                </Text>
              </View>
              {l.status === 'Pending' ? (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleReject(l.id)}
                  >
                    <Ionicons name="close-outline" size={15} color="#dc2626" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleApprove(l.id)}
                  >
                    <Ionicons name="checkmark-outline" size={15} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.substituteBtn}
                  onPress={() => handleSubstitute(l.id)}
                >
                  <Ionicons name="people-outline" size={13} color={theme.colors.primary} />
                  <Text style={styles.substituteText}>Substitute</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
        {visible.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-clear-outline" size={30} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No pending leave requests.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  tabsRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 8,
  },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  tabTextActive: { color: '#fff' },
  list: { paddingTop: 12, paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
  },
  cardBody: { flex: 1, marginRight: 8 },
  teacher: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  typeChip: {
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginRight: 6,
  },
  typeText: {
    fontSize: 9,
    fontFamily: 'Manrope-Bold',
  },
  daysText: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  meta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  reason: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
    marginTop: 3,
  },
  actions: {
    flexDirection: 'row',
  },
  rejectBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  approveBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  substituteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  substituteText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.primary,
    marginLeft: 4,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 28,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 10,
  },
});