import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';

const initialPasses = [
  { id: '1', name: 'Sneha Reddy', room: 'A-101', roll: '21CS118', reason: 'Weekend home visit', out: 'Fri 5:00 PM', in: 'Sun 8:00 PM', status: 'Approved', time: '10 min ago' },
  { id: '2', name: 'Arjun Mehta', room: 'B-204', roll: '22CS045', reason: 'Medical appointment', out: 'Today 6:30 PM', in: 'Today 10:00 PM', status: 'Pending', time: '25 min ago' },
  { id: '3', name: 'Karan Singh', room: 'C-302', roll: '20CS098', reason: 'Sibling visiting from Delhi', out: 'Today 7:00 PM', in: 'Tonight', status: 'Pending', time: '1 hr ago' },
  { id: '4', name: 'Divya Menon', room: 'A-118', roll: '22CS102', reason: 'Family function', out: 'Today 4:00 PM', in: 'Tomorrow 10:00 AM', status: 'Rejected', time: '2 hrs ago', rejectReason: 'Attendance below 75% this week' },
  { id: '5', name: 'Rahul Verma', room: 'B-204', roll: '22IT031', reason: 'Competitive exam coaching', out: 'Today 6:00 AM', in: 'Tonight 11:00 PM', status: 'Approved', time: '3 hrs ago' },
  { id: '6', name: 'Priya Sharma', room: 'A-101', roll: '21EC042', reason: 'Bank document verification', out: 'Today 11:00 AM', in: 'Today 3:00 PM', status: 'Approved', time: '4 hrs ago' },
];

const tabs = ['All', 'Pending', 'Approved', 'Rejected'];

export default function GatePassesModule({ navigation }) {
  const [passes, setPasses] = useState(initialPasses);
  const [activeTab, setActiveTab] = useState('All');

  const filtered = activeTab === 'All' ? passes : passes.filter((p) => p.status === activeTab);
  const pendingCount = passes.filter((p) => p.status === 'Pending').length;

  const handleAction = (id, action) => {
    const pass = passes.find((p) => p.id === id);
    if (action === 'approve') {
      setPasses(passes.map((p) => (p.id === id ? { ...p, status: 'Approved' } : p)));
      Alert.alert('Approved', `${pass.name}'s gate pass approved. SMS + app notification sent.`);
    } else {
      setPasses(passes.map((p) => (p.id === id ? { ...p, status: 'Rejected' } : p)));
      Alert.alert('Rejected', `${pass.name}'s gate pass rejected. They have been notified.`);
    }
  };

  const getStatusStyle = (status) => {
    if (status === 'Approved') return { bg: '#dcfce7', color: '#059669' };
    if (status === 'Rejected') return { bg: '#fee2e2', color: '#dc2626' };
    return { bg: '#fef3c7', color: '#d97706' };
  };

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>28</Text>
          <Text style={styles.statLabel}>Today's Passes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>6</Text>
          <Text style={styles.statLabel}>Overnight</Text>
        </View>
      </View>

      <View style={styles.tabsRow}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {filtered.map((p) => {
          const st = getStatusStyle(p.status);
          return (
            <View key={p.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{p.name.charAt(0)}</Text>
                </View>
                <View style={styles.cardHeader}>
                  <Text style={styles.name}>{p.name} · {p.room}</Text>
                  <Text style={styles.roll}>{p.roll}</Text>
                </View>
                <View style={[styles.statusChip, { backgroundColor: st.bg }]}>
                  <Text style={[styles.statusText, { color: st.color }]}>{p.status}</Text>
                </View>
              </View>
              <View style={styles.reasonBox}>
                <Ionicons name="information-circle-outline" size={14} color={theme.colors.textMuted} />
                <Text style={styles.reasonText}>{p.reason}</Text>
              </View>
              <View style={styles.timeRow}>
                <View style={styles.timeItem}>
                  <Ionicons name="log-out-outline" size={13} color="#d97706" />
                  <Text style={styles.timeText}>Out: {p.out}</Text>
                </View>
                <View style={styles.timeItem}>
                  <Ionicons name="log-in-outline" size={13} color="#059669" />
                  <Text style={styles.timeText}>In: {p.in}</Text>
                </View>
              </View>
              {p.status === 'Rejected' && p.rejectReason ? (
                <Text style={styles.rejectNote}>Reason: {p.rejectReason}</Text>
              ) : null}
              {p.status === 'Pending' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleAction(p.id, 'reject')}
                  >
                    <Ionicons name="close-outline" size={15} color="#dc2626" />
                    <Text style={styles.rejectText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleAction(p.id, 'approve')}
                  >
                    <Ionicons name="checkmark-outline" size={15} color="#fff" />
                    <Text style={styles.approveText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  tab: {
    paddingHorizontal: 14,
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
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: '#2563eb',
  },
  cardHeader: { flex: 1 },
  name: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  roll: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  statusChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  reasonText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
    marginLeft: 6,
  },
  timeRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  timeText: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginLeft: 4,
  },
  rejectNote: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: '#dc2626',
    marginTop: 8,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    paddingVertical: 10,
    marginRight: 8,
  },
  rejectText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#dc2626',
    marginLeft: 4,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
  },
  approveText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 4,
  },
});